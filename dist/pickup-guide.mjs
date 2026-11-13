import { PICKUP_TYPES, getPickupSpec } from './pickups.mjs';
import { pickupArtSvg } from './pickup-art.mjs';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Math.round((Number(value) || 0) * 100);

function chargeText(role, amount) {
  if (role === 'collector') return `Collector recovery −${amount}s.`;
  if (role === 'gravity') return 'Gravity pull +15% for 3s.';
  return `${getCompanionAbility(role).label} cooldown −${amount}s.`;
}
function effectText(spec, role) {
  switch (spec.id) {
    case 'light': return `+${spec.fuel} Glow. Clears one dimming effect.`;
    case 'cache': return `+${spec.fuel} Glow. Clears one dimming effect.`;
    case 'embers': return `+${spec.currency} embers to this flight’s reward, saved on clear. No Glow.`;
    case 'charge': return `${chargeText(role, spec.recharge)} No Glow.`;
    case 'sight': return `Wider sight for ${spec.sightDuration}s. No Glow.`;
    case 'dusk': return `+${spec.fuel} Glow, with ${percent(spec.dim)}% less sight for ${spec.dimDuration}s. Manual contact only.`;
    case 'dark': return `${percent(spec.dim)}% less sight for ${spec.dimDuration}s. Avoid contact; a fuel light clears one effect.`;
    default: return spec.description;
  }
}

/** Content for the app's native .power-sheet.pickup-guide-sheet dialog. */
export function pickupGuideMarkup({ role = 'collector' } = {}) {
  role = normalizeCompanionRole(role);
  const collects = getCompanionAbility(role).collects === true;
  return `<section class="pickup-guide"><header class="pickup-guide-heading"><h2>PICKUP KEY</h2><span>7 KINDS</span></header><div class="pickup-guide-list">${Object.values(PICKUP_TYPES).map(spec => {
    const size = spec.radius >= 6 ? 'LARGE' : spec.radius <= 3 ? 'SMALL' : 'MEDIUM';
    return `<article class="pickup-guide-row" data-pickup-kind="${spec.id}"><span class="pickup-guide-art" style="--pickup-art-size:40px" aria-hidden="true">${pickupArtSvg(spec.id,{className:'pickup-guide-icon'})}</span><div class="pickup-guide-copy"><div class="pickup-guide-row-title"><h3>${esc(spec.name)}</h3><small aria-label="${size.toLowerCase()}">${size}</small></div><p>${esc(effectText(spec,role))}</p>${spec.manualOnly?'<b class="pickup-guide-manual">MANUAL CONTACT ONLY</b>':''}</div></article>`;
  }).join('')}</div><p class="pickup-guide-role">${collects?'Only Collector fetches eligible pickups. It ignores Dusk Pearls and Dark Seeds.':'This companion never fetches. Touch good pickups yourself.'}</p><p class="pickup-guide-legend">Size changes how close you need to fly. Color and motion identify the effect.</p><button class="primary pickup-guide-close" data-action="close-power">Close</button></section>`;
}

/** A short first-contact lesson; the app supplies the world highlight target. */
export function pickupLesson(kind, { role = 'collector' } = {}) {
  const spec = getPickupSpec(kind);
  role = normalizeCompanionRole(role);
  const collects = getCompanionAbility(role).collects === true;
  let text;
  switch (spec.id) {
    case 'light':
      text = `Restores ${spec.fuel} Glow and clears one dimming effect. ${collects?'Touch it or let Collector fetch a missed mote.':'Touch it yourself; your companion does not fetch.'}`;
      break;
    case 'cache':
      text = `This larger light restores ${spec.fuel} Glow and clears one dimming effect. ${collects?'Collector can fetch a missed cache.':'Move your body through it to collect.'}`;
      break;
    case 'embers':
      text = `Adds ${spec.currency} embers to this flight’s clear reward. It does not refill Glow; failed attempts do not save the pickup reward.`;
      break;
    case 'charge':
      text = `${chargeText(role,spec.recharge)} This cyan pickup restores no Glow.`;
      break;
    case 'sight':
      text = `Lets you see farther for ${spec.sightDuration} seconds. It restores no Glow.`;
      break;
    case 'dusk':
      text = `Touch it for ${spec.fuel} Glow, with ${percent(spec.dim)}% less sight for ${spec.dimDuration} seconds. It requires manual contact.`;
      break;
    case 'dark':
      text = `Touching it dims sight by ${percent(spec.dim)}% for ${spec.dimDuration} seconds. ${collects?'Collector ignores it; a fuel light clears one effect.':'A fuel light clears one effect.'}`;
      break;
    default:
      text = spec.description;
  }
  return { id: spec.id, title: spec.name, text, actionLabel: 'Continue' };
}
