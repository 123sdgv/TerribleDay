/* 塔罗主题：摊开一排牌背，翻牌飞进三张牌位；翻满三张就三选一。
   点牌面换一件同类的；把牌拖进中间的法阵就是选中它。
   计时用沙漏：点一下开始 / 暂停，点两下做完。
   主题按钮：右上角水晶球，点开右侧选主题。
   主题约定：导出 mount(root, app)，返回一个清理函数；app.openPicker() 打开选主题弹窗。 */
import {
  SCENES, sceneById, drawCard, swapTask, Timer,
  saveActive, loadActive, clearActive, unlockAudio, beep, chime, buzz
} from '../../core/core.js';
import { ICONS } from '../../core/icons.js';
import { draggable, snapInto } from '../../core/drag.js';

const MAX_DRAWS = 3;
const DECK_SIZE = 7;
const DOUBLE_TAP = 280;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const SYMBOLS = ['☾', '✦', '☼', '✧', '✶', '❋', '✺', '❂'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = n => (reduce ? 1 : n);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ---------- 牌背 ---------- */
const BACK = (() => {
  const c = n => n.toFixed(2);
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, r1 = 15.5, r2 = i % 2 ? 18.5 : 21.5;
    rays += `<line x1="${c(30 + Math.cos(a) * r1)}" y1="${c(48 + Math.sin(a) * r1)}" x2="${c(30 + Math.cos(a) * r2)}" y2="${c(48 + Math.sin(a) * r2)}"/>`;
  }
  const star = (x, y, s) =>
    `<path d="M${x} ${y - s}L${c(x + s * 0.28)} ${c(y - s * 0.28)}L${x + s} ${y}L${c(x + s * 0.28)} ${c(y + s * 0.28)}L${x} ${y + s}L${c(x - s * 0.28)} ${c(y + s * 0.28)}L${x - s} ${y}L${c(x - s * 0.28)} ${c(y - s * 0.28)}Z"/>`;
  return `<svg viewBox="0 0 60 96" aria-hidden="true">
    <g fill="none" stroke="#E9CF92" stroke-linecap="round">
      <rect x="3.5" y="3.5" width="53" height="89" rx="5" stroke-width=".9"/>
      <rect x="6.5" y="6.5" width="47" height="83" rx="3" stroke-width=".5" opacity=".55"/>
      <circle cx="30" cy="48" r="12.5" stroke-width=".8"/>
      <g stroke-width=".7" opacity=".85">${rays}</g>
    </g>
    <g fill="#E9CF92">
      <path d="M33.5 40.6a8 8 0 1 0 0 14.8a7.4 7.4 0 1 1 0-14.8z"/>
      ${star(30, 19, 4)}${star(30, 77, 4)}${star(14, 12.5, 1.6)}${star(46, 12.5, 1.6)}${star(14, 83.5, 1.6)}${star(46, 83.5, 1.6)}
    </g>
  </svg>`;
})();

/* ---------- 主题按钮：一颗水晶球 ---------- */
const ORB = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle class="orb-ball" cx="12" cy="10.4" r="6.8"/>
  <path class="orb-shine" d="M8.6 9.2a3.6 3.6 0 0 1 2.6-2.9"/>
  <path class="orb-spark" d="M14.4 11.1l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z"/>
  <path class="orb-stand" d="M7.6 17.4q4.4 2 8.8 0l1.1 3H6.5z"/>
