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

test('Ribbon stays visible for a full wrap outside the wisp before feeding into its core', () => {
  for (const startRadius of [0,18,32,41]) {
    const effect = {style:'ribbon',startRadius,initialAngle:0,approachX:-140};
    let last = outerLip(effect,0), visibleAngle=0, travel=0;
    const priorTravel = 4.52 * Math.hypot(last.x,last.y);
    for (let frame=1; frame<=360; frame++) {
      const point = outerLip(effect,frame/360);
      travel += Math.hypot(point.x-last.x,point.y-last.y);
      if (Math.hypot(last.x,last.y)>14 && Math.hypot(point.x,point.y)>14) {
        visibleAngle += Math.atan2(last.x*point.y-last.y*point.x,last.x*point.x+last.y*point.y);
      }
      last=point;
    }
    assert.ok(Math.abs(visibleAngle)/(2*Math.PI)>1.3,'Winding hidden inside wisp at radius '+startRadius);
    assert.ok(travel>1.6*priorTravel,'Journey too short at radius '+startRadius);
    assert.deepEqual(last,{x:0,y:0});
  }
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
