import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {COMPANION_ABILITIES,getCompanionUnlock} from '../dist/companion-abilities.mjs';
import {homeMenuMarkup} from '../dist/run-menu.mjs';
const roles=Object.keys(COMPANION_ABILITIES);
assert.deepEqual(roles,['collector','protector','swift','leveler']);
const s=M.newState();
for(const id of roles){const unlocked=id==='collector';assert.equal(M.setStartingCompanion(s,id),unlocked);assert.equal(getCompanionUnlock(id,1).selectable,unlocked);}
s.profile.difficulty=4;
for(const id of roles){assert.ok(M.setStartingCompanion(s,id));assert.equal(M.getStartingCompanion(s),id);}
s.profile.difficulty=1;assert.equal(M.getStartingCompanion(s),'collector');
s.settings.testOverride=true;for(const id of roles)assert.ok(M.setStartingCompanion(s,id));
assert.equal(M.setStartingCompanion(s,'seer'),false);assert.equal(M.setStartingCompanion(s,'kindler'),false);
const html=homeMenuMarkup({profile:{difficulty:1},testOverride:false});
assert.equal((html.match(/data-action="starting-companion"/g)||[]).length,4);
assert.equal((html.match(/aria-pressed="false" disabled/g)||[]).length,3);
const test=homeMenuMarkup({profile:{difficulty:1},testOverride:true,testStarterCompanion:'swift'});
assert.match(test,/TEST · ALL SELECTABLE/);assert.match(test,/RUNNER/);
assert.ok(Object.values(M.SKILLS).every(x=>!['seer','kindler'].includes(x.branch)));
for(const role of roles){const mod=M.getRunModifiers({companions:[role],skills:{'main-echo-sight':1,'main-echo-long':1,'main-kindled-touch':1,'main-kindled-rich':1,'main-purifying-touch':1}});assert.equal(mod.mainSeer,true);assert.equal(mod.seerDuration,3);assert.equal(mod.mainKindler,true);assert.equal(mod.kindlerBonus,10);assert.equal(mod.kindlerPurify,true);}
const r=M.createRun(s.profile,'death-detour');
const rest=r.map[1].find(n=>n.kind==='camp'),first=r.map[0].find(n=>n.nextIds.includes(rest.id));
r.path=[first.id,rest.id];r.step=2;r.phase='map';r.embers=82;r.flame=68;r.skills={'main-efficiency':1};
assert.equal(M.getChoices(r).length,1);const failed=M.getChoices(r)[0];assert.ok(M.selectNode(r,failed.id));assert.ok(M.beginFlightAttempt(r));
assert.ok(M.finishFlight(r,{success:false,flame:0}));assert.equal(r.phase,'map');assert.equal(r.current,null);assert.equal(r.lives,2);assert.equal(r.flame,68);assert.equal(r.embers,82);assert.deepEqual(r.skills,{'main-efficiency':1});assert.equal(r.step,2);assert.ok(!r.path.includes(failed.id));
const choices=M.getChoices(r);assert.ok(choices.length>1);assert.ok(choices.every(n=>n.row===2&&n.type==='flight'));assert.ok(choices.some(n=>n.id===failed.id));
const alternate=choices.find(n=>n.id!==failed.id);assert.ok(M.selectNode(r,alternate.id));assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:false}));assert.equal(r.embers,82);assert.equal(r.lives,1);
assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:false}));assert.equal(r.phase,'ended');assert.equal(r.lives,0);
console.log('Four companions: normal/TEST starter gates, roster, main perks, alternate-route deaths and zero-life end passed.');
