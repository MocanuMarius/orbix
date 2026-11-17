import test from 'node:test';
import assert from 'node:assert/strict';
import {LuminanceWaves,drawLuminanceWaves,luminanceWaveFade,luminanceWaveVisibility,revealLuminanceWaves} from '../dist/luminance-waves.mjs';
import {lightVisibility} from '../dist/light-field.mjs';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
function context(){
  return {globalAlpha:1,strokes:[],save(){},restore(){},beginPath(){},
    arc(x,y,radius){this.arcState={x,y,radius};},
    stroke(){this.strokes.push({...this.arcState,alpha:this.globalAlpha,width:this.lineWidth,operation:this.globalCompositeOperation});}};
}

test('Pulse light and visible boundary share simulation radius and fade at every source reach',()=>{
  for(const maximum of [90,145,300,600]){
    const wave={x:450,y:120,maximum,radius:maximum*.89,age:.5,reveal:true,color:'#d9f0dc'};
    const manager={waves:[wave],revealCount:1},ring=context(),fog=context();
    drawLuminanceWaves(ring,{distance:200,scale:.5},manager);
    revealLuminanceWaves(fog,{luminanceWaves:manager},{distance:200,scale:.5});
    near(luminanceWaveFade(wave),.5);
    for(const stroke of [...ring.strokes,...fog.strokes]){
      near(stroke.x,125);near(stroke.y,60);near(stroke.radius,wave.radius*.5);
    }
    near(ring.strokes[2].alpha,.19*.5);near(fog.strokes[2].alpha,.42*.5);
    near(luminanceWaveVisibility(manager,wave.x+wave.radius,wave.y),1-(1-.18*.5)*(1-.26*.5)*(1-.42*.5));
  }
});

test('Pulse lights only a passing band and leaves steady sight unchanged afterwards',()=>{
  const e={running:true,alive:true,distance:200,width:900,height:430,player:{x:0,y:120}};
  e.luminanceWaves=new LuminanceWaves(e);
  const light={radius:50,intensity:1},before=JSON.stringify(light);
  const wave=e.luminanceWaves.emit({x:200,y:120,radius:500,reveal:true});
  e.luminanceWaves.update(.5);
  assert.equal(wave.radius,180);
  assert.ok(lightVisibility(e,light,180,120)>.6);
  assert.equal(luminanceWaveVisibility(e.luminanceWaves,200,120),0,'no full disk reveal behind the front');
  assert.equal(lightVisibility(e,light,260,120),0,'terrain ahead remains dark');
  e.luminanceWaves.update(.5);
  assert.equal(lightVisibility(e,light,180,120),0,'passed terrain returns to baseline');
  e.luminanceWaves.update(.5);
  assert.equal(e.luminanceWaves.waves.length,0);
  assert.equal(lightVisibility(e,light,180,120),0);
  assert.equal(JSON.stringify(light),before);
});

test('Pulse visibility matches partial fog removal and respects suppressed reveals',()=>{
  const wave={x:0,y:50,maximum:300,radius:108,age:.3,reveal:true,color:'#d9f0dc'};
  const e={distance:0,player:{x:0,y:50},luminanceWaves:{waves:[wave],revealCount:1}};
  const light={radius:100,intensity:.8};
  const baseline=lightVisibility({...e,luminanceWaves:null},light,108,50);
  const front=luminanceWaveVisibility(e.luminanceWaves,108,50);
  near(lightVisibility(e,light,108,50),1-(1-baseline)*(1-front));
  e.renderDistance=20;
  const cameraBaseline=lightVisibility({...e,luminanceWaves:null},light,88,50);
  near(lightVisibility(e,light,88,50),1-(1-cameraBaseline)*(1-front));
  delete e.renderDistance;
  wave.reveal=false;e.luminanceWaves.revealCount=0;
  near(lightVisibility(e,light,108,50),baseline);
  const fog=context();revealLuminanceWaves(fog,e);assert.equal(fog.strokes.length,0);
});
