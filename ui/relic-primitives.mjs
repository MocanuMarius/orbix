import {artifactRarityLabel} from '../replay-ui.mjs?v=beat-1';
import {artifactLimitSummary,effectMarkup} from '../artifact-copy.mjs?v=beat-1';
import {artifactIcon} from '../upgrade-icons.mjs?v=beat-1';
import {escapeHtml as esc,actionButton} from './primitives.mjs?v=beat-1';

// Two layout recipes share the same identity and rule decisions. Existing
// production classes remain the styling API while the surfaces migrate here.
export function relicIdentityMarkup(artifact,copy,{artifactArt=artifactIcon,context='reward',lifetime=copy.lifetime}={}) {
  const collection=context==='collection';
  const artClass=collection?`collection-inspection-art ${artifact.rarity}`:'artifact-choice-art';
  const name=collection?`<h3>${esc(artifact.name)}</h3>`:`<h2>${esc(artifact.name)}</h2>`;
  return `<header${collection?'':' class="artifact-choice-identity"'}><div class="${artClass}">${artifactArt(artifact.id)}</div><div><small>${artifactRarityLabel(artifact)}</small>${name}<span${collection?'':' class="artifact-choice-lifetime"'}>${esc(lifetime)}</span></div></header>`;
}

export function relicRulesMarkup(copy,{context='reward'}={}) {
  const collection=context==='collection';
  const trigger=copy.trigger?`<p${collection?'':' class="artifact-choice-trigger"'}>${esc(copy.trigger)}</p>`:'';
  const effect=collection?`<strong>${effectMarkup(copy.effect)}</strong>`:`<p class="artifact-choice-effect">${effectMarkup(copy.effect)}</p>`;
  const limit=copy.limit?`<p class="${collection?'collection-selected-limit':'artifact-choice-limit'}">${esc(artifactLimitSummary(copy))}</p>`:'';
  return `<div class="${collection?'collection-selected-rule':'artifact-choice-copy'}">${trigger}${effect}${limit}</div>`;
}

// sign:true draws the kit's leather plaque (a button that opens something); the default keeps the plain
// production button for screens not yet reskinned.
export function relicRulesButton(artifact,{action='reward-artifact-details',sign=false}={}) {
  return actionButton('Full rules',{className:sign?'wb-sign wb-sign-standard artifact-rules':'secondary artifact-rules',action,id:artifact.id,ariaLabel:`Full rules for ${artifact.name}`,labelMarkup:sign?'<span class="wb-sign-text"><b>Full rules</b></span>':undefined});
}
