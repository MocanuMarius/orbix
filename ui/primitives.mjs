/** Shared HTML boundary. Text and attribute values are always escaped. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

/** Action contract used by the game's delegated input handler, including SVG stops. */
export function actionAttributes(action, {id, label, pressed, disabled=false, role, tabindex}={}) {
  return [
    action == null ? '' : `data-action="${escapeHtml(action)}"`,
    id == null ? '' : `data-id="${escapeHtml(id)}"`,
    tabindex == null ? '' : `tabindex="${escapeHtml(tabindex)}"`,
    role == null ? '' : `role="${escapeHtml(role)}"`,
    label == null ? '' : `aria-label="${escapeHtml(label)}"`,
    pressed == null ? '' : `aria-pressed="${Boolean(pressed)}"`,
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');
}

/** Prefer a native button. Only markup from a trusted renderer belongs in icon/labelMarkup. */
export function actionButton(label, {action, id, className='secondary', ariaLabel, disabled=false, pressed, icon='', labelMarkup}={}) {
  return `<button type="button" class="${escapeHtml(className)}" ${actionAttributes(action,{id,label:ariaLabel,disabled,pressed})}>${icon}${labelMarkup ?? escapeHtml(label)}</button>`;
}
