/* 场景、分类、小事 —— 以 Notion「TerribleDay 重做规划」为准，不合适直接改这里。
   min  默认倒计时分钟：小事 > 分类 > 场景，越具体越优先
   stop 容易沉迷，到点提醒放下手机
   小事可以直接写字符串，也可以写 { t: '内容', min: 分钟 } */

export const SCENES = [
  {
    id: 'anywhere', name: '随地', icon: 'star', min: 10,
    categories: [
      { name: '涂涂画画', tasks: ['控笔排线', '局部速涂', '不找参考画 OC 草图', '乱画小表情', '临摹各种', '描图'] },
      { name: '好玩的学', tasks: ['多邻国', 'Mimo 学 HTML', '让 AI 用英语出题', '和 AI 英语闲聊', '单词复习'] },
      { name: '聊 OC', tasks: ['找 ChatGPT 聊设定', '记下三句对话', '想一件 OC 今天会遇到的小事'] },
      { name: '看漫画/小说', stop: true, tasks: ['看漫画', '看小说'] },
      { name: '随手记一笔', tasks: ['Notion 计划表记一条或勾一条', '三句话记今天的小细节'] },
      { name: '数字大扫除', tasks: ['删废图', '关旧标签页', '整理备忘录'] }
    ]
  },
  {
    id: 'library', name: '图书馆', icon: 'book', min: 30,
    categories: [
      { name: '计算机一级', tasks: ['选择题', '知识点', '操作题', '找 ChatGPT 学 Python'] },
      { name: '初级会计', min: 40, tasks: ['看一节课', '做测试题'] },
      { name: 'Coding', tasks: ['项目书挑一个做', '学习 codex'] },
      { name: '整理规划', tasks: ['整理 Notion 项目书', '整理计划表'] },
      { name: '写 OC', tasks: ['找个大纲开始写文'] },
      { name: '认真画 OC', min: 45, tasks: ['找参考认真画', '补完草稿'] }
    ]
  },
  {
    id: 'dorm', name: '宿舍', icon: 'house', min: 30,
    categories: [
      { name: '十字绣/不织布', min: 40, tasks: ['十字绣', '不织布'] },
      { name: '编织', tasks: ['编手链'] },
      { name: '手账', min: 40, tasks: ['做一页', '剪素材', '搭配色系'] },
      { name: '收拾宿舍', tasks: ['收拾宿舍'] },
      { name: '做题', tasks: ['英语阅读', '卷子'] },
      { name: '电脑时间', tasks: ['计算机一级', { t: '初级会计', min: 40 }, '项目书', 'codex'] },
      { name: '写 OC 文或画画', tasks: ['写 OC 文', '画画'] },
      { name: '电影/动漫', stop: true, tasks: ['电影', '动漫'] }
    ]
  },
  {
    id: 'lazy', name: '不想动', icon: 'circle', min: 10,
    categories: [
      { name: '听歌发呆', tasks: ['听歌发呆'] },
      { name: '找 AI 扯淡', tasks: ['找 AI 扯淡'] },
      { name: '给 Claude 找麻烦', tasks: ['给 Claude 找麻烦'] },
      { name: '刷推特', stop: true, min: 15, tasks: ['刷推特'] },
      { name: '翻旧作品', tasks: ['翻旧作品', '看收藏夹养眼'] },
      { name: '伸展喝水', min: 5, tasks: ['伸展一下', '喝水', '顺手扔垃圾'] },
      { name: '心安理得休息', tasks: ['心安理得休息'] }
    ]
  }
];
