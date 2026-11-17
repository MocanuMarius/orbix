// v1.0-music proof: offline renders and measurements, run in headless Chrome by
// scripts/music-two-proof.mjs. Lab-only; the game never loads this file.
import {PIECES,pieceById,compilePiece,noteDensity,LIFT_BPM} from '../music-score.mjs?v=music-two-2';
import {createSynth,createScorePlayer,INSTRUMENTS} from '../music-synth.mjs?v=music-two-2';
import {MUSIC_TRIM,OVERLAP} from '../music-two.mjs?v=music-two-2';
import {playLiftCue} from '../lift-guide-audio.mjs?v=guide-clarity-1';
import {createFlightFX} from '../reactive-fx.mjs?v=guide-clarity-1';

const SR=44100;
const dB=x=>x>0?20*Math.log10(x):-Infinity;
const round=(x,d=1)=>Number.isFinite(x)?Math.round(x*10**d)/10**d:x;

function mono(buffer){const a=buffer.getChannelData(0),b=buffer.numberOfChannels>1?buffer.getChannelData(1):a,out=new Float32Array(a.length);for(let i=0;i<a.length;i++)out[i]=(a[i]+b[i])/2;return out;}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}}
const BANDS=[['sub',0,60],['low',60,250],['mid',250,1000],['1-3k',1000,3000],['high',3000,24000]];
export function spectrum(x,sr=SR){
 const N=4096,win=new Float32Array(N).map((_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1))),power=new Float64Array(N/2);let frames=0;
 for(let start=0;start+N<=x.length;start+=N){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=x[start+i]*win[i];fft(re,im);for(let k=0;k<N/2;k++)power[k]+=re[k]*re[k]+im[k]*im[k];frames++;}
 const total=power.reduce((a,b)=>a+b,0)||1,bands={};let centroid=0;
 for(const [name,lo,hi] of BANDS){let e=0;for(let k=0;k<N/2;k++){const f=k*sr/N;if(f>=lo&&f<hi)e+=power[k];}bands[name]=round(100*e/total,1);}
 for(let k=0;k<N/2;k++)centroid+=k*sr/N*power[k];
 // Spectral flatness (geometric / arithmetic mean of power): near 1 for a noise bed, near 0 for tones.
 const flat=(lo,hi)=>{let g=0,a=0,n=0;for(let k=1;k<N/2;k++){const f=k*sr/N;if(f<lo||f>=hi)continue;const p=power[k]/frames+1e-20;g+=Math.log(p);a+=p;n++;}return n?round(Math.exp(g/n)/(a/n),3):0;};
 return {bands,centroid:Math.round(centroid/total),flatness:flat(60,8000),flatnessHigh:flat(1000,8000)};
}
export function levels(buffer){
 let peak=0,sum=0,dc=0,clips=0,maxStep=0,maxCurve=0,n=0;
 for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++){const v=d[i],a=Math.abs(v);if(a>peak)peak=a;if(a>=1)clips++;sum+=v*v;dc+=v;n++;if(i>0){const s=Math.abs(v-d[i-1]);if(s>maxStep)maxStep=s;}if(i>1){const k=Math.abs(v-2*d[i-1]+d[i-2]);if(k>maxCurve)maxCurve=k;}}}
 return {peakDb:round(dB(peak)),rmsDb:round(dB(Math.sqrt(sum/n))),dc:Number((dc/n).toExponential(1)),clips,maxStep:round(maxStep,4),maxCurve:round(maxCurve,4)};
}
function windowsDb(x,sr=SR,win=.5){const n=Math.floor(win*sr),out=[];for(let s=0;s+n<=x.length;s+=n){let e=0;for(let i=s;i<s+n;i++)e+=x[i]*x[i];out.push(dB(Math.sqrt(e/n)));}return out;}

