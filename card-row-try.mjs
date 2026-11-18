import {previewEquippedCardRow} from './card-row-preview.mjs?v=cue-1';
import {describeSkillCard} from './skill-cards.mjs?v=cue-1';
import {cardArt} from './card-art.mjs?v=cue-1';
import {resourceSymbol} from './game-symbols.mjs?v=cue-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const number = value => Number((Number(value) || 0).toFixed(3));
const cardName = card => describeSkillCard(card)?.name || 'Empty slot';
const list = value => Array.isArray(value) ? value : value ? [value] : [];

function totalsText(totals = {}) {
  return [
    totals.sparks || !(totals.stored || totals.futureCapacity || totals.recoverySeconds || totals.reelSeconds || totals.cruisingSpeed) ? `+${number(totals.sparks)} Sparks` : '',
    totals.stored ? `+${number(totals.stored)} Stored Sparks` : '',
    totals.futureCapacity ? `+${number(totals.futureCapacity)} future maximum Sparks` : '',
    totals.recoverySeconds ? `−${number(totals.recoverySeconds)} s recovery` : '',
    totals.reelSeconds ? `−${number(totals.reelSeconds)} s reel` : '',
    totals.cruisingSpeed ? `+${number(totals.cruisingSpeed)}% speed on the card` : '',
  ].filter(Boolean).join(' · ');
}

/** A read-only, interruptible player for the ordinary equipped row. The live
 * deck stays underneath the modal, including its selection and scroll state. */
