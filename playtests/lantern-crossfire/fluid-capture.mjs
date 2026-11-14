// All lengths use the caller's canvas coordinates. A single bounded workspace is
// reused for every capture, including overlapping captures in the same frame.
const TAU = Math.PI * 2;
const MAX_SEGMENTS = 96;
const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => t*t*(3-2*t);

export const FLUID_STYLES = Object.freeze({
  hybrid: {duration:1.88, turns:.99, delay:.46, taper:3.2, orbit:.81, fold:true, vapor:true},
  mist: {duration:1.80, turns:.58, delay:.36, taper:2.4, orbit:.29, fold:false, vapor:true},
  ribbon: {duration:2.05, turns:1.36, delay:.53, taper:3, orbit:.61, fold:false, vapor:false},
  undertow: {duration:1.88, turns:.99, delay:.46, taper:3.5, orbit:.81, fold:true, vapor:false}
});

function buffer() { return new Float32Array(MAX_SEGMENTS+1); }
function sheetBuffer() { return {x:buffer(), y:buffer(), nx:buffer(), ny:buffer(), w:buffer()}; }
const sheet = sheetBuffer(), fold = sheetBuffer();
const slicePhase = buffer(), sliceArc = buffer(), sliceWidth = buffer(), flow = buffer();
const bandCenter = buffer(), bandWidth = buffer();
const stamps = new WeakMap();

const pale = {
  stamp:['#e0f8eb','rgba(183,231,223,.73)','rgba(108,197,206,.25)','rgba(101,187,203,0)'],
  body:['#b4d1cb','#b1cfcb','#dcf1e5','#f9fbe6'],
  lane:'#f6ffe9', groove:'#477789', curl:'#c9e8e3', crest:'#f3fff1', fold:'#aadeed'
};
const dark = {
  stamp:['#f7cbd9','rgba(213,124,153,.62)','rgba(149,65,95,.26)','rgba(116,42,83,0)'],
  body:['#542d43','#875162','#b27688','#f4cad3'],
  lane:'#f0aabe', groove:'#482b49', curl:'#b77b9e', crest:'#ffe2e8', fold:'#ae7392'
};

function glowStamp(ctx, darkSpark) {
  const owner = ctx.canvas?.ownerDocument || globalThis.document;
  if (!owner?.createElement) return null;
  let set = stamps.get(owner);
  if (!set) { set = {}; stamps.set(owner,set); }
  const key = darkSpark ? 'dark' : 'light';
  if (set[key]) return set[key];
  const bitmap = owner.createElement('canvas');
  bitmap.width=bitmap.height=48;
  const pen=bitmap.getContext('2d'), stops=(darkSpark ? dark : pale).stamp;
  const gradient=pen.createRadialGradient(24,24,0,24,24,24);
  gradient.addColorStop(0,stops[0]);gradient.addColorStop(.28,stops[1]);
  gradient.addColorStop(.63,stops[2]);gradient.addColorStop(1,stops[3]);
  pen.fillStyle=gradient; pen.fillRect(0,0,48,48);
  set[key]=bitmap;
  return bitmap;
}

// The near face escapes first. Remaining slices start at their actual depth in
// the Spark; the leading end has already entered the wisp before the rear empties.
function makeSheet(radius, sourceRadius, bodyRadius, angle, spin, age, style, phase, quiet, count) {
  const {x,y,nx,ny,w} = sheet;
  const cx=Math.cos(angle), cy=Math.sin(angle), original=angle+Math.PI/2;
  const orbit = style.orbit*radius + bodyRadius*.68;
  for(let i=0;i<=count;i++) {
    const s=i/count;
    const delay=style.delay*(1-s)**1.12, arrival=.32+.68*(1-s)**.84;
    const lead=clamp((age-delay)/(arrival-delay));
    const advance=lead**.91*(.48+.52*lead);
    const swirl=style.fold ? .54*lead+.46*advance : advance;
    const actualAngle=angle+spin*TAU*style.turns*swirl*(quiet?.24:1);
    // A deep body intersection may put the front slices inside the wisp.
    // They vanish there instead of emerging behind it with a negative radius.
    const distance=Math.max(0,sourceRadius+radius*(1-2*s));
    const arc=Math.sin(Math.PI*lead);
    const gap=distance*(1-smooth(lead))+orbit*arc**1.15*(quiet?.45:1);
    const eddy=style===FLUID_STYLES.mist ?
      Math.sin(lead*8+s*8+phase*.2)*radius*(quiet?.07:.33)*arc : 0;
    x[i]=Math.cos(actualAngle)*gap-cy*eddy;
    y[i]=Math.sin(actualAngle)*gap+cx*eddy;
    const pinch=style.vapor ? (style.fold?3.2:2.2) : 9;
    const chord=2*radius*Math.sqrt(s*(1-s));
    const folds=Math.sin(s*33+phase+age*11)*.043+Math.sin(s*63-phase-age*7)*.018;
    w[i]=chord*(1-lead)**style.taper/(1+pinch*lead)
      *(1+(quiet?.22:1)*(style.vapor?1:.5)*folds);
    slicePhase[i]=s; sliceArc[i]=arc; sliceWidth[i]=Math.sin(Math.PI*s)**.64; flow[i]=lead;
  }
  for(let i=0;i<=count;i++) {
    const prev=Math.max(0,i-2), next=Math.min(count,i+2);
    const dx=x[next]-x[prev], dy=y[next]-y[prev];
    const tangent=Math.atan2(-dx,dy), turn=smooth(clamp(flow[i]*4));
    const rotation=Math.atan2(Math.sin(tangent-original),Math.cos(tangent-original));
    nx[i]=Math.cos(original+turn*rotation); ny[i]=Math.sin(original+turn*rotation);
  }
}

