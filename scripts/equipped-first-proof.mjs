import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/equipped-first-proof");
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

  const metrics = async() => ev(`(()=>{const s=document.querySelector('dialog.card-bench-sheet'),g=s?.querySelector('.card-deck-gallery'),row=s?.querySelector('.card-foreground-row');return {sheet:{w:s.clientWidth,h:s.clientHeight,scrollW:s.scrollWidth,scrollH:s.scrollHeight},gallery:g?{h:g.clientHeight,scrollH:g.scrollHeight,scrollTop:g.scrollTop,count:g.querySelectorAll('[data-action="card-select"]').length}:null,row:row?{w:row.clientWidth,scrollW:row.scrollWidth,h:row.clientHeight,scrollH:row.scrollHeight}:null,faces:[...s.querySelectorAll('.card-readable')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.cardInstance,w:r.width,h:r.height,ratio:r.width/r.height,ruleOverflow:n.querySelector('.card-rule-band').scrollHeight-n.querySelector('.card-rule-band').clientHeight}})}})()`);
  const validate = async(label) => {const m=await metrics();assert.ok(m.sheet.scrollW<=m.sheet.w+1,label+' sheet horizontal overflow');assert.ok(m.sheet.scrollH<=m.sheet.h+1,label+' sheet vertical overflow');if(m.row)assert.ok(m.row.scrollH<=m.row.h+1,label+' foreground vertical overflow');for(const f of m.faces){assert.ok(Math.abs(f.ratio-5/7)<0.015,label+' card ratio');assert.ok(f.ruleOverflow<=1,label+' rule clipped '+JSON.stringify(f));}report.push({label,...m});await screenshot(label);};
  if(!process.argv.includes('--flows-only'))for(const [w,h] of [[740,333],[720,280]]){
    await size(w,h);await navigate('/game.html?cards=1&mock=cards','.card-equipped-foreground');await delay(150);
    assert.equal(await ev("document.querySelectorAll('.card-equipped-face').length"),3);
    assert.equal(await ev("document.querySelectorAll('.card-deck-gallery,[data-action=card-preview-forge],[data-action=card-melt-mode]').length"),0);
    const initial=await ev("[...document.querySelectorAll('.card-equipped-face .skill-card')].map(n=>n.dataset.cardInstance)");
    await validate('equipped-'+w+'x'+h);
    await tap('[data-action="card-open-collection"]');
    assert.equal(await ev("document.querySelectorAll('[data-action=card-page]').length"),0);
    assert.equal(await ev("document.querySelectorAll('.card-deck-browser .card-equipped,.card-deck-browser [data-deck-drag-id]').length"),0);
    assert.equal(await ev("document.querySelectorAll('.card-deck-browser [data-action=card-select]').length"),6);
    await validate('deck-'+w+'x'+h);
    const reserve=await ev("[...document.querySelectorAll('.card-deck-browser [data-action=card-select]')].map(n=>n.dataset.id)");
    await ev("document.querySelector('.card-deck-gallery').scrollTop=120");
    await click('[data-action="card-select"][data-id="sample:stored:1"]');
    assert.ok(await ev("!!document.querySelector('.card-deck-reading:not(.card-deck-equipping)')"));
    assert.match(await ev("document.querySelector('.card-read-face').textContent"),/2 uses left/);
    await validate('reader-'+w+'x'+h);
    await tap('[data-action="card-reading-back"]');
    assert.equal(await ev("document.querySelector('.card-deck-gallery').scrollTop"),120);
    await click('[data-action="card-select"][data-id="sample:stored:1"]');await tap('[data-action="card-equip"]');
    assert.match(await ev("document.querySelector('[data-action=card-slot][data-index=\"0\"]').textContent"),/Moves to reserve/);
    await validate('chooser-'+w+'x'+h);
    await tap('[data-action="card-cancel-equip"]');assert.ok(await ev("!!document.querySelector('.card-deck-reading:not(.card-deck-equipping)')"));
    await tap('[data-action="card-equip"]');await tap('[data-action="card-slot"][data-index=\"0\"]');
    assert.ok(await ev("!!document.querySelector('.card-equipped-foreground')"));
    assert.match(await ev("document.querySelector('.card-deck-status').textContent"),/Echo returned to reserve/);
    const mounted=await ev("[...document.querySelectorAll('.card-equipped-face .skill-card')].map(n=>n.dataset.cardInstance)");assert.deepEqual(mounted,['sample:stored:1','sample:1','sample:2']);
    assert.match(await ev("document.querySelector('.card-equipped-face[data-index=\"0\"]').textContent"),/2 uses left/);
    await validate('replaced-'+w+'x'+h);
    await tap('[data-action="card-open-collection"]');
    const after=await ev("[...document.querySelectorAll('.card-deck-browser [data-action=card-select]')].map(n=>n.dataset.id)");assert.ok(after.includes('sample:0'));assert.ok(!after.includes('sample:stored:1'));assert.deepEqual([...after,...mounted].sort(),[...initial,...reserve].sort());assert.match(await ev("document.querySelector('.card-bench-wallet').textContent"),/90/);
    await tap('[data-action="card-collection-back"]');await tap('.card-close');assert.equal(await ev("!!document.querySelector('dialog.card-sheet[open]')"),false);
    await navigate('/game.html?cards=1&mock=cards&slots=5','.card-equipped-foreground');await validate('five-slots-'+w+'x'+h);
    assert.equal(await ev("document.querySelectorAll('.card-equipped-face').length"),5);
    // Full collection has one intentional inner scroll, even with many duplicates.
    await navigate('/game.html?cards=1&mock=cards&deck=large','.card-equipped-foreground');await tap('[data-action="card-open-collection"]');
    assert.equal(await ev("document.querySelectorAll('.card-deck-browser [data-action=card-select]').length"),126);
    await ev("document.querySelector('.card-deck-gallery').scrollTop=1e7");
    assert.equal(await ev("(()=>{const n=document.querySelector('[data-id=\"sample:large:119\"]');const r=n.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()"),true);await validate('large-deck-bottom-'+w+'x'+h);
  }

  await size(740,333);await navigate('/game.html?cards=1&mock=cards','.card-equipped-foreground');await tap('[data-action="card-open-collection"]');
  // Real touch scrolling must remain scrolling rather than becoming a drag.
  const swipe=async()=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:260,id:1}]});for(let i=1;i<=8;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:260-i*17,id:1}]});await delay(16);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(150);};await swipe();
  assert.ok(await ev("document.querySelector('.card-deck-gallery').scrollTop>40"),'reserve touch swipe scrolls');
  await ev("document.querySelector('.card-deck-gallery').scrollTop=100");
  await tap('[data-action="card-preview-forge"]');await tap('[data-action="card-forge-back"]');assert.equal(await ev("document.querySelector('.card-deck-browser .card-deck-gallery').scrollTop"),100);
  await tap('[data-action="card-melt-mode"]');await ev("document.querySelector('.card-deck-gallery').scrollTop=150");await click('[data-action="card-select"][data-id="sample:stored:5"]');assert.equal(await ev("document.querySelector('.card-deck-gallery').scrollTop"),150,'melt toggle keeps scroll');
  await tap('[data-action="card-preview-melt-selected"]');await tap('[data-action="card-back-melt"]');assert.equal(await ev("document.querySelector('.card-deck-gallery').scrollTop"),150,'review back keeps Melt scroll');
  await tap('[data-action="card-cancel-melt"]');assert.equal(await ev("document.querySelector('.card-deck-browser .card-deck-gallery').scrollTop"),100,'Melt cancel keeps separate Deck scroll');
  await tap('[data-action="card-collection-back"]');await tap('.card-close');await tap('[data-action="menu"]');await tap('dialog.game-menu-sheet [data-action="skills"]');assert.ok(await ev("!!document.querySelector('.card-equipped-foreground')"));await tap('.card-close');assert.ok(await ev("!!document.querySelector('dialog.game-menu-sheet[open]')"),'Done returns to menu caller');
  report.push({label:'touch-scroll-forge-back-melt-scroll-menu-return',passed:true});
  await fs.writeFile(path.join(output,process.argv.includes('--flows-only')?'flows-report.json':'report.json'),JSON.stringify({report,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({output,checks:report.length,errors}));
} finally {socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));await delay(200);}
