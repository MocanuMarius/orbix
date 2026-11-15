import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTerrainForeground,releaseTerrainForeground} from '../dist/terrain-foreground.mjs';
import {beginTerrainBoundaryFrame,endTerrainBoundaryFrame} from '../dist/terrain-boundary.mjs';
import {SpacetimeTerrain} from '../dist/spacetime.mjs';
import {WispFlight} from '../dist/flight.mjs';

function surfaces(){
 const canvases=[],reads=[],writes=[];
 const document={createElement(){
  const canvas={ownerDocument:document,width:0,height:0},stack=[];
  const state={canvas,globalAlpha:1,globalCompositeOperation:'source-over',clips:[],draws:[],fills:[],matrix:[1,1,0,0],paths:[],current:[],
   setTransform(a,_b,_c,d,x,y){this.matrix=[a,d,x,y];},
   beginPath(){this.paths=[];this.current=[];},
   moveTo(x,y){this.current=[];this.paths.push(this.current);this.lineTo(x,y);},
   lineTo(x,y){const [sx,sy,ox,oy]=this.matrix;this.current.push([x*sx+ox,y*sy+oy]);},
   rect(x,y,width,height){this.paths.push([[x,y],[x+width,y],[x+width,y+height],[x,y+height]]);},
   fill(){this.fills.push({paths:this.paths,composite:this.globalCompositeOperation});},
   clip(){this.clips.push(this.paths.map(points=>points.map(p=>p.slice())));},
   drawImage(source,...args){this.draws.push({source,args,alpha:this.globalAlpha,composite:this.globalCompositeOperation});},
   save(){stack.push({matrix:this.matrix.slice(),alpha:this.globalAlpha,composite:this.globalCompositeOperation});},
   restore(){const saved=stack.pop();this.matrix=saved.matrix;this.globalAlpha=saved.alpha;this.globalCompositeOperation=saved.composite;},
   getImageData(){reads.push(canvas);return{data:Uint8ClampedArray.from([0,0,0,0,0,0,0,127,0,0,0,128,0,0,0,255])};},
   putImageData(image){writes.push([...image.data].filter((_v,i)=>i%4===3));},
  };
  canvas.context=new Proxy(state,{get:(o,k)=>o[k]??(()=>{})});canvas.getContext=()=>canvas.context;canvases.push(canvas);return canvas;
 }};
 const target=document.createElement('canvas');
 return{document,target,canvases,reads,writes,context:target.context};
}
const bank=(left,right,y,top=false,options={})=>({x:0,center:y,gap:0,motion:0,phase:0,...options,
 [top?'topShape':'bottomShape']:[[left,top?-900:900],[right,top?-900:900],[right,0],[left,0]]});
const engine=obstacles=>({width:390,height:390,distance:0,renderDistance:0,time:0,visualTime:0,terrain:'canopy',
 player:{x:100,y:190,radius:11},layout:{obstacles,embers:[]}});
function wind(paths,x,y){
 let value=0;
 for(const points of paths)for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);
  if(a[1]<=y&&b[1]>y&&cross>0)value++;
  if(a[1]>y&&b[1]<=y&&cross<0)value--;
 }
 return value;
}
function lastClip(f){return f.context.draws.at(-1).source.context.clips.at(-1);}

test('open sky and destroyed terrain draw no nearest foreground',()=>{
 const f=surfaces();
 for(const obstacles of [[],[{...bank(0,390,300),destroyed:true}]])drawTerrainForeground(f.context,engine(obstacles));
 assert.equal(f.context.draws.length,0);assert.equal(f.reads.length,0,'empty frames do not even bake plates');
});

test('foreground clip retains the filled roof/floor union, overlaps and real gaps at current camera scale',()=>{
 const f=surfaces(),e=engine([bank(0,100,330),bank(50,150,310),bank(0,100,50,true),bank(200,390,320)]);
 const before=JSON.stringify(e);drawTerrainForeground(f.context,e,{scale:.6,distance:20.25});
 const paths=lastClip(f),at=(x,y)=>wind(paths,Math.round(x*.6)-Math.round(20.25*.6),y*.6);
 assert.ok(at(75,350));assert.ok(at(75,30));assert.equal(at(75,200),0);assert.equal(at(175,370),0);
 const crossing=engine([bank(0,390,200),bank(0,390,250,true)]);
 drawTerrainForeground(f.context,crossing);assert.notEqual(wind(lastClip(f),75,225),0,'opposed winding cannot punch an overlap hole');
 assert.equal(JSON.stringify(e),before,'foreground never changes gameplay geometry');
});

