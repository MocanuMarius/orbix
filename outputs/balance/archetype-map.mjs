// Builds the trigger/role x rarity map for docs/archetype-gaps.md.  Run: node outputs/balance/archetype-map.mjs
import {CARD_CATALOG} from '../../dist/card-catalog.mjs';
import {triggerDisplay, DISPLAY_GROUPS} from '../../dist/card-trigger-labels.mjs';
const rows = DISPLAY_GROUPS.map(g => ({key: g.group, label: g.label + (g.kind === 'role' ? ' (role)' : '')}));
rows.push({key: 'other', label: 'No chip (text gives timing: Rest, take-off, Turn, timers, On gain, Lift twice)'});
const rar = ['common', 'rare', 'legendary'];
const cells = {}, count = {};
for (const c of Object.values(CARD_CATALOG)) {
  if (c.retired) continue;
  const d = triggerDisplay(c.trigger);
  const key = d?.group && rows.some(r => r.key === d.group) ? d.group : 'other';
  const cell = (cells[key] ??= {});
  const list = (cell[c.rarity] ??= {live: [], unreleased: []});
  // Rank variants (Echo, Echo II, Echo III ...) are separate catalogue entries; keep each.
  list[c.unreleased ? 'unreleased' : 'live'].push(c.name);
}
const fmt = (l) => `${l.live.length}${l.unreleased.length ? ` (+${l.unreleased.length})` : ''}`;
let out = '| Trigger or role | Common | Rare | Legendary | Live total (unreleased) |\n| --- | --- | --- | --- | --- |\n';
const tot = {live: 0, unreleased: 0};
for (const r of rows) {
  const cell = cells[r.key] || {};
  let L = 0, U = 0;
  const parts = rar.map(x => { const l = cell[x] || {live: [], unreleased: []}; L += l.live.length; U += l.unreleased.length; return fmt(l); });
  tot.live += L; tot.unreleased += U;
  out += `| ${r.label} | ${parts.join(' | ')} | ${L}${U ? ` (+${U})` : ''} |\n`;
}
out += `| **All** | | | | **${tot.live} (+${tot.unreleased})** |\n\n`;
out += 'Card names per cell. Unreleased cards are in *italics*. A card that appears with a rank (II, III) or twice with one name is a separate catalogue entry.\n\n';
for (const r of rows) {
  const cell = cells[r.key] || {};
  out += `**${r.label}**\n\n`;
  for (const x of rar) {
    const l = cell[x]; if (!l) continue;
    const names = [...l.live, ...l.unreleased.map(n => `*${n}*`)];
    out += `- ${x[0].toUpperCase() + x.slice(1)}: ${names.join(', ')}\n`;
  }
  out += '\n';
}
console.log(out);
