// Decisions board. Answers: S[id] = {choice, note, at}. Stored locally and shared through the dev server's /__cardboard.
import {GROUPS, DECISIONS, NO_WORDS, CARD_TOTAL} from './decisions-data.mjs';

const KEY = 'orbix.decisions.v1';
const BY_ID = Object.fromEntries(DECISIONS.map(d => [d.id, d]));
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
let S = {};
try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v && typeof v === 'object') for (const [id, e] of Object.entries(v)) if (BY_ID[id] && e) S[id] = {choice: e.choice || null, note: String(e.note || ''), at: Number(e.at) || 0}; } catch {}
let filter = 'open';
let remoteAll = {}; // everything the server holds, for the card-board counts
window.__decisions = S;

// Wire format: decision approve (default picked, or any answer when there is no default), change (another option or a note), deny (explicit no), null (cleared).
function encode(id) {
  const e = S[id], d = BY_ID[id];
  if (!e.choice && !e.note) return {decision: null, note: '', at: e.at};
  let decision = 'change';
  if (e.choice && NO_WORDS.includes(e.choice)) decision = 'deny';
  else if (!e.note && e.choice && (!d.pick || e.choice === d.pick)) decision = 'approve';
  return {decision, note: `choice=${e.choice || ''}; ${e.note}`.slice(0, 600), at: e.at};
}
function decode(e) {
  if (!e.decision && !e.note) return {choice: null, note: '', at: Number(e.at) || 0};
  const m = /^choice=([a-z0-9-]*);? ?([\s\S]*)$/.exec(String(e.note || ''));
  return {choice: m ? m[1] || null : null, note: m ? m[2] : String(e.note || ''), at: Number(e.at) || 0};
}
const answered = id => !!(S[id] && (S[id].choice || S[id].note));
const stateOf = id => { if (!answered(id)) return 'none'; return encode(id).decision; };
const pushBody = () => { const o = {}; for (const id of Object.keys(S)) if (S[id].at) o[id] = encode(id); return o; };

let timer = 0;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} pushShared(); }
function pushShared() {
  clearTimeout(timer);
  timer = setTimeout(() => { fetch('/__cardboard', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(pushBody())}).then(r => r.ok ? r.json() : null).then(mergeShared).catch(() => {}); }, 250);
}
function mergeShared(remote) {
  if (!remote || typeof remote !== 'object') return;
  remoteAll = remote;
  const changed = [];
  for (const [id, e] of Object.entries(remote)) {
    if (!BY_ID[id] || !e || typeof e !== 'object') continue;
    const at = Number(e.at) || 0;
    if (at > (S[id]?.at || 0)) { S[id] = decode(e); changed.push(id); }
  }
  if (changed.length) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
  refreshAll(changed);
}
function pull() { return fetch('/__cardboard', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).then(mergeShared).catch(() => {}); }

function setAnswer(id, patch) {
  const e = S[id] || (S[id] = {choice: null, note: '', at: 0});
  Object.assign(e, patch); e.at = Date.now();
  save();
}