</svg>`;

/* ---------- 中间的法阵：把牌拖进来就是选中 ---------- */
const SEAL = (() => {
  const at = (n, r, rot) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((rot + (i * 360) / n) * Math.PI) / 180;
      return [60 + r * Math.cos(a), 60 + r * Math.sin(a)];
    });
  const pts = list => list.map(q => q.map(v => v.toFixed(2)).join(',')).join(' ');
  let dots = '';
  at(12, 51, -90).forEach(([x, y], i) => (dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${i % 3 ? 0.9 : 1.7}"/>`));
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <g class="seal-outer">
      <circle class="ln" cx="60" cy="60" r="56"/>
      <circle class="ln thin" cx="60" cy="60" r="51" stroke-dasharray="1.5 3"/>
      <g class="dots">${dots}</g>
    </g>
    <g class="seal-inner">
      <polygon class="ln" points="${pts(at(3, 44, -90))}"/>
      <polygon class="ln" points="${pts(at(3, 44, 90))}"/>
      <circle class="ln thin" cx="60" cy="60" r="22"/>
    </g>
    <path class="moon" d="M63.5 52.6a8 8 0 1 0 0 14.8a7.4 7.4 0 1 1 0-14.8z"/>
  </svg>`;
})();

/* ---------- 沙漏 ---------- */
const GRAINS = 18;
const GLASS_PATH = 'M26 16C26 62 55 84 56.5 100C55 116 26 138 26 184L94 184C94 138 65 116 63.5 100C65 84 94 62 94 16Z';
const HOURGLASS = `<svg viewBox="0 0 120 200" aria-hidden="true">
  <defs>
    <clipPath id="hg-clip"><path d="${GLASS_PATH}"/></clipPath>
    <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7E2AE"/><stop offset="1" stop-color="#EDB0CB"/>
    </linearGradient>
    <linearGradient id="hg-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#C9A45C"/><stop offset=".5" stop-color="#F4DFAA"/><stop offset="1" stop-color="#C9A45C"/>
    </linearGradient>
    <pattern id="hg-speck" width="7" height="6" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r=".34" fill="#FFFFFF" opacity=".3"/>
      <circle cx="4.6" cy="2.2" r=".3" fill="#B5809F" opacity=".26"/>
      <circle cx="2.4" cy="4.4" r=".26" fill="#FFFFFF" opacity=".22"/>
      <circle cx="6" cy="5.2" r=".3" fill="#B5809F" opacity=".22"/>
    </pattern>
    <radialGradient id="hg-glass" cx=".5" cy=".5" r=".6">
      <stop offset="0" stop-color="#C8B8F4" stop-opacity=".16"/><stop offset="1" stop-color="#C8B8F4" stop-opacity=".04"/>
    </radialGradient>
  </defs>
  <rect x="17" y="14" width="2.2" height="172" rx="1.1" fill="url(#hg-gold)" opacity=".8"/>
  <rect x="100.8" y="14" width="2.2" height="172" rx="1.1" fill="url(#hg-gold)" opacity=".8"/>
  <path d="${GLASS_PATH}" fill="url(#hg-glass)"/>
  <g class="sand" clip-path="url(#hg-clip)">
    <path class="st" fill="url(#hg-sand)"/><path class="st" fill="url(#hg-speck)"/>
    <path class="sb" fill="url(#hg-sand)"/><path class="sb" fill="url(#hg-speck)"/>
    <line class="stream-glow" x1="60" y1="100" x2="60" y2="180"/>
    <line class="stream" x1="60" y1="100" x2="60" y2="180"/>
    <g class="grains">${'<circle r="0" opacity="0"/>'.repeat(GRAINS)}</g>
  </g>
  <path d="${GLASS_PATH}" fill="none" stroke="#C8B8F4" stroke-opacity=".7" stroke-width="1.3"/>
  <path d="M33 26C34 52 46 72 52.5 88M33 174C34 150 44 130 50.5 116" fill="none" stroke="#FFF" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="12" y="6" width="96" height="11" rx="5.5" fill="url(#hg-gold)"/>
  <rect x="12" y="183" width="96" height="11" rx="5.5" fill="url(#hg-gold)"/>
