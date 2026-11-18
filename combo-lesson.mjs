import {WispFlight} from './flight.mjs?v=prune-1';
import {CARD_SYSTEM,makeSkillCard,getMountedCards,getCardModifiers} from './skill-cards.mjs?v=prune-1';
import {cardArt} from './card-ui.mjs?v=prune-1';
import {createRhythmScore} from './rhythm-score.mjs?v=prune-1';
import {GLOW_DISPLAY_SCALE} from './vitality.mjs?v=prune-1';

export const COMBO_LESSON_ID='rhythm-harvest';
export const COMBO_LESSON_GAP=.8;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const lessonCards=()=>({skillSystem:CARD_SYSTEM,cardSlots:3,mountedCards:[
  makeSkillCard('rhythm','lesson-rhythm'),makeSkillCard('harvest-common','lesson-harvest')],reserveCards:[],skills:{}});

/** An isolated authored stage, never a model run. Only the camera and soft
 * practice boundaries differ: accepted Lifts, costs, Rhythm timing, wave
 * geometry, card execution and pickup rendering all belong to WispFlight. */
export function createComboLessonController({canvas,mode='guided',preflight=false,onChange=()=>{}}={}){
  const run=lessonCards(),engine=new WispFlight({canvas,preflight,seed:'rhythm-harvest-lesson',duration:60,
    practice:true,preview:true,flame:60,companions:['collector'],
    node:{levelId:'ruins-aqueduct',tutorialLesson:'glide',difficulty:1},
    modifiers:{...getCardModifiers(run),lightRadius:1800},onUpdate:()=>{}});
  // The prologue suppresses card payouts. This stage uses ordinary card-flight
  // state, without attaching any campaign callbacks or persistence.
  engine.tutorial=null;engine.tutorialAwaitingLift=false;engine.running=true;
  engine.layout.obstacles=[];engine.layout.riskChains=[];engine.layout.forks=[];
  engine.drafts.zones=[];engine.biomeDynamics.items=[];engine.blackHoles.items=[];
  engine.atlas=null;engine.routeObjective=null;engine.totalDistance=1e9;
  engine.player.y=engine.previousPlayerY=engine.height*.65;
  engine.setMuted(true);
  const stageDistance=engine.distance;
  const target={id:'lesson-uncollected-spark',kind:'light',x:stageDistance+engine.width*.74,
    y:engine.height*.38,value:1,fuel:true,collected:false,attracted:false,phase:0};
  engine.layout.embers=[target];engine._nearbyPacketsUntil=-1;
  let phase='ready',nextAt=0,lifts=0,beforeCrossing=null,receipt=null,destroyed=false;
  const change=()=>onChange(controller.state);
  const controller={engine,run,target,
    get state(){
      const rhythm=engine.cardRhythm?.state;
      return {mode,phase,lifts,time:engine.time,ready:phase==='ready'||phase==='beat',
        nextBeat:lifts+1,wait:Math.max(0,nextAt-engine.time),rhythm,
        sparks:Math.round(engine.flame*GLOW_DISPLAY_SCALE*10)/10,
        restored:receipt?.restoredSparks||0,receipt,uncollected:!target.collected,
        waves:engine.cardRhythm?.waves||0,beforeCrossing};
    },
    lift(){
      if(destroyed||!['ready','beat','flying'].includes(phase)||mode==='guided'&&phase==='flying')return false;
      if(!engine.beginLiftInput())return false;
      engine.endLiftInput();lifts++;
      if(engine.cardRhythm.waves){phase='wave';beforeCrossing=engine.flame;}
      else{phase='flying';nextAt=engine.time+COMBO_LESSON_GAP;}
      change();return true;
    },
    advance(seconds){
      if(destroyed||!['flying','wave'].includes(phase)||!(seconds>0))return;
      let remaining=Math.min(.1,seconds);
      while(remaining>1e-8&&['flying','wave'].includes(phase)){
        const dt=Math.min(remaining,1/60,mode==='guided'&&phase==='flying'?Math.max(0,nextAt-engine.time):1/60);
        if(dt<1e-8){phase='beat';break;}
        // Soft rails keep an early/late practice Lift harmless. The fixed camera
        // also leaves the same uncollected target visible for the whole phrase.
        engine.player.y=clamp(engine.player.y,engine.height*.18,engine.height*.82);
        engine.step(dt);remaining-=dt;
        engine.distance=engine.previousDistance=stageDistance;
        engine.player.y=clamp(engine.player.y,engine.height*.18,engine.height*.82);
        if(engine.cardRowTrace?.event?.kind==='wave-crossing'){
          receipt=engine.cardRowTrace;phase='complete';
        }else if(mode==='guided'&&phase==='flying'&&engine.time>=nextAt-1e-8)phase='beat';
        else if(mode==='free'&&phase==='flying'&&lifts>=2&&['miss','idle'].includes(engine.cardRhythm.phase))phase='miss';
        if(mode==='free'&&phase==='flying'&&lifts>=3&&!engine.cardRhythm.waves)phase='miss';
      }
      change();
    },
    render(){if(!preflight&&!destroyed){engine.accumulator=1/60;engine.render();}},
    destroy(){destroyed=true;engine.destroy();},
  };
  return controller;
}

