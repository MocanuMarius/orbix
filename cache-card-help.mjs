/** Three stills from an isolated flight: the same natural Cache, three events. */
import {WispFlight} from './flight.mjs?v=readable-1';
import {cardAmount, getCardModifiers, makeSkillCard, SKILL_CARDS} from './skill-cards.mjs?v=readable-1';
import {getPickupSpec, pickupKind} from './pickups.mjs?v=readable-1';
import {glowPoints} from './vitality.mjs?v=readable-1';
import {wispHome} from './wisp.mjs?v=readable-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const views = ['touch','deliver','cross'];
const captions = {
  touch: ['Touch', 'Your wisp touches the Cache.', '+18 Sparks', 'Cache absorbed'],
  deliver: ['Deliver', 'Collector reels it to your wisp.', '+12 Sparks on arrival', 'Needs Cache Handling'],
  cross: ['Cross', 'A Pulse passes over the Cache.', '', 'Cache remains'],
};

function exampleCard(card) {
  return SKILL_CARDS[card?.cardId]?.kind === 'harvest'
    ? structuredClone(card)
    : makeSkillCard('harvest-common','help:resonant-harvest');
}

function loadStyles(doc) {
  if(doc.querySelector('link[data-cache-help-styles]'))return;
  const link=doc.createElement('link');
  link.rel='stylesheet';link.href=new URL('./cache-card-help.css?v=readable-1',import.meta.url).href;
  link.dataset.cacheHelpStyles='';doc.head.append(link);
}

/** Crop the production renderer; there is no second pickup or wisp illustrator. */
function still(doc, engine, packet, event) {
  engine.accumulator=1/60;
  engine.previousPlayerY=engine.player.y;engine.previousDistance=engine.distance;
  engine.wisp.previousX=engine.wisp.x;engine.wisp.previousY=engine.wisp.y;
  engine.wisp.previousCargoX=engine.wisp.cargoX;engine.wisp.previousCargoY=engine.wisp.cargoY;
  engine.render();
  const source=engine.pixiReady?engine.pixiView.canvas:engine.canvas;
  const output=doc.createElement('canvas');output.width=480;output.height=250;
  const c=output.getContext('2d'),width=240,height=125;
  const x=packet.x-engine.distance-width/2,y=Math.max(0,Math.min(engine.height-height,packet.y-height/2));
  const sx=source.width/engine.width,sy=source.height/engine.height;
  c.imageSmoothingEnabled=false;c.drawImage(source,x*sx,y*sy,width*sx,height*sy,0,0,480,250);
  output.setAttribute('role','img');
  output.setAttribute('aria-label',{
    touch:'Actual flight: the large white wisp meets the dense white Cache.',
    deliver:'Actual flight: the small green Collector reels the intact Cache behind the larger white wisp.',
    cross:'Actual flight: a pale Pulse crosses the uncollected Cache, which stays in the passage.',
  }[event]);
  return output;
}

