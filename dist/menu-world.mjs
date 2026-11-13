// Original, fixed pixel scenery. It gives menus a place in the game's world
// without another canvas, animation loop, image download or lighting shader.
const discs=(cx,cy,r,fill,step=2)=>Array.from({length:Math.ceil(r*2/step)},(_,i)=>{
 const y=-r+i*step,half=Math.floor(Math.sqrt(Math.max(0,r*r-(y+step/2)**2)));
 return `<rect x="${cx-half}" y="${cy+y}" width="${half*2}" height="${step}" fill="${fill}"/>`;
}).join('');
const pine=(x,y,s,fill)=>`<path transform="translate(${x} ${y}) scale(${s})" fill="${fill}" d="M-3 4H3v-33h8l-8-9h12L3-53h11L0-73-14-53h11l-12 15h12l-8 9h8Z"/>`;
const stars=[[45,53,2],[118,87,1],[164,29,2],[286,42,1],[332,70,2],[381,34,1],[418,108,1],[68,131,1],[359,129,1],[454,62,2],[516,37,1],[585,94,1],[674,47,1],[748,77,1],[817,29,2]];
export function menuWorldMarkup({id='menu-world'}={}){
 const key=String(id).replace(/[^a-zA-Z0-9_-]/g,'');
 return `<svg class="menu-world-art" viewBox="0 0 900 405" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${key}-sky" x2="0" y2="1"><stop stop-color="#132329"/><stop offset=".6" stop-color="#1b302f"/><stop offset="1" stop-color="#10231d"/></linearGradient><linearGradient id="${key}-quiet"><stop stop-color="#071411" stop-opacity=".1"/><stop offset=".48" stop-color="#071411" stop-opacity=".18"/><stop offset=".65" stop-color="#071411" stop-opacity=".94"/><stop offset="1" stop-color="#071411" stop-opacity=".96"/></linearGradient><pattern id="${key}-grain" width="13" height="11" patternUnits="userSpaceOnUse"><path d="M2 2h2v1H2zm6 5h1v2H8zM0 9h2v1H0z" fill="#b5c5a0" opacity=".045"/></pattern></defs>
  <path fill="url(#${key}-sky)" d="M0 0h900v405H0z"/>
  <g fill="#c4cfad" opacity=".6">${stars.map(([x,y,s])=>`<path d="M${x} ${y}h${s}v${s}h-${s}z"/>`).join('')}</g>
  <g transform="translate(70 0)">${discs(262,86,40,'#354b44')}${discs(262,86,34,'#73836b')}${discs(262,86,30,'#a6ad80')}${discs(260,84,27,'#bec397')}<path d="M243 66h7v5h-7zm28 24h9v7h-9zm-22 9h5v4h-5zm20-31h5v3h-5zm-26 17h3v6h-3z" fill="#899a77"/><path d="M247 62h8v2h-8zm25 40h4v3h-4z" fill="#d3d2aa"/></g>
  <path fill="#243c38" d="M0 175 23 165 38 171 60 152 77 155 102 126 118 134 132 151 158 133 181 138 195 119 211 124 236 155 251 153 265 138 287 146 311 172 339 159 360 163 381 150 409 163 429 151 463 172 491 159 517 178 543 157 569 176 590 165 624 186 649 170 674 184 701 157 731 171 754 167 786 184 811 171 844 188 873 177 900 189v216H0Z"/>
  <path fill="#1b302b" d="M0 210 30 207 47 191 78 197 100 178 128 186 152 175 188 190 211 186 240 209 273 194 302 202 332 184 360 195 393 188 431 213 463 195 491 209 529 203 556 220 589 205 628 220 670 207 709 227 748 211 794 226 835 208 869 223 900 216v189H0Z"/>
  <g>${[20,63,104,143,193,332,365,408,450,502,559,610,673,720,774,836,882].map((x,i)=>pine(x,245+(i%3)*8,.9+(i%4)*.16,'#142a24')).join('')}</g>
  <path d="M0 274h36v-7h34v-6h31v7h31v-5h27v8h33v-7h26v8h40v-6h34v8h27v-7h34v8h31v-4h35v9h39v-5h29v9h35v-8h32v9h37v-5h43v12h37v-9h35v12h49v-5h47v5h53v118H0Z" fill="#10241d"/>
  <g fill="#293c2b"><path d="M103 279v-75h12v-12h49v12h12v75h-16v-55h-9v-10h-24v10h-9v55Z"/><path d="M90 278h22v-8h50v8h22v11H90Z"/></g>
  <path d="M108 206h8v-9h18v8h-16v17h-10zm46-9h7v11h10v15h-10v-15h-7zM109 233h7v3h-7zm53 18h8v3h-8zM97 281h21v3H97z" fill="#697451"/>
  <path d="M110 237h8v3h-8zm47-14h5v3h-5zm-30-35h9v5h-9zm36 78h11v4h-11zM103 279h8v4h-8z" fill="#506743"/>
  <g fill="#23392b"><path d="M215 294h9v-10h10v-8h36v5h14v11h12v8h-81Z"/><path d="M199 309h25v-7h63v7h18v11H199Z"/></g>
  <path d="M233 277h28v3h-28zm-15 10h13v3h-13zm59 3h9v3h-9zm-71 17h17v3h-17zm49 4h25v3h-25z" fill="#627251"/>
  <g class="menu-world-wisp">${discs(258,235,50,'#9fbfa3',4).replaceAll('fill="#9fbfa3"','fill="#9fbfa3" opacity=".035"')}${discs(258,235,32,'#a8c4a0',3).replaceAll('fill="#a8c4a0"','fill="#a8c4a0" opacity=".08"')}${discs(258,235,20,'#bdd5ad',2).replaceAll('fill="#bdd5ad"','fill="#bdd5ad" opacity=".15"')}${discs(258,235,12,'#e2e9c7')}${discs(258,235,9,'#b8c8a7')}${discs(256,233,7,'#f1f3dc')}<path d="M254 227h5v4h-5z" fill="#ffffed"/></g>
  <g fill="#93aa7d"><path d="M221 269h4v4h-4zm48-14h3v3h-3zm24 16h2v2h-2zm-56-60h2v2h-2z"/></g>
  <path fill="#081911" d="M0 0h19v61h9v44h-5v38h12v38h-8v41h13v63l19 31-13 12-21-24H0Zm0 166 33-23 8-38 9 2-4 42-29 39Zm11-87 20-16 8-34 7 1-2 39-24 24ZM900 0h-22v44h-10v60h7v39h-15v54h8v54h-14v53l-18 33 14 8 21-28h29ZM889 100l-27-23-16-41-9 4 10 42 32 32Z"/>
  <path d="M0 348h28l13-12 19 4 10-9 25 12 18-4 22 14 35-5 29 12 31-5 26 12 32-5 24 10 34-4 25 9 35-6 22 7 36-7 28 11 33-8 27 9 35-7 23 10 32-6 30 8 37-7 26 10 43-6 26 8 35-7 28 10 44-6 36 5v57H0Z" fill="#071810"/>
  <path fill="url(#${key}-grain)" d="M0 110h900v295H0z"/>
  <path fill="url(#${key}-quiet)" d="M0 0h900v405H0z"/>
 </svg>`;
}
