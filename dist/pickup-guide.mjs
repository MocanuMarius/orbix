import {formatGlow} from './vitality.mjs?v=starter-flow-1';
import { PICKUP_TYPES, getPickupSpec, flashPowerupDescription } from './pickups.mjs?v=starter-flow-1';
import { pickupArtSvg } from './pickup-art.mjs?v=starter-flow-1';
import { normalizeCompanionRole, normalizeCompanionFleet } from './companion-abilities.mjs?v=starter-flow-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Math.round((Number(value) || 0) * 100);

function effectText(spec,maxGlow=100,modifiers) {
  switch (spec.id) {
    case 'light': return `+${formatGlow(spec.fuel,maxGlow)} Sparks (before build bonuses). Clears one dimming effect.`;
    case 'cache': return 'Cache +18. Same shell, denser arcs. Surplus goes to storage.';
    case 'cluster': return `+${formatGlow(spec.fuel,maxGlow)} Sparks. Surplus above your full meter goes into storage.`;
    case 'sight': return flashPowerupDescription(modifiers);
    case 'dusk': return `+${formatGlow(spec.fuel,maxGlow)} Sparks (before build bonuses), with ${percent(spec.dim)}% less Luminance for ${spec.dimDuration}s. Manual contact only.`;
    case 'dark': return `${percent(spec.dim)}% less Luminance for ${spec.dimDuration}s. Avoid contact; a Spark clears one effect.`;
    default: return spec.description;
  }
}

/** Content for the app's native .power-sheet.pickup-guide-sheet dialog. */
export function pickupGuideMarkup({ role = 'collector', companions, maxGlow=100, modifiers, discovered = [] } = {}) {
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  const known = new Set(['light', ...(Array.isArray(discovered) ? discovered : [])]);
  const visible = Object.values(PICKUP_TYPES).filter(spec => known.has(spec.id));
  return `<section class="pickup-guide"><header class="pickup-guide-heading"><h2>PICKUP KEY</h2><span>${visible.length} FOUND</span></header><div class="pickup-guide-list">${visible.map(spec => {
    const size = spec.plasma ? 'FUEL' : spec.manualOnly ? 'CAUTION' : 'UTILITY';
    return `<article class="pickup-guide-row" data-pickup-kind="${spec.id}"><span class="pickup-guide-art" style="--pickup-art-size:40px" aria-hidden="true">${pickupArtSvg(spec.id,{className:'pickup-guide-icon'})}</span><div class="pickup-guide-copy"><div class="pickup-guide-row-title"><h3>${esc(spec.name)}</h3><small aria-label="${size.toLowerCase()}">${size}</small></div><p>${esc(effectText(spec,maxGlow,modifiers))}</p>${spec.manualOnly?'<b class="pickup-guide-manual">MANUAL CONTACT ONLY</b>':''}</div></article>`;
  }).join('')}</div><p class="pickup-guide-role">${collects?'Collector fetches eligible missed pickups when their shells touch its boundary.': 'No Collector is equipped. Touch good pickups yourself.'}${collects&&(known.has('dusk')||known.has('dark'))?' Manual-contact pickups are not fetched.':''}</p><details class="pickup-flight-effects"><summary>Proximity · skim solid terrain</summary><p class="pickup-guide-legend">Unlock Proximity to charge the small meter beside your wisp. Skim near solid terrain for 2 seconds to trigger a five-second reveal. Open sky gives no charge. The Proximity chapter can replace the reveal with 1 missing Spark per full meter, up to eight times each flight.</p></details><details class="pickup-flight-effects"><summary>Black Hole · keep your distance</summary><p class="pickup-guide-legend">A dark core steals Sparks continuously when you approach. Give it space: the closer you fly, the faster your light spirals away. It is not a pickup. Shields do not stop its drain.</p></details><p class="pickup-guide-legend"><b>STORED SPARKS</b><br>At the starting rate, 6 surplus Sparks make 1 Stored Spark for run skills. Skills and relics improve storage efficiency. Normal flights pack up to 20; Efficient Storage raises this to 30. Earnings are kept on clear; Rest recovery never creates currency.</p><p class="pickup-guide-legend">Plasma globes refill your Spark Meter. Denser arcs carry more Sparks. The white triangle trails your wisp and pulses light across the passage. A red rim warns of a cost or a hazard.</p><button class="secondary" data-action="condensation-help">How storage works</button><button class="primary pickup-guide-close" data-action="close-power">Close</button></section>`;
}

/** A short first-contact lesson; the app supplies the world highlight target. */
export function pickupLesson(kind, { role = 'collector', companions, maxGlow=100, modifiers } = {}) {
  const spec = getPickupSpec(kind);
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  let text;
  switch (spec.id) {
    case 'light':
      text = `Restores ${formatGlow(spec.fuel,maxGlow)} Sparks (before build bonuses) and clears one dimming effect. ${collects?'Touch it or let Collector fetch a missed mote.':'Touch it yourself; your companion does not fetch.'}`;
      break;
    case 'cache':
      text = `This dense plasma restores ${formatGlow(spec.fuel,maxGlow)} Sparks before bonuses and clears one dimming effect. ${collects?'Collector can fetch it if you miss.':'Move your wisp through it to collect.'}`;
      break;
    case 'cluster':
      text = `Restores ${formatGlow(spec.fuel,maxGlow)} Sparks. Keep collecting with a full meter to earn Stored Sparks; clear the passage to keep it.`;
      break;
    case 'sight':
      text = flashPowerupDescription(modifiers);
      break;
    case 'dusk':
      text = `Touch it for ${formatGlow(spec.fuel,maxGlow)} Sparks (before build bonuses), with ${percent(spec.dim)}% less Luminance for ${spec.dimDuration} seconds. It requires manual contact.`;
      break;
    case 'dark':
      text = `Touching it dims Luminance by ${percent(spec.dim)}% for ${spec.dimDuration} seconds. ${collects?'Collector ignores it; a Spark clears one effect.':'A Spark clears one effect.'}`;
      break;
    default:
      text = spec.description;
  }
  const pickup=kind?.sparkMass?{kind:spec.id,sparkMass:kind.sparkMass}:spec.id;
  return { id: spec.id, title: spec.name, visual:'pickup:'+spec.id, pickup, text, actionLabel: 'Continue' };
}
