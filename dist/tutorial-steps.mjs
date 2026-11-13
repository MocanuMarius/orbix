import {topicSteps} from './tutorial-curriculum.mjs?v=moonlit-menus-1';
const step=(id,title,text,target)=>({id,title,text,target,allowTarget:false});
const chapter=(id,steps,target)=>({id,steps:steps.map(s=>({...s,...(target?{target}:{}),allowTarget:false}))});
export function checkpointTutorialLesson(screen,{run={}}={}){
 if(!run.isTutorial||run.guideSkipped)return null;
 let lesson;const seen=id=>run.guideSeen?.[id];
 if(screen==='map'){
  if(run.lastAttempt?.success===false&&!seen('practice-lives'))lesson=chapter('practice-lives',topicSteps('hearts').slice(2),'#journey-map');
  else if(run.step===0)lesson=chapter('practice-route',[
   {title:'First Light: learn at your pace',text:'This separate practice has seven stops. Short lessons appear where you need them. Your real run stays safe. MENU → Field Guide replays every topic.',visual:'wisp'},
   topicSteps('hearts')[0],topicSteps('routes')[0]],'#journey-map');
  else if(run.map?.[run.step]?.some(n=>n.kind==='camp'))lesson=chapter('practice-rest-route',[topicSteps('routes')[2]],'#journey-map');
  else if(run.step===3)lesson=chapter('practice-event-route',[topicSteps('routes')[3]],'#journey-map');
 }
 if(screen==='briefing')lesson=chapter('practice-briefing',[topicSteps('luminance')[0],{title:'Find the waylight',text:'Solid edges are hazards. Faint background shapes are scenery. Fly carefully to the waylight near the last terrain to finish.',visual:'route'}]);
 if(screen==='map-key')lesson=chapter('practice-symbols',topicSteps('routes'));
 if(screen==='victory')lesson=chapter('practice-reward',topicSteps('rewards'),'.single-artifact');
 if(screen==='support'){
  if(run.current?.kind==='camp')lesson=chapter('practice-rest-choice',[topicSteps('rest')[0],topicSteps('hearts')[3]],'.rest-benefit-cards');
  else if(run.current?.kind==='treasure')lesson=chapter('practice-treasure',[{title:'Treasure',text:'Open the chest for an artifact choice, or release its Sparks. Choose fuel now or a lasting effect for later flights.',visual:'site:treasure'}],'.support-offers');
  else lesson=chapter('practice-event',[{title:'Encounter: read both outcomes',text:'This is an event, not a free reward. The offering is certain; dice show a cost and possible rewards. Pick the risk that fits your build.',visual:'site:encounter'},topicSteps('packed')[1]],'.support-offers');
 }
 if(screen==='rest-prep')lesson=run.step>=6?chapter('practice-dream',topicSteps('dream'),'.rest-dream'):chapter('practice-rest-tools',[topicSteps('rest')[1],{title:'Practice tools are open',text:'Try Skills, Companions and Artifacts here. All four companions and a six-second Dream are available in practice. Real runs unlock them through progress.',visual:'tools'}],'.rest-service-cards');
 if(screen==='skills')lesson=chapter('practice-skill-tree',topicSteps('skills'),'.tree-body');
 if(screen==='companions')lesson=chapter('practice-companions',topicSteps('companions'),'.companion-roles');
 if(screen==='artifacts')lesson=chapter('practice-artifacts',topicSteps('artifacts'),'.artifact-workshop');
 if(screen==='result')lesson=chapter('practice-finished',topicSteps('progression'));
 return lesson&&!seen(lesson.id)?lesson:null;
}
export function tutorialSteps(screen,context={}){return checkpointTutorialLesson(screen,context)?.steps||[];}

// Observe quietly while flying. The app queues this ID and teaches it only at
// a safe checkpoint; these helpers never pause, mutate state or advance play.
export function observedFlightLesson(snapshot={},seen={}){
  const known=id=>seen?.[id]===true||seen?.has?.(id)===true;
  if(snapshot.dream?.active||snapshot.dying||snapshot.completing)return null;
  if((snapshot.blackHole?.rate||0)>0&&!known('flight-effect:black-hole'))return 'flight-effect:black-hole';
  if(snapshot.edgingPulse?.mode==='regen'&&snapshot.edgingPulse?.regenGrants>0&&!known('flight-effect:regeneration'))return 'flight-effect:regeneration';
  if(snapshot.edgingPulse?.active&&!known('flight-effect:edging'))return 'flight-effect:edging';
  return null;
}
export function flightEffectLesson(id,screen='map'){
  const target=screen==='victory'?'.artifact-reward-screen':screen==='map'?'#journey-map':null;
  if(id==='flight-effect:black-hole')return step(id,'That dark core steals Sparks',
    'A Black Hole drains fuel while you stay close. A wider path loses less light. It is not a pickup, and shields do not stop the drain. MENU → Field Guide keeps this reminder.',target);
  if(id==='flight-effect:edging')return step(id,'Your close flight made a pulse',
    'Flying near solid edges fills the slim edge meter in 2 seconds. Brief gaps preserve your progress, then charge fades slowly. Full charge reveals the scene for five fading seconds. Edge skills improve it; touching terrain still hurts.',target);
  if(id==='flight-effect:regeneration')return step(id,'Your close flight restored Sparks',
    'Regenerative Falling turns a full edge meter into one Spark instead of a reveal. Its green meter resets for 2 seconds. You have eight recoveries each flight; its meter disappears when spent. Only missing fuel is restored, without Packed Sparks or pickup effects.',target);
  return null;
}
