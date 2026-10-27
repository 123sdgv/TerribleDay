/* 四个场景图标：随地 = 五角星，图书馆 = 书，宿舍 = 房子，不想动 = 一个圈 */
const svg = inner => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  star: svg('<path d="M12 3.4l2.55 5.3 5.8.75-4.25 4 1.05 5.75L12 16.4l-5.15 2.8 1.05-5.75-4.25-4 5.8-.75z"/>'),
  book: svg('<path d="M12 6.6C10 5.1 7 4.6 3.6 5v13.3c3.4-.4 6.4.1 8.4 1.6 2-1.5 5-2 8.4-1.6V5c-3.4-.4-6.4.1-8.4 1.6zM12 6.6v13.3"/>'),
  house: svg('<path d="M3.8 11.4 12 4.6l8.2 6.8M6.2 9.6v10h11.6v-10M10.2 19.6v-5h3.6v5"/>'),
  circle: svg('<circle cx="12" cy="12" r="7.6"/>')
};
