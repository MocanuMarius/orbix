import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const fresh=()=>{const s=M.newState();s.run=M.createRun(s.profile,'paid-costs');M.chooseStartingSkill(s,'main-efficiency');s.run.embers=600;return s;};
const support=(r,index)=>{r.current={...r.map.flat().find(n=>n.type==='support'),type:'support',kind:'event',eventIndex:index};r.phase='support';r.supportOffers=null;};
const s=fresh(),r=s.run;
assert.ok(M.buyCheckpointSkill(s,'main-recovery'));const full=M.SKILLS['main-recovery'].cost;assert.equal(r.skillPaid['main-recovery'],full);
support(r,3);const offered=M.getSupportChoices(r,s.profile)[0],id=offered.effect.upgrade,discount=offered.effect.emberCost;assert.ok(discount<M.getSkillCost(M.getSkillWallet(s),id));assert.ok(M.resolveSupport(r,0,s.profile));M.settleCheckpoint(s);assert.equal(r.skillPaid[id],discount);
// Force the relevant workshop branch for the discounted node. Refund exactly
// recorded expenditure, including several ranks if they were bought.
let root=M.SKILLS[id];while(root.requires&&M.SKILLS[root.requires]?.branch==='main')root=M.SKILLS[root.requires];
if(root.branch!=='main'){r.current=null;r.phase='map';r.victoryPending=true;r.embers=600;assert.ok(M.buyCheckpointSkill(s,'main-sight'));support(r,3);}
support(r,10);const before=r.embers,choices=M.getSupportChoices(r,s.profile),index=choices.findIndex(c=>c.effect.respec==='main-efficiency');
const expected=Object.entries(r.skillPaid).filter(([key])=>{let n=M.SKILLS[key];while(n){if(n.id==='main-efficiency')return key!==r.startingSkill;n=M.SKILLS[n.requires];}return false;}).reduce((sum,[,paid])=>sum+paid,0);
assert.ok(index>=0);assert.ok(M.resolveSupport(r,index,s.profile));M.settleCheckpoint(s);assert.equal(r.embers-before,expected);assert.equal(r.skills[r.startingSkill],1);assert.equal(r.skillPaid[r.startingSkill],0);
// Exact discounted child branch, regardless of deterministic shrine offer.
const x=fresh();x.run.skills={'main-efficiency':1,'main-recovery':1};x.run.skillPaid={'main-efficiency':0,'main-recovery':68};support(x.run,10);const money=x.run.embers;assert.ok(M.resolveSupport(x.run,0,x.profile));M.settleCheckpoint(x);assert.equal(x.run.embers-money,68);
const t=fresh();t.profile.ownedArtifacts=['quiet-cinder'];t.profile.equippedArtifacts=['quiet-cinder'];t.run.artifacts=['quiet-cinder'];const original=structuredClone(t.profile),wallet=t.run.embers;
assert.ok(M.setTestOverride(t,true));assert.equal(t.run.embers,wallet,'TEST must not add currency');assert.equal(t.run.afterglow,0,'TEST must not add fuel');support(t.run,5);
assert.ok(M.resolveSupport(t.run,0,t.profile));M.settleCheckpoint(t);assert.deepEqual(t.profile,original);assert.ok(!t.run.artifacts.includes('quiet-cinder'));assert.equal(t.run.embers,wallet+M.ARTIFACTS['quiet-cinder'].sellValue);
assert.ok(M.grantTestEmbers(t));assert.equal(t.run.embers,wallet+M.ARTIFACTS['quiet-cinder'].sellValue+500);assert.equal(M.grantTestEmbers(fresh()),false);
const tutorial=M.newState();assert.ok(M.startTutorial(tutorial));const practice=tutorial.run,realProfile=structuredClone(tutorial.profile),realMoney=practice.embers;assert.ok(M.selectNode(practice,M.getChoices(practice)[0].id));M.beginFlightAttempt(practice);M.finishFlight(practice,{success:true,flame:50});assert.ok(practice.victoryPending);assert.equal(practice.flightReward.offers.length,2);const practiceMoney=practice.practiceEmbers;assert.ok(M.chooseFlightReward(tutorial,'embers'));assert.equal(practice.practiceEmbers,practiceMoney+18);assert.equal(practice.embers,realMoney);assert.deepEqual(tutorial.profile,realProfile);
console.log('Actual-paid refunds, free gift retention, TEST archive/profile isolation, explicit test grant, and practice reward currency passed.');
