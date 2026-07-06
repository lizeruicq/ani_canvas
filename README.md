# AniCanvas — 卡通动画编辑器

一个面向「智能体开发原理与知识讲解」的 Web 动画编辑工具。用关键帧 + 缓动驱动场景中的图形,做出带挤压拉伸、弹跳等卡通游戏感的动画,适合制作技术讲解类短视频。

## 特性

- **图形绘制**:矩形、椭圆、直线、箭头、文本、自由画笔,支持选中、拖拽、缩放、旋转。
- **关键帧动画**:为位置、旋转、缩放、透明度等属性打关键帧,7 种缓动(线性、easeIn/Out、back、bounce 等),属性在关键帧间自动插值。
- **时间轴**:多图层、可展开折叠、关键帧菱形标记、播放头拖拽 scrub、自动关键帧模式。
- **播放控制**:播放/暂停、循环、逐帧步进、跳转相邻关键帧,高刷新率下不卡顿。
- **卡通风格**:默认浅色场景 + 深色描边 + 柔和阴影,配合 bounce/back 缓动实现游戏化表现力。
- **DSL 导入**:用行式文本描述场景与关键帧,便于人或 AI 直接编写。
- **导出**:项目存为 JSON;动画可录制导出为 WebM 视频。
- **可调整布局**:左右面板、时间轴高度均可拖拽调整。

## 技术栈

- React 18 + TypeScript
- Vite 5
- Konva / react-konva(Canvas 渲染)
- Zustand + Immer(状态管理 + 不可变更新的历史栈,支持撤销/重做)
- Tailwind CSS v3
- lucide-react(图标)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

开发服务器默认运行在 http://localhost:5173/。

## 项目结构

```
src/
├── main.tsx               # 应用入口
├── App.tsx                # 布局 + 全局键盘快捷键
├── store.ts               # Zustand+Immer 编辑器状态(场景/帧/历史/自动关键帧)
├── types.ts               # Scene/SceneNode/Keyframe 类型、可动画属性、缓动
├── index.css              # Tailwind + 浅色主题样式
├── model/
│   ├── defaults.ts        # 节点/场景工厂、弹跳小球示例
│   ├── interpolate.ts     # 缓动函数 + 关键帧采样
│   ├── effective.ts       # 计算指定帧的生效属性
│   └── dsl.ts             # 行式 DSL 解析器
└── components/
    ├── Header.tsx          # 顶栏:工具、撤销重做、导入导出
    ├── LayersPanel.tsx     # 图层面板
    ├── CanvasStage.tsx     # Konva 画布与交互
    ├── PropertiesPanel.tsx # 属性与关键帧编辑
    ├── Timeline.tsx        # 时间轴与播放控制
    ├── NodeRenderers.tsx   # 各节点类型渲染
    ├── Splitter.tsx        # 面板拖拽分割条
    └── VideoExportModal.tsx# WebM 录制导出
```

## 使用说明

### 绘制与编辑
顶部工具栏选择工具(或按数字键 1–7),在画布拖拽绘制。选择工具下可点选、拖动、缩放旋转对象。右侧属性面板可改填充/描边/尺寸,并为当前帧打关键帧。

### 关键帧
- 在属性面板点钥匙图标,为该属性在当前帧打关键帧。
- 打开「自动关键帧」(K)后,改动属性会自动记录关键帧。
- 时间轴上每个关键帧显示为菱形:琥珀色为普通关键帧,蓝色为当前播放头所在的关键帧。可拖拽移动、右键删除。

### 播放
空格播放/暂停,左右箭头逐帧,循环开关。时间轴顶部标尺可点击跳转,播放头可拖拽 scrub。

### DSL
点顶栏 Code 图标,粘贴行式 DSL 快速生成场景,例如:

```
scene fps=30 duration=150 width=1280 height=720 bg=#eef2f7
rect name=Agent x=180 y=300 w=200 h=130 fill=#4f7cff
keyframe Agent.x @0 = -260 [back]
keyframe Agent.x @25 = 180 [linear]
```

### 导出
- **保存项目**:顶栏保存按钮,导出 `.anicanvas.json` 项目文件,可再次打开继续编辑。
- **导出视频**:顶栏导出视频,实时录制为 WebM。

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `空格` | 播放 / 暂停 |
| `←` / `→` | 上一帧 / 下一帧 |
| `K` | 自动关键帧开关 |
| `1`–`7` | 切换工具 |
| `⌘Z` / `⌘⇧Z` | 撤销 / 重做 |
| `Delete` | 删除选中对象 |
| `Esc` | 取消选择 |

## 许可

MIT
