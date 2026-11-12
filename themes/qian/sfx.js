/* 抽签的音效：全部现场合成，不用音频文件。手机开静音时会被静音。 */
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

/* 一小段过滤过的噪声：竹签碰撞、纸张沙沙都靠它 */
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
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.006, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(at, Math.random() * (BUF_SEC - dur - 0.05), dur + 0.02);
}

/* 一个短音：木头的「笃」、印章的闷响 */
function tone(ac, at, { f = 600, f2 = 0, dur = 0.06, vol = 0.1, type = 'sine' } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
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

/* 竹签互相磕一下 */
function clack(ac, at, v = 1) {
  hiss(ac, at, { dur: 0.022, f: 1900 + Math.random() * 1700, q: 5, vol: 0.2 * v });
  tone(ac, at, { f: 760 + Math.random() * 520, dur: 0.035, vol: 0.05 * v, type: 'triangle' });
}

export const sfx = {
  /* 摇签筒：每一下哗啦两三声 */
  rattle() {
    play((ac, t) => {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) clack(ac, t + k * 0.018 + Math.random() * 0.02, 0.6 + Math.random() * 0.5);
    });
  },
  /* 签从筒里滑出来 */
  pop() {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.2, f: 900, f2: 2600, q: 0.8, vol: 0.1 });
      clack(ac, t + 0.02, 0.8);
    });
  },
  /* 签落定：笃 */
  land() {
    play((ac, t) => {
      tone(ac, t, { f: 520, f2: 330, dur: 0.09, vol: 0.12, type: 'triangle' });
      hiss(ac, t, { dur: 0.02, f: 1500, q: 2, vol: 0.12 });
    });
  },
  /* 签纸展开 / 卷起 */
  unroll() {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.42, f: 520, f2: 1900, q: 0.6, vol: 0.08 });
      for (let k = 0; k < 4; k++) hiss(ac, t + 0.05 + k * 0.08 + Math.random() * 0.04, { dur: 0.012, f: 2600, q: 2, vol: 0.05 });
    });
  },
  rollup() {
    play((ac, t) => hiss(ac, t, { dur: 0.3, f: 1900, f2: 560, q: 0.6, vol: 0.07 }));
  },
  /* 签插回筒里 */
  drop() {
    play((ac, t) => {
      clack(ac, t, 0.9);
      clack(ac, t + 0.06, 0.5);
    });
  },
  /* 盖印：咚 */
  stamp() {
    play((ac, t) => {
      tone(ac, t, { f: 120, f2: 58, dur: 0.18, vol: 0.28 });
      hiss(ac, t, { dur: 0.06, f: 900, q: 0.7, vol: 0.18 });
    });
  },
  /* 点香：嗤 */
  light() {
    play((ac, t) => {
      hiss(ac, t, { dur: 0.08, f: 3400, q: 1.2, vol: 0.12 });
      hiss(ac, t + 0.05, { dur: 0.35, f: 2200, f2: 900, q: 0.5, vol: 0.06 });
    });
  },
  /* 轻轻一下：拿起签纸、加减时间 */
  click() {
    play((ac, t) => hiss(ac, t, { dur: 0.014, f: 3000, q: 2, vol: 0.12 }));
  },
  /* 一炷香燃尽：敲两下磬 */
  bowl() {
    play((ac, t) => {
      const f0 = 392;
      const parts = [[1, 0.2, 3.4], [2.76, 0.07, 2.2], [5.4, 0.035, 1.3], [8.9, 0.015, 0.8]];
      [0, 1.7].forEach(r => {
        parts.forEach(([m, v, d]) => {
          [0, 1.6].forEach(det => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = 'sine';
            o.frequency.value = f0 * m + det;
            g.gain.setValueAtTime(0.0001, t + r);
            g.gain.exponentialRampToValueAtTime(v * 0.6, t + r + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + r + d);
            o.connect(g);
            g.connect(ac.destination);
            o.start(t + r);
            o.stop(t + r + d + 0.05);
          });
        });
        hiss(ac, t + r, { dur: 0.03, f: 2400, q: 1.5, vol: 0.08 });
      });
    });
  }
};
