import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/deck-management-proof");
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
  await size(740,333);
  await navigate('/loading.html','body');
  await ev("(async()=>{const M=await import('./model.mjs?v=skills-cards-2');const s=M.newState();s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'untouched-standard');M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);M.saveState(s,localStorage);})()");
  const standard = await ev("localStorage.getItem('wispbound.save.condensed.v7')");
  await ev("(async()=>{const M=await import('./model.mjs?v=skills-cards-2');const s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()");
  await page('/game.html?cards=1');await click('[data-action="new-game"]');
  await until(()=>ev("!!document.querySelector('.card-starter')"),'real starter');
  for(const [width,height] of [[720,280],[740,333]]){
    await size(width,height);await bounds('.card-starter .card-readable,.card-starter button','Starter '+width);await screenshot('real-two-starter-cards-'+width+'x'+height);
    assert.equal(await ev("document.querySelectorAll('.card-starter .card-rule-band').length"),2);
  }
  await click('[data-action="new-gift"]');
  let starterRun=(await saved()).run;assert.equal(starterRun.mountedCards.filter(Boolean).length,2);assert.equal(starterRun.reserveCards.length,0);assert.equal(starterRun.mountedCards[1].cardId,'lift-guide');assert.equal(starterRun.mountedCards[2],null);
  await click('[data-action="skills"]');await click('[data-action="card-slot"][data-index="0"]');
  assert.equal(await ev("document.querySelectorAll('.card-deck-reading .card-rule-band').length"),1);
  await click('[data-action="close-sheet"]');
  const launchNode=await ev("document.querySelector('.reachable[data-action=preview-node]')?.dataset.id");assert.ok(launchNode);
  await ev("(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-2');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){globalThis.qaCardFlight=this;return start.apply(this,args);};})()");
  await click('[data-action="preview-node"][data-id="'+launchNode+'"]');await click('[data-action="node"][data-id="'+launchNode+'"]');
  await until(()=>ev("!!globalThis.qaCardFlight&&!!document.querySelector('.flight-resume-gate')"),'actual pilot flight');
  assert.equal(await ev('qaCardFlight.mod.cardLiftGuide'),true,'included Guide reaches the real flight engine');
  await click('[data-action="skills"]');if(await ev("!!document.querySelector('[data-action=card-select]')"))await click('[data-action="card-select"]');
  assert.equal(await ev("document.querySelector('[data-action=card-equip]').disabled"),false);
  assert.equal(await ev("document.querySelector('[data-action=card-unequip]').disabled"),false);
  assert.equal(await ev("document.querySelector('[data-action=card-melt-mode]').disabled"),false);
  await screenshot('actual-paused-flight-editable-card-740x333');await click('[data-action="close-sheet"]');
  await ev("qaCardFlight.options.onFinish({success:true,flame:60,collected:3})");await until(()=>ev("!!document.querySelector('.card-reward-screen')"),'actual first flight receipt');
  starterRun=(await saved()).run;assert.equal(starterRun.reserveCards.length,1);assert.equal(starterRun.mountedCards.filter(Boolean).length,2);
  await screenshot('actual-first-flight-added-to-deck-740x333');
  await navigate('/game.html?cards=1&mock=cards','.card-deck');
  assert.match(await ev("document.querySelector('.card-heading h2').textContent"),/Deck.*9 cards/);
  for(const [width,height] of [[900,405],[740,333],[720,280]]){
    await size(width,height);await deckBounds('Deck '+width+'x'+height);await screenshot('deck-'+width+'x'+height);
  }
  await click('[data-action="card-select"][data-id="sample:stored:0"]');
  for(const [width,height] of [[720,280],[740,333],[900,405]]){await size(width,height);await bounds('.card-deck-reading button,.card-readable','Readable card '+width);await screenshot('readable-body-'+width+'x'+height);}
  await size(720,280);
  await click('[data-action="card-equip"]');
  assert.match(await ev("document.querySelector('.card-deck-status').textContent"),/Tap an Equipped slot/);
  await deckBounds('Choose slot 720');await screenshot('equip-slot-720x280');
  await click('[data-action="card-slot"][data-index="0"]');
  assert.match(await ev("document.querySelector('[data-action=card-slot][data-index=\"0\"]').textContent"),/Body Spark/);
  assert.match(await ev("document.querySelector('.card-deck-status').textContent"),/Echo returned to deck/);
  await click('[data-action="card-unequip"]');
  await selectCard('sample:stored:3');
  for(const [width,height] of [[720,280],[740,333]]){await size(width,height);await bounds('.card-deck-reading button,.card-readable','Longest card '+width);await screenshot('readable-legendary-harvest-'+width+'x'+height);}
  await size(720,280);
  await click('[data-action="card-melt-mode"]');
  await click('[data-action="card-slot"][data-index="1"]');
  await selectCard('sample:stored:1');
  assert.match(await ev("document.querySelector('.card-deck-melt-summary').textContent"),/2 selected.*\+20/s);
  await screenshot('batch-select-720x280');
  await click('[data-action="card-preview-melt-selected"]');
  assert.match(await ev("document.querySelector('.card-melt-confirm').textContent"),/Equipped slot 2 will become empty/);
  await bounds('.card-melt-confirm button','Melt confirmation 720');await screenshot('batch-melt-review-720x280');
  await click('[data-action="card-back-melt"]');
  assert.equal(await ev("document.querySelectorAll('.melt-selected').length"),2);
  await click('[data-action="card-cancel-melt"]');
  assert.equal(await ev("document.querySelectorAll('.melt-selected').length"),0);
  await navigate('/game.html?cards=1&mock=cards&deck=large&slots=5','.card-deck');
  assert.match(await ev("document.querySelector('.card-heading h2').textContent"),/131 cards/);
  assert.equal(await ev("document.querySelectorAll('.card-deck-pick').length"),4);
  for(const [width,height] of [[720,280],[740,333],[900,405]]){await size(width,height);await deckBounds('Large 5-slot '+width);await screenshot('large-deck-5-slots-'+width+'x'+height);}
  await click('[data-action="card-page"][data-page="1"]');
  assert.equal(await ev("!!document.querySelector('.card-deck-reading')"),false);
  assert.equal(await ev("document.querySelectorAll('.card-deck-pick').length"),4);
  await size(740,333);
  await fixture('reward');
  await until(()=>ev("!!document.querySelector('.card-reward-screen')"),'stored reward');
  const beforeReceipt=await saved();
  assert.equal(beforeReceipt.run.cardReward.claimed,true);
  assert.equal(beforeReceipt.run.cardReward.choice,'deck');
  assert.equal(beforeReceipt.run.reserveCards.length,7);
  assert.deepEqual(beforeReceipt.run.mountedCards.map(c=>c.instanceId),['echo','cache','field']);
  assert.equal(await ev("!!document.querySelector('[data-action=card-preview-replace]')"),false);
  assert.equal(await ev("!!document.querySelector('[data-action=card-preview-reward-melt] .card-furnace-icon')"),true);
  for(const [width,height] of [[740,333],[720,280]]){await size(width,height);await bounds('.card-reward-screen button,.card-reward-new>.skill-card','Receipt '+width);await screenshot('real-normal-reward-'+width+'x'+height);}
  await click('[data-action="card-reward-continue"]');
  assert.ok((await saved()).run.cardReward.uiAcknowledged);
  await click('[data-action="skills"]');
  await click('[data-action="card-select"][data-id="stored:0"]');
  const wallet=(await saved()).run.condensedGlow;
  await click('[data-action="card-equip"]');await click('[data-action="card-slot"][data-index="1"]');
  let run=(await saved()).run;
  assert.equal(run.mountedCards[1].instanceId,'stored:0');assert.ok(run.reserveCards.some(c=>c.instanceId==='cache'));assert.equal(run.condensedGlow,wallet);
  await click('[data-action="card-equip"]');await click('[data-action="card-slot"][data-index="2"]');
  run=(await saved()).run;
  assert.equal(run.mountedCards[2].instanceId,'stored:0');assert.equal(run.mountedCards[1].instanceId,'field');assert.equal(run.condensedGlow,wallet);
  await click('[data-action="card-unequip"]');
  await selectCard('stored:1');await click('[data-action="card-preview-improve"]');
  await screenshot('stored-improve-720x280');await click('[data-action="card-confirm-improve"]');
  run=(await saved()).run;
  assert.equal(run.reserveCards.find(c=>c.instanceId==='stored:1').rank,2);assert.equal(run.reserveCards.find(c=>c.instanceId==='stored:1').charges,2);
  await click('[data-action="card-melt-mode"]');
  await click('[data-action="card-slot"][data-index="0"]');
  await selectCard('stored:1');
  const beforeMelt=(await saved()).run.condensedGlow;
  await click('[data-action="card-preview-melt-selected"]');
  await click('[data-action="card-confirm-melt-selected"]');
  run=(await saved()).run;assert.equal(run.mountedCards[0],null);assert.ok(!run.reserveCards.some(c=>c.instanceId==='stored:1'));assert.equal(run.condensedGlow,beforeMelt+20);
  await navigate('/game.html?cards=1','.front-new-button');await click('[data-action="continue-run"]');await click('[data-action="skills"]');
  assert.match(await ev("document.querySelector('.card-heading h2').textContent"),/8 cards/);
  await fixture('legacy');await click('[data-action="skills"]');assert.match(await ev("document.querySelector('.card-heading h2').textContent"),/3 cards/);
  await fixture('camp');
  const campBefore=(await saved()).run.cardRest.actions;
  await click('[data-action="cards"]');await click('[data-action="card-preview-forge"][data-rarity="rare"]');
  for(const [width,height] of [[740,333],[720,280]]){await size(width,height);await bounds('.card-forge-preview button,.card-forge-preview .card-readable','Forge '+width);await screenshot('repeatable-exact-forge-'+width+'x'+height);}
  const quote=await ev("document.querySelector('[data-action=card-confirm-forge]').dataset.token");
  const ownedBefore=(await saved()).run.reserveCards.length;
  await click('[data-action="card-confirm-forge"]');
  run=(await saved()).run;assert.equal(run.reserveCards.length,ownedBefore+1);assert.equal(run.condensedGlow,90);assert.deepEqual(run.cardRest.actions,campBefore);
  assert.notEqual(await ev("document.querySelector('[data-action=card-confirm-forge]').dataset.token"),quote);
  await click('[data-action="card-confirm-forge"]');run=(await saved()).run;assert.equal(run.reserveCards.length,ownedBefore+2);assert.equal(run.condensedGlow,60);
  await click('[data-action="cards"]');assert.ok(await ev("!!document.querySelector('.card-deck')"));
  assert.equal(await ev("localStorage.getItem('wispbound.save.condensed.v7')"),standard);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({starter:true,actualFlight:true,pausedFlightEditable:true,normalReward:true,repeatableAnytimeForge:true,olderSave:true,nonDestructiveEquip:true,slotSwap:true,reserveImprove:true,multiMelt:true,meltCancel:true,largeDeck:true,fiveSlots:true,saveReload:true,standardSavePreserved:true,screenshots:output,errors}));
} catch(error) {
  try { const target=await (await fetch('http://127.0.0.1:'+Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])+'/json/list')).json();console.error('QA failed',error.message,target[0]?.url); } catch {}
  throw error;
} finally {
  socket?.close();browser.kill();server.close();
}
