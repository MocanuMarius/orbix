import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Observe the exact layout immediately before promotions. The paired control
// also restores the old fixed contact radius. Neither path edits game files.
let beforeField=null,baseline=false,padFuel=false;
const instrument=Symbol.for('wispbound.spark-size-probe');
globalThis[instrument]={before:layout=>beforeField?.(layout),baseline:()=>baseline,padFuel:()=>padFuel};
registerHooks({load(url,context,next){
  if(!url.startsWith('file:'))return next(url,context);
  const name=new URL(url).pathname.split('/').at(-1),hook='globalThis[Symbol.for("wispbound.spark-size-probe")]';
  if(!['spark-fields.mjs','pickups.mjs'].includes(name))return next(url,context);
  let source=readFileSync(fileURLToPath(url),'utf8');
  if(name==='spark-fields.mjs'){
    source=source.replace('export function installSparkField','function liveInstallSparkField')+
      `\nexport function installSparkField(layout,options){${hook}.before(layout);if(!${hook}.baseline())liveInstallSparkField(layout,options);}`;
  }else{
    const signature='export function pickupContactRadius(packet,height){';
    assert.ok(source.includes(signature),'update probe hook when the contact API changes');
    source=source.replace(signature,'function liveContactRadius(packet,height){')+
      `\nexport function pickupContactRadius(packet,height){
        const spec=getPickupSpec(packet);
        if(${hook}.baseline())return spec.contactRadius;
        const radius=liveContactRadius(packet,height);
        return ${hook}.padFuel()&&spec.plasma?Math.max(spec.contactRadius,radius):radius;
      }`;
  }
  return {format:'module',source,shortCircuit:true};
}});

const {createRun,newState,getRunModifiers,advanceMap}=await import('../dist/model.mjs');
const {WispFlight,circleHitsObstacle,seededRandom}=await import('../dist/flight.mjs');
const {getPickupSpec,pickupKind,pickupContactRadius}=await import('../dist/pickups.mjs');
const {sparkMass,sparkBodyRadius,GIANT_SPARK_RATE}=await import('../dist/spark-size.mjs');
const {glowPoints}=await import('../dist/vitality.mjs');
const opts=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const seedCount=Number(opts.seeds||180),pairedPerGuardian=Number(opts.pairs??4);
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
const fuelPool=layout=>glowPoints(layout.embers.reduce((sum,p)=>sum+(!p.generated&&getPickupSpec(p).plasma?getPickupSpec(p).fuel:0),0));
const percent=(n,d)=>d?Number((100*n/d).toFixed(3)):0,round=v=>Number(v.toFixed(2));
const bossCases=new Map(),totals=new Map();
function group(name){
  if(!totals.has(name))totals.set(name,{layouts:0,good:0,dark:0,dusk:0,giantFuel:0,giantDark:0,rolledGood:0,rolledDark:0,
    before:0,after:0,atLeastOne:0,protectedChanged:0,bypassFailures:0,masses:{}});
  return totals.get(name);
}
function checkBypass(e,p){
 const rim=pickupContactRadius(p,e.height),safeRadius=Math.max(16,e.player.radius+5);
 const strips=[-1,1].map(side=>{
   const y=p.y+side*(rim+16);
   for(let x=p.x-(rim+16)*1.6;x<=p.x+(rim+16)*1.6;x+=8){
     if(y<safeRadius||y>e.height-safeRadius||e.layout.obstacles.some(o=>
        !o.destroyed&&x+safeRadius>=o.x-o.width&&x-safeRadius<=o.x+o.width*2.5&&
        [-1,1].some(sign=>circleHitsObstacle(x,y,safeRadius,o,0,o.center+sign*Math.abs(o.motion||0)))))return false;
   }
   return true;
 });
 return strips.some(Boolean);
}
function report(){
 return Object.fromEntries([...totals].map(([key,s])=>[key,{layouts:s.layouts,good:s.good,dark:s.dark,dusk:s.dusk,masses:s.masses,
   giantFuel:s.giantFuel,giantDark:s.giantDark,giantPercent:percent(s.giantFuel+s.giantDark,s.good+s.dark),
   goodGiantPercent:percent(s.giantFuel,s.good),darkGiantPercent:percent(s.giantDark,s.dark),
   rolledGood:s.rolledGood,rolledDark:s.rolledDark,layoutsWithGiant:s.atLeastOne,
   baselineMeanFieldFuel:round(s.before/s.layouts),meanFieldFuel:round(s.after/s.layouts),fieldFuelIncreasePercent:percent(s.after-s.before,s.before),
   bypassFailures:s.bypassFailures,protectedChanged:s.protectedChanged}]));
}
for(let i=0;i<seedCount;i++){
 const difficulty=[1,3,6][Math.floor(i/4)%3],mapIndex=Math.floor(i/12)%3,category=['opening','flight','elite','guardian'][i%4];
 const profile=newState().profile;profile.difficulty=difficulty;
 const run=createRun(profile,'size-audit-'+i,difficulty);
 for(let m=0;m<mapIndex;m++){run.phase='map-clear';assert.ok(advanceMap(run));}
 const nodes=run.map.flat();
 const candidates=category==='guardian'?nodes.filter(n=>n.boss):category==='elite'?nodes.filter(n=>n.elite):
   category==='opening'?nodes.filter(n=>n.row===0&&n.type==='flight'):nodes.filter(n=>n.row>0&&n.row<6&&n.type==='flight'&&!n.elite);
 const n=candidates[i%Math.max(1,candidates.length)]||nodes.find(n=>n.type==='flight');
 const seed=`${run.seed}-${n.id}`;run.current=n;
 let before,protectedSnaps,ledger;
 beforeField=layout=>{
   before=fuelPool(layout);ledger=layout.embers.map(p=>({p,kind:pickupKind(p)}));
   protectedSnaps=layout.embers.filter(p=>p.riskChain||p.intro||p.forkCache||p.atlasBypass||p.challengeLandmark).map(p=>({p,kind:pickupKind(p),x:p.x,y:p.y}));
 };
 const engine=new WispFlight({canvas,preflight:true,seed,node:n,terrain:n.terrain,duration:n.duration,
    elite:n.elite,companions:['collector'],modifiers:getRunModifiers(run)});
 beforeField=null;assert.ok(Number.isFinite(before));
 const natural=ledger.filter(({p,kind})=>!p.generated&&['light','cluster','cache','dark'].includes(kind));
 const roll=seededRandom(seed+':spark-masses');
 const counts={good:0,dark:0,dusk:ledger.filter(({p,kind})=>!p.generated&&kind==='dusk').length,giantFuel:0,giantDark:0,rolledGood:0,rolledDark:0,masses:{}};
 let bypassFailures=0;
 for(const {p,kind} of natural){
   const dark=kind==='dark',mass=sparkMass(p);counts[dark?'dark':'good']++;
   counts.masses[mass]=(counts.masses[mass]||0)+1;
   if(roll()<GIANT_SPARK_RATE) counts[dark?'rolledDark':'rolledGood']++;
   if(mass===10){
     counts[dark?'giantDark':'giantFuel']++;
     assert.equal(getPickupSpec(p).fuel,dark?0:200);
     assert.equal(sparkBodyRadius(p,engine.height),engine.height/4);
     if(dark&&!checkBypass(engine,p))bypassFailures++;
   }
 }
 const protectedChanged=protectedSnaps.filter(({p,kind,x,y})=>pickupKind(p)!==kind||p.x!==x||p.y!==y||p.sparkMass>3).length;
 const actual=fuelPool(engine.layout);assert.ok(actual>=before,'field may not remove base fuel');
 for(const label of ['all','tier'+difficulty,n.boss?'guardian':n.elite?'elite':category==='opening'?'opening':'flight']){
   const g=group(label);g.layouts++;g.before+=before;g.after+=actual;g.bypassFailures+=bypassFailures;g.protectedChanged+=protectedChanged;
   for(const [k,v] of Object.entries(counts))if(k!=='masses')g[k]+=v;
   for(const [m,v] of Object.entries(counts.masses))g.masses[m]=(g.masses[m]||0)+v;
   if(counts.giantDark+counts.giantFuel)g.atLeastOne++;
 }
 if(n.boss){
   const cases=bossCases.get(n.bossId)||[];
   if(cases.length<pairedPerGuardian)cases.push({node:n,seed,terrain:n.terrain,difficulty,stage:n.row,profile:n.elite?'gauntlet':'refuge',
     role:'collector',style:'human250',skills:{'main-efficiency':1,'main-sight':1},fleet:['collector'],duration:n.duration});
   bossCases.set(n.bossId,cases);
 }
 engine.destroy();
 if(i===35)console.log('Interim distribution',JSON.stringify(report().all));
}
const distribution=report();console.log('Distribution',JSON.stringify(distribution));
assert.equal(distribution.all.protectedChanged,0,'a protected packet was relocated or promoted');
assert.equal(distribution.all.bypassFailures,0,'giant Dark Spark had no continuous body-width alternative');

