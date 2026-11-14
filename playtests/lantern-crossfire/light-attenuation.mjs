// Both wisp light and projected darkness follow this finite inverse-square law.
export const LIGHT_EXTENT = 3;
const cutoff = 1 / (1 + 2.2 * LIGHT_EXTENT * LIGHT_EXTENT);

export function lightAttenuation(distanceSquared) {
  const d2 = Math.max(0, Number(distanceSquared) || 0);
  if (d2 >= LIGHT_EXTENT * LIGHT_EXTENT) return 0;
  return (1 / (1 + 2.2 * d2) - cutoff) / (1 - cutoff);
}
