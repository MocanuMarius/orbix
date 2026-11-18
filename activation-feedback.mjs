import {ActivationFeed} from './activation-events.mjs?v=fast-1';
import {artifactIcon,skillIcon} from './upgrade-icons.mjs?v=fast-1';
import {companionArtSvg} from './companion-art.mjs?v=fast-1';
import {resourceSymbol} from './game-symbols.mjs?v=fast-1';
import {ARTIFACTS,SKILLS} from './model.mjs?v=fast-1';
import {formatGlow} from './vitality.mjs?v=fast-1';
import {lifeHeartSvg} from './lives.mjs?v=fast-1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={'card-watchlight':'Watchlight',collector:'Collector',protector:'Protector',swift:'Runner',leveler:'Space Timer',
  'main-echo-sight':'Echo Luminance','main-purifying-touch':'Purifying Touch','main-kindled-touch':'Kindled Touch',
  'proximity-awakening':'Edging Pulse','main-edging-regeneration':'Regenerative Pulse','proximity-light-shield':'Light Aegis',
  'collector-last-orbit':'Last Orbit','main-fourth-beat':'Double Lift','main-fourth-beat-2':'Climb','warm-core':'Warm Core','kindled-spirit':'Kindled Spirit',edgeweaver:'Collision ward'};
