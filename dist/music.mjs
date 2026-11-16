// Original, synchronized seven-minute lo-fi stems. Gains and a shared varispeed
// transport respond to flight without audio graph allocation or simulation changes.
import {createLevelStore,levelGain} from './sound-level.mjs?v=guide-clarity-1';
const TRACKS=['./assets/audio/lantern-drift.mp3','./assets/audio/lantern-pulse.mp3','./assets/audio/lantern-storm.mp3'];
const unit=n=>Math.max(0,Math.min(1,Number(n)||0));
export function musicReactivity(s){
 const flying=!s.paused&&!s.dying&&!s.completing&&s.dream?.mode!=='record';
 if(!flying)return {hole:0,pulse:0};
 const distance=s.blackHole?.nearest?.distance;
 const proximity=Number.isFinite(distance)?unit(1-distance/460):0;
 const hole=Math.max(proximity,unit((s.blackHole?.rate||0)/80));
 const light=s.light;
 const pulse=Math.max(unit(s.edgingPulse?.strength),unit(light?.edgingReveal),unit(light?.pickupReveal),unit(light?.tetherReveal),unit(light?.forwardLight?.intensity));
 return {hole:hole*hole*(3-2*hole),pulse};
}
export function musicMix(mode='menu',danger=0){
 const pressure=Math.max(0,Math.min(1,Number(danger)||0));
 if(mode==='boss')return [.24,.28,.14+pressure*.08];
 if(mode==='flight')return [.27,.27+pressure*.02,pressure*.07];
 if(mode==='dream')return [.26,.065,0];
 if(mode==='clear')return [.27,.17,0];
 if(mode==='loss')return [.15,.035,0];
 if(mode==='pause')return [.16,.045,0];
 // Keep a soft beat at checkpoints too: the groove is part of the score's
 // identity, while heavier percussion remains reserved for actual pressure.
 return [.25,.19,0];
}
export function createMusic({storage=globalThis.localStorage,document=globalThis.document,AudioClass=globalThis.Audio,schedule=globalThis.setInterval,cancel=globalThis.clearInterval}={}){
 const key='wispbound-music-enabled';let unlocked=false,players=[],timer=null,mode='menu',danger=0;
 let targets=musicMix(mode),destroyed=false,holeTarget=0,pulseTarget=0,focusTarget=0,hole=0,pulse=0,focus=0,rate=1;
 const levels=[0,0,0],pendingPlays=new Map();
 const clearReaction=()=>{holeTarget=0;pulseTarget=0;focusTarget=0;};
 // Five volume steps (0 off to 4); the legacy on/off key stays in step for older readers.
 const volume=createLevelStore({storage,levelKey:'wispbound-music-level',lastKey:'wispbound-music-last',legacyOff:()=>storage.getItem(key)==='false',onWrite:level=>storage.setItem(key,String(level>0))});
 let masterGain=levelGain(volume.level);
 const enabled=()=>volume.level>0;
 const canPlay=()=>enabled()&&unlocked&&!document.hidden&&!destroyed&&rate>0;
 const stop=()=>{pendingPlays.clear();for(const p of players)p.pause();if(timer!==null){cancel(timer);timer=null;}};
 const tick=()=>{
  if(!canPlay())return;
  hole+=(holeTarget-hole)*(holeTarget>hole ? .16 : .09);
  pulse+=(pulseTarget-pulse)*(pulseTarget>pulse ? .28 : .12);
  // Leave room for important effects: ~100 ms attack, ~850 ms release.
  // Apply after the slow scene fade so brief warnings receive space promptly.
  focus+=(focusTarget-focus)*(focusTarget>focus ? .55 : .09);
  const duck=1-focus*.22;
  for(let i=0;i<players.length;i++){
   // A pulse foregrounds the written Rhodes/felt melody and ghost-note layer,
   // trading some bass/beat gain for sparkle rather than simply getting louder.
   const gain=i===0?targets[i]*(1-hole*.12)+pulse*.045:i===1?targets[i]*(1-hole*.24-pulse*.2):targets[i]*(1-hole*.4)+pulse*.055;
   levels[i]+=(gain-levels[i])*.055;
   const p=players[i],next=levels[i]*duck*masterGain;
   if(Math.abs(next-p.volume)>.00015)p.volume=Math.max(0,Math.min(1,next));
  }
 };
 const play=()=>{
  if(!canPlay())return;
  if(!players.length){
   players=TRACKS.map(src=>{const p=new AudioClass(new URL(src,import.meta.url).href);p.loop=true;p.volume=0;p.preload='metadata';p.preservesPitch=false;p.mozPreservesPitch=false;p.webkitPreservesPitch=false;p.playbackRate=rate;return p;});
   // Correct start-up loading skew once a layer begins. Equal encoded lengths
   // keep the layers in phase on subsequent loops, without repeated seeking.
   for(let i=0;i<players.length;i++)players[i].addEventListener?.('playing',()=>{
    const p=players[i];if(!canPlay()){p.pause();return;}
    const base=players[0];if(i&&Number.isFinite(base.currentTime)&&Math.abs(p.currentTime-base.currentTime)>.08){try{p.currentTime=base.currentTime}catch{}}
   });
  }
  for(const p of players)if(p.paused&&!pendingPlays.has(p)){
   const ticket={};pendingPlays.set(p,ticket);
   try{Promise.resolve(p.play()).then(()=>{
    if(pendingPlays.get(p)===ticket)pendingPlays.delete(p);
    // A deferred play may finish after a pause, mute, hide or destruction.
    if(!canPlay())p.pause();
   },()=>{if(pendingPlays.get(p)===ticket)pendingPlays.delete(p);});}catch{pendingPlays.delete(p);}
  }
  if(timer===null)timer=schedule(tick,80);
 };
 const setRate=value=>{
  const next=Number.isFinite(value)?unit(value):1,wasStopped=rate===0;
  rate=next;
  // HTML media rejects playbackRate=0. Pausing retains the shared track cursor.
  if(rate===0){if(!wasStopped)stop();return;}
  for(const p of players)if(Math.abs(p.playbackRate-rate)>.0001)p.playbackRate=rate;
  if(wasStopped)play();
 };
 const scene=(next,pressure=0)=>{mode=next;danger=Math.round(unit(pressure)*10)/10;targets=musicMix(mode,danger);clearReaction();};
 const gesture=e=>{if(e.target?.closest?.('[data-action="music"],[data-level-mute="music"],[data-level-bars="music"]'))return;unlocked=true;play();};
 const visibility=()=>{if(document.hidden){clearReaction();stop();}else play();};
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,{capture:true});
 document.addEventListener('visibilitychange',visibility);
 const applyLevel=()=>{masterGain=levelGain(volume.level);unlocked=true;if(enabled()){tick();play();}else{clearReaction();stop();}};
 return {get enabled(){return enabled()},get level(){return volume.level},get lastLevel(){return volume.last},get mode(){return mode},
  getTransport(){return {time:Number(players[0]?.currentTime)||0,rate,bpm:88};},
  setScene(next,pressure=0){if(destroyed)return;scene(next,pressure);if(next==='pause')setRate(0);else if(!['flight','boss','dream'].includes(next))setRate(1);},
  setFlight(s){if(destroyed)return;scene(s.dream?.mode==='record'?'dream':s.dying?'loss':s.completing?'clear':s.paused?'pause':s.boss?'boss':'flight',Math.max(Math.min(1,(s.blackHole?.rate||0)/20),Math.max(0,1-(s.flame||0)/Math.max(1,(s.maxFlame||100)*.3)),s.boss?Math.min(1,(s.boss.phase||1)/3):0));setRate(Number.isFinite(s.worldRate)?s.worldRate:s.paused||s.tutorialAwaitingLift||s.dying||s.completing||s.finished?0:1);if(enabled()&&!document.hidden){const reaction=musicReactivity(s);holeTarget=reaction.hole;pulseTarget=reaction.pulse;if(mode==='flight'||mode==='boss')focusTarget=unit(s.audioFocus);}},
  setEnabled(value){if(destroyed)return;volume.setEnabled(!!value);applyLevel();},
  setLevel(value){if(destroyed)return;volume.set(value);applyLevel();},
  destroy(){destroyed=true;stop();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility)}
 };
}