test('shared local frame follows animated and Spacetime polygons without terrain readbacks',()=>{
 const f=surfaces(),moving=bank(0,390,330,false,{motion:16}),e=engine([moving]);
 e.visualTime=1;beginTerrainBoundaryFrame(e,1,0);drawTerrainForeground(f.context,e);endTerrainBoundaryFrame(e);
 assert.equal(wind(lastClip(f),100,335),0,'moving bank uses its current center');
 assert.notEqual(wind(lastClip(f),100,350),0);
 const dented=engine([bank(0,390,340)]);dented.player.y=325;dented.spacetime=new SpacetimeTerrain(dented);dented.spacetime.update(1);
 assert.ok(dented.layout.obstacles[0].bottomShape.spacetime);
 beginTerrainBoundaryFrame(dented,0,0);drawTerrainForeground(f.context,dented);endTerrainBoundaryFrame(dented);
 assert.equal(wind(lastClip(f),125,342),0,'locally displaced real surface clips away the former solid');
 assert.notEqual(wind(lastClip(f),125,360),0);
 assert.equal(f.reads.length,6,'only the six cached source plates are read, never the frame or terrain');
});

test('nearest silhouette alpha is baked once and final composite overrides inherited light blending',()=>{
 const f=surfaces(),e=engine([bank(0,390,300)]);f.context.globalAlpha=.2;f.context.globalCompositeOperation='screen';
 drawTerrainForeground(f.context,e);
 assert.equal(f.reads.length,6);for(const alpha of f.writes)assert.deepEqual(alpha,[0,0,255,255]);
 for(let i=0;i<5;i++)drawTerrainForeground(f.context,e,{scale:.6,distance:i+.37});
 assert.equal(f.reads.length,6,'moving/resize draws reuse binary plate alpha');
 for(const draw of f.context.draws){assert.equal(draw.alpha,1);assert.equal(draw.composite,'source-over');}
 assert.equal(f.context.globalAlpha,.2);assert.equal(f.context.globalCompositeOperation,'screen');
 const ink=f.context.draws.at(-1).source;assert.equal(ink.width,234);assert.equal(ink.height,234);
 releaseTerrainForeground(e);assert.equal(ink.width,1);assert.equal(ink.height,1);
});

test('fallback exit glow preserves its late beacon without inventing a screen-edge bank',()=>{
 const paints=[],c=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??((...args)=>paints.push([k,...args]))});
 const e={time:30,duration:100,layout:{obstacles:[]}};
 WispFlight.prototype.drawExitApproachGlow.call(e,c,390,620);assert.deepEqual(paints,[]);
 e.time=95;WispFlight.prototype.drawExitApproachGlow.call(e,c,390,620);
 assert.deepEqual(paints,[['fillRect',0,0,390,620]],'only the existing approach light remains');
});

test('contact clearance is a bounded batch of hard integer pixels across the complete art band',()=>{
 const f=surfaces(),e=engine([bank(-1e6,1e6,295)]);
 drawTerrainForeground(f.context,e,{scale:.6,distance:.37});
 const fills=f.context.draws.at(-1).source.context.fills;
 assert.equal(fills.length,1);assert.equal(fills[0].composite,'destination-out');
 assert.ok(fills[0].paths.length>0,'fungal-height contact seam is included');
 assert.ok(fills[0].paths.length<250,'long offscreen shoulders clip before integer stepping');
 for(const rectangle of fills[0].paths)for(const point of rectangle)for(const value of point)assert.ok(Number.isInteger(value));
});

test('plate blits share integer raster tile edges and reach the complete bottom row',()=>{
 const f=surfaces(),e=engine([bank(-1000,2000,300)]);e.width=670;e.height=430;
 drawTerrainForeground(f.context,e,{scale:240/390,distance:231.371});
 const ink=f.context.draws.at(-1).source,draws=ink.context.draws,floors=draws.filter(draw=>draw.source.height===160);
 assert.ok(floors.length>1);
 for(const draw of draws){for(const value of draw.args)assert.ok(Number.isInteger(value));}
 for(const [i,draw]of floors.entries()){
  const [left,top,width,height]=draw.args;assert.equal(top+height,ink.height);
  if(i)assert.equal(floors[i-1].args[0]+floors[i-1].args[2],left,'adjacent tiles use one shared snapped edge');
 }
});
