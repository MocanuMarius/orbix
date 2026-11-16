// Production App entrypoint proof. Only an observation/staging bridge is appended
// to app.mjs; every Collector simulation and drawing module is served byte-for-byte.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';
const root=path.resolve('dist'),out=path.resolve('outputs/collector-production-proof');
const bridge=`
window.__motionCapture={href:location.href,get engine(){return engine},
 bootstrap(){state.settings.skipTutorial=true;pendingStart={run:createRun(state.profile,'collector-production-proof',1,{cards:true}),previewKey:'proof'};
  setCompanions(pendingStart.run,['collector']);const offer=getStartingGiftOffers(pendingStart.run)[0],p=getStartingGiftPreview(pendingStart.run,offer.id);
  takeStartingGift(offer.id,false,p?.token);const node=getChoices(state.run).find(n=>n.type!=='support');if(!commitNode(node.id))throw Error('Normal route selection failed');goToRun();return {mockMode,cardPilot,route:node.name};
 },
 async prepare(){
  const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();await document.fonts.ready;await e.environmentArtReady;

  this.packet={id:'motion-study-missed-spark',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y+20,phase:0};
  e.layout.embers.push(this.packet);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;
  this.events=[];this.inputs=[];this.lastLift=-10;this.original={x:this.packet.x-e.distance,y:this.packet.y};
  const attach=e.onCollectorAttach.bind(e);e.onCollectorAttach=(p,w)=>{if(p===this.packet)this.events.push({event:'attach',time:e.time,gap:w.reelGap,recovery:w.cooldownMax});return attach(p,w)};
  const collect=e.collect.bind(e);e.collect=(p,d)=>{if(!p.collected&&p===this.packet)this.events.push({event:'collect',time:e.time,via:d?'collector':'body',source:d?{x:d.worldX-e.distance,y:d.y,scale:d.scale}:null,body:{x:e.player.x,y:e.player.y}});return collect(p,d)};
  e.accumulator=1/60;e.render();e.notify();return {width:e.width,height:e.height,playerX:e.player.x,playerY:e.player.y,scale:e.pixiView.scale};
 },
 frame(advance=true){const e=engine;
  for(let i=0;i<(advance?1:0);i++){
   const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
   const target=near?e.obstacleCenter(near):e.height*.52;
   if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){
    const w=e.wisp,before={y:w.cargoY,vy:w.reelVY};e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;
    this.inputs.push({time:e.time,whileTowing:!!w.cargo,y:e.player.y,vy:e.player.vy,loadY:w.cargoY,loadVY:w.reelVY});
    if(w.cargo&&(before.y!==w.cargoY||before.vy!==w.reelVY))throw Error('Lift changed cargo momentum');
   }
   e.step(1/60);
  }
  e.accumulator=1/60;e.render();e.notify();const w=e.getWispState();
  return {time:e.time,y:e.player.y,vy:e.player.vy,playerX:e.player.x,distance:e.distance,dying:e.dying,carrying:!!e.wisp.cargo,cargoX:e.wisp.cargoX,cargoY:e.wisp.cargoY,cargoVY:e.wisp.reelVY,gap:e.wisp.reelGap,stage:e.wisp.towStage,slingElapsed:e.wisp.sling?.elapsed,slingDuration:e.wisp.sling?.duration,cargoSpriteScale:w.cargoPose?.scale,spriteScaleFactor:w.cargoPose?.studyScaleFactor,orbit:w.motionStudy?.orbit,collector:{x:w.x,y:w.y,depth:w.depth},collected:!!this.packet.collected};
 }
};`;

const files=['wisp.mjs','collector-vortex.mjs','capture-art.mjs'],hashes={};
for(const f of files)hashes[f]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))throw Error('Outside dist');
 let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(e){res.writeHead(404).end(String(e));}});
await fs.mkdir(path.join(out,'frames'),{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio','--disable-background-timer-throttling']);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:2,mobile:true});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
 const url=base+'/game.html';await b.visit(url);
 await until(()=>b.ev('!!window.__motionCapture'),'normal App ready',200);
 const route=await b.ev('__motionCapture.bootstrap()');assert.equal(route.mockMode,false);
 await until(()=>b.ev('window.__motionCapture.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),'normal flight ready',300);
 const report={url,route,viewport:[900,405],dpr:2,fps:60,productionModules:hashes,note:'Normal game.html, Cards mode, real seeded expedition and normal route/flight entry. One missed Small Spark staged; native production Collector instances, recovery and renderers. No prototype imports or overrides.',initial:await b.ev('__motionCapture.prepare()'),states:[]};
 let frame=0;const stages=new Set();
 for(let i=0;i<360;i++){
  const s=await b.ev('__motionCapture.frame('+Boolean(i)+')');report.states.push(s);
  if(s.carrying&&!stages.has(s.stage)){stages.add(s.stage);await b.shot(path.join(out,s.stage+'.png'));}
  if(s.slingElapsed!==undefined||s.collected&&frame){await b.shot(path.join(out,'frames',String(frame++).padStart(4,'0')+'.png'));}
  if(s.collected&&frame>=85)break;
 }
 report.events=await b.ev('__motionCapture.events');report.inputs=await b.ev('__motionCapture.inputs');report.errors=[...b.errors];report.frameCount=frame;
 await b.shot(path.join(out,'delivered.png'));
 const attach=report.events.find(e=>e.event==='attach'),delivery=report.events.find(e=>e.event==='collect');
 assert.equal(report.events.filter(e=>e.event==='collect'&&e.via==='collector').length,1);
 assert.ok(Math.abs(attach.recovery-10/3)<1e-8);assert.ok(Math.abs(delivery.time-attach.time-10/3)<.04);
 const orbit=report.states.filter(s=>s.carrying&&s.stage==='spiral');report.orbitSamples=orbit.length;
 assert.ok(orbit.length>=29&&orbit.length<=31);assert.ok(report.states.some(s=>s.cargoSpriteScale<.221));
 assert.ok(Math.abs(delivery.source.scale-.22)<1e-8);assert.deepEqual(report.errors,[]);
 assert.ok(report.states.every(s=>!s.dying));
 for(const f of files)assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex'),hashes[f]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({out,route,events:report.events,orbitSamples:orbit.length,frameCount:frame,lifts:report.inputs.filter(x=>x.whileTowing).length,errors:report.errors}));
}finally{b.close();server.close();}
