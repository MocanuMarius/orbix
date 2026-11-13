import * as PIXI from './vendor/pixi.mjs?v=pixel-map-1';

const TAU = Math.PI * 2;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const tint = value => typeof value === 'number' ? value
  : Number.parseInt(String(value || '#ffe6b8').replace('#', ''), 16);
const noise = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

/**
 * Cosmetic phoenix fire. Mount container in world space, behind the phoenix.
 * Owner-supplied textures stay owned by the view and are never destroyed here.
 *
 * new PhoenixFlameEffects({ glowTexture, sparkTexture })
 * effects.render(engine); effects.destroy();
 */
export class PhoenixFlameEffects {
  constructor(options = {}, sparkTexture) {
    // Positional textures are also accepted for the small existing view API.
    const isOptions = options && Object.hasOwn(options, 'glowTexture');
    this.glowTexture = (isOptions ? options.glowTexture : options) || PIXI.Texture.WHITE;
    this.sparkTexture = (isOptions ? options.sparkTexture : sparkTexture) || this.glowTexture;
    this.container = new PIXI.Container();
    this.container.label = 'phoenix-continuous-flame';
    this.container.eventMode = 'none';
    this.destroyed = false;
    this.lastTime = null;
    this.lastBoosts = null;
    this.lastFlaps = null;
    this.boostKick = 0;
    this.flapKick = 0;
    this.burstCursor = 0;
    this.waveCursor = 0;

    this.haze = [];
    for (let i = 0; i < 5; i++) {
      const glow = new PIXI.Sprite(this.glowTexture);
      glow.anchor.set(.5); glow.blendMode = 'add'; glow.visible = false;
      this.container.addChild(glow); this.haze.push(glow);
    }
    this.ribbon = new PIXI.Graphics(); this.ribbon.blendMode = 'add';
    this.tendrils = new PIXI.Graphics(); this.tendrils.blendMode = 'add';
    this.container.addChild(this.ribbon, this.tendrils);

    this.particleLayer = new PIXI.Container();
    this.particleLayer.eventMode = 'none';
    this.container.addChild(this.particleLayer);
    this.particlePool = [];
    this.burstPool = [];
    for (let i = 0; i < 32; i++) {
      const entry = this.makeParticle();
      entry.born = -100; entry.life = 0; entry.active = false;
      this.burstPool.push(entry);
    }
    this.waves = [];
    for (let i = 0; i < 3; i++) {
      const graphic = new PIXI.Graphics(); graphic.blendMode = 'add'; graphic.visible = false;
      this.container.addChild(graphic);
      this.waves.push({ graphic, born: -100, life: .72, worldX: 0, y: 0 });
    }
    this.flare = new PIXI.Sprite(this.glowTexture);
    this.flare.anchor.set(.5); this.flare.blendMode = 'add';
    this.flare.tint = 0xffe2a8; this.flare.visible = false;
    this.container.addChild(this.flare);

    // Reused typed buffers. Thirty-six centre samples produce a continuous
    // cubic silhouette instead of a chain of independently drawn trail pieces.
    this.cx = new Float32Array(40); this.cy = new Float32Array(40);
    this.cw = new Float32Array(40); this.age = new Float32Array(40);
    this.ex = new Float32Array(80); this.ey = new Float32Array(80);
    this.count = 0;
  }

  makeParticle() {
    const object = new PIXI.Container();
    const halo = new PIXI.Sprite(this.glowTexture);
    const core = new PIXI.Sprite(this.sparkTexture);
    halo.anchor.set(.5); core.anchor.set(.5);
    halo.blendMode = 'add'; core.blendMode = 'add';
    object.addChild(halo, core); object.visible = false; object.eventMode = 'none';
    this.particleLayer.addChild(object);
    return { object, halo, core };
  }

  resetTransients() {
    this.boostKick = 0; this.flapKick = 0;
    for (const entry of this.burstPool) { entry.active = false; entry.object.visible = false; }
    for (const wave of this.waves) { wave.born = -100; wave.graphic.visible = false; }
  }

