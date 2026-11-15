import {makeWispSprite} from './companion-art.mjs?v=spark-field-guide-1';
const canvas=document.querySelector('canvas'), c=canvas.getContext('2d'), sprite=makeWispSprite(document,30);
const action=document.querySelector('#act'), message=document.querySelector('output'), panel=document.querySelector('aside'), wake=document.querySelector('#wake');
let phase='ready',age=0,clock=0,last=0,spent=false;
const startY=125,x=181,fall=t=>startY+12*t*t, lift=t=>startY-170*t+60*t*t;
const roof=[[0,36],[50,43],[83,38],[122,53],[152,49],[169,61],[186,78],[199,71],[216,58],[237,62],[264,39],[309,33],[344,48],[390,33],[429,44],[478,28],[523,37],[575,30]];
function go(next,label){phase=next;age=0;message.textContent=label;action.disabled=!['ready','done'].includes(next);action.textContent=next==='done'?'Replay':'Lift';}
function activate(){if(phase==='done'){spent=false;go('ready','Lift beneath the arch');}else if(phase==='ready'&&!spent){spent=true;go('vision','0.25×');}}
canvas.onclick=action.onclick=activate;
wake.onclick=()=>{panel.hidden=true;go('saved','Lift undone');};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();activate();}});
function polygon(points,ink){c.fillStyle=ink;c.beginPath();points.forEach(([u,v],i)=>i?c.lineTo(u,v):c.moveTo(u,v));c.closePath();c.fill();}
function paint(now){
 const dt=last&&!document.hidden?Math.min(.05,(now-last)/1000):0;last=now;age+=dt;clock+=dt;
 if(phase==='vision'&&age>=2.12)go('blink','');
 if(phase==='blink'&&age>=1.1){go('waiting','');panel.hidden=false;wake.focus();}
 if(phase==='saved'&&age>=1.5)go('done','Nightmare spent · once per map');
 const vision=phase==='vision',sim=vision?age*.25:0,impact=.25;
 const offset=vision?sim*32:phase==='saved'?age*27:phase==='done'?40:0;
 c.fillStyle='#101c28';c.fillRect(0,0,560,208);
 for(let i=0;i<19;i++){let u=i*34-offset*.18;polygon([[u-28,176],[u+4,65+(i*37)%58],[u+38,180]],i%2?'#253343':'#1d2c37');}
 const edge=roof.map(([u,v])=>[u-offset,v]);polygon([[-50,-2],[580,-2],...edge.slice().reverse()],'#52615d');
 polygon([[-50,-2],[580,-2],...edge.slice().reverse().map(([u,v])=>[u,v-3])],'#263438');
 for(let i=0;i<110;i++){let u=(i*67)%600-offset,v=(i*17)%31;c.fillStyle=i%2?'#344448':'#293a40';c.fillRect(u,v,3+i%10,2);}
 const floor=Array.from({length:37},(_,i)=>[i*18-40-offset,177+Math.sin(i*1.9)*4+Math.cos(i*.67)*6]);polygon([...floor,[600,208],[-60,208]],'#4a5853');polygon([...floor.map(([u,v])=>[u,v+3]),[600,208],[-60,208]],'#263636');
 const y=vision?lift(Math.min(sim,impact)):phase==='saved'?fall(Math.min(age,1.5)):phase==='done'?fall(1.5):startY;
 const flash=phase==='saved'&&age<1?Math.pow(Math.sin(age*3*Math.PI),2):0;
 const g=c.createRadialGradient(x,y,0,x,y,34+flash*9);g.addColorStop(0,flash>.1?'#81caff':'#e4e5a9');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-45,y-45,90,90);
 c.imageSmoothingEnabled=false;
 if(!vision||sim<impact){c.drawImage(sprite,x-15,y-15,30,30);if(flash){c.globalAlpha=flash;c.fillStyle='#91d5ff';c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.fill();c.globalAlpha=1;}}
 else{const p=(sim-impact)/.28;for(let i=0;i<48;i++){const a=i*2.4,r=(3+i%8)+p*(9+i%19);c.globalAlpha=Math.max(0,1-p*.9);c.fillStyle=i%3?'#dae7db':'#83bcd2';c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r+9*p*p),2,2);}c.globalAlpha=1;}
 if(vision){c.textAlign='center';c.font='18px Pixel';c.fillStyle='#e6e6ce';c.fillText('0.25×',280,112);}
 if(phase==='blink'){const opening=age<.42?1-age/.42:age<.62?0:Math.min(1,(age-.62)/.48);for(let u=0;u<560;u+=2){const aperture=opening*170*(1-.32*((u-280)/280)**2);c.fillStyle='#020407';c.fillRect(u,0,2,Math.max(0,105-aperture));c.fillRect(u,104+aperture,2,105);}}
 requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
