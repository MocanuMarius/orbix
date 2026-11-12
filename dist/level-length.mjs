// Ordinary passages are three times their earlier distance. Practice stays short.
export const LEVEL_LENGTH = Object.freeze({ version: 1, multiplier: 3,
  defaultDuration: 114, maximumDuration: 360 });

export function getLevelLengthScale(node = {}) {
  if (node.tutorialLesson || node.isTutorial) return 1;
  return node.flightLengthScale === LEVEL_LENGTH.multiplier ? LEVEL_LENGTH.multiplier : 1;
}

export function formatFlightDuration(seconds = LEVEL_LENGTH.defaultDuration) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return value < 60 ? `${value}s` : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
