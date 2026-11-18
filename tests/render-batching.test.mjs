// Exactness of the render-cost reductions that must not change pixels: polygon vertex reduction,
// merged clearance runs, and the JS rectangle compositor's blending.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PolygonPath,RectBatch} from '../dist/rect-raster.mjs';

const wind=(poly,px,py)=>{let w=0;for(let i=0;i<poly.length;i++){const [ax,ay]=poly[i],[bx,by]=poly[(i+1)%poly.length];
  if(ay<=py){if(by>py&&(bx-ax)*(py-ay)-(px-ax)*(by-ay)>0)w++;}else if(by<=py&&(bx-ax)*(py-ay)-(px-ax)*(by-ay)<0)w--;}return w;};
let seed=7;const rnd=()=>((seed=Math.imul(seed^(seed>>>15),2246822519)+374761393>>>0)/4294967296);

test('PolygonPath keeps the filled area inside the view and drops vertices',()=>{
  const P=new PolygonPath();let vin=0,vout=0;
  for(let t=0;t<200;t++){
    const raw=[];let x=-400+rnd()*200,y=100;
    for(let i=0;i<40+Math.floor(rnd()*160);i++){x+=Math.round(rnd()*12-2);y=Math.round(Math.max(0,Math.min(240,y+rnd()*10-5)));raw.push([Math.round(x),y]);}
    raw.push([Math.round(x),300],[raw[0][0],300]);
    P.begin();for(const [a,b] of raw)P.add(a,b);
    const out=[];let cur;P.emit({moveTo(a,b){cur=[[a,b]];out.push(cur);},lineTo(a,b){cur.push([a,b]);},closePath(){}},-8,728);
    vin+=raw.length;vout+=out[0].length;
    for(let k=0;k<200;k++){const px=rnd()*720,py=rnd()*300;assert.equal(wind(raw,px,py)!==0,wind(out[0],px,py)!==0);}
  }
  assert.ok(vout<vin*.9,`expected fewer vertices (${vin} -> ${vout})`);
});

test('merged clearance runs cover exactly the same pixels as one square per step',()=>{
  const src=fs.readFileSync(new URL('../dist/terrain-foreground.mjs',import.meta.url),'utf8');
  const body=src.slice(src.indexOf('function hardContactClearance'),src.indexOf('export const FOREGROUND_BIOMES'));
  const G={__perfFlags:{}};const h=new Function('globalThis',body.replace(/const MERGE_URL=.*\n/,'const MERGE_URL=true;\n')+';return hardContactClearance;')(G);
  const paint=(merge,args)=>{G.__perfFlags.batch=merge;const set=new Set();let n=0;h({rect(x,y,w,hh){n++;for(let i=x;i<x+w;i++)for(let j=y;j<y+hh;j++)set.add(i+','+j);}},...args);return {set,n};};
  let a=0,b=0;
  for(let k=0;k<1500;k++){const r=()=>Math.round(rnd()*900-90);const args=[r(),r()/3,r(),r()/3,1+Math.floor(rnd()*6),720,240];
    const A=paint(false,args),B=paint(true,args);a+=A.n;b+=B.n;
    assert.equal(A.set.size,B.set.size);for(const p of A.set)assert.ok(B.set.has(p));}
  assert.ok(b<a/2,`expected fewer rects (${a} -> ${b})`);
});

test('RectBatch composites source-over in order with box coverage',()=>{
  const fake={createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)})})})};
  const b=new RectBatch(fake).begin();
  b.fillStyle='#ff0000';b.globalAlpha=.5;b.fillRect(0,0,2,1);
  b.fillStyle='#0000ff';b.globalAlpha=1;b.fillRect(1,0,1.5,1);
  const box=b.composite();assert.deepEqual([box.x0,box.y0,box.w,box.h],[0,0,3,1]);
  const d=b.image.data;
  assert.deepEqual([...d.slice(0,4)],[255,0,0,128]);
  assert.deepEqual([...d.slice(4,8)],[0,0,255,255]);
  assert.deepEqual([...d.slice(8,12)],[0,0,255,128]);
  b.fillStyle='hsl(0,0%,0%)';assert.equal(b.ok,false,'unsupported inks make the batch fall back');
});
