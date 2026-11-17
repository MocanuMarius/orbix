// v1.1-music lab: the reference score, four lo-fi siblings locked to the Lift
// cadence, their three intensity levels, the hand-over, an A/B against the
// reference, the Lift beats made visible, and the Lift cue before/after.
import {PIECES,compilePiece,LIFT_PERIOD,LIFT_BPM} from '../music-score.mjs?v=music-two-2';
import {createMusicTwo,OVERLAP} from '../music-two.mjs?v=music-two-2';
import {createMusic} from '../music.mjs?v=guide-clarity-1';
import {playLiftCue,LIFT_CUE_WOBBLE} from '../lift-guide-audio.mjs?v=guide-clarity-1';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const music=createMusicTwo({storage:memory(),listen:false,autoStart:false});
let legacy=null,cueCtx=null,abReturn=null,showBeats=false,lastLift=-1,flashUntil=0;
const $=s=>document.querySelector(s),rows=$('#rows'),status=$('#status'),flash=$('#flash');
const LEVELS=[['Calm',0],['Flow',1],['Urgent',2]],names=['Calm','Flow','Urgent'];
let level=1;
const mmss=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const lengthOf=p=>p.stems?compilePiece(p).duration/2:compilePiece(p).duration;
const barsOf=p=>p.stems?80:compilePiece(p).totalBars;
const tempoText=p=>p.stems?'88 bpm (Lift every 1.364 s)':`${LIFT_BPM.toFixed(1)} bpm, Lift every ${LIFT_PERIOD.toFixed(3)} s`;

rows.innerHTML=PIECES.map(p=>`<li class="mu-row${p.reference?' ref':''}" data-piece="${p.id}">
  <div class="mu-name"><b>${p.title}${p.reference?' <em class="mu-tag">Reference</em>':''}</b><small>${p.keyName} · ${p.meter} · ${p.groove} · ${tempoText(p)} · ${mmss(lengthOf(p))}${p.stems?' · one half per turn':''}</small><i>${p.character}</i></div>
  <div class="mu-line" aria-label="Sections">${compilePiece(p).sections.map((s,i)=>`<span class="s${i%5}" style="flex:${s.bars}" title="${s.name} · ${s.bars} bars">${s.name}</span>`).join('')}<b class="mu-head-mark"></b></div>
  <div class="mu-acts">
   <button type="button" class="mu-btn go" data-play="${p.id}">Play</button>
   ${LEVELS.map(([name,l])=>`<button type="button" class="mu-btn lv" data-level="${l}" data-for="${p.id}" aria-pressed="${l===level}">${name}</button>`).join('')}
   ${p.reference?'':`<button type="button" class="mu-btn" data-ab="${p.id}" aria-pressed="false" title="A/B against the reference">A/B ref</button>`}
   <button type="button" class="mu-btn" data-skip="${p.id}" title="Skip to 15 s before the hand-over">To hand-over</button>
  </div></li>`).join('');

function stopLegacy(){if(legacy){legacy.setEnabled(false);legacy.destroy();legacy=null;}$('#current').setAttribute('aria-pressed','false');}
function startLegacy(){music.stopAll();legacy=createMusic({storage:memory()});legacy.setLevel(3);legacy.setScene(level===2?'boss':level===1?'flight':'menu',level===2?1:0);$('#current').setAttribute('aria-pressed','true');}
function syncButtons(){
 for(const b of document.querySelectorAll('[data-level]'))b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));
 for(const b of document.querySelectorAll('[data-ab]'))b.setAttribute('aria-pressed',String(!!legacy&&abReturn===b.dataset.ab));
}
function play(id,options){stopLegacy();abReturn=null;music.setOverride(level);music.play(id,options);syncButtons();}

