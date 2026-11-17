import test from 'node:test';
import assert from 'node:assert/strict';
import {pauseMenuMarkup,settingsMarkup,pauseContextLine,levelControlMarkup} from '../dist/ui/pause-menu.mjs';
import * as menus from '../dist/ui/menus.mjs';
import {clampLevel,levelGain,levelForKey,levelFromPointer,createLevelStore,createFxLevel,DEFAULT_LEVEL} from '../dist/sound-level.mjs';
import {createMusic} from '../dist/music.mjs';

const actions=html=>[...html.matchAll(/data-action="([^"]+)"/g)].map(m=>m[1]);
const labels=html=>[...html.matchAll(/<b>([^<]*)<\/b>/g)].map(m=>m[1]);
const memory=(seed={})=>{const map=new Map(Object.entries(seed));return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),map};};

test('practice flight: Resume, Loaned Cards, Help, Settings, then Skip practice and Exit to Menu', () => {
  const html=pauseMenuMarkup({practice:true,flight:true,context:'FIRST LIGHT PRACTICE · STOP 2/7',deckLabel:'Loaned Cards',showDeck:true,showCollection:false});
  assert.deepEqual(actions(html),['resume','skills','field-guide','settings','skip-practice','exit-menu']);
  assert.deepEqual(labels(html),['Resume flight','Loaned Cards','Help','Settings','Skip practice','Exit to Menu']);
  assert.match(html,/role="dialog"/);
  assert.match(html,/FIRST LIGHT PRACTICE · STOP 2\/7/);
  // Without Collection the build plaque is full width (not inside a split).
  assert.doesNotMatch(html,/<div class="wb-split"><button[^>]*data-action="skills"/);
  assert.doesNotMatch(html,/abandon-run|artifacts|map-key|data-card-glossary|data-action="music"|data-action="mute"/);
});

test('real flight with Collection: Deck and Collection share a row; Exit and rust Abandon', () => {
  const html=pauseMenuMarkup({practice:false,flight:true,context:'ASCENSION 1 · MAP 1/3 · STOP 4/10',deckLabel:'Deck',showCollection:true});
  assert.deepEqual(actions(html),['resume','skills','artifacts','field-guide','settings','exit-menu','abandon-run']);
  assert.match(html,/<div class="wb-split"><button type="button" class="wb-sign wb-sign-standard" data-action="skills">/);
  assert.match(html,/class="wb-sign wb-sign-danger" data-action="abandon-run"/);
  assert.match(html,/class="wb-sign wb-sign-quiet" data-action="exit-menu"/);
  assert.ok(html.indexOf('data-action="resume"')<html.indexOf('data-action="skills"'),'Resume is first in focus order');
});

test('real flight without Collection, Skills label and hidden deck', () => {
  const skills=pauseMenuMarkup({deckLabel:'Skills',showCollection:false});
  assert.ok(labels(skills).includes('Skills'));
  const none=pauseMenuMarkup({showDeck:false,showCollection:false});
  assert.deepEqual(actions(none),['resume','field-guide','settings','exit-menu','abandon-run']);
  const onlyCollection=pauseMenuMarkup({showDeck:false,showCollection:true});
  assert.doesNotMatch(onlyCollection,/<div class="wb-split"><button[^>]*data-action="artifacts"/);
});

test('map: Back to map closes the sheet; the dialog host owns the role', () => {
  const html=pauseMenuMarkup({flight:false,onMap:true,deckLabel:'Deck',showCollection:true});
  assert.equal(actions(html)[0],'close-sheet');
  assert.equal(labels(html)[0],'Back to map');
  assert.doesNotMatch(html,/role="dialog"/);
  assert.match(html,/map symbols/);
});

test('bonus reminder and mock note sit under the sound tab; mock headings', () => {
  const bonus='<details class="pause-bonus-rule"><summary>Optional challenge · 2/3</summary><p>a</p></details>';
  const html=pauseMenuMarkup({bonusReminder:bonus,heading:'Rest preview',mock:true});
  const right=html.slice(html.indexOf('wb-side-right'));
  assert.ok(right.indexOf('wb-sound')<right.indexOf(bonus),'reminder follows the sound tab');
  assert.match(right,/Mock run · changes not saved/);
  assert.match(html,/<h2 class="wb-title">Rest preview<\/h2>/);
});

