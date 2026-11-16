// Physical display furniture for Collection and the shared UI gallery. All
// geometry is authored on a small integer grid to match the in-game objects.
export function reliquaryBackdropMarkup(){
 return `<svg class="reliquary-backdrop" viewBox="0 0 360 240" preserveAspectRatio="none" aria-hidden="true" shape-rendering="crispEdges" focusable="false">
 <path fill="#080f12" d="M5 4h350v232H5z"/>
 <path fill="#26302e" d="M12 5h336v228H12z"/>
 <path fill="#39403a" d="M15 7h330v3H15zM14 12h3v214h-3zM343 12h3v214h-3z"/>
 <path fill="#1b2424" d="M19 13h322v100H19zM19 126h322v100H19z"/>
 <path fill="#333a32" d="M20 16h92v2H20zM117 16h110v2H117zM233 16h107v2H233zM20 129h92v2H20zM117 129h110v2H117zM233 129h107v2H233z"/>
 <path fill="#101a1a" d="M20 58h320v2H20zM20 172h320v2H20zM69 18h2v40h-2zM186 18h2v40h-2zM295 18h2v40h-2zM129 60h2v45h-2zM245 60h2v45h-2zM68 130h2v42h-2zM187 130h2v42h-2zM295 130h2v42h-2zM128 174h2v43h-2zM246 174h2v43h-2z"/>
 <path fill="#545247" d="M7 104h346v4H7zM7 218h346v4H7zM4 0h352v4H4z"/>
 <path fill="#342c24" d="M7 108h346v12H7zM7 222h346v12H7z"/>
 <path fill="#756750" d="M11 108h338v2H11zM11 222h338v2H11z"/>
 <path fill="#171c1b" d="M11 117h338v4H11zM11 231h338v5H11zM0 6h9v226H0zM351 6h9v226h-9z"/>
 <path fill="#5a5543" d="M3 7h3v223H3zM354 7h3v223h-3z"/>
 <path fill="#65563d" d="M19 112h41v1H19zM82 114h31v1H82zM147 111h56v1h-56zM214 114h34v1h-34zM272 112h63v1h-63zM17 226h56v1H17zM94 229h28v1H94zM153 225h42v1h-42zM219 228h47v1h-47zM287 226h39v1h-39z"/>
 <path fill="#69705a" opacity=".5" d="M20 9h15v2H20zM18 11h8v4h-8zM331 10h9v3h-9zM337 13h5v8h-5zM19 120h12v3H19zM24 123h4v6h-4zM331 234h10v3h-10z"/>
 <path fill="#b5a477" d="M3 25h3v3H3zM354 25h3v3h-3zM3 196h3v3H3zM354 196h3v3h-3z"/>
 </svg>`;
}

export function reliquaryNicheMarkup(){
 return `<svg class="reliquary-niche" viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true" shape-rendering="crispEdges" focusable="false">
 <path fill="#080f12" d="M16 56V18h5v-7h9V6h40v5h9v7h5v38Z"/>
 <path fill="#41483d" d="M11 57V19h4V11h9V5h13V2h26v3h13v6h9v8h4v38h-5V20h-7v-7H66V9H34v4H23v7h-7v37Z"/>
 <path fill="#6d7058" d="M15 19v-6h9V7h13V4h26v3h13v6h9v6h-3v-4h-9V9H61V7H39v2H27v6h-9v4Z"/>
 <path fill="#202c29" d="M17 21h4v31h-4zM79 21h4v31h-4z"/>
 <path fill="#535b47" d="M13 24h2v17h-2zM85 24h2v17h-2zM25 10h5v2h-5zM69 10h5v2h-5z"/>
 <path class="niche-light" fill="#8ba271" opacity=".12" d="M31 15h38v7h8v32H23V22h8Z"/>
 <path fill="#111b18" d="M17 58h66v7H17zM23 66h54v5H23z"/>
 <path fill="#6e7055" d="M23 51h54v4h7v6H16v-6h7Z"/>
 <path fill="#a39b70" d="M24 51h52v2H24zM18 55h64v2H18z"/>
 <path fill="#424b39" d="M18 57h64v4H18zM25 61h50v4H25z"/>
 <path fill="#828063" d="M26 61h48v1H26zM32 55h9v1h-9zM60 58h15v1H60z"/>
 <path class="niche-selection" fill="#e5d59c" d="M9 26h3v18H9zM88 26h3v18h-3zM38 65h24v2H38z"/>
 </svg>`;
}

export function furnaceGlyphMarkup(){
 return `<svg class="furnace-glyph" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges" focusable="false">
 <path fill="#141b1b" d="M7 2h18v4h3v23H4V6h3Z"/>
 <path fill="#777765" d="M8 2h16v4H8zM5 7h22v3H5zM4 25h24v4H4z"/>
 <path fill="#424d43" d="M6 10h20v15H6zM10 5h12v2H10z"/>
 <path fill="#1b2121" d="M11 11h10v3h3v10H8V14h3Z"/>
 <path fill="#9f623b" d="M10 23v-5h3v-4h3v5h3v-3h3v7Z"/>
 <path fill="#f0b56a" d="M12 23v-4h3v-4h2v5h3v3Z"/>
 <path fill="#fff0bb" d="M15 20h2v4h-2Z"/>
 <path fill="#aaa383" d="M6 10h3v3H6zM23 10h3v3h-3zM7 29h4v2H7zM21 29h4v2h-4z"/>
 <path fill="#a59b76" d="M6 26h20v1H6zM9 3h7v1H9z"/>
 </svg>`;
}
