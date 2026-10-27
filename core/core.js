/* 和主题无关的部分：抽取、换一件、倒计时、声音、只存进行中的计时 */
import { SCENES } from '../tasks.js';

export { SCENES };
export const sceneById = id => SCENES.find(s => s.id === id) || SCENES[0];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const textOf = raw => (typeof raw === 'string' ? raw : raw.t);
const catOf = card => sceneById(card.sceneId).categories.find(c => c.name === card.cat);

function build(scene, cat, raw) {
  const o = typeof raw === 'string' ? { t: raw } : raw;
  return {
    sceneId: scene.id,
    cat: cat.name,
    task: o.t,
    min: o.min || cat.min || scene.min,
    stop: !!(o.stop || cat.stop)
  };
}

/* 抽一张：先抽分类，再从分类里抽一件小事；同一轮里尽量不重复分类 */
export function drawCard(scene, usedCats = []) {
  const pool = scene.categories.filter(c => !usedCats.includes(c.name));
  const cat = pick(pool.length ? pool : scene.categories);
  return build(scene, cat, pick(cat.tasks));
}

/* 换一件同分类的，不算重抽 */
export function canSwap(card) {
  const cat = catOf(card);
  return !!cat && cat.tasks.length > 1;
}
export function swapTask(card) {
  const cat = catOf(card);
  const others = cat ? cat.tasks.filter(t => textOf(t) !== card.task) : [];
  return others.length ? build(sceneById(card.sceneId), cat, pick(others)) : card;
}

/* 倒计时：用结束时间戳算剩余，锁屏、切后台回来也不会少算 */
const MIN = 60000;
export class Timer {
  constructor(ms = 0) {
    this.state = 'ready'; // ready | running | paused | over
    this.total = ms;
    this.remain = ms;
    this.end = 0;
  }
  static from(d) {
    const t = new Timer();
    Object.assign(t, { state: d.state, total: d.total, remain: d.remain, end: d.end });
    return t;
  }
  dump() {
    return { state: this.state, total: this.total, remain: this.remain, end: this.end };
  }
  left() {
    return this.state === 'running' ? Math.max(0, this.end - Date.now()) : this.remain;
  }
  frac() {
    return this.total ? Math.max(0, Math.min(1, this.left() / this.total)) : 0;
  }
  toggle() {
    if (this.state === 'running') {
      this.remain = this.left();
      this.state = 'paused';
    } else if (this.state === 'ready' || this.state === 'paused') {
      this.end = Date.now() + this.remain;
      this.state = 'running';
    }
  }
  /* 跑到点了就切到 over，返回 true 表示刚刚到点 */
  check() {
    if (this.state === 'running' && Date.now() >= this.end) {
      this.state = 'over';
      this.remain = 0;
      return true;
    }
    return false;
  }
  adjust(minutes) {
    const d = minutes * MIN;
    if (this.state === 'over') {
      if (d <= 0) return;
      this.total = this.remain = d;
      this.end = Date.now() + d;
      this.state = 'running';
      return;
    }
    const rem = this.left();
    const next = Math.max(MIN, rem + d);
    this.total = this.state === 'ready' ? next : Math.max(this.total + (next - rem), next);
    if (this.state === 'running') this.end = Date.now() + next;
    else this.remain = next;
  }
}

/* 只存正在进行的那一个计时，任务结束就删掉 */
const KEY = 'td-active';
export function saveActive(card, timer) {
  try { localStorage.setItem(KEY, JSON.stringify({ card, t: timer.dump() })); } catch (e) {}
}
export function loadActive() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && s.card && s.t && SCENES.some(x => x.id === s.card.sceneId) ? s : null;
  } catch (e) {
    return null;
  }
}
export function clearActive() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

/* 声音：iPhone 要在第一次点击里解锁 */
let ac = null;
export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ac = new AC();
    }
    if (ac && ac.state !== 'running') ac.resume();
  } catch (e) {}
}
function tone(freq, at, len, vol) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g);
  g.connect(ac.destination);
  o.start(at);
  o.stop(at + len + 0.05);
}
/* 做完：滴一声 */
export function beep() {
  if (!ac) return;
  try { ac.resume(); tone(1760, ac.currentTime + 0.01, 0.14, 0.22); } catch (e) {}
}
/* 到点：响一串铃 */
export function chime() {
  if (!ac) return;
  try {
    ac.resume();
    const t = ac.currentTime + 0.02;
    [0, 1.3].forEach(r =>
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, t + r + i * 0.2, 1.1, 0.15))
    );
  } catch (e) {}
}
/* 震动：安卓有效，iPhone 网页不支持 */
export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}