/** Render a synthesized piece offline: `seconds` from `startBar` at a fixed intensity. */
export async function renderScore(id,{seconds=60,level=1,startBar=0,fadeIn=.05,sampleRate=SR,handOverAt=null,handOverFor=OVERLAP,startAt=0,ctx:given=null,mute=null,synth:givenSynth=null}={}){
 const ctx=given||new OfflineAudioContext(2,Math.ceil(seconds*sampleRate),sampleRate),synth=givenSynth||createSynth(ctx);
 synth.master.gain.value=MUSIC_TRIM;
 const piece=pieceById(id),player=createScorePlayer(synth,piece,{at:startAt,startBar,level,fadeIn,mute:mute&&new Set(mute)});
 if(handOverAt!=null)player.handOver(handOverAt,handOverFor);
 player.scheduleUntil(seconds);
 if(given)return {ctx,synth,player};
 const buffer=await ctx.startRendering();
 return {buffer,stats:{...synth.stats},player};
}
async function renderStems({seconds=60,level=1,startBar=16,sampleRate=22050}={}){
 const piece=pieceById('lantern'),ctx=new OfflineAudioContext(2,Math.ceil(seconds*sampleRate),sampleRate);
 const names=['lantern-drift','lantern-pulse','lantern-storm'];
 const buffers=await Promise.all(names.map(async n=>ctx.decodeAudioData(await (await fetch(`../assets/audio/${n}.mp3`)).arrayBuffer())));
 const offset=startBar*60/piece.bpm*piece.beatsPerBar,master=ctx.createGain();master.gain.value=1;// the reference plays at its own levelmaster.connect(ctx.destination);
 buffers.forEach((b,i)=>{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=piece.stemMix[level][i];s.connect(g);g.connect(master);s.start(0,offset,seconds);});
 return {buffer:await ctx.startRendering(),sampleRate};
}

