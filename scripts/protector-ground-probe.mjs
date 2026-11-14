import assert from 'node:assert/strict';
process.argv.push('--importOnly');
const {canvas}=await import('./balance-current-flight.mjs');
const {WispFlight}=await import('../dist/flight.mjs');
const {getRunModifiers}=await import('../dist/model.mjs');
function make(role='protector'){
 const e=new WispFlight({canvas:canvas(),seed:'shield-ground',node:{difficulty:2,row:3},companions:[role],modifiers:getRunModifiers({companions:[role]})});
 e.layout.obstacles=[];e.layout.boss=null;e.biomeDynamics.items=[];e.drafts.zones=[];e.blackHoles.holes=[];e.paused=false;e.alive=true;e.flame=e.maxFlame;return e;
}
const e=make();assert.equal(e.shield.recoveryTotal,7);
e.player.y=e.height-e.player.radius-1;e.player.vy=180;e.step(1/60);
assert.equal(e.dying,false);assert.equal(e.shield.charges,0);assert.ok(e.player.vy<0);assert.ok(e.player.y<e.height-e.player.radius);assert.equal(e.shield.recovery,7);
// Keep the player in clear space while the actual engine regenerates the shell.
for(let i=0;i<421;i++){e.player.y=e.height/2;e.player.vy=0;e.step(1/60);}
assert.equal(e.shield.charges,1);e.destroy();
const bare=make('collector');bare.player.y=bare.height-bare.player.radius;bare.player.vy=0;bare.step(1/60);assert.equal(bare.dying,false);
bare.player.y=bare.height+bare.player.radius+2;bare.step(1/60);assert.equal(bare.dying,true);bare.destroy();
console.log('Protector: 7s regeneration, ground-edge upward bounce; unshielded sky boundary unchanged.');
