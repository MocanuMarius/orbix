import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/card-face-proof");
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
  await send('Page.enable'); await send('Runtime.enable');
  const navigate = async (url,selector) => {await send('Page.navigate',{url:base+url});await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),url);await ev('document.fonts.ready');};
  const size = async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
  const report=[];
  const tap = async(selector)=>{const r=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,radiusX:3,radiusY:3,force:1,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(50);};
  const illustrationSizes = new Map();
  const inspect=async(label)=>{
    const termFilters=await ev("[...document.querySelectorAll('.card-term-icon>.resource-symbol')].filter(n=>n.getClientRects().length).map(n=>getComputedStyle(n).filter)");
    assert.ok(termFilters.every(filter=>filter==='none'),label+' card resource art inherits a dark UI outline');
    const symbols=await ev(`(async()=>{const {pickupArtSvg}=await import('./pickup-art.mjs?v=skills-cards-2'),sources=markup=>[...markup.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),expected=sources(pickupArtSvg('light'));return [...document.querySelectorAll('.resource-symbol-energy')].filter(n=>n.getClientRects().length).map(n=>({sources:sources(n.outerHTML),expected,viewBox:n.getAttribute('viewBox')}));})()`);
    for(const symbol of symbols){assert.deepEqual(symbol.sources,symbol.expected,label+' shared Spark art');assert.equal(symbol.viewBox,'6 6 32 32',label+' Spark optical inset');}
    const cards=await ev(`Array.from(document.querySelectorAll('.skill-card')).filter(n=>n.getClientRects().length).map(n=>{
      const r=n.getBoundingClientRect(),b=n.querySelector('.card-rule-band'),a=n.querySelector('.card-illustration'),h=n.querySelector('.card-face-heading'),title=h.querySelector('h3'),ar=a.getBoundingClientRect(),tr=title.getBoundingClientRect(),hr=h.getBoundingClientRect(),br=b?.getBoundingClientRect(),copy=b?.querySelector('.card-mechanics').getBoundingClientRect();
      return {name:title.textContent,readable:n.classList.contains('card-readable'),width:r.width,height:r.height,ratio:r.width/r.height,x:r.x,y:r.y,bottom:r.bottom,artWidth:ar.width,artHeight:ar.height,artTop:ar.top-r.top,titleInside:tr.top>=hr.top&&tr.bottom<=hr.bottom,ruleHeight:b?.clientHeight,ruleScroll:b?.scrollHeight,ruleInset:br&&br.bottom-copy.bottom,font:b&&getComputedStyle(b.querySelector('.card-mechanic-main')).fontSize,rule:b?.textContent};
    })`);
    report.push({label,cards});
    assert.equal(await ev("document.querySelectorAll('.skill-card .card-rarity').length"),0,label+' printed rarity labels');
    for(const c of cards){
      assert.ok(Math.abs(c.ratio-5/7)<.004,label+JSON.stringify(c));
      assert.ok(c.artHeight>22,label+' art collapsed '+JSON.stringify(c));
      assert.ok(c.titleInside,label+' title clipped '+JSON.stringify(c));
      assert.ok(!c.ruleHeight||c.ruleScroll<=c.ruleHeight+1,label+' rules clipped '+JSON.stringify(c));
      assert.ok(!c.readable||c.ruleInset>=4,label+' rule padding lost '+JSON.stringify(c));
      {
        const key=[c.readable,Math.round(c.width*10),Math.round(c.height*10)].join('x'),reference=illustrationSizes.get(key);
        if(reference) for(const dimension of ['artWidth','artHeight','artTop']) assert.ok(Math.abs(c[dimension]-reference[dimension])<.1,label+' unequal illustration '+dimension+' '+JSON.stringify({card:c,reference}));
        else illustrationSizes.set(key,c);
      }
    }
    await screenshot(label);
  };
  for(const [w,h] of process.argv.includes('--symbols-only')?[]:[[720,280],[740,333],[900,405]]){
    if(process.argv.includes('--thumbnails-only')){
      await size(w,h);await navigate('/game.html?cards=1&mock=cards','.card-deck');
      await inspect('thumbnails-'+w+'x'+h);
      await click('[data-action="card-page"][data-page="1"]');await inspect('thumbnails-page2-'+w+'x'+h);
      continue;
    }
    await size(w,h);await navigate('/game.html?cards=1&mock=cards&scenario=starter','.card-starter');await inspect('starter-'+w+'x'+h);
    assert.equal(await ev("document.querySelectorAll('button button').length"),0,'valid button structure');
    const before=await ev("document.querySelector('.card-starter').textContent");
    await tap('.card-starter [data-card-term]');assert.ok(await ev("!!document.querySelector('.card-term-dialog[open]')"));await bounds('.card-term-dialog','term help '+w);await screenshot('starter-term-'+w+'x'+h);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await ev("!!document.querySelector('.card-term-dialog')"),false);assert.equal(await ev("document.querySelector('.card-starter').textContent"),before);assert.equal(await ev("document.activeElement.hasAttribute('data-card-term')"),true);
    await tap('.card-starter .card-term-icon');assert.ok(await ev("!!document.querySelector('.card-term-dialog[open]')"));await tap('[data-card-term-close]');await tap('.card-starter [data-card-term-trigger]');await tap('[data-card-term-close]');assert.ok(await ev("!!document.querySelector('.card-starter')"));
    await navigate('/game.html?cards=1&mock=cards','.card-deck');await inspect('deck-'+w+'x'+h);await click('[data-action="card-slot"][data-index="1"]');await inspect('pocket-'+w+'x'+h);await tap('[data-card-term="spark"] .card-term-icon');assert.ok(await ev("!!document.querySelector('.card-term-dialog[open]')"));assert.equal(await ev("!!document.querySelector('.card-drag-ghost')"),false);await tap('[data-card-term-close]');assert.ok(await ev("!!document.querySelector('.card-deck-reading')"));
    await click('[data-action="card-reading-back"]');await click('[data-action="card-select"][data-id="sample:stored:3"]');await inspect('legendary-'+w+'x'+h);
    await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=skills-cards-2'),U=await import('./card-ui.mjs?v=skills-cards-2');window.cardFaceFixture=(id)=>{document.querySelector('.card-read-face').innerHTML=U.cardFace(C.describeSkillCard(C.makeSkillCard(id,'face:'+id)));};})()`);
    for(const id of ['body-spark','spark-cache','deep-vessel','tight-packing','echo','chameleon','field-impulse','lift-guide','rhythm','harvest-common','harvest-rare','harvest-legendary','camp-kit','growth-seed','cache-handling','flash-handling']){
      await ev('cardFaceFixture('+JSON.stringify(id)+')');await inspect('all-'+id+'-'+w+'x'+h);
      const before=await ev("document.querySelector('.card-deck-reading').innerHTML");
      const terms=await ev("[...new Set([...document.querySelectorAll('.card-read-face [data-card-term]')].map(n=>n.dataset.cardTerm))]");
      for(const key of terms){
        await tap('[data-card-term="'+key+'"]');
        const expected=await ev(`(async()=>{const {CARD_TERMS}=await import('./card-terms.mjs?v=skills-cards-2');return CARD_TERMS[${JSON.stringify(key)}][0]})()`);
        assert.equal(await ev("document.querySelector('.card-term-dialog[open] h3')?.textContent.trim()"),expected,id+' term '+key);
        if(key==='spark'||key==='stored')assert.equal(await ev("document.querySelector('.card-term-dialog[open] h3>.resource-symbol')?.getAttribute('aria-label')"),key==='spark'?'Spark Meter':'Stored Sparks',id+' glossary symbol');
        assert.equal(await ev("!!document.querySelector('.card-drag-ghost')"),false,id+' term started drag');
        await tap('[data-card-term-close]');
        assert.equal(await ev("document.querySelector('.card-deck-reading').innerHTML"),before,id+' term changed deck');
      }
    }
    await navigate('/game.html?cards=1&mock=cards','.card-deck');await click('[data-action="card-preview-forge"][data-rarity="rare"]');await inspect('forge-'+w+'x'+h);await tap('[data-card-term-trigger]');assert.ok(await ev("!!document.querySelector('.card-term-dialog[open]')"));await tap('[data-card-term-close]');assert.ok(await ev("!!document.querySelector('.card-forge-preview')"));
  }
  await size(900,405);await navigate('/game.html?cards=1&mock=cards','.card-deck');
  await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=skills-cards-2'),U=await import('./card-ui.mjs?v=skills-cards-2');document.querySelector('dialog.game-sheet').innerHTML='<section style="height:100%;display:flex;flex-direction:column;align-items:center;gap:8px"><h2 style="font:22px/1 var(--pixel);color:#e9ddb3;margin:0">Card rarities</h2><div style="display:flex;gap:24px;align-items:center;justify-content:center;flex:1">'+['body-spark','flash-handling','harvest-legendary'].map(id=>U.cardFace(C.describeSkillCard(C.makeSkillCard(id,'rarity:'+id))).replace('<article class=', '<article style="--card-height:320px" class=')).join('')+'</div></section>';await new Promise(r=>{const i=new Image();i.onload=r;i.src='./assets/cards/skill-card-scenes.webp';});})()`);
  await inspect('rarity-comparison-900x405');
  await fs.mkdir(path.resolve('dist/assets/previews'),{recursive:true});
  const comparison=await send('Page.captureScreenshot',{format:'webp',quality:94});await fs.writeFile(path.resolve('dist/assets/previews/card-rarities.webp'),Buffer.from(comparison.data,'base64'));
  await size(740,333);await ev("document.querySelectorAll('.skill-card').forEach(n=>n.style.setProperty('--card-height','260px'))");await inspect('rarity-comparison-740x333');
  await size(740,333);
  await ev(`(async()=>{const {resourceSymbol}=await import('./game-symbols.mjs?v=skills-cards-2');const current=resourceSymbol('energy'),before=current.replace('viewBox="6 6 32 32"','viewBox="0 0 24 24"').replaceAll('width="44" height="44"','width="24" height="24"').replace('<svg ','<svg style="filter:drop-shadow(1px 0 0 #060d10) drop-shadow(-1px 0 0 #060d10) drop-shadow(0 1px 0 #060d10)!important" ');document.querySelector('dialog.game-sheet').innerHTML='<section style="padding:16px;display:grid;gap:18px;color:#f4e7b9;font:15px/1.3 var(--pixel)"><h2 style="font:20px/1.2 var(--pixel);margin:0">Shared Spark · actual interface sizes</h2><div style="display:grid;grid-template-columns:95px repeat(4,1fr);align-items:center;gap:16px"><span></span>'+[11,14,16,20].map(s=>'<span>'+s+' px text</span>').join('')+['Before','Now'].map((label,row)=>'<span>'+label+'</span>'+[11,14,16,20].map(s=>'<span style="font-size:'+s+'px;background:#e7dbb0;color:#26352b;padding:9px;white-space:nowrap"><span class="card-term-icon" style="'+(!row?'width:.88em;height:.88em;vertical-align:-.05em;margin-right:2px;filter:drop-shadow(0 0 1px #27402b)':'')+'">'+(row?current:before)+'</span>Spark</span>').join('')).join('')+'</div><p style="margin:0">'+resourceSymbol('packed')+' Stored Sparks keep their storage case.</p><p style="font-size:12px;margin:0;color:#bac9a6">Same flight sprite and animation. Tighter icon framing; aligned term spacing.</p></section>';document.documentElement.dataset.reducedMotion='true';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));})()`);
  await screenshot('spark-icons-before-after-740x333');
  await fs.writeFile(path.join(output,process.argv.includes('--symbols-only')?'report-symbols.json':process.argv.includes('--thumbnails-only')?'report-thumbnails.json':'report.json'),JSON.stringify({report,errors},null,2));assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({output,checks:report.length,errors,measurements:report.filter(r=>/^(starter|pocket|legendary|forge)-/.test(r.label))}));
} finally {socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));await delay(200);}
