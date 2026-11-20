import {duskGlyphArt} from './spark-symbol.mjs?v=batch-1';

// The established moonlit ruins retain their original pixel density. The
// native warning crescent replaces the bright fuel at the scene's focal point.
export function duskCardArt({compact=false,size=null,rarity='common'}={}){
  return `<svg xmlns="http://www.w3.org/2000/svg" class="skill-card-art skill-card-illustration card-art-dusk-wick${compact?' card-art-compact':''}" data-card-art="dusk-wick" data-card-rarity="${rarity}" data-art-size="${compact||size==='compact'?'compact':'full'}" viewBox="0 0 313 313" width="120" height="168" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="A split rose Dusk crescent glows above moonlit ruins, its dark cut separating it from an ordinary fuel Spark."><svg viewBox="0 0 313 313" width="313" height="313" overflow="hidden"><image href="./assets/cards/skill-card-scenes-rare.webp" x="0" y="-313" width="1252" height="1252" preserveAspectRatio="none" style="image-rendering:pixelated"/></svg><g shape-rendering="crispEdges"><path fill="#b47e9f" opacity=".16" d="M112 94h88v12h12v88h-12v12h-88v-12h-12v-88h12z"/><path fill="#d595af" opacity=".12" d="M124 106h64v12h12v64h-12v12h-64v-12h-12v-64h12z"/>${duskGlyphArt(116,116,80)}<path fill="#f2c0cf" opacity=".4" d="M134 200h4v12h-4zm36 18h4v8h-4zm-61 3h3v7h-3z"/></g></svg>`;
}
