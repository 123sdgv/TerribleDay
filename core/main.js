/* 入口：挂上上次用的主题，没有就用第一个 */
import { THEMES } from '../themes/index.js';
import { useTheme, savedTheme } from './switcher.js';

useTheme(savedTheme() || THEMES[0].id);

/* 旧版本装过 service worker 和缓存，清掉，免得手机上一直拿到旧页面 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
if (window.caches) {
  caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
}
