// Facets mark the remaining path. A passed facet fades as the shard overtakes it.
export const ICE_GUIDE_FACETS=Object.freeze([1/6,2/6,3/6,4/6,5/6,1]);

export function sampleIceShard(attack, dx, time, out) {
  const o=attack.obstacle,center=o.center+Math.sin(time*.9+o.phase)*o.motion;
  out.iceOrigin=center+attack.side*attack.baseGap*.5;
  out.iceEnd=center+attack.side*attack.baseGap*attack.iceReach;
  out.iceProgress=Math.max(0,Math.min(1,(112-dx)/178));
  out.iceY=out.iceOrigin+(out.iceEnd-out.iceOrigin)*out.iceProgress;
  out.iceActive=!attack.spent&&dx<112&&dx>=-66;
  return out;
}

export function iceShardPoints(attack, scale) {
  const along = -attack.side * scale;
  return [[0,-18], [9,-13], [14,-3], [8,6], [2,22], [-5,12], [-13,-1], [-9,-12]]
    .map(([x,y]) => [x*scale,y*along]);
}

// Convex edge tests let the collision use the pointed tip and broad shoulders
// of the drawn shard, including glancing contacts with the wisp's shell.
export function iceShardContact(x, y, radius, points) {
  let positive=false,negative=false;
  for(let i=0;i<points.length;i++){
    const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
    const dx=bx-ax,dy=by-ay,cross=dx*(y-ay)-dy*(x-ax);
    positive ||= cross>0; negative ||= cross<0;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    if((x-ax-t*dx)**2+(y-ay-t*dy)**2<=radius*radius)return true;
  }
  return !(positive&&negative);
}
