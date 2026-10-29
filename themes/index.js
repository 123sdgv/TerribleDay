/* 主题清单。每个主题自己决定怎么抽、计时长什么样、换主题按钮长什么样。

   加新主题：
   1. 在 themes/ 下新建一个文件夹，文件夹名就是主题 id（小写字母、数字、横线），里面放：
        index.js     导出 mount(root, app)：把页面画进 root，返回一个清理函数；
                     需要换主题时调用 app.openPicker()
        style.css    这个主题的样式
        preview.svg  选主题弹窗里的小图
      可以照着 tarot/ 或 poker/ 写。
   2. 在下面加一行。排第一个的是默认主题。color 是手机顶部状态栏的颜色。 */
export const THEMES = [
  { id: 'tarot', name: '塔罗', color: '#1B1433', load: () => import('./tarot/index.js') },
  { id: 'poker', name: '扑克', color: '#0E3B26', load: () => import('./poker/index.js') }
];
