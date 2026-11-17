// Pixel-identity probe for render-loop changes. Hashes the real pixel
// renderer's frame buffer (WispFlightView.buffer) at fixed seeds and moments.
//   node scripts/perf/pixel-probe.mjs --mode=hash  --out=<file.json>   [--set=core|scroll|resize|all]
//   node scripts/perf/pixel-probe.mjs --mode=diff  --before=<dir>      [--set=...] [--shots=<dir>]
//   node scripts/perf/pixel-probe.mjs --mode=hash --set=scrolldiff --twin=<dir> --out=<file>  (old vs new in one page)
// --before=<dir> serves the files in <dir> (same names as dist/) instead of
// dist/ copies, so "before" and "after" frames can be compared pixel by pixel.
// Moments: start, mid, pulse (luminance wave emitted 0.25 s earlier), flash
// (cards flight: a Flash pickup collected), each fully lit and in flight light.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {launch,delay,until} from './lib.mjs';

const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const root=path.resolve(A.root||'dist'),mode=A.mode||'hash',set=A.set||'core';

const PAGE=`<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}#host{position:fixed;left:0;top:0;width:915px;height:412px}#host canvas{display:block;width:100%;height:100%}</style><div id=host></div><script type=module src="__probe.mjs"></script>`;
const PROBE=`
import {WispFlight} from './flight.mjs?v=guide-clarity-1';
import {BIOME_LEVELS} from './biomes.mjs?v=guide-clarity-1';
import {getRunModifiers,CARD_SYSTEM} from './model.mjs?v=guide-clarity-1';
import {makeSkillCard} from './skill-cards.mjs?v=guide-clarity-1';
const host=document.querySelector('#host');
let current=null;
function fnv(data){let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data[i],16777619);return (h>>>0).toString(16).padStart(8,'0');}
async function make({biome,course=0,cards=null,seed=17}){log('make '+biome);
 if(current){current.e.destroy();host.innerHTML='';current=null;}
 const level=BIOME_LEVELS.filter(l=>l.biomeId===biome)[course];
 const canvas=document.createElement('canvas');host.append(canvas);
 const run={companions:['collector'],skills:{}};
 if(cards){run.skillSystem=CARD_SYSTEM;run.cardSlots=5;run.mountedCards=cards.map((id,i)=>makeSkillCard(id,'probe:'+i));}
 const e=new WispFlight({canvas,terrain:level.terrain,seed,duration:90,preview:true,
  node:{...level,levelId:level.id,type:'flight',boss:false,row:2,mapIndex:0,difficulty:1},
  companions:['collector'],flame:100,cards:[],modifiers:getRunModifiers(run)});
 e.setMuted(true);
 const normal=e.getLightState.bind(e);let lit=true;
 e.getLightState=()=>lit?{...normal(),radius:5000,pickupReveal:1}:normal();
 e.start({paused:true});
 log('ctor done');await e.ready;log('ready '+!!e.pixiReady);
 current={e,level,setLit(v){lit=v;}};return current;
}
function place(e,distance,time){e.distance=e.previousDistance=distance;e.accumulator=0;e.time=time;e.visualTime=time;}
function shot(lit){current.setLit(lit);current.e.render();const b=current.e.pixiView.buffer;return {w:b.width,h:b.height,data:b.getContext('2d').getImageData(0,0,b.width,b.height).data};}
const frames=new Map();window.__log=[];const log=m=>window.__log.push(m);
function record(key,lit,keep){const s=shot(lit);const h=fnv(s.data);if(keep)frames.set(key,s);return [key,h+':'+s.w+'x'+s.h];}
window.__probe={
 async core(keep=false){
  const out=[];
  const cases=[{biome:'marsh'},{biome:'coral'},{biome:'moonruins'},{biome:'basalt'},{biome:'cloud'},{biome:'frost'},{biome:'desert'},{biome:'pinewood',course:1,cards:['echo-iii','refrain','spillway-ii','prism-lens-ii','first-ripple'],tag:'cards'}];
  for(const c of cases){
   const {e}=await make(c),name=(c.tag||c.biome);
   for(const lit of [true,false]){
    const L=lit?'lit':'dark';
    place(e,0,0.5);out.push(record(name+'-start-'+L,lit,keep));
    place(e,e.totalDistance*.5,3.25);out.push(record(name+'-mid-'+L,lit,keep));
   }
   // Pulse: emitted at t=4, drawn at t=4.25.
   place(e,e.totalDistance*.3,4);e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:260,source:'probe',sourceKind:'ability'});
   for(const lit of [true,false]){place(e,e.totalDistance*.3,4.25);out.push(record(name+'-pulse-'+(lit?'lit':'dark'),lit,keep));}
   if(c.cards){
    const sight=e.layout.embers.find(p=>p.kind==='sight'&&!p.collected);
    if(sight){place(e,Math.max(0,sight.x-e.player.x-30),6);e.collect(sight,null);for(const lit of [true,false]){place(e,Math.max(0,sight.x-e.player.x-30),6.4);out.push(record(name+'-flash-'+(lit?'lit':'dark'),lit,keep));}}
    else out.push([name+'-flash','no-sight-pickup']);
   }
  }
  return out;
 },
 async scroll({biomes=['marsh','coral','moonruins','desert','frost','cloud'],to=52000,step=23}={},keep=false){
  const out=[];
  for(const biome of biomes){const {e}=await make({biome});
   for(let d=0;d<=to;d+=step){place(e,d,2);out.push(record(biome+'-scroll-'+d,true,keep));}}
  return out;
 },
 // Flight light (dark) along a stretch: light masks are built, evicted and reused.
 async sweep(keep=false){
  const out=[];
  for(const biome of ['marsh','basalt','coral']){const {e}=await make({biome});
   for(let i=0;i<160;i++){const d=e.totalDistance*.1+i*7;place(e,d,2+i/30);e.player.y=e.height*(.35+.3*Math.sin(i/9));out.push(record(biome+'-sweep-'+i,false,keep));}}
  return out;
 },
 // Old (/__before/) and new renderer side by side in one page, compared per
 // pixel along a long scroll with a window resize half way. Returns summaries.
 async scrolldiff({biomes=['marsh','coral','moonruins','desert','frost','cloud','basalt','pinewood','fungal','crystal','thorn','cemetery'],to=52000,step=23,dark=false}={}){
  if(current){current.e.destroy();host.innerHTML='';current=null;}
  const {WispFlight:Old}=await import('./__before/flight.mjs?v=guide-clarity-1');
  const host2=document.createElement('div');host2.style.cssText='position:fixed;left:0;top:420px;width:915px;height:412px';document.body.append(host2);
  const build=async(Cls,el,biome)=>{const level=BIOME_LEVELS.filter(l=>l.biomeId===biome)[0];const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:100%';el.append(canvas);
   const e=new Cls({canvas,terrain:level.terrain,seed:17,duration:90,preview:true,node:{...level,levelId:level.id,type:'flight',boss:false,row:2,mapIndex:0,difficulty:1},companions:['collector'],flame:100,cards:[],modifiers:getRunModifiers({companions:['collector'],skills:{}})});
   e.setMuted(true);const normal=e.getLightState.bind(e);e.getLightState=()=>dark?normal():{...normal(),radius:5000,pickupReveal:1};e.start({paused:true});await e.ready;return e;};
  const summary={};
  for(const biome of biomes){
   const a=await build(WispFlight,host,biome),b=await build(Old,host2,biome);
   const s={frames:0,differing:0,maxDelta:0,maxPixels:0,positional:0,worst:null,rebakes:[0,0],fallbacks:0};
   const strips=()=>(a.pixiView.backgroundStripCache||[]).map(x=>x?.first);
   let last=strips();
   for(let d=0;d<=to;d+=step){
    if(d>=to/2&&d-step<to/2){for(const el of [host,host2]){el.style.width='740px';el.style.height='333px';}for(const e of [a,b]){e.resize();e.pixiView.resize();}last=[];}
    for(const e of [a,b]){place(e,d,2);e.render();}
    const now=strips();for(let l=0;l<2;l++)if(now[l]!==undefined&&now[l]!==last[l])s.rebakes[l]++;last=now;
    if(!a.pixiView.backgroundStripCache)s.fallbacks++;
    const ba=a.pixiView.buffer,bb=b.pixiView.buffer;
    const pa=ba.getContext('2d').getImageData(0,0,ba.width,ba.height).data,pb=bb.getContext('2d').getImageData(0,0,bb.width,bb.height).data;
    let n=0,max=0,big=0;for(let i=0;i<pa.length;i+=4){const m=Math.max(Math.abs(pa[i]-pb[i]),Math.abs(pa[i+1]-pb[i+1]),Math.abs(pa[i+2]-pb[i+2]));if(m){n++;if(m>max)max=m;if(m>2)big++;}}
    s.frames++;if(n){s.differing++;if(n>s.maxPixels){s.maxPixels=n;s.worst={d,n,max}}}if(max>s.maxDelta)s.maxDelta=max;if(big)s.positional++;
   }
   summary[biome]=s;a.destroy();b.destroy();host.innerHTML='';host2.innerHTML='';host.style.width='915px';host.style.height='412px';host2.style.width='915px';host2.style.height='412px';
  }
  host2.remove();return [['scrolldiff',summary]];
 },
 // Engine canvas backing size: pixel renderer ready, renderer lost, back again, unsized host.
 async canvas(){
  const out=[],{e}=await make({biome:'marsh'}),size=()=>e.canvas.width+'x'+e.canvas.height;
  out.push(['canvas-ready',size()]);
  e.pixiReady=false;e.render();out.push(['canvas-fallback',size()]);
  const fb=e.canvas.getContext('2d').getImageData(Math.floor(e.canvas.width/2),Math.floor(e.canvas.height/2),1,1).data;out.push(['canvas-fallback-drawn',String(fb[0]+fb[1]+fb[2]>0)]);
  host.style.width='740px';host.style.height='333px';e.resize();out.push(['canvas-fallback-resized',size()]);
  e.pixiReady=true;e.sizeEngineCanvas?.();e.render();out.push(['canvas-restored',size()]);
  host.style.width='915px';host.style.height='412px';e.resize();out.push(['canvas-restored-resized',size()]);
  // A host that lets the bitmap decide the element size keeps the full bitmap.
  e.destroy();host.innerHTML='';current=null;
  const canvas=document.createElement('canvas');const loose=document.createElement('div');loose.style.cssText='position:fixed;left:0;top:500px';loose.append(canvas);document.body.append(loose);
  const level=BIOME_LEVELS.filter(l=>l.biomeId==='marsh')[0];
  const f=new WispFlight({canvas,terrain:level.terrain,seed:17,duration:90,preview:true,node:{...level,levelId:level.id,type:'flight',row:2,mapIndex:0,difficulty:1},companions:['collector'],flame:100});
  const r0=canvas.getBoundingClientRect();await f.ready;const r1=canvas.getBoundingClientRect();
  out.push(['canvas-unsized',canvas.width+'x'+canvas.height+' css '+Math.round(r0.width)+'x'+Math.round(r0.height)+' -> '+Math.round(r1.width)+'x'+Math.round(r1.height)]);
  f.destroy();loose.remove();
  return out;
 },
 async resize(keep=false){
  const out=[];
  for(const biome of ['marsh','coral','moonruins']){const {e}=await make({biome});
   const sizes=[[915,412],[740,333],[1200,540],[915,412]];
   for(const [w,h] of sizes){host.style.width=w+'px';host.style.height=h+'px';e.resize();e.pixiView.resize();
    for(const at of [.2,.55]){place(e,e.totalDistance*at,2.5);out.push(record(biome+'-resize-'+w+'x'+h+'-'+at,true,keep));place(e,e.totalDistance*at,2.5);out.push(record(biome+'-resize-'+w+'x'+h+'-'+at+'-dark',false,keep));}}
   host.style.width='915px';host.style.height='412px';e.resize();e.pixiView.resize();}
  return out;
 },
 frame(key){const s=frames.get(key);if(!s)return null;let bin='';for(let i=0;i<s.data.length;i+=8192)bin+=String.fromCharCode.apply(null,s.data.subarray(i,i+8192));return {w:s.w,h:s.h,b64:btoa(bin)};},
 clear(){frames.clear();}
};
window.__ballast=n=>{const keep=window.__kept||=[];const sink=document.createElement('canvas');sink.width=sink.height=256;const sc=sink.getContext('2d');for(let i=0;i<n;i++){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.putImageData(x.createImageData(128,128),0,0);sc.drawImage(c,0,0);keep.push(c);}keep.push(sink);return keep.length};
window.__probeReady=true;
`;
const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
async function serve(overrideDir){
 const server=http.createServer(async(req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://x').pathname.slice(1))||'__probe.html';
  if(name==='__probe.html')return res.writeHead(200,{'Content-Type':'text/html'}).end(PAGE);
  if(name==='__probe.mjs')return res.writeHead(200,{'Content-Type':'text/javascript'}).end(PROBE);
  // /__before/<path>: the --before override (else dist) under a second module
  // graph, so one page can render old and new code side by side.
  const twin=name.startsWith('__before/'),rel=twin?name.slice(9):name,dir=twin?(A.twin?path.resolve(A.twin):null):overrideDir;
  let file=path.resolve(root,rel);if(!file.startsWith(root))throw Error('outside');
  if(dir){const alt=path.join(dir,rel);try{await fs.access(alt);file=alt}catch{}}
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch(e){res.writeHead(404).end(String(e))}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:'http://127.0.0.1:'+server.address().port,close:()=>server.close()};
}
async function openPage(overrideDir){
 const srv=await serve(overrideDir),b=await launch();
 await b.send('Emulation.setDeviceMetricsOverride',{width:1300,height:700,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:srv.base+'/__probe.html'});
 await until(()=>b.ev('!!window.__probeReady'),'probe page',60000);if(A.ballast)console.log('ballast',await b.ev('__ballast('+Number(A.ballast)+')'));
 return {b,srv,close:async()=>{await b.close();srv.close();}};
}
const sets=set==='all'?['core','sweep','scroll','resize']:set.split(',');
async function collect(p,keep){const timer=A.verbose?setInterval(async()=>{try{console.log(await p.b.ev('window.__log.splice(0).join(" | ")',5000))}catch(e){console.log('poll',e.message)}},5000):null;try{return await collectInner(p,keep)}finally{clearInterval(timer)}}
async function collectInner(p,keep){const all=[];for(const s of sets){const call=s==="scroll"||s==="scrolldiff"?`__probe.${s}(${A.scrollOpts||"{}"},${keep})`:`__probe.${s}(${keep})`;all.push(...await p.b.ev(call,1800000));}return all;}

if(mode==='hash'){
 const p=await openPage(A.before?path.resolve(A.before):null);
 try{const rows=await collect(p,false);const out=Object.fromEntries(rows);
  if(A.out){await fs.mkdir(path.dirname(path.resolve(A.out)),{recursive:true});await fs.writeFile(A.out,JSON.stringify(out,null,1));}
  console.log(`${rows.length} frames${A.out?' -> '+A.out:''}`);if(p.b.errors.length)console.log('page errors',p.b.errors.slice(0,5));
  if(A.compare){const ref=JSON.parse(await fs.readFile(A.compare,'utf8'));let same=0,diff=[];for(const [k,v] of rows){if(ref[k]===v)same++;else diff.push(k)}
   console.log(`compare with ${A.compare}: ${same} identical, ${diff.length} different`);if(diff.length)console.log(diff.slice(0,40).join('\n'));}
 }finally{await p.close();}
}else if(mode==='diff'){
 // Pixel diff of every differing frame between --before overrides and dist/.
 const before=await openPage(path.resolve(A.before)),after=await openPage(null);
 const shots=A.shots?path.resolve(A.shots):null;if(shots)await fs.mkdir(shots,{recursive:true});
 try{
  const rb=Object.fromEntries(await collect(before,true)),ra=await collect(after,true);
  const report=[];let worst=0;
  for(const [k,v] of ra){if(rb[k]===v)continue;
   const fb=await before.b.ev(`__probe.frame(${JSON.stringify(k)})`),fa=await after.b.ev(`__probe.frame(${JSON.stringify(k)})`);
   if(!fb||!fa||fb.w!==fa.w||fb.h!==fa.h){report.push({k,size:[fb?.w,fb?.h,fa?.w,fa?.h]});continue;}
   const pb=Buffer.from(fb.b64,'base64'),pa=Buffer.from(fa.b64,'base64');let n=0,max=0,minX=1e9,minY=1e9,maxX=-1,maxY=-1;const hist={};
   for(let i=0;i<pa.length;i+=4){let m=0;for(let c=0;c<3;c++)m=Math.max(m,Math.abs(pa[i+c]-pb[i+c]));if(m){n++;max=Math.max(max,m);hist[m]=(hist[m]||0)+1;const x=(i/4)%fa.w,y=Math.floor(i/4/fa.w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
   worst=Math.max(worst,max);report.push({k,pixels:n,of:fa.w*fa.h,maxChannelDelta:max,hist,box:n?[minX,minY,maxX,maxY]:null});
   if(shots&&report.filter(r=>r.pixels).length<=12)await fs.writeFile(path.join(shots,k+'.png'),sideBySide(fb.w,fb.h,pb,pa));
  }
  console.log(JSON.stringify({frames:ra.length,differing:report.length,worstChannelDelta:worst,report:report.slice(0,60)},null,1));
 }finally{await before.close();await after.close();}
}

// Before | after | amplified difference (x16), scaled 2x, as PNG.
function sideBySide(w,h,a,b){
 const S=2,W=w*3*S+8,H=h*S,rows=[];
 for(let y=0;y<H;y++){const row=Buffer.alloc(1+W*3);for(let x=0;x<W;x++){const panel=Math.floor(x/(w*S+4)),px=Math.floor((x-panel*(w*S+4))/S),py=Math.floor(y/S);let r=40,g=0,bb=40;
  if(px>=0&&px<w){const i=(py*w+px)*4;if(panel===0){r=a[i];g=a[i+1];bb=a[i+2]}else if(panel===1){r=b[i];g=b[i+1];bb=b[i+2]}else{const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));r=Math.min(255,d*16);g=d?0:b[i+1]>>2;bb=d?0:b[i+2]>>2}}
  row[1+x*3]=r;row[2+x*3]=g;row[3+x*3]=bb;}rows.push(row);}
 const raw=Buffer.concat(rows),crc=(buf)=>{let c,crcTable=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}let x=0xffffffff;for(const v of buf)x=crcTable[(x^v)&255]^(x>>>8);return (x^0xffffffff)>>>0};
 const chunk=(t,d)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c])};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
process.exit(0);
