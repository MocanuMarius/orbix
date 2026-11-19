import {newState,createRun,selectNode} from './model.mjs?v=noflag-1';
import {BIOME_LEVELS} from './biomes.mjs?v=noflag-1';
import {circleHitsObstacle} from './flight.mjs?v=noflag-1';
import {scenePropBounds} from './scene-props.mjs?v=noflag-1';
import {terrainBoundary} from './terrain-boundary.mjs?v=noflag-1';
import {WispCompanion} from './wisp.mjs?v=noflag-1';

// A disposable run through the same App, WispFlight, HUD and authored course.
export function createBoundaryInspectorState(query=new URLSearchParams()){
 const storm=query.get('boss')==='storm-shepherd';
 const state=newState(),run=state.run=createRun(state.profile,storm?query.get('seed')||'shepherd-study':'in-game-boundary-study',1);
 const biome=query.get('biome')||'pinewood',course=Math.max(0,Math.min(3,(Number(query.get('course'))||3)-1));
 const choices=BIOME_LEVELS.filter(level=>level.biomeId===biome);
 const level=choices[course]||BIOME_LEVELS.find(level=>level.biomeId==='pinewood'&&level.variant===2)||BIOME_LEVELS[0];
 const node={...level,id:'boundary-flight',levelId:level.id,type:'flight',row:0,mapIndex:0,difficulty:1,duration:90,nextIds:[]};
 if(storm)Object.assign(node,{name:'Storm Shepherd',terrain:'storm',boss:true,bossId:'storm-shepherd',row:6,type:'finale'});
 run.map=[[node]];run.step=0;run.path=[];run.phase='map';run.guideSkipped=true;
 run.startingGiftId='boundary-inspection';run.stats.flights=4;
 if(query.has('spacetime')&&query.get('spacetime')!=='off')run.skills={'proximity-awakening':1,'main-edging-tension':1,'proximity-grace':1,'proximity-spacetime':1};
 if(query.get('fieldimpulse')==='1')Object.assign(run.skills,{'collector-attunement':1,'collector-field-impulse':1});
 state.settings.skipTutorial=true;
 if(!selectNode(run,node.id))throw Error('Cannot open boundary flight');
 return state;
}

export function frameBoundaryInspection(engine,query=new URLSearchParams()){
 const finish=()=>{
  if(query.has('collector')){
   const paired=query.get('collector')==='twin';
   engine.mod.wispCooldown=.4;engine.mod.cardTwinOrbit=paired;
   engine.wisp=new WispCompanion(engine.player);engine.collectors=[engine.wisp];engine.syncCollectors();
   // Missed field Sparks in a disposable real flight. Normal interception,
   // Lift, tow physics, card timing, rendering and payout remain in charge.
   const packets=[{id:'collector-inspection-lower',kind:'light',sparkMass:1,x:engine.distance+engine.player.x-29,y:engine.player.y+20,phase:0}];
   if(paired)packets.push({id:'collector-inspection-upper',kind:'cluster',sparkMass:2,x:engine.distance+engine.player.x-34,y:engine.player.y-24,phase:1});
   engine.layout.embers.push(...packets);engine.layout.embers.sort((a,b)=>a.x-b.x);
   engine._pickupCount=-1;engine._nearbyPacketsUntil=-1;
  }
  engine.render();engine.notify();
 };
 if(engine.layout.boss?.id==='storm-shepherd'&&query.get('boss')==='storm-shepherd'){
  const kind=query.get('part')||'shelf',room=engine.layout.boss.stormRooms.find(room=>room.kind===kind);
  if(room){
   const x=room.start-145,y=room.center;
   engine.distance=engine.previousDistance=x-engine.player.x;
   engine.player.y=engine.previousPlayerY=y;engine.player.vy=0;
  }
  finish();return;
 }
 if(query.has('spacetime')){
  const roof=query.get('spacetime')==='roof',r=engine.player.radius;
  const segments=terrainBoundary(engine,engine.time).segments.filter(s=>s.top===roof&&s.owner.x>650&&!s.owner.motion&&!s.owner.bossPhase&&s.b[0]-s.a[0]>2&&Math.abs(s.b[1]-s.a[1])<(s.b[0]-s.a[0])*.45&&Math.min(s.a[1],s.b[1])>65&&Math.max(s.a[1],s.b[1])<engine.height-65).sort((a,b)=>(b.b[0]-b.a[0])-(a.b[0]-a.a[0]));
  const bank=segments.find(s=>{const x=(s.a[0]+s.b[0])/2,y=(s.a[1]+s.b[1])/2+(roof?1:-1)*(r+10);return engine.layout.obstacles.every(o=>o.destroyed||!circleHitsObstacle(x,y,r+2,o,engine.time));});
  if(bank){
   const worldX=(bank.a[0]+bank.b[0])/2,bankY=(bank.a[1]+bank.b[1])/2,y=bankY+(roof?1:-1)*(r+10);
   engine.distance=engine.previousDistance=worldX-engine.player.x;engine.player.y=engine.previousPlayerY=y;engine.player.vy=0;
   // One fixed reference Spark belongs only to this disposable inspection run.
   // The ability itself never reads, repositions or generates any pickup.
   engine.layout.embers.push({id:'spacetime-inspection',kind:'light',value:1,fuel:true,x:worldX+48,y:y+(roof?14:-14),phase:0,collected:false});
   engine.layout.embers.sort((a,b)=>a.x-b.x);engine._pickupCount=-1;
   for(let i=0;i<45;i++)engine.spacetime?.update(1/60,engine.getNearbyObstacles());
   finish();return;
  }
 }
 // Seek to real scenery rather than making the player cross the empty entrance.
 const candidates=engine.layout.obstacles.filter(o=>!o.destroyed&&o.x>650&&o.x<engine.totalDistance*.7);
 const host=candidates.find(o=>o.sceneProps?.length)||candidates[1]||candidates[0];
 if(!host){finish();return;}
 const prop=scenePropBounds(host)[0],worldX=(prop?.minX??host.x)-100;
 const nearby=engine.layout.obstacles.filter(o=>Math.abs(o.x-worldX)<900);
 const center=engine.obstacleCenter(host);
 const ys=[center,center+host.gap*.2,center-host.gap*.2,engine.height*.5];
 const y=ys.find(y=>y>24&&y<engine.height-24&&!nearby.some(o=>circleHitsObstacle(worldX,y,engine.player.radius+5,o,engine.time,engine.obstacleCenter(o))));
 if(y===undefined){finish();return;}
 engine.distance=engine.previousDistance=worldX-engine.player.x;
 engine.player.y=engine.previousPlayerY=y;engine.player.vy=0;
 finish();
}
