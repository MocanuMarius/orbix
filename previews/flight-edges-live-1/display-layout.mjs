// A logical game viewport, not a claim about a phone's hardware pixel count.
export const GAME_VIEWPORT=Object.freeze({width:900,height:405});
export const DISPLAY_ZOOMS=Object.freeze([75,100,125,150,175,200]);
export const DEFAULT_DISPLAY_ZOOM=150;
export function normalizeDisplayZoom(value){
 if(value==='fit')return 'fit';
 const number=Number(value);return DISPLAY_ZOOMS.includes(number)?number:DEFAULT_DISPLAY_ZOOM;
}
export function displayMode({requested,embedded=false,coarse=false,hover=true,screenWidth=1280,screenHeight=720}={}){
 if(embedded||requested==='native')return 'native';
 if(requested==='desktop')return 'desktop';
 return coarse&&!hover&&Math.min(screenWidth,screenHeight)<700?'native':'desktop';
}
export function fitGameViewport({width,height,zoom=DEFAULT_DISPLAY_ZOOM}={}){
 const availableWidth=Math.max(0,Number(width)||0),availableHeight=Math.max(0,Number(height)||0);
 const requested=normalizeDisplayZoom(zoom),fit=Math.min(availableWidth/GAME_VIEWPORT.width,availableHeight/GAME_VIEWPORT.height);
 const target=requested==='fit'?fit:requested/100;
 const scale=Math.max(0,Math.min(target,fit));
 return {width:GAME_VIEWPORT.width*scale,height:GAME_VIEWPORT.height*scale,scale,
  preferred:requested,effective:Math.round(scale*100),clamped:requested!=='fit'&&scale<target-.005};
}
export function gameDocumentUrl(href,{hosted=false}={}){
 const source=new URL(href),game=new URL('./game.html',source);game.search=source.search;game.hash=source.hash;
 for(const key of ['display','zoom'])game.searchParams.delete(key);
 if(hosted)game.searchParams.set('hosted','1');else game.searchParams.delete('hosted');
 return game;
}
