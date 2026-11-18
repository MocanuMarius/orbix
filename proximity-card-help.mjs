/** Disposable comparisons: real run modifiers, terrain, renderer and proximity HUD. */
import {getRunModifiers} from './model.mjs?v=calm-2';
import {makeSkillCard, SKILL_CARDS} from './skill-cards.mjs?v=calm-2';
import {WispFlight} from './flight.mjs?v=calm-2';
import {getProximityClearance, obstacleEdgeClearance} from './edging-pulse.mjs?v=calm-2';
import {edgingPulseMarkup, updateEdgingPulse} from './edging-ui.mjs?v=calm-2';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name = card => SKILL_CARDS[card?.cardId]?.name || 'Empty';

/** Pure clone; deliberately never calls equip, save, wallet or live-flight APIs. */
export function proximityCardComparison(run, instanceId, slot) {
  const current = structuredClone(run), mounted = current.mountedCards || [],
    mountedIndex = mounted.findIndex(card => card?.instanceId === instanceId),
    card = mounted[mountedIndex] || current.reserveCards?.find(card => card.instanceId === instanceId)
      || current.cardReward?.card?.instanceId === instanceId && current.cardReward.card
      || makeSkillCard('edge-reach', instanceId || 'help:edge-reach');
  const before = structuredClone(current), after = structuredClone(current);
  let index = mountedIndex, displaced = null;
  if (mountedIndex >= 0) { before.mountedCards[mountedIndex] = null; (before.reserveCards ||= []).push(structuredClone(card)); }
  else {
    index = Number.isInteger(slot) && slot >= 0 && slot < mounted.length ? slot : mounted.findIndex(card => !card);
    if (index >= 0) { displaced = after.mountedCards[index]; after.mountedCards[index] = structuredClone(card); after.reserveCards=(after.reserveCards||[]).filter(c=>c.instanceId!==card.instanceId); if(displaced)after.reserveCards.push(displaced); }
  }
  const beforeMod = getRunModifiers(before), afterMod = index >= 0 ? getRunModifiers(after) : null;
  return {before, after, beforeMod, afterMod, index, displaced, cardId:card.cardId,cardName:name(card),equipped:mountedIndex >= 0,
    needsSlot:index < 0, slots:mounted.map((card,index) => ({index,name:name(card)})),
    beforeLabel:mountedIndex >= 0 ? 'Without this card' : 'Equipped now',
    afterLabel:mountedIndex >= 0 ? 'Equipped now' : `With ${name(card)} · slot ${index + 1}`};
}

function rangeLabel(mod, diameter = 18.7) {
  return mod?.proximityUnlocked ? `${(getProximityClearance(mod) / diameter).toFixed(1)} wisp widths` : 'Proximity off';
}

// Pick a pose against the actual generated solids. No diagram or invented wall.
function findPose(engine, gap = 60) {
  const obstacles = engine.layout.obstacles;
  let best = null;
  const clearance = (x,y) => Math.min(...obstacles.map(o => obstacleEdgeClearance(x,y,engine.player.radius,o,0,Infinity,engine.obstacleCenter(o))));
  for (const obstacle of obstacles.slice(0,12)) {
    for (const ratio of [.25,.5,.75]) {
      const x = obstacle.x + obstacle.width * ratio;
      for (let y = 45; y < engine.height - 45; y += 4) {
        const actual = clearance(x,y), error = Math.abs(actual-gap);
        if (!best || error < best.error) best={x,y,error,clearance:actual};
      }
    }
    if (best?.error < .02) break;
  }
  if (!best) throw Error('No solid terrain for proximity preview');
  // Refine the measured world-space clearance without changing the terrain.
  for (let y = best.y - 4; y <= best.y + 4; y += .02) {
    const actual=clearance(best.x,y),error=Math.abs(actual-gap);
    if(error<best.error)best={...best,y,error,clearance:actual};
  }
  return best;
}

