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
 c.save();c.globalAlpha*=alpha;c.imageSmoothingEnabled=false;c.translate(Math.round(x+dx),Math.round(y+dy));
 c.scale(site.facing||1,1);c.drawImage(image,sx,sy,fw,fh,Math.round(-w/2),-height+2,Math.round(w),height);c.restore();
}
