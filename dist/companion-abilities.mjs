const ability = (id, name, action, label, duration, cooldown, icon, description,
  passive = false, collects = false, unlockDifficulty = 1) =>
  Object.freeze({ id, name, action, label, duration, cooldown, icon, description,
    passive, collects, unlockDifficulty });

export const COMPANION_TEST_UNLOCKS = true;

export const COMPANION_ABILITIES = Object.freeze({
  collector: ability('collector', 'Collector', 'collect', 'COLLECTOR', 0, 0, '●',
    'Rescue missed light packets after you pass them, then rest between deliveries. Only Collector fetches packets.', true, true, 1),
  swift: ability('swift', 'Swift', 'boost', 'BOOST', .9, 9, '»',
    'Surge forward and resist local drafts. Touch packets yourself; Swift does not fetch.', false, false, 2),
  anchor: ability('anchor', 'Anchor', 'level', 'LEVEL', 1.8, 11, '═',
    'Steady your height briefly. Lift ends Level immediately; touch packets yourself.', false, false, 3),
  gravity: ability('gravity', 'Gravity', 'gravity', 'GRAVITY', 0, 0, '◉',
    'Passively draw nearby light packets closer, then touch them yourself. Gravity never fetches; dark packets stay untouched.', true, false, 4),
});

export function normalizeCompanionRole(value) {
  if (value === 'scout') return 'gravity';
  return typeof value === 'string' && Object.hasOwn(COMPANION_ABILITIES, value) ? value : 'collector';
}

export function getCompanionAbility(role) {
  return COMPANION_ABILITIES[normalizeCompanionRole(role)];
}

export function getCompanionUnlock(role, difficulty = 1) {
  const requiredDifficulty = getCompanionAbility(role).unlockDifficulty;
  const tier = Math.max(1, Math.floor(Number(difficulty) || 1));
  const unlocked = tier >= requiredDifficulty;
  return { unlocked, requiredDifficulty, testing: !unlocked && COMPANION_TEST_UNLOCKS,
    selectable: unlocked || COMPANION_TEST_UNLOCKS };
}
