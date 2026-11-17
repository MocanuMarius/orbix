// The Guide follows the same present-motion cue as its chevron. No metronome,
// delayed callback or route prediction can survive an early Lift or a pause.
const unit=value=>Math.max(0,Math.min(1,Number(value)||0));
export function liftGuideAudioPhase(s){
 const cue=s?.liftGuide;
 if(!cue||s.paused||s.dying||s.completing||s.finished||s.tutorialAwaitingLift||s.alive===false||s.dream?.active||!(s.worldRate>0))return '';
 if(cue.late)return 'late';
 return Number.isFinite(cue.targetIn)&&cue.targetIn<=0?'target':cue.phase;
}

export function createLiftGuideAudio({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 let ctx,master,unlocked=false,disposed=false,phase='',flaps,rate=1,gain=1,targetTail=false,earnedTail=false;
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
  // A clean, dry wooden/glass pair sits above the warm score. The preparatory
  // A leads to D at the centre of the balanced-height window, not its early edge.
  silence();targetTail=target;master.gain.setValueAtTime(gain,ctx.currentTime);
  const pitch=target?1174.659:880,duration=(target?.17:.105)/Math.max(.1,rate),at=ctx.currentTime;
  for(const [multiple,amplitude]of [[1,target?.095:.06],[2,.011]]){
   const source=ctx.createOscillator(),envelope=ctx.createGain();
   source.type='sine';source.frequency.setValueAtTime(pitch*multiple*rate,at);
   envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(amplitude,at+.008);
   envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
   source.connect(envelope);envelope.connect(master);
   let ended=false;
   const voice={source,envelope,pitch:pitch*multiple,end(){if(ended)return;ended=true;voices.delete(voice);try{source.stop();}catch{}source.disconnect();envelope.disconnect();}};
   voices.add(voice);source.onended=()=>voice.end();source.start(at);source.stop(at+duration+.015);
  }
 }
 return {
  unlock,
  update(s,{enabled=true,gain:level=1,hidden=false}={}){
   if(disposed)return;
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
