// v1.0-music: the music rotation. Same public surface as createMusic in
// music.mjs, so the game switches (default on, `?music=1` for the original) and nothing else changes.
// - Five-plus pieces rotate in shuffled order with no immediate repeat; the
//   next one starts under the end of the current one and they cross over 8 s.
// - Three intensity levels per piece (calm, flowing, urgent) follow the game
//   state; changes land on a bar line and fade over 1-3 s.
// - Screen changes never restart the music. Pause ducks it; a hidden tab
//   suspends the audio clock; resume continues exactly where it was.
import {createLevelStore,levelGain} from './sound-level.mjs?v=polish-2';
import {createLiftGuideAudio} from './lift-guide-audio.mjs?v=polish-2';
import {PIECES,pieceById,createRotation,intensityFor,settleIntensity,compilePiece,ROTATION,MUSIC_TWO_CODE,LIFT_PERIOD,LIFT_BPM} from './music-score.mjs?v=music-two-2';
import {createSynth,createScorePlayer,createStemPlayer} from './music-synth.mjs?v=music-two-2';

export {MUSIC_TWO_CODE,LIFT_PERIOD,LIFT_BPM};
// Longer look-ahead and fewer ticks: the same notes, scheduled in fewer, larger batches (less per-tick work).
export const OVERLAP=8,LOOKAHEAD=2,TICK_MS=400;
// Overall level at the default setting: calibrated to the reference score's loudness (see the proof).
export const MUSIC_TRIM=.5;
/** Phase sync: nudges stop once the Lift beat is within this many seconds of the guide's grid. */
export const SYNC_TOLERANCE=.008;
export const PAUSE_DUCK=.4;
const unit=n=>Math.max(0,Math.min(1,Number(n)||0));
const sceneFromFlight=s=>s.dream?.mode==='record'?'dream':s.dying?'loss':s.completing?'clear':s.paused?'pause':s.boss?'boss':'flight';