const portraitNames={'proximity-awakening':'Proximity','main-edging-regeneration':'Regenerative Pulse','proximity-light-shield':'Light Aegis','collector-last-orbit':'Last Orbit','main-fourth-beat':'Double Lift','main-fourth-beat-2':'Climb'};
export function activationPresentation(event){
  const name=ARTIFACTS[event.source]?.name||names[event.source]||SKILLS[event.source]?.name||event.label||'Activated';
  const icon=event.kind==='artifact'?artifactIcon(event.source):event.kind==='companion'?companionArtSvg(event.source)
    :skillIcon({...SKILLS[event.source],id:event.source,name:portraitNames[event.source]||name});
  const outcome=event.outcome||{},bits=[];
  if(outcome.saved)bits.push(`<span class="activation-rescue">SAVED${outcome.saved>1?` ×${outcome.saved}`:''}</span>`);
  if(typeof outcome.fuel==='number')bits.push(`<span title="${outcome.fuel>1e-7?'Sparks restored':'No Sparks restored'}">+${formatGlow(outcome.fuel)}${resourceSymbol('energy')}</span>`);
  if(outcome.recovery>0)bits.push(`<span>−${Number(outcome.recovery.toFixed(1))}s${resourceSymbol('clock')}</span>`);
  if(outcome.lifts>0)bits.push(`<span>+${outcome.lifts}${resourceSymbol('up')}</span>`);
  if(outcome.usedLift)bits.push(`<span>FREE${resourceSymbol('up')}</span>`);
  if(outcome.bounce)bits.push(`<span>FREE ½${resourceSymbol('up')}</span>`);
  if(outcome.hearts>0)bits.push(`<span>+${outcome.hearts}${lifeHeartSvg()}</span>`);
  if(outcome.waves>0)bits.push(`<span>+${outcome.waves} ${outcome.waves===1?'Pulse':'Pulses'}</span>`);
  if(outcome.reveal>0)bits.push(`<span>${Number(outcome.reveal.toFixed(1))}s${skillIcon({name:'Luminance'})}</span>`);
  if(outcome.duration>0)bits.push(`<span>${Number(outcome.duration.toFixed(1))}s</span>`);
  if(['up','down','right'].includes(outcome.direction))bits.push(`<span>${{up:'↑',down:'↓',right:'→'}[outcome.direction]}</span>`);
  if(outcome.stored>0)bits.push(`<span>+${outcome.stored}${resourceSymbol('packed')}</span>`);
  if(event.phase==='primed')bits.push('<span>CHARGED</span>');
  if(outcome.shield)bits.push('<span>WARD READY</span>');
  if(!bits.length)bits.push(`<span>${event.phase==='spent'?'USED':'ACTIVE'}</span>`);
  return {name,icon,outcome:bits.filter(Boolean).join(''),count:event.count||1};
}
export function createActivationFeedback(root){
  if(!root)return {update(){},clear(){},destroy(){}};
  const doc=root.ownerDocument,feed=new ActivationFeed(),nodes=new Map(),pulses=new Map();
  const layer=doc.createElement('div');layer.className='activation-feedback';layer.setAttribute('aria-live','off');layer.setAttribute('aria-label','Activated effects');
  const host=root.querySelector('.flight-effect-space')||root.querySelector('.canvas-wrap')||root;host.append(layer);
  let lastSequence=0,lastItems=null;
  const stopPulses=()=>{for(const [node,animation]of pulses){animation?.cancel?.();node.classList.remove('activation-triggered');}pulses.clear();};
  const clear=snapshot=>{feed.clear(snapshot);nodes.clear();layer.replaceChildren();stopPulses();lastItems=null;lastSequence=Number(snapshot?.activationSequence)||0;};
  return {clear,destroy(){clear();layer.remove();},update(snapshot){
    const items=feed.update(snapshot),alive=new Set();
    layer.dataset.reducedMotion=String(!!snapshot.reducedMotion);
    if(items!==lastItems)for(const item of items){
      const key=item.firstSequence||`${item.kind}:${item.source}:${item.phase||''}:${item.sequence-item.count+1}`;
      alive.add(key);let node=nodes.get(key);
      if(!node){node=doc.createElement('div');node.className='activation-cue';nodes.set(key,node);layer.append(node);}
      node.dataset.priority=String(item.priority||0);
      if(node.dataset.sequence!==String(item.sequence)){
        const view=activationPresentation(item);node.dataset.sequence=String(item.sequence);
        node.innerHTML=`<span class="activation-source">${view.icon}</span><span class="activation-outcome">${view.outcome}</span>${view.count>1?`<small class="activation-count">×${view.count}</small>`:''}`;
        node.title=view.name;node.setAttribute('aria-label',`${view.name}: ${node.textContent.trim()}`);
        if(!snapshot.reducedMotion&&typeof node.animate==='function')node.animate([{opacity:.45,transform:'scale(.82)'},{opacity:1,transform:'scale(1.14)',offset:.35},{opacity:1,transform:'scale(1)'}],{duration:390,easing:'ease-out'});
      }
      if(layer.children[alive.size-1]!==node)layer.insertBefore(node,layer.children[alive.size-1]||null);
    }
    if(items!==lastItems){for(const [key,node]of nodes)if(!alive.has(key)){node.remove();nodes.delete(key);}lastItems=items;}
    if(Number(snapshot.activationSequence)!==lastSequence)for(const event of snapshot.activationEvents||[]){
      if(event.sequence<=lastSequence||snapshot.paused||snapshot.finished||snapshot.dying||snapshot.time-event.time>1.4)continue;
      const mounted=[...root.querySelectorAll('[data-relic]')].find(node=>node.dataset.relic===event.source);
      if(!mounted)continue;
      pulses.get(mounted)?.cancel?.();mounted.classList.add('activation-triggered');
      const animation=!snapshot.reducedMotion&&mounted.animate?.([{transform:'scale(1)'},{transform:'scale(1.35)',offset:.35},{transform:'scale(1)'}],{duration:650,easing:'ease-out'});
      pulses.set(mounted,animation);const serial=event.sequence;
      mounted.dataset.activationSequence=String(serial);
      setTimeout(()=>{if(mounted.dataset.activationSequence===String(serial)){mounted.classList.remove('activation-triggered');pulses.delete(mounted);}},850);
    }
    lastSequence=Number(snapshot.activationSequence)||0;
    if(snapshot.paused||snapshot.finished||snapshot.dying)stopPulses();
  }};
}
