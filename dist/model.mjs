import {prepareScoreLedger,awardScoreStores,awardSettledScoreStores,freezeCompletedGameScore,recordCompletedGameScore} from './game-score.mjs?v=dream-gifts-1';
import {getCardChargeCapacity,getCardFeederCapacity,getEmberFeederTargets,consumeCardUseDoublers} from './skill-cards.mjs?v=dream-gifts-1';
import {collectorPreference,learnedCollectorPreferences} from './collector-preferences.mjs?v=dream-gifts-1';
import {CARD_SYSTEM,CARD_ECONOMY,SKILL_CARDS,isCardRun,isInventoryOnlyCard,getInventoryCampCards,makeSkillCard,cleanCardRun,settleCardReward,getCardStarterOffers,drawSkillCard,drawSkillCardDraft,describeSkillCard,getMountedCards,getOwnedCards,getReserveCards,getCardMeltValue,getCardModifiers,getCardPackingBonus,getCardGrowthUses,getCardGrowthBonus,cleanCardFutureCapacity,createCardExecution,resolveCardRow,CARD_ROW_EVENTS,commitCardCharges,recordCardEvent} from './skill-cards.mjs?v=dream-gifts-1';
export {CARD_SYSTEM,CARD_ECONOMY,SKILL_CARDS,isCardRun,getMountedCards,getOwnedCards,getReserveCards,getCardMeltValue,commitCardCharges} from './skill-cards.mjs?v=dream-gifts-1';
import {FLIGHT_PACTS,pactOffers,activeFlightPact,pactBonus} from './flight-pacts.mjs?v=dream-gifts-1';
import {chestRewardPair} from './chest-rewards.mjs?v=dream-gifts-1';
import {STARTING_GIFTS,STARTING_SKILL_COST_LIMIT} from './starting-gifts.mjs?v=dream-gifts-1';
import {EVENT_EDITION,eventChoices,rollPrism} from './event-choices.mjs?v=dream-gifts-1';
import {GUARDIAN_RELICS} from './guardian-artifacts.mjs?v=dream-gifts-1';
import {ATLAS_FORECASTS,atlasBranches} from './night-atlas.mjs?v=dream-gifts-1';
import {getRouteBonus,awardRouteBonus} from './route-bonuses.mjs?v=dream-gifts-1';
export {getRouteBonus,getRouteBonusCandidates,nextBonusFlightNodes} from './route-bonuses.mjs?v=dream-gifts-1';
import {consolidateSkills,refundRetiredSkills} from './skill-consolidation.mjs?v=dream-gifts-1';
import {PROXIMITY_SKILLS} from './proximity-skills.mjs?v=dream-gifts-1';
import {getGuardianForMap,getBossPreview} from './boss.mjs?v=dream-gifts-1';
import {guardianMapTheme} from './map-theme.mjs?v=dream-gifts-1';
import {getFlightLengthProfile} from './level-length.mjs?v=dream-gifts-1';
import {cleanOnboarding,markOnboardingSeen} from './onboarding.mjs?v=dream-gifts-1';
import {CONDENSED_TUNING,getCondensationRules,condenseGlow,getKeptLightDividend,getFlightPackingLimit,packExitReserve} from './condensed-glow.mjs?v=dream-gifts-1';
import {CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS,getArtifactStackPreview} from './artifact-info.mjs?v=dream-gifts-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=dream-gifts-1';
export {getCondensationRules} from './condensed-glow.mjs?v=dream-gifts-1';
import {ROUTE_RECIPES,ROUTE_TOPOLOGY_VERSION,MAP_STOP_COUNT,REWARD_THEMES,nodeEconomy} from './route-recipes.mjs?v=dream-gifts-1';
import {COMPANION_ABILITIES,getCompanionUnlock,normalizeCompanionFleet} from './companion-abilities.mjs?v=dream-gifts-1';
import {MAIN_TUNING_SKILLS} from './main-tuning.mjs?v=dream-gifts-1';
import {activePassageBoons,activeEventFavors,grantEventFavor,spendPreparationClear} from './passage-preparations.mjs?v=dream-gifts-1';
import {STARTING_CONDENSED_GLOW,getGlowCapacity,getRestGlowBonus,REST_GLOW_TUNING,glowText} from './vitality.mjs?v=dream-gifts-1';
import {expandSkillSteps,skillProgress} from './skill-increments.mjs?v=dream-gifts-1';
import {MAX_ASCENSION} from './ascent.mjs?v=dream-gifts-1';
import {EXPANDED_SKILLS,applyExpandedSkills} from './skill-paths.mjs?v=dream-gifts-1';
/** Run-owned skills and currency; persistent ascension unlocks and boss artifacts. */
import { FLAME_TUNING, LIFE_TUNING, getLifeCapacity } from './vitality.mjs?v=dream-gifts-1';
import { getBiomeLevelIdentity } from './level-catalog.mjs?v=dream-gifts-1';
import { BIOMES } from './biomes.mjs?v=dream-gifts-1';
import { EVENT_SCENARIOS } from './map-guide.mjs?v=dream-gifts-1';
import {contextualEventChoices,resolvePilgrimVow,ROUTE_PREPARATION} from './contextual-events.mjs?v=dream-gifts-1';
import {TREASURE_KINDS, describeTreasure, treasureChoices, treasureRank, grantTreasureGift, treasureClearDividend, LENS_SIGHT, LENS_RECOVERY, settleTreasureWager} from './treasure.mjs?v=dream-gifts-1';
export const SAVE_KEY='wispbound.save.condensed.v7';
export const CAMPAIGN_MAP_NAMES=Object.freeze(['The Forgotten Verge','The Rootbound March','The Warden’s Reach']);
export const TERRAINS=Object.freeze({ruins:{id:'ruins',name:'Sunken Ruins',color:'#cdb183',description:'Broken homes, worn arches and overgrown stone.'},canopy:{id:'canopy',name:'Luminous Canopy',color:'#94b48a',description:'Hollow trees, hanging roots and sheltered forest passages.'},storm:{id:'storm',name:'Stormglass Peaks',color:'#a8bbca',description:'Pine ridges, old mine timbers and local draft puffs.'}});
const RUN_BRANCH_CHOICES={
 'main-efficiency':{name:'Vitality',maxRank:1,description:'Lift costs one fewer Spark (minimum one).',consequence:'Less effort for every Lift'},
 'main-sight':{name:'Luminance',maxRank:1,description:'Light reaches about one wisp body width farther.',consequence:'About +1 wisp width of sight'},
 'main-lift':{name:'Glowkeeping',maxRank:1,choiceGroup:'main-vitality',excludes:['main-kindling'],description:'Lift costs one fewer Spark (minimum one).',consequence:'Less Sparks spent on Lift'},
 'collector-reach':{name:'Wide Search',requires:null,maxRank:1,choiceGroup:'collector-style',excludes:['collector-recovery'],description:'Search farther, but rest longer after each delivery.',consequence:'35% more reach · 20% longer recovery'},
 'collector-recovery':{name:'Quick Return',requires:null,maxRank:1,choiceGroup:'collector-style',excludes:['collector-reach'],description:'Recover quickly, but search a smaller area.',consequence:'50% shorter recovery · 20% less reach'},
 'protector-recovery':{name:'Quick Ward',maxRank:1,choiceGroup:'protector-style',excludes:['protector-layers'],description:'Recharge the single-layer ward faster, but spend more Sparks each time.',consequence:'28% faster recovery · 25% higher activation cost'},
 'protector-layers':{name:'Deep Ward',requires:'protector-cost',maxRank:1,choiceGroup:'protector-style',excludes:['protector-recovery'],description:'Hold two protective layers, but pay more Sparks to activate.',consequence:'Two layers · 35% higher activation cost'},
 'leveler-steadiness':{name:'Still Point',maxRank:1,choiceGroup:'leveler-style',excludes:['leveler-dive'],description:'Suppress most bobbing, with a shorter Level hold.',consequence:'65% steadiness · 15% shorter hold'},
 'leveler-dive':{name:'Falling Release',maxRank:1,choiceGroup:'leveler-style',excludes:['leveler-steadiness'],description:'End a shorter Level hold with a controlled dive. Lift cancels the dive.',consequence:'Release dive · 25% shorter hold'},
 'swift-recovery':{name:'Quick Sparks',maxRank:1,choiceGroup:'swift-style',excludes:['swift-resistance'],description:'Use shorter speed bursts more often.',consequence:'28% faster recovery · 25% shorter burst'},
 'swift-resistance':{name:'Wind Lance',maxRank:1,choiceGroup:'swift-style',excludes:['swift-recovery'],description:'Resist almost all draft force, but recharge more slowly.',consequence:'90% draft resistance · 25% longer recovery'},
};
for(const [a,b,group] of [['main-horizon','main-dawn','main-radiance'],['main-tailwind','main-drift','main-momentum'],['main-lift','main-kindling','main-vitality']])for(const [id,other] of [[a,b],[b,a]])RUN_BRANCH_CHOICES[id]={...RUN_BRANCH_CHOICES[id],choiceGroup:group,excludes:[other]};
export const MAIN_WISP_BRANCHES=Object.freeze([{root:'main-sight',name:'Luminance',leaves:['main-horizon','main-dawn']},{root:'main-speed',name:'Momentum',leaves:['main-tailwind','main-drift']},{root:'main-efficiency',name:'Vitality',leaves:['main-lift','main-kindling']}]);
const skill=(id,name,branch,cost,maxRank,requires,description,prices)=>Object.freeze({id,name,branch,cost:id.endsWith('-attunement')?20:id.endsWith('-mastery')?35:RUN_BRANCH_CHOICES[id]?.choiceGroup?75:branch!=='main'&&branch!=='afterglow'?40:cost,maxRank:branch!=='main'&&branch!=='afterglow'?1:maxRank,requires:branch!=='main'&&branch!=='afterglow'&&requires===null&&!id.endsWith('-attunement')?`${branch}-attunement`:requires,description,...(prices?{prices}:{}),...RUN_BRANCH_CHOICES[id],...(branch!=='main'&&branch!=='afterglow'&&!id.endsWith('-attunement')&&(Object.hasOwn(RUN_BRANCH_CHOICES[id]||{},'requires')?RUN_BRANCH_CHOICES[id].requires:requires)===null?{requires:`${branch}-attunement`}:{})});
export const SKILLS=Object.freeze(consolidateSkills(Object.fromEntries(Object.entries(expandSkillSteps({
 ...EXPANDED_SKILLS,
 ...MAIN_TUNING_SKILLS,
 ...PROXIMITY_SKILLS,
 'main-resonant-harvest':{id:'main-resonant-harvest',name:'Resonant Harvest',branch:'main',cost:40,maxRank:1,requires:null,icon:'radiance',shortEffect:'Waves restore Sparks',description:'Each Luminance wave touching an uncollected ordinary Spark restores 1 Spark to your meter. The same Spark can resonate again with the next wave.'},
 'main-resonant-purification':{id:'main-resonant-purification',name:'Resonant Purification',branch:'main',cost:80,maxRank:1,requires:'main-resonant-harvest',icon:'radiance',shortEffect:'Waves purify Dark Sparks',description:'Luminance waves also purify Dark Sparks they touch. Resonant Harvest continues on ordinary Sparks.'},
 'main-resonant-bounty':{id:'main-resonant-bounty',name:'Resonant Bounty',branch:'main',cost:150,maxRank:1,requires:'main-resonant-purification',icon:'radiance',shortEffect:'Each hit also stores 1',description:'Each Luminance wave touching an uncollected ordinary Spark restores 1 Spark to your meter and grants 1 Stored Spark. The same Spark can pay again on the next wave.'},
 'main-efficiency':skill('main-efficiency','Gentle Lift','main',40,3,null,'Lift spends 7% less Sparks per rank.'),
 'main-sight':skill('main-sight','Inner Light','main',40,3,null,'See farther ahead with each rank.'),
 'main-lift':skill('main-lift','Rising Light','main',110,2,'main-efficiency','Lift impulse is 4% stronger per rank.'),
 'main-speed':skill('main-speed','Momentum','main',40,1,null,'Travel 8% faster. Less time to react, shorter crossings.'),
 'main-horizon':skill('main-horizon','Far Horizon','main',80,1,'main-sight','Light reaches another 1.3 wisp body widths farther.'),
 'main-dawn':skill('main-dawn','Dawn Veil','main',80,1,'main-sight','Dark Sparks reduce your Luminance 40% less.'),
 'main-tailwind':skill('main-tailwind','Slipstream','main',80,1,'main-speed','Travel another 6% faster.'),
 'main-drift':skill('main-drift','Feather Drift','main',80,1,'main-speed','Fall 10% more gently.'),
 'main-kindling':skill('main-kindling','Kindling','main',80,1,'main-efficiency','Natural Spark pickups restore 4 extra Sparks.'),
 'main-spare-spark':skill('main-spare-spark','Spare Spark','main',100,1,'main-efficiency','Raise your life cap to 4 permanently. Refill the extra heart at a Rest.'),
 'main-deep-reserve':skill('main-deep-reserve','Deep Reserve','main',180,1,'main-spare-spark','Raise your life cap to 5 permanently. Refill the extra heart at a Rest.'),
 'collector-reach':skill('collector-reach','Collector Reach','collector',50,3,null,'Collector searches 25% farther per rank, after your manual pickup window.'),
 'collector-recovery':skill('collector-recovery','Collector Recovery','collector',60,3,'collector-reach','Collector reels pickups 15% faster per rank.'),
 'protector-cost':skill('protector-cost','Frugal Ward','protector',80,3,null,'Protector activation spends 15% less Sparks.'),
 'protector-recovery':skill('protector-recovery','Returning Ward','protector',90,3,'protector-cost','Protector recharges 10% sooner per rank.'),
 'protector-layers':skill('protector-layers','Second Layer','protector',180,1,'protector-recovery','Protector can hold a second protective layer.'),
 'leveler-duration':skill('leveler-duration','Longer Level','leveler',80,3,null,'Space Timer holds 0.5 seconds longer.'),
 'leveler-steadiness':skill('leveler-steadiness','Steady Level','leveler',100,2,'leveler-duration','Reduce bob and vertical oscillation during Level with each rank.'),
 'leveler-dive':skill('leveler-dive','Guided Descent','leveler',100,2,'leveler-duration','Enable a controlled dive on Level expiry or release. Lift cancels the dive; the second rank strengthens it.'),
 'swift-duration':skill('swift-duration','Longer Surge','swift',80,3,null,'Runner surges 0.2 seconds longer.'),
 'swift-recovery':skill('swift-recovery','Quick Surge','swift',90,3,'swift-duration','Runner recharges 10% sooner per rank.'),
 'swift-resistance':skill('swift-resistance','Windbreak','swift',100,2,'swift-duration','Runner resists 5 percentage points more draft force per rank.'),
 'collector-attunement':skill('collector-attunement','Search Spark','collector',35,1,null,'Collector range +12%.'),
 'collector-field-impulse':{id:'collector-field-impulse',name:'Field Impulse',branch:'collector',cost:80,maxRank:1,requires:'collector-attunement',icon:'swift',shortEffect:'Swipe to spend the ring',description:'Swipe anywhere in the playfield: up to briefly levitate, down to dive, or right to surge. Power scales with the recovering Collector ring. Needs 25% recovery and Collector at home. Resets the ring like a fetch. Tap the playfield to Lift on release; the Lift control responds immediately.'},
 'collector-fetch-large':skill('collector-fetch-large','Cache Handling','collector',50,1,'collector-attunement','Collector can fetch dense Cache Sparks. Deliveries give 12 Sparks and fully recharge the search ring.'),
 'collector-fetch-flash':skill('collector-fetch-flash','Flash Handling','collector',30,1,'collector-attunement','Collector can fetch missed Flash Powerups. Every Flash you or Collector picks up also restores up to 6 missing Sparks.'),
 'collector-mastery':skill('collector-mastery','Deep Spark','collector',75,1,'collector-attunement','Collector range +12%. Adds to your first Spark.'),
 'collector-last-orbit':{id:'collector-last-orbit',name:'Last Orbit',branch:'collector',cost:95,maxRank:1,requires:null,treeGroup:'collector-guard',description:'A full Collector ring catches a fatal impact while your companion is home. You bounce clear. Fetching shuts down for four normal recovery cycles.',consequence:'Save a heart · 4× recovery'},
 'collector-guard-repair':skill('collector-guard-repair','Kindled Guard','collector',55,1,'collector-last-orbit','Direct body fuel pickups shorten Last Orbit recovery by 2 seconds. Dream pickups do not repair it.'),
 'collector-target-dense':skill('collector-target-dense','Dense Priority','collector',20,1,'collector-fetch-large','Unlock Dense first targeting. Prefer the richest eligible Spark; change learned preferences at checkpoints.'),
 'collector-target-flash':skill('collector-target-flash','Flash Priority','collector',20,1,'collector-fetch-flash','Unlock Flash first targeting. Prefer an eligible Flash Powerup; change learned preferences at checkpoints.'),
 'protector-attunement':skill('protector-attunement','Ward Spark','protector',35,1,null,'Shell costs 2 less Sparks.'),
 'protector-mastery':skill('protector-mastery','Deep Spark','protector',75,1,'protector-attunement','Shell costs 2 less Sparks. Adds to your first Spark.'),
 'leveler-attunement':skill('leveler-attunement','Balance Spark','leveler',35,1,null,'Space Timer holds 0.35 seconds longer.'),
 'leveler-mastery':skill('leveler-mastery','Deep Spark','leveler',75,1,'leveler-attunement','Space Timer holds 0.35 seconds longer. Adds to your first Spark.'),
 'swift-attunement':skill('swift-attunement','Surge Spark','swift',35,1,null,'Surge recharges 0.75 seconds sooner.'),
 'swift-mastery':skill('swift-mastery','Deep Spark','swift',75,1,'swift-attunement','Surge recharges 0.75 seconds sooner. Adds to your first Spark.'),
 'afterglow-vessel':skill('afterglow-vessel','Fine Facets','afterglow',36,2,'main-afterglow','Overflow conversion gains 5 percentage points and the packing limit rises by 5 per rank.'),
 'afterglow-retention':{...skill('afterglow-retention','Prismatic Yield','afterglow',40,2,'afterglow-vessel','Overflow conversion gains another 5 percentage points and the packing limit rises by 5 per rank.'),choiceGroup:'condensation-style',excludes:['afterglow-anchor']},
 'afterglow-anchor':{...skill('afterglow-anchor','Kept Light','afterglow',30,2,'main-afterglow','Clear a flight to earn 5% of the Stored Sparks you carried in (up to 5). Rank two earns 10% (up to 10). Round down to whole Stored Sparks. The final guardian pays no interest.'),choiceGroup:'condensation-style',excludes:['afterglow-retention']},
 'packing-hand-seal':{...skill('packing-hand-seal','Hand Seal','afterglow',20,1,'main-afterglow','The first two fuel Sparks you touch directly that overfill your meter each earn 1 extra Stored Spark on clear.'),choiceGroup:'storage-pickups',excludes:['packing-deep-cache']},
 'packing-deep-cache':{...skill('packing-deep-cache','Deep Cache','afterglow',35,1,'main-afterglow','Body-collect a dense Cache Spark above your meter limit. The first two each earn 2 extra Stored Sparks on clear. Collector loads are compacted Clusters.'),choiceGroup:'storage-pickups',excludes:['packing-hand-seal']},
})).filter(([id])=>!id.startsWith('main-artifact-slot-')))));
const ARTIFACT_TAGS={'glow-wick':['sustain'],'flash-stone':['dream','precision'],'sunheart-engine':['sustain','tempo'],'dream-sovereign':['dream','precision'],'hollow-covenant':['risk','precision'],dreamcatcher:['dream','tempo'],'second-dawn':['dream','precision'],'echo-vessel':['sustain'],'glass-lantern':['sustain','risk'],'night-gardener':['risk','precision'],'ember-lens':['dream'],'quiet-cinder':['sustain'],'silver-feather':['precision'],'moss-heart':['precision','sustain'],'wayfinder-seed':['sustain','tempo'],'iron-petal':['sustain','tempo'],'storm-knot':['tempo','risk'],'hollow-bell':['precision'],'dawn-thread':['dream'],'overflow-coil':['sustain','tempo'],'echo-bell':['precision','tempo'],'dawn-loom':['tempo','dream'],sunspool:['precision','dream']};
const BOSS_ARTIFACTS=new Set(['sunheart-engine','dream-sovereign','hollow-covenant',...Object.keys(GUARDIAN_RELICS)]);
const RARE_ARTIFACTS=new Set(['overflow-coil','echo-bell','dawn-loom','sunspool','night-gardener','echo-vessel']);
const artifact=(id,name,description,icon,modifiers)=>Object.freeze({id,name,description,icon,color:'#cdb993',sellValue:BOSS_ARTIFACTS.has(id)?50:RARE_ARTIFACTS.has(id)?35:25,rarity:BOSS_ARTIFACTS.has(id)?'boss':RARE_ARTIFACTS.has(id)?'rare':'common',tags:Object.freeze(ARTIFACT_TAGS[id]||[]),modifiers});
export const ARTIFACTS=Object.freeze({
 ...Object.fromEntries(Object.entries(GUARDIAN_RELICS).map(([id,relic])=>[id,Object.freeze({
   ...artifact(id,relic.name,[relic.trigger,relic.effect,relic.limit].join(' '),id,relic.modifiers),tags:relic.tags,
 })])),
 'wayward-seed':{...artifact('wayward-seed','Wayward Seed','Every third consecutive body Spark pickup restores 3.34 Sparks. Choose its lasting evolution after Map 1.','seed',{}),tags:Object.freeze(['precision','sustain'])},
 'hearth-bloom':{...artifact('hearth-bloom','Hearth Bloom','Every third consecutive body Spark pickup restores 10 Sparks. Five activations per flight. Bonus fuel cannot become Stored Sparks.','fuel',{}),rarity:'rare',sellValue:35,tags:Object.freeze(['precision','sustain'])},
 'lantern-bloom':{...artifact('lantern-bloom','Lantern Bloom','Every third consecutive body Spark pickup reveals the scene for 1.5s. Five activations per flight.','radiance',{}),rarity:'rare',sellValue:35,tags:Object.freeze(['precision','dream'])},
 'glow-wick':artifact('glow-wick','Spark Wick','Natural Spark pickups restore up to 10 extra Sparks. Three automatic uses. Consumed when empty. Bonus fuel cannot become Stored Sparks.','flame',{}),
 'flash-stone':artifact('flash-stone','Flash Stone','Natural Spark pickups reveal the scene for 1.5s. Two automatic uses. Consumed when empty.','sun',{}),
 'sunheart-engine':artifact('sunheart-engine','Sunheart Engine','Natural fuel gives 8 extra Sparks. Overflow fuel recharges your companion and casts 2s of forward light. Recovery caps: 2s per pickup, 12s per flight.','sunheart',{cacheFuelBonus:8,overflowRecharge:.12,rechargeSight:2}),
 'dream-sovereign':artifact('dream-sovereign','Dream Sovereign','Dream pickups restore 2.5s of companion recovery. Your first waking fuel reveals the scene. Fuel gathered in extra light stores a free Lift, up to four per flight. Light radius +35.','dream-crown',{dreamRecharge:2.5,secondDawn:1,litLift:1,lightRadius:35}),
 'hollow-covenant':artifact('hollow-covenant','Hollow Covenant','Lift costs one fewer Spark (minimum one). Companion work primes a direct Spark pickup for +12 Sparks, up to five times per flight. Skim a Dark Spark for 6 Sparks, up to five seeds.','hollow-crown',{workFuel:12,nightGarden:6,flapCost:.90}),
 'overflow-coil':artifact('overflow-coil','Overflow Coil','Fuel that cannot fit in Sparks recharges your companion. Up to 2s per pickup and 12s per flight.','◎',{overflowRecharge:.08}),
 'echo-bell':artifact('echo-bell','Echo Bell','Companion work primes your next direct Spark pickup for +8 Sparks within 8s. One charge; up to five uses per flight.','♧',{workFuel:8}),
 'dawn-loom':artifact('dawn-loom','Dawn Loom','Pickup-granted companion recharge lights the route ahead for 1.5s. Recharges in 4s.','✺',{rechargeSight:1.5}),
 'sunspool':artifact('sunspool','Sunspool','Collect natural fuel in temporary extra light to store one free Lift. Recharges in 4s; up to four free Lifts per flight.','☼',{litLift:1}),
 'dreamcatcher':artifact('dreamcatcher','Dreamcatcher','During preset playback, each natural Spark pickup recharges your companion by 1.5 seconds.','◌',{dreamRecharge:1.5}),
 'second-dawn':artifact('second-dawn','Second Dawn','Your first natural Spark pickup after dream playback briefly reveals the whole scene.','☼',{secondDawn:1}),
 'echo-vessel':artifact('echo-vessel','Prism Vessel','Pack 2 of every 6 surplus Sparks instead of 1. Storage skills add to this, capped at all surplus.','◉',{condensationBonus:1/6}),
 'glass-lantern':artifact('glass-lantern','Glass Lantern',`Natural Sparks pickups restore ${40/3} extra Sparks, but Lift costs one extra Spark.`,'◇',{cacheFuelBonus:40/3,flapCost:1.12}),
 'night-gardener':artifact('night-gardener','Night Gardener','Fly close past a Dark Spark without touching its red rim. Restore up to 6 missing Sparks per skim, five times per flight.','✦',{nightGarden:20}),
 'ember-lens':artifact('ember-lens','Spark Lens','See farther ahead.','◉',{lightRadius:28}),
 'quiet-cinder':artifact('quiet-cinder','Quiet Cinder','Lift costs one fewer Spark (minimum one).','●',{flapCost:.90}),
 'silver-feather':artifact('silver-feather','Silver Feather','Lift impulse is 6% stronger.','⌃',{flap:1.06}),
 'moss-heart':artifact('moss-heart','Moss Heart','Kindled Touch adds 3 more Sparks to direct Spark pickups. Requires that learned perk.','✦',{kindlerBonus:3}),
 'wayfinder-seed':artifact('wayfinder-seed','Wayfinder Seed','Collector searches 15% farther.','✧',{attract:1.15}),
 'iron-petal':artifact('iron-petal','Iron Petal','Protector recharges 12% sooner.','◇',{protectorRecovery:.88}),
 'storm-knot':artifact('storm-knot','Storm Knot','Runner resists 6 percentage points more draft force and recharges 10% sooner.','ϟ',{swiftResistance:.06,swiftRecovery:.90}),
 'hollow-bell':artifact('hollow-bell','Hollow Bell','Space Timer levitation lasts 0.25 seconds longer.','═',{levelerDuration:.25}),
 'reed-charm':artifact('reed-charm','Reed Charm','Drafts push 12% less strongly.','reed',{windSensitivity:-.12}),
 'moon-glass':artifact('moon-glass','Moon Glass','Dark Sparks dim your Luminance 10 percentage points less.','moon',{darkResistance:.1}),
 'stone-anchor':artifact('stone-anchor','Stone Anchor','Fall 5% faster for deliberate descents.','anchor',{gravity:.05}),
 'silk-sail':artifact('silk-sail','Silk Sail','Fall 5% more slowly.','sail',{gravity:-.05}),
 'edge-needle':artifact('edge-needle','Edge Needle','Charge Edging Pulse 12% faster.','needle',{edgingChargeRate:.12}),
 'pulse-hourglass':artifact('pulse-hourglass','Pulse Hourglass','Edging Pulse reveals the scene one second longer.','hourglass',{edgingDuration:1}),
 'cache-cup':artifact('cache-cup','Cache Cup','Caches restore 2 extra Sparks.','cup',{richFuelBonus:20/3}),
 'path-prism':artifact('path-prism','Path Prism','Luminance radius grows by 12; twice that bonus in crystal caves.','prism',{lightRadius:12}),
 'dawn-thread':artifact('dawn-thread','Dawn Thread','Echo Luminance lasts one second longer. Requires that learned perk.','✺',{seerDuration:1}),
});
export const ROUTE_PROFILES=Object.freeze({
 refuge:{routeStyle:'refuge',passage:'open',fuelCadence:2,fuelBonus:0,flameDrain:1,routeReward:1,durationScale:1,fuelPreview:'More frequent Sparks',riskPreview:'Open passages · deliberate edge packets'},
 cavern:{routeStyle:'cavern',passage:'cavern',fuelCadence:3,fuelBonus:0,flameDrain:1,routeReward:1.25,durationScale:.8,fuelPreview:'Spaced Sparks · narrower passages',riskPreview:'Shorter cave · tighter passage'},
 gauntlet:{routeStyle:'gauntlet',passage:'gauntlet',fuelCadence:4,fuelBonus:0,flameDrain:1,routeReward:1.45,durationScale:.9,fuelPreview:'Lean fuel · richer relic rewards',riskPreview:'Reward detour · demanding landforms'},
});
const ROLES=Object.keys(COMPANION_ABILITIES);
const PHASES=new Set(['map','briefing','support','retry','map-clear','ended']);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
const count=(n,max=1e9)=>Math.floor(clamp(finite(n),0,max));
const energy=n=>Math.round(Math.max(0,finite(n))*1000)/1000;
const copy=x=>JSON.parse(JSON.stringify(x));
const rank=(skills,id)=>count(skills?.[id],SKILLS[id]?.maxRank||0);
const unique=(ids,valid)=>[...new Set((Array.isArray(ids)?ids:[]).filter(valid))];
const freshSeed=()=>globalThis.crypto?.getRandomValues?Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)),n=>n.toString(36)).join('-'):`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
function rng(seed){let s=2166136261;for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s+=0x6d2b79f5;let n=s;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};}
const shuffle=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

import {cleanCardCruisingSpeed} from './skill-cards.mjs?v=dream-gifts-1';

export function newState(){return{version:7,profile:{difficulty:1,cardFutureCapacity:0,cardCruisingSpeed:0,cardProgressReceipts:[],onboarding:cleanOnboarding(),ownedArtifacts:[],equippedArtifacts:[],seenArtifactLessons:[],seenPickups:[],pickupCoachSkipped:false,tutorialComplete:false,bankedRuns:[],clearedFlights:0,stats:{completedRuns:0,wins:0,flights:0,attempts:0,deaths:0}},run:null,suspendedRun:null,settings:{sound:true,reducedMotion:false,cardCruisingSpeed:null,skipTutorial:false,testOverride:false,testStarterCompanion:'collector',startingCompanion:'collector',companions:['collector'],companionRole:'collector'}};}
/** Starter preference is validated against earned unlocks, or explicit TEST. */
export function getStartingCompanion(state){const id=state?.settings?.startingCompanion||state?.settings?.testStarterCompanion;return ROLES.includes(id)&&getCompanionUnlock(id).selectable?id:'collector';}
export function setStartingCompanion(state,id){if(!state?.settings||!ROLES.includes(id)||!getCompanionUnlock(id).selectable)return false;state.settings.startingCompanion=id;state.settings.testStarterCompanion=id;return true;}
/** Legacy TEST preference entry point. */
export function getTestStarterCompanion(state){return getStartingCompanion(state);}
export function setTestStarterCompanion(state,id){if(state?.settings?.testOverride!==true||!ROLES.includes(id))return false;return setStartingCompanion(state,id);}
/** The preference affects future runs; a run that used TEST remains marked forever. */
export function setTestOverride(state,enabled){
  if(!state?.settings)return false;enabled=enabled===true;const changed=state.settings.testOverride!==enabled;state.settings.testOverride=enabled;
  const r=state.run;if(!enabled||!r||r.banked||r.phase==='ended')return changed;
  const wasTest=r.testMode===true;r.testMode=true;

  // A previously cached normal-world trade must not mutate permanent inventory in TEST.
  r.supportOffers=null;return changed||!wasTest;
}
export function grantTestCondensedGlow(state,amount=500){const r=state?.run;if(!r?.testMode||r.banked||r.phase==='ended'||r.attemptActive)return false;const grant=count(amount,5000);if(!grant)return false;if(r.isTutorial)r.practiceCondensedGlow=count(r.practiceCondensedGlow)+grant;else r.condensedGlow=count(r.condensedGlow)+grant;return true;}
export function getCruisingSpeed(state){
 const earned=cleanCardCruisingSpeed(state?.profile?.cardCruisingSpeed);
 return Math.min(earned,state?.settings?.cardCruisingSpeed==null?earned:cleanCardCruisingSpeed(state.settings.cardCruisingSpeed));
}
export function setCruisingSpeed(state,value){
 if(!state?.settings||!Number.isInteger(value)||value<0||value>cleanCardCruisingSpeed(state.profile?.cardCruisingSpeed))return false;
 state.settings.cardCruisingSpeed=value;
 for(const run of [state.run,state.suspendedRun])if(isCardRun(run)){
  if(run.attemptActive)run.cardCruisingSpeedNext=value;
  else{run.cardCruisingSpeed=value;delete run.cardCruisingSpeedNext;}
 }
 return true;
}
function cleanProfile(v={}){const p=newState().profile;p.difficulty=clamp(count(v.difficulty)||1,1,MAX_ASCENSION);p.cardFutureCapacity=cleanCardFutureCapacity(v.cardFutureCapacity);p.cardCruisingSpeed=cleanCardCruisingSpeed(v.cardCruisingSpeed);p.cardProgressReceipts=unique(v.cardProgressReceipts,id=>typeof id==='string');p.onboarding=cleanOnboarding(v.onboarding);p.ownedArtifacts=unique(v.ownedArtifacts,id=>Object.hasOwn(ARTIFACTS,id));p.equippedArtifacts=[];p.seenArtifactLessons=unique(v.seenArtifactLessons,id=>Object.hasOwn(ARTIFACTS,id));p.seenPickups=unique(v.seenPickups,id=>typeof id==='string');p.pickupCoachSkipped=v.pickupCoachSkipped===true;p.tutorialComplete=v.tutorialComplete===true;p.bankedRuns=unique(v.bankedRuns,id=>typeof id==='string').slice(-128);p.clearedFlights=count(v.clearedFlights);for(const k of Object.keys(p.stats))p.stats[k]=count(v.stats?.[k]);return p;}
function runWallet(run){return{skills:run?.skills||{},startingSkill:run?.startingSkill||null,mapIndex:run?.mapIndex||0,difficulty:run?.difficulty||1,isTutorial:run?.isTutorial===true,condensedGlow:run?.isTutorial?count(run.practiceCondensedGlow):count(run?.condensedGlow),condensationUnlocked:rank(run?.skills,'main-afterglow')>0,testMode:run?.testMode===true};}
export function getSkillWallet(state){return state?.run?runWallet(state.run):{skills:{},condensedGlow:0,condensationUnlocked:false,testMode:false};}
function cleanRunArtifacts(run){return unique(run.artifacts,id=>Object.hasOwn(ARTIFACTS,id));}
// Counts live in the run, never in the permanent boss collection. Keeping an
// unequipped count prevents moving a partly used relic from refilling it.
export function getArtifactCharges(run={}){
 return Object.fromEntries(unique((run.artifacts||[]).slice(0,getArtifactCapacity(run)),id=>Object.hasOwn(CONSUMABLE_ARTIFACTS,id))
  .map(id=>[id,Number.isFinite(run.artifactCharges?.[id])?count(run.artifactCharges[id],CONSUMABLE_ARTIFACTS[id].maxCharges):CONSUMABLE_ARTIFACTS[id].charges]));
}
function cleanArtifactCharges(run){
 const existing=Object.fromEntries(Object.entries(CONSUMABLE_ARTIFACTS).filter(([id])=>Number.isFinite(run.artifactCharges?.[id])).map(([id,spec])=>[id,count(run.artifactCharges[id],spec.maxCharges)]));
 run.artifactCharges={...existing,...getArtifactCharges(run)};
 run.artifacts=(run.artifacts||[]).map(id=>Object.hasOwn(CONSUMABLE_ARTIFACTS,id)&&run.artifactCharges[id]===0?null:id);
}
function prepareArtifactCharges(run,id,fresh=false){
 if(!Object.hasOwn(CONSUMABLE_ARTIFACTS,id))return;
 const charges=run.artifactCharges??={};
 if(fresh||!Number.isFinite(charges[id]))charges[id]=CONSUMABLE_ARTIFACTS[id].charges;
}
function commitArtifactCharges(run,result){
 const before=getArtifactCharges(run),spent=[];run.artifactCharges??={};
 for(const [id,remaining]of Object.entries(before)){
  const next=Number.isFinite(result?.[id])?Math.min(remaining,count(result[id],CONSUMABLE_ARTIFACTS[id].maxCharges)):remaining;
  run.artifactCharges[id]=next;if(next===0)spent.push(id);
 }
 if(spent.length)run.artifacts=run.artifacts.map(id=>spent.includes(id)?null:id);
 return spent;
}
// Discard the retired multi-companion capacity purchase when loading saves or
// restoring an attempt. Artifact capacity is an independent system.
function cleanRunCompanion(run){
 if(!run)return;
 cleanCardRun(run);
 const fatal=run.lastFatal;
 if(fatal&&(!Number.isFinite(fatal.x)||!Number.isFinite(fatal.y)||fatal.x<0||fatal.x>1||fatal.y<0||fatal.y>1
   ||!run.map?.flat().some(node=>node.id===fatal.nodeId&&fatal.seed===`${run.seed}-${node.id}`)))delete run.lastFatal;
 for(const id of ['collector-fetch-cache','collector-fetch-surge','collector-fetch-giant']){
  if(run.skills?.[id]){run.skills['collector-fetch-large']=1;delete run.skills[id];}
 }
 if(!run)return;
 refundRetiredSkills(run,SKILLS);
 if(Number.isFinite(run.flame))run.flame=clamp(run.flame,0,getGlowCapacity(run));
 if(Number.isFinite(run.attemptEntry?.flame))run.attemptEntry.flame=clamp(run.attemptEntry.flame,0,getGlowCapacity({...run,...run.attemptEntry}));
 const [role]=normalizeCompanionFleet(run.companions,run.companionRole);
 run.companions=[getCompanionUnlock(role).selectable?role:'collector'];
 if(run.attemptEntry)run.attemptEntry.companions=[...run.companions];
 run.companionRole=run.companions[0];
 if(run.skills)delete run.skills['main-bond'];
 if(run.skillPaid)delete run.skillPaid['main-bond'];
}
function validRun(r){if(!r||typeof r.id!=='string'||typeof r.seed!=='string'||!PHASES.has(r.phase))return false;const rows=r.isTutorial?r.map?.length:MAP_STOP_COUNT;if(r.isTutorial&&![3,6,7].includes(rows))return false;if(!Array.isArray(r.map)||r.map.length!==rows||!Number.isInteger(r.step)||r.step<0||r.step>rows)return false;if(r.step===rows&&!['map-clear','ended'].includes(r.phase))return false;const all=r.map.flat();if(r.map.some((row,i)=>!Array.isArray(row)||!row.length||row.length>3||row.some(n=>!n||n.row!==i||typeof n.id!=='string'||!TERRAINS[n.terrain]||!['flight','support','finale'].includes(n.type))))return false;if(new Set(all.map(n=>n.id)).size!==all.length)return false;for(const n of all)if(!Array.isArray(n.nextIds)||n.nextIds.length>3||n.row<rows-1&&!n.nextIds.length||n.nextIds.some(id=>!r.map[n.row+1]?.some(next=>next.id===id)))return false;return Array.isArray(r.path)&&Array.isArray(r.companions)&&Number.isFinite(r.lives)&&Number.isFinite(r.flame);}
function restoreChapterTheme(run) {
 if(run.isTutorial)return;
 const guardian=run.map.at(-1).find(node=>node.boss);
 const theme=guardianMapTheme(guardian?.bossId);
 for(const node of run.map.flat())node.mapTheme=theme;
 // JSON restores the selected site separately from the route's site objects.
 if(run.current)run.current.mapTheme=theme;
}
// Previous campaigns could open a second Rest exit after a failed flight.
function restoreRestRoutes(run){
 for(const row of run.map)for(const camp of row){
  if(camp.kind!=='camp')continue;
  if(camp.nextIds.length>1){
   const next=run.map[camp.row+1]||[],flights=camp.nextIds.filter(id=>next.some(n=>n.id===id&&n.type!=='support'));
   const committed=run.path.includes(camp.id)&&flights.find(id=>run.path.includes(id)||run.current?.id===id||run.dreamPreset?.nodeId===id);
   if(flights.length)camp.nextIds=[committed||flights[0]];
  }
  delete camp.retryNextIds;
  if(run.current?.id===camp.id){run.current.nextIds=camp.nextIds;delete run.current.retryNextIds;}
 }
 delete run.deathDetour;
}
export function saveState(state,storage){try{storage??=globalThis.localStorage;if(!storage?.setItem||state?.version!==7)return false;recordCompletedGameScore(state.run,storage);cleanRunCompanion(state.run);cleanRunCompanion(state.suspendedRun);const starter=getStartingCompanion(state);state.settings.startingCompanion=state.settings.testStarterCompanion=starter;state.settings.companions=[starter];state.settings.companionRole=starter;storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function loadState(storage){try{storage??=globalThis.localStorage;const parsed=JSON.parse(storage?.getItem?.(SAVE_KEY)||'null');if(parsed?.version!==7)return newState();const s=newState();s.profile=cleanProfile(parsed.profile);s.settings={sound:parsed.settings?.sound!==false,reducedMotion:parsed.settings?.reducedMotion===true,cardCruisingSpeed:parsed.settings?.cardCruisingSpeed==null?null:cleanCardCruisingSpeed(parsed.settings.cardCruisingSpeed),skipTutorial:parsed.settings?.skipTutorial===true,testOverride:parsed.settings?.testOverride===true,startingCompanion:'collector',testStarterCompanion:'collector',companions:['collector'],companionRole:'collector'};if(parsed.run&&parsed.run.artifactSystem!==2)s.updateNotice='Artifacts now accumulate without slots. Your old expedition has ended; ascension and tutorial progress are preserved.';if(parsed.run?.artifactSystem===2&&validRun(parsed.run)){s.run=parsed.run;prepareScoreLedger(s.run);restoreRestRoutes(s.run);restoreChapterTheme(s.run);s.run.atlasEligible??=s.profile.stats.wins>0;restoreTreasureSites(s.run);s.run.restGlowCapacity=getRestGlowBonus(s.run);s.run.flame=clamp(s.run.flame,0,getGlowCapacity(s.run));s.run.artifacts=cleanRunArtifacts(s.run);cleanArtifactCharges(s.run);cleanRunCompanion(s.run);s.run.unlockedCompanionDifficulty=s.profile.difficulty;if(s.run.attemptActive)interrupt(s.run);settleCheckpoint(s);normalizeClearFlow(s.run);if(s.run.phase==='ended')bankRun(s);}if(s.run?.isTutorial&&parsed.suspendedRun?.artifactSystem===2&&validRun(parsed.suspendedRun)&&!parsed.suspendedRun.isTutorial&&parsed.suspendedRun.phase!=='ended'&&parsed.suspendedRun.id!==s.run.id){s.suspendedRun=parsed.suspendedRun;prepareScoreLedger(s.suspendedRun);restoreRestRoutes(s.suspendedRun);restoreChapterTheme(s.suspendedRun);restoreTreasureSites(s.suspendedRun);cleanRunCompanion(s.suspendedRun);s.suspendedRun.restGlowCapacity=getRestGlowBonus(s.suspendedRun);s.suspendedRun.flame=clamp(s.suspendedRun.flame,0,getGlowCapacity(s.suspendedRun));cleanArtifactCharges(s.suspendedRun);if(s.suspendedRun.attemptActive)interrupt(s.suspendedRun);settleCardProgress(s,s.suspendedRun);settleRunRewards(s.suspendedRun);normalizeClearFlow(s.suspendedRun);}saveState(s,storage);return s;}catch{return newState();}}

// A campaign deck prevents repeat chests across map boundaries. Reserve a lens
// for any chest immediately before the final guardian, when currency would expire.
function treasureDeck(seed,mapIndex){
 const campaign=seed.replace(/\|map:\d+$/,'');
 const deck=shuffle(TREASURE_KINDS,rng(campaign+':chests'));
 let previous=0,total=0,finalLens=false;
 for(let i=0;i<3;i++){
  const random=rng(campaign+'|map:'+i+':routes:v2');
  const recipe=ROUTE_RECIPES[Math.floor(random()*ROUTE_RECIPES.length)];
  const count=recipe.rows.join('').split('T').length-1;
  if(i<mapIndex)previous+=count;
  total+=count;
  if(i===2)finalLens=recipe.rows.at(-2).includes('T');
 }
 const offset=finalLens?deck.indexOf('lens')-(total-1):0;
 return Array.from({length:deck.length},(_,i)=>deck[((previous+i+offset)%deck.length+deck.length)%deck.length]);
}
export function getTreasureKind(run,node=run?.current){
 if(node?.kind!=='treasure')return null;
 if(TREASURE_KINDS.includes(node.treasureKind))return node.treasureKind;
 if(run.isTutorial)return 'vessel';
 const index=run.map.flat().filter(n=>n.kind==='treasure').findIndex(n=>n.id===node.id);
 return treasureDeck(run.seed,run.mapIndex)[Math.max(0,index)%TREASURE_KINDS.length];
}
export function getTreasureChoices(run,node=run?.current){
 if(run.isTutorial&&node.practiceLoan)return [{title:'Borrow Proximity · rank 1',skillId:'proximity-awakening',icon:'sight',description:'Fly near solid terrain to charge a revealing Surface Pulse. This rank-one skill loan stays in practice.',displayUnits:true,effect:{practiceLoan:true}}];
 if(run.isTutorial)return treasureChoices(getTreasureKind(run,node),run);
 return chestRewardPair(run,(run.campaignSeed||run.seed)+':'+run.mapIndex+':'+node.id,{
  validSkill:id=>SKILLS[id]&&!run.skills[id]&&!(SKILLS[id].excludes||[]).some(other=>run.skills[other]),
  validArtifact:id=>ARTIFACTS[id]&&!run.artifacts.includes(id)&&artifactFitsRun(run,id),
  maxLives:getLifeCapacity(run),growthAvailable:treasureRank(run,'vessel')<2
 });
}
function restoreTreasureSites(run){
 if(!run?.map)return;
 for(const n of run.map.flat())if(n.kind==='treasure'&&!n.practiceLoan)
  Object.assign(n,describeTreasure(getTreasureKind(run,n)));
 if(run.current?.kind==='treasure'){
  const site=run.map.flat().find(n=>n.id===run.current.id);
  if(site)run.current=site;
  run.supportOffers=null;
 }
}
function dealRouteEvents(recipe,deck,seed){
 const sites=[];
 for(const [row,codes] of recipe.rows.entries())for(const [lane,code] of [...codes].entries()){
  if(code!=='V')continue;
  const destinations=[...recipe.edges[row][lane]].map(to=>recipe.rows[row+1][Number(to)]);
  // An elite arrival can close an onward elite. Only mark a fork if both
  // flight choices remain legal for every way into this event.
  const eliteArrival=recipe.edges[row-1]?.some((links,from)=>links.includes(String(lane))&&recipe.rows[row-1][from]==='E');
  const exits=destinations.filter(code=>code==='F'||code==='B'||(code==='E'&&!eliteArrival));
  sites.push({fork:exits.length>=2});
 }
 const dealRandom=rng(seed+':event-sockets');
 const forks=sites.map((site,i)=>site.fork?i:-1).filter(i=>i>=0);
 const cairn=4,vow=2,preparationEvents=[vow,3,7,9,11];
 const featured=forks.length?cairn:deck.find(id=>preparationEvents.includes(id));
 const seats=forks.length?forks:sites.map((_,i)=>i);
 const featuredSeat=seats[Math.floor(dealRandom()*seats.length)];
 const remaining=deck.filter(id=>id!==featured&&id!==cairn);
 return sites.map((_,i)=>i===featuredSeat?featured:remaining.shift());
}
const CARD_ROUTE_RECIPES=Object.freeze([
 {id:'card-lantern-forks',name:'Ember Camps',rows:['FFF','FEF','TVR','FFF',' R ',' F ','E V','F F','R T',' B '],edges:[['01','12','2'],['0','12','2'],['01','1','2'],['1','1','1'],['','1',''],['','02',''],['0','','2'],['02','','02'],['1','','1']],extraFlightRows:[1,3,5,7]},
 {id:'card-moon-forks',name:'Moon Camps',rows:['FFF','FEF','RVT','FFF',' R ',' F ','V E','F F','F R',' B '],edges:[['0','01','12'],['0','12','2'],['0','1','12'],['1','1','1'],['','1',''],['','02',''],['0','','2'],['02','','02'],['1','','1']],extraFlightRows:[1,3,5,7]},
]);
function makeMap(seed,mapIndex,difficulty,cards=false){
 const guardianId=getGuardianForMap(seed.split('|tier:')[0],mapIndex).id,mapTheme=guardianMapTheme(guardianId);
 const random=rng(`${seed}:routes:v2`),recipes=cards?CARD_ROUTE_RECIPES:ROUTE_RECIPES,recipe=recipes[Math.floor(random()*recipes.length)],mirror=random()<.5,locationCounts={};
 const events=dealRouteEvents(recipe,shuffle(EVENT_SCENARIOS.map(e=>e.index),random),seed),themes=shuffle(Object.keys(REWARD_THEMES),random);let eventCursor=0;
 const chests=treasureDeck(seed,mapIndex);let chestCursor=0;
 // A separate seeded deck prevents reward themes from forcing the same world.
 // Flight nodes consume all twelve biome identities before any is repeated;
 // support stops borrow an adjacent deck identity without consuming a draw.
 const biomeRandom=rng(`${seed}:biomes:v1`);let biomeDeck=shuffle(BIOMES,biomeRandom),biomeCursor=0,lastBiome=null;
 const drawBiome=()=>{if(biomeCursor===biomeDeck.length){biomeDeck=shuffle(BIOMES,biomeRandom);biomeCursor=0;if(biomeDeck[0].id===lastBiome)[biomeDeck[0],biomeDeck[1]]=[biomeDeck[1],biomeDeck[0]];}const b=biomeDeck[biomeCursor++];lastBiome=b.id;return b;};
 const rows=recipe.rows.map((rowCode,row)=>[...rowCode].flatMap((code,c)=>{
  if(code===' ')return[];
  const camp=code==='R',treasure=code==='T',support='RTV'.includes(code),finale=code==='B',boss=finale,elite=code==='E';
  const rewardTheme=themes[(row+c*2+mapIndex)%themes.length],theme=REWARD_THEMES[rewardTheme];
  const routeStyle=elite?'gauntlet':rewardTheme==='sustain'?'refuge':rewardTheme==='precision'?'cavern':random()<.45?'refuge':random()<.6?'cavern':'gauntlet',profile=ROUTE_PROFILES[routeStyle];
  const encounterFamily=support||finale?null:rewardTheme==='risk'?'seed-orchard':rewardTheme==='tempo'?'draft-staircase':rewardTheme==='precision'?'stillwater-tunnel':['stillwater-tunnel','draft-staircase','seed-orchard'][Math.floor(random()*3)];
  const encounterPreview=encounterFamily==='seed-orchard'?'Dark-seed Orchard':encounterFamily==='draft-staircase'?'Draft Staircase':encounterFamily?'Stillwater Tunnel':'';
  const biome=support?biomeDeck[(biomeCursor+c)%biomeDeck.length]:drawBiome(),terrain=biome.terrain;
  const location=getBiomeLevelIdentity(biome.id,`${seed}:map:${mapIndex}`,support?0:(locationCounts[biome.id]=(locationCounts[biome.id]||0)+1)-1);
  const bossId=boss?guardianId:null,bossName=boss?getBossPreview(bossId).name:'';
  const eventIndex=events[eventCursor%events.length];if(code==='V')eventCursor++;
  const kind=camp?'camp':treasure?'treasure':support?'event':finale?'finale':elite?'elite':'normal';
  const challengeId=routeStyle==='refuge'?'wisps':routeStyle==='cavern'?'clean':'boosts',target=challengeId==='wisps'?(4+Math.floor(row/2))*3:challengeId==='boosts'?6:0;
  const encounterStage=Math.round(row/(recipe.rows.length-1)*6);
  const n={id:`m${mapIndex}-${row}-${c}`,row,encounterStage,extraFlight:recipe.extraFlightRows.includes(row),lane:mirror?2-c:c,routeLane:c,mapIndex,difficulty,type:support?'support':finale?'finale':'flight',kind,elite,boss,bossId,terrain,biomeId:biome.id,biomeName:biome.name,biomeInteraction:biome.interaction,interactionHint:biome.interactionHint,nextIds:[],routeStyle,...profile,
   routeTopology:ROUTE_TOPOLOGY_VERSION,recipeId:recipe.id,recipeName:recipe.name,mapTheme,rewardTheme,rewardThemeLabel:theme.label,encounterFamily,encounterPreview,
   name:camp?'Glowwell Rest':support?EVENT_SCENARIOS[eventIndex].name:boss?bossName:location.name,locationName:boss?bossName:location.name,levelId:location.id,setpiecePreview:location.signature,
   duration:support?0:(finale?55:Math.round((row===0?34:38+row*2)*profile.durationScale))*3,flightLengthScale:support?1:3,challengeId:support?'':challengeId,challengeTarget:support?0:target,challenge:support?'':challengeId==='wisps'?`Collect ${target} Sparks`:challengeId==='boosts'?`Use companion tools ${target} times`:'Finish without a hit',eventIndex:code==='V'?eventIndex:null,
   fuelPreview:camp?'Recover, rekindle hearts, or gather light':support?EVENT_SCENARIOS[eventIndex].summary:profile.fuelPreview,
   riskPreview:camp?'Recover or grow, then train skills':support?'Preview stakes before committing':`${encounterPreview} · ${profile.riskPreview}`,
   commitment:camp?'One known flight follows this Rest':support?'A choice changes your next flight':elite?'Hard flight · rare relic choice':'Follow the visible route to prepare your build',
   description:camp?'Recover hearts or grow Spark capacity, then prepare for the next flight.':support?EVENT_SCENARIOS[eventIndex].detail:biome.description};
  if(!support)Object.assign(n,getFlightLengthProfile({seed:seed+':'+n.id,mapIndex,row:encounterStage,elite,boss}));
  const economy=nodeEconomy(n);n.challengeBonus=0;n.clearReward=getFlightClearReward(n);n.glowReward=economy.salvageGlow;
  n.rewardPreview=boss?(mapIndex===2?'Expedition victory':'Choose 1 of 2 artifacts'):elite?'Choose 1 of 2 artifacts':camp?'Recover or Grow':support?'Sparks or Stored Sparks':getFlightClearReward(n)+' Stored Sparks + overflow';
  n.reward=n.rewardPreview;
  if(treasure)Object.assign(n,describeTreasure(chests[chestCursor++]));
  return[n];
 }));
 for(let row=0;row<rows.length-1;row++)for(const n of rows[row]){
  const next=rows[row+1],targetLanes=[...recipe.edges[row][n.routeLane]].map(Number);
  n.nextIds=targetLanes.map(lane=>next.find(child=>child.routeLane===lane)?.id).filter(Boolean);

 }
 for(const row of rows)row.sort((a,b)=>a.lane-b.lane);
 return rows;
}
export function createRun(profile=newState().profile,seed=freshSeed(),difficulty,options={}){
  const p=cleanProfile(profile),selected=Number(difficulty),tier=clamp(Number.isFinite(selected)?Math.floor(selected):p.difficulty,1,p.difficulty),campaignSeed=String(seed),mapSeed=`${campaignSeed}|tier:${tier}|map:0`;
  const run={scoreLedger:{v:1,earned:0,complete:true},id:`${campaignSeed}-${freshSeed()}`,campaignSeed,seed:mapSeed,atlasEligible:p.stats.wins>0,mapIndex:0,mapName:CAMPAIGN_MAP_NAMES[0],difficulty:tier,unlockedCompanionDifficulty:p.difficulty,map:makeMap(mapSeed,0,tier,options.cards===true),step:0,path:[],current:null,phase:'map',companions:['collector'],companionRole:'collector',artifactSystem:2,seenArtifacts:[],artifacts:[],artifactCharges:{},skills:{},skillPaid:{},startingSkill:null,lives:LIFE_TUNING.lives,maxLives:LIFE_TUNING.lives,flame:FLAME_TUNING.starting,restGlowCapacity:0,condensedGlow:STARTING_CONDENSED_GLOW,pendingCondensedGlow:0,securedCondensedGlow:0,pendingRewards:[],condensedRemainder:0,condensedEarned:0,condensationJustUnlocked:false,restReady:false,restVisits:[],lastRest:null,attemptActive:false,attemptEntry:null,success:false,banked:false,bossDefeated:false,bossProgressSecured:false,mapHistory:[],mapFlights:0,...(options.cards===true?{skillSystem:CARD_SYSTEM,cardStarterVersion:2,cardFutureCapacity:p.cardFutureCapacity,cardCruisingSpeed:Math.min(p.cardCruisingSpeed,options.cruisingSpeed==null?p.cardCruisingSpeed:cleanCardCruisingSpeed(options.cruisingSpeed)),cardCruisingSpeedUnlocked:p.cardCruisingSpeed,cardClearReceipts:[],cardGrowUses:0,cardGrowCapacity:0,cardSlots:3,mountedCards:[null,null,null],reserveCards:[],cardHistory:[],cardRewardedNodes:[],cardSlotMaps:[]}:{}),stats:{flights:0,attempts:0,deaths:0,collected:0,elites:0,events:0,challenges:0}};
  if(options.cards===true){run.cardStarterVersion=3;run.cardStarterOfferIds=getCardStarterOffers(run).map(gift=>gift.cardId);}
  run.flame=getGlowCapacity(run);
  return run;
}
export const STARTING_SKILL_IDS=Object.freeze(STARTING_GIFTS.filter(gift=>gift.skillId).map(gift=>gift.skillId));
export const STARTING_GIFT_IDS=Object.freeze(STARTING_GIFTS.map(gift=>gift.id));
export function isStartingGiftEligible(run,gift){
 if(!run||!gift)return false;
 if(gift.skillId){
  const skill=SKILLS[gift.skillId],owned=run.skills||{};
  if(!skill||skill.retired||!Number.isFinite(skill.cost)||skill.cost>STARTING_SKILL_COST_LIMIT||rank(owned,skill.id))return false;
  if(![skill.requires].flat().filter(Boolean).every(id=>rank(owned,id)>0))return false;
  if((skill.excludes||[]).some(id=>rank(owned,id)>0))return false;
  if(skill.treeTab==='companion'&&normalizeCompanionFleet(run.companions,run.companionRole)[0]!==skill.branch)return false;
 }
 return (gift.artifactIds||[]).every(id=>artifactFitsRun(run,id));
}
export function getStartingGiftOffers(run){
 if(!run)return [];
 if(isCardRun(run))return getCardStarterOffers(run);
 const random=rng((run.campaignSeed||run.seed)+':opening-gift-pair-v2');
 const pool=STARTING_GIFTS.filter(gift=>isStartingGiftEligible(run,gift));
 for(let index=pool.length-1;index>0;index--){
  const other=Math.floor(random()*(index+1));
  [pool[index],pool[other]]=[pool[other],pool[index]];
 }
 return pool.slice(0,2);
}

// All three work with every starting companion and ordinary fuel, before any
// advanced mechanics are unlocked. The actual relic is visible before choosing.
const startingArtifacts=['ember-lens','reed-charm','wayward-seed'];
export function getStartingArtifact(run){
 if(!run)return null;
 if(run.startingArtifact)return ARTIFACTS[run.startingArtifact]||null;
 const pool=startingArtifacts.filter(id=>artifactFitsRun(run,id));
 const index=Math.floor(rng(`${run.seed}:starting-artifact`)()*pool.length);
 return ARTIFACTS[pool[index]]||null;
}
export function canChooseStartingGift(run,id){
 if(!isStartingPrep(run)||run.startingGiftId||run.startingSkill||run.startingArtifact||run.banked||run.lives<=0||run.stats?.attempts>0)return false;
 if(isCardRun(run)&&[...(run.mountedCards||[]),...(run.reserveCards||[])].some(Boolean))return false;
 if(id===undefined)return true;
 return getStartingGiftOffers(run).some(gift=>gift.id===id)||isCardRun(run)&&!(run.cardStarterVersion>=2)&&getCardStarterOffers(run,{legacy:true}).some(gift=>gift.id===id);
}
export function getStartingGiftPreview(run,id){
 if(!id||!canChooseStartingGift(run,id))return null;
 const gift=getStartingGiftOffers(run).find(gift=>gift.id===id)||isCardRun(run)&&getCardStarterOffers(run,{legacy:true}).find(gift=>gift.id===id);
 if(!gift)return null;
 return {gift:copy(gift),token:JSON.stringify([run.id,run.seed,run.cardStarterVersion||null,id,gift.cardId||null])};
}
export function chooseStartingGift(state,id,expectedPreviewToken){
 const run=state?.run;
 const preview=getStartingGiftPreview(run,id);
 if(!preview||(expectedPreviewToken!==undefined&&expectedPreviewToken!==preview.token))return false;
 const gift=preview.gift;
 if(isCardRun(run)){
  const secondId=gift.cardId==='lift-guide'?getCardStarterOffers(run)[0].cardId:'lift-guide';
  const firstCard=makeSkillCard(gift.cardId,`${run.campaignSeed}:starter:${gift.cardId}`);
  if(isInventoryOnlyCard(firstCard))run.reserveCards.push(firstCard);
  else run.mountedCards[0]=firstCard;
  run.mountedCards[1]=makeSkillCard(secondId,`${run.campaignSeed}:starter:${secondId}`);
  run.cardStarterVersion=Math.max(2,run.cardStarterVersion||0);run.startingGiftId=id;
  recordCardEvent(run,'starter',{cardId:gift.cardId,includedCardId:secondId});return true;
 }
 const capacity=getGlowCapacity(run);
 if(gift.skillId){
  run.skills[gift.skillId]=1;
  (run.skillPaid??={})[gift.skillId]=0;
  run.startingSkill=gift.skillId;
 }
 for(const artifactId of gift.artifactIds){
  if(!run.artifacts.includes(artifactId))run.artifacts.push(artifactId);
  prepareArtifactCharges(run,artifactId,true);
 }
 if(gift.artifactIds.length){
  run.startingArtifact=gift.artifactIds[0];
  run.seenArtifacts=[...new Set([...(run.seenArtifacts||[]),...gift.artifactIds])];
 }
 run.startingGiftId=id;
 run.flame=Math.min(getGlowCapacity(run),run.flame+Math.max(0,getGlowCapacity(run)-capacity));
 return true;
}
export function canChooseStartingSkill(run,id){
 return (id===undefined||STARTING_SKILL_IDS.includes(id))&&canChooseStartingGift(run,id);
}
export function chooseStartingSkill(state,id){
 return STARTING_SKILL_IDS.includes(id)&&chooseStartingGift(state,id);
}

const liveCardEdits = new WeakMap();
function pausedCardFlight(run, engine) {
  return !!(isCardRun(run) && run.attemptActive && run.attemptEntry &&
    run.phase === "briefing" && engine?.seed === `${run.seed}-${run.current?.id}` &&
    typeof engine.getCardChargeLedger === "function" && typeof engine.reconcileCardLoadout === "function" &&
    engine.running && engine.paused && engine.alive && !engine.finished &&
    !engine.destroyed && !engine.dying && !engine.completing);
}
export function canManageCards(run) {
  return (
    isCardRun(run) &&
    !run.banked &&
    run.lives > 0 &&
    ["map", "briefing", "support", "map-clear", "retry"].includes(run.phase) &&
    (!run.attemptActive || pausedCardFlight(run, liveCardEdits.get(run)))
  );
}
// A camp service remains available in its completed preparation screen, until
// the player selects the onward route. A paused flight is still only a Deck.
export function getCardCampContext(run) {
  if (!isCardRun(run) || run.attemptActive || run.banked || !(run.lives > 0)) return null;
  const live = run.phase === "support" && run.current?.kind === "camp",
    id = live ? run.current.id : run.phase === "map" && run.restReady && run.lastRest?.mapIndex === run.mapIndex ? run.lastRest.nodeId : null,
    node = id && run.map?.flat().find((site) => site.id === id && site.kind === "camp" && site.mapIndex === run.mapIndex);
  if (!node || !run.path?.includes(node.id) || run.step !== node.row + (live ? 0 : 1)) return null;
  return { node, completed: !live };
}
export function canUseCardCampServices(run) {
  return canManageCards(run) && !!getCardCampContext(run);
}
const cardCheckpoint = canManageCards;
/** Register the actual paused flight, settling source uses before displaying cards. */
export function syncCardFlightForEdit(run, engine) {
  if (!pausedCardFlight(run, engine) || run.banked || run.lives <= 0) return false;
  run.cardTwinWickUnlocked ||= engine.cardTwinWickUnlocked===true;
  commitCardCharges(run, engine.getCardChargeLedger());
  run.flame = Math.min(engine.flame, getGlowCapacity(run));
  liveCardEdits.set(run, engine);
  return true;
}
export function applyCardFlightEdits(run, engine) {
  if (liveCardEdits.get(run) !== engine || !canManageCards(run)) return false;
  const applied = engine.reconcileCardLoadout({ modifiers: getRunModifiers(run), condensedGlow: run.condensedGlow });
  if (applied) run.flame = engine.flame;
  return applied;
}
export function closeCardFlightEdit(run, engine) {
  const applied = applyCardFlightEdits(run, engine);
  if (liveCardEdits.get(run) === engine) liveCardEdits.delete(run);
  return applied;
}
function preserveCardWallet(run) {
  if (run.attemptActive && run.attemptEntry) run.attemptEntry.condensedGlow = run.condensedGlow;
}
function clampCardFuel(run) {
  run.flame = Math.min(run.flame, getGlowCapacity(run));
}
export function getCardReward(run) {
  settleCardReward(run);
  return run?.cardReward
    ? { ...copy(run.cardReward), card: describeSkillCard(run.cardReward.card) }
    : null;
}
/** Pending drafts are saved offers, never an earned-card receipt. */
export function getCardDraft(run) {
  const draft = run?.cardDraft;
  return isCardRun(run) && draft && !draft.claimed
    ? { ...copy(draft), offers: draft.offers.map(describeSkillCard) }
    : null;
}
export function chooseCardDraft(state, draftId, instanceId) {
  const run = state?.run, draft = run?.cardDraft;
  if (!isCardRun(run) || !draft || draft.version !== 1 || draft.claimed || draft.id !== draftId ||
      draft.runId !== run.id || draft.mapIndex !== run.mapIndex || run.attemptActive || run.banked ||
      !['map', 'map-clear', 'ended'].includes(run.phase) || !run.lastFlight?.success ||
      run.lastFlight.nodeId !== draft.nodeId || run.lastFlight.mapIndex !== draft.mapIndex ||
      !run.cardRewardedNodes.includes(`${draft.mapIndex}:${draft.nodeId}`)) return false;
  const card = draft.offers.find(offer => offer.instanceId === instanceId);
  if (!card || !SKILL_CARDS[card.cardId]) return false;
  draft.claimed = true; draft.chosen = card.instanceId;
  run.cardReward = { id: card.instanceId, card: copy(card), source: 'flight', sourceName: draft.sourceName,
    draftId: draft.id, claimed: false };
  settleCardReward(run);
  recordCardEvent(run, 'drop', { card: describeSkillCard(card), elite: draft.elite, boss: draft.boss, draftId: draft.id,
    offeredCardIds: draft.offers.map(offer => offer.cardId) });
  if (draft.final) {
    run.cardReward.trophy = true;
    run.finalCardTrophy = describeSkillCard(card);
  }
  run.lastFlight.cardDrop = getCardReward(run);
  return true;
}
function cardRewardResolved(run) {
  settleCardReward(run);
  return !getCardDraft(run) && (!run?.cardReward || run.cardReward.claimed);
}
function cardDestination(run, index) {
  if (index === null || index === undefined)
    return run.mountedCards.findIndex((card) => !card);
  return Number.isInteger(index) && index >= 0 && index < run.cardSlots
    ? index
    : -1;
}
export function chooseCardReward(state, action, slotIndex = null) {
  const run = state?.run,
    reward = run?.cardReward;
  if (
    !isCardRun(run) ||
    !reward ||
    reward.claimed ||
    reward.trophy ||
    run.attemptActive ||
    run.banked ||
    run.phase === "ended" ||
    !["equip", "melt", "deck"].includes(action)
  )
    return false;
  // Compatibility for an old pending modal. New drops are already stored.
  const index = action === "equip" ? cardDestination(run, slotIndex) : -1;
  if (action === "equip" && (index < 0 || isInventoryOnlyCard(reward.card))) return false;
  if (!settleCardReward(run)) return false;
  if (action === "deck") return true;
  return action === "equip"
    ? equipOwnedCard(run, reward.card.instanceId, index)
    : meltOwnedCards(state, [reward.card.instanceId]);
}
function findOwnedCard(run, instanceId) {
  if (typeof instanceId !== "string") return null;
  const slot = (run?.mountedCards || []).findIndex((card) => card?.instanceId === instanceId);
  if (slot >= 0) return { card: run.mountedCards[slot], slot, reserveIndex: -1 };
  const reserveIndex = (run?.reserveCards || []).findIndex((card) => card?.instanceId === instanceId);
  return reserveIndex >= 0 ? { card: run.reserveCards[reserveIndex], slot: null, reserveIndex } : null;
}
export function equipOwnedCard(run, instanceId, slotIndex, expectedSlotId) {
  settleCardReward(run);
  if (!cardCheckpoint(run) || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= run.cardSlots) return false;
  const owned = findOwnedCard(run, instanceId), displaced = run.mountedCards[slotIndex];
  if (!owned || isInventoryOnlyCard(owned.card) || owned.slot === slotIndex || (expectedSlotId !== undefined && expectedSlotId !== (displaced?.instanceId || null))) return false;
  if (owned.slot !== null) return moveMountedCard(run, owned.slot, slotIndex);
  run.reserveCards.splice(owned.reserveIndex, 1);
  if (displaced) run.reserveCards.push(displaced);
  run.mountedCards[slotIndex] = owned.card;
  clampCardFuel(run);
  recordCardEvent(run, "equip", { instanceId, slot: slotIndex, displacedId: displaced?.instanceId || null });
  return true;
}
export function unequipMountedCard(run, index, expectedInstanceId) {
  settleCardReward(run);
  if (!cardCheckpoint(run) || !Number.isInteger(index)) return false;
  const card = run.mountedCards[index];
  if (!card || (expectedInstanceId !== undefined && card.instanceId !== expectedInstanceId)) return false;
  (run.reserveCards ??= []).push(card);
  run.mountedCards[index] = null;
  clampCardFuel(run);
  recordCardEvent(run, "unequip", { instanceId: card.instanceId, slot: index });
  return true;
}
export function moveMountedCard(run, from, to) {
  if (
    !cardCheckpoint(run) ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= run.cardSlots ||
    to >= run.cardSlots ||
    from === to ||
    !run.mountedCards[from] ||
    isInventoryOnlyCard(run.mountedCards[from]) ||
    isInventoryOnlyCard(run.mountedCards[to])
  )
    return false;
  [run.mountedCards[from], run.mountedCards[to]] = [
    run.mountedCards[to],
    run.mountedCards[from],
  ];
  clampCardFuel(run);
  recordCardEvent(run, "reorder", { from, to });
  return true;
}
export function meltMountedCard(state, index) {
  const run = state?.run;
  if (!cardCheckpoint(run) || !Number.isInteger(index)) return false;
  const card = run.mountedCards[index];
  return !!card && meltOwnedCards(state, [card.instanceId]);
}
export function getCardMeltPreview(run, instanceIds) {
  settleCardReward(run);
  const ids = Array.isArray(instanceIds) ? instanceIds : [],
    selected = ids.map((id) => findOwnedCard(run, id)),
    cards = selected.filter(Boolean).map(({ card, slot }) => ({ ...describeSkillCard(card), mounted: slot !== null, slot })),
    amount = cards.reduce((total, card) => total + card.meltValue, 0),
    mountedCount = cards.filter((card) => card.mounted).length,
    reason = !cardCheckpoint(run) ? "Open Deck while the run is active; pause a flight first"
      : !ids.length ? "Select cards to melt"
      : new Set(ids).size !== ids.length ? "Select each card only once"
      : selected.some((owned) => !owned) ? "A selected card is no longer in the deck"
      : cards.some((card) => !card.meltValue) ? "A selected card has no remaining uses"
      : null;
  return { cards, amount, mountedCount, eligible: !reason, reason,
    token: JSON.stringify(cards.map((card) => [card.instanceId, card.cardId, card.rank, card.charges ?? null, card.slot, card.meltValue])) };
}
export function meltOwnedCards(state, instanceIds, expectedToken) {
  const run = state?.run, preview = getCardMeltPreview(run, instanceIds);
  if (!preview.eligible || (expectedToken !== undefined && expectedToken !== preview.token)) return false;
  const selected = new Set(instanceIds);
  run.mountedCards = run.mountedCards.map((card) => selected.has(card?.instanceId) ? null : card);
  run.reserveCards = (run.reserveCards || []).filter((card) => !selected.has(card.instanceId));
  grantArtifactMelt(run, preview.amount);
  preserveCardWallet(run);
  clampCardFuel(run);
  recordCardEvent(run, "melt", { cards: preview.cards, amount: preview.amount });
  return true;
}
export function getCardImprovePreview(run, index) {
  settleCardReward(run);
  const card = typeof index === "string" ? findOwnedCard(run, index)?.card : run?.mountedCards?.[index],
    before = describeSkillCard(card),
    definition = SKILL_CARDS[card?.cardId],
    nextDefinition = SKILL_CARDS[definition?.evolvesTo],
    kind = !definition ? null : card.rank < definition.maxRank ? "rank" : nextDefinition ? "evolution" : null,
    nextCard = kind === "rank" ? { ...card, rank: card.rank + 1 }
      : kind === "evolution" ? { ...card, cardId: nextDefinition.id, rank: Math.min(card.rank, nextDefinition.maxRank) }
      : null,
    after = nextCard ? describeSkillCard(nextCard) : before,
    price = kind === "evolution"
      ? (CARD_ECONOMY.evolve || { rare: 25, legendary: 40 })[nextDefinition.rarity]
      : definition ? CARD_ECONOMY.improve[definition.rarity] * card.rank : 0,
    slot = card ? (run?.mountedCards || []).findIndex((owned) => owned?.instanceId === card.instanceId) : -1;
  const reason = !before
    ? "Choose a card from your deck"
    : !canUseCardCampServices(run)
      ? "Improve and Evolve are available at Rest"
      : definition.charges && !(card.charges > 0)
        ? "No remaining uses"
      : !kind
        ? "Maximum rank"
        : (run.condensedGlow || 0) < price
          ? "Not enough Stored Sparks"
          : null;
  return {
    before,
    after,
    kind,
    price,
    token: JSON.stringify([run?.id || null, card?.instanceId || null, card?.cardId || null,
      card?.rank || null, card?.charges ?? null, slot, kind, nextCard?.cardId || null,
      nextCard?.rank || null, price, run?.condensedGlow || 0]),
    eligible: !reason,
    reason,
  };
}
/** A surviving consumable can be refilled at its tier's full-service price,
 * prorated for missing uses. One-use and lasting-progress cards are excluded. */
export function getCardRefillPreview(run, instanceId) {
  const owned = findOwnedCard(run, instanceId), card = owned?.card,
    definition = SKILL_CARDS[card?.cardId], before = describeSkillCard(card),
    maximum = getCardChargeCapacity(card), remaining = count(card?.charges),
    missing = Math.max(0, maximum - remaining),
    fullPrice = CARD_ECONOMY.improve[definition?.rarity] || 0,
    price = maximum > 0 ? Math.ceil(fullPrice * missing / maximum) : 0,
    supported = definition?.charges > 1 && !isInventoryOnlyCard(card) &&
      !['growth-ring', 'wind-feather', 'capacity', 'camp-grow'].includes(definition?.kind) &&
      !['add-future-capacity', 'add-cruising-speed'].includes(definition?.row?.operation);
  const reason = !before ? 'This card is no longer in your Deck'
    : !canUseCardCampServices(run) ? 'Refill is available at Rest'
      : !supported ? 'This card cannot be refilled'
        : remaining <= 0 ? 'Consumed cards cannot be refilled'
          : !missing ? 'Uses are already full'
            : (run.condensedGlow || 0) < price ? 'Not enough Stored Sparks' : null;
  return { before, after: before ? describeSkillCard({ ...card, charges: maximum }) : null,
    maximum, missing, fullPrice, price, supported, eligible: !reason, reason,
    token: JSON.stringify([run?.id, getCardCampContext(run)?.node.id, card?.instanceId,
      card?.cardId, card?.rank, card?.charges, maximum, price, run?.condensedGlow || 0]) };
}
export function refillOwnedCard(state, instanceId, expectedToken) {
  const run = state?.run, preview = getCardRefillPreview(run, instanceId),
    card = findOwnedCard(run, instanceId)?.card;
  if (!preview.eligible || expectedToken !== preview.token) return false;
  run.condensedGlow -= preview.price;
  preserveCardWallet(run);
  card.charges = preview.maximum;
  recordCardEvent(run, 'refill', { price: preview.price, before: preview.before, after: preview.after });
  return true;
}
export function improveMountedCard(state, index, expectedRank, expectedPreviewToken) {
  const card = state?.run?.mountedCards?.[index];
  return !!card && improveOwnedCard(state, card.instanceId, expectedRank, expectedPreviewToken);
}
export function improveOwnedCard(state, instanceId, expectedRank, expectedPreviewToken) {
  const run = state?.run,
    preview = getCardImprovePreview(run, instanceId),
    owned = findOwnedCard(run, instanceId),
    card = owned?.card;
  if (
    !preview.eligible ||
    (expectedRank !== undefined && expectedRank !== card.rank) ||
    (expectedPreviewToken !== undefined && expectedPreviewToken !== preview.token)
  )
    return false;
  run.condensedGlow -= preview.price;
  preserveCardWallet(run);
  // Keep the real instance and its settled uses through a family evolution.
  card.cardId = preview.after.cardId;
  card.rank = preview.after.rank;
  clampCardFuel(run);
  recordCardEvent(run, "improve", {
    slot: owned.slot,
    kind: preview.kind,
    price: preview.price,
    before: preview.before,
    after: describeSkillCard(card),
  });
  return true;
}
function cardRestSource(run) {
  const id = run.cardRest?.extraSourceId;
  return getInventoryCampCards(run, 'camp-extra').find(
    (card) => card?.instanceId === id && card.charges > 0,
  );
}
function ensureCardRest(run) {
  if (!isCardRun(run) || run.current?.kind !== "camp") return null;
  const key = `${run.mapIndex}:${run.current.id}`;
  if (run.cardRest?.key !== key) {
    const used = run.restVisits?.some((visit) => visit.key === key),
      extra = getInventoryCampCards(run, 'camp-extra').find(
        (card) =>
          SKILL_CARDS[card?.cardId]?.kind === "camp-extra" && card.charges > 0,
      );
    run.cardRest = {
      key,
      nodeId: run.current.id,
      actions: [],
      extraSourceId: extra?.instanceId || null,
      growUnlocked: getCardModifiers(run).cardGrowSources > 0,
      closed: !!used,
    };
  }
  return run.cardRest;
}
export function getCardForgePreview(run, rarity = "rare") {
  const valid = ["rare", "legendary"].includes(rarity),
    price = valid ? CARD_ECONOMY.forge[rarity] : 0;
  let sequence = count(run?.cardForgeCounts?.[rarity]), card = null;
  if (valid && isCardRun(run)) {
    const occupied = new Set([
      ...(run.mountedCards || []), ...(run.reserveCards || []),
      ...(run.cardHistory || []).filter((event) => event.type === "forge").map((event) => event.card),
    ].filter(Boolean).map((owned) => owned.instanceId));
    do {
      card = drawSkillCard({ campaignSeed: run.campaignSeed, seed: run.seed, mapIndex: 0 }, `forge:v2:${rarity}:${sequence}`, null, rarity);
      if (!occupied.has(card.instanceId)) break;
      sequence++;
    } while (true);
  }
  const hasRare = (run?.mountedCards || []).some(
    (card) => SKILL_CARDS[card?.cardId]?.rarity === "rare",
  );
  const reason =
    !canUseCardCampServices(run)
      ? "Forge is available at Rest"
      : !valid
        ? "No tier above Legendary"
        : rarity === "legendary" && !hasRare
          ? "Mount a Rare card to forge Legendary"
          : (run.condensedGlow || 0) < price
            ? "Not enough Stored Sparks"
            : null;
  return {
    card: describeSkillCard(card),
    price,
    rarity,
    actionCost: 0,
    sequence,
    token: JSON.stringify([run?.id || null, rarity, sequence, card?.instanceId || null, price]),
    eligible: !reason,
    reason,
  };
}
export function forgeOwnedCard(state, rarity = "rare", expectedPreviewToken) {
  const run = state?.run, preview = getCardForgePreview(run, rarity);
  if (!preview.eligible || (expectedPreviewToken !== undefined && expectedPreviewToken !== preview.token)) return false;
  run.condensedGlow -= preview.price;
  preserveCardWallet(run);
  (run.cardForgeCounts ??= {})[rarity] = preview.sequence + 1;
  (run.reserveCards ??= []).push(makeSkillCard(preview.card.cardId, preview.card.instanceId));
  run.lastCardForged = copy(preview.card);
  recordCardEvent(run, "forge", { price: preview.price, card: preview.card });
  return true;
}
function makeCardCampChoices(run) {
  const rest = ensureCardRest(run),
    actions = rest.actions,
    growth = getCardGrowthUses(run) < 3 ? getCardModifiers(run).cardGrowAmount : 0,
    recover =
      run.lives < getLifeCapacity(run) || run.flame < getGlowCapacity(run),
    extra = cardRestSource(run),
    eligible = (key) =>
      !rest.closed &&
      !actions.includes(key) &&
      (!actions.length || (extra && actions.length === 1));
  const option = (
    id,
    title,
    description,
    key,
    possible,
    reason,
    effect = {},
  ) => ({
    ...choice(id, title, description, { rest: key, ...effect }),
    displayUnits: true,
    disabled: !eligible(key) || !possible,
    disabledReason: !eligible(key)
      ? actions.includes(key)
        ? "Choose a distinct Rest action"
        : "No Rest action remaining"
      : !possible
        ? reason
        : undefined,
  });
  const offers = [
    option(
      "rest-recover",
      "Recover",
      "Restore every missing heart and refill Sparks.",
      "recover",
      recover,
      "Hearts and Sparks are already full.",
    ),
    option(
      "rest-slot",
      "Add slot",
      `Add one empty active slot (${run.cardSlots}/5). One addition per map; no refill or healing.`,
      "slot",
      run.cardSlots < 5 && !run.cardSlotMaps.includes(run.mapIndex),
      run.cardSlots >= 5
        ? "Maximum five slots"
        : "One slot already added on this map",
    ),
  ];
  offers.push(
    option(
      "rest-grow",
      "Grow",
      `Increase maximum Sparks by +${Math.round(growth * .3)} and fully refill once. Hearts stay as they are. ${getCardGrowthUses(run)}/3 shared Grow actions used.`,
      "grow",
      getCardModifiers(run).cardGrowSources > 0 &&
        growth > 0,
      getCardGrowthUses(run) >= 3
        ? "Maximum growth reached (3/3)"
        : "Find a Growth Seed to Grow",
    ),
  );
  offers.push({
    ...choice(
      "rest-continue",
      "Continue",
      actions.length
        ? "Leave Rest. The unused second-action charge is preserved."
        : "Leave Rest without taking an action.",
      { restContinue: true },
    ),
    displayUnits: true,
    disabled: rest.closed,
    disabledReason: rest.closed ? "Rest is complete" : undefined,
  });
  return offers;
}
/** Read-only Rest quote; commits still use the indexed support choices. */
export function getCardCampPreview(run) {
  const context = getCardCampContext(run);
  if (!context) return null;
  const snapshot = copy(run);
  snapshot.current = snapshot.map.flat().find((node) => node.id === context.node.id);
  const offers = makeCardCampChoices(snapshot), rest = snapshot.cardRest;
  const used = [...rest.actions], extra = !!cardRestSource(snapshot);
  const before = { hearts: snapshot.lives, maxHearts: getLifeCapacity(snapshot), meter: snapshot.flame, maxMeter: getGlowCapacity(snapshot), slots: snapshot.cardSlots };
  const growth = getCardGrowthUses(snapshot) < 3 ? getCardModifiers(snapshot).cardGrowAmount : 0;
  const grownMaximum = getGlowCapacity({ ...snapshot, cardGrowCapacity: getCardGrowthBonus(snapshot) + growth, cardGrowUses: getCardGrowthUses(snapshot) + 1 });
  const actions = offers.map((offer, index) => {
    const key = offer.effect?.rest;
    const after = key === "recover" ? { ...before, hearts: before.maxHearts, meter: before.maxMeter }
      : key === "slot" ? { ...before, slots: Math.min(5, before.slots + 1) }
        : key === "grow" ? { ...before, meter: grownMaximum, maxMeter: grownMaximum } : { ...before };
    const token = key === 'grow' ? JSON.stringify([snapshot.id, rest.key, used, getCardGrowthUses(snapshot), before, after, rest.extraSourceId]) : undefined;
    return { ...offer, index, key, taken: used.includes(key), before: { ...before }, after, ...(token ? { token } : {}) };
  });
  return { used, closed: rest.closed, completed: context.completed, node: copy(context.node), extraAvailable: extra, remaining: rest.closed ? 0 : Math.max(0, (extra ? 2 : 1) - used.length), actions };
}
function resolveCardCamp(run, index) {
  if (!cardRewardResolved(run)) return false;
  const offers = makeCardCampChoices(run),
    offer = offers[index],
    effect = offer?.effect,
    rest = run.cardRest;
  if (!effect || offer.disabled || rest.closed) return false;
  if (effect.restContinue) {
    rest.closed = true;
    run.restReady = true;
    if (run.lastRest?.nodeId !== run.current.id)
      run.lastRest = {
        nodeId: run.current.id,
        row: run.step,
        mapIndex: run.mapIndex,
        boon: "skip",
        actions: [],
        heartsRestored: 0,
        sparksRestored: 0,
      };
    if (!run.restVisits.some((v) => v.key === rest.key))
      run.restVisits.push({
        key: rest.key,
        nodeId: run.current.id,
        mapIndex: run.mapIndex,
        row: run.step,
        boon: "skip",
        actions: [],
      });
    recordCardEvent(run, "camp-leave", { actions: [...rest.actions] });
    run.stats.events++;
    nextStop(run);
    return true;
  }
  const action = effect.rest,
    before = { lives: run.lives, flame: run.flame },
    second = rest.actions.length === 1,
    source = second ? cardRestSource(run) : null;
  if (second && !source) return false;
  if (action === "recover") {
    run.maxLives = getLifeCapacity(run);
    run.lives = run.maxLives;
    run.flame = getGlowCapacity(run);
  }
  if (action === "slot") {
    run.cardSlots++;
    run.mountedCards.push(null);
    run.cardSlotMaps.push(run.mapIndex);
  }
  if (action === "grow") {
    run.cardGrowCapacity = getCardGrowthBonus(run) + getCardModifiers(run).cardGrowAmount;
    run.cardGrowUses = getCardGrowthUses(run) + 1;
    run.flame = getGlowCapacity(run);
  }
  if (second) {
    source.charges--;
    if (!source.charges) {
      run.mountedCards = run.mountedCards.map((card) =>
        card?.instanceId === source.instanceId ? null : card,
      );
      run.reserveCards = run.reserveCards.filter(card => card.instanceId !== source.instanceId);
    }
  }
  rest.actions.push(action);
  run.restReady = true;
  run.lifeRestClaimed = action === "recover";
  run.lastRest = {
    nodeId: run.current.id,
    row: run.step,
    mapIndex: run.mapIndex,
    boon: action,
    actions: [...rest.actions],
    heartsRestored:
      (run.lastRest?.nodeId === run.current.id
        ? run.lastRest.heartsRestored
        : 0) + Math.max(0, run.lives - before.lives),
    sparksRestored:
      (run.lastRest?.nodeId === run.current.id
        ? run.lastRest.sparksRestored
        : 0) + Math.max(0, run.flame - before.flame),
  };
  let visit = run.restVisits.find((v) => v.key === rest.key);
  if (!visit) {
    visit = {
      key: rest.key,
      nodeId: run.current.id,
      mapIndex: run.mapIndex,
      row: run.step,
    };
    run.restVisits.push(visit);
  }
  Object.assign(visit, { boon: action, actions: [...rest.actions] });
  recordCardEvent(run, "camp", {
    action,
    number: rest.actions.length,
    spentExtra: second,
  });
  const another =
    rest.actions.length === 1 &&
    cardRestSource(run) &&
    makeCardCampChoices(run).some(
      (choice) => choice.effect.rest && !choice.disabled,
    );
  if (!another) {
    rest.closed = true;
    run.stats.events++;
    nextStop(run);
  }
  return true;
}
const nodes=run=>run.map.flat();
function previousElite(run){return run.path.map(id=>nodes(run).find(n=>n.id===id)).filter(n=>n&&n.row<run.step&&n.type!=='support').at(-1)?.elite===true;}

export function getChoices(run){if(!run||run.phase!=='map'||run.step>=run.map.length)return[];const prior=run.path.map(id=>nodes(run).find(n=>n.id===id)).filter(n=>n&&n.row<run.step).at(-1),ids=prior?.nextIds;return run.map[run.step].filter(n=>(!ids||ids.includes(n.id))&&!(previousElite(run)&&n.elite));}
/** One source of truth for map lighting and preview permissions. IDs and edges
 * are serializable; an elite history survives support stops during traversal. */
export function getRouteMapState(run){
 const all=run?.map?.flat?.()||[],byId=new Map(all.map(n=>[n.id,n])),step=Number(run?.step)||0;
 const completed=(run?.path||[]).map(id=>byId.get(id)).filter(n=>n&&n.row<step),completedIds=completed.map(n=>n.id),currentId=completed.at(-1)?.id||'start';
 const selected=['briefing','support','retry'].includes(run?.phase)&&run?.current?.row===step?byId.get(run.current.id):null;
 const choices=run?.phase==='map'?getChoices(run):[],frontier=selected?[selected]:choices;
 const availableIds=run?.victoryPending||run?.flightReward&&!run.flightReward.claimed||!cardRewardResolved(run)?[]:choices.map(n=>n.id);
 const pathEdges=completed.map((n,i)=>[i?completed[i-1].id:'start',n.id]),reachableIds=new Set(),reachableEdges=[],edgeKeys=new Set(),visited=new Set();
 const addEdge=(from,to)=>{const key=from+'>'+to;if(!edgeKeys.has(key)){edgeKeys.add(key);reachableEdges.push([from,to]);}};
 const lastElite=completed.filter(n=>n.type!=='support').at(-1)?.elite===true;
 function visit(n,wasElite){
  const key=n.id+':'+Number(wasElite);if(visited.has(key)||wasElite&&n.elite)return;visited.add(key);reachableIds.add(n.id);
  const elite=n.type==='support'?wasElite:n.elite===true;
  for(const id of n.nextIds||[]){const next=byId.get(id);if(!next||next.row!==n.row+1||elite&&next.elite)continue;addEdge(n.id,next.id);visit(next,elite);}
 }
 for(const n of frontier){if(lastElite&&n.elite)continue;addEdge(currentId,n.id);visit(n,lastElite);}
 return{currentId,selectedId:selected?.id||null,availableIds,reachableIds:[...reachableIds],completedIds,pathEdges,reachableEdges};
}
export function selectNode(run,nodeId){if(run?.victoryPending||run?.flightReward&&!run.flightReward.claimed||!cardRewardResolved(run))return false;const n=getChoices(run).find(n=>n.id===nodeId);if(!n)return false;if(n.type!=='support'&&!run.isTutorial)n.bonusId=getRouteBonus(run,n)?.id??null;run.path=run.path.filter(id=>nodes(run).some(p=>p.id===id&&p.row<run.step));run.path.push(n.id);if(n.type!=='support')n.flightNumber=run.path.map(id=>nodes(run).find(p=>p.id===id)).filter(p=>p.type!=='support').length;run.current=n;run.lastEvent=null;run.phase=n.type==='support'?'support':'briefing';if(isCardRun(run)&&n.kind==='camp')ensureCardRest(run);return true;}
function nextStop(run){run.step++;run.current=null;run.phase=run.step>=run.map.length?'ended':'map';}
function reattempt(run){return run.phase==='briefing'&&run.current&&run.lastAttempt?.nodeId===run.current.id&&run.lastAttempt.success!==true;}
function canPrepareAtCheckpoint(run){const starter=run?.mapIndex===0&&run?.step===0&&run?.phase==='map'&&!run.path?.length;return!!run&&(run.testMode===true||run.restReady===true||starter)&&!run.attemptActive&&!run.banked&&run.lives>0&&['support','map','briefing'].includes(run.phase)&&!reattempt(run);}
export function setCollectorPreference(run,id){if(!run||run.attemptActive||run.banked||run.lives<=0||!['map','briefing','support'].includes(run.phase)||!learnedCollectorPreferences(run).some(p=>p.id===id))return false;run.collectorPreference=id;return true;}
export function canChangeCompanion(run){return !!run&&!run.companionSettled&&run.mapIndex===0&&run.step===0&&run.phase==='map'&&!run.path?.length&&!run.attemptActive&&!run.banked&&run.lives>0;}
export function getArtifactCapacity(){return Object.keys(ARTIFACTS).length;}
export function getNextArtifactSlotSkill(){return null;}
export function getCompanionCapacity(){return 1;}
export function setCompanions(run,ids){
 if(!canChangeCompanion(run)||!Array.isArray(ids)||ids.length!==1||!ROLES.includes(ids[0])||!getCompanionUnlock(ids[0]).selectable)return false;
 run.companionSettled=true;
 run.companions=[ids[0]];run.companionRole=ids[0];return true;
}
export function beginFlightAttempt(run){
 if(!run||run.phase!=='briefing'||run.attemptActive||run.banked||run.lives<=0||!run.current||run.current.type==='support')return false;
 if(isCardRun(run)&&run.cardCruisingSpeedNext!==undefined){run.cardCruisingSpeed=cleanCardCruisingSpeed(run.cardCruisingSpeedNext);delete run.cardCruisingSpeedNext;}
 cleanRunCompanion(run);
 delete run.clearRewardReceipt;
 run.restReady=false;
 run.attemptEntry={
  step:run.step,nodeId:run.current.id,bonusId:run.current.bonusId??null,
  flightPact:run.nextFlightPact??null,flightBoon:run.nextFlightBoon??null,flightBoons:activePassageBoons(run),eventFavors:activeEventFavors(run),started:false,
  flame:run.flame,restGlowCapacity:getRestGlowBonus(run),
  condensedGlow:run.condensedGlow,practiceCondensedGlow:run.practiceCondensedGlow,practiceLives:run.lives,practiceMaxLives:run.maxLives,skillPaid:{...run.skillPaid},condensedRemainder:run.condensedRemainder,
  keptLightDividend:!run.isTutorial&&getFlightClearReward(run.current)?getKeptLightDividend(run.condensedGlow,run.skills['afterglow-anchor']):0,
  companions:[...run.companions],skills:{...run.skills},artifacts:[...run.artifacts],
  artifactCharges:{...(run.artifactCharges||{}),...getArtifactCharges(run)},
  ...(isCardRun(run)?{mountedCards:copy(run.mountedCards),cardCarriedStored:count(run.condensedGlow),cardPackingRemainder:count(run.cardPackingRemainder,3),cardGrowUses:getCardGrowthUses(run),cardGrowCapacity:getCardGrowthBonus(run)}:{})
 };
 delete run.nextFlightPact;delete run.nextFlightBoon;delete run.eventFavors;
 run.attemptActive=true;run.stats.attempts++;
 return true;
}
function restoreEntry(run){const e=run.attemptEntry;if(e&&e.step===run.step&&e.nodeId===run.current?.id){run.restGlowCapacity=getRestGlowBonus(e);if(isCardRun(run)){run.cardGrowUses=e.cardGrowUses??getCardGrowthUses(run);run.cardGrowCapacity=e.cardGrowCapacity??getCardGrowthBonus(run);}run.flame=clamp(e.flame,0,getGlowCapacity({...run,skills:e.skills}));run.condensedGlow=e.condensedGlow;if(run.isTutorial){run.practiceCondensedGlow=count(e.practiceCondensedGlow);run.lives=finite(e.practiceLives,run.lives);run.maxLives=finite(e.practiceMaxLives,run.maxLives);run.skillPaid={...e.skillPaid};}run.condensedRemainder=e.condensedRemainder;run.companions=normalizeCompanionFleet(e.companions,run.companionRole);run.companionRole=run.companions[0];run.skills={...e.skills};delete run.skills['main-bond'];run.artifacts=[...e.artifacts];run.artifactCharges={...(e.artifactCharges||getArtifactCharges(run))};}run.attemptActive=false;run.attemptEntry=null;run.restReady=false;}
export function markFlightAttemptStarted(run, engine = null) {
 if (!run?.attemptActive || !run.attemptEntry || run.attemptEntry.started) return false;
 if (engine && (engine.options?.preview || engine.options?.practice || engine.dream?.mode === 'record' || engine.dream?.phase === 'recording')) return false;
 if (isCardRun(run) && engine && !pausedCardFlight(run, engine)) return false;
 run.attemptEntry.started = true;
 if (isCardRun(run)) {
  const grants = consumeCardUseDoublers(run);
  if (grants.length) {
   run.attemptEntry.cardUseDoublings = grants;
   run.attemptEntry.mountedCards = copy(run.mountedCards);
   if (engine) engine.reconcileCardLoadout({ modifiers: getRunModifiers(run), condensedGlow: run.condensedGlow, flightEntry: true });
  }
 }
 return true;
}
function reopenSurveyFork(run,preparation){
 if(!preparation)return;
 const graph=nodes(run),source=graph.find(node=>node.id===preparation.sourceNodeId);
 if(source?.kind==='event')source.nextIds=(preparation.originalNextIds||[]).filter(id=>graph.some(n=>n.id===id&&n.row===source.row+1));
}
function interrupt(run){
 const entry=run.attemptEntry;
 if(entry&&!entry.started&&entry.flightPact)run.nextFlightPact=entry.flightPact;
 if(entry?.step===run.step&&entry.nodeId===run.current?.id&&!entry.started&&entry.flightBoon)run.nextFlightBoon=entry.flightBoon;
 if(entry&&!entry.started&&entry.eventFavors?.length)run.eventFavors=[...entry.eventFavors];
 if(entry?.started){reopenSurveyFork(run,run.routePreparation);delete run.routePreparation;delete run.pilgrimVow;delete run.treasurePact;}
 restoreEntry(run);
 run.lastAttempt={success:false,interrupted:true,nodeId:run.current?.id,livesLost:0,livesRemaining:run.lives};
 run.phase='briefing';
}
export function retryFlight(run){if(!run||run.phase!=='retry'||run.lives<=0||!run.current)return false;run.phase='briefing';run.restReady=false;return true;}
function queue(run,amount,kind,nodeId=run.current?.id){amount=count(amount);if(!amount||run.isTutorial)return;run.pendingCondensedGlow=count(run.pendingCondensedGlow)+amount;run.pendingRewards.push({amount,kind,nodeId});}
function resolvePhysicalCardConsumers(run){
 const devourerSacrifices=[],emberFeederSacrifices=[];
 if(!isCardRun(run))return {devourerSacrifices,emberFeederSacrifices};
 for(let slot=0;slot<run.mountedCards.length;slot++){
  const source=run.mountedCards[slot],target=run.mountedCards[slot+1];
  if(source?.cardId==='ember-feeder'){
   const targets=getEmberFeederTargets(run.mountedCards,slot);
   if(targets.length!==2)continue;
   const sacrifice={sourceInstanceId:source.instanceId,sourceCardId:source.cardId,slot,capacity:1,
    totalCapacity:getCardFeederCapacity(source)+1,
    targets:targets.map(({card,slot:targetSlot})=>({instanceId:card.instanceId,cardId:card.cardId,name:SKILL_CARDS[card.cardId].name,slot:targetSlot}))};
   const consumed=new Set(sacrifice.targets.map(card=>card.instanceId));
   for(const {slot:targetSlot} of targets)run.mountedCards[targetSlot]=null;
   run.reserveCards=run.reserveCards.filter(card=>!consumed.has(card.instanceId));
   source.fedCapacity=sacrifice.totalCapacity;
   emberFeederSacrifices.push(sacrifice);recordCardEvent(run,'ember-feeder',sacrifice);
   continue;
  }
  if(run.lives>=getLifeCapacity(run))continue;
  if(source?.cardId!=='devourer'||SKILL_CARDS[target?.cardId]?.rarity!=='rare')continue;
  const sacrifice={sourceInstanceId:source.instanceId,targetInstanceId:target.instanceId,cardId:target.cardId,slot:slot+1,hearts:1};
  run.mountedCards[slot+1]=null;run.reserveCards=run.reserveCards.filter(card=>card.instanceId!==target.instanceId);
  run.lives++;devourerSacrifices.push(sacrifice);recordCardEvent(run,'devourer',sacrifice);
 }
 return {devourerSacrifices,emberFeederSacrifices};
}
export function getRecoveryRules(run={}){const s=run.skills||{};return{rate:.5+.05*rank(s,'main-recovery')+.05*rank(s,'main-recovery-deep'),rescue:rank(s,'main-recovery-rescue')?.1:0,challenge:rank(s,'main-recovery-challenge')?.1:0};}
// Item availability never depends on profile discovery or ascension. Only
// incompatible companions, duplicate effects and capped benefits are filtered.
export function artifactFitsRun(run,id){
 const roles=normalizeCompanionFleet(run?.companions,run?.companionRole);
 const companion={'wayfinder-seed':'collector','iron-petal':'protector','storm-knot':'swift','hollow-bell':'leveler'}[id];
 if(companion)return roles.includes(companion);
 if(EVOLVING_ARTIFACTS.includes(id)&&(run?.artifacts||[]).some(held=>EVOLVING_ARTIFACTS.includes(held)&&held!==id))return false;
 if(id==='quiet-cinder')return getRunModifiers({...run,artifacts:(run?.artifacts||[]).filter(held=>held!==id)}).liftCostPoints>1;
 return true;
}
export function availableFlightArtifacts(run,node){
 if(!node||!(node.elite||node.boss)||node.boss&&(node.mapIndex??run.mapIndex)===2&&!run.isTutorial)return [];
 const held=new Set(run.artifacts||[]),seen=new Set(run.seenArtifacts||[]);
 const pool=(node.boss?[...BOSS_ARTIFACTS]:Object.keys(ARTIFACTS)).filter(id=>!held.has(id)&&artifactFitsRun(run,id));
 const unseen=pool.filter(id=>!seen.has(id));return unseen.length>=2?unseen:pool;
}
function makeFlightReward(run,source='flight'){
 const n=run.current,permanent=false;
 if(!n.elite&&!n.boss||n.boss&&run.mapIndex===2&&!run.isTutorial)return null;
 const random=rng(`${run.seed}:${n.id}:accumulating-artifacts`);
 const pool=availableFlightArtifacts(run,n);
 const unseen=permanent?pool.filter(id=>!(run.seenArtifacts||[]).includes(id)):pool;
 const candidates=unseen.length>=2?unseen:pool;
 const shuffled=shuffle(candidates,random),themed=shuffled.filter(id=>ARTIFACTS[id].tags.includes(n.rewardTheme));
 // Anchor one guardian choice in the route theme. Keep the other open to
 // unrelated strategies, including relics that don't carry this theme.
 const offers=n.boss?[...new Set([...themed.slice(0,1),...shuffled])].slice(0,2):[];
 if(!n.boss)for(let choice=0;choice<2;choice++){
  const remaining=shuffled.filter(id=>!offers.includes(id));if(!remaining.length)break;
  const roll=random(),rarity=roll<.10?'boss':roll<.35?'rare':'common';
  const matching=remaining.filter(id=>ARTIFACTS[id].rarity===rarity);
  const pool=matching.length?matching:remaining,themedPool=pool.filter(id=>ARTIFACTS[id].tags.includes(n.rewardTheme));
  const options=themedPool.length&&random()<.5?themedPool:pool;
  offers.push(options[Math.floor(random()*options.length)]);
 }
 run.seenArtifacts=[...new Set([...(run.seenArtifacts||[]),...offers])];
 return {nodeId:n.id,source,sourceName:permanent?'Guardian unlock':n.boss?'Guardian reward':'Elite reward',offers,permanent,claimed:!offers.length,collectionComplete:permanent&&!offers.length,rewardTheme:n.rewardTheme};
}
export function artifactSynergy(run,id){
 const s=run?.skills||{},roles=normalizeCompanionFleet(run?.companions,run?.companionRole),held=new Set(run?.artifacts||[]);
 if(id==='path-prism')return 'Crystal caves double its Luminance bonus.';
 if(id==='wayward-seed')return 'After Map 1: choose more fuel or a light reveal.';
 if(id==='hearth-bloom')return 'Body pickup chains sustain flight. Collector deliveries break the chain.';
 if(id==='lantern-bloom')return held.has('sunspool')?'Body chain → reveal → free Lift (Sunspool cap 4).':'Body chain → reveal. Seek Sunspool for free Lift.';
 // Preview a deliberate trigger sequence before committing the reward slot.
 if(id==='overflow-coil')return held.has('dawn-loom')?'Combo: overflow → recovery → Dawn Loom light':'Plan: overfill while a companion recovers. Seek Dawn Loom.';
 if(id==='dawn-loom'){
  if(held.has('dreamcatcher')||held.has('dream-sovereign'))return 'Collect fuel during a Dream to recharge your companion and light the route.';
  return 'Overflow Coil or Sunheart Engine recharges your companion when fuel overflows, lighting the route.';
 }
 if(id==='sunspool')return held.has('dawn-loom')||held.has('sunheart-engine')||rank(s,'main-dawnburst')||rank(s,'main-echo-sight')?'Combo: collect in temporary light → free Lift (max 4)':'Plan: collect during Edging Pulse. Seek Dawn Loom.';
 if(id==='echo-bell')return 'Plan: companion action → BODY Spark pickup within 8s (max 5).';

 if(id==='sunheart-engine')return held.has('sunspool')?'Overflow light primes free Lift':'Surplus fuel powers recovery and vision';
 if(id==='dream-sovereign')return rank(s,'main-dream')?'Dream pickups feed waking free Lift':'Learn Dream to awaken its full power';
 if(id==='hollow-covenant')return rank(s,'main-kindled-touch')?'Companion work strengthens your direct fuel':'Work and seed skimming sustain flight';
 if(id==='glass-lantern'&&held.has('overflow-coil'))return 'Larger natural pickups → surplus → companion recovery. Each pickup repays four Lifts of extra effort.';
 if(id==='dreamcatcher'&&held.has('dawn-loom'))return 'Dream recharge triggers Dawn Loom';
 if(id==='second-dawn'&&held.has('sunspool'))return 'Waking light primes Sunspool';
 if(['dreamcatcher','second-dawn'].includes(id)&&rank(s,'main-dream'))return 'Works with Dream';
 if(id==='echo-vessel')return 'Improves natural overflow yield';
 if(id==='wayfinder-seed'&&roles.includes('collector'))return 'Works with Collector';
 if(id==='iron-petal'&&roles.includes('protector'))return 'Works with Protector';
 if(id==='hollow-bell'&&roles.includes('leveler'))return 'Works with Space Timer';
 if(id==='storm-knot'&&roles.includes('swift'))return 'Works with Runner';
 if(id==='dawn-thread'&&rank(s,'main-echo-sight'))return 'Works with Echo Luminance';
 if(id==='moss-heart'&&rank(s,'main-kindled-touch'))return 'Works with Kindled Touch';
 if(id==='glass-lantern'&&(rank(s,'main-efficiency')||roles.includes('collector')))return 'Fuel pickups repay higher Lift effort';
 if(id==='night-gardener'&&rank(s,'main-drift-sense'))return 'Drift Sense helps skim Dark Sparks';
 return '';
}
// Fresh rewards share the same rarity payout as forging; never run through fuel
// or overflow multipliers. Only one offered artifact can be kept or melted.
export function getFlightRewardMeltValue(reward){
 return 0;
}
function grantArtifactMelt(run,amount){
 if(run.isTutorial)run.practiceCondensedGlow=count(run.practiceCondensedGlow)+amount;
 else{run.condensedGlow=count(run.condensedGlow)+amount;run.securedCondensedGlow=count(run.securedCondensedGlow)+amount;run.condensedEarned=count(run.condensedEarned)+amount;}
}
export function chooseFlightReward(state,id){
 const r=state?.run;if(r?.bossDefeated)secureBoss(state);const reward=r?.flightReward;
 if(!reward||reward.claimed||r.attemptActive||r.banked||!reward.offers.includes(id)||!ARTIFACTS[id])return false;
 if(reward.permanent){
  if(!r.testMode&&!state.profile.ownedArtifacts.includes(id))state.profile.ownedArtifacts.push(id);
  r.artifactDrop={id,permanent:!r.testMode,test:!!r.testMode,message:'Discovered in your permanent Collection.'};r.lastFlight.artifactDrop=copy(r.artifactDrop);
 }else{if(r.artifacts.includes(id))return false;r.artifacts.push(id);prepareArtifactCharges(r,id,true);}
 reward.claimed=true;reward.chosen=id;return true;
}
export function acknowledgeVictory(state){const r=state?.run;if(!r||r.flightReward&&!r.flightReward.claimed||!cardRewardResolved(r))return false;r.victoryPending=false;return true;}
export function finishFlight(run,result){
 if(!run||run.phase!=='briefing'||!run.attemptActive||!run.current||typeof result?.success!=='boolean')return false;
 const n=run.current,attempt=run.attemptEntry;
 if(isCardRun(run)&&!run.isTutorial&&!result.dreamAttempt&&count(result.cardHeartsRestored)>0)
  run.lives=Math.min(getLifeCapacity(run),Math.max(run.lives,finite(attempt?.practiceLives,run.lives)+count(result.cardHeartsRestored)));
 if(isCardRun(run)&&!result.dreamAttempt)run.cardTwinWickUnlocked ||= result.cardTwinWickUnlocked===true;
 const consumedCards=[...(attempt?.cardUseDoublings||[]).map(grant=>grant.sourceInstanceId),...commitCardCharges(run,result.cardCharges)];
 if (isCardRun(run)) {
  recordCardEvent(run, 'attempt', {
   success: result.success,
   elite: n.elite,
   boss: n.boss,
   bodyPickups: count(result.bodyPickups ?? result.bodyFuelCollected),
   collectorPickups: count(result.collectorPickups),
   cardExecutions: count(result.cardExecutions),
   consumedCards,
   bankTime: Number.isFinite(result.bankTime) ? result.bankTime : null,
   routeStyle: n.routeStyle,
   flightSeconds: count(result.stats?.flightSeconds),
   lifts: count(result.stats?.flaps),
  });
 }
 const vow=resolvePilgrimVow(run.pilgrimVow,result),preparation=run.routePreparation;
 const wager=run.treasurePact==='wager'?settleTreasureWager(result,run):null;
 delete run.treasurePact;
 delete run.pilgrimVow;delete run.routePreparation;
 if(vow)run.lastVow=vow;
 if(!result.success)reopenSurveyFork(run,preparation);
 if(!result.success&&run.isTutorial){
  restoreEntry(run);run.stats.deaths++;run.success=false;run.victoryPending=false;run.deathPending=false;
  run.lastAttempt={success:false,nodeId:n.id,nodeName:n.name,livesLost:0,livesRemaining:run.lives,practice:true};run.phase='retry';
  return true;
 }
 if(!result.success){
  const fatal=result.deathPosition;
  if(fatal&&fatal.nodeId===n.id&&fatal.seed===`${run.seed}-${n.id}`&&Number.isFinite(fatal.x)&&Number.isFinite(fatal.y)
    &&fatal.x>=0&&fatal.x<=1&&fatal.y>=0&&fatal.y<=1)run.lastFatal={nodeId:n.id,seed:fatal.seed,x:fatal.x,y:fatal.y};
  restoreEntry(run);run.lives=Math.max(0,run.lives-1);run.stats.deaths++;run.success=false;run.victoryPending=false;
  run.lastAttempt={success:false,nodeId:n.id,nodeName:n.name,livesLost:1,livesRemaining:run.lives};run.deathPending=true;
  if(wager)run.lastAttempt.treasureWager=wager;
  if(vow)run.lastAttempt.vow=vow;
  run.path=run.path.filter(id=>id!==n.id);run.current=null;run.phase=run.lives?'map':'ended';
  return true;
 }
 if(run.isTutorial)run.practiceTopics=[...new Set([...(run.practiceTopics||[]),...(result.practiceTopics||[]).filter(id=>typeof id==='string')])];
 run.deathPending=false;run.attemptActive=false;run.attemptEntry=null;run.lastAttempt={success:true,nodeId:n.id,livesLost:0,livesRemaining:run.lives};
 const {devourerSacrifices,emberFeederSacrifices}=result.dreamAttempt
  ? {devourerSacrifices:[],emberFeederSacrifices:[]} : resolvePhysicalCardConsumers(run);
 run.lastAttempt.livesRemaining=run.lives;
 const consumedArtifacts=commitArtifactCharges(run,result.artifactCharges);
 let max=getGlowCapacity(run);const remaining=clamp(finite(result.flame,run.flame),0,max),recovery=getRecoveryRules(run);
 const pickupCondensedGlow=count(result.condensedGlow,getFlightPackingLimit(run.skills)),completionBonus=getFlightClearReward(n,run);
 const exitPacking=packExitReserve(remaining,{rules:getRunModifiers(run).condensationRules,
  remainder:finite(result.condensedRemainder,run.condensedRemainder)});
 const packingModifiers=getCardModifiers({...run,mountedCards:attempt?.mountedCards||run.mountedCards});
 const cardPackingEligible=!result.dreamAttempt?count(result.cardPackingEligible??pickupCondensedGlow,pickupCondensedGlow)+exitPacking.amount:0;
 const packingQuote=getCardPackingBonus(cardPackingEligible,packingModifiers.cardPackingSources,attempt?.cardPackingRemainder??run.cardPackingRemainder);
 const livePacking=isCardRun(run)&&result.cardPackingLedger===1;
 const cardPackingBonus=isCardRun(run)?livePacking?count(result.cardPackingBonus,Math.ceil(cardPackingEligible*CARD_ECONOMY.maxPackingWeight/4)):packingQuote.amount:0;
 if(isCardRun(run))run.cardPackingRemainder=livePacking?count(result.cardPackingRemainder,3):packingQuote.remainder;
 const keptLightDividend=completionBonus&&!run.isTutorial?count(attempt?.keptLightDividend,10):0;
 const storageBonus=completionBonus&&!run.isTutorial?count(result.storageBonus,run.skills['packing-deep-cache']?4:run.skills['packing-hand-seal']?2:0):0;
 const resonanceStored=!run.isTutorial&&(rank(run.skills,'main-resonant-bounty')||getCardModifiers(run).cardHarvestStoredPerWave>0||livePacking)?count(result.resonanceStored):0;
 spendPreparationClear(run,attempt);
 const routeBonus=awardRouteBonus(run,n,attempt,result,completionBonus,pickupCondensedGlow,!!(vow||wager));
 max=getGlowCapacity(run);
 const challengeComplete=attempt?.bonusId?!!routeBonus:result.challengeComplete===true;
 const rate=recovery.rate+(remaining<max*.2?recovery.rescue:0)+(challengeComplete?recovery.challenge:0),amount=max*rate+10*treasureRank(run,'wick');
 run.flame=energy(Math.min(max,amount));
 run.nextFlightBurden=false;run.nextFlightBlessing=false;
 run.stats.flights++;run.mapFlights++;run.stats.collected+=count(result.collected);run.stats.elites+=n.elite?1:0;
 if(challengeComplete)run.stats.challenges++;
 if(run.isTutorial)run.practiceCondensedGlow+=pickupCondensedGlow+exitPacking.amount+completionBonus;
 else{queue(run,completionBonus,'flight-clear');queue(run,pickupCondensedGlow,'flight');queue(run,exitPacking.amount,'exit-packing');queue(run,cardPackingBonus,'card-packing');if(routeBonus?.amount)queue(run,routeBonus.amount,'route-bonus');}
 run.condensedRemainder=exitPacking.remainder;
 run.condensedEarned=count(run.condensedEarned)+pickupCondensedGlow+exitPacking.amount+cardPackingBonus+completionBonus+(routeBonus?.amount||0);
 run.lastFlight={success:true,nodeId:n.id,mapIndex:run.mapIndex,difficulty:run.difficulty,flightNumber:n.flightNumber,terrain:n.terrain,elite:n.elite,boss:n.boss===true,completionBonus,pickupCondensedGlow,routeBonus,challengeBonus:0,challengeComplete,securedCondensedGlow:0,collected:count(result.collected),flame:remaining,pickupOverflow:Math.max(0,finite(result.pickupOverflow)),consumedArtifacts,recovery:{amount,rate,before:remaining,after:run.flame,overflow:0,stored:0}};
 if(keptLightDividend){
  queue(run,keptLightDividend,'kept-light');
  run.condensedEarned+=keptLightDividend;
  run.lastFlight.keptLightDividend=keptLightDividend;
 }
 if(storageBonus){
  queue(run,storageBonus,'storage-bonus');
  run.condensedEarned+=storageBonus;
  run.lastFlight.storageBonus=storageBonus;
 }
 if(resonanceStored){
  queue(run,resonanceStored,'resonance');
  run.condensedEarned+=resonanceStored;
 }
 run.lastFlight.resonanceStored=resonanceStored;
 if(vow){run.lastFlight.vow=vow;if(vow.reward){if(run.isTutorial)run.practiceCondensedGlow+=vow.reward;else queue(run,vow.reward,'pilgrim-vow');run.condensedEarned+=vow.reward;}}
 if(wager){
  run.lastFlight.treasureWager=wager;
  if(wager.reward){
   if(run.isTutorial)run.practiceCondensedGlow+=wager.reward;
   else queue(run,wager.reward,'treasure-wager');
   run.condensedEarned+=wager.reward;
  }
 }
 run.lastFlight.exitPacking=exitPacking;
 if(devourerSacrifices.length){run.lastFlight.devourerSacrifices=devourerSacrifices;consumedCards.push(...devourerSacrifices.map(sacrifice=>sacrifice.targetInstanceId));}
 if(emberFeederSacrifices.length){run.lastFlight.emberFeederSacrifices=emberFeederSacrifices;consumedCards.push(...emberFeederSacrifices.flatMap(sacrifice=>sacrifice.targets.map(target=>target.instanceId)));}
 if(attempt?.cardUseDoublings?.length)run.lastFlight.cardUseDoublings=copy(attempt.cardUseDoublings);
 if(isCardRun(run)){
  run.lastFlight.cardPackingBonus=cardPackingBonus;
  run.lastFlight.cardPackingEligible=cardPackingEligible;
  run.lastFlight.cardPackingRemainder=run.cardPackingRemainder;
  recordCardEvent(run,'packing',{base:cardPackingEligible,bonus:cardPackingBonus,sources:packingModifiers.cardPackingSources,remainder:run.cardPackingRemainder});
 }
 run.lastFlight.recovery.before=0;
 const pactIncome=pactBonus(attempt?.flightPact,result,pickupCondensedGlow+exitPacking.amount);
 if(pactIncome){queue(run,pactIncome,'flight-pact');run.condensedEarned+=pactIncome;run.lastFlight.pactBonus=pactIncome;run.lastFlight.flightPact=attempt.flightPact;}
 const chestIncome=treasureClearDividend(run,result);
 if(chestIncome.amount){
  if(run.isTutorial)run.practiceCondensedGlow+=chestIncome.amount;
  else queue(run,chestIncome.amount,'chest-dividend');
  run.condensedEarned+=chestIncome.amount;
  run.lastFlight.chestIncome={...chestIncome,message:`${chestIncome.sources.join(' + ')} · +${chestIncome.amount} Stored Sparks`};
 }
 if(wager?.gift)grantTreasureGift(run,wager.gift);
 if (isCardRun(run)) {
  // Resolve the genuine winning hand after flight charges, before its trophy
  // enters the reserve or any post-clear equipment change becomes available.
  const clearKey=JSON.stringify([run.id,run.mapIndex,n.id]);
  if(!result.dreamAttempt&&!run.cardClearReceipts.some(receipt=>receipt.key===clearKey)){
   const hand=getMountedCards(run).filter(Boolean),runtime=createCardExecution(run.mountedCards);
   const row=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.clear,carriedStored:count(attempt?.cardCarriedStored??attempt?.condensedGlow),cruisingSpeedRoom:6-cleanCardCruisingSpeed(run.cardCruisingSpeedUnlocked)});
   const sources=Object.freeze(hand.map(card=>Object.freeze({instanceId:card.instanceId,cardId:card.cardId,name:card.name,charges:card.charges??null})));
   const receipt=Object.freeze({...row,version:2,key:clearKey,runId:run.id,nodeId:n.id,mapIndex:run.mapIndex,sources,
    futureCapacity:run.testMode?0:row.futureCapacity,cruisingSpeed:run.testMode?0:Math.min(row.cruisingSpeed,6-cleanCardCruisingSpeed(run.cardCruisingSpeedUnlocked))});
   run.cardCruisingSpeedUnlocked=cleanCardCruisingSpeed(run.cardCruisingSpeedUnlocked+receipt.cruisingSpeed);
   run.cardClearReceipts.push(receipt);run.lastFlight.cardClearReceipt=receipt;
   if(receipt.stored){queue(run,receipt.stored,'card-clear');run.condensedEarned+=receipt.stored;}
   run.cardFutureCapacity=cleanCardFutureCapacity(run.cardFutureCapacity)+receipt.futureCapacity;
   consumedCards.push(...commitCardCharges(run,row.charges));
   recordCardEvent(run,'flight-clear',{stored:receipt.stored,futureCapacity:receipt.futureCapacity,cruisingSpeed:receipt.cruisingSpeed,charges:row.charges});
  }
  const rewardKey = `${run.mapIndex}:${n.id}`;
  if (!run.cardRewardedNodes.includes(rewardKey)) {
   run.cardRewardedNodes.push(rewardKey);
   run.cardDraft = { version: 1, id: JSON.stringify([run.id, run.mapIndex, n.id, 'card-draft-v1']),
    runId: run.id, mapIndex: run.mapIndex, nodeId: n.id, offers: drawSkillCardDraft(run, n),
    sourceName: n.boss ? 'Guardian card' : n.elite ? 'Elite card' : 'Round card',
    elite: !!n.elite, boss: !!n.boss, final: !!n.boss && run.mapIndex === 2, claimed: false };
   if (run.cardDraft.final) run.winningHand ??= getMountedCards(run).filter(Boolean);
  }
  // Earlier earned receipts remain untouched while the new draft is pending.
  if (!getCardDraft(run)) run.lastFlight.cardDrop = getCardReward(run);
  run.lastFlight.consumedCards = consumedCards;
  run.lastFlight.cardExecutions = count(result.cardExecutions);
  run.lastFlight.bodyPickups = count(result.bodyPickups ?? result.bodyFuelCollected);
  run.lastFlight.collectorPickups = count(result.collectorPickups);
  run.lastFlight.cardHand = getMountedCards(run);
 }
 run.flightReward=run.isTutorial&&n.type==='finale'?null:makeFlightReward(run);
 run.victoryPending=Boolean(run.flightReward)&&!run.flightReward.claimed;
 if(n.type==='finale'){run.step=run.map.length;run.bossDefeated=!run.isTutorial&&n.boss===true&&run.mapIndex===2;run.success=run.isTutorial||run.bossDefeated;run.phase=run.success?'ended':'map-clear';}else nextStop(run);
 if(!run.flightReward&&!n.boss&&!n.elite){
  if(!run.isTutorial)settleRunRewards(run);
  if(run.phase==='map')run.clearRewardReceipt=flightClearReceipt(run);
 }
 return true;
}
function settleCardProgress(state,run){
 if(!isCardRun(run)||run.testMode||run.banked||state.profile.bankedRuns.includes(run.id))return;
 const profile=state.profile,seen=new Set(profile.cardProgressReceipts||[]);
 for(const receipt of run.cardClearReceipts||[]){
  const key=JSON.stringify([run.id,receipt.mapIndex,receipt.nodeId]);
  if(receipt.version!==2||receipt.runId!==run.id||receipt.key!==key||receipt.event?.kind!==CARD_ROW_EVENTS.clear||seen.has(key))continue;
  profile.cardFutureCapacity=cleanCardFutureCapacity(profile.cardFutureCapacity)+cleanCardFutureCapacity(receipt.futureCapacity);
  profile.cardCruisingSpeed=cleanCardCruisingSpeed(cleanCardCruisingSpeed(profile.cardCruisingSpeed)+cleanCardCruisingSpeed(receipt.cruisingSpeed));
  seen.add(key);
 }
 profile.cardProgressReceipts=[...seen];run.cardCruisingSpeedUnlocked=profile.cardCruisingSpeed;
 if(!run.attemptActive){run.cardCruisingSpeed=getCruisingSpeed(state);delete run.cardCruisingSpeedNext;}
}
function secureBoss(state){
 const r=state.run,p=state.profile;if(!r?.bossDefeated||!r.success||r.bossProgressSecured||r.isTutorial)return;
 const receipt=r.cardVictoryReceipt;
 if(isCardRun(r)&&!r.testMode&&!p.bankedRuns.includes(r.id)&&r.mapIndex===2&&
    receipt?.version===1&&receipt.runId===r.id&&receipt.mapIndex===2&&receipt.nodeId===r.current?.id&&
    r.current?.type==='finale'&&r.current.boss===true&&receipt.event?.kind===CARD_ROW_EVENTS.victory){
  p.cardFutureCapacity=cleanCardFutureCapacity(p.cardFutureCapacity)+cleanCardFutureCapacity(receipt.futureCapacity);
 }
 r.bossProgressSecured=true;if(!r.testMode)p.difficulty=Math.min(MAX_ASCENSION,Math.max(p.difficulty,r.difficulty+1));
}
function settleRunRewards(r){
 settleCardReward(r);
 const amount=count(r.pendingCondensedGlow),earned=r.pendingRewards.reduce((sum,reward)=>sum+(reward.kind==='respec'?0:count(reward.amount)),0);
 awardSettledScoreStores(r,r.pendingRewards,amount);
 r.condensedGlow=count(r.condensedGlow)+amount;r.securedCondensedGlow+=Math.min(amount,earned);
 for(const reward of r.pendingRewards)if(['flight','flight-clear','exit-packing','card-packing','card-clear','route-bonus','kept-light','storage-bonus','resonance','flight-pact','pilgrim-vow','treasure-wager','chest-dividend'].includes(reward.kind)&&r.lastFlight?.nodeId===reward.nodeId)r.lastFlight.securedCondensedGlow+=reward.amount;
 if(amount)r.lastCheckpointReward={amount,rewards:copy(r.pendingRewards)};
 r.pendingCondensedGlow=0;r.pendingRewards=[];
 return amount;
}
export function settleCheckpoint(state){
 const r=state?.run,p=state?.profile;if(!r||!p||r.isTutorial||r.banked||p.bankedRuns.includes(r.id))return 0;
 secureBoss(state);settleCardProgress(state,r);
 return settleRunRewards(r);
}
function flightClearReceipt(run){
 const flight=run.lastFlight;
 return {nodeId:flight.nodeId,mapIndex:flight.mapIndex,
  amount:count(flight.completionBonus)+count(flight.pickupCondensedGlow)+count(flight.exitPacking?.amount)+count(flight.cardPackingBonus)+count(flight.pactBonus)+count(flight.vow?.reward)+count(flight.treasureWager?.reward)+count(flight.routeBonus?.amount)+count(flight.chestIncome?.amount)+count(flight.keptLightDividend)+count(flight.storageBonus)+count(flight.resonanceStored)+count(flight.cardClearReceipt?.stored),
  cardPackingBonus:count(flight.cardPackingBonus),
  storageBonus:count(flight.storageBonus),
  resonanceStored:count(flight.resonanceStored),
  notes:[flight.vow?.message,flight.treasureWager?.message,flight.routeBonus?.message,flight.chestIncome?.message,flight.cardClearReceipt?.stored?`Cards on clear · +${flight.cardClearReceipt.stored} Stored Sparks`:null,flight.cardClearReceipt?.futureCapacity?`Growth Ring · +${flight.cardClearReceipt.futureCapacity} maximum Sparks permanently`:null,flight.cardClearReceipt?.cruisingSpeed?`Wind Feather · +${flight.cardClearReceipt.cruisingSpeed}% cruising speed unlocked (cap +6%)`:null,flight.cardPackingBonus?`Tight Packing · +${flight.cardPackingBonus} Stored Sparks`:null].filter(Boolean)};
}
function normalizeClearFlow(run){
 if(!run?.victoryPending||!run.lastFlight?.success||run.lastFlight.elite||run.lastFlight.boss||run.flightReward?.offers?.length)return;
 run.victoryPending=false;run.flightReward=null;
 if(run.phase==='map')run.clearRewardReceipt=flightClearReceipt(run);
}
export function takeClearRewardReceipt(run){
 if(!run||run.phase!=='map'||run.victoryPending||!run.clearRewardReceipt)return null;
 const receipt=copy(run.clearRewardReceipt);
 delete run.clearRewardReceipt;
 return receipt;
}
function canAdvanceMap(run) {
 return !!run && !run.isTutorial && run.phase==='map-clear' && !run.victoryPending &&cardRewardResolved(run)&&
   run.mapIndex<2 && run.lives>0 && !run.attemptActive;
}
function nextMapSeed(run) {
 return `${run.campaignSeed}|tier:${run.difficulty}|map:${run.mapIndex+1}`;
}
export function canChooseForecast(run) {
 return canAdvanceMap(run) && run.mapIndex===0 && !!(run.atlasEligible || run.testMode);
}
/** The checkpoint and committed route use the same seeded generator. */
export function previewAtlasMap(run) {
 if (!canChooseForecast(run)) return null;
 return makeMap(nextMapSeed(run),1,run.difficulty,isCardRun(run));
}
export function advanceMap(run,forecast='clear') {
 if (!canAdvanceMap(run)) return false;
 if (forecast!=='clear' && (!canChooseForecast(run) || !Object.hasOwn(ATLAS_FORECASTS,forecast))) return false;
 const seed=nextMapSeed(run), nextIndex=run.mapIndex+1;
 const nextMap=makeMap(seed,nextIndex,run.difficulty,isCardRun(run));
 if (forecast!=='clear') {
   for (const site of atlasBranches(nextMap,forecast)) site.atlasForecast=forecast;
 }
 run.mapHistory.push({mapIndex:run.mapIndex,mapName:run.mapName,flights:run.mapFlights,lives:run.lives,
   ...(run.atlasForecast ? {atlasForecast:run.atlasForecast} : {})});
 run.mapIndex=nextIndex;
 run.mapName=CAMPAIGN_MAP_NAMES[nextIndex];
 run.seed=seed;
 run.map=nextMap;
 if (forecast==='clear') delete run.atlasForecast;
 else run.atlasForecast=forecast;
 run.step=0; run.path=[]; run.current=null; run.mapFlights=0; run.phase='map';
 run.success=false; run.restReady=false; run.lastRest=null; run.attemptActive=false;
 run.attemptEntry=null; run.lastAttempt=null;
 return true;
}

export function previewGlowReward(run={},raw=0,{removeArtifact=null}={}){
 const max=getGlowCapacity(run),light=Math.max(0,finite(raw)),restored=Math.min(light,Math.max(0,max-finite(run.flame))),overflow=Math.max(0,light-restored);
 const source=removeArtifact?{...run,artifacts:(run.artifacts||[]).filter(id=>id!==removeArtifact)}:run;
 const wallet=runWallet(run),rules=getRunModifiers(source).condensationRules,converted=condenseGlow(overflow,{rules,wallet:wallet.condensedGlow,remainder:run.condensedRemainder||0});
 return{restored,overflow,condensedGlow:converted.amount,remainder:converted.remainder,multiplier:converted.multiplier};
}
export function grantGlowPickup(run,raw,kind='offering'){
 const reward=previewGlowReward(run,raw);run.flame=energy(Math.min(getGlowCapacity(run),run.flame+reward.restored));run.condensedRemainder=reward.remainder;
 if(run.isTutorial)run.practiceCondensedGlow+=reward.condensedGlow;else{run.condensedGlow=count(run.condensedGlow)+reward.condensedGlow;run.securedCondensedGlow=count(run.securedCondensedGlow)+reward.condensedGlow;}
 run.condensedEarned=count(run.condensedEarned)+reward.condensedGlow;
 awardScoreStores(run,reward.condensedGlow);
 run.lastGlowReward={...reward,kind};return reward;
}
export function getCondensationState(source){
 const v=source?.run&&!source.run.banked?source.run:source||{},wallet=runWallet(v),rules=getRunModifiers(v).condensationRules,converted=condenseGlow(0,{rules,wallet:wallet.condensedGlow});
 return{...rules,effectiveMultiplier:converted.multiplier,amount:wallet.condensedGlow,unlocked:true,advancedUnlocked:rank(v.skills,'main-afterglow')>0,practice:v.isTutorial===true};
}
export function bankRun(state){
  const r=state?.run,p=state?.profile;if(!r||!p||r.phase!=='ended'||r.victoryPending||r.banked||p.bankedRuns.includes(r.id)||!cardRewardResolved(r)||r.cardReward?.draftId&&!r.cardReward.uiAcknowledged)return false;
  if(r.testMode){if(r.attemptActive)restoreEntry(r);settleCheckpoint(state);r.banked=true;return true;}
  if(r.attemptActive)restoreEntry(r);if(r.isTutorial){if(r.success)p.tutorialComplete=true;r.banked=true;return true;}
  secureBoss(state);settleCheckpoint(state);
  freezeCompletedGameScore(r);
  p.stats.completedRuns++;p.stats.wins+=r.success?1:0;for(const k of ['flights','attempts','deaths'])p.stats[k]+=count(r.stats[k]);p.clearedFlights+=count(r.stats.flights);p.bankedRuns.push(r.id);p.bankedRuns=p.bankedRuns.slice(-128);r.banked=true;return true;
}

const choice=(id,title,description,effect)=>{if(effect.pickupGlow){const old=effect.pickupGlow,amount=Math.max(20,Math.round(old/20)*20);description=description.replace(`${old} Sparks`,`${amount} Sparks`);effect={...effect,pickupGlow:amount};}return {id,title,description,detail:description,effect};};
function eventNextFlights(run){const n=run.current,lastElite=previousElite(run);return(n?.nextIds||[]).map(id=>nodes(run).find(node=>node.id===id)).filter(node=>node&&node.row===n.row+1&&node.type!=='support'&&!(lastElite&&node.elite));}
function shrineBlessing(){return choice('shrine-blessing','Carry a shrine blessing','Companion recovery is 20% faster for three cleared flights. Failures do not spend it.',{eventFavor:'haste'});}
function inRefundBranch(id,root,seen=new Set()){
 if(seen.has(id))return false;seen.add(id);
 if(id===root||root==='main-efficiency'&&SKILLS[id]?.branch==='afterglow')return true;
 const parent=SKILLS[id]?.requires;
 return (Array.isArray(parent)?parent:parent?[parent]:[]).some(p=>inRefundBranch(p,root,seen));
}
function rawSupportChoices(run,profile=null){
 if(run?.phase!=='support')return[];const n=run.current;
 if(n.kind==='camp'){
  const growth=Math.min(REST_GLOW_TUNING.capacityStep,REST_GLOW_TUNING.capacityLimit-getRestGlowBonus(run)),hearts=Math.max(0,getLifeCapacity(run)-run.lives),fuel=Math.max(0,getGlowCapacity(run)-run.flame),recover=hearts>0||fuel>0;
  const offers=[
   {...choice('rest-recover','Recover','Restore every missing heart and refill Sparks.',{lives:hearts,flame:100,rest:'recover'}),disabled:!recover,...(!recover?{disabledReason:'Hearts and Sparks are already full.'}:{})},
   {...choice('rest-grow','Grow',growth?`Increase capacity by ${growth} Sparks permanently and refill. Hearts stay as they are. Up to 3 growths per run.`:'Maximum growth reached: 3 of 3 growths used.',{glowCapacity:growth,flame:100,rest:'grow'}),disabled:growth<=0,...(growth<=0?{disabledReason:'Maximum growth reached (3/3).'}:{})}
  ];
  if(!recover&&growth<=0)offers.push(choice('rest-continue','Continue','Prepare and leave Rest. Hearts, Sparks and capacity stay as they are.',{restContinue:true}));
  return offers;
 }
 const pact=pactOffers(run);if(pact)return pact;
 const contextual=contextualEventChoices(run,eventNextFlights(run));if(contextual)return contextual;
 const refunds=n.eventIndex===10?MAIN_WISP_BRANCHES.map(b=>({...b,refund:Object.keys(run.skillPaid||{}).filter(id=>id!==run.startingSkill&&inRefundBranch(id,b.root)).reduce((sum,id)=>sum+count(run.skillPaid[id]),0)})):[];
 return eventChoices(run,{refunds})||[];

}
function makeSupportChoices(run,profile=null){return rawSupportChoices(run,profile).map(c=>({...c,description:c.displayUnits?c.description:glowText(c.description,getGlowCapacity(run)),detail:c.displayUnits?c.detail:glowText(c.detail,getGlowCapacity(run)),...(c.effect.pickupGlow?{glowPreview:previewGlowReward(run,c.effect.pickupGlow,{removeArtifact:c.effect.sell})}:{})}));}
export function resolveSupport(run,index,profile=null){
 if(!run||run.phase!=='support'||!Number.isInteger(index)||index<0)return false;
 if(isCardRun(run)&&run.current.kind==='camp')return resolveCardCamp(run,index);
 const offers=getSupportChoices(run,profile),offer=offers[index],e=offer?.effect;if(!e||offer.disabled)return false;if((e.rest||e.restContinue)&&run.restVisits?.some(v=>v.key===`${run.mapIndex}:${run.current.id}`))return false;const wallet=runWallet(run),cost=count(e.condensedCost),restBefore=e.rest||e.restContinue?{lives:run.lives,flame:run.flame}:null;
 if(e.flightPact&&(!FLIGHT_PACTS[e.flightPact]||run.nextFlightPact))return false;
 if(e.pilgrimVow&&(run.pilgrimVow||!eventNextFlights(run).length))return false;
 if(e.routePreparation&&!eventNextFlights(run).some(node=>node.id===e.routePreparation.nodeId))return false;
 if(wallet.condensedGlow<cost||run.flame+Math.min(0,finite(e.flame))<0)return false;
 if(e.lives&&run.lives>=getLifeCapacity(run))return false;
 if(e.sell&&!canSellArtifact({run,profile},e.sell))return false;
 if(e.upgrade&&!canBuyCheckpointSkills({run}))return false;
 if(e.upgrade&&(getSkillCost(wallet,e.upgrade)===null||!run.testMode&&SKILLS[e.upgrade].requires&&!rank(run.skills,SKILLS[e.upgrade].requires)))return false;
 if(run.isTutorial)run.practiceCondensedGlow-=cost;else run.condensedGlow-=cost;
 if(e.practiceLoan){run.skills['proximity-awakening']=1;run.practiceLoan='proximity-awakening';}
 if(e.upgrade){if(run.testMode)for(const id of SKILLS[e.upgrade].excludes||[])forgetSkillBranch(run.skills,id,run.skillPaid);run.skills[e.upgrade]=rank(run.skills,e.upgrade)+1;(run.skillPaid??={})[e.upgrade]=(run.skillPaid[e.upgrade]||0)+cost;if(e.upgrade==='main-afterglow')run.condensationJustUnlocked=true;}
 if(e.chestRewardId){
  run.chestRewardHistory=[...new Set([...(run.chestRewardHistory||[]),...offers.map(choice=>choice.effect.chestRewardId).filter(Boolean)])];
  const capacity=getGlowCapacity(run);
  if(e.chestSkill){run.skills[e.chestSkill]=1;(run.skillPaid??={})[e.chestSkill]=0;}
  for(const id of e.chestArtifacts||[]){if(!run.artifacts.includes(id))run.artifacts.push(id);prepareArtifactCharges(run,id,true);}
  run.seenArtifacts=[...new Set([...(run.seenArtifacts||[]),...(e.chestArtifacts||[])])];
  run.flame+=Math.max(0,getGlowCapacity(run)-capacity);
 }
 if(e.treasureGift)grantTreasureGift(run,e.treasureGift);
 if(e.treasurePact)run.treasurePact=e.treasurePact;
 if(e.flightPact)run.nextFlightPact=e.flightPact;
 if(e.sell)sellArtifact({run,profile},e.sell);
 if(e.artifactReward||e.packedReward){const amount=e.packedReward||25;grantArtifactMelt(run,amount);if(e.packedReward&&!cost&&!e.sell&&!(e.flame<0)&&offer.art!=='trade')awardScoreStores(run,amount);}
 if(e.eventFavor)grantEventFavor(run,e.eventFavor);
 if(e.burden)run.nextFlightBurden=true;if(e.blessing)run.nextFlightBlessing=true;
 if(e.pilgrimVow){run.pilgrimVow=copy(e.pilgrimVow);run.lastEvent={title:'Vow accepted',message:`Clear your next attempt with ${e.pilgrimVow.target} body Spark pickups for ${e.pilgrimVow.reward} Stored Sparks. Dream pickups and Collector deliveries do not count. No extra penalty for missing it.`};}
 if(e.routePreparation){
  const source=nodes(run).find(node=>node.id===run.current.id)||run.current;
  run.routePreparation={...e.routePreparation,originalNextIds:[...source.nextIds]};
  source.nextIds=[e.routePreparation.nodeId];run.current.nextIds=[...source.nextIds];
  run.lastEvent={title:'Passage marked',message:`${e.routePreparation.name}: ${e.routePreparation.kind==='wind'?'drafts are 30% gentler':'light reaches 35 farther'} for the first attempt. Falling spends the preparation and reopens the fork.`};
 }
 if(e.respec){const belongs=id=>inRefundBranch(id,e.respec);let refund=0;for(const id of Object.keys(run.skills)){if(!belongs(id)||id===run.startingSkill)continue;refund+=count(run.skillPaid?.[id]);delete run.skills[id];if(run.skillPaid)delete run.skillPaid[id];}if(run.isTutorial)run.practiceCondensedGlow+=refund;else queue(run,refund,'respec');run.maxLives=getLifeCapacity(run);run.lives=Math.min(run.lives,run.maxLives);run.flame=Math.min(run.flame,getGlowCapacity(run));run.lastEvent={title:'Build reshaped',message:`${refund} Stored Sparks returned`};}
 if(e.glowCapacity)run.restGlowCapacity=getRestGlowBonus({restGlowCapacity:getRestGlowBonus(run)+e.glowCapacity});
 run.flame=e.flame>=100?getGlowCapacity(run):clamp(run.flame+finite(e.flame),0,getGlowCapacity(run));
 if(e.pickupGlow&&!e.sell)grantGlowPickup(run,e.pickupGlow,'offering');
 if(e.dice){const face=1+Math.floor(rng(`${run.seed}:${run.current.id}:dice`)()*6),prize=rollPrism(run,face,e.diceField);
 if(prize.favor)run.eventFavors=[...new Set([...(run.eventFavors||[]),prize.favor])];if(prize.packed){grantArtifactMelt(run,prize.packed);awardScoreStores(run,prize.packed);}if(prize.capacity)run.treasureCapacity=(run.treasureCapacity||0)+prize.capacity;if(prize.energy||prize.capacity)run.flame=getGlowCapacity(run);
 run.lastEvent={title:'Prism Dice',face,message:`Rolled ${face}: ${prize.message}`};}
 run.maxLives=getLifeCapacity(run);if(e.lives)run.lives=Math.min(run.maxLives,run.lives+e.lives);
 if(e.rest||e.restContinue){if(e.rest&&run.isTutorial)run.practiceTopics=[...new Set([...(run.practiceTopics||[]),'rest'])];if(e.rest&&run.isTutorial&&run.current.id==='practice-dream-rest')run.skills['main-dream']=1;run.lifeRestClaimed=e.rest==='recover';const key=`${run.mapIndex}:${run.current.id}`,boon=e.rest||'skip';(run.restVisits??=[]).push({key,mapIndex:run.mapIndex,row:run.step,nodeId:run.current.id,boon});run.restReady=true;run.lastRest={nodeId:run.current.id,row:run.step,mapIndex:run.mapIndex,boon,heartsRestored:Math.max(0,run.lives-restBefore.lives),sparksRestored:Math.max(0,run.flame-restBefore.flame)};}
 run.stats.events++;nextStop(run);return true;
}

export function isSkillRevealed(profile,id){const s=SKILLS[id];if(!s||s.retired)return false;if(profile?.testMode===true||rank(profile?.skills,id)>0)return true;if(s.branch==='afterglow'&&!rank(profile?.skills,'main-afterglow'))return false;const requires=Array.isArray(s.requires)?s.requires:s.requires?[s.requires]:[];return requires.every(parent=>rank(profile?.skills,parent)>0);}
function paidTraining(wallet,id){
 return id===wallet.startingSkill?0:rank(wallet.skills,id)*clamp((SKILLS[id]?.cost||80)/80,.5,1.5);
}
export function getTrainingRankCount(wallet={}){return Object.keys(wallet.skills||{}).reduce((sum,id)=>sum+paidTraining(wallet,id),0);}
// Learning a prerequisite helps its descendants. Other branches still bear the full training premium.
function relatedTraining(wallet,skill){
 const visited=new Set(),pending=[skill.id];
 let credit=0;
 while(pending.length){
  const id=pending.pop();
  if(visited.has(id))continue;
  visited.add(id);credit+=paidTraining(wallet,id);
  const requires=SKILLS[id]?.requires;
  if(requires)pending.push(...[requires].flat());
 }
 return Math.min(2.5,credit*.70);
}
export function getSkillPrice(wallet,id){
 const s=SKILLS[id];if(!s)return null;const r=rank(wallet?.skills,id);if(r>=s.maxRank)return null;
 if(['collector-fetch-large','main-dream-long','main-dream-deep'].includes(id))return s.cost;
 const base=s.prices?.[r]??Math.round(s.cost*1.5**r),growth=1+CONDENSED_TUNING.trainingGrowth*Math.max(0,getTrainingRankCount(wallet)-relatedTraining(wallet,s))**CONDENSED_TUNING.trainingExponent;
 return Math.ceil(base*growth/CONDENSED_TUNING.priceStep)*CONDENSED_TUNING.priceStep;
}
export function getSkillCost(wallet,id){return getSkillLockReason(wallet,id)?null:getSkillPrice(wallet,id);}
export function isStartingPrep(r){return !!r&&!r.isTutorial&&r.mapIndex===0&&r.step===0&&r.phase==='map'&&!r.path.length&&!r.attemptActive;}
export function canBuyCheckpointSkills(state){
 const r=state?.run;
 return !!r && !isCardRun(r) && !r.banked && r.lives>0 && r.phase!=='ended';
}
export function getAvailableUpgrades(state){if(!canBuyCheckpointSkills(state))return[];const w=getSkillWallet(state),branches=new Set(['main','proximity',...normalizeCompanionFleet(state.run.companions,state.run.companionRole),...(w.condensationUnlocked?['afterglow']:[])]);return Object.values(SKILLS).filter(s=>branches.has(s.branch)&&getSkillCost(w,s.id)!==null&&getSkillCost(w,s.id)<=w.condensedGlow).map(s=>s.id);}
function forgetSkillBranch(skills,id,paid={}){
  delete skills[id];delete paid[id];
  for(const child of Object.values(SKILLS)){
    const requires=Array.isArray(child.requires)?child.requires:[child.requires];
    if(requires.includes(id)&&skills[child.id])forgetSkillBranch(skills,child.id,paid);
  }
}
export function buyCheckpointSkill(state,id,expectedRank){
  if(!canBuyCheckpointSkills(state))return false;const r=state.run,wallet=runWallet(r),s=SKILLS[id],cost=getSkillCost(wallet,id);
  if(!s||cost===null||wallet.condensedGlow<cost||expectedRank!==undefined&&expectedRank!==rank(r.skills,id)+1)return false;
  if(ROLES.includes(s.branch)&&!r.companions.includes(s.branch))return false;
  const oldCapacity=getGlowCapacity(r);
  if(r.isTutorial)r.practiceCondensedGlow-=cost;
  else r.condensedGlow-=cost;
  if(r.testMode)for(const other of s.excludes||[])forgetSkillBranch(r.skills,other,r.skillPaid);
  r.skills[id]=rank(r.skills,id)+1;
  (r.skillPaid??={})[id]=(r.skillPaid[id]||0)+cost;
  if(id==='main-afterglow')r.condensationJustUnlocked=true;
  const capacity=getGlowCapacity(r);
  if(isStartingPrep(r))r.flame=capacity;
  else if(r.restReady&&['recover','grow'].includes(r.lastRest?.boon))r.flame+=Math.max(0,capacity-oldCapacity);
  r.flame=clamp(r.flame,0,capacity);
  r.maxLives=getLifeCapacity(r);
  if(r.restReady&&r.lifeRestClaimed)r.lives=r.maxLives;
  // Purchases made with banked Sparks persist when a flight is interrupted or lost.
  if(r.attemptActive&&r.attemptEntry){
    r.attemptEntry.skills={...r.skills};
    r.attemptEntry.condensedGlow=r.condensedGlow;
  }
  r.supportOffers=null;
  delete r.dreamPreset;
  return true;
}
function artifactService(state,selling=false){const r=state?.run;if(!state?.profile||!r||r.attemptActive||r.banked||['retry','map-clear','ended'].includes(r.phase)||reattempt(r))return false;return selling?r.phase==='support'||r.restReady===true:r.phase==='support'||canPrepareAtCheckpoint(r);}
export function equipArtifact(state,id){const r=state?.run;if(!r?.testMode||r.attemptActive||!ARTIFACTS[id]||r.artifacts.includes(id))return false;r.artifacts.push(id);prepareArtifactCharges(r,id,true);return true;}
export function getArtifactSalvageValue(id){return count(ARTIFACTS[id]?.sellValue);}
export function canSellArtifact(state,id){return !!(ARTIFACTS[id]&&state?.run?.restReady&&!state.run.attemptActive&&state.run.artifacts.includes(id));}
export function sellArtifact(state,id){
 if(!canSellArtifact(state,id))return false;
 const p=state.profile,r=state.run,value=getArtifactSalvageValue(id);
 // Forge payout is fixed currency, not a pickup: no Sparks fill or conversion multiplier.
 // Remove every ownership reference before granting so a repeated action cannot pay twice.
 r.artifacts=r.artifacts.filter(x=>x!==id);r.supportOffers=null;
 if(r.isTutorial)r.practiceCondensedGlow=count(r.practiceCondensedGlow)+value;else{r.condensedGlow=count(r.condensedGlow)+value;r.securedCondensedGlow=count(r.securedCondensedGlow)+value;r.condensedEarned=count(r.condensedEarned)+value;}
 delete r.artifactCharges?.[id];r.lastCheckpointReward={amount:value,kind:'artifact-forge',artifactId:id};return true;
}

export function getRunModifiers(run={}){const rank=skillProgress,companion=normalizeCompanionFleet(run.companions,run.companionRole)[0],s=Object.fromEntries(Object.entries(run.skills||{}).filter(([id])=>!ROLES.some(role=>id.startsWith(role+'-'))||id.startsWith(companion+'-'))),m={condensationRules:getCondensationRules(s),condensationBonus:0,overflowRecharge:0,workFuel:0,rechargeSight:0,litLift:0,dreamRecharge:0,secondDawn:0,nightGarden:0,dreamDuration:rank(s,'main-dream')?(rank(s,'main-dream-deep')?16:rank(s,'main-dream-long')?12:8):0,dreamWake:rank(s,'main-dream-wake')?4:3,dreamSight:rank(s,'main-dream-deep')>0,glowSense:rank(s,'main-glow-sense')>0,driftSense:rank(s,'main-drift-sense-3')?3:rank(s,'main-drift-sense-2')?2:rank(s,'main-drift-sense')?1:0,pickupReveal:rank(s,'main-dawnburst')>0,resonantHarvest:rank(s,'main-resonant-bounty')?3:rank(s,'main-resonant-purification')?2:rank(s,'main-resonant-harvest')?1:0,proximityUnlocked:rank(s,'proximity-awakening')>0,proximityShield:rank(s,'proximity-light-shield')>0,edgingGrace:rank(s,'proximity-grace')?2:1.25,edgingChargeRate:rank(s,'main-edging-attunement')?1.25:1,edgingDecayRate:rank(s,'main-edging-tension')?.5:1,edgingDuration:rank(s,'main-edging-lasting')?7:5,edgingRecovery:2,edgingRegen:rank(s,'main-edging-regeneration')>0,maxGlow:getGlowCapacity(run),richFuelBonus:8*rank(s,'main-cache-feast'),terminalFall:1+.08*rank(s,'main-deep-plummet'),speed:1+.08*rank(s,'main-speed')+.06*rank(s,'main-tailwind'),flap:1-.08*rank(s,'main-low-lift'),gravity:(1-.1*rank(s,'main-drift'))*(1+.12*rank(s,'main-plummet'))*(1+.06*rank(s,'main-deep-plummet')),flapCost:Math.max(.65,(1-.12*rank(s,'main-efficiency'))*(1-.10*rank(s,'main-lift'))*(1-.08*rank(s,'main-low-lift'))),lightRadius:145+35*rank(s,'main-sight')+45*rank(s,'main-horizon'),darkResistance:.4*rank(s,'main-dawn'),attract:1,wispCooldown:1,boostCooldown:1,boostDuration:1,reward:1,windSensitivity:1,cacheFuelBonus:4*rank(s,'main-kindling'),warmCore:false,steady:false,protectorCost:12*(1-.15*rank(s,'protector-cost')),protectorRecovery:7,protectorLayers:1+rank(s,'protector-layers'),levelerDuration:2.4+.5*rank(s,'leveler-duration'),levelerSteadiness:.2*rank(s,'leveler-steadiness'),levelerDive:rank(s,'leveler-dive')?1+.25*rank(s,'leveler-dive'):0,levelerRecovery:9,swiftDuration:1.25+.20*rank(s,'swift-duration'),swiftRecovery:7.5,swiftResistance:.72+.05*rank(s,'swift-resistance'),mainSeer:['main-echo-sight','main-echo-long','main-echo-range'].some(id=>rank(s,id)>0),seerRadius:230+50*rank(s,'main-echo-range'),seerDuration:2+rank(s,'main-echo-long'),seerRecovery:8,mainKindler:['main-kindled-touch','main-kindled-rich','main-purifying-touch'].some(id=>rank(s,id)>0),kindlerBonus:6+4*rank(s,'main-kindled-rich'),kindlerPurify:rank(s,'main-purifying-touch')>0};
  m.handSeal=rank(s,'packing-hand-seal')>0;
  m.spacetime=!run.isTutorial&&rank(s,'proximity-spacetime')>0;
  m.deepCache=rank(s,'packing-deep-cache')>0;
  if(rank(s,'collector-reach')){m.attract*=1+.35*rank(s,'collector-reach');m.wispCooldown*=1+.20*rank(s,'collector-reach');}
  else if(rank(s,'collector-recovery')){m.attract*=1-.20*rank(s,'collector-recovery');m.wispCooldown*=1-.50*rank(s,'collector-recovery');}
  if(rank(s,'protector-recovery')){m.protectorRecovery*=1-.28*rank(s,'protector-recovery');m.protectorCost*=1+.25*rank(s,'protector-recovery');}
  else if(rank(s,'protector-layers'))m.protectorCost*=1.35;
  if(rank(s,'leveler-steadiness')){m.levelerSteadiness=.65*rank(s,'leveler-steadiness');m.levelerDuration*=1-.15*rank(s,'leveler-steadiness');}
  else if(rank(s,'leveler-dive')){m.levelerDive=1.35;m.levelerDuration*=.75;}
  if(rank(s,'swift-recovery')){m.swiftRecovery*=1-.28*rank(s,'swift-recovery');m.swiftDuration*=1-.25*rank(s,'swift-recovery');}
  else if(rank(s,'swift-resistance')){m.swiftResistance=.72+.18*rank(s,'swift-resistance');m.swiftRecovery*=1+.25*rank(s,'swift-resistance');}
  m.glideRegenRank=rank(s,'main-glide-regen-2')?2:rank(s,'main-glide-regen');
  m.lastGlimmer=!run.isTutorial&&rank(s,'main-last-glimmer')&&run.lastFatal&&run.current&&run.lastFatal.nodeId===run.current.id
    &&run.lastFatal.seed===`${run.seed}-${run.current.id}`?{...run.lastFatal}:null;
  m.longFlash=Boolean(rank(s,'main-long-flash'));
  m.fourthBeatRank=rank(s,'main-fourth-beat-2')?2:rank(s,'main-fourth-beat');
  m.collectorFieldImpulse=rank(s,'collector-field-impulse')>0;
  m.collectorGuard=rank(s,'collector-last-orbit')>0;m.collectorGuardRepair=rank(s,'collector-guard-repair')?2:0;m.collectorPreference=collectorPreference(run);
  m.collectorFetchMass=rank(s,'collector-fetch-large')?3:2;
  m.nightmare=rank(s,'main-dream-deep')>0;
  m.collectorFlashFetch=rank(s,'collector-fetch-flash')>0;
  const spark=role=>rank(s,`${role}-attunement`)+rank(s,`${role}-mastery`);
  m.attract*=1+.12*spark('collector');m.protectorCost=Math.max(1,m.protectorCost-2*spark('protector'));
  m.levelerDuration+=.35*spark('leveler');m.swiftRecovery-=.75*spark('swift');
  m.collectorMinimum=0;m.collectorFuelBonus=0;m.protectorProtection=.4;m.purifyCooldown=10;m.purifyFuel=12;
  applyExpandedSkills(m,s,[companion]);
  m.burdenLifts=run.nextFlightBurden?12:0;if(run.nextFlightBlessing){m.wispCooldown*=.8;for(const key of ['protectorRecovery','levelerRecovery','swiftRecovery','seerRecovery'])m[key]*=.8;}
  if(run.routePreparation&&run.routePreparation.nodeId===run.current?.id){if(run.routePreparation.kind==='wind')m.windSensitivity*=ROUTE_PREPARATION.windMultiplier;else m.lightRadius+=ROUTE_PREPARATION.lightBonus;}
  const mounted=unique((run.artifacts||[]).slice(0,getArtifactCapacity(run)),x=>Object.hasOwn(ARTIFACTS,x));m.artifactIds=mounted;m.artifactCharges=getArtifactCharges(run);m.artifactEngineSources=Object.fromEntries(Object.entries({'overflow-coil':'overflowRecharge','echo-bell':'workFuel','dawn-loom':'rechargeSight',sunspool:'litLift'}).map(([engine,key])=>[engine,mounted.filter(id=>ARTIFACTS[id].modifiers[key]>0)]));
  for(const id of mounted){for(const[k,v]of Object.entries(ARTIFACTS[id].modifiers))if(['flapCost','flap','attract','protectorRecovery','swiftRecovery'].includes(k))m[k]*=v;else m[k]+=v;}if(mounted.includes('path-prism')&&run.current?.biomeId==='crystal')m.lightRadius+=12;m.windSensitivity=clamp(m.windSensitivity,.55,1.5);m.gravity=clamp(m.gravity,.65,1.5);m.darkResistance=clamp(m.darkResistance,0,.6);m.edgingChargeRate=clamp(m.edgingChargeRate,1,2);m.flap=clamp(m.flap,.8,1.2);m.flapCost=clamp(m.flapCost,.5,1.25);m.attract=clamp(m.attract,.65,2.5);m.swiftResistance=clamp(m.swiftResistance,0,.94);m.protectorLayers=clamp(m.protectorLayers,1,2);m.condensationRules.multiplier+=m.condensationBonus;m.packingLimit=getFlightPackingLimit(s);m.maxGlow=getGlowCapacity(run);m.liftCostPoints=Math.max(1,3-Number(rank(s,'main-efficiency')>0)-Number(rank(s,'main-lift')>0)-Number(mounted.includes('quiet-cinder'))-Number(mounted.includes('hollow-covenant'))+Number(mounted.includes('glass-lantern')));
  if(treasureRank(run,'farLens'))m.lightRadius*=LENS_SIGHT;
  if(treasureRank(run,'quickLens'))m.treasureRecoveryScale=LENS_RECOVERY;
  if(run.treasurePact==='sight')m.lightRadius*=1.35;
  if(run.treasurePact==='recharge')m.treasureRecoveryScale=(m.treasureRecoveryScale||1)*.7;
  m.eventFavors=run.attemptActive?run.attemptEntry?.eventFavors||[]:activeEventFavors(run);
  m.flightBoon=run.attemptActive?run.attemptEntry?.flightBoon??null:null;
  m.flightBoons=run.attemptActive?run.attemptEntry?.flightBoons||[]:activePassageBoons(run);
  const pact=activeFlightPact(run);
  if(pact?.sight)m.lightRadius*=pact.sight;
  if(pact?.reach)m.attract*=pact.reach;
  if(isCardRun(run))m.speed+=cleanCardCruisingSpeed(run.attemptActive?run.cardCruisingSpeed:run.cardCruisingSpeedNext??run.cardCruisingSpeed)/100;
  Object.assign(m,getCardModifiers(run));
  if(m.cardProximityUnlocked||m.cardProximitySources>0)m.proximityUnlocked=true;
  if(m.cardFieldImpulse)m.collectorFieldImpulse=true;
  if(m.cardCacheHandling)m.collectorFetchMass=Math.max(3,m.collectorFetchMass);
  if(m.cardFlashHandling)m.collectorFlashFetch=true;
  return m;
}

// The prologue has its own run wallet and entry checkpoints. Only learned
// tutorial preferences survive leaving it; campaign resources never cross.
export function shouldStartTutorial(state){return !!state?.profile&&!state.settings?.skipTutorial&&!state.profile.tutorialComplete;}
function createTutorial(profile){
 const r=createRun(profile,`practice-${freshSeed()}`);
 Object.assign(r,{isTutorial:true,tutorialEdition:2,mapIndex:0,mapName:'First Light · Six lessons',difficulty:1,
  skills:{'main-sight':1},artifacts:[],artifactCharges:{},companions:['collector'],companionRole:'collector',
  practiceCondensedGlow:0,condensedGlow:0,condensedRemainder:0,lives:2,maxLives:3,flame:100,unlockedCompanionDifficulty:1});
 const base={mapIndex:0,difficulty:1,elite:false,boss:false,bossId:null,...ROUTE_PROFILES.refuge,flightLengthScale:1,challengeId:'',challengeTarget:0,challengeBonus:0};
 const node=(row,id,type,kind,terrain,name,nextIds,extra={})=>({...base,row,id,type,kind,terrain,name,locationName:name,lane:1,duration:0,nextIds,...extra});
 r.map=[
  [node(0,'practice-glide','flight','normal','ruins','Lift & Sparks',['practice-chest'],{levelId:'ruins-aqueduct',tutorialLesson:'glide',duration:22})],
  [node(1,'practice-chest','support','treasure','ruins','A Borrowed Pulse',['practice-proximity'],{treasureKind:'vessel',practiceLoan:true})],
  [node(2,'practice-proximity','flight','normal','ruins','Follow the Bend',['practice-rest'],{levelId:'ruins-aqueduct',tutorialLesson:'proximity',duration:24})],
  [node(3,'practice-rest','support','camp','canopy','Rest & Recover',['practice-black-hole'])],
  [node(4,'practice-black-hole','flight','normal','canopy','Give Darkness Space',['practice-guardian'],{levelId:'canopy-oldgrowth',tutorialLesson:'black-hole',duration:24})],
  [node(5,'practice-guardian','finale','finale','ruins','Meet the Hollow Warden',[],{levelId:'ruins-aqueduct',tutorialLesson:'guardian',boss:true,bossId:'hollow-warden',duration:36})]
 ];return r;
}
export function startTutorial(state,{forNewGame=false,difficulty=1}={}){
 if(!state?.profile)return false;const old=state.run;
 if(old?.isTutorial&&old.phase!=='ended')return false;
 if(old?.isTutorial)bankRun(state);
 else{state.suspendedRun=old&&old.phase!=='ended'&&!old.banked?copy(old):null;if(state.suspendedRun?.attemptActive)interrupt(state.suspendedRun);}
 state.run=createTutorial(state.profile);
 if(forNewGame)state.run.tutorialContinuation={difficulty:Math.max(1,Math.floor(Number(difficulty)||1))};
 return true;
}
export function leaveTutorial(state,{remember=false}={}){
 if(!state?.run?.isTutorial)return false;const practice=state.run,completed=practice.success===true;
 if(practice.attemptActive)restoreEntry(practice);
 if(practice.phase!=='ended'){practice.phase='ended';practice.success=false;}
 bankRun(state);
 if(completed||remember){
  state.profile.tutorialComplete=true;
  for(const topic of remember?['lift','luminance','collector','collector-recovery','packed','rest','black-hole','edging']:(practice.practiceTopics||[]))markOnboardingSeen(state.profile,topic);
 }
 state.run=state.suspendedRun||null;state.suspendedRun=null;return true;
}
export function getSupportChoices(run,profile=null){if(run?.phase!=='support')return[];if(isCardRun(run)&&run.current.kind==='camp')return makeCardCampChoices(run);if(run.current.kind==='treasure')return getTreasureChoices(run);if(run.current.kind==='camp')return makeSupportChoices(run,profile);if(run.supportOffers?.choices?.some(c=>c.effect?.upgrade))run.supportOffers=null;if(run.supportOffers?.nodeId!==run.current.id||run.supportOffers?.edition!==EVENT_EDITION)run.supportOffers={edition:EVENT_EDITION,nodeId:run.current.id,choices:makeSupportChoices(run,run.testMode?null:profile)};return copy(run.supportOffers.choices);}
export function suspendRun(state){const r=state?.run;if(!r||r.phase==='ended'||r.banked)return false;if(r.attemptActive)interrupt(r);return true;}
export function abandonRun(state){const r=state?.run;if(!r||r.phase==='ended'||r.banked)return false;if(r.attemptActive)interrupt(r);settleCheckpoint(state);r.scoreAbandoned=true;r.phase='ended';r.success=false;r.restReady=false;r.victoryPending=false;return bankRun(state);}

export function getSkillLockReason(wallet,id){const s=SKILLS[id];if(!s)return 'Unknown skill';if(s.retired)return 'Retired skill';if(rank(wallet?.skills,id)>=s.maxRank)return 'Fully learned';if(wallet?.testMode===true)return null;if(!isSkillRevealed(wallet,id))return s.branch==='afterglow'&&!rank(wallet?.skills,'main-afterglow')?'Learn Efficient Storage in the Sparks tree':`Learn ${SKILLS[s.requires]?.name||'the prerequisite'} first`;const other=(s.excludes||[]).find(excluded=>rank(wallet?.skills,excluded)>0);if(other&&!rank(wallet?.skills,id))return `Other path chosen: ${SKILLS[other].name}`;return null;}
