import {getPickupSpec} from './pickups.mjs?v=authored-biomes-1';
import {glowPoints,getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=authored-biomes-1';
import {condenseGlow,getCondensationRules} from './condensed-glow.mjs?v=authored-biomes-1';
import {pickupArtSvg} from './pickup-art.mjs?v=authored-biomes-1';
import {resourceSymbol} from './game-symbols.mjs?v=authored-biomes-1';
import {skillIcon} from './upgrade-icons.mjs?v=authored-biomes-1';
import {SPARK_TIERS} from './spark-size.mjs?v=authored-biomes-1';

const fuelSizes=SPARK_TIERS.map(({mass,name})=>{
 const kind=mass===1?'light':mass===2?'cluster':'cache';
 return {kind,name,value:glowPoints(getPickupSpec({kind,sparkMass:mass}).fuel)};
});

// An independent teaching meter. Previewing, skipping and replaying never touch a save.
export function resourceCycleSteps(run={},mod={}){
 const fuel=glowPoints(getPickupSpec('cluster').fuel),max=glowPoints(getGlowCapacity(run));
 const refill=Math.min(fuel/2,max),before=max-refill,extra=fuel-refill;
 const lift=mod.liftCostPoints||3,rules=mod.condensationRules||getCondensationRules(run.skills);
 const packed=condenseGlow(extra/GLOW_DISPLAY_SCALE,{rules,wallet:run.condensedGlow||0}).amount;
 const data={before,max,packed,lift,values:fuelSizes.map(t=>t.value)};
 return [
  ['Touch a Spark',`Larger Sparks hold more fuel. The smallest gives 6; a rare giant gives 60. This Cluster adds ${fuel} to your Spark Meter before bonuses.`],
  ['Fill your Spark Meter',`At ${before}/${max}, only ${refill} fit. Tap anywhere to Lift. Each Lift uses ${lift} Spark${lift===1?'':'s'} from the meter.`],
  ['Store the surplus',`The upper-left box converts the spare ${extra} into ${packed} Stored Spark${packed===1?'':'s'}. Open Skills to spend banked Stored Sparks.`]
 ].map(([title,text],i)=>({title,text,visual:'resource-cycle',cycle:{...data,stage:i},allowTarget:false,actionLabel:i===2?'Got it':'Next',skipLabel:'Remember & skip'}));
}
const art=(x,y,size,svg)=>svg.replace(/<svg\b([^>]*)>/,(_,attrs)=>`<svg x="${x}" y="${y}" width="${size}" height="${size}"${attrs.replace(/\s(?:width|height)="[^"]*"/g,'')}>`);
// Use the same pickup and HUD glyphs as the playable flight; position them at their HUD locations.
export function resourceCycleArt({stage=0,before=24,max=30,lift=3,packed=1}={}){
 const backdrop='<path fill="#101d24" d="M0 6H5V1H226v3h5v111h-5v4H4v-4H0z"/><path fill="#243835" d="M1 17l20 7 34-11 25 16 22-8 17 13 40-18 28 8 24-15 20 5V6H1zM1 112l19-10 20 6 26-11 34 10 39-15 26 6 26-15 21 8 19-8v34H1z"/>';
 const wrap=(label,content)=>`<svg class="cycle-scene" viewBox="0 0 232 120" role="img" aria-label="${label}" shape-rendering="crispEdges">${backdrop}${content}</svg>`;
 const number=(x,y,value,color='#fff2c6')=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="middle" style="font-size:18px">${value}</text>`;
 if(stage===0){
  const centers=[20,53,94,143,200],diameters=[24,33,43,53,65];
  const lineup=fuelSizes.map(({kind,value},i)=>{
   const d=diameters[i],x=centers[i];
   return art(x-d/2,51-d/2,d,pickupArtSvg(kind))+number(x,99,'+'+value);
  }).join('');
  return wrap(fuelSizes.map(s=>`${s.name}: ${s.value} Sparks`).join(', '),lineup);
 }
 const cells=Math.max(1,Math.ceil(max/lift)),height=55/cells;
 const bars=Array.from({length:cells},(_,i)=>{
  const fresh=i*lift>=before;
  return `<rect x="25" y="${106-(i+1)*height}" width="9" height="${Math.max(1,height-.8)}" fill="${stage===1&&fresh?'#fff5b7':'#c6e4ba'}"/>`;
 }).join('');
 const flow=stage===1?'M156 60C123 32 100 31 70 46L37 53':'M29 49C29 44 29 40 29 33';
 const signal=`<path d="${flow}" stroke="#729686" stroke-width="2" fill="none" stroke-dasharray="2 4"/><path class="cycle-flight" d="${flow}" fill="none" stroke="#fff2bb" stroke-width="4" pathLength="100" stroke-dasharray="9 91"/>`;
 const box=`<g opacity="${stage===2?1:.55}">${art(9,0,40,resourceSymbol('packed'))}${number(64,26,stage===2?'+'+packed:0,'#ffe0a2')}</g>`;
 const contents=`${box}${bars}${number(74,102,max+'/'+max)}${signal}`;
 if(stage===1)return wrap(`The Spark Meter goes from ${before} to ${max} of ${max}.`,contents+art(135,23,88,pickupArtSvg('cluster')));
 const skill=art(139,28,74,skillIcon({id:'main-sight'}));
 const arrow='<path fill="#9da883" d="M98 53h27v-4l9 7-9 7v-5H98z"/>';
 return wrap(`Surplus from the full Spark Meter adds ${packed} to the upper-left box. Spend banked Stored Sparks on skills.`,contents+arrow+skill);
}