  emitBurst(engine, now, boosted, counter) {
    const reduced = engine.reducedMotion;
    const amount = reduced ? (boosted ? 5 : 2) : boosted ? 18 : 5;
    const distance = engine.renderDistance ?? engine.distance ?? 0;
    const y = engine.renderPlayerY ?? engine.player.y;
    for (let i = 0; i < amount; i++) {
      const entry = this.burstPool[this.burstCursor++ % this.burstPool.length];
      const key = counter * 47 + i * 3.31 + (boosted ? 101 : 17);
      const spread = (noise(key) - .5) * (boosted ? 1.9 : 1.3);
      const velocity = (boosted ? 100 : 35) + noise(key + 1) * (boosted ? 115 : 60);
      entry.worldX = distance + engine.player.x - 15;
      entry.y = y + (noise(key + 2) - .5) * (boosted ? 20 : 11);
      entry.vx = -Math.cos(spread) * velocity;
      entry.vy = Math.sin(spread) * velocity - 12;
      entry.born = now; entry.life = (boosted ? .55 : .32) + noise(key + 3) * .32;
      entry.size = .6 + noise(key + 4) * 1.1;
      entry.length = boosted ? 5 + noise(key + 5) * 13 : 3 + noise(key + 5) * 5;
      entry.color = noise(key + 6) > .65 ? 0xfff4dc : noise(key + 7) > .5 ? 0xedb86d : 0xcd7941;
      entry.active = true;
    }
    if (boosted && !reduced) {
      const wave = this.waves[this.waveCursor++ % this.waves.length];
      wave.born = now; wave.worldX = distance + engine.player.x - 8; wave.y = y;
    }
  }

  sampleTrail(engine, now, reduced, heat) {
    const history = engine.trail || [];
    const distance = engine.renderDistance ?? engine.distance ?? 0;
    const lifespan = reduced ? .65 : 1.12;
    let first = 0;
    while (first < history.length && now - history[first].time > lifespan) first++;
    const sourceCount = history.length - first;
    if (sourceCount < 1) { this.count = 0; return; }
    const samples = Math.min(reduced ? 18 : 34, sourceCount + 1);
    const widthEnergy = .70 + heat * .30;
    for (let i = 0; i < samples - 1; i++) {
      const sourceIndex = first + i * Math.max(0, sourceCount - 1) / Math.max(1, samples - 2);
      const lo = Math.floor(sourceIndex), hi = Math.min(history.length - 1, lo + 1);
      const fraction = sourceIndex - lo, a = history[lo], b = history[hi];
      const time = mix(a.time, b.time, fraction);
      const age = clamp((now - time) / lifespan, 0, 1);
      this.cx[i] = mix(a.worldX, b.worldX, fraction) - distance;
      this.cy[i] = mix(a.y, b.y, fraction)
        + Math.sin(now * 7.8 - age * 19) * age * (reduced ? 1.6 : 3.2);
      const width = mix(a.width || 4.6, b.width || 4.6, fraction);
      this.cw[i] = width * Math.pow(1 - age, 1.45) * widthEnergy
        * (1 + Math.sin(now * 14 - age * 24) * .09);
      this.age[i] = age;
    }
    const last = samples - 1;
    this.cx[last] = engine.player.x - 23;
    this.cy[last] = (engine.renderPlayerY ?? engine.player.y) + 6;
    this.cw[last] = (engine.boostTime > 0 ? 9 : 4.6) * widthEnergy * (1 + this.flapKick * .22);
    this.age[last] = 0;
    this.count = samples;
  }

  smoothClosed(graphic, count) {
    const xs = this.ex, ys = this.ey;
    graphic.moveTo(xs[0], ys[0]);
    for (let i = 0; i < count; i++) {
      const p0 = (i - 1 + count) % count, p2 = (i + 1) % count, p3 = (i + 2) % count;
      graphic.bezierCurveTo(xs[i] + (xs[p2] - xs[p0]) / 6,
        ys[i] + (ys[p2] - ys[p0]) / 6,
        xs[p2] - (xs[p3] - xs[i]) / 6,
        ys[p2] - (ys[p3] - ys[i]) / 6, xs[p2], ys[p2]);
    }
    graphic.closePath();
  }

