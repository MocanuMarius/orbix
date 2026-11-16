import {biomePalette,drawBiomeBackground} from './biome-art.mjs?v=storm-guide-1';
import {createDepthScenery,drawDepthScenery} from './depth-scenery.mjs?v=storm-guide-1';
import {LIGHT_EXTENT,lightAttenuation,createLightMaskCanvas,castFlashPropLight,sceneRevealStrength,flashRangeStrength,pickupRevealAt,pickupRevealHold} from './light-field.mjs?v=storm-guide-1';
import {LIGHT_PACKET_TUNING} from './vitality.mjs?v=storm-guide-1';
import {makeWispSprite} from './companion-art.mjs?v=storm-guide-1';
import {drawPickup} from './pickup-art.mjs?v=storm-guide-1';
import {flashPowerupDuration,getPickupSpec} from './pickups.mjs?v=storm-guide-1';
import {createFlashTether,stepFlashTether,drawFlashTether,flashLightPulse,FLASH_PUFF_DURATION} from './flash-tether.mjs?v=storm-guide-1';

const WIDTH = 360, HEIGHT = 144;
const playerX = 121, speed = 110, contact = 1.4, step = 1/120;
const identity = {id:'flash-ruins',biomeId:'moonruins',variant:0};
const palette = biomePalette(identity);
const altitude = t => 64 + 10*Math.sin(t*2.2) + 6*Math.sin(t*4.3+.3);

function canvas(width,height) {
  const surface=document.createElement('canvas');
  surface.width=width;
  surface.height=height;
  return surface;
}

function paintBackdrop() {
  const plate=canvas(WIDTH,HEIGHT), ctx=plate.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,HEIGHT);
  palette.sky.forEach((color,i)=>sky.addColorStop(i/2,color));
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBiomeBackground(ctx,{identity,width:WIDTH,height:HEIGHT,palette,distance:0},{
    line(c,x,y,xx,yy,color,width=1) {
      c.strokeStyle=color; c.lineWidth=width; c.beginPath();
      c.moveTo(Math.round(x),Math.round(y)); c.lineTo(Math.round(xx),Math.round(yy)); c.stroke();
    },
    polygon(c,points) {
      c.beginPath();
      points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.closePath();
    }
  });
  return plate;
}

// Foreground ledges scroll at flight speed. Breaks in the rim expose the
// depth layers through them, making each lighting wave readable on stone.
function paintLedge() {
  const floor=canvas(384,40), ctx=floor.getContext('2d');
  for(let x=0;x<floor.width;x+=2){
    const ledge=Math.round(16+7*Math.sin(x*Math.PI/96)+3*Math.sin(x*Math.PI/24));
    ctx.fillStyle=palette.stone; ctx.fillRect(x,ledge,2,40-ledge);
    ctx.fillStyle=palette.rim; ctx.fillRect(x,ledge,2,1);
    ctx.fillStyle=palette.grain; ctx.fillRect(x,ledge+1,2,2);
    ctx.fillStyle=palette.shade; ctx.fillRect(x,ledge+6+Math.floor(x/12)%4,2,2);
    if(x%18===0)ctx.fillRect(x,ledge+3,1,5);
  }
  return floor;
}

