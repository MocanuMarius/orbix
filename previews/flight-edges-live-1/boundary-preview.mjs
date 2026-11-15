// The real app owns flight, rendering, HUD and input. This shell only selects a rim.
const frame=document.querySelector('#flight');
const biome=document.querySelector('#biome'),course=document.querySelector('#course');
const buttons=[...document.querySelectorAll('[data-style]')];
const reveal=document.querySelector('#reveal');let revealed=false;
function resetReveal(){revealed=false;reveal.setAttribute('aria-pressed','false');}
function scene(action){frame.contentWindow?.postMessage({type:'wisp-boundary-scene',action},location.origin);}
reveal.addEventListener('click',()=>{revealed=!revealed;reveal.setAttribute('aria-pressed',String(revealed));scene('relight');});
document.querySelector('#restart').addEventListener('click',()=>{resetReveal();scene('restart');});
const allowedStyles=new Set(['moon','living','danger']);
const allowedBiomes=new Set([...biome.options].map(option=>option.value));
const allowedCourses=new Set(['1','2','3','4']);
const query=new URLSearchParams(location.search);
let style=allowedStyles.has(query.get('edge'))?query.get('edge'):'moon';
if(allowedBiomes.has(query.get('biome')))biome.value=query.get('biome');
if(allowedCourses.has(query.get('course')))course.value=query.get('course');
function mark(){for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.style===style));}
function sendStyle(){frame.contentWindow?.postMessage({type:'wisp-boundary-style',style},location.origin);}
function persistURL(){const url=new URL(location.href);url.searchParams.set('edge',style);url.searchParams.set('biome',biome.value);url.searchParams.set('course',course.value);history.replaceState(null,'',url);}
function reloadFlight(){
 resetReveal();
 const url=new URL('./game.html',location.href);url.searchParams.set('mock','boundary');url.searchParams.set('edge',style);url.searchParams.set('biome',biome.value);url.searchParams.set('course',course.value);
 frame.src=url.href;persistURL();document.querySelector('#status').textContent='Loading '+biome.selectedOptions[0].textContent+', course '+course.value+'.';
}
for(const button of buttons)button.addEventListener('click',()=>{style=button.dataset.style;mark();sendStyle();persistURL();document.querySelector('#status').textContent=button.textContent+' selected. Same flight and camera.';});
biome.addEventListener('change',reloadFlight);course.addEventListener('change',reloadFlight);
frame.addEventListener('load',()=>{resetReveal();sendStyle();});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='wisp-boundary-ready')return;
 resetReveal();sendStyle();document.querySelector('#status').textContent='Actual flight ready. Change the rim without restarting.';
});
mark();
if(style!=='moon'||biome.value!=='pinewood'||course.value!=='3')reloadFlight();