  drawBand(graphic, scale, color, alpha, now, drift = 0, phase = 0) {
    const count = this.count;
    if (count < 2) return;
    for (let i = 0; i < count; i++) {
      const before = Math.max(0, i - 1), after = Math.min(count - 1, i + 1);
      const dx = this.cx[after] - this.cx[before], dy = this.cy[after] - this.cy[before];
      const length = Math.hypot(dx, dy) || 1;
      const age = this.age[i];
      const curl = Math.sin(now * 5.5 - age * 12 + phase) * Math.pow(age, .7) * drift;
      const width = this.cw[i] * scale * (drift ? .7 + Math.sin(now * 8 - age * 11 + phase) * .25 : 1);
      const nx = -dy / length, ny = dx / length;
      const x = this.cx[i] + nx * curl, y = this.cy[i] + ny * curl;
      this.ex[i] = x + nx * width; this.ey[i] = y + ny * width;
      const reverse = count * 2 - 1 - i;
      this.ex[reverse] = x - nx * width; this.ey[reverse] = y - ny * width;
    }
    this.smoothClosed(graphic, count * 2);
    graphic.fill({ color, alpha });
  }

  drawBlaze(engine, now, reduced, heat) {
    this.ribbon.clear(); this.tendrils.clear();
    this.sampleTrail(engine, now, reduced, heat);
    const energy = .63 + heat * .37;
    this.drawBand(this.ribbon, 2.9, 0xb95527, .065 * energy, now);
    this.drawBand(this.ribbon, 1.46, 0xe78536, .17 * energy, now);
    this.drawBand(this.ribbon, .69, 0xffc776, .34 * energy, now);
    this.drawBand(this.ribbon, .20, 0xfff0c7, .62 * energy, now);
    const strands = reduced ? 1 : engine.boostTime > 0 ? 5 : 3;
    for (let i = 0; i < strands; i++) {
      this.drawBand(this.tendrils, .15 + (i % 2) * .045,
        i % 2 ? 0xe9a653 : 0xffdc9b, (.12 + heat * .08) / (1 + i * .08),
        now, (engine.boostTime > 0 ? 13 : 8) + i * 2, i * 1.7);
    }
    for (let i = 0; i < this.haze.length; i++) {
      const glow = this.haze[i];
      const index = Math.floor((this.count - 1) * (1 - i * .19));
      glow.visible = this.count > 1 && (!reduced || i < 2);
      if (!glow.visible) continue;
      const age = this.age[index];
      glow.position.set(this.cx[index], this.cy[index]);
      glow.width = (engine.boostTime > 0 ? 78 : 48) * (1 - age * .55);
      glow.height = (engine.boostTime > 0 ? 38 : 23) * (1 - age * .65);
      glow.rotation = -engine.player.vy / 1800;
      glow.tint = i < 2 ? 0xffbb63 : 0xd37439;
      glow.alpha = (.055 + heat * .055) * (1 - age) * (1 + this.boostKick * .7);
    }
  }

  paintParticle(entry, x, y, life, size, length, rotation, color, glow, spark) {
    entry.object.visible = life > .015;
    if (!entry.object.visible) return;
    entry.object.position.set(x, y); entry.object.rotation = rotation;
    const taper = .35 + life * .65;
    entry.halo.width = (spark ? length * 2.2 : size * 9) * taper;
    entry.halo.height = size * (spark ? 9 : 11) * taper;
    entry.halo.tint = color; entry.halo.alpha = life * glow * .38;
    entry.core.width = spark ? Math.max(1.5, length * 1.55 * taper) : Math.max(.7, size * 1.8 * taper);
    entry.core.height = Math.max(.45, size * (spark ? .75 : 1.6) * taper);
    // A pale hot core with an amber surface gives the tiny sparks depth without
    // a full-screen blur or big flat circles.
    entry.core.tint = spark && life > .40 ? 0xffefce : color;
    entry.core.alpha = clamp(life * .91, 0, .91);
  }

