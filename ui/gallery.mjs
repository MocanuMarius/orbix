import {COMPONENT_SAMPLES,resolveSample} from './gallery-catalog.mjs?v=clear-2';
const form=document.querySelector('#gallery-controls'),familySelect=form.elements.family,stateSelect=form.elements.state;
const frame=document.querySelector('#component-frame'),stage=document.querySelector('.gallery-workspace'),size=document.querySelector('#preview-size');
const status=document.querySelector('#gallery-status'),direct=document.querySelector('#direct-preview'),query=new URLSearchParams(location.search);
const viewports={reference:[900,405],wide:[915,412],compact:[740,360],short:[640,320],low:[667,300]};
for(const [value,spec] of Object.entries(COMPONENT_SAMPLES))familySelect.add(new Option(spec.label,value));
let sample=resolveSample(query.get('family'),query.get('state'));
familySelect.value=sample.family;
form.elements.viewport.value=Object.hasOwn(viewports,query.get('viewport'))?query.get('viewport'):'reference';
form.elements.scale.value=['100','125','150'].includes(query.get('scale'))?query.get('scale'):'fit';
function states(){
  stateSelect.replaceChildren(...Object.entries(sample.spec.states).map(([value,label])=>new Option(label,value)));
  stateSelect.value=sample.state;
}
function fit(){
  const [width,height]=viewports[form.elements.viewport.value];
  const scale=form.elements.scale.value==='fit'?Math.max(.1,Math.min((stage.clientWidth-24)/width,(stage.clientHeight-24)/height)):Number(form.elements.scale.value)/100;
  frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.transform=`scale(${scale})`;
  size.style.width=`${Math.ceil(width*scale)}px`;size.style.height=`${Math.ceil(height*scale)}px`;
  frame.dataset.previewScale=String(Math.round(scale*100));
}
function update({reload=true}={}){
  sample=resolveSample(familySelect.value,stateSelect.value);
  const params=new URLSearchParams({family:sample.family,state:sample.state});
  const preview=new URL(`../components-preview.html?${params}`,import.meta.url);
  direct.href=preview.href;
  const share=new URL(location.href);share.search=new URLSearchParams({...Object.fromEntries(params),viewport:form.elements.viewport.value,scale:form.elements.scale.value});
  history.replaceState(null,'',share);
  document.querySelector('#component-description').textContent=sample.spec.description;
  frame.title=`${sample.spec.label} · ${sample.spec.states[sample.state]}`;
  if(reload){status.textContent='Loading sample…';frame.src=preview.href;}
  fit();
}
states();update();
form.addEventListener('submit',event=>event.preventDefault());
familySelect.addEventListener('change',()=>{sample=resolveSample(familySelect.value);states();update();});
stateSelect.addEventListener('change',()=>update());
form.elements.viewport.addEventListener('change',()=>update({reload:false}));
form.elements.scale.addEventListener('change',()=>update({reload:false}));
document.querySelector('#reset-sample').addEventListener('click',()=>{status.textContent='Resetting sample…';frame.contentWindow.location.reload();});
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='ui-sample-status')status.textContent=event.data.message;
  if(event.data?.type==='ui-sample-navigate'){
    sample=resolveSample(event.data.family,event.data.state);familySelect.value=sample.family;states();update();
  }
});
new ResizeObserver(fit).observe(stage);
