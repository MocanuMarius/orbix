import test from 'node:test';
import assert from 'node:assert/strict';
import {createForegroundSilhouettes,FOREGROUND_BIOMES} from '../dist/terrain-foreground.mjs';
import {createNearLandscape} from '../dist/habitat-compositions.mjs';
import {drawHabitatAnimal} from '../dist/habitat-wildlife.mjs';
const documentFor=()=>{const paint=[];const document={createElement(){const canvas={ownerDocument:document};const context=new Proxy({fillStyle:'',strokeStyle:'',globalAlpha:1},{get:(o,k)=>o[k]??((...args)=>{if(k==='fill'||k==='fillRect'||k==='stroke')paint.push([k,k==='stroke'?o.strokeStyle:o.fillStyle,o.globalAlpha]);})});canvas.getContext=()=>context;return canvas;}};return {document,paint};};
test('all twelve nearest-camera planes contain only opaque black geometry',()=>{
 assert.equal(FOREGROUND_BIOMES.length,12);
 for(const biome of FOREGROUND_BIOMES){const {document,paint}=documentFor(),plates=createForegroundSilhouettes(document,biome,2);
  assert.equal(plates.length,3);assert.equal(plates.filter(p=>p.roof).length,1);assert.ok(paint.length>50);
  for(const [,ink,alpha]of paint){assert.equal(ink,'#000000');assert.equal(alpha,1);}
  for(const plate of plates){assert.equal(plate.canvas.width,512);assert.equal(plate.canvas.height,160);assert.equal(plate.roofCanvas.height,76);}
 }
});
test('frog and hare make brief authored excursions and reduced motion keeps both at rest',()=>{
 const draw=(kind,time,reducedMotion)=>{const moves=[],c=new Proxy({globalAlpha:.6,translate:(...p)=>moves.push(p)},{get:(o,k)=>o[k]??(()=>{})});drawHabitatAnimal(c,{kind,phase:0},{x:100,y:150,time,reducedMotion});return moves;};
 assert.notDeepEqual(draw('frog',16,false),draw('frog',0,false));
 assert.notDeepEqual(draw('hare',20,false),draw('hare',0,false));
 for(const kind of ['frog','hare'])assert.deepEqual(draw(kind,20,true),draw(kind,0,true));
});
test('authored habitat variants carry root rabbits/deer, marsh frogs, frost hares and basalt lizards',()=>{
 const required={pinewood:['rabbit','deer'],marsh:['frog'],frost:['hare'],basalt:['lizard']};
 for(const biome of FOREGROUND_BIOMES){const {document}=documentFor(),plates=createNearLandscape(document,{biome,variant:0,patch:[0,0,24,24]});
  assert.equal(plates.length,2);const life=plates.flatMap(p=>p.tiles.flatMap(t=>t.habitatSites));assert.ok(life.length>0,biome);
  for(const kind of required[biome]||[])assert.ok(life.some(site=>site.kind===kind),`${biome}: ${kind}`);
  for(const site of life)assert.ok(Number.isFinite(site.x)&&Number.isFinite(site.y));
 }
});
