// Intrinsic-size frames keep the drawable inside its own footprint even in
// SVG scenes that style all nested viewports as overflow:visible.
const art={
  light:['./assets/plasma-spark.png','./assets/plasma-spark-motion.png'],
  cluster:['./assets/plasma-cluster.png','./assets/plasma-cluster-motion.png'],
  cache:['./assets/plasma-cache.png','./assets/plasma-cache-motion.png'],
  sight:['./assets/flash-powerup.png','./assets/flash-powerup-motion.png'],
  dusk:['./assets/spark-dusk.png','./assets/spark-dusk-motion.png'],
  dark:['./assets/spark-dark.png','./assets/spark-dark-motion.png'],
};
export function sparkImageArt(kind,x,y,size){
  const [still,motion]=art[kind];
  const box=`x="${x}" y="${y}" width="${size}" height="${size}" style="image-rendering:pixelated"`;
  return `<image class="spark-still" ${box} href="${still}?v=tidy-1"/><image class="spark-motion" ${box} display="none" href="${motion}?v=tidy-1"/>`;
}
export function sparkSymbolArt(x=0,y=0,size=24,tier=1){
  return sparkImageArt([null,'light','cluster','cache'][tier]||'light',x,y,size);
}

// Dusk keeps a broken rose crescent and a dark diagonal cut at every scale.
// The live pickup, glossary and Dusk Wick scene consume these same native cells.
export const DUSK_MOTIF_PIXELS=Object.freeze([
  [7,1,6,1,'#785267'],[4,2,11,2,'#a96f89'],[2,4,15,3,'#cc91a8'],
  [1,7,4,6,'#b87a96'],[3,13,4,3,'#b87a96'],[6,16,8,2,'#a96f89'],
  [13,14,4,2,'#cc91a8'],[15,12,3,2,'#a96f89'],
  [5,4,8,2,'#f2c0cf'],[3,6,2,6,'#e4acbf'],[5,13,3,2,'#d595af'],[8,15,5,1,'#d595af'],
  [6,6,7,8,'#272335'],[5,8,2,4,'#272335'],[8,5,4,2,'#272335'],
  [8,8,4,5,'#080c18'],[12,6,3,2,'#080c18'],[11,7,3,3,'#080c18'],
  [10,10,7,2,'#080c18'],[13,8,5,3,'#080c18'],[17,7,2,2,'#f1a4bb'],
  [3,4,3,1,'#ffe0df'],[2,6,1,3,'#f2c0cf'],[9,17,3,1,'#d595af'],
].map(Object.freeze));
export function duskGlyphArt(x=0,y=0,size=20){
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true" shape-rendering="crispEdges" class="dusk-glyph">${DUSK_MOTIF_PIXELS.map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('')}</svg>`;
}

// At 16–20px the flight sprite's fine discharges merge together. This small
// drawing keeps its round shell, three plasma branches and bright central core.
// No opaque backing: the same material reads on paper and in the dark HUD.
export function sparkGlyphArt(x=0,y=0,size=20){
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 20 20" overflow="hidden" aria-hidden="true" shape-rendering="crispEdges"><g class="spark-glyph">
    <path class="spark-glyph-shell" fill="#705b3b" d="M7 1h6v1h3v2h2v3h1v6h-1v3h-2v2h-3v1H7v-1H4v-2H2v-3H1V7h1V4h2V2h3z"/>
    <path fill="#efdea7" d="M7 2h6v1h3v2h1v2h1v6h-1v3h-2v1h-2v1H7v-1H4v-2H3v-2H2V7h1V5h2V3h2z"/>
    <path fill="#6e654d" d="M7 4h6v1h2v2h1v6h-1v2h-2v1H7v-1H5v-2H4V7h1V5h2z"/>
    <path fill="#c6ba8f" d="M6 5h3v3H7V7H5V6h1zm7 1h2v2h1v4h-2V9h-2V7h1zM5 12h2v2h2v2H7v-1H5z"/>
    <path class="spark-glyph-arcs" fill="#fff0bd" d="M4 5h2v2h2v1h2v2H8V9H6V8H4zm11 0h1v3h-2v2h-3V8h2V7h2zM9 11h3v2h-1v3H9v-2H8v-2h1z"/>
    <path class="spark-glyph-core" fill="#fffdf1" d="M9 7h3v2h1v3h-2v1H8v-2H7V9h2z"/>
    <path fill="#fff7d7" d="M7 2h6v1H7zM3 7h1v4H3zm13 4h1v3h-1zM12 16h3v1h-3z"/>
  </g></svg>`;
}
