import {terrainBoundary} from './terrain-boundary.mjs?v=small-openings-1';
// A standalone art study. These surfaces belong to this preview, never a run.
const canvas=document.querySelector('#scene'),c=canvas.getContext('2d');
const W=800,H=360,S=canvas.width/W;
const floor=[[-12,279],[65,271],[127,281],[190,264],[251,274],[310,257],[373,266],[434,253],[486,266],[545,260],[607,275],[668,261],[724,271],[812,258]];
const roof=[[-12,61],[60,68],[129,53],[198,71],[267,60],[339,77],[404,64],[473,73],[548,54],[625,65],[694,56],[749,69],[812,53]];
const rock=[[533,263],[540,246],[554,227],[578,215],[604,221],[623,241],[629,267]];
const cap=[[390,246],[396,237],[404,230],[416,226],[428,230],[438,237],[443,246]];
const shape=(points,top=false)=>[[points[0][0],top?-20:380],[points.at(-1)[0],top?-20:380],...points.slice().reverse()];
const ground={x:0,center:0,gap:0,bottomShape:shape(floor),topShape:shape(roof,true),kind:'terrain'};
const boulder={x:0,center:0,gap:0,bottomShape:shape(rock),kind:'rock'};
const engine={width:W,height:H,distance:0,time:0,layout:{obstacles:[ground,boulder]}};
const edges=terrainBoundary(engine).segments;
const descriptions={moon:'Broken ivory pixels trace firm edges; a cool glow gathers near the Wisp.',living:'A continuous pale mineral seam, with tiny lichen notches and sparse tufts.',danger:'Quiet edges wake amber nearby; impact throws brief chips. Objects stay teal.'};
let style='moon',near=false,approach=0,impact=0,time=0,last=0,frame=0,disposed=false;
const base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;
const b=base.getContext('2d');
const files={back:'forest-back.png',mid:'forest-mid.png',texture:'swamp-tiles.png',rock:'rock-tiles.png'};
const art={};
const loading=Promise.all(Object.entries(files).map(([name,file])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{art[name]=img;resolve();};img.onerror=()=>resolve();img.src='./assets/nature/'+file;})));
function path(ctx,points,top=false){ctx.beginPath();ctx.moveTo(points[0][0],top?-8:H+8);for(const p of points)ctx.lineTo(...p);ctx.lineTo(points.at(-1)[0],top?-8:H+8);ctx.closePath();}
function material(points,top=false,stone=false){
 b.save();path(b,points,top);b.fillStyle=stone?'#51645f':'#465e51';b.fill();b.clip();
 const img=art[stone?'rock':'texture'];if(img){b.globalAlpha=.42;for(let y=0;y<H;y+=48)for(let x=-16;x<W;x+=48)b.drawImage(img,stone?48:68,24,24,24,x,y,48,48);}
 b.globalAlpha=.17;b.fillStyle='#4d746c';b.fillRect(0,0,W,H);b.restore();
}
function drawBase(){
 b.setTransform(S,0,0,S,0,0);b.imageSmoothingEnabled=false;b.fillStyle='#182d34';b.fillRect(0,0,W,H);
 for(const [name,alpha] of [['back',.11],['mid',.14]])if(art[name]){b.globalAlpha=alpha;b.drawImage(art[name],0,15,W,H-15);}b.globalAlpha=1;
 // Distant trunks are scenery: they intentionally receive no contact treatment.
 b.fillStyle='#223c40';for(let i=0;i<9;i++){const x=39+i*91,y=98+(i*47)%78;b.fillRect(x,y,8,230-y);for(let j=0;j<4;j++)b.fillRect(x-17+j*4,y+j*12,42-j*7,5);}
 b.fillStyle='#294448';b.globalAlpha=.28;for(let i=0;i<50;i++)b.fillRect((i*83)%800,80+(i*37)%160,2,2);b.globalAlpha=1;
 material(roof,true);material(floor);material(rock,false,true);
 // A clearly interactive mushroom: only its firm upper cap carries teal.
 b.fillStyle='#536e69';b.fillRect(411,243,10,17);b.fillStyle='#6a8280';b.fillRect(413,245,3,13);
 b.beginPath();b.moveTo(...cap[0]);for(const p of cap.slice(1))b.lineTo(...p);b.closePath();b.fillStyle='#4f7475';b.fill();b.fillStyle='#8ca69b';for(const [x,y] of [[402,239],[412,234],[424,239]])b.fillRect(x,y,3,2);
}
function pixel(x,y,width,color,alpha=1){c.globalAlpha=alpha;c.fillStyle=color;c.fillRect(Math.round(x*S)/S,Math.round(y*S)/S,width,width);}
function dot(x,y,r,color,alpha=1){c.globalAlpha=alpha;c.fillStyle=color;for(let yy=-r;yy<=r;yy+=1/S){const half=Math.floor(Math.sqrt(Math.max(0,r*r-yy*yy))*S)/S;c.fillRect(Math.round((x-half)*S)/S,Math.round((y+yy)*S)/S,Math.max(1/S,half*2),1/S);}}
function contact(x,y,wx,wy,index,vertical=false){
 const distance=Math.hypot(x-wx,y-wy),local=Math.max(0,1-distance/115),step=1/S;
 const grain=((Math.imul(index+11,1597334677)^Math.imul(index+73,3812015801))>>>0)/4294967296;
 const inside=vertical?-1:1;
 // One common dark separation sits inside the solid, never on scenery.
 if(style==='moon'){
  if(local>.02)pixel(x-step,y-step,step*3,'#7db7ca',local*.13);
  pixel(x,y,step,'#bbc6b4',.42);
  if(grain>.37)pixel(x,y,step,grain>.94?'#e2dfc8':'#bdc9bf',.67+local*.3);
 }else if(style==='living'){
  pixel(x,y,step,'#b6c3ab',.73);
  if(grain>.88)pixel(x,y+inside*step,step,'#d1d5ba',.9);
  if(grain>.955){pixel(x,y+inside*step*2,step,'#718d6a',.9);pixel(x+step,y+inside*step,step,'#91aa7f',.85);
   pixel(x+step,y+inside*step*3,step,'#778d71',.65);pixel(x+step*2,y+inside*step*4,step,'#6a8070',.4);}
  if(grain>.986&&!vertical){pixel(x,y-step,step,'#98ad84',.9);pixel(x+step,y-step*2,step,'#b8c3a2',.6);}
 }else{
  pixel(x,y,step,'#8c9d8f',.46);
  const heat=local*(.7+.3*Math.sin(time*4));if(heat>.015){pixel(x-step,y-step,step*3,'#c8a76b',heat*.10);pixel(x,y,step,'#e3bd7d',heat*.83);}
 }
}
function outline(wx,wy){let serial=0;for(const e of edges){const [ax,ay]=e.a,[bx,by]=e.b,len=Math.hypot(bx-ax,by-ay),steps=Math.ceil(len*S);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps),x=ax+(bx-ax)*t,y=ay+(by-ay)*t;contact(x,y,wx,wy,serial++,e.top);}}
 // The isolated object's upper contact is always distinct from terrain.
 for(let j=1;j<cap.length;j++){const a=cap[j-1],b=cap[j],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*S);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;pixel(x,y,1/S,'#a0d3c3',.8);if(i%3===0)pixel(x,y-1/S,1/S,'#72b8b2',.2);}}
}
function draw(){
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.imageSmoothingEnabled=false;c.drawImage(base,0,0);c.setTransform(S,0,0,S,0,0);
 const wx=286+approach*22,wy=171+approach*77+Math.sin(time*1.3)*1.5;
 outline(wx,wy);
 dot(wx,wy,19,'#c9daca',.035);dot(wx,wy,8,'#e4e9df');dot(wx-1,wy-1,5,'#fcfbee');
 // Small collector, without wings, arms or a main Wisp trail.
 dot(wx+27,wy+9,3,'#a8b784',.9);pixel(wx+26,wy+8,1/S,'#e3dfb3',.9);
 if(impact>0){const age=1-impact;for(let i=0;i<8;i++){const spread=(i-3.5)*5,xx=308+spread*age*2,yy=255-Math.sin(age*Math.PI)*20-(i%3)*age*5;pixel(xx,yy,i%3===0?2/S:1/S,style==='danger'?'#e2c391':'#c7d0b4',impact*.8);}if(style==='danger')dot(308,255,9+age*14,'#ceac70',impact*.08);}
 c.globalAlpha=1;
}
for(const tab of document.querySelectorAll('[data-style]'))tab.addEventListener('click',()=>{style=tab.dataset.style;for(const t of document.querySelectorAll('[data-style]'))t.setAttribute('aria-selected',String(t===tab));document.querySelector('#description').textContent=descriptions[style];});
document.querySelector('#approach').addEventListener('click',e=>{near=!near;e.currentTarget.setAttribute('aria-pressed',String(near));e.currentTarget.textContent=near?'Leave edge':'Approach edge';});
document.querySelector('#impact').addEventListener('click',()=>{impact=1;near=true;document.querySelector('#approach').setAttribute('aria-pressed','true');document.querySelector('#approach').textContent='Leave edge';});
function tick(now){if(disposed||document.hidden)return;const dt=Math.min(.05,last?(now-last)/1000:0);last=now;time+=dt;approach+=(Number(near)-approach)*Math.min(1,dt*3);impact=Math.max(0,impact-dt*2.3);draw();frame=requestAnimationFrame(tick);}
function visibility(){cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);},{once:true});
drawBase();draw();loading.then(()=>{if(!disposed)drawBase();});frame=requestAnimationFrame(tick);
