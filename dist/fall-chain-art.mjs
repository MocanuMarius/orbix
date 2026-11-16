import {lightVisibility} from './light-field.mjs?v=skills-cards-3';
import {drawPickup} from './pickup-art.mjs?v=skills-cards-3';
import {sparkArtScale} from './spark-size.mjs?v=skills-cards-3';

const unit = value => Math.max(0, Math.min(1, value));

// A small upstroke marks the last Lift. Only the seed can shine through the
// fog. The lower pickups stay inside the ordinary Luminance field.
export function drawFallWarning(ctx, engine, options = {}) {
  const chains = engine.layout?.riskChains;
  if (!chains?.length || engine.dying || engine.completing) return;
  const scale = options.scale ?? 1;
  const distance = options.distance ?? engine.renderDistance ?? engine.distance;
  const playerX = distance + engine.player.x;
  const playerY = engine.renderPlayerY ?? engine.player.y;
  const time = engine.captureTime ?? engine.time;
  for (const chain of chains) {
    if (chain.kind !== 'fall' || playerX < chain.launch.x - 140 || playerX > chain.x) continue;
    const seed = engine.getNearbyPickups().find(p => p.riskChain === chain.id && p.feature === 'fall-seed');
    if (!seed || seed.collected || seed.carried || playerX > seed.x) continue;
    const light = options.light ?? engine.getLightState();
    const approach = unit((playerX - chain.launch.x + 140) / 80);
    const launchAhead = chain.launch.x - playerX;
    if (launchAhead > -14) {
      const alpha = approach * unit((launchAhead + 14) / 14);
      const x = Math.round((chain.launch.x - distance) * scale);
      const y = Math.round(chain.launch.y * scale);
      const p = Math.max(1, Math.round(2 * scale));
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = '#c2d9bb';
      ctx.fillRect(x - p, y - 3*p, 2*p, p);
      ctx.fillRect(x - 2*p, y - 2*p, p, p);
      ctx.fillRect(x + p, y - 2*p, p, p);
      ctx.fillStyle = '#86a28c';
      ctx.fillRect(x - p, y, 2*p, 2*p);
      ctx.restore();
    }
    const screenX = seed.x - distance;
    if (screenX >= engine.width + 18) continue;
    const visibility = lightVisibility(engine, light, screenX, seed.y, playerY);
    const darkness = unit((.58 - visibility) / .49);
    if (darkness === 0) continue;
    const pulse = engine.reducedMotion ? .84 : .83 + .17*Math.sin(time*3.6 + seed.phase);
    drawPickup(ctx, screenX*scale, seed.y*scale, {
      kind:'dark', phase:seed.phase, time, scale:scale*sparkArtScale(seed,engine.height), reducedMotion:engine.reducedMotion,
      alpha:approach * darkness * pulse
    });
  }
}
