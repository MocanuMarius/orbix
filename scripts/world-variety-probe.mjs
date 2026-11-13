import assert from 'node:assert/strict';
import {LEVELS} from '../dist/level-catalog.mjs';
import {EXTRA_LEVELS} from '../dist/world-expansion.mjs';
import {buildFlightLayout,circleHitsObstacle} from '../dist/flight.mjs';
import {createRun,newState} from '../dist/model.mjs';
import {levelMapGlyph} from '../dist/level-map-art.mjs';
import {mapStopIconMarkup} from '../dist/map-guide.mjs';
let layouts=0,packets=0,blocked=0;const kinds=new Set(),geometry=new Set();
for(const level of EXTRA_LEVELS){
 assert.match(levelMapGlyph(level),new RegExp('data-landmark="'+level.id+'"'));
 for(const difficulty of [1,4])for(const seed of [3,13]){
  const layout=buildFlightLayout({seed:'variety-'+seed,terrain:level.terrain,levelId:level.id,duration:102,lengthScale:3,difficulty,stage:0,mapIndex:0});layouts++;
  assert.equal(layout.levelIdentity.id,level.id);assert.ok(layout.obstacles.length>10);assert.ok(layout.hardWindows>0);
  geometry.add(JSON.stringify(layout.obstacles.slice(0,8).map(o=>[o.center,o.gap,o.width,o.setpiece,!!o.topShape,!!o.bottomShape])));
  for(const o of layout.obstacles)assert.ok(Number.isFinite(o.center)&&o.gap>=104);
  for(const p of layout.embers.filter(p=>p.fuel)){packets++;if(layout.obstacles.some(o=>[-1,0,1].some(sign=>circleHitsObstacle(p.x,p.y,9.35,o,0,o.center+sign*o.motion))))blocked++;}
  for(const p of layout.sceneProps)kinds.add(p.kind);
 }
}
assert.ok(kinds.has('giant-mushroom'));assert.ok(kinds.has('broken-bridge'));assert.ok(kinds.has('standing-stones'));assert.ok(geometry.size>=6);assert.equal(blocked,0);
for(let seed=0;seed<30;seed++){
 const run=createRun(newState().profile,'variety-map-'+seed),byTerrain={};
 for(const node of run.map.flat().filter(n=>n.type!=='support'))(byTerrain[node.terrain]??=[]).push(node.levelId);
 for(const ids of Object.values(byTerrain))assert.equal(new Set(ids.slice(0,5)).size,Math.min(5,ids.length));
}
assert.match(mapStopIconMarkup('rest'),/M2 11 12 3l10 8/);
console.log(JSON.stringify({locations:LEVELS.length,newLocations:EXTRA_LEVELS.length,layouts,packets,blocked,uniqueGeometry:geometry.size,props:[...kinds],mapDecks:30}));
