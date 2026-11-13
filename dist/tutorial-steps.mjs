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
          'The bright ring marks your next stop. Follow its connecting path. KEY explains the five map symbols whenever you want.',
          '#journey-map .world-map-node.reachable');
      }else if(run.map?.[run.step]?.some(node=>node.kind==='camp')){
        lesson=step('practice-rest-route','The shelter is a Rest',
          'Reach a shelter to recover and prepare. Real runs have forks: choosing a Rest may mean leaving a treasure behind.',
          '#journey-map .world-map-node.reachable');
      }
      break;
    case 'map-key':
      lesson=step('practice-symbols','Five familiar stops',
        'Passage: fly. Shelter: rest. Chest: treasure. Question mark: a choice or gamble. Guardian mask: the boss.',
        '.map-key-list');
      break;
    case 'victory':
      lesson=step('practice-reward','Choose what travels with you',
        'Take one artifact or practice Embers. Artifacts change your build; Upgrade spends Embers before you choose Next.',
        '.reward-offers');
      break;
    case 'support':
      lesson=step('practice-rest-choice','Choose a breather',
        'Glow fuels flight. Hearts are attempts. Embers buy skills. Take the recovery you need; preparation comes next.',
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
        'Tap a circle to inspect it. Bright paths show what you can learn next. These skills use practice Embers and last this practice.',
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
