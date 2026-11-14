import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Run from any directory. --seeds=72 --pairs=6 samples actual campaign nodes.
// --reference=c75bf57 loads the shipped modules directly from Git, without
// touching the checkout. The same human controller observes each build using
// that build's own hitboxes, light and hazards.
const root=fileURLToPath(new URL('../',import.meta.url));
const opts=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const reference=opts.reference||'c75bf57',seeds=Number(opts.seeds||72),pairLimit=Number(opts.pairs??6);
const baseline=Boolean(opts.released);
const dist=new URL('../dist/',import.meta.url).href;
let observeField=null;
globalThis[Symbol.for('spark-qa-before')]=(layout,options)=>observeField?.(layout,options);
const cached=new Map();
registerHooks({load(url,context,next){
  if(!url.startsWith(dist))return next(url,context);
  const name=new URL(url).pathname.split('/').at(-1);
  if(!name.endsWith('.mjs')||!baseline&&name!=='spark-fields.mjs')return next(url,context);
  if(!cached.has(name))cached.set(name,baseline?
    execFileSync('git',['show',reference+':dist/'+name],{cwd:root,encoding:'utf8',maxBuffer:4e6}):
    readFileSync(fileURLToPath(url),'utf8'));
  let source=cached.get(name);
  if(!baseline&&name==='spark-fields.mjs'){
    assert.ok(source.includes('export function installSparkField'));
    source=source.replace('export function installSparkField','function liveInstallSparkField')+
      '\nexport function installSparkField(layout,options){globalThis[Symbol.for("spark-qa-before")](layout,options);return liveInstallSparkField(layout,options);}';
  }
  return {source,format:'module',shortCircuit:true};
}});

const {createRun,newState,getRunModifiers,advanceMap}=await import('../dist/model.mjs');
const {WispFlight}=await import('../dist/flight.mjs');
const {getPickupSpec,pickupKind,pickupContactRadius}=await import('../dist/pickups.mjs');
const {sparkMass,sparkBodyRadius,SPARK_TIERS}=await import('../dist/spark-size.mjs');
const {glowPoints}=await import('../dist/vitality.mjs');
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
const round=n=>Number(n.toFixed(2));
const natural=p=>!p.generated&&['light','cluster','cache','dark'].includes(pickupKind(p));
const fuel=p=>!p.generated&&getPickupSpec(p).plasma?getPickupSpec(p).fuel:0;
const roles=['collector','protector','leveler','swift'];
const flights=new Map(),biomes={},totals={layouts:0,fieldFuel:0,guarded:0,large:0,giants:0,largeDark:0,lowerField:0,lostSites:0};

function hasBypass(e,p){
  const distance=pickupContactRadius(p,e.height)+16;
  return [-1,1].some(side=>{
    const y=p.y+side*distance;
    for(let i=-8;i<=8;i++)if(!e.objectiveBodyClear(p.x+i*distance/5,y,17))return false;
    return true;
  });
}

function openingSupply(sites,initial){
  const windows=new Map();
  for(const p of sites){
    if(pickupKind(p)==='dark')continue;
    const key=Math.floor(p.x/900);
    windows.set(key,(windows.get(key)||0)+(initial?sparkMass(p):Math.min(6,sparkMass(p))));
  }
  return windows;
}

