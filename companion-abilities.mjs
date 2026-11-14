const ability = (id, name, action, label, duration, cooldown, description, passive, collects, unlockDifficulty) =>
  Object.freeze({ id, name, action, label, duration, cooldown, description, passive, collects, unlockDifficulty, icon: '●' });
export const COMPANION_TEST_UNLOCKS = false;
export const COMPANION_ABILITIES = Object.freeze({
  collector: ability('collector', 'Collector', 'collect', 'COLLECTOR', 0, 0,
    'Rescues missed good Sparks inside its boundary. Each delivery shrinks the range; it grows back over 10 seconds. Nearby rescues still work during recovery.', true, true, 1),
  protector: ability('protector', 'Protector', 'protect', 'PROTECTOR', 0, 0,
    'Spends 12 Sparks and one recovered shell charge to save a collision. An empty shell or insufficient Sparks cannot protect you.', true, false, 2),
  swift: ability('swift', 'Runner', 'boost', 'BOOST', 1.25, 7.5,
    'Surges forward and resists local drafts. Terrain still collides; Runner never fetches Sparks.', false, false, 3),
  leveler: ability('leveler', 'Space Timer', 'level', 'LEVEL', 2.4, 9,
    'Hold the flight area or Lift to levitate; release to glide. Charge drains only while levitating and refills while released. Upgrades extend charge, steady the bob or add a release dive.', false, false, 4),


});
export function normalizeCompanionRole(value) {
  if (value === 'runner') return 'swift';
  if (value === 'space-timer') return 'leveler';
  if (value === 'anchor') return 'leveler';
  return typeof value === 'string' && Object.hasOwn(COMPANION_ABILITIES, value) ? value : 'collector';
}
// The array shape remains an engine/render transport, always exactly one orb.
// TEST unlocks roles, never simultaneous companions.
export function normalizeCompanionFleet(values, fallback = 'collector') {
  const valid=value=>typeof value==='string'&&(Object.hasOwn(COMPANION_ABILITIES,value)||['runner','space-timer','anchor'].includes(value));
  const selected=(Array.isArray(values)?values:[]).find(valid);
  return [normalizeCompanionRole(selected??fallback)];
}

export const getCompanionAbility = role => COMPANION_ABILITIES[normalizeCompanionRole(role)];
export function getCompanionUnlock(role, difficulty = 1, testOverride = false) {
  const requiredDifficulty = getCompanionAbility(role).unlockDifficulty;
  const unlocked = Math.max(1, Math.floor(Number(difficulty) || 1)) >= requiredDifficulty;
  return { unlocked, requiredDifficulty, testing: !unlocked && testOverride === true,
    selectable: unlocked || testOverride === true };
}
