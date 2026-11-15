export const LANTERN_THEME = 'darkness-lanterns';
export const LANTERN_CHAPTER = 'Darkness Lanterns';

export function guardianMapTheme(guardianId) {
  return guardianId === 'hollow-sun' ? LANTERN_THEME : null;
}

export function lanternFlightCue(node) {
  if (node?.mapTheme !== LANTERN_THEME || node.type === 'support') return '';
  if (node.boss) return 'Hollow Sun chains the lanterns through a narrowing passage.';
  if (node.elite || node.row >= 3) return 'Lantern pairs cross the passage in succession.';
  return 'Watch for lanterns on the roof and floor. Their dark beams cross.';
}
