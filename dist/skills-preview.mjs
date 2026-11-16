import {newState,createRun,getSkillWallet,buyCheckpointSkill,chooseStartingSkill} from './model.mjs?v=cards-renewal-1';
import {skillBookMarkup} from './skill-book.mjs?v=cards-renewal-1';

const book=document.querySelector('#preview-book'),status=document.querySelector('#preview-status');
const storageLink=()=>new URLSearchParams(location.search).get('chapter')==='packing'||location.hash==='#packing';
const initialVariant=()=>location.hash==='#index'?'index':'map';
let variant=initialVariant(),chapter=variant==='index'?'available':storageLink()?'packing':'wisp',selected=null;
function seedBuild(){
 const sample=newState();
 const run=createRun(sample.profile,'skill-book-playtest',1);
 Object.assign(run,{mapIndex:1,condensedGlow:115,skills:{'main-sight':1,'collector-attunement':1,'main-dream':1},startingSkill:'main-dream'});
 if(storageLink())Object.assign(run,{condensedGlow:45,skills:{'main-efficiency':1,'main-afterglow':1,'afterglow-vessel':1}});
 sample.run=run;
 return sample;
}
let state=seedBuild();
function render(){
 const previousFocus=book.contains(document.activeElement)?document.activeElement.closest('[data-action]'):null;
 const action=previousFocus?.dataset.action,id=previousFocus?.dataset.id;
 const scroll=book.querySelector('.book-page-scroll');
 const previous=scroll?.scrollTop||0;
 book.innerHTML=skillBookMarkup({run:state.run,wallet:getSkillWallet(state),variant,chapter,selected,canBuy:true});
 book.querySelector('[data-action=close-sheet]')?.remove();
 const restored=book.querySelector('.book-page-scroll');
 if(restored&&selected)restored.scrollTop=previous;
 if(action){
  const buttons=[...book.querySelectorAll('[data-action]')];
  const next=buttons.find(b=>b.dataset.action===action&&b.dataset.id===id)||
    buttons.find(b=>b.dataset.action==='book-skill'&&b.dataset.id===id)||
    book.querySelector('.book-chapters [aria-pressed=true]');
  next?.focus({preventScroll:true});
 }
}
function switchVariant(id){
 variant=id==='index'?'index':'map';chapter=variant==='index'?'available':'wisp';selected=null;
 if(location.hash!=='#'+variant)history.replaceState(null,'','#'+variant);
 render();
}
document.querySelector('#reset-build').addEventListener('click',()=>{
 state=seedBuild();selected=null;render();status.textContent='Sample build restored.';
});
window.addEventListener('hashchange',()=>{
 variant=initialVariant();chapter=variant==='index'?'available':storageLink()?'packing':'wisp';selected=null;render();
});
book.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');
 if(!button||button.disabled)return;
 const {action,id}=button.dataset;
 switch(action){
  case 'book-variant':switchVariant(id);return;
  case 'book-chapter':chapter=id;selected=null;break;
  case 'book-skill':selected=id;if(button.dataset.chapter)chapter=button.dataset.chapter;break;
  case 'buy-skill':if(buyCheckpointSkill(state,id,Number(button.dataset.rank))){status.textContent='Learned in the sample build.';}break;
  case 'choose-start-skill':if(chooseStartingSkill(state,id)&&!button.closest('.book-inline-requirement'))selected=id;break;
  case 'close-sheet':selected=null;break;
  default:return;
 }
 render();
});
render();
