import assert from 'node:assert/strict';
process.argv.push('--importOnly');const {canvas}=await import('./balance-current-flight.mjs');const {WispFlight}=await import('../dist/flight.mjs');
const e=new WispFlight({canvas:canvas(),seed:'hint-safety',node:{difficulty:2,row:3},companions:['collector']});
e.layout.obstacles=[];e.layout.boss=null;e.biomeDynamics.items=[];e.drafts.zones=[];e.time=5;e.lastFlapTime=0;e.player.y=e.height*.4;e.player.vy=0;e.paused=false;e.alive=true;
const before=JSON.stringify({player:e.player,distance:e.distance,flame:e.flame,time:e.time});assert.ok(e.canShowContextHint());assert.equal(JSON.stringify({player:e.player,distance:e.distance,flame:e.flame,time:e.time}),before);
e.player.y=e.height-5;e.player.vy=300;assert.equal(e.canShowContextHint(),false);e.destroy();console.log('Actual 60Hz hint projection: safe coast accepted; imminent exit rejected; state unchanged.');
