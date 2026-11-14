import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {ARTIFACTS,newState,createRun,canSellArtifact,sellArtifact,getArtifactSalvageValue} from '../dist/model.mjs';
import {collectionMarkup,COLLECTION_PAGE_SIZE} from '../dist/collection-view.mjs';

// Exercise the app's actual checkpoint handlers with the real collection/model.
// A small dialog stand-in detects an accidental return to nested full-screen flows.
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const handlers=app.slice(app.indexOf('const browsingDiscoveries='),app.indexOf('function refreshMapDock(){'));

function workbench(ids=['glow-wick','path-prism','quiet-cinder']){
 const state=newState();
 state.run=createRun(state.profile,'collection-flow');
 state.run.artifacts=[...ids];state.run.restReady=true;
 state.run.artifactCharges={'glow-wick':2};
 let sheet=null;
 const calls={opened:0,closed:0,paused:0,resumed:0,saved:0,header:0,rendered:[],notices:[]};
 const runtime=createContext({
  state,screen:'rest-prep',engine:null,lastSnapshot:null,
  collectionPage:0,collectionSelectedId:null,collectionConfirmId:null,collectionLastMelt:null,
  ARTIFACTS,COLLECTION_PAGE_SIZE,collectionMarkup,canSellArtifact,sellArtifact,getArtifactSalvageValue,
  artifactArt:id=>`<svg data-art-id="${id}"></svg>`,
  document:{querySelector:selector=>selector==='dialog.collection-sheet'?sheet:null},
  openSheet:(markup,cls)=>{calls.opened++;sheet={innerHTML:markup,className:cls};return sheet;},
  closeSheet:()=>{calls.closed++;sheet=null;},
  pauseFlight:()=>{calls.paused++;},resumeFlight:()=>{calls.resumed++;sheet=null;},
  persist:()=>{calls.saved++;},renderHeader:()=>{calls.header++;},render:screen=>calls.rendered.push(screen),
  notify:text=>calls.notices.push(text),artifactsRevealed:()=>true,guideScreen:()=>{}
 });
 assert.ok(handlers.includes('function closeCollection()'),'collection handlers must remain discoverable');
 runInContext(handlers,runtime);
 return {state,calls,runtime,get sheet(){return sheet;}};
}

test('the real Rest handlers keep selection, cancel, Melt and receipt in the same dialog',()=>{
 const flow=workbench(),{runtime,state,calls}=flow;
 runtime.showArtifacts();
 const sheet=flow.sheet,before=state.run.condensedGlow,amount=getArtifactSalvageValue('glow-wick');
 runtime.inspectArtifact('glow-wick');
 runtime.requestArtifactSalvage('glow-wick');
 assert.equal(flow.sheet,sheet);assert.equal(calls.opened,1);
 assert.equal(state.run.condensedGlow,before,'preview must not award currency');
 assert.match(sheet.innerHTML,/data-action="confirm-artifact-forge"/);
 runtime.collectionConfirmId=null;runtime.repaintCollection();
 assert.doesNotMatch(sheet.innerHTML,/data-action="confirm-artifact-forge"/);
 runtime.forgeArtifact('glow-wick');
 assert.ok(state.run.artifacts.includes('glow-wick'),'cancelling must prevent stale confirmation');
 runtime.requestArtifactSalvage('glow-wick');runtime.forgeArtifact('quiet-cinder');
 assert.equal(state.run.condensedGlow,before,'confirmation must match the selected artifact');
 runtime.forgeArtifact('glow-wick');
 assert.equal(flow.sheet,sheet);assert.equal(calls.opened,1);
 assert.equal(state.run.condensedGlow,before+amount);
 assert.equal(state.run.artifactCharges['glow-wick'],undefined);
 assert.match(sheet.innerHTML,/collection-inline-receipt/);
 assert.doesNotMatch(sheet.innerHTML,/data-action="confirm-artifact-forge"/);
 assert.equal(calls.saved,1);assert.equal(calls.header,1);
 runtime.forgeArtifact('glow-wick');
 assert.equal(state.run.condensedGlow,before+amount,'a repeated click cannot pay twice');
 runtime.inspectArtifact('path-prism');
 assert.doesNotMatch(sheet.innerHTML,/collection-inline-receipt/);
 assert.deepEqual(calls.notices,[],'Melt uses an inline receipt, not a feedback popup');
});

test('the real app opens an owned seventh artifact and clamps the page after its sale',()=>{
 const ids=Object.keys(ARTIFACTS).slice(0,COLLECTION_PAGE_SIZE+1),flow=workbench(ids),{runtime}=flow;
 runtime.inspectArtifact(ids[COLLECTION_PAGE_SIZE]);
 assert.equal(runtime.collectionPage,1);
 assert.equal((flow.sheet.innerHTML.match(/class="collection-artifact /g)||[]).length,1);
 assert.match(flow.sheet.innerHTML,new RegExp('aria-label="'+ARTIFACTS[ids[COLLECTION_PAGE_SIZE]].name+' details"'));
 runtime.requestArtifactSalvage(ids[COLLECTION_PAGE_SIZE]);runtime.forgeArtifact(ids[COLLECTION_PAGE_SIZE]);
 assert.equal((flow.sheet.innerHTML.match(/class="collection-artifact /g)||[]).length,COLLECTION_PAGE_SIZE);
 assert.doesNotMatch(flow.sheet.innerHTML,/aria-label="Collection pages"/);
 assert.equal(flow.calls.opened,1);
});

test('flight inspection cannot Melt and Done uses safe resume; checkpoint Done returns to the checkpoint',()=>{
 const flow=workbench(),{runtime,state,calls}=flow,before=state.run.condensedGlow;
 runtime.engine={};runtime.lastSnapshot={artifactCharges:{'glow-wick':1}};
 runtime.inspectArtifact('glow-wick',true);
 assert.equal(calls.paused,1);
 assert.match(flow.sheet.innerHTML,/1 automatic use/,'inspection reflects live remaining charges');
 assert.doesNotMatch(flow.sheet.innerHTML,/data-action="sell-artifact"/);
 runtime.requestArtifactSalvage('glow-wick');
 assert.equal(runtime.collectionConfirmId,null);assert.equal(state.run.condensedGlow,before);
 runtime.closeCollection();
 assert.equal(calls.resumed,1);assert.equal(calls.closed,0);
 runtime.engine=null;runtime.showArtifacts();runtime.closeCollection();
 assert.equal(calls.closed,1);assert.deepEqual(calls.rendered,['rest-prep']);
});

test('collection repaint retains the native dialog close handler and explicit close dispatch',()=>{
 assert.match(app,/case'close-collection':closeCollection\(\)/);
 assert.match(app,/case'cancel-artifact-melt':collectionConfirmId=null;repaintCollection\(\)/);
 assert.match(app,/el\.addEventListener\('close',[\s\S]*?if\(engine&&paused[\s\S]*?resumeFlight\(\)/);
});
