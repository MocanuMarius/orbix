const ability = (id, name, action, label, duration, cooldown, icon, description) =>
  Object.freeze({ id, name, action, label, duration, cooldown, icon, description });

export const COMPANION_ABILITIES = Object.freeze({
  swift: ability('swift', 'Swift', 'boost', 'BOOST', .9, 9, '»',
    'Surge forward and resist local drafts. A short burst for quick passages.'),
  anchor: ability('anchor', 'Anchor', 'level', 'LEVEL', 1.8, 11, '═',
    'Steady your height briefly. Drafts can still nudge you; Lift ends Level immediately.'),
  scout: ability('scout', 'Scout', 'reveal', 'REVEAL', 3, 12, '◉',
    'Reveal 45% farther for a few seconds. Existing light upgrades and dimming still apply.'),
});

export function normalizeCompanionRole(value) {
  return typeof value === 'string' && Object.hasOwn(COMPANION_ABILITIES, value) ? value : 'swift';
}

export function getCompanionAbility(role) {
  return COMPANION_ABILITIES[normalizeCompanionRole(role)];
}
