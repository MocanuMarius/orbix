import {uiIcon} from './ui-icons.mjs?v=flash-2';

// The case and latch identify savings even when the icon is only 16 pixels wide.
export const formatCondensedGlow = value => String(Math.max(0, Math.floor(Number(value) || 0)));

/** Stored Sparks: the approved jar holding a Spark (v2.0-icons "stored"). 16 grid; 32 px in the header wallet, 16 px beside counters (ui-icons.css). */
export function condensedIconMarkup({size=32}={}) {
  return uiIcon('stored', {size, className: 'ico condensed-icon'});
}
