/* 扑克主题的图形：四种花色、筹码、七段数码管计时屏 */

export const SUITS = {
  diamond: '<path d="M12 2.4 19.4 12 12 21.6 4.6 12z"/>',
  spade:
    '<path d="M12 2.6c-2.5 3.7-8.1 6.6-8.1 11.1 0 2.4 1.9 4.2 4.2 4.2 1.4 0 2.6-.6 3.3-1.6-.2 2.1-1 3.6-2.6 4.9h6.4c-1.6-1.3-2.4-2.8-2.6-4.9.7 1 1.9 1.6 3.3 1.6 2.3 0 4.2-1.8 4.2-4.2 0-4.5-5.6-7.4-8.1-11.1z"/>',
  heart:
    '<path d="M12 20.8C11.3 20.2 3.3 14.9 3.3 9.4c0-2.7 2-4.7 4.5-4.7 1.8 0 3.3 1 4.2 2.6.9-1.6 2.4-2.6 4.2-2.6 2.5 0 4.5 2 4.5 4.7 0 5.5-8 10.8-8.7 11.4z"/>',
  club:
    '<circle cx="12" cy="7.3" r="4"/><circle cx="7.3" cy="13.1" r="4"/><circle cx="16.7" cy="13.1" r="4"/><circle cx="12" cy="12" r="2.6"/><path d="M12 11.5c-.2 4.4-1.1 7.5-3.7 9.9h7.4c-2.6-2.4-3.5-5.5-3.7-9.9z"/>'
};
export const RED = { diamond: true, heart: true };
export const suitSvg = k => `<svg class="suit" viewBox="0 0 24 24" aria-hidden="true">${SUITS[k]}</svg>`;

/* 筹码：边上六块白色嵌片，中间一圈虚线；label 不填就印一个黑桃 */
export function chipSvg(color, edge, label) {
  let spots = '';
  for (let k = 0; k < 6; k++) {
    spots += `<rect x="13.6" y="1.4" width="4.8" height="5.6" rx="1.2" transform="rotate(${k * 60} 16 16)"/>`;
  }
  const mid = label
    ? `<text x="16" y="16.4" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="8.4" fill="${edge}">${label}</text>`
    : `<g transform="translate(11.2 11.2) scale(.4)" fill="${edge}">${SUITS.spade}</g>`;
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="15.2" fill="${color}"/>
    <circle cx="16" cy="16" r="15.2" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>
    <g fill="${edge}">${spots}</g>
    <circle cx="16" cy="16" r="10.4" fill="none" stroke="${edge}" stroke-width=".8" stroke-dasharray="1.5 1.7"/>
    <circle cx="16" cy="16" r="8.6" fill="${color}" stroke="rgba(0,0,0,.22)" stroke-width=".6"/>
    ${mid}
  </svg>`;
}

/* ---------- 七段数码管 ---------- */
const NS = 'http://www.w3.org/2000/svg';
const SEG = { a: [28, 5, 1], b: [51, 27.5, 0], c: [51, 72.5, 0], d: [28, 95, 1], e: [5, 72.5, 0], f: [5, 27.5, 0], g: [28, 50, 1] };
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const DIGIT_X = [0, 68, 160, 228];

function segPoints(cx, cy, horiz) {
  const h = 4.5, l = horiz ? 19 : 19.5;
  const pts = horiz
    ? [[cx - l, cy], [cx - l + h, cy - h], [cx + l - h, cy - h], [cx + l, cy], [cx + l - h, cy + h], [cx - l + h, cy + h]]
    : [[cx, cy - l], [cx + h, cy - l + h], [cx + h, cy + l - h], [cx, cy + l], [cx - h, cy + l - h], [cx - h, cy - l + h]];
  return pts.map(p => p.join(',')).join(' ');
}
const svgEl = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/* 返回 { svg, set('mm:ss', 冒号亮不亮) } */
export function buildClock() {
  const svg = svgEl('svg', { viewBox: '0 -3 300 106', 'aria-hidden': 'true' });
  const g = svgEl('g', { transform: 'translate(12 0) skewX(-7)' });
  svg.append(g);
  const digits = DIGIT_X.map(x => {
    const dg = svgEl('g', { transform: `translate(${x} 0)` });
    const segs = {};
    for (const k in SEG) {
      const [cx, cy, h] = SEG[k];
      segs[k] = svgEl('polygon', { points: segPoints(cx, cy, h), class: 'sg' });
      dg.append(segs[k]);
    }
    g.append(dg);
    return segs;
  });
  const dots = [31, 69].map(cy => {
    const c = svgEl('circle', { cx: 142, cy, r: 5.5, class: 'sg' });
    g.append(c);
    return c;
  });
  let prev = '';
  return {
    svg,
    set(str, colon) {
      const key = str + (colon ? '1' : '0');
      if (key === prev) return;
      prev = key;
      const ds = str.replace(':', '');
      digits.forEach((segs, i) => {
        const on = DIGITS[ds[i]] || '';
        for (const k in segs) segs[k].classList.toggle('on', on.includes(k));
      });
      dots.forEach(d => d.classList.toggle('on', colon));
    }
  };
}
