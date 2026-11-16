import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const output = path.resolve("work/proximity-card-proof");
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

  await send('Runtime.enable');await send('Page.enable');
  const report=[];
  async function load(url,ready) {await send('Page.navigate',{url:base+url});await until(()=>ev(ready),'page ready');}
  for(const [width,height] of [[740,333],[720,280]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await load('/card-combos.html',"!!document.querySelector('[data-card-help=\"edge-reach\"]')");
    await ev(`document.querySelector('#combo-catalog-search').value='Edge Reach';document.querySelector('#combo-catalog-search').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#combo-catalog').scrollIntoView()`);
    await click('#combo-catalog [data-card-help="edge-reach"] .card-help');
    await until(()=>ev("!!document.querySelector('[data-proximity-ready=\"true\"]')"),'preview ready');
    const values=await ev(`({before:document.querySelector('[data-side="before"]').dataset.charge,after:document.querySelector('[data-side="after"]').dataset.charge,text:document.querySelector('.proximity-card-help').innerText,canvases:document.querySelectorAll('.proximity-help-scene canvas').length,stages:document.querySelectorAll('.proximity-help-stage').length})`);
    assert.equal(Number(values.before),0);assert.ok(Math.abs(Number(values.after)-.5)<.000001);assert.equal(values.canvases,2);assert.equal(values.stages,0);assert.match(values.text,/Example loadout/);assert.match(values.text,/Proximity off/);assert.match(values.text,/3.9 wisp widths/);
    await screenshot(`edge-help-1s-${width}x${height}`);
    await click('[data-proximity-step]');
    await until(()=>ev("document.querySelector('[data-side=\"after\"]')?.dataset.waves==='1'"),'real wave');
    await screenshot(`edge-help-2s-${width}x${height}`);
    assert.equal(await ev("document.querySelectorAll('.proximity-help-stage').length"),0);
    await click('dialog [data-card-term-close]');assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog').length"),0);
    report.push({width,height,...values});
  }
  // Reward proof uses the exact production model receipt and cardRewardMarkup.
  await load('/game.html?cards=1&mock=cards&scenario=reward&reward=edge-reach',"!!document.querySelector('.card-bench')");
  await ev(`document.querySelector('dialog.card-bench-sheet')?.remove();document.querySelector('#app').innerHTML='';const b=document.createElement('button');b.dataset.action='card-demo-reward';document.body.append(b);b.click();b.remove()`);
  await screenshot('edge-real-flight-reward-720x280');
  const reward=await ev(`({card:!!document.querySelector('.card-reward-new>.skill-card.card-rare'),condition:document.querySelector('.card-rule-condition')?.textContent,effect:document.querySelector('.card-rule-effect')?.textContent,help:!!document.querySelector('.card-reward-new .card-help'),badge:!!document.querySelector('.card-reward-new .card-rarity-inlay')})`);
  assert.ok(reward.card&&reward.help&&reward.badge);assert.equal(reward.condition,'Near solid terrain');assert.match(reward.effect,/50% farther/);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({report,reward,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({output,report,reward,errors}));
} finally {socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));await delay(200);}
