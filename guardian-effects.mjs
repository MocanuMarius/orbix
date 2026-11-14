import {iceShardPoints,iceShardContact,sampleIceShard} from './guardian-geometry.mjs?v=guardian-currents-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function prepareGuardian(layout,height,speed){
 const boss=layout.boss,s=height/620;
 if(['moonweaver','hollow-warden'].includes(boss.id))return layout;
 const byId=new Map(layout.obstacles.map(o=>[o.id,o]));
 for(const spark of layout.embers){
  const o=byId.get(spark.anchor);
  if(o){spark.y=o.center;spark.pocket=false;spark.pocketSide=null;spark.feature='guardian-respite';delete o.cachePocket;}
 }
 const phaseCounts=[0,0,0,0];
 boss.scale=s;boss.speed=speed;
 boss.attacks=[];
 for(const o of layout.obstacles){
  if(o.cacheEligible)continue;
  const order=phaseCounts[o.bossPhase]++;
  const early=boss.difficulty<=2;
  const interval=early&&boss.id==='frost-matron'?[0,3,2,boss.difficulty===1?2:1][o.bossPhase]
    :early&&boss.id==='rootbound-heart'?[0,3,2,1][o.bossPhase]
    :boss.difficulty===1&&o.bossPhase!==3?2:1;
  if(order%interval)continue;
  const index=boss.attacks.length,side=o.bossPhase===1?-1:(index%2?1:-1);
  const a={x:o.x+o.width*.65,center:o.center,y:o.center,baseGap:o.gap,side,obstacle:o,index,spent:false};
  if(boss.id==='storm-shepherd'){
   const direction=index%2?1:-1;
   // Alternate between a low updraft and a high downdraft. The opposite half
   // always has a body-wide bypass. DraftField also powers Runner resistance.
   a.stormZone={id:'shepherd-'+index,guardian:true,x:a.x,y:a.center-direction*o.gap*.17,
    rx:96+(o.bossPhase-1)*7,ry:o.gap*.28,direction,force:520+(o.bossPhase-1)*35,triggeredAt:null};
  }
  if(boss.id==='frost-matron'){
   // Early shards claim the marked wall side; later swipes reach toward mid-lane.
   a.iceReach=early?([0,.29,.16,.03][o.bossPhase]-(boss.difficulty-1)*.035):-.10;
   a.iceOrigin=a.center+side*o.gap*.5;a.iceEnd=a.center+side*o.gap*a.iceReach;
   a.iceY=a.iceOrigin;a.iceProgress=0;a.iceActive=false;
   a.icePoints=iceShardPoints(a,s);
  }
  if(boss.id==='hollow-sun')a.wellY=a.center+side*70*s;
  boss.attacks.push(a);
 }
 return layout;
}

// Mark the way through each room with its existing fuel. Only reposition a
// pickup if the full body and pickup ring clear the real terrain at both sway extremes.
export function placeGuardianFuel(layout,clear){
 const boss=layout.boss;
 if(!boss?.attacks||!['frost-matron','rootbound-heart','storm-shepherd','hollow-sun'].includes(boss.id))return;
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
 const boss=layout?.boss;if(!boss?.attacks)return;
 boss.scale*=factor;
 for(const a of boss.attacks){
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
   const smallest=early?a.baseGap*(finale?.79:.87):Math.min(a.baseGap*(finale?.64:.70),(finale?158:176)*s);
   a.obstacle.gap=a.baseGap+(smallest-a.baseGap)*wave;
  }else if(boss.id==='frost-matron'){
   // Choreograph the swipe against approach distance. Sprinting through a
   // warning still meets the shard, and pausing never advances it.
   sampleIceShard(a,dx,now,a);
   if(a.iceActive&&Math.abs(dx)<engine.player.radius+15*s&&iceShardContact(-dx,engine.player.y-a.iceY,engine.player.radius,a.icePoints)){
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
    engine.setEvent('Ice shattered'+(lost?' · −'+Math.round(lost*.3)+' Energy':''));
    engine.sound('hit');
    engine.notify();
   }
  }else if(boss.id==='storm-shepherd'){
   a.stormContact=!!gust?.active&&gust.puffId===a.stormZone.id;
   a.stormStrength=a.stormContact?gust.strength:0;
  }else if(boss.id==='hollow-sun'){
   a.wellY=center+a.side*70*s+Math.sin(now*.8+a.index)*24*s;
   const rate=guardianWellDrain(Math.hypot(dx,engine.player.y-a.wellY),s);
   a.draining=rate>0&&engine.flame>0;
   if(a.draining)engine.spendGlow(rate*dt);
  }
 }
}
