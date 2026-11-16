// Physical card effects listen to real world events; row replay never creates
// another pickup, bounce, heart-collection mark or final Flash wave.
import {getEffectiveCardSources,CARD_ROW_EVENTS} from './skill-cards.mjs?v=rowcraft-1';

const eligible = e => !!(e.cardExecution && e.running && !e.paused && e.alive && !e.finished &&
  !e.destroyed && !e.dying && !e.completing && !e.tutorial && (!e.dream || e.dream.phase === 'done'));

export function applyDirectPickupCards(e, packet, {falling = false, impulse = 205} = {}) {
  if (!eligible(e) || packet.generated || packet.deliveredByWisp || packet.fetchedInDream) return;
  const sources = getEffectiveCardSources(e.cardExecution);
  if (falling && sources.some(({def}) => def.kind === 'springboard')) {
    e.cancelLeveler(true);e.levelDive = 0;
    if (['up','down'].includes(e.fieldImpulse?.direction)) e.fieldImpulse = null;
    e.player.vy = -impulse * .5 * e.scaleY * Math.min(1.2, Math.max(.8, Number(e.mod.flap) || 1));
    e.liftGuide?.clear();e.wispWake?.lift(e);
    e.activation('card-springboard', {label:'Springboard', outcome:{bounce:1}});
    e.setEvent('Springboard · free half-Lift bounce');e.sound('flap');
  }
  e.cardHeartProgress ??= {};
  const seen = new Set();
  for (const {def,source} of sources) {
    if (def.kind !== 'heart-stitch' || seen.has(source.instanceId)) continue;
    seen.add(source.instanceId);
    if (!(e.lives < e.maxLives)) { e.cardHeartProgress[source.instanceId] = 0;continue; }
    const progress = (e.cardHeartProgress[source.instanceId] || 0) + 1;
    e.cardHeartProgress[source.instanceId] = progress < 3 ? progress : 0;
    if (progress < 3) continue;
    source.charges--;e.lives++;e.cardHeartsRestored++;
    e.cardExecution.executions++;e.cardExecutions++;
    e.burst(e.player.x,e.player.y,12,'#f0b9b3');
    e.activation('card-heart-stitch',{label:'Heart Stitch',outcome:{hearts:1}});
    e.setEvent('Heart Stitch · +1 heart');
  }
}

export function updatePrismWick(e) {
  if (!e.cardFlashExpiryPending || e.time < e.sightUntil) return;
  e.cardFlashExpiryPending = false;
  if (!eligible(e) || !getEffectiveCardSources(e.cardExecution).some(({def}) => def.kind === 'prism-wick')) return;
  const result = e.resolveCardRowEvent(CARD_ROW_EVENTS.flashExpiry,{pickupKind:'sight'});
  if (!result?.receipt.steps.some(step => step.success && step.sourceCardId === 'diving-bell')) return;
  e.radiateLight({once:true,reveal:true,color:'#f0f7ff'});
  e.activation('card-prism-wick',{label:'Prism Wick',outcome:{fuel:result.gain,waves:1}});
  e.setEvent('Prism Wick · final wave');
}
