import {iceShardPoints,iceShardContact,sampleIceShard} from './guardian-geometry.mjs?v=evolve-1';
import {getPickupSpec} from './pickups.mjs?v=evolve-1';
import {installShutters,resizeShutters} from './shutter-cone.mjs?v=evolve-1';
import {prepareStormEncounter,resizeStormRooms} from './storm-encounter.mjs?v=evolve-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function prepareGuardian(layout,height,speed,seed=1){
 const boss=layout.boss,s=height/620;
 boss.scale=s;boss.speed=speed;
 boss.crests=layout.obstacles.filter(o=>o.guardianGate);
 if(['moonweaver','hollow-warden'].includes(boss.id))return layout;
 const byId=new Map(layout.obstacles.map(o=>[o.id,o]));
 for(const spark of layout.embers){
  const o=byId.get(spark.anchor);
  if(o){spark.y=o.center;spark.pocket=false;spark.pocketSide=null;spark.feature='guardian-respite';delete o.cachePocket;}
 }
 if(boss.id==='storm-shepherd')return prepareStormEncounter(layout,height,speed,seed);
 const phaseCounts=[0,0,0,0];
 boss.attacks=[];
 for(const o of layout.obstacles){
  if(o.cacheEligible)continue;
  const order=phaseCounts[o.bossPhase]++;
  const early=boss.difficulty<=2;
  const interval=early&&boss.id==='frost-matron'?[0,3,2,boss.difficulty===1?2:1][o.bossPhase]
    :early&&boss.id==='rootbound-heart'?[0,3,2,1][o.bossPhase]
    :boss.difficulty===1&&o.bossPhase!==3?2:1;
  if(order%interval&&!o.guardianGate)continue;
  const index=boss.attacks.length,side=o.guardianLane?-o.guardianLane:o.bossPhase===1?-1:(index%2?1:-1);
  const a={x:o.x+o.width*.65,center:o.center,y:o.center,baseGap:o.gap,side,obstacle:o,index,spent:false};
  if(boss.id==='frost-matron'){
   // Early shards claim the marked wall side; later swipes reach toward mid-lane.
   a.iceReach=early?([0,.29,.16,.03][o.bossPhase]-(boss.difficulty-1)*.035):-.10;
   if(o.guardianGate)a.iceReach-=.045;
   if(o.guardianLane)a.iceReach-=.035*boss.mapIndex;
   a.iceOrigin=a.center+side*o.gap*.5;a.iceEnd=a.center+side*o.gap*a.iceReach;
   a.iceY=a.iceOrigin;a.iceProgress=0;a.iceActive=false;
   a.icePoints=iceShardPoints(a,s);
  }
  if(boss.id==='hollow-sun')a.wellY=a.center+side*(o.guardianGate?49:70)*s;
  boss.attacks.push(a);
 }
 installShutters(layout,height);
 return layout;
}

