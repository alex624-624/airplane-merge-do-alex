// Regras do jogo, hangar, arrastar-e-soltar, loja e janelas.
import {
  MAX_LEVEL, SLOT_COUNT, NAMES, TIERS, SLOT_UNLOCKS, FLIGHT_UNLOCKS, UPGRADES,
  eps, lapTime, baseCost, sellValue, tierOf, crateInterval, BOOST_MS, BOOST_COOLDOWN_MS,
  fmt, fmtRate, fmtTime, fmtAway,
} from './config.js';
import { planeURL } from './planes.js';
import { api } from './api.js';
import { makeCode, readCode } from './transfer.js';
import { sfx, isMuted, setMuted } from './audio.js';
import { Sky } from './sky.js';

const $ = (id) => document.getElementById(id);

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

const planeImg = (L, cls) => h('img', { src: planeURL(L), alt: NAMES[L], class: cls, draggable: 'false' });
const coinEl = () => h('i', { class: 'coin' });
const clampInt = (x, min, max) => {
  const n = Math.floor(Number(x));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

// ------------------------------------------------------------------ estado
let S = null;
let user = null;
let epoch = 0;
let offset = 0;        // diferença entre o relógio do servidor e o deste aparelho
let sky = null;
let dirty = false;
let saving = false;
let conflicted = false;
let crateTimer = 12;
let slowTimer = 0;
let lastT = 0;
let lastCoins = '';
let buyShown = 0;
let drag = null;
const slotEls = [];
const refreshers = new Set();
const modals = [];

const now = () => Date.now() + offset;
const mark = () => { dirty = true; };
const slotOpen = (i) => SLOT_UNLOCKS[i] <= S.best;
const openSlots = () => SLOT_UNLOCKS.filter((l) => l <= S.best).length;
const capacity = () => FLIGHT_UNLOCKS.filter((l) => l <= S.best).length;
const flying = () => S.slots.filter((p) => p && p.f);
const incomeMult = () => 1 + 0.1 * S.up.income;
const boostOn = () => now() < S.boostUntil;
const baseRate = () => flying().reduce((sum, p) => sum + eps(p.l), 0) * incomeMult();
const shopMax = () => Math.max(1, Math.min(MAX_LEVEL - 4, S.best - 4));
const price = (L) => Math.ceil(baseCost(L) * 1.07 ** (S.bought[L] || 0) * (1 - 0.02 * S.up.discount));
const firstEmpty = () => S.slots.findIndex((p, i) => !p && slotOpen(i));
const themeIdx = () => Math.min(3, Math.floor(tierOf(S.best) / 2));

// Melhor custo-benefício entre os 4 aviões mais fortes da loja
// (com leve preferência pelos de nível mais alto, que dão menos trabalho para juntar).
function bestBuy() {
  const max = shopMax();
  let best = max;
  let bestValue = Infinity;
  for (let L = max; L >= Math.max(1, max - 3); L--) {
    const value = (price(L) / 2 ** L) * 1.1 ** (max - L);
    if (value < bestValue) { bestValue = value; best = L; }
  }
  return best;
}

function freshState() {
  return {
    v: 1, coins: 200, total: 0, best: 1,
    slots: Array(SLOT_COUNT).fill(null),
    bought: {},
    up: { income: 0, offline: 0, crate: 0, discount: 0 },
    boostUntil: 0, boostReady: 0, tut: false,
  };
}

function normalize(save) {
  const s = freshState();
  if (!save || typeof save !== 'object') return s;
  s.coins = Math.max(0, +save.coins || 0);
  s.total = Math.max(0, +save.total || 0);
  s.best = clampInt(save.best, 1, MAX_LEVEL);
  if (Array.isArray(save.slots)) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const p = save.slots[i];
      if (p && p.c) s.slots[i] = { c: clampInt(p.c, 1, MAX_LEVEL) };
      else if (p && p.l) {
        s.slots[i] = { l: clampInt(p.l, 1, MAX_LEVEL), f: p.f ? 1 : 0, t: Math.min(0.999, Math.max(0, +p.t || 0)), n: clampInt(p.n, 0, 2) };
        s.best = Math.max(s.best, s.slots[i].l);
      }
    }
  }
  if (save.bought && typeof save.bought === 'object') {
    for (let L = 1; L <= MAX_LEVEL; L++) {
      const n = clampInt(save.bought[L], 0, 1e6);
      if (n) s.bought[L] = n;
    }
  }
  for (const k of Object.keys(s.up)) s.up[k] = clampInt(save.up && save.up[k], 0, 100);
  s.boostUntil = +save.boostUntil || 0;
  s.boostReady = +save.boostReady || 0;
  s.tut = !!save.tut;
  return s;
}

