import {tutorialTarget,tutorialTextMarkup,tutorialExampleMarkup} from './tutorial-context.mjs?v=upgrade-wallet-1';
import {tutorialVisualMarkup} from './tutorial-visuals.mjs?v=upgrade-wallet-1';
let coachId = 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const focusable = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

function progressInfo(progress) {
  if (progress && typeof progress === 'object') {
    const current = Number(progress.current ?? progress.step ?? progress[0]);
    const total = Number(progress.total ?? progress[1]);
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0)
      return { label: `STEP ${current} / ${total}`, first: current <= 1 };
  }
  const label = String(progress ?? '').trim();
  const pair = label.match(/(\d+)\s*(?:\/|of)\s*(\d+)/i);
  return { label: label ? pair ? `STEP ${pair[1]} / ${pair[2]}` : label : 'A LITTLE GUIDANCE',
    first: pair ? Number(pair[1]) <= 1 : typeof progress === 'number' && progress <= 1 };
}

/** A DOM spotlight only. The app decides when lesson steps advance. */
export function createTutorialCoach({ onNext, onBack, onSkip } = {}) {
  const document = globalThis.document, window = document.defaultView || globalThis.window;
  const id = `tutorial-coach-${++coachId}`;
  const root = document.createElement('div');
  root.className = 'tutorial-coach'; root.hidden = true;
  root.innerHTML = `<div class="tutorial-coach-shade" aria-hidden="true"></div>
    <div class="tutorial-coach-spotlight" aria-hidden="true"></div><svg class="coach-pointer" aria-hidden="true"><path/></svg>
    <div class="tutorial-coach-blocker coach-block-top" aria-hidden="true"></div>
    <div class="tutorial-coach-blocker coach-block-left" aria-hidden="true"></div>
    <div class="tutorial-coach-blocker coach-block-right" aria-hidden="true"></div>
    <div class="tutorial-coach-blocker coach-block-bottom" aria-hidden="true"></div>
    <div class="tutorial-coach-blocker coach-block-target" aria-hidden="true"></div>
    <section class="tutorial-coach-card" role="region" aria-labelledby="${id}-title" aria-describedby="${id}-text" tabindex="-1">
      <div class="tutorial-coach-visual" hidden></div><div class="tutorial-coach-copy"><span class="tutorial-coach-progress"></span><h2 id="${id}-title"></h2><p id="${id}-text"></p></div>
      <div class="tutorial-coach-actions"><button type="button" data-coach="back">BACK</button><button type="button" class="tutorial-coach-next" data-coach="next">NEXT</button><button type="button" data-coach="skip">SKIP</button></div>
    </section>`;
  const card = root.querySelector('.tutorial-coach-card'),pointer=root.querySelector('.coach-pointer'),pointerPath=pointer.querySelector('path');
  const spotlight = root.querySelector('.tutorial-coach-spotlight');
  const title = root.querySelector('h2'), text = root.querySelector('p');
  const progress = root.querySelector('.tutorial-coach-progress'), visual=root.querySelector('.tutorial-coach-visual');
  const back = root.querySelector('[data-coach="back"]'), next = root.querySelector('[data-coach="next"]');
  const blocks = ['top', 'left', 'right', 'bottom', 'target'].map(name => root.querySelector(`.coach-block-${name}`));
  let step = null, target = null, destroyed = false, frame = null, previousFocus = null;

  const resolveTarget = () => {
    if (!step) return null;
    const inferred=tutorialTarget(step);if(inferred){const node=[...document.querySelectorAll(inferred)].find(n=>n.getBoundingClientRect().width>0&&window.getComputedStyle(n).visibility!=='hidden');if(node)return node;}
    if (typeof step.target === 'string') {
      try { return document.querySelector(step.target); } catch { return null; }
    }
    return step.target?.nodeType === 1 && typeof step.target.getBoundingClientRect === 'function' ? step.target : null;
  };
  const place = (element, x, y, width, height) => {
    Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px` });
  };
  const visibleTarget = () => {
    if (!target?.isConnected) return null;
    const style = window.getComputedStyle(target);
    if (style.visibility === 'hidden' || style.display === 'none') return null;
    const rect = target.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  };
  const position = () => {
    frame = null;
    if (!step || destroyed || root.hidden) return;
    target = resolveTarget();
    const host = target?.closest?.('dialog[open]') || document.body;
    if (root.parentElement !== host) host.appendChild(root);
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;
    const margin = Math.min(14, width * .04), gap = 13;
    card.style.width = `${Math.min(width >= 600 ? 820 : 600, width - margin * 2)}px`;
    card.style.maxHeight = `${Math.max(100, height - margin * 2)}px`;
    const rect = visibleTarget();
    const left = rect ? clamp(rect.left, 0, width) : 0;
    const right = rect ? clamp(rect.right, 0, width) : 0;
    const top = rect ? clamp(rect.top, 0, height) : 0;
    const bottom = rect ? clamp(rect.bottom, 0, height) : 0;
    const hasTarget = Boolean(rect && right > left && bottom > top && (right-left)*(bottom-top)<width*height*.35);
    root.dataset.hasTarget = String(hasTarget);
    spotlight.hidden = !hasTarget;
    if (hasTarget) {
      place(spotlight, left - 3, top - 3, right - left + 6, bottom - top + 6);
      place(blocks[0], 0, 0, width, top);
      place(blocks[1], 0, top, left, bottom - top);
      place(blocks[2], right, top, width - right, bottom - top);
      place(blocks[3], 0, bottom, width, height - bottom);
      place(blocks[4], left, top, right - left, bottom - top);
      blocks[4].hidden = step.allowTarget === true;
    } else {
      place(blocks[0], 0, 0, width, height);
      for (let i = 1; i < blocks.length; i++) place(blocks[i], 0, 0, 0, 0);
    }
    const cardHeight = card.getBoundingClientRect().height, cardWidth = card.getBoundingClientRect().width;
    let x = (width - cardWidth) / 2, y = (height - cardHeight) / 2;
    if (hasTarget) {
      x = clamp((left + right - cardWidth) / 2, margin, width - cardWidth - margin);
      const below = height - bottom - gap - margin, above = top - gap - margin;
      if (width-right-gap-margin >= cardWidth){x=right+gap;y=clamp((top+bottom-cardHeight)/2,margin,height-cardHeight-margin);}
      else if(left-gap-margin >= cardWidth){x=left-gap-cardWidth;y=clamp((top+bottom-cardHeight)/2,margin,height-cardHeight-margin);}
      else if (below >= cardHeight) y = bottom + gap;
      else if (above >= cardHeight) y = top - gap - cardHeight;
      else {
        // On very short screens, keep the complete coach readable. Its own
        // contents can scroll; no target action is ever taken automatically.
        y = below >= above ? height - cardHeight - margin : margin;
      }
    }
    card.style.left = `${Math.round(x)}px`;
    card.style.top = `${Math.round(clamp(y, margin, Math.max(margin, height - cardHeight - margin)))}px`;
    const box=card.getBoundingClientRect(),tx=(left+right)/2,ty=(top+bottom)/2;
    pointer.hidden=!hasTarget||(tx>=box.left&&tx<=box.right&&ty>=box.top&&ty<=box.bottom);
    pointer.style.display=pointer.hidden?'none':'block';
    if(!pointer.hidden){const ax=clamp(tx,box.left+8,box.right-8),ay=clamp(ty,box.top+8,box.bottom-8),angle=Math.atan2(ty-ay,tx-ax),tipX=tx-Math.cos(angle)*10,tipY=ty-Math.sin(angle)*10;pointerPath.setAttribute('d',`M${ax} ${ay} L${tipX} ${tipY} M${tipX-9*Math.cos(angle-.5)} ${tipY-9*Math.sin(angle-.5)} L${tipX} ${tipY} L${tipX-9*Math.cos(angle+.5)} ${tipY-9*Math.sin(angle+.5)}`);}
  };
  const schedule = () => {
    if (step && !destroyed && frame == null) frame = window.requestAnimationFrame(position);
  };
  const takeFocus = element => {
    try { element?.focus({ preventScroll: true }); } catch { /* A closed target may no longer accept focus. */ }
  };
  const hide = () => {
    if (destroyed) return;
    root.hidden = true; step = null; target = null;
    if (frame != null) window.cancelAnimationFrame(frame);
    frame = null;
    if (previousFocus?.isConnected) takeFocus(previousFocus);
    previousFocus = null;
  };
  const keydown = event => {
    if (!step || root.hidden || destroyed) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (typeof onSkip === 'function') onSkip(step); else hide();
      return;
    }
    if (event.key === 'Tab') {
      const targets = step.allowTarget === true && target ? [
        ...(target.matches(focusable) ? [target] : []), ...target.querySelectorAll(focusable),
      ] : [];
      const items = [...new Set([...targets, ...card.querySelectorAll(focusable)])]
        .filter(element => element.getClientRects().length > 0 && !element.disabled);
      if (items.length) {
        const index = items.indexOf(document.activeElement);
        const nextIndex = event.shiftKey ? index <= 0 ? items.length - 1 : index - 1 : (index + 1) % items.length;
        takeFocus(items[nextIndex]);
      }
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    // Card keystrokes must never reach the flight's global Lift shortcuts.
    if (card.contains(event.target)) { event.stopPropagation(); return; }
    if (step.allowTarget === true && target?.contains(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const block = event => { event.preventDefault(); event.stopPropagation(); };
  for (const panel of blocks) {
    panel.addEventListener('pointerdown', block);
    panel.addEventListener('click', block);
    panel.addEventListener('contextmenu', block);
    panel.addEventListener('wheel', block, { passive: false });
    panel.addEventListener('touchmove', block, { passive: false });
  }
  root.addEventListener('click', event => {
    const action = event.target.closest?.('[data-coach]')?.dataset.coach;
    if (!action || !step) return;
    event.stopPropagation();
    if (action === 'next') onNext?.(step);
    else if (action === 'back') onBack?.(step);
    else if (typeof onSkip === 'function') onSkip(step);
    else hide();
  });
  // Pointer events on the coach cannot bubble into game input handlers.
  card.addEventListener('pointerdown', event => event.stopPropagation());
  document.addEventListener('keydown', keydown, true);
  window.addEventListener('resize', schedule);
  document.addEventListener('scroll', schedule, true);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);

  return {
    show(value) {
      if (destroyed || !value) return;
      const changed = !step || step.id !== value.id;
      if (!step) previousFocus = document.activeElement;
      step = { ...value };
      target = resolveTarget();
      const info = progressInfo(step.progress);
      title.textContent = String(step.title || 'Learn the way');
      text.innerHTML = tutorialTextMarkup(step.text);
      const art=tutorialVisualMarkup(step),example=tutorialExampleMarkup(step,document,target);visual.innerHTML=example+`<div class="coach-vocabulary">${art}</div>`;visual.hidden=!art&&!example;root.dataset.hasExample=String(!!example);root.dataset.hasVisual=String(!!art||!!example);
      progress.textContent = info.label;
      root.dataset.single=String(!step.progress||/STEP 1 \/ 1$/.test(info.label));
      next.textContent = String(step.actionLabel || 'NEXT');
      root.querySelector('[data-coach=skip]').textContent=step.skipLabel||'Remember & skip';
      back.disabled = typeof onBack !== 'function' || info.first;
      root.dataset.step = String(step.id || '');
      root.hidden = false;
      if (changed && target?.scrollIntoView) target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      position();
      if (changed) takeFocus(card);
      schedule();
    },
    hide,
    destroy() {
      if (destroyed) return;
      hide(); destroyed = true;
      document.removeEventListener('keydown', keydown, true);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      root.remove();
    },
    get active() { return !destroyed && !root.hidden && Boolean(step); },
  };
}
