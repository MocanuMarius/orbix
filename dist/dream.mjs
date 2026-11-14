// A dream records simulation inputs, never run rewards or snapshots of the world.
const INPUTS=['beginLiftInput','endLiftInput','flap','activateAbility'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
export function dreamFingerprint(options={}){
  return JSON.stringify(ordered({simulation:'packing-1',seed:options.seed,terrain:options.terrain,elite:!!options.elite,duration:options.duration,
    node:options.node,companions:options.companions,modifiers:options.modifiers,flame:options.flame,condensedGlow:options.condensedGlow||0,condensedRemainder:options.condensedRemainder||0}));
}
export function dreamConfig(run={}){
  const s=run.skills||{};
  return {duration:s['main-dream']?(s['main-dream-deep']?10:s['main-dream-long']?8:6):0,
    wake:s['main-dream-wake']?4:3,sight:!!s['main-dream-sight']};
}
export function validateDreamPreset(preset,engine){
  return !!preset&&preset.version===1&&preset.fingerprint===dreamFingerprint(engine.options)
    &&Math.abs(preset.width-engine.width)<.01&&Math.abs(preset.height-engine.height)<.01&&preset.duration<=Number(engine.mod.dreamDuration||0)
    &&preset.duration>=6&&Array.isArray(preset.events)&&preset.events.length<=1000
    &&preset.events.every(event=>INPUTS.includes(event.action)&&Number.isInteger(event.frame)&&event.frame>=0&&event.frame<=preset.duration*60);
}
export const dreamEye='<svg viewBox="0 0 32 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" shape-rendering="crispEdges"><path d="M4 9l4 4 4 2h8l4-2 4-4M6 13l-3 3m8 0-1 4m7-3v4m7-6 2 4"/></svg>';
const pauseIcon='<svg viewBox="0 0 32 24" aria-hidden="true" fill="currentColor"><path d="M9 4h4v16H9zM19 4h4v16h-4z"/></svg>';
export function dreamIndicatorMarkup(dream){
  if(!dream||dream.phase==='done')return '';
  const paused=['awakening','ready','failed'].includes(dream.phase);
  return `<div class="dream-indicator ${paused?'is-paused':''}" aria-label="${paused?'Dream paused':dream.mode==='record'?'Rehearsing dream':'Dream playback'}">${paused?pauseIcon:dreamEye}<span>${paused?'':Math.max(0,Math.ceil(dream.duration-(dream.engine?.time||0)))+'s'}</span></div>`;
}
export function dreamRestMarkup(run,node){
  const unlocked=dreamConfig(run).duration>0;
  return `<button data-action="${unlocked?'dream':'inspect-main-skill'}" ${unlocked?'':'data-id="main-dream"'} class="rest-dream" aria-label="${unlocked?'Dream':'Dream locked · View unlock skill'}">${dreamEye}<span>DREAM</span>${unlocked?'':'<i class="item-lock-badge" aria-hidden="true"><svg viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="2" shape-rendering="crispEdges"><path d="M4 7V4h2V2h4v2h2v3M2 7h12v9H2zM8 10v3"/></svg></i>'}${unlocked?`<small>${dreamConfig(run).duration}s · ${run.dreamPreset?'PRESET SAVED':'REHEARSE'}</small>`:''}</button>`;
}

export function attachDream(engine,{mode='record',preset,duration=engine.mod.dreamDuration,onReady=()=>{},onAwake=()=>{}}={}){
  if(mode==='replay'&&!validateDreamPreset(preset,engine))return null;
  if(mode!=='record'&&mode!=='replay'||!duration)return null;
  const dream={engine,mode,phase:mode==='record'?'recording':'replay',duration:clamp(mode==='replay'?preset.duration:duration,6,10),
    events:mode==='replay'?preset.events.map(event=>({...event,args:[...(event.args||[])]})):[],index:0,depth:0,internal:false,
    get active(){return this.phase==='recording'||this.phase==='replay'},
    get freeGlow(){return this.active},
    get state(){return {mode:this.mode,phase:this.phase,duration:this.duration,remaining:Math.max(0,this.duration-engine.time)}},
    resume(){
      if(this.phase!=='awakening')return false;
      this.phase='done';engine.dreamCompleted=true;engine.resumeRampSeconds=Number(engine.mod.dreamWake)||3;
      engine.resume();return true;
    }};
  engine.dream=dream;
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
    if(engine.raf!=null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(engine.raf);
    engine.raf=null;engine.render();engine.notify();
  };
  const ready=(valid,reason='')=>{
    dream.phase=valid?'ready':'failed';stop();
    onReady({valid,reason,preset:valid?{version:1,fingerprint:dreamFingerprint(engine.options),width:engine.width,height:engine.height,duration:dream.duration,
      events:dream.events.map(event=>({...event,args:[...event.args]}))}:null});
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
