// Stable orthogonal steps: no animated noise and no long vector diagonals.
export function pixelContour(points,step=2){
 const out=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/step));
  for(let j=0;j<count;j++){
   const x=Math.round((a[0]+(b[0]-a[0])*j/count)/step)*step;
   const y=Math.round((a[1]+(b[1]-a[1])*j/count)/step)*step;
   const last=out.at(-1);if(last&&last[0]!==x&&last[1]!==y)out.push([x,last[1]]);
   if(!last||last[0]!==x||last[1]!==y)out.push([x,y]);
  }
 }
 const a=out.at(-1),b=out[0];if(a&&a[0]!==b[0]&&a[1]!==b[1])out.push([b[0],a[1]]);
 // Only retain corners; straight runs need no extra collision segments.
 return out.filter((v,i)=>{const p=out[(i+out.length-1)%out.length],n=out[(i+1)%out.length];
  return !(p[0]===v[0]&&v[0]===n[0]||p[1]===v[1]&&v[1]===n[1]);});
}
export const pixelPath=points=>'M'+pixelContour(points).map(p=>p.join(' ')).join('L')+'Z';

// Hand-cut, unequal boughs; silhouette is shared by the distant forest,
// ridge landmarks and the menu. Coordinates are authored on a 24-row grid.
const rows=[[2,3],[1,3],[1,4],[0,5],[-2,6],[-3,4],[-1,3],[-2,5],[-4,7],[-6,8],[-3,6],[-2,4],[-4,7],[-7,9],[-9,10],[-6,7],[-3,5],[-5,8],[-8,10],[-11,12],[-8,9],[-5,5],[-1,1],[-1,1]];
const outline=[];
for(let r=0;r<rows.length;r++)outline.push([rows[r][1],r],[rows[r][1],r+1]);
for(let r=rows.length-1;r>=0;r--)outline.push([rows[r][0],r+1],[rows[r][0],r]);
export function pineCrown(x,y,halfWidth,height){return outline.map(([u,v])=>[Math.round(x+u*halfWidth/12),Math.round(y-height+v*height/24)]);}
