// What an Inscription really does on the card in its slot, from the same rules the Chain uses (dist/skill-cards.mjs): one short true
// sentence for the card detail panel, the Scribe's write preview and the Chain tab. Menu screens only, never in flight.
//   inscriptionOnCard('kindled', card)  ->  "Kindled: no effect on this card (it only fires at Finish)"
//   inscriptionEffect('gilded', card)   ->  {works: true, text: '+2 Sparks each time it fires'}
import {getInscription} from './inscriptions.mjs?v=cards-3';
import {SKILL_CARDS, getCardRowRule, isOncePerTriggerPayout} from './skill-cards.mjs?v=cards-3';
import {getCardTrigger, getCardRuleBands} from './card-rule-bands.mjs?v=cards-3';

const ALSO = {'wave-crossing': 'a Pulse', 'downbeat-lift': 'every Lift', 'collector-delivery': 'a Delivery', 'natural-overfill': 'an Overfill', 'flash-pickup': 'a Flare Collect'};
const no = why => ({works: false, text: `no effect on this card (${why})`});
const yes = text => ({works: true, text});
const lower = s => s.replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase());

export function inscriptionEffect(inscription, card) {
  const ins = typeof inscription === 'string' ? getInscription(inscription) : inscription;
  if (!ins) return no('unknown Inscription');
  if (ins.kind === 'standalone') return ins.id === 'hollow' ? no('it works only on an empty slot') : yes(`${lower(ins.text)} Works whatever is in the slot`);
  const def = card && SKILL_CARDS[card.cardId];
  if (!def) return no('this slot is empty');
  const rule = getCardRowRule(def, card), own = getCardTrigger(def, def).label, engine = !!def.engine;
  const copier = ['echo', 'chameleon', 'chameleon-two'].includes(def.kind), boost = rule?.operation === 'multiply';
  const once = isOncePerTriggerPayout(def, rule), listens = !!rule && !boost && !once;
  if (copier) return no('it repeats the next card, so write this on that card');
  const why = engine ? `it only fires on ${own}` : once ? `it only fires at ${own}` : boost ? 'a Boost works with whatever fires' : !rule ? 'it works without firing' : '';
  // Curtain Call fires the Slot 1 card for its printed Sparks only: no Gilded, Brimful or Twin Mark on those Finish firings.
  const curtain = rule?.operation === 'fire-first-card' ? 'its Slot 1 firings pay printed Sparks only' : '';
  const effect = (getCardRuleBands(card, def).find(b => b.type === 'effect')?.text || 'its effect').replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase());
  if (ins.id === 'wellspring' && engine && def.engine.hears?.includes('overfill') && !def.engine.noRepeat) return yes(`fires 3 times on each Overfill: ${effect}`);
  switch (ins.id) {
    case 'twin-mark': return engine && def.engine.noRepeat ? no('it fires the whole Chain once per Overfill, never twice') : engine ? yes('fires twice each time it fires') : once ? no(`it pays once, at ${own}`) : !rule ? no(why) : boost ? yes('fires twice: its Boost applies twice') : yes('fires twice each time it fires');
    case 'gilded': return (engine && def.engine.does?.includes('gain')) || (rule && ['add-sparks', 'add-last-payout'].includes(rule.operation)) ? yes('each time it fires, 50%: +2 Sparks') : no(curtain || (engine || !rule ? why : 'it pays no Sparks from the Chain'));
    case 'resonant': case 'kindled': case 'courier': case 'wellspring': case 'flare': {
      if (!listens) return no(why);
      const event = ins.also, hears = e => rule.event === e || rule.alsoEvents?.includes(e), same = hears(event);
      if (same && !['kindled', 'wellspring', 'flare', 'courier'].includes(ins.id)) return no(`it already fires on ${ALSO[event]}`);
      if (ins.id === 'kindled') return yes(`also fires on every Lift: ${effect}`);
      // The card keeps its own condition on the new Trigger too (Flare Bank still needs the meter at ⅓ or less on a Delivery).
      const cond = getCardRuleBands(card, def).find(b => b.type === 'condition')?.detail, tail = cond ? ` (only with ${/^meter/.test(cond) ? 'the ' : ''}${cond})` : '';
      // Courier: a Delivery, and on a Collect a 33% chance (a roll each time). Wellspring: 3 firings per Overfill. Sunlit: also each Pulse of a Flare.
      if (ins.id === 'courier') {
        const parts = [!same && 'a Delivery', !hears('body-spark') && 'a Collect, 33%'].filter(Boolean);
        return parts.length ? yes(`also fires on ${parts.join(' and ')}: ${effect}${tail}`) : no('it already fires on a Delivery and every Collect');
      }
      if (ins.id === 'wellspring') return yes(same ? `fires 3 times on each Overfill: ${effect}${tail}` : `also fires on an Overfill, 3 times: ${effect}${tail}`);
      if (ins.id === 'flare') return yes(same ? `also fires on each Pulse of a Flare: ${effect}${tail}` : `also fires on a Flare Collect and on each Pulse of a Flare: ${effect}${tail}`);
      return yes(`also fires on ${ALSO[event]}: ${effect}${tail}`);
    }
    case 'mirror': return listens ? yes(`also fires whenever the card on its left fires: ${effect}`) : no(engine || !rule || boost ? why : `it only fires at ${own}`);
    case 'brimful': return rule && ['add-sparks', 'add-last-payout'].includes(rule.operation) && !rule.overSeconds ? yes('each Spark above the Meter becomes 2 Stored Sparks') : no(curtain || (engine || !rule ? why : 'it pays no Sparks from the Chain'));
    case 'whetted': return Number.isFinite(def.charges) ? yes('+2 uses each flight') : no('it has no uses');
    default: return yes(lower(ins.text));
  }
}

/** One sentence: "Kindled: no effect on this card (it only fires at Finish)". */
export function inscriptionOnCard(inscription, card) {
  const ins = typeof inscription === 'string' ? getInscription(inscription) : inscription;
  return ins ? `${ins.name}: ${inscriptionEffect(ins, card).text}` : '';
}