async function capture(doc, run, mod, pose, seconds, gap = 60) {
  const stage=doc.createElement('div');
  stage.className='proximity-help-stage';
  Object.assign(stage.style,{position:'fixed',left:'-20000px',top:'0',width:'640px',height:'270px',pointerEvents:'none'});
  const canvas=doc.createElement('canvas');Object.assign(canvas.style,{width:'640px',height:'270px'});stage.append(canvas);doc.body.append(stage);
  let engine;
  try {
    // Use one authored level and seed for both branches, with actual loadout modifiers.
    engine=new WispFlight({canvas,seed:'edge-reach-help-solid-v1',terrain:'ruins',duration:40,
      node:{levelId:'ruins-aqueduct',difficulty:1,mapIndex:0,row:0},modifiers:mod,
      companions:run.companions,companionRole:run.companionRole,flame:run.flame,cardPilot:true,reducedMotion:true});
    engine.setMuted(true);
    await engine.ready;
    await engine.environmentArtReady;
    pose ||= findPose(engine,gap);
    engine.running=true;engine.paused=false;engine.time=0;
    engine.distance=pose.x-engine.player.x;engine.previousDistance=engine.distance;
    engine.player.y=pose.y;engine.previousPlayerY=pose.y;engine.player.vy=0;
    engine.wisp.x=engine.player.x;engine.wisp.y=pose.y+25;engine.wisp.previousX=engine.wisp.x;engine.wisp.previousY=engine.wisp.y;
    // Hold the same illustrated pose. Only the real pulse/wave systems advance.
    for(let i=0;i<Math.round(seconds*60);i++) {
      engine.time+=(1/60);engine.edgingPulse.update(1/60,engine.layout.obstacles);engine.luminanceWaves.update(1/60);
    }
    if(seconds===2) {
      engine.time+=.12;engine.edgingPulse.update(.12,engine.layout.obstacles);engine.luminanceWaves.update(.12);
    }
    engine.render();
    const snapshot=engine.getState(),source=engine.pixiReady?engine.pixiView.canvas:canvas,
      output=doc.createElement('canvas');
    output.width=640;output.height=210;
    const c=output.getContext('2d'),crop={x:engine.player.x-105,y:engine.player.y-74,width:360,height:360*210/640},sx=source.width/engine.width,sy=source.height/engine.height;
    c.imageSmoothingEnabled=false;c.drawImage(source,crop.x*sx,crop.y*sy,crop.width*sx,crop.height*sy,0,0,640,210);
    // A measured ruler over the real scene makes the unchanged body/solid gap readable.
    const target={clearance:Infinity};
    for(const obstacle of engine.layout.obstacles)obstacleEdgeClearance(pose.x,engine.player.y,engine.player.radius,obstacle,engine.time,Infinity,engine.obstacleCenter(obstacle),target);
    const dx=target.x-pose.x,dy=target.y-engine.player.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,scale=640/crop.width;
    const px=(engine.player.x-crop.x)*scale,py=(engine.player.y-crop.y)*scale;
    c.save();c.font='bold 15px monospace';c.lineWidth=2;c.setLineDash([3,4]);c.strokeStyle='#e9e3c1';
    c.beginPath();c.moveTo(px+ux*engine.player.radius*scale,py+uy*engine.player.radius*scale);c.lineTo(px+dx*scale,py+dy*scale);c.stroke();c.setLineDash([]);
    const tick=(reach,ink,label)=>{const x=px+ux*(engine.player.radius+reach)*scale,y=py+uy*(engine.player.radius+reach)*scale,labelY=Math.max(16,y);
      c.strokeStyle=ink;c.beginPath();c.moveTo(x-uy*7,y+ux*7);c.lineTo(x+uy*7,y-ux*7);c.stroke();
      c.fillStyle='#07120fe8';c.fillRect(x+10,labelY-12,158,19);c.fillStyle=ink;c.fillText(label,x+13,labelY+2);};
    tick(getProximityClearance({}),'#e5d5a4','Normal 2.6 widths');
    if(mod.proximityUnlocked&&getProximityClearance(mod)!==48)tick(getProximityClearance(mod),'#bcecff',`Reach ${(getProximityClearance(mod)/(engine.player.radius*2)).toFixed(1)} widths`);
    c.restore();
    output.setAttribute('role','img');output.setAttribute('aria-label',`Actual flight scene at ${pose.clearance.toFixed(1)} world units from solid terrain; ${Math.round(snapshot.edgingPulse.charge*100)}% charged`);
    return {canvas:output,snapshot,pose,diameter:engine.player.radius*2};
  } finally {engine?.destroy();stage.remove();}
}

