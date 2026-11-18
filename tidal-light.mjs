import {DEFAULT_CAPTURE_STYLE} from './capture-styles.mjs?v=prune-2';
import {getPickupSpec, pickupKind, pickupShellRadius} from './pickups.mjs?v=prune-2';
import {pickupSpriteFrame} from './pickup-art.mjs?v=prune-2';
import {LIGHT_PACKET_TUNING} from './vitality.mjs?v=prune-2';
import {drawFluidCapture} from './fluid-capture.mjs?v=prune-2';

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
const right = {}, left = {};
const plain = {};
const heavyFraction = massTier => clamp(((massTier || 1)-1)/9);

// A massive Spark pays out on contact like every other one. Only the trailing
// material takes longer to fold away, keeping response to the tap immediate.
export function captureMassDuration(baseDuration=LIGHT_PACKET_TUNING.absorptionDuration,massTier=1) {
  return baseDuration * (1 + .31*heavyFraction(massTier));
}

// Every slice of plasma has a different release time. A near slice can
// already be spiralling into the receiver while its neighbour is still round.
function edge(out, fraction, artRadius, sourceRadius, age, delay, turns, wave, wrap, orbitWidth) {
  const release = delay * (1 - fraction);
  const elapsed = clamp((age - release) / Math.min(.60,1 - delay));
  const flow = elapsed * smooth(clamp(elapsed/.18));
  const radius = sourceRadius + artRadius * (1 - fraction * 2);
  const shrink = (1 - flow) ** .8;
  // Let the leading plasma unfurl, staying outside the bright core until
  // the final pull. The trailing material still leaves the shell later.
  const winding = clamp((flow - .18) / .82);
  const extraTurn = wrap * winding * winding * (2 - winding);
  const angle = TAU * (turns * flow * (.53 + .47 * flow) + wave * Math.sin(TAU * flow) + extraTurn);
  const radial = radius * shrink + orbitWidth * flow * (1 - flow ** 3);
  out.x = Math.cos(angle) * radial;
  out.y = Math.sin(angle) * radial;
  out.flow = flow;
}

// Each cross section carries part of the original arcs. Deformation changes
// independently across its width, with a tapered throat as the stream arrives.
function drawStream(ctx, sprite, artRadius, sourceRadius, age, sourceScale, delay, turns, wave, wrap, half, color, weight) {
  const strips = 24 + Math.round(weight * 8), side = sprite?.width || 44;
  const imageRadius = artRadius / sourceScale;
  const sourceHeight = half ? imageRadius : imageRadius * 2;
  const top = half === 1 ? 0 : -imageRadius;
  const texel = sprite?.sparkTexelScale || 1;
  const sourceTop = side / 2 + top * texel;
  const orbitWidth = (Math.max(5, 21 - .25 * sourceRadius) * 2.12 + 16*weight) * Math.min(1, 1.55 * Math.abs(wrap));
  edge(left, 0, artRadius, sourceRadius, age, delay, turns, wave, wrap, orbitWidth);
  for (let i = 0; i < strips; i++) {
    const u = (i + .5) / strips;
    edge(right, (i + 1) / strips, artRadius, sourceRadius, age, delay, turns, wave, wrap, orbitWidth);
    if (left.flow < 1) {
      const dx = right.x - left.x, dy = right.y - left.y;
      const length = Math.max(.001, Math.hypot(dx,dy));
      const flow = (left.flow + right.flow) * .5;
      const neck = sourceScale * (1 - flow) ** .6 / (1 + 4 * smooth(clamp(flow * 4)));
      const normalX = -dy / length * neck, normalY = dx / length * neck;
      const width = 2 * imageRadius / strips;
      const cx = (left.x + right.x) * .5, cy = (left.y + right.y) * .5;
      ctx.save();
      ctx.transform(dx / width, dy / width, normalX, normalY, cx, cy);
      // Subpixel overlap closes cracks between sharply turning strips.
      const overlap = Math.min(.35, flow * 2);
      if (sprite) {
        ctx.drawImage(sprite, side/2 + ((u*2-1)*imageRadius-width/2)*texel,
          sourceTop, width*texel, sourceHeight*texel,
          -width/2-overlap, top, width+2*overlap, sourceHeight);
      } else {
        const h = Math.sqrt(Math.max(0, 1 - (2*u-1)**2)) * imageRadius;
        ctx.fillStyle = color;
        ctx.fillRect(-width/2, half === 1 ? 0 : -h, width + overlap, h * (half ? 1 : 2));
      }
      ctx.restore();
    }
    left.x = right.x; left.y = right.y; left.flow = right.flow;
  }
}

