import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs';

// One control, two gestures: tap for the companion ability and hold to pause.
// Event handlers stay with the flight screen so this view never fires twice.
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const ICONS = {
  swift: '<path d="M4 5L13 12L4 19M13 5L22 12L13 19"/>',
  anchor: '<path d="M3 12H21M6 6V18M18 6V18M3 18H9M15 18H21"/>',
  scout: '<path d="M2 12Q12 1 22 12Q12 23 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M12 1V3M12 21V23"/>',
};

export function boostControlMarkup(role = 'swift') {
  const id = normalizeCompanionRole(role), ability = getCompanionAbility(id);
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