export function showTryCardRow({run, opener, reducedMotion = false, document:doc = document} = {}) {
  if (!run) return null;
  doc.querySelector('.card-row-try-dialog')?.close();
  const dialog = doc.createElement('dialog');
  dialog.className = 'card-row-try-dialog';
  dialog.setAttribute('aria-labelledby', 'row-try-title');
  dialog.dataset.reducedMotion = String(reducedMotion || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  dialog.innerHTML = `<section class="row-try-player"><header class="row-try-heading"><div><h2 id="row-try-title">Try row</h2><small>Preview only · cards and uses stay unchanged</small></div><button type="button" class="secondary" data-row-try="close">← Equipped</button></header><div class="row-try-scenario"><label>When <select aria-label="Event to try" data-row-try-events></select></label><details class="row-try-conditions"><summary>Conditions</summary><div><strong>One event starts this row</strong><p data-row-try-assumptions></p><small>Bonuses shown before Spark Meter limits. A replay creates no extra pickup or physical Pulse.</small></div></details></div><div class="row-try-stage"><p class="row-try-event" data-row-try-cue></p><ol class="row-try-cards" aria-label="Your equipped cards, left to right"></ol></div><div class="row-try-reading"><div class="row-try-current" aria-live="polite" aria-atomic="true"><small data-row-try-position></small><strong data-row-try-label></strong><p data-row-try-reason></p></div><div class="row-try-total"><small>Card bonuses so far</small><strong data-row-try-total></strong><span data-row-try-subtotal></span></div></div><footer class="row-try-controls"><button type="button" class="secondary" data-row-try="previous" aria-label="Previous step">← Previous</button><button type="button" class="primary" data-row-try="play">▶ Play</button><button type="button" class="secondary" data-row-try="next" aria-label="Next step">Next</button><button type="button" class="secondary" data-row-try="replay">↶ Replay</button><span data-row-try-progress></span></footer></section>`;
  const find = selector => dialog.querySelector(selector);
  const select = find('[data-row-try-events]');
  const row = find('.row-try-cards');
  const playButton = find('[data-row-try="play"]');
  let preview, frames = [], position = 0, timer = null, playing = false, closed = false;
  const stop = () => {clearTimeout(timer);timer = null;playing = false;playButton.textContent = position === frames.length - 1 ? '▶ Play again' : '▶ Play';dialog.dataset.playing = 'false';};
  const close = () => {if (closed) return;closed = true;stop();dialog.close();dialog.remove();if (opener?.isConnected) opener.focus({preventScroll:true});};

  function draw() {
    const frame = frames[position] || {};
    const step = frame.step || frame;
    const passStart = frame.type === 'pass-start';
    const slot = passStart ? 0 : Number.isInteger(frame.slot) ? frame.slot : step.slot;
    const pass = frame.pass || step.pass || 1;
    const finished = position === frames.length - 1;
    const totals = frame.totalsAfter || frame.totals || step.totalsAfter || (finished ? preview.totals : {});
    const charges = frame.chargesAfter || frame.charges || step.chargesAfterSnapshot || (passStart && position === 0 ? preview.chargesBefore : {});
    const sourceId = step.sourceInstanceId;
    const seen = frames.slice(0, position + 1).filter(item => item.type === 'step' && (item.pass || item.step?.pass) === pass);
    row.style.setProperty('--row-try-cursor', Number.isInteger(slot) ? slot : 0);
    row.classList.toggle('is-returning', passStart && pass > 1);
    row.classList.toggle('no-pass', frame.type === 'no-pass');
    row.querySelectorAll('[data-row-try-slot]').forEach(card => {
      const index = Number(card.dataset.rowTrySlot), source = preview.cards[index];
      const actions = seen.filter(item => (item.slot ?? item.step?.slot) === index);
      const acted = actions.some(item => (item.step || item).success);
      card.classList.toggle('is-active', slot === index);
      card.classList.toggle('did-act', acted);
      card.classList.toggle('was-checked', actions.length > 0);
      card.classList.toggle('is-copy-source', !passStart && !!step.copiedBy && source?.instanceId === sourceId && index !== slot);
      card.setAttribute('aria-current', slot === index ? 'step' : 'false');
      card.querySelector('.row-try-slot-state').textContent = slot === index ? '▶' : actions.length ? acted ? '✓' : '–' : '·';
      const uses = card.querySelector('[data-row-try-uses]');
      if (uses && source) {
        const before = preview.chargesBefore?.[source.instanceId] ?? source.charges;
        let current = charges?.[source.instanceId];
        if (!Number.isFinite(current)) {
          current = before;
          for (const prior of frames.slice(0, position + 1)) {
            const attempt = prior.step || prior;
            if (attempt.sourceInstanceId === source.instanceId && Number.isFinite(attempt.chargesAfter)) current = attempt.chargesAfter;
          }
        }
        uses.textContent = Number.isFinite(before) ? `Uses ${before}${current !== before ? ` → ${current}` : ''}` : 'No use limit';
      }
    });
    find('[data-row-try-position]').textContent = frame.type === 'no-pass' ? 'Event checked' : `${finished ? 'Final step · ' : ''}Pass ${pass}${passStart ? ' · start at slot 1' : Number.isInteger(slot) ? ` · slot ${slot + 1} · ${step.success ? 'Acts' : 'Skips'}` : ''}`;
    find('[data-row-try-label]').textContent = frame.label || step.label || (passStart ? pass > 1 ? '↶ Return to slot 1' : 'One event, left to right' : cardName(preview.cards[slot]));
    find('[data-row-try-reason]').textContent = frame.reason || step.reason || (passStart ? 'The pass starts with 0 bonus Sparks. Check each equipped slot once.' : preview.noPayReason || 'No action for this event.');
    find('[data-row-try-total]').textContent = totalsText(totals);
    const subtotal = frame.passSparks ?? frame.subtotalAfter ?? frame.subtotal ?? step.after ?? 0;
    find('[data-row-try-subtotal]').textContent = frame.type === 'no-pass' ? 'No pass started' : `This pass: ${number(subtotal)} Sparks`;
    find('[data-row-try-progress]').textContent = `${position + 1} / ${frames.length}`;
    find('[data-row-try="previous"]').disabled = position === 0;
    find('[data-row-try="next"]').disabled = finished;
    if (finished && playing) stop();
    if (!playing) playButton.textContent = finished ? '▶ Play again' : '▶ Play';
    playButton.disabled = frames.length < 2;
    find('[data-row-try="replay"]').disabled = frames.length < 2;
  }

  function advance() {
    if (!playing || closed) return;
    if (position < frames.length - 1) {position++;draw();}
    if (playing) timer = setTimeout(advance, frames[position]?.type === 'pass-start' ? 1900 : 1800);
  }
  function play() {
    stop();
    if (position === frames.length - 1) position = 0;
    playing = true;dialog.dataset.playing = 'true';playButton.textContent = 'Ⅱ Pause';draw();
    timer = setTimeout(advance, 1500);
  }
  function load(eventId, autoPlay = false) {
    stop();preview = previewEquippedCardRow(run, eventId);
    find('.row-try-conditions').open = false;
    frames = preview.frames || [];position = 0;
    if (!frames.length) frames = [{type:'no-pass',pass:0,label:'No row pass starts',reason:preview.noPayReason || 'This row has no card actions for this event.',totals:preview.totals}];
    select.innerHTML = list(preview.options).map(option => `<option value="${esc(option.id)}" ${option.id === preview.option?.id ? 'selected' : ''} ${option.available === false ? 'disabled' : ''}>${esc(option.label)}${option.available === false ? ` · ${esc(option.unavailableReason || 'Not available')}` : ''}</option>`).join('');
    const assumptions = list(preview.assumptions).join(' · ');
    find('[data-row-try-assumptions]').textContent = assumptions || 'Uses the actual order, ranks and remaining uses of your equipped cards.';
    find('[data-row-try-cue]').innerHTML = `${resourceSymbol('energy')}<span>${esc(preview.description || preview.option?.description || preview.option?.label || 'One card event')} <i>→</i> <b>${preview.started === false ? 'No row pass' : `Pass 1${preview.passes > 1 ? ' → ↶ Pass 2' : ''}`}</b></span>`;
    row.style.setProperty('--row-try-slots', preview.cards.length || 1);
    row.innerHTML = preview.cards.map((card, slot) => `<li data-row-try-slot="${slot}" ${card ? `data-card-instance="${esc(card.instanceId)}"` : 'class="is-empty"'}><header><span class="row-try-slot-state" aria-hidden="true">·</span><b>Slot ${slot + 1}</b></header><div class="row-try-art" aria-hidden="true">${card ? cardArt(describeSkillCard(card) || card, {compact:true}) : '<span>—</span>'}</div><strong>${esc(cardName(card))}</strong><small data-row-try-uses>${card ? Number.isFinite(card.charges) ? `Uses ${card.charges}` : 'No use limit' : 'Skipped'}</small></li>`).join('');
    draw();
    if (autoPlay && dialog.dataset.reducedMotion !== 'true' && frames.length > 1) play();
  }
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-row-try]')?.dataset.rowTry;
    if (!action) return;
    if (action === 'close') close();
    else if (action === 'play') playing ? stop() : play();
    else if (action === 'replay') {stop();position = 0;draw();if (dialog.dataset.reducedMotion !== 'true') play();}
    else if (action === 'previous' || action === 'next') {stop();position = Math.max(0, Math.min(frames.length - 1, position + (action === 'next' ? 1 : -1)));draw();}
  });
  select.addEventListener('change', () => load(select.value, true));
  find('.row-try-conditions').addEventListener('toggle', event => {if (event.target.open) stop();});
  dialog.addEventListener('keydown', event => {
    if (event.target.matches('select') || event.target.closest('details')) return;
    if (['ArrowLeft','ArrowRight'].includes(event.key)) {event.preventDefault();find(`[data-row-try="${event.key === 'ArrowLeft' ? 'previous' : 'next'}"]`).click();}
    else if (event.key === ' ' && event.target === dialog) {event.preventDefault();playing ? stop() : play();}
  });
  dialog.addEventListener('cancel', event => {event.preventDefault();event.stopPropagation();close();});
  dialog.addEventListener('close', () => {if (!closed) close();});
  doc.body.append(dialog);dialog.showModal();load(null, true);find('[data-row-try="close"]').focus({preventScroll:true});
  return {close, pause:stop};
}
