import {scorecardFromHash,scorecardDataURL,scorecardPNG,downloadScorecard,shareScorecard} from './scorecard.mjs?v=twin-wick-1';
const root=document.querySelector('#scorecard-view');
function renderScorecard(){
const score=scorecardFromHash(location.hash);
if(!score){root.innerHTML='<h1>Scorecard unavailable</h1><p>This link is incomplete or invalid.</p><a href="./index.html">Play Wispbound</a>';}
else{
 root.innerHTML='<h1>Wispbound scorecard</h1><img id="shared-score-image" width="1440" height="810"><nav><button type="button" id="share-score">Share image</button><button type="button" id="save-score">Save PNG</button><button type="button" id="copy-score">Copy link</button><a href="./index.html">Play Wispbound</a></nav><p id="score-status" role="status" aria-live="polite"></p><p>A shared snapshot. Viewing this card does not change your Game or personal bests. Personal bests shown belong to the producing device.</p>';
 const img=document.querySelector('#shared-score-image');img.src=scorecardDataURL(score);img.alt=`${score.outcome==='won'?'Victory':'Game over'}. Ascension ${score.ascension}. ${score.earned} Stored Sparks earned. Version ${score.version}.`;
 document.title=`${score.earned} Stored Sparks · Wispbound`;
 const status=document.querySelector('#score-status');
 document.querySelector('#save-score').onclick=async()=>{try{downloadScorecard(await scorecardPNG(score),score);status.textContent='PNG saved.';}catch{status.textContent='Could not create the PNG. Please try again.';}};
 document.querySelector('#share-score').onclick=async()=>{try{const result=await shareScorecard(score);status.textContent=result==='downloaded'?'PNG downloaded. Share the saved image from your device.':result==='shared'?'Scorecard shared.':'';}catch{status.textContent='Could not share the image. Try Save PNG.';}};
 document.querySelector('#copy-score').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);status.textContent='Scorecard link copied.';}catch{status.textContent='Copy this scorecard link:';const input=document.createElement('input');input.readOnly=true;input.value=location.href;status.append(input);input.select();}};
}
}
renderScorecard();
window.addEventListener('hashchange',renderScorecard);
