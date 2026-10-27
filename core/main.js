/* 入口：挂上默认主题 */
import { THEMES } from '../themes/index.js';
import { useTheme } from './switcher.js';

useTheme(THEMES[0].id);

/* 旧版本装过 service worker 和缓存，清掉，免得手机上一直拿到旧页面 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
if (window.caches) {
  caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
}
