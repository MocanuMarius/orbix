import test from 'node:test';
import assert from 'node:assert/strict';
import {createNearLandscape} from '../dist/habitat-compositions.mjs';

const inhabitants={
 pinewood:['deer','rabbit','fox'],marsh:['frog','butterfly','raven'],
 moonruins:['raven','rabbit'],cemetery:['raven','rabbit'],thorn:['fox','rabbit'],
 frost:['hare','raven'],desert:['lizard'],basalt:['lizard'],
 crystal:['moth','lizard'],fungal:['moth'],coral:['fish'],cloud:['raven'],
};
function drawingDocument(){
 const images=[];
 const document={createElement(){
  const canvas={ownerDocument:document};
  const context=new Proxy({drawImage:(...args)=>images.push(args[0])},{get:(o,k)=>o[k]??(()=>{})});
  canvas.getContext=()=>context;return canvas;
 }};
 return {document,images};
}

test('all forty-eight habitat variants select only fauna native to their setting',()=>{
 for(const [biome,allowed]of Object.entries(inhabitants))for(let variant=0;variant<4;variant++){
  const {document}=drawingDocument();
  const plates=createNearLandscape(document,{biome,variant,patch:[0,0,24,24]});
  const sites=plates.flatMap(p=>p.tiles.flatMap(t=>t.habitatSites));
  assert.ok(sites.length,`${biome}/${variant} has life`);
  for(const site of sites)assert.ok(allowed.includes(site.kind),`${biome}/${variant}: ${site.kind}`);
  for(const plate of plates)for(const tile of plate.tiles)assert.ok(tile.habitatSites.length<=2,'authored wildlife remains bounded');
 }
});

test('reefs, caves and exposed islands use native cover instead of recolored forest shrubs',()=>{
 const shrub={};
 for(const biome of Object.keys(inhabitants)){
  const {document,images}=drawingDocument();
  createNearLandscape(document,{biome,variant:0,patch:[0,0,24,24],plants:[{image:shrub,rect:[0,0,32,32]}]});
  const wooded=['pinewood','marsh','thorn','moonruins','cemetery'].includes(biome);
  assert.equal(images.includes(shrub),wooded,`${biome}: forest cutout suitability`);
 }
});
