// v1.1-music: a small WebAudio lo-fi band. Everything is scheduled ahead on
// the audio clock by a lookahead scheduler (the owner calls scheduleUntil from
// a slow timer, never per frame). Every note is one to four oscillators with a
// soft envelope and is collected when it ends. No pads, no drones, no noise:
// even the drums are pitched (a kick is a sine with a fast pitch drop, the rim
// a short wooden tok, the "hat" a soft high tick). No ScriptProcessor and no
// convolution: the room is four damped feedback delays.
import {compilePiece} from './music-score.mjs?v=music-two-2';

const hz=m=>440*2**((m-69)/12);
// partials: [waveform, ratio, amplitude, decay scale]. env 'piano': attack, natural decay, release at note-off.
export const INSTRUMENTS={
 rhodes: {partials:[['sine',1,1,1],['sine',2,.25,.46],['sine',3,.065,.18]],a:.008,decay:2.5,r:.35,gain:.09,flutter:true,priority:2},
 felt:   {partials:[['sine',1,1,1],['sine',2,.23,.47],['sine',3,.085,.22]],a:.014,decay:1.8,r:.3,gain:.1,flutter:true,priority:3},
 vibes:  {partials:[['sine',1,1,1],['sine',4,.1,.12]],a:.006,decay:2.2,r:.45,gain:.095,flutter:true,priority:3},
 kalimba:{partials:[['sine',1,1,1],['sine',3,.05,.1]],a:.006,decay:1.4,r:.25,gain:.11,flutter:true,priority:3},
 pluck:  {partials:[['triangle',1,1,1],['sine',2,.18,.3]],a:.006,decay:.95,r:.2,lp:1600,gain:.11,flutter:true,priority:3},
 bass:   {partials:[['sine',1,1,1],['sine',2,.31,.8],['sine',3,.12,.6]],a:.009,decay:1.2,r:.12,gain:.085,priority:2.5},
 kick:   {partials:[['sine',1,1,1],['triangle',2,.12,.5]],a:.0025,decay:.28,r:.05,drop:1.3,dropTime:.045,gain:.15,priority:4,perc:true},
 rim:    {partials:[['sine',1,1,1],['sine',.5,.5,1.6]],a:.002,decay:.07,r:.03,drop:.25,dropTime:.015,gain:.075,priority:2.5,perc:true},
 snare:  {partials:[['sine',1,1,1],['triangle',2.3,.25,.5],['sine',4.1,.08,.3]],a:.002,decay:.16,r:.04,drop:.35,dropTime:.02,gain:.085,priority:2.5,perc:true},
 tick:   {partials:[['sine',1,1,1]],a:.002,decay:.03,r:.02,drop:.04,dropTime:.01,gain:.016,priority:1,perc:true},
};
export const newStats=()=>({live:0,created:0,notes:0,dropped:0,peakVoices:0,peakLive:0});

