import {glowPoints, getGlowCapacity,getLifeCapacity} from './vitality.mjs?v=guide-clarity-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=guide-clarity-1';
import {activeEventFavors} from './passage-preparations.mjs?v=guide-clarity-1';
import {hasTemporary,temporaryLine} from './temporary-inscriptions.mjs?v=guide-clarity-1';

export const TREASURE_KINDS = Object.freeze(['vessel', 'lens', 'tithe', 'wager']);
export const LENS_SIGHT = 1.15;
export const LENS_RECOVERY = .85;
const WAGER_TARGET = 12;
const WAGER_REWARD = 24;
const BODY_TARGET = 3;
const DIVIDEND = 3;
const limits = Object.freeze({vessel:2, farLens:1, quickLens:1, wick:1, toll:1, seal:1});

export function treasureRank(run,id){
  return Math.max(0,Math.min(limits[id]||0,Math.floor(Number(run?.treasureGifts?.[id])||0)));
}

export function grantTreasureGift(run,id){
  if(!Object.hasOwn(limits,id)||treasureRank(run,id)>=limits[id])return false;
  run.treasureGifts??={};
  run.treasureGifts[id]=treasureRank(run,id)+1;
  if(id==='vessel')run.treasureCapacity=(run.treasureCapacity||0)+10;
  return true;
}

export function treasureClearDividend(run,result){
  const tolled=treasureRank(run,'toll')&&result.bodyFuelCollected>=BODY_TARGET;
  const sealed=treasureRank(run,'seal')&&glowPoints(result.flame)>=WAGER_TARGET;
  return {amount:result.success?(Number(!!tolled)+Number(!!sealed))*DIVIDEND:0,
    sources:[...(tolled?['Toll stamp']:[]),...(sealed?['Lamplighter’s seal']:[])]};
}

const sites = {
  vessel: ['Hollow Vessel', 'Living glass shelters two forgotten gifts.', 'Choose one of two lasting finds.'],
  lens: ['Starglass Cache', 'Two finds sleep beneath a cracked silver setting.', 'Choose one of two lasting finds.'],
  tithe: ['Tollkeeper’s Strongbox', 'An old lock guards a traveller’s provisions.', 'Choose one of two lasting finds.'],
  wager: ['Lamplighter’s Reliquary', 'A sealed keepsake waits for another journey.', 'Choose one of two lasting finds.']
};

/** A chest on a card run also gives one free forged card (docs/inscriptions.md, chests). The stop page says so. */
export const CHEST_CARD_LINE = '1 surprise card';
/** Stored Sparks of the chest's other option: 20 on the first map, 30 on the second, 40 on the third (no flight clear scale exists for a support stop). */
export const chestSparks = mapIndex => [20, 30, 40][Math.min(2, Math.max(0, Math.floor(Number(mapIndex)) || 0))];
export const chestChoiceLine = mapIndex => `Choose: +${chestSparks(mapIndex)} Stored Sparks or ${CHEST_CARD_LINE}`;
export function describeTreasure(kind, {card = false, mapIndex = 0} = {}) {
  const [name, description, base] = sites[kind], rewardPreview = card ? `${base} Then ${chestChoiceLine(mapIndex).charAt(0).toLowerCase()}${chestChoiceLine(mapIndex).slice(1)}.` : base;
  return {treasureKind:kind, name, locationName:name, description, fuelPreview:rewardPreview,
    riskPreview:description, commitment:rewardPreview, rewardPreview, reward:rewardPreview};
}

function offer(id, title, description, icon, effect, disabledReason = '') {
  return {id, title, description, detail:description, icon, effect, disabled:!!disabledReason, disabledReason};
}

function duplicateOffer(run){
  if(run.lives<getLifeCapacity(run))return offer('chest-heart','Relight a heart','Restore one missing attempt.','heart',{lives:1});
    const prepared=activeEventFavors(run);
  if(!prepared.includes('feather'))return offer('chest-feather','Carry a hollow feather',temporaryLine('hollow-feather'),'feather',{eventFavor:'feather'});
  if(!prepared.includes('haste'))return offer('chest-blessing','Polish the chime',temporaryLine('chime'),'companion',{eventFavor:'haste'});
  if(!prepared.includes('wick'))return offer('chest-reserve','Carry a reserve wick',temporaryLine('reserve-wick'),'energy',{eventFavor:'wick'});
  if(!prepared.includes('lens'))return offer('chest-chart','Read a star chart',temporaryLine('star-chart'),'sight',{eventFavor:'lens'});
  // Every ordinary preparation is already packed. Offer a distinct run-long
  // exchange: one additional capacity step in return for leaving the purse.
  return offer('chest-recast','Recast the fittings','Add 3 maximum Sparks permanently and fill the new space.','capacity',{glowCapacity:10,flame:10},
    (run.restGlowCapacity||0)>=30?'Spark capacity fittings are full.':'');
}

