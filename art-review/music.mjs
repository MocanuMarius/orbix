// One pre-rendered, original seven-minute score: no synthesis on the frame thread.
export function createMusic({storage=globalThis.localStorage,document=globalThis.document,AudioClass=globalThis.Audio}={}){
 const key='wispbound-music-enabled';let enabled=true,unlocked=false,player=null;
 try{enabled=storage.getItem(key)!=='false'}catch{}
 const play=()=>{if(!enabled||!unlocked||document.hidden)return;player??=new AudioClass(new URL('./assets/audio/lantern-drift.mp3',import.meta.url).href);player.loop=true;player.volume=.26;player.preload='none';if(player.paused){const pending=player.play();pending?.catch(()=>{});}};
 const gesture=e=>{if(e.target?.closest?.('[data-action="music"]'))return;unlocked=true;play();};
 const visibility=()=>{if(document.hidden)player?.pause();else play();};
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,{capture:true});
 document.addEventListener('visibilitychange',visibility);
 return {get enabled(){return enabled},setEnabled(value){enabled=!!value;unlocked=true;try{storage.setItem(key,String(enabled))}catch{}if(enabled)play();else player?.pause();},destroy(){player?.pause();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility)}};
}
