import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "wisp-cards-ui-"));
const output = path.resolve("work/card-playtest");
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
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent.trim().slice(0,45),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}})`,
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
    await ev(`(async()=>{const M=await import('./model.mjs?v=skills-cards-1'),C=await import('./skill-cards.mjs?v=skills-cards-1');const s=M.newState();s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'card-ui-smoke',1,{cards:true});M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);const r=s.run;r.mountedCards=[C.makeSkillCard('echo','echo'),C.makeSkillCard('spark-cache','cache'),C.makeSkillCard('field-impulse','field')];r.condensedGlow=120;
   if(${JSON.stringify(kind)}==='reward'){const n=M.getChoices(r).find(n=>n.type!=='support');M.selectNode(r,n.id);M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:60,collected:3});M.settleCheckpoint(s);}
   if(${JSON.stringify(kind)}==='empty-wallet')r.condensedGlow=0;
   if(${JSON.stringify(kind)}==='camp'){const n=r.map.flat().find(n=>n.kind==='camp');r.step=n.row;r.current=n;r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];r.phase='support';r.flame=30;r.lives=2;r.mountedCards=[C.makeSkillCard('camp-kit','kit'),C.makeSkillCard('growth-seed','grow'),C.makeSkillCard('body-spark','body')];M.getSupportChoices(r,s.profile);}
   if(${JSON.stringify(kind)}==='final'){const n=r.map.flat().find(n=>n.boss);r.mapIndex=2;r.step=n.row;r.current=n;r.phase='briefing';r.path=[...r.map.slice(0,n.row).map(row=>row[0].id),n.id];}
   const storage={setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)};M.saveState(s,storage);})()`);
    await page("/game.html?cards=1");
    if (kind === "final")
      await ev(
        "(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-1');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){globalThis.qaCardFlight=this;return start.apply(this,args);};})()",
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 740,
    height: 333,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await page("/game.html");
  await send("Page.navigate", { url: base + "/loading.html" });
  await until(
    () => ev("location.pathname==='/loading.html'"),
    "standard fixture",
  );
  await ev(
    "(async()=>{const M=await import('./model.mjs?v=skills-cards-1');const s=M.newState();s.settings.skipTutorial=true;s.run=M.createRun(s.profile,'standard-save');M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);M.saveState(s,localStorage);})()",
  );
  const standard = await ev(
    "localStorage.getItem('wispbound.save.condensed.v7')",
  );
  await page("/game.html?cards=1");
  await screenshot("home-pilot-740");
  await click('[data-action="tutorial"]');
  await click('[data-action="pickup-key"]');
  assert.ok(
    await ev("!!document.querySelector('.pickup-guide')"),
    "home key works without an active run",
  );
  await click('[data-action="close-power"]');
  await click('[data-action="skip-tutorial"]');
  await click('[data-action="new-game"]');
  await until(() => ev("!!document.querySelector('.card-starter')"), "starter");
  assert.equal(
    await ev("document.querySelectorAll('.card-starter .card-rarity').length"),
    2,
  );
  assert.deepEqual(
    await ev(
      "[...document.querySelectorAll('.card-starter .card-rarity')].map(n=>n.textContent)",
    ),
    ["common", "common"],
  );
  await screenshot("starter-740");
  await click('[data-action="new-gift"]');
  assert.equal((await saved()).run.skillSystem, "cards-v1");
  assert.equal((await saved()).run.mountedCards.filter(Boolean).length, 1);
  await click('[data-action="skills"]');
  await until(() => ev("!!document.querySelector('.card-bench')"), "Cards");
  assert.equal(
    await ev("document.querySelectorAll('.card-slot-pick').length"),
    3,
  );
  assert.equal(await ev("!!document.querySelector('.book-sheet')"), false);
  await click('[data-action="close-sheet"]');
  const launchNode = await ev(
    "document.querySelector('.reachable[data-action=preview-node]')?.dataset.id",
  );
  assert.ok(launchNode, "real card run reachable start");
  await ev(
    "(async()=>{const {WispFlight}=await import('./flight.mjs?v=skills-cards-1');const start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){globalThis.qaCardFlight=this;return start.apply(this,args);};})()",
  );
  await click(`[data-action="preview-node"][data-id="${launchNode}"]`);
  await click(`[data-action="node"][data-id="${launchNode}"]`);
  await until(
    () =>
      ev(
        "!!globalThis.qaCardFlight&&!!document.querySelector('.flight-resume-gate')",
      ),
    "real card flight",
  );
  assert.equal(await ev("qaCardFlight.options.cardPilot"), true);
  assert.equal(
    await ev("qaCardFlight.mod.cardExecution.cards.filter(Boolean).length"),
    1,
  );
  await fixture("reward");
  await until(
    () => ev("!!document.querySelector('.card-reward-screen')"),
    "reward",
  );
  assert.equal(
    await ev(
      "document.querySelector('[data-action=card-equip-reward]').disabled",
    ),
    true,
  );
  await click('[data-action="card-select-replacement"][data-index="1"]');
  assert.match(
    await ev("document.querySelector('.card-loss-preview').textContent"),
    /Pocket Sparks.*6 uses left.*10 Stored Sparks/s,
  );
  await bounds(
    ".card-reward-screen button,.card-reward-new>.skill-card",
    "reward 740",
  );
  await screenshot("replace-740");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 720,
    height: 280,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await ev(
    "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
  );
  await bounds(
    ".card-reward-screen button,.card-reward-new>.skill-card",
    "reward 720×280",
  );
  await screenshot("replace-720x280");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 740,
    height: 333,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const beforeReplace = (await saved()).run.condensedGlow;
  await click('[data-action="card-equip-reward"]');
  assert.equal((await saved()).run.cardReward.claimed, true);
  assert.equal((await saved()).run.condensedGlow, beforeReplace + 10);
  await fixture("bench");
  await click('[data-action="skills"]');
  await click('[data-action="card-preview-move"][data-direction="1"]');
  assert.match(
    await ev("document.querySelector('.card-order-preview').textContent"),
    /12-Spark direct pickup: 20 → 16.*6 → 5 uses/s,
  );
  await click('[data-action="card-confirm-move"]');
  assert.equal((await saved()).run.mountedCards[1].cardId, "echo");
  await click('[data-action="card-select"][data-index="0"]');
  await click('[data-action="card-preview-improve"]');
  await until(
    () => ev("!!document.querySelector('.card-exchange')"),
    "improve",
  );
  await screenshot("improve-740");
  const beforeImprove = (await saved()).run.condensedGlow;
  await click('[data-action="card-confirm-improve"]');
  assert.equal((await saved()).run.mountedCards[0].rank, 2);
  assert.equal((await saved()).run.mountedCards[0].charges, 6);
  assert.equal((await saved()).run.condensedGlow, beforeImprove - 15);
  await fixture("empty-wallet");
  await click('[data-action="skills"]');
  await click('[data-action="card-select"][data-index="1"]');
  await click('[data-action="card-preview-improve"]');
  assert.equal(
    await ev(
      "document.querySelector('[data-action=card-confirm-improve]').disabled",
    ),
    true,
  );
  assert.match(
    await ev("document.querySelector('.card-exchange-result').textContent"),
    /Need 15 more Stored Sparks/,
  );
  await fixture("camp");
  await until(
    () => ev("!!document.querySelector('.card-rest-screen')"),
    "camp",
  );
  await bounds(".card-rest-screen button", "camp 740");
  await screenshot("camp-740");
  await click('[data-action="card-preview-forge"]');
  await until(
    () => ev("!!document.querySelector('.card-forge-preview')"),
    "exact forge",
  );
  const forgeName = await ev(
    "document.querySelector('.card-forge-preview .skill-card h3').textContent",
  );
  await click('[data-action="card-preview-forge"][data-index="3"]');
  assert.match(
    await ev("document.querySelector('.card-exchange-result').textContent"),
    /60/,
  );
  await click('[data-action="card-preview-forge"][data-index="2"]');
  await bounds(".card-forge-preview button", "forge 740");
  await screenshot("forge-740");
  assert.equal(
    await ev(
      "document.querySelector('.card-forge-preview .skill-card h3').textContent",
    ),
    forgeName,
  );
  await click('[data-action="card-confirm-forge"]');
  await until(
    () => ev("!!document.querySelector('.card-reward-screen')"),
    "forged reward",
  );
  assert.equal((await saved()).run.cardRest.actions[0], "forge");
  assert.equal((await saved()).run.mountedCards[0].charges, 1);
  await click('[data-action="card-preview-reward-melt"]');
  await click('[data-action="card-confirm-reward-melt"]');
  await until(
    () => ev("!!document.querySelector('.card-rest-screen')"),
    "second action",
  );
  await click('[data-action="support"][data-index="4"]');
  assert.equal((await saved()).run.cardRest.actions.join(","), "forge,grow");
  assert.equal((await saved()).run.mountedCards[0], null);
  await until(
    () => ev("!!document.querySelector('.card-camp-finished')"),
    "finished camp",
  );
  await click('[data-action="view-route"]');
  assert.ok(
    await ev("!!document.querySelector('#journey-map')"),
    "rest exits to route",
  );
  await fixture("bench");
  await click('[data-action="menu"]');
  await click('[data-action="field-guide"]');
  await click('[data-action="pickup-key"]');
  await until(
    () => ev("!!document.querySelector('.pickup-guide')"),
    "pickup key",
  );
  assert.match(
    await ev(
      "document.querySelector('[data-pickup-kind=cache] .pickup-guide-handling').textContent",
    ),
    /Touch with your wisp.*Cache Handling/,
  );
  assert.match(
    await ev(
      "document.querySelector('[data-pickup-kind=cluster] .pickup-guide-handling').textContent",
    ),
    /Collector can fetch/,
  );
  assert.match(
    await ev(
      "document.querySelector('[data-pickup-kind=sight] .pickup-guide-handling').textContent",
    ),
    /Flash Handling/,
  );
  await screenshot("pickup-key-740");
  await fixture("final");
  await until(
    () => ev("!!document.querySelector('.card-victory-recap')"),
    "final victory",
  );
  assert.match(
    await ev("document.querySelector('.card-victory-recap').textContent"),
    /Final trophy/s,
  );
  await screenshot("victory-740");
  assert.equal(
    await ev("localStorage.getItem('wispbound.save.condensed.v7')"),
    standard,
    "pilot preserves standard save exactly",
  );
  await send("Page.navigate", {
    url: base + "/index.html?cards=1&display=desktop",
  });
  await until(
    () => ev("document.querySelector('#game-frame')?.src.includes('cards=1')"),
    "desktop preserves pilot query",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify({
      standardSavePreserved: true,
      starter: true,
      realFlight: true,
      replace: true,
      reorderPreview: true,
      improve: true,
      exactForge: true,
      distinctCampActions: true,
      finalTrophy: true,
      desktopQuery: true,
      screenshots: output,
      errors,
    }),
  );
} finally {
  socket?.close();
  browser.kill();
  server.close();
}
