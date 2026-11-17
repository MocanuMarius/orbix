import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chrome,until} from './browser-probe.mjs';

const base=process.env.DISPLAY_PROOF_BASE||'http://localhost:4173';
const browser=await chrome();
const results=[];
async function size(width,height,mobile=false){
 await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});
 await browser.send('Emulation.setTouchEmulationEnabled',{enabled:mobile});
}
async function inspect(label){
 await until(()=>browser.ev(`!!document.querySelector('#game-frame')?.contentDocument?.querySelector('#dk-root,.front-new-button,[data-action="new-game"],[data-action="play"]')`),label,200);
 await until(()=>browser.ev(`(()=>{const p=document.querySelector('#phone-window').getBoundingClientRect(),s=document.querySelector('#desktop-stage').getBoundingClientRect(),expected=Math.min(900,s.width-48,(s.height-48)*20/9);return p.width>0&&Math.abs(p.width-expected)<.1})()`),label+' fitted',50);
 const view=await browser.ev(`(()=>{
  const phone=document.querySelector('#phone-window'),stage=document.querySelector('#desktop-stage'),frame=document.querySelector('#game-frame'),p=phone.getBoundingClientRect(),s=stage.getBoundingClientRect();
  return {width:p.width,height:p.height,left:p.left-s.left,right:s.right-p.right,top:p.top-s.top,bottom:s.bottom-p.bottom,
   scale:phone.dataset.preferredScale,inner:[frame.contentWindow.innerWidth,frame.contentWindow.innerHeight],
   nested:!!frame.contentDocument.querySelector('#game-frame'),toolbar:document.querySelector('.display-caption').innerText,
   overflow:document.documentElement.scrollWidth>innerWidth};
 })()`);
 assert.ok(Math.abs(view.width/view.height-20/9)<.001,label+' has 20:9 viewport');
 assert.ok(view.width<=900.1,label+' default does not upscale');
 for(const edge of ['left','right','top','bottom'])assert.ok(view[edge]>=23.9,label+' '+edge+' gutter');
 assert.ok(Math.abs(view.left-view.right)<.1&&Math.abs(view.top-view.bottom)<.1,label+' centered');
 assert.deepEqual(view.inner,[900,405]);assert.equal(view.scale,'100');assert.equal(view.nested,false);assert.equal(view.overflow,false);
 assert.match(view.toolbar,/PIXEL 10/);
 results.push({label,...view});
}
try{
 await fs.mkdir('outputs/display-host',{recursive:true});
 await size(1440,900);
 await browser.visit(base+'/?display=desktop');await inspect('large desktop');
 await browser.shot('outputs/display-host/desktop-100.png');
 await size(430,860);await inspect('narrow desktop sidebar');
 await browser.shot('outputs/display-host/sidebar-100.png');
 await size(900,405);await inspect('small desktop landscape');
 await size(1440,900);
 await browser.visit(base+'/game.html?mock=cards&cards=1#display-proof');await inspect('direct game mock');
 assert.equal(await browser.ev('location.pathname'),'/index.html');assert.equal(await browser.ev('location.hash'),'#display-proof');
 assert.equal(await browser.ev("document.querySelector('#game-frame').contentWindow.location.search.includes('mock=cards')"),true);
 await browser.visit(base+'/loading.html');await until(()=>browser.ev("location.pathname==='/loading.html'"),'embedding fixture',50);
 await browser.ev(`document.body.innerHTML='<iframe id="embedded-host" style="width:620px;height:780px" src="/?display=desktop"></iframe>'`);
 await until(()=>browser.ev(`!!document.querySelector('#embedded-host')?.contentDocument?.querySelector('#game-frame')?.contentDocument?.querySelector('.front-new-button,[data-action="new-game"]')`),'embedded desktop host',200);
 assert.equal(await browser.ev(`document.querySelector('#embedded-host').contentDocument.querySelector('#game-frame').contentWindow.innerWidth`),900);
 results.push({label:'embedded desktop host',viewport:900});
 await browser.ev(`document.querySelector('#embedded-host').src='/game.html?mock=cards&cards=1'`);
 await until(()=>browser.ev(`!!document.querySelector('#embedded-host')?.contentDocument?.querySelector('#dk-root')`),'intentional game embedding',200);
 assert.equal(await browser.ev(`!!document.querySelector('#embedded-host').contentDocument.querySelector('#game-frame')`),false);
 results.push({label:'intentional engine embedding',nested:false});
 await browser.visit(base+'/game.html?display=native');
 await until(()=>browser.ev(`!!document.querySelector('.front-new-button,[data-action="new-game"]')`),'explicit native entry',200);
 assert.equal(await browser.ev("!!document.querySelector('#game-frame')"),false);
 await size(915,412,true);await browser.visit(base+'/');
 await until(()=>browser.ev(`location.pathname==='/game.html'&&!!document.querySelector('.front-new-button,[data-action="new-game"]')`),'native phone entry',200);
 assert.equal(await browser.ev("!!document.querySelector('#game-frame')"),false);
 results.push({label:'native touch phone',viewport:await browser.ev('[innerWidth,innerHeight]')});
 assert.deepEqual(browser.errors,[]);
 await fs.writeFile('outputs/display-host/proof.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({passed:results.length,results},null,2));
}finally{browser.close();}
