import {flashPowerupDuration} from './pickups.mjs?v=burn-1';
import {resourceCycleSteps} from './resource-cycle.mjs?v=burn-1';
import {LANTERN_THEME} from './map-theme.mjs?v=burn-1';
// First-run lessons (Edition 5 tutorial, 18 November 2026): in a player's first two card runs, one paused card the first
// time they meet something First Light did not reach. Menu screens only (never in flight), at most one per checkpoint,
// each once per profile (onboarding.seen), and only while automatic tips are on.
export const FIRST_RUN_TOPICS=Object.freeze(['card-reward','chest','devour','rest-recover','rest-grow','rest-forge']);
export const FIRST_RUN_LIMIT=2;
/** facts (from the app, read-only): {devour, growAvailable, stored, unseenCards} */
export function firstRunCardLesson(view,{profile,run,facts={}}={}){
 if(!run||run.isTutorial||run.testMode||!profile||!onboardingCanPrompt(view,{run}))return null;
 if((profile.bankedRuns||[]).filter(id=>id!==run.id).length>=FIRST_RUN_LIMIT)return null;
 const seen=new Set(cleanOnboarding(profile.onboarding).seen),fresh=id=>!seen.has(id);
 if(view==='card-draft'&&fresh('card-reward'))return card('card-reward','A card for your Deck','Choose one card. It goes to your Deck marked NEW. You place it in your Chain yourself.','card-deck');
 if(view==='chest'&&fresh('chest'))return card('chest','A chest','Take the chest’s find first. Then choose Stored Sparks or a surprise card.','site:treasure');
 if(view==='map'&&facts.devour&&fresh('devour'))return card('devour','Devour','A Devour card eats the card to its right when you take off. You confirm first; what it gains stays on it.','devour');
 if(view==='support'&&run.current?.kind==='camp'){
  if(fresh('rest-recover'))return card('rest-recover','Recover','Recover restores every missing heart and refills your Spark Meter. It is one Rest action.','rest');
  if(facts.growAvailable&&fresh('rest-grow'))return card('rest-grow','Grow','Your Growth Seeds unlock Grow: more maximum Sparks and one refill, without healing hearts.','meter');
  if(facts.stored>0&&fresh('rest-forge'))return card('rest-forge','Forge','Forge turns Stored Sparks into a surprise card. It uses no Rest action.','forge');
 }
 return null;
}
// Normal-run onboarding is profile-owned. Prompts are contextual, one short
// card at a time; the run owns only pacing so a new game keeps learned topics.
export const ONBOARDING_VERSION=1;
// Explicit practice and Field Guide lessons remain opt-in learning paths.
export function automaticTipsEnabled(settings={},run){
 return run?.isTutorial===true||settings.skipTutorial!==true;
}
export const ONBOARDING_PROMPT_GAP_MS=30000;
const topics=new Set(['lift','luminance','collector','collector-recovery','protector','swift','leveler','artifacts','packed','skills','rest','companions','dream','routes','black-hole','giant-hole','bad-sparks','drafts','edging','hearts','events','progression','special-sparks','lanterns',...FIRST_RUN_TOPICS]);
const topicId=value=>String(value??'').replace(/^onboarding:/,'').split(':')[0];
const integer=value=>Math.max(0,Math.floor(Number(value)||0));
export function cleanOnboarding(value={}){
 return {version:ONBOARDING_VERSION,seen:[...new Set((Array.isArray(value?.seen)?value.seen:[]).map(topicId).filter(id=>topics.has(id)))],stage:Math.min(4,integer(value?.stage)),replayIntro:value?.replayIntro===true};
}
export function onboardingState(profile){
 if(!profile)return cleanOnboarding();
 profile.onboarding=cleanOnboarding(profile.onboarding);return profile.onboarding;
}
export function markOnboardingSeen(profile,id){
 const topic=topicId(id),state=onboardingState(profile);
 if(!topics.has(topic))return false;
 if(!state.seen.includes(topic))state.seen.push(topic);
 return true;
}
export function resetOnboarding(profile){
 if(!profile)return;
 profile.onboarding={...cleanOnboarding(),replayIntro:true};profile.seenPickups=[];profile.seenArtifactLessons=[];
 profile.pickupCoachSkipped=false;profile.tutorialComplete=false;
}
const isTesting=run=>!!(run?.testMode||run?.isTutorial);
const flights=run=>integer(run?.stats?.flights);
export function onboardingStage(profile,run){
 const memory=cleanOnboarding(profile?.onboarding),saved=memory.stage;
 const experienced=integer(profile?.clearedFlights)>0||integer(profile?.stats?.flights)>0||integer(profile?.difficulty)>1;
 const current=integer(run?.mapIndex)>0?4:flights(run)>=3?3:flights(run)>=2||run?.lastRest||run?.restReady?2:flights(run)>0?1:0;
 return Math.max(saved,current,experienced&&!memory.replayIntro?4:0);
}
export function noteOnboardingProgress(profile,run){
 if(!profile||!run||isTesting(run))return;
 const state=onboardingState(profile);state.stage=Math.max(state.stage,onboardingStage(profile,run));if(run.onboardingIntroReplay&&state.stage>=4)state.replayIntro=false;
}
export function onboardingFeatureAvailable(profile,run,feature){
 if(feature==='dream')return !!run?.skills?.['main-dream'];
 if(isTesting(run))return true;
 const stage=onboardingStage(profile,run);
 if(feature==='artifacts')return stage>=1||!!run?.artifacts?.length;
 if(feature==='skills')return !!run;
 if(feature==='advanced-skills'||feature==='companion-upgrades'||feature==='companions')return stage>=2;
 return true;
}
/** Apply to a first-time player's first map. Returning players keep full maps. */
export function onboardingFlightPlan(profile,run){
 const stage=onboardingStage(profile,run),enabled=!isTesting(run)&&stage<4;
 return {enabled,stage,gentleOpening:enabled&&stage===0,
  drafts:!enabled||stage>=1,interactiveScenery:!enabled||stage>=1,
  specialSparks:!enabled||stage>=2,badSparks:!enabled||stage>=2,
  blackHoles:!enabled||stage>=3};
}