export function createSynth(ctx,{destination=ctx.destination,stats=newStats(),voiceCap=12}={}){
 const track=n=>{stats.live+=n;stats.created+=n;if(stats.live>stats.peakLive)stats.peakLive=stats.live;};
 const free=n=>{stats.live-=n;};
 const gain=(value=1)=>{const g=ctx.createGain();g.gain.value=value;return g;};
 const filter=(type,frequency,q=.5)=>{const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=frequency;f.Q.value=q;return f;};
 // Master: level/duck, soft saturation, lo-fi low-pass (also the time-dilation muffle), safety limiter.
 const master=gain(0),drive=ctx.createWaveShaper?.()||gain(1),muffle=filter('lowpass',6500,.5),highpass=filter('highpass',30,.5),limiter=ctx.createDynamicsCompressor();
 if(drive.curve!==undefined){const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(1.4*x)/Math.tanh(1.4);}drive.curve=c;drive.oversample='none';}
 limiter.threshold.value=-9;limiter.knee.value=8;limiter.ratio.value=4;limiter.attack.value=.01;limiter.release.value=.3;
 master.connect(drive);drive.connect(muffle);muffle.connect(highpass);highpass.connect(limiter);limiter.connect(destination);
 // Room: band-limited send into four damped feedback delays.
 const send=gain(1),sendHp=filter('highpass',260,.5),sendLp=filter('lowpass',2400,.5),wet=gain(.26);
 send.connect(sendHp);sendHp.connect(sendLp);wet.connect(master);
 const room=[];
 for(const [time,feedback] of [[.113,.42],[.167,.4],[.241,.37],[.293,.34]]){
  const delay=ctx.createDelay(1),damp=filter('lowpass',2000,.3),loop=gain(feedback);
  delay.delayTime.value=time;sendLp.connect(delay);delay.connect(damp);damp.connect(loop);loop.connect(delay);damp.connect(wet);
  room.push(delay,damp,loop);
 }
 // Tape flutter: one slow LFO, a few cents, shared by the keys and leads.
 const flutterLfo=ctx.createOscillator(),flutter=gain(4);flutterLfo.frequency.value=.43;flutterLfo.connect(flutter);flutterLfo.start();
 const fixed=[master,drive,muffle,highpass,limiter,send,sendHp,sendLp,wet,...room,flutterLfo,flutter];
 track(fixed.length);
 let active=[];
 function admit(t,end,priority){
  if(active.length>64)active=active.filter(v=>v.end>ctx.currentTime);
  let count=0;for(const v of active)if(v.start<=t+.001&&v.end>t)count++;
  const allowed=priority>=4?voiceCap+6:priority>=3?voiceCap+3:priority>=2.5?voiceCap+2:priority>=2?voiceCap+1:voiceCap;
  if(count>=allowed){stats.dropped++;return false;}
  active.push({start:t,end});if(count+1>stats.peakVoices)stats.peakVoices=count+1;return true;
 }
 /** One note. Returns false when the voice budget refuses it. */
 function note(dest,inst,midi,t,dur,vel,{rate=1}={}){
  const spec=INSTRUMENTS[inst];if(!spec)return false;
  const off=t+Math.max(spec.a*2,spec.perc?Math.min(dur,spec.decay):dur),end=off+spec.r*1.2;
  // Long quiet tails count only for their audible part.
  if(!admit(t,Math.min(end,t+spec.a+spec.decay*.45),spec.priority))return false;
  const f=hz(midi)*rate,peak=spec.gain*vel,nodes=[],oscs=[];
  let out=dest,lp=null;
  if(spec.lp){lp=filter('lowpass',spec.lp,.4);lp.connect(dest);out=lp;}
  for(const [type,ratio,amp,decayScale] of spec.partials){
   const osc=ctx.createOscillator(),env=ctx.createGain(),p=peak*amp,tau=spec.decay*decayScale/3;
   osc.type=type;
   if(spec.drop){osc.frequency.setValueAtTime(f*ratio*(1+spec.drop),t);osc.frequency.exponentialRampToValueAtTime(f*ratio,t+spec.dropTime);}
   else osc.frequency.value=f*ratio;
   env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(p,t+spec.a);
   env.gain.setTargetAtTime(0,t+spec.a,tau);
   env.gain.setTargetAtTime(0,off,spec.r/6);
   osc.connect(env);env.connect(out);
   if(spec.flutter)flutter.connect(osc.detune);
   osc.start(t);osc.stop(end+.02);
   nodes.push(osc,env);oscs.push(osc);
  }
  const count=nodes.length+(lp?1:0);track(count);stats.notes++;
  oscs[0].onended=()=>{
   if(spec.flutter)for(const osc of oscs)try{flutter.disconnect(osc.detune);}catch{}
   for(const n of nodes)n.disconnect();lp?.disconnect();free(count);
  };
  return true;
 }
 return {ctx,master,muffle,send,stats,note,gain,filter,track,free,
  destroy(){try{flutterLfo.stop();}catch{}for(const n of fixed)try{n.disconnect();}catch{}free(fixed.length);},
 };
}

