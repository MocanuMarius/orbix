// Actual landscape flight: verify moving Pulse light against the terrain fog.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';

const root=path.resolve('dist'),out=path.resolve('work/pulse-lighting-proof');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const bridge=`window.__pulseProof={get engine(){return engine},prepare(){pauseFlight();document.querySelector('#pause-layer').replaceChildren();document.querySelector('.flight-resume-gate')?.remove();const e=engine;e.running=true;e.player.y=e.previousPlayerY=e.height*.5;e.player.vy=0;const o=e.layout.obstacles.find(o=>!o.destroyed&&o.x>300);e.distance=e.previousDistance=Math.max(0,o.x-e.player.x-150);e.luminanceWaves.clear();e.render();return {width:e.width,height:e.height,distance:e.distance,playerX:e.player.x,obstacleX:o.x};}};`;
const server=http.createServer(async(req,res)=>{try{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep))throw Error('path');
  let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.concat([data,Buffer.from(bridge)]);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(e){res.writeHead(404).end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const b=await chrome(['--mute-audio']);
try{
  await b.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.clear();localStorage.setItem('emberwing-muted','true');"});
  await b.visit(`http://127.0.0.1:${server.address().port}/game.html?display=native&mock=boundary&cards=1&biome=pinewood&course=1`);
  await until(()=>b.ev('!!window.__pulseProof?.engine?.pixiView&&!!document.querySelector(".flight-entry[data-ready=true]")'),'flight',150);
  await b.ev('__pulseProof.engine.ready');
  const scene=await b.ev('__pulseProof.prepare()');
  await b.shot(path.join(out,'actual-baseline.png'));
  const result=await b.ev(`(async()=>{
    const e=__pulseProof.engine,M=await import('./luminance-waves.mjs?v=guide-clarity-1');
    const render=()=>{const at=performance.now();e.render();return performance.now()-at;};
    const samples=(fn)=>{const a=[];for(let i=0;i<180;i++)a.push(fn());a.sort((a,b)=>a-b);return {median:a[90],p95:a[171]};};
    const base=samples(render),fog=e.pixiView.fogContext,w=e.pixiView.fog.width,h=e.pixiView.fog.height;
    const baseline=window.__pulseBaseline=new Uint8ClampedArray(fog.getImageData(0,0,w,h).data);
    e.paused=false;const wave=e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:500,reveal:true,source:'proof'});e.luminanceWaves.update(.6);e.paused=true;e.render();
    const bright=fog.getImageData(0,0,w,h).data;let changed=0,maxRemoval=0;
    for(let i=3;i<bright.length;i+=4){const delta=baseline[i]-bright[i];if(delta>10)changed++;maxRemoval=Math.max(maxRemoval,delta);}
    const active=samples(render);
    const revealAtFront=M.luminanceWaveVisibility(e.luminanceWaves,wave.x+wave.radius,wave.y);
    return {renderer:e.pixiView.constructor.name,base,active,changed,maxRemoval,revealAtFront,wave:{radius:wave.radius,previous:wave.previous,maximum:wave.maximum},fog:[w,h]};
  })()`);
  await b.shot(path.join(out,'actual-pulse.png'));
  assert.equal(result.renderer,'WispFlightView');assert.equal(result.wave.radius,216);
  assert.ok(result.changed>100,'Pulse removes fog over a visible moving band');assert.ok(result.maxRemoval>100,'Pulse actually illuminates the scenery');
  assert.ok(result.revealAtFront>.6);
  result.stress=await b.ev(`(()=>{
    const e=__pulseProof.engine,run=count=>{e.luminanceWaves.clear();for(let i=0;i<count;i++){
      const wave=e.luminanceWaves.emit({x:e.distance+e.player.x+i*3,y:e.player.y,radius:500,reveal:true});wave.radius=130+i*5;wave.age=wave.radius/360;
    }const a=[];for(let i=0;i<120;i++){const at=performance.now();e.render();a.push(performance.now()-at);}a.sort((a,b)=>a-b);return {median:a[60],p95:a[114]};};
    const stress={eight:run(8),capacity:run(48)};e.luminanceWaves.clear();e.render();
    const fog=e.pixiView.fogContext,current=fog.getImageData(0,0,e.pixiView.fog.width,e.pixiView.fog.height).data;
    stress.restored=current.every((value,i)=>value===window.__pulseBaseline[i]);return stress;
  })()`);
  assert.equal(result.stress.restored,true,'removing Pulse restores the exact steady-light fog');
  await b.shot(path.join(out,'actual-restored.png'));
  assert.deepEqual(b.errors,[]);
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({scene,...result,errors:b.errors},null,2));
  console.log(JSON.stringify({scene,...result,errors:b.errors},null,2));
}catch(error){
  console.error(JSON.stringify({errors:b.errors,badResponses:b.badResponses,page:await b.ev('document.body.innerText.slice(0,1200)')},null,2));
  throw error;
}finally{b.close();await new Promise(r=>server.close(r));}
