import assert from 'node:assert/strict';
import test from 'node:test';
import {drawAbsorbingSpark} from '../dist/tidal-light.mjs';

// Trace one parcel of material at the outer lip of the Spark. Keep the first
// canvas slice's center in receiver coordinates, independent of sprite color.
function outerLip(effect, age, quiet = false) {
  let heading = 0, point;
  const context = {
    save() {}, restore() {}, translate() {}, scale() {}, fillRect() {},
    rotate(angle) { heading = angle; },
    transform(a,b,c,d,x,y) {
      point ??= {
        x: Math.cos(heading) * x - Math.sin(heading) * y,
        y: Math.sin(heading) * x + Math.cos(heading) * y
      };
    }
  };
  drawAbsorbingSpark(context,effect,age,0,0,1,quiet);
  return point ?? {x:0,y:0};
}

test('the default capture curls through a full circular flow and draws mist instead of a pickup sprite', () => {
 const images=[];
 const doc={createElement(){
  const image={width:0,height:0};
  image.getContext=()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}});
  return image;
 }};
 let point;
 const ctx={
  canvas:{ownerDocument:doc},globalAlpha:1,
  save(){},restore(){},translate(){},scale(){},rotate(){},transform(){},
  beginPath(){},lineTo(){},closePath(){},fill(){},stroke(){},
  moveTo(x,y){point??={x,y};},
  drawImage(image){images.push(image);},
  createLinearGradient:()=>({addColorStop(){}})
 };
 for(const [scale,size] of [[1,1],[.615,8.4]]){
  const effect={initialScale:size,startRadius:16+12.8*size,initialAngle:.5,approachX:-140};
  let previous,turn=0;
  for(let i=0;i<180;i++){
   point=undefined;
   drawAbsorbingSpark(ctx,effect,i/180,0,0,scale,false);
   assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
   if(previous&&Math.hypot(point.x,point.y)>1)
    turn+=Math.atan2(previous.x*point.y-previous.y*point.x,previous.x*point.x+previous.y*point.y);
   previous=point;
  }
  assert.ok(Math.abs(turn)>Math.PI*1.4,'Circular drain must retain its winding');
 }
 assert.ok(images.length>0,'The capture emits mist');
 assert.ok(images.every(image=>image.width===48&&image.height===48),'Only a reusable vapor stamp follows the flow');
 point=undefined;
 drawAbsorbingSpark(ctx,{style:'hybrid'},1,0,0,1,false);
 assert.equal(point,undefined,'The completed capture stops drawing');
});

test('reduced-motion captures contract without the extra coil', () => {
  for(const style of ['ribbon','undertow','split']){
    const effect={style,startRadius:28,initialAngle:0,approachY:120};
    let previous=Infinity;
    for(let i=0;i<100;i++){
      const p=outerLip(effect,i/100,true), radius=Math.hypot(p.x,p.y);
      assert.ok(radius<=previous+.001);
      assert.ok(Math.abs(Math.atan2(p.y,p.x))<Math.PI/4);
      previous=radius;
    }
  }
});

test('opposite-side meetings mirror the curl and reversing the arrival direction changes it', () => {
  for (const style of ['ribbon','undertow','split']) {
    const angle = Math.PI/3;
    const effect = {style,startRadius:27,approachX:-140,approachY:0};
    const top = outerLip({...effect,initialAngle:-angle},.56);
    const bottom = outerLip({...effect,initialAngle:angle},.56);
    const reversed = outerLip({...effect,initialAngle:angle,approachX:140},.56);
    assert.ok(Math.abs(top.x-bottom.x)<.001 && Math.abs(top.y+bottom.y)<.001, style+' mirror');
    assert.ok(Math.hypot(bottom.x-reversed.x,bottom.y-reversed.y)>4,style+' winding');
  }
});
