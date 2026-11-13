// One small lesson on the actual checkpoint, only in the separate practice run.
// The app marks IDs seen and owns pause/resume; this module never advances play.
const step=(id,title,text,target)=>({id,title,text,target,allowTarget:false});

export function checkpointTutorialLesson(screen,{run={}}={}){
  if(run.isTutorial!==true||run.guideSkipped)return null;
  const seen=id=>run.guideSeen?.[id]===true;
  let lesson=null;
  switch(screen){
    case 'map':
      if(run.lastAttempt?.success===false&&!seen('practice-lives')){
        lesson=step('practice-lives','A life is one attempt',
          'A collision spends one heart. Your entry fuel returns. Choose the glowing passage to try again.',
          '.map-status-strip .ascension-lives');
      }else if(run.step===0){
        lesson=step('practice-route','Follow the glowing passage',
          'The warmly lit landmark is your next stop. Follow its trail. KEY explains the five places whenever you want.',
          '#journey-map .world-map-node.reachable');
      }else if(run.map?.[run.step]?.some(node=>node.kind==='camp')){
        lesson=step('practice-rest-route','The shelter is a Rest',
          'Reach a shelter to recover and prepare. Real runs have forks: choosing a Rest may mean leaving a treasure behind.',
          '#journey-map .world-map-node.reachable');
      }
      break;
    case 'map-key':
      lesson=step('practice-symbols','Five familiar stops',
        'Broken arch: fly. Hearth shelter: rest. Chest: treasure. Marked stone: a choice or gamble. Guardian gate: the boss.',
        '.map-key-list');
      break;
    case 'victory':
      lesson=step('practice-reward','Choose what travels with you',
        'Take one artifact, or dissolve it into Sparks. Any surplus condenses. Upgrade spends your Packed Light before Next.',
        '.reward-offers');
      break;
    case 'support':
      lesson=step('practice-rest-choice','Choose a breather',
        'Sparks fuels flight. Extra pickup light becomes Packed Light for skills. Rest recovery fills fuel only.',
        '.support-offers');
      break;
    case 'rest-prep':
      if(run.skills?.['main-dream']&&!seen('practice-dream')){
        lesson=step('practice-dream','Rehearse the opening',
          'Dream the next passage as often as you like. Preset an opening you enjoy; it replays safely, then waits for your tap.',
          '.rest-dream');
      }else{
        lesson=step('practice-rest-tools','Prepare without rushing',
          'Try a skill or change your companion. Dream rehearses the next opening; learn it in the Light tree when you are ready.',
          '.rest-hub-tools');
      }
      break;
    case 'skills':
      lesson=step('practice-skill-tree','Grow along one branch',
        'Tap a circle to inspect it. Bright circles are affordable now. Faint dots reveal as you grow. These skills use practice Packed Light and last this practice.',
        '.tree-body');
      break;
    case 'result':
      lesson=step('practice-finished','Your real run is waiting',
        'Practice rewards stay here. A real run crosses three maps; its boss unlocks the next Ascension and a new build opportunity.',
        '.compact-result [data-action="leave-practice"]');
      break;
  }
  return lesson&&!seen(lesson.id)?lesson:null;
}

// Keep the content API small: callers receive zero or one step, never the old
// multi-screen information dump or selectors for removed card/tuning panels.
export function tutorialSteps(screen,context={}){
  const lesson=checkpointTutorialLesson(screen,context);
  return lesson?[lesson]:[];
}


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
  const target=screen==='victory'?'.victory-screen':screen==='map'?'.map-status-strip':null;
  if(id==='flight-effect:black-hole')return step(id,'That dark core steals Sparks',
    'A Black Hole drains fuel while you stay close. A wider path loses less light. It is not a pickup, and shields do not stop the drain. MENU → Sparks & Pickups keeps this reminder.',target);
  if(id==='flight-effect:edging')return step(id,'Your close flight made a pulse',
    'Flying near solid edges fills the slim edge meter in 2 seconds. Brief gaps preserve your progress, then charge fades slowly. Full charge reveals the scene for five fading seconds. Edge skills improve it; touching terrain still hurts.',target);
  if(id==='flight-effect:regeneration')return step(id,'Your close flight restored Sparks',
    'Regenerative Falling turns a full edge meter into one Sparks instead of a reveal. Its green meter resets for 2 seconds. You have eight recoveries each flight; it becomes dim when spent. Only missing fuel is restored, without Packed Light or pickup effects.',target);
  return null;
}
