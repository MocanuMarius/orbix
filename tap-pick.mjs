// One shared "tap to pick" behaviour (owner request 2026-11-18): the first tap on a card or tile SELECTS it (it rises a few px
// with an outline, the others dim a little); a second tap on the SAME item TAKES it; tapping another item moves the selection.
// No per-item "Choose X" buttons. The "?" button and the linked words on a card never select or take (they open help).
//
// Markup: give each pickable item `data-tap-pick` (plus its normal data-action and data-* the screen already uses). Items in the
// same parent form one group. A div needs role="button" tabindex="0" (app.mjs turns Enter/Space on it into a click, so the
// keyboard behaves exactly like a tap). Disabled items carry `disabled` or aria-disabled="true" and are ignored.
// The shared look lives in ui/card-screens.css (.tp-selected, .tp-has-selection).
// Selection is kept in the DOM only, so a re-render starts again with nothing selected. Screens that keep their own selection
// (the Rest actions, the Scribe) mark the same look with the same classes through `tapPickClasses`.
const IGNORE = '[data-card-term],[data-card-term-trigger],[data-card-status-help],[data-tap-pick-ignore],a[href],input,select,textarea';
export const TAP_PICK_ITEM = '[data-tap-pick]';
export const tapPickClasses = selected => selected ? 'tp-selected' : '';
export const isTapPickSelected = item => item?.classList.contains('tp-selected') === true;
const disabled = item => item.disabled || item.getAttribute('aria-disabled') === 'true' || item.hasAttribute('data-tap-pick-disabled');
const groupOf = item => item.closest('[data-tap-pick-group]') || item.parentElement;

/** Select one item of its group (clears the rest). Returns the item. */
export function selectTapPick(item) {
  const group = groupOf(item);
  for (const other of group?.querySelectorAll(TAP_PICK_ITEM) || []) {
    const on = other === item;
    other.classList.toggle('tp-selected', on);
    other.setAttribute('aria-pressed', String(on));
  }
  group?.classList.add('tp-has-selection');
  return item;
}
export function clearTapPick(root = document) {
  for (const item of root.querySelectorAll(`${TAP_PICK_ITEM}.tp-selected`)) { item.classList.remove('tp-selected'); item.setAttribute('aria-pressed', 'false'); }
  for (const group of root.querySelectorAll('.tp-has-selection')) group.classList.remove('tp-has-selection');
}

/** Decide what a click on `item` does: 'select' the first time, 'take' on the selected item. Pure DOM state, no side effects. */
export const tapPickIntent = item => isTapPickSelected(item) ? 'take' : 'select';

/** Install once per document. The select tap is swallowed (capture phase) so the screen's own handler only sees the take tap. */
export function installTapPick(doc = document) {
  if (doc.__tapPickInstalled) return;
  doc.__tapPickInstalled = true;
  doc.addEventListener('click', event => {
    const item = event.target.closest?.(TAP_PICK_ITEM);
    if (!item || disabled(item) || event.target.closest(IGNORE)) return;
    if (tapPickIntent(item) === 'take') return; // the screen's own data-action handler takes it
    event.preventDefault();
    event.stopImmediatePropagation();
    selectTapPick(item);
    item.focus?.({preventScroll: true});
  }, true);
  // Native buttons turn Enter/Space into a click already; role="button" items get it from app.mjs.
}