</svg>`;

function fmt(t) {
  const s = Math.ceil(t / 1000), m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

/* 小星星迸出来 */
const SPARK_COLORS = ['#F4DFAA', '#C8B8F4', '#F0B6CE'];
function burst(target, n = 10, spread = 70) {
  if (reduce) return;
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = el('span', 'spark', i % 2 ? '✦' : '✧');
    s.style.color = SPARK_COLORS[i % 3];
    s.style.fontSize = (9 + Math.random() * 9).toFixed(0) + 'px';
    document.body.append(s);
    const a = Math.random() * Math.PI * 2, d = spread * (0.5 + Math.random() * 0.8);
    s.animate(
      [
        { transform: `translate(${cx}px,${cy}px) translate(-50%,-50%) scale(.3)`, opacity: 1 },
        { transform: `translate(${cx + Math.cos(a) * d}px,${cy + Math.sin(a) * d}px) translate(-50%,-50%) scale(1) rotate(90deg)`, opacity: 0 }
      ],
      { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' }
    ).onfinish = () => s.remove();
  }
}

function makeSky() {
  const sky = el('div', 'sky');
  sky.setAttribute('aria-hidden', 'true');
  sky.append(el('div', 'nebula n1'), el('div', 'nebula n2'));
  for (let i = 0; i < 70; i++) {
    const s = el('i', 'star');
    s.style.cssText =
      `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;` +
      `--s:${(Math.random() * 1.8 + 0.6).toFixed(1)}px;--o:${(Math.random() * 0.6 + 0.35).toFixed(2)};` +
      `--d:${(Math.random() * 3 + 2.5).toFixed(1)}s;--dl:-${(Math.random() * 5).toFixed(1)}s`;
    sky.append(s);
  }
  return sky;
}

export function mount(root, app = {}) {
  let scene = SCENES[0];
  const st = { drawn: [], sel: -1, busy: false };

  /* ---------- 骨架 ---------- */
  root.append(makeSky());
  const table = el('main', 'table');
  const nav = el('nav', 'scenes');
  nav.setAttribute('role', 'tablist');
  const sceneBtns = SCENES.map(s => {
    const b = el('button', 'scene', ICONS[s.icon]);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', s.name);
    b.addEventListener('click', () => setScene(s.id));
    nav.append(b);
    return b;
  });

  const reading = el('section', 'reading');
  const spread = el('div', 'spread');
  const slots = Array.from({ length: MAX_DRAWS }, () => spread.appendChild(el('div', 'slot')));
  const seal = el('div', 'seal', SEAL);
  reading.append(spread, seal);

  const deck = el('div', 'deck gathered');
  const top = el('header', 'top');
  const orb = el('button', 'orb', ORB);
  orb.type = 'button';
  orb.setAttribute('aria-label', '换主题');
  orb.addEventListener('click', () => app.openPicker && app.openPicker());
  top.append(nav, orb);
  table.append(top, reading, deck);
  root.append(table);

  /* ---------- 牌 ---------- */
  function cardEl(card) {
    const c = el('button', 'card');
    c.type = 'button';
    const inner = el('div', 'inner');
    const face = el('div', 'face');
    inner.append(el('div', 'back', BACK), face);
    c.append(inner);
    if (card) fillFace(c, card);
    return c;
  }
  function fillFace(c, card) {
    const sc = sceneById(card.sceneId);
    const i = Math.max(0, sc.categories.findIndex(x => x.name === card.cat));
    const face = c.querySelector('.face');
    face.innerHTML =
      '<span class="num"></span><span class="mid"><span class="sym"></span><span class="cat"></span><span class="task"></span></span><span class="min"></span>';
    face.querySelector('.num').textContent = ROMAN[i] || '';
    face.querySelector('.sym').textContent = SYMBOLS[i % SYMBOLS.length] + '︎';
    face.querySelector('.cat').textContent = card.cat;
    const task = face.querySelector('.task');
    task.textContent = card.task;
    task.hidden = card.task === card.cat;
    face.querySelector('.min').textContent = card.min + ' 分钟';
    c.setAttribute('aria-label', `${card.cat}，${card.task}，${card.min} 分钟`);
  }

  /* ---------- 牌堆 ---------- */
  function buildDeck() {
    deck.replaceChildren();
    for (let i = 0; i < DECK_SIZE; i++) {
      const c = cardEl(null);
      c.setAttribute('aria-label', '翻一张牌');
      c.style.setProperty('--jr', (Math.random() * 10 - 5).toFixed(1) + 'deg');
      c.addEventListener('click', () => draw(c));
      deck.append(c);
    }
  }
  function layoutDeck(stagger) {
    const cards = [...deck.children];
    const n = cards.length;
    const w = cards[0] ? cards[0].offsetWidth : 60;
    cards.forEach((c, i) => {
      const k = i - (n - 1) / 2;
      c.style.setProperty('--x', (k * w * 0.52).toFixed(1) + 'px');
      c.style.setProperty('--y', (k * k * 3.4).toFixed(1) + 'px');
      c.style.setProperty('--r', (k * 7.5).toFixed(1) + 'deg');
      c.style.setProperty('--dl', stagger ? i * 45 + 'ms' : '0ms');
      c.dataset.r = (k * 7.5).toFixed(1);
    });
  }
  function shuffle(first) {
    st.busy = true;
    deck.classList.remove('gone');
    deck.classList.add('gathered');
    setTimeout(() => {
      buildDeck();
      layoutDeck(true);
      void deck.offsetWidth;
      deck.classList.remove('gathered');
      setTimeout(() => {
        layoutDeck(false);
        st.busy = false;
        render();
      }, ms(DECK_SIZE * 45 + 560));
    }, ms(first ? 250 : 380));
  }

  /* ---------- 翻牌 ---------- */
  function draw(fanCard) {
    if (st.busy || st.drawn.length >= MAX_DRAWS) return;
    st.busy = true;
    const i = st.drawn.length;
    const card = drawCard(scene, st.drawn.map(d => d.card.cat));
    const c = cardEl(card);
    draggable(c, {
      enabled: () => !st.busy && canPick(c),
      target: () => seal,
      onTap: () => swap(c),
      onStart: () => seal.classList.add('live'),
      onHover: h => seal.classList.toggle('hot', h),
      onDrop: () => choose(c),
      onCancel: () => seal.classList.remove('live')
    });
    slots[i].append(c);
    slots[i].classList.add('filled');

    const from = fanCard.getBoundingClientRect();
    const to = c.getBoundingClientRect();
    const scale = fanCard.offsetWidth / c.offsetWidth;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const rot = +fanCard.dataset.r || 0;
    fanCard.remove();
    layoutDeck(false);
    st.drawn.push({ card, el: c, ready: false });
    st.sel = -1;
    render();

    c.style.zIndex = 20;
    c.animate(
      [
        { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${scale})` },
        { transform: 'translate(0,-22px) rotate(0deg) scale(1.06)', offset: 0.72 },
        { transform: 'translate(0,0) scale(1)' }
      ],
      { duration: ms(680), easing: 'cubic-bezier(.22,.9,.3,1)' }
    ).onfinish = () => {
      c.style.zIndex = '';
      c.classList.add('open');
      setTimeout(() => {
        c.classList.add('shine');
        burst(c, 10, 70);
        st.drawn[i].ready = true;
        st.sel = st.drawn.length >= MAX_DRAWS ? -1 : i;
        st.busy = false;
        if (st.drawn.length >= MAX_DRAWS) deck.classList.add('gone');
        render();
      }, ms(480));
    };
  }

  /* 没翻满三张时只有最新那张能动；翻满三张后三张都能动 */
  function canPick(c) {
    const n = st.drawn.length;
    const i = st.drawn.findIndex(d => d.el === c);
    if (i < 0 || !st.drawn[i].ready) return false;
    return n >= MAX_DRAWS || i === n - 1;
  }

  function nudge(c) {
    c.animate([{ rotate: '0deg' }, { rotate: '-3deg' }, { rotate: '3deg' }, { rotate: '-1.5deg' }, { rotate: '0deg' }], {
      duration: ms(380),
      easing: 'ease-in-out'
    });
  }

  /* 点牌面：换一件同类的 */
  function swap(c) {
    const d = st.drawn.find(x => x.el === c);
    if (!d || st.busy) return;
    const next = swapTask(d.card);
    if (next === d.card) {
      nudge(c);
      return;
    }
    st.busy = true;
    const out = c.animate([{ scale: '1 1' }, { scale: '0 1' }], { duration: ms(170), easing: 'ease-in', fill: 'forwards' });
    out.onfinish = () => {
      d.card = next;
      fillFace(c, next);
      c.classList.remove('shine');
      void c.offsetWidth;
      c.classList.add('shine');
      c.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: ms(260), easing: 'cubic-bezier(.2,1.4,.4,1)' }).onfinish = () => {
        st.busy = false;
        render();
      };
      out.cancel();
    };
  }

  /* 拖进法阵：选中这张 */
  function choose(c) {
    const d = st.drawn.find(x => x.el === c);
    if (!d) return;
    st.busy = true;
    unlockAudio();
    snapInto(c, seal, 0.9);
    seal.classList.add('taken');
    burst(seal, 14, 90);
    setTimeout(() => {
      seal.classList.remove('live', 'hot', 'taken');
      openFocus(d.card, null);
    }, ms(460));
  }

  function resetReading(first) {
    const old = st.drawn;
    st.drawn = [];
    st.sel = -1;
    old.forEach(d => {
      d.el.style.pointerEvents = 'none';
      d.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px) scale(.92)' }], {
        duration: ms(280),
        fill: 'forwards'
      }).onfinish = () => d.el.remove();
    });
    slots.forEach(s => s.classList.remove('filled'));
    shuffle(first);
    render();
  }

  function setScene(id) {
    if (st.busy) return;
    scene = sceneById(id);
    sceneBtns.forEach((b, i) => b.setAttribute('aria-selected', SCENES[i].id === scene.id));
    resetReading();
  }

  function render() {
    const n = st.drawn.length;
    st.drawn.forEach((d, i) => {
      d.el.classList.toggle('sel', i === st.sel);
      d.el.classList.toggle('dim', n < MAX_DRAWS && i !== n - 1);
    });
    seal.classList.toggle('ready', !st.busy && st.drawn.some(d => canPick(d.el)));
  }

  /* ---------- 专注页 + 沙漏 ---------- */
  const focus = el('section', 'focus');
  focus.hidden = true;
  focus.innerHTML = `
    <div class="f-tag"><span class="f-icon"></span><span class="f-cat"></span></div>
    <h2 class="f-task"></h2>
    <button class="glass" type="button" aria-label="沙漏：点一下开始或暂停，点两下做完">${HOURGLASS}</button>
    <div class="clock">
      <button class="adj" type="button" data-d="-5" aria-label="减 5 分钟">−5</button>
      <span class="time"></span>
      <button class="adj" type="button" data-d="5" aria-label="加 5 分钟">+5</button>
    </div>
    <p class="state" aria-live="polite"></p>
    <button class="quit" type="button">先不做了</button>`;
  root.append(focus);

  const q = s => focus.querySelector(s);
  const glass = q('.glass'), hg = glass.querySelector('svg');
  const sandG = hg.querySelector('.sand');
  const topPaths = hg.querySelectorAll('.st'), botPaths = hg.querySelectorAll('.sb');
  const streams = hg.querySelectorAll('.stream, .stream-glow'), stream = hg.querySelector('.stream');
  const grains = [...hg.querySelectorAll('.grains circle')].map((c, i) => ({
    c, p: i / GRAINS + Math.random() * 0.04, j: Math.random() * 2 - 1, r: (0.5 + Math.random() * 0.45).toFixed(2)
  }));
  let streamEnd = 184, grainsOn = false;
  const timeEl = q('.time'), stateEl = q('.state');
  const [minus, plus] = focus.querySelectorAll('.adj');

  let active = null, timer = null, raf = 0, last = 0, tapT = 0, flipping = false, finishing = false;

  function openFocus(card, saved) {
    active = card;
    timer = saved ? Timer.from(saved) : new Timer(card.min * 60000);
    const sc = sceneById(card.sceneId);
    q('.f-icon').innerHTML = ICONS[sc.icon];
    q('.f-cat').textContent = card.cat;
    q('.f-tag').hidden = card.cat === card.task;
    q('.f-task').textContent = card.task;
    focus.classList.remove('done', 'leaving');
    focus.hidden = false;
    table.classList.add('away');
    if (timer.check()) chime();
    renderTimer();
    saveActive(active, timer);
    if (timer.state === 'running') loop();
  }

  const f1 = n => n.toFixed(1);

  /* 上面的沙子中间陷下去一个小坑，下面堆成一座小山 */
  function drawSand(frac, running) {
    const top = 100 - 64 * Math.sqrt(frac);
    let dTop = 'M0 0Z';
    if (frac > 0.002) {
      const w = 16 + 14 * Math.sqrt(frac);
      const dip = Math.max(0, Math.min(99.5 - top, running ? 3 + 7 * (1 - frac) : 2 + 3 * (1 - frac)));
      dTop = `M0 ${f1(top)}L${f1(60 - w)} ${f1(top)}Q60 ${f1(top + dip * 2)} ${f1(60 + w)} ${f1(top)}L120 ${f1(top)}L120 101L0 101Z`;
    }
    const p = 60 * (1 - frac);
    const peak = 184 - p * 1.1;
    const dBot = p > 0.4
      ? `M0 188L120 188L120 ${f1(184 - p * 0.5)}C90 ${f1(184 - p * 0.62)} 72 ${f1(peak + p * 0.05)} 60 ${f1(peak)}` +
        `C48 ${f1(peak + p * 0.05)} 30 ${f1(184 - p * 0.62)} 0 ${f1(184 - p * 0.5)}Z`
      : 'M0 0Z';
    topPaths.forEach(x => x.setAttribute('d', dTop));
    botPaths.forEach(x => x.setAttribute('d', dBot));
    streamEnd = p > 0.4 ? peak : 184;
    streams.forEach(x => x.setAttribute('y2', f1(streamEnd)));
  }

  /* 一粒粒沙子从瓶颈落下，砸到沙堆上往两边溅开 */
  function drawGrains(now) {
    const on = !!timer && timer.state === 'running' && !flipping && !reduce;
    if (!on) {
      if (grainsOn) grains.forEach(g => g.c.setAttribute('opacity', '0'));
      grainsOn = false;
      return;
    }
    grainsOn = true;
    const t = now / 1000, y0 = 100.5, y1 = streamEnd;
    grains.forEach(g => {
      const u = (t * 1.7 + g.p) % 1;
      let x, y, o = 0.95;
      if (u < 0.86) {
        const v = u / 0.86;
        y = y0 + (y1 - y0) * v * v;
        x = 60 + g.j * 0.5 * v;
      } else {
        const v = (u - 0.86) / 0.14;
        x = 60 + g.j * (2 + 9 * v);
        y = y1 - Math.sin(Math.PI * v) * (1.5 + 2.5 * Math.abs(g.j)) + v * 1.5;
        o = 0.95 * (1 - v);
      }
      g.c.setAttribute('cx', x.toFixed(2));
      g.c.setAttribute('cy', y.toFixed(2));
      g.c.setAttribute('r', g.r);
      g.c.setAttribute('opacity', o.toFixed(2));
    });
    stream.setAttribute('stroke-width', (1 + 0.25 * Math.sin(t * 37)).toFixed(2));
  }

  function renderTimer() {
    if (timer.check()) timeUp();
    const s = timer.state;
    const frac = s === 'ready' || flipping ? 0 : timer.frac();
    drawSand(frac, s === 'running');
    glass.classList.toggle('running', s === 'running' && !flipping);
    glass.classList.toggle('paused', s === 'paused');
    glass.classList.toggle('over', s === 'over');
    const t = s === 'over' ? '00:00' : fmt(timer.left());
    if (timeEl.textContent !== t) timeEl.textContent = t;
    stateEl.textContent =
      s === 'ready' ? '点一下开始，点两下做完'
      : s === 'paused' ? '暂停中'
      : s === 'over' ? (active.stop ? '到点啦，放下手机' : '时间到')
      : active.stop ? '到点就放下' : '';
    minus.disabled = s === 'over';
    drawGrains(performance.now());
  }

  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      if (focus.hidden || !timer || timer.state !== 'running') return;
      if (now - last > 100) {
        last = now;
        renderTimer();
      }
      drawGrains(now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function timeUp() {
    chime();
    buzz([200, 100, 200]);
    saveActive(active, timer);
  }

  function toggle() {
    if (!timer || timer.state === 'over' || flipping || finishing) return;
    const fromReady = timer.state === 'ready';
    timer.toggle();
    saveActive(active, timer);
    if (fromReady && !reduce) {
      flipping = true;
      renderTimer();
      hg.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], {
        duration: 640,
        easing: 'cubic-bezier(.6,0,.3,1)'
      }).onfinish = () => {
        flipping = false;
        renderTimer();
        sandG.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 280 });
      };
    } else {
      renderTimer();
    }
    if (timer.state === 'running') loop();
  }

  function finish() {
    if (finishing) return;
    finishing = true;
    clearTimeout(tapT);
    tapT = 0;
    cancelAnimationFrame(raf);
    beep();
    buzz(30);
    clearActive();
    focus.classList.add('done');
    burst(glass, 18, 110);
    hg.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.08)', opacity: 1, offset: 0.3 },
        { transform: 'scale(.55) rotate(30deg)', opacity: 0 }
      ],
      { duration: ms(900), easing: 'ease-in-out', fill: 'forwards' }
    );
    setTimeout(closeFocus, ms(1050));
  }

  function quit() {
    if (finishing) return;
    clearTimeout(tapT);
    tapT = 0;
    cancelAnimationFrame(raf);
    clearActive();
    closeFocus();
  }

  function closeFocus() {
    focus.classList.add('leaving');
    table.classList.remove('away');
    setTimeout(() => {
      focus.hidden = true;
      focus.classList.remove('leaving', 'done');
      hg.getAnimations().forEach(a => a.cancel());
      active = timer = null;
      finishing = flipping = false;
      resetReading();
    }, ms(380));
  }

  glass.addEventListener('click', () => {
    unlockAudio();
    if (tapT) {
      clearTimeout(tapT);
      tapT = 0;
      finish();
      return;
    }
    tapT = setTimeout(() => {
      tapT = 0;
      toggle();
    }, DOUBLE_TAP);
  });
  focus.querySelectorAll('.adj').forEach(b =>
    b.addEventListener('click', () => {
      if (!timer || finishing) return;
      unlockAudio();
      timer.adjust(+b.dataset.d);
      saveActive(active, timer);
      renderTimer();
      if (timer.state === 'running') loop();
    })
  );
  q('.quit').addEventListener('click', quit);

  function onVisible() {
    if (document.hidden || focus.hidden || !timer) return;
    unlockAudio();
    renderTimer();
    if (timer.state === 'running') loop();
  }
  document.addEventListener('visibilitychange', onVisible);

  /* ---------- 开场 ---------- */
  sceneBtns.forEach((b, i) => b.setAttribute('aria-selected', SCENES[i].id === scene.id));
  resetReading(true);
  const saved = loadActive();
  if (saved) openFocus(saved.card, saved.t);

  /* 换主题时清理 */
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(tapT);
    document.removeEventListener('visibilitychange', onVisible);
    document.querySelectorAll('.spark').forEach(s => s.remove());
  };
}
