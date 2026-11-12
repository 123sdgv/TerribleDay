/* 抽签主题的画：签筒、定印、铜钱、香炉和一炷香、宣纸上的远山。都是内嵌 SVG，id 统一用 q- 开头。 */

const f2 = n => n.toFixed(2);

/* ---------- 签筒 ---------- */
const BODY = 'M30 70A40 10 0 0 0 110 70L105 198Q105 208 70 208Q35 208 35 198Z';
const edgeX = y => 30 + ((y - 70) / 128) * 5;
const node = y => `M${f2(edgeX(y) + 0.6)} ${y}Q70 ${y + 12} ${f2(140 - edgeX(y) - 0.6)} ${y}`;

/* 一支签：扁扁的竹片，头上一截朱红。外层管歪的角度，里层留给摇的时候抖动 */
const SW = 5.4, TIP = 15;
function stick(x, top, rot, cls) {
  const x0 = x - SW / 2;
  return (
    `<g transform="rotate(${f2(rot)} ${f2(x)} 72)"><g class="${cls}">` +
    `<rect class="stk-body" x="${f2(x0)}" y="${f2(top)}" width="${SW}" height="${f2(98 - top)}" rx=".9"/>` +
    `<rect class="stk-tip" x="${f2(x0)}" y="${f2(top)}" width="${SW}" height="${TIP}" rx=".9"/>` +
    `<path class="stk-line" d="M${f2(x0)} ${f2(top + TIP)}h${SW}"/>` +
    `</g></g>`
  );
}

const STICKS = (() => {
  let s = '';
  const n = 13;
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2;
    s += stick(70 + k * 4.6, 18 + ((i * 7) % 5) * 3 + Math.abs(k) * 1.2, k * 2.2, 'stk');
  }
  /* 摇出来的那几支，平时混在中间 */
  [[64, 12, -2.4], [70, 9, 0], [76, 12, 2.4]].forEach(([x, t, r], i) => (s += stick(x, t, r, 'stk out out' + i)));
  return s;
})();

export const TUBE = `<svg class="tube-art" viewBox="0 0 140 220" aria-hidden="true">
  <defs>
    <linearGradient id="q-bamboo" x1="30" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9A8459"/><stop offset=".18" stop-color="#CBB68A"/><stop offset=".4" stop-color="#E8DAB6"/>
      <stop offset=".64" stop-color="#D6C296"/><stop offset="1" stop-color="#8A744B"/>
    </linearGradient>
    <linearGradient id="q-wash" x1="0" y1="70" x2="0" y2="208" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2B2723" stop-opacity="0"/><stop offset="1" stop-color="#2B2723" stop-opacity=".24"/>
    </linearGradient>
    <filter id="q-rough" x="-6%" y="-6%" width="112%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <ellipse class="tube-shadow" cx="70" cy="209" rx="50" ry="6"/>
  <ellipse class="mouth" cx="70" cy="70" rx="40" ry="10"/>
  <path class="rim-back" d="M30 70A40 10 0 0 1 110 70"/>
  <g class="sticks">${STICKS}</g>
  <path d="${BODY}" fill="url(#q-bamboo)"/>
  <path d="${BODY}" fill="url(#q-wash)"/>
  <g class="ink" filter="url(#q-rough)">
    <path class="outline" d="${BODY}"/>
    <path class="rim-front" d="M30 70A40 10 0 0 0 110 70"/>
    <path class="node" d="${node(104)}"/><path class="node faint" d="${node(108)}"/>
    <path class="node" d="${node(176)}"/><path class="node faint" d="${node(180)}"/>
  </g>
  <rect class="label" x="59" y="118" width="22" height="44" rx="1.5"/>
  <rect class="label-line" x="61.2" y="120.2" width="17.6" height="39.6" rx=".8"/>
  <text class="label-t" x="70" y="137.5">灵</text>
  <text class="label-t" x="70" y="155.5">签</text>
</svg>`;

