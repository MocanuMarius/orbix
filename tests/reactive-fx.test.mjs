import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightFX} from '../dist/reactive-fx.mjs';

function audioHarness() {
  const nodes=[], contexts=[];
  const parameter=()=>({value:0,targets:[],cancelScheduledValues(){},setTargetAtTime(value){this.targets.push(value);},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  function node(kind) {
    const n={kind,gain:parameter(),frequency:parameter(),detune:parameter(),Q:parameter(),pan:parameter(),
      connect(destination){this.destination=destination;},disconnect(){this.disconnected=true;},
      start(){this.started=true;},
      stop(at){
        // Scheduled stops remain active until audio time advances; an immediate stop ends now.
        if(at!==undefined){this.stopAt=at;return;}
        if(this.ended)return;
        this.ended=true;this.onended?.();
      },
    };
    nodes.push(n);return n;
  }
  class AudioContext {
    constructor(){this.currentTime=0;this.sampleRate=100;this.state='suspended';this.destination=node('destination');this.closeCount=0;contexts.push(this);}
    createGain(){return node('gain');}
    createBiquadFilter(){return node('filter');}
    createStereoPanner(){return node('pan');}
    createOscillator(){return node('oscillator');}
    createBufferSource(){return node('bufferSource');}
    createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
    async resume(){this.state='running';}
    async close(){this.closeCount++;this.state='closed';}
  }
  return {AudioContext,nodes,contexts,transients:()=>nodes.filter(n=>n.onended&&n.started&&!n.ended)};
}

test('FX opens one context only on unlock and allocates no graph during state updates',async()=>{
  const h=audioHarness(), fx=createFlightFX({AudioContextClass:h.AudioContext});
  fx.play('pickup');fx.setState({hole:1,pulse:1});fx.setMuted(true);
  assert.equal(h.contexts.length,0);
  assert.equal(await fx.unlock(),true);
  assert.equal(await fx.unlock(),true);
  assert.equal(h.contexts.length,1);
  fx.setMuted(false);
  const count=h.nodes.length;
  for(let i=0;i<100;i++){
    h.contexts[0].currentTime+=.1;
    fx.setState({hole:i/100,pulse:i%2?0:1-i/100,proximity:i/100,proximityContact:i%3!==0,
      proximityRecovery:i%5===0,transport:{time:i,rate:.8,bpm:78}});
  }
  assert.equal(h.nodes.length,count);
  fx.destroy();fx.destroy();
  assert.equal(h.contexts[0].closeCount,1);
  assert.equal(await fx.unlock(),false);
});

test('FX bounds event overlap, releases completed voices and silences pause and mute',async()=>{
  const h=audioHarness(),fx=createFlightFX({AudioContextClass:h.AudioContext});
  await fx.unlock();
  const context=h.contexts[0];
  for(let i=0;i<50;i++){context.currentTime+=1;fx.play('pulse');}
  assert.ok(h.transients().length>0);
  assert.ok(h.transients().length<=18,'transient source budget must remain bounded');
  for(const source of h.transients())source.stop();
  assert.equal(h.transients().length,0);
  context.currentTime++;fx.play('pickup');
  assert.ok(h.transients().length>0,'completed voices release their budget');
  const master=h.nodes.find(n=>n.destination===context.destination);
  fx.setMuted(true);
  assert.equal(h.transients().length,0);
  assert.equal(master.gain.targets.at(-1),0);
  fx.play('pulse');assert.equal(h.transients().length,0);
  fx.setMuted(false);context.currentTime++;fx.play('flash');
  assert.ok(h.transients().length>0);
  fx.setState({paused:true});
  assert.equal(h.transients().length,0);
  assert.equal(master.gain.targets.at(-1),0);
  fx.play('pulse');assert.equal(h.transients().length,0);
  fx.setState({paused:false});context.currentTime++;fx.play('shield');
  fx.destroy();
  assert.equal(h.transients().length,0);
  assert.ok(h.nodes.filter(n=>n.started).every(n=>n.ended&&n.disconnected));
  assert.equal(context.closeCount,1);
});

test('hidden document stops events, fades master and removes its listener on dispose',async()=>{
  const original=globalThis.document, listeners=new Map();
  globalThis.document={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  const h=audioHarness(),fx=createFlightFX({AudioContextClass:h.AudioContext});
  try {
    await fx.unlock();fx.play('pulse');assert.ok(h.transients().length>0);
    globalThis.document.hidden=true;listeners.get('visibilitychange')();
    const master=h.nodes.find(n=>n.destination===h.contexts[0].destination);
    assert.equal(master.gain.targets.at(-1),0);
    assert.equal(h.transients().length,0);
    h.contexts[0].currentTime++;fx.play('pickup');assert.equal(h.transients().length,0);
    globalThis.document.hidden=false;listeners.get('visibilitychange')();
    assert.ok(master.gain.targets.at(-1)>0);
    fx.destroy();assert.equal(listeners.size,0);
  } finally {
    fx.destroy();
    if(original===undefined)delete globalThis.document;else globalThis.document=original;
  }
});

test('busy scenes keep warnings ahead of pickup chatter within foreground and voice limits',async()=>{
 const h=audioHarness(),fx=createFlightFX({AudioContextClass:h.AudioContext});await fx.unlock();
 const context=h.contexts[0];
 for(const [at,type]of [[0,'pickup'],[.04,'spore'],[.08,'flash'],[.10,'ice-warning'],[.20,'shield'],[.50,'pickup']]){
  context.currentTime=at;fx.play(type);
  const mix=fx.getMixState();assert.ok(mix.events<=3);assert.ok(mix.voices<=18);assert.ok(mix.priorities[0]<=1);
 }
 assert.ok(fx.getMixState().priorities[2]>0,'danger survives the busy scene');
 assert.equal(fx.getMixState().priorities[0],0,'new pickup detail yields to danger');
 assert.ok(fx.getFocus()>0);fx.setMuted(true);assert.equal(fx.getFocus(),0);
 fx.setMuted(false);context.currentTime=4;
 assert.equal(fx.getMixState().events,0);assert.equal(fx.getMixState().voices,0);
 assert.ok(fx.getFocus()<.01);fx.destroy();
});
