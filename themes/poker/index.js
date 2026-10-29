/* 扑克主题：绿绒布牌桌。
   上面点牌堆 → 随机来一种花切 → 甩一张牌到下面，落下就翻开。
   点牌面换一件同类的；把牌拖进中间的下注圈就是选中它。
   不满意再点牌堆，新的一张压在上面；第三张一落下，三张浮上来三选一。
   计时用扑克比赛那种计时屏：点一下开始 / 暂停，点两下做完。
   右上角一枚筹码打开选主题。
   主题约定：导出 mount(root, app)，返回一个清理函数；app.openPicker() 打开选主题弹窗。 */
import {
  SCENES, sceneById, drawCard, swapTask, Timer,
  saveActive, loadActive, clearActive, unlockAudio, beep, chime, buzz
} from '../../core/core.js';
import { RED, suitSvg, chipSvg, buildClock } from './art.js';
import { FLOURISHES, place, move, rest, wait, ms, reduce } from './flourish.js';
import { sfx } from './sfx.js';
import { draggable, snapInto } from '../../core/drag.js';

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
const rand = (a, b) => a + Math.random() * (b - a);
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
  /* cards：发到下面的牌（从下往上）；phase：deal 还在发牌，choose 三选一 */
  const st = { cards: [], phase: 'deal', busy: false };
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

  /* ---------- 上面：牌堆，花切都在这里；三选一时三张牌浮到这里 ---------- */
  const stage = el('section', 'stage');
  const deckWrap = el('div', 'deck');
  const deckBtn = btn('deck-btn', '', '发牌');
  deckBtn.addEventListener('click', deal);
  deckWrap.append(el('div', 'deck-shadow'), deckBtn);
  const row = el('div', 'row');
  const rowSlots = Array.from({ length: MAX_DRAWS }, () => row.appendChild(el('div', 'rslot')));
  stage.append(deckWrap, row);

  /* ---------- 中间：桌布上印的下注圈，把牌拖进来就是选中 ---------- */
  const well = el('div', 'well');
  const spot = el('div', 'spot', '<span class="ghost"></span>');
  spot.setAttribute('aria-hidden', 'true');
  well.append(spot);

  /* ---------- 下面：发出来的牌，新的一张压在旧的上面 ---------- */
  const pile = el('div', 'pile');

  table.append(top, stage, well, pile);
  root.append(table);

  function cardSize() {
    const c = deck[0];
    return c ? [c.offsetWidth, c.offsetHeight] : [70, 98];
  }
  function fillDeck() {
    while (deck.length < DECK_SIZE) {
      const c = el('div', 'dk');
      deckWrap.insertBefore(c, deckBtn);
      place(c, rest(deck.length));
      c.style.zIndex = deck.length;
      deck.push(c);
    }
  }

  /* ---------- 牌 ---------- */
  function makeCard(card) {
    const c = btn('pc', '<div class="inner"><div class="pc-back"></div><div class="pc-face"></div></div>');
    fillFace(c, card);
    c.setAttribute('aria-label', '一张背面朝上的牌');
    draggable(c, {
      enabled: () => !st.busy && canPick(c),
      target: () => spot,
      onTap: () => swap(c),
      onStart: () => {
        spot.classList.add('live');
        sfx.tap(0.3);
      },
      onHover: h => {
        spot.classList.toggle('hot', h);
        if (h) sfx.chip();
      },
      onDrop: () => choose(c),
      onCancel: () => spot.classList.remove('live')
    });
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
    c._label = `${rank}，${card.cat}，${card.task}，${card.min} 分钟。点一下换一件，拖进中间的圈就是选它`;
    if (c.classList.contains('open')) c.setAttribute('aria-label', c._label);
  }
  function glint(c) {
    c.classList.remove('shine');
    void c.offsetWidth;
    c.classList.add('shine');
  }
  function nudge(c) {
    sfx.tap(0.35);
    c.animate([{ rotate: '0deg' }, { rotate: '-3deg' }, { rotate: '3deg' }, { rotate: '-1.5deg' }, { rotate: '0deg' }], {
      duration: ms(380),
      easing: 'ease-in-out'
    });
  }
  /* 发牌阶段只有最上面那张能动；三选一时三张都能动 */
  function canPick(c) {
    const i = st.cards.findIndex(d => d.el === c);
    if (i < 0 || !st.cards[i].open) return false;
    return st.phase === 'choose' || i === st.cards.length - 1;
  }

  /* ---------- 发牌：随机一种花切，然后甩一张到下面 ---------- */
  async function deal() {
    if (st.busy || st.phase !== 'deal' || st.cards.length >= MAX_DRAWS) return;
    unlockAudio();
    st.busy = true;
    render();
    const keys = Object.keys(FLOURISHES).filter(k => k !== lastTrick);
    const trick = keys[Math.floor(Math.random() * keys.length)];
    lastTrick = trick;
    const [W, H] = cardSize();
    deck = await FLOURISHES[trick].run(deck, W, H);
    await throwCard(W);
    /* 第三张一落下，三张一起浮上来三选一 */
    if (st.cards.length >= MAX_DRAWS) {
      await wait(380);
      await floatUp();
    }
    st.busy = false;
    render();
  }

  async function throwCard(W) {
    const k = st.cards.length;
    const card = drawCard(scene, st.cards.map(d => d.card.cat));
    const topCard = deck.pop();
    /* 拇指先把最上面那张推出来一点 */
    await move(topCard, { ...rest(deck.length), x: W * 0.2, y: 10, r: 6 }, { duration: 160, easing: 'cubic-bezier(.3,.7,.3,1)' });

    const c = makeCard(card);
    /* 每张落下来都歪一点点，压在上一张上面能看到下面的牌边 */
    const pose = { x: rand(-8, 8), y: rand(-5, 5), r: rand(-6, 6) };
    c.style.setProperty('--ox', pose.x.toFixed(1) + 'px');
    c.style.setProperty('--oy', pose.y.toFixed(1) + 'px');
    c.style.setProperty('--or', pose.r.toFixed(1) + 'deg');
    c.style.zIndex = k + 1;
    pile.append(c);
    const d = { card, el: c, open: false, pose };
    st.cards.push(d);
    render();

    const from = topCard.getBoundingClientRect();
    const to = c.getBoundingClientRect();
    const s0 = topCard.offsetWidth / c.offsetWidth;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    topCard.remove();

    sfx.flick();
    c.classList.add('flying');
    const sm = ((s0 + 1) / 2) * 1.16;
    const { x, y, r } = pose;
    await c
      .animate(
        [
          { transform: `translate(${x + dx}px,${y + dy}px) rotate(${r - 354}deg) scale(${s0})` },
          { transform: `translate(${x + dx * 0.4}px,${y + dy * 0.4 - 26}px) rotate(${r - 140}deg) scale(${sm})`, offset: 0.45 },
          { transform: `translate(${x}px,${y}px) rotate(${r - 4}deg) scale(1.035)`, offset: 0.86 },
          { transform: `translate(${x}px,${y}px) rotate(${r}deg) scale(1)` }
        ],
        { duration: ms(680), easing: 'cubic-bezier(.22,.7,.3,1)' }
      )
      .finished.catch(() => {});
    c.classList.remove('flying');
    sfx.tap(0.8);

    /* 落下就翻开 */
    await wait(90);
    sfx.flip();
    c.classList.add('open');
    c.setAttribute('aria-label', c._label);
    c.animate(
      [{ translate: '0 0', scale: '1' }, { translate: '0 -14px', scale: '1.07', offset: 0.45 }, { translate: '0 0', scale: '1' }],
      { duration: ms(620), easing: 'cubic-bezier(.3,.7,.3,1)' }
    );
    await wait(440);
    glint(c);
    await wait(180);
    d.open = true;
  }

  /* 三张从下面浮到上面排成一排 */
  async function floatUp() {
    st.phase = 'choose';
    stage.classList.add('choosing');
    sfx.swoosh(0.4, 500, 1700);
    const moves = st.cards.map(d => ({ d, from: d.el.getBoundingClientRect(), w: d.el.offsetWidth }));
    moves.forEach(({ d }, k) => {
      rowSlots[k].append(d.el);
      d.el.classList.remove('under');
      d.el.style.zIndex = '';
    });
    await Promise.all(
      moves.map(({ d, from, w }, k) => {
        const to = d.el.getBoundingClientRect();
        const s = w / d.el.offsetWidth;
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const r = d.pose.r;
        return d.el
          .animate(
            [
              { transform: `translate(${dx}px,${dy}px) rotate(${r}deg) scale(${s})` },
              { transform: `translate(${dx * 0.45}px,${dy * 0.45 + 16}px) rotate(${r * 0.4}deg) scale(${((s + 1) / 2) * 1.05})`, offset: 0.55 },
              { transform: 'translate(0px,0px) rotate(0deg) scale(1)' }
            ],
            { duration: ms(640), delay: ms((MAX_DRAWS - 1 - k) * 90), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' }
          )
          .finished.catch(() => {});
      })
    );
    sfx.tap(0.5);
  }

  /* 点牌面：牌翻回去，换个同分类的，再翻开 */
  async function swap(c) {
    const d = st.cards.find(x => x.el === c);
    if (!d || st.busy) return;
    const next = swapTask(d.card);
    if (next === d.card) {
      nudge(c);
      return;
    }
    st.busy = true;
    render();
    sfx.flip();
    c.classList.add('quick');
    c.classList.remove('open');
    await wait(300);
    d.card = next;
    fillFace(c, next);
    sfx.flip();
    c.classList.add('open');
    c.setAttribute('aria-label', c._label);
    await wait(320);
    c.classList.remove('quick');
    glint(c);
    st.busy = false;
    render();
  }

  /* 拖进下注圈：选中这张 */
  function choose(c) {
    const d = st.cards.find(x => x.el === c);
    if (!d) return;
    st.busy = true;
    unlockAudio();
    sfx.tap(0.9);
    snapInto(c, spot, 0.86);
    spot.classList.add('taken');
    render();
    setTimeout(() => {
      spot.classList.remove('live', 'hot', 'taken');
      openFocus(d.card, null);
    }, ms(460));
  }

  /* 收牌：桌上的牌翻回背面，飞回牌堆 */
  async function collect() {
    const ds = st.cards;
    const wasChoosing = st.phase === 'choose';
    st.cards = [];
    st.phase = 'deal';
    stage.classList.remove('choosing');
    render();
    if (ds.length) {
      if (wasChoosing) await wait(300);
      const box = deckWrap.getBoundingClientRect();
      const [W] = cardSize();
      const cx = box.left + box.width / 2, cy = box.top + box.height * 0.52;
      sfx.riffle(ds.length, 0.08, 0.12, 0.36);
      await Promise.all(
        ds.map((d, k) => {
          const c = d.el;
          const now = getComputedStyle(c).transform;
          c.style.transition = 'none';
          c.style.transform = 'none';
          const r = c.getBoundingClientRect();
          const tx = cx - (r.left + r.width / 2), ty = cy - (r.top + r.height / 2);
          c.classList.remove('open', 'under', 'shine');
          c.style.zIndex = 40 + k;
          return c
            .animate(
              [{ transform: now === 'none' ? 'translate(0px,0px)' : now }, { transform: `translate(${tx}px,${ty}px) scale(${W / c.offsetWidth})` }],
              { duration: ms(520), delay: ms(k * 80), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }
            )
            .finished.catch(() => {})
            .then(() => c.remove());
        })
      );
    }
    fillDeck();
  }

  async function setScene(id) {
    if (st.busy) return;
    const next = sceneById(id);
    if (next.id === scene.id && !st.cards.length) return;
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
    spot.querySelector('.ghost').innerHTML = suitSvg(suitOf(scene.id));
  }

  function render() {
    const n = st.cards.length;
    st.cards.forEach((d, i) => d.el.classList.toggle('under', st.phase === 'deal' && i < n - 1));
    deckBtn.disabled = st.busy || st.phase !== 'deal' || n >= MAX_DRAWS;
    chip.disabled = st.busy;
    spot.classList.toggle('ready', !st.busy && st.cards.some(d => canPick(d.el)));
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
