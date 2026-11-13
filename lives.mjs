import { getLifeCapacity } from './vitality.mjs?v=depth-energy-1';
export const lifeHeartSvg = (spent = false) => `<svg class="life-heart${spent ? ' spent' : ''}" viewBox="0 0 16 14" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 0h4v2h4V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z"/></svg>`;
export function livesMarkup(run, { compact = false } = {}) {
  const maximum = getLifeCapacity(run), lives = Math.max(0, Math.min(maximum, Math.floor(run?.lives ?? 3)));
  return `<span class="ascension-lives${compact ? ' compact-lives' : ''}" aria-label="${lives} of ${maximum} hearts. Each heart is one attempt."><span class="life-marks">${Array.from({length:maximum},(_,i)=>lifeHeartSvg(i>=lives)).join('')}</span></span>`;
}
