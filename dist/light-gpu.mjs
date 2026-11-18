// WebGL2 light/darkness compositor for the pixel flight view (owner-approved GPU lighting, 18 November 2026).
//
// It produces the same fog layer the Canvas 2D path builds in WispFlightView.lightFog (black, alpha = darkness)
// and hands it back as a canvas, which the 2D renderer composites exactly where it drew its own fog canvas.
// What moves to the GPU: the 128x128 light masks (polar sampling of 96 rays from the four lattice corners and the
// 12 Hz geometry ticks, blended by weight) and the whole fog composite (terrain lights, Flare prism lights, Pulse
// reveal bands, the solid-rock re-darkening). What stays on the CPU: the rock geometry, the ray/rock span lists of a
// lattice cell (computed once per cell and cached, uploaded as a float texture), and every other draw.
// The rock law, the lit radius, the "no light through terrain" rule and the mask resolution are unchanged; the
// differences to the 2D path are rounding (one 8-bit step instead of three) and anti-aliased band edges.
//
// Fallback: create() returns null when WebGL2 or float textures are missing, when the browser reports a software
// GL ("major performance caveat"), or with ?gl=0. A lost context makes render() return null; the caller then draws
// with Canvas 2D for that frame, and the GPU path resumes after webglcontextrestored. No dependencies.
import {LIGHT_EXTENT} from './light-attenuation.mjs?v=guide-clarity-1';
import {luminanceWaveFade,REVEAL_BANDS} from './luminance-waves.mjs?v=guide-clarity-1';

export const LIGHT_GPU_DEFAULT=true;
export const LIGHT_GPU_LIMITS=Object.freeze({lights:8,cells:8,rays:96,spans:16,slotCols:16,slotRows:8,mask:128,waves:48,flashes:8,chunks:6,chunkLayers:8});
const L=LIGHT_GPU_LIMITS,SPAN_TEXELS=L.spans/2,EMPTY=1e9;

/** On by default (verified on the Pixel 10 emulator, 18 Nov 2026); ?gl=0 forces the Canvas 2D path. */
export function lightGpuWanted(location=globalThis.location){
  if(typeof globalThis.__orbixLightGpu==='boolean')return globalThis.__orbixLightGpu; // test hook (scripts/perf/gl-diff.mjs)
  try{const v=new URLSearchParams(location?.search||'').get('gl');return v==='1'||v==='on'||(LIGHT_GPU_DEFAULT&&!(v==='0'||v==='off'));}catch{return false;}
}

/** OffscreenCanvas hand-over for the fog frame; off by default, ?glbitmap=1 turns it on. */
export function glBitmapWanted(location=globalThis.location){
  if(typeof globalThis.__orbixLightBitmap==='boolean')return globalThis.__orbixLightBitmap;
  try{return new URLSearchParams(location?.search||'').get('glbitmap')==='1';}catch{return false;}
}

const VERT=`#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const MASK_FRAG=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
uniform sampler2D u_spans;uniform int u_count;uniform ivec2 u_slot[${L.cells}];uniform float u_weight[${L.cells}];
uniform float u_reach,u_radius,u_k;
out vec4 o;
const float TAU=6.283185307179586;const float CUT=1./(1.+2.2*${LIGHT_EXTENT}.*${LIGHT_EXTENT}.);
float solidAt(ivec2 base,int ray,float d){
  float s=0.;
  for(int i=0;i<${SPAN_TEXELS};i++){
    vec4 t=texelFetch(u_spans,ivec2(base.x+i,base.y+ray),0);
    if(t.x>=d)break;s+=max(0.,min(d,t.y)-t.x);
    if(t.z>=d)break;s+=max(0.,min(d,t.w)-t.z);
  }
  return s;
}
float att(float e){float d2=(e/u_radius)*(e/u_radius);return d2>=${LIGHT_EXTENT*LIGHT_EXTENT}.?0.:(1./(1.+2.2*d2)-CUT)/(1.-CUT);}
void main(){
  float dx=(gl_FragCoord.x-${L.mask/2}.)/${L.mask/2}.,dy=(gl_FragCoord.y-${L.mask/2}.)/${L.mask/2}.;
  float r=sqrt(dx*dx+dy*dy);
  if(r>=1.){o=vec4(0.);return;}
  float ang=mod(atan(dy,dx)+TAU,TAU)*${L.rays}./TAU;int a=int(floor(ang));if(a>=${L.rays})a=0;float mx=ang-floor(ang);int b=a+1==${L.rays}?0:a+1;
  float d=r*u_reach,clear=att(d),acc=0.;
  for(int c=0;c<${L.cells};c++){
    if(c>=u_count)break;
    if(u_slot[c].x<0){acc+=u_weight[c]*clear;continue;}
    float sa=solidAt(u_slot[c],a,d),sb=solidAt(u_slot[c],b,d);
    acc+=u_weight[c]*att(d+u_k*max(0.,sa+(sb-sa)*mx));
  }
  o=vec4(acc);
}`;