test('run status tab shows only real values', () => {
  const html=pauseMenuMarkup({status:{lives:2,maxLives:3,spark:'18',sparkMax:'30',stored:8}});
  assert.match(html,/aria-label="2 of 3 hearts"/);
  assert.equal((html.match(/data-ui-icon="heart-empty"/g)||[]).length,1);assert.equal((html.match(/data-ui-icon="heart-full"/g)||[]).length,2);
  assert.match(html,/Spark Meter 18 of 30/);assert.match(html,/<b>18 \/ 30<\/b>/);
  assert.match(html,/8 Stored Sparks/);
  const practice=pauseMenuMarkup({practice:true,status:{lives:2,maxLives:3,spark:'18',sparkMax:'30',stored:null}});
  assert.doesNotMatch(practice,/Stored Sparks/);
  assert.doesNotMatch(pauseMenuMarkup({}),/wb-side-left/,'no status, no tab');
});

test('settings: three groups, real actions, Speed only when offered, Help only when asked', () => {
  const html=settingsMarkup({music:{level:2},fx:{level:0,last:3},lessons:true,speed:null,installLabel:'Install game',version:'v-1'});
  assert.deepEqual(actions(html),['skip-tutorial','install-game','refresh-build','settings-back','settings-advanced']);
  assert.deepEqual([...html.matchAll(/<h3 class="wb-set-group"[^>]*>([^<]+)/g)].map(m=>m[1]),['Sound','Gameplay','App']);
  assert.match(html,/data-action="skip-tutorial" aria-pressed="true"/);assert.match(html,/Lessons On/);
  assert.match(html,/Version v-1/);assert.match(html,/class="settings-body wb-set-grid"/);
  assert.match(html,/href="nature-credits.html"/);
  assert.doesNotMatch(html,/data-cruising-speed|field-guide|data-action="practice"|data-card-glossary|data-action="artifacts"/);
  assert.match(html,/data-level-bars="fx"[^>]*aria-valuenow="0"/);
  const more=settingsMarkup({lessons:false,speed:{selected:'2',options:[{value:'0',label:'Baseline'},{value:'2',label:'+2%'}]},showHelp:true});
  assert.match(more,/Lessons Off/);assert.match(more,/aria-pressed="false"/);
  assert.match(more,/<select id="cruising-speed" data-cruising-speed aria-label="Cruising speed">/);
  assert.match(more,/<option value="2" selected>\+2%<\/option>/);assert.match(more,/<small>\+2%<\/small>/);
  assert.ok(actions(more).includes('field-guide'));
  assert.doesNotMatch(more,/role="dialog"/,'the <dialog> host owns the role');
});

test('text is escaped', () => {
  const html=pauseMenuMarkup({context:'<img src=x>',heading:'"x"&'});
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img src=x&gt;/);
  assert.match(html,/&quot;x&quot;&amp;/);
});

