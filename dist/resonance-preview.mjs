import {createMusic} from './music.mjs?v=composed-worlds-1';
import {createFlightFX} from './reactive-fx.mjs?v=composed-worlds-1';
import {LuminanceWaves} from './luminance-waves.mjs?v=composed-worlds-1';
// Deliberately isolated: the audition never reads or writes a saved game.
const music=createMusic({storage:{getItem:()=> 'false',setItem(){}},document});
const fx=createFlightFX();fx.setMuted(true);
const $=s=>document.querySelector(s),canvas=$('#scene'),c=canvas.getContext('2d');
let enabled=false,dream=false,hole=0,pulse=0,shield=0,clear=0,flash=0,time=0,last=0,frame=0,disposed=false,signal=0,fxReady=false,audioEpoch=0,fxUnlock=null;
// The shared wave system runs against an isolated, disposable audition engine.
const sparks=[{x:75,y:88},{x:208,y:78},{x:239,y:180},{x:330,y:159},{x:388,y:80}].map(s=>({...s,kind:'light',lit:0}));
const fieldEngine={running:true,alive:true,player:{x:151,y:135,radius:6},distance:0,width:480,height:280,time:0,mod:{resonantHarvest:3},layout:{embers:sparks},flame:0,maxFlame:100,resonanceStored:0,burst(x,y){const spark=sparks.find(s=>Math.abs(s.x-x)<1&&Math.abs(s.y-y)<1);if(spark)spark.lit=1;}};
const field=new LuminanceWaves(fieldEngine);
function source(kind){
 if(kind==='flash')fieldEngine.flashTether={x:252,y:112,expires:time+4};
 field.addSource({id:'audition-'+kind,x:kind==='flash'?252:151,y:kind==='flash'?112:fieldEngine.player.y,radius:300,duration:4,color:'#e1e3bf',follow:kind==='flash'?'flash':'wisp'});
}
function fields(dt){
 fieldEngine.time=time;fieldEngine.player.y=135+Math.sin(time*1.8)*6;
 for(const spark of sparks)spark.lit=Math.max(0,spark.lit-dt*1.3);
 field.update(dt);
}
const motes=Array.from({length:38},(_,i)=>({x:(i*73+19)%480,y:25+(i*47)%205,size:i%5===0?2:1}));
function report(text){$('#status').textContent=enabled?text:'Audio is off · '+text;}
function apply(){
 const paused=!enabled||document.hidden;
 music.setFlight({flame:100,maxFlame:100,blackHole:{rate:hole*80,nearest:{distance:(1-hole)*460}},edgingPulse:{strength:pulse,active:pulse>0},light:{edgingReveal:pulse,pickupReveal:flash},dream:dream?{mode:'record'}:null,completing:clear>0,paused});
 fx.setState({hole,pulse,dream:dream?1:0,paused,pan:.2,transport:music.getTransport?.()});
 $('#transport').textContent=(enabled?(document.hidden?'Paused':'Audio on'):'Audio off')+' · '+(music.getTransport?.().rate??1).toFixed(2)+'× score';
 $('#blackhole').setAttribute('aria-pressed',String(hole>.05));
 $('#scene-name').textContent=dream?'Dreamlight':pulse>.1?'Luminance pulse':hole>.1?'Black hole · '+Math.round(hole*100)+'%':'Open flight';
}
async function audio(value){
 const epoch=++audioEpoch;enabled=value;fxReady=false;
 music.setEnabled(value);fx.setMuted(!value);
 $('#audio').textContent=value?'Stop audio':'Start audio';$('#audio').setAttribute('aria-pressed',String(value));apply();
 if(!value){report('Tap Start audio to listen.');return;}
 fxUnlock=fx.unlock();const ready=await fxUnlock;
 if(epoch!==audioEpoch||!enabled||disposed)return;
 fxReady=Boolean(ready);apply();
 report(ready?'Listening · score and reactive effects are ready.':'Score enabled · sound effects could not start. Tap Stop, then Start to retry.');
}
$('#audio').addEventListener('click',()=>audio(!enabled));
$('#hole').addEventListener('input',e=>{hole=Number(e.target.value)/100;$('#hole-value').textContent=hole<.05?'Far':hole>.75?'At the edge':Math.round(hole*100)+'%';apply();});
for(const [id,value] of [['normal',false],['dream',true]])$('#'+id).addEventListener('click',()=>{dream=value;if(!value){hole=0;$('#hole').value='0';$('#hole-value').textContent='Far';}$('#normal').setAttribute('aria-pressed',String(!dream));$('#dream').setAttribute('aria-pressed',String(dream));apply();report(dream?'Dream · softened, floating harmonics.':'Normal flight · warm and steady.');});
$('#blackhole').addEventListener('click',()=>{dream=false;hole=1;$('#hole').value='100';$('#hole-value').textContent='At the edge';$('#normal').setAttribute('aria-pressed','false');$('#dream').setAttribute('aria-pressed','false');apply();report('Black hole · slowed tape and a low gravitational hush.');});
$('#flash').addEventListener('click',()=>{flash=1;source('flash');sound('flash',{strength:1});report('Flash · a quick, high shimmer.');});
async function sound(kind,options={}){const epoch=audioEpoch;if(enabled&&!fxReady&&fxUnlock)await fxUnlock;if(enabled&&epoch===audioEpoch&&fxReady&&!document.hidden)fx.play(kind,options);apply();}
$('#pulse').addEventListener('click',()=>{pulse=1;source('pulse');sound('pulse',{strength:1});report('Luminance · a bright expanding release.');});
for(const button of document.querySelectorAll('[data-tier]'))button.addEventListener('click',()=>{const tier=Number(button.dataset.tier);flash=tier/3;sound('collect',{tier,strength:1,via:$('#via').value});report(button.textContent+' · '+($('#via').value==='body'?'wisp pickup':'collector pickup')+'.');});
$('#shield').addEventListener('click',()=>{shield=1;sound('shield',{strength:1});report('Shield · a soft protective shimmer.');});
$('#clear').addEventListener('click',()=>{clear=2;flash=1;sound('clear',{strength:1});report('Passage cleared · a gentle resolution.');});
function disc(x,y,r,color){c.fillStyle=color;for(let row=-Math.ceil(r);row<=r;row++){let half=Math.floor(Math.sqrt(Math.max(0,r*r-row*row)));c.fillRect(Math.round(x-half),Math.round(y+row),half*2+1,1);}}
function ring(x,y,r,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(Math.round(x),Math.round(y),r,r*.63,0,0,Math.PI*2);c.stroke();}
function draw(){
 c.fillStyle=dream?'#182537':'#10232c';c.fillRect(0,0,480,280);
 for(let layer=0;layer<3;layer++){c.fillStyle=['#182e36','#1d3940','#244148'][layer];for(let i=0;i<12;i++){const x=(i*51+layer*19-time*(layer+1)*1.8)%560-40;const h=45+(i*31+layer*11)%110;c.fillRect(Math.round(x),240-h,5+layer*2,h);for(let j=0;j<4;j++)c.fillRect(Math.round(x)-13-j*2,245-h+j*10,30+j*5,4);}}
 // Low-resolution veils and motes remain light enough for a landscape phone.
 c.globalAlpha=.13*(1-hole*.6);for(let i=0;i<7;i++){disc(90+i*47+Math.sin(time*.25+i)*15,125+Math.sin(i*2+time*.2)*35,26+i%3*7,dream?'#b7b0e5':'#9fbba2');}c.globalAlpha=1;
 const hx=440-hole*130,hy=121;for(let j=4;j>0;j--)ring(hx,hy,14+j*7,'rgba(141,119,168,'+(hole*.15)+')');
 if(hole>.015){for(let i=0;i<36;i++){const a=i*2.4+time*(.35+hole),r=22+(i%6)*5;disc(hx+Math.cos(a)*r,hy+Math.sin(a)*r*.58,1,i%3?'#9e898b':'#d6b58e');}disc(hx,hy,15+hole*5,'#080e1b');ring(hx,hy,20+hole*5,'#a58b9f');}
 for(const m of motes){const x=(m.x-time*5+480)%480,y=m.y+Math.sin(time*.6+m.x)*3;c.globalAlpha=(.35+.2*Math.sin(m.x+time))*(1-hole*.5);c.fillStyle=dream?'#cac6ef':'#ded9aa';c.fillRect(Math.round(x),Math.round(y),m.size,m.size);}c.globalAlpha=1;
 const x=151,y=135+Math.sin(time*1.8)*6;
 c.globalAlpha=.09+flash*.2;disc(x,y,21+flash*18,'#eef0e6');c.globalAlpha=1;
 disc(x,y,7,'#e5e9e3');disc(x,y,5,'#f5f5ed');disc(x-1,y-1,3,'#fffff5');
 // The steady field sits underneath the faint, fuzzy moving boundary.
 for(const source of field.sources.values()){
  const sx=source.follow==='wisp'?fieldEngine.player.x:source.x,sy=source.follow==='wisp'?fieldEngine.player.y:source.y;
  c.globalAlpha=.045;disc(sx,sy,55,'#e8e8cd');c.globalAlpha=.055;disc(sx,sy,34,'#e8e8cd');c.globalAlpha=1;
  if(source.follow==='flash'){c.fillStyle='#fcf9ed';c.beginPath();c.moveTo(sx,sy-7);c.lineTo(sx-6,sy+5);c.lineTo(sx+6,sy+5);c.closePath();c.fill();}
 }
 field.draw(c,{distance:0,scale:1});
 for(const spark of sparks){if(spark.lit>0){c.globalAlpha=spark.lit*.15;disc(spark.x,spark.y,10,'#f0e2a8');c.globalAlpha=1;}disc(spark.x,spark.y,2+spark.lit,spark.lit>.1?'#fff0bb':'#6b8276');}
 if(shield>.02){c.globalAlpha=shield;ring(x,y,20,'#a8d9db');ring(x,y,22,'#649bba');c.globalAlpha=1;}
 c.fillStyle='#12282c';c.fillRect(0,247,480,33);for(let i=0;i<65;i++){c.fillStyle=i%3?'#26433e':'#3b5748';c.fillRect((i*31)%480,242+(i%4),2,6+i%7);}
}
function tick(now){if(disposed||document.hidden)return;const dt=Math.min(.05,last?(now-last)/1000:0);last=now;time+=dt;fields(dt);pulse=Math.max(0,pulse-dt*.43);shield=Math.max(0,shield-dt*.45);clear=Math.max(0,clear-dt);flash=Math.max(0,flash-dt*1.1);signal+=dt;if(signal>=.08){signal=0;apply();}draw();frame=requestAnimationFrame(tick);}
function visibility(){cancelAnimationFrame(frame);last=0;apply();if(!document.hidden)frame=requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',visibility);
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);music.destroy?.();fx.destroy();field.clear();fieldEngine.destroyed=true;},{once:true});
apply();frame=requestAnimationFrame(tick);

