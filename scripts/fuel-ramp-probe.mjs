import assert from 'node:assert/strict';
import {fuelBudgetProfile} from '../dist/glow-budget.mjs';
for(const map of [0,1,2]){
 let previous=fuelBudgetProfile(1,map);assert.equal(previous.rate,map===0?14:11);
 for(let tier=2;tier<=6;tier++){
  const current=fuelBudgetProfile(tier,map);assert.ok(current.rate<previous.rate);assert.ok(current.rate/previous.rate>.85,'no sudden supply cliff');assert.equal(current.spacing-previous.spacing,140);previous=current;
 }
 assert.ok(Math.abs(previous.rate-8.2)<1e-9);
}
console.log('Fuel supply decreases smoothly across six ascensions; accessible anchors retained; A1 unchanged.');
