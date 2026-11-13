import {resourceSymbol} from './game-symbols.mjs?v=open-sky-1';
import {pickupArtSvg} from './pickup-art.mjs?v=open-sky-1';
import {lifeHeartSvg} from './lives.mjs?v=open-sky-1';
import {skillIcon} from './upgrade-icons.mjs?v=open-sky-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function tutorialTarget(step={}){
 const kind=step.visual||'';
 if(kind==='meter')return '.glow-side-gauge';
 if(kind==='life'||kind==='life-loss')return '.ascension-lives';
 if(kind==='packed')return '.flight-condensed-counter';
 if(kind==='lift')return '#flap-btn';
 if(kind.startsWith('companion:')||kind==='collector')return '#boost-btn';
 return null;
}
export function tutorialTextMarkup(text){
 const symbols={'Packed Sparks':resourceSymbol('packed'),Energy:resourceSymbol('energy'),Luminance:skillIcon({id:'main-sight',branch:'main'}),Spark:pickupArtSvg('light'),Sparks:pickupArtSvg('light'),hearts:lifeHeartSvg(),heart:lifeHeartSvg()};
 return String(text||'').split(/(Packed Sparks|Energy|Luminance|\bSparks?\b|\bhearts?\b)/g).map(part=>symbols[part]?`<span class="coach-inline-term">${symbols[part].replace('<svg ','<svg aria-hidden="true" ')}${esc(part)}</span>`:esc(part)).join('');
}
export function tutorialExampleMarkup(step,document,target){
 const kind=step.visual||'';
 const world=['luminance','wisp','edge','draft','black-hole','collector'].includes(kind)||kind.startsWith('pickup:')||kind.startsWith('companion:');
 const canvas=document.querySelector('.pixel-flight-canvas')||document.querySelector('#flight-canvas');
 if(world&&canvas?.width&&canvas?.height){
  try{
   const shot=document.createElement('canvas');shot.width=360;shot.height=162;
   const c=shot.getContext('2d');c.imageSmoothingEnabled=false;
   const r=canvas.getBoundingClientRect(),focus=target?.matches?.('[data-world-focus]')?target.getBoundingClientRect():null;
   if(focus){
    const sx=canvas.width/r.width,sy=canvas.height/r.height,cw=Math.min(canvas.width,Math.max(focus.width*4,220)*sx),ch=cw*.45;
    const x=Math.max(0,Math.min(canvas.width-cw,(focus.left+focus.width/2-r.left)*sx-cw/2)),y=Math.max(0,Math.min(canvas.height-ch,(focus.top+focus.height/2-r.top)*sy-ch/2));
    c.drawImage(canvas,x,y,cw,ch,0,0,360,162);c.strokeStyle='#d4ecad';c.lineWidth=2;c.strokeRect(((focus.left-r.left)*sx-x)*360/cw,((focus.top-r.top)*sy-y)*162/ch,focus.width*sx*360/cw,focus.height*sy*162/ch);
   }else c.drawImage(canvas,0,0,360,162);
   return `<figure class="coach-example"><img src="${shot.toDataURL()}" alt="Paused view of your current flight"><figcaption>Your paused flight</figcaption></figure>`;
  }catch{/* Canvas unavailable: use a clearly labelled teaching illustration. */}
 }
 if(!['meter','spark','spark-layers','lift','luminance','edge','wisp'].includes(kind)&&!world)return '';
 const cells=Array.from({length:10},(_,i)=>`<rect x="16" y="${85-i*6}" width="5" height="4" fill="${i<7?'#e0f2b4':'#33483a'}"/>`).join('');
 const rings=kind==='edge'?'<path d="M81 65l4 6-6 5 7 7-4 8" fill="none" stroke="#a9e4ff" stroke-width="2"/>':'<circle cx="83" cy="58" r="36" fill="#d5e4b5" opacity=".07"/>';
 return `<figure class="coach-example"><svg viewBox="0 0 240 108" role="img" aria-label="Example flight: Energy meter at left, wisp and Spark in the passage" shape-rendering="crispEdges"><rect width="240" height="108" fill="#071416"/><path d="M0 0h240v16l-35-5-22 18-28-13-26 8-39-9-36 12L0 19zM0 108V91l28-9 28 12 30-4 22 7 30-13 30 9 22-13 24 8 26-6v26z" fill="#354640" stroke="#78917d"/>${cells}${rings}<circle cx="83" cy="58" r="10" fill="#dfead0"/><circle cx="83" cy="58" r="15" fill="#e1f1ca" opacity=".12"/><g transform="translate(152 39) scale(.65)">${kind==='black-hole'?'<circle cx="18" cy="18" r="15" fill="#000" stroke="#a875bc" stroke-width="3"/>':pickupArtSvg(kind.startsWith('pickup:')?kind.slice(7):'light')}</g>${kind==='meter'?'<path d="M60 46H30l5-5m-5 5 5 5" fill="none" stroke="#e6eeb7" stroke-width="2"/>':''}</svg><figcaption>Example · ${kind==='meter'?'Energy powers Lift':'Sparks in the passage'}</figcaption></figure>`;
}
