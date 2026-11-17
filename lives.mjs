import { getLifeCapacity } from './vitality.mjs?v=strip-2';
import { uiIcon } from './ui-icons.mjs?v=strip-2';
/** One heart of the approved icon set: full, spent (empty) or shielded. 16 px inline; screens set their own whole-multiple size in ui-icons.css. */
export function lifeHeartSvg(spent = false, { size = 16, shield = false } = {}) {
  const name = shield ? 'heart-shield' : spent ? 'heart-empty' : 'heart-full';
  return uiIcon(name, { size, className: `life-heart${spent ? ' spent' : ''}${shield ? ' shielded' : ''}` });
}
export function livesMarkup(run, { compact = false, size = 16 } = {}) {
  const maximum = getLifeCapacity(run), lives = Math.max(0, Math.min(maximum, Math.floor(run?.lives ?? 3)));
  return `<span class="ascension-lives${compact ? ' compact-lives' : ''}" aria-label="${lives} of ${maximum} hearts. Each heart is one attempt."><span class="life-marks">${Array.from({length:maximum},(_,i)=>lifeHeartSvg(i>=lives,{size})).join('')}</span></span>`;
}