const FOG_FRAG=`#version 300 es
precision highp float;precision highp int;precision highp sampler2DArray;precision highp sampler2D;
uniform vec2 u_size;
uniform highp sampler2DArray u_masks;uniform int u_lights;uniform vec4 u_light[${L.lights}];uniform float u_lightAlpha[${L.lights}];
uniform int u_flashes;uniform vec4 u_flash[${L.flashes}];
uniform int u_waves;uniform vec4 u_wave[${L.waves}];uniform vec3 u_bandWidth;uniform vec3 u_bandAlpha;
uniform int u_shade;uniform sampler2D u_shadeTex;uniform float u_shadeAlpha;uniform highp sampler2DArray u_shadeChunks;uniform int u_camera,u_chunkW,u_chunkFirst,u_chunkCount;uniform int u_chunkLayer[${L.chunks}];uniform int u_wake;uniform sampler2D u_wakeTex;
out vec4 o;
const float CUT=1./(1.+2.2*${LIGHT_EXTENT}.*${LIGHT_EXTENT}.);
float att2(float d2){return d2>=${LIGHT_EXTENT*LIGHT_EXTENT}.?0.:(1./(1.+2.2*d2)-CUT)/(1.-CUT);}
void main(){
  vec2 p=vec2(gl_FragCoord.x,u_size.y-gl_FragCoord.y);
  float f=1.;
  for(int i=0;i<${L.flashes};i++){
    if(i>=u_flashes)break;
    vec4 q=u_flash[i];vec2 uv=(p-q.xy)/q.z;
    if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)continue;
    vec2 m=uv*2.-1.;f*=1.-q.w*att2(dot(m,m)*${LIGHT_EXTENT*LIGHT_EXTENT}.);
  }
  for(int i=0;i<${L.waves};i++){
    if(i>=u_waves)break;
    vec4 w=u_wave[i];float off=abs(distance(p,w.xy)-w.z);
    for(int k=0;k<3;k++){float cov=clamp(u_bandWidth[k]-off+.5,0.,1.);f*=1.-w.w*u_bandAlpha[k]*cov;}
  }
  if(u_wake==1)f*=texelFetch(u_wakeTex,ivec2(p),0).a;
  if(u_shade==1){float s=texelFetch(u_shadeTex,ivec2(p),0).a*u_shadeAlpha;f=s+f*(1.-s);}
  else if(u_shade==2){int gx=int(p.x)+u_camera,ci=int(floor(float(gx)/float(u_chunkW)))-u_chunkFirst;
    if(ci>=0&&ci<u_chunkCount){float s=texelFetch(u_shadeChunks,ivec3(gx-(ci+u_chunkFirst)*u_chunkW,int(p.y),u_chunkLayer[ci]),0).a*u_shadeAlpha;f=s+f*(1.-s);}}
  for(int i=0;i<${L.lights};i++){
    if(i>=u_lights)break;
    vec4 q=u_light[i];vec2 uv=(p-q.xy)/q.z;
    if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)continue;
    f*=1.-u_lightAlpha[i]*texture(u_masks,vec3(uv,float(i))).r;
  }
  o=vec4(0.,0.,0.,f);
}`;

