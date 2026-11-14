import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {drawPickup,drawSparkSymbol,prepareFuelSprites,pickupArtSvg} from '../dist/pickup-art.mjs';
import {resourceSymbol} from '../dist/game-symbols.mjs';
import {getPickupSpec,pickupContactRadius,pickupShellRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const kinds=['light','cluster','cache'];
function atlasFixture(){
  const sprites=[];
  const doc={createElement(){
    const pixels=[];
    const ctx={save(){},restore(){},fillRect(x,y,w,h){pixels.push([x,y,w,h,this.fillStyle,this.globalAlpha]);}};
    const canvas={pixels,getContext:()=>ctx};
    sprites.push(canvas);
    return canvas;
  }};
  const ctx={canvas:{ownerDocument:doc},globalAlpha:1,save(){},restore(){},drawImage(sprite){this.last=sprite;}};
  return {doc,sprites,ctx};
}
test('tiers use the same smaller shell and keep the existing contact radii and yields',()=>{
  assert.deepEqual(kinds.map(pickupShellRadius),[16,16,16]);
  assert.deepEqual(kinds.map(pickupContactRadius),[20.8,20.8,24]);
  assert.deepEqual(kinds.map(k=>glowPoints(getPickupSpec(k).fuel)),[6,12,18]);
});
test('idle, carried and generated Sparks share warmed frames; the guide uses the reduced-motion illustration',async()=>{
  const {doc,sprites,ctx}=atlasFixture();
  await prepareFuelSprites(doc);
  assert.equal(sprites.length,72);
  for(const kind of kinds){
    const different=new Set();
    for(let i=0;i<24;i++){
      drawPickup(ctx,10,10,{kind,time:(i+.1)*.05});
      const sprite=ctx.last;
      different.add(JSON.stringify(sprite.pixels));
      drawPickup(ctx,10,10,{kind,time:(i+.1)*.05,tiny:true,bodyOnly:true});
      assert.equal(ctx.last,sprite);
    }
    assert.equal(different.size,24);
  }
  assert.equal(sprites.length,72);
  await prepareFuelSprites(doc,true);
  for(const kind of kinds){
    drawPickup(ctx,10,10,{kind,time:0,reducedMotion:true});const first=ctx.last;
    drawPickup(ctx,10,10,{kind,time:.89,reducedMotion:true});assert.equal(ctx.last,first);
    const svg=pickupArtSvg(kind),url=svg.match(/href="([^"?]+)\?v=/)[1];
    assert.ok(svg.length<600);
    const png=await readFile(new URL('../dist/'+url,import.meta.url));
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    assert.deepEqual([width,height],[36,36]);
    const rows=inflateSync(png.subarray(41,41+png.readUInt32BE(33)));
    const expected=Buffer.alloc(36*36*4);
    for(const [x,y,w,h,fill,a] of first.pixels){
      const color=parseInt(fill.slice(1),16);
      for(let yy=y-18;yy<y-18+h;yy++)for(let xx=x-18;xx<x-18+w;xx++){
        const i=(yy*36+xx)*4,back=expected[i+3]/255*(1-a),alpha=a+back;
        for(let ch=0;ch<3;ch++)expected[i+ch]=Math.round((((color>>(16-ch*8))&255)*a+expected[i+ch]*back)/alpha);
        expected[i+3]=Math.round(alpha*255);
      }
    }
    for(let row=0;row<36;row++)assert.deepEqual(rows.subarray((width*4+1)*row+1,(width*4+1)*row+145),expected.subarray(row*144,(row+1)*144));
  }
  assert.equal(sprites.length,75);
});
test('menu and Canvas symbols use the same sparse Spark with no IDs per instance',()=>{
  assert.equal(resourceSymbol('glow'),resourceSymbol('energy'));
  assert.match(resourceSymbol('energy'),/meter-spark\.png/);
  assert.doesNotMatch(resourceSymbol('energy'),/\sid=/);
  const {ctx}=atlasFixture();drawSparkSymbol(ctx,50,20,{size:14,time:.2});
  const compact=ctx.last;drawSparkSymbol(ctx,50,20,{size:24,time:.2});assert.equal(ctx.last,compact);
  drawPickup(ctx,50,20,{kind:'light',time:.2});assert.ok(compact.pixels.length>ctx.last.pixels.length);
});
