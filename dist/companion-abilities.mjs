const ability = (id, name, action, label, duration, cooldown, icon, description) =>
  Object.freeze({ id, name, action, label, duration, cooldown, icon, description });

export const COMPANION_ABILITIES = Object.freeze({
  swift: ability('swift', 'Swift', 'boost', 'BOOST', .9, 9, '»',
    'Surge forward and resist local drafts. A short burst for quick passages.'),
  anchor: ability('anchor', 'Anchor', 'level', 'LEVEL', 1.8, 11, '═',
    'Steady your height briefly. Drafts can still nudge you; Lift ends Level immediately.'),
  gravity: ability('gravity', 'Gravity', 'gravity', 'GRAVITY', 3, 12, '◉',
    'Gently draw nearby light packets closer. Collector range and Gravity upgrades strengthen the field; dark packets stay untouched.'),
});

export function normalizeCompanionRole(value) {
  if (value === 'scout') return 'gravity';
  return typeof value === 'string' && Object.hasOwn(COMPANION_ABILITIES, value) ? value : 'swift';
}

export function getCompanionAbility(role) {
  return COMPANION_ABILITIES[normalizeCompanionRole(role)];
}
