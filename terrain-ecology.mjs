import {drawAuthoredBackdrop,drawAuthoredPlant} from './authored-environment.mjs?v=tally-1';
import {terrainBoundary,terrainSurfaceExposed} from './terrain-boundary.mjs?v=tally-1';
import {spacetimeSurfaceOffsetAt} from './spacetime.mjs?v=tally-1';
// Decorative life is anchored to the actual landform. It never enters the
// collider, pickup, reward or dynamic-hazard registries.
const habitats = {
  moonruins: {plant:'fern',leaf:'#718974',shade:'#3b5850',flower:'#b5c2ac',water:true,animal:'moth'},
  frost: {plant:'lichen',leaf:'#728e92',shade:'#405c67',flower:'#b2c3c8',water:true,animal:'snow'},
  pinewood: {plant:'fern',leaf:'#6a8b61',shade:'#354e40',flower:'#b5bb89',animal:'firefly'},
  marsh: {plant:'reed',leaf:'#85915c',shade:'#405d50',flower:'#8a6d4e',water:true,animal:'firefly'},
  fungal: {plant:'mushroom',leaf:'#927a9d',shade:'#554965',flower:'#b3c5bc',animal:'moth'},
  basalt: {plant:'lichen',leaf:'#8c7c74',shade:'#514848',flower:'#b0967b',animal:'ash'},
  desert: {plant:'drygrass',leaf:'#aa9769',shade:'#6b6450',flower:'#c7b394',animal:'beetle'},
  coral: {plant:'fan',leaf:'#a5828f',shade:'#65586d',flower:'#b6bdba',water:true,animal:'fish'},
  crystal: {plant:'lichen',leaf:'#9189ab',shade:'#575673',flower:'#bdc1d5',animal:'moth'},
  cloud: {plant:'grass',leaf:'#9aab9d',shade:'#657f80',flower:'#d1d2b8',water:true,animal:'moth'},
  thorn: {plant:'fern',leaf:'#819165',shade:'#465842',flower:'#bc9e99',animal:'beetle'},
  cemetery: {plant:'grass',leaf:'#80958a',shade:'#495e58',flower:'#c0c9b9',water:true,animal:'moth'},
};
const habitatId=e=>e.levelIdentity?.biomeId||({ruins:'moonruins',canopy:'pinewood',storm:'frost'}[e.terrain]);
export const ECOLOGY_BIOMES = Object.freeze(Object.keys(habitats));
export function drawHabitatBackdrop(c,e,{scale=1,distance=e.renderDistance??e.distance,time=e.visualTime??e.time}={}){
  if(drawAuthoredBackdrop(c,e,{scale,distance}))return;
  const habitat=habitats[habitatId(e)];if(!habitat)return;
  const biome=habitatId(e),offset=distance*.26,span=290;
  c.save();c.scale(scale,scale);c.globalAlpha=.48;
  for(let i=Math.floor(offset/span)-1;i<Math.ceil((offset+e.width)/span)+1;i++){
    const seed=i*43+(e.levelIdentity?.variant||0)*177,x=i*span-offset;
    const ground=e.height*(.78+noise(seed+16)*.12);
    if(habitat.water){
      c.fillStyle='#263e46';c.fillRect(Math.round(x-12),Math.round(ground),265,e.height-ground);
      for(let band=0;band<8;band++){
        const drift=e.reducedMotion?0:Math.sin(time*.45+band+seed)*3;
        c.fillStyle=band%2?'#3d585d':'#354b52';
        c.fillRect(Math.round(x+noise(seed+band)*65+drift),Math.round(ground+band*7),100+noise(seed+band+6)*100,1);
      }
    }
    for(let j=0;j<3;j++){
      const root=x+j*77+noise(seed+j)*18,high=28+noise(seed+j+18)*55;
      if(['pinewood','thorn','cemetery','marsh','moonruins'].includes(biome)){
        stroke(c,[[root,ground],[root+2,ground-high*.6],[root-4,ground-high]],habitat.shade,3);
        for(let branch=0;branch<4;branch++){
          const y=ground-high*.3-branch*high*.17,side=branch%2?-1:1;
          stroke(c,[[root,y+8],[root+side*(12+branch*2),y-5],[root+side*22,y-9]],habitat.shade,2);
          if(biome==='pinewood')for(let leaf=0;leaf<5;leaf++)
            stroke(c,[[root-18+leaf*7,y+7],[root+leaf-2,y-9],[root+20-leaf*5,y+4]],habitat.leaf);
        }
        if(['marsh','thorn','moonruins'].includes(biome)){
          c.fillStyle=habitat.shade;
          for(let crown=0;crown<4;crown++){
            const cx=root+(crown-1.5)*13,cy=ground-high+(crown%2)*11;
            c.beginPath();c.moveTo(cx-17,cy+12);c.lineTo(cx-19,cy+2);
            c.lineTo(cx-10,cy-6);c.lineTo(cx-3,cy-9);c.lineTo(cx+8,cy-5);
            c.lineTo(cx+18,cy+3);c.lineTo(cx+14,cy+14);c.lineTo(cx+1,cy+17);c.fill();
            if(biome==='marsh')for(let tendril=0;tendril<4;tendril++)
              stroke(c,[[cx-10+tendril*7,cy+9],[cx-8+tendril*7,cy+31+tendril*3]],habitat.shade);
          }
        }
      }else if(biome==='fungal'){
        stroke(c,[[root,ground],[root+3,ground-high]],habitat.shade,4);
        c.fillStyle=habitat.shade;
        for(let k=0;k<4;k++)c.fillRect(Math.round(root-19+k*3),Math.round(ground-high-2*k),38-6*k,3);
      }else{
        // Layered stacks, talus fans and broken crests follow the local rock.
        const summit=ground-high;c.fillStyle=habitat.shade;
        c.beginPath();c.moveTo(root-20,ground);c.lineTo(root-12,summit+15);
        c.lineTo(root-4,summit);c.lineTo(root+6,summit+4);c.lineTo(root+11,summit+27);c.lineTo(root+24,ground);c.fill();
        stroke(c,[[root-10,summit+21],[root+7,summit+25]],habitat.leaf);
        stroke(c,[[root-15,ground-12],[root+18,ground-8]],habitat.leaf);
      }
    }
  }
  c.restore();
}
const anchors = new WeakMap();
const noise = n => {
  let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
};
function surfaceSites(shape) {
  if(shape.spacetime){
    const source=surfaceSites(shape.spacetime.base);
    const bend=site=>({...site,y:site.y+spacetimeSurfaceOffsetAt(shape,site.x),slope:site.slope+(spacetimeSurfaceOffsetAt(shape,site.x+2)-spacetimeSurfaceOffsetAt(shape,site.x-2))/4});
    return {sites:source.sites.map(bend),stones:source.stones.map(bend)};
  }
  let revision=0;for(const [x,y]of shape)revision=Math.imul(revision^Math.round(x*1024),31)^Math.round(y*1024);
  const saved=anchors.get(shape);if(saved?.revision===revision)return saved;
  const points=shape.slice(2).reverse(),sites=[],stones=[];
  const sample=x=>{
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(x>=a[0]&&x<=b[0]){const slope=(b[1]-a[1])/(b[0]-a[0]||1);return {y:a[1]+(x-a[0])*slope,slope,room:Math.min(x-a[0],b[0]-x)};}
    }
    return null;
  };
  // A bank has a few soil pockets, not a garden planted at fixed intervals.
  // Keep clusters and their gaps attached to the landform's immutable shape.
  let walked=0,next=48;
  for(let i=1;i<points.length;i++){
    const [ax,ay]=points[i-1],[bx,by]=points[i],length=Math.hypot(bx-ax,by-ay);
    if(!length)continue;
    while(next<walked+length){
      const t=(next-walked)/length;
      const slope=(by-ay)/(bx-ax||1),seed=i*313+Math.floor(next)*71;
      if(Math.abs(bx-ax)>1&&Math.abs(slope)<.55){
        const x=ax+(bx-ax)*t,y=ay+(by-ay)*t,count=2+Math.floor(noise(seed)*3);
        for(let j=0;j<count;j++){
          const dx=(j-(count-1)/2)*10;
          const root=sample(x+dx);
          if(root&&Math.abs(root.slope)<.55)
            sites.push({x:x+dx,y:root.y,slope:root.slope,room:root.room,seed:seed+j*53,cluster:j});
        }
        if(!sites.length||sites.at(-1).seed<seed)sites.push({x,y,slope,seed,cluster:0});
      }
      next+=100+noise(seed+91)*126;
    }
    walked+=length;
  }
  let index=0;
  for(let x=points[0][0]+23;x<points.at(-1)[0]-8;x+=35+noise(index++*131+97)*38){
    const root=sample(x),seed=Math.round(x)*61+index*179;
    if(root&&Math.abs(root.slope)<.8)stones.push({x,y:root.y,slope:root.slope,seed});
  }
  anchors.set(shape,{points,sites,stones,revision});return anchors.get(shape);
}
function stroke(c,points,ink,width=1){
  c.beginPath();for(let i=0;i<points.length;i++){
    const [x,y]=points[i];if(i)c.lineTo(Math.round(x),Math.round(y));else c.moveTo(Math.round(x),Math.round(y));
  }
  c.strokeStyle=ink;c.lineWidth=width;c.stroke();
}
function tuft(c,h,x,y,sign,seed,time,push,reduced,slope,fixedFlutter){
  const flutter=fixedFlutter??(reduced?0:Math.sin(time*1.6+seed)*1.3);
  const mushroom=h.plant==='mushroom';
  const count=mushroom?3:h.plant==='lichen'?3:5;
  for(let i=0;i<count;i++){
    const size=6+noise(seed+i*33)*16,root=x+(i-count/2)*3;
    const rootY=y+(root-x)*slope+sign;
    const bend=flutter+push*(.5+i*.22)+(i-count/2)*1.2;
    const tipX=root+bend,tipY=rootY-sign*size;
    stroke(c,[[root,rootY],[root+bend*.2,rootY-sign*size*.45],[tipX,tipY]],i%2?h.leaf:h.shade);
    if(mushroom){
      c.fillStyle=h.leaf;c.fillRect(Math.round(tipX-4),Math.round(tipY),8,2);
      c.fillRect(Math.round(tipX-2),Math.round(tipY-2*sign),4,2);
      c.fillStyle=h.flower;c.fillRect(Math.round(tipX-2),Math.round(tipY),1,1);
    }else if(h.plant==='fern'||h.plant==='fan'){
      for(let k=1;k<=3;k++){
        const t=k/4,xx=root+bend*t,yy=rootY-sign*size*t,spread=(1-t)*5;
        stroke(c,[[xx-spread,yy-sign*2],[xx,yy],[xx+spread,yy-sign*3]],h.leaf);
        c.fillStyle=h.leaf;
        c.beginPath();c.moveTo(xx,yy);c.lineTo(xx-spread-2,yy-sign*4);
        c.lineTo(xx-1,yy-sign*2);c.lineTo(xx+spread+2,yy-sign*4);c.fill();
      }
    }else if(h.plant==='reed'){
      c.fillStyle=h.flower;c.fillRect(Math.round(tipX-1),Math.round(tipY-4*sign),2,5);
    }else if(h.plant==='lichen'){
      stroke(c,[[root-3,rootY-sign*3],[root,rootY-sign*6],[root+4,rootY-sign*4]],h.leaf);
    }else if(i===1&&noise(seed)>.6){
      c.fillStyle=h.flower;c.fillRect(Math.round(tipX-1),Math.round(tipY),3,1);
    }
  }
}
function animal(c,h,x,y,seed,time,reaction,reduced,slope){
  const flutter=reduced?0:Math.sin(time*4+seed);
  const fly=h.animal==='firefly',wing=h.animal==='moth';
  const xx=x+(reduced?0:Math.sin(time*.7+seed)*8)+reaction*3;
  const yy=y-18-(reduced?0:Math.cos(time*1.1+seed)*5)-Math.abs(reaction)*2;
  if(fly){
    const brightness=Math.min(1,.35+.4*(.5+.5*Math.sin(time*1.9+seed))+Math.abs(reaction)*.07);
    c.globalAlpha=brightness*.23;c.fillStyle='#b9cf95';c.fillRect(Math.round(xx-2),Math.round(yy-2),5,5);
    c.globalAlpha=brightness;c.fillRect(Math.round(xx),Math.round(yy),1,1);c.globalAlpha=1;
  }else if(wing){
    c.fillStyle=h.flower;c.globalAlpha=.55;
    c.fillRect(Math.round(xx-2),Math.round(yy-flutter),2,1+Math.round(Math.abs(flutter)));
    c.fillRect(Math.round(xx+1),Math.round(yy+flutter),2,1);c.globalAlpha=1;
  }else if(h.animal==='beetle'){
    const crawl=reduced?0:Math.sin(time*.8+seed)*3;
    c.fillStyle=h.shade;c.fillRect(Math.round(x+crawl),Math.round(y+crawl*slope)-1,3,2);
  }else{
    c.fillStyle=h.flower;c.globalAlpha=.35;c.fillRect(Math.round(xx),Math.round(yy),1,1);c.globalAlpha=1;
  }
}
// Site sprites (on by default; ?tufts=0 or globalThis.__perfFlags.tufts=false draws every stroke each frame,
// as before). A plant tuft, a roof root cluster or a loose stone is drawn once into a small canvas with the
// same strokes, alpha and scale, and placed with one drawImage on the pixel grid. Sway is quantised to 16
// phases per cycle, the player's push to half a world unit, the site's sub-unit height to quarters; the
// sprite's world origin is snapped to a whole pixel (up to half a pixel from the scaled position).
// Lazy: at most SITE_BAKES bakes per frame (misses draw directly), LRU capped, released with the flight.
const TUFTS_URL=(()=>{try{return new URLSearchParams(globalThis.location?.search||'').get('tufts')!=='0';}catch{return true;}})();
const tuftsOn=()=>{const f=globalThis.__perfFlags;return f&&'tufts' in f?f.tufts!==false:TUFTS_URL;};
const SWAY_PHASES=16,SITE_CACHE=640,SITE_BAKES=6,ATLAS=1024;
const siteCaches=new WeakMap();
// Diagnostics only (?skip=plants = every ground plant, tufts = only the stroked tufts, stones, water, animals): leaves out parts of the ecology to bisect a slow frame.
const SKIP=(()=>{try{return new Set((new URLSearchParams(globalThis.location?.search||'').get('skip')||'').split(',').filter(Boolean));}catch{return new Set();}})();
// World-unit box around the site anchor that every site drawing fits in.
const BOX={left:-30,top:-44,right:30,bottom:30};
// All site sprites live in ONE atlas canvas per flight (one texture: the GPU can batch every
// site drawImage, unlike hundreds of separate small canvases). Slots are reused LRU.
function siteCache(c,e,scale){
  if(!tuftsOn()||!(scale>0))return null;
  let k=siteCaches.get(e);
  if(!k){k={map:new Map(),scale,frame:0,bakes:0,made:0,misses:0,atlas:null,g:null,free:[],queue:[]};siteCaches.set(e,k);}
  if(k.scale!==scale){releaseSites(k);k.scale=scale;}
  k.frame++;k.bakes=0;if(k.queue?.length&&k.atlas)bakeQueued(k);
  if(!k.atlas){
    const doc=c.canvas?.ownerDocument||globalThis.document;if(!doc?.createElement)return null;
    k.tx=Math.round(-BOX.left*scale)+1;k.ty=Math.round(-BOX.top*scale)+1;k.w=Math.ceil((BOX.right-BOX.left)*scale)+3;k.h=Math.ceil((BOX.bottom-BOX.top)*scale)+3;
    k.cols=Math.max(1,Math.floor(ATLAS/k.w));const rows=Math.max(1,Math.floor(ATLAS/k.h));k.slots=Math.min(SITE_CACHE,k.cols*rows);
    k.atlas=doc.createElement('canvas');k.atlas.width=k.cols*k.w;k.atlas.height=Math.ceil(k.slots/k.cols)*k.h;
    k.g=k.atlas.getContext('2d');if(!k.g){k.atlas=null;return null;}
    k.free=Array.from({length:k.slots},(_,i)=>k.slots-1-i);
  }
  return k;
}
function releaseSites(k){if(k.atlas)k.atlas.width=k.atlas.height=1;k.atlas=null;k.g=null;k.map.clear();k.free=[];if(k.queue)k.queue.length=0;}
/** Frees one flight's site sprites (renderer teardown). */
export function releaseTerrainEcology(e){const k=siteCaches.get(e);if(k){releaseSites(k);siteCaches.delete(e);}}
/** Draws a site sprite at world (x,y); returns false when the caller should draw directly (bake budget spent). */
// The atlas is only written at the start of a frame, before anything is drawn from it this frame:
// writing a canvas that this frame's recording already samples makes Chrome copy the whole texture.
// A miss is drawn directly this frame and queued; the queue is baked when the next frame begins.
function bakeQueued(k){
  for(const job of k.queue){
    if(k.map.has(job.key))continue;
    if(!k.free.length){const [old,s]=k.map.entries().next().value;k.map.delete(old);k.free.push(s);}
    const slot=k.free.pop(),g=k.g,sx=(slot%k.cols)*k.w,sy=Math.floor(slot/k.cols)*k.h;
    g.save();g.setTransform(1,0,0,1,0,0);g.clearRect(sx,sy,k.w,k.h);g.beginPath();g.rect(sx,sy,k.w,k.h);g.clip();
    g.setTransform(k.scale,0,0,k.scale,sx+k.tx,sy+k.ty);g.globalAlpha=job.alpha;g.lineCap='butt';g.lineJoin='miter';g.globalCompositeOperation='source-over';
    job.draw(g,0,job.fy);g.restore();
    k.map.set(job.key,slot);k.made++;
  }
  k.queue.length=0;
}
/** Draws a site sprite at world (x,y); returns false when the caller should draw directly (not baked yet). */
function placeSite(c,k,key,x,y,fy,alpha,draw){
  const slot=k.map.get(key);
  if(slot===undefined){
    if(k.queue.length<SITE_BAKES&&!k.queue.some(j=>j.key===key))k.queue.push({key,fy,alpha,draw});else k.misses++;
    return false;
  }
  k.map.delete(key);k.map.set(key,slot);
  const sc=k.scale,sx=(slot%k.cols)*k.w,sy=Math.floor(slot/k.cols)*k.h;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
  c.drawImage(k.atlas,sx,sy,k.w,k.h,Math.round(Math.round(x)*sc)-k.tx,Math.round(Math.floor(y)*sc)-k.ty,k.w,k.h);
  c.setTransform(sc,0,0,sc,0,0);
  return true;
}
const quarter=v=>Math.round(v*4)/4;
function drawTerrainEcologyDirect(c,e,o){const F=globalThis.__perfFlags||(globalThis.__perfFlags={}),had='tufts' in F,old=F.tufts;F.tufts=false;try{drawTerrainEcology(c,e,o);}finally{if(had)F.tufts=old;else delete F.tufts;}}
export function drawTerrainEcology(c,e,{scale=1,distance=e.renderDistance??e.distance,time=e.visualTime??e.time}={}){
  const h=habitats[habitatId(e)];if(!h)return;
  const boundary=terrainBoundary(e,time);
  const py=e.renderPlayerY??e.player.y;
  const cache=siteCache(c,e,scale);
  if(cache){const m=c.getTransform?.();if(!m||m.a!==1||m.b||m.c||m.d!==1||m.e||m.f)return drawTerrainEcologyDirect(c,e,{scale,distance,time});}
  c.save();c.scale(scale,scale);c.lineCap='butt';c.lineJoin='miter';
  for(const o of e.layout.obstacles){
    if(o.x-distance>e.width+180)break;
    if(o.destroyed||o.x+o.width*2.5<distance-180)continue;
    const center=o.center+Math.sin(time*.9+o.phase)*o.motion;
    for(const top of [true,false]){
      const shape=top?o.topShape:o.bottomShape;if(!shape)continue;
      const {sites,stones}=surfaceSites(shape),sign=top?-1:1,base=center+sign*o.gap/2;
      if(!top&&!SKIP.has('stones'))for(const site of stones){
        const x=o.x+site.x-distance,y=base+site.y;if(x<-12||x>e.width+12||y<-8||y>e.height+8)continue;
        if(!terrainSurfaceExposed(e,o,false,o.x+site.x,y,time,boundary))continue;
        const r=2+noise(site.seed)*3.5,drop=site.slope*r;
        const stone=(g,x,y)=>{
        g.fillStyle=h.shade;g.beginPath();g.moveTo(Math.round(x-r),Math.round(y-drop+1));
        g.lineTo(Math.round(x-r*.65),Math.round(y-r*.55));g.lineTo(Math.round(x+r*.1),Math.round(y-r));
        g.lineTo(Math.round(x+r*.85),Math.round(y-r*.35));g.lineTo(Math.round(x+r),Math.round(y+drop+1));g.closePath();g.fill();
        if(noise(site.seed+5)>.5)stroke(g,[[x-r*.5,y-r*.55],[x+r*.1,y-r]],h.leaf,1);};
        const fy=quarter(y-Math.floor(y));
        if(!cache||!placeSite(c,cache,'s:'+site.seed+':'+fy,x,y,fy,.82,stone)){c.globalAlpha=.82;stone(c,x,y);}
        c.globalAlpha=1;
      }
      for(const site of sites){
        const x=o.x+site.x-distance,y=base+site.y;
        if(x< -40||x>e.width+40||y< -35||y>e.height+35)continue;
        if(!terrainSurfaceExposed(e,o,top,o.x+site.x,y,time,boundary))continue;
        const seed=site.seed+Math.floor(o.x)*13;
        // Roofs carry roots/lichen rather than upside-down bushes. Frost and
        // bare crests retain quiet space so the actual contact edge stays clear.
        if(top&&noise(seed+9)<.72)continue;
        if(['frost','basalt','crystal'].includes(habitatId(e))&&noise(seed+12)<.55)continue;
        const near=Math.max(0,1-Math.hypot(x-e.player.x,y-py)/95);
        const push=e.reducedMotion?0:near*near*(x<e.player.x?-7:5);
        c.globalAlpha=.92;
        if(top){
          const rooted=['fern','reed','grass'].includes(h.plant);
          const roots=(g,x,y,push)=>{
          if(rooted)for(let j=0;j<3;j++){
            const xx=x+(j-1)*4,drop=8+noise(seed+j*41)*13;
            stroke(g,[[xx,y+(xx-x)*site.slope-2],[xx+1,y+drop*.5],[xx-2+push*.12,y+drop]],h.shade,1);
          }else{
            stroke(g,[[x-4,y-2],[x,y+2],[x+4,y-1]],h.leaf,1);
          }};
          const fy=quarter(y-Math.floor(y)),pq=Math.round(push*2)/2;
          if(!cache||!placeSite(c,cache,'r:'+seed+':'+fy+':'+(rooted?pq:0),x,y,fy,.92,(g,gx,gy)=>roots(g,gx,gy,pq))){c.globalAlpha=.92;roots(c,x,y,cache?pq:push);}
        }else if(SKIP.has('plants')||drawAuthoredPlant(c,e,{x,y,sign,push,seed})||SKIP.has('tufts')){}else{
          if(cache){
            const phase=e.reducedMotion?0:(((Math.round((time*1.6+seed)/(Math.PI*2)*SWAY_PHASES))%SWAY_PHASES)+SWAY_PHASES)%SWAY_PHASES;
            const flutter=e.reducedMotion?0:Math.sin(phase*Math.PI*2/SWAY_PHASES)*1.3,fy=quarter(y-Math.floor(y)),pq=Math.round(push*2)/2;
            const draw=(g,gx,gy)=>tuft(g,h,gx,gy,sign,seed,time,pq,e.reducedMotion,site.slope,flutter);
            if(!placeSite(c,cache,'t:'+seed+':'+fy+':'+phase+':'+pq+':'+site.slope.toFixed(3),x,y,fy,.92,draw)){c.globalAlpha=.92;tuft(c,h,x,y,sign,seed,time,pq,e.reducedMotion,site.slope,flutter);}
          }else tuft(c,h,x,y,sign,seed,time,push,e.reducedMotion,site.slope);
        }
        c.globalAlpha=1;
        // Shallow reflective pockets stay inset behind the solid lip. They
        // suggest wet rock and pools without adding a second collision edge.
        if(!SKIP.has('water')&&!top&&site.cluster===0&&h.water&&Math.abs(site.slope)<.18&&noise(seed)>.42){
          // Fit the whole waterline inside a single gentle face. A shoal
          // seen in section sits under this line, inside the bank.
          const halfWidth=Math.min(site.room||0,9+noise(seed+5)*9);
          if(halfWidth>=7){
            const waterY=Math.round(y+2+halfWidth*Math.abs(site.slope));
            const hasFish=h.animal==='fish'&&halfWidth>=10;
            if(hasFish){
              c.fillStyle='#344c56';c.fillRect(Math.round(x-halfWidth+2),waterY,Math.round(halfWidth*2-4),6);
              const drift=e.reducedMotion?0:Math.sin(time*.9+seed)*3;
              c.fillStyle=h.leaf;c.fillRect(Math.round(x+drift)-2,waterY+3,4,1);
              c.fillRect(Math.round(x+drift)-3,waterY+2,1,1);
            }
            stroke(c,[[x-halfWidth,waterY],[x+halfWidth,waterY]],'#45656a',2);
            const reflection=e.reducedMotion?0:Math.sin(time*1.5+seed)*2;
            stroke(c,[[x-halfWidth*.45+reflection,waterY],[x+halfWidth*.5+reflection,waterY]],'#92aba5',1);
          }
        }
        if(!SKIP.has('animals')&&!top&&site.cluster===0&&h.animal!=='fish'&&noise(seed+7)>.66)
          animal(c,h,x,y,seed,time,push,e.reducedMotion,site.slope);
      }
    }
  }
  c.restore();
}