export function createMusicTwo({storage=globalThis.localStorage,document=globalThis.document,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,AudioClass=globalThis.Audio,
 schedule=globalThis.setInterval,cancel=globalThis.clearInterval,createGuide=createLiftGuideAudio,random=Math.random,pieces=ROTATION,now=()=>globalThis.performance?.now?.()??Date.now(),listen=true,autoStart=true}={}){
 const key='wispbound-music-enabled';
 const volume=createLevelStore({storage,levelKey:'wispbound-music-level',lastKey:'wispbound-music-last',legacyOff:()=>storage?.getItem?.(key)==='false',onWrite:level=>storage?.setItem?.(key,String(level>0))});
 const rotation=createRotation(pieces.map(p=>p.id),random);
 const guide=createGuide();
 let ctx=null,synth=null,current=null,outgoing=[],timer=null,unlocked=false,destroyed=false,mode='menu',flight=null,guideSnapshot=null;
 let intensity={level:0,lowerSince:null},override=null,rate=1,fxGain=1,lanternPlays=0,running=false,lastReason='menu',suspendTimer=null;
 // Lift phase: wanted after a flight starts or resumes; grid = guide Lift moments {t0, period} on the audio clock.
 let syncWanted=false,syncGrid=null,lastGrid=null;
 const stats={ticks:0,schedulerMs:0,maxTickMs:0,audioStart:null,audioSeconds:0,pieces:[]};
 const enabled=()=>volume.level>0;
 const hidden=()=>!!document?.hidden;
 const ducked=()=>mode==='pause';
 const masterTarget=()=>enabled()?levelGain(volume.level)*MUSIC_TRIM*(ducked()?PAUSE_DUCK:1):0;
 const transport=()=>current?.transport()||{time:0,rate:1,bpm:88};
 const updateGuide=()=>guide.update(guideSnapshot,{enabled:enabled()&&unlocked&&!destroyed,gain:levelGain(volume.level)*fxGain,hidden:hidden(),transport:transport()});
 function ensureContext(){
  if(ctx||destroyed||!AudioContextClass)return !!ctx;
  try{ctx=new AudioContextClass({latencyHint:'playback'});}catch{try{ctx=new AudioContextClass();}catch{return false;}}
  synth=createSynth(ctx);stats.synth=synth.stats;return true;
 }
 function applyMaster(tau=.25){if(!synth)return;synth.master.gain.cancelScheduledValues(ctx.currentTime);synth.master.gain.setTargetAtTime(masterTarget(),ctx.currentTime,tau);}
 function applyMuffle(){if(!synth)return;const k=unit((rate-.3)/.7);synth.muffle.frequency.setTargetAtTime(rate>=.999?18000:1600+12000*k*k,ctx.currentTime,.3);}
 function makePlayer(id,{at,startBar=0,startSec,fadeIn=3,drumsFrom}={}){
  const piece=pieceById(id)||pieces.find(p=>p.id===id);
  stats.pieces.push(id);
  if(piece.stems){
   const segment=piece.segments[lanternPlays++%piece.segments.length];
   // The reference keeps exactly its present level: undo the synthesized pieces' trim.
   return createStemPlayer(synth,piece,{at,segment,startSec,level:intensity.level,rate,fadeIn,AudioClass,trim:1/MUSIC_TRIM});
  }
  return createScorePlayer(synth,piece,{at,startBar,level:intensity.level,rate,fadeIn,drumsFrom});
 }
 function startNext(at,end){
  const id=rotation.next(),fromStems=current?.kind==='stems';
  const span=Math.max(.5,(end??at+OVERLAP)-at);
  const mid=at+span/2,both=current?.kind==='score'&&!pieceById(id)?.stems;
  if(current){current.handOver(at,span,both?{drumsUntil:mid}:undefined);outgoing.push(current);}
  current=makePlayer(id,{at,fadeIn:current?span:3,drumsFrom:both?mid:-Infinity});
  // Same tempo, bar-aligned: the beat carries straight through a score-to-score hand-over.
  if(fromStems&&lastGrid&&(mode==='flight'||mode==='boss'))syncGrid=lastGrid;
 }
 /** Hand-over start: three bars before the end of a synthesized piece (on its bar line), 8 s for the stems. */
 function handOverStart(p){
  if(p.kind!=='score')return p.endTime()-OVERLAP;
  const c=p.compiled,barSec=c.beatSec*c.barBeats,bars=Math.max(1,Math.round(OVERLAP/barSec));
  return p.barTime(c.totalBars-bars);
 }
 function syncStep(){
  if(!syncGrid||!current||current.kind!=='score'||current.nudging)return;
  const time=ctx.currentTime,le=current.liftEvery,b=Math.ceil(current.beatAt(Math.max(current.scheduledTo,time))/le)*le;
  const beatTime=current.ctxAt(b),period=syncGrid.period;
  let err=((beatTime-syncGrid.t0)%period+period)%period;if(err>period/2)err-=period;
  stats.lastSyncError=err;
  if(Math.abs(err)<=SYNC_TOLERANCE){syncGrid=null;return;}
  const shift=current.nudge(-err);
  for(const p of outgoing)if(p.kind==='score'&&!p.disposed)p.nudge(shift);
  stats.nudges=(stats.nudges||0)+1;
 }
 function tick(){
  if(!running||!ctx||destroyed)return;
  const t0=now(),time=ctx.currentTime;
  const wanted=override!=null?{level:override,reason:'lab'}:intensityFor(mode,flight);
  const asked=wanted.level;lastReason=wanted.reason;
  intensity=settleIntensity(intensity,asked,time);
  if(!current&&autoStart)startNext(time+.1);
  if(current){
   if(current.level!==intensity.level)current.setLevel(intensity.level);
   current.scheduleUntil(time+LOOKAHEAD);
   syncStep();
   const handAt=handOverStart(current);
   if(!current.handingOver&&time+LOOKAHEAD>=handAt){const end=current.endTime();startNext(Math.max(time+.05,handAt),end);current.scheduleUntil(time+LOOKAHEAD);}
  }
  for(const p of outgoing)p.scheduleUntil(time+LOOKAHEAD);
  outgoing=outgoing.filter(p=>!p.disposed);
  const cost=now()-t0;stats.ticks++;stats.schedulerMs+=cost;if(cost>stats.maxTickMs)stats.maxTickMs=cost;
  if(stats.audioStart===null)stats.audioStart=time;stats.audioSeconds=time-stats.audioStart;
 }
 const canRun=()=>enabled()&&unlocked&&!hidden()&&!destroyed;
 function run(){
  if(!canRun()||!ensureContext())return;
  clearTimeout(suspendTimer);suspendTimer=null;
  if(ctx.state==='suspended')Promise.resolve(ctx.resume()).catch(()=>{});
  for(const p of [current,...outgoing])p?.resume?.();
  applyMaster(.35);applyMuffle();
  if(!running){running=true;timer=schedule(tick,TICK_MS);}
  tick();
 }
 function halt(){
  if(timer!==null){cancel(timer);timer=null;}
  running=false;guide.stop();
  if(!ctx)return;
  for(const p of [current,...outgoing])p?.suspend?.();
  // A quick fade first, so a mute never clicks; then the audio clock stops.
  applyMaster(.03);clearTimeout(suspendTimer);
  suspendTimer=setTimeout(()=>{suspendTimer=null;if(!running&&ctx&&ctx.state==='running')Promise.resolve(ctx.suspend()).catch(()=>{});},120);
 }
 const gesture=e=>{if(e?.target?.closest?.('[data-action="music"],[data-level-mute="music"],[data-level-bars="music"]'))return;unlocked=true;if(enabled()){guide.unlock();run();}};
 const visibility=()=>{if(hidden())halt();else run();};
 if(listen&&document?.addEventListener){
  document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
  document.addEventListener('keydown',gesture,{capture:true});
  document.addEventListener('visibilitychange',visibility);
 }
 const applyLevel=()=>{unlocked=true;if(enabled()){guide.unlock();run();updateGuide();}else halt();};
 function setMode(next){
  const wasDucked=ducked();mode=next;
  if(wasDucked!==ducked()&&running)applyMaster(ducked()?.35:.6);
 }
 function setRate(next){
  if(Math.abs(next-rate)<.02)return;rate=next;
  for(const p of [current,...outgoing])p?.setRate(rate);
  applyMuffle();
 }
 const api={
  code:MUSIC_TWO_CODE,version:2,
  get enabled(){return enabled()},get level(){return volume.level},get lastLevel(){return volume.last},get mode(){return mode},
  getTransport:transport,
  setScene(next,pressure=0){if(destroyed)return;guideSnapshot=null;guide.stop();if(next!=='flight'&&next!=='boss')flight=null;
   if((next==='flight'||next==='boss')&&mode!=='flight'&&mode!=='boss'){syncWanted=true;syncGrid=null;}
   setMode(next);if(next!=='flight'&&next!=='boss'&&next!=='dream')setRate(1);},
  setFlight(s){
   if(destroyed||!s)return;guideSnapshot=s;flight=s;
   const nextMode=sceneFromFlight(s);if((nextMode==='flight'||nextMode==='boss')&&mode!=='flight'&&mode!=='boss'){syncWanted=true;syncGrid=null;}
   setMode(nextMode);
   // The first guide Lift moment after a start or a pause fixes the beat phase; later Lifts are not chased.
   const cue=s.liftGuide,world=Number(s.worldRate)||0;
   if(syncWanted&&ctx&&cue&&!cue.late&&Number.isFinite(cue.targetIn)&&cue.targetIn>0&&world>0&&!s.paused){
    syncWanted=false;syncGrid=lastGrid={t0:ctx.currentTime+cue.targetIn/world,period:LIFT_PERIOD/world};
   }
   const w=Number(s.worldRate);setRate(!s.paused&&w>0&&w<1?Math.max(.3,w):1);
   updateGuide();
  },
  setEnabled(value){if(destroyed)return;volume.setEnabled(!!value);applyLevel();},
  /** Same as a user gesture: the loader calls it when the gesture came before this module. */
  unlock(){if(!destroyed)gesture();},
  setLevel(value){if(destroyed)return;volume.set(value);applyLevel();},
  /** FX level gain (sound-level.mjs) for the Lift cue, which is an effect. */
  setFxGain(value){fxGain=Math.max(0,Number(value)||0);},
  destroy(){
   if(destroyed)return;destroyed=true;halt();guide.destroy();
   for(const p of [current,...outgoing])p?.dispose();current=null;outgoing=[];
   synth?.destroy();try{Promise.resolve(ctx?.close()).catch(()=>{});}catch{}
   if(listen&&document?.removeEventListener){document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility);}
  },
  // ------------------------------------------------ lab and diagnostics
  /** Start a given piece now (lab). `skipToHandover` starts it 15 s before its hand-over point. */
  play(id,{skipToHandover=false}={}){
   if(destroyed)return;unlocked=true;if(!enabled())volume.set(volume.last||3);
   if(!ensureContext())return;rotation.choose(id);
   const at=ctx.currentTime+.08,piece=pieceById(id)||pieces.find(p=>p.id===id);if(!piece)return;
   if(current){current.handOver(at,1.2);outgoing.push(current);}
   let startBar=0,startSec;
   if(skipToHandover){
    if(piece.stems){const seg=piece.segments[lanternPlays%piece.segments.length],barSec=60/piece.bpm*piece.beatsPerBar;startSec=seg[1]*barSec-OVERLAP-15;}
    else{const c=compilePiece(piece),barSec=c.beatSec*c.barBeats;startBar=Math.max(0,Math.floor((c.duration-OVERLAP-15)/barSec));}
   }
   current=makePlayer(id,{at,startBar,startSec,fadeIn:skipToHandover?.6:2});
   run();
  },
  /** Lab and proof: pretend a flight started with the guide's first Lift moment `inSeconds` from now. */
  syncTo(inSeconds,worldRate=1){if(!ctx)return;syncGrid=lastGrid={t0:ctx.currentTime+inSeconds/worldRate,period:LIFT_PERIOD/worldRate};},
  /** Fade everything out and stay silent until play() (lab). */
  stopAll(){if(!ctx)return;const at=ctx.currentTime+.02;for(const p of [current,...outgoing])p?.handOver(at,1.2);if(current)outgoing.push(current);current=null;api.autoStartOff=true;},
  set autoStartOff(v){autoStart=!v;},
  /** Force an intensity level (lab), or null to follow the game. */
  setOverride(level){override=level==null?null:Math.max(0,Math.min(2,level|0));if(override!=null)intensity={level:override,lowerSince:null};tick();},
  resumeRotation(){if(destroyed)return;unlocked=true;autoStart=true;if(!enabled())volume.set(volume.last||3);run();},
  info(){const p=current?.position?.();const tr=current?.transport?.();return {piece:current?.piece.id||null,title:current?.piece.title||'',position:p||null,beat:tr?.beat??0,liftEvery:tr?.liftEvery??2,sync:syncGrid?'syncing':lastGrid?'locked':'free',level:intensity.level,reason:lastReason,next:rotation.peek(),history:[...rotation.history],outgoing:outgoing.length,rate,state:ctx?.state||'none'};},
  get stats(){return {...stats,live:synth?.stats.live??0,voices:synth?.stats};},
  get context(){return ctx;},
 };
 return api;
}
