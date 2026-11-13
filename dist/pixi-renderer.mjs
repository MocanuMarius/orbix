import {formatGlow} from './vitality.mjs?v=living-choices-1';
import * as PIXI from './vendor/pixi.mjs?v=living-choices-1';
import { obstaclePolygons } from './flight.mjs?v=living-choices-1';
import { PhoenixRig } from './phoenix-rig.mjs?v=living-choices-1';
import { Phoenix3D } from './phoenix-3d.mjs?v=living-choices-1';
import { PhoenixFlameEffects } from './flame-effects.mjs?v=living-choices-1';
import { bakeLandform } from './landform-material.mjs?v=living-choices-1';

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

const LIGHT_VERTEX = `precision highp float;
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
        }`;

// Photo albedo and independently captured normal/roughness surfaces share the
// exact polygon masks and UV transforms. No relief is inferred from colour.
export function makeTerrainLight(normalTexture = PIXI.Texture.WHITE, roughTexture = PIXI.Texture.WHITE, formTexture = PIXI.Texture.WHITE) {
  return new PIXI.Filter({
    glProgram: PIXI.GlProgram.from({ vertex: '#version 300 es\n' + LIGHT_VERTEX,
      fragment: `#version 300 es
        precision highp float;
        in vec2 vTextureCoord;
        uniform sampler2D uTexture;
        uniform sampler2D uNormalTexture;
        uniform sampler2D uRoughTexture;
        uniform sampler2D uFormTexture;
        uniform vec4 uInputSize;
        uniform vec2 uMapSize;
        uniform vec2 uWorldOffset;
        uniform vec2 uFire;
        uniform vec2 uWisp;
        uniform vec2 uWake;
        uniform float uHeat;
        uniform float uSpirit;
        uniform float uScale;
        uniform float uNormalStrength;
        uniform float uGrainStrength;
        uniform float uMineralFacets;
        uniform float uFormStrength;
        uniform float uFormShadowStrength;
        out vec4 finalColor;
        const float PI = 3.14159265359;
        // Smooth, stationary mineral microstructure. Gradients are analytic;
        // noise never depends on time or screen resolution.
        float grainHash(vec2 p) {
          vec3 q = fract(vec3(p.xyx) * .1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        vec3 grainNoise(vec2 p) {
          vec2 cell = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          vec2 derivative = 6.0 * f * (1.0 - f);
          float a = grainHash(cell), b = grainHash(cell + vec2(1.0, 0.0));
          float c = grainHash(cell + vec2(0.0, 1.0)), d = grainHash(cell + vec2(1.0));
          float value = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          return vec3(value, mix(b - a, d - c, u.y) * derivative.x,
            mix(c - a, d - b, u.x) * derivative.y);
        }
        float formShadow(vec2 pixel, vec2 lightPixel, float surfaceHeight) {
          if (uFormStrength < .001 || uFormShadowStrength < .001) return 1.0;
          float visibility = 1.0;
          for (int i = 1; i <= 4; i++) {
            float t = float(i) * .14;
            vec2 uv = mix(pixel, lightPixel, t) / max(uMapSize, vec2(1.0));
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
            vec4 blocker = texture(uFormTexture, uv);
            if (blocker.a < .08) continue;
            float height = blocker.b / max(blocker.a, .001) * 96.0;
            float rayHeight = mix(surfaceHeight, 110.0, t);
            float occlusion = smoothstep(1.5, 9.5, height - rayHeight);
            visibility = min(visibility, 1.0 - occlusion * .86);
          }
          return mix(1.0, visibility, clamp(uFormStrength * uFormShadowStrength, 0.0, 1.0));
        }
        vec3 illuminate(vec3 albedo, vec3 normal, vec2 pixel, vec2 origin,
                        vec3 tint, float radius, float power, float roughness,
                        float reflectance, float surfaceHeight) {
          vec2 offset = (origin - pixel) / max(uScale, .001);
          float t = clamp(1.0 - length(offset) / radius, 0.0, 1.0);
          float attenuation = t * t * (3.0 - 2.0 * t);
          vec3 lightDirection = normalize(vec3(offset, max(25.0, 110.0 - surfaceHeight)));
          vec3 viewDirection = vec3(0.0, 0.0, 1.0);
          vec3 halfway = normalize(lightDirection + viewDirection);
          float nl = max(dot(normal, lightDirection), 0.0);
          float nv = max(normal.z, .001);
          float nh = max(dot(normal, halfway), .001);
          float vh = max(dot(viewDirection, halfway), .001);
          float a = roughness * roughness;
          float a2 = a * a;
          float denominator = nh * nh * (a2 - 1.0) + 1.0;
          float distribution = a2 / max(PI * denominator * denominator, .00001);
          // Height-correlated Smith visibility and a colourless dielectric
          // Fresnel response, rather than metallic flakes or emissive glitter.
          float visibilityV = nl * sqrt(max(nv * nv * (1.0 - a2) + a2, .00001));
          float visibilityL = nv * sqrt(max(nl * nl * (1.0 - a2) + a2, .00001));
          float visibility = .5 / max(visibilityV + visibilityL, .0001);
          vec3 fresnel = vec3(reflectance) + vec3(1.0 - reflectance) * pow(1.0 - vh, 5.0);
          vec3 specular = distribution * visibility * fresnel;
          vec3 diffuse = albedo * (vec3(1.0) - fresnel) / PI;
          return (diffuse + specular) * tint * power * attenuation * nl;
        }
        void main() {
          vec4 surface = texture(uTexture, vTextureCoord);
          if (surface.a < .001) { finalColor = vec4(0.0); return; }
          vec2 pixel = vTextureCoord * uInputSize.xy;
          vec2 mapUv = clamp(pixel / max(uMapSize, vec2(1.0)), vec2(0.0), vec2(1.0));
          vec4 sampledNormal = texture(uNormalTexture, mapUv);
          vec4 sampledRoughness = texture(uRoughTexture, mapUv);
          vec4 sampledForm = texture(uFormTexture, mapUv);
          vec3 encoded = sampledNormal.rgb / max(sampledNormal.a, .001);
          vec3 tangentNormal = sampledNormal.a > .05 ? encoded * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);
          // The supplied maps use OpenGL tangent +Y. The 2D world has downward
          // positive Y, so only the decoded Y component changes convention.
          vec3 fineNormal = normalize(vec3(tangentNormal.x * uNormalStrength,
            -tangentNormal.y * uNormalStrength, max(tangentNormal.z, .12)));
          float roughness = sampledRoughness.a > .05
            ? clamp(sampledRoughness.r / max(sampledRoughness.a, .001), .16, .97) : .84;
          vec2 world = pixel / max(uScale, .001) + uWorldOffset;
          float pixelFootprint = max(length(dFdx(world)), length(dFdy(world)));
          float coarseResolved = 1.0 - smoothstep(.65, 1.3, pixelFootprint / 3.2);
          float fineResolved = 1.0 - smoothstep(.45, .95, pixelFootprint / 1.15);
          vec3 coarseGrain = grainNoise(world / 3.2);
          vec3 fineGrain = grainNoise(world / 1.15 + vec2(19.3, 7.1));
          float grainStrength = clamp(uGrainStrength, 0.0, 1.0);
          fineNormal = normalize(fineNormal + vec3(
            (coarseGrain.yz * .036 * coarseResolved + fineGrain.yz * .016 * fineResolved) * grainStrength, 0.0));
          roughness = clamp(roughness + ((coarseGrain.x - .5) * .10 * coarseResolved
            + (fineGrain.x - .5) * .035 * fineResolved) * grainStrength, .22, .97);
          float reflectance = mix(.04, .037 + .006 * coarseGrain.x, grainStrength);
          // Sparse quartz/feldspar-like faces sit within the rough stone, not
          // on a metallic or emissive overlay. Their placement never animates.
          vec2 mineralCell = floor(world / 4.8);
          vec2 mineralLocal = fract(world / 4.8) - .5;
          float mineralChoice = grainHash(mineralCell + vec2(83.7, 31.9));
          vec2 mineralAxis = normalize(vec2(grainHash(mineralCell + vec2(7.3, 61.1)),
            grainHash(mineralCell + vec2(47.8, 13.2))) - .49);
          vec2 mineralPosition = vec2(dot(mineralLocal, mineralAxis),
            dot(mineralLocal, vec2(-mineralAxis.y, mineralAxis.x))) / vec2(.33, .26);
          float mineralDistance = length(mineralPosition);
          float mineralEdge = clamp(fwidth(mineralDistance), .08, .7);
          float mineralResolved = 1.0 - smoothstep(.22, .48, pixelFootprint / 4.8);
          float mineralMask = smoothstep(.82, .88, mineralChoice)
            * (1.0 - smoothstep(1.0 - mineralEdge * .5, 1.0 + mineralEdge * .5, mineralDistance))
            * mineralResolved * grainStrength * clamp(uMineralFacets, 0.0, 1.0);
          vec2 mineralTilt = (vec2(grainHash(mineralCell + vec2(26.2, 8.7)),
            grainHash(mineralCell + vec2(5.4, 93.1))) - .5) * .24;
          fineNormal = normalize(fineNormal + vec3(mineralTilt * mineralMask, 0.0));
          float mineralRoughness = .35 + .13 * grainHash(mineralCell + vec2(14.8, 37.6));
          roughness = mix(roughness, mineralRoughness, mineralMask);
          reflectance = mix(reflectance, .04, mineralMask);
          vec3 encodedForm = sampledForm.rgb / max(sampledForm.a, .001);
          float formStrength = sampledForm.a > .08 ? clamp(uFormStrength, 0.0, 1.0) : 0.0;
          vec2 macroXY = (encodedForm.rg * 2.0 - 1.0) * formStrength;
          vec3 macroNormal = normalize(vec3(macroXY, sqrt(max(.05, 1.0 - dot(macroXY, macroXY)))));
          vec3 tangent = normalize(vec3(macroNormal.z, 0.0, -macroNormal.x));
          vec3 bitangent = normalize(cross(macroNormal, tangent));
          vec3 normal = normalize(tangent * fineNormal.x + bitangent * fineNormal.y + macroNormal * fineNormal.z);
          float surfaceHeight = clamp(encodedForm.b, 0.0, 1.0) * 96.0 * formStrength;
          float ao = mix(1.0, clamp(sampledForm.a, .45, 1.0), formStrength);
          // Filter under-resolved normal variance into GGX's lobe width. This
          // keeps moving fine stone from producing unstable white sparkles.
          vec3 normalDx = dFdx(normal), normalDy = dFdy(normal);
          float variance = .15 * (dot(normalDx, normalDx) + dot(normalDy, normalDy));
          roughness = pow(clamp(pow(roughness, 4.0) + min(2.0 * variance, .08), .0023, 1.0), .25);
          vec3 albedo = pow(max(surface.rgb / max(surface.a, .001), vec3(0.0)), vec3(2.2));
          float moon = max(dot(normal, normalize(vec3(-.30, -.61, .74))), 0.0);
          vec3 lit = albedo * vec3(.075, .105, .17) * (.7 + moon * .7) * ao;
          vec3 diffusePigment = albedo * (.86 + .14 * ao);
          float fireVisibility = formShadow(pixel, uFire, surfaceHeight);
          float wispVisibility = formShadow(pixel, uWisp, surfaceHeight);
          lit += illuminate(diffusePigment, normal, pixel, uFire, vec3(1.0, .30, .055), 275.0, uHeat * 5.0, roughness, reflectance, surfaceHeight) * fireVisibility;
          lit += illuminate(diffusePigment, normal, pixel, uWake, vec3(1.0, .19, .035), 160.0, uHeat * 1.5, roughness, reflectance, surfaceHeight) * mix(1.0, fireVisibility, .6);
          lit += illuminate(diffusePigment, normal, pixel, uWisp, vec3(.97, .99, 1.0), 180.0, uSpirit * 4.1, roughness, reflectance, surfaceHeight) * wispVisibility;
          vec3 mapped = vec3(1.0) - exp(-lit * 1.45);
          finalColor = vec4(pow(mapped, vec3(1.0 / 2.2)) * surface.a, surface.a);
        }`,
    }),
    resources: {
      uNormalTexture: normalTexture.source,
      uRoughTexture: roughTexture.source,
      uFormTexture: formTexture.source,
      lighting: {
        uFire: { value: new Float32Array([98, 310]), type: 'vec2<f32>' },
        uWisp: { value: new Float32Array([68, 330]), type: 'vec2<f32>' },
        uWake: { value: new Float32Array([40, 320]), type: 'vec2<f32>' },
        uMapSize: { value: new Float32Array([390, 620]), type: 'vec2<f32>' },
        uWorldOffset: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
        uHeat: { value: 1, type: 'f32' }, uSpirit: { value: 1, type: 'f32' },
        uScale: { value: 1, type: 'f32' }, uNormalStrength: { value: 1.2, type: 'f32' },
        uGrainStrength: { value: 1, type: 'f32' }, uMineralFacets: { value: 1, type: 'f32' },
        uFormStrength: { value: 0, type: 'f32' },
        uFormShadowStrength: { value: .5, type: 'f32' },
      },
    },
  });
}