function checkpointToken(view,run){
 if(view==='death')return `death:${integer(run?.stats?.deaths)}`;
 if(view==='victory')return `reward:${run?.flightReward?.nodeId||run?.lastFlight?.nodeId||run?.step}`;
 if(view==='support'||view==='rest-prep')return `support:${run?.current?.id||run?.step}`;
 if(['skills','companions','artifacts','dream'].includes(view))return `tool:${view}`;
 if(view==='flight')return `flight:${run?.current?.id||run?.step}`;
 return `route:${run?.mapIndex||0}:${run?.step||0}`;
}
export function onboardingCanPrompt(view,{run,flight,now=Date.now()}={}){
 if(!run||isTesting(run))return false;
 const pacing=run.onboardingPacing||{},token=checkpointToken(view,run);
 if((pacing.checkpoints||[]).includes(token))return false;
 if(view==='flight'){
  const time=Number(flight?.time)||0;
  return time>=12&&pacing.flightNode!==run.current?.id;
 }
 const deliberate=['skills','companions','artifacts','dream','death','support'].includes(view);
 return deliberate||!pacing.lastPromptAt||now-pacing.lastPromptAt>=ONBOARDING_PROMPT_GAP_MS;
}
export function noteOnboardingPrompt(run,view,{flight,now=Date.now()}={}){
 if(!run)return;
 const pacing=run.onboardingPacing??={checkpoints:[]},token=checkpointToken(view,run);
 pacing.checkpoints=[...new Set([...(pacing.checkpoints||[]),token])].slice(-80);
 pacing.lastPromptAt=now;
 if(view==='flight'){pacing.flightNode=run.current?.id;pacing.flightTime=Number(flight?.time)||0;}
}
const card=(id,title,text,visual,target)=>({id:`onboarding:${id}`,topic:id,onboarding:true,steps:[{title,text,visual,...(target?{target}:{}),allowTarget:false,actionLabel:'Got it',skipLabel:false}]}); // one step: Skip did exactly what Got it does (marks it seen), so there is one button

