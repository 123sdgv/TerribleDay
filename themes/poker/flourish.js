/* 四种花切，以及摆牌用的小工具。
   牌的位置都以牌堆中心为原点：x 向右、y 向下，r 是平面旋转，rx / ry 是立体倾斜，s 是缩放。
   每种花切接收牌堆（数组，从下往上）和单张牌的宽高，播完返回新的牌序。 */
import { sfx } from './sfx.js';

export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ms = n => (reduce ? 1 : n);
export const wait = t => new Promise(r => setTimeout(r, ms(t)));

const full = p => ({ x: 0, y: 0, r: 0, rx: 0, ry: 0, s: 1, ...p });
const n2 = v => (+v).toFixed(2);
export const T = p =>
  `translate3d(${n2(p.x)}px,${n2(p.y)}px,0) rotateZ(${n2(p.r)}deg) rotateX(${n2(p.rx)}deg) rotateY(${n2(p.ry)}deg) scale(${(+p.s).toFixed(4)})`;

/* 牌堆里第 i 张（从下往上数）静止时的位置：一张比一张高一点点，露出牌的厚度 */
export const rest = i => ({ x: -i * 0.2, y: -i * 0.45, r: 0 });

export function place(c, p) {
  c._p = full(p);
  c.style.transform = T(c._p);
}

/* 从当前位置走到 poses（一个或一串，可以带 offset），返回走完的 Promise */
export function move(c, poses, { duration = 300, delay = 0, easing = 'ease' } = {}) {
  const list = Array.isArray(poses) ? poses : [poses];
  const frames = [{ transform: T(c._p), offset: 0 }];
  list.forEach(p => {
    const f = { transform: T(full(p)) };
    if (p.offset != null) f.offset = p.offset;
    frames.push(f);
  });
  const end = full(list[list.length - 1]);
  delete end.offset;
  c._p = end;
  const a = c.animate(frames, { duration: ms(duration), delay: ms(delay), easing, fill: 'both' });
  return a.finished.then(
    () => {
      c.style.transform = T(end);
      a.cancel();
    },
    () => {}
  );
}

const all = list => Promise.all(list);
const rand = (a, b) => a + Math.random() * (b - a);

/* 绕着某个点转：用来做「捏着一角转」的动作 */
function around(p, pv, deg) {
  const q = full(p);
  const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const dx = q.x - pv.x, dy = q.y - pv.y;
  return { ...q, x: pv.x + co * dx - si * dy, y: pv.y + si * dx + co * dy, r: q.r + deg };
}
function swing(p, pv, from, to, steps = 6) {
  const out = [];
  for (let k = 1; k <= steps; k++) out.push({ ...around(p, pv, from + ((to - from) * k) / steps), offset: k / steps });
  return out;
}

/* ---------- 鸽尾洗牌 + 拱桥 ----------
   分成左右两半，斜着摆成八字；从两边交错着一张张落下；推到一起，拱起来，再哗地落回去。 */
