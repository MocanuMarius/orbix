import {formatGlow} from './vitality.mjs?v=skills-cards-1';
import { PICKUP_TYPES, getPickupSpec, flashPowerupDescription } from './pickups.mjs?v=skills-cards-1';
import { pickupArtSvg } from './pickup-art.mjs?v=skills-cards-1';
import { normalizeCompanionRole, normalizeCompanionFleet } from './companion-abilities.mjs?v=skills-cards-1';
import {sparkMass} from './spark-size.mjs?v=skills-cards-1';
import {pickupHandlingCue} from './pickup-handling-cue.mjs?v=skills-cards-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Math.round((Number(value) || 0) * 100);

function handlingStatus(packet,modifiers,collects){
  const cue=pickupHandlingCue(packet,modifiers,{collector:collects});
  if(cue==='collector')return {cue,label:'Collector can fetch',detail:'Mint hooks: Collector can fetch this type. Recovery changes its reach, not this ability.'};
  if(cue==='danger')return {cue,label:'Caution · body contact only',detail:'Red rim: a cost or danger. Collector leaves it alone.'};
  const spec=getPickupSpec(packet),unlock=collects&&sparkMass(packet)>2?'Cache Handling':collects&&spec.id==='sight'?'Flash Handling':null;
  return {cue:'body',label:unlock?`Touch with your wisp · needs ${unlock}`:'Touch with your main wisp',detail:`Ivory wisp mark: touch with your main wisp.${unlock?` ${unlock} unlocks Collector fetching for this type.`:''}`};
}

function handlingMark(cue){
  if(cue==='danger')return '';
  const shape=cue==='collector'?'<path d="M2 3h3v1H3v4h2v1H2Zm8 0h3v6h-3V8h2V4h-2Z"/>':'<path d="M7 2h3v1h1v3h-1v1H8v1H6v1H4V8h1V7h1V6H5V3h2Z"/>';
  return `<svg class="pickup-handling-mark ${cue}" viewBox="0 0 16 12" aria-hidden="true" shape-rendering="crispEdges">${shape}</svg>`;
}

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
export function pickupGuideMarkup({ role = 'collector', companions, maxGlow=100, modifiers, cardPilot=false, discovered = [] } = {}) {
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  const known = new Set(['light','cluster','cache','sight', ...(Array.isArray(discovered) ? discovered : [])]);
  const visible = Object.values(PICKUP_TYPES).filter(spec => known.has(spec.id));
  return `<section class="pickup-guide"><header class="pickup-guide-heading"><h2>PICKUP KEY</h2><span>CURRENT BUILD</span><button type="button" class="pickup-key-close" data-action="close-power" aria-label="Close Pickup Key">×</button></header><div class="pickup-guide-list">${visible.map(spec => {
    const size = spec.plasma ? 'FUEL' : spec.manualOnly ? 'CAUTION' : 'UTILITY';
    const handling=handlingStatus({kind:spec.id},modifiers,collects);
    return `<article class="pickup-guide-row" data-pickup-kind="${spec.id}"><span class="pickup-guide-art" style="--pickup-art-size:40px" aria-hidden="true">${pickupArtSvg(spec.id,{className:'pickup-guide-icon'})}${handlingMark(handling.cue)}</span><div class="pickup-guide-copy"><div class="pickup-guide-row-title"><h3>${esc(spec.name)}</h3><small aria-label="${size.toLowerCase()}">${size}</small></div><p>${esc(effectText(spec,maxGlow,modifiers))}</p><b class="pickup-guide-handling ${handling.cue}">${handlingMark(handling.cue)}${esc(handling.label)}</b></div></article>`;
  }).join('')}</div><p class="pickup-guide-role">${collects?'Mint twin hooks = Collector can fetch this type. Ivory wisp = touch with your main wisp. Recovery changes the green boundary’s reach; it does not unlock a pickup type.':'No Collector is equipped. Ivory wisp marks mean touch with your main wisp.'}</p><details class="pickup-flight-effects"><summary>Proximity · skim solid terrain</summary><p class="pickup-guide-legend">Unlock Proximity to charge the small meter beside your wisp. Skim near solid terrain for 2 seconds to trigger a five-second reveal. Open sky gives no charge.${cardPilot?'':' The Proximity chapter can replace the reveal with 1 missing Spark per full meter, up to eight times each flight.'}</p></details><details class="pickup-flight-effects"><summary>Black Hole · keep your distance</summary><p class="pickup-guide-legend">A dark core steals Sparks continuously when you approach. Give it space: the closer you fly, the faster your light spirals away. It is not a pickup. Shields do not stop its drain.</p></details><p class="pickup-guide-legend"><b>STORED SPARKS</b><br>At the starting rate, 6 surplus Sparks make 1 Stored Spark.${cardPilot?'':' Skills and relics improve storage efficiency. Normal flights pack up to 20; Efficient Storage raises this to 30.'} Earnings are kept on clear; Rest recovery never creates currency.</p><p class="pickup-guide-legend">Plasma globes refill your Spark Meter. Denser arcs carry more Sparks. The white triangle trails your wisp and pulses light across the passage. A red rim warns of a cost or a hazard.</p><button class="secondary" data-action="condensation-help">How storage works</button><button class="primary pickup-guide-close" data-action="close-power">Close</button></section>`;
}

/** A short first-contact lesson; the app supplies the world highlight target. */
export function pickupLesson(kind, { role = 'collector', companions, maxGlow=100, modifiers } = {}) {
  const spec = getPickupSpec(kind);
  role = normalizeCompanionRole(role);
  const roles=normalizeCompanionFleet(companions,role),collects=roles.includes('collector');
  let text;
  switch (spec.id) {
    case 'light':
      text = `Restores ${formatGlow(spec.fuel,maxGlow)} Sparks (before build bonuses) and clears one dimming effect. Touch it yourself for an immediate refill.`;
      break;
    case 'cache':
      text = `This dense plasma restores ${formatGlow(spec.fuel,maxGlow)} Sparks before bonuses and clears one dimming effect.`;
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
  if(!spec.manualOnly)text+=' '+handlingStatus(typeof pickup==='string'?{kind:pickup}:pickup,modifiers,collects).detail;
  return { id: spec.id, title: spec.name, visual:'pickup:'+spec.id, pickup, text, actionLabel: 'Continue' };
}
