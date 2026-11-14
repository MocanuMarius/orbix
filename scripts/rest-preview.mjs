// Local-only Rest inspector. Uses production UI/model with an isolated in-memory
// run; no fixture files enter dist and no production save can be read or written.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf'};
const fixture=`
// MOCK RUN: changes are memory-only and reset on refresh.
destroyFlight();state=newState();state.profile.difficulty=4;
for(const topic of ['lift','luminance','collector','artifacts','packed','skills','rest','companions','dream','routes','black-hole','bad-sparks','drafts','edging','hearts','events','progression','special-sparks'])markOnboardingSeen(state.profile,topic);
state.run=createRun(state.profile,'rest-inspector',1);
const mockRun=state.run;mockRun.phase='map-clear';advanceMap(mockRun);
mockRun.skills={'main-efficiency':1,'main-sight':1,'main-dream':1,'main-spare-spark':1};
mockRun.startingSkill='main-efficiency';mockRun.skillPaid={};mockRun.maxLives=4;mockRun.lives=2;
mockRun.flame=18;mockRun.condensedGlow=180;mockRun.unlockedCompanionDifficulty=4;
mockRun.artifacts=['glow-wick','path-prism','quiet-cinder'];mockRun.artifactCharges={'glow-wick':2};
mockRun.seenArtifacts=[...mockRun.artifacts];mockRun.guideSkipped=true;mockRun.stats.flights=6;
const mockRest=mockRun.map.flat().find(n=>n.kind==='camp');
if(!mockRest)throw Error('Mock map has no Rest');
let previousMock=mockRest;const mockPath=[];
for(let row=mockRest.row-1;row>=0;row--){const parent=mockRun.map[row].find(n=>n.nextIds.includes(previousMock.id));if(!parent)throw Error('Mock Rest has no approach');mockPath.unshift(parent.id);previousMock=parent;}
mockRun.step=mockRest.row;mockRun.path=mockPath;mockRun.phase='map';
if(!selectNode(mockRun,mockRest.id))throw Error('Cannot enter mock Rest');
const scenario=new URLSearchParams(location.search).get('scenario')||'arrival';
if(scenario==='full')mockRun.flame=getGlowCapacity(mockRun);
if(scenario==='capped'){mockRun.restGlowCapacity=9;mockRun.flame=getGlowCapacity(mockRun);mockRun.lives=4;}
if(['prepared','first-death','artifacts','forge','skills','companions','briefing','victory','pause','lighting','map','menu','death','last-heart','guide','splash','wake','proximity','interactions','result'].includes(scenario)){const pick=getSupportChoices(mockRun,state.profile).findIndex(c=>c.id==='rest-grow');resolveSupport(mockRun,pick,state.profile);settleCheckpoint(state);}
goToRun();
if(scenario==='tutorial-rest'){mockRun.isTutorial=true;mockRun.guideSkipped=false;mockRun.guideSeen={};render('support');guideScreen('support');}
else if(scenario==='tutorial-spark'){startLesson('world:light-packet',[{title:'Sparks refill your meter',visual:'spark',text:'Touch a Spark to refill the meter on the left.',target:'.rest-glow'}]);}
else if(scenario==='home')render('home');
else if(scenario==='settings'){render('home');showMenu();}
else if(scenario==='map')render('map');
else if(scenario==='artifacts')showArtifacts();
else if(scenario==='forge')requestArtifactSalvage('glow-wick');
else if(scenario==='skills')showSkills('main');
else if(scenario==='companions')showFleet();
else if(scenario==='menu')showMenu();
else if(['briefing','victory','pause','lighting','splash','wake','proximity','interactions'].includes(scenario)){
 const next=getChoices(mockRun)[0];const guardian=new URLSearchParams(location.search).get('guardian');if(guardian){next.boss=true;next.bossId=guardian;next.duration=90;}selectNode(mockRun,next.id);
 if(scenario==='victory'){
  beginFlightAttempt(mockRun);finishFlight(mockRun,{success:true,flame:60,collected:6,condensedGlow:Number(new URLSearchParams(location.search).get('overflow'))||0});settleCheckpoint(state);
  const q=new URLSearchParams(location.search),requested=q.get('artifact'),source=q.get('source')||'elite';
  const offers=[requested||'echo-bell',q.get('second')||'path-prism'].filter((id,index,list)=>ARTIFACTS[id]&&list.indexOf(id)===index);
  mockRun.artifacts=mockRun.artifacts.filter(id=>!offers.includes(id));
  mockRun.seenArtifacts=[...new Set([...mockRun.artifacts,...offers])];
  mockRun.flightReward=source==='ordinary'?null:{nodeId:next.id,source:source==='boss'?'guardian':'elite',offers,permanent:false,claimed:false};
  mockRun.lastFlight={...mockRun.lastFlight,boss:source==='boss',elite:source==='elite',completionBonus:source==='boss'?0:20};
  mockRun.victoryPending=true;
  if(q.get('final')==='1'){mockRun.mapIndex=2;mockRun.success=true;mockRun.bossDefeated=true;mockRun.phase='ended';mockRun.flightReward=null;mockRun.victoryPending=false;}
  mockRun.companions=[q.get('companion')||'collector'];mockRun.companionRole=mockRun.companions[0];
  goToRun();
 }
 else if(scenario==='pause'){await launch();showMenu();}
 else if(scenario==='splash'){launch();}
 else if(scenario==='wake'){await launch();}
 else if(['lighting','proximity','interactions'].includes(scenario)){delete mockRun.skills['main-sight'];if(new URLSearchParams(location.search).get('capacity')==='full'){Object.assign(mockRun.skills,{'main-light-step':1,'main-thrifty-rise':1,'main-low-lift':1,'main-reservoir':1,'main-vast-vessel':1});mockRun.restGlowCapacity=30;mockRun.flame=200;}await launch();document.querySelector('#pause-layer').innerHTML='';resumeArmed=false;engine.paused=true;if(guardian&&engine.layout.boss?.attacks?.length){engine.distance=engine.layout.boss.attacks[0].x-engine.player.x-100;engine.previousDistance=engine.distance;engine.renderDistance=engine.distance;}const previewProgress=Number(new URLSearchParams(location.search).get('progress'));if(previewProgress>0){engine.distance=engine.previousDistance=engine.renderDistance=engine.totalDistance*Math.min(.999,previewProgress);}if(new URLSearchParams(location.search).get('drift')){engine.mod.driftSense=3;engine.projection=null;}if(new URLSearchParams(location.search).get('orbit')){engine.layout.embers=[];setInterval(()=>{engine.time+=1/60;engine.wisp.update(engine,1/60);engine.render()},1000/60);}engine.render();if(new URLSearchParams(location.search).has('packing')){
  // Exercise the same natural pickup, overflow accounting and HUD callback as a flight.
  const demoFlight=engine;
  const collectFullMeterSpark=()=>{
    if(engine!==demoFlight)return;
    const spark=engine.layout.embers.find(packet=>!packet.collected&&!packet.carried&&!packet.generated&&['light','cluster','cache'].includes(packet.kind));
    if(!spark)return;
    engine.flame=engine.maxFlame;
    spark.x=engine.distance+engine.player.x;
    spark.y=engine.player.y;
    engine.collect(spark);
    engine.notify();
    engine.render();
  };
  const sample=new URLSearchParams(location.search).get('packingAt');
  if(sample===null){collectFullMeterSpark();setInterval(collectFullMeterSpark,2600);}
  else{
    const wallet=document.querySelector('.flight-condensed-counter b');
    const before=wallet?.textContent;
    collectFullMeterSpark();
    const animations=document.querySelector('.flight-device').getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().duration!==Infinity);
    for(const animation of animations){animation.pause();animation.currentTime=Math.max(0,Number(sample)||0);}
    document.documentElement.dataset.sampleWalletBefore=before;
  }
}
if(scenario==='lighting'&&new URLSearchParams(location.search).get('coach')){const kind=new URLSearchParams(location.search).get('coach');startLesson('preview:'+kind,[{visual:kind,title:kind==='meter'?'Energy powers Lift':'Luminance reveals the passage',text:kind==='meter'?'Collect Sparks to refill Energy. Each bright cell pays for one Lift.':'Luminance reveals nearby terrain. The darkness hides distant Sparks; Light skills extend your reach.'}]);}if(scenario==='proximity'){engine.player.y=engine.previousPlayerY=engine.renderPlayerY=engine.height-55;engine.paused=false;engine.edgingPulse.update(1/60,engine.layout.obstacles);engine.paused=true;engine.edgingPulse.charge=.72;engine.edgingPulse.nearEdge=true;if(new URLSearchParams(location.search).get('pulse')==='burst'){engine.edgingPulse.charge=0;engine.edgingPulse.remaining=4.6;engine.edgingPulse.burstOrigin={x:engine.distance+engine.player.x,y:engine.player.y};}engine.render();}if(scenario==='interactions'){const item=engine.biomeDynamics.items.find(item=>item.kind==='spore')||engine.biomeDynamics.items[0];if(item){item.x=engine.distance+engine.player.x+65;item.y=engine.player.y+45;item.kind='spore';item.family='lift';item.color='#d5b7df';engine.render();}}}
 else goToRun();
}

if(['death','last-heart'].includes(scenario)){
 const n=getChoices(mockRun)[0];selectNode(mockRun,n.id);mockRun.lives=scenario==='last-heart'?1:3;
 beginFlightAttempt(mockRun);finishFlight(mockRun,{success:false,flame:0});goToRun();
}
if(scenario==='guide')showFieldGuide();
if(scenario==='onboarding'){destroyFlight();state=newState();state.run=createRun(state.profile,'first-lights');goToRun();}
if(scenario==='first-death'){state.profile.onboarding={version:1,seen:[],stage:0};mockRun.deathPending=true;mockRun.lives=2;render('death');}
if(scenario==='result'){mockRun.phase='ended';mockRun.success=new URLSearchParams(location.search).get('outcome')==='win';mockRun.lives=mockRun.success?2:0;if(mockRun.success)mockRun.lastFlight={artifactDrop:{id:'sunheart-engine',duplicate:false}};render('result');}
if(['tutorial-route','tutorial-flight','tutorial-camp','tutorial-prep','tutorial-hazards'].includes(scenario)){
 closeSheet();hideLesson();destroyFlight();state=newState();startTutorial(state);const practice=state.run;
 if(['tutorial-camp','tutorial-prep'].includes(scenario)){
  selectNode(practice,getChoices(practice)[0].id);beginFlightAttempt(practice);finishFlight(practice,{success:true,flame:65,collected:4});
  if(practice.flightReward?.offers?.length)chooseFlightReward(state,practice.flightReward.offers[0]);acknowledgeVictory(state);selectNode(practice,getChoices(practice)[0].id);
  if(scenario==='tutorial-prep')resolveSupport(practice,0,state.profile);
 }
 if(scenario==='tutorial-hazards'){practice.step=6;practice.path=practice.map.slice(0,6).map(row=>row[0].id);practice.phase='map';}
 if(['tutorial-flight','tutorial-hazards'].includes(scenario)){selectNode(practice,getChoices(practice)[0].id);await launch();}
 else goToRun();
}

if(engine){const probe=document.createElement('output');probe.id='input-audit';probe.hidden=true;document.body.append(probe);const update=()=>{probe.textContent=JSON.stringify({flaps:engine?.flaps,time:engine?.time,paused:engine?.paused});};setInterval(update,50);update();}
`;
const wrapper=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wispbound · Rest inspector</title><style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#080f10;color:#e7e6cd;font:14px system-ui,sans-serif}body{padding:16px;display:flex;align-items:center;flex-direction:column;gap:12px}header{width:min(100%,900px)}h1{font-size:18px;margin:0 0 6px}p{color:#acb8a9;margin:5px 0;line-height:1.5;font-size:12px}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}button{border:1px solid #687963;background:#192b23;color:#f1eed1;padding:9px 12px;min-height:40px;font:inherit;cursor:pointer}button:hover{background:#2c4233}button[aria-pressed=true]{border-color:#dfd0a0;background:#344837}.stage{position:relative;overflow:hidden;border:1px solid #4b5c4c;flex:none}iframe{border:0;width:900px;height:405px;display:block;transform-origin:0 0;background:#0a1613}.note{width:min(100%,900px)}strong{color:#e4d5a5}
</style></head><body><header><h1>Rest inspector <small>· mock run</small></h1><p>Real game screens, no flight required. Changes stay in this preview. Start over with any button below.</p><nav><button data-scene="arrival" aria-pressed="true">Reset arrival</button><button data-scene="prepared" aria-pressed="false">Jump to preparation</button><button data-scene="full" aria-pressed="false">Reset with full Sparks</button></nav></header><main class="stage" aria-label="Pixel 10 landscape Rest preview"><iframe title="Interactive Rest mock, 900 by 405 landscape" src="/rest-scene.html?scenario=arrival" allow="autoplay; fullscreen"></iframe></main><p class="note"><strong>Mock arrival:</strong> 18 / 30 Sparks · 2 / 4 hearts · 180 Packed Sparks · 3 artifacts · Dream unlocked. <strong>Preparation</strong> starts after choosing Grow (+3 capacity and a full refill). You can buy skills, change companion, melt artifacts and rehearse; refresh resets everything.</p><script>
const stage=document.querySelector('.stage'),frame=document.querySelector('iframe');const fit=()=>{const scale=Math.min(1,Math.max(.1,(innerWidth-32)/900));stage.style.width=(900*scale+2)+'px';stage.style.height=(405*scale+2)+'px';frame.style.transform='scale('+scale+')';};new ResizeObserver(fit).observe(document.documentElement);fit();
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(!b)return;for(const item of document.querySelectorAll('[data-scene]'))item.setAttribute('aria-pressed',String(item===b));frame.src='/rest-scene.html?scenario='+b.dataset.scene+'&reset='+Date.now();});
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);let body,type;
  if(pathname==='/'){body=await fs.readFile(path.join(root,'index.html'),'utf8');type=mime['.html'];}
  else if(pathname==='/artifact-gallery.html'){body=`<!doctype html><html><head><meta charset="utf-8"><title>Artifact pixel art</title><style>body{background:#0b1718;color:#dce2c6;margin:20px;font:12px monospace}h1{font-size:19px}main{display:grid;grid-template-columns:repeat(7,1fr);gap:14px}figure{margin:0;text-align:center}svg{width:76px;height:76px;image-rendering:pixelated}figcaption{margin-top:5px}</style></head><body><h1>Wispbound · Artifact portraits</h1><main></main><script type="module">import {ARTIFACTS} from './model.mjs';import {artifactIcon} from './upgrade-icons.mjs';document.querySelector('main').innerHTML=Object.values(ARTIFACTS).map(a=>'<figure>'+artifactIcon(a.id)+'<figcaption>'+a.name+'</figcaption></figure>').join('');</script></body></html>`;type=mime['.html'];}
  else if(pathname==='/rest-inspector.html'){body=wrapper;type=mime['.html'];}
  else if(pathname==='/rest-scene.html'){body=(await fs.readFile(path.join(root,'game.html'),'utf8')).replace(/src="app\.mjs(?:\?[^"]*)?"/,'src="/rest-preview-app.mjs"');type=mime['.html'];}
  else if(pathname==='/rest-preview-app.mjs'){
   const source=await fs.readFile(path.join(root,'app.mjs'),'utf8');
   body=source.replace("const mockMode=new URLSearchParams(location.search).get('mock')==='rest';","const mockMode=true;")
    +fixture;type=mime['.mjs'];
  }else{const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep))throw Error('Outside preview');body=await fs.readFile(filename);type=mime[path.extname(filename)]||'application/octet-stream';}
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Preview resource unavailable');console.error(error.message);}
});
const port=Number(process.env.REST_PREVIEW_PORT)||4180;
server.listen(port,'127.0.0.1',()=>console.log('Game: http://localhost:'+port+' | Rest preview: http://localhost:'+port+'/?mock=rest'));

