// Original, synchronized eight-minute lo-fi stems. Gains and a shared varispeed
// transport respond to flight without audio graph allocation or simulation changes.
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
 const key='wispbound-music-enabled';let enabled=true,unlocked=false,players=[],timer=null,mode='menu',danger=0;
 let targets=musicMix(mode),destroyed=false,holeTarget=0,pulseTarget=0,hole=0,pulse=0,rate=1;
 const clearReaction=()=>{holeTarget=0;pulseTarget=0;};
 try{enabled=storage.getItem(key)!=='false'}catch{}
 const stop=()=>{for(const p of players)p.pause();if(timer!==null){cancel(timer);timer=null;}};
 const tick=()=>{
  if(!enabled||document.hidden||destroyed)return;
  hole+=(holeTarget-hole)*(holeTarget>hole ? .16 : .09);
  pulse+=(pulseTarget-pulse)*(pulseTarget>pulse ? .28 : .12);
  rate=1-hole*.28;
  for(let i=0;i<players.length;i++){
   // A pulse foregrounds the written Rhodes/felt melody and ghost-note layer,
   // trading some bass/beat gain for sparkle rather than simply getting louder.
   const gain=i===0?targets[i]*(1-hole*.12)+pulse*.045:i===1?targets[i]*(1-hole*.24-pulse*.2):targets[i]*(1-hole*.4)+pulse*.055;
   const p=players[i],next=p.volume+(gain-p.volume)*.055;
   p.playbackRate=rate;
   if(Math.abs(next-p.volume)>.00015)p.volume=Math.max(0,Math.min(1,next));
  }
 };
 const play=()=>{
  if(!enabled||!unlocked||document.hidden||destroyed)return;
  if(!players.length){
   players=TRACKS.map(src=>{const p=new AudioClass(new URL(src,import.meta.url).href);p.loop=true;p.volume=0;p.preload='metadata';p.preservesPitch=false;p.mozPreservesPitch=false;p.webkitPreservesPitch=false;p.playbackRate=rate;return p;});
   // Correct start-up loading skew once a layer begins. Equal encoded lengths
   // keep the layers in phase on subsequent loops, without repeated seeking.
   for(let i=1;i<players.length;i++)players[i].addEventListener?.('playing',()=>{
    const base=players[0];if(Number.isFinite(base.currentTime)&&Math.abs(players[i].currentTime-base.currentTime)>.08){try{players[i].currentTime=base.currentTime}catch{}}
   });
  }
  for(const p of players)if(p.paused){const pending=p.play();pending?.catch(()=>{});}
  if(timer===null)timer=schedule(tick,80);
 };
 const gesture=e=>{if(e.target?.closest?.('[data-action="music"]'))return;unlocked=true;play();};
 const visibility=()=>{if(document.hidden){clearReaction();stop();}else play();};
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,{capture:true});
 document.addEventListener('visibilitychange',visibility);
 return {get enabled(){return enabled},get mode(){return mode},
  getTransport(){return {time:Number(players[0]?.currentTime)||0,rate,bpm:78};},
  setScene(next,pressure=0){if(destroyed)return;mode=next;danger=Math.round(unit(pressure)*10)/10;targets=musicMix(mode,danger);clearReaction();},
  setFlight(s){if(destroyed)return;this.setScene(s.dream?.mode==='record'?'dream':s.dying?'loss':s.completing?'clear':s.paused?'pause':s.boss?'boss':'flight',Math.max(Math.min(1,(s.blackHole?.rate||0)/20),Math.max(0,1-(s.flame||0)/Math.max(1,(s.maxFlame||100)*.3)),s.boss?Math.min(1,(s.boss.phase||1)/3):0));if(enabled&&!document.hidden){const reaction=musicReactivity(s);holeTarget=reaction.hole;pulseTarget=reaction.pulse;}},
  setEnabled(value){if(destroyed)return;enabled=!!value;unlocked=true;try{storage.setItem(key,String(enabled))}catch{}if(enabled)play();else{clearReaction();stop();}},
  destroy(){destroyed=true;stop();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility)}
 };
}
