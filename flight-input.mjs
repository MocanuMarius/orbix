const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function localGestureVector(dx,dy,{a=1,b=0,c=0,d=1}={}){
  const determinant=a*d-b*c;
  if(Math.abs(determinant)<1e-8)return {x:dx,y:dy};
  return {x:(d*dx-c*dy)/determinant,y:(a*dy-b*dx)/determinant};
}
function gestureBasis(target){
  const quad=target.getBoxQuads?.()[0];
  if(quad&&target.clientWidth&&target.clientHeight)return {
    a:(quad.p2.x-quad.p1.x)/target.clientWidth,b:(quad.p2.y-quad.p1.y)/target.clientWidth,
    c:(quad.p4.x-quad.p1.x)/target.clientHeight,d:(quad.p4.y-quad.p1.y)/target.clientHeight};
  let a=1,b=0,c=0,d=1;
  const view=target.ownerDocument?.defaultView;
  for(let node=target;node&&view?.getComputedStyle;node=node.parentElement){
    const transform=view.getComputedStyle(node).transform;
    if(!transform||transform==='none')continue;
    const matrix=new view.DOMMatrixReadOnly(transform);
    [a,b,c,d]=[matrix.a*a+matrix.c*b,matrix.b*a+matrix.d*b,matrix.a*c+matrix.c*d,matrix.b*c+matrix.d*d];
  }
  return {a,b,c,d};
}
export function classifyFieldGesture({x,y,peak,elapsed,threshold=28}){
  if(peak<=12&&elapsed<=700)return 'tap';
  if(elapsed>700||Math.max(Math.abs(x),Math.abs(y))<threshold)return null;
  if(Math.abs(y)>=Math.abs(x)*1.4)return y<0?'up':'down';
  if(x>0&&x>=Math.abs(y)*1.4)return 'right';
  return null;
}

// One pointer owns one action. Capturing it keeps release/cancel outside the
// playfield from becoming a second tap; extra fingers cancel the whole gesture.
export function bindFlightPointerControls({lift,playfield,getEngine,blocked=()=>false}){
  const doc=playfield.ownerDocument,view=doc.defaultView,pointers=new Set(),remove=[];
  let active=null;
  let hint;
  const refresh=()=>{
    const scene=getEngine(),owns=!!(scene?.mod.collectorFieldImpulse&&scene.hasCompanion('collector')&&!scene.tutorial);
    if(hint===owns)return;hint=owns;
    const text=owns?'Field Impulse: swipe up to levitate, down to dive, right to surge. Tap to Lift on release. The Lift control responds immediately.'
      :'Tap to Lift. With Space Timer, keep holding to levitate and release to glide. Power is on the right. MENU pauses.';
    playfield.querySelector?.('canvas')?.setAttribute('aria-label',text);
    playfield.title=owns?text:'';
  };
  refresh();
  const listen=(target,type,handler,options)=>{target?.addEventListener(type,handler,options);remove.push(()=>target?.removeEventListener(type,handler,options));};
  const allowed=scene=>scene&&scene===getEngine()&&!blocked()&&scene.running&&!scene.paused&&!scene.finished&&!scene.dying&&!scene.completing
    &&!['replay','awakening','ready','failed'].includes(scene.dream?.phase);
  const cancel=()=>{
    const previous=active;active=null;
    if(previous?.instant)previous.scene.endLiftInput(true);
  };
  listen(doc,'pointerdown',e=>{pointers.add(e.pointerId);if(active&&active.id!==e.pointerId)cancel();},true);
  const forget=e=>pointers.delete(e.pointerId);
  listen(doc,'pointerup',forget,true);listen(doc,'pointercancel',forget,true);
  listen(view,'blur',()=>{cancel();pointers.clear();});listen(view,'resize',cancel);
  listen(doc,'visibilitychange',()=>{if(doc.hidden){cancel();pointers.clear();}});
  for(const target of [lift,playfield]){
    listen(target,'pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0||e.isPrimary===false||pointers.size>1||active)return;
      if(target===playfield&&e.target?.closest?.('button,a,input,select,textarea,[data-action],[role="dialog"]'))return;
      e.preventDefault();
      const scene=getEngine();if(!allowed(scene))return;
      const instant=target===lift||!scene.mod.collectorFieldImpulse||!scene.hasCompanion('collector')||!!scene.tutorial;
      active={id:e.pointerId,scene,instant,x:e.clientX,y:e.clientY,time:e.timeStamp,peak:0,
        epoch:scene.inputEpoch||0,phase:scene.dream?.phase};
      if(!instant){active.basis=gestureBasis(playfield);active.threshold=clamp(Math.min(playfield.clientWidth||900,playfield.clientHeight||405)*.075,24,40);}
      try{target.setPointerCapture(e.pointerId);}catch{cancel();return;}
      if(instant)scene.beginLiftInput();
    });
    listen(target,'pointermove',e=>{
      if(active?.id!==e.pointerId)return;
      if(!allowed(active.scene)||(active.scene.inputEpoch||0)!==active.epoch){cancel();return;}
      if(active.instant)return;
      const vector=localGestureVector(e.clientX-active.x,e.clientY-active.y,active.basis);
      active.peak=Math.max(active.peak,Math.hypot(vector.x,vector.y));
    });
    const release=e=>{
      if(active?.id!==e.pointerId)return;
      e.preventDefault();const gesture=active;active=null;
      const eligible=allowed(gesture.scene)&&(gesture.scene.inputEpoch||0)===gesture.epoch&&gesture.scene.dream?.phase===gesture.phase;
      if(gesture.instant){gesture.scene.endLiftInput(e.type!=='pointerup'||!eligible);return;}
      if(e.type!=='pointerup'||!eligible)return;
      const vector=localGestureVector(e.clientX-gesture.x,e.clientY-gesture.y,gesture.basis);
      const action=classifyFieldGesture({...vector,peak:Math.max(gesture.peak,Math.hypot(vector.x,vector.y)),elapsed:e.timeStamp-gesture.time,threshold:gesture.threshold});
      if(action==='tap')gesture.scene.flap();
      else if(action)gesture.scene.activateFieldImpulse(action);
    };
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(target,type,release);
    listen(target,'contextmenu',e=>e.preventDefault());
  }
  return {cancel,refresh,destroy(){cancel();for(const off of remove)off();pointers.clear();}};
}