function snapshot() {
  return {
    v: 1, coins: S.coins, total: S.total, best: S.best,
    slots: S.slots.map((p) => (!p ? null : p.c ? { c: p.c } : { l: p.l, f: p.f ? 1 : 0, t: Math.round(p.t * 1000) / 1000, n: p.n || 0 })),
    bought: S.bought, up: S.up,
    boostUntil: S.boostUntil, boostReady: S.boostReady, tut: S.tut,
  };
}

// ------------------------------------------------------------------ avisos e janelas
function toast(text) {
  const box = $('toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const el = h('div', { class: 'toast', text });
  box.append(el);
  setTimeout(() => el.classList.add('out'), 2000);
  setTimeout(() => el.remove(), 2400);
}

function openModal({ title, content, cls = '', dismissible = true, onClose, refresh }) {
  const overlay = h('div', { class: 'overlay ' + cls });
  let closed = false;
  const ctl = {
    dismissible,
    close() {
      if (closed) return;
      closed = true;
      overlay.remove();
      if (refresh) refreshers.delete(refresh);
      const i = modals.indexOf(ctl);
      if (i >= 0) modals.splice(i, 1);
      if (onClose) onClose();
    },
  };
  overlay.append(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', null,
      h('h2', { text: title }),
      dismissible && h('button', { class: 'x', 'aria-label': 'Fechar', onclick: () => ctl.close() }, '✕')),
    h('div', { class: 'sheet-body' }, content)));
  if (dismissible) overlay.addEventListener('click', (e) => { if (e.target === overlay) ctl.close(); });
  if (refresh) refreshers.add(refresh);
  modals.push(ctl);
  $('modal-root').append(overlay);
  return ctl;
}

function confirmDialog(title, text, okLabel, onOk) {
  const m = openModal({
    title,
    cls: 'center',
    content: h('div', { class: 'msg' },
      h('p', { text }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancelar'),
        h('button', { class: 'btn danger', onclick: () => { m.close(); onOk(); } }, okLabel))),
  });
}

// ------------------------------------------------------------------ hangar
function buildHangar() {
  const hangar = $('hangar');
  hangar.replaceChildren();
  slotEls.length = 0;
  for (let i = 0; i < SLOT_COUNT; i++) {
    const el = h('div', { class: 'slot', 'data-i': i });
    slotEls.push(el);
    hangar.append(el);
  }
}

function renderSlot(i) {
  const el = slotEls[i];
  const p = S.slots[i];
  const open = slotOpen(i);
  const sig = !open ? 'L' : !p ? 'E' : p.c ? 'C' + p.c : 'P' + p.l + (p.f ? 'f' : '');
  if (el._sig === sig) return;
  el._sig = sig;
  el.className = 'slot';
  el.replaceChildren();
  if (!open) {
    el.classList.add('locked');
    el.append(h('span', { class: 'lock', text: '🔒' }), h('span', { class: 'need', text: 'Avião nv. ' + SLOT_UNLOCKS[i] }));
  } else if (!p) {
    el.classList.add('empty');
  } else if (p.c) {
    el.classList.add('crate');
    el.append(h('span', { class: 'gift', text: '🎁' }));
  } else {
    el.classList.add('has-plane');
    if (p.f) el.classList.add('flying');
    el.append(planeImg(p.l, 'plane'), h('span', { class: 'lvl', text: p.l }), p.f && h('span', { class: 'tag', text: 'em voo' }));
  }
}

function renderHangar() {
  for (let i = 0; i < SLOT_COUNT; i++) renderSlot(i);
}

