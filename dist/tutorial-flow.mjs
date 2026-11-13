import {createTutorialCoach} from './tutorial-coach.mjs';
import {tutorialSteps} from './tutorial-steps.mjs';

// Intro coaching belongs only to practice. Later mechanics get their own unlock lesson.
export function createTutorialFlow(api) {
  let current = null, index = 0;
  const coach = createTutorialCoach({onNext:next,onBack:back,onSkip:skip});
  const context = () => api.context();
  const introSafe = step => !/\bafterglow\b|\bstored\s+glow\b|\breserve\b/i.test(`${step.id} ${step.title} ${step.text}`);
  function show() {
    if (!current) return;
    const step = current.steps[index];
    coach.show({...step,id:`${current.key}:${step.id}`,progress:`${index+1} / ${current.steps.length}`,
      actionLabel:step.actionLabel || (index === current.steps.length-1 ? 'Got it' : 'Next')});
  }
  function sync(view) {
    const c = context(), run = c.run;
    const unlocked = (c.afterglowUnlocked ?? run?.afterglowUnlocked ?? c.profile?.afterglowUnlocked) === true;
    const unlockLesson = !run?.isTutorial && unlocked && run?.afterglowJustUnlocked === true
      && ['result','afterglow-unlock'].includes(view);
    if (!run || (!run.isTutorial && !unlockLesson) || (run.guideSkipped && !unlockLesson)) {hide();return;}
    if (unlockLesson) view = 'afterglow-unlock';
    const key = view === 'flight' || view === 'briefing' ? `${view}:${c.lesson||'glide'}` : view;
    if (current?.key === key) return;
    if (run.guideSeen?.[key]) {hide();return;}
    const lessonContext = unlockLesson ? c : {...c,afterglowUnlocked:false,hasStoredGlow:false};
    const steps = tutorialSteps(view,lessonContext)
      .filter(step => unlockLesson || introSafe(step))
      .filter(step => typeof step.target !== 'string' || document.querySelector(step.target));
    if (!steps.length) {hide();return;}
    coach.hide();current = {view,key,steps,unlockLesson};index=0;
    if (view === 'flight') api.pauseFlight();
    show();
  }
  function next() {
    if (!current) return;
    if (++index < current.steps.length) {show();return;}
    const {view,key,unlockLesson} = current,c = context();
    if(c.run){c.run.guideSeen ||= {};c.run.guideSeen[key]=true;}
    current=null;coach.hide();api.save();
    if(unlockLesson)return;
    if(view === 'flight' || view === 'world') api.resumeFlight();
    else if(view === 'map' && !c.run.guideSeen['map-key']) api.openMapKey();
    else if(view === 'map-key') api.closeSheets();
    else if(view === 'support' && !c.run.guideSeen.menu) api.openMenu();
    else if(view === 'menu' && c.rest && !c.run.guideSeen.tuning) api.openTuning();
    else if(view === 'tuning' && c.rest && !c.run.guideSeen.companion) api.openCompanion();
    else if(['tuning','companion'].includes(view)) api.closeSheets();
  }
  function back(){if(current&&index>0){index--;show();}}
  function skip(){
    const wasFlight=['flight','world'].includes(current?.view),c=context(),unlockLesson=current?.unlockLesson,key=current?.key;
    if(c.run){if(unlockLesson){c.run.guideSeen ||= {};c.run.guideSeen[key]=true;}else c.run.guideSkipped=true;api.save();}
    hide();if(!unlockLesson)api.closeSheets();if(wasFlight)api.resumeFlight();
  }
  function hide(){current=null;coach.hide();}
  function focus(step){
    const c=context(),run=c.run,key=`world:${c.lesson}:${step.id}`;
    if(current||!run?.isTutorial||run.guideSkipped||run.guideSeen?.[key]||!introSafe(step))return;
    run.guideSeen ||= {};run.guideSeen[key]=true;
    current={view:'world',key,steps:[{...step,actionLabel:'Continue flying'}],unlockLesson:false};index=0;
    api.pauseFlight();show();
  }
  return {sync,focus,hide,get active(){return Boolean(current);}};
}
