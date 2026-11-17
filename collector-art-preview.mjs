import {companionArtSvg} from './companion-art.mjs?v=strip-2';
const variants=['current','flat2','flat3'],videos=[...document.querySelectorAll('#movies video,.detail-stage video')];
const pauseButton=document.querySelector('#play-pause');
const names={current:'Previous · Shaded',flat2:'Current · Flat A',flat3:'B · Soft edge'};
const descriptions={current:'The previous four-tone shaded orb, retained for comparison.',flat2:'The game default: a single mint face with a dark, stepped contour.',flat3:'A flat mint face with a softer, three-ink contour.'};
const moments={front:{time:5/30,note:'Larger in front · 0.20 s. The mint face stays flat.'},back:{time:20/30,note:'Smaller behind · 0.70 s. The orbit supplies the depth.'},fetch:{time:40/30,note:'Approaching an authored Spark’s green circle · 1.37 s. Its intact shell is towed back.'}};
let selected='flat2',paused=false,moment='front',desiredTime=0;
const current=()=>document.querySelector('#movie-'+selected),detail=()=>document.querySelector('#detail-'+selected);
for(const holder of document.querySelectorAll('[data-portrait]'))holder.innerHTML=companionArtSvg('collector',{collectorArt:holder.dataset.portrait});
function seek(video,time){if(video.readyState<1)return;try{video.currentTime=Math.max(0,Math.min(time,video.duration-.02));}catch{}}
function playing(){for(const video of videos){video.muted=true;if(paused||document.hidden||video!==current()&&video!==detail())video.pause();else video.play()?.catch(()=>{pauseButton.textContent='Play motion';});}}
function markPause(){pauseButton.textContent=paused?'Play motion':'Pause motion';pauseButton.setAttribute('aria-pressed',String(paused));}
function stillLink(){document.querySelector('#full-still').href='./assets/previews/collector-art/'+selected+'-'+moment+'.png';}
function select(art){const at=current().currentTime||desiredTime;selected=art;desiredTime=at;
 for(const key of variants){for(const prefix of ['movie-','detail-'])document.querySelector('#'+prefix+key).classList.toggle('hidden',key!==art);}
 for(const button of document.querySelectorAll('[data-art]'))button.setAttribute('aria-pressed',String(button.dataset.art===art));
 document.querySelector('#art-name').textContent=names[art];document.querySelector('#art-description').textContent=descriptions[art];
 seek(current(),at);seek(detail(),at);stillLink();playing();
}
for(const button of document.querySelectorAll('[data-art]'))button.addEventListener('click',()=>select(button.dataset.art));
for(const button of document.querySelectorAll('[data-moment]'))button.addEventListener('click',()=>{
 moment=button.dataset.moment;desiredTime=moments[moment].time;paused=true;markPause();
 for(const key of variants){const image=document.querySelector('#still-'+key);image.src='./assets/previews/collector-art/'+key+'-'+moment+'-native.png';image.alt=names[key]+' Collector, '+moment+', at native game screenshot size';}
 for(const item of document.querySelectorAll('[data-moment]'))item.setAttribute('aria-pressed',String(item===button));
 document.querySelector('#moment-note').textContent=moments[moment].note;stillLink();for(const video of videos){video.pause();seek(video,desiredTime);}
});
pauseButton.addEventListener('click',()=>{paused=!paused;markPause();seek(detail(),current().currentTime||desiredTime);playing();});
document.querySelector('#restart').addEventListener('click',()=>{desiredTime=0;for(const video of videos)seek(video,0);paused=false;markPause();playing();});
document.querySelector('#fullscreen').addEventListener('click',()=>{const movie=current();if(movie.webkitEnterFullscreen)movie.webkitEnterFullscreen();else movie.requestFullscreen?.().catch(()=>{});});
for(const video of videos){video.addEventListener('loadedmetadata',()=>{seek(video,desiredTime);playing();},{once:true});video.addEventListener('error',()=>{document.querySelector('#status').textContent='The recording could not load. The native game stills and play links remain available.';});}
for(const key of variants)document.querySelector('#movie-'+key).addEventListener('timeupdate',()=>{if(selected!==key)return;desiredTime=current().currentTime;if(Math.abs(detail().currentTime-desiredTime)>.12)seek(detail(),desiredTime);});
document.addEventListener('visibilitychange',playing);window.addEventListener('pagehide',()=>videos.forEach(video=>video.pause()),{once:true});
playing();

const tow=document.querySelector('#tow-movie');
if(location.hash==='#tow')tow?.play()?.catch(()=>{});
window.addEventListener('hashchange',()=>{if(location.hash==='#tow')tow?.play()?.catch(()=>{});});
