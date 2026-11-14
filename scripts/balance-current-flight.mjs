import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const[k,...v]=arg.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
const work=path.join(root,'work'),snapshot=path.join(work,'balance-flight-baseline-src');
fs.mkdirSync(work,{recursive:true});
if(!fs.existsSync(snapshot)){
 fs.mkdirSync(snapshot,{recursive:true});
 for(const name of fs.readdirSync(path.join(root,'dist')).filter(name=>name.endsWith('.mjs')))
  fs.copyFileSync(path.join(root,'dist',name),path.join(snapshot,name));
}
const source=!args.source||args.source==='current'?path.join(root,'dist'):args.source&&args.source!=='baseline'?path.resolve(root,String(args.source)):snapshot;
const hashNames=['flight.mjs','flight-challenges.mjs','boss.mjs','drafts.mjs','wisp.mjs','vitality.mjs','model.mjs','pickups.mjs','companion-abilities.mjs','scene-props.mjs','biome-dynamics.mjs','glow-budget.mjs'];
const hashes=()=>Object.fromEntries(hashNames.map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(source,name))).digest('hex')]));
const initialHashes=hashes();
const {WispFlight,FLIGHT_TUNING,FLAME_TUNING,obstaclePolygons,circleHitsPolygon}=await import(pathToFileURL(path.join(source,'flight.mjs')));
const {getRunModifiers,ROUTE_PROFILES}=await import(pathToFileURL(path.join(source,'model.mjs')));
const {getFlightLengthProfile}=await import(pathToFileURL(path.join(source,'level-length.mjs')));
const {getLevelIdentity,BIOME_LEVELS}=await import(pathToFileURL(path.join(source,'level-catalog.mjs')));
const {getPickupSpec,pickupKind,pickupContactRadius}=await import(pathToFileURL(path.join(source,'pickups.mjs')));
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Number.isFinite(n)?Math.round(n*100)/100:n;
const mean=values=>values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null;
const rngFor=seed=>{let value=2166136261;for(const c of seed)value=Math.imul(value^c.charCodeAt(0),16777619);return()=>{value+=0x6d2b79f5;let n=value;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};};
function canvas(){
 const gradient={addColorStop(){}};
 const context=new Proxy({globalAlpha:1},{get:(target,key)=>target[key]??(String(key).includes('Gradient')?()=>gradient:()=>{}),set:(target,key,value)=>(target[key]=value,true)});
 return{style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})};
}
function subtractIntervals(blocked,height){
 blocked.sort((a,b)=>a[0]-b[0]);let low=29;const bands=[];
 for(const[a,b]of blocked){if(b<low)continue;if(a>low)bands.push([low,Math.min(a,height-30)]);low=Math.max(low,b);if(low>=height-30)break;}
 if(low<height-30)bands.push([low,height-30]);return bands.filter(([a,b])=>b-a>2);
}
// Conservative square-expanded polygon slices guide the bot. Real gameplay
// collision remains the engine's circle-vs-polygon check at every 1/60 step.
function safeBands(polygons,x,height,radius=12){
 const blocked=[];
 for(const poly of polygons)for(const sx of[x-radius,x,x+radius]){
  const cuts=[];
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[j],b=poly[i];if((a[0]>sx)!==(b[0]>sx))cuts.push(a[1]+(b[1]-a[1])*(sx-a[0])/(b[0]-a[0]));
  }
  cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2)blocked.push([cuts[i]-radius,cuts[i+1]+radius]);
 }
 return subtractIntervals(blocked,height);
}
function bandCost(y,bands){
 let best=Infinity,center=310,margin=-Infinity;
 for(const[a,b]of bands){const c=(a+b)/2,inside=y>=a&&y<=b,clear=inside?Math.min(y-a,b-y):-Math.min(Math.abs(y-a),Math.abs(y-b));
  const score=inside?(.004*(y-c)**2+14/(clear+3)):100000+Math.min(Math.abs(y-a),Math.abs(y-b))*1000;
  if(score<best){best=score;center=c;margin=clear;}}
 return{cost:best,center,margin};
}
function futureSpeed(e,t){const swift=e.fleet.find(item=>item.role==='swift');return e.baseSpeed*(swift?.remaining>t?1.48:1);}
function advancePrediction(e,node,dt,t,flap){
 let{y,vy,fuel,lastLift}=node;
 const level=e.fleet.find(item=>item.role==='leveler'),leveling=level?.remaining>t&&!flap&&!node.levelCanceled;
 if(flap){vy=-FLIGHT_TUNING.flapImpulse*e.scaleY*clamp(e.mod.flap,.8,1.2);fuel-=e.flapCost;lastLift=t;}
 const sub=dt/3;
 for(let k=0;k<3;k++){
  let acceleration=FLIGHT_TUNING.gravity*e.scaleY*clamp(e.mod.gravity,.8,1.2);
  if(leveling){const bob=Math.sin((e.time+t-level.startedAt)*2.8)*12*e.scaleY*(1-clamp(e.mod.levelerSteadiness||0,0,1));
   const target=clamp((e.levelTargetY??e.player.y)+bob,40,e.height-40);acceleration=clamp((target-y)*26-vy*9,-350*e.scaleY,350*e.scaleY);}
  const wx=e.distance+e.player.x+futureSpeed(e,t)*(t+k*sub);
  const gust=e.drafts.sample(e.time+t+k*sub,wx,y,(e.mod.windSensitivity||1)*(e.ascentInfo.draftForceScale||1));
  if(gust.active){const resistance=e.fleet.find(item=>item.role==='swift')?.remaining>t?1-(e.mod.swiftResistance||.72):1;
   acceleration+=gust.direction*gust.force*e.scaleY*resistance;}
  vy=clamp(vy+acceleration*sub,-520*e.scaleY,FLIGHT_TUNING.terminalFall*e.scaleY);y+=vy*sub;
 }
 return{y,vy,fuel,lastLift,levelCanceled:node.levelCanceled||flap};
}
function powerInput(e,style,target){
 if(!e.hasActiveCompanions||e.dying)return false;
 const level=e.fleet.find(item=>item.role==='leveler');
 if(level?.remaining>0)return style!=='safety'&&target&&Math.abs(target.y-e.player.y)>45&&target.eta<.8;
 const ready=e.fleet.filter(item=>!['collector','protector','kindler'].includes(item.role)&&item.cooldown<=.001&&item.remaining<=0);
 if(!ready.length||e.time<2)return false;
 if(ready.some(item=>item.role==='seer'))return true;
 if(ready.some(item=>item.role==='leveler'))return e.player.vy>0&&(!target||target.eta>1.4||Math.abs(target.y-e.player.y)<25);
 return ready.some(item=>item.role==='swift')&&(e.flame<45||!target||target.eta<.35);
}
function preciseFuelInput(e,target,memory,visible){
 const world=e.distance+e.player.x;
 const xAt=t=>world+e.baseSpeed*(t+.48*Math.min(t,e.boostTime));
 const horizon=Math.min(1.8,(e.width-e.player.x)/Math.max(e.baseSpeed, futureSpeed(e,0)));
 const samples=[.12,.24,.40,.60,.80,1,1.2,1.4,1.6,1.8].filter(t=>t<=horizon+.001);
 const geometry=samples.map(t=>visible.flatMap(obstacle=>obstaclePolygons(obstacle,e.time+t)));
 const next=visible.find(obstacle=>obstacle.x+obstacle.width*2.5>world);
 const center=next?e.obstacleCenter(next):e.height*.5;
 let best=Infinity,action=Infinity;
 for(const delay of[0,.05,.10,.15,.25,.40,.60,.85,1.10,1.35,Infinity]){
  if(delay<.30-(e.time-memory.lastLift)-.001||delay===0&&e.flame<e.flapCost)continue;
  let state={y:e.player.y,vy:e.player.vy,fuel:e.flame,lastLift:memory.lastLift-e.time,levelCanceled:false};
  const path=[state.y];let fired=false;
  for(let t=0;t<1.9;t+=1/60){const flap=!fired&&t>=delay-1e-8;
   state=advancePrediction(e,state,1/60,t,flap);if(flap)fired=true;path.push(state.y);}
  const at=t=>path[Math.min(path.length-1,Math.round(t*60))];
  let score=Number.isFinite(delay)?e.flapCost*.5/(1+delay):0;
  for(let i=0;i<samples.length;i++){
   const t=samples[i],y=at(t),x=xAt(t);
   if(y<28||y>e.height-29)score+=100000*(1.5-t*.3);
   if(geometry[i].some(poly=>circleHitsPolygon(x,y,e.player.radius+2,poly)))score+=50000*(1.5-t*.3);
   const desired=target?center+(target.y-center)*Math.min(1,t/Math.max(.1,target.eta)):center;
   score+=Math.max(0,Math.abs(y-desired)-(target?6:16))**2*.0015;
  }
  // React to visible falling scenery, using a coarse trajectory estimate rather
  // than silently ignoring a lethal class of objects (the old controller did).
  for(const actor of e.biomeDynamics?.items||[]){
   if(actor.family!=='fall'||!['warning','falling'].includes(actor.phase))continue;
   const ahead=actor.x-world;if(ahead<0||ahead>Math.min(e.width-e.player.x,e.getLightState().radius*2.1))continue;
   const eta=ahead/e.baseSpeed;if(eta>1.8)continue;
   const fallingFor=actor.phase==='falling'?eta:Math.max(0,eta-(1.2-actor.age));
   if(actor.phase==='warning'&&fallingFor===0)continue;
   const predictedY=actor.y+(actor.phase==='falling'?actor.vy:14*e.scaleY)*fallingFor+215*e.scaleY*fallingFor*fallingFor;
   if(predictedY>actor.floorY+15)continue;
   const separation=Math.abs(at(eta)-predictedY);
   if(separation<actor.radius+e.player.radius+18)score+=60000;
  }
  for(const attack of e.layout.boss?.attacks||[]){
   if(e.layout.boss.id!=='frost-matron'||attack.spent||attack.trigger==null)continue;
   const eta=(attack.x-world)/e.baseSpeed;if(eta<0||eta>1.8)continue;
   const age=e.time-attack.trigger+eta;if(age<2.2)continue;
   const side=attack.side||-1,scale=e.height/620;
   const iceY=attack.center+side*attack.baseGap/2-side*(age-2.2)*110*scale;
   if(side*(iceY-attack.center)>-8*scale&&Math.abs(at(eta)-iceY)<e.player.radius+17*scale+12)score+=65000;
  }
  if(target){
   const eta=Math.min(1.8,target.eta),y=at(eta),desired=center+(target.y-center)*Math.min(1,1.8/Math.max(.1,target.eta));
   score+=Math.max(0,Math.abs(y-desired)-8)**2*(target.eta<1.8?.26:.012);
  }
  if(score<best){best=score;action=delay;}
 }
 return{flap:action<.025,delay:action,target:target?{id:target.packet.id,x:target.x-e.distance,y:target.y}:null};
}
function choose(e,style,memory){
 const random=memory.random,world=e.distance+e.player.x,sight=Math.min(e.width-e.player.x,e.getLightState().radius*2.1);
 const nearby=e.getNearbyPickups();
 const targets=style==='safety'||e.flame>=e.maxFlame*.90?[]:nearby.filter(packet=>{
  const x=packet.x-e.distance,kind=pickupKind(packet),spec=getPickupSpec(packet);
  if(memory.human&&!memory.noticed.has(packet.id))memory.noticed.set(packet.id,memory.random()>=memory.human.drop*.5);
  if(memory.human&&!memory.noticed.get(packet.id))return false;
  return!packet.collected&&!packet.carried&&!packet.attracted&&!packet.generated&&spec.fuel>0&&kind!=='dark'
    &&(kind!=='dusk'||e.flame<e.maxFlame*.40)&&x>e.player.x-12&&x<=e.player.x+sight;
 });
 targets.sort((a,b)=>a.x-b.x);
 const packet=targets[0],target=packet?{packet,x:packet.x,y:packet.y,eta:(packet.x-world)<=e.baseSpeed*1.48*e.boostTime?(packet.x-world)/(e.baseSpeed*1.48):e.boostTime+((packet.x-world)-e.baseSpeed*1.48*e.boostTime)/e.baseSpeed,radius:pickupContactRadius(packet)}:null;
 if(powerInput(e,style,target)){
  if(memory.human){
   if(e.time>=memory.powerGate){
    memory.powerGate=e.time+Math.max(3,Math.min(...e.fleet.filter(item=>!['collector','protector','kindler'].includes(item.role)).map(item=>e.roleCooldown(item.role))));
    if(memory.random()<memory.human.drop)memory.missedPower++;else memory.pendingPower=e.time+memory.human.reaction;
   }
  }else e.activateAbility();
 }
 const visible=e.getNearbyObstacles().filter(obstacle=>obstacle.x-obstacle.width*.8<=world+sight&&obstacle.x+obstacle.width*2.5>=world-20);
 if(style==='fuel'||style.startsWith('human'))return preciseFuelInput(e,target,memory,visible);
 const dt=.06,steps=28;
 const slices=[];let wx=world;
 for(let i=1;i<=steps;i++){
  const t=i*dt;wx+=futureSpeed(e,t)*dt;
  const polygons=visible.flatMap(obstacle=>obstaclePolygons(obstacle,e.time+t));
  slices.push({t,x:wx,bands:safeBands(polygons,wx,e.height,12)});
 }
 let states=[{y:e.player.y,vy:e.player.vy,fuel:e.flame,lastLift:memory.lastLift-e.time,score:0,first:false,flaps:0,targetCaptured:false}];
 const noisy=style==='imperfect',bias=noisy?(random()-.5)*18:0;
 for(const slice of slices){
  const expanded=[];
  for(const node of states)for(const flap of[false,true]){
   if(flap&&(slice.t-dt-node.lastLift<.30||node.fuel<e.flapCost))continue;
   const next=advancePrediction(e,node,dt,slice.t-dt,flap),band=bandCost(next.y,slice.bands);
   next.targetCaptured=node.targetCaptured;
   let cost=band.cost+(flap?style==='safety'?2:3:0);
   if(next.fuel<e.flapCost*2)cost+=2;
   if(target){
    const near=Math.exp(-Math.abs(slice.t-target.eta)*3),error=next.y-(target.y+bias);
    cost+=error*error*.012*near*(e.flame<35?2:1);
    const previousX=slice.x-futureSpeed(e,slice.t)*dt,dx=slice.x-previousX,dy=next.y-node.y;
    const along=clamp(((target.x-previousX)*dx+(target.y-node.y)*dy)/(dx*dx+dy*dy||1),0,1);
    const distance=Math.hypot(previousX+dx*along-target.x,node.y+dy*along-target.y);
    if(!node.targetCaptured&&distance<target.radius){
      cost-=800*(e.flame<45?2:1);next.targetCaptured=true;
      const spec=getPickupSpec(target.packet);next.fuel=Math.min(100,next.fuel+spec.fuel+e.fuelBonus+(e.hasCompanion('kindler')?(e.mod.kindlerBonus||6):0));
    }
   }
   for(const dark of nearby){if(pickupKind(dark)!=='dark'||dark.collected)continue;
    if(Math.hypot(slice.x-dark.x,next.y-dark.y)<pickupContactRadius(dark)+4)cost+=350;}
   expanded.push({...next,score:node.score+cost,first:slice.t===dt?flap:node.first,flaps:node.flaps+Number(flap)});
  }
  expanded.sort((a,b)=>a.score-b.score);states=expanded.slice(0,7);if(!states.length)break;
 }
 let flap=states[0]?.first||false;
 if(noisy&&random()<.075)flap=false;
 if(noisy&&e.time-memory.lastLift<.42)flap=false;
 return{flap,target:target?{id:packet.id,x:packet.x-e.distance,y:packet.y}:null};
}
const geometryCache=new Map();
function diagnoseLayout(e,key){
 if(geometryCache.has(key))return geometryCache.get(key);
 const points=[],empty=[];let smallest=Infinity;
 for(let x=250;x<e.totalDistance;x+=80){
  const time=Math.max(0,(x-e.player.x)/e.baseSpeed),near=e.layout.obstacles.filter(o=>!o.destroyed&&x>=o.x-o.width*.8-14&&x<=o.x+o.width*2.5+14);
  const polygons=near.flatMap(o=>obstaclePolygons(o,time)),bands=safeBands(polygons,x,e.height,12);
  const width=bands.length?Math.max(...bands.map(([a,b])=>b-a)):0;smallest=Math.min(smallest,width);
  if(!bands.length){let actualFits=false;
   for(let y=28;y<=e.height-29;y+=2)if(!polygons.some(poly=>circleHitsPolygon(x,y,e.player.radius,poly))){actualFits=true;break;}
   if(!actualFits)empty.push({x:round(x),nominalTime:round(time),moving:near.some(o=>o.motion>0)});
  }
  points.push(width);
 }
 const fuel=e.layout.embers.filter(p=>!p.generated&&['light','cache'].includes(pickupKind(p))).sort((a,b)=>a.x-b.x);
 const gaps=[];let previous=e.player.x;
 for(const p of fuel){gaps.push((p.x-previous)/e.baseSpeed);previous=p.x;}gaps.push((e.totalDistance+e.player.x-previous)/e.baseSpeed);
 const result={sampledCrossSections:points.length,minLargestConservativeFreeBand:round(smallest),emptyBodyCrossSections:empty,
  sampledStaticBlockCount:empty.filter(p=>!p.moving).length,mandatoryFuelCount:fuel.length,maxMandatoryFuelGapSeconds:round(Math.max(0,...gaps)),
  caveWindows:(e.layout.challenges||[]).filter(c=>c.type==='dark-cave').length,
  draftCrossings:(e.layout.challenges||[]).filter(c=>c.type==='draft-crossing'&&c.available).length,
  note:'Offline diagnostic uses full route geometry at nominal unboosted passage time; never fed into controller. Empty sampled slices are flags, not a seed-proof reachability theorem.'};
 geometryCache.set(key,result);return result;
}
const roleOptions=['collector','protector','leveler','swift'];
function buildCase({terrain,difficulty,stage,role,style,seedIndex=0,profile='refuge',practice=false,fleet=null,skills={}}){
 const seed=`balance-flight-${seedIndex}-${terrain}-a${difficulty}-s${stage}`;
 const length=getFlightLengthProfile({seed,mapIndex:0,row:stage,elite:profile==='gauntlet',boss:stage===6});
 const duration=practice?(stage===0?36:44):length.duration;
 const identity=getLevelIdentity(terrain,seed);
 return{terrain,difficulty,stage,role,style,seedIndex,profile,practice,seed,duration,skills,fleet:fleet||[role],
  node:{...ROUTE_PROFILES[profile],row:stage,flightNumber:stage===0?1:stage===3?3:5,difficulty,mapIndex:0,
   levelId:identity.id,locationName:identity.name,flightLengthScale:1,
   ...(practice?{tutorialLesson:stage===0?'glide':'wind'}:{}),challengeId:'clean',challengeTarget:0}};
}
function simulate(config){
 let result=null;
 const modifiers=getRunModifiers({skills:config.skills,artifacts:[],companions:config.fleet,companionRole:config.fleet[0]});
 const e=new WispFlight({canvas:canvas(),node:config.node,seed:config.seed,terrain:config.terrain,duration:config.duration,
  elite:config.profile==='gauntlet',companions:config.fleet,companionRole:config.fleet[0],modifiers,
  flame:config.practice?80:FLAME_TUNING.starting,onFinish:value=>{result=value;}});
 const record={levelId:config.node.levelId,biomeId:config.node.biomeId,terrain:config.terrain,difficulty:config.difficulty,stage:config.stage,role:config.role,fleet:config.fleet,
  style:config.style,profile:config.profile,seed:config.seed,practice:config.practice,duration:config.duration,
  flapCost:e.flapCost,startFuel:e.flame,available:[],direct:0,collector:0,pickupCounts:{},fuelRestored:0,
  minFuel:e.flame,shieldsSpent:0,powerPresses:0,powerUses:{},levelerReleases:0,hitLog:[],fatalCause:null,
  draftZones:e.drafts.zones.length,patterns:(e.layout.challenges||[]).map(item=>({type:item.type,name:item.name,available:item.available})),
  requiredHardWindows:e.layout.requestedHardWindows,actualHardWindows:e.layout.hardWindows};
 record.layoutDiagnostics=diagnoseLayout(e,config.seed+':'+config.profile+':'+config.practice);
 for(const packet of e.layout.embers){const spec=getPickupSpec(packet);record.available.push({id:packet.id,kind:pickupKind(packet),x:round(packet.x),y:round(packet.y),fuel:spec.fuel+(spec.fuel?e.fuelBonus+e.mod.cacheFuelBonus:0)});}
 const collect=e.collect.bind(e);e.collect=packet=>{const before=e.flame,was=packet.collected,delivered=!!packet.deliveredByWisp,kind=pickupKind(packet);collect(packet);
  if(!was&&packet.collected){record[delivered?'collector':'direct']++;record.pickupCounts[kind]=(record.pickupCounts[kind]||0)+1;record.fuelRestored+=Math.max(0,e.flame-before);}};
 const hit=e.hit.bind(e);e.hit=obstacle=>{const before=e.collisions,charges=e.shield.charges;hit(obstacle);
  if(e.collisions>before)record.hitLog.push({time:round(e.time),fuel:round(e.flame),obstacle:obstacle?.id??'boundary',saved:!e.finished&&!e.dying});
  record.shieldsSpent+=Math.max(0,charges-e.shield.charges);if(e.finished)record.fatalCause='collision';};
 const die=e.beginDying.bind(e);e.beginDying=(...cause)=>{if(!e.dying)record.fatalCause=cause[0]==='collision'?'collision':'fuel';return die(...cause);};
 const power=e.activateAbility.bind(e);e.activateAbility=()=>{const before=e.fleet.map(item=>item.remaining);const ok=power();if(ok){record.powerPresses++;
  e.fleet.forEach((item,i)=>{if(before[i]<=0&&item.remaining>0)record.powerUses[item.role]=(record.powerUses[item.role]||0)+1;
   if(item.role==='leveler'&&before[i]>0&&item.remaining<=0)record.levelerReleases++;});}return ok;};
 const human=config.style.startsWith('human')?{reaction:Number(config.style.slice(5))/1000,drop:Number(config.style.slice(5))===150?.2:Number(config.style.slice(5))===250?.3:.4,
  jitter:Number(config.style.slice(5))===150?.04:Number(config.style.slice(5))===250?.07:.1}:null;
 const memory={lastLift:-2,random:rngFor(config.seed+':'+config.style),nextDecision:0,pending:null,pendingPower:null,powerGate:0,missedPower:0,human,noticed:new Map()};
 const missedManualFuel=new Set(),passedFuel=new Set();
 e.start();
 if(e.tutorialAwaitingLift){e.flap();memory.lastLift=e.time;}
 if(args.trace)record.trace=[];
 const maxFrames=Math.ceil(config.duration*60*1.15)+180;
 for(let frame=0;frame<maxFrames&&!e.finished;frame++){
  if(!e.dying&&!e.completing&&e.time>=memory.nextDecision){const input=choose(e,config.style,memory);memory.nextDecision+=(config.style==='imperfect'?.20:human?.10:.05);
   if(args.trace)record.trace.push({time:round(e.time),y:round(e.player.y),vy:round(e.player.vy),fuel:round(e.flame),flap:input.flap,target:input.target});
   if(human){
    if(memory.pending==null&&input.delay<=human.reaction+.03&&e.time-memory.lastLift>=.30)
     memory.pending=e.time+Math.max(1/60,human.reaction+(memory.random()-.5)*human.jitter*2);
   }else if(input.flap){if(config.style==='imperfect')memory.pending=e.time+.12;else if(e.flap())memory.lastLift=e.time;}}
  if(memory.pendingPower!=null&&e.time>=memory.pendingPower&&!e.dying){e.activateAbility();memory.pendingPower=null;}
  if(memory.holdUntil&&e.time>=memory.holdUntil){e.endLiftInput(false);memory.holdUntil=0;}
  if(memory.pending!=null&&e.time>=memory.pending&&!e.dying){
   if(e.liftHeld)e.endLiftInput(false);
   const hold=e.hasCompanion('leveler')&&e.levelCharge>.6&&memory.random()>(human?.drop||.15);
   if(hold?e.beginLiftInput():e.flap())memory.lastLift=e.time;
   if(hold)memory.holdUntil=e.time+Math.min(e.levelCharge,.8+memory.random()*.8);memory.pending=null;
  }
  e.step(1/60);record.minFuel=Math.min(record.minFuel,e.flame);
  for(const packet of e.getNearbyPickups())if(!packet.generated&&['light','cache'].includes(pickupKind(packet))&&packet.x-e.distance<e.player.x-pickupContactRadius(packet)){
   passedFuel.add(packet.id);if(!packet.collected||packet.deliveredByWisp)missedManualFuel.add(packet.id);
  }
 }
 Object.assign(record,{success:!!result?.success,terminated:!!result,time:round(e.time),distance:round(e.distance),progress:round(e.distance/e.totalDistance),
  missedPower:memory.missedPower,manualFuelPassed:passedFuel.size,manualFuelMissed:missedManualFuel.size,humanStress:human,
  endFuel:round(e.flame),minFuel:round(record.minFuel),fuelRestored:round(record.fuelRestored),effortSpent:round(e.effortSpent),flaps:e.flaps,
  collisions:e.collisions,elapsedPhase:e.flightChallenge?.type||null,lowFuelAtDeath:!result?.success&&e.flame<e.flapCost,
  fatalCause:result?.success?null:record.fatalCause||'timeout',maxAvailableFuel:round(record.available.reduce((sum,item)=>sum+item.fuel,0)),
  result:result?{success:result.success,collected:result.collected,score:result.score,embers:result.embers}:null});
 e.destroy();return record;
}
function summarize(records){
 const groups={};
 for(const record of records){for(const key of['all',`style:${record.style}`,`role:${record.role}`,`terrain:${record.terrain}`,`level:${record.levelId}`,`biome:${record.biomeId}`,`difficulty:${record.difficulty}`,`stage:${record.stage}`,`profile:${record.profile}`]){
  const group=groups[key]||(groups[key]=[]);group.push(record);}}
 return Object.fromEntries(Object.entries(groups).map(([key,items])=>[key,{n:items.length,clears:items.filter(x=>x.success).length,
  clearRate:Number((items.filter(x=>x.success).length/items.length).toFixed(6)),clearPercent:round(100*items.filter(x=>x.success).length/items.length),fuelDeaths:items.filter(x=>x.fatalCause==='fuel').length,
  collisionDeaths:items.filter(x=>x.fatalCause==='collision').length,lowFuelDeaths:items.filter(x=>x.lowFuelAtDeath).length,
  meanProgress:round(mean(items.map(x=>x.progress))),meanDirect:round(mean(items.map(x=>x.direct))),meanCollector:round(mean(items.map(x=>x.collector))),
  meanRestored:round(mean(items.map(x=>x.fuelRestored))),meanEffort:round(mean(items.map(x=>x.effortSpent))),
  clearFuel:round(mean(items.filter(x=>x.success).map(x=>x.endFuel))),meanFlaps:round(mean(items.map(x=>x.flaps)))}]));
}
const mode=String(args.mode||'calibrate'),cases=[];
if(mode==='guardians'){
 for(const bossId of ['hollow-warden','moonweaver','frost-matron','rootbound-heart','storm-shepherd','hollow-sun'])for(const role of roleOptions)for(const style of ['human150','human250']){
  const config=buildCase({terrain:'ruins',difficulty:1,stage:6,role,style,skills:{'main-efficiency':1,'main-sight':1}});
  Object.assign(config.node,{boss:true,bossId});config.seed+=':'+bossId;config.node.levelId=bossId;cases.push(config);
 }
}else if(mode==='atlas'){
 for(const level of BIOME_LEVELS)for(let seedIndex=0;seedIndex<Number(args.seeds||1);seedIndex++)for(const role of roleOptions)for(const style of ['human150','human250']){
  const config=buildCase({terrain:level.terrain,difficulty:1,stage:0,role,style,seedIndex,skills:{'main-efficiency':1}});
  config.seed+=`:${level.id}`;
  Object.assign(config.node,{levelId:level.id,biomeId:level.biomeId,locationName:level.name});
  cases.push(config);
 }
}else if(mode==='health'){
 for(let seedIndex=0;seedIndex<Number(args.seeds||3);seedIndex++)for(const terrain of ['ruins','canopy','storm'])for(const difficulty of [1,3,6])for(const stage of [0,3])for(const role of roleOptions)for(const style of ['human150','human250']){
  const config=buildCase({terrain,difficulty,stage,role,style,seedIndex,profile:stage===0?'refuge':'cavern',skills:{'main-efficiency':1}});
  cases.push(config);
 }
}else if(mode==='calibrate'){
 for(const style of['safety','fuel','imperfect'])for(const lesson of[0,3])cases.push(buildCase({terrain:lesson===0?'ruins':'storm',difficulty:1,stage:lesson,role:'collector',style,practice:true}));
 for(const style of['safety','fuel','imperfect'])for(const terrain of['ruins','canopy','storm'])cases.push(buildCase({terrain,difficulty:1,stage:0,role:'collector',style}));
}else if(mode==='human'){
 for(let seedIndex=0;seedIndex<Number(args.seeds||1);seedIndex++)for(const terrain of['ruins','canopy','storm'])for(const role of roleOptions)for(const style of['fuel','human150','human250','human350'])
  cases.push(buildCase({terrain,difficulty:1,stage:0,role,style,seedIndex}));
}else if(mode==='witness'){
 cases.push(buildCase({terrain:'storm',difficulty:3,stage:3,role:'collector',style:'fuel',profile:'refuge'}));
}else if(mode==='probe'){
 for(const style of['safety','fuel','imperfect'])for(const role of roleOptions)cases.push(buildCase({terrain:'ruins',difficulty:1,stage:0,role,style}));
}else{
 for(const terrain of['ruins','canopy','storm'])for(const difficulty of[1,3,6])for(const stage of[0,3,6])for(const role of roleOptions)for(const style of['safety','fuel'])
  cases.push(buildCase({terrain,difficulty,stage,role,style,profile:stage===0?'refuge':stage===3?'cavern':'gauntlet'}));
 for(const terrain of['ruins','canopy','storm'])for(const difficulty of[1,3,6])for(const stage of[0,3,6])
  cases.push(buildCase({terrain,difficulty,stage,role:'collector',style:'imperfect',profile:stage===3?'cavern':'refuge'}));
 for(const fleet of[['collector','protector'],['collector','swift','kindler'],['leveler','seer','kindler']])for(const terrain of['ruins','canopy','storm'])for(const style of['fuel','imperfect'])
  cases.push(buildCase({terrain,difficulty:3,stage:3,role:fleet.join('+'),fleet,style,skills:{'main-bond':fleet.length-1}}));
}
const filtered=cases.filter(c=>(!args.roles||String(args.roles).split(',').includes(c.role))&&(!args.biomes||String(args.biomes).split(',').includes(c.node.biomeId)));const levelFiltered=filtered.filter(c=>!args.levels||String(args.levels).split(',').includes(c.node.levelId));const selected=args.limit?levelFiltered.slice(0,Number(args.limit)):levelFiltered;
const output=path.resolve(root,String(args.out||`work/balance-flight-${mode}.json`));
const records=[],started=Date.now();
for(const config of selected){const record=simulate(config);records.push(record);
 if(records.length%5===0||records.length===selected.length){
  const report={schema:1,mode,createdAt:new Date().toISOString(),source,hashes:initialHashes,sourceUnchanged:JSON.stringify(hashes())===JSON.stringify(initialHashes),
   controller:{version:'landscape-atlas-imperfect-v6',actualEngineHz:60,decisionSeconds:{safety:.05,fuel:.05,imperfect:.2,human:.10},horizonSeconds:1.68,beam:7,
    visibility:'Within 2.1 current light radii and viewport; conservative obstacle slices; not a perceptual human model.',
    limitations:['Conservative square-expanded terrain slices guide prediction; real circle collisions run in engine.','Bot model approximates Leveler and localized gust trajectories.','No future Power activations planned; controller uses role-aware heuristics.','No human or mobile-performance inference from bot success.','Pickup noticing has seeded 10–15% misses; timing uses 150–250ms delay and 40–70ms jitter. Geometry prediction is still more informed than a person.'],
    cheats:'None. No warp, refill, collision immunity, pickup removal, or engine runtime edits.'},
   elapsedSeconds:round((Date.now()-started)/1000),totalPlanned:selected.length,completed:records.length,summary:summarize(records),records};
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  process.stdout.write(JSON.stringify({completed:records.length,total:selected.length,elapsed:report.elapsedSeconds,summary:report.summary.all})+'\n');
 }
}
