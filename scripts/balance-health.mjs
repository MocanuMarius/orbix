// Reproducible economy stress, generated-pickup audit and progression invariants.
// This is NOT an estimate of human win probability. The separate flight harness
// runs the real collision/flight loop with delayed, imperfect controllers.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const args=Object.fromEntries(process.argv.slice(2).map(s=>{const[k,...v]=s.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
const source=path.resolve(String(args.source||'dist')),out=String(args.out||'work/balance-health.json'),seedCount=Number(args.seeds||12);
const M=await import(pathToFileURL(path.join(source,'model.mjs')));
const {WispFlight,obstaclePolygons,circleHitsPolygon}=await import(pathToFileURL(path.join(source,'flight.mjs')));
const {getPickupSpec,pickupKind,pickupContactRadius}=await import(pathToFileURL(path.join(source,'pickups.mjs')));
const roles=['collector','protector','leveler','swift','seer','kindler'];
const randomFor=seed=>{let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6d2b79f5;let x=n;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296;};};
const round=x=>Math.round(x*1000)/1000,mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const q=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]:null;
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const canvas=()=>({style:{},getContext:()=>new Proxy({globalAlpha:1},{get:(target,key)=>target[key]??(String(key).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(target,key,value)=>(target[key]=value,true)}),getBoundingClientRect:()=>({width:390,height:620})});
const sourceHashes=()=>Object.fromEntries(fs.readdirSync(source).filter(n=>n.endsWith('.mjs')).map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(source,n))).digest('hex')]));
const hashes=sourceHashes(),started=Date.now(),layouts=new Map(),packets=[];
function inventory(run,node){
 const key=run.seed+'|'+node.id;if(layouts.has(key))return layouts.get(key);
 const e=new WispFlight({canvas:canvas(),node,seed:run.seed+'-'+node.id,terrain:node.terrain,duration:node.duration,elite:node.elite,companions:['collector'],modifiers:M.getRunModifiers({}),flame:75});
 const items=e.layout.embers.filter(p=>!p.generated).map(p=>({kind:pickupKind(p),value:p.value||1,x:p.x,y:p.y,accessible:!!p.accessible}));
 const result={key,tier:run.difficulty,map:run.mapIndex,row:node.row,terrain:node.terrain,route:node.routeStyle,boss:!!node.boss,seconds:e.totalDistance/e.baseSpeed,items};
 // Geometry audit includes props and both extremes of moving terrain. These
 // points measure static access, not a proof that a timed flying path exists.
 for(const p of items){
  if(!getPickupSpec(p).fuel)continue;
  const nearby=e.layout.obstacles.filter(o=>Math.abs(o.x-p.x)<750);
  let clear=true,margin=60;
  for(const o of nearby)for(const sign of [-1,1]){
   const polygons=obstaclePolygons({...o,phase:0,motion:0,center:o.center+sign*Math.abs(o.motion||0)},0);
   for(const poly of polygons){if(circleHitsPolygon(p.x,p.y,e.player.radius,poly))clear=false;for(const r of [15,25,40,60])if(circleHitsPolygon(p.x,p.y,r,poly))margin=Math.min(margin,r);}
  }
  packets.push({tier:run.difficulty,map:run.mapIndex,row:node.row,terrain:node.terrain,route:node.routeStyle,kind:p.kind,accessible:p.accessible,center:Math.abs(p.y-310)<=80,bodyClear:clear,margin,contact:pickupContactRadius(p)});
 }
 layouts.set(key,result);e.destroy();return result;
}
function chain(id,result=[]){const s=M.SKILLS[id];if(s.requires)chain(s.requires,result);if(!result.includes(id))result.push(id);return result;}
function buildPlan(role,seed,policy,unlocked){
 const random=randomFor('build:'+seed+role),leaves=Object.values(M.SKILLS).filter(s=>s.expansion&&(!s.incrementStage||s.incrementStage===3)&&s.branch===role);
 const own=chain(leaves[Math.floor(random()*leaves.length)].id);
 const main=M.MAIN_WISP_BRANCHES.flatMap(b=>{
  const parent=b.leaves[Math.floor(random()*b.leaves.length)],children=Object.values(M.SKILLS).filter(s=>s.expansion&&(!s.incrementStage||s.incrementStage===3)&&(s.trackParent||s.requires)===parent);
  return chain(children[Math.floor(random()*children.length)].id);
 });
 const lives=['main-spare-spark','main-deep-reserve'];
 const reserve=unlocked?['afterglow-vessel','afterglow-retention','afterglow-anchor']:[];
 if(policy==='fleet'){const other=roles[(roles.indexOf(role)+1)%roles.length],otherLeaf=Object.values(M.SKILLS).find(s=>s.expansion&&(!s.incrementStage||s.incrementStage===3)&&s.branch===other);return ['main-bond',...own,...chain(otherLeaf.id),...main,...lives,'main-bond',...reserve];}
 return policy==='focused'?[...own,role+'-mastery',...main,...lives,...reserve]:['main-sight',own[0],'main-efficiency',...main,...own,...lives,role+'-mastery',...reserve];
}
function buy(state,plan,m){
 if(!M.canBuyCheckpointSkills(state))return;
 let purchases=0;
 for(const id of plan){const r=state.run;if(!['main',...r.companions,...(r.afterglowUnlocked?['afterglow']:[])].includes(M.SKILLS[id].branch))continue;const cost=M.getSkillCost(M.getSkillWallet(state),id);if(cost===null||r.embers<cost)continue;
  const before=r.embers;if(!M.buyCheckpointSkill(state,id))continue;
  assert.equal(before-r.embers,cost);m.spent+=cost;m.purchases++;purchases++;
  m.firstPurchase??=r.stats.flights;
  if(id==='main-bond'){const fleet=[...r.companions];while(fleet.length<M.getCompanionCapacity(r))fleet.push(roles.find(x=>!fleet.includes(x)));M.setCompanions(r,fleet);}
 }
 return purchases;
}
function choose(run,route,random){
 const options=M.getChoices(run);assert.ok(options.length,'route dead end');
 if(route==='mixed')return options[Math.floor(random()*options.length)];
 const lane=route==='rest'?run.step===0||run.step===1?0:run.step===3||run.step===4?2:null:run.step===0||run.step===1?2:run.step===4?0:null;
 return options.find(n=>n.routeLane===lane)||options.find(n=>route==='rest'?n.kind==='camp':n.elite)||options[0];
}
const contactProfiles={learning:{contact:.35,missChallenge:.45,loss:.12},steady:{contact:.55,missChallenge:.25,loss:.06},precise:{contact:.75,missChallenge:.1,loss:.02}};
function runCase({seed,tier,role,route,policy,contact,risk}){
 const state=M.newState(),unlocked=tier>1;state.profile.difficulty=6;state.profile.afterglowUnlocked=unlocked;
 state.run=M.createRun(state.profile,'health-'+seed,tier);const r=state.run;
 M.setCompanions(r,[role]);M.chooseStartingSkill(state,'main-efficiency');
 const plan=buildPlan(role,seed,policy,unlocked),random=randomFor([seed,tier,role,route,contact,risk].join(':')),assumed=contactProfiles[contact];
 const m={seed,tier,role,route,policy,contact,risk,spent:0,serviceSpent:0,purchases:0,firstPurchase:null,rests:[],clearIncome:0,pickupIncome:0,challengeIncome:0,failures:0,surplusAtLastRest:0,lockedOutOfSpending:0};
 for(let guard=0;r.phase!=='ended'&&guard<150;guard++){
  if(r.phase==='map'){M.selectNode(r,choose(r,route,random).id);continue;}
  if(r.phase==='map-clear'){M.advanceMap(r);continue;}
  if(r.phase==='retry'){M.retryFlight(r);continue;}
  if(r.phase==='briefing'){
   const node=r.current,inv=inventory(r,node),mod=M.getRunModifiers(r),before=r.embers;M.beginFlightAttempt(r);
   // Explicit imposed attrition sweep: does not claim modelled human deaths.
   const fail=risk==='attrition'&&random()<assumed.loss*(1+(tier-1)*.09+(node.elite?.35:0)+(node.boss?.5:0));
   if(fail){M.finishFlight(r,{success:false,flame:100,embers:999,collected:999,challengeComplete:true});assert.equal(M.settleCheckpoint(state),0);assert.equal(r.embers,before);m.failures++;continue;}
   let fuelCount=0,value=0,utility=0;
   for(const p of inv.items){const spec=getPickupSpec(p);if(p.kind==='dark')continue;
    const accessibility=p.accessible?1.15:Math.abs(p.y-310)<80?1:.72;
    if(random()>Math.min(.95,assumed.contact*accessibility))continue;
    if(spec.fuel){fuelCount++;value+=p.value===3?3:1;}else utility+=spec.currency||0;
   }
   const emberReward=Math.floor(value*node.routeReward*mod.reward)+utility;
   const challenge=node.challengeId==='wisps'?fuelCount>=node.challengeTarget:node.challengeId==='boosts'?random()>assumed.missChallenge:random()>assumed.missChallenge;
   M.finishFlight(r,{success:true,flame:25+random()*55,embers:emberReward,collected:fuelCount,collisions:0,challengeComplete:challenge});
   M.settleCheckpoint(state);const credited=r.embers;assert.equal(M.settleCheckpoint(state),0);assert.equal(r.embers,credited);
   m.clearIncome+=r.lastFlight.completionBonus;m.pickupIncome+=r.lastFlight.pickupEmbers;m.challengeIncome+=r.lastFlight.challengeBonus;
   continue;
  }
  if(r.phase==='support'){
   const camp=r.current.kind==='camp',offers=M.getSupportChoices(r,state.profile);let index=0;
   if(camp)index=r.lives<2?offers.findIndex(o=>o.effect.lives):r.flame<55?0:1;
   else{const feasible=offers.map((o,i)=>({o,i})).filter(({o})=>!(o.effect.emberCost>r.embers)&&!o.effect.sell&&(!o.effect.upgrade||plan.includes(o.effect.upgrade)));
    index=(feasible.find(({o})=>o.effect.upgrade)||feasible.find(({o})=>r.flame<45&&o.effect.flame>0)||feasible.find(({o})=>o.effect.embers)||feasible[0]).i;}
   const effect=offers[index].effect;assert.ok(M.resolveSupport(r,index,state.profile));m.serviceSpent+=effect.emberCost||0;M.settleCheckpoint(state);
   if(camp){const wallet=r.embers,purchased=buy(state,plan,m),w=M.getSkillWallet(state);
    const eligible=Object.keys(M.SKILLS).filter(id=>['main',...r.companions,...(r.afterglowUnlocked?['afterglow']:[])].includes(M.SKILLS[id].branch)&&M.getSkillCost(w,id)!==null);
    const row={map:r.mapIndex,flights:r.stats.flights,before:wallet,after:r.embers,purchased,skills:Object.keys(r.skills).length,remainingChoices:eligible.length,earned:r.securedEmbers,spend:m.spent+m.serviceSpent};
    m.rests.push(row);m.surplusAtLastRest=r.embers;m.lockedOutOfSpending+=!eligible.length?1:0;
   }continue;
  }
  throw Error('Unexpected phase '+r.phase);
 }
 assert.equal(r.phase,'ended');M.settleCheckpoint(state);M.bankRun(state);
 m.success=r.success;m.flights=r.stats.flights;m.income=r.securedEmbers;m.unspent=r.embers;m.skills=Object.keys(r.skills).length;m.fleet=r.companions.length;
 m.postLastRestIncome=m.income-(m.rests.at(-1)?.earned||0);m.spendableSurplus=Math.max(0,m.unspent-m.postLastRestIncome);
 m.firstRest=m.rests[0]?.before??null;m.finalMap=r.mapIndex;m.finalLives=r.lives;
 assert.equal(m.income-m.spent-m.serviceSpent,m.unspent,'wallet must reconcile');
 const fresh=M.createRun(state.profile,'reset-'+seed);assert.equal(fresh.embers,0);assert.equal(Object.keys(fresh.skills).length,0);
 return m;
}
const rows=[];
for(let seed=0;seed<seedCount;seed++){
 for(const tier of [1,3,6])for(const role of roles)for(const route of ['rest','mixed','detour'])for(const policy of ['focused','balanced','fleet'])for(const contact of Object.keys(contactProfiles))for(const risk of ['clear','attrition'])rows.push(runCase({seed,tier,role,route,policy,contact,risk}));
 console.log(JSON.stringify({seeds:seed+1,runs:rows.length,layouts:layouts.size,seconds:round((Date.now()-started)/1000)}));
}
function aggregate(a){const rests=a.flatMap(r=>r.rests),wins=a.filter(r=>r.success);return{n:a.length,completions:wins.length,meanIncome:round(mean(a.map(r=>r.income))),incomeP10:q(a.map(r=>r.income),.1),incomeP90:q(a.map(r=>r.income),.9),meanSpend:round(mean(a.map(r=>r.spent+r.serviceSpent))),meanUnspent:round(mean(a.map(r=>r.unspent))),meanSpendableSurplus:round(mean(a.map(r=>r.spendableSurplus))),meanPostLastRestIncome:round(mean(a.map(r=>r.postLastRestIncome))),meanSkills:round(mean(a.map(r=>r.skills))),meanFlights:round(mean(a.map(r=>r.flights))),meanFailures:round(mean(a.map(r=>r.failures))),firstRestMedian:q(a.map(r=>r.firstRest).filter(x=>x!==null),.5),firstPurchaseMedian:q(a.map(r=>r.firstPurchase).filter(x=>x!==null),.5),emptyShopRate:round(mean(rests.map(r=>Number(!r.remainingChoices)))),noPurchaseRestRate:round(mean(rests.map(r=>Number(!r.purchased)))),mapRestWallet:[0,1,2].map(i=>round(mean(rests.filter(r=>r.map===i).map(r=>r.after)))),grossPickupShare:round(a.reduce((s,r)=>s+r.pickupIncome,0)/(a.reduce((s,r)=>s+r.income,0)||1))};}
const grouped={all:aggregate(rows)};for(const key of ['tier','role','route','policy','contact','risk'])for(const value of new Set(rows.map(r=>r[key])))grouped[key+':'+value]=aggregate(rows.filter(r=>r[key]===value));
for(const tier of [1,3,6])for(const contact of Object.keys(contactProfiles))grouped[`clear:tier${tier}:${contact}:rest`]=aggregate(rows.filter(r=>r.risk==='clear'&&r.tier===tier&&r.contact===contact&&r.route==='rest'));
const layoutSummary={layouts:layouts.size,fuelPackets:packets.length,bodyBlocked:packets.filter(p=>!p.bodyClear).length,centerShare:round(mean(packets.map(p=>+p.center))),accessibleShare:round(mean(packets.map(p=>+p.accessible))),byTier:{},byRoute:{}};
for(const [key,values]of [['tier',[1,3,6]],['route',['refuge','cavern','gauntlet']]])for(const value of values){const a=packets.filter(p=>p[key]===value);layoutSummary[key==='tier'?'byTier':'byRoute'][value]={count:a.length,bodyBlocked:a.filter(p=>!p.bodyClear).length,centerShare:round(mean(a.map(p=>+p.center))),nearTerrainShare:round(mean(a.map(p=>+(p.margin<=25))))};}
const report={schema:1,date:new Date().toISOString(),source,hashes,sourceUnchanged:JSON.stringify(hashes)===JSON.stringify(sourceHashes()),seconds:round((Date.now()-started)/1000),method:{actualModelTransitions:true,actualGeneratedLayouts:true,geometrySamples:'Two moving-terrain extrema, includes props; conservative access audit, not reachability proof.',humanWinRates:false,contactProfiles,attrition:'Imposed per-attempt probabilities, increased by tier/elite/boss. Role success probabilities deliberately identical; this measures economy under failure, not role survival balance.',contact:'Assigned 35/55/75% body contact, multiplied by 1.15 for accessible and .72 for off-centre packets; no invented Collector bonus.',endingGlow:'Assigned 25–80; full fuel survival is assessed separately by the real-engine controller.',roles:'All six selected for controlled comparisons, even if normal progression would not unlock that starter yet.',seedCount},summary:grouped,layoutSummary,rows};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report));console.log(JSON.stringify({output:out,summary:grouped['clear:tier1:steady:rest'],layoutSummary},null,2));