rows.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.play)play(b.dataset.play);
 else if(b.dataset.skip)play(b.dataset.skip,{skipToHandover:true});
 else if(b.dataset.ab){
  // A/B: the reference exactly as the game plays it today, then back to this piece.
  if(legacy&&abReturn===b.dataset.ab){const id=abReturn;play(id);}
  else{stopLegacy();startLegacy();abReturn=b.dataset.ab;}
  syncButtons();
 }
 else if(b.dataset.level){level=Number(b.dataset.level);syncButtons();if(legacy){const back=abReturn;stopLegacy();startLegacy();abReturn=back;syncButtons();}else if(music.info().piece!==b.dataset.for)play(b.dataset.for);else music.setOverride(level);}
});
$('#rotation').addEventListener('click',()=>{stopLegacy();abReturn=null;music.setOverride(level);music.resumeRotation();syncButtons();});
$('#stop').addEventListener('click',()=>{stopLegacy();abReturn=null;music.stopAll();syncButtons();});
$('#current').addEventListener('click',()=>{if(legacy){stopLegacy();abReturn=null;}else startLegacy();syncButtons();});
$('#beats').addEventListener('click',()=>{showBeats=!showBeats;$('#beats').setAttribute('aria-pressed',String(showBeats));flash.hidden=!showBeats;});
// Three Lift cycles at the game's cadence: preparation, then the target 0.31 s later, every Lift period.
function cue(version){
 cueCtx??=new AudioContext();cueCtx.resume();
 const out=cueCtx.createGain();out.gain.value=1;out.connect(cueCtx.destination);
 const t0=cueCtx.currentTime+.05,key=legacy?2:music.getTransport().key;
 for(let k=0;k<3;k++){
  const wobble=version==='new'?1+(Math.random()*2-1)*LIFT_CUE_WOBBLE:1;
  playLiftCue(cueCtx,out,{kind:'soon',version,at:t0+k*LIFT_PERIOD,wobble,key});
  playLiftCue(cueCtx,out,{kind:'target',version,at:t0+k*LIFT_PERIOD+.31,wobble,key});
 }
 setTimeout(()=>out.disconnect(),6000);
}
$('#cue-old').addEventListener('click',()=>cue('old'));
$('#cue-new').addEventListener('click',()=>cue('new'));

function frame(now){
 const info=music.info();
 for(const row of rows.children){
  const on=legacy?row.dataset.piece==='lantern':row.dataset.piece===info.piece;row.classList.toggle('playing',on);
  if(on&&!legacy&&info.position){const p=PIECES.find(x=>x.id===info.piece),bar=p.stems?(info.position.bar-(info.position.segment?.[0]||0)):info.position.beat/compilePiece(p).barBeats;row.querySelector('.mu-head-mark').style.left=`${Math.max(0,Math.min(100,bar/barsOf(p)*100))}%`;}
 }
 // Lift beats: the marked beat (the kick on every Lift moment).
 let beat=null,every=2;
 if(legacy){const t=legacy.getTransport();beat=t.time*88/60;}else if(info.piece){beat=info.beat;every=info.liftEvery;}
 if(beat!=null){const lift=Math.floor(beat/every+1e-6);if(lift!==lastLift){if(lastLift>=0)flashUntil=now+130;lastLift=lift;}}
 flash.classList.toggle('on',showBeats&&now<flashUntil);
 if(legacy)status.innerHTML=`Playing the <b>reference</b> exactly as the game plays it today (${level===2?'Guardian':level===1?'flight':'map'} mix). 88 bpm: its beat slips 3 ms per Lift against the 1.367 s cadence.`+(abReturn?` Press A/B again to return to <b>${PIECES.find(p=>p.id===abReturn).title}</b>.`:'');
 else if(info.piece){
  const p=info.position,left=p?Math.max(0,p.duration-p.seconds):0,next=PIECES.find(x=>x.id===info.next);
  status.innerHTML=`<span>Now <b>${info.title}</b> · ${p?.section||''} · ${mmss(p?.seconds||0)} of ${mmss(p?.duration||0)}</span><span>Level <b>${names[info.level]}</b></span><span>Next <b>${next?.title||''}</b> in ${mmss(Math.max(0,left-OVERLAP))}</span><small>${music.stats.live} audio nodes · scheduler ${(music.stats.schedulerMs/Math.max(1,music.stats.audioSeconds)).toFixed(3)} ms per second</small>`;
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopLegacy();music.stopAll();}});
window.__musicLab={music,play,cue};
