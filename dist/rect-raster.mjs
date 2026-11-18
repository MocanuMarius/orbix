// Batched rectangle compositor for the flight frame. Art that paints many small fillRects with flat inks and
// alpha (pixel motes, wake marks, sprite bakes) records them here instead; flush() composites them in JS
// (source-over, in order, premultiplied float, analytic box coverage for fractional edges, like Canvas 2D's
// antialiased fillRect) and hands the result to the GPU as ONE putImageData (+ one drawImage onto the target).
// The GPU process then executes 2 operations instead of hundreds. Only fillStyle as #rgb/#rrggbb/rgb()/rgba(),
// globalAlpha and fillRect under an identity transform are supported; anything else marks the batch unusable
// and the caller's direct path is used (replay() reissues the recorded calls one by one on the real context).
const inks=new Map();
function parseInk(v){
  if(typeof v!=='string')return null;
  let k=inks.get(v);if(k!==undefined)return k;
  let m=/^#([0-9a-f]{6})$/i.exec(v);
  if(m){const n=parseInt(m[1],16);k=[(n>>16)/255,((n>>8)&255)/255,(n&255)/255,1];}
  else if((m=/^#([0-9a-f]{3})$/i.exec(v))){const s=m[1];k=[parseInt(s[0]+s[0],16)/255,parseInt(s[1]+s[1],16)/255,parseInt(s[2]+s[2],16)/255,1];}
  else if((m=/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v))){k=[Math.round(+m[1])/255,Math.round(+m[2])/255,Math.round(+m[3])/255,m[4]===undefined?1:Math.max(0,Math.min(1,+m[4]))];}
  else k=null;
  if(inks.size<512)inks.set(v,k);
  return k;
}
const MAX_AREA=160000;
export class RectBatch{
  constructor(doc){this.doc=doc;this.ops=[];this.n=0;this.ink=[0,0,0,1];this.inkText='#000000';this.alpha=1;this.ok=true;this.canvas=null;this.g=null;this.image=null;this.acc=null;}
  /** Starts a batch; the inherited globalAlpha and fillStyle of the real context are taken over. */
  begin(alpha=1,fill='#000000'){this.n=0;this.ok=true;this.alpha=alpha;this.fillStyle=fill;return this;}
  set fillStyle(v){const k=parseInk(v);if(k){this.ink=k;this.inkText=v;}else this.ok=false;}
  get fillStyle(){return this.inkText;}
  set globalAlpha(v){if(v>=0&&v<=1)this.alpha=v;}
  get globalAlpha(){return this.alpha;}
  fillRect(x,y,w,h){
    if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}
    if(!(w>0&&h>0)||!(this.alpha>0)||!Number.isFinite(x+y+w+h))return;
    const o=this.ops,i=this.n*10;this.n++;
    o[i]=x;o[i+1]=y;o[i+2]=w;o[i+3]=h;o[i+4]=this.ink[0];o[i+5]=this.ink[1];o[i+6]=this.ink[2];o[i+7]=this.alpha*this.ink[3];o[i+8]=this.inkText;o[i+9]=this.alpha;
  }
  bounds(){
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const o=this.ops;
    for(let i=0;i<this.n*10;i+=10){if(o[i]<x0)x0=o[i];if(o[i+1]<y0)y0=o[i+1];if(o[i]+o[i+2]>x1)x1=o[i]+o[i+2];if(o[i+1]+o[i+3]>y1)y1=o[i+1]+o[i+3];}
    return [Math.floor(x0),Math.floor(y0),Math.ceil(x1),Math.ceil(y1)];
  }
  /** Reissues the recorded calls on a real context (the exact old path). */
  replay(c){const o=this.ops;for(let i=0;i<this.n*10;i+=10){c.globalAlpha=o[i+9];c.fillStyle=o[i+8];c.fillRect(o[i],o[i+1],o[i+2],o[i+3]);}}
  composite(clipW=Infinity,clipH=Infinity){
    let [x0,y0,x1,y1]=this.bounds();
    x0=Math.max(x0,0);y0=Math.max(y0,0);x1=Math.min(x1,clipW);y1=Math.min(y1,clipH);
    const w=x1-x0,h=y1-y0;if(w<=0||h<=0)return null;if(w*h>MAX_AREA)return false;
    if(!this.canvas){this.canvas=this.doc.createElement('canvas');}
    if(this.canvas.width<w||this.canvas.height<h){this.canvas.width=Math.max(w,this.canvas.width);this.canvas.height=Math.max(h,this.canvas.height);this.g=null;}
    this.g??=this.canvas.getContext('2d');if(!this.g)return false;
    if(!this.image||this.image.width!==w||this.image.height!==h){this.image=this.g.createImageData(w,h);this.acc=new Float32Array(w*h*4);}else this.acc.fill(0);
    const acc=this.acc,o=this.ops;
    for(let i=0;i<this.n*10;i+=10){
      const rx=o[i]-x0,ry=o[i+1]-y0,rw=o[i+2],rh=o[i+3],a=o[i+7],r=o[i+4]*a,g=o[i+5]*a,b=o[i+6]*a;
      const cx0=Math.max(0,Math.floor(rx)),cx1=Math.min(w,Math.ceil(rx+rw)),cy0=Math.max(0,Math.floor(ry)),cy1=Math.min(h,Math.ceil(ry+rh));
      for(let yy=cy0;yy<cy1;yy++){
        const cy=Math.min(yy+1,ry+rh)-Math.max(yy,ry);if(cy<=0)continue;
        for(let xx=cx0;xx<cx1;xx++){
          const cov=cy*(Math.min(xx+1,rx+rw)-Math.max(xx,rx));if(cov<=0)continue;
          const k=(yy*w+xx)*4,keep=1-a*cov;
          acc[k]=r*cov+acc[k]*keep;acc[k+1]=g*cov+acc[k+1]*keep;acc[k+2]=b*cov+acc[k+2]*keep;acc[k+3]=a*cov+acc[k+3]*keep;
        }
      }
    }
    const d=this.image.data;
    for(let k=0;k<acc.length;k+=4){const A=acc[k+3];if(A<=0){d[k]=d[k+1]=d[k+2]=d[k+3]=0;continue;}d[k]=acc[k]/A*255+.5;d[k+1]=acc[k+1]/A*255+.5;d[k+2]=acc[k+2]/A*255+.5;d[k+3]=A*255+.5;}
    return {x0,y0,w,h};
  }
  /** Composites onto c (identity transform, source-over). Falls back to replay. Returns the operations saved. */
  flush(c){
    if(!this.n)return 0;
    const box=this.ok&&this.composite(c.canvas?.width??Infinity,c.canvas?.height??Infinity);
    if(box===null){this.n=0;return 0;}
    if(!box){this.replay(c);this.n=0;return 0;}
    this.g.putImageData(this.image,0,0);
    const ga=c.globalAlpha;c.globalAlpha=1;
    c.drawImage(this.canvas,0,0,box.w,box.h,box.x0,box.y0,box.w,box.h);
    c.globalAlpha=ga;
    const saved=this.n;this.n=0;return saved;
  }
  /** Writes the batch into a CLEARED sprite canvas context (putImageData replaces pixels). */
  bake(g){
    if(!this.n)return true;
    const box=this.ok&&this.composite(g.canvas.width,g.canvas.height);
    if(box===null){this.n=0;return true;}
    if(!box){this.replay(g);this.n=0;return false;}
    g.putImageData(this.image,box.x0,box.y0);this.n=0;return true;
  }
  release(){if(this.canvas)this.canvas.width=this.canvas.height=1;this.canvas=this.g=this.image=this.acc=null;this.ops=[];this.n=0;}
}
const shared=new WeakMap();
/** One batch per document and slot ('frame' for on-screen art, 'bake' for sprite bakes); each is flushed before it is begun again. */
export function rectBatch(doc,slot='frame'){if(!doc?.createElement)return null;let m=shared.get(doc);if(!m){m=new Map();shared.set(doc,m);}let b=m.get(slot);if(!b){b=new RectBatch(doc);m.set(slot,b);}return b;}
// On by default; ?batch=0 or globalThis.__perfFlags.batch=false keeps every rectangle a separate Canvas 2D call.
const BATCH_URL=(()=>{try{return new URLSearchParams(globalThis.location?.search||'').get('batch')!=='0';}catch{return true;}})();
export const batchOn=()=>{const f=globalThis.__perfFlags;return f&&'batch' in f?f.batch!==false:BATCH_URL;};
// On-screen batches (a canvas written and drawn every frame) are OFF by default: ?rects=1 turns them on.
const RECTS_URL=(()=>{try{return new URLSearchParams(globalThis.location?.search||'').get('rects')==='1';}catch{return false;}})();
export const rectsOn=()=>{const f=globalThis.__perfFlags;if(f&&'batch' in f&&f.batch===false)return false;return f&&'rects' in f?f.rects!==false:RECTS_URL;};
/** True when c draws in plain buffer pixels (identity transform), the only case a batch may composite. */
export function identityTransform(c){const m=c.getTransform?.();return !!m&&m.a===1&&m.b===0&&m.c===0&&m.d===1&&m.e===0&&m.f===0;}
// Polygon emission with the same filled/clipped area inside the view and fewer vertices (same switch as the batches):
// consecutive duplicate and collinear pixel vertices are dropped, and vertices more than `pad` pixels left or right
// of the view are pulled onto x=-pad / x=width+pad (edges there never cross a vertical line through the view, so
// the nonzero winding of every pixel in the view is unchanged). Points are whole pixels.
export class PolygonPath{
  constructor(){this.xs=new Int32Array(256);this.ys=new Int32Array(256);this.n=0;}
  begin(){this.n=0;return this;}
  add(x,y){if(this.n===this.xs.length){const nx=new Int32Array(this.n*2),ny=new Int32Array(this.n*2);nx.set(this.xs);ny.set(this.ys);this.xs=nx;this.ys=ny;}this.xs[this.n]=x;this.ys[this.n]=y;this.n++;}
  /** Emits one closed contour (moveTo/lineTo.../closePath) on c. Returns the number of vertices emitted. */
  emit(c,left,right){
    const n=this.n,xs=this.xs,ys=this.ys;if(!n)return 0;
    if(!batchOn()){c.moveTo(xs[0],ys[0]);for(let i=1;i<n;i++)c.lineTo(xs[i],ys[i]);c.closePath();return n;}
    // Clamp only vertices whose both neighbours are on the same far side too (their edges stay outside the band).
    const side=i=>xs[i]<left?-1:xs[i]>right?1:0;
    const ox=this.ox??=[],oy=this.oy??=[];ox.length=oy.length=0;
    for(let i=0;i<n;i++){
      let x=xs[i];const s=side(i);
      if(s&&side((i+n-1)%n)===s&&side((i+1)%n)===s)x=s<0?left:right;
      const k=ox.length;
      if(k&&ox[k-1]===x&&oy[k-1]===ys[i])continue;
      if(k>=2){const ax=ox[k-2],ay=oy[k-2],bx=ox[k-1],by=oy[k-1];
        if((bx-ax)*(ys[i]-ay)-(by-ay)*(x-ax)===0&&(bx-ax)*(x-bx)+(by-ay)*(ys[i]-by)>=0){ox[k-1]=x;oy[k-1]=ys[i];continue;}}
      ox.push(x);oy.push(ys[i]);
    }
    c.moveTo(ox[0],oy[0]);for(let i=1;i<ox.length;i++)c.lineTo(ox[i],oy[i]);c.closePath();
    return ox.length;
  }
}