  drawParticles(engine, now, reduced) {
    const particles = engine.particles || [];
    const limit = Math.min(particles.length, reduced ? 48 : 150);
    while (this.particlePool.length < limit) this.particlePool.push(this.makeParticle());
    const advance = clamp(now - (engine.time || 0), 0, 1 / 60);
    for (let i = 0; i < this.particlePool.length; i++) {
      const entry = this.particlePool[i];
      if (i >= limit) { entry.object.visible = false; continue; }
      const p = particles[i], life = clamp(p.life / (p.maxLife || 1), 0, 1);
      this.paintParticle(entry, p.x + p.vx * advance, p.y + p.vy * advance,
        life, p.size || 1, p.length || p.size * 2,
        p.rotation ?? Math.atan2(p.vy, p.vx), tint(p.color), p.glow ?? .35, p.type === 'spark');
    }
    const distance = engine.renderDistance ?? engine.distance ?? 0;
    for (const entry of this.burstPool) {
      if (!entry.active) continue;
      const age = now - entry.born;
      if (age >= entry.life || age < 0) { entry.active = false; entry.object.visible = false; continue; }
      const life = 1 - age / entry.life;
      this.paintParticle(entry, entry.worldX - distance + entry.vx * age,
        entry.y + entry.vy * age - age * age * 20,
        life, entry.size, entry.length, Math.atan2(entry.vy - age * 40, entry.vx),
        entry.color, .43, true);
    }
  }

  drawBoostWaves(engine, now, reduced) {
    const distance = engine.renderDistance ?? engine.distance ?? 0;
    for (const wave of this.waves) {
      const t = (now - wave.born) / wave.life;
      wave.graphic.visible = !reduced && t >= 0 && t < 1;
      if (!wave.graphic.visible) continue;
      const eased = 1 - Math.pow(1 - t, 2), radius = 11 + eased * 48;
      wave.graphic.clear(); wave.graphic.position.set(wave.worldX - distance, wave.y);
      wave.graphic.ellipse(0, 0, radius * .58, radius)
        .stroke({ color: 0xffd39b, width: 2.6 * (1 - t) + .25, alpha: .37 * (1 - t) ** 2 });
      wave.graphic.ellipse(-3, 0, radius * .65, radius * 1.1)
        .stroke({ color: 0xd17b42, width: 5.5 * (1 - t) + .25, alpha: .08 * (1 - t) ** 2 });
      wave.graphic.arc(0, 0, radius * .73, -.7 + t * .5, Math.PI * .95 + t * .5)
        .stroke({ color: 0xffeed1, width: 1.2, alpha: .35 * (1 - t) ** 2 });
    }
    this.flare.visible = this.boostKick > .015 || this.flapKick > .08;
    if (this.flare.visible) {
      this.flare.position.set(engine.player.x - 16, (engine.renderPlayerY ?? engine.player.y) + 5);
      this.flare.width = (reduced ? 52 : 82) + this.boostKick * 28;
      this.flare.height = (reduced ? 33 : 49) + this.boostKick * 12;
      this.flare.alpha = this.boostKick * .24 + this.flapKick * .045;
    }
  }

  render(engine) {
    if (this.destroyed || !engine?.player) return;
    const now = engine.visualTime ?? engine.time ?? 0;
    const reduced = Boolean(engine.reducedMotion);
    const dt = this.lastTime === null ? 0 : clamp(now - this.lastTime, 0, .06);
    if (this.lastTime !== null && now < this.lastTime) this.resetTransients();
    const boosts = Number(engine.boosts || 0), flaps = Number(engine.flaps || 0);
    if (this.lastBoosts !== null && boosts > this.lastBoosts) {
      this.boostKick = 1; this.emitBurst(engine, now, true, boosts);
    }
    if (this.lastFlaps !== null && flaps > this.lastFlaps) {
      this.flapKick = 1; this.emitBurst(engine, now, false, flaps);
    }
    this.lastBoosts = boosts; this.lastFlaps = flaps; this.lastTime = now;
    this.boostKick *= Math.exp(-dt * 6.5); this.flapKick *= Math.exp(-dt * 11);
    const heat = clamp(Number(engine.flame ?? 100) / 100, .12, 1);
    this.drawBlaze(engine, now, reduced, heat);
    this.drawParticles(engine, now, reduced);
    this.drawBoostWaves(engine, now, reduced);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.destroy({ children: true });
    this.particlePool.length = 0; this.burstPool.length = 0; this.waves.length = 0;
    this.haze.length = 0;
  }
}
