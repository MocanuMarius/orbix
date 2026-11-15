import fs from 'node:fs';
import {WispFlight} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {getRunModifiers} from '../dist/model.mjs';
import {getFlightLengthProfile} from '../dist/level-length.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,v]=a.replace(/^--/,'').split('=');return[k,v??true];}));
const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:915,height:412})};
const rows=[],tiers=args.quick?[1,2]:[1,2,6],maps=args.quick?[0]:[0,1,2],stages=args.quick?[0]:[0,2,5];
for(const level of BIOME_LEVELS)for(const difficulty of tiers)for(const mapIndex of maps)for(const stage of stages){
 const seed=`supply-audit:${level.id}:${difficulty}:${mapIndex}:${stage}`;
 const length=getFlightLengthProfile({seed,mapIndex,row:stage});
 const node={...level,...length,levelId:level.id,type:'flight',row:stage,encounterStage:stage,mapIndex,difficulty};
 const e=new WispFlight({canvas,preflight:true,terrain:level.terrain,seed,node,duration:node.duration,
  companions:['collector'],modifiers:getRunModifiers({skills:{},companions:['collector']})});
 rows.push({level:level.id,mapIndex,stage,difficulty,seconds:e.duration,...e.layout.sparkSupply});e.destroy();
}
const excess=rows.filter(r=>r.budgetExcess>0),deficit=rows.filter(r=>r.budgetDeficit>=20);
const report={cases:rows.length,excess,deficit,maxExcess:Math.max(0,...excess.map(r=>r.budgetExcess)),
 minShare:Math.min(...rows.map(r=>r.requiredShare)),maxShare:Math.max(...rows.map(r=>r.requiredShare)),rows};
const out=String(args.out||'work/spark-demand-audit.json');fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({out,cases:rows.length,excess:excess.length,deficit:deficit.length,maxExcess:report.maxExcess,
 minShare:report.minShare,maxShare:report.maxShare,examples:excess.slice(0,5).map(r=>({level:r.level,target:r.targetSparks,available:r.availableSparks,count:r.count}))}));
if(excess.length||deficit.length)process.exitCode=1;
