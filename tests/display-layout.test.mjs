import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_VIEWPORT,displayMode,fitGameViewport,gameDocumentUrl,normalizeDisplayZoom} from '../dist/display-layout.mjs';

test('desktop uses a phone-shaped viewport; touch phones retain native safe-area layout',()=>{
 assert.equal(displayMode({coarse:false,hover:true,screenWidth:1920,screenHeight:1080}),'desktop');
 assert.equal(displayMode({coarse:false,hover:true,screenWidth:900,screenHeight:1400}),'desktop','a tall desktop sidebar still gets landscape play');
 assert.equal(displayMode({coarse:true,hover:false,screenWidth:412,screenHeight:915}),'native');
 assert.equal(displayMode({coarse:true,hover:false,screenWidth:915,screenHeight:412}),'native');
 assert.equal(displayMode({requested:'desktop',coarse:true,hover:false,screenWidth:412,screenHeight:915}),'desktop');
 assert.equal(displayMode({embedded:true,requested:'desktop'}),'native','legacy embedding cannot recurse into a second host');
});
test('150 percent default is exact when it fits, and constrained windows never crop the game',()=>{
 const large=fitGameViewport({width:1884,height:992});
 assert.equal(large.scale,1.5);assert.equal(large.width,1350);assert.equal(large.height,607.5);assert.equal(large.clamped,false);
 for(const [width,height]of [[1244,632],[933,1156],[400,220],[900,320],[0,0]]){
  for(const zoom of [75,100,150,200,'fit']){
   const view=fitGameViewport({width,height,zoom});assert.ok(view.width<=width+.001);assert.ok(view.height<=height+.001);
   if(view.scale)assert.ok(Math.abs(view.width/view.height-20/9)<1e-9);
  }
 }
 assert.equal(GAME_VIEWPORT.width,900);assert.equal(GAME_VIEWPORT.height,405);
 assert.equal(normalizeDisplayZoom('javascript:alert(1)'),150);
});
test('game query flags survive host routing without exposing the display wrapper to the engine',()=>{
 const url=gameDocumentUrl('https://example.com/orbix/?mock=rest&perf=1&zoom=200&display=desktop&v=build',{hosted:true});
 assert.equal(url.pathname,'/orbix/game.html');assert.equal(url.searchParams.get('mock'),'rest');assert.equal(url.searchParams.get('perf'),'1');assert.equal(url.searchParams.get('hosted'),'1');
 assert.equal(url.searchParams.has('zoom'),false);assert.equal(url.searchParams.has('display'),false);
 const direct=gameDocumentUrl(url.href);assert.equal(direct.searchParams.has('hosted'),false);
});
test('the main entry uses the automatic host while the actual game stays independently responsive',()=>{
 const host=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const game=fs.readFileSync(new URL('../dist/game.html',import.meta.url),'utf8');
 assert.match(host,/desktop-host\.mjs/);assert.doesNotMatch(host,/src="app\.mjs/);
 assert.match(game,/viewport-fit=cover/);assert.match(game,/src="app\.mjs/);assert.match(game,/readability-pass\.css/);assert.match(game,/menu-art\.css/);
});
