const ability = (id, name, action, label, duration, cooldown, description, passive, collects, unlockDifficulty) =>
  Object.freeze({ id, name, action, label, duration, cooldown, description, passive, collects, unlockDifficulty, icon: '●' });
export const COMPANION_TEST_UNLOCKS = true;
export const COMPANION_ABILITIES = Object.freeze({
  collector: ability('collector', 'Collector', 'collect', 'COLLECTOR', 0, 0,
    'Rescues missed good packets inside its boundary. Each delivery shrinks the range; it grows back over 5 seconds. Nearby rescues still work during recovery.', true, true, 1),
  protector: ability('protector', 'Protector', 'protect', 'PROTECTOR', 0, 0,
    'Spends 12 Glow and one recovered shell charge to save a collision. An empty shell or insufficient Glow cannot protect you.', true, false, 2),
  leveler: ability('leveler', 'Leveler', 'level', 'LEVEL', 2.4, 9,
    'Holds a gently bobbing height. Tap Power again or Lift to release it. Upgrades can add a short finishing dive.', false, false, 3),
  swift: ability('swift', 'Swift', 'boost', 'BOOST', 1.25, 7.5,
    'Surges forward and resists local drafts. Terrain still collides; Swift never fetches packets.', false, false, 4),
  seer: ability('seer', 'Seer', 'see', 'SIGHT', 4.5, 12,
    'Illuminates the route ahead for a few seconds. Seer never moves or collects packets.', false, false, 5),
  kindler: ability('kindler', 'Kindler', 'kindle', 'KINDLER', 0, 0,
    'Adds 10 Glow to direct natural fuel pickups. A purification upgrade can turn an occasional Dark Seed into fuel.', true, false, 6),
});
export function normalizeCompanionRole(value) {
  if (value === 'anchor') return 'leveler';
  return typeof value === 'string' && Object.hasOwn(COMPANION_ABILITIES, value) ? value : 'collector';
}
export function normalizeCompanionFleet(values, fallback = 'collector', maximum = 3) {
  const list = Array.isArray(values) && values.length ? values : [fallback];
  return [...new Set(list.map(normalizeCompanionRole))].slice(0, Math.max(1, Math.min(3, maximum)));
}
export const getCompanionAbility = role => COMPANION_ABILITIES[normalizeCompanionRole(role)];
export function getCompanionUnlock(role, difficulty = 1) {
  const requiredDifficulty = getCompanionAbility(role).unlockDifficulty;
  const unlocked = Math.max(1, Math.floor(Number(difficulty) || 1)) >= requiredDifficulty;
  return { unlocked, requiredDifficulty, testing: !unlocked && COMPANION_TEST_UNLOCKS,
    selectable: unlocked || COMPANION_TEST_UNLOCKS };
}
