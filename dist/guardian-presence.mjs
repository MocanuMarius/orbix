// Atmospheric portrait only: never a collider, never reveals hidden terrain.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const palettes={'hollow-warden':'#b6be91','frost-matron':'#bceaf2','rootbound-heart':'#a8d999','storm-shepherd':'#c9b8ef','hollow-sun':'#d59fcb',moonweaver:'#d7d4f4'};
export function guardianPresenceState(engine,distance=engine.distance){
 const boss=engine.layout?.boss;if(!boss)return null;
 const progress=clamp(distance/Math.max(1,engine.totalDistance),0,1),reveal=clamp((progress-.35)/.4,0,1);
 const phase=boss.phases?.find(p=>distance+engine.player.x<p.end)?.index||3;
 const attack=boss.attacks?.find(a=>a.trigger!==null&&!a.spent&&a.x-distance-engine.player.x>-30&&a.x-distance-engine.player.x<330);
 return{id:boss.id,reveal,phase,casting:!!attack||!!engine.layout.obstacles?.some(o=>o.motion&&o.x-distance-engine.player.x>0&&o.x-distance-engine.player.x<280),progress};
}
export function drawGuardianPresence(c,{engine,width,height,distance=engine.distance,time=engine.time}){
 const state=guardianPresenceState(engine,distance);if(!state||state.reveal<=0)return;
 const t=engine.reducedMotion?0:time,breath=Math.sin(t*1.3)*.025;
 const unit=height*(.18+state.reveal*.10),x=Math.round(width*.77),y=Math.round(height*.40);
 const color=palettes[state.id]||palettes['hollow-warden'];
 c.save();c.translate(x,y);c.scale(unit,unit);c.lineWidth=2/unit;c.lineJoin='miter';
 const poly=points=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fill();c.stroke();};
 c.globalAlpha=state.reveal*.62;c.fillStyle='#03090d';c.strokeStyle=color;
 // Wide shoulders and reaching hands frame the mask; the palms close when casting.
 const reach=state.casting?.22:.08+Math.sin(t*.8)*.06;
 poly([[-.37,.48],[-.8,.58],[-1.18,.95],[-1.10,1.27],[-.69,1.05],[-.44,.92],[.45,.92],[.72,1.07],[1.12,1.25],[1.22,.94],[.81,.57],[.36,.48]]);
 for(const side of [-1,1]){c.save();c.translate(side*(.93-reach),.57+breath);c.rotate(side*(.18+reach));poly([[-.19,.35],[-.22,-.1],[-.13,-.1],[-.10,.13],[-.08,-.22],[0,-.22],[.02,.08],[.08,-.16],[.16,-.16],[.14,.17],[.23,.04],[.29,.1],[.18,.4]]);c.restore();}
 c.translate(0,breath);
 if(state.id==='hollow-sun'){
  c.beginPath();c.arc(0,0,.61,0,Math.PI*2);c.fill();c.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.10;c.beginPath();c.moveTo(Math.cos(a)*.68,Math.sin(a)*.68);c.lineTo(Math.cos(a)*(.79+breath),Math.sin(a)*(.79+breath));c.stroke();}
 }else if(state.id==='rootbound-heart'){
  poly([[0,-.54],[-.30,-.72],[-.56,-.43],[-.49,.06],[0,.67],[.49,.06],[.56,-.43],[.30,-.72]]);
  c.globalAlpha=state.reveal*(.45+.22*Math.sin(t*2.6)**2);c.fillStyle=color;poly([[-.08,-.12],[.08,-.12],[.16,.04],[0,.30],[-.16,.04]]);
 }else{
  const crown=state.id==='frost-matron'?[[-.60,-.47],[-.48,-1.1],[-.20,-.65],[0,-1.3],[.2,-.65],[.48,-1.1],[.6,-.47]]:state.id==='moonweaver'?[[-.58,-.5],[-.68,-1.0],[-.28,-.63],[.28,-.63],[.68,-1],[.58,-.5]]:[[-.6,-.45],[-.44,-.83],[-.18,-.67],[0,-.98],[.2,-.67],[.44,-.83],[.6,-.45]];
  poly([...crown,[.5,.24],[.20,.62],[-.20,.62],[-.50,.24]]);
  c.globalAlpha=state.reveal*(state.casting?.95:.65);c.fillStyle=color;
  c.fillRect(-.34,-.18,.19,.045);c.fillRect(.15,-.18,.19,.045);
  c.globalAlpha=state.reveal*.35;c.fillRect(-.045,.18,.09,.19);
 }
 // Sparse hovering fragments keep the portrait alive without a particle system.
 c.fillStyle=color;c.globalAlpha=state.reveal*.45;
 for(let i=0;i<6;i++){const a=i*1.047+t*(state.casting?.3:.12),r=.85+(i%2)*.16;c.fillRect(Math.round(Math.cos(a)*r*unit)/unit,Math.round(Math.sin(a)*r*unit)/unit,2/unit,2/unit);}
 c.restore();
}