// ------------------------------------------------------------ score piece
/** A synthesized piece. `at` is the audio time of its first scheduled beat (startBar). */
export function createScorePlayer(synth,piece,{at,startBar=0,level=0,rate=1,fadeIn=3,mute=null,drumsFrom=-Infinity}={}){
 const DRUMS=new Set(['kick','rim','tick']);let drumsUntil=Infinity;
 const {ctx}=synth,c=compilePiece(piece),B=c.barBeats,base=piece.bpm/60;
 // Piecewise tempo map: [{beat,time,bps}], so a phase nudge never moves what is already scheduled.
 let anchors=[{beat:startBar*B,time:at,bps:base*rate}],currentRate=rate,scheduledTo=at,nudgeUntil=-Infinity;
 const seg=b=>{let a=anchors[0];for(const x of anchors)if(x.beat<=b)a=x;return a;};
 const segT=t=>{let a=anchors[0];for(const x of anchors)if(x.time<=t)a=x;return a;};
 const ctxAt=b=>{const a=seg(b);return a.time+(b-a.beat)/a.bps;};
 const beatAt=t=>{const a=segT(t);return a.beat+(t-a.time)*a.bps;};
 const addAnchor=(beat,bps)=>{const time=ctxAt(beat);anchors=anchors.filter(x=>x.beat<beat);anchors.push({beat,time,bps});if(anchors.length>8)anchors=anchors.slice(-8);};
 let ei=c.events.findIndex(e=>e.beat>=startBar*B-1e-9);if(ei<0)ei=c.events.length;
 let stopAt=Infinity,disposed=false,playerLevel=level;
 const nodes=[];const keep=n=>{nodes.push(n);return n;};
 const out=keep(synth.gain(0)),send=keep(synth.gain(.22));out.connect(synth.master);out.connect(send);send.connect(synth.send);
 const layers=[0,1,2].map(i=>{const g=keep(synth.gain(i<=level?1:0));g.connect(out);return g;});
 const layerState=layers.map((_,i)=>({on:i<=level,prev:i<=level,change:-Infinity}));
 synth.track(nodes.length);
 const startAt=Math.max(at,ctx.currentTime);
 out.gain.setValueAtTime(0,startAt);out.gain.linearRampToValueAtTime(1,startAt+Math.max(.01,fadeIn));
 const active=(layer,beat)=>{if(!layer)return true;const s=layerState[layer];if(beat<s.change)return s.prev;return s.on||beat<s.change+B;};
 const player={
  piece,compiled:c,kind:'score',handingOver:false,
  get level(){return playerLevel},get disposed(){return disposed},get scheduledTo(){return scheduledTo},
  get liftEvery(){return c.liftEvery},
  beatAt,ctxAt,
  scheduleUntil(horizon){
   if(disposed)return;
   // Collected on the audio clock once the fade is over and the last tails have gone.
   if(ctx.currentTime>stopAt+3){player.dispose();return;}
   const hb=Math.min(beatAt(horizon),c.totalBeats);
   while(ei<c.events.length&&c.events[ei].beat<hb){
    const e=c.events[ei++],t=ctxAt(e.beat);
    if(t<ctx.currentTime-.02||t>stopAt-.1||!active(e.layer,e.beat)||mute?.has(e.part))continue;
    // During a cross-over only one piece plays the drums: the outgoing one up to the midpoint, then the incoming one.
    if(DRUMS.has(e.part)&&(t<drumsFrom-.02||t>=drumsUntil-.02))continue;
    const bps=seg(e.beat).bps;
    synth.note(layers[e.layer],e.inst,e.midi,Math.max(t,ctx.currentTime),e.dur/bps,e.vel,{rate:currentRate});
   }
   scheduledTo=Math.max(scheduledTo,horizon);
  },
  /** Change intensity at the first bar line after what is already scheduled; 1-3 s fades. */
  setLevel(next){
   if(disposed||next===playerLevel)return;
   playerLevel=next;
   const from=Math.max(scheduledTo,ctx.currentTime),boundary=Math.ceil(beatAt(from)/B-1e-6)*B,t=ctxAt(boundary);
   layers.forEach((g,i)=>{
    if(!i)return;const on=i<=next,s=layerState[i];if(on===s.on)return;
    s.prev=s.on;s.on=on;s.change=boundary;
    g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(on?1:0,t,on?.45:.75);
   });
  },
  /** World time scaling (dilation): tempo and pitch together, after what is already scheduled. */
  setRate(next){
   if(disposed||Math.abs(next-currentRate)<.01)return;
   const t=Math.max(scheduledTo,ctx.currentTime),b=beatAt(t);
   const scale=next/currentRate;currentRate=next;
   anchors=anchors.filter(x=>x.time<=t);const a=seg(b);anchors.push({beat:b,time:t,bps:a.bps*scale});
   // A pending nudge keeps its shape: re-add its return to the base tempo.
   if(nudgeUntil>b){anchors.push({beat:nudgeUntil,time:ctxAt(nudgeUntil),bps:base*next});}
  },
  /** Shift the beat by `delta` seconds (positive: later) over `bars` bars from the next bar line,
   *  bounded to ±6% tempo. Returns the shift actually applied. */
  nudge(delta,bars=2){
   if(disposed)return 0;
   const from=Math.max(scheduledTo,ctx.currentTime),b0=Math.ceil(beatAt(from)/B-1e-6)*B,span=bars*B;
   const bps=base*currentRate,length=span/bps,limit=.06*length;
   const shift=Math.max(-limit,Math.min(limit,delta));
   addAnchor(b0,span/(length+shift));addAnchor(b0+span,bps);nudgeUntil=b0+span;
   return shift;
  },
  get nudging(){return nudgeUntil>beatAt(ctx.currentTime);},
  endTime(){return ctxAt(c.totalBeats);},
  /** Audio time of the first beat of bar `bar`. */
  barTime(bar){return ctxAt(bar*B);},
  handOver(t,dur,{drumsUntil:until=Infinity}={}){
   if(disposed)return;
   player.handingOver=true;stopAt=t+dur+.15;drumsUntil=until;
   const level=out.gain,start=Math.max(t,ctx.currentTime),now=Math.min(1,Math.max(0,(start-startAt)/Math.max(.01,fadeIn)));
   level.cancelScheduledValues(start);level.setValueAtTime(now,start);level.linearRampToValueAtTime(0,start+dur);
  },
  transport(){
   const beat=Math.max(0,Math.min(c.totalBeats-1e-6,beatAt(ctx.currentTime))),bar=c.bars[Math.min(c.bars.length-1,Math.floor(beat/B))];
   return {time:beat*c.beatSec,rate:currentRate,bpm:piece.bpm,chord:bar?.fx,key:piece.tonic%12,beat,liftEvery:c.liftEvery};
  },
  position(){const beat=Math.max(0,beatAt(ctx.currentTime)),bar=Math.floor(beat/B);const s=c.sections.findLast(x=>x.startBar<=bar)||c.sections[0];return {bar,beat,totalBars:c.totalBars,section:s.name,seconds:beat*c.beatSec,duration:c.duration};},
  dispose(){if(disposed)return;disposed=true;for(const n of nodes){try{n.disconnect();}catch{}}synth.free(nodes.length);},
 };
 return player;
}