// ---- Rendering
function cardCounts() {
  const c = {approve: 0, deny: 0, change: 0};
  for (const [id, e] of Object.entries(remoteAll)) if (!id.startsWith('d-') && c[e?.decision] !== undefined) c[e.decision]++;
  c.undecided = Math.max(0, CARD_TOTAL - c.approve - c.deny - c.change);
  return c;
}
function cardHtml(d) {
  const e = S[d.id] || {choice: null, note: ''};
  const pickLabel = d.options.find(o => o.id === d.pick)?.label;
  let h = `<article class="dc-card" id="${d.id}" data-id="${d.id}" data-state="${stateOf(d.id)}"><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>`;
  if (d.counts) {
    const c = cardCounts();
    h += `<div class="dc-nums"><span class="dc-cnt" style="background:#536430;color:#fff6d8"><b>${c.approve}</b> approved</span><span class="dc-cnt" style="background:#7a2f2a;color:#fff1c5"><b>${c.deny}</b> denied</span><span class="dc-cnt"><b>${c.change}</b> change</span><span class="dc-cnt"><b>${c.undecided}</b> undecided</span></div>`;
  } else {
    h += '<div class="dc-opts">' + d.options.map(o => `<button type="button" class="dc-opt${NO_WORDS.includes(o.id) ? ' dc-no' : ''}" data-opt="${o.id}" aria-pressed="${e.choice === o.id}">${o.id === d.pick ? '<i>My pick</i>' : ''}${esc(o.label)}</button>`).join('') + '</div>';
  }
  h += '<div class="dc-acts">';
  if (d.link) h += `<a class="dc-link" href="${d.link.href}"${d.link.external ? ' target="_blank" rel="noopener"' : ''}>${esc(d.link.label)}</a>`;
  if (d.play?.piece) h += `<button type="button" class="dc-btn" data-play="${d.play.piece}">Play</button><button type="button" class="dc-btn" data-stop>Stop</button>`;
  if (d.play?.cue) h += '<button type="button" class="dc-btn" data-cue>Play cue</button>';
  if (!d.counts) {
    h += `<button type="button" class="dc-btn" data-notebtn aria-expanded="${!!e.note}">Change…</button>`;
    if (answered(d.id)) h += '<button type="button" class="dc-btn" data-clear>Clear</button>';
  }
  h += '</div>';
  if (!d.counts) h += `<textarea class="dc-note" data-note maxlength="560" placeholder="Write what you would like different"${e.note ? '' : ' hidden'} aria-label="Note for ${esc(d.title)}">${esc(e.note)}</textarea>`;
  return h + '</article>';
}
function groupOpen(g) { return DECISIONS.filter(d => d.group === g.id && !d.counts && !answered(d.id)).length; }
function groupHtml(g) {
  const items = DECISIONS.filter(d => d.group === g.id);
  const wasOpen = $(`#g-${g.id}`)?.open;
  const hasPicks = items.some(d => d.pick);
  return `<details class="dc-grp" id="g-${g.id}"${wasOpen === false ? '' : ' open'} data-g="${g.id}"><summary><span class="dc-chev"></span><span class="dc-gt"><b>${g.title}</b><small>${g.sub}</small></span><span class="dc-gopen" data-gcount></span></summary><div class="dc-gbody">${hasPicks ? `<div class="dc-gtools"><button type="button" class="dc-btn dc-main" data-accept="${g.id}">Accept all my picks in this group</button></div>` : ''}<div class="dc-items">${items.map(cardHtml).join('')}</div><p class="dc-empty" hidden>Nothing open here.</p></div></details>`;
}
function applyFilter() {
  for (const g of GROUPS) {
    const root = $(`#g-${g.id}`); if (!root) continue;
    let shown = 0;
    for (const c of root.querySelectorAll('.dc-card')) {
      const d = BY_ID[c.dataset.id];
      const hide = filter === 'open' && !d.counts && answered(d.id);
      c.hidden = hide; if (!hide) shown++;
    }
    root.querySelector('.dc-empty').hidden = shown > 0;
    const n = groupOpen(g), el = root.querySelector('[data-gcount]');
    el.textContent = g.id === 'cards' ? `${cardCounts().undecided} undecided` : n ? `${n} undecided` : 'all answered';
    el.classList.toggle('zero', g.id === 'cards' ? false : n === 0);
  }
}
function refreshBar() {
  const real = DECISIONS.filter(d => !d.counts), done = real.filter(d => answered(d.id)).length;
  $('#dc-bar').innerHTML = `<span class="dc-cnt done"><b>${done}</b> answered · <b>${real.length - done}</b> open</span><button type="button" class="dc-btn" data-f="open" aria-pressed="${filter === 'open'}">Open</button><button type="button" class="dc-btn" data-f="all" aria-pressed="${filter === 'all'}">All</button><button type="button" class="dc-btn" data-copy>Copy answers</button>`;
}
function refreshCard(id) {
  const old = document.getElementById(id); if (!old) return;
  const t = document.createElement('div'); t.innerHTML = cardHtml(BY_ID[id]);
  const fresh = t.firstElementChild;
  if (!old.hidden) fresh.hidden = false;
  old.replaceWith(fresh);
}
function refreshAll(ids) {
  const active = document.activeElement;
  const typing = active && active.matches?.('[data-note]') ? active.closest('.dc-card').dataset.id : null;
  for (const id of ids) if (id !== typing) refreshCard(id);
  const cb = document.getElementById('d-cards-board'); if (cb) refreshCard('d-cards-board');
  refreshBar(); applyFilter();
}
function render() {
  $('#dc-main').innerHTML = GROUPS.map(groupHtml).join('');
  refreshBar(); applyFilter();
}

