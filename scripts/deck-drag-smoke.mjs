import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const output = path.resolve("work/deck-drag-proof");
await fs.mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const file = path.resolve(
      "dist",
      "." + (url.pathname === "/" ? "/index.html" : url.pathname),
    );
    const data = await fs.readFile(file);
    res
      .writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = (process.env.CARDS_QA_BASE || "http://127.0.0.1:" + server.address().port).replace(/\/$/, '');
const release = /app\.mjs\?v=([^"']+)/.exec(await fs.readFile('dist/game.html', 'utf8'))?.[1] || 'skills-cards-2';
const browser = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "--mute-audio",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, label) {
  for (let i = 0; i < 150; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    await delay(100);
  }
  throw Error("Timed out: " + label);
}
let socket;
const errors = [];
try {
  const port = await until(
    async () =>
      Number(
        (
          await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")
        ).split("\n")[0],
      ),
    "browser",
  );
  const target = await until(
    async () =>
      (
        await (await fetch("http://127.0.0.1:" + port + "/json/list")).json()
      ).find((item) => item.type === "page"),
    "page",
  );
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  let serial = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const [resolve, reject] = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? reject(Error(message.error.message))
        : resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++serial;
      pending.set(id, [resolve, reject]);
      socket.send(JSON.stringify({ id, method, params }));
    });
  const ev = async (expression) => {
    expression=expression.replaceAll('skills-cards-2',release);
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result.value;
  };
  const rect = selector => ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing: '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()`);
  const click = async selector => {
    const p=await rect(selector);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});
    await delay(60);
  };
  const page = async (url) => {
    await send("Page.navigate", { url: base + url });
    await until(
      () => ev("!!document.querySelector('.front-new-button')"),
      "home",
    );
  };
  const screenshot = async (label) => {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(
      path.join(output, label + ".png"),
      Buffer.from(shot.data, "base64"),
    );
  };
  const bounds = async (selector, label) => {
    const entries = await ev(
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent.trim().slice(0,45),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}})`,
    );
    const viewport = await ev("({width:innerWidth,height:innerHeight})");
    for (const entry of entries)
      assert.ok(
        entry.x >= -1 &&
          entry.y >= -1 &&
          entry.right <= viewport.width + 1 &&
          entry.bottom <= viewport.height + 1 &&
          entry.width > 0 &&
          entry.height > 0,
        `${label}: ${JSON.stringify(entry)} / ${JSON.stringify(viewport)}`,
      );
  };

  const saved=()=>ev("JSON.parse(localStorage.getItem('cards-pilot:wispbound.save.condensed.v7'))");
  const ids=()=>ev("[...document.querySelectorAll('[data-action=card-slot]')].map(e=>e.dataset.deckSlotId||null)");
  const card=id=>'[data-deck-drag-id="'+id+'"]';
  const slot=index=>'[data-action="card-slot"][data-index="'+index+'"]';
  const dropTarget=index=>'[data-deck-drop="slot"][data-index="'+index+'"]';
  const returnTarget='[data-deck-drop="return"]';
  const metrics=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await delay(70);};
  const reveal=async id=>{while(await ev("!document.querySelector('[data-action=card-page]').disabled"))await click('[data-action=card-page]');for(let n=0;n<40;n++){if(await ev(`!!document.querySelector('.card-deck-gallery [data-action=card-select][data-id='+${JSON.stringify(JSON.stringify(id))}+']')`))return;const next=await ev("[...document.querySelectorAll('[data-action=card-page]')].at(-1).dataset.page");await click('[data-action=card-page][data-page="'+next+'"]');}throw Error('Missing gallery card '+id)};
  const touch=async(type,p)=>send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1,radiusX:7,radiusY:7,force:1}]:[]});
  const tap=async selector=>{const p=await rect(selector);await touch('touchStart',p);await delay(30);await touch('touchEnd');await delay(70);};
  const escape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(70);};
  const movePath=async(a,b,type)=>{
    for(let i=1;i<=12;i++){const p={x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12};
      if(type==='mouse')await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,buttons:1,button:'left'});else await touch('touchMove',p);
      await delay(12);
    }
  };
  const drag=async(source,destination,{type='touch',shot=null,cancel=false}={})=>{
    const a=await rect(source==='.card-read-face'?source+' .card-illustration':source),b=typeof destination==='string'?await rect(destination):destination;
    if(type==='mouse')await send('Input.dispatchMouseEvent',{type:'mousePressed',x:a.x,y:a.y,button:'left',clickCount:1});else await touch('touchStart',a);
    await movePath(a,b,type);
    if(shot){await screenshot(shot);assert.equal(await ev("!!document.querySelector('.card-drag-ghost')"),true,JSON.stringify(await ev("({proof:globalThis.pointerProof?.slice(-15),root:document.querySelector('[data-deck-editable]')?.outerHTML.slice(0,500),source:document.querySelector('[data-deck-drag-id]')?.outerHTML.slice(0,400),active:document.activeElement?.outerHTML.slice(0,300)})")));}
    if(type==='mouse')await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1});else await touch(cancel?'touchCancel':'touchEnd');
    await delay(85);
    assert.equal(await ev("document.querySelectorAll('.card-drag-ghost,.card-drag-feedback,.card-drop-ready,.card-drop-hover,.card-drag-origin').length"),0,'drag decorations cleaned');
  };
  const fixture=async(five=false,kind='map')=>{
    await send('Page.navigate',{url:base+'/loading.html'});await until(()=>ev("location.pathname.endsWith('/loading.html')"),'fixture');
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2'),C=await import('./skill-cards.mjs?v=skills-cards-2');const s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'drag-proof',1,{cards:true});const r=s.run;r.startingGiftId='card:body-spark';r.guideSkipped=true;r.mountedCards=['echo','spark-cache','field-impulse'].map((id,i)=>C.makeSkillCard(id,'mounted:'+i));r.reserveCards=['body-spark','spark-cache','harvest-rare','harvest-legendary','cache-handling','flash-handling'].map((id,i)=>C.makeSkillCard(id,'stored:'+i));r.mountedCards[1].charges=4;r.condensedGlow=120;if(${five}){r.cardSlots=5;r.mountedCards.push(C.makeSkillCard('chameleon','mounted:3'),C.makeSkillCard('harvest-legendary','mounted:4'));}if(${JSON.stringify(kind)}==='camp'){const n=r.map.flat().find(n=>n.kind==='camp');r.step=n.row;r.current=n;r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];r.phase='support';M.getSupportChoices(r,s.profile);}M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');await click('[data-action="skills"]');await until(()=>ev("!!document.querySelector('.card-deck')"),'Deck');
  };
  await send('Page.enable');await send('Runtime.enable');
  await metrics(740,333);await fixture();
  assert.equal(await ev("document.querySelectorAll('.card-deck-pick[aria-pressed=true],.card-slot-pick.selected').length"),0,'fresh Deck has no implied selection');
  assert.equal(await ev("[...document.querySelectorAll('.card-deck-gallery .card-deck-pick')].some(e=>e.dataset.id.startsWith('mounted:'))"),false,'gallery contains reserve only');
  await tap('.card-deck-help>summary');await escape();
  assert.equal(await ev("!!document.querySelector('dialog.card-bench-sheet[open]')&&!document.querySelector('.card-deck-help').open"),true,'help Escape stays in Deck');
  // A single-card operation stays attached to that card; Escape cancels it.
  await tap('.card-deck-gallery '+card('stored:1'));
  await tap('[data-action="card-preview-improve"]');await escape();
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),true,'Improve Escape returns to reader');
  await tap('[data-action="card-melt-this"]');
  assert.equal(await ev("document.querySelectorAll('.card-batch-melt-list>div').length"),1,'Melt this card reviews exactly one');
  await escape();assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),true,'single Melt Escape returns to reader');
  assert.equal((await saved()).run.reserveCards.length,6);
  await escape();assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),false,'reader Escape returns Deck');
  // Batch review Back keeps picks; Cancel then discards the temporary workspace.
  await tap('[data-action="card-melt-mode"]');await tap('[data-action="card-select"][data-id="stored:0"]');await tap('[data-action="card-preview-melt-selected"]');
  await escape();assert.equal(await ev("document.querySelector('[data-action=card-select][data-id=\"stored:0\"]').getAttribute('aria-pressed')"),'true');
  await escape();assert.equal(await ev("!!document.querySelector('.card-deck-melt-mode')"),false,'batch Escape returns origin');
  await ev("globalThis.pointerProof=[];['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'].forEach(type=>document.addEventListener(type,e=>pointerProof.push({trusted:e.isTrusted,type:e.pointerType,event:type,x:e.clientX,y:e.clientY,target:e.target.tagName}),true))");
  // A gallery touch drag replaces a full slot, preserving its former card.
  await drag('.card-deck-gallery '+card('stored:0'),dropTarget(1),{shot:'touch-occupied-preview-740x333'});
  assert.equal((await saved()).run.mountedCards[1].instanceId,'stored:0');
  assert.ok((await saved()).run.reserveCards.some(c=>c.instanceId==='mounted:1'));
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),false,'drag did not open inspector');
  assert.equal((await saved()).run.cardHistory.at(-1).type,'equip');
  // Drag equipped slots to swap, then unmount to an explicit target.
  await drag(slot(0),dropTarget(1),{type:'mouse',shot:'mouse-swap-preview-740x333'});
  assert.deepEqual((await saved()).run.mountedCards.map(c=>c?.instanceId),['stored:0','mounted:0','mounted:2']);
  await drag(slot(1),returnTarget);
  assert.equal((await saved()).run.mountedCards[1],null);
  // Empty-slot selection has an explicit cancellable reserve chooser.
  await tap(slot(1));assert.equal(await ev("!!document.querySelector('.card-deck-reserve-picker')"),true,'empty slot opens chooser');
  await escape();assert.equal((await saved()).run.mountedCards[1],null,'chooser Escape does not equip');
  await tap(slot(1));await reveal('mounted:1');await tap('[data-action="card-select"][data-id="mounted:1"]');
  assert.equal((await saved()).run.mountedCards[1].instanceId,'mounted:1','reserve picker equips target');
  assert.equal(await ev("!!document.querySelector('.card-deck-reading,.card-deck-reserve-picker')"),false,'picker returns overview');
  await drag(slot(1),returnTarget);
  // Drag a gallery card into an empty slot.
  await reveal('mounted:1');await drag('.card-deck-gallery '+card('mounted:1'),dropTarget(1));
  assert.equal((await saved()).run.mountedCards[1].instanceId,'mounted:1');
  // A short tap inspects; the whole inspected card can itself be dragged.
  await reveal('stored:1');await tap('.card-deck-gallery '+card('stored:1'));
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),true);
  await drag('.card-read-face',dropTarget(2),{shot:'read-face-touch-preview-740x333'});
  assert.equal((await saved()).run.mountedCards[2].instanceId,'stored:1');
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),true);
  const unchanged=JSON.stringify((await saved()).run.mountedCards);
  // Invalid area and a browser touch cancel do nothing.
  await drag('.card-read-face',{x:3,y:3});
  assert.equal(JSON.stringify((await saved()).run.mountedCards),unchanged);
  await drag('.card-read-face',dropTarget(0),{cancel:true});
  assert.equal(JSON.stringify((await saved()).run.mountedCards),unchanged);
  // Removing the overlay while captured cleans up without committing.
  const a=await rect('.card-read-face .card-illustration'),b=await rect(dropTarget(0));await touch('touchStart',a);await movePath(a,b,'touch');
  await ev("document.querySelector('dialog.card-bench-sheet').close()");await touch('touchEnd');await delay(60);
  assert.equal(JSON.stringify((await saved()).run.mountedCards),unchanged);
  assert.equal(await ev("!!document.querySelector('.card-drag-ghost')"),false);
  await click('[data-action="skills"]');
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),false,'external Deck entry starts at overview');
  await click(slot(2));
  // Keyboard control remains available: Equip/slot and Unequip all use buttons.
  await click('[data-action="card-equip"]');
  await ev("document.querySelector('[data-action=card-slot][data-index=\"0\"]').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await delay(70);
  await screenshot('keyboard-equip');assert.equal((await saved()).run.mountedCards[0].instanceId,'stored:1',JSON.stringify(await ev("({active:document.activeElement?.outerHTML.slice(0,500),equip:document.querySelector('[data-action=card-cancel-equip]')?.outerHTML,read:document.querySelector('.card-read-location')?.textContent})")));
  await click('[data-action="card-unequip"]');assert.equal((await saved()).run.mountedCards[0],null);
  await click('[data-action="card-reading-back"]');
  // Many swaps through redraws must not multiply event handlers or spend cards.
  for(let i=0;i<8;i++)await drag(slot(1),dropTarget(2),{type:i%2?'touch':'mouse'});
  assert.equal((await saved()).run.mountedCards.filter(Boolean).length+(await saved()).run.reserveCards.length,9);
  assert.equal((await saved()).run.cardHistory.filter(e=>e.type==='melt').length,0);
  assert.ok((await ev('pointerProof')).some(e=>e.trusted&&e.type==='touch'));
  assert.ok((await ev('pointerProof')).some(e=>e.trusted&&e.type==='mouse'));
  // Changes survive a real reload.
  const persisted=(await saved()).run.mountedCards;await page('/game.html?cards=1');await click('[data-action="continue-run"]');await click('[data-action="skills"]');
  assert.deepEqual((await saved()).run.mountedCards,persisted);
  // Melt mode has no drag handles or drop targets; dragging can never melt.
  await click('[data-action="card-melt-mode"]');assert.equal(await ev("document.querySelectorAll('[data-deck-drag-id],[data-deck-drop]').length"),0);
  await click('[data-action="card-cancel-melt"]');
  // Actual paused flight edits use the same live world, charge ledger and banked wallet.
  await fixture();await tap('[data-action="close-sheet"]');
  await ev("(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-2');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...a){globalThis.qaDragFlight=this;return start.apply(this,a)}})()");
  const node=await ev("document.querySelector('.reachable[data-action=preview-node]')?.dataset.id");assert.ok(node);
  await tap('[data-action="preview-node"][data-id="'+node+'"]');await tap('[data-action="node"][data-id="'+node+'"]');
  await until(()=>ev("!!globalThis.qaDragFlight&&!!document.querySelector('.flight-resume-gate')"),'flight');await tap('[data-action="wake-flight"]');await tap('.flight-menu-slot [data-action="menu"]');
  await ev("qaDragFlight.cardExecution.cards[1].charges=2;qaDragFlight.condensedGlow=50;globalThis.pausedPackSnapshot={time:qaDragFlight.time,distance:qaDragFlight.distance,flame:qaDragFlight.flame};");
  await tap('#pause-layer [data-action="skills"]');
  assert.ok(await ev("document.querySelectorAll('[data-deck-drag-id],[data-deck-drop]').length>0"));
  assert.match(await ev(`document.querySelector('[data-action=card-slot][data-index="1"]').textContent`),/2 uses/);
  // Improve preserves live uses; drag moves left and right without advancing time.
  await tap(slot(1));await tap('[data-action="card-preview-improve"]');await tap('[data-action="card-confirm-improve"]');
  assert.equal((await saved()).run.mountedCards[1].rank,2);assert.equal((await saved()).run.mountedCards[1].charges,2);
  await drag('.card-read-face',dropTarget(2));await drag('.card-read-face',dropTarget(1));
  assert.equal(await ev("qaDragFlight.cardExecution.cards[1].charges"),2);
  await tap('[data-action="card-reading-back"]');await tap(slot(0));
  assert.match(await ev("document.querySelector('.card-neighbor-hint').textContent"),/immediate right.*triggered actions/);
  await tap('[data-action="card-reading-back"]');
  await tap('[data-action="card-preview-forge"][data-rarity="rare"]');
  for(const [w,h] of [[720,280],[740,333]]){await metrics(w,h);await bounds('.card-forge-preview button,.card-forge-preview .card-readable','Paused Forge '+w);await screenshot('paused-repeatable-forge-'+w+'x'+h);}
  const offers=[];
  for(let i=0;i<3;i++){offers.push(await ev("document.querySelector('[data-action=card-confirm-forge]').dataset.token"));await tap('[data-action="card-confirm-forge"]');}
  assert.equal(new Set(offers).size,3);assert.equal((await saved()).run.condensedGlow,15);
  assert.equal(await ev("document.querySelector('[data-action=card-confirm-forge]').disabled"),true,'unbanked 50 cannot pay Forge');
  assert.equal(await ev('qaDragFlight.condensedGlow'),50);
  // A named Forge receipt opens its card, whose Back returns this same Forge.
  const forgedId=await ev("document.querySelector('[data-action=card-forge-view]').dataset.id");
  await tap('[data-action="card-forge-view"]');assert.equal(await ev("document.querySelector('[data-action=card-melt-this]').dataset.id"),forgedId);
  await escape();assert.equal(await ev("!!document.querySelector('.card-forge-preview')"),true);
  await tap('[data-action="card-melt-mode"]');await tap('[data-action="card-select"][data-id="stored:0"]');await escape();
  assert.equal(await ev("!!document.querySelector('.card-forge-preview')"),true,'funding Cancel returns Forge');
  // Melt several reserves, then reopen Forge within the same paused pack.
  await tap('[data-action="card-melt-mode"]');
  const meltIds=['stored:0','stored:2'];
  for(const id of meltIds){await reveal(id);await tap('[data-action="card-select"][data-id="'+id+'"]');}
  await tap('[data-action="card-preview-melt-selected"]');await tap('[data-action="card-confirm-melt-selected"]');
  assert.equal((await saved()).run.condensedGlow,45);
  assert.equal(await ev("!!document.querySelector('.card-forge-preview')"),true,'funding success returns Forge');
  await tap('[data-action="card-preview-forge"][data-rarity="rare"]');await tap('[data-action="card-confirm-forge"]');assert.equal((await saved()).run.condensedGlow,15);
  await tap('[data-action="card-forge-back"]');await drag(slot(0),dropTarget(1));await drag(slot(1),dropTarget(0));
  const live=await ev("({time:qaDragFlight.time,distance:qaDragFlight.distance,flame:qaDragFlight.flame,paused:qaDragFlight.paused,banked:qaDragFlight.condensedStart,earned:qaDragFlight.condensedGlow,uses:qaDragFlight.getCardChargeLedger()['mounted:1']})");
  const frozen=await ev('pausedPackSnapshot');assert.equal(live.time,frozen.time);assert.equal(live.distance,frozen.distance);assert.ok(live.flame<=frozen.flame);assert.equal(live.paused,true);assert.equal(live.banked,15);assert.equal(live.earned,50);assert.equal(live.uses,2);
  await screenshot('paused-flight-edited-740x333');
  const donePoint=await rect('[data-action="close-sheet"]');
  await touch('touchStart',donePoint);await movePath(donePoint,{x:donePoint.x-170,y:donePoint.y+90},'touch');await touch('touchEnd');await delay(70);
  assert.equal(await ev("!!document.querySelector('dialog.card-bench-sheet[open]')"),true,'Done drag-away cancels');
  await touch('touchStart',donePoint);await touch('touchCancel');await delay(70);
  assert.equal(await ev("!!document.querySelector('dialog.card-bench-sheet[open]')"),true,'Done touchcancel does nothing');
  await touch('touchStart',donePoint);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:donePoint.x,y:donePoint.y,id:1},{x:donePoint.x-70,y:donePoint.y+10,id:2}]});await touch('touchEnd');await delay(70);
  assert.equal(await ev("!!document.querySelector('dialog.card-bench-sheet[open]')"),true,'Done multitouch cancels');
  await tap('[data-action="close-sheet"]');await until(()=>ev("!document.querySelector('dialog.card-sheet[open]')"),'Done touch click completed');
  assert.equal(await ev('qaDragFlight.paused'),true);
  await tap('#pause-layer [data-action="resume"]');await until(()=>ev('!qaDragFlight.paused'),'resume after pack');
  assert.equal(await ev('qaDragFlight.cardExecution.cards[1].charges'),2);
  // Opening from the flight HUD returns through its safe tap gate.
  await tap('#flight-condensed');assert.equal(await ev('qaDragFlight.paused'),true);
  await tap('[data-action="close-sheet"]');await until(()=>ev("!!document.querySelector('.flight-resume-gate')"),'HUD Done safe tap gate');
  assert.equal(await ev('qaDragFlight.paused'),true,'Done does not leak through to Resume');
  await tap('[data-action="wake-flight"]');assert.equal(await ev('qaDragFlight.paused'),false);
  // Finger targets remain at least 44px with five slots in all requested sizes.
  await fixture(true);
  for(const [w,h] of [[720,280],[740,333],[900,405]]){
    await metrics(w,h);await bounds('.card-deck button,.card-deck-return','Deck '+w);await screenshot('deck-5slots-'+w+'x'+h);
    const small=await ev("[...document.querySelectorAll('[data-deck-drop]')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}})");
    for(const r of small)assert.ok(r.width>=44&&r.height>=44,JSON.stringify(r));
    await tap('.card-deck-pick');await bounds('.card-deck-reading button,.card-read-face,.card-deck-return','Read '+w);assert.equal(await ev("(()=>{const e=document.querySelector('.card-read-controls');return e.scrollHeight<=e.clientHeight+1})()"),true,'Reader controls fit without clipping '+w);await screenshot('read-5slots-'+w+'x'+h);
    const reading=await ev("[...document.querySelectorAll('[data-deck-drop]')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}})");
    for(const r of reading)assert.ok(r.width>=44&&r.height>=44,JSON.stringify(r));
    await drag('.card-read-face',dropTarget(1),{shot:'read-5slots-drag-'+w+'x'+h});
    await tap('[data-action="card-reading-back"]');
  }
  // A nonflight menu and a direct Rest Forge each return to their real caller.
  await fixture();await click('[data-action="close-sheet"]');await click('[data-action="menu"]');await click('dialog.game-menu-sheet [data-action="skills"]');await escape();
  assert.equal(await ev("!!document.querySelector('dialog.game-menu-sheet[open]')"),true,'Deck Done restores Run menu');
  await fixture(false,'camp');await click('[data-action="close-sheet"]');
  const campActions=(await saved()).run.cardRest.actions;
  await click('.card-rest-deck-links [data-action="card-preview-forge"]');await click('[data-action="card-preview-forge"][data-rarity="legendary"]');await escape();
  assert.equal(await ev("!!document.querySelector('dialog.card-sheet[open]')"),false,'Forge Escape returns direct Rest');
  assert.deepEqual((await saved()).run.cardRest.actions,campActions,'Forge browsing spends no Rest action');
  await click('[data-action="skills"]');await click('[data-action="card-select"][data-id="stored:0"]');await click('[data-action="card-melt-this"]');await click('[data-action="card-confirm-melt-selected"]');
  assert.equal((await saved()).run.reserveCards.some(c=>c.instanceId==='stored:0'),false);
  assert.equal(await ev("!!document.querySelector('.card-deck-reading,.card-deck-melt-mode')"),false,'single Melt success returns surviving hub');
  assert.match(await ev("document.querySelector('.card-deck-collection-heading small').textContent"),/melted · \+\d+ Stored Sparks banked/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,trustedTouch:true,trustedMouse:true,checks:['fresh-overview','reserve-only','native-escape','single-melt','batch-cancel','empty-slot-chooser','forge-reader-return','forge-funding-return','done-touch-cancel','hud-safe-return','menu-return','rest-forge-return','replace','swap','unmount','empty-slot','full-face','tap','outside-cancel','pointercancel','overlay-close','keyboard','repeat','save-reload','melt-excluded','actual-flight-editable','live-uses-preserved','repeatable-forge','banked-budget','melt-forge-again','rightward-neighbor','same-world-resume','5-slot-layouts'],output},null,2));
} finally {
  socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));
}
