import {skillIcon} from './upgrade-icons.mjs?v=starter-flow-1';
import {pickupArtSvg} from './pickup-art.mjs?v=starter-flow-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=starter-flow-1';
import {lifeHeartSvg} from './lives.mjs?v=starter-flow-1';

const aliases = {'✧':'wisp','✦':'sun','◈':'ember','ϟ':'wind','⌄':'wing','⌃':'wing','»':'wind','◇':'flame','♢':'wind','≈':'wind','♨':'flame','♡':'heart',boost:'flame',survival:'wisp',collection:'wisp',mobility:'wing',spirit:'wisp',ash:'flame',speed:'wind',phoenix:'flame',rebirth:'sun',control:'wing'};
const objects = {
  flame: () => mapStopIconMarkup('rest'),
  wisp: () => pickupArtSvg('light'),
  ember: () => pickupArtSvg('light'),
  ruins: () => mapStopIconMarkup('flight'),
  shield: () => skillIcon({id:'protector-layers',treeIcon:'ward',branch:'protector'}),
  wing: () => skillIcon({id:'main-lift',treeIcon:'lift'}),
  wind: () => skillIcon({id:'main-speed',treeIcon:'swift'}),
  moon: () => skillIcon({id:'main-dream',treeIcon:'dream'}),
  leaf: () => skillIcon({id:'main-glide-regen',treeIcon:'regen'}),
  sun: () => skillIcon({id:'main-sight',treeIcon:'sight'}),
  heart: () => lifeHeartSvg()
};

// Navigation stays legible around the animated object. The smallest highlight moves.
const carvings = {
  route: ['M2 7h5v-3h7v2h7v14h-7v-2H7v3H2z','M4 8h4V6h4v10H8v2H4zm11 0h4v10h-4z','M6 14h3v-3h6V9h2v3h-6v3H6z'],
  cards: ['M1 5h4v14h11v3H3zM6 2h15v17H6z','M8 4h11v13H8z','M13 6h2v2h2v3h-2v2h-2v-2h-2V8h2z'],
  arrow: ['M2 10h11V5h3v3h3v2h3v4h-3v2h-3v3h-3v-5H2z','M3 10h11V7h2v3h3v2H3z','M3 10h7v1H3z'],
  star: ['M10 2h4v4h2v2h6v4h-3v3h-2v6h-4v-3h-3v3H6v-7H3v-3H1V8h7V6h2z','M11 5h2v4h6v2h-4v5h-2v-3h-2v2H8v-5H5V9h6z','M10 9h3v2h-3z'],
  check: ['M2 11h4v3h3v2h2v-3h3v-3h3V6h4v6h-2v2h-3v3h-2v3H8v-2H5v-3H2z','M3 11h2v3h4v2h3v-3h3v-3h3V7h2v4h-2v2h-3v3h-3v2H9v-1H6v-3H3z','M17 9h2v2h-2z'],
  tune: ['M2 4h20v4H2zm0 6h20v4H2zm0 6h20v4H2z','M7 2h5v7H7zm7 6h5v7h-5zm-9 6h5v7H5z','M8 3h2v2H8zm7 6h2v2h-2zM6 15h2v2H6z'],
  pause: ['M4 3h6v18H4zm10 0h6v18h-6z','M5 4h3v15H5zm10 0h3v15h-3z','M5 4h3v2H5zm10 0h3v2h-3z'],
  info: ['M6 2h12v2h3v3h2v10h-2v3h-4v2H7v-2H3v-3H1V7h2V4h3z','M6 5h11v2h3v9h-3v3H7v-2H4V8h2z','M10 6h4v3h-4zm1 5h3v6h-3z'],
  sound: ['M2 9h4V7h3V5h3V3h3v18h-3v-2H9v-2H6v-2H2z','M4 10h5V8h3V6h1v12h-2v-3H8v-2H4z','M17 8h2v2h2v4h-2v2h-2v-2h2v-4h-2z'],
  mute: ['M2 9h4V7h3V5h3V3h3v18h-3v-2H9v-2H6v-2H2z','M4 10h5V8h3V6h1v12h-2v-3H8v-2H4z','M17 9h2v2h2V9h2v2h-2v2h2v2h-2v-2h-2v2h-2v-2h2v-2h-2z']
};

export function menuIcon(name, cls='') {
  const key = aliases[String(name).toLowerCase()] || name;
  const badge = objects[key]?.();
  if (badge) return badge.replace('<svg ', `<svg data-menu-art="${key}" `).replace(/class="([^"]*)"/, (_, original) => `class="ico ${cls} ${original}"`);
  const [shadow, body, light] = carvings[key] || carvings.star;
  return `<svg class="ico menu-carving ${cls}" viewBox="0 0 24 24" shape-rendering="crispEdges" fill="none" aria-hidden="true">
    <path fill="#746a54" d="${shadow}"/><path fill="#d5c693" d="${body}"/><path class="carving-light" fill="#fff4c5" d="${light}"/>
  </svg>`;
}