// ---- Copy
function answersText() {
  return DECISIONS.filter(d => !d.counts).map(d => { const e = S[d.id] || {}; const lab = d.options.find(o => o.id === e.choice)?.label || e.choice || '(open)'; return `${d.id} | ${d.title} | ${lab} | ${e.note || ''}`; }).join('\n');
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'dc-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
async function copyAnswers() {
  const text = answersText();
  window.__decisionsLastCopy = text;
  try { await navigator.clipboard.writeText(text); toast('Answers copied'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Answers copied'); } catch { toast('Copy not available'); } ta.remove(); }
}

// ---- Music (inline play; the page still works if the player fails to load)
let music = null, cueCtx = null;
async function getMusic() {
  if (music) return music;
  const mod = await import('../music-two.mjs?v=music-two-2');
  const mem = (() => { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v))}; })();
  music = mod.createMusicTwo({storage: mem, listen: false, autoStart: false});
  return music;
}
async function playPiece(id) { try { const m = await getMusic(); m.setOverride(1); m.play(id); } catch { toast('Could not start the player'); } }
async function stopAudio() { try { if (music) music.stopAll(); } catch {} }
async function playCue() {
  try {
    const [score, cue] = await Promise.all([import('../music-score.mjs?v=music-two-2'), import('../lift-guide-audio.mjs?v=guide-clarity-1')]);
    cueCtx ??= new AudioContext(); cueCtx.resume();
    const out = cueCtx.createGain(); out.gain.value = 1; out.connect(cueCtx.destination);
    const t0 = cueCtx.currentTime + .05;
    for (let k = 0; k < 3; k++) {
      const wobble = 1 + (Math.random() * 2 - 1) * cue.LIFT_CUE_WOBBLE;
      cue.playLiftCue(cueCtx, out, {kind: 'soon', version: 'new', at: t0 + k * score.LIFT_PERIOD, wobble, key: 2});
      cue.playLiftCue(cueCtx, out, {kind: 'target', version: 'new', at: t0 + k * score.LIFT_PERIOD + .31, wobble, key: 2});
    }
    setTimeout(() => out.disconnect(), 6000);
  } catch { toast('Could not play the cue'); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });

// ---- Events
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const card = b.closest('.dc-card'), id = card?.dataset.id;
  if (b.dataset.opt) { const cur = S[id]?.choice; setAnswer(id, {choice: cur === b.dataset.opt ? null : b.dataset.opt}); refreshCard(id); refreshBar(); applyFilterSoon(); }
  else if (b.dataset.clear !== undefined) { setAnswer(id, {choice: null, note: ''}); refreshCard(id); refreshBar(); applyFilter(); }
  else if (b.dataset.notebtn !== undefined) { const ta = card.querySelector('[data-note]'); ta.hidden = !ta.hidden; b.setAttribute('aria-expanded', String(!ta.hidden)); if (!ta.hidden) ta.focus(); }
  else if (b.dataset.accept) {
    for (const d of DECISIONS) if (d.group === b.dataset.accept && d.pick && !answered(d.id)) { setAnswer(d.id, {choice: d.pick}); refreshCard(d.id); }
    refreshBar(); applyFilter();
  }
  else if (b.dataset.f) { filter = b.dataset.f; refreshBar(); applyFilter(); }
  else if (b.dataset.copy !== undefined) copyAnswers();
  else if (b.dataset.play) playPiece(b.dataset.play);
  else if (b.dataset.stop !== undefined) stopAudio();
  else if (b.dataset.cue !== undefined) playCue();
});
// In the Open filter, an answered card stays visible for a moment so the tap is seen, then folds away.
let hideTimer = 0;
function applyFilterSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(applyFilter, 900); const el = null; refreshHeads(); }
function refreshHeads() { for (const g of GROUPS) { const n = groupOpen(g), el = document.querySelector(`#g-${g.id} [data-gcount]`); if (el && g.id !== 'cards') { el.textContent = n ? `${n} undecided` : 'all answered'; el.classList.toggle('zero', n === 0); } } }
let noteTimer = 0;
document.addEventListener('input', e => {
  const ta = e.target.closest('[data-note]'); if (!ta) return;
  const card = ta.closest('.dc-card'), id = card.dataset.id;
  const e2 = S[id] || (S[id] = {choice: null, note: '', at: 0});
  e2.note = ta.value; e2.at = Date.now();
  clearTimeout(noteTimer); noteTimer = setTimeout(save, 300);
  card.dataset.state = stateOf(id); refreshBar(); refreshHeads();
});

render();
setTimeout(() => pull().then(() => { if (Object.keys(S).length) pushShared(); }), 300);
setInterval(() => { if (!document.hidden) pull(); }, 8000);
