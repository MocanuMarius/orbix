import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chrome,until} from './browser-probe.mjs';

const base=process.env.ROUTE_PREVIEW_BASE||'http://localhost:4181';
const out='work/route-preview';await mkdir(out,{recursive:true});
const browser=await chrome(),checks=[];
try{
 await browser.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 await browser.visit(base+'/game.html?cards=1');await until(()=>browser.ev('!!document.querySelector("[data-action=new-game],[data-action=continue-run]")'),'home');
 for(const [label,width,height,desired] of [['spark-trail',900,405,'spark-trail'],['long-glide-small',740,333,'long-glide'],['constellation-small',740,333,'constellation'],['heartwood-small',740,333,'heartwood']]){
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  const fixture=await browser.ev(`(async()=>{
   const M=await import('./model.mjs'),{prepareRouteOffer}=await import('./route-offers.mjs');
   for(let seed=0;seed<32;seed++){
    const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;
    const r=s.run=M.createRun(s.profile,'route-current-'+seed,1,{cards:true});
    const gift=M.getStartingGiftOffers(r)[0];if(gift)M.chooseStartingGift(s,gift.id);
    for(const n of r.map.flat()){
     if(n.type==='support')continue;
     const b=prepareRouteOffer(r,n,{profile:s.profile,width:${width},height:${height}});
     if(!b||(${JSON.stringify(desired)}==='heartwood'?n.levelId!=='pinewood-fallen-giant':b.id!==${JSON.stringify(desired)}))continue;
     let saved;M.saveState(s,{setItem:(k,v)=>saved={key:'cards-pilot:'+k,value:v}});
     return{seed,node:n.id,name:n.name,bonus:b.id,bonusName:b.name,reward:b.reward,saved};
    }
   }throw Error('No actual route fixture for '+${JSON.stringify(desired)});
  })()`);
  const injection=await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem(${JSON.stringify(fixture.saved.key)},${JSON.stringify(fixture.saved.value)})`});
  delete fixture.saved;
  await browser.visit(base+'/game.html?cards=1');
  await until(()=>browser.ev('!!document.querySelector("[data-action=continue-run]")'),'continue');
  await browser.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
  await browser.ev('document.querySelector("[data-action=continue-run]").click()');
  await until(()=>browser.ev('!!document.querySelector("#journey-map .world-map-node")'),'route map');
  if(label==='spark-trail')await browser.shot(out+'/map-900x405.png');
  await browser.ev(`document.querySelector('[data-action="preview-node"][data-id="${fixture.node}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await until(()=>browser.ev('!!document.querySelector("dialog.flight-preview-sheet[open]")'),'preview');
  const layout=await browser.ev(`(()=>{const d=document.querySelector('dialog.flight-preview-sheet'),read=d.querySelector('.preview-reading'),foot=d.querySelector('footer');return{body:d.innerText,readingHeight:read.clientHeight,readingScroll:read.scrollHeight,footer:foot.getBoundingClientRect().toJSON(),dialog:d.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...foot.querySelectorAll('button')].map(b=>({text:b.innerText,height:b.getBoundingClientRect().height}))}})()`);
  assert.ok(!layout.overflow,label);assert.ok(layout.footer.bottom<=height,label);
  assert.ok(layout.buttons.every(b=>b.height>=44),label);
  assert.match(layout.body,/On clear/);assert.match(layout.body,/Optional challenge/);assert.match(layout.body,/Then clear/);
  if(desired==='heartwood')assert.match(layout.body,/\+3 maximum Sparks permanently/);
  await browser.shot(out+'/'+label+'-'+width+'x'+height+'.png');
  checks.push({label,fixture,layout});
  console.log(label,JSON.stringify({fixture,readingHeight:layout.readingHeight,readingScroll:layout.readingScroll,buttons:layout.buttons}));
 }
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.badResponses,[]);
 await writeFile(out+'/report.json',JSON.stringify(checks,null,2)+'\n');
 console.log(JSON.stringify(checks,null,2));
}finally{browser.close();}
