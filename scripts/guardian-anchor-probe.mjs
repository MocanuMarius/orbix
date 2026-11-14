import assert from 'node:assert/strict';
import {guardianPresenceState} from '../dist/guardian-presence.mjs';
import {buildFlightLayout} from '../dist/flight.mjs';
const e={height:405,width:900,distance:0,layout:{boss:{id:'hollow-warden'},exitLandmark:{entryX:9000,height:405,groundY:390}}};
assert.equal(guardianPresenceState(e,1000),null);
const a=guardianPresenceState(e,8600),b=guardianPresenceState(e,8700);
assert.equal(a.x-b.x,100);assert.equal(a.worldX,b.worldX);assert.equal(a.groundY,b.groundY);
for(const terrain of ['canopy','ruins','storm'])for(let seed=0;seed<12;seed++){
 const layout=buildFlightLayout({seed,terrain,duration:90,height:405});
 assert.ok(layout.obstacles.every(o=>o.motion===0),'Ordinary scenery must stay static');
}
console.log('World-anchored guardian; hidden early; 36 static terrain layouts checked.');