/* ---------- 定印：签纸拖到这里就是选它 ---------- */
export const SEAL = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <filter id="q-stamp" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 5" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in" result="s"/>
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="9" result="w"/>
      <feDisplacementMap in="s" in2="w" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#q-stamp)">
    <rect class="s-fill" x="9" y="9" width="82" height="82" rx="9"/>
    <rect class="s-line" x="9" y="9" width="82" height="82" rx="9"/>
    <rect class="s-line thin" x="17.5" y="17.5" width="65" height="65" rx="4"/>
    <text class="s-txt" x="50" y="67">定</text>
  </g>
</svg>`;

/* ---------- 铜钱：换主题 ---------- */
export const COIN = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle class="c-face" cx="12" cy="12" r="9.4"/>
  <circle class="c-rim" cx="12" cy="12" r="7.6"/>
  <rect class="c-hole" x="9.3" y="9.3" width="5.4" height="5.4" rx=".4"/>
  <path class="c-char" d="M12 5.6v1.8M12 16.6v1.8M5.6 12h1.8M16.6 12h1.8"/>
</svg>`;

/* ---------- 一炷香 + 香炉 ---------- */
export const INCENSE_TOP = 40;
export const INCENSE_BASE = 200;
export const ASH_Y = 234;

export const CENSER = `<svg class="incense" viewBox="0 0 160 300" aria-hidden="true">
  <defs>
    <radialGradient id="q-glow">
      <stop offset="0" stop-color="#FFB15C" stop-opacity=".95"/><stop offset=".35" stop-color="#F26B2E" stop-opacity=".45"/>
      <stop offset="1" stop-color="#F26B2E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="q-smoke" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#6F6961" stop-opacity=".75"/><stop offset=".5" stop-color="#6F6961" stop-opacity=".36"/>
      <stop offset="1" stop-color="#6F6961" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="q-bronze" x1="28" y1="0" x2="132" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#24211E"/><stop offset=".28" stop-color="#5B544B"/><stop offset=".5" stop-color="#3E3933"/>
      <stop offset="1" stop-color="#1F1C19"/>
    </linearGradient>
    <filter id="q-blur" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="q-rough2" x="-6%" y="-6%" width="112%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="11"/>
      <feDisplacementMap in="SourceGraphic" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g class="smoke">
    <path class="sm s1" filter="url(#q-blur)"/>
    <path class="sm s2"/>
    <path class="sm s3"/>
  </g>
  <path class="ear" d="M37 233V220Q37 215.5 41.5 215.5H49.5Q54 215.5 54 220V232"/>
  <path class="ear" d="M106 232V220Q106 215.5 110.5 215.5H118.5Q123 215.5 123 220V233"/>
  <ellipse class="inside" cx="80" cy="${ASH_Y}" rx="52" ry="8"/>
  <ellipse class="ash" cx="80" cy="${ASH_Y + 0.6}" rx="46.5" ry="5.8"/>
  <g class="fallen"></g>
  <rect class="handle" x="78.8" y="${INCENSE_BASE - 2}" width="2.4" height="${ASH_Y - INCENSE_BASE + 2}"/>
  <rect class="coat" x="78.4" y="${INCENSE_TOP}" width="3.2" height="${INCENSE_BASE - INCENSE_TOP}" rx=".8"/>
  <rect class="ash-tip" x="78.6" y="${INCENSE_TOP}" width="2.8" height="0" rx=".8"/>
  <circle class="glow" cx="80" cy="${INCENSE_TOP}" r="10" fill="url(#q-glow)"/>
  <circle class="ember" cx="80" cy="${INCENSE_TOP}" r="1.9"/>
  <g class="flame-pos"><path class="flame" d="M80 ${INCENSE_TOP - 15}C84 ${INCENSE_TOP - 9} 84.6 ${INCENSE_TOP - 4} 80 ${INCENSE_TOP}C75.4 ${INCENSE_TOP - 4} 76 ${INCENSE_TOP - 9} 80 ${INCENSE_TOP - 15}Z"/></g>
  <ellipse class="mound" cx="80" cy="${ASH_Y + 0.4}" rx="5.5" ry="1.8"/>
  <g class="pot">
    <path class="leg" d="M45 276L38.5 293H46L51.5 279"/>
    <path class="leg" d="M115 276L121.5 293H114L108.5 279"/>
    <path class="bowl" d="M28 ${ASH_Y}A52 8 0 0 0 132 ${ASH_Y}C132 266 114 284 80 284C46 284 28 266 28 ${ASH_Y}Z"/>
    <path class="band" d="M33.5 251Q80 266 126.5 251"/>
    <path class="band red" d="M36 256Q80 270.5 124 256"/>
    <g class="ink" filter="url(#q-rough2)">
      <path class="bowl-line" d="M28 ${ASH_Y}A52 8 0 0 0 132 ${ASH_Y}C132 266 114 284 80 284C46 284 28 266 28 ${ASH_Y}Z"/>
      <path class="rim-line" d="M28 ${ASH_Y}A52 8 0 0 1 132 ${ASH_Y}"/>
    </g>
  </g>
</svg>`;

