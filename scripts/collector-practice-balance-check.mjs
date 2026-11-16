// Matched real-engine diagnostic. This never supplies hidden layout data to the
// unchanged visible-observation human250 controller. Run each tree in a fresh process.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return [k,v.join('=')||true];}));
const tree=path.resolve(String(args.tree||'.')),otherTree=path.resolve(String(args.other||args.tree||'.'));
process.argv.push('--importOnly',`--source=${path.join(tree,'dist')}`);
const M=await import(pathToFileURL(path.join(tree,'dist/model.mjs')));
const otherM=await import(pathToFileURL(path.join(otherTree,'dist/model.mjs')));
const {getPickupSpec,pickupKind}=await import(pathToFileURL(path.join(tree,'dist/pickups.mjs')));
const {simulate}=await import(pathToFileURL(path.join(tree,'scripts/balance-current-flight.mjs')));
const round=n=>Number.isFinite(n)?Math.round(n*1000)/1000:n;
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const initialHashes=Object.fromEntries(fs.readdirSync(path.join(tree,'dist')).filter(f=>f.endsWith('.mjs')).map(f=>[f,hash(path.join(tree,'dist',f))]));
const controllerHashes=Object.fromEntries(['balance-current-flight.mjs','human-flight-planner.mjs','human-flight-perception.mjs'].map(f=>[f,hash(path.join(tree,'scripts',f))]));
const rows=[];

function play(r,n,controllerSeed,geometrySeed,extra={}){
 const telemetry={entry:{fuel:r.flame,skills:{...r.skills},mountedCards:r.mountedCards?.filter(Boolean).map(c=>c.cardId)||[],mapIndex:r.mapIndex,mapName:r.mapName,step:r.step,nodeId:n.id,levelId:n.levelId,biomeId:n.biomeId,difficulty:r.difficulty},pickups:[],lifts:[],attachments:[],frames:[]};
 const result=simulate({run:structuredClone(r),controllerSeed,skills:r.skills,fleet:r.companions,terrain:n.terrain,difficulty:r.difficulty,
  stage:n.row,role:'collector',style:'human250',seed:geometrySeed,duration:n.duration,profile:n.elite?'gauntlet':'refuge',practice:!!r.isTutorial,node:n,
  prepareEngine(e){
   // The Cards launcher supplies this flag in production. It enables native
   // overfill waves and the practice Guide loan without changing input policy.
   e.options.cardPilot=e.mod.cardPilot=true;
   telemetry.entry.capacity=e.maxFlame;
   telemetry.geometry={height:e.height,width:e.width,speed:e.baseSpeed,totalDistance:e.totalDistance,seed:geometrySeed,cardPilot:true,recoveryDuration:e.wisp.recoveryDuration(e),holes:e.blackHoles.items.map(h=>({id:h.id,x:h.x,y:h.y,bypass:h.bypass}))};
   telemetry.inventory=e.layout.embers.map(p=>({id:p.id,x:round(p.x),y:round(p.y),kind:pickupKind(p),fuel:getPickupSpec(p).fuel,feature:p.feature}));
   const collect=e.collect.bind(e);e.collect=p=>{const was=p.collected,before=e.flame;collect(p);if(!was&&p.collected)telemetry.pickups.push({time:round(e.time),id:p.id,kind:pickupKind(p),feature:p.feature,collector:!!p.deliveredByWisp,fuel:round(e.flame-before),y:round(e.player.y)});};
   const flap=e.flap.bind(e);e.flap=()=>{const fuel=e.flame,ok=flap();if(ok)telemetry.lifts.push({time:round(e.time),fuel:round(fuel),y:round(e.player.y)});return ok;};
   if(e.wisp.beginReel){const attach=e.wisp.beginReel.bind(e.wisp);e.wisp.beginReel=(...a)=>{const value=attach(...a);telemetry.attachments.push({time:round(e.time),id:a[1].id,seconds:round(e.wisp.cooldown)});return value;};}
   const die=e.beginDying.bind(e);e.beginDying=(...cause)=>{if(!e.dying)telemetry.fatal={time:round(e.time),cause:cause[0],fuel:round(e.flame),y:round(e.player.y),lastLift:telemetry.lifts.at(-1)||null,collectorPhase:e.wisp.phase,cargo:e.wisp.cargo?.id||null,remainingReel:round(e.wisp.cooldown),holeDrain:round(e.blackHoles.drained)};return die(...cause);};
   let lastSample=-1;const step=e.step.bind(e);e.step=dt=>{step(dt);if(e.time-lastSample>=.25||e.dying||e.completing){lastSample=e.time;telemetry.frames.push({time:round(e.time),fuel:round(e.flame),y:round(e.player.y),vy:round(e.player.vy),distance:round(e.distance),holeDrain:round(e.blackHoles.drained),collectorPhase:e.wisp.phase,cargo:e.wisp.cargo?.id||null,dying:e.dying});}};
   const destroy=e.destroy.bind(e);e.destroy=()=>{telemetry.end={holeDrain:round(e.blackHoles.drained),lastLift:telemetry.lifts.at(-1)||null,bodyPickups:telemetry.pickups.filter(p=>!p.collector).length,collectorDeliveries:telemetry.pickups.filter(p=>p.collector).length,fuel:round(e.flame),y:round(e.player.y),vy:round(e.player.vy),collectorPhase:e.wisp.phase,cargo:e.wisp.cargo?.id||null};destroy();};
  }});
 return {controllerSeed,...extra,...result,telemetry};
}

