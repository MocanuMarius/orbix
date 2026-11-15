export function createNightmareGhost(scene){
 const ghost=Object.create(scene);ghost.player={...scene.player};ghost.dyingDuration=.38;
 if(scene.spacetime){
  const bent=scene.spacetime.fork(scene.layout.obstacles);
  ghost.layout={...scene.layout,obstacles:bent.obstacles};ghost.spacetime=bent.field;
  ghost.spacetimePreviewAt=scene.time;
 }
 return ghost;
}
export function advanceNightmareSpacetime(ghost,points,time){
 if(!Object.hasOwn(ghost,'spacetime')||!ghost.spacetime)return;
 const field=ghost.spacetime,engine=field.engine,end=Math.min(time,points.at(-1).time);
 while(ghost.spacetimePreviewAt<end-1e-7){
  const dt=Math.min(1/60,end-ghost.spacetimePreviewAt),at=ghost.spacetimePreviewAt+dt;
  const index=points.findIndex(p=>p.time>=at),b=index<0?points.at(-1):points[index],a=points[Math.max(0,index-1)];
  const blend=b.time>a.time?(at-a.time)/(b.time-a.time):0;
  engine.distance=a.x+(b.x-a.x)*blend-engine.player.x;engine.player.y=a.y+(b.y-a.y)*blend;
  field.update(dt,engine.layout.obstacles);ghost.spacetimePreviewAt=at;
 }
}
export function showNightmare(scene,path,onWake){
 const dialog=document.createElement('dialog');
 dialog.className='nightmare-vision';
 dialog.setAttribute('aria-label','Nightmare');
 dialog.innerHTML='<span>0.25×</span><i></i><i></i><button hidden>Must have been a nightmare</button>';
 scene.canvas.parentElement.parentElement.append(dialog);
 // Match the playfield even inside the scaled desktop phone frame.
 const bounds=scene.canvas.getBoundingClientRect();
 Object.assign(dialog.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});
 dialog.addEventListener('cancel',event=>event.preventDefault());
 dialog.showModal();
 const lids=dialog.querySelectorAll('i'),button=dialog.querySelector('button');
 const ghost=createNightmareGhost(scene);
 const points=path.points,first=points[0],last=points.at(-1);
 let age=0,previous=performance.now();
 function draw(now){
  if(scene.destroyed||!dialog.isConnected){dialog.remove();return;}
  age+=document.hidden?0:Math.min(.05,(now-previous)/1000);previous=now;
  const t=first.time+age*.25;
  const index=points.findIndex(p=>p.time>=t);
  const a=index<0?last:points[Math.max(0,index-1)],b=index<0?last:points[index];
  const blend=b.time>a.time?(t-a.time)/(b.time-a.time):0;
  ghost.distance=ghost.previousDistance=a.x+(b.x-a.x)*blend-scene.player.x;
  ghost.player.y=ghost.previousPlayerY=a.y+(b.y-a.y)*blend;
  advanceNightmareSpacetime(ghost,points,t);
  ghost.time=t;ghost.dying=t>=last.time;ghost.dyingAge=Math.max(0,t-last.time);ghost.deathCause='collision';
  const blink=age-(last.time-first.time+.38)*4;
  if(blink<.42)ghost.render();else scene.render();
  const amount=blink<0?0:blink<.42?blink/.42:blink<.6?1:Math.max(0,1-(blink-.6)/.45);
  for(const lid of lids)lid.style.transform='scaleY('+amount+')';
  if(blink<1.05){requestAnimationFrame(draw);return;}
  dialog.querySelector('span').hidden=true;button.hidden=false;button.focus();
 }
 button.onclick=()=>{
  dialog.close();dialog.remove();onWake();
  const flash=document.createElement('i');flash.className='nightmare-saved';
  scene.canvas.parentElement.append(flash);
  const start=performance.now();
  function pulse(now){
   const t=(now-start)/1000;
   if(t>=1||scene.destroyed){flash.remove();return;}
   flash.style.left=100*scene.player.x/scene.width+'%';
   flash.style.top=100*scene.player.y/scene.height+'%';
   flash.style.opacity=scene.reducedMotion?1-t:Math.sin(t*Math.PI*3)**2;
   requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);
 };
 requestAnimationFrame(draw);
}
