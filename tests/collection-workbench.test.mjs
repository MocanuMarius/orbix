import test from 'node:test';
import assert from 'node:assert/strict';
import {ARTIFACTS,newState,createRun,sellArtifact,getArtifactSalvageValue} from '../dist/model.mjs';
import {collectionMarkup,collectionItemMarkup,COLLECTION_PAGE_SIZE} from '../dist/collection-view.mjs';

function fixture(ids=['glow-wick','path-prism','quiet-cinder']){
 const state=newState();
 state.run=createRun(state.profile,'collection-workbench');
 state.run.artifacts=[...ids];
 state.run.restReady=true;
 state.run.artifactCharges={'glow-wick':2};
 return state;
}

test('the collection includes its selection and melt confirmation in one workbench',()=>{
 const state=fixture();
 const markup=collectionMarkup(state,{canMelt:true,selectedId:'glow-wick'});
 assert.match(markup,/collection-flat/);
 assert.match(markup,/2 automatic uses/);
 assert.match(markup,/Restore up to 3 extra/);
 assert.match(markup,/data-action="sell-artifact" data-id="glow-wick"/);
 assert.match(markup,/data-action="close-collection"/);
 assert.doesNotMatch(markup,/data-action="artifacts"|<dialog/);
 const confirmed=collectionMarkup(state,{canMelt:true,selectedId:'glow-wick',confirmMeltId:'glow-wick'});
 assert.match(confirmed,/collection-inline-melt/);
 assert.match(confirmed,/Remove this artifact and its remaining effect/);
 assert.match(confirmed,/data-action="cancel-artifact-melt"/);
 assert.match(confirmed,/data-action="confirm-artifact-forge" data-id="glow-wick"/);
 assert.match(confirmed,new RegExp('\\+'+getArtifactSalvageValue('glow-wick')));
 const other=collectionMarkup(state,{canMelt:true,selectedId:'quiet-cinder',confirmMeltId:'glow-wick'});
 assert.doesNotMatch(other,/data-action="confirm-artifact-forge"/,'a stale selection cannot confirm another artifact');
});

test('direct inspection has the same roster and truthful read-only rules away from Rest',()=>{
 const state=fixture();state.run.restReady=false;
 const markup=collectionItemMarkup(state,'path-prism',{canMelt:true});
 assert.match(markup,/collection-flat/);
 assert.match(markup,/aria-label="Owned artifacts"/);
 assert.match(markup,/Melt artifacts at Rest/);
 assert.doesNotMatch(markup,/data-action="sell-artifact"|data-action="confirm-artifact-forge"/);
 assert.equal(collectionItemMarkup(state,'glass-lantern'),'', 'unowned artifacts cannot be inspected as owned');
});

test('paging and stale selections resolve to an actually owned artifact',()=>{
 const ids=Object.keys(ARTIFACTS).slice(0,COLLECTION_PAGE_SIZE+2),state=fixture(ids);
 const first=collectionMarkup(state,{page:0,selectedId:'missing'});
 assert.equal((first.match(/class="collection-artifact /g)||[]).length,COLLECTION_PAGE_SIZE);
 assert.match(first,new RegExp('aria-label="'+ARTIFACTS[ids[0]].name+' details"'));
 const second=collectionMarkup(state,{page:1,selectedId:ids[0]});
 assert.equal((second.match(/class="collection-artifact /g)||[]).length,2);
 assert.match(second,new RegExp('aria-label="'+ARTIFACTS[ids[COLLECTION_PAGE_SIZE]].name+' details"'));
 const direct=collectionItemMarkup(state,ids[COLLECTION_PAGE_SIZE+1]);
 assert.match(direct,new RegExp('aria-label="'+ARTIFACTS[ids[COLLECTION_PAGE_SIZE+1]].name+' details"'));
 assert.match(direct,/2\/2/);
});

test('melting removes the effect and uses once, credits once, and gives an inline empty-state receipt',()=>{
 const state=fixture(['glow-wick']),before=state.run.condensedGlow,amount=getArtifactSalvageValue('glow-wick');
 assert.ok(sellArtifact(state,'glow-wick'));
 assert.equal(state.run.condensedGlow,before+amount);
 assert.equal(state.run.artifactCharges['glow-wick'],undefined);
 assert.equal(sellArtifact(state,'glow-wick'),false);
 assert.equal(state.run.condensedGlow,before+amount);
 const markup=collectionMarkup(state,{canMelt:true,lastMelt:{id:'glow-wick',amount}});
 assert.match(markup,/collection-inline-receipt.*role="status"/);
 assert.match(markup,/Your collection is empty/);
 assert.match(markup,new RegExp('\\+'+amount));
 assert.doesNotMatch(markup,/data-action="confirm-artifact-forge"/);
});