export function treasureChoices(kind, run) {
  const purse = (id, title, amount) => offer(id, title, `Gain ${amount} Stored Sparks for skills.`, 'packed', {packedReward:amount});
  const repairs=duplicateOffer(run);
  switch (kind) {
    case 'vessel': return [
      treasureRank(run,'vessel')<limits.vessel
        ?offer('vessel-grow', 'Plant the glass seed', '+3 maximum Sparks permanently. Fill the new space.', 'capacity', {treasureGift:'vessel', flame:10})
        :repairs,
      purse('vessel-purse', 'Sell the seed', 20)
    ];
    case 'lens': {
      const companion = getCompanionAbility(run.companions?.[0] || run.companionRole);
      const action = {collector:'search radius', protector:'shield', swift:'dash', leveler:'levitation'}[companion.id];
      return [
        !treasureRank(run,'farLens')
          ?offer('lens-sight', 'Fit the far lens', 'Luminance reaches 15% farther permanently.', 'sight', {treasureGift:'farLens'})
          :purse('lens-sell','Sell the duplicate lens',20),
        !treasureRank(run,'quickLens')
          ?offer('lens-companion', 'Fit the quick lens', `${companion.name}’s ${action} recharges in 15% less time permanently.`, 'companion', {treasureGift:'quickLens'})
          :treasureRank(run,'farLens')?repairs:purse('lens-sell','Sell the duplicate lens',20)
      ];
    }
    case 'tithe': {
      const before = glowPoints(run.flame);
      const gain = glowPoints(Math.min(getGlowCapacity(run),run.flame+20))-before;
      return [
        !treasureRank(run,'wick')
          ?offer('tithe-supplies','Take the mending wick',`Recover 3 extra Sparks after each clear this run.${gain?' Restore '+gain+'.':''}`,'energy',{treasureGift:'wick',flame:20})
          :repairs,
        !treasureRank(run,'toll')
          ?offer('tithe-pay','Buy the toll stamp',`Pay 6 Sparks. Bank ${DIVIDEND} Stored Sparks on each clear with ${BODY_TARGET} body pickups this run.`,'packed',{flame:-20,treasureGift:'toll'},
            before<9?'Requires 9 Sparks.':'')
          :purse('tithe-coin','Empty the coin drawer',20)
      ];
    }
    case 'wager': return [
      purse('wager-purse', 'Break the seal', 18),
      hasTemporary(run,'sealed-purse')?repairs:offer('wager-carry','Carry the sealed purse',
        treasureRank(run,'seal')
          ?`Oath Inscription: Sealed Purse — clear a flight holding ${WAGER_TARGET} Sparks to win 36 Stored Sparks. Stays until fulfilled.`
          :`Oath Inscription: Sealed Purse — clear a flight holding ${WAGER_TARGET} Sparks to win ${WAGER_REWARD} Stored Sparks, then earn +${DIVIDEND} on later clears holding ${WAGER_TARGET}. Stays until fulfilled.`,
        'wager',{treasurePact:'wager'})
    ];
    default: return [];
  }
}

export function treasureFlightNotice(pact,run) {
  if (pact === 'sight') return 'Far Lens · +35% Luminance this attempt';
  if (pact === 'recharge') return 'Quick Lens · 30% shorter companion recharge this attempt';
  if (pact === 'wager') return `Sealed purse · Finish with ${WAGER_TARGET} Sparks before recovery for ${treasureRank(run,'seal')?36:WAGER_REWARD} Stored Sparks`;
  return '';
}

export function settleTreasureWager(result,run) {
  if(!result.success)return null;
  const remaining = glowPoints(result.flame);
  const completed = result.success && remaining >= WAGER_TARGET;
  const owned=treasureRank(run,'seal'),amount=owned?36:WAGER_REWARD;
  return {completed, reward:completed ? amount : 0, gift:completed&&!owned?'seal':null,
    message:completed ? `Seal opened · +${amount} Stored Sparks${owned?'':' · +3 on later clears holding 12 Sparks'}`
      : `Seal still closed · finished with ${remaining}/${WAGER_TARGET} Sparks. It stays until you open it.`};
}