function bump(i) {
  const el = slotEls[i];
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function refreshHint() {
  const cands = [];
  const nextSlot = SLOT_UNLOCKS.find((l) => l > S.best);
  const nextFly = FLIGHT_UNLOCKS.find((l) => l > S.best);
  if (nextSlot) cands.push([nextSlot, '+1 vaga']);
  if (nextFly) cands.push([nextFly, '+1 avião na rota']);
  cands.sort((a, b) => a[0] - b[0]);
  let text;
  if (cands.length) {
    const lvl = cands[0][0];
    text = `🔓 Avião nv. ${lvl}: ${cands.filter((c) => c[0] === lvl).map((c) => c[1]).join(' e ')}`;
  } else if (S.best < MAX_LEVEL) {
    text = `Próximo: nível ${S.best + 1}`;
  } else {
    text = '🏆 Coleção completa!';
  }
  $('hint').textContent = text;
}

function refreshCoins() {
  const txt = fmt(S.coins);
  if (txt !== lastCoins) {
    $('coins').textContent = txt;
    lastCoins = txt;
  }
}

function refreshSlow() {
  const boost = boostOn();
  const t = now();
  $('rate').textContent = fmtRate(baseRate() * (boost ? 2 : 1));
  $('flight-count').textContent = `✈️ ${flying().length}/${capacity()}`;

  const b = $('btn-boost');
  if (boost) {
    b.textContent = `⚡ x2 · ${fmtTime((S.boostUntil - t) / 1000)}`;
    b.className = 'boost-btn on';
  } else if (t < S.boostReady) {
    b.textContent = `⏳ ${fmtTime((S.boostReady - t) / 1000)}`;
    b.className = 'boost-btn wait';
  } else {
    b.textContent = '⚡ Turbo x2';
    b.className = 'boost-btn ready';
  }

  const L = bestBuy();
  const cost = price(L);
  if (buyShown !== L) {
    $('buy-img').src = planeURL(L);
    $('buy-name').textContent = NAMES[L];
    buyShown = L;
  }
  $('buy-price').textContent = fmt(cost);
  $('btn-buy').classList.toggle('off', S.coins < cost || firstEmpty() < 0);
  for (const fn of refreshers) fn();
}

function renderAll() {
  renderHangar();
  refreshHint();
  refreshCoins();
  refreshSlow();
}

// ------------------------------------------------------------------ ações
function addCoins(n) {
  S.coins += n;
  S.total += n;
  mark();
  refreshCoins();
}

function buy(L) {
  const cost = price(L);
  if (S.coins < cost) {
    toast('Moedas insuficientes!');
    sfx.error();
    return false;
  }
  const i = firstEmpty();
  if (i < 0) {
    toast('Hangar cheio! Junte ou venda aviões.');
    sfx.error();
    return false;
  }
  S.coins -= cost;
  S.bought[L] = (S.bought[L] || 0) + 1;
  S.slots[i] = { l: L, f: 0, t: 0, n: 0 };
  renderSlot(i);
  bump(i);
  sfx.buy();
  mark();
  refreshCoins();
  refreshSlow();
  return true;
}

function pickLane() {
  const count = [0, 0, 0];
  for (const p of flying()) count[p.n || 0] += 1;
  return count.indexOf(Math.min(...count));
}

function launch(i) {
  const p = S.slots[i];
  if (!p || p.c || p.f) return;
  if (flying().length >= capacity()) {
    toast(`Rota cheia (${capacity()}/${capacity()}). Toque num avião em voo para pousar.`);
    sfx.error();
    return;
  }
  p.n = pickLane();
  p.f = 1;
  p.t = 0;
  renderSlot(i);
  sfx.launch();
  mark();
  refreshSlow();
}

function recall(i) {
  const p = S.slots[i];
  if (!p || !p.f) return;
  p.f = 0;
  p.t = 0;
  renderSlot(i);
  bump(i);
  sfx.land();
  mark();
  refreshSlow();
}

function openCrate(i) {
  const p = S.slots[i];
  if (!p || !p.c) return;
  S.slots[i] = { l: p.c, f: 0, t: 0, n: 0 };
  renderSlot(i);
  bump(i);
  sfx.crate();
  mark();
}

function dropCrate() {
  const crates = S.slots.filter((p) => p && p.c).length;
  if (crates >= 2) return false;
  const empty = [];
  S.slots.forEach((p, i) => { if (!p && slotOpen(i)) empty.push(i); });
  if (!empty.length) return false;
  const i = empty[Math.floor(Math.random() * empty.length)];
  S.slots[i] = { c: Math.max(1, shopMax() - 2) };
  renderSlot(i);
  bump(i);
  mark();
  return true;
}

function sell(i, confirmed) {
  const p = S.slots[i];
  if (!p || p.c) return;
  if (!confirmed && p.l >= 3 && p.l >= S.best - 1) {
    confirmDialog(`Vender ${NAMES[p.l]}?`, `Esse é um dos seus melhores aviões. Você recebe ${fmt(sellValue(p.l))} moedas.`, 'Vender',
      () => { if (S.slots[i] === p) sell(i, true); });
    return;
  }
  S.slots[i] = null;
  renderSlot(i);
  addCoins(sellValue(p.l));
  sfx.sell();
  toast(`Vendido por ${fmt(sellValue(p.l))} moedas`);
  refreshSlow();
}

function dropOnSlot(i, j) {
  const a = S.slots[i];
  const b = S.slots[j];
  if (!a || a.c || !slotOpen(j)) return;
  if (!b) {
    S.slots[j] = a;
    S.slots[i] = null;
  } else if (b.c) {
    return;
  } else if (b.l === a.l) {
    if (a.l >= MAX_LEVEL) {
      toast('Esse já é o melhor avião do jogo!');
      return;
    }
    const keep = b.f ? b : a;
    S.slots[j] = { l: a.l + 1, f: a.f || b.f ? 1 : 0, t: keep.f ? keep.t : 0, n: keep.n || 0 };
    S.slots[i] = null;
    renderSlot(i);
    renderSlot(j);
    bump(j);
    sfx.merge();
    mark();
    if (a.l + 1 > S.best) onNewBest(a.l + 1);
    refreshSlow();
    return;
  } else {
    S.slots[i] = b;
    S.slots[j] = a;
  }
  renderSlot(i);
  renderSlot(j);
  mark();
}

function onNewBest(L) {
  const before = { slots: openSlots(), cap: capacity(), shop: shopMax(), theme: themeIdx() };
  S.best = L;
  const unlocks = [];
  if (openSlots() > before.slots) unlocks.push('🅿️ +1 vaga no hangar');
  if (capacity() > before.cap) unlocks.push('✈️ +1 avião na rota de voo');
  if (shopMax() > before.shop) unlocks.push(`🛒 ${NAMES[shopMax()]} liberado na loja`);
  if (themeIdx() > before.theme) unlocks.push('🌅 Novo céu desbloqueado');
  const bonus = Math.floor(baseCost(L) * 0.1);
  renderHangar();
  refreshHint();

  addCoins(bonus);
  const m = openModal({
    title: L >= MAX_LEVEL ? 'Você zerou o jogo!' : 'Novo avião!',
    cls: 'center',
    content: h('div', { class: 'celebrate' },
      h('div', { class: 'rays' }),
      planeImg(L, 'hero'),
      h('div', { class: 'tier-tag', text: `${TIERS[tierOf(L)]} · nível ${L}` }),
      h('div', { class: 'hero-name', text: NAMES[L] }),
      h('div', { class: 'hero-sub' }, coinEl(), ` ${fmtRate(eps(L) * incomeMult())}/s por avião`),
      unlocks.length ? h('ul', { class: 'unlocks' }, unlocks.map((u) => h('li', { text: u }))) : null,
      h('button', { class: 'btn big', onclick: () => m.close() }, 'Oba! +', coinEl(), ' ' + fmt(bonus))),
  });
  sfx.fanfare();
}

function useBoost() {
  const t = now();
  if (boostOn()) return toast('O turbo já está ligado!');
  if (t < S.boostReady) return toast(`Turbo recarregando: ${fmtTime((S.boostReady - t) / 1000)}`);
  S.boostUntil = t + BOOST_MS;
  S.boostReady = t + BOOST_MS + BOOST_COOLDOWN_MS;
  sfx.boost();
  toast('⚡ Turbo! Moedas em dobro por 1 minuto');
  mark();
  refreshSlow();
}

// ------------------------------------------------------------------ arrastar e soltar
function tap(i) {
  const p = S.slots[i];
  if (!p) return;
  if (p.c) openCrate(i);
  else if (p.f) recall(i);
  else launch(i);
}

function startDragVisual(p) {
  const src = slotEls[drag.i];
  const size = Math.max(56, Math.min(src.clientWidth, src.clientHeight, 120));
  const ghost = planeImg(p.l, 'drag-ghost');
  ghost.style.width = ghost.style.height = size + 'px';
  document.body.append(ghost);
  drag.ghost = ghost;
  document.body.classList.add('dragging');
  if (!p.f) document.body.classList.add('can-launch');
  src.classList.add('src');
  S.slots.forEach((q, j) => {
    if (j !== drag.i && q && !q.c && q.l === p.l && p.l < MAX_LEVEL) slotEls[j].classList.add('match');
  });
  $('trash-value').textContent = fmt(sellValue(p.l));
}

function stopDragVisual(d) {
  if (d.ghost) d.ghost.remove();
  document.body.classList.remove('dragging', 'can-launch');
  for (const el of slotEls) el.classList.remove('src', 'match', 'over');
  $('trash').classList.remove('over');
  $('sky-wrap').classList.remove('over');
}

function updateOver(x, y) {
  const el = document.elementFromPoint(x, y);
  let over = null;
  if (el) {
    const slot = el.closest('.slot');
    if (slot) over = { type: 'slot', j: +slot.dataset.i, el: slot };
    else if (el.closest('#trash')) over = { type: 'trash', el: $('trash') };
    else if (el.closest('#sky-wrap')) over = { type: 'sky', el: $('sky-wrap') };
  }
  const prev = drag.over;
  if ((prev && prev.el) !== (over && over.el)) {
    if (prev) prev.el.classList.remove('over');
    if (over) over.el.classList.add('over');
  }
  drag.over = over;
}

function bindDrag() {
  $('hangar').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag) {
      if (!e.isPrimary) return;      // segundo dedo: ignora
      stopDragVisual(drag);          // arrasto antigo que ficou preso
      drag = null;
    }
    const el = e.target.closest('.slot');
    if (!el) return;
    const i = +el.dataset.i;
    if (!S.slots[i]) return;
    e.preventDefault();
    drag = { i, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, over: null };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 10) return;
      const p = S.slots[drag.i];
      if (!p || p.c) return;
      drag.moved = true;
      startDragVisual(p);
    }
    drag.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -60%) scale(1.12)`;
    updateOver(e.clientX, e.clientY);
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) {
      if (e.type === 'pointerup') tap(d.i);
      return;
    }
    stopDragVisual(d);
    if (e.type !== 'pointerup' || !d.over) return;
    if (d.over.type === 'trash') sell(d.i);
    else if (d.over.type === 'sky') launch(d.i);
    else if (d.over.type === 'slot' && d.over.j !== d.i) dropOnSlot(d.i, d.over.j);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('blur', () => {
    if (!drag) return;
    stopDragVisual(drag);
    drag = null;
  });
}

// ------------------------------------------------------------------ loja, melhorias, álbum, ranking
function openShop() {
  const list = h('div', { class: 'list' });
  const rows = [];
  const max = shopMax();
  if (max + 5 <= MAX_LEVEL) {
    list.append(h('div', { class: 'row locked-row' },
      h('div', { class: 'thumb-wrap' }, planeImg(max + 1, 'thumb')),
      h('div', { class: 'info' },
        h('div', { class: 'name', text: NAMES[max + 1] }),
        h('div', { class: 'sub', text: `🔒 Crie um avião nível ${max + 5} para liberar` }))));
  }
  for (let L = max; L >= 1; L--) {
    const priceEl = h('span');
    const btn = h('button', { class: 'btn buy', onclick: () => { buy(L); update(); } }, coinEl(), priceEl);
    const row = h('div', { class: 'row' },
      h('div', { class: 'thumb-wrap' }, planeImg(L, 'thumb'), h('span', { class: 'lvl', text: L })),
      h('div', { class: 'info' },
        h('div', { class: 'name', text: NAMES[L] }),
        h('div', { class: 'sub', text: `+${fmtRate(eps(L) * incomeMult())}/s em voo` })),
      btn);
    rows.push({ L, row, btn, priceEl });
    list.append(row);
  }
  function update() {
    const best = bestBuy();
    const full = firstEmpty() < 0;
    for (const r of rows) {
      const cost = price(r.L);
      r.priceEl.textContent = fmt(cost);
      r.btn.classList.toggle('off', S.coins < cost || full);
      r.row.classList.toggle('best', r.L === best);
    }
  }
  update();
  openModal({ title: 'Loja de aviões', content: list, refresh: update });
}

function openUpgrades() {
  const list = h('div', { class: 'list' });
  const rows = UPGRADES.map((u) => {
    const sub = h('div', { class: 'sub' });
    const lvl = h('span', { class: 'up-lvl' });
    const priceEl = h('span');
    const btn = h('button', {
      class: 'btn buy',
      onclick: () => {
        const n = S.up[u.id];
        if (n >= u.max) return;
        const cost = Math.ceil(u.cost(n));
        if (S.coins < cost) { toast('Moedas insuficientes!'); sfx.error(); return; }
        S.coins -= cost;
        S.up[u.id] = n + 1;
        sfx.buy();
        mark();
        refreshCoins();
        refreshSlow();
      },
    }, coinEl(), priceEl);
    list.append(h('div', { class: 'row' },
      h('div', { class: 'up-ico', text: u.icon }),
      h('div', { class: 'info' }, h('div', { class: 'name' }, u.name + ' ', lvl), sub),
      btn));
    return { u, sub, lvl, btn, priceEl };
  });
  function update() {
    for (const r of rows) {
      const n = S.up[r.u.id];
      const maxed = n >= r.u.max;
      r.lvl.textContent = `nv. ${n}`;
      r.sub.textContent = maxed ? `${r.u.label}: ${r.u.val(n)} (máximo)` : `${r.u.label}: ${r.u.val(n)} → ${r.u.val(n + 1)}`;
      r.priceEl.textContent = maxed ? 'MÁX' : fmt(Math.ceil(r.u.cost(n)));
      r.btn.classList.toggle('off', maxed || S.coins < Math.ceil(r.u.cost(n)));
    }
  }
  update();
  openModal({ title: 'Melhorias', content: list, refresh: update });
}

function openAlbum() {
  const wrap = h('div', { class: 'album' });
  TIERS.forEach((name, t) => {
    wrap.append(h('h3', { text: name }));
    const grid = h('div', { class: 'album-grid' });
    for (let L = t * 5 + 1; L <= t * 5 + 5; L++) {
      const got = L <= S.best;
      grid.append(h('div', { class: 'card' + (got ? '' : ' unknown') },
        planeImg(L, 'thumb'),
        h('span', { class: 'lvl', text: L }),
        h('div', { class: 'cname', text: got ? NAMES[L] : '???' })));
    }
    wrap.append(grid);
  });
  openModal({ title: `Álbum · ${S.best}/${MAX_LEVEL}`, content: wrap });
}

function rankRow(pos, r, mine) {
  const medal = ['🥇', '🥈', '🥉'][pos - 1];
  return h('div', { class: 'row rank' + (mine ? ' mine' : '') },
    h('div', { class: 'pos', text: medal || (pos ? '#' + pos : '–') }),
    h('div', { class: 'thumb-wrap small' }, planeImg(r.best, 'thumb')),
    h('div', { class: 'info' },
      h('div', { class: 'name', text: r.name + (mine ? ' (você)' : '') }),
      h('div', { class: 'sub', text: `${NAMES[r.best]} · nv. ${r.best}` })),
    h('div', { class: 'total' }, coinEl(), ' ' + fmt(r.total)));
}

async function openRanking() {
  const box = h('div', { class: 'list' }, h('p', { class: 'muted', text: 'Carregando…' }));
  openModal({ title: api.local ? 'Ranking deste aparelho' : 'Ranking dos pilotos', content: box });
  await saveNow();
  try {
    const { top, me } = await api.ranking();
    box.replaceChildren();
    if (!top.length) box.append(h('p', { class: 'muted', text: 'Ninguém no ranking ainda.' }));
    top.forEach((r, i) => box.append(rankRow(i + 1, r, !!me && r.name === me.name)));
    if (me && !(me.rank <= top.length)) box.append(h('p', { class: 'muted', text: '· · ·' }), rankRow(me.rank, me, true));
  } catch (e) {
    box.replaceChildren(h('p', { class: 'muted', text: e.message }));
  }
}

function soundLabel() {
  return isMuted() ? '🔇 Som desligado' : '🔊 Som ligado';
}

function toggleSound() {
  setMuted(!isMuted());
  $('btn-sound').textContent = isMuted() ? '🔇' : '🔊';
  if (!isMuted()) sfx.buy();
}

function openAccount() {
  const stat = (label, value) => h('div', { class: 'stat' }, h('span', { text: label }), h('b', { text: value }));
  const soundBtn = h('button', { class: 'btn ghost', onclick: () => { toggleSound(); soundBtn.textContent = soundLabel(); } }, soundLabel());
  const m = openModal({
    title: `Olá, ${user.name}!`,
    content: h('div', { class: 'menu' },
      h('div', { class: 'stats' },
        stat('Melhor avião', `${NAMES[S.best]} (nv. ${S.best})`),
        stat('Renda', `${fmtRate(baseRate())}/s`),
        stat('Total ganho', fmt(S.total))),
      h('button', { class: 'btn ghost', onclick: () => { m.close(); showTutorial(); } }, '❓ Como jogar'),
      soundBtn,
      api.local && h('button', { class: 'btn ghost', onclick: () => { m.close(); openSendCode(); } }, '📤 Levar para outro aparelho'),
      api.local && h('button', { class: 'btn ghost', onclick: () => { m.close(); openUseCode(); } }, '📥 Trazer de outro aparelho'),
      h('button', {
        class: 'btn danger',
        onclick: async () => {
          await saveNow();
          try { await api.logout(); } catch { /* sai mesmo assim */ }
          location.reload();
        },
      }, '🚪 Sair da conta')),
  });
}

// ------------------------------------------------------------------ código de transferência
function openSendCode() {
  const code = makeCode(snapshot());
  const box = h('textarea', { class: 'code-box', readonly: true, rows: '5', 'aria-label': 'Código de transferência' });
  box.value = code;
  box.addEventListener('focus', () => box.select());
  const copy = h('button', {
    class: 'btn big',
    onclick: async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(code); ok = true; } catch { /* tenta do jeito antigo */ }
      if (!ok) {
        box.focus();
        box.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
      }
      toast(ok ? 'Código copiado!' : 'Selecione o texto e copie.');
    },
  }, '📋 Copiar código');
  openModal({
    title: 'Levar para outro aparelho',
    cls: 'center',
    content: h('div', { class: 'msg' },
      h('p', { text: 'Este código guarda todo o seu progresso de agora. Copie, mande para você mesmo (por mensagem ou e-mail) e, no outro aparelho, entre no jogo e use "Trazer de outro aparelho".' }),
      box,
      copy,
      h('p', { class: 'fine', text: 'Também serve como cópia de segurança. Quem tiver o código consegue copiar o seu progresso.' })),
  });
}

function openUseCode() {
  const box = h('textarea', { class: 'code-box', rows: '5', placeholder: 'Cole o código aqui', 'aria-label': 'Código de transferência', spellcheck: 'false', autocapitalize: 'none', autocomplete: 'off' });
  const err = h('p', { class: 'error', hidden: true, role: 'alert' });
  const m = openModal({
    title: 'Trazer de outro aparelho',
    cls: 'center',
    content: h('div', { class: 'msg' },
      h('p', { text: 'Cole o código copiado no outro aparelho. O progresso desta conta aqui será trocado pelo do código.' }),
      box,
      err,
      h('button', {
        class: 'btn big',
        onclick: () => {
          const save = readCode(box.value);
          if (!save) {
            err.textContent = 'Esse código não é válido. Copie de novo, inteiro.';
            err.hidden = false;
            return;
          }
          err.hidden = true;
          const incoming = normalize(save);
          confirmDialog('Trocar o progresso?',
            `O jogo desta conta (melhor avião: ${NAMES[S.best]}) será substituído pelo do código (melhor avião: ${NAMES[incoming.best]}).`,
            'Trocar', async () => {
              m.close();
              S = incoming;
              await saveNow();
              location.reload();
            });
        },
      }, 'Usar este código')),
  });
}

function showTutorial() {
  const steps = [
    ['🛒', 'Compre aviões', 'Use suas moedas no botão verde para colocar aviões no hangar.'],
    ['✈️', 'Decole', 'Toque num avião (ou arraste até o céu) para ele voar. Cada volta completa rende moedas!'],
    ['✨', 'Junte iguais', 'Arraste um avião para cima de outro igual: os dois viram um avião melhor.'],
    ['🎁', 'Presentes e turbo', 'Abra os presentes que caem no hangar e ligue o ⚡ Turbo para ganhar em dobro.'],
  ];
  const m = openModal({
    title: 'Como jogar',
    cls: 'center',
    onClose: () => { if (!S.tut) { S.tut = true; mark(); } },
    content: h('div', { class: 'tutorial' },
      steps.map(([ico, title, text]) => h('div', { class: 'step' },
        h('div', { class: 'step-ico', text: ico }),
        h('div', null, h('b', { text: title }), h('p', { text })))),
      h('button', { class: 'btn big', onclick: () => m.close() }, 'Bora voar!')),
  });
}

function offlineReward(awaySec) {
  const capSec = (2 + S.up.offline) * 3600;
  const gain = Math.floor(baseRate() * Math.min(awaySec, capSec) * 0.5);
  if (gain <= 0) return;
  addCoins(gain); // já entra na conta; a janela só avisa
  const m = openModal({
    title: 'Bem-vindo de volta!',
    cls: 'center',
    content: h('div', { class: 'celebrate' },
      h('div', { class: 'big-emoji', text: '🌙' }),
      h('p', { text: `Você ficou fora por ${fmtAway(awaySec)}. Enquanto isso, seus aviões ganharam:` }),
      h('div', { class: 'hero-name' }, coinEl(), ' ' + fmt(gain)),
      awaySec > capSec ? h('p', { class: 'muted', text: `Limite de ${2 + S.up.offline}h — aumente com o Piloto automático.` }) : null,
      h('button', { class: 'btn big', onclick: () => m.close() }, 'Oba!')),
  });
}

// ------------------------------------------------------------------ salvar
function netOk(ok) {
  $('net-warn').hidden = ok;
}

function showConflict() {
  if (conflicted) return;
  conflicted = true;
  openModal({
    title: 'Jogo aberto em outro lugar',
    cls: 'center',
    dismissible: false,
    content: h('div', { class: 'msg' },
      h('p', { text: 'Sua conta foi aberta em outro aparelho ou em outra aba. Para continuar jogando aqui, recarregue o jogo.' }),
      h('button', { class: 'btn big', onclick: () => location.reload() }, 'Jogar aqui')),
  });
}

async function saveNow() {
  if (conflicted || saving) return;
  saving = true;
  dirty = false;
  try {
    const r = await api.save(epoch, snapshot());
    if (r && r.epoch) epoch = r.epoch;
    netOk(true);
  } catch (e) {
    if (e.status === 409) showConflict();
    else if (e.status === 401) location.reload();
    else { dirty = true; netOk(false); }
  } finally {
    saving = false;
  }
}

function flush() {
  if (conflicted || !dirty) return;
  if (api.beacon(epoch, snapshot())) dirty = false;
}

// ------------------------------------------------------------------ laço principal
function advance(dt) {
  const boost = boostOn() ? 2 : 1;
  const mult = incomeMult();
  const quiet = dt > 0.5 || document.hidden;
  let gained = 0;
  for (const p of S.slots) {
    if (!p || !p.f) continue;
    const lap = lapTime(p.l);
    p.t += (dt * boost) / lap;
    if (p.t >= 1) {
      const laps = Math.floor(p.t);
      p.t -= laps;
      const g = laps * eps(p.l) * lap * mult;
      gained += g;
      if (!quiet) sky.pop(p, g);
    }
  }
  if (gained) {
    S.coins += gained;
    S.total += gained;
    mark();
    if (!quiet) sfx.coin();
  }

  crateTimer -= dt;
  if (crateTimer <= 0) crateTimer = dropCrate() ? crateInterval(S.up.crate) : 3;

  refreshCoins();
  slowTimer += dt;
  if (slowTimer >= 0.25) {
    slowTimer = 0;
    refreshSlow();
  }
}

function step() {
  const t = performance.now();
  const dt = Math.min(3600, (t - lastT) / 1000);
  lastT = t;
  if (dt > 0) advance(dt);
}

function frame() {
  step();
  sky.draw();
  requestAnimationFrame(frame);
}

function bindUI() {
  $('btn-buy').addEventListener('click', () => buy(bestBuy()));
  $('btn-boost').addEventListener('click', useBoost);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-account').addEventListener('click', openAccount);
  const openers = { shop: openShop, upgrades: openUpgrades, album: openAlbum, ranking: openRanking };
  document.querySelectorAll('.nav [data-open]').forEach((b) => b.addEventListener('click', () => openers[b.dataset.open]()));
  $('game').addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const top = modals[modals.length - 1];
      if (top && top.dismissible) top.close();
    } else if ((e.key === ' ' || e.key === 'b' || e.key === 'B') && !modals.length && !e.repeat) {
      const focused = document.activeElement && document.activeElement.tagName;
      if (e.key === ' ' && (focused === 'BUTTON' || focused === 'INPUT')) return;
      e.preventDefault();
      buy(bestBuy());
    }
  });
  bindDrag();
}

export function startGame(account, data) {
  user = data.user || account;
  epoch = data.epoch;
  offset = data.now - Date.now();
  S = normalize(data.save);

  $('acc-name').textContent = user.name;
  $('acc-avatar').textContent = user.name.slice(0, 1).toUpperCase();
  $('btn-sound').textContent = isMuted() ? '🔇' : '🔊';

  buildHangar();
  bindUI();
  sky = new Sky($('sky'), { planes: flying, theme: themeIdx, boosted: boostOn });
  renderAll();

  if (data.save && data.savedAt) {
    const away = (data.now - data.savedAt) / 1000;
    if (away > 60) offlineReward(away);
  }
  if (!S.tut) showTutorial();

  dirty = true; // garante o primeiro save (entra no ranking)
  lastT = performance.now();
  requestAnimationFrame(frame);
  setInterval(step, 1000);
  setInterval(() => { if (dirty) saveNow(); }, api.saveEvery || 8000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
}
