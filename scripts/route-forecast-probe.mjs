import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {getRouteForecast} from '../dist/route-forecast.mjs';
const run=M.createRun(M.newState().profile,'route-audit-one');
assert.equal(run.map[0][0].recipeId,'long-crossing');
run.path=['m0-0-1','m0-1-1'];run.step=2;run.phase='map';run.current=null;
const event=run.map.flat().find(n=>n.id==='m0-4-2');
const forecast=getRouteForecast(run,event),view=M.getRouteMapState(run);
assert.ok(view.reachableEdges.some(([from,to])=>from===event.id&&to==='m0-5-2'));
assert.ok(forecast.nextStops.some(n=>n.id==='m0-5-2'),'Ordinary intervening flights reset the old elite history before a future event');
assert.equal(forecast.minTotalFlights,6,'Future total includes ordinary flights before the previewed stop');

const n=(id,row,type,nextIds,extra={})=>({id,row,type,kind:type==='support'?'event':'normal',elite:false,nextIds,name:id,...extra});
const map=[
 [n('e0',0,'flight',['f1','v1'],{elite:true})],
 [n('f1',1,'flight',['target']),n('v1',1,'support',['target'])],
 [n('target',2,'support',['e3','f3'])],
 [n('e3',3,'flight',['rest'],{elite:true}),n('f3',3,'flight',['f4'])],
 [n('rest',4,'support',['exit'],{kind:'camp'}),n('f4',4,'flight',['exit'])],
 [n('exit',5,'finale',[])],
];
const mixed={map,path:['e0'],step:1,phase:'map',current:null};
const by=new Map(map.flat().map(node=>[node.id,node]));
let result=getRouteForecast(mixed,'target');
assert.deepEqual(result.nextStops.map(n=>n.id),['e3','f3']);
assert.equal(result.restReachable,true);assert.equal(result.restGuaranteed,false);
assert.equal(result.minTotalFlights,4);assert.equal(result.maxTotalFlights,5);
const supportRoute={...mixed,path:['e0','v1'],phase:'support',current:by.get('v1')};
result=getRouteForecast(supportRoute,'target');
assert.deepEqual(result.nextStops.map(n=>n.id),['f3']);
assert.equal(result.restReachable,false);assert.equal(result.minTotalFlights,4);assert.equal(result.maxTotalFlights,4);
assert.equal(getRouteForecast(supportRoute,'e3').restReachable,false,'Unreachable nodes cannot advertise a recovery route');
const ordinaryRoute={...mixed,path:['e0','f1'],phase:'briefing',current:by.get('f1')};
assert.equal(getRouteForecast(ordinaryRoute,'target').restReachable,true);
const actualEvent={...mixed,path:['e0','v1'],step:2};
assert.deepEqual(getRouteForecast(actualEvent,'target').nextStops.map(n=>n.id),['f3'],'Immediate support retains elite history');
const actualOrdinary={...mixed,path:['e0','f1'],step:2};
assert.ok(getRouteForecast(actualOrdinary,'target').nextStops.some(n=>n.id==='e3'),'Immediate ordinary arrival permits the later elite');
const before=JSON.stringify(mixed);getRouteForecast(mixed,'target');assert.equal(JSON.stringify(mixed),before,'Forecast must not mutate the run');
console.log('Forecast: authored ordinary reset, mixed incoming histories, selected-route restriction, legal Rest visibility, total-flight counts and no mutation passed.');
