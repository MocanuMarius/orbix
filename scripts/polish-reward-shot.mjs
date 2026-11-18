// Screenshots of the flight-rewards tally with the maximum number of source rows: final state and one mid-animation frame.
// JOB 2d (2026-11-18): the tally screen with the realistic maximum of Recorded effects.
//   node scripts/polish-reward-shot.mjs [effects=8]   -> outputs/backlog-ui/polish-reward-<w>x<h>.png
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome, until} from './browser-probe.mjs';
const root = path.resolve('dist'), out = path.resolve('outputs/backlog-ui');
const page = `<module>
import * as M from './model.mjs?v=guide-clarity-1';
import {flightRewardCeremonyMarkup,mountFlightRewardCeremony,mountReceiptInspector} from './flight-reward-ceremony.mjs?v=guide-clarity-1';
const state=M.newState();state.profile.tutorialComplete=true;
state.run=M.createRun(state.profile,'tally-shot',1,{cards:true});
M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);
const node=M.getChoices(state.run).find(n=>n.type!=='support');
M.selectNode(state.run,node.id);M.beginFlightAttempt(state.run);M.markFlightAttemptStarted(state.run);
M.finishFlight(state.run,{success:true,flame:50});M.settleCheckpoint(state);
const run=state.run,f=run.lastFlight;
const FULL=new URLSearchParams(location.search).get('rows')||'15';
Object.assign(f,{completionBonus:20,pickupCondensedGlow:20,exitPacking:{amount:15},cardPack:{stored:5},cardEngineStored:4,pactBonus:6,treasureWager:{reward:5,message:'Seal kept'},vow:{reward:4,message:'Vow kept'},
 routeBonus:{amount:7,message:'A real completed route bonus'},chestIncome:{amount:6,message:'Chest gifts',sources:['Chest']},keptLightDividend:3,storageBonus:2,cardPackingBonus:3,resonanceStored:2});
f.cardClearReceipt={...(f.cardClearReceipt||{}),stored:8,futureCapacity:2,cruisingSpeed:3,steps:[],sources:[]};
const ids=Object.keys(M.ARTIFACTS).slice(0,Math.max(0,Number(new URLSearchParams(location.search).get('relics')||2)));f.artifactActivations=Object.fromEntries(ids.map((id,i)=>[id,i+2]));
f.securedCondensedGlow=1000;run.condensedGlow=1118;
if(FULL==='5'){for(const k of ['pactBonus','treasureWager','vow','routeBonus','chestIncome','keptLightDividend','storageBonus','cardPackingBonus','resonanceStored'])delete f[k];f.cardClearReceipt.stored=0;}
document.querySelector('#app').innerHTML=flightRewardCeremonyMarkup(run);
const el=document.querySelector('.flight-reward-ceremony');
mountReceiptInspector(el,run);
window.__rows=el.querySelectorAll('[data-tally-row]').length;
window.__mount=(animate)=>mountFlightRewardCeremony({root:el,run,animateWallet:animate,reducedMotion:false});
window.__ready=true;
</module>`;
const html = async () => (await fs.readFile(path.join(root, 'game.html'), 'utf8')).replace(/<script[^>]*><\/script>/g, '').replace('</body>', page.replace('<module>', '<script type="module">').replace('</module>', '</script></body>'));
const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json'};
const server = http.createServer(async (req, res) => { try {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/tally.html') return res.writeHead(200, {'Content-Type': 'text/html'}).end(await html());
  const file = path.resolve(root, '.' + url.pathname);
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(await fs.readFile(file));
} catch (e) { res.writeHead(404).end(String(e)); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port, browser = await chrome(['--mute-audio']);
try {
  const effects = process.argv[2] || '8', relics = Math.max(0, Number(effects) - 6);
  for (const [w, h] of [[890, 400], [924, 308]]) {
    await browser.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: true});
    await browser.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1});
    await browser.visit(base + `/tally.html?rows=15&relics=${relics}`);
    await until(() => browser.ev('window.__ready===true'), 'page', 100);
    await browser.ev('document.fonts.ready.then(()=>1)');
    await browser.ev('window.__stop=window.__mount(false)');
    await new Promise(r => setTimeout(r, 900));
    await browser.shot(path.join(out, `polish-reward-${w}x${h}.png`));
    const m = await browser.ev(`(()=>{const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],act=q('.flight-reward-actions').getBoundingClientRect(),notes=q('.flight-reward-notes'),reg=q('[data-receipt-scroll]');
      return {effects:all('.flight-reward-notes p').length,rows:all('[data-tally-row]').length,regionScroll:reg?reg.scrollHeight-reg.clientHeight:null,pageScroll:document.documentElement.scrollHeight-innerHeight,notesBottom:notes?Math.round(notes.getBoundingClientRect().bottom):null,notesRight:notes?Math.round(notes.getBoundingClientRect().right):null,actionsTop:Math.round(act.top),vw:innerWidth,vh:innerHeight,
      overlapping:all('.flight-reward-notes p').filter(p=>p.getBoundingClientRect().bottom>act.top+1||p.getBoundingClientRect().right>innerWidth+1).length,cue:(q('[data-receipt-scroll-cue]')||{}).hidden}})()`);
    console.log(w + 'x' + h, JSON.stringify(m));
  }
  console.log('errors', JSON.stringify(browser.errors));
} finally { browser.close(); server.close(); }
