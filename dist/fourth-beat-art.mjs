// Short dashes follow the upper left edge of the wisp. The last tap before
// a free Lift turns the entire group into little upward chevrons.
export function drawFourthBeat(ctx, engine, x, y, bodyScale=1) {
  if (!engine.mod?.fourthBeatRank || engine.dying || engine.completing) return;
  const beat = engine.fourthBeat;
  if (!beat?.count) return;
  const marks = beat.needed - 1;
  const left = -19;
  const top = -11;
  ctx.save();
  ctx.translate(Math.round(x),Math.round(y));
  ctx.scale(bodyScale,bodyScale);
  for (let i = 0; i < marks; i++) {
    const mx = left + i * 5;
    const my = top - i * 2;
    ctx.fillStyle = '#122b33';
    ctx.fillRect(mx - 1, my - 1, 5, 4);
    ctx.fillStyle = i < beat.count ? '#abf4e5' : '#52706f';
    ctx.fillRect(mx, my, 3, i < beat.count ? 2 : 1);
    if (beat.ready) {
      ctx.fillStyle = '#effff4';
      ctx.fillRect(mx + 1, my - 1, 1, 2);
    }
  }
  ctx.restore();
}
