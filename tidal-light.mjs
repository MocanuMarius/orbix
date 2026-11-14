import {getPickupSpec,pickupKind} from './pickups.mjs?v=flash-prism-1';

const TAU=Math.PI*2;
const clamp=(n,min,max)=>Math.min(max,Math.max(n,min));
const previous={x:0,y:0},current={x:0,y:0},next={x:0,y:0};
function absorptionPosition(out, time, start, orbit, angle, quiet) {
  const inward=clamp((time-.10)/.90,0,1);
  const radius=quiet ? start*(1-time)**2 : time<.10
    ? start+(orbit-start)*(1-(1-time/.10)**3) : orbit*(1-inward)**.85;
  const turn=angle+(quiet ? 0 : TAU*6*(.10*time+.90*time*time));
  out.x=Math.cos(turn)*radius;out.y=Math.sin(turn)*radius;
}

export function drawAbsorbingSpark(c,effect,progress,x,y,s,quiet) {
  const kind=pickupKind(effect.pickupKind||effect.kind||'light');
  const start=Math.max(0,Number(effect.startRadius)||0),orbit=clamp(Math.max(38,start),34,44);
  const angle=Number(effect.initialAngle)||0;
  absorptionPosition(current,progress,start,orbit,angle,quiet);
  absorptionPosition(previous,Math.max(0,progress-.018),start,orbit,angle,quiet);
  absorptionPosition(next,Math.min(1,progress+.018),start,orbit,angle,quiet);
  const size=(1-progress)**.60*s,bands=kind==='cache'?3:kind==='cluster'?2:1;
  c.save();
  c.globalAlpha=clamp((1-progress)*8,0,1);
  drawTidalLight(c,x+current.x*s,y+current.y*s,x+previous.x*s,y+previous.y*s,
    x+next.x*s,y+next.y*s,(quiet?24:48+16*progress)*size,(quiet?9:12)*size,
    kind==='dark'?'#803f50':getPickupSpec(kind).color,kind==='dark'?'#ffb5aa':'#ffffff',bands);
  c.restore();
}

// A single pixel body with a tapered tail and a thin, luminous leading tip.
// Its forward and rear tangents come from the actual absorption trajectory.
export function drawTidalLight(ctx, x, y, beforeX, beforeY, afterX, afterY,
    length, width, color, highlight, bands = 1) {
  let fx = afterX - x, fy = afterY - y;
  let bx = x - beforeX, by = y - beforeY;
  const front = Math.hypot(fx, fy), back = Math.hypot(bx, by);
  if (front > .001) { fx /= front; fy /= front; }
  else if (back > .001) { fx = bx / back; fy = by / back; }
  else { fx = 1; fy = 0; }
  if (back > .001) { bx /= back; by /= back; }
  else { bx = fx; by = fy; }
  // Quadratic spine with its ends along the two tangents. Length is capped
  // in buffer pixels, independent of frame time and angular speed.
  length = Math.max(1, Math.min(36, length));
  width = Math.max(1, Math.min(9, width));
  const slices = Math.ceil(length);
  for (let i = 0; i <= slices; i++) {
    const u = i / slices, v = 1 - u;
    const px = x + length * (.62 * fx * u * u - .38 * bx * v * v);
    const py = y + length * (.62 * fy * u * u - .38 * by * v * v);
    const envelope = u < .32 ? u / .32 : v / .68;
    const size = Math.max(1, Math.round(width * envelope));
    const left = Math.round(px - (size-1) / 2), top = Math.round(py - (size-1) / 2);
    ctx.fillStyle = u > .78 ? highlight : color;
    ctx.fillRect(left, top, size, size);
    if (size >= 3 && u > .22 && (bands === 1 || (u * bands * 2) % 1.3 > .35)) {
      ctx.fillStyle = highlight;
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
}
