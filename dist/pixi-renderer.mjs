import * as PIXI from './vendor/pixi.mjs';
import { obstaclePolygons } from './flight.mjs';

// Native Pixi scene objects share the simulation's polygon geometry. The legacy
// canvas is retained only as a layout/input fallback when WebGL is unavailable.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, value) => a + (b - a) * value;
const color = value => typeof value === 'number' ? value : Number.parseInt(String(value).replace('#', ''), 16) || 0xffffff;
const flatten = points => points.flatMap(point => point);
const viewTime = engine => engine.visualTime ?? engine.time;
const viewDistance = engine => engine.renderDistance ?? engine.distance;
const viewY = engine => engine.renderPlayerY ?? engine.player.y;

// One screen-sized material pass keeps painted detail while local fire and
// wisp light move across it. All geometry and collisions remain strictly 2D.
function makeTerrainLight() {
  return new PIXI.Filter({
    glProgram: PIXI.GlProgram.from({
      vertex: `precision highp float;
        in vec2 aPosition;
        out vec2 vTextureCoord;
        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;
        void main() {
          vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
          position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
          position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
          gl_Position = vec4(position, 0.0, 1.0);
          vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
        }`,
      fragment: `precision highp float;
        in vec2 vTextureCoord;
        uniform sampler2D uTexture;
        uniform vec4 uInputSize;
        uniform vec2 uFire;
        uniform vec2 uWisp;
        uniform float uHeat;
        uniform float uReach;
        out vec4 finalColor;
        void main() {
          vec4 surface = texture(uTexture, vTextureCoord);
          vec2 pixel = vTextureCoord * uInputSize.xy;
          float fire = pow(max(0.0, 1.0 - distance(pixel, uFire) / 235.0), 2.0);
          float spirit = pow(max(0.0, 1.0 - distance(pixel, uWisp) / (95.0 + uReach)), 2.0);
          float luminance = dot(surface.rgb, vec3(.2126, .7152, .0722));
          vec3 material = mix(vec3(luminance), surface.rgb, .91);
          vec3 light = vec3(.84, .88, .94) + vec3(1.65, .80, .30) * fire * uHeat
            + vec3(.20, 1.15, .92) * spirit;
          finalColor = vec4(material * light, surface.a);
        }`,
    }),
    resources: { lighting: {
      uFire: { value: new Float32Array([98, 310]), type: 'vec2<f32>' },
      uWisp: { value: new Float32Array([68, 330]), type: 'vec2<f32>' },
      uHeat: { value: 1, type: 'f32' }, uReach: { value: 35, type: 'f32' },
    } },
  });
}

export class PixiFlightView {
  constructor(engine) {
    this.engine = engine;
    this.ready = false;
    this.destroyed = false;
    this.application = null;
    this.canvas = null;
    this.obstacles = new Map();
    this.embers = new Map();
    this.particleSprites = [];
    this.pickupSprites = [];
    this.frames = [];
    this.terrainFrames = [];
    this.lastHeight = 0;
    this.originalVisibility = engine.canvas.style?.visibility || '';
  }

