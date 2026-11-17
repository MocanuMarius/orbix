import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareEnvironmentArt,drawAuthoredBackdrop,tintedVariantCount,TINTED_VARIANT_LIMIT} from '../dist/authored-environment.mjs';

function fakeDocument(){
 const document={canvases:[],createElement(tag){
  if(tag==='img'){const image={width:8,height:8,onload:null,onerror:null};let src='';Object.defineProperty(image,'src',{get:()=>src,set(v){src=v;setTimeout(()=>image.onload?.(),0);}});return image;}
  const canvas={width:0,height:0,ownerDocument:document};
  const context={canvas,globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'',imageSmoothingEnabled:true,
   drawImage(){},fillRect(){},save(){},restore(){},scale(){},
   getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
  canvas.getContext=()=>context;document.canvases.push(canvas);return canvas;
 }};
 return document;
}
const BIOMES=['moonruins','frost','pinewood','marsh','fungal','basalt','desert','coral','crystal','cloud','thorn','cemetery'];

test('tinted art variants stay within the cache cap across every biome, without shrinking evicted canvases',async()=>{
 const document=fakeDocument();await prepareEnvironmentArt(document);
 const context=document.createElement('canvas').getContext('2d');
 const drawn=new Map();
 for(const biome of BIOMES){
  const engine={levelIdentity:{biomeId:biome},width:900,height:430,distance:0};
  const before=document.canvases.length;
  assert.equal(drawAuthoredBackdrop(context,engine),true);
  drawn.set(biome,document.canvases.slice(before));
  assert.ok(tintedVariantCount(document)<=TINTED_VARIANT_LIMIT);
 }
 assert.equal(TINTED_VARIANT_LIMIT,24);
 assert.equal(tintedVariantCount(document),TINTED_VARIANT_LIMIT,'twelve biomes produce more variants than the cap');
 // Evicted variants keep their pixels: a landscape built from them may still draw them.
 for(const canvases of drawn.values())for(const canvas of canvases)assert.equal(canvas.width,8);
 // The biome in use is served from the cache (most recently used survive eviction).
 const engine={levelIdentity:{biomeId:'cemetery'},width:900,height:430,distance:0};
 const count=document.canvases.length;drawAuthoredBackdrop(context,engine);
 assert.equal(document.canvases.length,count,'recently used variants are cache hits');
});
