// A dream records simulation inputs, never run rewards or snapshots of the world.
import {getChoices} from './model.mjs?v=words-1';
import {getCardModifiers,isCardDreamRoute,isCardRun,DREAM_BASE_SECONDS,getCardDreamBonus} from './skill-cards.mjs?v=words-1';
const INPUTS=['beginLiftInput','endLiftInput','flap','activateAbility','activateFieldImpulse'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
export function dreamFingerprint(options={}){
  const modifiers = {...options.modifiers};
  delete modifiers.eventFavors;
  delete modifiers.flightBoon; // Waking benefits cannot change rehearsed physics.
  return JSON.stringify(ordered({simulation:'words-1',seed:options.seed,terrain:options.terrain,elite:!!options.elite,duration:options.duration,
    node:options.node,companions:options.companions,modifiers,flame:options.flame,condensedGlow:options.condensedGlow||0,condensedRemainder:options.condensedRemainder||0}));
}
export function dreamConfig(run={},node=run.current){
  if(isCardRun(run))return {duration:getCardModifiers(run).cardDream&&isCardDreamRoute(run,node)?DREAM_BASE_SECONDS+getCardDreamBonus(run):0,wake:3,sight:false};
  const s=run.skills||{};
  return {duration:s['main-dream']?(s['main-dream-deep']?16:s['main-dream-long']?12:8):0,
    wake:s['main-dream-wake']?4:3,sight:!!s['main-dream-deep']};
}
export function validateDreamPreset(preset,engine){
  return !!preset&&preset.version===1&&preset.fingerprint===dreamFingerprint(engine.options)
    &&Math.abs(preset.width-engine.width)<.01&&Math.abs(preset.height-engine.height)<.01&&preset.duration<=Number(engine.mod.dreamDuration||0)
    &&preset.duration>=6&&Array.isArray(preset.events)&&preset.events.length<=1000
    &&preset.events.every(event=>INPUTS.includes(event.action)&&Number.isInteger(event.frame)&&event.frame>=0&&event.frame<=preset.duration*60
      &&(event.action!=='activateFieldImpulse'||['up','down','right'].includes(event.args?.[0])));
}
export const dreamEye='<svg viewBox="0 0 32 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" shape-rendering="crispEdges"><path d="M4 9l4 4 4 2h8l4-2 4-4M6 13l-3 3m8 0-1 4m7-3v4m7-6 2 4"/></svg>';
export function dreamIndicatorMarkup(dream){
  if(dream?.phase!=='recording')return '';
  const duration=dream.duration;
  const remaining=clamp(dream.remaining??duration-(dream.engine?.time||0),0,duration);
  const seconds=Math.ceil(remaining),label='Dream';
  return `<div class="dream-countdown" role="meter" aria-label="${label} time remaining" aria-valuemin="0" aria-valuemax="${duration}" aria-valuenow="${seconds}" aria-valuetext="${seconds} seconds remaining"><span class="dream-clock-label" aria-hidden="true">${dreamEye}${label}<b>${seconds}s</b></span><span class="dream-clock-track" aria-hidden="true"><i style="transform:scaleX(${remaining/duration})"></i></span></div>`;
}
export function updateDreamIndicator(host,dream){
  if(!host)return;
  const phase=dream?.phase||'';
  if(host.dataset.phase!==phase){
    host.dataset.phase=phase;
    host.innerHTML=dreamIndicatorMarkup(dream);
  }
  const meter=host.firstElementChild;
  if(!meter||!dream)return;
  const remaining=clamp(dream.remaining,0,dream.duration),seconds=Math.ceil(remaining);
  meter.querySelector('i').style.transform=`scaleX(${remaining/dream.duration})`;
  if(meter.getAttribute('aria-valuenow')!==String(seconds)){
    meter.setAttribute('aria-valuenow',seconds);
    meter.setAttribute('aria-valuetext',`${seconds} seconds remaining`);
    meter.querySelector('b').textContent=seconds+'s';
  }
}
export function canDreamAt(run,node){
 if(!node||node.type==='support'||!run||run.attemptActive||run.victoryPending||run.banked||run.lives<=0||!dreamConfig(run,node).duration)return false;
 if(run.phase==='briefing')return run.current?.id===node.id;
 return getChoices(run).some(choice=>choice.id===node.id);
}

// Rebuild the live flight with the original fixed simulation steps behind
// the loading screen. Yield between short slices so Back and resize work.
export async function prepareDreamHandoff(engine){
  const dream=engine.dream;
  if(!engine.running||!engine.paused||engine.time!==0||dream?.phase!=='replay'||dream.preparing)return false;
  const {render,notify,sound}=engine;
  const silent=()=>{};
  dream.preparing=true;
  engine.render=silent;engine.notify=silent;engine.sound=silent;
  try{
    const frames=Math.ceil(dream.duration*60);
    let frame=0;
    while(frame<frames&&dream.phase==='replay'&&!engine.destroyed){
      const deadline=performance.now()+6;
      const end=Math.min(frames,frame+32);
      engine.paused=false;
      do{
        engine.step(1/60);frame++;
        if(engine.dying||engine.finished||engine.destroyed)return false;
      }while(frame<end&&dream.phase==='replay'&&performance.now()<deadline);
      engine.paused=true;
      if(frame<frames&&dream.phase==='replay')await new Promise(resolve=>setTimeout(resolve,0));
    }
    return !engine.destroyed&&dream.phase==='awakening'&&Math.abs(engine.time-dream.duration)<1e-6;
  }finally{
    engine.paused=true;
    engine.render=render;engine.notify=notify;engine.sound=sound;
    dream.preparing=false;
  }
}

export function attachDream(engine,{mode='record',preset,duration=engine.mod.dreamDuration,onReady=()=>{},onAwake=()=>{}}={}){
  if(mode==='replay'&&!validateDreamPreset(preset,engine))return null;
  if(mode!=='record'&&mode!=='replay'||!duration)return null;
  const dream={engine,mode,phase:mode==='record'?'recording':'replay',duration:clamp(mode==='replay'?preset.duration:duration,6,16),
    events:mode==='replay'?preset.events.map(event=>({...event,args:[...(event.args||[])]})):[],index:0,depth:0,internal:false,
    get active(){return this.phase==='recording'||this.phase==='replay'},
    get freeGlow(){return this.active},
    get state(){return {mode:this.mode,phase:this.phase,duration:this.duration,remaining:Math.max(0,this.duration-engine.time)}},
    resume(){
      if(this.phase!=='awakening')return false;
      this.phase='done';this.wokeAt=engine.time;engine.dreamCompleted=true;engine.resumeRampSeconds=Number(engine.mod.dreamWake)||3;
      engine.resume();return true;
    }};
  engine.dream=dream;
  engine.cardRhythm?.clear();engine.blackHoles?.stop();
  for(const name of INPUTS){
    const original=engine[name];
    engine[name]=function(...args){
      if(dream.mode==='replay'&&dream.active&&!dream.internal)return false;
      const record=dream.phase==='recording'&&!dream.depth&&this.running&&!this.paused;
      if(record&&dream.events.length<1000)dream.events.push({frame:Math.round(this.time*60),action:name,args:args.slice(0,1)});
      dream.depth++;
      try{return original.apply(this,args)}finally{dream.depth--}
    };
  }
  const stop=()=>{
    dream.internal=true;engine.endLiftInput(true);dream.internal=false;
    engine.paused=true;engine.lastFrame=0;engine.nextRenderAt=null;
    engine.cardRhythm?.clear();engine.blackHoles?.stop();
    if(engine.raf!=null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(engine.raf);
    engine.raf=null;engine.render();engine.notify();
  };
  const ready=(valid,reason='')=>{
    dream.phase=valid?'ready':'failed';stop();
    dream.result={valid,reason,preset:valid?{version:1,nodeId:engine.options.node?.id,fingerprint:dreamFingerprint(engine.options),width:engine.width,height:engine.height,duration:dream.duration,
      events:dream.events.map(event=>({...event,args:[...event.args]}))}:null};
    onReady(dream.result);
  };
  dream.onBuildChanged=()=>{
    if(dream.phase==='recording'){
      dream.phase='failed';
      dream.result={valid:false,preset:null,reason:'Your skills changed. Rehearse with your new build.'};
      stop();
    }else if(dream.phase==='replay'){
      dream.phase='awakening';
      stop();onAwake();
    }
  };
  const initialWidth=engine.width,initialHeight=engine.height,resize=engine.resize;
  engine.resize=function(...args){
    const result=resize.apply(this,args);
    if(dream.active&&(Math.abs(this.width-initialWidth)>.01||Math.abs(this.height-initialHeight)>.01)){
      if(mode==='record')ready(false,'The view changed. Rehearse again in the new orientation.');
      else{dream.phase='awakening';stop();onAwake();}
    }
    return result;
  };
  const step=engine.step;
  engine.step=function(dt){
    if(this.paused)return;
    if(dream.phase==='replay'){
      dream.internal=true;
      try{while(dream.index<dream.events.length&&dream.events[dream.index].frame<=Math.round(this.time*60)){
        const event=dream.events[dream.index++];this[event.action](...event.args);
      }}finally{dream.internal=false}
    }
    const result=step.call(this,dt);
    if(dream.active&&this.time+1e-7>=dream.duration&&!this.dying&&!this.finished){
      if(mode==='record')ready(true);
      else{dream.phase='awakening';stop();onAwake();}
    }
    return result;
  };
  const finish=engine.onFinish;
  engine.onFinish=result=>{if(mode==='record')ready(false,'The dream broke. Try a different opening.');else finish(result)};
  return dream;
}
