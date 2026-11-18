import {WISP_ART} from './companion-art.mjs?v=lesson-1';
// A body width is the fixed outer shell, including when fuel burns inward.
// Device pixels and presentation zoom cannot change this gameplay measure.
export const luminanceWidths=radius=>Math.max(0,Number(radius)||0)/WISP_ART.worldDiameter;
export const formatLuminance=radius=>luminanceWidths(radius).toFixed(1)+' wisp widths';