// Fill isolated late pockets from a crowded stretch of the same encounter.
// Move a whole supply when possible, otherwise split one layer off a cache.
function spaceGuardianFuel(layout,clear){
 const boss=layout.boss,speed=boss.speed;
 const fuel=layout.embers.filter(p=>!p.generated&&!p.harmful&&getPickupSpec(p).fuel>0&&!getPickupSpec(p).dim);
 for(let i=1;i<fuel.length;i++){
  const left=fuel[i-1],right=fuel[i];
  if(right.x-left.x<speed*6.5)continue;
  const closest=(a,b)=>Math.abs(a.x-left.x)-Math.abs(b.x-left.x);
  const donor=fuel.filter((p,j)=>j>0&&j<fuel.length-1&&p!==left&&p!==right
   &&p.x>=boss.phases[1].start&&p.feature==='sheltered-glow'&&fuel[j+1].x-fuel[j-1].x<=speed*4.5)
   .sort(closest)[0];
  const reservoir=donor||fuel.filter(p=>p!==left&&p!==right&&p.feature==='sheltered-glow'&&getPickupSpec(p).fuel===60).sort(closest)[0];
  if(!reservoir)continue;
  let moved=false;
  for(const fraction of [.50,.42,.58]){
   const x=left.x+(right.x-left.x)*fraction;
   const nearest=layout.obstacles.reduce((closest,o)=>Math.abs(o.x+o.width*.65-x)<Math.abs(closest.x+closest.width*.65-x)?o:closest);
   const attack=boss.attacks?.find(a=>Math.abs(x-a.x)<145);
   const openSide=attack?(attack.stormZone?.direction??-attack.side):0;
   const target=nearest.center+openSide*nearest.gap*.22;
   for(const y of [target,nearest.center,(left.y+right.y)*.5]){
    if(!clear(x,y,36))continue;
    if(attack?.stormZone){
     const z=attack.stormZone;
     if(((x-z.x)/z.rx)**2+((y-z.y)/z.ry)**2<1)continue;
    }
    if(donor){donor.x=x;donor.y=y;}
    else{
     const split={...reservoir,id:'guardian-fuel:'+reservoir.id,kind:'light',value:1,x,y,feature:'guardian-respite'};
     reservoir.kind='cluster';reservoir.value=2;
     fuel.push(split);layout.embers.push(split);
    }
    moved=true;break;
   }
   if(moved)break;
  }
  if(moved){fuel.sort((a,b)=>a.x-b.x);i=0;}
 }
 layout.embers.sort((a,b)=>a.x-b.x);
}

// Mark the way through each room with its existing fuel. Only reposition a
// pickup if the full body and pickup ring clear the real terrain at both sway extremes.
export function placeGuardianFuel(layout,clear){
 const boss=layout.boss;
 if(!boss)return;
 spaceGuardianFuel(layout,clear);
 // Thin surplus layers between two reachable neighbours. Preserve the pickup
 // positions, all tutorial fuel and the minimum budget for this flight.
 const budget=layout.glowBudget;
 if(budget){
  const fuel=layout.embers.filter(p=>!p.generated&&!p.harmful&&getPickupSpec(p).fuel>0&&!getPickupSpec(p).dim);
  let spared=0;
  for(let i=1;i<fuel.length-1&&budget.available-20>=budget.target;i++){
   const left=fuel[i-1],p=fuel[i],right=fuel[i+1];
   if(p.x<boss.phases[1].start||getPickupSpec(p).fuel!==60||p.feature!=='sheltered-glow')continue;
   if((p.x-left.x)>boss.speed*3.2||(right.x-p.x)>boss.speed*3.2)continue;
   if(getPickupSpec(left).fuel<40||getPickupSpec(right).fuel<40)continue;
   if(!clear(left.x,left.y,29)||!clear(right.x,right.y,29))continue;
   p.kind='cluster';p.value=2;budget.available-=20;spared++;
  }
  budget.guardianSurplusLayersRemoved=spared;
 }
 if(!boss.attacks)return;
 if(boss.id==='storm-shepherd'){
  for(const p of layout.embers){
   if(!p.fuel||p.harmful||p.generated||p.stormChoice)continue;
   const room=boss.stormRooms.find(room=>p.x>=room.start-45&&p.x<=room.end+45);
   if(room&&['shelf','fork'].includes(room.kind)){
    // Routine fuel belongs to the quiet reunion. The optional shelf prize
    // keeps its authored position through all later supply and sizing passes.
    const x=room.end+65,y=room.center;
    if(clear(x,y,32)){p.x=x;p.y=y;continue;}
   }
   if(clear(p.x,p.y,30))continue;
   for(const y of [room?.bypassY,p.y-boss.scale*100,p.y+boss.scale*100]){
    if(Number.isFinite(y)&&clear(p.x,y,30)){p.y=y;break;}
   }
  }
  layout.embers.sort((a,b)=>a.x-b.x);
  return;
 }
 let cursor=0;
 for(const p of layout.embers){
  while(cursor<boss.attacks.length&&boss.attacks[cursor].x<p.x-140)cursor++;
  const a=boss.attacks[cursor];
  if(!a||Math.abs(a.x-p.x)>140||!p.fuel||p.harmful||p.generated)continue;
  let target=a.center;
  if(boss.id==='frost-matron')target-=a.side*a.baseGap*.19;
  if(boss.id==='hollow-sun')target-=a.side*a.baseGap*.27;
  if(a.stormZone)target+=a.stormZone.direction*a.baseGap*.22;
  if(clear(p.x,target,30))p.y=target;
 }
}