export function mountProximityCardHelp(host, {run,instanceId,example=false} = {}) {
  if(!run)return () => {};
  let disposed=false,version=0,slot,seconds=1;
  async function render() {
    const ticket=++version,comparison=proximityCardComparison(run,instanceId,slot),doc=host.ownerDocument;
    host.innerHTML=`<div class="proximity-help-heading"><strong>${example?'Example loadout':'Your loadout'}</strong><span>${esc((run.mountedCards||[]).map((card,i)=>`${i+1}: ${name(card)}`).join(' · '))}</span></div>${comparison.equipped?'':`<label class="proximity-help-slot">Preview in slot <select aria-label="Slot for Proximity comparison"><option value="">${comparison.needsSlot?'Choose a card to replace':'Choose a different slot'}</option>${comparison.slots.map(s=>`<option value="${s.index}" ${comparison.index===s.index?'selected':''}>${s.index+1} · ${esc(s.name)}</option>`).join('')}</select></label>`}${comparison.needsSlot?'<p>Every slot is occupied. Choose the card this preview would replace.</p>':`<p class="proximity-help-placement">${comparison.equipped?`Slot ${comparison.index+1} removed only in the left preview.`:comparison.displaced?`Preview replaces ${esc(name(comparison.displaced))} in slot ${comparison.index+1}.`:`Preview uses empty slot ${comparison.index+1}.`} Your deck stays as it is.</p><div class="proximity-help-step"><span>Same pose · ${seconds===1?'1 second near terrain':'2 seconds + Pulse front'}</span><button type="button" data-proximity-step>${seconds===1?'See the Pulse at 2 s':'Back to 1 s'}</button></div><div class="proximity-help-pair"><figure data-side="before"><figcaption>${comparison.beforeLabel}<b>${rangeLabel(comparison.beforeMod)}</b></figcaption><small data-proximity-result></small><div class="proximity-help-scene">Loading flight…</div></figure><figure data-side="after"><figcaption>${comparison.afterLabel}<b>${rangeLabel(comparison.afterMod)}</b></figcaption><small data-proximity-result></small><div class="proximity-help-scene">Loading flight…</div></figure></div>`}<p class="proximity-help-reference">Normal reach: ${(getProximityClearance({})/18.7).toFixed(1)} wisp widths. Proximity enables normal reach. Each Edge Reach source adds 50% of normal: 48 → 72 → 96 world units. Distance is from your wisp’s edge to solid terrain.</p>`;
    host.querySelector('select')?.addEventListener('change',event=>{slot=event.target.value===''?undefined:Number(event.target.value);render();});
    host.querySelector('[data-proximity-step]')?.addEventListener('click',()=>{seconds=seconds===1?2:1;render();});
    if(comparison.needsSlot)return;
    try {
      let pose;
      for(const side of ['before','after']) {
        const result=await capture(doc,comparison[side],comparison[`${side}Mod`],pose,seconds,comparison.cardId==='slip-feather'?36:60);pose=result.pose;
        if(disposed||ticket!==version)return;
        const figure=host.querySelector(`[data-side="${side}"]`),scene=figure.querySelector('.proximity-help-scene');
        scene.replaceChildren(result.canvas);
        scene.insertAdjacentHTML('beforeend',edgingPulseMarkup());
        updateEdgingPulse(scene.querySelector('.edging-pulse-gauge'),result.snapshot);
        const pulse=result.snapshot.edgingPulse;
        figure.querySelector('[data-proximity-result]').textContent=`${pose.clearance.toFixed(0)} world units · ${(pose.clearance/result.diameter).toFixed(1)} widths away · ${pulse.active?'Pulse emitted':`${Math.round(pulse.charge*100)}% charged`}`;
        figure.dataset.charge=String(pulse.charge);figure.dataset.waves=String(pulse.triggerCount);
      }
      host.dataset.proximityReady='true';
    } catch(error) {
      if(!disposed&&ticket===version)host.querySelectorAll('.proximity-help-scene').forEach(scene=>{scene.textContent='Flight preview unavailable';});
      console.error('Proximity comparison',error);
    }
  }
  render();
  return () => {disposed=true;version++;};
}
