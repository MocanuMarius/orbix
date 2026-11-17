// The Guide follows the same present-motion cue as its chevron. No metronome,
// delayed callback or route prediction can survive an early Lift or a pause.
const unit=value=>Math.max(0,Math.min(1,Number(value)||0));
export function liftGuideAudioPhase(s){
 const cue=s?.liftGuide;
 if(!cue||s.paused||s.dying||s.completing||s.finished||s.tutorialAwaitingLift||s.alive===false||s.dream?.active||!(s.worldRate>0))return '';
 if(cue.late)return 'late';
 return Number.isFinite(cue.targetIn)&&cue.targetIn<=0?'target':cue.phase;
}

// The Lift cue (guide-clarity-2, 17 November 2026). The owner found the old
// pair too intrusive: bare sines at 880 Hz and 1175 Hz, peaks .06 and .095,
// right in the effects' 1-3 kHz band. Now: rounded triangles through a gentle
// low-pass, about 7 dB quieter, 12 ms attacks, a rising fifth no longer than
// 120 ms, a ±1.5% pitch drift between repeats, at most one cue per 250 ms and
// quieter when the same cue repeats within a second. The cue is pitched to
// the music: the preparation is the fifth of the current key and the target
// rises root to fifth, so it sounds like part of the song (D when the music
// does not report a key, which is the reference score's key).
export const LIFT_CUE_KEY=2;
/** Frequency factor that moves the D-based cue to key pitch class `key` (nearest: -5 to +6 semitones). */
export const liftCueTranspose=key=>Number.isFinite(key)?2**((((Math.round(key)-LIFT_CUE_KEY)%12+17)%12-5)/12):1;
export const LIFT_CUE_MIN_GAP=.25,LIFT_CUE_WOBBLE=.015,LIFT_CUE_REPEAT_SCALE=.6;
export const LIFT_CUE={
 // [frequency Hz, start s, peak, attack s, length s]
 new:{soon:[[880,0,.03,.012,.11]],target:[[587.33,0,.03,.01,.085],[880,.045,.034,.012,.075]],type:'triangle',lowpass:1500},
 old:{soon:[[880,0,.06,.008,.105],[1760,0,.011,.008,.105]],target:[[1174.659,0,.095,.008,.17],[2349.318,0,.011,.008,.17]],type:'sine',lowpass:0},
};
/** Build one cue on `ctx` into `destination`; returns its voices ({source,envelope,nodes,pitch}). Also used by the lab and the proof. */
export function playLiftCue(ctx,destination,{kind='target',version='new',at=ctx.currentTime,rate=1,wobble=1,scale=1,key}={}){
 const spec=LIFT_CUE[version],stretch=1/Math.max(.1,rate),out=[];
 if(version==='new')wobble*=liftCueTranspose(key);
 for(const [frequency,start,peak,attack,length] of spec[kind]){
  const source=ctx.createOscillator(),envelope=ctx.createGain(),t=at+start*stretch,nodes=[source,envelope];
  source.type=spec.type;source.frequency.setValueAtTime(frequency*wobble*rate,t);
  envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(peak*scale,t+attack);
  envelope.gain.exponentialRampToValueAtTime(.0001,t+length*stretch);
  if(spec.lowpass){const lp=ctx.createBiquadFilter?.();if(lp){lp.type='lowpass';lp.frequency.value=spec.lowpass;lp.Q.value=.5;source.connect(lp);lp.connect(envelope);nodes.push(lp);}else source.connect(envelope);}
  else source.connect(envelope);
  envelope.connect(destination);
  source.start(t);source.stop(t+length*stretch+.015);
  out.push({source,envelope,nodes,pitch:frequency*wobble});
 }
 return out;
}

