import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
import {drawSkillCardDraft,SKILL_CARDS,makeSkillCard} from '../dist/skill-cards.mjs';

const output=path.resolve('outputs/dusk-luminance');await fs.mkdir(output,{recursive:true});
const report={before:{duskNativeSparks:12,duskDrain:0,ordinaryDuskEncounters:0,sustainedLuminanceCards:0},
  after:{duskNativeSparks:0,duskDrain:3,duskDimPercent:20,duskDimSeconds:4,wickGrossSparks:[20,30,40],lensRadius:[145,174]},drafts:{},screens:[]};
for(const mapIndex of [0,1]){
  const cumulative=[0,0,0],byRound=[0,0,0],owned={offers:0,total:0},seeds=3000;
  for(let seed=0;seed<seeds;seed++){
    const run={campaignSeed:`lens-distribution:${seed}`,mapIndex,cardHistory:[]};let seen=false;
    for(let round=0;round<3;round++){
      const node={id:`flight-${round}`},offers=drawSkillCardDraft(run,node),hasLens=offers.some(c=>c.cardId==='lantern-lens');
      if(hasLens)byRound[round]++;seen ||= hasLens;if(seen)cumulative[round]++;
      const card=offers.find(c=>c.cardId!=='lantern-lens');
      run.cardHistory.push({type:'drop',mapIndex,nodeId:node.id,card:{...card,rarity:SKILL_CARDS[card.cardId].rarity},offeredCardIds:offers.map(c=>c.cardId)});
    }
    run.reserveCards=[makeSkillCard('lantern-lens','owned')];owned.total++;
    if(drawSkillCardDraft(run,{id:'owned-next'}).some(c=>c.cardId==='lantern-lens'))owned.offers++;
  }
  report.drafts[mapIndex+1]={seeds,offeredThisRound:byRound,cumulativeByRound:cumulative,
    cumulativePercent:cumulative.map(n=>+(100*n/seeds).toFixed(2)),onceAcquiredPercent:+(100*owned.offers/owned.total).toFixed(2)};
}
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#08111d}#stage{position:relative;width:100vw;height:100vh}canvas{width:100%;height:100%}</style><div id="stage"><canvas></canvas></div><script type="module">
import {WispFlight} from '/flight.mjs';import {CARD_SYSTEM,getCardModifiers,makeSkillCard} from '/skill-cards.mjs';
window.preview=async lens=>{window.e?.destroy();const run={skillSystem:CARD_SYSTEM,mountedCards:lens?[makeSkillCard('lantern-lens','proof-lens')]:[]};const e=window.e=new WispFlight({canvas:document.querySelector('canvas'),seed:'dusk-live-cost',duration:55,node:{mapIndex:0,row:0,difficulty:1},modifiers:getCardModifiers(run),reducedMotion:true,muted:true});await e.ready;const p=e.layout.embers.find(p=>p.kind==='dusk');e.distance=p.x-e.player.x-75;e.previousDistance=e.distance;e.player.y=e.previousPlayerY=p.bypassY;e.player.vy=0;e.time=9;e.render();return {radius:e.getLightState().baseRadius,dusk:{x:p.x,y:p.y,bypassY:p.bypassY},renderer:e.pixiView?.constructor.name};};window.proofReady=true;</script>`;
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__dusk-proof.html'){res.writeHead(200,{'Content-Type':'text/html'}).end(fixture);return;}if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio']);
async function shot(name){const file=path.join(output,name+'.png');await b.shot(file);report.screens.push(file);}
try{
  await b.send('Emulation.setDeviceMetricsOverride',{width:915,height:412,deviceScaleFactor:1,mobile:true});
  await b.visit(base+'/__dusk-proof.html');await until(()=>b.ev('window.proofReady'),'production fixture',120);
  report.flightBase=await b.ev('preview(false)');await delay(150);await shot('dusk-flight-base-915x412');
  report.flightLens=await b.ev('preview(true)');await delay(150);await shot('dusk-flight-lens-915x412');
  assert.equal(report.flightBase.radius,145);assert.equal(report.flightLens.radius,174);
  await b.visit(base+'/card-combos.html?combo=dusk-wick,dusk-wick-ii,dusk-wick-iii&row=1#combo-1');
  await until(()=>b.ev("!!document.querySelector('#combo-1 .card-art-dusk-wick')"),'three Dusk cards',120);
  await b.ev("document.querySelector('#combo-1').scrollIntoView({block:'start'})");await delay(150);await shot('dusk-wick-tiers-915x412');
  await b.ev("document.querySelector('#combo-1 [data-card-term=dusk]').click()");await delay(120);await shot('dusk-glossary-915x412');
  assert.match(await b.ev("document.querySelector('dialog[open]').textContent"),/3\s+Sparks/);
  report.errors=b.errors;report.badResponses=b.badResponses;assert.deepEqual(report.errors,[]);assert.deepEqual(report.badResponses,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{b.close();await new Promise(r=>server.close(r));}
