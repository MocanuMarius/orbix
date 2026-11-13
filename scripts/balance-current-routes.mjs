// Structural opportunity audit; does not assign subjective utility to a route.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const rows=[];
for(let seed=0;seed<120;seed++)for(const difficulty of [1,3,6]){
 const run=M.createRun(M.newState().profile,`routes-${seed}`,difficulty);
 for(let map=0;map<3;map++){
  const nodes=run.map.flat(),byId=new Map(nodes.map(n=>[n.id,n])),paths=[];
  function walk(node,path=[]){
   const next=[...path,node];
   if(node.row===run.map.length-1){paths.push(next);return;}
   assert.ok(node.nextIds.length>0,'No dead ends');
   for(const id of node.nextIds){const child=byId.get(id);assert.ok(child&&child.row===node.row+1);walk(child,next);}
  }
  run.map[0].forEach(n=>walk(n));
  assert.ok(paths.some(p=>p.every(n=>!n.elite)),'Ordinary route exists');
  assert.ok(paths.every(p=>p.every((n,i)=>!n.elite||!p[i-1]?.elite)),'No consecutive elites');
  assert.ok(nodes.filter(n=>n.kind==='camp').every(n=>n.nextIds.length===1),'Rest has one known Dream destination');
  const reachable=new Set(paths.flat().map(n=>n.id));assert.equal(reachable.size,nodes.length);
  const restCounts=paths.map(p=>p.filter(n=>n.kind==='camp').length);
  const flightSeconds=paths.map(p=>p.reduce((v,n)=>v+n.duration,0));
  const forks=nodes.filter(n=>n.nextIds.length>1);
  const consequential=forks.filter(n=>new Set(n.nextIds.map(id=>{const c=byId.get(id);return [c.kind,c.routeStyle,c.rewardTheme,c.encounterFamily].join(':')})).size>1);
  rows.push({seed,difficulty,map,recipe:run.map[0][0].recipeId,paths:paths.length,forks:forks.length,distinctForks:consequential.length,restMin:Math.min(...restCounts),restMax:Math.max(...restCounts),durationMin:Math.min(...flightSeconds),durationMax:Math.max(...flightSeconds)});
  if(map<2){run.phase='map-clear';assert.ok(M.advanceMap(run));}
 }
}
const summary={maps:rows.length,recipes:[...new Set(rows.map(r=>r.recipe))],pathRange:[Math.min(...rows.map(r=>r.paths)),Math.max(...rows.map(r=>r.paths))],forks:rows.reduce((v,r)=>v+r.forks,0),distinctForks:rows.reduce((v,r)=>v+r.distinctForks,0),mapsWithRestTradeoff:rows.filter(r=>r.restMin!==r.restMax).length,secondsPerMap:[Math.min(...rows.map(r=>r.durationMin)),Math.max(...rows.map(r=>r.durationMax))]};
fs.writeFileSync('work/clear-sparks-routes-final.json',JSON.stringify({summary,rows,limits:['Paths differ in encounter type, theme or terrain profile; this does not prove players perceive or value the differences.','Includes authored retry restrictions separately in production; audit counts normal routes only.']},null,2));
console.log(summary);
