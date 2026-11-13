import assert from 'node:assert/strict';
import {BIOMES,BIOME_LEVELS,getBiome} from '../dist/biomes.mjs';
import {BIOME_COURSES} from '../dist/biome-courses.mjs';
import {resolveLevelIdentity,getBiomeLevelIdentity} from '../dist/level-catalog.mjs';
import {buildFlightLayout} from '../dist/flight.mjs';
import {createRun,newState,advanceMap} from '../dist/model.mjs';

assert.equal(BIOMES.length,12);
assert.equal(BIOME_LEVELS.length,48);
assert.equal(Object.keys(BIOME_COURSES).length,48);
const shapes=new Set(),starts=new Set(),seenLevels=new Set();
let layouts=0,maps=0;
for(const biome of BIOMES){
 const levels=BIOME_LEVELS.filter(level=>level.biomeId===biome.id);
 assert.equal(levels.length,4);
 assert.deepEqual(levels.map(level=>level.variant),[0,1,2,3]);
 assert.equal(new Set([0,1,2,3].map(offset=>getBiomeLevelIdentity(biome.id,'variants',offset).id)).size,4);
 for(const level of levels){
  assert.equal(getBiome(level.id),biome);assert.equal(getBiome(level),biome);
  const course=BIOME_COURSES[level.id];assert.ok(course);
  shapes.add(JSON.stringify([course.entry,course.hard,course.rest]));
  for(const section of ['entry','hard','rest']){
   assert.ok(course[section].length>=2);
   for(const [center,gap,width,spacing,side,form] of course[section]){
    assert.ok(center>=.35&&center<=.65);assert.ok(gap>=160&&gap<=365);
    assert.ok(spacing>width*1.8);assert.ok(['floor','roof','both'].includes(side));assert.ok(form);
   }
  }
  if(['crumble','thaw','pinecone','sandfall'].includes(biome.interaction))
   assert.ok([...course.entry,...course.rest].some(cell=>cell[4]!=='floor'),'Hanging interaction has an authored roof anchor');
  for(const height of [405,620]){
   const layout=buildFlightLayout({seed:'biome-layout',terrain:level.terrain,levelId:level.id,height,duration:102,lengthScale:3});
   assert.equal(layout.levelIdentity.id,level.id);assert.ok(layout.obstacles.length>=12);
   assert.ok(layout.sections.some(section=>section.name.startsWith(level.name)));
   for(const obstacle of layout.obstacles){assert.ok(Number.isFinite(obstacle.center));assert.ok(obstacle.gap>=height*.18);}
   layouts++;
  }
 }
}
assert.equal(shapes.size,48,'All forty-eight maps have a distinct authored layout');
assert.equal(resolveLevelIdentity('ruins-aqueduct','ruins').id,'ruins-aqueduct','Tutorial stays authored');
for(let seed=0;seed<48;seed++){
 const run=createRun(newState().profile,`biome-deck-${seed}`);
 assert.deepEqual(run.map,createRun(newState().profile,`biome-deck-${seed}`).map,'Same seed keeps dreams/retries deterministic');
 starts.add(run.map[0][0].biomeId);
 for(let map=0;map<3;map++){
  maps++;
  // Deck draw order is the authored route lane; the whole map may be mirrored.
  const flights=run.map.flatMap(row=>[...row].sort((a,b)=>a.routeLane-b.routeLane).filter(n=>n.type!=='support'));
  assert.equal(new Set(flights.slice(0,12).map(n=>n.biomeId)).size,Math.min(12,flights.length));
  const lastLevel=new Map();
  for(const node of flights){
   const identity=resolveLevelIdentity(node.levelId,node.terrain);
   assert.equal(identity.biomeId,node.biomeId);assert.ok(node.interactionHint);
   if(lastLevel.has(node.biomeId))assert.notEqual(lastLevel.get(node.biomeId),node.levelId,'Repeat biome rotates to a different authored map');
   lastLevel.set(node.biomeId,node.levelId);seenLevels.add(node.levelId);
  }
  run.phase='map-clear';run.step=7;if(map<2)assert.ok(advanceMap(run));
 }
}
assert.equal(starts.size,12,'Every biome can open a fresh run');
assert.equal(seenLevels.size,48,'All forty-eight authored maps are reachable from fresh runs');
console.log(JSON.stringify({biomes:BIOMES.length,authoredMaps:shapes.size,generatedLayouts:layouts,seededMaps:maps,openingBiomes:starts.size,seenLevels:seenLevels.size}));
