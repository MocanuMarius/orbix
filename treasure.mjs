import {glowPoints, getGlowCapacity,getLifeCapacity} from './vitality.mjs?v=nozoom-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=nozoom-1';
import {queueInscriptionWrite} from './temporary-inscriptions.mjs?v=nozoom-1';
import {oathLine,oathReward} from './oaths.mjs?v=nozoom-1';
import {INSCRIPTIONS,ownsInscription,hasActiveInscription} from './inscriptions.mjs?v=nozoom-1';

export const TREASURE_KINDS = Object.freeze(['vessel', 'lens', 'tithe', 'wager']);
export const LENS_SIGHT = 1.15;
export const LENS_RECOVERY = .85;
const WAGER_TARGET = 12;
const BODY_TARGET = 3;
const DIVIDEND = 3;
const limits = Object.freeze({vessel:2, farLens:1, quickLens:1, wick:1, toll:1, seal:1});

// Five of the finds are PERMANENT Inscriptions the player writes on a Chain slot (docs/inscriptions.md, "Chest gifts"); nothing of them is kept loose
// in run.treasureGifts any more (old saves are moved by migrateChestGifts). Only the Hollow Vessel still counts in treasureGifts.
const GIFT_INSCRIPTION=Object.freeze({farLens:'far-lens',quickLens:'quick-lens',wick:'mending-wick',toll:'toll-stamp',seal:'lamplighter-seal'});
const heldGift=(run,id)=>ownsInscription(run,GIFT_INSCRIPTION[id]);
/** "Inscription: Far Lens — Luminance reaches 15% farther." The one line the chest's find and the stop page use. */
export const giftLine=id=>{const i=INSCRIPTIONS[GIFT_INSCRIPTION[id]];return `Inscription: ${i.name} — ${i.text.charAt(0).toLowerCase()}${i.text.slice(1)}`;};

/** 0 or 1 for a gift Inscription that is written on a slot; the Vessel's rank otherwise. */
export function treasureRank(run,id){
  if(GIFT_INSCRIPTION[id])return hasActiveInscription(run,GIFT_INSCRIPTION[id])?1:0;
  return Math.max(0,Math.min(limits[id]||0,Math.floor(Number(run?.treasureGifts?.[id])||0)));
}

export function grantTreasureGift(run,id){
  if(GIFT_INSCRIPTION[id])return queueInscriptionWrite(run,GIFT_INSCRIPTION[id],{source:'chest'});
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
  const [name, description, base] = sites[kind], rewardPreview = card ? `${chestChoiceLine(mapIndex)}. The other gift stays in the chest.` : base;
  return {treasureKind:kind, name, locationName:name, description, fuelPreview:rewardPreview,
    riskPreview:description, commitment:rewardPreview, rewardPreview, reward:rewardPreview};
}

function offer(id, title, description, icon, effect, disabledReason = '') {
  return {id, title, description, detail:description, icon, effect, disabled:!!disabledReason, disabledReason};
}

function duplicateOffer(run){
  if(run.lives<getLifeCapacity(run))return offer('chest-heart','Relight a heart','Restore one missing attempt.','heart',{lives:1});
  // Nothing lasting is left to offer: spare coins, or one capacity step in return for leaving the purse.
  if((run.restGlowCapacity||0)>=30)return offer('chest-coins','Take the spare coins','Gain 20 Stored Sparks for skills.','packed',{packedReward:20});
  return offer('chest-recast','Recast the fittings','Add 3 maximum Sparks permanently and fill the new space.','capacity',{glowCapacity:10,flame:10},
    '');
}

// A chest's OWN FIND (JOB E, 2026-11-18): one lasting find per chest, then the Stored Sparks / surprise card choice. By site: the Hollow Vessel holds the max-Spark
// vessel (+3 maximum Sparks for the run, fills the new space: its effect before today in card runs); the Starglass Cache a Far Lens or Quick Lens Inscription; the
// Tollkeeper's Strongbox a Mending Wick or Toll Stamp Inscription; the Reliquary nothing (its Seal Inscription is won by the sealed-purse wager). Gifts already held are skipped.
const FIND_CANDIDATES = Object.freeze({vessel:['vessel'], lens:['farLens','quickLens'], tithe:['wick','toll'], wager:[]});
function findRandom(seed){let s=2166136261;for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s+=0x6d2b79f5;let n=s;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};}
/** The gift id ('vessel', 'farLens', ...) this chest holds, or null. Seeded by the run, map and chest, so reloading never changes it. */
export function chestFindId(run, node, kind) {
  const free = (FIND_CANDIDATES[kind] || []).filter(id => id === 'vessel' ? treasureRank(run, id) < limits.vessel : !heldGift(run, id));
  if (!free.length) return null;
  return free[Math.floor(findRandom(`${run.campaignSeed || run.seed}:${run.mapIndex}:${node?.id}:chest-find`)() * free.length)];
}
/** What the Found line shows: {id, name, line, inscription: id|null}. */
export function describeChestFind(id) {
  if (id === 'vessel') return {id, name: 'Hollow Vessel', line: '+3 max Sparks for this run', inscription: null};
  const ins = INSCRIPTIONS[GIFT_INSCRIPTION[id]];
  return ins ? {id, name: ins.name, line: ins.text, inscription: ins.id, glyph: ins.glyph} : null;
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
        !heldGift(run,'farLens')
          ?offer('lens-sight', 'Fit the far lens', giftLine('farLens'), 'sight', {treasureGift:'farLens'})
          :purse('lens-sell','Sell the duplicate lens',20),
        !heldGift(run,'quickLens')
          ?offer('lens-companion', 'Fit the quick lens', giftLine('quickLens'), 'companion', {treasureGift:'quickLens'})
          :heldGift(run,'farLens')?repairs:purse('lens-sell','Sell the duplicate lens',20)
      ];
    }
    case 'tithe': {
      const before = glowPoints(run.flame);
      const gain = glowPoints(Math.min(getGlowCapacity(run),run.flame+20))-before;
      return [
        !heldGift(run,'wick')
          ?offer('tithe-supplies','Take the mending wick',`${giftLine('wick')}.${gain?' Restore '+gain+' now.':''}`,'energy',{treasureGift:'wick',flame:20})
          :repairs,
        !heldGift(run,'toll')
          ?offer('tithe-pay','Buy the toll stamp',`Pay 6 Sparks. ${giftLine('toll')}.`,'packed',{flame:-20,treasureGift:'toll'},
            before<9?'Requires 9 Sparks.':'')
          :purse('tithe-coin','Empty the coin drawer',20)
      ];
    }
    case 'wager': return [
      purse('wager-purse', 'Break the seal', 18),
      run.pendingOath?repairs:offer('wager-carry','Carry the sealed purse',oathLine(run,'sealed-purse'),'wager',{oath:'sealed-purse'})
    ];
    default: return [];
  }
}

export function treasureFlightNotice(pact,run) {
  if (pact === 'sight') return 'Far Lens · +35% Luminance this attempt';
  if (pact === 'recharge') return 'Quick Lens · 30% shorter companion recharge this attempt';
  return '';
}

export function settleTreasureWager(result,run) {
  if(!result.success)return null;
  const remaining = glowPoints(result.flame);
  const completed = remaining >= WAGER_TARGET, reward = completed ? oathReward(run,'sealed-purse') : 0;
  return {completed, reward,
    message:completed ? `Wager won · +${reward} Stored Sparks`
      : `Wager not met · finished with ${remaining}/${WAGER_TARGET} Sparks. Nothing is lost.`};
}
