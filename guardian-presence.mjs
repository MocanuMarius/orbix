// World-anchored background figure. Never a collider or screen-following HUD.
export function guardianPresenceState(engine,distance=engine.distance){
 const boss=engine.layout?.boss,exit=engine.layout?.exitLandmark;
 if(!boss||!exit)return null;
 const scale=engine.height/exit.height,worldX=exit.entryX+engine.height*.18;
 const x=worldX-distance,h=engine.height*.91;
 if(x-h*.65>engine.width||x+h*.65<0)return null;
 return {id:boss.id,x,groundY:exit.groundY*scale,h,worldX};
}
export function drawGuardianPresence(c,{engine,width,height,distance=engine.distance,time=engine.time}){
 const state=guardianPresenceState(engine,distance);if(!state)return;
 const scale=height/engine.height,h=state.h*scale,x=Math.round(state.x*scale),y=Math.round(state.groundY*scale);
 const t=engine.reducedMotion?0:time,sway=Math.sin(t*.48)*.012;
 c.save();c.translate(x,y);c.scale(h,h);
 const polygon=(points,ink='#000')=>{c.fillStyle=ink;c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();};
 // Dim, local dusk behind the figure gives black armour a readable contour.
 const dusk=c.createRadialGradient(0,-.55,.06,0,-.55,.68);dusk.addColorStop(0,'#304044');dusk.addColorStop(.6,'#19272b');dusk.addColorStop(1,'#09111500');c.fillStyle=dusk;c.fillRect(-.7,-1.2,1.4,1.4);
 // Ragged cloak, layered pauldrons and asymmetric worn armour; no bright outlines.
 polygon([[-.12,-.79],[-.31,-.72],[-.4,-.54],[-.35,-.29],[-.48+sway,-.03],[-.36,-.07],[-.32,.01],[-.24,-.04],[-.21,.02],[-.10,-.05],[.05,-.03],[.19,.015],[.26,-.07],[.35,-.03],[.28+sway,-.39],[.30,-.66],[.15,-.77]]);
 polygon([[-.14,-.78],[-.28,-.76],[-.34,-.71],[-.30,-.65],[-.23,-.63],[-.20,-.50],[-.14,-.44],[.16,-.45],[.22,-.59],[.30,-.62],[.34,-.68],[.28,-.75],[.14,-.79]]);
 // Bent gauntlet at the sword's pommel, opposite hand hanging with narrow fingers.
 polygon([[-.29,-.67],[-.37,-.59],[-.36,-.43],[-.28,-.38],[-.15,-.41],[-.14,-.47],[-.26,-.47],[-.25,-.59]]);
 polygon([[.24,-.65],[.31,-.58],[.32,-.38],[.29,-.29],[.27,-.29],[.27,-.35],[.25,-.27],[.23,-.28],[.24,-.36],[.21,-.30],[.19,-.32],[.22,-.41],[.19,-.56]]);
 // Separate legs and boots, planted at the refuge foundation.
 polygon([[-.14,-.44],[-.02,-.45],[-.025,-.23],[-.08,-.09],[-.07,-.025],[-.17,-.01],[-.20,-.035],[-.13,-.11]]);
 polygon([[.03,-.45],[.17,-.42],[.13,-.24],[.17,-.08],[.23,-.025],[.22,0],[.10,-.01],[.06,-.23]]);
 const headTilt=Math.sin(t*.35)*.018;c.save();c.translate(0,-.80);c.rotate(headTilt);
 polygon([[-.12,0],[-.105,-.13],[-.07,-.19],[.025,-.21],[.10,-.15],[.12,-.035],[.065,.045],[-.055,.055]]);
 // Each guardian has a distinct crest/weapon profile, all entirely black.
 if(state.id==='frost-matron')polygon([[-.10,-.08],[-.16,-.28],[-.06,-.18],[-.02,-.34],[.025,-.2],[.13,-.30],[.1,-.08]]);
 else if(state.id==='rootbound-heart'){for(const sign of [-1,1])polygon([[sign*.07,-.11],[sign*.18,-.24],[sign*.17,-.37],[sign*.21,-.28],[sign*.30,-.30],[sign*.23,-.24],[sign*.11,-.07]]);}
 else if(state.id==='moonweaver')polygon([[-.09,-.1],[-.20,-.33],[-.17,-.08],[-.06,.02],[.07,.01],[.19,-.08],[.20,-.33],[.09,-.12]]);
 else polygon([[-.07,-.17],[-.10,-.32],[-.035,-.25],[.01,-.36],[.045,-.23],[.10,-.28],[.08,-.12]]);
 c.restore();
 // Grounded greatsword, or a hooked staff for the storm/moon guardians.
 if(['moonweaver','storm-shepherd'].includes(state.id)){
  polygon([[-.25,-.02],[-.23,-.9],[-.14,-1.02],[-.04,-1.04],[.04,-.96],[-.06,-.99],[-.13,-.96],[-.19,-.86],[-.21,-.02]]);
 }else{
  polygon([[-.215,-.02],[-.25,-.31],[-.24,-.45],[-.28,-.47],[-.28,-.49],[-.23,-.48],[-.23,-.57],[-.20,-.59],[-.18,-.57],[-.19,-.48],[-.13,-.49],[-.13,-.46],[-.19,-.44],[-.18,-.31]]);
 }
 if(state.id==='hollow-sun'){c.strokeStyle='#000';c.lineWidth=.023;c.beginPath();c.arc(0,-.93,.22,0,Math.PI*2);c.stroke();}
 c.restore();
}
