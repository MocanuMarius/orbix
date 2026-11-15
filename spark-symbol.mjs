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
  return `<image class="spark-still" ${box} href="${still}?v=lofi-contours-1"/><image class="spark-motion" ${box} display="none" href="${motion}?v=lofi-contours-1"/>`;
}
export function sparkSymbolArt(x=0,y=0,size=24,tier=1){
  return sparkImageArt([null,'light','cluster','cache'][tier]||'light',x,y,size);
}
