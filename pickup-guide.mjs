import {formatGlow} from './vitality.mjs?v=ring-boons-1';
import { PICKUP_TYPES, getPickupSpec } from './pickups.mjs?v=ring-boons-1';
import { pickupArtSvg } from './pickup-art.mjs?v=ring-boons-1';
import { normalizeCompanionRole, normalizeCompanionFleet } from './companion-abilities.mjs?v=ring-boons-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Math.round((Number(value) || 0) * 100);

function chargeText(role, amount) {
  return `Recharging companions recover ${amount}s sooner. Space Timer regains levitation charge.`;
}
function effectText(spec, role,maxGlow=100) {
  switch (spec.id) {
    case 'light': return `+${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses). Clears one dimming effect.`;
    case 'cache': return `+${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses). Clears one dimming effect.`;
    case 'cluster': return `+${formatGlow(spec.fuel,maxGlow)} Glow. Surplus above your full meter becomes Packed Light.`;
    case 'charge': return `${chargeText(role, spec.recharge)} No Glow.`;
    case 'sight': return `Wider sight for ${spec.sightDuration}s. No Glow.`;
    case 'dusk': return `+${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses), with ${percent(spec.dim)}% less sight for ${spec.dimDuration}s. Manual contact only.`;
    case 'dark': return `${percent(spec.dim)}% less sight for ${spec.dimDuration}s. Avoid contact; a fuel light clears one effect.`;
    default: return spec.description;
  }
}

/** Content for the app's native .power-sheet.pickup-guide-sheet dialog. */
export function pickupGuideMarkup({ role = 'collector', companions, maxGlow=100, discovered = [] } = {}) {
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  const known = new Set(['light', ...(Array.isArray(discovered) ? discovered : [])]);
  const visible = Object.values(PICKUP_TYPES).filter(spec => known.has(spec.id));
  return `<section class="pickup-guide"><header class="pickup-guide-heading"><h2>PICKUP KEY</h2><span>${visible.length} FOUND</span></header><div class="pickup-guide-list">${visible.map(spec => {
    const size = ({light:'1 RING',cluster:'2 RINGS',cache:'3 RINGS'})[spec.id] || (spec.manualOnly?'CAUTION':'UTILITY');
    return `<article class="pickup-guide-row" data-pickup-kind="${spec.id}"><span class="pickup-guide-art" style="--pickup-art-size:40px" aria-hidden="true">${pickupArtSvg(spec.id,{className:'pickup-guide-icon'})}</span><div class="pickup-guide-copy"><div class="pickup-guide-row-title"><h3>${esc(spec.name)}</h3><small aria-label="${size.toLowerCase()}">${size}</small></div><p>${esc(effectText(spec,roles,maxGlow))}</p>${spec.manualOnly?'<b class="pickup-guide-manual">MANUAL CONTACT ONLY</b>':''}</div></article>`;
  }).join('')}</div><p class="pickup-guide-role">${collects?'Collector fetches eligible missed pickups when their rings touch its boundary.': 'No Collector is equipped. Touch good pickups yourself.'}${collects&&(known.has('dusk')||known.has('dark'))?' Manual-contact pickups are not fetched.':''}</p><details class="pickup-flight-effects"><summary>Flight effects</summary><p class="pickup-guide-legend"><b>Edging Pulse</b><br>Skim solid terrain or the top and bottom edges to charge PULSE. Full charge reveals the scene for five fading seconds. Charge falls in open space.</p><p class="pickup-guide-legend"><b>Black Hole</b><br>A dark core steals Glow continuously when you approach. Give it space: the closer you fly, the faster your light spirals away. It is not a pickup. Shields do not stop its drain.</p></details><p class="pickup-guide-legend"><b>FULL METER → PACKED LIGHT</b><br>Surplus pickup light buys run skills. Earnings are kept on clear; Rest recovery never creates currency.</p><p class="pickup-guide-legend">Pale ring: boon. Red ring: danger or a cost. Glow lights have three fixed ring slots: small lights fill the outer slot; stronger lights add rings inward. Other inner shapes identify utility pickups.</p><button class="secondary" data-action="condensation-help">How overflow becomes upgrades</button><button class="primary pickup-guide-close" data-action="close-power">Close</button></section>`;
}

/** A short first-contact lesson; the app supplies the world highlight target. */
export function pickupLesson(kind, { role = 'collector', companions, maxGlow=100 } = {}) {
  const spec = getPickupSpec(kind);
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  let text;
  switch (spec.id) {
    case 'light':
      text = `Restores ${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses) and clears one dimming effect. ${collects?'Touch it or let Collector fetch a missed mote.':'Touch it yourself; your companion does not fetch.'}`;
      break;
    case 'cache':
      text = `This larger light restores ${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses) and clears one dimming effect. ${collects?'Collector can fetch a missed cache.':'Move your body through it to collect.'}`;
      break;
    case 'cluster':
      text = `Restores ${formatGlow(spec.fuel,maxGlow)} Glow. Keep collecting with a full meter to earn Packed Light; clear the passage to keep it.`;
      break;
    case 'charge':
      text = `${chargeText(roles,spec.recharge)} This cyan pickup restores no Glow.`;
      break;
    case 'sight':
      text = `Lets you see farther for ${spec.sightDuration} seconds. It restores no Glow.`;
      break;
    case 'dusk':
      text = `Touch it for ${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses), with ${percent(spec.dim)}% less sight for ${spec.dimDuration} seconds. It requires manual contact.`;
      break;
    case 'dark':
      text = `Touching it dims sight by ${percent(spec.dim)}% for ${spec.dimDuration} seconds. ${collects?'Collector ignores it; a fuel light clears one effect.':'A fuel light clears one effect.'}`;
      break;
    default:
      text = spec.description;
  }
  return { id: spec.id, title: spec.name, text, actionLabel: 'Continue' };
}