const styles=new URL('./combo-lesson.css?v=prune-1',import.meta.url).href;
function ensureStyles(doc){
  if(!doc.querySelector('link[data-combo-lesson-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=styles;link.dataset.comboLessonStyle='';doc.head.append(link);}
  if(!doc.querySelector('link[href*="rhythm-score.css"]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./rhythm-score.css?v=prune-1',import.meta.url).href;doc.head.append(link);}
}
function cardPairMarkup(){return getMountedCards(lessonCards()).filter(Boolean).map((card,index)=>`<div class="combo-lesson-card" data-lesson-card="${index}">${cardArt(card,{compact:true})}<span><strong>${card.name}</strong><small>${index?'Common · rank 1':'Rare'}</small></span></div>`).join('');}

export function comboLessonMarkup(){return `<header class="combo-lesson-heading"><div><small>FIRST LIGHT · CARD PRACTICE</small><h2 id="combo-lesson-title">Rhythm + Resonant Harvest</h2></div><div class="combo-lesson-pace" role="group" aria-label="Practice pace"><button type="button" data-lesson="guided" aria-pressed="true">Guided</button><button type="button" data-lesson="free" aria-pressed="false">Free pace</button></div><button type="button" data-lesson="close" aria-label="Back from card practice">Back</button></header>
  <div class="combo-lesson-body"><section class="combo-lesson-stage" aria-label="Safe flight practice"><canvas aria-label="Your wisp and one uncollected Spark"></canvas><span class="combo-lesson-stage-note">Safe stage · no scrolling</span><div class="combo-lesson-label" data-spark-label>Uncollected Spark</div><div class="combo-lesson-payout" hidden>+1 Spark</div><span class="combo-lesson-meter" aria-label="Practice Spark Meter">Sparks <b>18</b><small>/ 30</small></span><div class="combo-lesson-beats" aria-label="Rhythm Lift progress"><i>1</i><i>2</i><i>3</i></div></section>
  <section class="combo-lesson-teaching"><div class="combo-lesson-pair">${cardPairMarkup()}</div><div class="combo-lesson-copy" role="status" aria-live="polite"><small data-lesson-step>1 / 3 · MAKE A PULSE</small><h3 data-lesson-title>Three Lifts, one Pulse</h3><p data-lesson-copy>Tap Lift each time it lights up. Three evenly spaced Lifts send one Pulse.</p></div><p class="combo-lesson-pace-note">Guided: the scene waits at each beat. A Lift costs 3 practice Sparks.</p></section></div>
  <footer class="combo-lesson-actions"><button type="button" data-lesson="skip">Skip lesson</button><span data-lesson-cue>Ready when you are</span><button type="button" class="combo-lesson-lift" data-lesson="lift">Lift 1</button><button type="button" data-lesson="replay" hidden>Replay</button><button type="button" data-lesson="done" hidden>Continue</button></footer>`;}

/** A modal preserves the existing app sheet and its exact return position. */
export function openComboLesson({document:doc=globalThis.document,onClose=()=>{},returnFocus=doc?.activeElement}={}){
  if(!doc)return null;
  const existing=doc.querySelector('dialog.combo-lesson');if(existing)return existing;
  ensureStyles(doc);
  const dialog=doc.createElement('dialog');dialog.className='combo-lesson';dialog.setAttribute('aria-labelledby','combo-lesson-title');dialog.innerHTML=comboLessonMarkup();doc.body.append(dialog);dialog.showModal();
  const view=doc.defaultView,canvas=dialog.querySelector('canvas'),stage=dialog.querySelector('.combo-lesson-stage');
  const score=createRhythmScore(stage);
  let controller=null,raf=0,last=0,mode='guided',closed=false,revision='',stageSize=null,resizeFrame=0;
  const query=selector=>dialog.querySelector(selector),liftButton=query('[data-lesson=lift]');
  const text=(selector,value)=>{const node=query(selector);if(node.textContent!==value)node.textContent=value;};
  const update=state=>{
    const done=state.phase==='complete',miss=state.phase==='miss',wave=state.phase==='wave';
    dialog.dataset.phase=state.phase;
    score.update({cardRhythm:mode==='free'?state.rhythm:null,reducedMotion:controller?.engine.reducedMotion,worldRate:1});
    text('.combo-lesson-meter b',String(state.sparks));
    liftButton.hidden=done||miss||wave;
    liftButton.disabled=mode==='guided'&&!state.ready;
    text('[data-lesson=lift]',`Lift ${Math.min(3,state.nextBeat)}`);
    query('[data-lesson=replay]').hidden=!done&&!miss;
    query('[data-lesson=done]').hidden=!done;
    query('[data-lesson=skip]').hidden=done;
    query('.combo-lesson-payout').hidden=!done;
    for(const [index,note]of [...dialog.querySelectorAll('.combo-lesson-beats i')].entries())note.dataset.lit=String(index<state.lifts);
    const label=query('[data-spark-label]'),e=controller?.engine;
    if(e){label.style.left=`${(controller.target.x-e.distance)/e.width*100}%`;label.style.top=`${controller.target.y/e.height*100}%`;}
    if(done){
      text('[data-lesson-step]','3 / 3 · HARVEST REWARDS THE CROSSING');
      text('[data-lesson-title]','The Pulse earned +1 Spark');
      text('[data-lesson-copy]','Harvest rewarded the crossing. The Spark stays to collect. Either card order works, even with other cards between them.');
      text('[data-lesson-cue]','3 Lifts → 1 Pulse → +1 Spark');
      query('[data-lesson-card="1"]').dataset.activated='true';
    }else if(miss){
      text('[data-lesson-step]','TRY AGAIN AT YOUR PACE');text('[data-lesson-title]','Keep the same gap between Lifts');
      text('[data-lesson-copy]','Rhythm needs three successful, evenly spaced Lifts. Replay to refill practice Sparks, or switch to Guided so the scene waits for you.');
      text('[data-lesson-cue]','Replay for another try');
    }else if(wave){
      text('[data-lesson-step]','2 / 3 · WATCH THE CROSSING');text('[data-lesson-title]','Rhythm sent one Pulse');
      text('[data-lesson-copy]','Follow the bright ring to the uncollected Spark. Resonant Harvest rewards the Pulse when it reaches that pickup.');text('[data-lesson-cue]','Watch the ring cross the Spark');
      query('[data-lesson-card="0"]').dataset.activated='true';
    }else{
      const cue=mode==='guided'?(state.ready?'Tap Lift when ready':'Glide · the next beat is coming'):state.lifts===2?'Catch the third beat at the same pace':state.lifts===1?'Tap Lift again to set the pace':'Tap three evenly spaced Lifts';
      text('[data-lesson-cue]',cue);
    }
    // Screen readers hear only the causal milestones, not each animation frame.
    const nextRevision=`${state.phase}:${state.lifts}`;
    if(nextRevision!==revision){revision=nextRevision;dialog.dataset.lifts=String(state.lifts);if(done)query('[data-lesson=done]').focus({preventScroll:true});else if(miss)query('[data-lesson=replay]').focus({preventScroll:true});}
  };
  const start=nextMode=>{
    mode=nextMode;controller?.destroy();revision='';last=0;
    for(const card of dialog.querySelectorAll('.combo-lesson-card'))delete card.dataset.activated;
    text('[data-lesson-step]','1 / 3 · MAKE A PULSE');text('[data-lesson-title]','Three Lifts, one Pulse');
    text('[data-lesson-copy]','Tap Lift each time it lights up. Three evenly spaced Lifts send one Pulse.');
    text('.combo-lesson-pace-note',mode==='guided'?'Guided: the scene waits at each beat. A Lift costs 3 practice Sparks.':'Free pace: tap three Lifts with matching gaps. Replay refills practice Sparks.');
    query('[data-lesson=guided]').setAttribute('aria-pressed',String(mode==='guided'));query('[data-lesson=free]').setAttribute('aria-pressed',String(mode==='free'));
    controller=createComboLessonController({canvas,mode,onChange:update});update(controller.state);controller.render();
    stageSize={width:stage.clientWidth,height:stage.clientHeight};
    controller.engine.ready?.then(()=>{if(!closed)controller.render();});
  };
  const close=()=>{
    if(closed)return;closed=true;view.cancelAnimationFrame(raf);view.cancelAnimationFrame(resizeFrame);observer?.disconnect();view.removeEventListener('resize',resize);view.removeEventListener('orientationchange',resize);score.destroy();controller?.destroy();doc.removeEventListener('visibilitychange',visibility);
    dialog.close();dialog.remove();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});onClose();
  };
  const visibility=()=>{last=0;if(doc.hidden&&controller&&controller.state.phase!=='ready'&&controller.state.phase!=='complete')start(mode);};
  const resize=()=>{view.cancelAnimationFrame(resizeFrame);resizeFrame=view.requestAnimationFrame(()=>{if(!closed)start(mode);});};
  const observer=typeof view.ResizeObserver==='function'?new view.ResizeObserver(()=>{
    // Text changes can resize the stage on portrait phones. Preserve a completed
    // crossing; only an actual viewport resize restarts an active phrase.
    if(closed||controller?.state.phase!=='ready'||!stageSize||Math.abs(stage.clientWidth-stageSize.width)<12&&Math.abs(stage.clientHeight-stageSize.height)<12)return;
    resize();
  }):null;
  doc.addEventListener('visibilitychange',visibility);
  view.addEventListener('resize',resize);view.addEventListener('orientationchange',resize);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{
    const action=event.target.closest('[data-lesson]')?.dataset.lesson;if(!action)return;
    if(['close','skip','done'].includes(action)){close();return;}
    if(action==='replay')start(mode);else if(action==='guided'||action==='free')start(action);else if(action==='lift')controller.lift();
  });
  // Keep keyboard Lift local: Enter/Space on any other button retains that
  // button's native action, and never reaches the campaign flight underneath.
  dialog.addEventListener('keydown',event=>{
    if(event.code==='ArrowUp'||event.code==='Space'&&(event.target===dialog||event.target===canvas)){
      event.preventDefault();if(!event.repeat)controller.lift();
    }
    event.stopPropagation();
  });
  canvas.addEventListener('pointerdown',event=>{event.preventDefault();controller.lift();});
  canvas.style.touchAction='none';
  const frame=now=>{if(closed)return;const elapsed=last?Math.min(.1,(now-last)/1000):0;last=now;if(!doc.hidden){controller.advance(elapsed);controller.render();}raf=view.requestAnimationFrame(frame);};
  start(mode);observer?.observe(stage);raf=view.requestAnimationFrame(frame);liftButton.focus({preventScroll:true});
  return dialog;
}

export function installComboLessons({document:doc=globalThis.document,beforeOpen=()=>{}}={}){
  if(!doc)return;
  ensureStyles(doc);
  const click=event=>{const trigger=event.target.closest?.(`[data-combo-lesson="${COMBO_LESSON_ID}"]`);if(!trigger)return;event.preventDefault();beforeOpen();openComboLesson({document:doc,returnFocus:trigger});};
  doc.addEventListener('click',click);return ()=>doc.removeEventListener('click',click);
}