/** Onsets from spectral flux (1024-point frames, 256 hop), adaptive peak picking. */
export function onsets(x,sr=SR){
 const N=1024,H=256,frames=Math.floor((x.length-N)/H),flux=new Float32Array(frames);let prev=new Float32Array(N/2);
 const win=new Float32Array(N).map((_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
 for(let f=0;f<frames;f++){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=x[f*H+i]*win[i];fft(re,im);let sum=0;const mag=new Float32Array(N/2);for(let k=1;k<N/2;k++){mag[k]=Math.log1p(1000*Math.hypot(re[k],im[k]));const d=mag[k]-prev[k];if(d>0)sum+=d;}prev=mag;flux[f]=sum;}
 const out=[],span=Math.round(.5*sr/H),gap=Math.round(.045*sr/H);
 for(let f=3;f<frames-3;f++){
  let m=0,v=0,n=0;for(let k=Math.max(0,f-span);k<Math.min(frames,f+span);k++){m+=flux[k];n++;}m/=n;for(let k=Math.max(0,f-span);k<Math.min(frames,f+span);k++)v+=(flux[k]-m)**2;const sd=Math.sqrt(v/n);
  if(flux[f]>m+.8*sd&&flux[f]>=flux[f-1]&&flux[f]>=flux[f+1]&&flux[f]>=flux[f-2]&&flux[f]>=flux[f+2]&&(!out.length||f-out.at(-1).f>=gap))out.push({f,t:(f*H+N/2)/sr,s:flux[f]});
 }
 return {list:out,flux,hop:H/sr};
}
/** Tempo from the flux autocorrelation (60-180 BPM, folded into 70-100). */
function tempoOf(flux,hop){
 let best=0,bestLag=0;const lo=Math.round(60/180/hop),hi=Math.round(60/60/hop);
 const mean=flux.reduce((a,b)=>a+b,0)/flux.length,ac=lag=>{let c=0;for(let i=0;i+lag<flux.length;i++)c+=(flux[i]-mean)*(flux[i+lag]-mean);return c;};
 for(let lag=lo;lag<=hi;lag++){const c=ac(lag);if(c>best){best=c;bestLag=lag;}}
 const a=ac(bestLag-1),b=ac(bestLag),c=ac(bestLag+1),shift=(a-c)/(2*(a-2*b+c)||1);
 let bpm=60/((bestLag+(Number.isFinite(shift)?shift:0))*hop);while(bpm>100)bpm/=2;while(bpm<70)bpm*=2;return bpm;
}
/** Rhythm figures against a known tempo: grid share, swing, inter-onset regularity, steady-sound share. */
export function rhythm(x,sr,{bpm,divisions='swing',barBeats=4}){
 const {list,flux,hop}=onsets(x,sr),beat=60/bpm,times=list.map(o=>o.t),duration=x.length/sr;
 let phase=0,most=-1;for(let p=0;p<beat;p+=.002){let n=0;for(const t of times){const d=((t-p)%beat+beat)%beat;if(d<.025||beat-d<.025)n++;}if(n>most){most=n;phase=p;}}
 const fracs=times.map(t=>(((t-phase)%beat+beat)%beat)/beat);
 let swing=0;if(divisions==='swing'){const off=fracs.filter(f=>f>.4&&f<.75);swing=off.length?off.reduce((a,b)=>a+b,0)/off.length-.5:0;}
 const grid=divisions==='triplet'?[0,1/3,2/3,1]:[0,.25,.5+swing,.75,1];
 const tol=.03/beat,onGrid=fracs.filter(f=>grid.some(g=>Math.abs(f-g)<tol)).length/Math.max(1,fracs.length);
 const onBeat=fracs.filter(f=>f<tol||1-f<tol).length/Math.max(1,fracs.length);
 const iois=times.slice(1).map((t,i)=>t-times[i]),mean=iois.reduce((a,b)=>a+b,0)/Math.max(1,iois.length);
 const sd=Math.sqrt(iois.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,iois.length));
 const unit=divisions==='triplet'?beat/3:beat/4,ioiGrid=iois.filter(d=>{const k=Math.round(d/unit);return k>=1&&Math.abs(d-k*unit)<.03;}).length/Math.max(1,iois.length);
 const F=1024,energy=[];for(let s=0;s+F<=x.length;s+=F){let e=0;for(let i=s;i<s+F;i++)e+=x[i]*x[i];energy.push(e);}
 const back=Math.round(.25*sr/F),near=new Set();for(const t of times){const f=Math.floor(t*sr/F);for(let k=f-7;k<=f+7;k++)near.add(k);}
 let steady=0,total=0;for(let f=0;f<energy.length;f++){total+=energy[f];if(f>=back&&!near.has(f)&&energy[f]>0&&energy[f-back]>0&&Math.abs(10*Math.log10(energy[f]/energy[f-back]))<1.5)steady+=energy[f];}
 return {tempo:round(tempoOf(flux,hop),1),onsetsPerBar:round(times.length/(duration/(beat*barBeats)),1),gridShare:round(onGrid,2),beatShare:round(onBeat,2),swingRatio:divisions==='swing'?round((.5+swing)/(.5-swing),2):null,ioiCv:round(sd/mean,2),ioiOnGrid:round(ioiGrid,2),steadyShare:round(steady/Math.max(1e-12,total),2)};
}

/** The headline table: 60 s per piece, three intensity levels, with rhythm and the reference comparison. */
export async function measurePieces({seconds=60}={}){
 const rows=[];
 for(const piece of PIECES){
  const row={id:piece.id,title:piece.title,key:piece.keyName,bpm:round(piece.bpm,2),meter:piece.meter,groove:piece.groove,levels:[]};
  if(piece.stems){
   for(const level of [0,1,2]){const {buffer,sampleRate}=await renderStems({seconds,level});const m=mono(buffer);row.levels.push({level,...levels(buffer),...spectrum(m,sampleRate),...rhythm(m,sampleRate,{bpm:88})});}
   row.length=compilePiece(piece).duration/2;row.sections=piece.sections.map(s=>`${s.name} ${s.bars}`).join(', ')+' (per half)';
  }else{
   const c=compilePiece(piece),start=c.sections[1].startBar;
   row.length=c.duration;row.sections=c.sections.map(s=>`${s.name} ${s.bars}`).join(', ');
   const div=piece.beatUnit===3?'triplet':'swing';
   for(const level of [0,1,2]){
    const {buffer,stats}=await renderScore(piece.id,{seconds,level,startBar:start});
    const barsIn=seconds/(c.beatSec*c.barBeats),m=mono(buffer);
    row.levels.push({level,...levels(buffer),...spectrum(m),...rhythm(m,SR,{bpm:LIFT_BPM,divisions:div,barBeats:4}),notesPerBar:round(stats.notes/barsIn,1),writtenPerBar:round(noteDensity(c,level),1),peakVoices:stats.peakVoices,dropped:stats.dropped});
   }
   // Sustain share: the keys' and bass's ringing energy against the whole mix (flow level).
   const all=mono((await renderScore(piece.id,{seconds:30,level:1,startBar:start})).buffer);
   const held=mono((await renderScore(piece.id,{seconds:30,level:1,startBar:start,mute:['kick','rim','tick','lead','counter','bass']})).buffer);
   const e=v=>v.reduce((a,b)=>a+b*b,0);row.keysEnergyShare=round(e(held)/e(all),2);
  }
  rows.push(row);
 }
 return rows;
}

/** Every instrument alone: the first and last 50 ms of the note envelope must not jump. */
export async function measureClicks(){
 const out=[];
 for(const inst of Object.keys(INSTRUMENTS)){
  const seconds=4,ctx=new OfflineAudioContext(1,seconds*SR,SR),synth=createSynth(ctx),sink=ctx.createGain();sink.connect(ctx.destination);
  const midi={bass:43,kick:40,rim:74,snare:57,tick:100}[inst]??67;
  synth.note(sink,inst,midi,.1,1,1);
  const d=(await ctx.startRendering()).getChannelData(0);
  let first=-1,last=-1,peak=0;for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>peak)peak=a;if(a>1e-6){if(first<0)first=i;last=i;}}
  const w=Math.floor(.05*SR),step=(a,b)=>{let m=0;for(let i=Math.max(1,a);i<Math.min(d.length,b);i++)m=Math.max(m,Math.abs(d[i]-d[i-1]));return m;};
  // Reference: the largest step the steady waveform itself makes in its loudest 50 ms.
  let loud=0,loudAt=0;for(let s=0;s+w<d.length;s+=w){let e=0;for(let i=s;i<s+w;i++)e=Math.max(e,Math.abs(d[i]));if(e>loud){loud=e;loudAt=s;}}
  const ref=step(loudAt,loudAt+w),onset=step(first,first+w),tail=step(last-w,last+1);
  out.push({inst,peakDb:round(dB(peak)),firstSample:Number(Math.abs(d[first]).toExponential(1)),onsetStep:round(onset,5),tailStep:round(tail,5),steadyStep:round(ref,5),endLevelDb:round(dB(Math.abs(d[last]))),clickFree:onset<=ref*1.05&&tail<=ref*1.05&&Math.abs(d[first])<1e-3});
 }
 return out;
}

