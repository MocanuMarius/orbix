import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/deck-clarity-proof");
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
const base = "http://127.0.0.1:" + server.address().port;
const browser = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--mute-audio",
    "--no-first-run",
    "--disable-gpu",
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
    const result = await send("Runtime.evaluate", {
      expression: expression.replaceAll('skills-cards-2',release),
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
  const click = async (selector) => {
    assert.ok(
      await ev(`!!document.querySelector(${JSON.stringify(selector)})`),
      selector,
    );
    await ev(
      `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`,
    );
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
  const saved = () =>
    ev(
      "JSON.parse(localStorage.getItem('cards-pilot:wispbound.save.condensed.v7'))",
    );
  const fixture = async (kind) => {
    await send("Page.navigate", { url: base + "/loading.html" });
    await until(
      () => ev("location.pathname==='/loading.html'"),
      "fixture reset",
    );
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2'),C=await import('./skill-cards.mjs?v=skills-cards-2');const s=M.newState();s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'card-ui-smoke',1,{cards:true});M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);const r=s.run;r.mountedCards=[C.makeSkillCard('echo','echo'),C.makeSkillCard('spark-cache','cache'),C.makeSkillCard('field-impulse','field')];r.condensedGlow=120;r.reserveCards=['body-spark','spark-cache','harvest-rare','harvest-legendary','cache-handling','flash-handling'].map((id,i)=>C.makeSkillCard(id,'stored:'+i));r.reserveCards[1].charges=2;if(${JSON.stringify(kind)}==='legacy')delete r.reserveCards;
   if(${JSON.stringify(kind)}==='reward'){const n=M.getChoices(r).find(n=>n.type!=='support');M.selectNode(r,n.id);M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:60,collected:3});M.settleCheckpoint(s);}
   if(${JSON.stringify(kind)}==='empty-wallet')r.condensedGlow=0;
   if(${JSON.stringify(kind)}==='camp'){const n=r.map.flat().find(n=>n.kind==='camp');r.step=n.row;r.current=n;r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];r.phase='support';r.flame=30;r.lives=2;r.mountedCards=[C.makeSkillCard('camp-kit','kit'),C.makeSkillCard('growth-seed','grow'),C.makeSkillCard('body-spark','body')];M.getSupportChoices(r,s.profile);}
   if(${JSON.stringify(kind)}==='final'){const n=r.map.flat().find(n=>n.boss);r.mapIndex=2;r.step=n.row;r.current=n;r.phase='briefing';r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];}
   const storage={setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)};M.saveState(s,storage);})()`);
    await page("/game.html?cards=1");
    if (kind === "final")
      await ev(
        "(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-2');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){globalThis.qaCardFlight=this;return start.apply(this,args);};})()",
      );
    await click('[data-action="continue-run"]');
    if (kind === "final") {
      await until(
        () =>
          ev(
            "!!globalThis.qaCardFlight&&!!document.querySelector('.flight-resume-gate')",
          ),
        "final flight",
      );
      await ev(
        "qaCardFlight.options.onFinish({success:true,flame:60,collected:3})",
      );
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  const size = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    await ev("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  };
  const navigate = async (url, selector) => {
    await send("Page.navigate", {url:base+url});
    await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),url);
  };
  const selectCard = async (id) => {
    if(await ev("!!document.querySelector('[data-action=card-reading-back]')"))await click('[data-action=card-reading-back]');
    const selector='[data-action="card-select"][data-id="'+id+'"]';
    await ev(`document.querySelector('[data-action=card-page]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    for(let i=0;i<40;i++){
      if(await ev(`!!document.querySelector(${JSON.stringify(selector)})`)){await click(selector);return;}
      const page=await ev(`(()=>{const n=[...document.querySelectorAll('[data-action=card-page]')].at(-1);return !n.disabled?n.dataset.page:null})()`);
      assert.ok(page!==null,'Card exists in paginated deck: '+id);await click('[data-action="card-page"][data-page="'+page+'"]');
    }
    throw Error('Card missing: '+id);
  };
  const deckBounds = async (label) => {
    await bounds('.card-deck button,.card-deck-gallery',label);
    const result=await ev(`(()=>{const n=document.querySelector('.card-deck-gallery');if(!n)return {items:[],box:{}};const a=[...n.querySelectorAll('.card-deck-pick')].map(c=>{const r=c.getBoundingClientRect();return {bottom:r.bottom,right:r.right}});const r=n.getBoundingClientRect();return {items:a,box:{bottom:r.bottom,right:r.right},inspector:document.querySelector('.card-deck-inspector')?.scrollHeight,inspectorVisible:document.querySelector('.card-deck-inspector')?.clientHeight}})()`);
    for(const item of result.items)assert.ok(item.bottom<=result.box.bottom+1&&item.right<=result.box.right+1,label+' gallery clipping');
  };
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const tap=async selector=>{
    const r=await ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing touch target');const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,radiusX:3,radiusY:3,force:1,id:1}]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(70);
  };
  const select=async id=>{
    const selector='[data-action="card-select"][data-id="'+id+'"]';
    for(let i=0;i<8;i++){
      if(await ev(`!!document.querySelector(${JSON.stringify(selector)})`)){await tap(selector);return;}
      await tap('.card-deck-pages [data-action="card-page"]:last-child');
    }
    throw Error('Cannot select '+id);
  };
  const fits=async(label)=>{
    await bounds('.card-deck button,.card-deck-help>summary,.card-deck-gallery,.card-deck-collection-heading,.card-deck-inspector,.card-batch-melt button,.card-batch-melt-body,.card-forge-preview button',label);
    const over=await ev(`Array.from(document.querySelectorAll('.card-deck-collection,.card-deck-gallery,.card-deck-inspector,.card-forge-preview .card-exchange-body,.card-forge-preview .card-exchange-result')).filter(n=>n.getClientRects().length&&n.scrollHeight>n.clientHeight+1).map(n=>({class:n.className,content:n.scrollHeight,visible:n.clientHeight}))`);
    assert.deepEqual(over,[],label+' content fits without clipping');
  };
  const results=[];
  for(const [width,height] of [[720,280],[740,333]]){
    await size(width,height);await fixture('regular');await tap('[data-action="skills"]');
    await ev("globalThis.clarityTouches=0;document.addEventListener('pointerup',e=>{if(e.isTrusted&&e.pointerType==='touch')clarityTouches++},true)");
    await fits('Deck '+width);await screenshot('deck-'+width+'x'+height);
    assert.match(await ev("document.querySelector('.card-deck-collection-heading').textContent"),/Reserve.*equip to activate/);
    await tap('.card-deck-help>summary');assert.equal(await ev("document.querySelector('.card-deck-help').open"),true);
    await bounds('.card-deck-help-panel','Help '+width);await screenshot('deck-help-'+width+'x'+height);await tap('.card-deck-help>summary');
    await select('stored:1');await fits('Reader '+width);await screenshot('reader-'+width+'x'+height);
    await tap('[data-action="card-melt-this"]');await screenshot('single-melt-'+width+'x'+height);await tap('[data-action="card-cancel-melt"]');
    await tap('[data-action="card-equip"]');await fits('Slot chooser '+width);await screenshot('slot-chooser-'+width+'x'+height);await tap('[data-action="card-cancel-equip"]');await tap('[data-action="card-reading-back"]');
    const initial=(await saved()).run;
    await tap('[data-action="card-melt-mode"]');assert.equal(await ev("document.querySelector('[data-action=card-preview-melt-selected]').disabled"),true);
    await fits('Melt empty '+width);await screenshot('melt-start-'+width+'x'+height);
    await tap('[data-action="card-slot"][data-index="0"]');await select('stored:1');
    assert.match(await ev("document.querySelector('.card-deck-melt-summary').textContent"),/2 selected.*Stored Sparks/s);
    assert.match(await ev("document.querySelector('.card-melt-warning').textContent"),/1 equipped slot will become empty/);
    await fits('Melt selection '+width);await screenshot('melt-selection-'+width+'x'+height);
    await tap('[data-action="card-select"][data-id="stored:1"]');assert.match(await ev("document.querySelector('.card-deck-melt-summary').textContent"),/1 selected/);await tap('[data-action="card-select"][data-id="stored:1"]');
    await tap('[data-action="card-preview-melt-selected"]');await fits('Melt review '+width);await screenshot('melt-confirm-'+width+'x'+height);
    const returned=await ev("Number(document.querySelector('.card-exchange-result>strong').textContent.match(/[0-9]+/)[0])");
    assert.match(await ev("document.querySelector('.card-exchange-result').textContent"),new RegExp('Banked wallet '+initial.condensedGlow+' → '+(initial.condensedGlow+returned)));
    await tap('[data-action="card-back-melt"]');assert.match(await ev("document.querySelector('.card-deck-melt-summary').textContent"),/2 selected/);
    await tap('[data-action="card-preview-melt-selected"]');await tap('[data-action="card-cancel-melt"]');
    assert.equal(await ev("document.querySelectorAll('.melt-selected').length"),0);assert.deepEqual((await saved()).run,initial,'Keep cards cancels without changing saved run');
    await tap('[data-action="card-melt-mode"]');await tap('[data-action="card-slot"][data-index="0"]');await select('stored:1');await tap('[data-action="card-preview-melt-selected"]');await tap('[data-action="card-confirm-melt-selected"]');
    let run=(await saved()).run;assert.equal(run.mountedCards[0],null);assert.ok(!run.reserveCards.some(c=>c.instanceId==='stored:1'));assert.equal(run.condensedGlow,initial.condensedGlow+returned);
    await fits('After Melt '+width);await screenshot('melt-completed-'+width+'x'+height);
    await tap('[data-action="card-preview-forge"][data-rarity="rare"]');await fits('Forge '+width);await screenshot('forge-'+width+'x'+height);
    const count=run.reserveCards.length;await tap('[data-action="card-confirm-forge"]');run=(await saved()).run;assert.equal(run.condensedGlow,initial.condensedGlow+returned-30);assert.equal(run.reserveCards.length,count+1);await fits('Forge receipt '+width);await screenshot('forge-receipt-'+width+'x'+height);
    await tap('[data-action="card-forge-back"]');await fits('Forge return '+width);assert.ok(await ev("!!document.querySelector('.card-deck')"));await screenshot('forge-return-'+width+'x'+height);
    assert.ok(await ev('clarityTouches>=12'),'flow used trusted touches');
    await fixture('empty-wallet');await tap('[data-action="skills"]');await tap('[data-action="card-preview-forge"][data-rarity="rare"]');assert.equal(await ev("document.querySelector('[data-action=card-confirm-forge]').disabled"),true);assert.match(await ev("document.querySelector('.card-forge-status').textContent"),/Need 30 more Stored Sparks/);await fits('Forge unaffordable '+width);await screenshot('forge-unaffordable-'+width+'x'+height);
    results.push({width,height,returned,selectDeselect:true,editSelection:true,cancelPreserved:true,confirmDestroyed:true,forgeToReserve:true,unaffordableReason:true});
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({trustedTouch:true,results,screenshots:output,errors}));
} catch(error) {
  try { const target=await (await fetch('http://127.0.0.1:'+Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])+'/json/list')).json();console.error('QA failed',error.message,target[0]?.url); } catch {}
  throw error;
} finally {
  socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));await delay(200);
}
