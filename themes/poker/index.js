/* 扑克主题：绿绒布牌桌。
   点牌堆 → 随机来一种花切 → 甩出一张背面朝上的牌 → 点它翻开（出牌）。
   最多发三张，三张都翻开后三选一。
   计时用扑克比赛那种计时屏：点一下开始 / 暂停，点两下做完。
   右上角一枚筹码打开选主题。
   主题约定：导出 mount(root, app)，返回一个清理函数；app.openPicker() 打开选主题弹窗。 */
import {
  SCENES, sceneById, drawCard, canSwap, swapTask, Timer,
  saveActive, loadActive, clearActive, unlockAudio, beep, chime, buzz
} from '../../core/core.js';
import { RED, suitSvg, chipSvg, buildClock } from './art.js';
import { FLOURISHES, place, move, rest, wait, ms, reduce } from './flourish.js';
import { sfx } from './sfx.js';

const MAX_DRAWS = 3;
const DECK_SIZE = 18;
const DOUBLE_TAP = 280;
const MAX_MIN = 95;
const BAR = 24;
/* 四个场景对应四种花色 */
const SUIT_OF = { anywhere: 'diamond', library: 'spade', dorm: 'heart', lazy: 'club' };
/* 分类在场景里排第几，牌面就是几 */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function btn(cls, html, label) {
  const b = el('button', cls, html);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  return b;
}
function fmt(t) {
  const s = Math.min(99 * 60 + 59, Math.ceil(t / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* 做完时迸出来的小花色 */
function confetti(target, n = 24) {
  if (reduce) return;
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const kinds = ['spade', 'heart', 'diamond', 'club'];
  for (let i = 0; i < n; i++) {
    const k = kinds[i % 4];
    const s = el('span', 'confetti ' + (RED[k] ? 'red' : 'pale'), suitSvg(k));
    s.style.setProperty('--cs', (10 + Math.random() * 10).toFixed(0) + 'px');
    document.body.append(s);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const v = 110 + Math.random() * 130;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v, fall = 150 + Math.random() * 140;
    const rot = Math.random() * 720 - 360;
    s.animate(
      [
        { transform: `translate(${cx}px,${cy}px) translate(-50%,-50%) scale(.3)`, opacity: 1 },
        { transform: `translate(${cx + dx * 0.8}px,${cy + dy * 0.8}px) translate(-50%,-50%) scale(1) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${cx + dx}px,${cy + dy + fall}px) translate(-50%,-50%) scale(.9) rotate(${rot}deg)`, opacity: 0 }
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }
    ).onfinish = () => s.remove();
  }
}

export function mount(root, app = {}) {
  let scene = SCENES[0];
  let deck = [];
  let lastTrick = '';
  const st = { dealt: [], sel: -1, busy: false };
  const suitOf = id => SUIT_OF[id] || 'spade';

  root.append(el('div', 'felt'));
  const table = el('main', 'table');

  /* ---------- 顶部：四种花色 = 四个场景，右边一枚筹码换主题 ---------- */
  const top = el('header', 'top');
  const nav = el('nav', 'suits');
  nav.setAttribute('role', 'tablist');
  const tabs = SCENES.map(s => {
    const k = suitOf(s.id);
    const b = btn('suit-tab ' + (RED[k] ? 'red' : 'black'), suitSvg(k), s.name);
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => setScene(s.id));
    nav.append(b);
    return b;
  });
  const chip = btn('chip', chipSvg('#C8323A', '#F7F1E3'), '换主题');
  chip.addEventListener('click', () => {
    if (st.busy) return;
    unlockAudio();
    sfx.chip();
    if (app.openPicker) app.openPicker();
  });
  top.append(nav, chip);

  /* ---------- 中间：三个牌位、提示、按钮 ---------- */
  const reading = el('section', 'reading');
  const spread = el('div', 'spread');
  const slots = Array.from({ length: MAX_DRAWS }, () => spread.appendChild(el('div', 'slot', '<span class="ghost"></span>')));
  const hint = el('p', 'hint');
  hint.setAttribute('aria-live', 'polite');
  const acts = el('div', 'acts');
  const goBtn = btn('go', '就它');
  const swapBtn = btn('swap', '换一件');
  goBtn.addEventListener('click', go);
  swapBtn.addEventListener('click', swap);
  acts.append(goBtn, swapBtn);
  reading.append(spread, hint, acts);

  /* ---------- 下面：牌堆 ---------- */
  const stage = el('div', 'stage');
  const deckBtn = btn('deck-btn', '', '发牌');
  deckBtn.addEventListener('click', deal);
  stage.append(el('div', 'deck-shadow'), deckBtn);

  table.append(top, reading, stage);
  root.append(table);

  function cardSize() {
    const c = deck[0];
    return c ? [c.offsetWidth, c.offsetHeight] : [70, 98];
  }
  function fillDeck() {
    while (deck.length < DECK_SIZE) {
      const c = el('div', 'dk');
      stage.insertBefore(c, deckBtn);
      place(c, rest(deck.length));
      c.style.zIndex = deck.length;
      deck.push(c);
    }
  }

  /* ---------- 牌 ---------- */
  function slotCard(card) {
    const c = btn('pc', '<div class="inner"><div class="pc-back"></div><div class="pc-face"></div></div>');
    fillFace(c, card);
    return c;
  }
  function fillFace(c, card) {
    const sc = sceneById(card.sceneId);
    const k = suitOf(sc.id);
    const i = Math.max(0, sc.categories.findIndex(x => x.name === card.cat));
    const rank = RANKS[i] || 'A';
    const face = c.querySelector('.pc-face');
    face.className = 'pc-face ' + (RED[k] ? 'red' : 'black');
    const idx = `<b>${rank}</b>${suitSvg(k)}`;
    face.innerHTML =
      `<span class="idx tl">${idx}</span><span class="pip">${suitSvg(k)}</span>` +
      '<span class="mid"><span class="cat"></span><span class="task"></span><span class="min"></span></span>' +
      `<span class="idx br">${idx}</span>`;
    face.querySelector('.cat').textContent = card.cat;
    const task = face.querySelector('.task');
    task.textContent = card.task;
    task.hidden = card.task === card.cat;
    face.querySelector('.min').textContent = card.min + ' 分钟';
    c._label = `${rank}，${card.cat}，${card.task}，${card.min} 分钟`;
    if (c.classList.contains('open')) c.setAttribute('aria-label', c._label);
  }
  function glint(c) {
    c.classList.remove('shine');
    void c.offsetWidth;
    c.classList.add('shine');
  }
  function nudge(c) {
    sfx.tap(0.35);
    c.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(0)' }],
      { duration: ms(380), easing: 'ease-in-out' }
    );
  }

  /* ---------- 发牌：随机一种花切，然后甩出一张 ---------- */
  async function deal() {
    const n = st.dealt.length;
    const lastD = st.dealt[n - 1];
    if (st.busy || n >= MAX_DRAWS) return;
    if (lastD && !lastD.open) {
      nudge(lastD.el);
      return;
    }
    unlockAudio();
    st.busy = true;
    st.sel = -1;
    const keys = Object.keys(FLOURISHES).filter(k => k !== lastTrick);
    const trick = keys[Math.floor(Math.random() * keys.length)];
    lastTrick = trick;
    hint.textContent = FLOURISHES[trick].name;
    render();
    const [W, H] = cardSize();
    deck = await FLOURISHES[trick].run(deck, W, H);
    await throwCard(W);
    st.busy = false;
    render();
  }

  async function throwCard(W) {
    const i = st.dealt.length;
    const card = drawCard(scene, st.dealt.map(d => d.card.cat));
    const topCard = deck.pop();
    /* 拇指先把最上面那张推出来一点 */
    await move(topCard, { ...rest(deck.length), x: W * 0.24, y: -8, r: -6 }, { duration: 160, easing: 'cubic-bezier(.3,.7,.3,1)' });

    const c = slotCard(card);
    c.setAttribute('aria-label', '翻开这张牌');
    c.addEventListener('click', () => onCard(c));
    slots[i].append(c);
    slots[i].classList.add('filled');
    const from = topCard.getBoundingClientRect();
    const to = c.getBoundingClientRect();
    const s0 = topCard.offsetWidth / c.offsetWidth;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    topCard.remove();
    st.dealt.push({ card, el: c, open: false });

    sfx.flick();
    c.classList.add('flying');
    const sm = ((s0 + 1) / 2) * 1.14;
    await c
      .animate(
        [
          { transform: `translate(${dx}px,${dy}px) rotate(-366deg) scale(${s0})` },
          { transform: `translate(${dx * 0.42}px,${dy * 0.42 - 30}px) rotate(-150deg) scale(${sm})`, offset: 0.45 },
          { transform: 'translate(0,0) rotate(-4deg) scale(1.035)', offset: 0.86 },
          { transform: 'translate(0,0) rotate(0deg) scale(1)' }
        ],
        { duration: ms(660), easing: 'cubic-bezier(.22,.7,.3,1)' }
      )
      .finished.catch(() => {});
    c.classList.remove('flying');
    sfx.tap(0.8);
    if (st.dealt.length >= MAX_DRAWS) stage.classList.add('gone');
  }

  /* ---------- 出牌：点背面朝上的牌翻开；翻开的牌点一下选中 ---------- */
  function onCard(c) {
    if (st.busy) return;
    const i = st.dealt.findIndex(d => d.el === c);
    const d = st.dealt[i];
    if (!d) return;
    const n = st.dealt.length;
    if (!d.open) {
      flip(d);
      return;
    }
    if (n < MAX_DRAWS && i !== n - 1) return;
    if (st.sel !== i) sfx.tap(0.4);
    st.sel = i;
    render();
  }

  function flip(d) {
    unlockAudio();
    d.open = true;
    st.busy = true;
    render();
    sfx.flip();
    d.el.classList.add('open');
    d.el.setAttribute('aria-label', d.el._label);
    d.el.animate(
      [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(1.07)', offset: 0.45 }, { transform: 'translateY(-6px) scale(1)' }],
      { duration: ms(620), easing: 'cubic-bezier(.3,.7,.3,1)' }
    );
    setTimeout(() => glint(d.el), ms(420));
    setTimeout(() => {
      st.sel = st.dealt.indexOf(d);
      st.busy = false;
      render();
    }, ms(640));
  }

  /* 换一件：牌翻回去，换个同分类的，再翻开 */
  async function swap() {
    const d = st.dealt[st.sel];
    if (!d || st.busy) return;
    const next = swapTask(d.card);
    if (next === d.card) return;
    st.busy = true;
    render();
    sfx.flip();
    d.el.classList.add('quick');
    d.el.classList.remove('open');
    await wait(300);
    d.card = next;
    fillFace(d.el, next);
    sfx.flip();
    d.el.classList.add('open');
    d.el.setAttribute('aria-label', d.el._label);
    await wait(320);
    d.el.classList.remove('quick');
    glint(d.el);
    st.busy = false;
    render();
  }

  /* 收牌：桌上的牌翻回背面，飞回牌堆 */
  async function collect() {
    const ds = st.dealt;
    st.dealt = [];
    st.sel = -1;
    const wasGone = stage.classList.contains('gone');
    stage.classList.remove('gone');
    render();
    if (ds.length) {
      if (wasGone) await wait(260);
      const box = stage.getBoundingClientRect();
      const [W] = cardSize();
      const cx = box.left + box.width / 2, cy = box.top + box.height * 0.52;
      sfx.riffle(ds.length, 0.08, 0.12, 0.36);
      await Promise.all(
        ds.map((d, k) => {
          const r = d.el.getBoundingClientRect();
          const tx = cx - (r.left + r.width / 2), ty = cy - (r.top + r.height / 2);
          d.el.classList.remove('sel', 'dim', 'open');
          d.el.style.zIndex = 40 + k;
          return d.el
            .animate(
              [{ transform: 'translate(0,0) rotate(0deg) scale(1)' }, { transform: `translate(${tx}px,${ty}px) rotate(360deg) scale(${W / d.el.offsetWidth})` }],
              { duration: ms(520), delay: ms(k * 80), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }
            )
            .finished.catch(() => {})
            .then(() => d.el.remove());
        })
      );
    }
    slots.forEach(s => s.classList.remove('filled'));
    fillDeck();
  }

  async function setScene(id) {
    if (st.busy) return;
    const next = sceneById(id);
    if (next.id === scene.id && !st.dealt.length) return;
    unlockAudio();
    scene = next;
    sfx.tap(0.4);
    showScene();
    st.busy = true;
    await collect();
    st.busy = false;
    render();
  }
  function showScene() {
    tabs.forEach((b, i) => b.setAttribute('aria-selected', SCENES[i].id === scene.id));
    slots.forEach(s => (s.querySelector('.ghost').innerHTML = suitSvg(suitOf(scene.id))));
  }

  function render() {
    const n = st.dealt.length;
    const lastD = st.dealt[n - 1];
    st.dealt.forEach((d, i) => {
      d.el.classList.toggle('sel', i === st.sel);
      d.el.classList.toggle('dim', n < MAX_DRAWS && i !== n - 1);
    });
    if (!st.busy) {
      hint.textContent =
        n === 0 ? '点牌堆发牌'
        : !lastD.open ? '点一下翻开'
        : n < MAX_DRAWS ? `不想做就再发一张，还剩 ${MAX_DRAWS - n} 次`
        : '三选一';
    }
    const cur = st.dealt[st.sel];
    acts.classList.toggle('on', !!cur && !st.busy);
    swapBtn.hidden = !cur || !canSwap(cur.card);
    deckBtn.disabled = st.busy || n >= MAX_DRAWS;
    chip.disabled = st.busy;
  }

  function go() {
    const d = st.dealt[st.sel];
    if (!d || st.busy) return;
    unlockAudio();
    sfx.tap(0.5);
    openFocus(d.card, null);
  }

  /* ---------- 专注页 + 比赛计时屏 ---------- */
  const focus = el('section', 'focus');
  focus.hidden = true;
  focus.innerHTML = `
    <div class="f-tag"><span class="f-suit"></span><span class="f-cat"></span></div>
    <h2 class="f-task"></h2>
    <button class="screen" type="button" aria-label="计时屏：点一下开始或暂停，点两下做完">
      <span class="glass"><span class="digits"></span><span class="bar"></span></span>
    </button>
    <div class="ctrl">
      <button class="pchip minus" type="button" data-d="-5" aria-label="减 5 分钟">${chipSvg('#23272B', '#F7F1E3', '−5')}</button>
      <p class="state" aria-live="polite"></p>
      <button class="pchip plus" type="button" data-d="5" aria-label="加 5 分钟">${chipSvg('#C8323A', '#F7F1E3', '+5')}</button>
    </div>
    <button class="quit" type="button">先不做了</button>`;
  root.append(focus);

  const q = s => focus.querySelector(s);
  const screen = q('.screen'), glassEl = q('.glass'), stateEl = q('.state');
  const clock = buildClock();
  q('.digits').append(clock.svg);
  const leds = Array.from({ length: BAR }, () => q('.bar').appendChild(el('i')));
  const minus = q('.minus'), plus = q('.plus');

  let active = null, timer = null, raf = 0, last = 0, tapT = 0, finishing = false;

  function openFocus(card, saved) {
    active = card;
    timer = saved ? Timer.from(saved) : new Timer(card.min * 60000);
    q('.f-suit').innerHTML = suitSvg(suitOf(card.sceneId));
    q('.f-cat').textContent = card.cat;
    q('.f-cat').hidden = card.cat === card.task;
    q('.f-task').textContent = card.task;
    focus.classList.remove('done', 'leaving');
    screen.classList.remove('flash');
    focus.hidden = false;
    table.classList.add('away');
    if (timer.check()) chime();
    renderTimer();
    saveActive(active, timer);
    if (timer.state === 'running') loop();
  }

  function renderTimer() {
    if (timer.check()) timeUp();
    const s = timer.state;
    const left = s === 'over' ? 0 : timer.left();
    clock.set(fmt(left), s !== 'running' || left % 1000 >= 500);
    const lit = s === 'over' ? 0 : s === 'ready' ? BAR : Math.ceil(timer.frac() * BAR);
    leds.forEach((l, i) => l.classList.toggle('on', i < lit));
    screen.classList.toggle('running', s === 'running');
    screen.classList.toggle('paused', s === 'paused');
    screen.classList.toggle('over', s === 'over');
    stateEl.textContent =
      s === 'ready' ? '点一下开始，点两下做完'
      : s === 'paused' ? '暂停中'
      : s === 'over' ? (active.stop ? '到点啦，放下手机' : '时间到')
      : active.stop ? '到点就放下' : '';
    minus.disabled = s === 'over';
    plus.disabled = s !== 'over' && left >= MAX_MIN * 60000;
  }

  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      if (focus.hidden || !timer || timer.state !== 'running') return;
      if (now - last > 100) {
        last = now;
        renderTimer();
      }
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
    if (!timer || timer.state === 'over' || finishing) return;
    const fromReady = timer.state === 'ready';
    timer.toggle();
    saveActive(active, timer);
    sfx.click();
    if (fromReady && !reduce) {
      glassEl.animate([{ opacity: 1 }, { opacity: 0.3, offset: 0.2 }, { opacity: 1, offset: 0.4 }, { opacity: 0.6, offset: 0.6 }, { opacity: 1 }], { duration: 320 });
    }
    renderTimer();
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
    screen.classList.remove('paused', 'over', 'running');
    screen.classList.add('flash');
    confetti(screen, 24);
    setTimeout(closeFocus, ms(1100));
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
    setTimeout(async () => {
      focus.hidden = true;
      focus.classList.remove('leaving', 'done');
      screen.classList.remove('flash');
      active = timer = null;
      finishing = false;
      st.busy = true;
      await collect();
      st.busy = false;
      render();
    }, ms(380));
  }

  screen.addEventListener('click', () => {
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
  [minus, plus].forEach(b =>
    b.addEventListener('click', () => {
      if (!timer || finishing) return;
      unlockAudio();
      sfx.chip();
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

  /* ---------- 开场：牌堆落到桌上 ---------- */
  showScene();
  fillDeck();
  render();
  if (!reduce) {
    deck.forEach((c, i) => {
      c.animate([{ transform: `translate3d(0,-40px,0) rotateZ(${(Math.random() * 16 - 8).toFixed(1)}deg)`, opacity: 0 }, { transform: c.style.transform, opacity: 1 }], {
        duration: 420, delay: i * 18, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'backwards'
      });
    });
  }
  const saved = loadActive();
  if (saved) openFocus(saved.card, saved.t);

  /* 换主题时清理 */
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(tapT);
    document.removeEventListener('visibilitychange', onVisible);
    document.querySelectorAll('.confetti').forEach(s => s.remove());
  };
}
