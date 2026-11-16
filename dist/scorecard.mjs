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
function pixelText(ctx,text,x,y,scale=1,color='#e7e8cd',center=false){
 text=String(text).toUpperCase();if(center)x-=Math.floor((text.length*6-1)*scale/2);ctx.fillStyle=color;
 for(const char of text){const rows=(glyphs[char]||'00000/00000/00000/00000/00000/00000/00000').split('/');rows.forEach((row,iy)=>[...row].forEach((bit,ix)=>{if(bit==='1')ctx.fillRect(x+ix*scale,y+iy*scale,scale,scale);}));x+=6*scale;}
}
function storedSymbol(ctx,x,y){
 // Same case, latch and plasma glyph as afterglow-ui.mjs / spark-symbol.mjs.
 const paths=[['#483b36','M3 6h2V4h22v1h2v3h1v5h-1v13h-2v2H5v-1H3V14H2V8h1z'],['#825f47','M4 8h24v5H4zm1 5h22v12H5z'],['#b98553','M5 8h22v3H5zm0 6h21v11H5z'],['#e6c490','M4 7h23v1H4zm1 4h22v1H5zm1 3h1v10H6z'],['#fff0bf','M7 5h18v1H7zm6 5h6v1h-6zm1 1h4v3h-4z'],['#708f8e','M9 14h14v10H9z'],['#314950','M10 15h12v8H10z']];
 ctx.save();ctx.translate(x,y);ctx.scale(2,2);for(const [color,path]of paths){ctx.fillStyle=color;ctx.fill(new Path2D(path));}
 ctx.translate(10,13);ctx.scale(.6,.6);
 for(const [color,path]of [['#705b3b','M7 1h6v1h3v2h2v3h1v6h-1v3h-2v2h-3v1H7v-1H4v-2H2v-3H1V7h1V4h2V2h3z'],['#efdea7','M7 2h6v1h3v2h1v2h1v6h-1v3h-2v1h-2v1H7v-1H4v-2H3v-2H2V7h1V5h2V3h2z'],['#6e654d','M7 4h6v1h2v2h1v6h-1v2h-2v1H7v-1H5v-2H4V7h1V5h2z'],['#fff0bd','M4 5h2v2h2v1h2v2H8V9H6V8H4zm11 0h1v3h-2v2h-3V8h2V7h2zM9 11h3v2h-1v3H9v-2H8v-2h1z'],['#fffdf1','M9 7h3v2h1v3h-2v1H8v-2H7V9h2z']]){ctx.fillStyle=color;ctx.fill(new Path2D(path));}ctx.restore();
}
export function createScorecardCanvas(value,{document:doc=globalThis.document,scale=3}={}){
 const score=cleanScorecard(value);if(!score)throw new Error('Invalid scorecard');
 const canvas=doc.createElement('canvas');canvas.width=480*scale;canvas.height=270*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#0b181a';ctx.fillRect(0,0,480,270);
 for(let i=0;i<45;i++){ctx.fillStyle=i%4?'#34483c':'#85917b';ctx.fillRect(16+(i*71)%448,10+(i*29)%166,i%4?1:2,1);}
 ctx.fillStyle='#152a2b';for(let i=0;i<16;i++){const h=16+(i*29)%38;ctx.fillRect(i*32,231-h,24,h);ctx.fillRect(i*32+5,225-h,12,6);}
 ctx.fillStyle='#1e3932';ctx.fillRect(8,232,464,30);ctx.fillStyle='#314c3c';ctx.fillRect(8,232,464,2);
 ctx.strokeStyle='#819184';ctx.lineWidth=1;ctx.strokeRect(6.5,6.5,467,257);ctx.strokeStyle='#344b40';ctx.strokeRect(10.5,10.5,459,249);
 pixelText(ctx,'WISPBOUND',240,23,2,'#bfcea7',true);
 pixelText(ctx,score.outcome==='won'?'THE LIGHT RETURNS':'GAME OVER',240,49,2,'#fff0c4',true);
 pixelText(ctx,`ASCENSION ${score.ascension}  /  ${score.flights} FLIGHTS CLEARED`,240,74,2,'#b9cbb7',true);
 storedSymbol(ctx,51,98);
 pixelText(ctx,score.earned,292,101,4,'#fff0bf',true);
 pixelText(ctx,'STORED SPARKS EARNED',292,140,2,'#d8dec0',true);
 ctx.fillStyle='#75937b';ctx.fillRect(40,167,400,1);
 if(score.complete&&score.comparison){const c=score.comparison;
  pixelText(ctx,`ASC ${score.ascension} BEST ${c.ascensionBest}${c.ascensionNew?' - NEW':''}`,240,181,2,'#d5dfbd',true);
  pixelText(ctx,`OVERALL BEST ${c.overallBest}${c.overallNew?' - NEW':''}`,240,202,2,'#d5dfbd',true);
 }else{
  pixelText(ctx,score.complete?'PERSONAL BEST NOT SAVED':'EARNED SINCE UPDATE - UNRANKED',240,181,2,'#d6cca6',true);
  pixelText(ctx,score.complete?'ON THIS DEVICE':'EARLIER EARNINGS UNAVAILABLE',240,202,2,'#b5c4b0',true);
 }
 pixelText(ctx,'SPENDING NEVER REDUCES THIS SCORE',240,220,1,'#a9bda9',true);
 pixelText(ctx,`VERSION ${score.version}`,240,242,score.version.length>30?1:2,'#c8d5bb',true);
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
