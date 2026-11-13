import {formatGlow} from './vitality.mjs?v=dream-paths-1';
// Stored fuel stays out of the main interface until it can help a flight.
const amountOf = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
export const formatStoredGlow = value => {
  const amount = amountOf(value);
  return amount > 0 && amount < .1 ? '<0.1' : String(Math.round(amount * 10) / 10);
};
export function reserveIconMarkup() {
  return '<svg class="ico reserve-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v3H8zM8 6 5 10v9c0 2 14 2 14 0v-9l-3-4M5 15h14"/><path d="M12 9c-2 2-3 3-3 4a3 3 0 0 0 6 0c0-1-1-2-3-4Z"/></svg>';
}
export function storedGlowPanelMarkup(reserve = {}, { draw = false } = {}) {
  if(reserve.unlocked!==true||amountOf(reserve.amount)<=0)return '';
  return `<button class="afterglow-readout stored-glow-panel" data-action="inspect-afterglow">${reserveIconMarkup()}<span>AFTERGLOW</span><strong>${formatGlow(reserve.amount,reserve.maxGlow)}</strong><small>SPENT BEFORE GLOW</small></button>`;
}
export function storedGlowChangeMarkup(values, { summary = false, practice = false, maxGlow = 100 } = {}) {
  if (!values) return '';
  const stored = amountOf(values.stored), lost = amountOf(values.loss);
  if (summary) return lost > 0 ? `<div class="afterglow-change stored-glow-change"><span class="reserve-loss">${reserveIconMarkup()}−${formatGlow(lost,maxGlow)} Stored Glow</span></div>` : '';
  return stored > 0 ? `<div class="afterglow-change stored-glow-change"><span>${reserveIconMarkup()}+${formatGlow(stored,maxGlow)} ${practice ? 'practice reserve' : 'Stored Glow'}</span></div>` : '';
}