export function createLiftGuideAudio({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,random=Math.random}={}){
 let ctx,master,unlocked=false,disposed=false,phase='',flaps,rate=1,gain=1,targetTail=false,earnedTail=false,lastToneAt=-Infinity,key=LIFT_CUE_KEY;
 const lastKindAt={};
 const voices=new Set();
 function silence(hard=false){
  if(!ctx)return;
  targetTail=false;earnedTail=false;
  for(const voice of [...voices]){
   if(hard){voice.end();continue;}
   if(voice.retiring)continue;
   voice.retiring=true;
   // Release suppressed preparations without an electrical edge. This also
   // cancels each source's scheduled tail; it cannot return after a pause.
   const param=voice.envelope.gain;
   if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(ctx.currentTime);
   else param.cancelScheduledValues(ctx.currentTime);
   param.setTargetAtTime(.0001,ctx.currentTime,.002);
   try{voice.source.stop(ctx.currentTime+.009);}catch{}
  }
 }
 function unlock(){
  if(disposed)return false;
  unlocked=true;
  try{
   if(!ctx&&AudioContextClass){ctx=new AudioContextClass();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);}
   if(ctx?.state==='suspended')Promise.resolve(ctx.resume()).catch(()=>{});
   return !!ctx;
  }catch{return false;}
 }
 function tone(target){
  if(!ctx||ctx.state!=='running')return;
  // The preparatory fifth leads to a soft rising fifth (root to fifth) at the
  // centre of the balanced-height window. Rate-limited, and quieter when repeated.
  const at=ctx.currentTime,kind=target?'target':'soon';
  if(at-lastToneAt<LIFT_CUE_MIN_GAP)return;
  const repeated=at-(lastKindAt[kind]??-Infinity)<1;
  lastToneAt=at;lastKindAt[kind]=at;
  silence();targetTail=target;master.gain.setValueAtTime(gain,at);
  const wobble=1+(Math.max(0,Math.min(1,random()))*2-1)*LIFT_CUE_WOBBLE;
  for(const voice of playLiftCue(ctx,master,{kind,at,rate,wobble,key,scale:repeated?LIFT_CUE_REPEAT_SCALE:1})){
   voice.end=()=>{if(voice.ended)return;voice.ended=true;voices.delete(voice);try{voice.source.stop();}catch{}for(const n of voice.nodes)n.disconnect();};
   voices.add(voice);voice.source.onended=()=>voice.end();
  }
 }
 return {
  unlock,
  update(s,{enabled=true,gain:level=1,hidden=false,transport}={}){
   if(disposed)return;
   key=Number.isFinite(transport?.key)?transport.key:LIFT_CUE_KEY;
   const next=liftGuideAudioPhase(s),lifted=flaps!==undefined&&s?.flaps!==flaps;
   const previous=phase,acceptedTarget=lifted&&phase==='target'&&targetTail;
   phase=next;flaps=s?.flaps;rate=Math.max(.1,unit(s?.worldRate));gain=unit(level);
   const stopped=s?.paused||s?.dying||s?.completing||s?.finished||s?.tutorialAwaitingLift||s?.alive===false||s?.dream?.active||!(s?.worldRate>0);
   if(!enabled||hidden||!unlocked||!gain||stopped){silence();return;}
   if(ctx){
    master.gain.setValueAtTime(gain,ctx.currentTime);
    for(const voice of voices)if(!voice.retiring)voice.source.frequency.setValueAtTime(voice.pitch*rate,ctx.currentTime);
   }
   // A correctly timed manual Lift earns the small resolving tail. Early Lift
   // cancels its preparation. Other Guide disappearance remains quiet.
   if(acceptedTarget){earnedTail=true;return;}
   if(earnedTail&&!next&&!lifted)return;
   if(!next||next==='late'||lifted){silence();return;}
   if(next==='soon'&&previous!=='soon')tone(false);
   else if(next==='target'&&previous!=='target')tone(true);
  },
  stop(){silence();},
  destroy(){if(disposed)return;disposed=true;silence(true);master?.disconnect();try{Promise.resolve(ctx?.close()).catch(()=>{});}catch{}},
 };
}
