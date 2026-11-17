import {skillIcon} from './upgrade-icons.mjs?v=strip-2';
import {uiIcon,UI_ICON_NAMES,uiIconGrid} from './ui-icons.mjs?v=strip-2';

// Old glyphs and legacy names. Spark-like aliases now draw the approved Spark; the skill portraits (shield, wing, wind, moon, leaf, sun) are not part of the icon set.
const aliases = {'✧':'spark','✦':'sun','◈':'spark','ϟ':'wind','⌄':'wing','⌃':'wing','»':'wind','◇':'flame','♢':'wind','≈':'wind','♨':'flame','♡':'heart',boost:'flame',survival:'spark',mobility:'wing',spirit:'spark',ash:'flame',speed:'wind',phoenix:'flame',rebirth:'sun',control:'wing',wisp:'spark',ember:'spark'};
const objects = {
  shield: () => skillIcon({id:'protector-layers',treeIcon:'ward',branch:'protector'}),
  wing: () => skillIcon({id:'main-lift',treeIcon:'lift'}),
  wind: () => skillIcon({id:'main-speed',treeIcon:'swift'}),
  moon: () => skillIcon({id:'main-dream',treeIcon:'dream'}),
  leaf: () => skillIcon({id:'main-glide-regen',treeIcon:'regen'}),
  sun: () => skillIcon({id:'main-sight',treeIcon:'sight'})
};

// Names the menus have always asked for, mapped to the approved v2.0-icons set. Anything else is looked up in the set directly.
const named = {route:'map',cards:'deck',arrow:'back',back:'back',star:'collection',check:'check',tune:'settings',pause:'pause',info:'info',sound:'sound',mute:'mute',flame:'stop-rest',ruins:'stop-flight',heart:'heart-full'};
export const MENU_ICON_NAMES = Object.freeze([...new Set([...Object.values(named), 'spark'])]);
// A 16-grid icon is 32 px by default (buttons 44 px or taller); the arrow that ends a button label is 16. Map stops (24 grid) are 24 px.
const defaultSize = {arrow:16};

/** Inline approved icon. size must be a whole multiple of the icon's grid (it is snapped if not). cls keeps the class hooks the screens style. */
export function menuIcon(name, cls='', size) {
  const key = aliases[String(name).toLowerCase()] || name;
  const badge = objects[key]?.();
  if (badge) return badge.replace('<svg ', `<svg data-menu-art="${key}" `).replace(/class="([^"]*)"/, (_, original) => `class="ico ${cls} ${original}"`);
  const icon = named[key] || (UI_ICON_NAMES.includes(key) ? key : 'collection');
  const grid = uiIconGrid(icon);
  return uiIcon(icon, {size: size || defaultSize[key] || (grid === 24 ? 24 : 32), className: `ico menu-icon ${key==='arrow'?'ui-flip ':''}${cls}`.trim()}).replace('<svg ', `<svg data-menu-art="${key}" `);
}
