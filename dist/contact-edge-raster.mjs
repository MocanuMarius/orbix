// Contact art uses integer pixel rectangles. Rasterize those pixels directly,
// rather than queuing thousands of tiny Canvas2D paints for the compositor.
// The existing art code retains ownership of palette, flow and exact seams.
export class ContactEdgeRaster {
 constructor(document){
  this.document=document;this.canvas=document.createElement('canvas');this.context=this.canvas.getContext('2d',{willReadFrequently:true});
  this.maskCanvas=document.createElement('canvas');this.maskContext=this.maskCanvas.getContext('2d',{willReadFrequently:true});
  this.colors=new Map();this.width=0;this.height=0;
 }
 begin(width,height){
  if(width!==this.width||height!==this.height){
   this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
   this.image=this.context.createImageData(width,height);this.pixels=new Uint8ClampedArray(width*height*4);
   // Written column range per row (this frame, last frame): only those pixels are cleared, converted and uploaded.
   this.rowMin=new Int32Array(height).fill(width);this.rowMax=new Int32Array(height).fill(-1);
   this.lastMin=new Int32Array(height).fill(width);this.lastMax=new Int32Array(height).fill(-1);this.fresh=true;
  }else{
   const w=this.width,p=this.pixels;
   for(let y=0;y<this.height;y++){const a=this.rowMin[y],b=this.rowMax[y];if(b>=a)p.fill(0,(y*w+a)*4,(y*w+b+1)*4);}
   this.lastMin.set(this.rowMin);this.lastMax.set(this.rowMax);this.rowMin.fill(w);this.rowMax.fill(-1);
  }
  this.globalAlpha=1;this.fillStyle='#000000';this.clips=[];this.stack=[];this.paths=[];return this;
 }
 save(){this.stack.push({alpha:this.globalAlpha,ink:this.fillStyle,clips:this.clips});}
 restore(){const s=this.stack.pop();if(s){this.globalAlpha=s.alpha;this.fillStyle=s.ink;this.clips=s.clips;}}
 beginPath(){this.paths=[];this.path=null;}
 moveTo(x,y){this.path=[[x,y]];this.paths.push(this.path);}
 lineTo(x,y){if(!this.path)this.moveTo(x,y);else this.path.push([x,y]);}
 closePath(){}
 clip(rule='nonzero'){
  let left=this.width,top=this.height,right=0,bottom=0;
  for(const path of this.paths)for(const [x,y]of path){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  left=Math.max(0,Math.floor(left));top=Math.max(0,Math.floor(top));right=Math.min(this.width,Math.ceil(right));bottom=Math.min(this.height,Math.ceil(bottom));
  const width=Math.max(0,right-left),height=Math.max(0,bottom-top);
  if(!width||!height){this.clips=[...this.clips,{left,top,width:0,height:0}];return;}
  const c=this.maskContext;this.maskCanvas.width=width;this.maskCanvas.height=height;
  c.setTransform(1,0,0,1,-left,-top);c.fillStyle='#ffffff';c.beginPath();
  for(const path of this.paths){for(let i=0;i<path.length;i++)i?c.lineTo(...path[i]):c.moveTo(...path[i]);c.closePath();}
  c.fill(rule);const data=c.getImageData(0,0,width,height).data;
  this.clips=[...this.clips,{left,top,width,height,data}];
 }
 fillRect(x,y,width,height){
  const left=Math.max(0,Math.ceil(x)),top=Math.max(0,Math.ceil(y)),right=Math.min(this.width,Math.ceil(x+width)),bottom=Math.min(this.height,Math.ceil(y+height));
  if(left>=right||top>=bottom||!(this.globalAlpha>0))return;
  let rgb=this.colors.get(this.fillStyle);if(!rgb){
   const n=parseInt(this.fillStyle.slice(1),16);rgb=[n>>>16&255,n>>>8&255,n&255];this.colors.set(this.fillStyle,rgb);
   if(this.colors.size>128)this.colors.delete(this.colors.keys().next().value);
  }
  const pixels=this.pixels,alpha=Math.min(1,this.globalAlpha),[r,g,b]=rgb,clips=this.clips,nc=clips.length,W=this.width;
  for(let yy=top;yy<bottom;yy++){
   if(left<this.rowMin[yy])this.rowMin[yy]=left;if(right-1>this.rowMax[yy])this.rowMax[yy]=right-1;
   for(let xx=left;xx<right;xx++){
    let a=alpha;
    for(let k=0;k<nc;k++){const clip=clips[k],cx=xx-clip.left,cy=yy-clip.top;if(cx<0||cy<0||cx>=clip.width||cy>=clip.height){a=0;break;}a*=clip.data[(cy*clip.width+cx)*4+3]/255;}
    if(!a)continue;const i=(yy*W+xx)*4,inv=1-a;
    pixels[i]=r*a+pixels[i]*inv;pixels[i+1]=g*a+pixels[i+1]*inv;pixels[i+2]=b*a+pixels[i+2]*inv;pixels[i+3]=a*255+pixels[i+3]*inv;
   }
  }
 }
 composite(context){
  const source=this.pixels,out=this.image.data,W=this.width;
  let x0=W,x1=-1,y0=this.height,y1=-1;
  for(let y=0;y<this.height;y++){
   // This frame's pixels plus last frame's (now cleared) pixels; everything else is already zero in both.
   const a0=this.fresh?0:Math.min(this.rowMin[y],this.lastMin[y]),b0=this.fresh?W-1:Math.max(this.rowMax[y],this.lastMax[y]);if(b0<a0)continue;
   if(a0<x0)x0=a0;if(b0>x1)x1=b0;if(y<y0)y0=y;y1=y;
   for(let i=(y*W+a0)*4,end=(y*W+b0+1)*4;i<end;i+=4){const a=source[i+3];out[i+3]=a;if(a){const unpremultiply=255/a;out[i]=source[i]*unpremultiply;out[i+1]=source[i+1]*unpremultiply;out[i+2]=source[i+2]*unpremultiply;}else out[i]=out[i+1]=out[i+2]=0;}
  }
  if(this.fresh){this.context.putImageData(this.image,0,0);this.fresh=false;}
  else if(x1>=x0)this.context.putImageData(this.image,0,0,x0,y0,x1-x0+1,y1-y0+1);
  context.drawImage(this.canvas,0,0);
 }
 destroy(){this.canvas.width=this.canvas.height=this.maskCanvas.width=this.maskCanvas.height=1;this.image=null;this.pixels=null;this.colors.clear();}
}