function strip(ctx,data,count,center,halfWidth,color) {
  const {x,y,nx,ny,w}=data;
  ctx.fillStyle=color; ctx.beginPath();
  for(let i=0;i<=count;i++) {
    const span=(center===null ? bandCenter[i]+bandWidth[i] : center+halfWidth)*w[i];
    const px=x[i]+nx[i]*span, py=y[i]+ny[i]*span;
    if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  for(let i=count;i>=0;i--) {
    const span=(center===null ? bandCenter[i]-bandWidth[i] : center-halfWidth)*w[i];
    ctx.lineTo(x[i]+nx[i]*span,y[i]+ny[i]*span);
  }
  ctx.closePath(); ctx.fill();
}

function drawBackfold(ctx,count,spin,style,ink,alpha,quiet) {
  for(let i=0;i<=count;i++) {
    const bend=sliceArc[i], off=-spin*bend*(quiet?.55:1.62);
    const cs=Math.cos(off),sn=Math.sin(off), pinch=1-.25*bend;
    fold.x[i]=(cs*sheet.x[i]-sn*sheet.y[i])*pinch;
    fold.y[i]=(sn*sheet.x[i]+cs*sheet.y[i])*pinch;
    fold.nx[i]=cs*sheet.nx[i]-sn*sheet.ny[i];
    fold.ny[i]=sn*sheet.nx[i]+cs*sheet.ny[i];
    fold.w[i]=sheet.w[i]*(.18+bend*(style.vapor?.65:.38));
  }
  ctx.globalAlpha=alpha*(style.vapor?.26:.34);
  strip(ctx,fold,count,0,1,ink.fold);
  ctx.globalAlpha=alpha*(style.vapor?.38:.59);
  strip(ctx,fold,count,.34,.085,ink.crest);
}

function emitGlow(ctx,count,age,radius,style,texture,alpha,phase) {
  if(!texture)return;
  ctx.save();
  ctx.globalCompositeOperation='screen';ctx.imageSmoothingEnabled=true;
  const step=count<=32?4:3;
  for(let i=1;i<count;i+=step){
    const w=sheet.w[i];
    if(w<.22)continue;
    const prev=Math.max(0,i-step);
    const ds=Math.hypot(sheet.x[i]-sheet.x[prev],sheet.y[i]-sheet.y[prev]);
    const cross=w*(style.vapor?2.25:1.64)+.4;
    const along=Math.max(Math.min(radius*.14,ds*3.4),cross*.34,.5);
    ctx.save();
    ctx.transform(sheet.nx[i],sheet.ny[i],-sheet.ny[i],sheet.nx[i],sheet.x[i],sheet.y[i]);
    ctx.globalAlpha=alpha*(style.vapor?.32:.20);
    ctx.drawImage(texture,-cross,-along,2*cross,2*along);
    if(style.vapor && w>2){
      const offset=Math.sin(slicePhase[i]*17-age*7+phase)*.48*w;
      ctx.globalAlpha=alpha*.36;
      ctx.drawImage(texture,offset-cross*.83,-along*1.32,cross*1.66,along*2.64);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawLanes(ctx,count,age,style,ink,alpha,phase,lanes) {
  const vapor=style.vapor;
  const bend=vapor?.48:style.fold?.54:.28;
  for(let lane=0;lane<lanes;lane++) {
    const base=-.89+1.78*(lane+.49)/lanes;
    const seed=lane*2.39996+phase;
    for(let i=0;i<=count;i++) {
      const s=slicePhase[i],width=sliceWidth[i];
      bandCenter[i]=base+bend*width*Math.sin(4.3*s+seed+age*5.5)
        +.085*Math.sin(s*12+seed-age*6)+.035*Math.sin(s*23+seed*.76+age*3);
      bandWidth[i]=(vapor?.23:.105)*width*(.72+.28*Math.cos(seed+age*5-s*12));
    }
    const light=.5+.5*Math.sin(lane*1.97+.43);
    ctx.globalAlpha=alpha*(vapor?.15+light*.23:.19+light*.24);
    strip(ctx,sheet,count,null,0,light>.49?ink.lane:ink.groove);
  }
  const ridges=Math.max(2,Math.round(lanes*.7));
  for(let k=1;k<=ridges;k++){
    const seed=k+phase;
    for(let i=0;i<=count;i++){
      const s=slicePhase[i];
      bandCenter[i]=.72*Math.sin(s*5.1+seed*2.42+age*3.6)
        +.12*Math.sin(s*17-seed+flow[i]*7)+.054*Math.sin(s*43+seed*1.8-age*7);
      bandWidth[i]=sliceWidth[i]*(.028+.017*Math.sin(s*13+seed+age*5));
    }
    ctx.globalAlpha=alpha*(vapor?.32:.46);
    strip(ctx,sheet,count,null,0,ink.crest);
  }
  if(vapor){
    const n=Math.max(2,Math.round(lanes*.45));
    for(let k=0;k<n;k++){
      const side=k%2?1:-1, seed=k*2.136+phase;
      for(let i=0;i<=count;i++){
        const s=slicePhase[i];
        bandCenter[i]=side*(.77+.33*Math.sin(s*15-age*9+seed)
          +.18*Math.sin(s*34+age*5+seed)*Math.min(1,age*4));
        bandWidth[i]=.17*sliceWidth[i];
      }
      ctx.globalAlpha=alpha*.2;
      strip(ctx,sheet,count,null,0,ink.curl);
    }
  }
}

export function drawFluidCapture(ctx, {
  x=0, y=0, radius, age, bodyRadius=11, sourceRadius=radius+bodyRadius*.74,
  angle=0, spin=1, style='hybrid', quiet=false, phase=0, rasterScale=1, dark:darkSpark=false
}) {
  if (!(radius>0 && age>=0 && age<1))return;
  const mode=FLUID_STYLES[style] || FLUID_STYLES.hybrid;
  const size=radius*rasterScale;
  const count=quiet?28:size<10?28:size<22?40:size<43?56:size<78?76:MAX_SEGMENTS;
  const lanes=quiet?3:size<10?3:size<22?5:size<43?7:size<78?10:13;
  const ink=darkSpark?dark:pale, alpha=ctx.globalAlpha;
  makeSheet(radius,sourceRadius,bodyRadius,angle,spin,age,mode,phase,quiet,count);
  ctx.save();ctx.translate(x,y);
  if(mode.fold)drawBackfold(ctx,count,spin,mode,ink,alpha,quiet);
  emitGlow(ctx,count,age,radius,mode,glowStamp(ctx,darkSpark),alpha,phase);
  const depth=ctx.createLinearGradient(sheet.x[0],sheet.y[0],sheet.x[count]+.1,sheet.y[count]+.1);
  depth.addColorStop(0,ink.body[0]);depth.addColorStop(.38,ink.body[1]);
  depth.addColorStop(.78,ink.body[2]);depth.addColorStop(1,ink.body[3]);
  ctx.globalAlpha=alpha*(mode.vapor?.31:.73);
  strip(ctx,sheet,count,0,1,depth);
  drawLanes(ctx,count,age,mode,ink,alpha,phase,lanes);
  ctx.beginPath();
  let started=false;
  for(let i=0;i<=count;i++){
    if(flow[i]<.25 || sheet.w[i]<.018)continue;
    if(!started){ctx.moveTo(sheet.x[i],sheet.y[i]);started=true;}
    else ctx.lineTo(sheet.x[i],sheet.y[i]);
  }
  if(started){
    ctx.globalAlpha=alpha*(mode.vapor?.51:.76);
    ctx.strokeStyle=ink.crest;ctx.lineWidth=Math.max(.58/rasterScale,radius*.012)*(1-age*.6);
    ctx.stroke();
  }
  ctx.restore();
}
