import {formatGlow} from './vitality.mjs?v=dawnburst-1';
import { PICKUP_TYPES, getPickupSpec } from './pickups.mjs?v=dawnburst-1';
import { pickupArtSvg } from './pickup-art.mjs?v=dawnburst-1';
import { getCompanionAbility, normalizeCompanionRole, normalizeCompanionFleet } from './companion-abilities.mjs?v=dawnburst-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Math.round((Number(value) || 0) * 100);

function chargeText(role, amount) {
  const roles=normalizeCompanionFleet(Array.isArray(role)?role:null,Array.isArray(role)?'collector':role);
  return roles.every(id=>id==='kindler')?'Kindler has no recovery timer to restore.'
    :`Equipped active cooldowns, Collector rest and Protector recovery −${amount}s each when recovering.`;
}
function effectText(spec, role,maxGlow=100) {
  switch (spec.id) {
    case 'light': return `+${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses). Clears one dimming effect.`;
    case 'cache': return `+${formatGlow(spec.fuel,maxGlow)} Glow (before build bonuses). Clears one dimming effect.`;
    case 'embers': return `+${spec.currency} embers to this flight’s reward, saved on clear. No Glow.`;
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
    const size = spec.radius >= 6 ? 'LARGE' : spec.radius <= 3 ? 'SMALL' : 'MEDIUM';
    return `<article class="pickup-guide-row" data-pickup-kind="${spec.id}"><span class="pickup-guide-art" style="--pickup-art-size:40px" aria-hidden="true">${pickupArtSvg(spec.id,{className:'pickup-guide-icon'})}</span><div class="pickup-guide-copy"><div class="pickup-guide-row-title"><h3>${esc(spec.name)}</h3><small aria-label="${size.toLowerCase()}">${size}</small></div><p>${esc(effectText(spec,roles,maxGlow))}</p>${spec.manualOnly?'<b class="pickup-guide-manual">MANUAL CONTACT ONLY</b>':''}</div></article>`;
  }).join('')}</div><p class="pickup-guide-role">${collects?'Collector fetches eligible missed pickups inside its glow.': 'No Collector is equipped. Touch good pickups yourself.'}${collects&&(known.has('dusk')||known.has('dark'))?' Manual-contact pickups are not fetched.':''}${roles.includes('kindler')?' Kindler adds Glow to direct natural fuel pickups.':''}</p><p class="pickup-guide-legend">Pale ring: boon. Red ring: danger or a cost. The inner shape identifies the pickup.</p><button class="primary pickup-guide-close" data-action="close-power">Close</button></section>`;
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
    case 'embers':
      text = `Adds ${spec.currency} embers to this flight’s clear reward. It does not refill Glow; failed attempts do not save the pickup reward.`;
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