/* ---------- 宣纸背景：远山、淡淡的朱砂日头、几只鸟、几片花瓣 ---------- */
function ridge(base, peaks, seed) {
  let d = 'M0 260';
  for (let x = 0; x <= 400; x += 8) {
    let y = base;
    peaks.forEach(([c, h, w]) => (y -= h * Math.exp(-(((x - c) / w) ** 2))));
    y -= 3 * Math.sin(x * 0.07 + seed) + 1.6 * Math.sin(x * 0.21 + seed * 2.3);
    d += 'L' + x + ' ' + f2(y);
  }
  return d + 'L400 260Z';
}

const HILLS = [
  { cls: 'far', base: 158, color: '#7C776F', op: 0.2, top: 70, peaks: [[115, 50, 40], [200, 78, 46], [305, 50, 38]], seed: 1 },
  { cls: 'mid', base: 196, color: '#5E5952', op: 0.24, top: 135, peaks: [[55, 34, 40], [168, 46, 36], [262, 38, 50], [352, 34, 34]], seed: 4 },
  { cls: 'near', base: 232, color: '#3F3B36', op: 0.26, top: 190, peaks: [[105, 22, 60], [292, 28, 55]], seed: 8 }
];

export function scenery() {
  const box = document.createElement('div');
  box.className = 'scenery';
  box.setAttribute('aria-hidden', 'true');
  let defs = '', paths = '';
  HILLS.forEach((h, i) => {
    defs +=
      `<linearGradient id="q-h${i}" x1="0" y1="${h.top}" x2="0" y2="258" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="${h.color}" stop-opacity="${h.op}"/><stop offset=".55" stop-color="${h.color}" stop-opacity="${f2(h.op * 0.35)}"/>` +
      `<stop offset="1" stop-color="${h.color}" stop-opacity="0"/></linearGradient>`;
    paths += `<path class="hill ${h.cls}" d="${ridge(h.base, h.peaks, h.seed)}" fill="url(#q-h${i})"/>`;
  });
  let petals = '';
  for (let i = 0; i < 6; i++) {
    petals +=
      `<i class="petal" style="--x:${(8 + Math.random() * 84).toFixed(1)}%;--d:${(15 + Math.random() * 10).toFixed(1)}s;` +
      `--dl:-${(Math.random() * 25).toFixed(1)}s;--sw:${(Math.random() * 40 + 20).toFixed(0)}px;--s:${(5 + Math.random() * 3).toFixed(1)}px"></i>`;
  }
  box.innerHTML =
    '<i class="sun"></i>' +
    '<svg class="birds" viewBox="0 0 60 24"><path d="M4 12q4-4 8 0q4-4 8 0M30 6q3-3 6 0q3-3 6 0M44 16q2.5-2.5 5 0q2.5-2.5 5 0"/></svg>' +
    `<svg class="hills" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${paths}</svg>` +
    petals;
  return box;
}
