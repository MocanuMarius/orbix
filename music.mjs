// Original, synchronized seven-minute stems. Only their volumes change during
// flight: no live oscillators, decoding jobs or audio graph allocation per frame.
const TRACKS=['./assets/audio/lantern-drift.mp3','./assets/audio/lantern-pulse.mp3','./assets/audio/lantern-storm.mp3'];
export function musicMix(mode='menu',danger=0){
 const pressure=Math.max(0,Math.min(1,Number(danger)||0));
 if(mode==='boss')return [.17,.29,.18+pressure*.12];
 if(mode==='flight')return [.22,.19+pressure*.06,pressure*.18];
 if(mode==='dream')return [.24,.055,0];
 if(mode==='clear')return [.25,.12,0];
 if(mode==='loss')return [.14,.025,0];
 if(mode==='pause')return [.15,.025,0];
 return [.21,.035,0];
}
export function createMusic({storage=globalThis.localStorage,document=globalThis.document,AudioClass=globalThis.Audio,schedule=globalThis.setInterval,cancel=globalThis.clearInterval}={}){
 const key='wispbound-music-enabled';let enabled=true,unlocked=false,players=[],timer=null,mode='menu',danger=0;
 let targets=musicMix(mode),destroyed=false;
 try{enabled=storage.getItem(key)!=='false'}catch{}
 const stop=()=>{for(const p of players)p.pause();if(timer!==null){cancel(timer);timer=null;}};
 const tick=()=>{
  if(!enabled||document.hidden||destroyed)return;
  for(let i=0;i<players.length;i++){
   const p=players[i],next=p.volume+(targets[i]-p.volume)*.055;
   if(Math.abs(next-p.volume)>.00015)p.volume=Math.max(0,Math.min(1,next));
  }
 };
 const play=()=>{
  if(!enabled||!unlocked||document.hidden||destroyed)return;
  if(!players.length){
   players=TRACKS.map(src=>{const p=new AudioClass(new URL(src,import.meta.url).href);p.loop=true;p.volume=0;p.preload='metadata';return p;});
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
 const visibility=()=>{if(document.hidden)stop();else play();};
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,{capture:true});
 document.addEventListener('visibilitychange',visibility);
 return {get enabled(){return enabled},get mode(){return mode},
  setScene(next,pressure=0){mode=next;danger=Math.round(Math.max(0,Math.min(1,pressure))*10)/10;targets=musicMix(mode,danger);},
  setFlight(s){this.setScene(s.dream?.mode==='record'?'dream':s.dying?'loss':s.completing?'clear':s.paused?'pause':s.boss?'boss':'flight',Math.max(Math.min(1,(s.blackHole?.rate||0)/20),Math.max(0,1-(s.flame||0)/Math.max(1,(s.maxFlame||100)*.3)),s.boss?Math.min(1,(s.boss.phase||1)/3):0));},
  setEnabled(value){enabled=!!value;unlocked=true;try{storage.setItem(key,String(enabled))}catch{}if(enabled)play();else stop();},
  destroy(){destroyed=true;stop();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility)}
 };
}
