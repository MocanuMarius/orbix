// The Shepherd conducts a few authored rooms. The air between them is quiet.
// Only their order, bank and approach spacing are seeded; no frame advances a room.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
function randomFor(seed){
 let state=2166136261;
 for(const char of String(seed))state=Math.imul(state^char.charCodeAt(0),16777619);
 return()=>{state+=0x6d2b79f5;let n=state;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
}

function bank(width,side,scale,variant=0){
 const shoulder=[32,51,22][variant%3],lip=[5,16,0][variant%3];
 return [[-.8*width,side*900*scale],[2.45*width,side*900*scale],
  [2.45*width,side*145*scale],[1.65*width,side*shoulder*scale],[1.1*width,side*lip*scale],
  [.3*width,0],[-.15*width,side*(54-shoulder)*scale],[-.8*width,side*145*scale]];
}

function stone(room,id,points,scale){
 const origin=room.center+room.gap/2;
 const prop={id,kind:'shepherd-outcrop',side:1,parts:[{material:'chalk',
  polygon:points.map(([x,y])=>[x-room.x,y*scale-origin])}]};
 room.sceneProps.push(prop);
 return prop;
}

function attackFor(room,index){
 return {x:room.x+room.width*.65,center:room.center,y:room.center,baseGap:room.gap,
  side:room.guardianLane?-room.guardianLane:-1,obstacle:room,index,spent:false,stormZones:[]};
}

function zoneFor(attack,kind,x,y,rx,ry,direction,force){
 const z={id:`shepherd:${attack.obstacle.id}:${kind}`,guardian:true,kind,x,y,rx,ry,direction,force,triggeredAt:null};
 attack.stormZones.push(z);attack.stormZone ||= z;
 return z;
}

export function prepareStormEncounter(layout,height,speed,seed=1){
 const boss=layout.boss,scale=height/620,mid=height/2,random=randomFor(`${seed}:shepherd-rooms`);
 const attacks=[],rooms=[],zones=[];
 // Quiet stone banks keep the original altitude and Ascension-scaled gaps.
 // Preserve every crest and the deeper-map opposite gate pairs.
 for(const o of layout.obstacles){
  o.motion=0;
  o.topShape=bank(o.width,-1,scale,o.id);o.bottomShape=bank(o.width,1,scale,o.id+1);
  o.sceneProps=[];o.cacheEligible=!o.guardianGate;o.windShelter=1;
  delete o.cachePocket;
 }
 const add=(room,kind,side)=>{
  const x=room.x+room.width*.65;
  if(kind!=='crest'){
   const gap=(430-Math.max(0,boss.difficulty-2)*4)*scale;
   const begin=x-(kind==='reversal'?330:310),end=x+350;
   for(const o of layout.obstacles){
    const mouth=o.x+o.width*.65;
    if(mouth<begin-120||mouth>end+120||o.guardianGate&&o!==room)continue;
    if(!o.guardianLane)o.center=mid;
    o.gap=Math.max(o.gap,gap);o.stormApproach=true;
   }
  }
  const a=attackFor(room,attacks.length);
  const section={id:`shepherd-room:${room.id}`,kind,side,obstacleId:room.id,
   start:x-300,end:x+330,approachStart:x-speed*1.25*1.48*2.1,center:room.center};
  room.stormRoom=kind;a.stormRoom=section;
  if(kind==='shelf'){
   // The wide lower/upper passage gives up a Spark; the stream carries a
   // deliberate detour over a floating stone shelf to the actual prize.
   zoneFor(a,'ride',x-96,mid+side*64*scale,125,66*scale,side,390);
   stone(room,section.id,[[x-5,310+side*17],[x+28,310+side*43],
    [x+150,310+side*43],[x+185,310+side*23],[x+124,310+side*8],[x+24,310+side*8]],scale);
   const reward={id:`shepherd-ride:${room.id}`,kind:'light',value:1,fuel:true,
    x:x+205,y:mid+side*(side>0?145:165)*scale,phase:random()*Math.PI*2,collected:false,attracted:false,
    feature:'storm-ride-spark',challengeLandmark:'shepherd-shelf',stormChoice:true,clearance:30*scale};
   layout.embers.push(reward);section.rewardId=reward.id;
   section.rideY=mid+side*100*scale;section.bypassY=mid+(side<0?110:-35)*scale;
   section.instruction='Ride the stream over the shelf for a Spark, or take the wide passage.';
  }else if(kind==='fork'){
   // This is an actual solid island, with room for a wisp on either side.
   // The currents push away from it and the lanes reunite in quiet air.
   stone(room,section.id,[[x-130,310],[x-83,280],[x+84,274],[x+150,305],
    [x+112,337],[x-58,345]],scale);
   // An up-current can cancel gravity at A6, but cannot require a nonexistent
   // downward control to keep the ordinary upper route inside its stone banks.
   zoneFor(a,'upper-lane',x,mid-99*scale,156,49*scale,-1,250);
   zoneFor(a,'lower-lane',x,mid+99*scale,156,49*scale,1,335);
   section.upperY=mid-95*scale;section.lowerY=mid+100*scale;section.reunionX=x+300;
   section.instruction='Choose above or below the stone. The two currents meet quiet air beyond.';
  }else if(kind==='reversal'){
   const y=room.guardianLane?room.center-side*room.gap*.31:mid+side*120*scale;
   const z=zoneFor(a,'reversal',x-110,y,268,55*scale,side,365);
   z.reverseX=z.x+24;
   // The incoming two-headed conductor warns at least 1.6 seconds before
   // the turn even at the fastest legal Runner speed.
   z.reverseWarningX=z.reverseX-speed*1.25*1.48*1.6;
   z.reverseRest=36;
   section.start=z.x-z.rx;section.end=z.x+z.rx;section.bypassY=mid+40*scale;
   section.reversalX=z.reverseX;section.warningStart=z.reverseWarningX;
   section.instruction='The double conductor turns the current. Cross the quiet side or ride its reversal.';
  }else{
   const direction=room.guardianLane?-room.guardianLane:side;
   zoneFor(a,'crest',x,room.center-direction*room.gap*.31,82,room.gap*.18,direction,355);
   section.start=x-82;section.end=x+82;section.bypassY=room.center+35*scale;
   section.instruction='Pass the marked crest through its quiet middle.';
  }
  a.x=a.stormZone.x;attacks.push(a);rooms.push(section);zones.push(...a.stormZones);
 };
 for(const phase of boss.phases.slice(0,2)){
  const candidates=layout.obstacles.filter(o=>o.bossPhase===phase.index&&!o.guardianGate);
  const order=phase.index===1||random()<.5?['shelf','fork']:['fork','shelf'];
  for(let i=0;i<2;i++){
   const fraction=[.18,.57][i]+(random()-.5)*.07;
   const target=phase.start+(phase.end-phase.start)*fraction;
   const chosen=candidates.filter(o=>!o.stormRoom).sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target))[0];
   if(chosen)add(chosen,order[i],random()<.5?-1:1);
  }
 }
 const lastPhase=boss.phases[2];
 const lastCandidates=layout.obstacles.filter(o=>o.bossPhase===3&&!o.guardianGate);
 const target=lastPhase.start+(lastPhase.end-lastPhase.start)*(.20+random()*.06);
 const lastRoom=lastCandidates.sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target))[0];
 if(lastRoom)add(lastRoom,random()<.5?'shelf':'fork',random()<.5?-1:1);
 const finalCrests=boss.crests.filter(o=>o.bossPhase===3);
 const finale=finalCrests.at(-1)||layout.obstacles.filter(o=>o.bossPhase===3).at(-2);
 if(finale){
  if(finale.guardianLane){
   // The paired manual gate needs to release before the broad final current.
   // Leave enough real horizontal distance for its outer bank to fall away.
   finale.x+=250;
   const section=layout.sections.find(section=>section.id===finale.sectionId);
   if(section){section.start+=250;section.end+=250;section.warningStart+=250;}
  }
  // A wide approach and independent bypass make the last turn a readable
  // decision. Linked late crests keep their own positions and marked lanes.
  if(!finale.guardianLane)finale.center=mid;
  add(finale,'reversal',finale.guardianLane?-finale.guardianLane:random()<.5?-1:1);
 }
 for(const crest of boss.crests)if(crest!==finale)add(crest,'crest',random()<.5?-1:1);
 attacks.sort((a,b)=>a.x-b.x);attacks.forEach((a,i)=>a.index=i);
 rooms.sort((a,b)=>a.start-b.start);zones.sort((a,b)=>a.x-b.x);
 boss.attacks=attacks;boss.stormRooms=rooms;boss.stormZones=zones;
 const currentEnd=Math.max(...zones.map(z=>z.x+z.rx));
 const recoveryEnd=currentEnd+speed*1.25*1.48*2.1,recoveryStart=currentEnd+80,span=recoveryEnd-recoveryStart;
 // A low, visible stone landing makes the final field-free run real geometry;
 // course-end detection therefore retains it instead of trimming empty air.
 layout.obstacles.push({id:'shepherd-recovery',x:recoveryStart,width:span/2.45,center:height,gap:0,motion:0,phase:0,
  pattern:'shepherd-recovery',variation:0,bossPhase:3,hard:false,soft:false,destroyed:false,hit:false,passed:false,
  topShape:null,bottomShape:[[0,height],[span,height],[span,-28*scale],[span*.3,-28*scale],[0,-8*scale]],sceneProps:[]});
 layout.sections.push({id:'shepherd-recovery',name:'QUIET AIR',start:currentEnd,end:recoveryEnd,kind:'breather',hard:false,leg:2});
 boss.stormRecovery={start:currentEnd,end:recoveryEnd};
 layout.embers.push({id:'shepherd-recovery-spark',kind:'light',value:1,fuel:true,x:currentEnd+210,y:mid+40*scale,
  phase:0,collected:false,attracted:false,feature:'guardian-respite',challengeLandmark:'shepherd-recovery',accessible:true});
 // Keep authored rewards out of generic guardian-centering and donor passes.
 for(const p of layout.embers)if(!p.stormChoice){
  const o=layout.obstacles.find(o=>o.id===p.anchor);
  if(o)p.y=o.center;
 }
 layout.embers.sort((a,b)=>a.x-b.x);
 return layout;
}

// Position, not mutable timing, conducts the finisher. Physics and indicators
// call exactly this sampler, including a short lull before the sign changes.
export function stormZoneState(zone,worldX){
 if(!Number.isFinite(zone.reverseX))return {direction:zone.direction,strength:1,phase:'active',warning:false,warningProgress:0};
 const before=worldX<zone.reverseX;
 const warning=before&&worldX>=zone.reverseWarningX;
 const warningProgress=clamp((worldX-zone.reverseWarningX)/(zone.reverseX-zone.reverseWarningX),0,1);
 const distance=Math.abs(worldX-zone.reverseX),rest=zone.reverseRest||36;
 return {direction:before?zone.direction:-zone.direction,strength:smooth(distance/rest),
  phase:warning?'turning':before?'active':'reversed',warning,warningProgress,
  nextDirection:-zone.direction};
}

export function resizeStormRooms(boss,factor){
 for(const room of boss.stormRooms||[])for(const key of ['center','rideY','bypassY','upperY','lowerY']){
  if(Number.isFinite(room[key]))room[key]*=factor;
 }
}

export function stormRoomAt(boss,worldX){
 return boss?.stormRooms?.find(room=>worldX>=room.approachStart&&worldX<=room.end+90)||null;
}
