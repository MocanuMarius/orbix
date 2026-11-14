import {GAME_VIEWPORT,DISPLAY_ZOOMS,DEFAULT_DISPLAY_ZOOM,normalizeDisplayZoom,displayMode,fitGameViewport,gameDocumentUrl} from './display-layout.mjs?v=proximity-balance-1';
const query=new URLSearchParams(location.search),storageKey='wispbound-display-zoom';
const mode=displayMode({requested:query.get('display'),embedded:window.parent!==window,
 coarse:matchMedia('(pointer: coarse)').matches,hover:matchMedia('(hover: hover)').matches,
 screenWidth:screen.width||innerWidth,screenHeight:screen.height||innerHeight});
if(mode==='native')location.replace(gameDocumentUrl(location.href).href);
else bootDesktop();
function bootDesktop(){
 document.body.className='desktop-host';
 let saved;try{saved=localStorage.getItem(storageKey);}catch{}
 let zoom=normalizeDisplayZoom(query.get('zoom')??saved??DEFAULT_DISPLAY_ZOOM),layout;

 const root=document.querySelector('#desktop-layout'),stage=document.querySelector('#desktop-stage'),phone=document.querySelector('#phone-window'),frame=document.querySelector('#game-frame'),select=document.querySelector('#display-zoom'),status=document.querySelector('#display-status');
 frame.style.width=`${GAME_VIEWPORT.width}px`;frame.style.height=`${GAME_VIEWPORT.height}px`;
 const targetUrl=gameDocumentUrl(location.href,{hosted:true}).href;if(frame.src!==targetUrl)frame.src=targetUrl;
 select.value=String(zoom);
 const pause=()=>frame.contentWindow?.postMessage({type:'wisp-host-pause'},location.origin);
 const fit=()=>{
  const bounds=stage.getBoundingClientRect(),inset=innerWidth<600?8:18;
  layout=fitGameViewport({width:Math.max(0,bounds.width-inset*2),height:Math.max(0,bounds.height-inset*2),zoom});
  phone.style.width=`${layout.width}px`;phone.style.height=`${layout.height}px`;
  frame.style.transform=`scale(${layout.scale})`;
  phone.dataset.effectiveScale=String(layout.effective);phone.dataset.preferredScale=String(zoom);
  select.title=`${zoom==='fit'?'Fit window':`${zoom}% preferred`}${layout.clamped?` · fits at ${layout.effective}%`:''}`;
 };
 const setZoom=value=>{
  pause();zoom=normalizeDisplayZoom(value);select.value=String(zoom);
  try{localStorage.setItem(storageKey,String(zoom));}catch{}
  const url=new URL(location.href);if(url.searchParams.has('zoom')){url.searchParams.set('zoom',String(zoom));history.replaceState(null,'',url);}
  fit();status.textContent=`Game scale ${layout.effective} percent${layout.clamped?`, ${zoom} percent preferred; fitted to this window`:''}`;frame.focus({preventScroll:true});
 };
 const step=direction=>{
  const current=zoom==='fit'?layout.effective:Number(zoom),values=direction>0?DISPLAY_ZOOMS:DISPLAY_ZOOMS.toReversed();
  setZoom(values.find(value=>direction>0?value>current:value<current)??(direction>0?200:75));
 };
 const fullscreen=async()=>{
  pause();try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{status.textContent='Fullscreen is unavailable. Display scaling is still available.';}fit();
 };
 select.addEventListener('change',()=>setZoom(select.value));
 document.querySelector('#display-smaller').addEventListener('click',()=>step(-1));
 document.querySelector('#display-larger').addEventListener('click',()=>step(1));
 document.querySelector('#display-fit').addEventListener('click',()=>setZoom('fit'));
 document.querySelector('#display-fullscreen').addEventListener('click',fullscreen);
 document.querySelector('.display-options').addEventListener('pointerdown',pause);
 document.querySelector('.display-options').addEventListener('focusin',pause);
 document.addEventListener('fullscreenchange',()=>{document.querySelector('#display-fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Fullscreen game');fit();});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='wisp-mock-mode'){
   const url=new URL(location.href);if(event.data.enabled)url.searchParams.set('mock','rest');else url.searchParams.delete('mock');history.replaceState(null,'',url);
  }else if(event.data?.type==='wisp-host-fullscreen')fullscreen();
 });
 new ResizeObserver(fit).observe(stage);fit();
}
