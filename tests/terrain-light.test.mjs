import test from 'node:test';
import assert from 'node:assert/strict';
import {lightAttenuation} from '../dist/light-attenuation.mjs';
import {solidRayIntervals,solidDistanceAt,materialLightDistance,materialLightAt,castTerrainLight,terrainLightStats,TERRAIN_LIGHT_LIMITS,releaseTerrainLight} from '../dist/terrain-light.mjs';

const rectangle=(left,top,right,bottom)=>[[left,top],[right,top],[right,bottom],[left,bottom]];
test('rendered Luminance spends one reach unit in air and three through real rock, including the air behind it',()=>{
 const rock=[rectangle(20,-50,40,50)],source={x:0,y:0},radius=145;
 for(const x of [0,19,20])assert.equal(materialLightAt(rock,source,{x,y:0},radius),lightAttenuation((x/radius)**2));
 assert.equal(materialLightAt(rock,source,{x:30,y:0},radius),lightAttenuation((50/radius)**2));
 assert.equal(materialLightAt(rock,source,{x:60,y:0},radius),lightAttenuation((100/radius)**2));
 assert.equal(materialLightDistance(20,20),60);
 assert.equal(materialLightAt([],source,{x:60,y:0},radius),lightAttenuation((60/radius)**2));
});
test('overlapping terrain and authored props consume light once as one solid union',()=>{
 const spans=solidRayIntervals([rectangle(10,-10,30,10),rectangle(20,-10,45,10)],0,0,1,0,100);
 assert.deepEqual(spans,[[10,45]]);assert.equal(solidDistanceAt(spans,100),35);
 const throughOrigin=solidRayIntervals([rectangle(-10,-10,30,10)],0,0,1,0,100);
 assert.deepEqual(throughOrigin,[[0,30]]);
});
function fixture(obstacles=[]){
 const document={createElement(){const canvas={ownerDocument:document,width:0,height:0};canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(image){canvas.pixels=image.data;}});return canvas;}};
 const draws=[],engine={width:390,height:430,distance:0,time:0,layout:{obstacles},canvas:{ownerDocument:document}};
 const context={canvas:{ownerDocument:document},globalAlpha:1,drawImage:(...args)=>draws.push(args)};
 return {engine,context,draws};
}
test('clear-air rendering reuses the pristine radial mask without creating a material mask',()=>{
 const {engine,context,draws}=fixture(),clear={clear:true};castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});
 assert.equal(draws[0][0],clear);assert.equal(terrainLightStats(engine).builds,0);releaseTerrainLight(engine);
});
test('material masks are cached, bounded and invalidated by in-place collider coordinate changes',()=>{
 const shape=rectangle(-100,0,1000,1000),o={x:0,width:400,center:250,gap:0,motion:0,phase:0,bottomShape:shape};
 const {engine,context}=fixture([o]),clear={};
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});}
 assert.equal(terrainLightStats(engine).builds,1);assert.equal(terrainLightStats(engine).hits,59);
 engine.time=2;shape[0][1]+=20;castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});assert.equal(terrainLightStats(engine).builds,2);
 for(let i=0;i<20;i++)castTerrainLight(context,clear,engine,{x:100,y:200,radius:145,channel:`test${i}`});
 assert.ok(terrainLightStats(engine).masks<=TERRAIN_LIGHT_LIMITS.masks);releaseTerrainLight(engine);
});
test('moving terrain refreshes at bounded visual cadence while the untouched air law stays fixed',()=>{
 const {engine,context}=fixture([{x:0,width:400,center:250,gap:0,motion:8,phase:0,bottomShape:rectangle(-100,0,1000,1000)}]);
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,{},engine,{x:100,y:200,radius:145});}
 assert.ok(terrainLightStats(engine).builds<=14);releaseTerrainLight(engine);
});

test('remote moving geometry cannot invalidate a source mask it cannot reach',()=>{
 const near={x:0,width:100,center:250,gap:0,motion:0,phase:0,bottomShape:rectangle(-100,0,200,1000)},far={x:700,width:100,center:250,gap:0,motion:8,phase:0,bottomShape:rectangle(0,0,200,1000)};
 const {engine,context}=fixture([near,far]);engine.width=900;
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,{},engine,{x:100,y:200,radius:145});}
 assert.equal(terrainLightStats(engine).builds,1);assert.equal(terrainLightStats(engine).hits,59);releaseTerrainLight(engine);
});
