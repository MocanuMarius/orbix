// Live-resource tracker injected before page scripts (canvases, rAF, timers, audio).
export const TRACK=`(()=>{const T=window.__track={origin:new Map(),canvases:new Set(),offscreen:new Set(),raf:new Map(),intervals:new Set(),timeouts:new Set(),audio:0,rafSeq:0};
const W=typeof WeakRef!=='undefined';
const ce=Document.prototype.createElement;Document.prototype.createElement=function(n){const el=ce.apply(this,arguments);if(String(n).toLowerCase()==='canvas'&&W){const r=new WeakRef(el);T.canvases.add(r);T.origin.set(r,(new Error().stack||'').split(String.fromCharCode(10)).slice(2,4).join(' < '))}return el};
if(typeof OffscreenCanvas!=='undefined'){const O=OffscreenCanvas;window.OffscreenCanvas=function(w,h){const c=new O(w,h);if(W)T.offscreen.add(new WeakRef(c));return c};window.OffscreenCanvas.prototype=O.prototype;}
const raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window);
const stacks=new WeakMap();window.requestAnimationFrame=function(cb){let id;const stack=stacks.get(cb)||(()=>{const v=(new Error().stack||'').split('\\n').slice(2,4).map(s=>s.trim().replace(/\\?v=[^:]+/,'').replace(/^at /,'').replace(/https?:\\/\\/[^/]+\\//,'')).join(' < ');try{stacks.set(cb,v)}catch{}return v})();id=raf(t=>{T.raf.delete(id);cb(t)});T.raf.set(id,stack);return id};
window.cancelAnimationFrame=function(id){T.raf.delete(id);return caf(id)};
const si=window.setInterval,ci=window.clearInterval,st=window.setTimeout,ct=window.clearTimeout;
window.setInterval=function(f,ms,...a){const id=si(f,ms,...a);T.intervals.add(id);return id};window.clearInterval=function(id){T.intervals.delete(id);return ci(id)};
window.setTimeout=function(f,ms,...a){const id=st(function(){T.timeouts.delete(id);return typeof f==='function'?f.apply(this,arguments):undefined},ms,...a);T.timeouts.add(id);return id};window.clearTimeout=function(id){T.timeouts.delete(id);return ct(id)};
const AC=window.AudioContext;if(AC){const cn=AC.prototype.createGain,co=AC.prototype.createOscillator,cb=AC.prototype.createBufferSource;for(const k of ['createGain','createOscillator','createBufferSource','createBiquadFilter','createStereoPanner']){const f=AC.prototype[k];if(f)AC.prototype[k]=function(){T.audio++;return f.apply(this,arguments)}}}
T.snapshot=()=>{const byOrigin={};let live=0,px=0,attached=0,attachedPx=0,big=[];for(const r of T.canvases){const c=r.deref();if(!c){T.canvases.delete(r);T.origin.delete(r);continue}const p=c.width*c.height;if(p<=1)continue;live++;px+=p;{const k=T.origin.get(r)||'?';(byOrigin[k]||(byOrigin[k]=[0,0]));byOrigin[k][0]++;byOrigin[k][1]+=p;}if(c.isConnected){attached++;attachedPx+=p}if(p>=200000)big.push([c.width,c.height,c.isConnected?1:0,c.className||c.id||''])}
 let off=0,offPx=0;for(const r of T.offscreen){const c=r.deref();if(!c){T.offscreen.delete(r);continue}if(c.width*c.height>1){off++;offPx+=c.width*c.height}}
 const rafSources={};for(const s of T.raf.values())rafSources[s]=(rafSources[s]||0)+1;
 return {byOriginRaw:byOrigin,canvasesLive:live,canvasMPx:+(px/1e6).toFixed(2),canvasAttached:attached,canvasAttachedMPx:+(attachedPx/1e6).toFixed(2),offscreen:off,offscreenMPx:+(offPx/1e6).toFixed(2),bigCanvases:big.slice(0,12),rafPending:T.raf.size,rafSources,intervals:T.intervals.size,timeoutsPending:T.timeouts.size,audioNodesCreated:T.audio}};
})();`;
