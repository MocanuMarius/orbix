import {newState,createRun,selectNode} from './model.mjs?v=in-game-edges-1';
import {BIOME_LEVELS} from './biomes.mjs?v=in-game-edges-1';
import {circleHitsObstacle} from './flight.mjs?v=in-game-edges-1';
import {scenePropBounds} from './scene-props.mjs?v=in-game-edges-1';

// A disposable run through the same App, WispFlight, HUD and authored course.
export function createBoundaryInspectorState(query=new URLSearchParams()){
 const state=newState(),run=state.run=createRun(state.profile,'in-game-boundary-study',1);
 const biome=query.get('biome')||'pinewood',course=Math.max(0,Math.min(3,(Number(query.get('course'))||3)-1));
 const choices=BIOME_LEVELS.filter(level=>level.biomeId===biome);
 const level=choices[course]||BIOME_LEVELS.find(level=>level.biomeId==='pinewood'&&level.variant===2)||BIOME_LEVELS[0];
 const node={...level,id:'boundary-flight',levelId:level.id,type:'flight',row:0,mapIndex:0,difficulty:1,duration:90,nextIds:[]};
 run.map=[[node]];run.step=0;run.path=[];run.phase='map';run.guideSkipped=true;
 run.startingGiftId='boundary-inspection';run.stats.flights=4;
 state.settings.skipTutorial=true;
 if(!selectNode(run,node.id))throw Error('Cannot open boundary flight');
 return state;
}

export function frameBoundaryInspection(engine){
 // Seek to real scenery rather than making the player cross the empty entrance.
 const candidates=engine.layout.obstacles.filter(o=>!o.destroyed&&o.x>650&&o.x<engine.totalDistance*.7);
 const host=candidates.find(o=>o.sceneProps?.length)||candidates[1]||candidates[0];
 if(!host)return;
 const prop=scenePropBounds(host)[0],worldX=(prop?.minX??host.x)-100;
 const nearby=engine.layout.obstacles.filter(o=>Math.abs(o.x-worldX)<900);
 const center=engine.obstacleCenter(host);
 const ys=[center,center+host.gap*.2,center-host.gap*.2,engine.height*.5];
 const y=ys.find(y=>y>24&&y<engine.height-24&&!nearby.some(o=>circleHitsObstacle(worldX,y,engine.player.radius+5,o,engine.time,engine.obstacleCenter(o))));
 if(y===undefined)return;
 engine.distance=engine.previousDistance=worldX-engine.player.x;
 engine.player.y=engine.previousPlayerY=y;engine.player.vy=0;
 engine.render();engine.notify();
}