for(let controllerSeed=0;controllerSeed<Number(args.seeds||5);controllerSeed++){
 const s=M.newState();M.startTutorial(s);s.run.cardPilot=true;const stops=[];
 for(let stop=0;stop<6;stop++){
  const r=s.run,n=M.getChoices(r)[0];assert.ok(n);assert.ok(M.selectNode(r,n.id));
  if(n.type==='support'){assert.ok(M.resolveSupport(r,0,s.profile));stops.push({nodeId:n.id,support:true,fuel:r.flame});continue;}
  assert.ok(M.beginFlightAttempt(r));
  const row=play(r,n,controllerSeed,`prologue-${n.id}`,{mode:'first-light',lesson:n.tutorialLesson});rows.push(row);stops.push({nodeId:n.id,success:row.success});
  assert.ok(M.finishFlight(r,row.result));
  process.stdout.write(JSON.stringify({mode:row.mode,seed:controllerSeed,lesson:n.tutorialLesson,entry:row.startFuel,success:row.success,cause:row.fatalCause,time:row.time,end:row.endFuel,body:row.direct,collector:row.collector,holeDrain:row.telemetry.end.holeDrain,lastLift:row.telemetry.end.lastLift})+'\n');
  if(!row.success)break;
 }
 rows.push({mode:'first-light-sequence',controllerSeed,success:s.run.success===true,stops});
}

if(!args.practiceOnly)for(const difficulty of [1,2])for(let controllerSeed=0;controllerSeed<Number(args.seeds||5);controllerSeed++){
 const seed=`collector-practice-check-${controllerSeed}`,s=M.newState(),other=otherM.newState();
 s.profile.difficulty=other.profile.difficulty=2;s.profile.stats.wins=other.profile.stats.wins=1;
 s.run=M.createRun(s.profile,seed,difficulty,{cards:true});other.run=otherM.createRun(other.profile,seed,difficulty,{cards:true});s.run.cardPilot=other.run.cardPilot=true;
 const offers=M.getStartingGiftOffers(s.run),otherOffers=otherM.getStartingGiftOffers(other.run);
 const common=offers.filter(g=>otherOffers.some(o=>o.cardId===g.cardId)).sort((a,b)=>a.cardId.localeCompare(b.cardId));
 assert.ok(common.length,`No common legitimate starter for seed ${controllerSeed}`);const gift=common[0];assert.ok(M.chooseStartingGift(s,gift.id));
 const r=s.run,otherChoices=otherM.getChoices(other.run),n=M.getChoices(r).find(n=>otherChoices.some(o=>o.id===n.id));assert.ok(n,'No matching first passage');
 assert.ok(M.selectNode(r,n.id));assert.ok(M.beginFlightAttempt(r));
 const row=play(r,n,controllerSeed,`${r.seed}-${n.id}`,{mode:'ordinary-first-flight',starter:gift.cardId,offered:offers.map(g=>g.cardId),otherOffered:otherOffers.map(g=>g.cardId)});rows.push(row);
 process.stdout.write(JSON.stringify({mode:row.mode,difficulty,seed:controllerSeed,starter:gift.cardId,map:r.mapName,level:n.levelId,entry:row.startFuel,success:row.success,cause:row.fatalCause,time:row.time,end:row.endFuel,body:row.direct,collector:row.collector,holeDrain:row.telemetry.end.holeDrain,lastLift:row.telemetry.end.lastLift})+'\n');
}
const sourceUnchanged=Object.entries(initialHashes).every(([f,h])=>h===hash(path.join(tree,'dist',f)));
const report={createdAt:new Date().toISOString(),tree,variant:args.variant||'current',baselineCommit:'05bd2ba70331b1aef418baecc9ee17208de71c33',sourceUnchanged,initialHashes,controllerHashes,method:{actualEngine:true,engineHz:60,viewport:{width:900,height:405},fuelUnits:'Internal engine units; multiply by .3 for displayed Sparks.',humanPolicy:'Unchanged human250 perception, .25 s reaction, .07 s jitter, .14 s cadence, .30 missed attention; same policy and input seeds in both variants.',practiceGeometry:'Same authored nodes and prologue-${node.id} seed as committed three-controller regression, with real Cards launcher flag.',ordinaryGeometry:'Same legal campaign seed, A1/A2, common offered starter, same reachable first node, real Cards launcher flag. Each source builds its actual own modules.',limitations:['Synthetic descriptive samples, not human win rates.','A failure stops its actual practice sequence; no fabricated fuel or skipped failures.','Current rendering and device input latency are not measured.']},rows};
assert.ok(sourceUnchanged,'Source changed during comparison');
const output=path.resolve(String(args.out||'work/collector-practice-check/current.json'));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
