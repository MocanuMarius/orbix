// Normal-run onboarding is profile-owned. Prompts are contextual, one short
// card at a time; the run owns only pacing so a new game keeps learned topics.
export const ONBOARDING_VERSION=1;
export const ONBOARDING_PROMPT_GAP_MS=30000;
const topics=new Set(['lift','luminance','collector','artifacts','packed','skills','rest','companions','dream','routes','black-hole','bad-sparks','drafts','edging','hearts','events','progression','special-sparks']);
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
 if(isTesting(run))return true;
 const stage=onboardingStage(profile,run);
 if(feature==='skills'||feature==='artifacts')return stage>=1;
 if(feature==='advanced-skills'||feature==='companion-upgrades'||feature==='companions')return stage>=2;
 if(feature==='dream')return stage>=2;
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
const card=(id,title,text,visual,target)=>({id:`onboarding:${id}`,topic:id,onboarding:true,steps:[{title,text,visual,...(target?{target}:{}),allowTarget:false,actionLabel:'Got it',skipLabel:'Remember & skip'}]});

/** Selection is pure; mark/note only once the parent actually shows the card. */
export function nextOnboardingLesson(view,{profile,run,flight,snapshot={},now=Date.now()}={}){
 if(!run||isTesting(run)||!onboardingCanPrompt(view,{run,flight,now}))return null;
 const seen=new Set(cleanOnboarding(profile?.onboarding).seen),newTopic=id=>!seen.has(id);
 const firstMap=integer(run.mapIndex)===0,completed=flights(run),role=run.companions?.[0]||run.companionRole||'collector';
 if(view==='death'&&newTopic('hearts'))return card('hearts','One heart, one attempt','A collision spends one heart. With hearts left, choose your path again. Rest can refill hearts. At zero hearts, this run ends.','life-loss','.death-heart-scene');
 if(view==='briefing'&&newTopic('lift'))return card('lift','Tap anywhere to Lift','Tap the flight scene to rise. Each Lift spends Energy from the slim meter. Release to fall naturally; touch bright Sparks to refill.','lift','.enter-passage');
 if(view==='victory'&&newTopic('artifacts')&&run.flightReward?.offers?.length&&!run.flightReward.claimed)return card('artifacts','Choose one artifact',run.flightReward.permanent?'Choose one artifact to unlock in future guardian rewards. New runs still begin without artifacts.':'Elite and guardian victories offer two artifacts. Choose one: its effect works automatically alongside the others for this run.','artifact','.artifact-reward-screen');
 if(view==='victory'&&newTopic('packed')&&(snapshot.condensedGlow>0||run.lastFlight?.completionBonus>0||run.lastFlight?.pickupCondensedGlow>0))return card('packed','Clear flights. Grow your build.','Before the final guardian, each cleared flight earns 20 Packed Sparks for skills. Pickups above a full Energy meter add a bonus. Ordinary flights have no artifact choice.','clear-reward');
 if(view==='skills'&&newTopic('skills'))return card('skills','One small upgrade','Pick one available skill and read its effect. Blue means owned; gold means affordable. New branches open as you learn. Skills last for this run.','skill-states','.tree-body');
 if(view==='support'&&run.current?.kind==='camp'&&newTopic('rest'))return card('rest','Recover or Grow','Recover restores missing hearts. Grow adds 3 maximum Energy for this run. Both refill Energy. Then optionally prepare skills, swap your one companion, or Dream the next passage.','rest','.rest-benefit-cards');
 if(view==='support'&&run.current?.kind!=='camp'&&newTopic('events'))return card('events',run.current?.kind==='treasure'?'A treasure stop':'An encounter','Read what you gain and what you give up. Choose one outcome. These stops can strengthen a build, but they do not all offer Rest recovery.','sites-support','.support-offers');
 if(view==='companions'&&newTopic('companions'))return card('companions','One companion, one role','Equip one companion at a time. Collector fetches; Protector shields; Runner bursts; Space Timer levitates while you hold. Swap at Rest and build around your choice.','companion:'+role,'.companion-roles');
 if(view==='dream'&&newTopic('dream'))return card('dream','Rehearse the opening','Dream rehearses six seconds of the next flight without spending a heart. Retry freely, then save a preset. It replays free of Lift cost and ends paused.','dream');
 if(view==='map'&&completed>0&&newTopic('routes'))return card('routes','Choose a connected path','Bright stops are reachable next. A fork commits your route. Shelter means Rest; chest means treasure. Tap a later stop to preview it before planning ahead.','sites','#journey-map');
 if((view==='map-clear'||view==='result'||view==='briefing'&&run.current?.type==='finale')&&newTopic('progression'))return card('progression','Three maps make a run','Your hearts, Energy, skills and artifacts continue into the next map. Clear all three maps and the final guardian to unlock the next Ascension.','site:boss');
 if(view!=='flight'||flight?.dying||flight?.completing||flight?.dream?.active||snapshot.dying||snapshot.completing)return null;
 const time=Number(flight?.time)||0;
 if(firstMap&&completed===0&&time>=18&&newTopic('luminance'))return card('luminance','This reach is Luminance','Luminance is how far your wisp lights the world. Farther terrain fades into darkness. Light skills can extend it; it is separate from your Spark fuel.','luminance','.canvas-wrap');
 if(role==='collector'&&completed>=1&&newTopic('collector'))return card('collector','Collector rescues missed Sparks','Collector fetches good Sparks inside its green boundary after your body has had a chance. Fuel arrives on return. The boundary shrinks, then grows back during recovery.','companion:collector','#boost-btn');
 if(newTopic('black-hole')&&(snapshot.blackHole?.rate>0||flight?.getNearbyBlackHole?.()))return card('black-hole','Give Black Holes space','A black core steals Energy continuously while you are nearby. Closer means faster drain. It cannot be collected; take a wider path.','black-hole','.canvas-wrap');
 if(newTopic('edging')&&(snapshot.edgingPulse?.charge>.05||snapshot.edgingPulse?.active))return card('edging','Close flight charges a pulse','Skim near solid terrain without touching it. The small meter near your wisp charges; when full, a fading pulse reveals the scene.','edge','.canvas-wrap');
 const pickup=flight?.getNearbyPickup?.(new Set(profile?.seenPickups||[]));
 if(pickup&&['dark','dusk'].includes(pickup.kind)&&newTopic('bad-sparks'))return card('bad-sparks','Red rings warn of a cost','Dark Sparks reduce Luminance. Dusk Sparks trade Luminance for fuel. Collector leaves harmful Sparks alone; you choose whether to touch them.','pickup:'+pickup.kind,'.canvas-wrap');
 if(pickup&&['charge','sight'].includes(pickup.kind)&&newTopic('special-sparks'))return card('special-sparks','A different Spark','Cyan Charge Sparks restore companion recovery. Violet Flash Sparks extend Luminance. Their shapes and colors tell you they work differently from fuel.','pickup:'+pickup.kind,'.canvas-wrap');
 const draft=flight?.gustState?.();
 if(completed>=1&&newTopic('drafts')&&(Math.abs(snapshot.gust||0)>.1||draft?.strength>.05||draft?.active||draft?.warning))return card('drafts','Local drafts push you','These moving curls show a local gust. Leave room to drift, or time a Lift against it. Runner resists drafts; Space Timer still feels their push.','draft','.canvas-wrap');
 return null;
}