// Same actual campaign guardian and human reaction seed for each paired trial:
// a fresh baseline with original hit radii vs. the full contemporary size rule.
if(pairedPerGuardian>0){
 process.argv.push('--importOnly');
 const {simulate}=await import('./balance-current-flight.mjs');
 const paired=[],arms=opts.padding?['original','sizes','oldFuelPadding']:['original','sizes'];
 for(const [boss,cases] of bossCases)for(const config of cases){
   const results={boss,seed:config.seed,tier:config.difficulty,map:config.node.mapIndex};
   for(const arm of arms){
     baseline=arm==='original';padFuel=arm==='oldFuelPadding';const r=simulate(config);
     results[arm]={clear:r.success,reason:r.fatalCause,progress:r.progress,lowFuel:r.lowFuelAtDeath,lifts:r.flaps,restored:glowPoints(r.fuelRestored)};
   }
   paired.push(results);
 }
 baseline=false;padFuel=false;
 const summary={};
 for(const arm of arms){
   summary[arm]={clear:paired.filter(p=>p[arm].clear).length,meanProgress:round(paired.reduce((n,p)=>n+p[arm].progress,0)/paired.length),
     lowFuelDeaths:paired.filter(p=>!p[arm].clear&&p[arm].lowFuel).length,meanRestored:round(paired.reduce((n,p)=>n+p[arm].restored,0)/paired.length)};
 }
 console.log('Guardian pairs (250ms reaction, 140ms observation cadence, 30% missed cues)',
   JSON.stringify({pairs:paired.length,summary,changedOutcomes:paired.filter(p=>p.original.clear!==p.sizes.clear),...(opts.details?{cases:paired}:{})}));
}
