const variants=Object.freeze({
 waystone:{title:'Moss clearing',description:'Reward beside the challenge, with quiet moss and ochre ink.'},
 rootwood:{title:'Woodland path',description:'A centered destination, clear reward above, and the challenge below. Compact screens keep both groups side by side.'},
 'night-atlas':{title:'Night crossing',description:'Challenge first on the left, reward on the right, in quiet twilight colors.'},
});
const query=new URLSearchParams(location.search),frame=document.querySelector('#guide-frame'),stage=document.querySelector('.guide-stage'),size=document.querySelector('#guide-size');
let selected=Object.hasOwn(variants,query.get('art'))?query.get('art'):'waystone';
if(query.get('size')==='short')size.value='short';
function fit(){
 const short=size.value==='short',targetWidth=short?667:900,targetHeight=short?300:405;
 const width=Math.min(targetWidth,stage.clientWidth),height=Math.max(300,Math.round(width*targetHeight/targetWidth));
 frame.style.width=`${width}px`;frame.style.height=`${height}px`;
}
function update(){
 const variant=variants[selected],params=new URLSearchParams({family:'route',state:'wayfinder',guideArt:selected,v:'inscribe-2'});
 document.querySelectorAll('[data-guide]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.guide===selected)));
 document.querySelector('#guide-title').textContent=variant.title;document.querySelector('#guide-description').textContent=variant.description;
 frame.title=`${variant.title} · Thorn Steeple Travel Guide`;frame.src=`components-preview.html?${params}`;
 document.querySelector('#open-guide').href=frame.src;
 document.querySelector('#guide-status').textContent='Loading the guide…';
 history.replaceState(null,'',`?${new URLSearchParams({art:selected,size:size.value})}`);fit();
}
document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.guide;update();}));
document.querySelector('#reset-guide').addEventListener('click',update);
size.addEventListener('change',()=>{fit();history.replaceState(null,'',`?${new URLSearchParams({art:selected,size:size.value})}`);});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 if(event.data?.type==='ui-sample-status')document.querySelector('#guide-status').textContent=event.data.message;
 if(event.data?.type==='ui-sample-navigate')document.querySelector('#guide-status').textContent='Flight sample reached. Reopen guide to compare another frame.';
});
new ResizeObserver(fit).observe(stage);update();
document.documentElement.dataset.guideCompareReady='true';