async function captureViews(doc, card, isDisposed) {
  const stage=doc.createElement('div'),canvas=doc.createElement('canvas');
  Object.assign(stage.style,{position:'fixed',left:'-20000px',top:'0',width:'640px',height:'270px',pointerEvents:'none'});
  Object.assign(canvas.style,{width:'640px',height:'270px'});stage.append(canvas);doc.body.append(stage);
  const modifiers=getCardModifiers({skillSystem:'cards-v1',mountedCards:[card]});
  let engine;
  try {
    engine=new WispFlight({canvas,seed:'cache-three-events-v1',terrain:'ruins',duration:70,
      node:{levelId:'ruins-aqueduct',difficulty:2,mapIndex:1,row:3},
      modifiers:{...modifiers,collectorFetchMass:3,cardCacheHandling:true},companionRole:'collector',
      flame:0,cardPilot:true,reducedMotion:true});
    engine.setMuted(true);
    await engine.ready;await engine.environmentArtReady;
    if(isDisposed())return;
    const original=engine.layout.embers.filter(p=>pickupKind(p)==='cache'&&getPickupSpec(p).fuel===60)
      .sort((a,b)=>Math.abs(a.y-engine.height/2)-Math.abs(b.y-engine.height/2))[0];
    if(!original)throw Error('No natural Cache in example flight');
    const packetTemplate=structuredClone(original),results={};
    engine.running=true;engine.paused=false;engine.tutorialAwaitingLift=false;
    // Advance only the relevant production system. The flight never starts a frame loop.
    for(const event of views) {
      const packet=structuredClone(packetTemplate);
      engine.wisp.clear(engine);engine.luminanceWaves.clear();
      engine.layout.embers=[packet];engine._pickupCount=0;engine._nearbyPacketsUntil=-1;
      engine.particles.length=0;engine.pickupEffects.length=0;engine.absorptionEffects.length=0;
      engine.time=1;engine.flame=0;engine.flameRestored=0;engine.player.y=packet.y;engine.player.vy=0;
      engine.distance=packet.x-engine.player.x-({touch:24,deliver:-62,cross:80}[event]);
      engine.previousDistance=engine.distance;engine.previousPlayerY=engine.player.y;
      engine.wisp.lastDistance=engine.distance;
      engine.wisp.orbitHome={x:engine.player.x,y:engine.player.y};
      engine.wisp.update(engine,1/60);
      if(event==='touch') {
        // Freeze the contact before the absorption removes the visible Cache.
        const image=still(doc,engine,packet,event);
        engine.collect(packet);
        results[event]={canvas:image,sparks:glowPoints(engine.flame),remains:!packet.collected};
      } else if(event==='deliver') {
        engine.wisp.beginReel(engine,packet,wispHome(engine.player));
        for(let i=0;i<25;i++){engine.time+=1/60;engine.wisp.update(engine,1/60);}
        const image=still(doc,engine,packet,event);
        // Complete the real reel to read the actual delivery payout.
        for(let i=0;i<700&&!packet.collected;i++){engine.time+=1/60;engine.wisp.update(engine,1/60);}
        results[event]={canvas:image,sparks:glowPoints(engine.flame),remains:!packet.collected};
      } else {
        engine.luminanceWaves.emit({x:engine.distance+engine.player.x,y:engine.player.y,radius:190,reveal:true});
        engine.time+=80/360;engine.luminanceWaves.update(80/360);
        results[event]={canvas:still(doc,engine,packet,event),sparks:glowPoints(engine.flame),remains:!packet.collected};
      }
    }
    return results;
  } finally {engine?.destroy();stage.remove();}
}

/** Read-only, disposable help; all run state and pickups belong to the preview. */
export function mountCacheCardHelp(host,{focus='touch',harvestCard}={}) {
  const doc=host.ownerDocument,card=exampleCard(harvestCard),amount=cardAmount(card),def=SKILL_CARDS[card.cardId];
  let disposed=false;
  loadStyles(doc);
  host.classList.add('cache-card-help');
  host.innerHTML=`<p class="cache-help-intro">The same Cache, three different events.</p><div class="cache-help-views">${views.map(event=>{
    const [title,action,reward,state]=captions[event];
    return `<figure data-cache-event="${event}"${event===focus?' data-cache-focus="true"':''}><figcaption><strong>${title}</strong><span>${esc(action)}</span></figcaption><div class="cache-help-scene" aria-busy="true">Loading flight…</div><p class="cache-help-reward">${esc(event==='cross'?`+${amount} ${amount===1?'Spark':'Sparks'}`:reward)}</p><p class="cache-help-state">${esc(state)}</p>${event==='cross'?`<small class="cache-help-card">Resonant Harvest · ${esc(def.rarity)}<br>Printed: +${amount}${def.stored?` Sparks · +${def.stored} Stored on first crossing`:' Sparks'}</small>`:''}</figure>`;
  }).join('')}</div>`;
  captureViews(doc,card,()=>disposed).then(results=>{
    if(disposed||!results)return;
    for(const event of views) {
      const figure=host.querySelector(`[data-cache-event="${event}"]`),scene=figure.querySelector('.cache-help-scene'),result=results[event];
      figure.dataset.cacheSparks=String(result.sparks);figure.dataset.cacheRemains=String(result.remains);
      scene.replaceChildren(result.canvas);scene.removeAttribute('aria-busy');
    }
    host.dataset.cacheReady='true';
  }).catch(error=>{
    if(disposed)return;
    host.querySelectorAll('.cache-help-scene').forEach(scene=>{scene.textContent='Flight image unavailable';scene.removeAttribute('aria-busy');});
    console.error('Cache glossary example',error);
  });
  return ()=>{disposed=true;};
}
