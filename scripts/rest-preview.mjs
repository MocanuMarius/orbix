// Local-only Rest inspector. Uses production UI/model with an isolated in-memory
// run; no fixture files enter dist and no production save can be read or written.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const fixture=`
// MOCK RUN: changes are memory-only and reset on refresh.
destroyFlight();state=newState();state.profile.difficulty=4;
state.run=createRun(state.profile,'rest-inspector',1);
const mockRun=state.run;mockRun.phase='map-clear';advanceMap(mockRun);
mockRun.skills={'main-efficiency':1,'main-sight':1,'main-dream':1,'main-spare-spark':1};
mockRun.startingSkill='main-efficiency';mockRun.skillPaid={};mockRun.maxLives=4;mockRun.lives=2;
mockRun.flame=60;mockRun.condensedGlow=180;mockRun.unlockedCompanionDifficulty=4;
mockRun.artifacts=['glow-wick','hearth-bloom','quiet-cinder'];mockRun.artifactCharges={'glow-wick':5};
mockRun.seedEvolution={id:'hearth-bloom'};mockRun.guideSkipped=true;mockRun.stats.flights=6;
const mockRest=mockRun.map.flat().find(n=>n.kind==='camp');
if(!mockRest)throw Error('Mock map has no Rest');
let previousMock=mockRest;const mockPath=[];
for(let row=mockRest.row-1;row>=0;row--){const parent=mockRun.map[row].find(n=>n.nextIds.includes(previousMock.id));if(!parent)throw Error('Mock Rest has no approach');mockPath.unshift(parent.id);previousMock=parent;}
mockRun.step=mockRest.row;mockRun.path=mockPath;mockRun.phase='map';
if(!selectNode(mockRun,mockRest.id))throw Error('Cannot enter mock Rest');
const scenario=new URLSearchParams(location.search).get('scenario')||'arrival';
if(scenario==='full')mockRun.flame=100;
if(['prepared','artifacts','forge','skills','companions','briefing','victory','pause','lighting','map','menu'].includes(scenario)){const pick=getSupportChoices(mockRun,state.profile).findIndex(c=>c.id==='rest-condense');resolveSupport(mockRun,pick,state.profile);settleCheckpoint(state);}
goToRun();
if(scenario==='home')render('home');
else if(scenario==='settings'){render('home');showMenu();}
else if(scenario==='map')render('map');
else if(scenario==='artifacts')showArtifacts();
else if(scenario==='forge')requestArtifactSalvage('glow-wick');
else if(scenario==='skills')showSkills('main');
else if(scenario==='companions')showFleet();
else if(scenario==='menu')showMenu();
else if(['briefing','victory','pause','lighting'].includes(scenario)){
 const next=getChoices(mockRun)[0];selectNode(mockRun,next.id);
 if(scenario==='victory'){beginFlightAttempt(mockRun);finishFlight(mockRun,{success:true,flame:60,collected:6});settleCheckpoint(state);goToRun();}
 else if(scenario==='pause'){launch();showMenu();}
 else if(scenario==='lighting'){delete mockRun.skills['main-sight'];launch();engine.paused=true;engine.render();}
 else goToRun();
}
`;
const wrapper=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wispbound · Rest inspector</title><style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#080f10;color:#e7e6cd;font:14px system-ui,sans-serif}body{padding:16px;display:flex;align-items:center;flex-direction:column;gap:12px}header{width:min(100%,900px)}h1{font-size:18px;margin:0 0 6px}p{color:#acb8a9;margin:5px 0;line-height:1.5;font-size:12px}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}button{border:1px solid #687963;background:#192b23;color:#f1eed1;padding:9px 12px;min-height:40px;font:inherit;cursor:pointer}button:hover{background:#2c4233}button[aria-pressed=true]{border-color:#dfd0a0;background:#344837}.stage{position:relative;overflow:hidden;border:1px solid #4b5c4c;flex:none}iframe{border:0;width:900px;height:405px;display:block;transform-origin:0 0;background:#0a1613}.note{width:min(100%,900px)}strong{color:#e4d5a5}
</style></head><body><header><h1>Rest inspector <small>· mock run</small></h1><p>Real game screens, no flight required. Changes stay in this preview. Start over with any button below.</p><nav><button data-scene="arrival" aria-pressed="true">Reset arrival</button><button data-scene="prepared" aria-pressed="false">Jump to preparation</button><button data-scene="full" aria-pressed="false">Reset with full Glow</button></nav></header><main class="stage" aria-label="Pixel 10 landscape Rest preview"><iframe title="Interactive Rest mock, 900 by 405 landscape" src="/rest-scene.html?scenario=arrival" allow="autoplay; fullscreen"></iframe></main><p class="note"><strong>Mock arrival:</strong> 18 / 30 Glow · 2 / 4 hearts · 180 Packed Light · 3 artifacts · Dream unlocked. <strong>Preparation</strong> starts after choosing Condense. You can buy, swap, forge and rehearse; refresh resets everything.</p><script>
const stage=document.querySelector('.stage'),frame=document.querySelector('iframe');const fit=()=>{const scale=Math.min(1,Math.max(.1,(innerWidth-32)/900));stage.style.width=(900*scale+2)+'px';stage.style.height=(405*scale+2)+'px';frame.style.transform='scale('+scale+')';};new ResizeObserver(fit).observe(document.documentElement);fit();
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(!b)return;for(const item of document.querySelectorAll('[data-scene]'))item.setAttribute('aria-pressed',String(item===b));frame.src='/rest-scene.html?scenario='+b.dataset.scene+'&reset='+Date.now();});
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);let body,type;
  if(pathname==='/'){body=wrapper;type=mime['.html'];}
  else if(pathname==='/rest-scene.html'){body=(await fs.readFile(path.join(root,'index.html'),'utf8')).replace(/src="app\.mjs(?:\?[^"]*)?"/,'src="/rest-preview-app.mjs"');type=mime['.html'];}
  else if(pathname==='/rest-preview-app.mjs'){
   const source=await fs.readFile(path.join(root,'app.mjs'),'utf8');
   if(!source.includes("let state;try{state=loadState(localStorage)}catch{state=newState()}")||!source.includes("function persist(){try{saveState(state,localStorage)}catch{}}"))throw Error('Rest preview save-isolation hook needs updating');
   body=source
    .replace("let state;try{state=loadState(localStorage)}catch{state=newState()}","let state=newState();")
    .replace("function persist(){try{saveState(state,localStorage)}catch{}}","function persist(){}")
    +fixture;type=mime['.mjs'];
  }else{const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep))throw Error('Outside preview');body=await fs.readFile(filename);type=mime[path.extname(filename)]||'application/octet-stream';}
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Preview resource unavailable');console.error(error.message);}
});
const port=Number(process.env.REST_PREVIEW_PORT)||4180;
server.listen(port,'127.0.0.1',()=>console.log('Rest inspector: http://localhost:'+port));