export class LightFogGPU {
  static create(document,{wanted=lightGpuWanted(document?.defaultView?.location)}={}){
    if(!wanted||!document?.createElement)return null;
    try{const gpu=new LightFogGPU(document);return gpu.ready?gpu:(gpu.destroy(),null);}catch{return null;}
  }
  constructor(document){
    this.document=document;this.kind='webgl2';this.ready=false;this.lost=false;this.stats={frames:0,uploads:0,truncatedRays:0,fallbacks:0};
    // OffscreenCanvas + transferToImageBitmap hands the finished frame over instead of copying the drawing buffer
    // for the 2D composite. OFF by default (?glbitmap=1): the emulator A/B (18 Nov) showed no gain (-2.9..+4.0 FPS per round).
    const view=document.defaultView||globalThis;
    this.bitmap=typeof view.OffscreenCanvas==='function'&&typeof view.OffscreenCanvas.prototype.transferToImageBitmap==='function'&&glBitmapWanted(view.location);
    const canvas=this.canvas=this.bitmap?new view.OffscreenCanvas(1,1):document.createElement('canvas');canvas.width=canvas.height=1;
    this.onLost=event=>{event.preventDefault();this.lost=true;this.ready=false;};
    this.onRestored=()=>{this.lost=false;try{this.init();}catch{this.ready=false;}};
    canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestored);
    this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,failIfMajorPerformanceCaveat:true,powerPreference:'high-performance'});
    if(!this.gl)return;
    this.init();
    // Shim for light-field.mjs castFlightFlashLights: records Flare prism lights instead of drawing them.
    const gpu=this;this.recorder={globalAlpha:1,drawImage(image,x,y,w){gpu.flash(x,y,w,this.globalAlpha);}};
    this.lights=[];this.flashes=[];this.waveData=new Float32Array(L.waves*4);this.waveCount=0;this.shadeCanvas=null;this.shadeAlpha=0;
  }
  init(){
    const gl=this.gl;if(!gl||gl.isContextLost())return;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader');return s;};
    const program=frag=>{const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,frag));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'link');
      const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const name=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');u[name]=gl.getUniformLocation(p,name);}return {p,u};};
    this.maskProgram=program(MASK_FRAG);this.fogProgram=program(FOG_FRAG);
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    const tex=(target)=>{const t=gl.createTexture();gl.bindTexture(target,t);gl.texParameteri(target,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(target,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
    this.spanTex=tex(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA32F,L.slotCols*SPAN_TEXELS,L.slotRows*L.rays);
    this.maskTex=tex(gl.TEXTURE_2D_ARRAY);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA8,L.mask,L.mask,L.lights);
    this.shadeTex=tex(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
    this.wakeTex=tex(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
    this.fb=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,this.maskTex,0,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('mask framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    this.slots=new Map();this.slotUse=new Uint32Array(L.slotCols*L.slotRows);this.free=Array.from({length:L.slotCols*L.slotRows},(_,i)=>L.slotCols*L.slotRows-1-i);
    this.spanData=new Float32Array(SPAN_TEXELS*4*L.rays);this.frame=0;
    this.chunkTex=null;this.chunkKey='';this.chunkLayers=new Map();this.chunkStamp=new Uint32Array(L.chunkLayers);this.chunkLayerOf=new Int32Array(L.chunks);this.chunkList=null;
    // Warm-up: one tiny draw per program, so the driver finishes compiling now (flight setup) and not on the first lit frame.
    gl.bindVertexArray(this.vao);gl.viewport(0,0,1,1);
    gl.useProgram(this.maskProgram.p);gl.uniform1i(this.maskProgram.u.u_count,0);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.useProgram(this.fogProgram.p);gl.uniform1i(this.fogProgram.u.u_shade,0);{const u=this.fogProgram.u;gl.uniform1i(u.u_masks,1);gl.uniform1i(u.u_shadeTex,2);gl.uniform1i(u.u_wakeTex,3);gl.uniform1i(u.u_shadeChunks,4);}gl.drawArrays(gl.TRIANGLES,0,3);
    this.ready=!gl.isContextLost();
  }
  begin(width,height){
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    this.frame++;this.lights.length=0;this.flashes.length=0;this.waveCount=0;this.shadeCanvas=null;this.chunkList=null;this.wakeCanvas=null;this.recorder.globalAlpha=1;
  }
  flash(x,y,size,alpha){if(this.flashes.length<L.flashes&&alpha>0)this.flashes.push(x,y,size,alpha);}
  waves(manager,distance,scale){
    this.waveCount=0;this.bandScale=scale;
    if(!manager?.revealCount)return;
    for(const wave of manager.waves){
      if(this.waveCount>=L.waves)break;
      if(!wave.reveal||wave.radius<=0)continue;const fade=luminanceWaveFade(wave);if(fade<=0)continue;
      const o=this.waveCount++*4;this.waveData[o]=(wave.x-distance)*scale;this.waveData[o+1]=wave.y*scale;this.waveData[o+2]=wave.radius*scale;this.waveData[o+3]=fade;
    }
  }
  shade(canvas,alpha){this.shadeCanvas=canvas||null;this.chunkList=null;this.shadeAlpha=alpha;}
  /** Solid shade as baked course chunks ({index, canvas}), placed at chunk.index*chunkW-camera; each chunk is uploaded once. */
  shadeChunks(list,camera,chunkW,alpha){
    if(!list?.length||list.length>L.chunks)return false;
    this.shadeCanvas=null;this.chunkList=list;this.chunkCamera=camera;this.chunkW=chunkW;this.shadeAlpha=alpha;return true;
  }
  placeChunks(){
    const gl=this.gl,list=this.chunkList,w=this.chunkW,h=list[0].canvas.height,key=w+'x'+h;
    if(this.chunkKey!==key){
      if(this.chunkTex)gl.deleteTexture(this.chunkTex);
      const t=this.chunkTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);
      for(const [k,v] of [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST]])gl.texParameteri(gl.TEXTURE_2D_ARRAY,k,v);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA8,w,h,L.chunkLayers);this.chunkKey=key;this.chunkLayers.clear();this.chunkStamp.fill(0);
    }else gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.chunkTex);
    const stamp=this.frame;
    for(let i=0;i<list.length;i++){
      const chunk=list[i];let layer=this.chunkLayers.get(chunk);
      if(layer===undefined){
        // Least recently used layer not placed this frame; the chunk it held is forgotten.
        let age=Infinity;for(let l=0;l<L.chunkLayers;l++)if(this.chunkStamp[l]!==stamp&&this.chunkStamp[l]<age){age=this.chunkStamp[l];layer=l;}
        for(const [c,l] of this.chunkLayers)if(l===layer){this.chunkLayers.delete(c);break;}
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,w,h,1,gl.RGBA,gl.UNSIGNED_BYTE,chunk.canvas);this.chunkLayers.set(chunk,layer);this.stats.uploads++;
      }
      this.chunkStamp[layer]=stamp;this.chunkLayerOf[i]=layer;
    }
  }
  /** Lantern-shutter wake: a canvas whose alpha is the fraction of darkness kept (opaque = untouched). */
  wake(canvas){this.wakeCanvas=canvas||null;}
  slotFor(cell){
    let slot=this.slots.get(cell.key);
    if(slot===undefined){
      if(!this.free.length){
        // Evict the least recently used slot not needed this frame.
        let oldest=-1,age=Infinity;for(const [key,s] of this.slots)if(this.slotUse[s]!==this.frame&&this.slotUse[s]<age){age=this.slotUse[s];oldest=s;var drop=key;}
        if(oldest<0)return -2;this.slots.delete(drop);this.free.push(oldest);
      }
      slot=this.free.pop();this.slots.set(cell.key,slot);this.upload(slot,cell.paths);
    }
    this.slotUse[slot]=this.frame;return slot;
  }
  upload(slot,paths){
    const data=this.spanData,gl=this.gl;data.fill(EMPTY);
    for(let ray=0;ray<L.rays;ray++){
      const spans=paths[ray]||[],base=ray*SPAN_TEXELS*4;let n=spans.length;
      if(n>L.spans){this.stats.truncatedRays++;n=L.spans;}
      for(let i=0;i<n;i++){const span=i===L.spans-1&&spans.length>L.spans?[spans[i][0],spans.at(-1)[1]]:spans[i];data[base+i*2]=span[0];data[base+i*2+1]=span[1];}
    }
    gl.bindTexture(gl.TEXTURE_2D,this.spanTex);
    gl.texSubImage2D(gl.TEXTURE_2D,0,(slot%L.slotCols)*SPAN_TEXELS,Math.floor(slot/L.slotCols)*L.rays,SPAN_TEXELS,L.rays,gl.RGBA,gl.FLOAT,data);
    this.stats.uploads++;
  }
  /** One terrain light: rect in buffer pixels, alpha, mask radius/reach/rock factor and its weighted lattice cells ({cell:{key,paths}|null, weight}). */
  light(x0,y0,size,alpha,radius,reach,k,cells){
    if(!this.ready||this.lights.length>=L.lights||!(alpha>0))return false;
    const slots=new Int32Array(L.cells*2),weights=new Float32Array(L.cells);let count=0;
    for(const {cell,weight} of cells){
      if(count>=L.cells)break;
      let sx=-1,sy=-1;
      if(cell){const s=this.slotFor(cell);if(s<0)return false;sx=(s%L.slotCols)*SPAN_TEXELS;sy=Math.floor(s/L.slotCols)*L.rays;}
      slots[count*2]=sx;slots[count*2+1]=sy;weights[count]=weight;count++;
    }
    this.lights.push({x0,y0,size,alpha,radius,reach,k,count,slots,weights});return true;
  }
  /** Draws the fog; returns the canvas to composite, or null when the GPU path cannot draw this frame. */
  render(){
    const gl=this.gl;if(!this.ready||!gl||gl.isContextLost())return null;
    const W=this.canvas.width,H=this.canvas.height;
    gl.bindVertexArray(this.vao);
    if(this.lights.length){
      const {p,u}=this.maskProgram;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.viewport(0,0,L.mask,L.mask);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.spanTex);gl.uniform1i(u.u_spans,0);
      for(let i=0;i<this.lights.length;i++){
        const q=this.lights[i];
        gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,this.maskTex,0,i);
        gl.uniform1i(u.u_count,q.count);gl.uniform2iv(u.u_slot,q.slots);gl.uniform1fv(u.u_weight,q.weights);
        gl.uniform1f(u.u_reach,q.reach);gl.uniform1f(u.u_radius,q.radius);gl.uniform1f(u.u_k,q.k);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    const {p,u}=this.fogProgram;gl.useProgram(p);gl.viewport(0,0,W,H);
    gl.uniform2f(u.u_size,W,H);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.maskTex);gl.uniform1i(u.u_masks,1);
    const rect=new Float32Array(L.lights*4),alphas=new Float32Array(L.lights);
    this.lights.forEach((q,i)=>{rect.set([q.x0,q.y0,q.size,0],i*4);alphas[i]=q.alpha;});
    gl.uniform1i(u.u_lights,this.lights.length);gl.uniform4fv(u.u_light,rect);gl.uniform1fv(u.u_lightAlpha,alphas);
    const flash=new Float32Array(L.flashes*4);flash.set(this.flashes);gl.uniform1i(u.u_flashes,this.flashes.length/4);gl.uniform4fv(u.u_flash,flash);
    gl.uniform1i(u.u_waves,this.waveCount);gl.uniform4fv(u.u_wave,this.waveData);
    const s=this.bandScale||1;gl.uniform3f(u.u_bandWidth,REVEAL_BANDS[0][0]*s,REVEAL_BANDS[1][0]*s,REVEAL_BANDS[2][0]*s);gl.uniform3f(u.u_bandAlpha,REVEAL_BANDS[0][1],REVEAL_BANDS[1][1],REVEAL_BANDS[2][1]);
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.shadeTex);gl.uniform1i(u.u_shadeTex,2);
    gl.uniform1i(u.u_shadeChunks,4);
    if(this.shadeCanvas){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.shadeCanvas);gl.uniform1i(u.u_shade,1);gl.uniform1f(u.u_shadeAlpha,this.shadeAlpha);}
    else if(this.chunkList){
      gl.activeTexture(gl.TEXTURE4);this.placeChunks();gl.uniform1i(u.u_shadeChunks,4);gl.uniform1i(u.u_shade,2);gl.uniform1f(u.u_shadeAlpha,this.shadeAlpha);
      gl.uniform1i(u.u_camera,this.chunkCamera);gl.uniform1i(u.u_chunkW,this.chunkW);gl.uniform1i(u.u_chunkFirst,this.chunkList[0].index);gl.uniform1i(u.u_chunkCount,this.chunkList.length);gl.uniform1iv(u.u_chunkLayer,this.chunkLayerOf);
    }
    else gl.uniform1i(u.u_shade,0);
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.wakeTex);gl.uniform1i(u.u_wakeTex,3);
    if(this.wakeCanvas){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.wakeCanvas);gl.uniform1i(u.u_wake,1);}else gl.uniform1i(u.u_wake,0);
    gl.drawArrays(gl.TRIANGLES,0,3);
    this.stats.frames++;
    if(gl.isContextLost())return null;
    if(!this.bitmap)return this.canvas;
    this.frameBitmap?.close();return this.frameBitmap=this.canvas.transferToImageBitmap();
  }
  destroy(){
    this.ready=false;this.frameBitmap?.close();this.frameBitmap=null;
    this.canvas?.removeEventListener('webglcontextlost',this.onLost);this.canvas?.removeEventListener('webglcontextrestored',this.onRestored);
    try{this.gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
    if(this.canvas)this.canvas.width=this.canvas.height=1;this.gl=null;
  }
}