function makeRadiance() {
  return new PIXI.Filter({ glProgram: PIXI.GlProgram.from({ vertex: LIGHT_VERTEX,
    fragment: `precision highp float;
      in vec2 vTextureCoord;
      uniform sampler2D uTexture;
      uniform vec4 uInputSize;
      out vec4 finalColor;
      vec3 bright(vec2 uv) { return max(texture(uTexture, uv).rgb - vec3(.57), vec3(0.0)); }
      void main() {
        vec4 base = texture(uTexture, vTextureCoord);
        vec2 stepSize = uInputSize.zw * 4.0;
        vec3 glow = bright(vTextureCoord + vec2(stepSize.x, 0.0))
          + bright(vTextureCoord - vec2(stepSize.x, 0.0))
          + bright(vTextureCoord + vec2(0.0, stepSize.y))
          + bright(vTextureCoord - vec2(0.0, stepSize.y));
        finalColor = vec4(base.rgb + glow * .20, base.a);
      }`,
  }) });
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
      if (this.application.renderer.context.webGLVersion < 2) throw new Error('The material renderer requires WebGL 2.');
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
    this.radiance = makeRadiance(); this.scene.filters = [this.radiance];
    this.scene.filterArea = new PIXI.Rectangle(0, 0, engine.width, engine.height);
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
    this.normalRoot = new PIXI.Container(); this.normalLayer = new PIXI.Container();
    this.roughRoot = new PIXI.Container(); this.roughLayer = new PIXI.Container();
    this.formRoot = new PIXI.Container(); this.formLayer = new PIXI.Container();
    this.normalRoot.addChild(this.normalLayer); this.roughRoot.addChild(this.roughLayer);
    this.formRoot.addChild(this.formLayer);
    this.normalTarget = PIXI.RenderTexture.create({ width: 1, height: 1, resolution: 1, antialias: false });
    this.roughTarget = PIXI.RenderTexture.create({ width: 1, height: 1, resolution: 1, antialias: false });
    this.formTarget = PIXI.RenderTexture.create({ width: 1, height: 1, resolution: 1, antialias: false });
    this.terrainLight = makeTerrainLight(this.normalTarget, this.roughTarget, this.formTarget);
    this.terrainLight.resources.lighting.uniforms.uFormStrength = 1;
    this.terrainLayer.filters = [this.terrainLight];
    this.terrainLayer.filterArea = new PIXI.Rectangle(0, 0, engine.width, engine.height);
    this.coinLayer = new PIXI.Container();
    this.particleLayer = new PIXI.Container();
    this.trailRibbon = new PIXI.Graphics();
    this.trailRibbon.blendMode = 'add';
    this.world.addChild(this.terrainLayer, this.coinLayer, this.trailRibbon, this.particleLayer);
    this.flames = new PhoenixFlameEffects({glowTexture:this.glowTexture,sparkTexture:this.sparkTexture});
    this.world.addChild(this.flames.container);
    this.wind = new PIXI.Graphics();
    this.world.addChild(this.wind);
    this.windText = new PIXI.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif',
      fontSize: 9, fontWeight: '600', fill: 0xc9e5df, letterSpacing: 1.7 } });
    this.windText.anchor.set(.5, 0);
    this.scene.addChild(this.windText);
    this.wisp = new PIXI.Container();
    this.wispGlow = new PIXI.Sprite(this.glowTexture);
    this.wispGlow.anchor.set(.5);
    this.wispGlow.tint = 0xf4f7ff;
    this.wispGlow.blendMode = 'add';
    this.wispCore = new PIXI.Graphics().circle(0, 0, 2.3).fill(0xffffff);
    this.wispTrail = new PIXI.Graphics();
    this.wispField = new PIXI.Graphics().circle(0, 0, 100)
      .fill({ color: 0x8cebd0, alpha: .025 }).stroke({ color: 0xa7f4dd, width: .8, alpha: .23 });
    this.wispFieldGlow = new PIXI.Sprite(this.glowTexture);
    this.wispFieldGlow.anchor.set(.5); this.wispFieldGlow.tint = 0xd9e5ff;
    this.wispFieldGlow.alpha = .13; this.wispFieldGlow.blendMode = 'add';
    this.wispRange = new PIXI.Container();
    this.wispRange.addChild(this.wispFieldGlow, this.wispField);
    this.wispRecoveryArc = new PIXI.Graphics(); this.wispRange.addChild(this.wispRecoveryArc);
    this.world.addChild(this.wispRange);
    this.wispCargo = new PIXI.Sprite(this.moteTexture);
    this.wispCargo.anchor.set(.5); this.wispCargo.width = 9; this.wispCargo.height = 14;
    this.wispCargo.position.set(9, 3); this.wispCargo.visible = false;
    this.wisp.addChild(this.wispGlow, this.wispTrail, this.wispCargo, this.wispCore);
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
        this.backdrop.alpha = engine.passage === 'cavern' ? .57 : .93;
        this.resize();
      }),
      Promise.resolve().then(() => {
        if (this.destroyed) return;
        this.model3D = new Phoenix3D();
        this.model3D.render(engine, viewTime(engine));
        this.modelTexture = PIXI.Texture.from(this.model3D.canvas);
        this.modelSprite = new PIXI.Sprite(this.modelTexture);
        this.modelSprite.anchor.set(.5);
        this.modelSprite.width = this.modelSprite.height = 180;
        this.phoenix.addChildAt(this.modelSprite, 3);
        this.bodyFallback.visible = false; this.tail.visible = false;
        this.canvas.dataset.phoenixRenderer = 'three-webgl-3d';
        this.render(engine);
      }).catch(() => {
        this.modelSprite?.destroy(); this.modelSprite = null;
        this.modelTexture?.destroy(true); this.modelTexture = null;
        this.model3D?.destroy(); this.model3D = null;
        if (this.destroyed) return;
        return PIXI.Assets.load(assets.phoenixRig || 'assets/phoenix-rig.png').then(texture => {
        if (this.destroyed) return;
        this.rig = new PhoenixRig(texture); this.phoenix.addChildAt(this.rig.container, 3);
        this.bodyFallback.visible = false; this.tail.visible = false;
        this.canvas.dataset.phoenixRenderer = 'mesh-fallback';
        this.render(engine);
        });
      }),
      this.loadTerrainMaterials(),
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
    this.resizeTerrainMaps(width, height);
    const H = engine.height, W = engine.width;
    this.sky.clear().rect(0, 0, W, H).fill(engine.terrain === 'canopy' ? 0x18323a : engine.terrain === 'storm' ? 0x132737 : 0x23333d);
    if (this.backdrop.texture !== PIXI.Texture.WHITE) {
      const texture = this.backdrop.texture;
      const scale = Math.max((W + 32) / texture.width, H / texture.height);
      this.backdrop.width = texture.width * scale;
      this.backdrop.height = texture.height * scale;
      this.backdrop.y = (H - this.backdrop.height) / 2;
      this.backdrop.tint = 0xcbdcff;
    }
    this.sun.position.set(W * .73, H * .17);
    this.sun.width = this.sun.height = 200;
    this.foreground.clear();
    for (let band = 0; band < 8; band++) {
      this.foreground.rect(0, H - 8 * (band + 1), W, 8).fill({ color: 0x082831, alpha: .03 + band * .006 });
    }
    this.flash.clear().rect(0, 0, W, H).fill(0xffe2b0);
    this.flash.alpha = 0;
    if (this.lastHeight && this.lastHeight !== H) {
      for (const entry of this.obstacles.values()) this.destroyTerrain(entry);
      this.obstacles.clear();
    }
    this.lastHeight = H;
  }

  async loadTerrainMaterials() {
    const load = async name => {
      const [colorTexture, normalTexture, roughTexture] = await Promise.all([
        PIXI.Assets.load(new URL(`./assets/pbr-${name}-color.jpg`, import.meta.url).href),
        PIXI.Assets.load(new URL(`./assets/pbr-${name}-normal.jpg`, import.meta.url).href),
        PIXI.Assets.load(new URL(`./assets/pbr-${name}-roughness.jpg`, import.meta.url).href),
      ]);
      return { color: colorTexture, normal: normalTexture, roughness: roughTexture };
    };
    const loaded = await Promise.allSettled([load('rock'), load('bark')]);
    if (this.destroyed) return;
    this.terrainMaterials = {
      rock: loaded[0].status === 'fulfilled' ? loaded[0].value : null,
      bark: loaded[1].status === 'fulfilled' ? loaded[1].value : null,
    };
    const selected = this.engine.terrain === 'canopy' ? 1 : 0;
    this.canvas.dataset.terrainMaterial = loaded[selected].status === 'fulfilled' ? 'photographic-pbr' : 'fallback';
    if (loaded[selected].status !== 'fulfilled') this.canvas.dataset.materialError = String(loaded[selected].reason?.message || 'unavailable');
    for (const item of this.obstacles.values()) this.destroyTerrain(item);
    this.obstacles.clear();
    this.render(this.engine);
  }

  resizeTerrainMaps(width, height) {
    if (!this.normalTarget || !this.roughTarget) return;
    const W = Math.max(1, Math.round(width)), H = Math.max(1, Math.round(height));
    if (this.normalTarget.width !== W || this.normalTarget.height !== H) {
      this.normalTarget.resize(W, H, 1); this.roughTarget.resize(W, H, 1); this.formTarget.resize(W, H, 1);
    }
    this.normalRoot.scale.copyFrom(this.scene.scale);
    this.roughRoot.scale.copyFrom(this.scene.scale);
    this.formRoot.scale.copyFrom(this.scene.scale);
    const uniforms = this.terrainLight.resources.lighting.uniforms;
    uniforms.uMapSize[0] = W; uniforms.uMapSize[1] = H;
  }

  renderTerrainMaps() {
    const renderer = this.application.renderer;
    this.normalRoot.position.set(this.world.x * this.scene.scale.x, this.world.y * this.scene.scale.y);
    this.roughRoot.position.copyFrom(this.normalRoot.position);
    this.formRoot.position.copyFrom(this.normalRoot.position);
    renderer.render({ container: this.normalRoot, target: this.normalTarget, clear: true });
    renderer.render({ container: this.roughRoot, target: this.roughTarget, clear: true });
    renderer.render({ container: this.formRoot, target: this.formTarget, clear: true });
  }

  destroyTerrain(item) {
    if (!item) return;
    if (item.normalCompanion && !item.normalCompanion.destroyed) item.normalCompanion.destroy({ children: true });
    if (item.roughCompanion && !item.roughCompanion.destroyed) item.roughCompanion.destroy({ children: true });
    if (item.formCompanion && !item.formCompanion.destroyed) item.formCompanion.destroy({ children: true });
    if (!item.destroyed) item.destroy({ children: true });
    for (const texture of item.bakedTextures || []) texture.destroy(true);
    item.bakedTextures = [];
  }

  createTerrain(obstacle) {
    const engine = this.engine;
    const container = new PIXI.Container();
    container.normalCompanion = new PIXI.Container();
    container.roughCompanion = new PIXI.Container();
    container.formCompanion = new PIXI.Container();
    container.bakedTextures = [];
    const center = obstacle.center + Math.sin(viewTime(engine) * .9 + obstacle.phase) * obstacle.motion;
    const polygons = obstaclePolygons(obstacle, viewTime(engine))
      .map(polygon => polygon.map(([x, y]) => [x - obstacle.x, y - center]));
    const material = this.terrainMaterials?.[engine.terrain === 'canopy' ? 'bark' : 'rock'];
    const tileScale = engine.terrain === 'canopy' ? .32 : .38;
    const layers = [
      { target: container, texture: material?.color, fallback: engine.terrain === 'canopy' ? 0x655b46 : 0x92908a },
      { target: container.normalCompanion, texture: material?.normal, fallback: 0x8080ff },
      { target: container.roughCompanion, texture: material?.roughness, fallback: 0xd6d6d6 },
    ];
    for (let index = 0; index < polygons.length; index++) {
      const points = polygons[index], flat = flatten(points);
      const top = Boolean(obstacle.topShape) && index === 0;
      const baked = bakeLandform({ points, top, terrain: engine.terrain, seed: obstacle.id + (top ? 71 : 0),
        scale: engine.height / 620, clipY: [-center - 24, engine.height - center + 24] });
      const bitmapTexture = data => {
        const canvas = document.createElement('canvas'); canvas.width = baked.width; canvas.height = baked.height;
        canvas.getContext('2d').putImageData(new ImageData(data, baked.width, baked.height), 0, 0);
        const texture = PIXI.Texture.from(canvas); container.bakedTextures.push(texture); return texture;
      };
      const formTexture = bitmapTexture(baked.form), weatherTexture = bitmapTexture(baked.weather);
      const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
      const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
      for (const layer of layers) {
        const piece = new PIXI.Container();
        const backing = new PIXI.Graphics().poly(flat).fill(layer.fallback);
        piece.addChild(backing);
        if (layer.texture) {
          const surface = new PIXI.TilingSprite({ texture: layer.texture,
            width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) });
          surface.position.set(minX, minY);
          surface.tileScale.set(tileScale);
          // Every map uses exactly the same tile phase, scale, extent and mask.
          surface.tilePosition.set(-(obstacle.x + minX), -(center + minY));
          const mask = new PIXI.Graphics().poly(flat).fill(0xffffff);
          piece.addChild(surface, mask); surface.mask = mask;
        }
        layer.target.addChild(piece);
      }
      const stamp = (texture, target, data = false) => {
        const surface = new PIXI.Sprite(texture); surface.position.set(baked.minX, baked.minY);
        if (data) surface.blendMode = 'none';
        surface.width = baked.sizeX; surface.height = baked.sizeY;
        const mask = new PIXI.Graphics().poly(flat).fill(0xffffff);
        target.addChild(surface, mask); surface.mask = mask;
      };
      stamp(formTexture, container.formCompanion, true);
      stamp(weatherTexture, container);
      // A very slight inset rim adds thickness without covering the photograph
      // with the old painted facets, fake crystal patches, or masonry grids.
      const rim = new PIXI.Graphics().poly(flat)
        .stroke({ color: 0x15232a, width: 1.1, alpha: .11, alignment: 1 });
      container.addChild(rim);
    }
    this.terrainLayer.addChild(container);
    this.normalLayer.addChild(container.normalCompanion);
    this.roughLayer.addChild(container.roughCompanion);
    this.formLayer.addChild(container.formCompanion);
    return container;
  }

  render(engine = this.engine) {
    if (!this.ready || this.destroyed || !this.application?.renderer) return;
    const W = engine.width, H = engine.height, time = viewTime(engine), distance = viewDistance(engine);
    const spirit = engine.getWispState(viewY(engine), time);
    const lighting = this.terrainLight.resources.lighting.uniforms;
    const scale = this.application.renderer.screen.width / W;
    lighting.uScale = scale;
    lighting.uMineralFacets = engine.terrain === 'canopy' ? 0 : 1;
    lighting.uFire[0] = engine.player.x * scale; lighting.uFire[1] = viewY(engine) * scale;
    lighting.uWisp[0] = spirit.x * scale; lighting.uWisp[1] = spirit.y * scale;
    const wake = engine.trail[Math.max(0, engine.trail.length - 13)];
    lighting.uWake[0] = (wake ? wake.worldX - distance : engine.player.x - 35) * scale;
    lighting.uWake[1] = (wake?.y ?? viewY(engine)) * scale;
    lighting.uSpirit = spirit.phase === 'cooldown' ? .65 + spirit.recovery * .35 : 1.15;
    lighting.uHeat = (engine.boostTime > 0 ? 2.0 : .75 + engine.flame / ((engine.maxFlame||100)*2)) + (engine.reducedMotion ? 0 : Math.sin(time * 9) * .04 + Math.sin(time * 17) * .025);
    this.terrainLayer.filterArea.width = W * scale; this.terrainLayer.filterArea.height = H * scale;
    this.scene.filterArea.width = W * scale; this.scene.filterArea.height = H * scale;
    this.backdrop.x = W * .73 - this.backdrop.width * .84 + Math.sin(distance * .0003) * 8;
    this.sun.tint = 0x91b9ff; this.sun.alpha = engine.passage === 'cavern' ? .12 : .32;
    this.sunRays.clear();
    for (let ray = 0; ray < 4; ray++) {
      const x = W * .77 + ray * 12;
      const drift = Math.sin(time * .13 + ray) * 11;
      this.sunRays.poly([x - 3, H * .22, x + 6, H * .22,
        W * .14 + ray * 56 + drift, H, W * -.13 + ray * 50 + drift, H])
        .fill({ color: 0x96bfff, alpha: engine.passage === 'cavern' ? .008 : .018 });
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
        graphic.poly([x - 50, H + 30, x - 50, y + 60, x + 11, y - 28,
          x + 48, y + 10, x + 78, y - 4, x + 140, y + 60, x + 140, H + 30])
          .fill({ color: [0x20315e, 0x172c52, 0x102240][layer], alpha: .12 + layer * .04 });
      }
    }
    this.world.position.set(engine.reducedMotion ? 0 : Math.sin(time * 77) * engine.shake,
      engine.reducedMotion ? 0 : Math.cos(time * 63) * engine.shake * .5);
    lighting.uWorldOffset[0] = distance - this.world.x;
    lighting.uWorldOffset[1] = -this.world.y;
    const visibleObstacles = new Set();
    for (const obstacle of engine.layout.obstacles) {
      const x = obstacle.x - distance;
      if (x > W + 250) break;
      if (x + obstacle.width * 2.5 < -80 || obstacle.destroyed) continue;
      visibleObstacles.add(obstacle.id);
      let item = this.obstacles.get(obstacle.id);
      if (!item) { item = this.createTerrain(obstacle); this.obstacles.set(obstacle.id, item); }
      item.position.set(x, obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion);
      item.normalCompanion.position.copyFrom(item.position);
      item.roughCompanion.position.copyFrom(item.position);
      item.formCompanion.position.copyFrom(item.position);
    }
    for (const [id, item] of this.obstacles) if (!visibleObstacles.has(id)) {
      this.destroyTerrain(item); this.obstacles.delete(id);
    }
    this.renderTerrainMaps();
    const visibleEmbers = new Set();
    for (const ember of engine.layout.embers) {
      if (ember.carried || ember.collected) continue;
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
      const pull = ember.attracted ? .45 + Math.sin(animation * 7) * .15 : 0;
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
    this.flames.render(engine);
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
      item.label.text = effect.restored > 0 ? `+${formatGlow(effect.restored,engine.maxFlame||100)} SPARKS` : `+${effect.value}`;
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
    this.aura.width = this.aura.height = boosted ? 145 : 98;
    this.aura.alpha = boosted ? .48 : .26;
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
    if (this.model3D) {
      this.model3D.render(engine, time);
      this.modelTexture.source.update();
    } else if (this.rig) {
      this.rig.render(engine, time);
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
    const { x: wx, y: wy, homeX, homeY, radius: reach, recovery, phase, carrying } = engine.getWispState(viewY(engine), time);
    this.wisp.position.set(wx, wy);
    this.wispRange.position.set(homeX, homeY);
    this.wispField.scale.set(reach / 100);
    this.wispFieldGlow.width = this.wispFieldGlow.height = reach * 2 * (.45 + recovery * .55);
    this.wispField.alpha = phase === 'ready' ? .75 : .2;
    this.wispFieldGlow.alpha = phase === 'ready' ? .12 : .035 + recovery * .055;
    this.wispRecoveryArc.clear();
    if (phase === 'cooldown') this.wispRecoveryArc.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * recovery)
      .stroke({ color: 0xa6eed6, alpha: .7, width: 1.4 });
    this.wispCore.scale.set(.92 + Math.sin(time * 3.1) * .12);
    this.wispGlow.width = this.wispGlow.height = carrying ? 48 : phase === 'cooldown' ? 24 : 38;
    this.wispGlow.tint = 0xf4f7ff;
    this.wispCargo.visible = carrying;
    this.wispTrail.clear();
    const history = engine.wisp.history;
    for (let i = 1; i < history.length; i++) {
      const a = history[i - 1], b = history[i];
      this.wispTrail.moveTo(a.x - viewDistance(engine) - wx, a.y - wy)
        .lineTo(b.x - viewDistance(engine) - wx, b.y - wy)
        .stroke({ color: carrying ? 0xffd997 : 0xe9efff, width: 1.5,
          alpha: i / history.length * .65 });
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
    for (const item of this.obstacles.values()) this.destroyTerrain(item);
    this.obstacles.clear();
    this.normalRoot?.destroy({ children: true }); this.normalRoot = null;
    this.roughRoot?.destroy({ children: true }); this.roughRoot = null;
    this.formRoot?.destroy({ children: true }); this.formRoot = null;
    this.normalLayer = null; this.roughLayer = null;
    this.normalTarget?.destroy(true); this.normalTarget = null;
    this.roughTarget?.destroy(true); this.roughTarget = null;
    this.formTarget?.destroy(true); this.formTarget = null;
    this.terrainMaterials = null;
    if (this.engine.canvas.style) this.engine.canvas.style.visibility = this.originalVisibility;
    this.flames?.destroy(); this.flames = null;
    this.rig?.destroy(); this.rig = null;
    this.model3D?.destroy(); this.model3D = null;
    this.modelTexture?.destroy(true); this.modelTexture = null;
    if (this.application?.renderer) {
      try { this.application.destroy({ removeView: true }, { children: true, texture: false, textureSource: false, context: true }); } catch { /* An interrupted init may not own a complete renderer. */ }
    }
    this.application = null;
    this.canvas?.remove();
    this.terrainLight?.destroy(); this.terrainLight = null;
    this.radiance?.destroy(); this.radiance = null;
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
