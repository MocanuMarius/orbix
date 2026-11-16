import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const output = path.resolve("outputs/deck-fast-proof");
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

  const fixture=async(ids=['echo','spark-cache','rhythm','harvest-rare','refrain'])=>{
    await send('Page.navigate',{url:base+'/loading.html'});await until(()=>ev("location.pathname.endsWith('/loading.html')"),'fixture');
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2'),C=await import('./skill-cards.mjs?v=skills-cards-2');const s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'fast-deck-proof',1,{cards:true});const r=s.run;r.startingGiftId='card:body-spark';r.guideSkipped=true;r.companions=['collector'];r.companionRole='collector';r.cardSlots=${ids.length};r.mountedCards=${JSON.stringify(ids)}.map((id,i)=>id?C.makeSkillCard(id,'mounted:'+i):null);r.reserveCards=['body-spark','use-doubler','ember-feeder','harvest-legendary','cache-handling','flash-handling'].map((id,i)=>C.makeSkillCard(id,'stored:'+i));r.condensedGlow=120;M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');await click('[data-action="skills"]');await until(()=>ev("!!document.querySelector('.card-equipped-foreground')"),'Deck');
  };
  const face=i=>slot(i)+' .card-illustration';
  const wholeRow=async label=>{
    await bounds('.card-equipped-mount',label);
    const fit=await ev(`(()=>{const r=document.querySelector('.card-foreground-row');return {visible:r.clientWidth,content:r.scrollWidth,mounts:[...r.querySelectorAll('.card-equipped-mount')].map(n=>({w:n.clientWidth,h:n.clientHeight}))}})()`);
    assert.ok(fit.content<=fit.visible+1,label+' full mounted row visible: '+JSON.stringify(fit));
  };
  await send('Page.enable');await send('Runtime.enable');
  const results=[];
  for(const [w,h] of [[915,412],[740,333]]){
    await metrics(w,h);await fixture();await wholeRow('all five '+w);await screenshot('full-row-'+w+'x'+h);
    await tap(face(0));assert.ok(await ev("!!document.querySelector('.deck-tap-moving')"));assert.ok(await ev("!!document.querySelector('[data-deck-context=selected]')"));await wholeRow('selected '+w);await screenshot('selected-echo-'+w+'x'+h);
    await tap(face(2));let run=(await saved()).run;assert.equal(run.mountedCards[2].instanceId,'mounted:0');assert.equal(run.mountedCards[0].instanceId,'mounted:2');assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);assert.match(await ev("document.querySelector('[data-deck-context=selected]').textContent"),/Resonant Harvest/);await wholeRow('after tap swap '+w);
    await tap('[data-action="card-inspect"]');assert.ok(await ev("!!document.querySelector('.card-deck-reading')"));assert.match(await ev("document.querySelector('.card-deck-reading').textContent"),/What is a pass/);await tap('[data-action="card-reading-back"]');assert.equal(await ev("document.querySelector('.card-selected')?.dataset.cardInstance"),'mounted:0');
    await ev("document.querySelector('.deck-pass-help summary').scrollIntoView({block:'nearest'})");await tap('.deck-pass-help summary');await ev("document.querySelector('.deck-pass-help p').scrollIntoView({block:'start'})");await screenshot('pass-explained-'+w+'x'+h);
    await drag(card('mounted:0'),dropTarget(4));run=(await saved()).run;assert.equal(run.mountedCards[4].instanceId,'mounted:0');assert.equal(run.mountedCards[2].instanceId,'mounted:4');assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);await wholeRow('after drag '+w);
    await ev("document.querySelector('[data-action=card-cancel-equip]').scrollIntoView({block:'nearest'})");await tap('[data-action="card-cancel-equip"]');assert.ok(await ev("document.querySelector('[data-action=card-move-one][data-index=\"4\"][data-direction=\"-1\"]').getClientRects().length>0"));await tap('[data-action="card-move-one"][data-index="4"][data-direction="-1"]');assert.equal((await saved()).run.mountedCards[3].instanceId,'mounted:0');assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);
    await tap('[data-action="card-open-collection"]');await tap('[data-action="card-select"][data-id="stored:2"]');await tap(slot(0));run=(await saved()).run;assert.equal(run.mountedCards[0].instanceId,'stored:2');assert.ok(run.reserveCards.some(c=>c.instanceId==='mounted:2'));assert.ok(await ev("!!document.querySelector('.card-deck-browser')"));assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);await screenshot('collection-placement-'+w+'x'+h);
    await tap('[data-action="card-collection-back"]');await wholeRow('feeder '+w);assert.match(await ev("document.querySelector('[data-deck-context=selected]').textContent"),/Ember Feeder/);assert.match(await ev("document.querySelector('[data-deck-context=selected]').textContent"),/permanently destroy/);await screenshot('feeder-targets-'+w+'x'+h);
    await fixture(['ember-feeder','use-doubler','spark-cache',null,'harvest-rare']);await tap(face(1));assert.match(await ev("document.querySelector('[data-deck-context=selected]').textContent"),/6 → 12/);await screenshot('doubler-live-target-'+w+'x'+h);await tap(face(4));assert.match(await ev("document.querySelector('[data-deck-context=selected]').textContent"),/Needs consumable right/);await screenshot('doubler-blocked-'+w+'x'+h);await wholeRow('blocked '+w);
    results.push({w,h,tapSwap:true,dragSwap:true,arrowSwap:true,collectionPlacement:true,readerBackSelection:true,fullMountedRow:true,liveDoublerTarget:true,feederNamedTargets:true});
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({results,screenshots:output,errors}));
} finally {socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
