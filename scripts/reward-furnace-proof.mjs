import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const output = path.resolve("work/reward-furnace-proof");
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

  const fixture=async(kind='normal',seed='furnace-proof:5')=>{
    await send('Page.navigate',{url:base+'/loading.html'});
    await until(()=>ev("location.pathname.endsWith('/loading.html')"),'fixture');
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2'),C=await import('./skill-cards.mjs?v=skills-cards-2');const s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;s.run=M.createRun(s.profile,${JSON.stringify(seed)},1,{cards:true});const r=s.run;r.startingGiftId='card:body-spark';r.guideSkipped=true;r.mountedCards=['echo','spark-cache','field-impulse'].map((id,i)=>C.makeSkillCard(id,'mounted:'+i));r.mountedCards[1].charges=4;r.reserveCards=[C.makeSkillCard('spark-cache','stored:keep')];r.reserveCards[0].charges=2;r.condensedGlow=120;let n;if(${JSON.stringify(kind)}==='boss'){n=r.map.flat().find(n=>n.boss);r.phase='briefing';r.current=n;r.step=n.row;r.path=[n.id];}else{n=M.getChoices(r).find(n=>n.type!=='support');if(!M.selectNode(r,n.id))throw Error('select');}if(!M.beginFlightAttempt(r)||!M.markFlightAttemptStarted(r)||!M.finishFlight(r,{success:true,flame:60,collected:3}))throw Error('finish');M.settleCheckpoint(s);r.guardianRituals=[r.mapIndex];M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');
    await until(()=>ev("!!document.querySelector('.card-reward-screen')"),'real flight reward');
  };
  const quote=async()=>{
    const state=await saved(),run=state.run,id=run.cardReward.card.instanceId;
    const preview=await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-2');return M.getCardMeltPreview(${JSON.stringify(run)},[${JSON.stringify(id)}]);})()`);
    return {state,run,id,preview};
  };
  const retained=(run,id)=>[...run.mountedCards,...run.reserveCards].filter(Boolean).filter(c=>c.instanceId===id);
  const rewardButtons='.card-reward-screen .card-heading button,.card-reward-actions button,.card-reward-new';
  await send('Page.enable');await send('Runtime.enable');await metrics(720,280);
  let staleConfirmation;
  for(const kind of ['normal','boss']){
    await fixture(kind);
    const original=await quote();
    assert.ok(original.preview.amount>0);
    assert.equal(retained(original.run,original.id).length,1,'reward starts owned exactly once');
    assert.equal(await ev("document.querySelector('[data-action=card-reward-continue]').classList.contains('primary')"),true);
    assert.equal(await ev("document.querySelector('[data-action=card-reward-continue]').textContent"),'Add to collection');
    assert.ok(await ev("!!document.querySelector('[data-action=card-preview-reward-melt] .card-furnace-icon')"));
    await bounds(rewardButtons,'Reward '+kind);await screenshot(kind+'-choice-720x280');
    await tap('[data-action="card-preview-reward-melt"]');
    assert.deepEqual(await saved(),original.state,'opening review changes no save data');
    assert.match(await ev("document.querySelector('.card-melt-confirm').textContent"),new RegExp('\\+'+original.preview.amount+' Stored Sparks'));
    assert.match(await ev("document.querySelector('.card-melt-confirm').textContent"),/This card and its remaining uses will be lost/);
    assert.match(await ev("document.querySelector('.card-melt-confirm').textContent"),new RegExp(original.preview.cards[0].charges==null?'While equipped':original.preview.cards[0].charges+' uses? left'));
    await bounds('.card-melt-confirm .card-dialog-actions button,.card-melt-payout','Review '+kind);
    assert.ok(await ev("[...document.querySelectorAll('.card-melt-confirm .card-dialog-actions button')].every(button=>button.getBoundingClientRect().height>=44)"),'Melt choices keep 44px touch targets');
    await screenshot(kind+'-melt-review-720x280');
    staleConfirmation=await ev("document.querySelector('[data-action=card-confirm-melt-selected]').outerHTML");
    await tap('[data-action="card-cancel-melt"]');assert.deepEqual(await saved(),original.state,'Cancel preserves full save');
    await tap('[data-action="card-preview-reward-melt"]');await escape();assert.deepEqual(await saved(),original.state,'Escape preserves full save');
    await tap('[data-action="card-preview-reward-melt"]');await tap('[data-action="card-confirm-melt-selected"]');
    await until(()=>ev("!document.querySelector('.card-reward-screen')"),'onward after Melt');
    let after=(await saved()).run;
    assert.equal(after.condensedGlow,original.run.condensedGlow+original.preview.amount,'exact quote credited');
    assert.equal(retained(after,original.id).length,0,'only confirmed incoming card removed');
    assert.deepEqual(after.mountedCards,original.run.mountedCards,'equipped cards preserved');
    assert.deepEqual(after.reserveCards,original.run.reserveCards.filter(c=>c.instanceId!==original.id));
    assert.equal(after.cardReward.uiAcknowledged,true);
    assert.equal(await ev('document.body.dataset.screen'),kind==='boss'?'victory':'map','normal returns to route; guardian keeps its relic receipt');
    if(kind==='boss'){
      assert.deepEqual(after.flightReward,original.run.flightReward,'guardian relic offer survives card Melt');
      assert.ok(await ev("!!document.querySelector('[data-action=keep-flight-reward]')"));
      await until(()=>ev("!document.querySelector('#toast.show')"),'Melt receipt message');
      await delay(300);
      await screenshot('guardian-relic-after-melt-720x280');
    }
    const wallet=after.condensedGlow;
    await page('/game.html?cards=1');await click('[data-action="continue-run"]');
    after=(await saved()).run;assert.equal(after.condensedGlow,wallet);assert.equal(retained(after,original.id).length,0,'reload never recreates melted receipt');
    await ev(`(()=>{const box=document.createElement('div');box.innerHTML=${JSON.stringify(staleConfirmation)};document.body.append(box);box.firstElementChild.click();box.remove();})()`);
    assert.equal((await saved()).run.condensedGlow,wallet,'replaying stale confirmation cannot credit twice');
  }
  await fixture('normal','furnace-proof:6');const replacement=await quote();await tap('[data-action="card-preview-reward-melt"]');
  await ev(`(()=>{const box=document.createElement('div');box.innerHTML=${JSON.stringify(staleConfirmation)};document.body.append(box);box.firstElementChild.click();box.remove();})()`);
  assert.deepEqual(await saved(),replacement.state,'stale receipt action cannot consume or acknowledge a different receipt');
  assert.ok(await ev("!!document.querySelector('.card-melt-confirm')"));await tap('[data-action="card-cancel-melt"]');
  // The keeping action uses the same owned instance and preserves all uses.
  await tap('[data-action="card-reward-continue"]');const kept=(await saved()).run;
  assert.deepEqual(retained(kept,replacement.id),retained(replacement.run,replacement.id));assert.equal(kept.condensedGlow,replacement.run.condensedGlow);assert.equal(kept.cardReward.uiAcknowledged,true);
  // Full faces are already visible; reversible tap and drag transfers apply directly.
  await fixture();const equippedReward=await quote();await tap('[data-action="card-reward-equip"]');await tap('[data-action="card-reward-slot"][data-index="0"] .card-illustration');
  assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);
  assert.equal((await saved()).run.mountedCards[0].instanceId,equippedReward.id);
  await fixture();
  await drag('[data-deck-surface="reward"] '+card(equippedReward.id),'[data-action="card-reward-slot"][data-index="0"]');
  assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false);
  assert.equal((await saved()).run.mountedCards[0].instanceId,equippedReward.id);assert.ok((await saved()).run.reserveCards.some(c=>c.instanceId==='mounted:0'));
  await tap('[data-action="card-reward-continue"]');await tap('[data-action="skills"]');
  await tap('[data-action="card-open-collection"]');
  assert.ok(await ev("!!document.querySelector('[data-action=card-melt-mode] .card-furnace-icon')"));await tap('[data-action="card-melt-mode"]');await tap('[data-action="card-slot"][data-index="0"]');await tap('[data-action="card-select"][data-id="stored:keep"]');await tap('[data-action="card-preview-melt-selected"]');
  assert.ok(await ev("!!document.querySelector('[data-action=card-confirm-melt-selected] .card-furnace-icon')"));await bounds('.card-melt-confirm .card-dialog-actions button','Batch review');await screenshot('deck-batch-furnace-720x280');await tap('[data-action="card-cancel-melt"]');
  await tap('[data-action="card-select"][data-id="stored:keep"]');await tap('[data-action="card-inspect"]');assert.ok(await ev("!!document.querySelector('[data-action=card-melt-this] .card-furnace-icon')"));await tap('[data-action="card-melt-this"]');await screenshot('deck-single-furnace-720x280');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['real-normal-reward','primary-add-to-collection','direct-furnace-melt','exact-positive-stored-quote','uses-warning','cancel-and-escape-no-save-changes','one-time-credit','stale-receipt-guard','reload-no-recreation','guardian-relic-preserved','keep-identity-and-uses','direct-tap-equip','direct-drag-equip','deck-single-and-batch-furnace'],output},null,2));
} finally {
  socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));
}