// ------------------------------------------------------- streamed stems
/** The reference score: three streamed stems as the three intensity layers. */
export function createStemPlayer(synth,piece,{at,startSec,segment=piece.segments[0],level=0,rate=1,fadeIn=3,AudioClass=globalThis.Audio,base=import.meta.url,trim=1}={}){
 const {ctx}=synth,barSec=60/piece.bpm*piece.beatsPerBar,segStart=segment[0]*barSec,segEnd=segment[1]*barSec;
 const files=['lantern-drift','lantern-pulse','lantern-storm'].map(n=>new URL(`./assets/audio/${n}.mp3`,base).href);
 const nodes=[],out=synth.gain(0);out.connect(synth.master);nodes.push(out);
 let playerLevel=level,currentRate=rate,disposed=false,failed=false,ending=false,suspended=false,stopAt=Infinity;
 const mixFor=l=>piece.stemMix[l].map(v=>v*trim);
 const elements=files.map((src,i)=>{
  const el=new AudioClass(src);el.preload='auto';el.loop=false;el.preservesPitch=false;el.mozPreservesPitch=false;el.webkitPreservesPitch=false;el.playbackRate=rate;
  try{el.currentTime=startSec??segStart;}catch{}
  el.addEventListener?.('error',()=>{failed=true;});
  el.addEventListener?.('playing',()=>{const lead=elements[0].el;if(i&&Math.abs(el.currentTime-lead.currentTime)>.08)try{el.currentTime=lead.currentTime;}catch{}});
  const source=ctx.createMediaElementSource(el),g=synth.gain(mixFor(level)[i]);source.connect(g);g.connect(out);nodes.push(source,g);
  return {el,g};
 });
 synth.track(nodes.length);
 const startAt=Math.max(at,ctx.currentTime);
 out.gain.setValueAtTime(0,startAt);out.gain.linearRampToValueAtTime(1,startAt+fadeIn);
 const play=()=>{for(const {el} of elements)try{Promise.resolve(el.play()).catch(()=>{failed=true;});}catch{failed=true;}};
 play();
 const time=()=>Number(elements[0].el.currentTime)||0;
 const player={
  piece,kind:'stems',handingOver:false,liftEvery:2,
  get level(){return playerLevel},get disposed(){return disposed},
  scheduleUntil(){if(disposed)return;if(ending&&ctx.currentTime>stopAt){player.dispose();return;}if(!ending&&time()>=segEnd-.05)for(const {el} of elements)el.pause();},
  setLevel(next){
   if(disposed||next===playerLevel)return;playerLevel=next;
   const into=((time()-segStart)%barSec+barSec)%barSec,t=ctx.currentTime+(barSec-into)/Math.max(.1,currentRate);
   elements.forEach(({g},i)=>{g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(mixFor(next)[i],t,.7);});
  },
  setRate(next){if(disposed||Math.abs(next-currentRate)<.01)return;currentRate=next;for(const {el} of elements)el.playbackRate=next;},
  nudge(){return 0;},
  beatAt(t){return (time()+(t-ctx.currentTime)*currentRate)*piece.bpm/60;},
  ctxAt(b){return ctx.currentTime+(b*60/piece.bpm-time())/currentRate;},
  endTime(){if(failed)return ctx.currentTime;const now=time();if(now<segStart-1)return ctx.currentTime+(segEnd-segStart)/currentRate;return ctx.currentTime+(segEnd-now)/currentRate;},
  handOver(t,dur){
   if(disposed)return;ending=true;player.handingOver=true;const start=Math.max(t,ctx.currentTime),now=Math.min(1,Math.max(0,(start-startAt)/fadeIn));
   out.gain.cancelScheduledValues(start);out.gain.setValueAtTime(now,start);out.gain.linearRampToValueAtTime(0,start+dur);
   stopAt=start+dur+.3;
  },
  suspend(){suspended=true;for(const {el} of elements)el.pause();},
  resume(){if(suspended&&!disposed){suspended=false;play();}},
  transport(){return {time:time(),rate:currentRate,bpm:piece.bpm,key:piece.tonic%12,beat:time()*piece.bpm/60,liftEvery:2};},
  position(){const bar=Math.floor(time()/barSec);let at=0,name='';for(const s of piece.sections){at+=s.bars;if(bar%80<at){name=s.name;break;}}return {bar,beat:time()*piece.bpm/60,totalBars:piece.totalBars,section:name,seconds:time()-segStart,duration:segEnd-segStart,segment};},
  dispose(){if(disposed)return;disposed=true;for(const {el} of elements){try{el.pause();el.removeAttribute('src');el.load();}catch{}}for(const n of nodes)try{n.disconnect();}catch{}synth.free(nodes.length);},
 };
 return player;
}