/** A hand-over, bar-aligned as the engine does it: combined level against each piece alone. */
export async function measureHandover(fromId,toId,{seconds=30,lead=10}={}){
 const from=pieceById(fromId),c=compilePiece(from),barSec=c.beatSec*c.barBeats,overlapBars=Math.max(1,Math.round(OVERLAP/barSec));
 const startBar=Math.max(0,c.totalBars-overlapBars-Math.ceil(lead/barSec));
 const handAt=(c.totalBars-overlapBars-startBar)*barSec,span=overlapBars*barSec;
 const render=async(withFrom,withTo)=>{
  const ctx=new OfflineAudioContext(2,seconds*SR,SR),synth=createSynth(ctx);synth.master.gain.value=MUSIC_TRIM;
  if(withFrom){const r=await renderScore(fromId,{ctx,synth,seconds:0,level:1,startBar});r.player.handOver(handAt,span,{drumsUntil:handAt+span/2});r.player.scheduleUntil(seconds);}
  if(withTo){const p=createScorePlayer(synth,pieceById(toId),{at:handAt,level:1,fadeIn:span,drumsFrom:handAt+span/2});p.scheduleUntil(seconds);}
  return ctx.startRendering();
 };
 const [a,b,both]=await Promise.all([render(true,false),render(false,true),render(true,true)]);
 const wa=windowsDb(mono(a)),wb=windowsDb(mono(b)),wc=windowsDb(mono(both));
 let worst=-Infinity,at=0;
 for(let i=0;i<wc.length;i++){const ref=Math.max(wa[i],wb[i]);if(!Number.isFinite(ref)||ref<-70)continue;const rise=wc[i]-ref;if(rise>worst){worst=rise;at=i*.5;}}
 // Against each piece at its own full level: the louder of A before the hand-over and B after it.
 const steady=Math.max(...wa.slice(0,Math.floor(handAt/.5)),...wb.slice(Math.ceil((handAt+span)/.5)));
 return {from:fromId,to:toId,handOverAt:round(handAt,2),overlap:round(span,2),worstRiseVsFadedDb:round(worst,2),worstAt:at,peakVsFullLevelDb:round(Math.max(...wc)-steady,2),combined:levels(both)};
}

