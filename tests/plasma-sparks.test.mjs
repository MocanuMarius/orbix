import assert from 'node:assert/strict';
import test from 'node:test';
import {drawPickup,prepareFuelSprites,pickupArtSvg} from '../dist/pickup-art.mjs';
import {getPickupSpec,pickupContactRadius,pickupShellRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const kinds=['light','cluster','cache'];
function atlasFixture(){
  const sprites=[];
  const doc={createElement(){
    const pixels=[];
    const ctx={fillRect(x,y,w,h){pixels.push([x,y,w,h,this.fillStyle,this.globalAlpha]);}};
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
    const svg=pickupArtSvg(kind);
    const svgPixels=[...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)" opacity="([^"]+)"\/>/g)]
      .map(([,x,y,w,h,ink,opacity])=>[36+Number(x),36+Number(y),Number(w),Number(h),ink,Number(opacity)]);
    assert.deepEqual(svgPixels,first.pixels);
  }
  assert.equal(sprites.length,75);
});
