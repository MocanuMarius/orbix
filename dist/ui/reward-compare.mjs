const variants={pedestal:'Centered pedestal',horizontal:'Illustrated horizontal',compact:'Compact victory'};
const frame=document.querySelector('#reward-frame'),size=document.querySelector('#compare-size'),stage=document.querySelector('.compare-stage');
const query=new URLSearchParams(location.search);
let variant=Object.hasOwn(variants,query.get('variant'))?query.get('variant'):'pedestal';
function fit(){
 const desktop=innerWidth>=1100&&innerHeight>=600,width=desktop?915:stage.clientWidth,height=desktop?412:stage.clientHeight;
 const scale=desktop?Math.min(1.4,(stage.clientWidth-48)/width,(stage.clientHeight-48)/height):1;
 frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.transform=`scale(${scale})`;
 size.style.width=`${Math.round(width*scale)}px`;size.style.height=`${Math.round(height*scale)}px`;
}
function select(next){
 variant=next;
 document.querySelectorAll('[data-variant]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.variant===variant)));
 frame.title=`Dawn Loom acquired · ${variants[variant]}`;
 frame.src=`./components-preview.html?${new URLSearchParams({family:'rewards',state:variant})}`;
 document.querySelector('#gallery-link').href=`./components.html?${new URLSearchParams({family:'rewards',state:variant})}`;
 history.replaceState(null,'',`?${new URLSearchParams({variant})}`);
 document.querySelector('#compare-status').textContent=`${variants[variant]}. Preview only; your saved journey is unchanged.`;
}
document.querySelectorAll('[data-variant]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.variant)));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 if(event.data?.type==='ui-sample-navigate')frame.src=`./components-preview.html?${new URLSearchParams({family:event.data.family,state:event.data.state})}`;
 if(event.data?.type==='ui-sample-status')document.querySelector('#compare-status').textContent=event.data.message;
});
new ResizeObserver(fit).observe(stage);select(variant);fit();
