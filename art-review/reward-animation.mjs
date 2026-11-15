/** One action-driven sprite; no continuous work after the landing. */
export async function animateArtifactEquip({markup,from,target,reducedMotion=false,document=globalThis.document}={}){
 if(!target||!from||!document)return;
 target.classList.add('slot-arrival');
 if(reducedMotion)return;
 target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 const to=target.getBoundingClientRect(),sprite=document.createElement('div');
 sprite.className='artifact-equip-flight';sprite.setAttribute('aria-hidden','true');sprite.innerHTML=markup;
 Object.assign(sprite.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
 document.body.appendChild(sprite);
 try{
  const dx=to.left+(to.width-from.width)/2-from.left,dy=to.top+(to.height-from.height)/2-from.top;
  await sprite.animate([
   {transform:'translate(0,0) scale(1)',opacity:1},
   {transform:`translate(${dx*.42}px,${dy*.42-34}px) scale(.9)`,opacity:1,offset:.45},
   {transform:`translate(${dx}px,${dy}px) scale(${Math.min(to.width/from.width,to.height/from.height)*.83})`,opacity:1},
  ],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}).finished;
 }catch{/* Navigation can cancel presentation without changing the reward. */}
 finally{sprite.remove();}
}
