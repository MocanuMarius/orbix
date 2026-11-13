import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs';

// Active companions use tap/hold. Gravity occupies the same space as a passive
// status indicator; it is never a control. The flight screen owns all gestures.
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const ICONS = {
  swift: '<path d="M4 5L13 12L4 19M13 5L22 12L13 19"/>',
  anchor: '<path d="M3 12H21M6 6V18M18 6V18M3 18H9M15 18H21"/>',
  gravity: '<path d="M20 7C17 1 7 2 4 8C1 14 6 22 13 20C19 19 21 13 17 9C14 6 9 7 8 11C7 15 12 18 14 14L14 11M14 14L11 13"/>',
};

export function boostControlMarkup(role = 'swift') {
  const id = normalizeCompanionRole(role), ability = getCompanionAbility(id);
  if (ability.passive || id === 'gravity') {
    return `<div class="flight-control boost-control boost-control-v2 flight-passive-indicator" id="boost-btn" data-companion-role="${id}" data-boost-state="passive" data-passive="true" role="status" aria-live="polite" aria-atomic="true" aria-label="Gravity is passive. Nearby light packets are gently drawn closer.">
      <svg class="boost-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS.gravity}</svg>
      <span id="boost-label" class="boost-name" aria-hidden="true">GRAVITY</span>
      <span class="boost-status" aria-hidden="true">PASSIVE</span>
    </div>`;
  }
  return `<button type="button" class="flight-control boost-control boost-control-v2" id="boost-btn" data-companion-role="${id}" data-boost-state="ready" aria-label="${ability.label} ready. ${ability.description} Hold to pause.">
    <svg class="boost-charge-ring" viewBox="0 0 84 84" aria-hidden="true" focusable="false">
      <path class="boost-charge-track" d="M16 4H68L80 16V68L68 80H16L4 68V16Z"/>
      <path class="boost-charge-fill" pathLength="100" d="M42 4H68L80 16V68L68 80H16L4 68V16L16 4Z"/>
    </svg>
    <svg class="boost-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[id]}</svg>
    <span id="boost-label" class="boost-name">${ability.label}</span>
    <span class="boost-status" aria-hidden="true">READY</span>
  </button>`;
}

export function updateBoostControl(button, state = {}) {
  if (!button) return;
  const supplied = state.ability;
  const role = normalizeCompanionRole(supplied?.role || supplied?.id || button.dataset.companionRole);
  const ability = getCompanionAbility(role);
  if (supplied?.passive || ability.passive || role === 'gravity') {
    const mode = state.finished === true || state.alive === false ? 'ended'
      : state.paused ? 'paused' : state.tutorialAwaitingLift ? 'waiting' : 'passive';
    const status = mode === 'ended' ? 'ENDED' : mode === 'paused' ? 'PAUSED' : mode === 'waiting' ? 'LIFT FIRST' : 'PASSIVE';
    const name = button.querySelector('#boost-label'), detail = button.querySelector('.boost-status');
    if (name && name.textContent !== 'GRAVITY') name.textContent = 'GRAVITY';
    if (detail && detail.textContent !== status) detail.textContent = status;
    button.dataset.companionRole = role;
    button.dataset.boostState = mode;
    button.classList.toggle('boost-motion-reduced', state.reducedMotion === true);
    const label = mode === 'ended' ? 'Gravity passive. This attempt has ended.'
      : mode === 'paused' ? 'Gravity passive. Flight paused.'
        : mode === 'waiting' ? 'Gravity is passive. Tap Lift to begin.'
          : 'Gravity is passive. Nearby light packets are gently drawn closer. Use Menu to pause.';
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    button.title = label;
    return;
  }
  const remaining = Math.max(0, finite(supplied?.cooldown, finite(state.boostCooldown)));
  const total = Math.max(.001, finite(supplied?.cooldownTotal, finite(state.boostCooldownTotal, ability.cooldown)));
  const activeTime = Math.max(0, finite(supplied?.remaining, finite(state.boostTime)));
  const active = supplied ? supplied.active === true : state.boostActive === true || activeTime > 0;
  const ended = state.finished === true || state.alive === false;
  const waiting = state.tutorialAwaitingLift === true;
  const ready = !active && !ended && !waiting && (supplied?.ready === true || (!supplied && state.boostReady === true) || remaining <= .001);
  const charge = ready ? 1 : clamp(1 - remaining / total, 0, 1);
  const seconds = Math.max(.1, Math.ceil(remaining * 10) / 10).toFixed(1);
  const activeSeconds = Math.max(.1, Math.ceil(activeTime * 10) / 10).toFixed(1);
  const mode = ended ? 'ended' : state.paused ? 'paused' : waiting ? 'waiting'
    : active ? 'active' : ready ? 'ready' : 'cooling';
  const status = mode === 'active' ? `ACTIVE ${activeSeconds}s` : mode === 'cooling' ? `WAIT ${seconds}s`
    : mode === 'waiting' ? 'LIFT FIRST' : mode === 'paused' ? 'PAUSED'
      : mode === 'ended' ? 'ENDED' : 'READY';
  const name = button.querySelector('#boost-label');
  const detail = button.querySelector('.boost-status');
  if (name) name.textContent = ability.label;
  if (detail) detail.textContent = status;
  if (button.dataset.companionRole !== role) {
    const symbol = button.querySelector('.boost-symbol');
    if (symbol) symbol.innerHTML = ICONS[role];
  }
  button.dataset.companionRole = role;
  button.dataset.boostState = mode;
  button.classList.toggle('boost-motion-reduced', state.reducedMotion === true);
  button.classList.toggle('cooling', !ready && !active);
  button.style.setProperty('--boost-charge-offset', String(Math.round((1 - charge) * 10_000) / 100));
  // Recharge prevents activation, but the same button must still accept the
  // hold-to-pause gesture. It must never become a disabled cooldown control.
  button.disabled = false;
  button.removeAttribute('aria-disabled');
  const label = ended ? `${ability.label}. This attempt has ended.`
    : waiting ? `${ability.label}. Tap Lift to begin; hold this ability to pause.`
      : state.paused ? `${ability.label}. Flight paused.`
        : active ? `${ability.label} active, ${activeSeconds} seconds remaining. ${remaining > .001 ? `Recharges in ${seconds} seconds. ` : ''}Hold to pause.`
          : ready ? `${ability.label} ready. ${ability.description} Hold to pause.`
            : `${ability.label} recharging, ${seconds} seconds remaining. Hold to pause.`;
  button.setAttribute('aria-label', label);
  button.title = label;
}
