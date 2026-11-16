const note='<svg viewBox="0 0 12 18" aria-hidden="true" shape-rendering="crispEdges"><path d="M7 0h2v2h3v2H9v11H7v2H2v-1H0v-4h2v-1h5z"/></svg>';
const quiet=s=>!s||s.paused||s.finished||s.dying||s.completing||s.alive===false||s.tutorialAwaitingLift||s.dream&&s.dream.phase!=='done';

// Fixed SVG nodes are built once. Each phrase owns its world-time animations;
// meaningful snapshots retime those animations without allocating new nodes.
export function createRhythmScore(root){
  if(!root)return {update(){},clear(){},destroy(){}};
  const doc=root.ownerDocument,layer=doc.createElement('div');layer.className='rhythm-score';layer.hidden=true;
  layer.setAttribute('role','img');layer.setAttribute('aria-live','off');
  layer.innerHTML=`<span class="rhythm-note rhythm-first">${note}</span><span class="rhythm-note rhythm-second">${note}</span><span class="rhythm-note rhythm-catch" aria-hidden="true"></span><span class="rhythm-note rhythm-third">${note}</span>`;
  root.append(layer);const third=layer.querySelector('.rhythm-third');let signature='',animations=[],startedAt=0;
  const cancel=()=>{for(const animation of animations)animation.cancel();animations=[];};
  const synchronize=(state,rate)=>{
    const elapsed=Math.max(0,(state.now-startedAt)*1000);
    for(const animation of animations){
      if(animation.playbackRate!==rate)animation.playbackRate=rate;
      // Correct accumulated browser/frame drift using the evaluator's clock.
      // Ordinary sub-step interpolation needs no write on every HUD snapshot.
      if(!Number.isFinite(animation.currentTime)||Math.abs(animation.currentTime-elapsed)>40)animation.currentTime=elapsed;
    }
  };
  const position=()=>{const bar=root.querySelector('.flight-artifact-bar');layer.style.setProperty('--rhythm-top',`${Math.max(54,(bar?.offsetTop||0)+(bar?.offsetHeight||0)+3)}px`);};
  position();const view=doc.defaultView;view?.addEventListener('resize',position);
  const clear=()=>{cancel();signature='';layer.hidden=true;layer.dataset.phase='idle';};
  return {clear,destroy(){clear();view?.removeEventListener('resize',position);layer.remove();},update(snapshot){
    const state=snapshot?.cardRhythm;
    if(quiet(snapshot)||!state||state.phase==='idle'){if(!layer.hidden)clear();return;}
    const reduced=!!snapshot.reducedMotion,key=`${state.version}:${reduced}`,rate=Math.max(.001,snapshot.worldRate??1);
    if(key===signature){synchronize(state,rate);return;}signature=key;cancel();position();
    layer.hidden=false;layer.dataset.phase=state.phase;layer.dataset.reducedMotion=String(reduced);
    layer.setAttribute('aria-label',state.phase==='one'?'Rhythm: first note':state.phase==='two'?'Rhythm: two notes, catch the bright third note':state.phase==='caught'?'Rhythm: three notes caught':'Rhythm: third note missed');
    if(typeof third.animate!=='function')return;
    if(state.phase==='two'){
      startedAt=state.secondAt;
      const span=Math.max(0,state.closesAt-startedAt),untilOpen=Math.max(0,state.opensAt-startedAt),offset=span?Math.min(1,untilOpen/span):0;
      const duration=Math.max(1,span*1000);
      if(!reduced)animations.push(third.animate([{transform:'translateX(39px)'},{transform:'translateX(0)',offset},{transform:'translateX(0)'}],{duration,easing:'linear',fill:'forwards'}));
      const dim={opacity:.42,color:'#9da9a1',easing:'steps(1,end)'},bright={opacity:1,color:'#fbffe5'};
      animations.push(third.animate(untilOpen>0?[dim,{...bright,offset},bright]:[bright,bright],{duration,fill:'forwards'}));
    }else if(state.phase==='caught'||state.phase==='miss'){
      const caught=state.phase==='caught',duration=caught?280:340;startedAt=state.endsAt-duration/1000;
      if(typeof layer.animate==='function')animations.push(layer.animate(caught?[{opacity:1},{opacity:1,offset:.55},{opacity:0}]:[{opacity:1},{opacity:0}],{duration,easing:caught?'ease-out':'ease-in',fill:'forwards'}));
      if(!caught&&!reduced)animations.push(third.animate([{transform:'translateY(0)'},{transform:'translateY(10px)'}],{duration,easing:'ease-in',fill:'forwards'}));
    }
    synchronize(state,rate);
  }};
}
