import {EXPANDED_SKILLS,applyExpandedSkills} from './skill-paths.mjs';
/** Run-owned skills and currency; persistent ascension unlocks and boss artifacts. */
import { FLAME_TUNING, LIFE_TUNING, getLifeCapacity } from './vitality.mjs';
import { getLevelIdentity } from './level-catalog.mjs';
import { EVENT_SCENARIOS } from './map-guide.mjs';
export const SAVE_KEY='emberwing.save.runskills.v6';
export const CAMPAIGN_MAP_NAMES=Object.freeze(['The Forgotten Verge','The Rootbound March','The Warden’s Reach']);
export const TERRAINS=Object.freeze({ruins:{id:'ruins',name:'Sunken Ruins',color:'#cdb183',description:'Broken homes, worn arches and overgrown stone.'},canopy:{id:'canopy',name:'Luminous Canopy',color:'#94b48a',description:'Hollow trees, hanging roots and sheltered forest passages.'},storm:{id:'storm',name:'Stormglass Peaks',color:'#a8bbca',description:'Pine ridges, old mine timbers and local draft puffs.'}});
const RUN_BRANCH_CHOICES={
 'main-efficiency':{name:'Vitality',maxRank:1,description:'Lift spends 7% less Glow.',consequence:'Less effort for every Lift'},
 'main-sight':{name:'Radiance',maxRank:1,description:'Expand your light: +70 ahead, +35 vertically.',consequence:'Reveal more of the passage'},
 'main-lift':{name:'Rising Light',maxRank:1,choiceGroup:'main-vitality',excludes:['main-kindling'],description:'Lift rises 8% higher.',consequence:'Stronger Lift'},
 'collector-reach':{name:'Wide Search',requires:null,maxRank:1,choiceGroup:'collector-style',excludes:['collector-recovery'],description:'Search farther, but rest longer after each delivery.',consequence:'35% more reach · 20% longer recovery'},
 'collector-recovery':{name:'Quick Return',requires:null,maxRank:1,choiceGroup:'collector-style',excludes:['collector-reach'],description:'Recover quickly, but search a smaller area.',consequence:'30% shorter recovery · 20% less reach'},
 'protector-recovery':{name:'Quick Ward',maxRank:1,choiceGroup:'protector-style',excludes:['protector-layers'],description:'Recharge the single-layer ward faster, but spend more Glow each time.',consequence:'28% faster recovery · 25% higher activation cost'},
 'protector-layers':{name:'Deep Ward',requires:'protector-cost',maxRank:1,choiceGroup:'protector-style',excludes:['protector-recovery'],description:'Hold two protective layers, but pay more Glow to activate.',consequence:'Two layers · 35% higher activation cost'},
 'leveler-steadiness':{name:'Still Point',maxRank:1,choiceGroup:'leveler-style',excludes:['leveler-dive'],description:'Suppress most bobbing, with a shorter Level hold.',consequence:'65% steadiness · 15% shorter hold'},
 'leveler-dive':{name:'Falling Release',maxRank:1,choiceGroup:'leveler-style',excludes:['leveler-steadiness'],description:'End a shorter Level hold with a controlled dive. Lift cancels the dive.',consequence:'Release dive · 25% shorter hold'},
 'swift-recovery':{name:'Quick Sparks',maxRank:1,choiceGroup:'swift-style',excludes:['swift-resistance'],description:'Use shorter speed bursts more often.',consequence:'28% faster recovery · 25% shorter burst'},
 'swift-resistance':{name:'Wind Lance',maxRank:1,choiceGroup:'swift-style',excludes:['swift-recovery'],description:'Resist almost all draft force, but recharge more slowly.',consequence:'90% draft resistance · 25% longer recovery'},
 'seer-duration':{name:'Long Vigil',maxRank:1,choiceGroup:'seer-style',excludes:['seer-recovery'],description:'Keep vision longer, over a shorter range.',consequence:'50% longer reveal · 20% less range'},
 'seer-recovery':{name:'Passing Glance',maxRank:1,choiceGroup:'seer-style',excludes:['seer-duration'],description:'Reveal more frequently, in shorter glimpses.',consequence:'35% faster recovery · 35% shorter reveal'},
 'kindler-bonus':{name:'Rich Fuel',requires:null,maxRank:1,choiceGroup:'kindler-style',excludes:['kindler-purify'],description:'Gain more Glow from direct fuel pickups, but spend more on Lift.',consequence:'16 bonus Glow · Lift costs 5% more'},
 'kindler-purify':{name:'Purify',requires:null,maxRank:1,choiceGroup:'kindler-style',excludes:['kindler-bonus'],description:'Purify touched Dark Seeds, but add less Glow to ordinary fuel.',consequence:'12 Glow from Dark Seeds every 10s · 8 ordinary bonus Glow'},
};
for(const [a,b,group] of [['main-horizon','main-dawn','main-radiance'],['main-tailwind','main-drift','main-momentum'],['main-lift','main-kindling','main-vitality']])for(const [id,other] of [[a,b],[b,a]])RUN_BRANCH_CHOICES[id]={...RUN_BRANCH_CHOICES[id],choiceGroup:group,excludes:[other]};
export const MAIN_WISP_BRANCHES=Object.freeze([{root:'main-sight',name:'Radiance',leaves:['main-horizon','main-dawn']},{root:'main-speed',name:'Momentum',leaves:['main-tailwind','main-drift']},{root:'main-efficiency',name:'Vitality',leaves:['main-lift','main-kindling']}]);
const skill=(id,name,branch,cost,maxRank,requires,description,prices)=>Object.freeze({id,name,branch,cost:id.endsWith('-attunement')?20:id.endsWith('-mastery')?35:RUN_BRANCH_CHOICES[id]?.choiceGroup?65:branch!=='main'&&branch!=='afterglow'?40:cost,maxRank:branch!=='main'&&branch!=='afterglow'?1:maxRank,requires:branch!=='main'&&branch!=='afterglow'&&requires===null&&!id.endsWith('-attunement')?`${branch}-attunement`:requires,description,...(prices?{prices}:{}),...RUN_BRANCH_CHOICES[id],...(branch!=='main'&&branch!=='afterglow'&&!id.endsWith('-attunement')&&(Object.hasOwn(RUN_BRANCH_CHOICES[id]||{},'requires')?RUN_BRANCH_CHOICES[id].requires:requires)===null?{requires:`${branch}-attunement`}:{})});
export const SKILLS=Object.freeze({
 ...EXPANDED_SKILLS,
 'main-bond':skill('main-bond','Companion Bond','main',80,2,null,'Add a second, then third equipped companion slot.',[80,300]),
 'main-efficiency':skill('main-efficiency','Gentle Lift','main',40,3,null,'Lift spends 7% less Glow per rank.'),
 'main-sight':skill('main-sight','Inner Glow','main',40,3,null,'See farther ahead with each rank.'),
 'main-lift':skill('main-lift','Rising Light','main',110,2,'main-efficiency','Lift impulse is 4% stronger per rank.'),
 'main-speed':skill('main-speed','Momentum','main',40,1,null,'Travel 5% faster. Less time to react, shorter crossings.'),
 'main-horizon':skill('main-horizon','Far Horizon','main',80,1,'main-sight','Expand light another 90 ahead and 45 vertically.'),
 'main-dawn':skill('main-dawn','Dawn Veil','main',80,1,'main-sight','Dark Seeds dim your light 40% less.'),
 'main-tailwind':skill('main-tailwind','Slipstream','main',80,1,'main-speed','Travel another 4% faster.'),
 'main-drift':skill('main-drift','Feather Drift','main',80,1,'main-speed','Fall 10% more gently.'),
 'main-kindling':skill('main-kindling','Kindling','main',80,1,'main-efficiency','Natural fuel pickups restore 4 extra Glow.'),
 'main-spare-spark':skill('main-spare-spark','Spare Spark','main',100,1,'main-efficiency','Raise your life cap to 4 for this run. Refill the extra heart at a Rest.'),
 'main-deep-reserve':skill('main-deep-reserve','Deep Reserve','main',180,1,'main-spare-spark','Raise your life cap to 5 for this run. Refill the extra heart at a Rest.'),
 'collector-reach':skill('collector-reach','Collector Reach','collector',50,3,null,'Collector searches 25% farther per rank, after your manual pickup window.'),
 'collector-recovery':skill('collector-recovery','Collector Recovery','collector',60,3,'collector-reach','Collector recovers 15% faster per rank after delivery.'),
 'protector-cost':skill('protector-cost','Frugal Ward','protector',80,3,null,'Protector activation spends 8% less Glow per rank.'),
 'protector-recovery':skill('protector-recovery','Returning Ward','protector',90,3,'protector-cost','Protector recharges 10% sooner per rank.'),
 'protector-layers':skill('protector-layers','Second Layer','protector',180,1,'protector-recovery','Protector can hold a second protective layer.'),
 'leveler-duration':skill('leveler-duration','Longer Level','leveler',80,3,null,'Level lasts 0.15 seconds longer per rank.'),
 'leveler-steadiness':skill('leveler-steadiness','Steady Level','leveler',100,2,'leveler-duration','Reduce bob and vertical oscillation during Level with each rank.'),
 'leveler-dive':skill('leveler-dive','Guided Descent','leveler',100,2,'leveler-duration','Enable a controlled dive on Level expiry or release. Lift cancels the dive; the second rank strengthens it.'),
 'swift-duration':skill('swift-duration','Longer Surge','swift',80,3,null,'Swift lasts 0.08 seconds longer per rank.'),
 'swift-recovery':skill('swift-recovery','Quick Surge','swift',90,3,'swift-duration','Swift recharges 10% sooner per rank.'),
 'swift-resistance':skill('swift-resistance','Windbreak','swift',100,2,'swift-duration','Swift resists 5 percentage points more draft force per rank.'),
 'seer-range':skill('seer-range','Far Sight','seer',80,3,null,'Seer reveals farther ahead with each rank.'),
 'seer-duration':skill('seer-duration','Lasting Vision','seer',90,3,'seer-range','Seer vision lasts half a second longer per rank.'),
 'seer-recovery':skill('seer-recovery','Returning Vision','seer',90,3,'seer-range','Seer recharges 10% sooner per rank.'),
 'kindler-bonus':skill('kindler-bonus','Kindled Fuel','kindler',80,3,null,'Kindler adds 2 more Glow to direct fuel pickups per rank.'),
 'kindler-purify':skill('kindler-purify','Purify','kindler',140,1,'kindler-bonus','Once every 10 seconds, purify a touched Dark Seed for 12 Glow instead of dimming.'),
 'collector-attunement':skill('collector-attunement','Search Spark','collector',35,1,null,'Collector range +5%.'),
 'collector-mastery':skill('collector-mastery','Deep Spark','collector',75,1,'collector-attunement','Collector range +5%. Adds to your first Spark.'),
 'protector-attunement':skill('protector-attunement','Ward Spark','protector',35,1,null,'Shell costs 0.5 less Glow.'),
 'protector-mastery':skill('protector-mastery','Deep Spark','protector',75,1,'protector-attunement','Shell costs 0.5 less Glow. Adds to your first Spark.'),
 'leveler-attunement':skill('leveler-attunement','Balance Spark','leveler',35,1,null,'Level lasts 0.1 seconds longer.'),
 'leveler-mastery':skill('leveler-mastery','Deep Spark','leveler',75,1,'leveler-attunement','Level lasts 0.1 seconds longer. Adds to your first Spark.'),
 'swift-attunement':skill('swift-attunement','Surge Spark','swift',35,1,null,'Surge recharges 0.25 seconds sooner.'),
 'swift-mastery':skill('swift-mastery','Deep Spark','swift',75,1,'swift-attunement','Surge recharges 0.25 seconds sooner. Adds to your first Spark.'),
 'seer-attunement':skill('seer-attunement','Vision Spark','seer',35,1,null,'Seer reaches 12 units farther.'),
 'seer-mastery':skill('seer-mastery','Deep Spark','seer',75,1,'seer-attunement','Seer reaches 12 units farther. Adds to your first Spark.'),
 'kindler-attunement':skill('kindler-attunement','Fuel Spark','kindler',35,1,null,'Direct pickups grant 1 extra Glow.'),
 'kindler-mastery':skill('kindler-mastery','Deep Spark','kindler',75,1,'kindler-attunement','Direct pickups grant 1 extra Glow. Adds to your first Spark.'),
 'afterglow-vessel':skill('afterglow-vessel','Ember Vessel','afterglow',70,3,null,'Carry 15 more Afterglow per rank.'),
 'afterglow-retention':skill('afterglow-retention','Lasting Light','afterglow',80,2,'afterglow-vessel','Retain 10 percentage points more surplus Glow per rank.'),
 'afterglow-anchor':skill('afterglow-anchor','Ash Anchor','afterglow',90,2,'afterglow-vessel','Lose 10 percentage points less reserve after a failed ascension.'),
});
const artifact=(id,name,description,icon,modifiers)=>Object.freeze({id,name,description,icon,color:'#cdb993',sellValue:40,modifiers});
export const ARTIFACTS=Object.freeze({
 'ember-lens':artifact('ember-lens','Ember Lens','See farther ahead.','◉',{lightRadius:28}),
 'quiet-cinder':artifact('quiet-cinder','Quiet Cinder','Lift spends 6% less Glow.','●',{flapCost:.94}),
 'silver-feather':artifact('silver-feather','Silver Feather','Lift impulse is 6% stronger.','⌃',{flap:1.06}),
 'moss-heart':artifact('moss-heart','Moss Heart','Kindler adds 3 more Glow to direct fuel pickups.','✦',{kindlerBonus:3}),
 'wayfinder-seed':artifact('wayfinder-seed','Wayfinder Seed','Collector searches 15% farther.','✧',{attract:1.15}),
 'iron-petal':artifact('iron-petal','Iron Petal','Protector recharges 12% sooner.','◇',{protectorRecovery:.88}),
 'storm-knot':artifact('storm-knot','Storm Knot','Swift resists 6 percentage points more draft force and recharges 10% sooner.','ϟ',{swiftResistance:.06,swiftRecovery:.90}),
 'hollow-bell':artifact('hollow-bell','Hollow Bell','Level lasts 0.25 seconds longer.','═',{levelerDuration:.25}),
 'dawn-thread':artifact('dawn-thread','Dawn Thread','Seer vision lasts one second longer.','✺',{seerDuration:1}),
});
export const ROUTE_PROFILES=Object.freeze({
 refuge:{routeStyle:'refuge',passage:'open',fuelCadence:2,fuelBonus:6,flameDrain:.92,routeReward:1,durationScale:1,fuelPreview:'More fuel · gentler Lift cost',riskPreview:'Open passages · deliberate edge packets'},
 cavern:{routeStyle:'cavern',passage:'cavern',fuelCadence:3,fuelBonus:4,flameDrain:1.08,routeReward:1.25,durationScale:.8,fuelPreview:'Spaced fuel · higher Lift cost',riskPreview:'Shorter cave · tighter passage'},
 gauntlet:{routeStyle:'gauntlet',passage:'gauntlet',fuelCadence:4,fuelBonus:1,flameDrain:1,routeReward:1.45,durationScale:.9,fuelPreview:'Lean fuel · richer pickup rewards',riskPreview:'Reward detour · demanding landforms'},
});
const ROLES=['collector','protector','leveler','swift','seer','kindler'];
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
const report=(amount,v={})=>({amount:energy(amount),stored:energy(v.stored),rawStored:energy(v.rawStored),spent:energy(v.spent),loss:energy(v.loss),granted:energy(v.granted)});

