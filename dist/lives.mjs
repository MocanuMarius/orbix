import { getLifeCapacity } from './vitality.mjs?v=starter-flow-1';
export function lifeHeartSvg(spent = false) {
  const heart = 'M2 0h4v2h4V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z';
  const facets = spent
    ? '<path d="M2 2h3v1H2zm9 0h2v1h-2z" fill="#61776e"/>'
    : '<path fill="#d9dea7" d="M2 1h3v1h2v2h3V3h1V1h2v2h2v4h-2v2h-2v2H9v2H7v-2H5V9H3V7H1V3h1z"/><path fill="#acb885" d="M13 4h2v3h-2v2h-2v2H9v2H7v-2h2V9h2V7h2z"/><path class="heart-glint" fill="#fff4d1" d="M3 2h2v2H3zm-1 2h1v2H2z"/>';
  return `<svg class="life-heart${spent ? ' spent' : ''}" viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="${spent ? '#304039' : '#727e65'}" d="${heart}"/>${facets}</svg>`;
}
export function livesMarkup(run, { compact = false } = {}) {
  const maximum = getLifeCapacity(run), lives = Math.max(0, Math.min(maximum, Math.floor(run?.lives ?? 3)));
  return `<span class="ascension-lives${compact ? ' compact-lives' : ''}" aria-label="${lives} of ${maximum} hearts. Each heart is one attempt."><span class="life-marks">${Array.from({length:maximum},(_,i)=>lifeHeartSvg(i>=lives)).join('')}</span></span>`;
}