export function resizeGuardian(layout,factor){
 const boss=layout?.boss;if(!boss)return;
 boss.scale*=factor;
 resizeStormRooms(boss,factor);
 resizeShutters(boss,factor);
 for(const a of boss.attacks||[]){
  for(const key of ['center','y','baseGap','iceOrigin','iceEnd','iceY','wellY']){
   if(Number.isFinite(a[key]))a[key]*=factor;
  }
  if(a.icePoints)a.icePoints=iceShardPoints(a,boss.scale);
  // The storm zone is shared with DraftField, which already resized it.
 }
}

export function guardianWellDrain(distance,scale=1){return Math.min(14,18000/((distance/scale)**2+900))*Math.max(0,1-(distance/(210*scale))**4);}

export function updateGuardian(engine,dt,gust){
 const boss=engine.layout?.boss;if(!boss?.attacks)return;
 const worldX=engine.distance+engine.player.x,s=boss.scale,now=engine.time;
 for(const a of boss.attacks){
  const dx=a.x-worldX;
  if(dx < -320 || dx > 820)continue;
  const finale=a.obstacle.bossPhase===3;
  const center=a.obstacle.center+Math.sin(now*.9+a.obstacle.phase)*a.obstacle.motion;
  if(boss.id==='rootbound-heart'){
   const early=boss.difficulty<=2;
   const wave=(1-Math.cos(now*(early?1.18:1.65)+a.index*.7))/2;
   const ratio=early?(finale?.79:.87):(finale?.64:.70);
   const smallest=Math.max(116*s,Math.min(a.baseGap*(ratio-(a.obstacle.guardianGate?.05:0)),early?Infinity:(finale?158:176)*s));
   a.obstacle.gap=a.baseGap+(smallest-a.baseGap)*wave;
  }else if(boss.id==='frost-matron'){
   // Choreograph the swipe against approach distance. Sprinting through a
   // warning still meets the shard, and pausing never advances it.
   sampleIceShard(a,dx,now,a);
   if(a.iceActive&&Math.abs(dx)<engine.player.radius+18*s&&iceShardContact(-dx,engine.player.y-a.iceY,engine.player.radius,a.icePoints)){
    a.spent=true;a.iceActive=false;
    engine.burst(a.x-engine.distance,a.iceY,10,'#d2f5fc');
    const charged=engine.hasCompanion('protector')&&engine.shield.charges>0
     &&engine.availableGlow>=clamp(Number(engine.mod.protectorCost)||12,1,40);
    if(engine.shield.protection>0)continue;
    if(charged||engine.proximityShieldRemaining>0){engine.hit(null);continue;}
    const lost=Math.min(20,engine.flame);
    engine.spendGlow(lost);
    engine.collisions++;
    engine.flash=.12;
    engine.setEvent('Ice shattered'+(lost?' · −'+Math.round(lost*.3)+' Sparks':''));
    engine.sound('hit');
    engine.notify();
   }
  }else if(boss.id==='storm-shepherd'){
   a.stormContact=!!gust?.active&&a.stormZones.some(zone=>gust.puffId===zone.id);
   a.stormPuffId=a.stormContact?gust.puffId:null;
   a.stormStrength=a.stormContact?gust.strength:0;
  }else if(boss.id==='hollow-sun'){
   a.wellY=center+a.side*(a.obstacle.guardianGate?49:70)*s+Math.sin(now*.8+a.index)*24*s;
   const rate=guardianWellDrain(Math.hypot(dx,engine.player.y-a.wellY),s)*(a.obstacle.guardianGate?1.45:1);
   a.draining=rate>0&&engine.flame>0;
   if(a.draining)engine.spendGlow(rate*dt);
  }
 }
}
