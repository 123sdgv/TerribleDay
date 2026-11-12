/* 抽签主题：宣纸水墨。
   点一下或按住签筒摇签（也可以真的晃手机），摇出一支签，签挂成一张签纸展开。
   点签纸换一件同类的；把签纸拖到右边的「定」印上就是选它。
   不满意就再摇：这支签放回筒里，重新摇一支；第三次摇，三支签一起出来三选一。
   计时是一炷香：点一下点香 / 暂停，点两下做完。
   右上角一枚铜钱打开选主题。
   主题约定：导出 mount(root, app)，返回一个清理函数；app.openPicker() 打开选主题弹窗。 */
import {
  SCENES, sceneById, drawCard, swapTask, Timer,
  saveActive, loadActive, clearActive, unlockAudio, beep, buzz
} from '../../core/core.js';
import { draggable } from '../../core/drag.js';
import { TUBE, SEAL, COIN, CENSER, INCENSE_TOP, INCENSE_BASE, ASH_Y, scenery } from './art.js';
import { cn, omen, poemFor } from './words.js';
import { sfx } from './sfx.js';

const MAX_DRAWS = 3;
const MIN_SHAKE = 950;   // 点一下也会摇这么久
const MAX_SHAKE = 3600;  // 按住不放，最多摇这么久就出签
const RISE = 58;         // 签从筒里冒出来多高（签筒画布里的单位）
const DOUBLE_TAP = 280;
const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = n => (reduce ? 1 : n);
const wait = n => new Promise(r => setTimeout(r, ms(n)));
const rand = (a, b) => a + Math.random() * (b - a);
const settle = a => a.finished.catch(() => {});

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
  const s = Math.ceil(t / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
const center = r => [r.left + r.width / 2, r.top + r.height / 2];

export function mount(root, app = {}) {
  let scene = SCENES[0];
  /* drawn：这一轮抽过的签（放回去的也记着，第三次一起出来）；shown：现在摊在纸上的签纸 */
  const st = { drawn: [], shown: [], phase: 'idle', busy: false };

  root.append(scenery());
  const table = el('main', 'table');

  /* ---------- 顶部：四个场景像四枚小印，右边一枚铜钱换主题 ---------- */
  const top = el('header', 'top');
  const nav = el('nav', 'scenes');
  nav.setAttribute('role', 'tablist');
  const tabs = SCENES.map(s => {
    const b = btn('scene');
    b.textContent = s.name;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => setScene(s.id));
    nav.append(b);
    return b;
  });
  const coin = btn('coin', COIN, '换主题');
  coin.addEventListener('click', () => {
    if (st.busy) return;
    unlockAudio();
    sfx.click();
    if (app.openPicker) app.openPicker();
  });
  top.append(nav, coin);

  /* ---------- 中间：签纸摊在这里 ---------- */
  const stage = el('section', 'stage');
  const slipsBox = el('div', 'slips empty', '<p class="verse" aria-hidden="true">今日宜做何事</p>');
  const hint = el('p', 'hint');
  stage.append(slipsBox, hint);

  /* ---------- 下面：左边剩几次，中间签筒，右边定印 ---------- */
  const altar = el('section', 'altar');
  const tally = el('div', 'tally');
  const tallySticks = el('div', 'tally-sticks');
  const ticks = Array.from({ length: MAX_DRAWS }, () => tallySticks.appendChild(el('i')));
  const tallyText = el('span', 'tally-text');
  tally.append(tallySticks, tallyText);
  const tube = btn('tube', TUBE, '签筒：点一下或按住，摇一支签');
  const tubeArt = tube.querySelector('.tube-art');
  const sticks = [...tube.querySelectorAll('.stk')];
  const outs = [0, 1, 2].map(i => tube.querySelector('.out' + i));
  const seal = el('div', 'seal', SEAL);
  seal.setAttribute('aria-hidden', 'true');
  altar.append(tally, tube, seal);
  const tubeHint = el('p', 'tube-hint');

  table.append(top, stage, altar, tubeHint);
  root.append(table);
  const fly = el('div', 'fly');
  root.append(fly);

  /* ---------- 签纸 ---------- */
  function makeSlip(d, small) {
    const s = btn('slip' + (small ? ' small' : ''));
    s.innerHTML =
      '<span class="paper"><span class="body">' +
      '<span class="no"></span><span class="luck"></span><span class="yi">宜</span>' +
      '<span class="task"></span><span class="cat"></span>' +
      '<span class="poem"><i></i><i></i></span>' +
      '</span><i class="mark">定</i></span><span class="tail"></span><span class="rod"></span>';
    fillSlip(s, d);
    draggable(s, {
      enabled: () => !st.busy && s.classList.contains('ready'),
      target: () => seal,
      onTap: () => swap(s),
      onStart: () => {
        seal.classList.add('live');
        sfx.click();
      },
      onHover: h => seal.classList.toggle('hot', h),
      onDrop: () => choose(s),
      onCancel: () => seal.classList.remove('live'),
      /* 大签纸拖起来缩小一点，方便拖到印上 */
      lift: dist => {
        const goal = Math.min(1.06, (seal.offsetWidth * 1.5) / s.offsetWidth);
        return 1 + (goal - 1) * Math.min(1, dist / 70);
      }
    });
    return s;
  }
  function fillSlip(s, d) {
    const c = d.card;
    const q = x => s.querySelector(x);
    q('.no').textContent = `第${cn(d.no)}签`;
    q('.luck').textContent = d.luck;
    q('.task').textContent = c.task;
    q('.cat').innerHTML = '<b></b><em></em>';
    q('.cat b').textContent = c.cat;
    q('.cat b').hidden = c.cat === c.task;
    q('.cat em').textContent = `${c.min} 分钟`;
    const [a, b] = q('.poem').children;
    a.textContent = d.poem[0];
    b.textContent = d.poem[1];
    s.setAttribute(
      'aria-label',
      `第${cn(d.no)}签，${d.luck}。宜：${c.task}，${c.cat}，${c.min} 分钟。${d.poem.join('，')}。点一下换一件，拖到定字印上就选它`
    );
  }
  function nudge(x) {
    x.animate([{ rotate: '0deg' }, { rotate: '-2.5deg' }, { rotate: '2.5deg' }, { rotate: '-1deg' }, { rotate: '0deg' }], {
      duration: ms(380),
      easing: 'ease-in-out'
    });
  }

  /* ---------- 摇签筒 ---------- */
  let pressing = false, shaking = false, shakeT0 = 0, rattleT = 0, motionAt = 0;
  const canShake = () => !st.busy && !shaking && st.phase !== 'choose' && focus.hidden;

  function jiggle() {
    sticks.forEach(s => (s.style.transform = `translate(${rand(-0.8, 0.8).toFixed(1)}px,${(-rand(0, 7)).toFixed(1)}px)`));
  }
  function restSticks() {
    sticks.forEach(s => (s.style.transform = ''));
  }

  async function begin() {
    st.busy = true;
    render();
    if (st.shown.length) await putBack();
    startShake();
  }
  function startShake() {
    shaking = true;
    shakeT0 = performance.now();
    tube.classList.add('shaking');
    render();
    tick();
  }
  function tick() {
    const now = performance.now();
    const t = now - shakeT0;
    const shook = now - motionAt < 350;
    if ((t >= MIN_SHAKE && !pressing && !shook) || t >= MAX_SHAKE) {
      stopShake();
      return;
    }
    jiggle();
    sfx.rattle();
    rattleT = setTimeout(tick, 65 + Math.random() * 55);
  }
  async function stopShake() {
    shaking = false;
    clearTimeout(rattleT);
    tube.classList.remove('shaking');
    restSticks();
    render();
    await wait(140);
    await drawOut();
  }

  tube.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    unlockAudio();
    if (!canShake()) {
      if (!st.busy && !shaking) nudge(tubeArt);
      return;
    }
    pressing = true;
    try { tube.setPointerCapture(e.pointerId); } catch (err) {}
    begin();
  });
  tube.addEventListener('pointerup', () => {
    pressing = false;
    unlockAudio();
  });
  tube.addEventListener('touchend', askMotion);
  tube.addEventListener('pointercancel', () => (pressing = false));
  tube.addEventListener('contextmenu', e => e.preventDefault());
  /* 键盘按回车 / 空格也能摇 */
  tube.addEventListener('click', e => {
    askMotion();
    if (e.detail === 0 && canShake()) begin();
  });

  /* ---------- 晃手机：iPhone 第一次点签筒时问一下能不能用 ---------- */
  const hasMotion = 'DeviceMotionEvent' in window && matchMedia('(pointer: coarse)').matches;
  const needAsk = hasMotion && typeof DeviceMotionEvent.requestPermission === 'function';
  let motionOn = false, asking = false, denied = false, hits = [];
  function listenMotion() {
    if (motionOn) return;
    motionOn = true;
    window.addEventListener('devicemotion', onMotion);
    render();
  }
  /* 要在一次真正的点击里问；这次不算点击就等下一次 */
  function askMotion() {
    if (!needAsk || asking || denied || motionOn) return;
    asking = true;
    DeviceMotionEvent.requestPermission()
      .then(r => {
        asking = false;
        if (r === 'granted') listenMotion();
        else denied = true;
      })
      .catch(() => (asking = false));
  }
  function onMotion(e) {
    let m = 0;
    const a = e.acceleration;
    if (a && a.x != null) m = Math.hypot(a.x, a.y, a.z);
    else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
      const g = e.accelerationIncludingGravity;
      m = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.8);
    }
    if (m < 11) return;
    const now = performance.now();
    motionAt = now;
    /* 一下一下地数，同一下里的好几次读数只算一次 */
    if (hits.length && now - hits[hits.length - 1] < 90) return;
    hits = hits.filter(t => now - t < 800);
    hits.push(now);
    if (hits.length >= 3 && canShake()) {
      hits = [];
      begin();
    }
  }
  if (hasMotion && !needAsk) listenMotion();

  /* ---------- 出签 ---------- */
  async function drawOut() {
    const card = drawCard(scene, st.drawn.map(d => d.card.cat));
    const o = omen(st.drawn.map(d => d.no));
    st.drawn.push({ card, no: o.no, luck: o.luck, poem: poemFor(card.cat) });
    if (st.drawn.length < MAX_DRAWS) {
      await emerge([st.drawn.length - 1]);
      st.phase = 'one';
    } else {
      await emerge([0, 1, 2]);
      st.phase = 'choose';
    }
    st.busy = false;
    render();
  }

  function flyStick(r) {
    const f = el('i', 'fly-stick');
    f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    fly.append(f);
    return f;
  }
  /* 从竖着的签变成横着挂签纸的那根，或者反过来 */
  function poseTo(stickRect, rodRect, lift) {
    const [ax, ay] = center(stickRect), [bx, by] = center(rodRect);
    const sx = rodRect.height / stickRect.width, sy = rodRect.width / stickRect.height;
    return {
      a: 'translate(0px,0px) rotate(0deg) scale(1,1)',
      m: `translate(${(bx - ax) * 0.5}px,${(by - ay) * 0.5 - lift}px) rotate(250deg) scale(${(1 + sx) / 2 * 1.1},${(1 + sy) / 2 * 1.1})`,
      b: `translate(${bx - ax}px,${by - ay}px) rotate(450deg) scale(${sx},${sy})`
    };
  }

  async function emerge(idx) {
    const multi = idx.length > 1;
    slipsBox.classList.toggle('row', multi);
    const ups = multi ? outs : [outs[1]];
    sfx.pop();
    buzz(15);
    await Promise.all(
      ups.map((s, k) =>
        settle(
          s.animate([{ transform: 'translateY(0px)' }, { transform: `translateY(-${RISE}px)` }], {
            duration: ms(440), delay: ms(k * 90), easing: 'cubic-bezier(.2,.9,.3,1.25)', fill: 'forwards'
          })
        )
      )
    );
    await wait(120);
    const slips = idx.map(i => makeSlip(st.drawn[i], multi));
    slips.forEach(s => slipsBox.append(s));
    st.shown = idx.map((i, k) => ({ d: st.drawn[i], el: slips[k] }));
    render();

    await Promise.all(
      ups.map(async (s, k) => {
        const from = s.getBoundingClientRect();
        const rod = slips[k].querySelector('.rod').getBoundingClientRect();
        const f = flyStick(from);
        s.style.opacity = '0';
        s.getAnimations().forEach(a => a.cancel());
        const p = poseTo(from, rod, 50);
        await settle(
          f.animate([{ transform: p.a }, { transform: p.m, offset: 0.5 }, { transform: p.b }], {
            duration: ms(640), delay: ms(k * 110), easing: 'cubic-bezier(.35,.6,.3,1)', fill: 'forwards'
          })
        );
        slips[k].classList.add('rodon');
        sfx.land();
        f.remove();
        /* 筒里的那支悄悄回到原位 */
        requestAnimationFrame(() => (s.style.opacity = ''));
      })
    );
    sfx.unroll();
    slips.forEach((s, k) => setTimeout(() => s.classList.add('open'), ms(k * 110)));
    await wait(760 + (slips.length - 1) * 110);
    slips.forEach(s => s.classList.add('ready'));
  }

  /* 不满意：签纸卷起来，签飞回筒里 */
  async function putBack() {
    const shown = st.shown;
    st.shown = [];
    render();
    sfx.rollup();
    shown.forEach(({ el: s }) => s.classList.remove('open', 'ready'));
    await wait(560);
    const s0 = outs[1];
    await Promise.all(
      shown.map(async ({ el: s }) => {
        const rod = s.querySelector('.rod').getBoundingClientRect();
        s0.style.transform = `translateY(-${RISE}px)`;
        const to = s0.getBoundingClientRect();
        s0.style.transform = '';
        s0.style.opacity = '0';
        const f = flyStick(to);
        const p = poseTo(to, rod, 40);
        s.remove();
        await settle(
          f.animate([{ transform: p.b }, { transform: p.m, offset: 0.5 }, { transform: p.a }], {
            duration: ms(560), easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards'
          })
        );
        s0.style.opacity = '';
        f.remove();
        sfx.drop();
        await settle(
          s0.animate([{ transform: `translateY(-${RISE}px)` }, { transform: 'translateY(0px)' }], {
            duration: ms(260), easing: 'cubic-bezier(.5,0,.8,.4)'
          })
        );
      })
    );
    tubeArt.animate([{ translate: '0 0' }, { translate: '0 3px' }, { translate: '0 0' }], { duration: ms(160) });
  }

  /* 点签纸：卷起来换一件同类的，再展开 */
  async function swap(s) {
    const item = st.shown.find(x => x.el === s);
    if (!item || st.busy) return;
    const next = swapTask(item.d.card);
    if (next === item.d.card) {
      nudge(s);
      return;
    }
    st.busy = true;
    render();
    s.classList.add('quick');
    sfx.rollup();
    s.classList.remove('open');
    await wait(340);
    item.d.card = next;
    item.d.poem = poemFor(next.cat, item.d.poem);
    fillSlip(s, item.d);
    sfx.unroll();
    s.classList.add('open');
    await wait(420);
    s.classList.remove('quick');
    st.busy = false;
    render();
  }

  /* 松手后签纸缩成印那么大，落在印的正中间（缩放的中心是拖的时候手指按住的地方） */
  function snapTo(s, target) {
    const box = slipsBox.getBoundingClientRect(), b = target.getBoundingClientRect();
    const w = s.offsetWidth, h = s.offsetHeight;
    const k = Math.min(1, (target.offsetWidth * 1.7) / h);
    const m = /^([-\d.]+)px ([-\d.]+)px/.exec(s.style.transformOrigin || '');
    const ox = m ? +m[1] : w / 2, oy = m ? +m[2] : h / 2;
    const left = box.left + s.offsetLeft, top = box.top + s.offsetTop;
    const [bx, by] = center(b);
    const dx = bx - (left + ox) - k * (w / 2 - ox);
    const dy = by - (top + oy) - k * (h / 2 - oy);
    s.style.transition = 'transform .34s cubic-bezier(.3,1.3,.5,1)';
    s.style.transform = `translate(${dx}px,${dy}px) scale(${k})`;
  }

  /* 拖到定印上：盖章，选它 */
  function choose(s) {
    const item = st.shown.find(x => x.el === s);
    if (!item) return;
    st.busy = true;
    unlockAudio();
    render();
    seal.classList.add('live', 'hot');
    snapTo(s, seal);
    /* 印往下一按，再抬起来，签纸上留下一个定字 */
    setTimeout(async () => {
      const r = 'rotate(-4deg)';
      await settle(seal.animate([{ transform: `scale(1.16) ${r}` }, { transform: `scale(.92) ${r}` }], { duration: ms(130), easing: 'ease-in', fill: 'forwards' }));
      sfx.stamp();
      buzz(25);
      s.classList.add('stamped');
      seal.animate(
        [{ transform: `scale(.92) ${r}`, opacity: 1 }, { transform: `translateY(-18px) scale(1.3) ${r}`, opacity: 0 }],
        { duration: ms(420), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }
      );
    }, ms(340));
    setTimeout(() => {
      const d = item.d;
      openFocus({ ...d.card, qian: { no: d.no, luck: d.luck } }, null);
    }, ms(1250));
  }

  /* 收掉这一轮 */
  function resetRound() {
    st.shown.forEach(({ el: s }) => {
      s.style.pointerEvents = 'none';
      settle(s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(260), fill: 'forwards' })).then(() => s.remove());
    });
    st.shown = [];
    st.drawn = [];
    st.phase = 'idle';
    setTimeout(() => slipsBox.classList.remove('row'), ms(270));
    render();
  }

  function setScene(id) {
    if (st.busy || shaking) return;
    const next = sceneById(id);
    if (next.id === scene.id && !st.drawn.length) return;
    unlockAudio();
    sfx.click();
    scene = next;
    resetRound();
  }

  function render() {
    const n = st.drawn.length;
    tabs.forEach((b, i) => b.setAttribute('aria-selected', SCENES[i].id === scene.id));
    ticks.forEach((t, i) => t.classList.toggle('used', i < n));
    tallyText.textContent = st.phase === 'choose' ? '三选一' : `剩 ${MAX_DRAWS - n} 次`;
    tube.classList.toggle('off', st.phase === 'choose');
    const pickable = !st.busy && st.shown.some(x => x.el.classList.contains('ready'));
    seal.classList.toggle('ready', pickable);
    slipsBox.classList.toggle('empty', st.phase === 'idle' && !st.shown.length);
    hint.textContent =
      st.phase === 'idle' ? '心里默念：今天做什么？'
      : !st.shown.length ? ''
      : st.phase === 'one' ? '点签纸换一件 · 拖到「定」上就选它'
      : '三签择一 · 拖到「定」上';
    tubeHint.textContent =
      shaking ? '哗啦哗啦……'
      : st.phase === 'idle' ? (motionOn ? '点签筒摇一摇，或晃晃手机' : '点一下或按住签筒，摇一支签')
      : st.phase === 'one' ? `不满意？再摇一次，放回去重抽`
      : '';
  }

  /* ---------- 专注页：一炷香 ---------- */
  const focus = el('section', 'focus');
  focus.hidden = true;
  focus.innerHTML = `
    <p class="f-no"></p>
    <h2 class="f-task"></h2>
    <p class="f-cat"></p>
    <button class="censer" type="button" aria-label="一炷香：点一下点香或暂停，点两下做完">${CENSER}</button>
    <div class="clock">
      <button class="adj" type="button" data-d="-5" aria-label="减 5 分钟">−5</button>
      <span class="time"></span>
      <button class="adj" type="button" data-d="5" aria-label="加 5 分钟">+5</button>
    </div>
    <p class="state" aria-live="polite"></p>
    <button class="quit" type="button">先不做了</button>
    <i class="done-stamp" aria-hidden="true">成</i>`;
  root.append(focus);

  const q = s => focus.querySelector(s);
  const censer = q('.censer'), svg = censer.querySelector('svg');
  const coat = svg.querySelector('.coat'), ashTip = svg.querySelector('.ash-tip');
  const ember = svg.querySelector('.ember'), glow = svg.querySelector('.glow'), flame = svg.querySelector('.flame-pos');
  const smokes = [...svg.querySelectorAll('.sm')];
  const fallen = svg.querySelector('.fallen');
  const timeEl = q('.time'), stateEl = q('.state'), doneStamp = q('.done-stamp');
  const [minus] = focus.querySelectorAll('.adj');
  const LEN = INCENSE_BASE - INCENSE_TOP;

  let active = null, timer = null, raf = 0, last = 0, tapT = 0, finishing = false;
  let ash = 0, tipY = INCENSE_TOP, lastFrame = 0;

  function openFocus(card, saved) {
    active = card;
    timer = saved ? Timer.from(saved) : new Timer(card.min * 60000);
    const qi = card.qian;
    q('.f-no').textContent = qi ? `第${cn(qi.no)}签 · ${qi.luck}` : '';
    q('.f-no').hidden = !qi;
    q('.f-task').textContent = card.task;
    q('.f-cat').textContent = card.cat;
    q('.f-cat').hidden = card.cat === card.task;
    focus.classList.remove('done', 'leaving');
    censer.classList.remove('lighting');
    fallen.replaceChildren();
    ash = timer.state === 'ready' ? 0 : 1.5;
    focus.hidden = false;
    table.classList.add('away');
    if (timer.check()) sfx.bowl();
    renderTimer();
    saveActive(active, timer);
    if (timer.state === 'running') loop();
  }

  const f1 = n => n.toFixed(1);

  function drawIncense(frac) {
    const s = timer.state;
    const len = s === 'ready' ? LEN : s === 'over' ? 0 : LEN * frac;
    const y = INCENSE_BASE - len;
    tipY = y;
    coat.setAttribute('y', f1(y));
    coat.setAttribute('height', f1(len));
    const a = s === 'ready' || s === 'over' ? 0 : Math.min(ash, len);
    ashTip.setAttribute('y', f1(y - a));
    ashTip.setAttribute('height', f1(a));
    ember.setAttribute('cy', f1(y));
    glow.setAttribute('cy', f1(y));
    flame.setAttribute('transform', `translate(0 ${f1(y - INCENSE_TOP)})`);
  }

  /* 三缕烟：从香头往上飘，越高摆得越开 */
  function drawSmoke(now) {
    const t = now / 1000;
    const y0 = tipY - Math.min(ash, 6) - 1.5;
    const H = 132;
    smokes.forEach((p, i) => {
      let d = '';
      for (let j = 0; j <= 26; j++) {
        const s = j / 26;
        const amp = (0.3 + 13 * s ** 1.7) * (i === 0 ? 1.15 : i === 1 ? 0.8 : 1);
        const x = 80 + amp * Math.sin(s * (5.2 + i * 0.9) - t * (1.25 + i * 0.22) + i * 2.1) + s * s * 9 * Math.sin(t * 0.21 + i * 1.7);
        d += (j ? 'L' : 'M') + f1(x) + ' ' + f1(y0 - s * H);
      }
      p.setAttribute('d', d);
    });
  }

  /* 烟灰积长了就掉下去，落在香灰上 */
  function dropAsh(len) {
    if (reduce) return;
    const y = tipY - len;
    const fl = document.createElementNS(NS, 'rect');
    fl.setAttribute('class', 'flake');
    fl.setAttribute('x', '78.6');
    fl.setAttribute('y', f1(y));
    fl.setAttribute('width', '2.8');
    fl.setAttribute('height', f1(len));
    fl.setAttribute('rx', '.8');
    fallen.after(fl);
    const dx = rand(-9, 9), fall = ASH_Y - y - len;
    settle(
      fl.animate(
        [{ transform: 'translate(0px,0px) rotate(0deg)' }, { transform: `translate(${f1(dx)}px,${f1(fall)}px) rotate(${rand(-120, 120).toFixed(0)}deg)` }],
        { duration: 500 + fall * 3.2, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }
      )
    ).then(() => {
      fl.remove();
      const dot = document.createElementNS(NS, 'ellipse');
      dot.setAttribute('cx', f1(80 + dx));
      dot.setAttribute('cy', f1(ASH_Y + rand(-1.5, 2)));
      dot.setAttribute('rx', f1(rand(1.3, 2.2)));
      dot.setAttribute('ry', '.8');
      fallen.append(dot);
      while (fallen.children.length > 14) fallen.firstChild.remove();
    });
  }

  function renderTimer() {
    if (timer.check()) timeUp();
    const s = timer.state;
    drawIncense(timer.frac());
    censer.classList.toggle('ready', s === 'ready');
    censer.classList.toggle('running', s === 'running');
    censer.classList.toggle('paused', s === 'paused');
    censer.classList.toggle('over', s === 'over');
    const t = s === 'over' ? '00:00' : fmt(timer.left());
    if (timeEl.textContent !== t) timeEl.textContent = t;
    stateEl.textContent =
      s === 'ready' ? '点一下点香，点两下做完'
      : s === 'paused' ? '暂停中，香先熄着'
      : s === 'over' ? (active.stop ? '香燃尽啦，放下手机' : '一炷香燃尽')
      : active.stop ? '香燃尽就放下' : '';
    minus.disabled = s === 'over';
  }

  function loop() {
    cancelAnimationFrame(raf);
    lastFrame = performance.now();
    const step = now => {
      if (focus.hidden || !timer || timer.state !== 'running') return;
      const dt = Math.min(100, now - lastFrame);
      lastFrame = now;
      ash += dt * 0.0008;
      if (ash > 5.5) {
        const len = ash;
        ash = 0.8;
        dropAsh(len - 0.8);
      }
      if (now - last > 100) {
        last = now;
        renderTimer();
      } else {
        drawIncense(timer.frac());
      }
      drawSmoke(now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function timeUp() {
    sfx.bowl();
    buzz([200, 100, 200]);
    saveActive(active, timer);
  }

  function toggle() {
    if (!timer || timer.state === 'over' || finishing) return;
    const fromReady = timer.state === 'ready';
    timer.toggle();
    saveActive(active, timer);
    if (fromReady) {
      sfx.light();
      ash = 0.6;
      drawSmoke(performance.now());
      censer.classList.remove('lighting');
      void censer.offsetWidth;
      censer.classList.add('lighting');
      setTimeout(() => censer.classList.remove('lighting'), ms(900));
    } else {
      sfx.click();
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
    sfx.stamp();
    buzz(30);
    clearActive();
    focus.classList.add('done');
    if (!reduce) {
      doneStamp.animate(
        [
          { transform: 'translate(-50%,-50%) scale(2.4) rotate(-14deg)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(.92) rotate(-8deg)', opacity: 1, offset: 0.45 },
          { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1 }
        ],
        { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }
      );
    }
    setTimeout(closeFocus, ms(1250));
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
      doneStamp.getAnimations().forEach(a => a.cancel());
      seal.getAnimations().forEach(a => a.cancel());
      seal.classList.remove('live', 'hot');
      svg.querySelectorAll('.flake').forEach(f => f.remove());
      active = timer = null;
      finishing = false;
      st.busy = false;
      resetRound();
    }, ms(380));
  }

  censer.addEventListener('click', () => {
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
      sfx.click();
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
  /* iPhone 要在一次真正的点击里解锁声音，随便点哪里都算 */
  ['pointerup', 'touchend', 'click'].forEach(t => root.addEventListener(t, unlockAudio));

  /* ---------- 开场：签筒落在纸上 ---------- */
  render();
  if (!reduce) {
    tubeArt.animate([{ translate: '0 -18px', opacity: 0 }, { translate: '0 0', opacity: 1 }], {
      duration: 520, easing: 'cubic-bezier(.3,1.3,.5,1)'
    });
  }
  const saved = loadActive();
  if (saved) openFocus(saved.card, saved.t);

  /* 换主题时清理 */
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(tapT);
    clearTimeout(rattleT);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('devicemotion', onMotion);
    ['pointerup', 'touchend', 'click'].forEach(t => root.removeEventListener(t, unlockAudio));
    fly.remove();
  };
}
