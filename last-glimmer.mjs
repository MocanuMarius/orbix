import {lightVisibility} from './light-field.mjs?v=seed-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function fatalFlightPosition(engine){
  if(engine.tutorial||engine.dream?.mode==='record'||engine.dream?.active||engine.dream?.phase==='replay')return null;
  const length=engine.totalDistance+engine.player.x;
  if(!(length>0)||!engine.options?.node?.id)return null;
  return {nodeId:engine.options.node.id,seed:String(engine.seed),
    x:clamp((engine.distance+engine.player.x)/length,0,1),y:clamp(engine.player.y/engine.height,0,1)};
}
export function lastGlimmerState(engine,{distance=engine.renderDistance??engine.distance,playerY=engine.renderPlayerY??engine.player.y,light=engine.getLightState?.()||{},time=engine.visualTime??engine.time}={}){
  const marker=engine.mod?.lastGlimmer;
  if(!marker||engine.tutorial||engine.dying||engine.completing||engine.finished||engine.dream?.mode==='record'||engine.dream?.active||engine.dream?.phase==='replay'
    ||marker.nodeId!==engine.options?.node?.id||marker.seed!==String(engine.seed))return null;
  const worldX=marker.x*(engine.totalDistance+engine.player.x),y=marker.y*engine.height,x=worldX-distance;
  const ahead=worldX-(distance+engine.player.x),radius=Math.max(1,light.radius||145);
  if(x< -18||x>engine.width+18||ahead< -72||Math.hypot(x-engine.player.x,y-playerY)>radius)return null;
  const visible=lightVisibility(engine,light,x,y,playerY);
  if(visible<.08)return null;
  const approach=clamp((radius-Math.hypot(x-engine.player.x,y-playerY))/32,0,1);
  const passed=clamp((ahead+72)/72,0,1);
  const shimmer=engine.reducedMotion?1:.88+.12*Math.sin(time*5.2);
  return {x,y,worldX,alpha:.65*visible*approach*passed*shimmer};
}
const ghostRows=['000001111100000','000112222211000','001222222222100','012222333222210','012233333332210','122333333333221','122333333333221','122333333333221','122333333333221','012233333332210','012222333222210','001222222222100','000122222221000','000122122121000','000010011010000','000000001000000'];
export function drawLastGlimmer(ctx,engine,options={}){
  const state=lastGlimmerState(engine,options);if(!state||state.alpha<=.005)return;
  const scale=options.scale||1,pixel=Math.max(.6,scale*1.25),colors=[null,'#c1d9d4','#9fbeb9','#e4ece1'];
  ctx.save();ctx.globalAlpha=state.alpha;ctx.translate(Math.round(state.x*scale),Math.round(state.y*scale));
  // The remembered position stays still. Only opacity shimmers, then fades as
  // you pass; there is no collectible core, hitbox, light source or reward.
  for(let row=0;row<ghostRows.length;row++)for(let col=0;col<ghostRows[row].length;col++){
    const shade=Number(ghostRows[row][col]);if(!shade)continue;
    ctx.fillStyle=colors[shade];ctx.fillRect((col-7)*pixel,(row-7)*pixel,pixel,pixel);
  }
  ctx.restore();
}
