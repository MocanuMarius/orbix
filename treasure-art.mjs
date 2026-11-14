const palettes = {
  vessel: ['#203e39','#356e67','#65aa96','#a8dbc4','#ebf6d2','#c49c64'],
  lens:   ['#293c49','#466775','#7cb2ab','#b8e3c9','#e8edba','#c5a05f'],
  tithe:  ['#45342f','#8e5342','#c57f54','#ecbf78','#ffdd9a','#9eaa78'],
  wager:  ['#3c3546','#6d506e','#9e7992','#d4abbb','#f2d9b1','#c2a577'],
};

// Each sprite is the discoverable object rising out of a coffer. The same
// silhouettes work on a phone before the player can read the site's name.
const treasures = {
  vessel: [
    '      166661      ',
    '      644446      ',
    '      133331      ',
    '       1331       ',
    '       2442       ',
    '     12344321     ',
    '    1234333321    ',
    '   123432233321   ',
    '   234322222232   ',
    '   234322455232   ',
    '   233344554432   ',
    '   232344543332   ',
    '    2333443322    ',
    '     12233221     ',
    '       1111       ',
  ],
  lens: [
    '          6666       ',
    '       66644446      ',
    '      6644333446     ',
    '     664333223346    ',
    '     643545322346    ',
    '     643453222346    ',
    '     643333222346    ',
    '      6433222346     ',
    '     6664333346      ',
    '    6446664466       ',
    '   644662666         ',
    '  664662  61         ',
    '  64461   61         ',
    '   661   6666        ',
    '        666666       ',
  ],
  tithe: [
    '         55         ',
    '        5445        ',
    '    666664466666    ',
    '   66444444446666   ',
    '    6    44    6    ',
    '   3 3   34   3 3   ',
    '   3 3   34   3 3   ',
    '  3   3  34  3   3  ',
    '  55555  34  3   3  ',
    '  33333  34  55555  ',
    '   222   34  33333  ',
    '         34   222   ',
    '        3443        ',
    '      66344366      ',
    '     6333333336     ',
  ],
  wager: [
    '          66666      ',
    '         6334456     ',
    '        633234456    ',
    '        634433356    ',
    '        644324436    ',
    '         63334436    ',
    '    55555 666666     ',
    '   5444445    1      ',
    '  544124445          ',
    '  541244345          ',
    '  544444345          ',
    '  544412345          ',
    '   5441235           ',
    '    33333            ',
  ],
};

function pixelSprite(rows, palette) {
  const layers = palette.map(() => []);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ink = row[x];
      let end = x + 1;
      while (row[end] === ink) end++;
      if (ink !== ' ') layers[Number(ink) - 1].push(`M${x} ${y}h${end-x}v1H${x}z`);
      x = end;
    }
  });
  return layers.map((path, i) => `<path fill="${palette[i]}" d="${path.join('')}"/>`).join('');
}

const illustrations = Object.fromEntries(Object.entries(treasures).map(([id, rows]) => {
  const palette = palettes[id];
  const object = pixelSprite(rows, palette);
  return [id, `<svg class="treasure-art" viewBox="0 0 76 48" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <path fill="#172921" d="M3 39h7v-3h12v-3h33v2h10v3h8v3h-6v2H54v2H21v-2H8v-2H3z"/>
    <path fill="#364638" d="M9 38h10v-2h9v2h22v-3h9v2h7v2H54v2H20v-1H9z"/>
    <path fill="${palette[0]}" d="M17 28h2V16h3v-3h31v3h5v13l-3 2v8h-5v3H21v-3h-4z"/>
    <path fill="#725d42" d="M20 18h3v-3h28v2h4v10H21z"/>
    <path fill="#28352d" d="M23 19h3v-2h23v2h3v5H24z"/>
    <path fill="#ac996f" d="M23 15h27v2H23zM20 18h2v7h-2z"/>
    <path fill="#101c1d" d="M17 26h34l7-3h3v11l-9 6H18z"/>
    <path fill="#68543e" d="M19 29h32v10H19z"/>
    <path fill="#463f34" d="M51 29l8-4v9l-8 5z"/>
    <path fill="#a3895e" d="M17 26h34v3H17zM20 31h30v1H20zM20 37h30v1H20zM51 26l9-4v3l-9 4z"/>
    <path fill="${palette[1]}" d="M22 28h4v12h-4zM44 28h4v12h-4z"/>
    <path fill="${palette[3]}" d="M23 28h2v5h-2zM45 28h2v5h-2zM33 29h5v3h-5z"/>
    <path fill="#304334" d="M9 37v-8h1v5h2v-7h1v7h2v2h-1v2zM61 37v-6h2v3h2v-6h1v7h2v2z"/>
    <path fill="${palette[2]}" opacity=".65" d="M16 11h1v2h-1zM56 8h1v2h-1zM61 16h2v1h-2zM9 23h2v1H9z"/>
    <g transform="translate(24 3) scale(1.5)">${object}</g>
  </svg>`];
}));

export function treasureArt(kind) {
  return illustrations[kind] || illustrations.vessel;
}
