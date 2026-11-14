import {glowPoints, getGlowCapacity} from './vitality.mjs?v=living-icons-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=living-icons-1';

export const TREASURE_KINDS = Object.freeze(['vessel', 'lens', 'tithe', 'wager']);
export const LENS_SIGHT = 1.35;
export const LENS_RECOVERY = .7;
const WAGER_TARGET = 12;
const WAGER_REWARD = 40;

const sites = {
  vessel: ['Hollow Vessel', 'A seed of living glass still holds a charge.', 'Grow your Spark capacity or take 20 Stored Sparks.'],
  lens: ['Split Lens', 'Two lenses share one silver setting. Only one will come free.', 'Next attempt: longer sight or quicker companion recovery.'],
  tithe: ['Tollkeeper’s Strongbox', 'A hungry lock guards a second compartment.', 'Take supplies or trade 6 Sparks for a larger purse.'],
  wager: ['Lamplighter’s Escrow', 'Its seal opens at the far end of a flight.', 'Keep 18 Stored Sparks or finish with 12 Sparks to earn 40.']
};

export function describeTreasure(kind) {
  const [name, description, rewardPreview] = sites[kind];
  return {treasureKind:kind, name, locationName:name, description, fuelPreview:rewardPreview,
    riskPreview:description, commitment:rewardPreview, rewardPreview, reward:rewardPreview};
}

function offer(id, title, description, icon, effect, disabledReason = '') {
  return {id, title, description, detail:description, icon, effect, disabled:!!disabledReason, disabledReason};
}

export function treasureChoices(kind, run) {
  const purse = (id, title, amount) => offer(id, title, `Gain ${amount} Stored Sparks for skills now.`, 'packed', {packedReward:amount});
  switch (kind) {
    case 'vessel': return [
      offer('vessel-grow', 'Plant the glass seed', '+3 Spark capacity for this run. Gain 3 Sparks now.', 'capacity', {treasureCapacity:10, flame:10}),
      purse('vessel-purse', 'Sell the seed', 20)
    ];
    case 'lens': {
      const companion = getCompanionAbility(run.companions?.[0] || run.companionRole);
      const action = {collector:'search radius', protector:'shield', swift:'dash', leveler:'levitation'}[companion.id];
      return [
        offer('lens-sight', 'Fit the far lens', 'Luminance reaches 35% farther on your next attempt.', 'sight', {treasurePact:'sight'}),
        offer('lens-companion', 'Fit the quick lens', `${companion.name}’s ${action} takes 30% less time to recharge on your next attempt.`, 'companion', {treasurePact:'recharge'})
      ];
    }
    case 'tithe': {
      const before = glowPoints(run.flame);
      const gain = glowPoints(Math.min(getGlowCapacity(run), run.flame + 20)) - before;
      const note = gain ? `Restore ${gain} Sparks and gain 10 Stored Sparks.` : 'Gain 10 Stored Sparks. Your Spark Meter is full.';
      return [
        offer('tithe-supplies', 'Take the provisions', note, 'energy', {flame:20, packedReward:10}),
        offer('tithe-pay', 'Feed the lock', 'Spend 6 Sparks to gain 30 Stored Sparks. Keep at least 3 Sparks.', 'packed', {flame:-20, packedReward:30},
          before < 9 ? 'Requires 9 Sparks.' : '')
      ];
    }
    case 'wager': return [
      purse('wager-purse', 'Break the seal', 18),
      offer('wager-carry', 'Carry the sealed purse', `Clear your next attempt with at least ${WAGER_TARGET} Sparks before recovery. Earn ${WAGER_REWARD} Stored Sparks on success, zero otherwise.`, 'wager', {treasurePact:'wager'})
    ];
    default: return [];
  }
}

export function treasureFlightNotice(pact) {
  if (pact === 'sight') return 'Far Lens · +35% Luminance this attempt';
  if (pact === 'recharge') return 'Quick Lens · 30% shorter companion recharge this attempt';
  if (pact === 'wager') return `Sealed purse · Finish with ${WAGER_TARGET} Sparks before recovery for ${WAGER_REWARD} Stored Sparks`;
  return '';
}

export function settleTreasureWager(result) {
  const remaining = glowPoints(result.flame);
  const completed = result.success && remaining >= WAGER_TARGET;
  return {completed, reward:completed ? WAGER_REWARD : 0,
    message:completed ? `Seal opened · +${WAGER_REWARD} Stored Sparks`
      : result.success ? `Seal faded · finished with ${remaining}/${WAGER_TARGET} Sparks` : 'Seal lost with this attempt'};
}
