import {drawPickup} from './pickup-art.mjs?v=detail-1';
import {SPARK_TIERS,sparkArtScale} from './spark-size.mjs?v=detail-1';
import {makeWispSprite} from './companion-art.mjs?v=detail-1';

const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const button=document.querySelector('#motion'),raster=240/390;
const wisp=makeWispSprite(document,32);
const samples=SPARK_TIERS.map((tier,i)=>({tier,x:180+i*270,
  kind:tier.mass===1?'light':tier.mass===2?'cluster':'cache',
  scale:sparkArtScale({kind:'light',sparkMass:tier.mass},430)*raster}));
let paused=matchMedia('(prefers-reduced-motion:reduce)').matches,clock=1.7,last;
button.textContent=paused?'Play motion':'Pause motion';
button.addEventListener('click',()=>{paused=!paused;button.textContent=paused?'Play motion':'Pause motion';});
function draw(){
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#091719';ctx.fillRect(0,0,900,248);
  for(let i=0;i<60;i++){
    ctx.fillStyle=i%3?'#18302e':'#243c36';
    const x=(i*157+23)%900,y=30+(i*73)%141;ctx.fillRect(x,y,1,1);
  }
  ctx.textAlign='center';ctx.font='18px Pixelify';
  for(const {tier,x,kind,scale} of samples){
    drawPickup(ctx,x,101,{kind,scale,massTier:tier.mass,time:clock,phase:1.7,reducedMotion:paused});
    ctx.fillStyle='#f1e9cb';ctx.fillText(tier.name,x,201);
    ctx.fillStyle='#b9cfc0';ctx.font='16px Pixelify';ctx.fillText('+'+tier.mass*6,x,225);ctx.font='18px Pixelify';
    ctx.drawImage(wisp,Math.round(x-15),150,30,30);
  }
}
function frame(now){
  if(!paused&&!document.hidden&&last!==undefined)clock+=Math.min(.05,(now-last)/1000);
  last=now;draw();requestAnimationFrame(frame);
}
document.fonts.ready.then(()=>requestAnimationFrame(frame));