async function riffle(cards, W) {
  const n = cards.length, half = Math.ceil(n / 2);
  const L = cards.slice(0, half), R = cards.slice(half);
  const pack = (side, j) => ({ x: side * W * 0.58 - side * j * 0.35, y: 10 - j * 0.9, r: side * 10, rx: 18 });
  L.forEach((c, j) => (c.style.zIndex = 50 + j));
  R.forEach((c, j) => (c.style.zIndex = 50 + j));
  sfx.swoosh(0.26, 600, 1800);
  await all([
    ...L.map((c, j) => move(c, pack(-1, j), { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' })),
    ...R.map((c, j) => {
      const to = pack(1, j);
      return move(
        c,
        [{ x: (c._p.x + to.x) / 2, y: Math.min(c._p.y, to.y) - 18, r: 4, rx: 8, s: 1.06, offset: 0.5 }, to],
        { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' }
      );
    })
  ]);

  /* 两边从最下面的牌开始，交错放下；偶尔两张一起掉，更像真的 */
  const order = [];
  let li = 0, ri = 0, side = Math.random() < 0.5 ? -1 : 1;
  while (li < L.length || ri < R.length) {
    const clump = Math.random() < 0.72 ? 1 : 2;
    for (let k = 0; k < clump; k++) {
      if (side < 0 && li < L.length) order.push([L[li++], -1]);
      else if (side > 0 && ri < R.length) order.push([R[ri++], 1]);
    }
    side = -side;
  }
  const STEP = 34;
  sfx.riffle(order.length, STEP / 1000, 0.16, 0.06);
  await all(
    order.map(([c, sd], k) => {
      const to = { x: sd * W * 0.13 - k * 0.2, y: -k * 0.6, r: sd * 4 };
      return wait(k * STEP).then(() => {
        c.style.zIndex = k;
        return move(
          c,
          [{ x: c._p.x + (to.x - c._p.x) * 0.3, y: c._p.y - 4, r: c._p.r, rx: 24, s: 1.03, offset: 0.35 }, to],
          { duration: 190, easing: 'cubic-bezier(.3,.6,.4,1)' }
        );
      });
    })
  );
  const pile = order.map(o => o[0]);

  /* 推到一起 */
  await all(pile.map((c, k) => move(c, { x: -k * 0.2 + rand(-1, 1), y: -k * 0.45, r: rand(-1.2, 1.2) }, { duration: 200, easing: 'ease-out' })));
  sfx.tap(0.5);

  /* 拱桥：中间的牌拱得最高 */
  await all(
    pile.map((c, k) =>
      move(
        c,
        { x: c._p.x, y: -k * 0.8 - 8 - 26 * Math.sin((Math.PI * k) / (n - 1)), r: c._p.r * 0.5, rx: 40, s: 1.04 },
        { duration: 260, delay: k * 4, easing: 'cubic-bezier(.3,.7,.3,1)' }
      )
    )
  );
  /* 哗地落回去 */
  sfx.riffle(n, 0.022, 0.09);
  await all(
    pile.map((c, k) =>
      move(c, [{ ...rest(k), rx: -6, offset: 0.7 }, rest(k)], { duration: 240, delay: k * 22, easing: 'cubic-bezier(.3,.7,.3,1)' })
    )
  );
  sfx.tap(0.7);
  return pile;
}

/* ---------- 单手切牌 ----------
   牌举起来，下半叠捏着左边沿往下张开，像张嘴；再往上一顶，从上半叠旁边翻过去压到上面。 */
async function charlier(cards, W) {
  const n = cards.length, half = Math.floor(n / 2);
  const B = cards.slice(0, half), A = cards.slice(half);
  const hand = i => ({ x: -i * 0.2, y: -16 - i * 0.45, r: -6, s: 1.08 });
  await all(cards.map((c, i) => move(c, hand(i), { duration: 240, easing: 'cubic-bezier(.3,.7,.3,1)' })));
  const pv = around({ x: -W * 0.54, y: -16 }, { x: 0, y: -16 }, -6);
  const turn = (group, from, to, d, easing) =>
    all(group.map(c => move(c, swing(hand(cards.indexOf(c)), pv, from, to, 6), { duration: d, easing })));

  sfx.tap(0.5);
  await all([turn(B, 0, 52, 360, 'cubic-bezier(.45,0,.3,1)'), turn(A, 0, -10, 360, 'cubic-bezier(.45,0,.3,1)')]);
  B.forEach((c, j) => (c.style.zIndex = 100 + j));
  sfx.swoosh(0.22, 900, 2000);
  await all([turn(B, 52, -16, 330, 'cubic-bezier(.5,0,.4,1)'), turn(A, -10, 34, 330, 'cubic-bezier(.5,0,.4,1)')]);
  await all([turn(B, -16, 0, 220, 'ease-out'), turn(A, 34, 0, 220, 'ease-out')]);
  sfx.tap(0.8);

  const pile = [...A, ...B];
  pile.forEach((c, k) => (c.style.zIndex = k));
  await all(pile.map((c, k) => move(c, rest(k), { duration: 240, easing: 'cubic-bezier(.3,.7,.3,1)' })));
  return pile;
}

/* ---------- 弹牌 ----------
   整叠捏在左边，从最上面一张开始，一串牌沿着弧线弹到右边，再把整叠收回中间。 */
async function spring(cards, W, H) {
  const n = cards.length;
  const left = i => ({ x: -W * 0.95 - i * 0.2, y: 20 - i * 0.45, r: -14, s: 1.04 });
  const right = j => ({ x: W * 0.95 - j * 0.2, y: 20 - j * 0.45, r: 14, s: 1.04 });
  await all(cards.map((c, i) => move(c, left(i), { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' })));
  const order = cards.slice().reverse();
  const STEP = 30, FLY = 440;
  const ctrl = { x: 0, y: -H * 1.65 };
  sfx.riffle(n, STEP / 1000, 0.1, FLY / 1000 - 0.04);
  await all(
    order.map((c, j) => {
      const a = c._p, b = right(j), poses = [];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8, u = 1 - t, bump = Math.sin(Math.PI * t);
        poses.push({
          x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
          y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
          r: a.r + (b.r - a.r) * t,
          ry: bump * 32,
          s: 1.04 + bump * 0.08,
          offset: t
        });
      }
      return wait(j * STEP).then(() => {
        c.style.zIndex = 200 + j;
        return move(c, poses, { duration: FLY, easing: 'cubic-bezier(.3,.1,.6,1)' });
      });
    })
  );
  await all(order.map((c, j) => move(c, rest(j), { duration: 280, easing: 'cubic-bezier(.3,.7,.3,1)' })));
  order.forEach((c, j) => (c.style.zIndex = j));
  sfx.tap(0.7);
  return order;
}

/* ---------- 扇形展开再收回 ----------
   捏住左下角唰地摊成扇子，停一下，从左往右一张张扫过去合上，再转回正中。 */
async function fan(cards, W, H) {
  const n = cards.length;
  const base = i => ({ x: -i * 0.12, y: -24 - i * 0.3, r: 0 });
  const pv = { x: -W * 0.2, y: H * 0.4 - 24 };
  const ang = i => -64 + (128 * i) / (n - 1);
  await all(cards.map((c, i) => move(c, base(i), { duration: 200, easing: 'ease-out' })));
  sfx.swoosh(0.45, 400, 2400);
  await all(cards.map((c, i) => move(c, swing(base(i), pv, 0, ang(i), 8), { duration: 560, delay: i * 9, easing: 'cubic-bezier(.2,.8,.2,1)' })));
  await wait(240);
  const end = ang(n - 1);
  sfx.riffle(n, 0.016, 0.08, 0.08);
  await all(cards.map((c, i) => move(c, swing(base(i), pv, ang(i), end, 6), { duration: 280, delay: i * 16, easing: 'cubic-bezier(.5,0,.6,1)' })));
  sfx.swoosh(0.3, 1400, 500);
  await all(cards.map((c, i) => move(c, swing(base(i), pv, end, 0, 8), { duration: 360, easing: 'cubic-bezier(.4,0,.2,1)' })));
  await all(cards.map((c, i) => move(c, rest(i), { duration: 180, easing: 'ease-out' })));
  sfx.tap(0.6);
  return cards;
}

export const FLOURISHES = {
  riffle: { name: '鸽尾洗牌', run: riffle },
  charlier: { name: '单手切牌', run: charlier },
  spring: { name: '弹牌', run: spring },
  fan: { name: '扇形展开', run: fan }
};
