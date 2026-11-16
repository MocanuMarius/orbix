import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/card-bands-art-proof");
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
    let data = await fs.readFile(file);
    if(path.basename(file)==='app.mjs')data=Buffer.concat([data,Buffer.from(`\nwindow.__cardBandProof={engine:()=>engine,prepare:async()=>{const c=await import('./skill-cards.mjs?v=skills-cards-3');engine.cardExecution=c.createCardExecution({cards:['harvest-rare','prism-lens','refrain'].map((id,i)=>c.makeSkillCard(id,'proof:'+i))});document.querySelector('#pause-layer').replaceChildren();paused=false;engine.paused=false;engine.flame=engine.maxFlame*.5;const result=engine.resolveCardRowEvent(c.CARD_ROW_EVENTS.wave,{firstCrossing:true});engine.render();engine.notify();return {sparks:result.receipt.sparks,frozen:Object.isFrozen(engine.getState().cardRowTrace)};}};`) ]);
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
  await send('Page.enable'); await send('Runtime.enable');
  const size = async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};

  const report=[];
  const navigate = async(url,selector) => {await send('Page.navigate',{url:base+url});await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),url);await ev('document.fonts.ready');await delay(150);};
  const saveCapture=async(name)=>{const data=await send('Page.captureScreenshot',{format:'webp',quality:94});await fs.mkdir(path.resolve('dist/assets/previews'),{recursive:true});await fs.writeFile(path.resolve('dist/assets/previews',name+'.webp'),Buffer.from(data.data,'base64'));};
  for(const [width,height] of [[740,333],[720,280]]) {
    await size(width,height);
    await navigate('/game.html?cards=1&mock=cards&scenario=starter','.card-starter');
    const starter=await ev("[...document.querySelectorAll('.card-starter-pair .card-readable')].map(n=>({id:n.dataset.cardHelp,bands:n.querySelectorAll('[data-rule-type]').length,help:!!n.querySelector('.card-help'),ruleOver:n.querySelector('.card-rule-band').scrollHeight-n.querySelector('.card-rule-band').clientHeight}))");
    assert.equal(starter.length,2);assert.ok(starter.every(card=>card.bands>0&&card.help&&card.ruleOver<=1));report.push({width,height,starter});await screenshot('starter-'+width+'x'+height);
    await click('.card-starter-pair [data-card-term]');await until(()=>ev("!!document.querySelector('.card-term-dialog[open]')"),'starter glossary');await screenshot('starter-glossary-'+width+'x'+height);await click('[data-card-term-close]');
    await navigate('/card-combos.html?seed=moonwell-15','.combo-row');
    await until(()=>ev("document.querySelectorAll('#combo-rows .combo-row').length===15"),'all rows');
    const values=await ev(`(()=>{const cards=[...document.querySelectorAll('.card-readable')];return cards.map(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('.card-rule-band'),a=n.querySelector('.card-illustration').getBoundingClientRect(),h=n.querySelector('h3').getBoundingClientRect(),head=n.querySelector('header').getBoundingClientRect();return {id:n.dataset.cardHelp,ratio:r.width/r.height,ruleOver:b.scrollHeight-b.clientHeight,art:a.height,titleOver:Math.max(0,h.bottom-head.bottom),bands:[...b.querySelectorAll('[data-rule-type]')].map(n=>n.dataset.ruleType),text:b.textContent}})})()`);
    assert.equal(await ev("document.querySelectorAll('#combo-rows .combo-row').length"),15);
    assert.equal(await ev("new Set([...document.querySelectorAll('#combo-rows .combo-row')].map(n=>[...n.querySelectorAll('[data-card-help]')].map(c=>c.dataset.cardHelp).join('|'))).size"),15);
    assert.ok(values.every(card=>Math.abs(card.ratio-5/7)<.01),'5:7 geometry');
    const clipped=values.filter(card=>card.ruleOver>1||card.titleOver>1);report.push({width,height,clipped,cardCount:values.length});
    await screenshot('gallery-'+width+'x'+height);
    if(width===740){
      const presets=await ev(`(async()=>{const G=await import('./card-combos.mjs?v=skills-cards-3'),C=await import('./skill-cards.mjs?v=skills-cards-3'),row=ids=>({mountedCards:ids.map((id,i)=>C.makeSkillCard(id,'preset:'+i))}),run=row(['first-ripple','far-shore','ripple-glass']);return {options:document.querySelector('[data-combo-event]').options.length,first:C.previewCardRow(run,G.comboEventContext('wave-first')).sparks,later:C.previewCardRow(run,G.comboEventContext('wave-later')).sparks,dusk:C.previewCardRow(row(['dusk-wick','cluster-heart','low-wick']),G.comboEventContext('body-dusk')).sparks,cluster:C.previewCardRow(row(['dusk-wick','cluster-heart','low-wick']),G.comboEventContext('body-cluster')).sparks,low:C.previewCardRow(row(['dusk-wick','cluster-heart','low-wick']),G.comboEventContext('body-low')).sparks,direction:G.comboEventContext('field-down').direction};})()`);
      assert.deepEqual(presets,{options:21,first:2,later:6,dusk:3,cluster:4,low:3,direction:'down'});report.push({presets});
    }
    assert.equal(await ev("document.getElementById('combo-example-result').textContent.includes('+5 Sparks')"),true);
    await click('[data-combo-example="1"]');assert.equal(await ev("document.getElementById('combo-example-result').textContent.includes('+4 Sparks')"),true);
    await click('[data-combo-example="2"]');assert.equal(await ev("document.getElementById('combo-example-result').textContent.includes('+2.5 Sparks')"),true);
    await navigate('/game.html?cards=1&mock=cards','.card-equipped-foreground');
    if(width===740)await saveCapture('pixelation-deck');
    await screenshot('equipped-'+width+'x'+height);
    await click('[data-action="card-slot"][data-index="1"]');
    await until(()=>ev("!!document.querySelector('.card-read-face .card-use-counter')"),'reader');
    const reader=await ev("(()=>{const n=document.querySelector('.card-read-face .card-readable'),b=n.querySelector('.card-rule-band');return {id:n.dataset.cardHelp,ruleOver:b.scrollHeight-b.clientHeight,badge:n.querySelector('.card-use-counter').textContent}})()");report.push({width,height,reader});
    await screenshot('pocket-reader-'+width+'x'+height);
    await click('.card-read-face .card-use-counter');await until(()=>ev("!!document.querySelector('.card-term-dialog[open]')"),'uses help');await click('[data-card-term-close]');
    assert.equal(await ev("document.activeElement.classList.contains('card-use-counter')"),true);
    assert.equal(reader.badge,'4/6');
    const longCards=await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=skills-cards-3'),U=await import('./card-ui.mjs?v=skills-cards-3'),host=document.querySelector('.card-read-face'),result=[];for(const id of ['field-impulse','watchlight','harvest-legendary','camp-kit']){host.innerHTML=U.cardFace(C.describeSkillCard(C.makeSkillCard(id,'reader:'+id)));const n=host.querySelector('.skill-card'),b=n.querySelector('.card-rule-band'),r=b.getBoundingClientRect(),badge=n.querySelector('.card-use-counter'),last=b.querySelector('.card-rule-stripe:last-child'),textRect=document.createRange();textRect.selectNodeContents(last);const lines=[...textRect.getClientRects()];result.push({id,ruleOver:b.scrollHeight-b.clientHeight,badgeOverlap:badge?Math.max(0,...lines.map(r=>r.bottom))-badge.getBoundingClientRect().top:0,art:n.querySelector('.card-illustration').getBoundingClientRect().height,bands:[...b.querySelectorAll('[data-rule-type]')].map(n=>n.dataset.ruleType)});}return result;})()`);
    assert.ok(longCards.every(card=>card.ruleOver<=1&&card.badgeOverlap<=0),'long reader and uses overlap '+JSON.stringify(longCards));report.push({width,height,longCards});
    await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=skills-cards-3'),U=await import('./card-ui.mjs?v=skills-cards-3');document.querySelector('.card-read-face').innerHTML=U.cardFace(C.describeSkillCard(C.makeSkillCard('harvest-legendary','reader:legendary')));})()`);
    await screenshot('legendary-reader-'+width+'x'+height);
    if(width===740){await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=skills-cards-3'),U=await import('./card-ui.mjs?v=skills-cards-3');document.querySelector('.card-read-face').innerHTML=U.cardFace(C.describeSkillCard(C.makeSkillCard('cache-handling','reader:collector')));})()`);await click('.card-read-face [data-card-term=collector]');await ev("document.querySelector('.card-term-picture img').decode()");assert.equal(await ev("document.querySelector('.card-term-picture img').naturalWidth"),320);await screenshot('collector-help-740x333');await click('[data-card-term-close]');}
    if(width===740){
      await navigate('/game.html?cards=1&mock=cards','.card-equipped-foreground');await click('[data-action="card-slot"][data-index="0"]');
      assert.match(await ev("document.querySelector('[data-action=card-preview-improve]').textContent"),/Evolve/);
      await click('[data-action=card-preview-improve]');await until(()=>ev("!!document.querySelector('.card-improve-confirm')"),'evolution review');
      assert.match(await ev("document.querySelector('.card-improve-confirm .card-heading h2').textContent"),/Echo → Echo II/);
      assert.ok(await ev("!!document.querySelector('[data-action=card-confirm-improve]').dataset.token"));await screenshot('evolution-review-740x333');
      await click('[data-action=card-confirm-improve]');await until(()=>ev("document.querySelector('.card-read-face h3')?.textContent==='Echo II'"),'evolved reader');
      report.push({evolution:'Echo → Echo II',verified:true});
    }


  }
  await size(1440,900);await navigate('/card-combos.html?seed=moonwell-15','.combo-row');
  assert.equal(await ev("document.querySelectorAll('#combo-catalog .skill-card').length"),70);await screenshot('gallery-1440x900');
  await size(740,333);
  await navigate('/game.html?cards=1&mock=boundary','.flight-device');
  await until(()=>ev("!!document.querySelector('#flight-canvas')"),'flight canvas');
  await delay(1500);
  await ev("document.querySelector('#pause-layer')?.replaceChildren()");
  await saveCapture('pixelation-flight');await screenshot('actual-flight-740x333');
  const trace=await ev('__cardBandProof.prepare()');assert.equal(trace.sparks,5);assert.equal(trace.frozen,true);
  await until(()=>ev("!!document.querySelector('.flight-card-row:not([hidden])')"),'flight card trace');
  const traceBounds=await ev("(()=>{const r=document.querySelector('.flight-card-row').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,text:document.querySelector('.flight-card-row').textContent}})()");
  assert.ok(traceBounds.x>=0&&traceBounds.y>=0&&traceBounds.right<=740&&traceBounds.bottom<=333);report.push({trace,traceBounds});
  await screenshot('actual-flight-row-trace-740x333');
  const cap=await ev(`(()=>{const e=__cardBandProof.engine();e.flame=e.maxFlame-1;const result=e.resolveCardRowEvent('wave-crossing',{firstCrossing:true});e.notify();return {awarded:result.receipt.sparks,restored:result.receipt.restoredSparks};})()`);assert.equal(cap.awarded,5);assert.ok(Math.abs(cap.restored-.3)<1e-8);
  assert.match(await ev("document.querySelector('.flight-card-row').textContent"),/0.3 restored/);report.push({cap});await screenshot('actual-flight-capped-row-740x333');
  await click('.flight-card-row');await until(()=>ev("!!document.querySelector('.card-row-dialog[open]')"),'trace receipt');
  assert.match(await ev("document.querySelector('.card-row-dialog').textContent"),/Return to slot 1/);
  assert.match(await ev("document.querySelector('.card-row-dialog').textContent"),/5 Sparks awarded.*0.3 Sparks restored/);
  assert.equal(await ev('__cardBandProof.engine().paused'),true);
  await screenshot('actual-flight-row-receipt-740x333');await click('.card-row-dialog footer button');
  assert.equal(await ev("!!document.querySelector('.card-row-dialog')"),false);
  assert.equal(await ev('__cardBandProof.engine().getState().cardRowTrace.sparks'),5);

  await navigate('/card-art-preview.html','#art-card-comparison .skill-card');
  await until(()=>ev("document.querySelectorAll('.art-card-variant canvas').length===2"),'art variants');
  await until(()=>ev("document.querySelectorAll('.art-screen-variant canvas').length===3"),'screen variants');
  await screenshot('art-preview-740x333');
  await ev("document.getElementById('art-card-comparison').scrollIntoView({block:'start'})");await screenshot('art-cards-740x333');
  await click('[data-art-card="harvest-legendary"]');await until(()=>ev("document.querySelectorAll('.art-card-variant canvas').length===2"),'legendary variants');
  await screenshot('art-legendary-740x333');
  await ev("document.querySelector('[data-screen=flight]').click();document.getElementById('art-screen-comparison').scrollIntoView({block:'start'})");await delay(200);await screenshot('art-flight-740x333');
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));
  console.log(JSON.stringify({output,report,errors}));
} finally {socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));await delay(200);}
