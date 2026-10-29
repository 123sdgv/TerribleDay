/* 扑克的音效：全部现场合成，不用音频文件。手机开静音时会被静音。 */
import { audio } from '../../core/core.js';

const BUF_SEC = 1.5;
let noiseBuf = null;
function noise(ac) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * BUF_SEC), ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/* 一小段过滤过的噪声：纸牌摩擦、拍桌子都靠它 */
function hiss(ac, at, { dur = 0.03, f = 3000, f2 = 0, q = 1, vol = 0.2 } = {}) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f, at);
  if (f2) bp.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.005, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(at, Math.random() * (BUF_SEC - dur - 0.05), dur + 0.02);
}

/* 一声闷响：牌落到绒布上 */
function thump(ac, at, f = 140, vol = 0.15, dur = 0.06) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, at);
  o.frequency.exponentialRampToValueAtTime(f * 0.5, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function play(fn) {
  const ac = audio();
  if (!ac) return;
  try { fn(ac, ac.currentTime + 0.01); } catch (e) {}
}

export const sfx = {
  /* 一串哒哒哒：洗牌、弹牌 */
  riffle(n, step, vol = 0.14, lead = 0) {
    play((ac, t) => {
      for (let k = 0; k < n; k++) {
        hiss(ac, t + lead + k * step + Math.random() * step * 0.3, {
          dur: 0.016, f: 2400 + Math.random() * 2200, q: 1.3, vol: vol * (0.7 + Math.random() * 0.5)
        });
      }
    });
  },
  /* 甩出一张牌 */
  flick() {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.08, f: 1600, f2: 4200, q: 0.8, vol: 0.3 });
      thump(ac, t, 180, 0.08, 0.04);
    });
  },
  /* 牌落桌 / 把牌磕整齐 */
  tap(v = 1) {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.024, f: 1300, q: 1, vol: 0.26 * v });
      thump(ac, t, 120, 0.12 * v, 0.05);
    });
  },
  /* 翻牌 */
  flip() {
    play((ac, t) => hiss(ac, t, { dur: 0.12, f: 800, f2: 3400, q: 0.7, vol: 0.2 }));
  },
  /* 唰：摊开、合上 */
  swoosh(dur = 0.3, f = 500, f2 = 2200) {
    play((ac, t) => hiss(ac, t, { dur, f, f2, q: 0.6, vol: 0.12 }));
  },
  /* 计时屏按键 */
  click() {
    play((ac, t) => hiss(ac, t, { dur: 0.012, f: 4200, q: 2, vol: 0.22 }));
  },
  /* 筹码磕一下 */
  chip() {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.014, f: 5200, q: 3, vol: 0.2 });
      hiss(ac, t + 0.045, { dur: 0.012, f: 4600, q: 3, vol: 0.14 });
    });
  }
};
