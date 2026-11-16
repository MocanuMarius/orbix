// One delegated controller survives Deck redraws. Native buttons remain the
// keyboard/tap path; only a deliberate pointer movement starts a drag.
export function bindDeckDragging({ canEdit, getCard, onDrop, root = document }) {
  let drag = null, blockedClickUntil = 0;
  const editable = sheet => sheet?.isConnected && (sheet.tagName!=='DIALOG'||sheet.open) && (sheet.matches('[data-deck-editable="true"]')||sheet.querySelector('[data-deck-editable="true"]')) && canEdit();
  const stop = (suppress = false) => {
    const current = drag;
    if (!current) return;
    drag = null;
    if (suppress || current.active) blockedClickUntil = performance.now() + 750;
    current.observer.disconnect();
    current.source.classList.remove('card-drag-origin');
    current.sheet.classList.remove('card-dragging');
    for (const target of current.targets.keys()) target.classList.remove('card-drop-ready', 'card-drop-hover');
    current.ghost?.remove(); current.status?.remove();
    try { if (current.sheet.hasPointerCapture(current.pointerId)) current.sheet.releasePointerCapture(current.pointerId); } catch {}
  };
  const valid = current => {
    if (!editable(current.sheet) || !current.source.isConnected) return false;
    const card = getCard(current.id);
    return card && card.slot === current.fromSlot;
  };
  const targetAt = (x, y) => {
    const target = root.elementFromPoint(x, y)?.closest('[data-deck-drop]');
    return drag?.targets.has(target) ? target : null;
  };
  const describe = target => {
    if (!target) return 'Release outside a highlighted target to cancel.';
    const destination = drag.targets.get(target);
    if (destination.kind === 'return') return `${drag.name} → Deck · slot ${drag.fromSlot + 1} becomes empty`;
    const prefix = `${drag.name} → slot ${destination.slot + 1}`;
    if (!destination.name) return prefix;
    return `${prefix} · ${destination.name} → ${drag.fromSlot === null ? 'Deck' : `slot ${drag.fromSlot + 1}`}`;
  };
  const move = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!valid(drag)) { stop(true); return; }
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < (event.pointerType === 'mouse' ? 6 : 10)) return;
      drag.active = true;
      try { drag.sheet.setPointerCapture(drag.pointerId); } catch { stop(true); return; }
      drag.source.classList.add('card-drag-origin'); drag.sheet.classList.add('card-dragging');
      for (const target of drag.targets.keys()) target.classList.add('card-drop-ready');
      const ghost = root.createElement('div'); ghost.className = 'card-drag-ghost'; ghost.setAttribute('aria-hidden', 'true');
      const portrait = (drag.source.closest('[data-deck-card],.card-equipped-mount')||drag.source).querySelector('.skill-card-art');
      if (portrait) ghost.appendChild(portrait.cloneNode(true));
      const label = root.createElement('strong'); label.textContent = drag.name; ghost.appendChild(label);
      const status = root.createElement('div'); status.className = 'card-drag-feedback'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      drag.sheet.append(ghost, status); drag.ghost = ghost; drag.status = status;
    }
    event.preventDefault();
    // The portrait sits above a finger, leaving the actual drop target visible.
    const bounds = drag.sheet.getBoundingClientRect();
    drag.ghost.style.left = `${Math.min(innerWidth - 80, Math.max(4, event.clientX + 14)) - bounds.left}px`;
    drag.ghost.style.top = `${Math.max(4, event.clientY - 105) - bounds.top}px`;
    const target = targetAt(event.clientX, event.clientY);
    if (target !== drag.hover) {
      drag.hover?.classList.remove('card-drop-hover'); target?.classList.add('card-drop-hover'); drag.hover = target;
    }
    const message = describe(target);
    if (message !== drag.status.textContent) drag.status.textContent = message;
  };
  root.addEventListener('pointerdown', event => {
    if (drag) { if (event.pointerId !== drag.pointerId) event.preventDefault(); return; }
    if (!event.isPrimary || event.button !== 0) return;
    // A new deliberate gesture may click normally, even after a cancelled drag.
    blockedClickUntil = 0;
    const source = event.target.closest('[data-deck-drag-id]'), sheet = source?.closest('dialog.card-bench-sheet,[data-deck-surface="reward"]');
    if (!source || !editable(sheet)) return;
    const control = event.target.closest('[data-card-term],[data-card-term-trigger],a,summary,details,button,input,select,textarea');
    if (control && control !== source && source.contains(control)) return;
    const card = getCard(source.dataset.deckDragId); if (!card) return;
    const targets = new Map();
    for (const target of sheet.querySelectorAll('[data-deck-drop]')) {
      if (target.dataset.deckDrop === 'return') {
        if (card.slot !== null) targets.set(target, { kind: 'return' });
      } else {
        const slot = Number(target.dataset.index);
        if (slot !== card.slot) targets.set(target, { kind: 'slot', slot, expectedId: target.dataset.deckSlotId || null, name: target.dataset.deckSlotName || '' });
      }
    }
    const observer = new MutationObserver(() => { if (drag && !valid(drag)) stop(true); });
    drag = { pointerId: event.pointerId, id: card.instanceId, name: card.name, fromSlot: card.slot, source, sheet, targets, observer, x: event.clientX, y: event.clientY, active: false, hover: null };
    observer.observe(root.body, { childList: true, subtree: true });
  }, { capture: true, passive: false });
  root.addEventListener('pointermove', move, { capture: true, passive: false });
  root.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    if (!current.active) { stop(); return; }
    event.preventDefault();
    const target = targetAt(event.clientX, event.clientY), destination = current.targets.get(target), allowed = valid(current);
    stop(true);
    if (allowed && destination) onDrop({ id: current.id, fromSlot: current.fromSlot, ...destination });
  }, { capture: true, passive: false });
  root.addEventListener('pointercancel', event => { if (drag?.pointerId === event.pointerId) stop(true); }, true);
  // Touch first has implicit capture on the touched artwork. Transferring it
  // to the sheet legitimately loses that original capture; only loss by our
  // explicit owner cancels the drag.
  root.addEventListener('lostpointercapture', event => { if (drag?.active && drag.pointerId === event.pointerId && event.target === drag.sheet) stop(true); }, true);
  root.addEventListener('click', event => {
    if (drag?.active || event.detail !== 0 && performance.now() < blockedClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); blockedClickUntil = 0; }
  }, true);
  root.addEventListener('keydown', event => { if (drag && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stop(true); } }, true);
  root.addEventListener('visibilitychange', () => { if (root.hidden) stop(true); });
  window.addEventListener('blur', () => stop(true));
  return { cancel: () => stop(true) };
}