/** The Lift cue before/after: one preparation and one target. */
export async function measureLiftCue(){
 const out={};
 for(const version of ['old','new'])for(const kind of ['soon','target']){
  const ctx=new OfflineAudioContext(1,SR,SR),g=ctx.createGain();g.connect(ctx.destination);
  playLiftCue(ctx,g,{kind,version,at:.01});
  const buffer=await ctx.startRendering(),d=buffer.getChannelData(0);
  let peak=0;for(const v of d)peak=Math.max(peak,Math.abs(v));
  let first=-1,last=-1;for(let i=0;i<d.length;i++)if(Math.abs(d[i])>peak*1e-3){if(first<0)first=i;last=i;}
  let e=0;for(let i=first;i<=last;i++)e+=d[i]*d[i];
  const active=d.slice(first,last+1),padded=new Float32Array(Math.max(4096,active.length));padded.set(active);
  out[`${version}-${kind}`]={peakDb:round(dB(peak)),rmsDb:round(dB(Math.sqrt(e/(last-first+1)))),durationMs:Math.round((last-first)/SR*1000),centroidHz:spectrum(padded).centroid,attackMs:Math.round((d.findIndex(v=>Math.abs(v)>=peak*.9)-first)/SR*1000),energyDb:round(10*Math.log10(e))};
 }
 return out;
}

/** Typical effect peaks from the game's own FX module, each sound rendered alone. */
export async function measureEffects(types=['pickup','flap','boost','shield','flash','clear','hit','pulse']){
 const out={};
 for(const type of types){
  let made=null;
  class Offline extends OfflineAudioContext{constructor(){super(1,SR*2.5,SR);made=this;}get state(){return 'running';}resume(){return Promise.resolve();}}
  const fx=createFlightFX({AudioContextClass:Offline});await fx.unlock();fx.setState({alive:true});
  // Let the master reach its level before the sound (it is a 35 ms smoothed target).
  made.suspend(.4).then(()=>{fx.play(type,{strength:1,tier:2});OfflineAudioContext.prototype.resume.call(made);});
  const buffer=await made.startRendering();let peak=0;for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));
  out[type]=round(dB(peak));fx.destroy();
 }
 return out;
}
