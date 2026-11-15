import test from 'node:test';
import assert from 'node:assert/strict';
import {paintContactEdge} from '../dist/contact-edge-art.mjs';
function trace(options){const commands=[],c={canvas:{width:720,height:300},globalAlpha:.8,fillRect(...args){commands.push(['fill',this.fillStyle,this.globalAlpha,...args]);}};paintContactEdge(c,{...options,line:(_,...args)=>commands.push(['line',c.globalAlpha,...args])});assert.equal(c.globalAlpha,.8);return commands;}
test('spectral terrain fast path preserves every pixel operation of the generic normal path',()=>{
 for(const inward of [-1,1])for(const reducedMotion of [false,true])for(const time of [0,.34,7.19])for(const [x,y,xx,yy]of [[0,130,230,150],[50,160,55,50],[-4,200,300,200]]){
  const options={x,y,xx,yy,inward,worldAx:1250+x/.615,worldAy:y/.615,scale:.615,time,style:'spectral',reducedMotion};
  assert.deepEqual(trace(options),trace({...options,inward:{x:0,y:inward}}));
 }
});
