import {installExitLandmark} from './exit-landmark.mjs?v=living-choices-1';

// Finish at the grounded refuge's entry plane, just beyond visible scenery.
// Underground polygon closure vertices no longer add a blank course tail.
export function flightEndDistance(layout, playerX = 98, fallback = 0, {height=620} = {}) {
  const exit=installExitLandmark(layout,{height,playerX,fallback});
  return exit?Math.max(1,exit.entryX-playerX):fallback;
}
