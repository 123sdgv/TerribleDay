/* 切换主题：换样式表、清掉旧主题、挂上新主题；以及右侧的选主题弹窗。
   会记住上次选的主题（只存一个主题名）。 */
import { THEMES } from '../themes/index.js';

const KEY = 'td-theme';
const cssOf = id => `themes/${id}/style.css`;
const previewOf = id => `themes/${id}/preview.svg`;

let current = null;
let cleanup = null;

export function savedTheme() {
  try { return localStorage.getItem(KEY); } catch (e) { return null; }
}

function loadCss(href) {
  const old = document.getElementById('theme-css');
  if (old && old.getAttribute('href') === href) return Promise.resolve();
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = link.onerror = () => {
      if (old) old.remove();
      link.id = 'theme-css';
      resolve();
    };
    document.head.append(link);
  });
}

export async function useTheme(id) {
  const theme = THEMES.find(t => t.id === id) || THEMES[0];
  if (theme.id === current) return;
  const [mod] = await Promise.all([theme.load(), loadCss(cssOf(theme.id))]);
  if (cleanup) cleanup();
  const root = document.getElementById('app');
  root.replaceChildren();
  current = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && theme.color) meta.setAttribute('content', theme.color);
  try { localStorage.setItem(KEY, theme.id); } catch (e) {}
  cleanup = mod.mount(root, { openPicker }) || null;
}

const CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';

export function openPicker() {
  if (document.querySelector('.picker')) return;
  const wrap = document.createElement('div');
  wrap.className = 'picker';
  wrap.innerHTML =
    `<div class="picker-panel" role="dialog" aria-modal="true" aria-label="选择主题">` +
    `<div class="picker-head"><span>主题</span><button class="picker-x" type="button" aria-label="关闭">${CLOSE}</button></div>` +
    `<div class="picker-list"></div></div>`;
  const list = wrap.querySelector('.picker-list');
  THEMES.forEach(t => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'picker-item';
    item.setAttribute('aria-current', t.id === current);
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.backgroundImage = `url("${previewOf(t.id)}")`;
    const name = document.createElement('span');
    name.textContent = t.name;
    item.append(sw, name);
    item.addEventListener('click', () => {
      close();
      useTheme(t.id);
    });
    list.append(item);
  });

  function close() {
    wrap.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 350);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  wrap.addEventListener('click', e => {
    if (e.target === wrap) close();
  });
  wrap.querySelector('.picker-x').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
}
