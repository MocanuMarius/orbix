import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactEdgeRaster} from '../dist/contact-edge-raster.mjs';
const document={createElement(){return{width:0,height:0,getContext(){return{createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};}};}};
test('bounded contact pixels preserve source-over order and clear between frames',()=>{
 const r=new ContactEdgeRaster(document);r.begin(4,3);r.fillStyle='#ff0000';r.globalAlpha=.5;r.fillRect(-1,1,3,1);r.fillStyle='#0000ff';r.fillRect(1,1,1,1);r.composite({drawImage(){}});
 const at=(x,y)=>Array.from(r.image.data.subarray((y*4+x)*4,(y*4+x)*4+4));
 assert.deepEqual(at(0,1),[255,0,0,128]);assert.deepEqual(at(1,1),[85,0,170,192]);assert.deepEqual(at(2,1),[0,0,0,0]);
 const image=r.image;r.begin(4,3);assert.equal(r.image,image);assert.ok(r.pixels.every(v=>v===0));r.destroy();assert.equal(r.canvas.width,1);
});
test('state restoration keeps prop clipping and opacity local',()=>{
 const r=new ContactEdgeRaster(document);r.begin(3,3);r.fillStyle='#123456';r.globalAlpha=.4;r.save();r.fillStyle='#ffffff';r.globalAlpha=1;r.clips=[{}];r.restore();assert.equal(r.fillStyle,'#123456');assert.equal(r.globalAlpha,.4);assert.deepEqual(r.clips,[]);
});
