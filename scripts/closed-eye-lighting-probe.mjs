import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';

const root=path.resolve('dist'),out=path.resolve('work/closed-eye-lighting-proof');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const bridge=`window.__closedEye={get engine(){return engine},get state(){return state},closeSheet,openDeck,async prepare({closedEye=true,mounted=['lantern-lens','rhythm','slip-feather','diving-bell','body-spark'],reserve=['watchlight','climb','harvest-rare']}={}){pauseFlight();document.querySelector('#pause-layer').replaceChildren();const C=await import('./skill-cards.mjs?v=guide-clarity-1'),r=state.run;r.attemptActive=true;r.attemptEntry={...r.attemptEntry,flightPact:closedEye?'blind-pilgrim':null};r.cardSlots=5;r.mountedCards=mounted.map((id,i)=>C.makeSkillCard(id,'closed-eye:'+i));r.reserveCards=reserve.map((id,i)=>C.makeSkillCard(id,'closed-eye:reserve:'+i));Object.assign(engine.mod,getRunModifiers(r));openDeck();},browse(){cardBrowsing=true;showCards();}};`;
const treatmentExpression=`[...document.querySelectorAll('.skill-card:not(.empty-card)')].map(card=>({name:card.dataset.cardName,id:card.dataset.cardHelp,state:card.dataset.cardEffectState,classes:card.className,filter:getComputedStyle(card.querySelector('.skill-card-art')).filter,titleFilter:getComputedStyle(card.querySelector('h3')).filter,opacity:getComputedStyle(card).opacity,pointerEvents:getComputedStyle(card).pointerEvents,warning:card.querySelector('.card-sight-warning')?.getAttribute('aria-label')||'',status:card.querySelector('.card-config-status')?.getAttribute('aria-label')||'',statusSymbol:card.querySelector('.card-config-symbol')?.textContent||''}))`;
function assertTreatment(cards,id,state){
  const card=cards.find(card=>card.id===id);assert.ok(card,`Missing ${id}: ${JSON.stringify(cards)}`);
  const grayscale=Number(card.filter.match(/grayscale\(([\d.]+)\)/)?.[1]||0);
  assert.equal(card.state,state,JSON.stringify(card));
  assert.equal(card.opacity,'1',JSON.stringify(card));
  assert.notEqual(card.pointerEvents,'none',JSON.stringify(card));
  if(state!=='active'&&card.statusSymbol)assert.notEqual(card.statusSymbol,'✓',JSON.stringify(card));
  assert.equal(card.classes.includes('card-effect-blocked'),state==='blocked',JSON.stringify(card));
  assert.equal(card.classes.includes('card-effect-partial'),state==='partial',JSON.stringify(card));
  if(state==='blocked')assert.equal(grayscale,1,JSON.stringify(card));
  if(state==='partial')assert.ok(grayscale>0&&grayscale<1,JSON.stringify(card));
  if(state==='active')assert.equal(grayscale,0,JSON.stringify(card));
}
const server=http.createServer(async(req,res)=>{try{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.concat([data,Buffer.from(bridge)]);
  if(path.basename(file)==='boundary-run-inspector.mjs')data=Buffer.from(data.toString().replace("'in-game-boundary-study',1)","'in-game-boundary-study',1,{cards:true})"));
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(e){res.writeHead(404).end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const b=await chrome(['--mute-audio']);
const reports=[];
try{
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.clear();localStorage.setItem('emberwing-muted','true');"});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  for(const [width,height] of [[900,405],[844,390],[720,280]]){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await b.visit(`http://127.0.0.1:${server.address().port}/game.html?display=native&mock=boundary&cards=1&biome=pinewood&course=1`);
    await until(()=>b.ev('!!window.__closedEye?.engine?.pixiView&&!!document.querySelector(".flight-entry[data-ready=true]")'),'flight',150);
    await b.ev('__closedEye.prepare()');
    const deck=await b.ev(`(()=>{
      const warnings=[...document.querySelectorAll('.card-sight-warning')];
      return warnings.map(w=>{const r=w.getBoundingClientRect(),art=w.closest('.card-illustration').getBoundingClientRect(),card=w.closest('.skill-card'),overlaps=[...card.querySelectorAll('.card-config-status,.card-use-counter')].some(b=>{const q=b.getBoundingClientRect();return r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top;});return {name:card.dataset.cardName,label:w.getAttribute('aria-label'),role:w.getAttribute('role'),text:w.innerText,rect:r.toJSON(),art:art.toJSON(),inside:r.left>=art.left&&r.right<=art.right&&r.top>=art.top&&r.bottom<=art.bottom,visible:r.width>0&&r.height>0,overlaps};});
    })()`);
    assert.equal(deck.length,4);assert.ok(deck.every(w=>w.visible&&w.inside&&!w.overlaps&&w.role==='img'),JSON.stringify(deck));
    const treatments=await b.ev(treatmentExpression);
    assertTreatment(treatments,'lantern-lens','blocked');
    assertTreatment(treatments,'rhythm','partial');
    assertTreatment(treatments,'body-spark','active');
    await b.shot(path.join(out,`deck-${width}x${height}.png`));
    await b.ev('__closedEye.browse()');
    await b.shot(path.join(out,`reserve-${width}x${height}.png`));
    const reserve=await b.ev('[...document.querySelectorAll(".card-deck-gallery .card-sight-warning,.card-reserve-gallery .card-sight-warning,.card-collection-grid .card-sight-warning")].map(w=>w.closest(".skill-card").dataset.cardName)');
    assert.deepEqual(reserve,['Watchlight','Climb']);
    const reserveTreatments=await b.ev(treatmentExpression);
    assertTreatment(reserveTreatments,'watchlight','partial');
    assertTreatment(reserveTreatments,'climb','partial');
    assertTreatment(reserveTreatments,'harvest-rare','active');
    const slots=await b.ev(`[...document.querySelectorAll('.card-slot-pick')].map(slot=>({classes:slot.className,state:slot.dataset.cardEffectState,filter:getComputedStyle(slot.querySelector('.skill-card-art')).filter,disabled:slot.disabled}))`);
    assert.equal(slots[0].state,'blocked');assert.match(slots[0].classes,/card-effect-blocked/);assert.match(slots[0].filter,/grayscale\(1\)/);
    assert.equal(slots[1].state,'partial');assert.match(slots[1].classes,/card-effect-partial/);assert.match(slots[1].filter,/grayscale\(0\.6\)/);
    assert.equal(slots[4].state,'active');assert.doesNotMatch(slots[4].classes,/card-effect-(blocked|partial)/);assert.doesNotMatch(slots[4].filter,/grayscale/);
    assert.ok(slots.every(slot=>!slot.disabled));
    await b.ev(`document.querySelector('[data-action="card-collection-back"]').click();document.querySelector('[data-action="card-slot"][data-index="0"]').click();document.querySelector('[data-action="card-inspect"]').click()`);
    const reader=await b.ev(treatmentExpression);
    assertTreatment(reader,'lantern-lens','blocked');
    const readerText=await b.ev('document.querySelector(".card-reading-body").innerText');
    assert.match(readerText,/Luminance blocked/);assert.doesNotMatch(readerText,/\bReady\b/);
    await b.shot(path.join(out,`reader-${width}x${height}.png`));
    reports.push({width,height,deck,reserve,treatments,reserveTreatments,reader,slots});
  }
  await b.ev(`__closedEye.prepare({closedEye:false,mounted:['body-spark','echo'],reserve:[]})`);
  const configurationBlocked=await b.ev(treatmentExpression);
  assertTreatment(configurationBlocked,'body-spark','active');
  assertTreatment(configurationBlocked,'echo','blocked');
  await b.shot(path.join(out,'configuration-blocked.png'));
  await b.ev(`__closedEye.prepare({closedEye:false,mounted:['echo','body-spark'],reserve:[]})`);
  const configurationRecovered=await b.ev(treatmentExpression);
  assertTreatment(configurationRecovered,'echo','active');
  await b.ev('__closedEye.prepare({closedEye:false})');
  const pactRecovered=await b.ev(treatmentExpression);
  for(const id of ['lantern-lens','rhythm','body-spark'])assertTreatment(pactRecovered,id,'active');
  assert.ok(pactRecovered.every(card=>!card.warning));
  await b.shot(path.join(out,'closed-eye-removed.png'));
  await b.ev(`__closedEye.prepare({mounted:['chameleon','lantern-lens','echo','diving-bell','body-spark'],reserve:[]})`);
  const copies=await b.ev(treatmentExpression);
  assertTreatment(copies,'chameleon','blocked');
  assertTreatment(copies,'echo','partial');
  await b.shot(path.join(out,'closed-eye-copies.png'));
  await b.ev('__closedEye.prepare()');
  await b.ev('__closedEye.closeSheet();document.querySelector("#pause-layer").replaceChildren();__closedEye.engine.luminanceWaves.clear();__closedEye.engine.render()');
  const lighting=await b.ev(`(async()=>{
    const e=__closedEye.engine;e.running=true;e.paused=false;e.luminanceWaves.clear();e.render();
    const fog=e.pixiView.fogContext,w=e.pixiView.fog.width,h=e.pixiView.fog.height;
    const baseline=new Uint8ClampedArray(fog.getImageData(0,0,w,h).data),before=e.getLightState();
    const {CardRhythm}=await import('./card-rhythm.mjs?v=guide-clarity-1');e.cardRhythm??=new CardRhythm(e);e.cardRhythm.clear();e.cardRhythm.lift(0);e.cardRhythm.lift(.5);e.cardRhythm.lift(1);
    const card=e.luminanceWaves.waves.find(w=>w.source==='card-rhythm');e.luminanceWaves.update(.4);e.paused=true;e.render();
    const suppressed=fog.getImageData(0,0,w,h).data,unchanged=suppressed.every((v,i)=>v===baseline[i]);
    e.luminanceWaves.clear();e.paused=false;
    e.collect({kind:'sight',x:e.distance+e.player.x+30,y:e.player.y,phase:0});e.luminanceWaves.update(.2);e.paused=true;e.render();
    const flash=e.luminanceWaves.waves.find(w=>w.sourceKind==='pickup');
    const lit=fog.getImageData(0,0,w,h).data;let changed=0;for(let i=3;i<lit.length;i+=4)if(baseline[i]-lit[i]>10)changed++;
    return {closedEye:e.mod.closedEye,radius:before.radius,baseRadius:before.baseRadius,cardSource:card.source,cardReveal:card.reveal,flashSource:flash.source,flashReveal:flash.reveal,flashRadius:e.getLightState().radius,unchanged,changed};
  })()`);
  assert.equal(lighting.closedEye,true);assert.equal(lighting.cardReveal,false);assert.equal(lighting.unchanged,true);assert.equal(lighting.flashReveal,true);assert.ok(lighting.changed>100);
  await b.shot(path.join(out,'flash-allowed.png'));
  assert.deepEqual(b.errors,[]);
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({reports,configurationBlocked,configurationRecovered,pactRecovered,copies,lighting,errors:b.errors},null,2));
  console.log(JSON.stringify({sizes:reports.map(r=>({width:r.width,height:r.height,equippedWarnings:r.deck.length,reserveWarnings:r.reserve})),lighting,errors:b.errors},null,2));
}catch(error){console.error(JSON.stringify({errors:b.errors,badResponses:b.badResponses,page:await b.ev('document.body.innerText.slice(0,1200)')},null,2));throw error;}
finally{b.close();await new Promise(r=>server.close(r));}
