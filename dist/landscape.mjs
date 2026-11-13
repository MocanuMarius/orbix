export function installLandscapeMode({onPortrait=()=>{},onChange=()=>{}}={}){
 const query=window.matchMedia('(orientation: portrait)');
 const panel=document.createElement('section');panel.className='rotate-screen';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','rotate-title');
 panel.innerHTML='<svg viewBox="0 0 100 80" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3"><rect x="22" y="25" width="60" height="34" rx="5"/><path d="M28 29v26m47-26v26M18 49C1 28 22 5 46 11m-8-8 9 8-10 5"/></svg><h1 id="rotate-title">Turn toward the horizon</h1><p>Rotate your phone to play.<br>Both controls stay by your right thumb.</p><button class="primary" type="button" data-action="fullscreen">Enter fullscreen</button><small id="rotate-help">Landscape play</small>';
 document.body.appendChild(panel);
 const update=()=>{const upright=query.matches;panel.hidden=!upright;document.body.classList.toggle('portrait-gate',upright);if(upright){onPortrait();try{panel.showPopover?.()}catch{}}else{try{panel.hidePopover()}catch{}}onChange(upright)};
 // A manual popover stays above open skill dialogs when the phone rotates.
 panel.setAttribute('popover','manual');query.addEventListener('change',update);update();
 return {isPortrait:()=>query.matches,async fullscreen(){if(window.parent!==window&&new URLSearchParams(location.search).get('hosted')==='1'){window.parent.postMessage({type:'wisp-host-fullscreen'},location.origin);return;}const hint=panel.querySelector('#rotate-help');try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(window.screen?.orientation?.lock)await window.screen.orientation.lock('landscape');hint.textContent='Turn your phone sideways if needed.'}catch{hint.textContent='Turn your phone sideways to continue.'}update();},destroy(){query.removeEventListener('change',update);panel.remove()}};
}