export function newState(){return{version:6,profile:{difficulty:1,ownedArtifacts:[],equippedArtifacts:[],afterglowUnlocked:false,afterglow:0,seenPickups:[],pickupCoachSkipped:false,tutorialComplete:false,bankedRuns:[],clearedFlights:0,stats:{completedRuns:0,wins:0,flights:0,attempts:0,deaths:0}},run:null,suspendedRun:null,settings:{sound:true,reducedMotion:false,testOverride:false,testStarterCompanion:'collector',companions:['collector'],companionRole:'collector'}};}
/** TEST starter selection is a preference for the next New Game only. */
export function getTestStarterCompanion(state){const id=state?.settings?.testStarterCompanion;return ROLES.includes(id)?id:'collector';}
export function setTestStarterCompanion(state,id){if(state?.settings?.testOverride!==true||!ROLES.includes(id))return false;state.settings.testStarterCompanion=id;return true;}
/** The preference affects future runs; a run that used TEST remains marked forever. */
export function setTestOverride(state,enabled){
  if(!state?.settings)return false;enabled=enabled===true;const changed=state.settings.testOverride!==enabled;state.settings.testOverride=enabled;
  const r=state.run;if(!enabled||!r||r.banked||r.phase==='ended')return changed;
  const wasTest=r.testMode===true;r.testMode=true;
  if(r.isTutorial)r.practiceEmbers=Math.max(10000,count(r.practiceEmbers));else{r.embers=Math.max(10000,count(r.embers));r.afterglowUnlocked=true;r.afterglow=Math.max(40,energy(r.afterglow));}
  for(const n of r.map.flat())n.afterglowUnlocked=!r.isTutorial;
  // A previously cached normal-world trade must not mutate permanent inventory in TEST.
  r.supportOffers=null;return changed||!wasTest;
}
function cleanProfile(v={}){const p=newState().profile;p.difficulty=Math.max(1,count(v.difficulty));p.afterglowUnlocked=v.afterglowUnlocked===true;p.ownedArtifacts=unique(v.ownedArtifacts,id=>Object.hasOwn(ARTIFACTS,id));p.equippedArtifacts=unique(v.equippedArtifacts,id=>p.ownedArtifacts.includes(id)).slice(0,3);p.afterglow=p.afterglowUnlocked?energy(clamp(finite(v.afterglow),0,85)):0;p.seenPickups=unique(v.seenPickups,id=>typeof id==='string');p.pickupCoachSkipped=v.pickupCoachSkipped===true;p.tutorialComplete=v.tutorialComplete===true;p.bankedRuns=unique(v.bankedRuns,id=>typeof id==='string').slice(-128);p.clearedFlights=count(v.clearedFlights);for(const k of Object.keys(p.stats))p.stats[k]=count(v.stats?.[k]);return p;}
function runWallet(run){return{skills:run?.skills||{},embers:run?.isTutorial?count(run.practiceEmbers):count(run?.embers),afterglowUnlocked:run?.afterglowUnlocked===true&&!run?.isTutorial,testMode:run?.testMode===true};}
export function getSkillWallet(state){return state?.run?runWallet(state.run):{skills:{},embers:0,afterglowUnlocked:state?.profile?.afterglowUnlocked===true,testMode:false};}
function validRun(r){if(!r||typeof r.id!=='string'||typeof r.seed!=='string'||!PHASES.has(r.phase))return false;const rows=r.isTutorial?3:7;if(!Array.isArray(r.map)||r.map.length!==rows||!Number.isInteger(r.step)||r.step<0||r.step>rows)return false;if(r.step===rows&&!['map-clear','ended'].includes(r.phase))return false;const all=r.map.flat();if(r.map.some((row,i)=>!Array.isArray(row)||!row.length||row.length>3||row.some(n=>!n||n.row!==i||typeof n.id!=='string'||!TERRAINS[n.terrain]||!['flight','support','finale'].includes(n.type))))return false;if(new Set(all.map(n=>n.id)).size!==all.length)return false;for(const n of all)if(!Array.isArray(n.nextIds)||n.nextIds.length>3||n.row<rows-1&&!n.nextIds.length||n.nextIds.some(id=>!r.map[n.row+1]?.some(next=>next.id===id)))return false;return Array.isArray(r.path)&&Array.isArray(r.companions)&&Number.isFinite(r.lives)&&Number.isFinite(r.flame);}
export function saveState(state,storage){try{storage??=globalThis.localStorage;if(!storage?.setItem||state?.version!==6)return false;storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function loadState(storage){try{storage??=globalThis.localStorage;const parsed=JSON.parse(storage?.getItem?.(SAVE_KEY)||'null');if(parsed?.version!==6)return newState();const s=newState();s.profile=cleanProfile(parsed.profile);s.settings={sound:parsed.settings?.sound!==false,reducedMotion:parsed.settings?.reducedMotion===true,testOverride:parsed.settings?.testOverride===true,testStarterCompanion:ROLES.includes(parsed.settings?.testStarterCompanion)?parsed.settings.testStarterCompanion:'collector',companions:unique(parsed.settings?.companions,id=>ROLES.includes(id)).slice(0,getCompanionCapacity(s.profile))};if(!s.settings.companions.length)s.settings.companions=['collector'];s.settings.companionRole=s.settings.companions[0];if(validRun(parsed.run)){s.run=parsed.run;if(s.run.attemptActive)interrupt(s.run);if(s.run.phase==='ended')bankRun(s);else settleCheckpoint(s);}if(s.run?.isTutorial&&validRun(parsed.suspendedRun)&&!parsed.suspendedRun.isTutorial&&parsed.suspendedRun.phase!=='ended'&&parsed.suspendedRun.id!==s.run.id){s.suspendedRun=parsed.suspendedRun;if(s.suspendedRun.attemptActive)interrupt(s.suspendedRun);}saveState(s,storage);return s;}catch{return newState();}}

function makeMap(seed,mapIndex,difficulty,afterglowUnlocked){const random=rng(`${seed}:routes`),mirror=random()<.5,earlyElite=random()<.5,events=shuffle(EVENT_SCENARIOS.map(e=>e.index),random),terrains=shuffle(Object.keys(TERRAINS),random),laneOf=c=>mirror?2-c:c;const rows=Array.from({length:7},(_,row)=>(row===0?[0,2]:row===6?[1]:[0,1,2]).map(c=>{const mixed=row===1||row===4,camp=mixed&&c===(row===1?0:2),support=mixed&&(camp||c===1),finale=row===6,boss=finale&&mapIndex===2;const elite=!support&&!finale&&(row===1&&c===2?earlyElite:row===2&&c===2?!earlyElite:row===3&&c===2?earlyElite:row===4&&c===0&&!earlyElite);const routeStyle=elite||mixed&&!support?'gauntlet':c===0?'refuge':c===1?'cavern':'gauntlet',profile=ROUTE_PROFILES[routeStyle],terrain=terrains[(Math.floor(row/2)+c+mapIndex)%3],location=getLevelIdentity(terrain,seed,row+c),eventIndex=events[row===1?0:1],kind=support?camp?'camp':(row===1)===(random()<.5)?'event':'shrine':finale?'finale':elite?'elite':'normal',challengeId=routeStyle==='refuge'?'wisps':routeStyle==='cavern'?'clean':'boosts',target=challengeId==='wisps'?(4+Math.floor(row/2))*3:challengeId==='boosts'?6:0;return{id:`m${mapIndex}-${row}-${c}`,row,lane:laneOf(c),routeLane:c,mapIndex,difficulty,afterglowUnlocked,type:support?'support':finale?'finale':'flight',kind,elite,boss,bossId:boss?'hollow-warden':null,terrain,nextIds:[],routeStyle,...profile,name:camp?'Emberwell Rest':support?kind==='event'?EVENT_SCENARIOS[eventIndex].name:'Lightkeeper Shrine':boss?'Hollow Warden':location.name,locationName:boss?'Hollow Warden':location.name,levelId:location.id,setpiecePreview:location.signature,duration:support?0:(finale?55:Math.round((row===0?34:38+row*2)*profile.durationScale))*3,flightLengthScale:support?1:3,challengeId:support?'':challengeId,challengeTarget:support?0:target,challenge:support?'':challengeId==='wisps'?`Collect ${target} fuel lights`:challengeId==='boosts'?`Use companion tools ${target} times`:'Finish without a hit',challengeBonus:support?0:24,eventIndex:support&&kind==='event'?eventIndex:null,fuelPreview:camp?'Recover full Glow or gather embers':support?'A small refill or an explicit resource trade':profile.fuelPreview,riskPreview:camp?'Commit a boon to open skills and fleet service':support?'No general skills or fleet service':profile.riskPreview,commitment:row<=1?c===0?'Early Rest · then two committed passages':c===2?'Reward detour · no early Rest':'Two committed passages · late Rest fork':row===3?c===0?'Reward or shrine ahead':c===2?'Late Rest or extra reward flight':'Three-way fork · late Rest or reward':row===4&&!support?'Extra flight · no Rest here':'Forward to the map exit',reward:camp?'Full Glow, Embers, or recover a missing life':support?'Choose one boon or trade':boss?'Boss artifact · Afterglow unlock':'Secure embers on clear',description:camp?'Only Rest opens persistent upgrades and fleet preparation after you choose a boon.':support?'Resolve this encounter before continuing.':TERRAINS[terrain].description};}));const by=(r,c)=>rows[r].find(n=>n.routeLane===c);for(let row=0;row<6;row++)for(const n of rows[row]){const c=n.routeLane,next=row===0?c===0?[0,1]:[1,2]:row===1||row===2||row===4?[c]:row===3?c===0?[0,1]:c===2?[0,2]:[0,1,2]:[1];n.nextIds=next.map(k=>by(row+1,k).id);}for(const row of rows)row.sort((a,b)=>a.lane-b.lane);return rows;}
export function createRun(profile=newState().profile,seed=freshSeed(),difficulty){
  const p=cleanProfile(profile),selected=Number(difficulty),tier=clamp(Number.isFinite(selected)?Math.floor(selected):p.difficulty,1,p.difficulty),campaignSeed=String(seed),mapSeed=`${campaignSeed}|tier:${tier}|map:0`;
  return{id:`${campaignSeed}-${freshSeed()}`,campaignSeed,seed:mapSeed,mapIndex:0,mapName:CAMPAIGN_MAP_NAMES[0],difficulty:tier,map:makeMap(mapSeed,0,tier,p.afterglowUnlocked),step:0,path:[],current:null,phase:'map',companions:['collector'],companionRole:'collector',artifacts:[...p.equippedArtifacts],skills:{},startingSkill:null,lives:LIFE_TUNING.lives,maxLives:LIFE_TUNING.lives,flame:FLAME_TUNING.starting,embers:0,pendingEmbers:0,securedEmbers:0,pendingRewards:[],afterglow:p.afterglow,afterglowUnlocked:p.afterglowUnlocked,afterglowJustUnlocked:false,afterglowDrawStep:null,afterglowTotals:report(p.afterglow),restReady:false,restVisits:[],lastRest:null,attemptActive:false,attemptEntry:null,success:false,banked:false,bossDefeated:false,bossProgressSecured:false,mapHistory:[],mapFlights:0,stats:{flights:0,attempts:0,deaths:0,collected:0,elites:0,events:0,challenges:0}};
}
export function canChooseStartingSkill(run){return !!run&&!run.isTutorial&&!run.startingSkill&&!run.attemptActive&&!run.banked&&run.mapIndex===0&&run.step===0&&run.phase==='map'&&!run.path.length;}
export function chooseStartingSkill(state,id){const r=state?.run;if(!canChooseStartingSkill(r)||!MAIN_WISP_BRANCHES.some(branch=>branch.root===id))return false;r.skills[id]=1;r.startingSkill=id;return true;}
const nodes=run=>run.map.flat();
function previousElite(run){return run.path.map(id=>nodes(run).find(n=>n.id===id)).filter(n=>n&&n.row<run.step&&n.type!=='support').at(-1)?.elite===true;}
export function getChoices(run){if(!run||run.phase!=='map'||run.step>=run.map.length)return[];const prior=run.path.map(id=>nodes(run).find(n=>n.id===id)).filter(n=>n&&n.row<run.step).at(-1),ids=prior?.nextIds;return run.map[run.step].filter(n=>(!ids||ids.includes(n.id))&&!(previousElite(run)&&n.elite));}
export function selectNode(run,nodeId){const n=getChoices(run).find(n=>n.id===nodeId);if(!n)return false;run.path=run.path.filter(id=>nodes(run).some(p=>p.id===id&&p.row<run.step));run.path.push(n.id);if(n.type!=='support')n.flightNumber=run.path.map(id=>nodes(run).find(p=>p.id===id)).filter(p=>p.type!=='support').length;run.current=n;run.phase=n.type==='support'?'support':'briefing';return true;}
function nextStop(run){run.step++;run.current=null;run.phase=run.step>=run.map.length?'ended':'map';}
function reattempt(run){return run.phase==='briefing'&&run.current&&run.lastAttempt?.nodeId===run.current.id&&run.lastAttempt.success!==true;}
export function canChangeCompanion(run){const starter=run?.mapIndex===0&&run?.step===0&&run?.phase==='map'&&!run.path?.length;return!!run&&(run.testMode===true||run.restReady===true||starter)&&!run.attemptActive&&!run.banked&&run.lives>0&&['support','map','briefing'].includes(run.phase)&&!reattempt(run);}
export function getCompanionCapacity(source){const v=source?.run||source,s=v?.skills||v?.profile?.skills||{};return v?.testMode===true?3:Math.min(3,1+rank(s,'main-bond'));}
export function setCompanions(run,ids){if(!canChangeCompanion(run)||!Array.isArray(ids)||!ids.length||ids.length>getCompanionCapacity(run)||new Set(ids).size!==ids.length||ids.some(id=>!ROLES.includes(id)))return false;if(ids.join('|')===run.companions.join('|'))return false;run.companions=[...ids];run.companionRole=ids[0];return true;}
export function beginFlightAttempt(run){if(!run||run.phase!=='briefing'||run.attemptActive||run.banked||run.lives<=0||!run.current||run.current.type==='support')return false;run.restReady=false;run.attemptEntry={step:run.step,nodeId:run.current.id,flame:run.flame,afterglow:run.afterglow,afterglowDrawStep:run.afterglowDrawStep,afterglowTotals:copy(run.afterglowTotals),companions:[...run.companions],skills:{...run.skills},artifacts:[...run.artifacts]};run.attemptActive=true;run.stats.attempts++;return true;}
function restoreEntry(run){const e=run.attemptEntry;if(e&&e.step===run.step&&e.nodeId===run.current?.id){run.flame=e.flame;run.afterglow=e.afterglow;run.afterglowDrawStep=e.afterglowDrawStep;run.afterglowTotals=copy(e.afterglowTotals);run.companions=[...e.companions];run.companionRole=run.companions[0];run.skills={...e.skills};run.artifacts=[...e.artifacts];}run.attemptActive=false;run.attemptEntry=null;run.restReady=false;}
function interrupt(run){restoreEntry(run);run.lastAttempt={success:false,interrupted:true,nodeId:run.current?.id,livesLost:0,livesRemaining:run.lives};run.phase='briefing';}
export function retryFlight(run){if(!run||run.phase!=='retry'||run.lives<=0||!run.current)return false;run.phase='briefing';run.restReady=false;return true;}
function queue(run,amount,kind,nodeId=run.current?.id){amount=count(amount);if(!amount||run.isTutorial)return;run.pendingEmbers=count(run.pendingEmbers)+amount;run.pendingRewards.push({amount,kind,nodeId});}
export function finishFlight(run,result){if(!run||run.phase!=='briefing'||!run.attemptActive||!run.current||typeof result?.success!=='boolean')return false;const n=run.current;if(!result.success){restoreEntry(run);run.lives=Math.max(0,run.lives-1);run.stats.deaths++;run.success=false;run.lastAttempt={success:false,nodeId:n.id,livesLost:1,livesRemaining:run.lives};run.phase=run.lives?'retry':'ended';return true;}run.attemptActive=false;run.attemptEntry=null;run.lastAttempt={success:true,nodeId:n.id,livesLost:0,livesRemaining:run.lives};const remaining=clamp(finite(result.flame,run.flame),0,100);run.flame=remaining;let stored=0,rawStored=0;if(run.afterglowUnlocked&&!run.isTutorial){const rules=getAfterglowRules(run.skills),surplus=Math.max(0,remaining-60);stored=energy(Math.min(Math.max(0,rules.cap-run.afterglow),surplus*rules.retention));rawStored=stored/rules.retention;run.afterglow=energy(run.afterglow+stored);run.flame=energy(remaining-rawStored);}if(run.isTutorial&&n.type!=='finale')run.flame=Math.max(60,run.flame);run.afterglowTotals=report(run.afterglow,run.afterglowTotals);run.afterglowTotals.stored+=stored;run.afterglowTotals.rawStored+=rawStored;run.stats.flights++;run.mapFlights++;run.stats.collected+=count(result.collected);run.stats.elites+=n.elite?1:0;const completionBonus=run.isTutorial||n.boss?0:n.type==='finale'?60:40+2*Math.min(4,(n.flightNumber||1)-1)+(n.elite?12:0),pickupEmbers=run.isTutorial?0:count(result.embers),challengeBonus=run.isTutorial||!result.challengeComplete?0:count(n.challengeBonus);if(challengeBonus)run.stats.challenges++;queue(run,completionBonus+pickupEmbers+challengeBonus,'flight');run.lastFlight={success:true,nodeId:n.id,mapIndex:run.mapIndex,difficulty:run.difficulty,flightNumber:n.flightNumber,terrain:n.terrain,elite:n.elite,boss:n.boss===true,completionBonus,pickupEmbers,challengeBonus,performanceBonus:0,performanceBonusCap:0,securedEmbers:0,collected:count(result.collected),flame:remaining,afterglow:report(run.afterglow,{stored,rawStored})};if(n.type==='finale'){run.step=run.map.length;run.bossDefeated=!run.isTutorial&&n.boss===true;run.success=run.isTutorial||run.bossDefeated;run.phase=run.success?'ended':'map-clear';}else nextStop(run);return true;}
function secureBoss(state){
  const r=state.run,p=state.profile;if(!r?.bossDefeated||!r.success||r.bossProgressSecured||r.isTutorial)return;
  if(r.testMode){r.bossProgressSecured=true;const ids=Object.keys(ARTIFACTS),id=ids[Math.floor(rng(`${r.campaignSeed}:boss:${r.difficulty}`)()*ids.length)];r.artifactDrop={id,test:true,duplicate:false,convertedGlow:0,convertedEmbers:0,message:'TEST artifact preview only; no permanent rewards.'};r.lastFlight.artifactDrop=copy(r.artifactDrop);return;}
  r.bossProgressSecured=true;p.difficulty=Math.max(p.difficulty,r.difficulty+1);
  if(!p.afterglowUnlocked){p.afterglowUnlocked=true;r.afterglowUnlocked=true;r.afterglowJustUnlocked=true;r.afterglow=20;p.afterglow=20;r.afterglowTotals=report(20,{...r.afterglowTotals,granted:20});r.lastFlight.afterglow=report(20,{...r.lastFlight.afterglow,granted:20});}
  const ids=Object.keys(ARTIFACTS),unowned=ids.filter(id=>!p.ownedArtifacts.includes(id)),pool=unowned.length?unowned:ids;
  const id=pool[Math.floor(rng(`${r.campaignSeed}:boss:${r.difficulty}`)()*pool.length)],duplicate=!unowned.length;
  let convertedGlow=0;
  if(duplicate){
    convertedGlow=energy(Math.min(20,Math.max(0,getAfterglowRules(r.skills).cap-r.afterglow)));
    r.afterglow=energy(r.afterglow+convertedGlow);p.afterglow=r.afterglow;
    r.afterglowTotals=report(r.afterglow,{...r.afterglowTotals,granted:finite(r.afterglowTotals.granted)+convertedGlow});
    r.lastFlight.afterglow=report(r.afterglow,{...r.lastFlight.afterglow,granted:finite(r.lastFlight.afterglow.granted)+convertedGlow});
  }else p.ownedArtifacts.push(id);
  const message=duplicate?(convertedGlow>0?`Duplicate converted to ${convertedGlow} stored Glow.`:'Duplicate recovered; Afterglow reserve is full.'):'New artifact recovered.';
  r.artifactDrop={id,duplicate,convertedGlow,convertedEmbers:0,message};r.lastFlight.artifactDrop=copy(r.artifactDrop);
}
export function settleCheckpoint(state){
  const r=state?.run,p=state?.profile;if(!r||!p||r.isTutorial||r.banked||p.bankedRuns.includes(r.id))return 0;
  secureBoss(state);const amount=count(r.pendingEmbers);r.embers=count(r.embers)+amount;r.securedEmbers+=amount;
  for(const reward of r.pendingRewards)if(reward.kind==='flight'&&r.lastFlight?.nodeId===reward.nodeId)r.lastFlight.securedEmbers+=reward.amount;
  if(amount)r.lastCheckpointReward={amount,rewards:copy(r.pendingRewards)};r.pendingEmbers=0;r.pendingRewards=[];return amount;
}
export function advanceMap(run){if(!run||run.isTutorial||run.phase!=='map-clear'||run.mapIndex>=2||run.lives<=0||run.attemptActive)return false;run.mapHistory.push({mapIndex:run.mapIndex,mapName:run.mapName,flights:run.mapFlights,lives:run.lives});run.mapIndex++;run.mapName=CAMPAIGN_MAP_NAMES[run.mapIndex];run.seed=`${run.campaignSeed}|tier:${run.difficulty}|map:${run.mapIndex}`;run.map=makeMap(run.seed,run.mapIndex,run.difficulty,run.afterglowUnlocked);run.step=0;run.path=[];run.current=null;run.mapFlights=0;run.phase='map';run.success=false;run.restReady=false;run.lastRest=null;run.attemptActive=false;run.attemptEntry=null;run.lastAttempt=null;run.afterglowDrawStep=null;return true;}

export function getAfterglowRules(skills={}){return{cap:40+15*rank(skills,'afterglow-vessel'),retention:Math.min(1,.8+.1*rank(skills,'afterglow-retention')),drawLimit:20,failureLoss:Math.max(.05,.25-.1*rank(skills,'afterglow-anchor'))};}
export function getAfterglowState(source){const v=source?.run&&!source.run.banked?source.run:source?.profile||source||{},rules=getAfterglowRules(v.skills),unlocked=v.afterglowUnlocked===true&&!v.isTutorial,amount=unlocked?energy(clamp(finite(v.afterglow),0,85)):0,key=`${v.mapIndex}:${v.step}`,drawUsed=v.afterglowDrawStep===key,drawable=unlocked&&v.phase==='briefing'&&!v.attemptActive&&!v.banked&&!drawUsed?Math.min(amount,20,100-finite(v.flame)):0;return{...rules,storageCap:rules.cap,cap:Math.max(rules.cap,amount),overCapacity:amount>rules.cap,unlocked,amount,drawable:energy(drawable),drawUsed,practice:v.isTutorial===true,failureLoss:unlocked?rules.failureLoss:0};}
export function drawAfterglow(run){const s=getAfterglowState(run);if(!s.drawable)return 0;run.afterglow=energy(run.afterglow-s.drawable);run.flame=energy(run.flame+s.drawable);run.afterglowDrawStep=`${run.mapIndex}:${run.step}`;run.afterglowTotals.spent+=s.drawable;return s.drawable;}
export function bankRun(state){
  const r=state?.run,p=state?.profile;if(!r||!p||r.phase!=='ended'||r.banked||p.bankedRuns.includes(r.id))return false;
  if(r.testMode){if(r.attemptActive)restoreEntry(r);settleCheckpoint(state);r.banked=true;return true;}
  if(r.attemptActive)restoreEntry(r);if(r.isTutorial){if(r.success)p.tutorialComplete=true;r.banked=true;return true;}
  secureBoss(state);settleCheckpoint(state);
  if(r.afterglowUnlocked){const loss=r.success?0:energy(r.afterglow*getAfterglowRules(r.skills).failureLoss);r.afterglow=energy(r.afterglow-loss);r.afterglowTotals.loss+=loss;p.afterglow=energy(Math.min(r.afterglow,85));}
  p.stats.completedRuns++;p.stats.wins+=r.success?1:0;for(const k of ['flights','attempts','deaths'])p.stats[k]+=count(r.stats[k]);p.clearedFlights+=count(r.stats.flights);p.bankedRuns.push(r.id);p.bankedRuns=p.bankedRuns.slice(-128);r.banked=true;return true;
}

const choice=(id,title,description,effect)=>({id,title,description,detail:description,effect});
function upgradeOffer(run,profile){const wallet=runWallet(run),branches=new Set(['main',...(run.companions||[run.companionRole]),...(wallet.afterglowUnlocked?['afterglow']:[])]);const eligible=Object.keys(SKILLS).filter(id=>branches.has(SKILLS[id].branch)&&getSkillCost(wallet,id)!==null),id=eligible[Math.floor(rng(`${run.seed}:${run.current.id}:upgrade`)()*eligible.length)];if(!id)return choice('archive-embers','Gather embers','Gain 20 embers for this run.',{embers:20});const cost=Math.max(20,Math.round(getSkillCost(wallet,id)*.8));return choice('shrine-upgrade',`Learn ${SKILLS[id].name}`,`Spend ${cost} run embers for one rank this run.`,{upgrade:id,emberCost:cost});}
function makeSupportChoices(run,profile=null){if(run?.phase!=='support')return[];const n=run.current;if(n.kind==='camp')return[choice('rest-recover','Recover','Refill Glow to 100%, then open skills and fleet service.',{flame:100,rest:'recover'}),choice('rest-gather','Gather','Gain 20 Embers and 12% Glow, then open skills and fleet service.',{flame:12,embers:20,rest:'gather'}),...(run.lives<getLifeCapacity(run)?[choice('rest-rekindle','Rekindle hearts','Refill every heart instead of Glow or Embers, then open Rest services.',{lives:getLifeCapacity(run)-run.lives,rest:'rekindle'})]:[])];if(n.kind==='shrine')return[choice('shrine-fuel','Gather shelter light','Recover 16 Glow. This is not a full Rest.',{flame:16}),upgradeOffer(run,profile)];switch(n.eventIndex){case 0:return[choice('spring','Kindle the spring','Spend 12 embers to refill Glow to 100.',{flame:100,emberCost:12}),choice('spring-embers','Follow the golden stream','Gain 16 embers.',{embers:16})];case 1:return[run.flame>=15?choice('bargain','Trade Glow','Spend 15 Glow and gain 35 embers.',{flame:-15,embers:35}):choice('bargain-light','Keep the last light','Recover 18 Glow.',{flame:18}),choice('bargain-safe','Gather scattered embers','Gain 12 embers.',{embers:12})];case 2:return[choice('lantern-light','Kindle the lantern','Recover 24 Glow.',{flame:24}),choice('lantern-embers','Gather nesting embers','Gain 22 embers.',{embers:22})];case 3:return[upgradeOffer(run,profile),choice('shrine-keep','Keep your present build','Gain 20 embers.',{embers:20})];case 4:return[choice('well','Drink luminous water','Refill Glow to 100.',{flame:100}),run.afterglowUnlocked?choice('well-reserve','Store reflected light','Store up to 10 Afterglow.',{afterglow:10}):choice('well-embers','Gather well embers','Gain 12 embers.',{embers:12})];default:{const id=profile?.ownedArtifacts?.[0];return[id?choice('archive-sale',`Trade ${ARTIFACTS[id].name}`,'Sell this artifact for 50 embers.',{sell:id,saleValue:50}):choice('archive-light','Read the old lantern','Recover 24 Glow.',{flame:24}),choice('archive-embers','Keep your possessions','Gain 20 embers.',{embers:20})];}}}
export function resolveSupport(run,index,profile=null){
  if(!run||run.phase!=='support'||!Number.isInteger(index)||index<0)return false;
  const e=getSupportChoices(run,profile)[index]?.effect;if(!e)return false;const wallet=runWallet(run),cost=count(e.emberCost);
  if(wallet.embers<cost||run.flame+Math.min(0,finite(e.flame))<0||e.afterglow&&!wallet.afterglowUnlocked)return false;
  if(e.lives&&run.lives>=getLifeCapacity(run))return false;
  if(e.sell&&(run.testMode||!profile?.ownedArtifacts.includes(e.sell)))return false;
  if(e.upgrade&&(getSkillCost(wallet,e.upgrade)===null||!run.testMode&&SKILLS[e.upgrade].requires&&!rank(run.skills,SKILLS[e.upgrade].requires)))return false;
  if(run.isTutorial)run.practiceEmbers-=cost;else run.embers-=cost;
  if(e.upgrade){if(run.testMode)for(const id of SKILLS[e.upgrade].excludes||[])forgetSkillBranch(run.skills,id);run.skills[e.upgrade]=rank(run.skills,e.upgrade)+1;}
  if(e.sell){profile.ownedArtifacts=profile.ownedArtifacts.filter(id=>id!==e.sell);profile.equippedArtifacts=profile.equippedArtifacts.filter(id=>id!==e.sell);run.artifacts=run.artifacts.filter(id=>id!==e.sell);queue(run,e.saleValue,'artifact-sale');}
  if(e.embers){if(run.isTutorial)run.practiceEmbers+=e.embers;else queue(run,e.embers,'support');}
  run.flame=clamp(run.flame+finite(e.flame),0,100);
  run.maxLives=getLifeCapacity(run);
  if(e.lives)run.lives=Math.min(run.maxLives,run.lives+e.lives);
  if(e.afterglow){const gained=Math.min(e.afterglow,Math.max(0,getAfterglowRules(run.skills).cap-run.afterglow));run.afterglow+=gained;run.afterglowTotals.stored+=gained;}
  if(e.rest){run.lifeRestClaimed=e.rest==='rekindle';const key=`${run.mapIndex}:${run.current.id}`;if(!run.restVisits.some(v=>v.key===key))run.restVisits.push({key,mapIndex:run.mapIndex,row:run.step,nodeId:run.current.id,boon:e.rest});run.restReady=true;run.lastRest={nodeId:run.current.id,row:run.step,mapIndex:run.mapIndex,boon:e.rest};}
  run.stats.events++;nextStop(run);return true;
}

export function isSkillRevealed(profile,id){const s=SKILLS[id];if(!s)return false;if(profile?.testMode===true||rank(profile?.skills,id)>0)return true;if((s.branch==='afterglow'||id==='main-bond')&&profile?.afterglowUnlocked!==true)return false;const requires=Array.isArray(s.requires)?s.requires:s.requires?[s.requires]:[];return requires.every(parent=>rank(profile?.skills,parent)>0);}
export function getSkillCost(profile,id){const s=SKILLS[id];if(!s||getSkillLockReason(profile,id))return null;const r=rank(profile?.skills,id);return r>=s.maxRank?null:s.prices?.[r]??Math.round(s.cost*1.5**r);}
export function canBuyCheckpointSkills(state){const r=state?.run;return!!r&&(r.testMode===true||r.restReady===true)&&canChangeCompanion(r);}
function forgetSkillBranch(skills,id){
  delete skills[id];
  for(const child of Object.values(SKILLS)){
    const requires=Array.isArray(child.requires)?child.requires:[child.requires];
    if(requires.includes(id)&&skills[child.id])forgetSkillBranch(skills,child.id);
  }
}
export function buyCheckpointSkill(state,id){
  if(!canBuyCheckpointSkills(state))return false;const r=state.run,wallet=runWallet(r),s=SKILLS[id],cost=getSkillCost(wallet,id);
  if(!s||cost===null||wallet.embers<cost||!r.testMode&&s.requires&&!rank(r.skills,s.requires))return false;
  if(r.isTutorial)r.practiceEmbers-=cost;else r.embers-=cost;if(r.testMode)for(const other of s.excludes||[])forgetSkillBranch(r.skills,other);r.skills[id]=rank(r.skills,id)+1;r.maxLives=getLifeCapacity(r);if(r.restReady&&r.lifeRestClaimed)r.lives=r.maxLives;r.supportOffers=null;return true;
}
function artifactService(state,selling=false){const r=state?.run;if(!state?.profile||!r||r.isTutorial||r.attemptActive||r.banked||['retry','map-clear','ended'].includes(r.phase)||reattempt(r))return false;return selling?r.phase==='support'||r.restReady===true:r.phase==='support'||canChangeCompanion(r);}
export function equipArtifact(state,id,slot=0){if(!artifactService(state)||!Number.isInteger(slot)||slot<0||slot>2||id!=null&&(!Object.hasOwn(ARTIFACTS,id)||!state.run.testMode&&!state.profile.ownedArtifacts.includes(id)))return false;const r=state.run,next=Array.from({length:3},(_,i)=>r.artifacts?.[i]||null);if(id!=null)for(let i=0;i<3;i++)if(next[i]===id)next[i]=null;next[slot]=id??null;r.artifacts=next;if(!r.testMode)state.profile.equippedArtifacts=[...next];return true;}
export function sellArtifact(state,id){if(state?.run?.testMode||!artifactService(state,true)||!state.profile.ownedArtifacts.includes(id)||!ARTIFACTS[id])return false;const p=state.profile,r=state.run,value=ARTIFACTS[id].sellValue;p.ownedArtifacts=p.ownedArtifacts.filter(x=>x!==id);p.equippedArtifacts=p.equippedArtifacts.map(x=>x===id?null:x);r.artifacts=r.artifacts.map(x=>x===id?null:x);r.embers=count(r.embers)+value;r.securedEmbers+=value;r.lastCheckpointReward={amount:value,kind:'artifact-sale',artifactId:id};return true;}
export function getRunModifiers(run={}){const s=run.skills||{},m={speed:1+.05*rank(s,'main-speed')+.04*rank(s,'main-tailwind'),flap:1+.08*rank(s,'main-lift'),gravity:rank(s,'main-drift')?.9:1,flapCost:Math.max(.65,1-.07*rank(s,'main-efficiency')),lightRadius:175+35*rank(s,'main-sight')+45*rank(s,'main-horizon'),darkResistance:rank(s,'main-dawn')?.4:0,attract:1,wispCooldown:1,boostCooldown:1,boostDuration:1,reward:1,windSensitivity:1,cacheFuelBonus:4*rank(s,'main-kindling'),warmCore:false,steady:false,protectorCost:12*(1-.08*rank(s,'protector-cost')),protectorRecovery:14,protectorLayers:1+rank(s,'protector-layers'),levelerDuration:2.4+.15*rank(s,'leveler-duration'),levelerSteadiness:.2*rank(s,'leveler-steadiness'),levelerDive:rank(s,'leveler-dive')?1+.25*rank(s,'leveler-dive'):0,levelerRecovery:9,swiftDuration:1.25+.08*rank(s,'swift-duration'),swiftRecovery:7.5,swiftResistance:.72+.05*rank(s,'swift-resistance'),seerRadius:230+25*rank(s,'seer-range'),seerDuration:4.5,seerRecovery:12,kindlerBonus:10+2*rank(s,'kindler-bonus'),kindlerPurify:rank(s,'kindler-purify')>0};
  if(rank(s,'collector-reach')){m.attract*=1.35;m.wispCooldown*=1.20;}
  else if(rank(s,'collector-recovery')){m.attract*=.80;m.wispCooldown*=.70;}
  if(rank(s,'protector-recovery')){m.protectorRecovery*=.72;m.protectorCost*=1.25;}
  else if(rank(s,'protector-layers'))m.protectorCost*=1.35;
  if(rank(s,'leveler-steadiness')){m.levelerSteadiness=.65;m.levelerDuration*=.85;}
  else if(rank(s,'leveler-dive')){m.levelerDive=1.35;m.levelerDuration*=.75;}
  if(rank(s,'swift-recovery')){m.swiftRecovery*=.72;m.swiftDuration*=.75;}
  else if(rank(s,'swift-resistance')){m.swiftResistance=.90;m.swiftRecovery*=1.25;}
  if(rank(s,'seer-duration')){m.seerDuration*=1.5;m.seerRadius*=.80;}
  else if(rank(s,'seer-recovery')){m.seerRecovery*=.65;m.seerDuration*=.65;}
  if(rank(s,'kindler-bonus')){m.kindlerBonus=16;if((run.companions||[run.companionRole]).includes('kindler'))m.flapCost*=1.05;}
  else if(rank(s,'kindler-purify'))m.kindlerBonus=8;
  const spark=role=>rank(s,`${role}-attunement`)+rank(s,`${role}-mastery`);
  m.attract*=1+.05*spark('collector');m.protectorCost=Math.max(1,m.protectorCost-.5*spark('protector'));
  m.levelerDuration+=.1*spark('leveler');m.swiftRecovery-=.25*spark('swift');m.seerRadius+=12*spark('seer');m.kindlerBonus+=spark('kindler');
  m.collectorMinimum=0;m.collectorFuelBonus=0;m.protectorProtection=.4;m.purifyCooldown=10;m.purifyFuel=12;
  applyExpandedSkills(m,s,run.companions||[run.companionRole||'collector']);
  for(const id of unique(run.artifacts,x=>Object.hasOwn(ARTIFACTS,x)).slice(0,3)){for(const[k,v]of Object.entries(ARTIFACTS[id].modifiers))if(['flapCost','flap','attract','protectorRecovery','swiftRecovery'].includes(k))m[k]*=v;else m[k]+=v;}m.flap=clamp(m.flap,.8,1.2);m.flapCost=clamp(m.flapCost,.5,1.25);m.attract=clamp(m.attract,.65,2.5);m.swiftResistance=clamp(m.swiftResistance,0,.94);m.protectorLayers=clamp(m.protectorLayers,1,2);return m;}

function createTutorial(profile){const r=createRun(profile,`practice-${freshSeed()}`);r.isTutorial=true;r.mapIndex=0;r.mapName='Practice';r.difficulty=1;r.skills={};r.artifacts=[];r.companions=['collector'];r.companionRole='collector';r.practiceEmbers=200;r.afterglow=0;r.afterglowUnlocked=false;r.afterglowTotals=report(0);r.flame=80;const base={mapIndex:0,difficulty:1,afterglowUnlocked:false,elite:false,boss:false,bossId:null,...ROUTE_PROFILES.refuge,flightLengthScale:1,challengeId:'',challengeTarget:0,challengeBonus:0};r.map=[[{...base,id:'practice-glide',row:0,lane:1,type:'flight',kind:'normal',terrain:'ruins',name:'First Light',locationName:'First Light',levelId:'ruins-aqueduct',tutorialLesson:'glide',duration:36,nextIds:['practice-rest']}],[{...base,id:'practice-rest',row:1,lane:1,type:'support',kind:'camp',terrain:'ruins',name:'Practice Rest',tutorialLesson:'preparation',duration:0,nextIds:['practice-wind']}],[{...base,id:'practice-wind',row:2,lane:1,type:'finale',kind:'finale',terrain:'storm',name:'Cross a Draft',locationName:'Cross a Draft',levelId:'storm-ridge',tutorialLesson:'wind',duration:44,nextIds:[]}]];return r;}
export function startTutorial(state){if(!state?.profile)return false;const old=state.run;if(old?.isTutorial&&old.phase!=='ended')return false;if(old?.isTutorial)bankRun(state);else{state.suspendedRun=old&&old.phase!=='ended'&&!old.banked?copy(old):null;if(state.suspendedRun?.attemptActive)interrupt(state.suspendedRun);}state.run=createTutorial(state.profile);const selected=unique(state.settings?.companions,id=>ROLES.includes(id)).slice(0,1);state.run.companions=selected.length?selected:['collector'];state.run.companionRole=state.run.companions[0];return true;}
export function leaveTutorial(state){if(!state?.run?.isTutorial)return false;if(state.run.attemptActive)restoreEntry(state.run);if(state.run.phase!=='ended'){state.run.phase='ended';state.run.success=false;}bankRun(state);state.run=state.suspendedRun||null;state.suspendedRun=null;return true;}

export function getSupportChoices(run,profile=null){if(run?.phase!=='support')return[];if(run.current.kind==='camp')return makeSupportChoices(run,profile);if(run.supportOffers?.nodeId!==run.current.id)run.supportOffers={nodeId:run.current.id,choices:makeSupportChoices(run,run.testMode?null:profile)};return copy(run.supportOffers.choices);}
export function suspendRun(state){const r=state?.run;if(!r||r.phase==='ended'||r.banked)return false;if(r.attemptActive)interrupt(r);return true;}
export function abandonRun(state){const r=state?.run;if(!r||r.phase==='ended'||r.banked)return false;if(r.attemptActive)interrupt(r);settleCheckpoint(state);r.phase='ended';r.success=false;r.restReady=false;return bankRun(state);}

export function getSkillLockReason(wallet,id){const s=SKILLS[id];if(!s)return 'Unknown skill';if(rank(wallet?.skills,id)>=s.maxRank)return 'Fully learned';if(wallet?.testMode===true)return null;if(!isSkillRevealed(wallet,id))return (s.branch==='afterglow'||id==='main-bond')&&!wallet?.afterglowUnlocked?'Defeat the first boss to reveal this skill':`Learn ${SKILLS[s.requires]?.name||'the prerequisite'} first`;const other=(s.excludes||[]).find(excluded=>rank(wallet?.skills,excluded)>0);if(other&&!rank(wallet?.skills,id))return `Other path chosen: ${SKILLS[other].name}`;return null;}
