const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));

function clippedRight(polygon,top,bottom){
  let right=-Infinity;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i],dy=b[1]-a[1];let lo=0,hi=1;
    if(Math.abs(dy)<1e-9){if(a[1]<top||a[1]>bottom)continue;}
    else{const t0=(top-a[1])/dy,t1=(bottom-a[1])/dy;lo=Math.max(0,Math.min(t0,t1));hi=Math.min(1,Math.max(t0,t1));if(lo>hi)continue;}
    right=Math.max(right,a[0]+(b[0]-a[0])*lo,a[0]+(b[0]-a[0])*hi);
  }
  return right;
}

/** Extents of actual on-screen solids, including full sway and prop polygons.
 * Deep underground closing vertices do not extend the playable course. */
export function visibleCourseEnd(layout,{height=620}={}){
  let right=-Infinity;
  for(const o of layout.obstacles||[]){
    if(o.exitFoundation||o.destroyed)continue;
    for(const sway of [-Math.abs(o.motion||0),Math.abs(o.motion||0)]){
      for(const [side,shape]of[[-1,o.topShape],[1,o.bottomShape]])if(shape?.length){
        const cy=o.center+sway+side*o.gap/2;
        right=Math.max(right,clippedRight(shape.map(([x,y])=>[o.x+x,cy+y]),0,height));
      }
      for(const prop of o.sceneProps||[])for(const part of prop.parts||[]){
        const cy=o.center+sway+(prop.side||1)*o.gap/2;
        right=Math.max(right,clippedRight(part.polygon.map(([x,y])=>[o.x+x,cy+y]),0,height));
      }
    }
  }
  return Number.isFinite(right)?right:null;
}

/** A shallow landing joins the existing ground at the screen's lower edge.
 * Only this visible foundation collides. The recessed doorway is background,
 * leaving the broad central flight lane free through the arrival plane. */
export function installExitLandmark(layout,{height=620,playerX=98,fallback=0}={}){
  if(layout.exitLandmark)return layout.exitLandmark;
  const courseEnd=visibleCourseEnd(layout,{height});
  if(courseEnd===null)return null;
  const scale=height/620,entryX=courseEnd+26;
  const groundY=height-24*scale,start=courseEnd-112,span=222;
  const foundation={id:'exit-landing',exitFoundation:true,x:start,width:span/2.45,
    center:height,gap:0,motion:0,phase:0,pattern:'refuge-landing',variation:0,
    levelId:layout.levelIdentity?.id,landmark:'wayside-refuge',setpiece:'landing',sectionId:'refuge-arrival',
    hard:false,soft:false,destroyed:false,hit:false,passed:false,sceneProps:[],
    topShape:null,bottomShape:[[0,height*2],[span,height*2],[span,-24*scale],[72,-24*scale],[0,0]]};
  layout.obstacles.push(foundation);layout.obstacles.sort((a,b)=>a.x-b.x);
  const doorHeight=clamp(height*.52,192,280);
  const landmark={id:'wayside-refuge',entryX,worldX:entryX,height,groundY,doorHeight,
    y:groundY-doorHeight*.45,courseEnd,foundationId:foundation.id,backgroundDoor:true,
    finishDistance:Math.max(1,entryX-playerX),fallback};
  layout.exitLandmark=landmark;
  return landmark;
}

export function getExitLandmarkState(layout,{distance=0,width=390,height=620}={}){
  const exit=layout?.exitLandmark;if(!exit)return null;
  const x=exit.entryX-distance;
  if(x>width+145||x<-160)return null;
  const ratio=height/exit.height;
  return {...exit,x,y:exit.y*ratio,groundY:exit.groundY*ratio,doorHeight:exit.doorHeight*ratio,
    progress:clamp(1-x/Math.max(1,width),0,1)};
}

const PALETTES={
  ruins:{wall:'#364239',edge:'#64705c',shade:'#182722',roof:'#485342',glow:'#efe0a7'},
  canopy:{wall:'#304236',edge:'#64794e',shade:'#17291f',roof:'#435d3c',glow:'#dfedb1'},
  storm:{wall:'#39434b',edge:'#738087',shade:'#1b2830',roof:'#515d68',glow:'#e6e4bf'},
};

/** Draw an old shelter cut into the far wall, planted on the real landing.
 * Its muted arch is intentionally background, without bright hazard edges.
 * Call before drawing the player so flying through the opening reads clearly. */
export function drawExitLandmark(c,{refuge,scale=1,terrain='ruins',time=0,reducedMotion=false}={}){
  if(!refuge)return;
  const p=PALETTES[terrain]||PALETTES.ruins,r=v=>Math.round(v*scale);
  const h=refuge.doorHeight,x=Math.round(refuge.x*scale),y=Math.round(refuge.groundY*scale);
  const rect=(a,b,w,hh,ink)=>{c.fillStyle=ink;c.fillRect(r(a),r(b),Math.max(1,r(w)),Math.max(1,r(hh)))};
  const polygon=(points,ink)=>{c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(r(a),r(b)):c.moveTo(r(a),r(b)));c.closePath();c.fillStyle=ink;c.fill()};
  c.save();c.translate(x,y);
  // Grounded side walls and a pitched, weathered shelter roof match Rest's
  // house silhouette, with a dark arched hollow instead of a magical gate.
  polygon([[-57,0],[-57,-h+34],[-40,-h+9],[-7,-h-13],[32,-h+1],[57,-h+35],[57,0]],p.wall);
  polygon([[-40,0],[-40,-h+46],[-27,-h+24],[0,-h+12],[26,-h+26],[40,-h+48],[40,0]],p.shade);
  polygon([[-66,-h+36],[-18,-h-8],[2,-h-25],[66,-h+30],[58,-h+40],[2,-h-10],[-55,-h+42]],p.roof);
  rect(-52,-h+47,7,h-47,p.edge);rect(47,-h+49,5,h-49,p.edge);
  // Mortar, roots and chipped masonry provide material rather than a neon ring.
  for(let i=0;i<5;i++){const yy=-h+55+i*(h-58)/5;
    rect(-55,yy,17,2,p.shade);rect(41,yy+9,16,2,p.shade);
    if(terrain==='canopy'){rect(-59-i%2*3,yy,4,17,p.roof);rect(55,yy+4,3,14,p.roof)}
  }
  rect(-59,0,120,8,p.wall);rect(-54,0,108,2,p.edge);
  // A real bracket holds the warm lamp against the recessed wall.
  const lampY=-h*.45;
  rect(-32,-h+35,3,h*.55-36,p.roof);rect(-32,lampY-12,24,3,p.edge);
  rect(-11,lampY-11,2,11,p.edge);
  const shimmer=reducedMotion?0:Math.sin(time*1.4)*.025;
  for(const [size,alpha]of[[31,.025],[22,.045],[14,.085]]){c.globalAlpha=alpha+shimmer*.25;
    rect(-10-size/2,lampY+9-size/2,size,size,p.glow);}
  c.globalAlpha=1;rect(-18,lampY,17,3,p.edge);rect(-16,lampY+3,13,19,p.roof);
  rect(-13,lampY+6,7,12,p.glow);rect(-17,lampY+22,15,3,p.edge);
  rect(-10,lampY+6,2,12,'#fff4d5');
  // The open interior ends at this plane; there is no glowing barrier to hit.
  rect(-30,-4,62,3,p.edge);
  c.restore();
}
