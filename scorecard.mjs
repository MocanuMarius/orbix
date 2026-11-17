// Stateless image + link utilities. No campaign or record storage is accessed here.
const LIMIT=999999999;
const integer=(value,max=LIMIT)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=max;
const safeVersion=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/.test(value);
export function cleanScorecard(value){
 if(!value||value.v!==1||!integer(value.earned)||!integer(value.ascension,99)||value.ascension<1||
  !['won','lost'].includes(value.outcome)||!integer(value.flights,999)||!safeVersion(value.version)||typeof value.complete!=='boolean')return null;
 const score={v:1,earned:value.earned,ascension:value.ascension,outcome:value.outcome,flights:value.flights,version:value.version,complete:value.complete};
 if(value.comparison){const c=value.comparison;
  if(!integer(c.ascensionBest)||!integer(c.overallBest)||c.ascensionBest<score.earned||c.overallBest<c.ascensionBest||typeof c.ascensionNew!=='boolean'||typeof c.overallNew!=='boolean')return null;
  score.comparison={ascensionBest:c.ascensionBest,overallBest:c.overallBest,ascensionNew:c.ascensionNew,overallNew:c.overallNew};
 }
 return score;
}
export function scorecardLink(score,base){
 const clean=cleanScorecard(score);if(!clean)throw new Error('Invalid scorecard');
 const url=new URL('./scorecard.html',base);url.hash=new URLSearchParams({card:JSON.stringify(clean)}).toString();return url.href;
}
export function scorecardFromHash(hash){
 if(typeof hash!=='string'||hash.length>1800)return null;
 try{const params=new URLSearchParams(hash.replace(/^#/,''));if([...params.keys()].some(k=>k!=='card')||params.getAll('card').length!==1)return null;return cleanScorecard(JSON.parse(params.get('card')));}catch{return null;}
}
const glyphs={
 A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/10010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/11001/10101/10011/10011/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
 0:'01110/10001/10011/10101/11001/10001/01110',1:'00100/01100/00100/00100/00100/00100/01110',2:'01110/10001/00001/00010/00100/01000/11111',3:'11110/00001/00001/01110/00001/00001/11110',4:'00010/00110/01010/10010/11111/00010/00010',5:'11111/10000/10000/11110/00001/00001/11110',6:'01110/10000/10000/11110/10001/10001/01110',7:'11111/00001/00010/00100/01000/01000/01000',8:'01110/10001/10001/01110/10001/10001/01110',9:'01110/10001/10001/01111/00001/00001/01110',
 '-':'00000/00000/00000/11111/00000/00000/00000','.':'00000/00000/00000/00000/00000/00110/00110','_':'00000/00000/00000/00000/00000/00000/11111',':':'00000/00110/00110/00000/00110/00110/00000','+':'00000/00100/00100/11111/00100/00100/00000','/':'00001/00001/00010/00100/01000/10000/10000'
};
function pixelText(ctx,text,x,y,scale=1,color='#e7e8cd',center=false,shadow='#1c140d'){
 text=String(text).toUpperCase();if(center)x-=Math.floor((text.length*6-1)*scale/2);
 for(const [pass,dx,dy] of shadow?[[shadow,1,scale>1?2:1],[color,0,0]]:[[color,0,0]]){ctx.fillStyle=pass;let px=x;
  for(const char of text){const rows=(glyphs[char]||'00000/00000/00000/00000/00000/00000/00000').split('/');rows.forEach((row,iy)=>[...row].forEach((bit,ix)=>{if(bit==='1')ctx.fillRect(px+dx+ix*scale,y+dy+iy*scale,scale,scale);}));px+=6*scale;}}
}
// 16x16 pixel icons, the same shapes as assets/ui/spark.svg (SPARK_ICON_SRC) and assets/ui/waystone/orb-wisp.svg, kept
// inline so the canvas stays synchronous (no image load before toDataURL/toBlob).
const SPARK_PATHS=[['#2a1d12','M7 0h1v1h-1zM8 0h1v1h-1zM6 1h1v1h-1zM9 1h1v1h-1zM6 2h1v1h-1zM9 2h1v1h-1zM6 3h1v1h-1zM9 3h1v1h-1zM5 4h1v1h-1zM10 4h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM10 5h1v1h-1zM11 5h1v1h-1zM1 6h1v1h-1zM2 6h1v1h-1zM3 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM14 6h1v1h-1zM0 7h1v1h-1zM15 7h1v1h-1zM0 8h1v1h-1zM15 8h1v1h-1zM1 9h1v1h-1zM2 9h1v1h-1zM3 9h1v1h-1zM12 9h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM5 11h1v1h-1zM10 11h1v1h-1zM6 12h1v1h-1zM9 12h1v1h-1zM6 13h1v1h-1zM9 13h1v1h-1zM6 14h1v1h-1zM9 14h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1z'],['#d39a3a','M7 1h1v1h-1zM8 1h1v1h-1zM1 7h1v1h-1zM14 7h1v1h-1zM1 8h1v1h-1zM14 8h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1z'],['#f0c86a','M7 2h1v1h-1zM8 2h1v1h-1zM7 3h1v1h-1zM8 3h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM6 5h1v1h-1zM9 5h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM10 6h1v1h-1zM11 6h1v1h-1zM2 7h1v1h-1zM3 7h1v1h-1zM12 7h1v1h-1zM13 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM12 8h1v1h-1zM13 8h1v1h-1zM4 9h1v1h-1zM5 9h1v1h-1zM10 9h1v1h-1zM11 9h1v1h-1zM6 10h1v1h-1zM9 10h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM8 11h1v1h-1zM9 11h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM7 13h1v1h-1zM8 13h1v1h-1z'],['#fffdf1','M7 5h1v1h-1zM8 5h1v1h-1zM6 6h1v1h-1zM7 6h1v1h-1zM8 6h1v1h-1zM9 6h1v1h-1zM4 7h1v1h-1zM5 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM9 7h1v1h-1zM10 7h1v1h-1zM11 7h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM9 8h1v1h-1zM10 8h1v1h-1zM11 8h1v1h-1zM6 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM9 9h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1z']];
const ORB_PATHS=[['#8a7d5a','M5 1h6v1h2v1h1v2h1v6h-1v2h-1v1h-2v1H5v-1H3v-1H2v-2H1V5h1V3h1V2h2z'],['#d8c98a','M5 2h6v1h2v2h1v6h-1v2h-2v1H5v-1H3v-2H2V5h1V3h2z'],['#f3e6b9','M6 3h4v1h2v2h1v4h-1v2h-2v1H6v-1H4v-2H3V6h1V4h2z'],['#fffdf1','M6 5h3v1h1v3H9v1H6V9H5V6h1z']];
function paintIcon(ctx,paths,x,y,scale){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);for(const [color,path] of paths){ctx.fillStyle=color;ctx.fill(new Path2D(path));}ctx.restore();}
export function createScorecardCanvas(value,{document:doc=globalThis.document,scale=3}={}){
 const score=cleanScorecard(value);if(!score)throw new Error('Invalid scorecard');
 const canvas=doc.createElement('canvas');canvas.width=480*scale;canvas.height=270*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 // Book kit: dark leather ground, stepped edge, gold rules, cream ink (readable on a dark or light chat background).
 ctx.fillStyle='#33261a';ctx.fillRect(0,0,480,270);
 for(let i=0;i<150;i++){ctx.fillStyle=i%3?'#3b2d20':'#2a1f15';ctx.fillRect((i*67)%472+4,(i*41)%262+4,i%5?1:2,1);}
 ctx.lineWidth=1;ctx.strokeStyle='#1c140d';ctx.strokeRect(6.5,6.5,467,257);ctx.strokeStyle='#8a6d44';ctx.strokeRect(8.5,8.5,463,253);ctx.strokeStyle='#4a3828';ctx.strokeRect(10.5,10.5,459,249);
 ctx.fillStyle='#2a1f15';ctx.fillRect(24,92,432,72);ctx.strokeStyle='#5a4632';ctx.strokeRect(24.5,92.5,431,71);
 paintIcon(ctx,ORB_PATHS,162,21,1);paintIcon(ctx,ORB_PATHS,302,21,1);
 pixelText(ctx,'WISPBOUND',240,23,2,'#d8c08a',true);
 pixelText(ctx,score.outcome==='won'?'THE LIGHT RETURNS':'GAME OVER',240,49,2,'#fff6d8',true);
 pixelText(ctx,`ASCENSION ${score.ascension}  /  ${score.flights} FLIGHTS CLEARED`,240,74,2,'#e2d0a6',true);
 paintIcon(ctx,SPARK_PATHS,51,98,4);
 pixelText(ctx,score.earned,292,101,4,'#f0c86a',true);
 pixelText(ctx,'STORED SPARKS EARNED',292,140,2,'#f6ebcc',true);
 ctx.fillStyle='#1c140d';ctx.fillRect(40,168,400,1);ctx.fillStyle='#d8c08a';ctx.fillRect(40,167,400,1);paintIcon(ctx,[['#1c140d','M5 0h4v1h2v1h3v2h-3v1H9v1H5V5H3V4H0V2h3V1h2z'],['#8a6d44','M1 2h2v2H1zM11 2h2v2h-2z'],['#d8c08a','M5 1h4v1h1v2H9v1H5V4H4V2h1z'],['#fff1c5','M6 2h2v1H6z']],233,165,1);
 if(score.complete&&score.comparison){const c=score.comparison;
  pixelText(ctx,`ASC ${score.ascension} BEST ${c.ascensionBest}${c.ascensionNew?' - NEW':''}`,240,181,2,'#f6ebcc',true);
  pixelText(ctx,`OVERALL BEST ${c.overallBest}${c.overallNew?' - NEW':''}`,240,202,2,'#f6ebcc',true);
 }else{
  pixelText(ctx,score.complete?'PERSONAL BEST NOT SAVED':'EARNED SINCE UPDATE - UNRANKED',240,181,2,'#f6ebcc',true);
  pixelText(ctx,score.complete?'ON THIS DEVICE':'EARLIER EARNINGS UNAVAILABLE',240,202,2,'#e2d0a6',true);
 }
 pixelText(ctx,'SPENDING NEVER REDUCES THIS SCORE',240,220,1,'#e2d0a6',true);
 pixelText(ctx,`VERSION ${score.version}`,240,242,score.version.length>30?1:2,'#d8c08a',true);
 return canvas;
}
export const scorecardDataURL=score=>createScorecardCanvas(score).toDataURL('image/png');
export function scorecardPNG(score){return new Promise((resolve,reject)=>createScorecardCanvas(score).toBlob(blob=>blob?resolve(blob):reject(new Error('PNG unavailable')),'image/png'));}
export function downloadScorecard(blob,score,doc=globalThis.document){
 const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=`wispbound-ascension-${score.ascension}-${score.earned}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function shareScorecard(score,{navigator:nav=globalThis.navigator,document:doc=globalThis.document}={}){
 const blob=await scorecardPNG(score),name=`wispbound-ascension-${score.ascension}-${score.earned}.png`;
 const file=new File([blob],name,{type:'image/png'});
 if(nav.canShare?.({files:[file]})&&nav.share){
  try{await nav.share({files:[file],title:'Wispbound scorecard'});return 'shared';}
  catch(error){if(error.name==='AbortError')return 'cancelled';}
 }
 downloadScorecard(blob,score,doc);return 'downloaded';
}
