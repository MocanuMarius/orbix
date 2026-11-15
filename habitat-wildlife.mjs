// Source sprite sheets are unmodified, freely licensed artwork. Credits and
// provenance: nature-credits.html and assets/nature/licenses/wildlife.txt.
const sheets={
 deer:['assets/nature/wild-deer-idle.png',72,52,10,7,46],
 fox:['assets/nature/wild-fox-idle.png',64,36,6,6,32],
 rabbit:['assets/nature/wild-rabbit-idle.png',32,26,10,7,23],
 raven:['assets/nature/wild-raven.png',32,32,7,10,33],
 butterfly:['assets/nature/wild-butterfly.png',16,32,3,8,25],
};
const documents=new WeakMap();
export function prepareWildlife(document){
 if(documents.has(document))return documents.get(document).ready;
 const state={images:new Map(),ready:null};documents.set(document,state);
 state.ready=Promise.all(Object.entries(sheets).map(([kind,[url]])=>new Promise(resolve=>{
  const image=document.createElement('img');image.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);
   c.globalCompositeOperation='source-atop';c.globalAlpha=.28;c.fillStyle='#243b40';c.fillRect(0,0,canvas.width,canvas.height);
   state.images.set(kind,canvas);resolve();
  };image.onerror=resolve;image.src=new URL(url,import.meta.url).href;
 })));
 return state.ready;
}
// This is scenery, not a pickup or an actor in the physics simulation. Each
// animal is attached to an authored ledge; no walking across gaps or spawning
// new objects during flight. A visible tile carries at most two animals.
export function drawHabitatAnimal(c,site,{x,y,time=0,reducedMotion=false,alpha=1}){
 if(['frog','hare','lizard','moth'].includes(site.kind)){
  const phase=time+(site.phase||0),breathe=reducedMotion?0:Math.sin(phase*1.7)>.7?1:0;
  c.save();c.globalAlpha*=alpha;const baseAlpha=c.globalAlpha;c.translate(Math.round(x),Math.round(y));c.scale(site.facing||1,1);
  const box=(xx,yy,w,h,ink)=>{c.fillStyle=ink;c.fillRect(xx,yy,w,h);};
  if(site.kind==='frog'){
   // The frog stays on its damp ledge. Ripples are drawn in its shallow pool,
   // not simulated as actors or added to the course's water/collision model.
   c.strokeStyle='#788f7c';c.lineWidth=1;
   const cycle=phase%23,slip=reducedMotion?0:cycle<15?0:cycle<16.2?(cycle-15)/1.2:cycle<18.5?1:cycle<19.7?1-(cycle-18.5)/1.2:0;
   const ripple=reducedMotion?0:Math.max(0,Math.min(1,(cycle-15.6)/4));
   c.globalAlpha=baseAlpha*(cycle>15.6&&cycle<19.6&&!reducedMotion?.45*(1-ripple):0);
   c.beginPath();c.ellipse(9,3,5+ripple*15,1+ripple*2,0,0,Math.PI*2);c.stroke();c.globalAlpha=baseAlpha*(1-slip);
   c.translate(Math.round(slip*9),Math.round(slip*4));
   box(-6,-5-breathe,11,5+breathe,'#617955');box(-3,-7-breathe,7,3,'#81916a');box(-7,-2,5,3,'#435c46');box(2,-2,6,3,'#435c46');
   box(2,-8-breathe,3,3,'#87986c');box(4,-7-breathe,1,1,'#243a35');
  }else if(site.kind==='hare'){
   const cycle=phase%29,travel=reducedMotion?0:cycle<18?0:cycle<21?(cycle-18)/3:cycle<24?1:cycle<27?1-(cycle-24)/3:0;
   const moving=!reducedMotion&&(cycle>18&&cycle<21||cycle>24&&cycle<27);
   c.translate(Math.round(travel*25),Math.round(travel*(site.travelRise||0))+(moving?-Math.round(Math.abs(Math.sin(phase*7))*2):0));
   box(-9,-8-breathe,14,7+breathe,'#acbdbe');box(-6,-11-breathe,9,4,'#bfcac6');box(3,-12,7,8,'#c4cfca');
   box(4,-23,2,12,'#c0cecc');box(8,-21,2,10,'#b2c4c5');box(5,-21,1,8,'#819a9f');box(9,-19,1,7,'#819a9f');
   box(-8,-2,8,3,'#91a9ae');box(2,-2,8,2,'#9db4b7');box(-11,-7,3,4,'#cad2c9');box(8,-10,1,1,'#364952');
  }else if(site.kind==='lizard'){
   const tail=reducedMotion?0:Math.round(Math.sin(phase*.9));
   box(-7,-4,14,3,'#8b7967');box(4,-6,7,4,'#a08b6e');box(-9,-3,4,2,'#76675e');box(-13,-2+tail,5,1,'#76675e');box(-17,-1+tail,5,1,'#76675e');
   box(-5,-1,2,3,'#8d7a65');box(-7,1,3,1,'#8d7a65');box(4,-1,2,3,'#8d7a65');box(5,1,3,1,'#8d7a65');box(9,-5,1,1,'#302e36');box(-5,-4,10,1,'#b29a77');
  }else{
   const flap=reducedMotion?2:1+Math.round(Math.abs(Math.sin(phase*5))*3);
   box(-4,-18-flap,3,flap,'#ad9eb7');box(1,-18-flap,3,flap,'#c1b2c9');box(-1,-19,2,4,'#6c627e');
  }
  c.restore();return;
 }
 if(site.kind==='fish'){
  const phase=time+(site.phase||0),dx=reducedMotion?0:Math.sin(phase*.5)*13,dy=reducedMotion?0:Math.sin(phase*.9)*4;
  c.save();c.globalAlpha*=alpha;c.translate(Math.round(x+dx),Math.round(y-24+dy));c.scale(site.facing||1,1);
  const tail=reducedMotion?3:2+Math.round(Math.sin(phase*6));
  c.fillStyle='#657d8b';c.fillRect(-7,-3,10,6);c.fillRect(-5,-4,6,1);c.fillRect(-5,3,6,1);c.fillRect(-10,-tail,3,tail*2);
  c.fillStyle='#8f9eaa';c.fillRect(-6,-2,7,1);c.fillStyle='#253c4b';c.fillRect(0,-1,1,1);c.restore();return;
 }
 const state=documents.get(c.canvas.ownerDocument),image=state?.images.get(site.kind),spec=sheets[site.kind];
 if(!image||!spec)return;
 const [,fw,fh,count,fps,height]=spec,phase=time+(site.phase||0),flying=['raven','butterfly'].includes(site.kind);
 let frame=reducedMotion?0:Math.floor(phase*fps)%count,dx=0,dy=0;
 let cover=0;
 if(site.kind==='rabbit'&&!reducedMotion){
  // A brief retreat into the authored root shelter, followed by a quiet peek.
  const cycle=phase%25;cover=cycle<17?0:cycle<18?cycle-17:cycle<20?1:cycle<21?21-cycle:0;dx=cover*14;dy=cover*3;
 }
 if(flying){
  const wing=site.kind==='raven';
  // Raven rests on the same perch most of the time, then flutters just above
  // it. Butterfly flight stays close to the vegetation, never on a route line.
  const flutter=wing?(phase%19>14):true;
  if(wing&&!flutter)frame=0;
  if(!reducedMotion&&flutter){dx=Math.sin(phase*.83)*9;dy=-5-Math.abs(Math.sin(phase*.57))*13;}
 }
 const cols=Math.floor(image.width/fw),sx=frame%cols*fw,sy=Math.floor(frame/cols)*fh;
 const w=fw*height/fh;
 c.save();c.globalAlpha*=alpha*(1-cover);c.imageSmoothingEnabled=false;c.translate(Math.round(x+dx),Math.round(y+dy));
 c.scale(site.facing||1,1);c.drawImage(image,sx,sy,fw,fh,Math.round(-w/2),-height+2,Math.round(w),height);c.restore();
}