function sample(i){
  const category=['opening','flight','elite','guardian'][i%4];
  const group=Math.floor(i/4);
  const difficulty=category==='opening'?[1,2][group%2]:[1,2,4,6][group%4];
  const mapIndex=category==='opening'?0:Math.floor(group/2)%3;
  const profile=newState().profile;profile.difficulty=difficulty;
  const run=createRun(profile,'size-audit-'+i,difficulty);
  for(let m=0;m<mapIndex;m++){run.phase='map-clear';assert.ok(advanceMap(run));}
  const nodes=run.map.flat();
  const candidates=nodes.filter(n=>category==='guardian'?n.boss:category==='elite'?n.elite:
    category==='opening'?n.row===0&&n.type==='flight':n.row>0&&n.row<6&&n.type==='flight'&&!n.elite);
  if(!candidates.length)return;
  const node=candidates[group%candidates.length],seed=run.seed+'-'+node.id;
  run.current=node;
  const paired=flights.get(category)||[];
  if(paired.length<pairLimit||category==='guardian'&&paired.length<pairLimit+3&&!paired.some(c=>c.node.bossId===node.bossId)){
    const role=roles[paired.length%roles.length];
    paired.push({node,seed,terrain:node.terrain,difficulty,stage:node.row,profile:node.elite?'gauntlet':'refuge',
      role,fleet:[role],style:'human250',skills:category==='opening'?{}:{'main-efficiency':1,'main-sight':1},duration:node.duration});
    flights.set(category,paired);
  }
  if(baseline)return;
  let guarded,before,sites,openingWindows;
  observeField=(layout,options)=>{
    const marked=new Set(options.targets?.map(t=>t.object));
    sites=layout.embers.filter(natural);
    before=sites.reduce((sum,p)=>sum+fuel(p),0);
    if(options.opening)openingWindows=openingSupply(sites,true);
    guarded=layout.embers.filter(p=>p.riskChain||p.intro||p.forkCache||p.atlasBypass||p.blackHoleBypass||p.challengeLandmark||marked.has(p))
      .map(p=>({p,kind:pickupKind(p),mass:sparkMass(p),x:p.x,y:p.y}));
  };
  const e=new WispFlight({canvas,preflight:true,node,seed,terrain:node.terrain,duration:node.duration,
    elite:node.elite,companions:['collector'],modifiers:getRunModifiers(run)});
  observeField=null;
  if(openingWindows){
    const current=openingSupply(sites,false);
    for(const [key,sum] of openingWindows)assert.ok(current.get(key)>=Math.min(sum,6),'opening supply gap: '+seed+' pocket '+key);
  }
  const biome=biomes[node.biomeId]??={layouts:0,ordinary:{},dark:{},displayedFuel:0};
  biome.layouts++;totals.layouts++;
  for(const {p,kind,mass,x,y} of guarded){
    assert.ok(p.x===x&&p.y===y&&pickupKind(p)===kind&&sparkMass(p)===mass,'authored pickup altered: '+seed+' '+p.id);
    totals.guarded++;
  }
  const actual=e.layout.embers.reduce((sum,p)=>sum+fuel(p),0);
  if(actual<before)totals.lowerField++;
  const budget=e.layout.glowBudget;
  if(budget)assert.ok(actual>=Math.min(before,budget.target),'route fuel floor fell on '+seed);
  assert.ok(actual>=before*(openingWindows ? 0.90 : 0.84),'field lost too much fuel beyond the route budget: '+seed);
  totals.lostSites+=sites.filter(p=>!e.layout.embers.includes(p)).length;
  biome.displayedFuel+=glowPoints(actual);
  totals.fieldFuel+=glowPoints(actual);
  for(const p of e.layout.embers.filter(natural)){
    const mass=sparkMass(p),dark=pickupKind(p)==='dark',histogram=dark?biome.dark:biome.ordinary;
    assert.ok(SPARK_TIERS.some(t=>t.mass===mass),'invalid natural tier on '+seed+' '+p.id);
    histogram[mass]=(histogram[mass]||0)+1;
    if(dark&&mass>1)assert.ok(hasBypass(e,p),'no continuous dark bypass: '+seed+' '+p.id);
    if(mass<5)continue;
    const radius=sparkBodyRadius(p,e.height);
    assert.ok(e.objectiveBodyClear(p.x,p.y,radius+2),'exceptional shell intersects terrain: '+seed+' '+p.id);
    if(dark)totals.largeDark++;
    if(e.layout.boss)assert.ok([-135,-75,75,135].every(dx=>e.objectiveBodyClear(p.x+dx,p.y,23)),'boss approach obstructed: '+seed);
    if(mass===10){
      assert.equal(getPickupSpec(p).fuel,dark?0:200);
      assert.equal(radius,e.height/4);totals.giants++;
    }
    totals.large++;
  }
  e.destroy();
}
for(let i=0;i<seeds;i++)sample(i);
if(!baseline){
  const aggregate={};
  for(const {ordinary,dark} of Object.values(biomes))for(const histogram of [ordinary,dark]){
    for(const [mass,count] of Object.entries(histogram))aggregate[mass]=(aggregate[mass]||0)+count;
  }
  const count=Object.values(aggregate).reduce((sum,n)=>sum+n,0);
  const percentages=Object.fromEntries(SPARK_TIERS.map(t=>[t.name,round(100*(aggregate[t.mass]||0)/count)]));
  console.log('Current world distribution',JSON.stringify({totals,percentages,biomes}));
  assert.equal(totals.lostSites,0,'authored fuel opportunities disappeared');
}
if(pairLimit>0){
  process.argv.push('--importOnly');
  const {simulate}=await import('./balance-current-flight.mjs');
  const actual=[];
  for(const [category,configs] of flights)for(const config of configs){
    const r=simulate(config);
    actual.push({category,seed:config.seed,role:config.role,clear:r.success,progress:r.progress,restored:glowPoints(r.fuelRestored),
      stored:r.result?.condensedGlow??0,starved:r.lowFuelAtDeath,available:glowPoints(r.available.reduce((n,p)=>n+p.fuel,0))});
  }
  if(baseline)console.log(JSON.stringify({reference,results:actual}));
  else{
    const args=[fileURLToPath(import.meta.url),'--released=1','--reference='+reference,'--pairs='+pairLimit,'--seeds='+seeds];
    const release=JSON.parse(opts.previous?readFileSync(opts.previous,'utf8'):
      execFileSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:4e6}));
    assert.equal(release.reference,reference,'release comparison must use the requested baseline');
    const previous=release.results;
    assert.deepEqual(actual.map(p=>p.seed),previous.map(p=>p.seed),'campaign seeds changed between revisions');
    const average=(rows,key)=>rows.length?round(rows.reduce((s,r)=>s+r[key],0)/rows.length):null;
    const summarize=rows=>({n:rows.length,clear:rows.filter(r=>r.clear).length,starved:rows.filter(r=>r.starved).length,
      avgRestored:average(rows,'restored'),avgProgress:average(rows,'progress'),
      avgStored:average(rows,'stored'),avgAvailable:average(rows,'available')});
    const paired={};
    for(const key of ['all',...flights.keys()]){
      const group=rows=>rows.filter(r=>key==='all'||r.category===key);
      const mutuallyCleared=new Set(actual.filter((r,i)=>r.clear&&previous[i].clear).map(r=>r.seed));
      const common=rows=>group(rows).filter(r=>mutuallyCleared.has(r.seed));
      paired[key]={released:summarize(group(previous)),current:summarize(group(actual)),
        matchedClearOverflow:{n:common(actual).length,released:average(common(previous),'stored'),current:average(common(actual),'stored')}};
    }
    console.log('Paired full flights',JSON.stringify({reference,perception:'250ms reaction ±70ms, 140ms observation, 30% missed cues',paired,
      ...(opts.details?{changed:actual.map((r,i)=>({current:r,released:previous[i]})).filter(x=>x.current.clear!==x.released.clear)}:{})}));
  }
}
