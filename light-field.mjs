// A finite emitter avoids the singularity at its centre. The cutoff removes
// the distant tail; exposure maps inverse-square irradiance into visible light.
export function lightAttenuation(distanceSquared){
  if(distanceSquared>=1)return 0;
  return 1-Math.exp(-.75*(1/(Math.max(0,distanceSquared)+.0324)-1/1.0324));
}
export function createLightMaskCanvas(document){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'),image=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const dx=(x+.5-64)/64,dy=(y+.5-64)/64,offset=(y*128+x)*4;
    image.data[offset]=image.data[offset+1]=image.data[offset+2]=255;
    image.data[offset+3]=Math.round(lightAttenuation(dx*dx+dy*dy)*255);
  }
  c.putImageData(image,0,0);return canvas;
}
export function lightVisibility(engine,light,x,y,playerY=engine.player.y){
  const radius=Math.max(1,light.radius||175),intensity=light.intensity??1;
  const dx=x-engine.player.x,dy=y-playerY;
  let dark=1-lightAttenuation((dx*dx+dy*dy)/(radius*radius))*intensity;
  const forward=light.forwardLight;
  if(forward?.active&&forward.radius>0){
    const fx=x-(forward.screenX??forward.x),fy=y-forward.y-(playerY-engine.player.y);
    dark*=1-lightAttenuation((fx*fx+fy*fy)/(forward.radius*forward.radius))*(forward.intensity??1)*intensity;
  }
  const landmark=light.landmarkLight;
  if(landmark?.radius>0){
    const lx=x-landmark.x,ly=y-landmark.y;
    dark*=1-lightAttenuation((lx*lx+ly*ly)/(landmark.radius*landmark.radius))*(landmark.intensity??1);
  }
  return 1-dark*(1-(light.pickupReveal||0));
}