  async init() {
    const engine = this.engine;
    if (typeof document === 'undefined' || !engine.canvas.parentElement || this.destroyed) return false;
    const view = document.createElement('canvas');
    view.className = 'pixi-flight-canvas';
    view.dataset.renderer = 'pixijs';
    view.dataset.pixiVersion = PIXI.VERSION;
    view.setAttribute('aria-hidden', 'true');
    Object.assign(view.style, { position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block', zIndex: '0', touchAction: 'none' });
    this.canvas = view;
    try {
      const bounds = engine.canvas.getBoundingClientRect();
      this.application = new PIXI.Application();
      await this.application.init({ canvas: view, width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height), resolution: Math.min(2, globalThis.devicePixelRatio || 1),
        autoDensity: true, antialias: true, autoStart: false, preference: 'webgl',
        powerPreference: 'high-performance', background: '#102a31', clearBeforeRender: true });
      if (this.destroyed || engine.destroyed) { this.destroy(); return false; }
      this.buildScene();
      engine.canvas.parentElement.appendChild(view);
      this.resize();
      this.ready = true;
      engine.canvas.style.visibility = 'hidden';
      this.loadArtwork();
      this.render(engine);
      return true;
    } catch (error) {
      this.error = error;
      this.destroy();
      return false;
    }
  }

  buildScene() {
    const app = this.application;
    const engine = this.engine;
    this.scene = new PIXI.Container();
    this.scene.eventMode = 'none';
    app.stage.addChild(this.scene);
    this.sky = new PIXI.Graphics();
    this.scene.addChild(this.sky);
    this.backdrop = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.backdrop.alpha = 0;
    this.scene.addChild(this.backdrop);
    this.atmosphereGrade = new PIXI.ColorMatrixFilter();
    this.atmosphereGrade.saturate(-.22);
    this.atmosphereGrade.brightness(.91, true);
    this.backdrop.filters = [this.atmosphereGrade];
    this.glowTexture = this.makeGlowTexture();
    this.moteTexture = this.makeMoteTexture();
    this.sparkTexture = this.makeSparkTexture();
    this.sun = new PIXI.Sprite(this.glowTexture);
    this.sun.anchor.set(.5);
    this.sun.tint = 0xf8d39b;
    this.sun.alpha = .28;
    this.scene.addChild(this.sun);
    this.sunRays = new PIXI.Graphics();
    this.scene.addChild(this.sunRays);
    this.ambientEmbers = new PIXI.Container();
    for (let index = 0; index < 8; index++) {
      const ember = new PIXI.Sprite(this.glowTexture);
      ember.anchor.set(.5); ember.tint = 0xe8ba7e; ember.blendMode = 'add';
      this.ambientEmbers.addChild(ember);
    }
    this.scene.addChild(this.ambientEmbers);
    this.stars = new PIXI.Container();
    this.scene.addChild(this.stars);
    for (let index = 0; index < 45; index++) {
      const star = new PIXI.Sprite(this.glowTexture);
      star.anchor.set(.5);
      star.tint = 0xe7eee0;
      this.stars.addChild(star);
    }
    this.hills = Array.from({ length: 3 }, () => new PIXI.Graphics());
    this.scene.addChild(...this.hills);
    this.world = new PIXI.Container();
    this.scene.addChild(this.world);
    this.terrainLayer = new PIXI.Container();
    this.terrainLight = makeTerrainLight();
    this.terrainLayer.filters = [this.terrainLight];
    this.terrainLayer.filterArea = new PIXI.Rectangle(0, 0, engine.width, engine.height);
    this.coinLayer = new PIXI.Container();
    this.particleLayer = new PIXI.Container();
    this.trailRibbon = new PIXI.Graphics();
    this.trailRibbon.blendMode = 'add';
    this.world.addChild(this.terrainLayer, this.coinLayer, this.trailRibbon, this.particleLayer);
    this.wind = new PIXI.Graphics();
    this.world.addChild(this.wind);
    this.windText = new PIXI.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif',
      fontSize: 9, fontWeight: '600', fill: 0xc9e5df, letterSpacing: 1.7 } });
    this.windText.anchor.set(.5, 0);
    this.scene.addChild(this.windText);
    this.wisp = new PIXI.Container();
    this.wispGlow = new PIXI.Sprite(this.glowTexture);
    this.wispGlow.anchor.set(.5);
    this.wispGlow.tint = 0x87e7c8;
    this.wispGlow.blendMode = 'add';
    this.wispCore = new PIXI.Graphics().circle(0, 0, 2.3).fill(0xe6fff0);
    this.wispTrail = new PIXI.Graphics();
    this.wispField = new PIXI.Graphics().circle(0, 0, 1)
      .fill({ color: 0x8cebd0, alpha: .025 }).stroke({ color: 0xa7f4dd, width: .025, alpha: .23 });
    this.wispFieldGlow = new PIXI.Sprite(this.glowTexture);
    this.wispFieldGlow.anchor.set(.5); this.wispFieldGlow.tint = 0x7dedd0;
    this.wispFieldGlow.alpha = .13; this.wispFieldGlow.blendMode = 'add';
    this.wisp.addChild(this.wispFieldGlow, this.wispField, this.wispGlow, this.wispTrail, this.wispCore);
    this.world.addChild(this.wisp);
    this.phoenix = new PIXI.Container();
    this.aura = new PIXI.Sprite(this.glowTexture);
    this.aura.anchor.set(.5);
    this.aura.tint = 0xffa342;
    this.aura.blendMode = 'add';
    this.phoenix.addChild(this.aura);
    this.coreLight = new PIXI.Sprite(this.glowTexture);
    this.coreLight.anchor.set(.5); this.coreLight.tint = 0xffebbd; this.coreLight.blendMode = 'add';
    this.phoenix.addChild(this.coreLight);
    this.pickupLayer = new PIXI.Container();
    this.scene.addChild(this.pickupLayer);
    this.tail = new PIXI.Graphics();
    this.phoenix.addChild(this.tail);
    this.bodyFallback = new PIXI.Graphics();
    this.phoenix.addChild(this.bodyFallback);
    this.bodyA = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.bodyB = new PIXI.Sprite(PIXI.Texture.EMPTY);
    for (const body of [this.bodyA, this.bodyB]) {
      body.position.set(-68.75, -58.4);
      body.width = 110;
      body.height = 108;
      body.visible = false;
      this.phoenix.addChild(body);
    }
    this.shield = new PIXI.Graphics();
    this.phoenix.addChild(this.shield);
    this.world.addChild(this.phoenix);
    this.portal = new PIXI.Container();
    this.portalGlow = new PIXI.Sprite(this.glowTexture);
    this.portalGlow.anchor.set(.5);
    this.portalGlow.tint = 0xffd6a0;
    this.portalGlow.blendMode = 'add';
    this.portalRings = new PIXI.Graphics();
    this.portal.addChild(this.portalGlow, this.portalRings);
    this.world.addChild(this.portal);
    this.foreground = new PIXI.Graphics();
    this.scene.addChild(this.foreground);
    this.flash = new PIXI.Graphics();
    this.scene.addChild(this.flash);
  }

  makeGlowTexture() {
    const shape = new PIXI.Graphics();
    for (let radius = 47; radius >= 2; radius -= 3) {
      shape.circle(48, 48, radius).fill({ color: 0xffffff,
        alpha: .015 + .075 * (1 - radius / 48) ** 2 });
    }
    shape.circle(48, 48, 2).fill({ color: 0xffffff, alpha: .5 });
    const texture = this.application.renderer.generateTexture({ target: shape, resolution: 1 });
    shape.destroy();
    return texture;
  }

  makeMoteTexture() {
    const shape = new PIXI.Graphics();
    shape.moveTo(10, 1).bezierCurveTo(9, 7, 2, 7, 3, 13)
      .bezierCurveTo(4, 21, 17, 20, 17, 12)
      .bezierCurveTo(17, 8, 13, 7, 10, 1).fill(0xffd58d);
    shape.moveTo(10, 9).bezierCurveTo(8, 12, 7, 12, 7, 15)
      .bezierCurveTo(8, 19, 13, 18, 13, 15)
      .bezierCurveTo(13, 13, 11, 12, 10, 9).fill(0xfff5ce);
    const texture = this.application.renderer.generateTexture({ target: shape, resolution: 2 });
    shape.destroy();
    return texture;
  }

  makeSparkTexture() {
    const shape = new PIXI.Graphics().roundRect(0, 0, 30, 3, 1.5).fill(0xffffff);
    const texture = this.application.renderer.generateTexture({ target: shape, resolution: 2 });
    shape.destroy();
    return texture;
  }

  async loadArtwork() {
    const engine = this.engine;
    const assets = engine.options.assets || {};
    const loads = [
      assets.background && PIXI.Assets.load(assets.background).then(texture => {
        if (this.destroyed) return;
        this.backdrop.texture = texture;
        this.backdrop.alpha = engine.terrain === 'storm' ? .70 : .86;
        this.resize();
      }),
      assets.phoenixAtlas && PIXI.Assets.load(assets.phoenixAtlas).then(texture => {
        if (this.destroyed) return;
        const width = texture.width / 3, height = texture.height / 2;
        this.frames = Array.from({ length: 6 }, (_, index) => new PIXI.Texture({
          source: texture.source, frame: new PIXI.Rectangle(index % 3 * width,
            Math.floor(index / 3) * height, width, height) }));
        this.bodyA.visible = true;
        this.bodyB.visible = true;
        this.bodyFallback.visible = false;
        this.render(engine);
      }),
      PIXI.Assets.load(assets.terrainAtlas || 'assets/terrain-atlas.png').then(texture => {
        if (this.destroyed) return;
        const width = texture.width / 3, height = texture.height / 2;
        this.terrainFrames = Array.from({ length: 6 }, (_, index) => new PIXI.Texture({
          source: texture.source, frame: new PIXI.Rectangle(index % 3 * width,
            Math.floor(index / 3) * height, width, height) }));
        for (const item of this.obstacles.values()) item.destroy({ children: true });
        this.obstacles.clear();
        this.render(engine);
      }),
    ].filter(Boolean);
    await Promise.allSettled(loads);
    if (!this.destroyed && (engine.paused || !engine.running)) this.render(engine);
  }

  resize() {
    if (!this.application?.renderer || this.destroyed) return;
    const engine = this.engine, bounds = engine.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
    this.application.renderer.resize(width, height);
    this.scene.scale.set(width / engine.width, height / engine.height);
    const H = engine.height, W = engine.width;
    this.sky.clear().rect(0, 0, W, H).fill(engine.terrain === 'canopy' ? 0x18323a : engine.terrain === 'storm' ? 0x132737 : 0x23333d);
    if (this.backdrop.texture !== PIXI.Texture.WHITE) {
      const texture = this.backdrop.texture;
      const scale = Math.max((W + 32) / texture.width, H / texture.height);
      this.backdrop.width = texture.width * scale;
      this.backdrop.height = texture.height * scale;
      this.backdrop.y = (H - this.backdrop.height) / 2;
      this.backdrop.tint = engine.terrain === 'canopy' ? 0xc5d3ce : engine.terrain === 'storm' ? 0xafbfd2 : 0xe1d3c2;
    }
    this.sun.position.set(W * .77, H * .24);
    this.sun.width = this.sun.height = 200;
    this.foreground.clear();
    for (let band = 0; band < 8; band++) {
      this.foreground.rect(0, H - 8 * (band + 1), W, 8).fill({ color: 0x082831, alpha: .03 + band * .006 });
    }
    this.flash.clear().rect(0, 0, W, H).fill(0xffe2b0);
    this.flash.alpha = 0;
    if (this.lastHeight && this.lastHeight !== H) {
      for (const entry of this.obstacles.values()) entry.destroy({ children: true });
      this.obstacles.clear();
    }
    this.lastHeight = H;
  }

  createTerrain(obstacle) {
    const engine = this.engine;
    const container = new PIXI.Container();
    const center = obstacle.center + Math.sin(viewTime(engine) * .9 + obstacle.phase) * obstacle.motion;
    const polygons = obstaclePolygons(obstacle, viewTime(engine))
      .map(polygon => polygon.map(([x, y]) => [x - obstacle.x, y - center]));
    const rows = [...(obstacle.topShape ? [0] : []), ...(obstacle.bottomShape ? [1] : [])];
    for (let index = 0; index < polygons.length; index++) {
      const points = polygons[index];
      const piece = new PIXI.Container();
      const background = new PIXI.Graphics();
      const graphic = new PIXI.Graphics();
      const colors = engine.terrain === 'canopy' ? [0x244b43, 0x54735c, 0x93a675]
        : engine.terrain === 'storm' ? [0x283e53, 0x57748c, 0xa7ced4]
        : [0x514749, 0x8a7b6b, 0xc8b18a];
      background.poly(flatten(points)).fill(colors[0]);
      piece.addChild(background);
      const minX = Math.min(...points.map(point => point[0])), maxX = Math.max(...points.map(point => point[0]));
      const minY = Math.min(...points.map(point => point[1])), maxY = Math.max(...points.map(point => point[1]));
      const terrainColumn = { ruins: 0, canopy: 1, storm: 2 }[engine.terrain];
      const paintedFrame = this.terrainFrames[rows[index] * 3 + terrainColumn];
      if (paintedFrame) {
        const painting = new PIXI.Sprite(paintedFrame);
        // Map the opaque painted mass, rather than transparent cell padding,
        // over the solid collider. These bounds were measured from the atlas.
        const bounds = [[16, 88, 496, 408], [16, 104, 492, 416], [8, 124, 500, 384],
          [16, 16, 492, 456], [12, 44, 496, 440], [16, 48, 500, 440]][rows[index] * 3 + terrainColumn];
        const width = (maxX - minX) * 512 / (bounds[2] - bounds[0]);
        const height = (maxY - minY) * 512 / (bounds[3] - bounds[1]);
        painting.position.set(minX - bounds[0] / 512 * width, minY - bounds[1] / 512 * height);
        painting.width = width; painting.height = height; painting.alpha = .98;
        const mask = new PIXI.Graphics().poly(flatten(points)).fill(0xffffff);
        piece.addChild(painting, mask);
        painting.mask = mask;
      }
      const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length;
      const cy = points.reduce((sum, point) => sum + point[1], 0) / points.length;
      const inset = points.map(([x, y]) => [mix(cx, x, .92), mix(cy, y, .92)]);
      graphic.poly(flatten(inset)).fill({ color: colors[1], alpha: paintedFrame ? .055 : .62 });
      // Broad angular facets stay inside the exact collidable silhouette.
      for (let vertex = 0; vertex < points.length; vertex += 2) {
        const next = (vertex + 1) % points.length;
        graphic.poly([cx, cy, ...points[vertex], ...points[next]])
          .fill({ color: vertex % 4 ? colors[0] : colors[2], alpha: paintedFrame ? .05 : .16 });
      }
      const ridge = points.filter(point => point[1] < cy).sort((a, b) => a[0] - b[0]);
      if (ridge.length > 1) {
        graphic.moveTo(...ridge[0]);
        for (const point of ridge.slice(1)) graphic.lineTo(...point);
        graphic.stroke({ color: colors[2], width: paintedFrame ? 1 : 2.5, alpha: paintedFrame ? .25 : .55 });
      }
      const detail = new PIXI.Graphics();
      const detailAlpha = paintedFrame ? .30 : .90;
      if (engine.terrain === 'canopy') {
        // Grain, forked roots, and clustered foliage read as living woodland,
        // not a green rock. Cache all of this with the individual landform.
        for (let grain = 0; grain < 7; grain++) {
          const y = cy - 32 + grain * 10;
          detail.moveTo(minX - 5, y).bezierCurveTo(cx - 37, y + 18,
            cx + 21, y - 14, maxX + 5, y + 7)
            .stroke({ color: grain % 2 ? 0x26382f : 0xafaa71,
              width: grain % 2 ? 2.1 : 1.1, alpha: .38 * detailAlpha });
        }
        for (let branch = 0; branch < 5; branch++) {
          const bx = minX + 18 + branch * (maxX - minX - 30) / 4;
          const by = cy + Math.sin(branch * 1.3 + obstacle.id) * 20;
          detail.moveTo(bx - 16, by + 20).quadraticCurveTo(bx - 4, by - 8, bx + 16, by - 23)
            .stroke({ color: 0x384d36, width: 4.7, alpha: detailAlpha });
          for (let leaf = 0; leaf < 6; leaf++) {
            const lx = bx - 7 + leaf * 4.2, ly = by + 7 - leaf * 5;
            detail.ellipse(lx + (leaf % 2 ? 5 : -5), ly, 10 + leaf % 3 * 2, 5.5)
              .fill({ color: [0x386c4c, 0x6c925b, 0x98ad6c][(leaf + branch) % 3], alpha: detailAlpha });
            detail.ellipse(lx + (leaf % 2 ? 3 : -6), ly - 1.4, 5, 1.2)
              .fill({ color: 0xc1ce8c, alpha: detailAlpha * .24 });
          }
        }
        for (let mote = 0; mote < 4; mote++) detail.circle(cx - 38 + mote * 25,
          cy - 18 + Math.sin(mote * 2 + obstacle.id) * 25, 1.3)
          .fill({ color: 0xc3efaa, alpha: .7 });
      } else if (engine.terrain === 'storm') {
        for (let shard = 0; shard < 9; shard++) {
          const x = minX + 14 + shard * (maxX - minX - 26) / 8;
          const y = cy + Math.sin(shard * 1.7 + obstacle.id) * 24;
          const h = 14 + (shard * 13 + obstacle.id * 7) % 24;
          detail.poly([x - 8, y + 10, x - 5, y - h, x + 1, y - h - 7,
            x + 9, y - h + 3, x + 10, y + 8, x + 1, y + 16])
            .fill({ color: 0x3f7995, alpha: detailAlpha });
          detail.poly([x + 1, y - h - 7, x + 9, y - h + 3, x + 10, y + 8, x + 1, y + 16])
            .fill({ color: 0x8bc7db, alpha: detailAlpha * .78 });
          detail.moveTo(x + 1, y - h + 1).lineTo(x + 1, y + 10)
            .stroke({ color: 0xd4edf1, width: .9, alpha: detailAlpha * .9 });
        }
      } else {
        for (let course = 0; course < 5; course++) {
          const y = minY + 13 + course * (maxY - minY - 20) / 4;
          detail.moveTo(minX - 5, y).lineTo(maxX + 5, y + Math.sin(course + obstacle.id) * 4)
            .stroke({ color: 0x302f32, width: 1.6, alpha: detailAlpha * .55 });
          for (let joint = 0; joint < 4; joint++) {
            const x = minX + 15 + joint * 43 + course % 2 * 19;
            detail.moveTo(x, y).lineTo(x + 1, y + (maxY - minY) / 5)
              .stroke({ color: 0xd1bb91, width: .8, alpha: detailAlpha * .32 });
          }
        }
        detail.moveTo(cx - 22, cy + 20).lineTo(cx - 22, cy - 3)
          .quadraticCurveTo(cx - 5, cy - 30, cx + 12, cy - 3).lineTo(cx + 12, cy + 20)
          .stroke({ color: 0xccb78b, width: 5, alpha: detailAlpha * .38 });
        for (let rune = 0; rune < 3; rune++) {
          const x = cx + 28 + rune * 12, y = cy - 12 + rune % 2 * 17;
          detail.moveTo(x, y - 5).lineTo(x, y + 6).moveTo(x - 3, y - 2).lineTo(x + 4, y + 2)
            .stroke({ color: 0xe2c587, width: 1, alpha: detailAlpha * .6 });
        }
      }
      const detailMask = new PIXI.Graphics().poly(flatten(points)).fill(0xffffff);
      piece.addChild(graphic, detail, detailMask);
      detail.mask = detailMask;
      const outline = new PIXI.Graphics().poly(flatten(points))
        .stroke({ color: colors[2], width: .8, alpha: paintedFrame ? .28 : .5 });
      piece.addChild(outline);
      container.addChild(piece);
    }
    this.terrainLayer.addChild(container);
    return container;
  }

  render(engine = this.engine) {
    if (!this.ready || this.destroyed || !this.application?.renderer) return;
    const W = engine.width, H = engine.height, time = viewTime(engine), distance = viewDistance(engine);
    const spirit = engine.getWispState(viewY(engine), time);
    const lighting = this.terrainLight.resources.lighting.uniforms;
    lighting.uFire[0] = engine.player.x; lighting.uFire[1] = viewY(engine);
    lighting.uWisp[0] = spirit.x; lighting.uWisp[1] = spirit.y;
    lighting.uReach = spirit.radius;
    lighting.uHeat = (engine.boostTime > 0 ? 1.65 : .50 + engine.flame / 200) + (engine.reducedMotion ? 0 : Math.sin(time * 8) * .055);
    this.terrainLayer.filterArea.width = W; this.terrainLayer.filterArea.height = H;
    this.backdrop.x = (W - this.backdrop.width) / 2 + Math.sin(distance * .0006) * 12;
    this.sun.alpha = engine.terrain === 'storm' ? .18 : .31;
    this.sunRays.clear();
    for (let ray = 0; ray < 4; ray++) {
      const x = W * .77 + ray * 12;
      const drift = Math.sin(time * .13 + ray) * 11;
      this.sunRays.poly([x - 3, H * .22, x + 6, H * .22,
        W * .14 + ray * 56 + drift, H, W * -.13 + ray * 50 + drift, H])
        .fill({ color: 0xf5d5a7, alpha: engine.terrain === 'storm' ? .009 : .015 });
    }
    this.ambientEmbers.children.forEach((ember, index) => {
      ember.position.set(((index * 83 - distance * .12) % (W + 40) + W + 40) % (W + 40) - 20,
        ((index * 109 - time * (4 + index % 3)) % H + H) % H);
      ember.width = ember.height = 5 + index % 3 * 2;
      ember.alpha = .09 + (Math.sin(time * .8 + index * 2) + 1) * .07;
    });
    for (let index = 0; index < this.stars.children.length; index++) {
      const star = this.stars.children[index], data = engine.stars[index];
      star.position.set(data.x, data.y);
      star.width = star.height = data.size * 4;
      star.alpha = .18 + (Math.sin(time * .7 + data.phase) + 1) * .12;
    }
    for (let layer = 0; layer < this.hills.length; layer++) {
      const graphic = this.hills[layer], shift = distance * (.025 + layer * .035);
      graphic.clear();
      for (let index = -1; index < 7; index++) {
        const x = index * 100 - shift % 100;
        const y = H * (.70 + layer * .105) + Math.sin(index * 1.7 + Math.floor(shift / 100) * 1.7) * 32;
        graphic.poly([x - 20, y, x + 11, y - 14, x + 68, y - 9,
          x + 91, y + 9, x + 42, y + 37, x + 4, y + 19])
          .fill({ color: [0x34505a, 0x244a4c, 0x173c40][layer], alpha: .15 + layer * .07 });
      }
    }
    this.world.position.set(engine.reducedMotion ? 0 : Math.sin(time * 77) * engine.shake,
      engine.reducedMotion ? 0 : Math.cos(time * 63) * engine.shake * .5);
    const visibleObstacles = new Set();
    for (const obstacle of engine.layout.obstacles) {
      const x = obstacle.x - distance;
      if (x > W + 100) break;
      if (x + obstacle.width * 1.3 < -80 || obstacle.destroyed) continue;
      visibleObstacles.add(obstacle.id);
      let item = this.obstacles.get(obstacle.id);
      if (!item) { item = this.createTerrain(obstacle); this.obstacles.set(obstacle.id, item); }
      item.position.set(x, obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion);
    }
    for (const [id, item] of this.obstacles) if (!visibleObstacles.has(id)) {
      item.destroy({ children: true }); this.obstacles.delete(id);
    }
    const visibleEmbers = new Set();
    for (const ember of engine.layout.embers) {
      const x = ember.x - distance;
      if (x > W + 50) break;
      if (ember.collected || x < -40) continue;
      visibleEmbers.add(ember.id);
      let item = this.embers.get(ember.id);
      if (!item) {
        item = new PIXI.Container();
        const rich = ember.value === 3;
        const glow = new PIXI.Sprite(this.glowTexture);
        glow.anchor.set(.5); glow.width = glow.height = rich ? 64 : 37;
        glow.tint = rich ? 0xff8d42 : 0xffc86b;
        glow.alpha = rich ? .58 : .35; glow.blendMode = 'add';
        const tail = new PIXI.Sprite(this.glowTexture);
        tail.anchor.set(1, .5); tail.width = rich ? 40 : 25; tail.height = rich ? 12 : 6;
        tail.tint = 0xff913d; tail.alpha = .35; tail.blendMode = 'add';
        const core = new PIXI.Sprite(this.moteTexture);
        core.anchor.set(.5); core.width = rich ? 16 : 9; core.height = rich ? 23 : 14;
        item.addChild(glow, tail, core);
        item.orbit = new PIXI.Container();
        for (let j = 0; j < (rich ? 3 : 1); j++) {
          const spark = new PIXI.Sprite(this.moteTexture);
          spark.anchor.set(.5); spark.width = rich ? 3 : 2; spark.height = rich ? 5 : 3;
          spark.alpha = .8; item.orbit.addChild(spark);
        }
        item.addChild(item.orbit);
        if (rich) {
          const label = new PIXI.Text({ text: '3', style: { fontFamily: 'system-ui, sans-serif',
            fontSize: 12, fontWeight: '700', fill: 0xffefc6, stroke: { color: 0x241222, width: 3 } } });
          label.anchor.set(.5); label.position.set(0, 20); item.addChild(label);
        }
        this.coinLayer.addChild(item); this.embers.set(ember.id, item);
      }
      const animation = engine.reducedMotion ? 0 : time;
      item.position.set(x, ember.y + (ember.attracted ? 0 : Math.sin(animation * 2.8 + ember.phase) * 2));
      const pull = ember.attracted ? Math.sin(Math.min(1, ember.pullTime / .32) * Math.PI) : 0;
      item.scale.set(1 + Math.sin(animation * 3 + ember.phase) * .07 + pull * .55);
      item.children[0].alpha = .45 + pull * .5;
      item.orbit.children.forEach((spark, j) => {
        const angle = animation * 2 + ember.phase + j * Math.PI * 2 / item.orbit.children.length;
        const radius = ember.value === 3 ? 17 : 10;
        spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .65);
      });
    }
    for (const [id, item] of this.embers) if (!visibleEmbers.has(id)) {
      item.destroy({ children: true }); this.embers.delete(id);
    }
    this.drawTrail(engine);
    while (this.particleSprites.length < engine.particles.length) {
      const sprite = new PIXI.Container();
      sprite.glow = new PIXI.Sprite(this.glowTexture);
      sprite.glow.anchor.set(.5); sprite.glow.blendMode = 'add';
      sprite.core = new PIXI.Sprite(this.sparkTexture);
      sprite.core.anchor.set(.5); sprite.core.blendMode = 'add';
      sprite.addChild(sprite.glow, sprite.core);
      this.particleLayer.addChild(sprite); this.particleSprites.push(sprite);
    }
    this.particleSprites.forEach((sprite, index) => {
      const particle = engine.particles[index]; sprite.visible = Boolean(particle);
      if (!particle) return;
      sprite.position.set(particle.x, particle.y);
      const life = clamp(particle.life / particle.maxLife, 0, 1);
      sprite.rotation = particle.rotation || -.18;
      const length = (particle.length || particle.size * 3.5) * (.45 + life * .55);
      sprite.core.width = length;
      sprite.core.height = Math.max(.65, particle.size * (particle.type === 'spark' ? .40 : .68)) * (.4 + life * .6);
      sprite.core.tint = particle.type === 'spark' ? 0xffedc6 : color(particle.color);
      sprite.core.alpha = life * .85;
      sprite.glow.width = length * 2.1;
      sprite.glow.height = Math.max(5, length * .95);
      sprite.glow.tint = color(particle.color);
      sprite.glow.alpha = life * .15 * (Number(particle.glow) || 1);
    });
    this.drawPhoenix(engine);
    this.drawPickups(engine);
    this.drawWind(engine);
    this.drawPortal(engine);
    this.flash.alpha = engine.flash * .28;
    this.application.render();
  }

  drawPickups(engine) {
    while (this.pickupSprites.length < engine.pickupEffects.length) {
      const item = new PIXI.Container();
      item.ring = new PIXI.Graphics();
      item.flash = new PIXI.Sprite(this.glowTexture);
      item.flash.anchor.set(.5); item.flash.tint = 0xffdf8a; item.flash.blendMode = 'add';
      item.label = new PIXI.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif',
        fontSize: 18, fontWeight: '700', fill: 0xffe8a6, stroke: { color: 0x25323a, width: 3 } } });
      item.label.anchor.set(.5);
      item.addChild(item.flash, item.ring, item.label);
      this.pickupLayer.addChild(item); this.pickupSprites.push(item);
    }
    this.pickupSprites.forEach((item, i) => {
      const effect = engine.pickupEffects[i]; item.visible = Boolean(effect);
      if (!effect) return;
      const t = 1 - effect.life / .72;
      item.position.set(effect.x, effect.y);
      item.flash.width = item.flash.height = 80 + t * 40;
      item.flash.alpha = Math.max(0, 1 - t * 3) * .8;
      item.ring.clear().circle(0, 0, engine.reducedMotion ? 18 : 8 + t * 44)
        .stroke({ width: 2 * (1 - t), color: 0xffdc86, alpha: (1 - t) * .8 });
      item.label.text = effect.restored > 0 ? `+${effect.restored} FLAME` : `+${effect.value}`;
      item.label.style.fontSize = effect.restored > 0 ? 13 : 18;
      item.label.position.set(15, -22 - (engine.reducedMotion ? 0 : t * 32));
      item.label.alpha = Math.min(1, (1 - t) * 3);
      item.label.scale.set(1 + Math.sin(t * Math.PI) * .18);
    });
  }

  drawPhoenix(engine) {
    const time = viewTime(engine), boosted = engine.boostTime > 0;
    this.phoenix.position.set(engine.player.x, viewY(engine));
    this.phoenix.rotation = Number.isFinite(engine.visualBank) ? engine.visualBank : clamp(engine.player.vy / (800 * engine.scaleY), -.37, .53);
    this.aura.position.set(-12, 4);
    this.aura.width = this.aura.height = boosted ? 100 : 76;
    this.aura.alpha = boosted ? .35 : .17;
    this.coreLight.position.set(-3, 1);
    this.coreLight.width = this.coreLight.height = boosted ? 40 : 28;
    this.coreLight.alpha = boosted ? .27 : .16;
    this.tail.clear();
    for (let strand = 0; strand < 3; strand++) {
      const wave = Math.sin(time * 7 + strand * 1.5) * 4;
      this.tail.moveTo(-22, 6 + strand * 2)
        .bezierCurveTo(-34, 14 + wave, -46, 5 + wave, -60 - strand * 4, 16 + wave)
        .stroke({ color: [0xffbd58, 0xec743b, 0xffd88a][strand], width: 2.3 - strand * .4,
          alpha: boosted ? .75 : .42 });
    }
    if (this.frames.length) {
      const rate = engine.wingRate ?? (boosted ? 9 : 5.8);
      const phase = engine.wingPhase + (time - engine.time) * rate;
      const frame = Math.floor(phase) % 6, fade = phase - Math.floor(phase);
      this.bodyA.texture = this.frames[frame];
      this.bodyB.texture = this.frames[(frame + 1) % 6];
      for (const body of [this.bodyA, this.bodyB]) { body.width = 110; body.height = 108; }
      this.bodyA.alpha = 1 - fade; this.bodyB.alpha = fade;
    } else {
      const wing = -21 - Math.sin(time * 15) * 13;
      this.bodyFallback.clear().ellipse(-2, 1, 21, 10).fill(0xf4ad56)
        .ellipse(15, -8, 10, 8).fill(0xffd893)
        .poly([3, 4, -11, wing - 10, -20, wing + 1, -26, wing + 15, -9, 11]).fill(0xffc26c)
        .poly([22, -12, 31, -7, 23, -4]).fill(0xffedb5)
        .circle(19, -10, 1.5).fill(0x1e3038);
    }
    this.shield.clear();
    if (engine.shield > 0 || engine.invincible > 0 || engine.exitProtection > 0 || boosted) {
      this.shield.ellipse(0, 0, 35, 30)
        .stroke({ color: boosted ? 0xffd994 : 0xa6e5da, width: boosted ? 1.5 : 1,
          alpha: engine.invincible > 0 ? .35 + Math.sin(time * 18) * .18 : .45 });
    }
    const { x: wx, y: wy, radius: reach, recovery } = engine.getWispState(viewY(engine), time);
    this.wisp.position.set(wx, wy);
    this.wispField.scale.set(reach);
    this.wispFieldGlow.width = this.wispFieldGlow.height = reach * 2;
    this.wispField.alpha = .65 + recovery * .35;
    this.wispCore.scale.set(.92 + Math.sin(time * 3.1) * .12);
    this.wispGlow.width = this.wispGlow.height = boosted && engine.cards.has('hungry-wisp') ? 48 : 31;
    this.wispTrail.clear().moveTo(0, 1).quadraticCurveTo(-10, 14, -16, 4)
      .stroke({ color: 0xa6eed6, width: 1, alpha: .45 });
  }

  drawTrail(engine) {
    this.trailRibbon.clear();
    const history = engine.trail || [];
    if (history.length < 2) return;
    const now = viewTime(engine), distance = viewDistance(engine), maxAge = 1.20;
    for (let layer = 0; layer < 3; layer++) {
      for (let index = 1; index < history.length; index++) {
        const a = history[index - 1], b = history[index];
        const ageA = now - a.time, ageB = now - b.time;
        if (ageA > maxAge || ageB < 0) continue;
        const fadeA = clamp(1 - ageA / maxAge, 0, 1);
        const fadeB = clamp(1 - ageB / maxAge, 0, 1);
        const multiplier = [1.7, .82, .23][layer];
        const wa = Math.max(.05, (a.width || 6) * fadeA ** 1.5 * multiplier);
        const wb = Math.max(.05, (b.width || 6) * fadeB ** 1.5 * multiplier);
        const ax = a.worldX - distance, bx = b.worldX - distance;
        const ay = a.y + Math.sin(a.time * 17) * (1 - fadeA) * 3;
        const by = b.y + Math.sin(b.time * 17) * (1 - fadeB) * 3;
        this.trailRibbon.poly([ax, ay - wa, bx, by - wb, bx, by + wb, ax, ay + wa])
          .fill({ color: [0xe66d31, 0xf7ab53, 0xffe6ac][layer],
            alpha: [.055, .19, .39][layer] * Math.max(fadeA, fadeB) });
      }
    }
  }

  drawWind(engine) {
    const gust = engine.gustState();
    this.wind.clear(); this.windText.visible = gust.active || gust.warning;
    if (!gust.active && !gust.warning) return;
    const W = engine.width, H = engine.height, time = viewTime(engine);
    for (let index = 0; index < 13; index++) {
      const x = (index * 73 + time * 46) % (W + 100) - 50;
      const y = ((index * 91 - time * gust.direction * 52) % H + H) % H;
      this.wind.moveTo(x, y).bezierCurveTo(x + 8, y - gust.direction * 15,
        x + 18, y - gust.direction * 31, x + 28, y - gust.direction * 47)
        .stroke({ color: 0xb8e3e8, alpha: gust.warning ? .15 : .30, width: 1 });
    }
    this.windText.text = gust.warning ? 'WIND APPROACHING' : gust.direction < 0 ? 'RISING WIND' : 'FALLING WIND';
    this.windText.position.set(W / 2, 27);
  }

  drawPortal(engine) {
    const actual = engine.getExitPortal?.();
    const progress = clamp(engine.time / engine.duration, 0, 1);
    this.portal.visible = Boolean(actual);
    if (!this.portal.visible) return;
    const approach = actual.progress;
    this.portal.position.set(actual.x, actual.y);
    this.portalGlow.width = engine.height * .50;
    this.portalGlow.height = engine.height * .85;
    this.portalGlow.alpha = .4 + approach * .2;
    const ry = engine.height * .27;
    this.portalRings.clear().ellipse(0, 0, 32, ry)
      .stroke({ color: 0xffdfab, width: 1.4, alpha: .75 })
      .ellipse(0, 0, 38, ry + 9).stroke({ color: 0xe9ba7b, width: .7, alpha: .40 });
    for (let index = 0; index < 12; index++) {
      const angle = index / 12 * TAU + engine.time * .12;
      const x = Math.cos(angle) * 36, y = Math.sin(angle) * (ry + 4);
      this.portalRings.circle(x, y, 1.4).fill({ color: 0xffe3b3, alpha: .7 });
    }
  }

  destroy() {
    this.destroyed = true; this.ready = false;
    if (this.engine.canvas.style) this.engine.canvas.style.visibility = this.originalVisibility;
    if (this.application?.renderer) {
      try { this.application.destroy({ removeView: true }, { children: true, texture: false, textureSource: false, context: true }); } catch { /* An interrupted init may not own a complete renderer. */ }
    }
    this.application = null;
    this.canvas?.remove();
    this.terrainLight?.destroy(); this.terrainLight = null;
    for (const frame of this.frames) frame.destroy(false);
    this.frames = [];
    for (const frame of this.terrainFrames) frame.destroy(false);
    this.terrainFrames = [];
    this.glowTexture?.destroy(true); this.glowTexture = null;
    this.moteTexture?.destroy(true); this.moteTexture = null;
    this.sparkTexture?.destroy(true); this.sparkTexture = null;
    this.obstacles.clear(); this.embers.clear(); this.particleSprites = []; this.pickupSprites = [];
  }
}