export function lanternEntryLesson(settings, profile, run) {
 const node=run?.current;
 if(!automaticTipsEnabled(settings,run)||run?.isTutorial||!node||node.type==='support')return null;
 if(node.mapTheme!==LANTERN_THEME&&node.bossId!=='hollow-sun')return null;
 if(cleanOnboarding(profile?.onboarding).seen.includes('lanterns'))return null;
 return card('lanterns','Darkness Lanterns','Two lanterns cross their beams. Block a beam to cast a wedge of light behind you. Luminance cards widen your view. Catch the white Flare triangle to see through the crossing.','lantern-wedge');
}

export function giantBlackHoleEntryLesson(settings,profile,run,hole){
 if(!hole?.giant||!run?.current||run.isTutorial||!automaticTipsEnabled(settings,run)
  ||cleanOnboarding(profile?.onboarding).seen.includes('giant-hole'))return null;
 const route=hole.edge<0?'Stay low beneath its rim.':'Stay high above its rim.';
 return card('giant-hole','Giant Black Hole',route+' It drains Sparks continuously as you pass. The far lane costs fewer Sparks. Collect the fuel beyond the field to recover.','giant-hole');
}

/** Selection is pure; mark/note only once the parent actually shows the card. */
export function nextOnboardingLesson(view,{profile,run,modifiers,flight,snapshot={},now=Date.now()}={}){
 if(!run||isTesting(run)||!onboardingCanPrompt(view,{run,flight,now}))return null;
 const seen=new Set(cleanOnboarding(profile?.onboarding).seen),newTopic=id=>!seen.has(id);
 const firstMap=integer(run.mapIndex)===0,completed=flights(run),role=run.companions?.[0]||run.companionRole||'collector';
 if(view==='death'&&newTopic('hearts'))return card('hearts','One heart, one attempt','A collision spends one heart. With hearts left, choose your path again. Rest can refill hearts. At zero hearts, this run ends.','life-loss','.death-heart-scene');
 if(view==='briefing'&&newTopic('lift'))return {id:'onboarding:lift',topic:'lift',onboarding:true,steps:resourceCycleSteps(run,modifiers)};
 if(view==='skills'&&newTopic('skills'))return card('skills','One small upgrade','Tap Stored Sparks to open Skills any time. Gold skills are affordable. Blue skills are yours. Opening Skills pauses flight.','skill-states','.book-spread');
 if(view==='support'&&run.current?.kind==='camp'&&newTopic('rest'))return card('rest','Recover or Grow','Recover restores missing hearts. Grow adds 3 Spark capacity permanently. Both refill Sparks.','rest','.rest-benefit-cards');
 if(view==='support'&&run.current?.kind!=='camp'&&run.current?.kind!=='scribe'&&newTopic('events'))return run.current?.kind==='treasure'?card('events','Choose one treasure','Each chest has a specialty. Read both offers, then take one. On the map, tap a chest to inspect its stakes before choosing your path.','site:treasure','.support-offers'):card('events','An encounter','Read what you gain and what you give up. Choose one outcome.','sites-support','.support-offers');
 if(view==='companions'&&newTopic('companions'))return card('companions','Your Collector','Collector fetches missed Sparks and Clusters within its orbit. Cache Handling and Flare Handling cards extend what it can reel.','companion:'+role,'.companion-roles');
 if(view==='dream'&&newTopic('dream'))return card('dream','Rehearse the opening','Practise in golden light with free Lifts. Wake where you finished, with your pickups. Tap once to continue.','dream');
 if(view==='map'&&completed>0&&newTopic('routes'))return card('routes','Choose a connected path','Bright stops are reachable next. A fork commits your route. Campfire means Rest; chest means treasure. Tap a later stop to preview it before planning ahead.','sites','#journey-map');
 if(view==='victory'&&newTopic('artifacts')&&run.flightReward?.offers?.length&&!run.flightReward.claimed)return card('artifacts','Choose an Inscription','Elite and guardian victories offer two Inscriptions. Choose one, then the slot of your Chain to write it on.','artifact','.artifact-reward-screen');
 if((view==='map-clear'||view==='result'||view==='briefing'&&run.current?.type==='finale')&&newTopic('progression'))return card('progression','Three maps make a run','Your hearts, Sparks, cards and Inscriptions continue into the next map. Clear all three maps and the final guardian to unlock the next Ascension.','site:boss');
 if(view!=='flight'||flight?.dying||flight?.completing||flight?.dream?.active||snapshot.dying||snapshot.completing)return null;
 const time=Number(flight?.time)||0;
 if(firstMap&&completed===0&&time>=18&&newTopic('luminance'))return card('luminance','This reach is Luminance','Luminance is how far your wisp lights the passage. Farther terrain fades into darkness. Cards that raise Luminance let you see farther.','luminance','.canvas-wrap');
 if(role==='collector'&&time>=6&&newTopic('collector'))return card('collector','Collector is automatic','A Spark’s lower shell flows into a small green circle for Collector to catch and reel a miss to your main wisp. Sparks arrive on contact. Learn Cache Handling to reel dense Caches as a 12-Spark Cluster.','collector-return','#boost-btn');
 if(role==='collector'&&completed>=1&&time>=8&&newTopic('collector-recovery'))return card('collector-recovery','Watch the reel','Collector reels the intact pickup to your moving wisp. It stays busy until contact, then is ready again. Its orbit and Power indicator show reach; red-ring pickups are ignored.','collector-recovery','#boost-btn');
 if(role!=='collector'&&time>=6&&newTopic(role)){
  const lessons={protector:['Protector works automatically','A charged blue shell spends Sparks to deflect a collision, then rebuilds. No charge or too little Sparks means no rescue. Collect Sparks with your own body.'],swift:['Runner: press Power','Press the filled Power button for a short speed burst with draft resistance. Terrain still kills. The button refills during cooldown; collect Sparks yourself.'],leveler:['Space Timer: hold, then release','Hold the scene or Lift to levitate. Release to fall and recharge. Empty charge ends the hold; drafts still push you. Collect Sparks with your own body.']};
  const tip=lessons[role];if(tip)return card(role,...tip,'companion:'+role,role==='leveler'?'#flap-btn':'#boost-btn');
 }
 if(newTopic('black-hole')&&!flight?.blackHoles?.items?.some(hole=>hole.giant)&&(snapshot.blackHole?.rate>0||flight?.getNearbyBlackHole?.()))return card('black-hole','Give Black Holes space','A black core steals Sparks continuously while you are nearby. Closer means faster drain. It cannot be collected; take a wider path.','black-hole','.canvas-wrap');
 if(newTopic('edging')&&(snapshot.edgingPulse?.charge>.05||snapshot.edgingPulse?.active))return card('edging','Proximity is now unlocked','Your Proximity card rewards skimming solid terrain without touching it. The small meter near your wisp charges; when full, a fading pulse reveals the scene.','edge','.canvas-wrap');
 const pickup=flight?.getNearbyPickup?.(new Set(profile?.seenPickups||[]));
 if(pickup&&['dark','dusk'].includes(pickup.kind)&&newTopic('bad-sparks'))return card('bad-sparks','Red rings warn of a cost','Dark Sparks reduce Luminance. Dusk Sparks drain up to 3 Sparks and dim Luminance by 20% for 4 seconds. Dusk Wick pays after that drain. Collector leaves them alone; choose whether to touch them.','pickup:'+pickup.kind,'.canvas-wrap');
 if(pickup?.kind==='sight'&&newTopic('special-sparks'))return card('special-sparks','Flare Powerup',`Catch the white triangle. It trails behind your wisp, sends a Pulse every 2 seconds and raises your Luminance very high, for ${flashPowerupDuration(flight?.mod)} seconds.`,'pickup:sight','.canvas-wrap');
 const draft=flight?.gustState?.();
 if(completed>=1&&newTopic('drafts')&&(Math.abs(snapshot.gust||0)>.1||draft?.strength>.05||draft?.active||draft?.warning))return card('drafts','Local drafts push you','These curls show where the wind pushes. Leave room to drift, or time a Lift against the current.','draft','.canvas-wrap');
 return null;
}