export function drawAbsorbingSpark(ctx, effect, age, targetX, targetY, scale, quiet, sourceX, sourceY, bodyRadius) {
  if (age < 0 || age >= 1) return;
  const kind = pickupKind(effect.pickupKind || effect.kind || 'light');
  const spec = getPickupSpec(kind);
  const size = effect.initialScale ?? (effect.tiny ? .62 : 1);
  const angle = effect.initialAngle || 0, start = effect.startRadius || 0;
  sourceX ??= targetX + Math.cos(angle) * start * scale;
  sourceY ??= targetY + Math.sin(angle) * start * scale;
  const dx = (sourceX-targetX)/scale, dy = (sourceY-targetY)/scale;
  const sourceRadius = Math.hypot(dx, dy);
  const heading = sourceRadius > .15 ? Math.atan2(dy,dx) : angle;
  const vx = effect.approachX || 0, vy = effect.approachY || 0;
  const tangent = Math.cos(angle)*vy - Math.sin(angle)*vx;
  const direction = tangent < -.02*Math.hypot(vx,vy) ? -1 : 1;
  const style = effect.style || DEFAULT_CAPTURE_STYLE;
  if (style === 'hybrid') {
    drawFluidCapture(ctx, {
      x:targetX, y:targetY, age,
      radius:pickupShellRadius(kind)*size*scale,
      sourceRadius:sourceRadius*scale, bodyRadius:bodyRadius ?? 11,
      angle:heading, spin:direction, style, quiet, phase:effect.phase || 0,
      dark:kind === 'dark' || kind === 'dusk'
    });
    return;
  }
  // A body contact directly on the core still leaves two visible sides while
  // the liquid folds over itself. This radius is the size of the plasma only.
  const artRadius = (spec.plasma ? 14 : kind === 'dark' ? 12 : 9) * size;
  const doc = ctx.canvas?.ownerDocument ?? globalThis.document;
  const time = (effect.bornAt || 0) + age * (effect.duration || LIGHT_PACKET_TUNING.absorptionDuration);
  plain.time=time; plain.phase=effect.phase||0; plain.reducedMotion=quiet; plain.bodyOnly=true;
  plain.massTier=effect.massTier;
  plain.scale=size*scale;
  const sprite = pickupSpriteFrame(doc, kind, plain);
  ctx.save();
  ctx.translate(targetX,targetY);
  ctx.scale(scale,scale);
  ctx.rotate(heading);
  ctx.imageSmoothingEnabled=false;
  // Use the incoming tangential component at contact. Its sign stays fixed
  // through the capture, even as the wisp moves or lifts past the pickup site.
  const weight = heavyFraction(effect.massTier);
  if (style === 'split' && !quiet) {
    drawStream(ctx,sprite,artRadius,sourceRadius,age,size,.36+.12*weight,1.05*direction,0,.28*direction,-direction,spec.color,weight);
    drawStream(ctx,sprite,artRadius,sourceRadius,age,size,.4+.12*weight,-.82*direction,0,-.24*direction,direction,spec.color,weight);
  } else {
    const ribbon = style === 'ribbon';
    const turns = quiet ? .045 : ribbon ? -.64 : .94;
    const wave = ribbon && !quiet ? .19 : 0;
    const wrap = quiet ? 0 : ribbon ? -.65 : .24;
    drawStream(ctx,sprite,artRadius,sourceRadius,age,size,.4+.12*weight,turns*direction,wave*direction,wrap*direction,0,spec.color,weight);
  }
  ctx.restore();
}
