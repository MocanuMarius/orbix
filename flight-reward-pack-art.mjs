import {sparkGlyphArt} from './spark-symbol.mjs?v=overfill-1';

// The reward is a small fan of playing cards, with the Atlas kit's paper,
// leather and moss materials. Integer cells keep the ornament legible on touch.
const corner=`<path fill="#a58c57" d="M12 12h22v2H14v20h-2zM17 17h13v2H19v11h-2z"/>
 <path fill="#e6d19c" d="M12 12h4v4h-4zm8 8h4v4h-4zm7-3h3v3h-3zm-10 10h3v3h-3z"/>
 <path fill="#71805a" d="M25 12h9v2h-7v4h-2zM12 25h2v7h4v2h-6z"/>`;

function collectorInlay(){
 return `<g fill="#a58c57">
  <path d="M37 41h8v2h-6v3h-4v7h-3v8h-2v-9h2v-8h5zM51 41h8v3h5v8h2v9h-2v-8h-3v-7h-4v-3h-6z"/>
  <path d="M34 53h6v2h-4v7h-2zm22 0h6v9h-2v-7h-4z"/>
 </g><path fill="#d8c98a" d="M46 35h4v4h3v3h-3v3h-4v-3h-3v-3h3z"/>
 <path fill="#f3e6b9" d="M46 37h3v3h-3z"/>
 <path fill="#71805a" d="M40 47h4v3h-4zm12 0h4v3h-4z"/>`;
}

function cardBack({hero=false}={}){
 return `<path fill="#140e09" d="M4 4h88v4h4v144h-4v4H4v-4H0V8h4z"/>
 <path fill="#92784d" d="M4 1h88v3h3v145h-3v4H4v-4H1V4h3z"/>
 <path fill="#e6d19c" d="M5 0h86v3h3v144h-3v4H5v-4H2V3h3z"/>
 <path fill="#f3e3b3" d="M6 1h84v2H6zM3 5h2v139H3z"/>
 <path fill="#a58c57" d="M6 148h84v2H6zM91 5h2v139h-2z"/>
 <path fill="#4a3828" d="M8 6h80v2h2v135h-2v2H8v-2H6V8h2z"/>
 <path fill="${hero?'#263d2c':'#203528'}" d="M10 9h76v2h2v130h-2v2H10v-2H8V11h2z"/>
 <path fill="#71805a" d="M12 10h72v1H12zM9 13h1v126H9z"/>
 <path fill="#14261d" d="M12 141h72v1H12zM86 13h1v126h-1z"/>
 <path fill="#344b33" d="M26 28h4v4h-4zm40 0h4v4h-4zM26 119h4v4h-4zm40 0h4v4h-4zM18 62h2v28h-2zm58 0h2v28h-2z"/>
 ${corner}<g transform="translate(96 0) scale(-1 1)">${corner}</g>
 <g transform="translate(0 152) scale(1 -1)">${corner}</g><g transform="translate(96 152) scale(-1 -1)">${corner}</g>
 ${collectorInlay()}<g transform="translate(96 152) rotate(180)">${collectorInlay()}</g>
 <path fill="#a58c57" d="M23 70h2v-6h2v-4h2v-3h2v7h-2v7h-2v10h2v7h2v7h-2v-3h-2v-4h-2v-6h-2zM71 70h2v12h-2v6h-2v4h-2v3h-2v-7h2v-7h2V71h-2v-7h-2v-7h2v3h2v4h2z"/>
 <path fill="#d8c98a" d="M20 74h4v4h-4zm52 0h4v4h-4zM35 58h3v3h-3zm23 0h3v3h-3zM35 91h3v3h-3zm23 0h3v3h-3z"/>
 ${sparkGlyphArt(32,60,32)}
 <path fill="#e6d19c" d="M46 51h4v4h-4zm0 46h4v4h-4z"/>
 <path fill="#f3e3b3" d="M11 11h3v2h-3zm71 0h3v2h-3z"/>`;
}

export function sealedPackMarkup(){
 return `<svg xmlns="http://www.w3.org/2000/svg" class="flight-reward-card-backs" viewBox="0 0 240 208" fill="none" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
  <path fill="#030806" opacity=".5" d="M33 191h174v4h11v4h-11v3H33v-3H22v-4h11z"/>
  <g class="pack-flap-left"><g transform="translate(39 34) rotate(-12 48 144)">${cardBack()}</g></g>
  <g class="pack-flap-right"><g transform="translate(105 34) rotate(12 48 144)">${cardBack()}</g></g>
  <g class="pack-top-card" transform="translate(72 12)">
   <path fill="#0a130d" opacity=".65" d="M8 4h88v4h4v144h-4v4H8v-4H4V8h4z"/>
   ${cardBack({hero:true})}
  </g>
  <g class="pack-gilt-glints" fill="#fff1c5"><path d="M177 17h2v5h5v2h-5v5h-2v-5h-5v-2h5zM53 28h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/></g>
 </svg>`;
}
