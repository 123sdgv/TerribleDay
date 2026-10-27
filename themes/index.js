/* 主题清单。每个主题自己决定怎么抽、计时长什么样、换主题按钮长什么样。

   加新主题：
   1. 在 themes/ 下新建一个文件夹，放 index.js 和 style.css（可以照着 tarot/ 写）
      index.js 导出 mount(root, app)：把页面画进 root，返回一个清理函数；
      需要换主题时调用 app.openPicker()
   2. 在下面加一行。排第一个的是默认主题。 */
export const THEMES = [
  {
    id: 'tarot',
    name: '塔罗',
    css: 'themes/tarot/style.css',
    preview: 'themes/tarot/preview.svg',
    load: () => import('./tarot/index.js')
  }
];
