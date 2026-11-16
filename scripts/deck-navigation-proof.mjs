import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const output = path.resolve("work/deck-navigation-proof");
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
const release = process.env.CARDS_QA_RELEASE || /app\.mjs\?v=([^"']+)/.exec(await fs.readFile('dist/game.html', 'utf8'))?.[1] || 'skills-cards-2';
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
  const reveal=async id=>{await ev(`document.querySelector('[data-action="card-select"][data-id="'+${JSON.stringify(id)}+'"] .card-drag-grip')?.scrollIntoView({block:'nearest'})`);await delay(50);};
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
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2'),C=await import('./skill-cards.mjs?v=skills-cards-2');const s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'drag-proof',1,{cards:true});const r=s.run;r.startingGiftId='card:body-spark';r.guideSkipped=true;r.mountedCards=['echo','spark-cache','field-impulse'].map((id,i)=>C.makeSkillCard(id,'mounted:'+i));r.reserveCards=['body-spark','spark-cache','harvest-rare','harvest-legendary','cache-handling','flash-handling'].map((id,i)=>C.makeSkillCard(id,'stored:'+i));r.mountedCards[1].charges=4;r.reserveCards[1].charges=2;r.condensedGlow=120;if(${five}){r.cardSlots=5;r.mountedCards.push(C.makeSkillCard('chameleon','mounted:3'),C.makeSkillCard('harvest-legendary','mounted:4'));}if(${JSON.stringify(kind)}==='dense'){r.mountedCards[0]=C.makeSkillCard('twin-wick','mounted:0');r.mountedCards[1]=C.makeSkillCard('edge-reach','mounted:1');r.reserveCards[0]=C.makeSkillCard('devourer','stored:0');}if(${JSON.stringify(kind)}==='camp'){const n=r.map.flat().find(n=>n.kind==='camp');r.step=n.row;r.current=n;r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];r.phase='support';M.getSupportChoices(r,s.profile);}if(${JSON.stringify(kind)}==='reward'){r.cardReward={id:'reward:new',card:C.makeSkillCard('growth-seed','reward:new'),claimed:false,source:'flight',uiAcknowledged:false};M.getCardReward(r);}M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');if(kind==='reward')return;await click('[data-action="skills"]');await until(()=>ev("!!document.querySelector('.card-deck')"),'Deck');
  };
  await send('Page.enable');await send('Runtime.enable');
  for(const [w,h] of [[720,280],[740,333]]){
    await metrics(w,h);await fixture(true);
    await bounds('.card-equipped-foreground .card-heading button','Equipped controls');await screenshot('equipped-'+w+'x'+h);
    await tap('[data-action="card-open-collection"]');
    await bounds('.card-deck-browser .card-heading button,.card-collection-slots,.card-deck-selection','Deck reachable controls');
    assert.equal(await ev("getComputedStyle(document.querySelector('.card-deck-gallery')).gridTemplateColumns.split(' ').length"),4);
    assert.ok(await ev("document.querySelector('.card-deck-gallery').scrollHeight>document.querySelector('.card-deck-gallery').clientHeight"));
    await screenshot('deck-'+w+'x'+h);
    const gallery=await rect('.card-deck-gallery');await touch('touchStart',{x:gallery.x-100,y:gallery.y+25});await movePath({x:gallery.x-100,y:gallery.y+25},{x:gallery.x-100,y:gallery.y-35},'touch');await touch('touchEnd');await delay(90);
    assert.ok(await ev("document.querySelector('.card-deck-gallery').scrollTop>0"),'reserve scroll uses native touch');
    assert.equal(await ev("!!document.querySelector('.card-drag-ghost')"),false,'scroll never starts a drag');
    await ev("document.querySelector('.card-deck-gallery').scrollTop=0");await delay(60);

    await tap('[data-action="card-select"][data-id="stored:1"]');
    assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),false);
    await screenshot('selected-'+w+'x'+h);
    const before=(await saved()).run.mountedCards;
    await tap(slot(0));assert.ok(await ev("!!document.querySelector('.card-swap-review')"));
    assert.deepEqual((await saved()).run.mountedCards,before,'review has no mutation');
    assert.equal(await ev("document.querySelectorAll('.card-swap-pair .card-rule-band').length"),2);
    assert.match(await ev("document.querySelector('.card-swap-review').textContent"),/Equipped now → Deck/);
    await bounds('.card-swap-review .card-dialog-actions button','Compare confirmation');
    await screenshot('compare-full-'+w+'x'+h);
    await ev("document.querySelector('.card-swap-scroll').scrollTop=110");await screenshot('compare-rules-'+w+'x'+h);
    await tap('[data-action="card-swap-back"]');assert.deepEqual((await saved()).run.mountedCards,before);
    await tap(slot(0));await tap('[data-action="card-swap-confirm"]');
    assert.equal((await saved()).run.mountedCards[0].instanceId,'stored:1');
    assert.equal((await saved()).run.mountedCards[0].charges,2);
    assert.ok((await saved()).run.reserveCards.some(c=>c.instanceId==='mounted:0'));
    await reveal('stored:0');await drag(card('stored:0'),dropTarget(1));
    assert.ok(await ev("!!document.querySelector('.card-swap-review')"),'occupied drag reviews');
    assert.equal((await saved()).run.mountedCards[1].instanceId,'mounted:1');
    await escape();await tap(slot(1));await tap('[data-action="card-return-selected"]');
    assert.equal((await saved()).run.mountedCards[1],null);
    await reveal('stored:0');await drag(card('stored:0'),dropTarget(1));
    assert.equal((await saved()).run.mountedCards[1].instanceId,'stored:0','empty drop equips directly');
    await drag('.card-compact-mount '+card('stored:1'),dropTarget(1));
    assert.match(await ev("document.querySelector('.card-swap-review').textContent"),/Slot 2 → slot 1/);
    await tap('[data-action="card-swap-confirm"]');
    assert.equal((await saved()).run.mountedCards[1].instanceId,'stored:1');
    assert.equal((await saved()).run.mountedCards[0].instanceId,'stored:0');
    await fixture(false,'dense');await tap('[data-action="card-open-collection"]');await tap('[data-action="card-select"][data-id="stored:0"]');await tap(slot(0));
    assert.match(await ev("document.querySelector('.card-swap-effects').textContent"),/consume Edge Reach/);
    const rules=await ev("(()=>{const clip=document.querySelector('.card-swap-scroll').getBoundingClientRect();return [...document.querySelectorAll('.card-swap-review .card-rule-condition,.card-swap-review .card-rule-effect')].map(e=>({text:e.textContent,bottom:e.getBoundingClientRect().bottom,clip:clip.bottom}))})()");
    for(const rule of rules)assert.ok(rule.bottom<=rule.clip+1,'Dense condition and benefit initially visible: '+JSON.stringify(rule));
    await screenshot('dense-compare-'+w+'x'+h);
    const denseBefore=(await saved()).run.mountedCards;
    const confirm=await rect('[data-action="card-swap-confirm"]');await touch('touchStart',confirm);await movePath(confirm,{x:confirm.x-150,y:confirm.y-90},'touch');await touch('touchEnd');await delay(80);
    assert.ok(await ev("!!document.querySelector('.card-swap-review')"),'dragging off confirmation cancels');assert.deepEqual((await saved()).run.mountedCards,denseBefore);
    await touch('touchStart',confirm);await touch('touchCancel');await delay(70);assert.deepEqual((await saved()).run.mountedCards,denseBefore,'touchcancel never equips');
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');assert.deepEqual((await saved()).run.mountedCards,denseBefore,'reload cancels comparison');
    await fixture(false,'reward');await bounds('.card-reward-equip button:not(.card-term):not(.card-help),.card-reward-new','Reward controls');await screenshot('reward-'+w+'x'+h);
    const reward=(await saved()).run.cardReward.card.instanceId;
    assert.equal((await saved()).run.reserveCards.filter(c=>c.instanceId===reward).length,1);
    await tap('[data-action="card-reward-equip"]');await tap('[data-action="card-reward-slot"][data-index="0"]');
    await screenshot('reward-compare-'+w+'x'+h);await tap('[data-action="card-swap-back"]');
    assert.equal((await saved()).run.reserveCards.filter(c=>c.instanceId===reward).length,1);
    await drag('[data-deck-surface="reward"] '+card(reward),'[data-action="card-reward-slot"][data-index="0"]');
    assert.ok(await ev("!!document.querySelector('.card-swap-review')"),'reward drag reviews');
    await tap('[data-action="card-swap-confirm"]');
    assert.equal((await saved()).run.mountedCards[0].instanceId,reward);
    await screenshot('reward-equipped-'+w+'x'+h);
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');
    assert.ok(await ev("!!document.querySelector('.card-reward-screen')"));
    assert.equal((await saved()).run.mountedCards[0].instanceId,reward,'reload preserves equipped reward');
    await tap('[data-action="card-reward-continue"]');
  }
  await metrics(740,333);await fixture();await tap('[data-action="card-open-collection"]');
  const enter=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await delay(60);};
  await enter('[data-action="card-select"][data-id="stored:0"]');await enter(slot(0));assert.ok(await ev("!!document.querySelector('.card-swap-review')"));await enter('[data-action="card-swap-confirm"]');assert.equal((await saved()).run.mountedCards[0].instanceId,'stored:0','keyboard equip');
  await tap('[data-action="card-collection-back"]');await tap('[data-action="card-move-one"][data-index="0"][data-direction="1"]');assert.ok(await ev("!!document.querySelector('.card-swap-review')"),'arrow also reviews occupied swap');await enter('[data-action="card-swap-confirm"]');assert.equal((await saved()).run.mountedCards[1].instanceId,'stored:0','keyboard confirms arrow reorder');
  await tap('[data-action="card-open-collection"]');assert.equal(await ev("document.querySelector('[data-action=card-preview-forge]').disabled"),true,'Forge remains camp-only');
  await tap('[data-action="card-select"][data-id="stored:1"]');await tap('[data-action="card-inspect"]');assert.ok(await ev("!!document.querySelector('.card-deck-reading')"),'Inspect remains optional');assert.equal(await ev("document.querySelector('[data-action=card-preview-improve]').disabled"),true,'Improve remains camp-only');
  await tap('[data-action="card-melt-this"]');const meltBefore=(await saved()).run.reserveCards;await tap('[data-action="card-cancel-melt"]');assert.deepEqual((await saved()).run.reserveCards,meltBefore,'single Melt cancel keeps card');
  await tap('[data-action="card-melt-this"]');await tap('[data-action="card-confirm-melt-selected"]');assert.ok(!(await saved()).run.reserveCards.some(c=>c.instanceId==='stored:1'),'only confirmed Melt destroys card');
  await metrics(740,333);await fixture();await tap('[data-action="close-sheet"]');
  await ev("(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-2');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){globalThis.qaDeckFlight=this;return start.apply(this,args)}})()");
  const node=await ev("document.querySelector('.reachable[data-action=preview-node]')?.dataset.id");assert.ok(node);
  await tap('[data-action="preview-node"][data-id="'+node+'"]');await tap('[data-action="node"][data-id="'+node+'"]');
  await until(()=>ev("!!globalThis.qaDeckFlight&&!!document.querySelector('.flight-resume-gate')"),'paused flight');await tap('[data-action="wake-flight"]');await tap('.flight-menu-slot [data-action="menu"]');
  await ev("qaDeckFlight.cardExecution.cards[1].charges=2;globalThis.deckFrozen={time:qaDeckFlight.time,distance:qaDeckFlight.distance}");
  await tap('#pause-layer [data-action="skills"]');await tap('[data-action="card-open-collection"]');await tap('[data-action="card-select"][data-id="stored:0"]');await tap(slot(1));
  await screenshot('paused-replacement-740x333');await tap('[data-action="card-swap-confirm"]');
  assert.equal((await saved()).run.mountedCards[1].instanceId,'stored:0');assert.equal((await saved()).run.reserveCards.find(c=>c.instanceId==='mounted:1').charges,2);
  assert.deepEqual(await ev("({time:qaDeckFlight.time,distance:qaDeckFlight.distance})"),await ev('deckFrozen'));
  assert.equal(await ev('qaDeckFlight.paused'),true);
  await tap('[data-action="card-collection-back"]');await tap('[data-action="close-sheet"]');
  assert.equal(await ev('qaDeckFlight.paused'),true);await tap('#pause-layer [data-action="resume"]');await until(()=>ev('!qaDeckFlight.paused'),'same-world resume');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['equipped-entrance','four-wide-reserve','persistent-slots','tap-select','full-card-compare','cancel-safe','identity-preserved','uses-preserved','occupied-drag-review','empty-drop-direct','mounted-swap','reward-direct-equip','reward-cancel','reward-drag-review','reward-reload','dense-rules-visible','compare-cancel-gesture','compare-reload-safe','paused-same-world','live-uses-preserved','keyboard-equip','arrow-reviewed-swap','optional-inspect','camp-only-services','melt-confirmation'],output},null,2));
} finally {
  socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));
}