export function createFlashPreview({isPaused,setPaused,reducedMotion}) {
  const scene=document.createElement('div');
  scene.className='flash-scene';
  const field=canvas(WIDTH,HEIGHT);
  field.setAttribute('role','img');
  field.setAttribute('aria-label','A white Flash Powerup trails the wisp, reveals the ruins in waves and dissolves.');
  const playback=document.createElement('div');
  playback.className='flash-playback';
  const replay=document.createElement('button');
  replay.type='button'; replay.textContent='Replay';
  const label=document.createElement('label');
  label.className='timeline';
  const slider=document.createElement('input');
  slider.type='range'; slider.min=0; slider.step=.01; slider.setAttribute('aria-label','Flash Powerup timeline');
  const flashSpec=getPickupSpec('sight');
  const mode=document.createElement('select');
  mode.setAttribute('aria-label','Flash duration in the preview');
  const durations=[flashPowerupDuration(),flashPowerupDuration({longFlash:true})];
  mode.add(new Option('Base · '+durations[0]+'s','base'));
  mode.add(new Option('Long Flash · '+durations[1]+'s','long'));
  mode.value=new URLSearchParams(location.search).get('flash')==='long'?'long':'base';
  let duration=durations[mode.selectedIndex];
  let end=contact+duration+FLASH_PUFF_DURATION+.55;
  slider.max=end;
  label.append('Scrub',slider);
  playback.append(replay,mode,label);
  scene.append(field,playback);

  const ctx=field.getContext('2d'), bg=paintBackdrop(), ledge=paintLedge();
  const layers=createDepthScenery(document,HEIGHT,'ruins',palette);
  const light=createLightMaskCanvas(document);
  const veil=canvas(WIDTH,HEIGHT), shade=veil.getContext('2d');
  const wisp=makeWispSprite(document,28);
  const caughtX=playerX+contact*speed+9, caughtY=altitude(contact)-4;
  let time=isPaused()?contact+1:0, tether, simTime=contact, previousFrame, frame;

  function draw() {
    const distance=time*speed, y=altitude(time), worldX=playerX+distance;
    if(time<simTime || time<contact){tether=null;simTime=contact;}
    if(time>=contact){
      if(!tether)tether=createFlashTether({x:caughtX,y:caughtY,playerX:playerX+contact*speed,
        playerY:altitude(contact),time:contact,duration,initialScale:.7,reducedMotion:reducedMotion()});
      while(simTime+step<=time){
        simTime+=step;
        stepFlashTether(tether,playerX+simTime*speed,altitude(simTime),simTime,step);
      }
    }
    const strength=tether?flashRangeStrength(tether.expires-time):0;
    const hold=pickupRevealHold(contact,0,reducedMotion());
    const reveal=sceneRevealStrength({
      pickupReveal:pickupRevealAt(time,contact,hold,0,reducedMotion()),
      tetherReveal:flashLightPulse(tether,time)*.25
    });
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(bg,0,0);
    drawDepthScenery(ctx,layers,distance,WIDTH);
    for(let x=-Math.round(distance)%ledge.width;x<WIDTH;x+=ledge.width)ctx.drawImage(ledge,x,HEIGHT-ledge.height);
    if(time<contact)drawPickup(ctx,caughtX-distance,caughtY,{kind:'sight',time,scale:.7,reducedMotion:reducedMotion()});
    shade.globalCompositeOperation='source-over';
    shade.clearRect(0,0,WIDTH,HEIGHT);
    shade.fillStyle='#000'; shade.fillRect(0,0,WIDTH,HEIGHT);
    shade.globalCompositeOperation='destination-out';
    const mapScale=WIDTH/880;
    const reach=(LIGHT_PACKET_TUNING.baseRadius+flashSpec.sightBonus*strength)*mapScale*LIGHT_EXTENT;
    shade.drawImage(light,playerX-reach,y-reach,2*reach,2*reach);
    if(strength>0){
      const ahead=playerX+160*mapScale, forwardReach=230*mapScale*LIGHT_EXTENT;
      shade.globalAlpha=strength;
      shade.drawImage(light,ahead-forwardReach,y-forwardReach,2*forwardReach,2*forwardReach);
      shade.globalAlpha=1;
    }
    if(time<contact){
      const x=caughtX-distance,dx=x-playerX,dy=caughtY-y;
      const radius=LIGHT_PACKET_TUNING.baseRadius*mapScale;
      castFlashPropLight(shade,light,x,caughtY,mapScale,lightAttenuation((dx*dx+dy*dy)/(radius*radius)),time,reducedMotion());
    }
    ctx.globalAlpha=1-reveal;
    ctx.drawImage(veil,0,0);
    ctx.globalAlpha=1;
    if(tether)drawFlashTether(ctx,tether,{time,distance,scale:1,playerX:worldX,playerY:y});
    ctx.drawImage(wisp,playerX-15,Math.round(y)-15,30,30);
    slider.value=time;
    slider.setAttribute('aria-valuetext',time.toFixed(1)+' seconds');
  }

  slider.addEventListener('input',()=>{
    setPaused(true);
    time=Number(slider.value);
    draw();
  });
  mode.addEventListener('change',()=>{
    duration=durations[mode.selectedIndex];
    end=contact+duration+FLASH_PUFF_DURATION+.55;
    slider.max=end;
    time=0;
    previousFrame=undefined;
    draw();
  });
  replay.addEventListener('click',()=>{
    time=0; previousFrame=undefined;
    setPaused(false);
    draw();
  });
  let lastTime, lastQuiet;
  function tick(now){
    if(!scene.isConnected)return;
    if(!isPaused()&&previousFrame!==undefined)time=(time+Math.min(.1,(now-previousFrame)/1000))%end;
    previousFrame=now;
    if(lastQuiet!==reducedMotion()){tether=null;simTime=contact;}
    if(time!==lastTime||lastQuiet!==reducedMotion())draw();
    lastQuiet=reducedMotion();
    lastTime=time;
    frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return {element:scene,stop:()=>cancelAnimationFrame(frame)};
}
