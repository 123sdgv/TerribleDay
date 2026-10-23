/* 月下星屑：深夜蓝 + 月光金。今天拾起的碎片会变成天上的星星。 */
window.__THEMES__ = window.__THEMES__ || {};

window.__THEMES__.moon = {
  name: '月下星屑',
  bg: '#0B1026',
  bgImg: 'radial-gradient(120% 60% at 15% 0%, rgba(58,64,140,.55) 0%, rgba(58,64,140,0) 60%),' +
         'radial-gradient(90% 50% at 100% 100%, rgba(120,72,140,.35) 0%, rgba(120,72,140,0) 70%),' +
         'linear-gradient(180deg, #0B1026 0%, #121842 55%, #1E1A45 100%)',
  text: '#F3EBDD',
  dim: 'rgba(243,235,221,.55)',
  panel: 'rgba(22,27,66,.68)',
  border: 'rgba(232,194,122,.22)',
  accent: '#E8C27A',
  accent2: '#B9A2E8',
  onAccent: '#1A1530',
  wheel: ['rgba(40,48,112,.80)', 'rgba(26,32,82,.80)', 'rgba(52,44,106,.80)'],
  wheelText: '#F3EBDD',
  wheelLine: 'rgba(232,194,122,.26)',
  radius: '22px',
  btnRadius: '14px',
  fx: { sky: true, ticks: true, moonHub: true },
  swatch: 'radial-gradient(circle at 26% 34%, #FFF4D6 0 13%, rgba(255,244,214,0) 14%),' +
          'radial-gradient(circle at 72% 30%, #E8C27A 0 3%, rgba(0,0,0,0) 4%),' +
          'radial-gradient(circle at 60% 70%, #E8C27A 0 2.5%, rgba(0,0,0,0) 3.5%),' +
          'linear-gradient(160deg, #283070, #0B1026 60%, #2A1F4A)',
  css: [
    /* 标题：月光渐变字 */
    'h1{background:linear-gradient(180deg,#FFF6E0 10%,#E8C27A 95%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(232,194,122,.25));letter-spacing:.14em}',
    '#hint{letter-spacing:.22em}',

    /* 场景切换：金色细线 */
    '#modes{background:rgba(255,255,255,.035);border-color:rgba(232,194,122,.2);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}',
    '.mode-btn{color:rgba(243,235,221,.5)}',
    '.mode-btn.active{background:linear-gradient(180deg,rgba(232,194,122,.22),rgba(232,194,122,.06));color:#FFF3D6;box-shadow:inset 0 0 0 1px rgba(232,194,122,.45),0 0 18px rgba(232,194,122,.12)}',

    /* 转盘背后一圈呼吸的紫色光晕 */
    '#wheelWrap::before{content:"";position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(circle,rgba(185,162,232,.22) 0%,rgba(185,162,232,0) 62%);animation:halo 5s ease-in-out infinite;pointer-events:none}',
    '@keyframes halo{0%,100%{opacity:.6;transform:scale(.97)}50%{opacity:1;transform:scale(1.03)}}',

    /* 指针：一颗菱形小星 */
    '#pointer{top:-16px;width:1.5px;height:26px;background:linear-gradient(180deg,rgba(232,194,122,0),#E8C27A);border-radius:0}',
    '#pointer::after{bottom:-5px;width:11px;height:11px;border-radius:2px;transform:translateX(-50%) rotate(45deg);background:#FFE9B5;box-shadow:0 0 12px 3px rgba(232,194,122,.65)}',

    /* 卡片：夜色毛玻璃 */
    '#card{background:rgba(18,22,58,.78);box-shadow:0 24px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)}',
    '#cardTag{border-color:rgba(232,194,122,.3);color:rgba(243,235,221,.6)}',

    /* 按钮 */
    '.btn.accent{background:linear-gradient(180deg,#F5DA9E,#D7A957);color:#1A1530;box-shadow:0 6px 22px rgba(232,194,122,.28),inset 0 1px 0 rgba(255,255,255,.5)}',
    '.btn.ghost{background:rgba(255,255,255,.03);border-color:rgba(232,194,122,.28)}',
    '.round{background:rgba(255,255,255,.04);border-color:rgba(232,194,122,.3);color:#F3EBDD}',

    /* 底部碎片：小圆点换成四芒星 */
    '.dot{width:auto;height:auto;background:none;border-radius:0;color:#E8C27A;font-size:11px;line-height:1;text-shadow:0 0 6px rgba(232,194,122,.8)}',
    '.dot::before{content:"\\2726"}',

    /* 专注页：让星空透出来 */
    '#taskView{background:rgba(9,13,34,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}',
    '#taskTag{border-color:rgba(232,194,122,.45);background:rgba(232,194,122,.06)}',
    '#taskName{color:#FFF6E3}',
    '#timer .track{stroke:rgba(232,194,122,.14)}',
    '#timer .prog{filter:drop-shadow(0 0 6px rgba(232,194,122,.55))}',
    '#timer .head{fill:#FFF0C8;filter:drop-shadow(0 0 5px rgba(255,230,170,.9))}',
    '#timeText{color:#FFF6E3;text-shadow:0 0 24px rgba(232,194,122,.25)}',

    /* 设置面板 */
    '#gear{background:rgba(22,27,66,.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}',
    '#settings{background:rgba(4,6,20,.5)}'
  ].join('\n')
};
