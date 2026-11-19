import {pixelContour} from './pixel-contour.mjs?v=noflag-1';
import {sparkSymbolArt} from './spark-symbol.mjs?v=noflag-1';
const rect=(x,y,w,h,ink,opacity=1)=>`<path fill="${ink}" opacity="${opacity}" d="M${x} ${y}h${w}v${h}h-${w}z"/>`;
export const fineShape=(points,ink,step=1,opacity=1)=>`<path fill="${ink}" opacity="${opacity}" d="M${pixelContour(points,step).map(p=>p.join(' ')).join('L')}Z"/>`;
const oval=(x,y,rx,ry,ink)=>fineShape(Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return[x+Math.cos(a)*rx,y+Math.sin(a)*ry];}),ink);

// 52 × 48 source art. At the large chest's half-scale each source pixel is
// close to a text/scene pixel, rather than enlarging a 15-row inventory sprite.
const objectCache=new Map();
export function fineTreasureObject(kind,c){
 const key=kind+':'+c.join(',');let art=objectCache.get(key);
 if(!art){art=paintTreasureObject(kind,c);objectCache.set(key,art);if(objectCache.size>32)objectCache.delete(objectCache.keys().next().value);}
 return art;
}
function paintTreasureObject(kind,c){
 const [shadow,dark,mid,light,white,metal]=c;
 if(kind==='vessel')return fineShape([[20,7],[31,7],[31,14],[35,18],[40,23],[43,29],[43,35],[40,41],[34,45],[20,46],[13,42],[9,36],[8,29],[11,23],[17,17],[20,14]],shadow)+
  fineShape([[22,8],[29,8],[29,16],[34,20],[38,24],[41,30],[40,36],[36,41],[30,44],[21,44],[15,40],[11,34],[11,29],[14,24],[20,18],[22,15]],dark)+
  fineShape([[22,16],[28,16],[29,20],[35,25],[38,31],[37,36],[33,40],[22,42],[16,38],[14,33],[15,27],[20,22]],mid)+
  fineShape([[22,18],[24,18],[22,23],[18,28],[17,33],[18,37],[16,36],[15,32],[16,27],[20,22]],light)+
  fineShape([[29,22],[35,26],[38,32],[36,37],[32,40],[28,41],[31,38],[33,34],[33,29]],shadow,1,.4)+
  oval(26,32,6.5,7,light)+oval(25,31,4.5,5,white)+sparkSymbolArt(16,22,20)+
  rect(21,29,1,4,white,.7)+rect(30,33,1,3,white,.8)+rect(24,24,2,1,white,.8)+
  rect(22,9,2,6,light,.65)+rect(27,10,1,4,white,.6)+
  fineShape([[19,1],[32,1],[34,3],[34,6],[31,8],[20,8],[18,6],[18,3]],shadow)+
  rect(20,2,12,4,metal)+rect(20,2,10,1,white,.7)+rect(22,5,2,1,shadow,.5)+rect(28,3,1,2,shadow,.5)+
  rect(15,26,1,5,white,.65)+rect(13,31,1,3,light)+rect(19,40,4,1,light,.6)+rect(32,40,3,1,light,.4);
 if(kind==='lens')return fineShape([[29,29],[34,32],[21,46],[16,47],[14,44]],shadow)+
  fineShape([[29,32],[31,34],[19,46],[16,44]],metal)+rect(17,42,2,2,light)+
  oval(29,20,17,18,shadow)+oval(29,19,15,16,metal)+oval(29,19,13,14,dark)+
  oval(28,18,11,12,mid)+fineShape([[23,8],[29,6],[34,8],[28,10],[23,15],[20,21],[19,16],[21,11]],light,1,.85)+
  fineShape([[35,16],[38,14],[38,23],[34,28],[28,30],[24,28],[31,26],[34,22]],shadow,1,.4)+
  rect(19,10,2,2,white)+rect(17,17,1,4,white,.8)+rect(33,5,3,1,white,.6)+rect(40,20,1,4,light)+
  rect(23,14,1,6,white,.4)+rect(29,14,4,1,white,.5)+rect(29,22,3,1,light,.8);
 if(kind==='tithe')return fineShape([[23,5],[29,5],[30,37],[36,40],[39,45],[14,45],[17,40],[22,37]],shadow)+
  rect(24,7,3,32,metal)+rect(24,8,1,27,light)+oval(26,5,4,4,white)+
  fineShape([[6,10],[24,8],[28,8],[46,11],[46,14],[28,12],[24,12],[6,13]],metal)+
  rect(8,13,1,14,dark)+rect(18,12,1,15,dark)+rect(36,13,1,16,dark)+rect(45,14,1,15,dark)+
  fineShape([[4,26],[21,26],[20,30],[17,33],[10,33],[6,30]],shadow)+
  fineShape([[5,26],[20,26],[18,29],[8,29]],light)+
  fineShape([[33,28],[49,28],[47,33],[43,35],[37,34],[34,31]],shadow)+
  fineShape([[34,28],[48,28],[46,31],[36,31]],light)+
  fineShape([[22,38],[29,38],[35,42],[36,44],[16,44],[18,41]],metal)+rect(21,39,9,1,white,.55)+rect(18,43,16,1,mid);
 return oval(33,16,15,16,shadow)+oval(33,15,13,14,metal)+oval(33,15,11,12,mid)+
  fineShape([[29,7],[35,7],[38,10],[38,16],[35,20],[29,20],[26,16],[26,11]],dark)+
  rect(29,10,6,1,white,.7)+rect(30,12,1,5,light)+rect(34,12,1,5,light)+rect(29,18,6,1,light)+
  oval(17,33,15,15,shadow)+oval(17,32,13,13,metal)+oval(17,32,11,11,dark)+
  fineShape([[11,26],[22,26],[24,28],[24,38],[21,40],[10,40],[9,37],[9,28]],mid)+
  rect(11,27,10,1,light)+rect(11,28,1,9,light)+
  rect(13,30,2,2,white)+rect(18,35,2,2,white)+rect(18,30,2,2,shadow)+rect(13,35,2,2,shadow)+
  rect(4,30,1,4,white,.6)+rect(24,6,2,1,white,.7);
}

export function cofferGrain(){
 let art='';
 for(let i=0;i<32;i++)art+=rect(20.5+(i*17%55)/2,30.5+(i*7%13)/2,.5+(i%4)*.5,.5,i%3?'#c6ad7b':'#302b24',i%3?.2:.35);
 return art+rect(23.5,34,1,1,'#d5d8bb')+rect(45.5,34,1,1,'#d5d8bb')+rect(23.5,38,.5,1,'#263c35')+rect(45.5,38,.5,1,'#263c35');
}