test('level controls: slider semantics, mute button, beat only on music', () => {
  const html=pauseMenuMarkup({music:{level:2,last:2},fx:{level:0,last:4}});
  assert.match(html,/data-channel="music"[^>]*data-level="2"[^>]*data-beat/);
  assert.match(html,/data-channel="fx" data-name="FX" data-level="0" data-last="4">/);
  assert.match(html,/role="slider" tabindex="0" aria-label="Music volume" aria-valuemin="0" aria-valuemax="4" aria-valuenow="2"/);
  assert.match(html,/aria-label="FX volume" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" aria-valuetext="Off"/);
  assert.match(html,/data-level-mute="fx" aria-pressed="false" aria-label="FX off"/);
  assert.equal((levelControlMarkup('music',3).match(/class="lit"/g)||[]).length,3);
});

test('context line and catalogue export', () => {
  assert.equal(pauseContextLine({isTutorial:true,step:1,map:Array(7)}),'FIRST LIGHT PRACTICE · STOP 2/7');
  assert.equal(pauseContextLine({difficulty:1,mapIndex:0,step:3,map:Array(10)}),'ASCENSION 1 · MAP 1/3 · STOP 4/10');
  assert.equal(pauseContextLine({difficulty:2,mapIndex:1,phase:'map-clear',map:Array(10),testMode:true}),'TEST · ASCENSION 2 · MAP 2/3 · REFUGE REACHED');
  assert.equal(typeof menus.pauseMenuMarkup,'function');assert.equal(menus.pauseMenuMarkup({}),pauseMenuMarkup({}));
});

test('level helpers', () => {
  assert.equal(clampLevel(9),4);assert.equal(clampLevel(-1),0);assert.equal(clampLevel('x'),0);
  assert.equal(levelGain(3),1,'default level keeps the original mix');
  assert.equal(levelGain(0),0);assert.ok(levelGain(4)>1&&levelGain(2)<1&&levelGain(1)<levelGain(2));
  assert.equal(levelForKey(2,'ArrowRight'),3);assert.equal(levelForKey(4,'ArrowUp'),4);assert.equal(levelForKey(0,'ArrowLeft'),0);
  assert.equal(levelForKey(2,'Home'),0);assert.equal(levelForKey(2,'End'),4);assert.equal(levelForKey(2,'a'),null);
  assert.equal(levelFromPointer(1,68),1);assert.equal(levelFromPointer(67,68),4);assert.equal(levelFromPointer(30,68),2);
});

test('level store remembers the last non-zero level and persists', () => {
  const storage=memory();
  const a=createLevelStore({storage,levelKey:'l',lastKey:'k'});
  assert.equal(a.level,DEFAULT_LEVEL);
  a.set(2);a.toggle();assert.equal(a.level,0);assert.equal(a.last,2);
  a.toggle();assert.equal(a.level,2);
  a.setEnabled(false);
  const b=createLevelStore({storage,levelKey:'l',lastKey:'k'});
  assert.equal(b.level,0);b.setEnabled(true);assert.equal(b.level,2);
});

test('FX level migrates the old mute flag and keeps it in step', () => {
  const storage=memory({'emberwing-muted':'true'});
  const fx=createFxLevel(storage);
  assert.equal(fx.level,0);
  fx.toggle();assert.equal(fx.level,3);assert.equal(storage.getItem('emberwing-muted'),'false');
  fx.set(0);assert.equal(storage.getItem('emberwing-muted'),'true');
  assert.equal(createFxLevel(memory()).level,3);
});

test('music levels: setEnabled stays compatible and the level scales gain', () => {
  const listeners={};const doc={hidden:false,addEventListener:(t,f)=>{listeners[t]=f},removeEventListener(){}};
  let tick;const players=[];
  class FakeAudio{constructor(){this.volume=0;this.paused=true;players.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}addEventListener(){}}
  const storage=memory({'wispbound-music-enabled':'false'});
  const music=createMusic({version:1,storage,document:doc,AudioClass:FakeAudio,schedule:f=>{tick=f;return 1},cancel(){}});
  assert.equal(music.level,0,'legacy off maps to level 0');assert.equal(music.enabled,false);
  music.setEnabled(true);assert.equal(music.level,3);assert.equal(storage.getItem('wispbound-music-enabled'),'true');
  for(let i=0;i<400;i++)tick();
  const full=players[0].volume;
  music.setLevel(1);for(let i=0;i<5;i++)tick();
  assert.ok(Math.abs(players[0].volume-full*levelGain(1))<1e-3,'level 1 scales the volume');
  assert.equal(storage.getItem('wispbound-music-level'),'1');
  music.setEnabled(false);assert.equal(music.level,0);assert.equal(storage.getItem('wispbound-music-enabled'),'false');
  music.setEnabled(true);assert.equal(music.level,1,'unmute restores the last level');
  music.destroy();
});
