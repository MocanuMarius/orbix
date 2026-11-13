import { reserveIconMarkup, formatStoredGlow } from './afterglow-ui.mjs';

// Stateless menu art. The app owns pausing, dialogs and every action below.
const ICONS = Object.freeze({
  gear: '<path d="M9 2h6v3l3 2 3-1 2 5-3 2v3l2 2-4 4-3-2h-3l-2 3-5-2 1-3-2-3H1V9h3l2-3-1-3 4-1Z"/><circle cx="12" cy="12" r="4"/>',
  tune: '<path d="M4 5h16M4 12h16M4 19h16M8 2v6M16 9v6M10 16v6"/>',
  companion: '<path d="M7 6h10v3h3v8h-3v3H7v-3H4V9h3Z"/><path d="M9 11v3m6-3v3M8 3V1m8 2V1"/>',
  upgrades: '<path d="M12 22V11M5 15h14M5 15V9m14 6V9M8 6l4-4 4 4M3 7l2-2 2 2m10 0 2-2 2 2"/>',
  tutorial: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
  exit: '<path d="M10 3H4v18h6M8 12h14m-5-5 5 5-5 5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  mute: '<path d="m10 4-5 5H2v6h3l5 5V4Zm5 5 6 6m0-6-6 6"/>',
  sound: '<path d="m10 4-5 5H2v6h3l5 5V4Zm4 4a6 6 0 0 1 0 8m4-11a10 10 0 0 1 0 14"/>',
});
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="bevel" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.gear}</svg>`;

export function gameMenuButton({ points = 0, canEdit = false, flight = false } = {}) {
  const raw = Number(points), count = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  const badge = canEdit && count > 0;
  const label = `${flight ? 'Open game menu and pause flight.' : 'Open game menu.'}${badge ? ` ${count} tuning points available.` : ''}`;
  return `<button type="button" class="game-menu-trigger game-menu-button${flight ? ' in-flight' : ''}" data-action="open-menu" aria-label="${label}" aria-haspopup="dialog">
    ${icon('gear')}<span class="game-menu-caption">MENU</span>
    ${badge ? `<span class="game-menu-points" aria-hidden="true">${count > 99 ? '99+' : count}</span>` : ''}
  </button>`;
}

export function gameWheelMarkup({ flight = false, muted = false, tuningAvailable = false,
  tuningEditable = false, companionAvailable = false, upgradesAvailable = false,
  isTutorial = false, hasSuspended = false, reserveAmount = 0, reservePractice = false } = {}) {
  const reserve = Number(reserveAmount);
  const reserveLabel = `${reservePractice ? 'PRACTICE' : 'STORED'} GLOW ${formatStoredGlow(reserve).replace('<', '&lt;')}`;
  const node = (position, action, image, label, detail, enabled, aria) =>
    `<button type="button" class="game-wheel-node wheel-${position}" data-action="${action}"${enabled ? '' : ' disabled'} aria-label="${aria}">
      ${icon(image)}<span class="game-wheel-label">${label}</span><small>${detail}</small>
    </button>`;
  return `<header class="game-wheel-heading"><span>WISPBOUND</span><h2>${flight ? 'Flight paused' : 'Your journey'}</h2></header>
    <div class="game-wheel" role="group" aria-label="Game menu choices">
      ${node('north', 'menu-tune', 'tune', 'TUNE', tuningEditable ? 'SPEND POINTS' : 'AT REST', tuningAvailable || flight,
        tuningEditable ? 'Tune your flight. Spend tuning points.' : 'View your tuning. Changes are available at rest.')}
      ${node('east', 'menu-companion', 'companion', 'COMPANION', companionAvailable ? 'CHOOSE A GUIDE' : 'AT REST', companionAvailable,
        companionAvailable ? 'Choose your companion.' : 'Companion changes are available at a rest stop.')}
      ${node('south', 'menu-upgrades', 'upgrades', 'UPGRADES', upgradesAvailable ? 'PERMANENT' : 'AT CHECKPOINT', upgradesAvailable,
        upgradesAvailable ? 'Open permanent upgrades.' : 'Permanent upgrades are available at safe checkpoints.')}
      ${node('west', 'menu-tutorial', isTutorial ? 'exit' : 'tutorial', isTutorial ? 'EXIT PRACTICE' : 'TUTORIAL',
        isTutorial ? hasSuspended ? 'RETURN TO ASCENT' : 'BACK TO CAMP' : 'LEARN THE WAY', true,
        isTutorial ? hasSuspended ? 'Exit practice and return to your saved ascent.' : 'Exit practice and return to camp.' : 'Start the short tutorial.')}
      <button type="button" class="game-wheel-core" data-action="menu-close" aria-label="${flight ? 'Resume flight' : 'Back to the game'}">
        ${icon(flight ? 'play' : 'back')}<span>${flight ? 'RESUME' : 'BACK'}</span>
      </button>
    </div>
    <div class="game-menu-footer">
      <button type="button" class="game-menu-foot" data-action="mute" aria-label="${muted ? 'Enable sound' : 'Mute sound'}">${icon(muted ? 'mute' : 'sound')}<span>${muted ? 'UNMUTE' : 'MUTE'}</span></button>
      ${flight ? `<button type="button" class="game-menu-foot game-menu-end" data-action="leave-flight" aria-label="End the current attempt">${icon('exit')}<span>END ATTEMPT</span></button>` : ''}
      ${Number.isFinite(reserve) && reserve > 0 ? `<button type="button" class="game-menu-foot game-menu-reserve" data-action="inspect-afterglow" aria-label="Inspect ${reservePractice ? 'practice' : 'stored'} Glow reserve. ${formatStoredGlow(reserve).replace('<', '&lt;')} Glow available.">${reserveIconMarkup()}<span>${reserveLabel}</span></button>` : ''}
    </div>
    ${isTutorial && hasSuspended ? '<p class="game-wheel-note">Your ascent is waiting.</p>' : ''}`;
}
