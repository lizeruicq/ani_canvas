import { NodeType, Scene, SceneNode } from '../types'

let counter = 0
export function uid(prefix = 'n'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter}`
}

const PALETTE = ['#4f7cff', '#7c5cff', '#16a34a', '#f59e0b', '#ff6b9d', '#0ea5e9', '#ef4444']
let colorIdx = 0
function nextColor() {
  const c = PALETTE[colorIdx % PALETTE.length]
  colorIdx += 1
  return c
}

const NAME_MAP: Record<NodeType, string> = {
  rect: '矩形', ellipse: '椭圆', line: '直线', arrow: '箭头', text: '文本', path: '画笔',
}

let nameCounter: Partial<Record<NodeType, number>> = {}
export function nameFor(type: NodeType): string {
  nameCounter[type] = (nameCounter[type] ?? 0) + 1
  return `${NAME_MAP[type]} ${nameCounter[type]}`
}

export function createNode(type: NodeType, partial: Partial<SceneNode> = {}): SceneNode {
  return {
    id: uid(type),
    name: nameFor(type),
    type,
    visible: true,
    locked: false,
    x: 120, y: 120,
    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
    width: 180, height: 120,
    fill: nextColor(),
    stroke: '#1a2233',
    strokeWidth: 5,
    cornerRadius: 18,
    text: '文本',
    fontSize: 30,
    points: [],
    pathData: '',
    keyframes: {},
    ...partial,
  }
}

export function createScene(): Scene {
  return {
    version: 1,
    name: '未命名动画',
    fps: 30,
    duration: 150,
    width: 1280,
    height: 720,
    background: '#eef2f7',
    nodes: [],
  }
}

// 示例:持续弹跳的小球(挤压拉伸),浅色背景
export function createDemoScene(): Scene {
  const scene = createScene()
  scene.name = '弹跳小球'
  scene.background = '#eef2f7'

  const title = createNode('text', {
    name: '标题', x: 420, y: 80, width: 460, height: 60,
    text: 'AniCanvas 动画演示', fontSize: 48, fill: '#1a2233',
  })

  const ball = createNode('ellipse', {
    name: '小球', x: 600, y: 200, width: 110, height: 110,
    fill: '#ff6b9d', stroke: '#1a2233', strokeWidth: 6,
  })
  ball.keyframes.y = [
    { frame: 0, value: 200, easing: 'easeIn' },
    { frame: 30, value: 520, easing: 'bounce' },
    { frame: 60, value: 200, easing: 'easeIn' },
    { frame: 90, value: 520, easing: 'bounce' },
    { frame: 120, value: 200, easing: 'linear' },
  ]
  ball.keyframes.scaleX = [
    { frame: 0, value: 1, easing: 'easeOut' },
    { frame: 30, value: 1.25, easing: 'easeOut' },
    { frame: 34, value: 1, easing: 'easeIn' },
    { frame: 60, value: 1, easing: 'easeOut' },
    { frame: 90, value: 1.25, easing: 'easeOut' },
    { frame: 94, value: 1, easing: 'linear' },
  ]
  ball.keyframes.scaleY = [
    { frame: 0, value: 1, easing: 'easeOut' },
    { frame: 30, value: 0.75, easing: 'easeOut' },
    { frame: 34, value: 1, easing: 'easeIn' },
    { frame: 60, value: 1, easing: 'easeOut' },
    { frame: 90, value: 0.75, easing: 'easeOut' },
    { frame: 94, value: 1, easing: 'linear' },
  ]

  const ground = createNode('line', {
    name: '地面', x: 200, y: 600, points: [0, 0, 880, 0],
    stroke: '#94a3b8', strokeWidth: 4,
  })

  const shadow = createNode('ellipse', {
    name: '阴影', x: 612, y: 588, width: 90, height: 26,
    fill: '#0f172a', stroke: 'transparent', strokeWidth: 0,
  })
  shadow.keyframes.opacity = [
    { frame: 0, value: 0.12, easing: 'linear' },
    { frame: 30, value: 0.28, easing: 'linear' },
    { frame: 60, value: 0.12, easing: 'linear' },
    { frame: 90, value: 0.28, easing: 'linear' },
    { frame: 120, value: 0.12, easing: 'linear' },
  ]
  shadow.keyframes.scaleX = [
    { frame: 0, value: 1, easing: 'linear' },
    { frame: 30, value: 1.3, easing: 'linear' },
    { frame: 60, value: 1, easing: 'linear' },
    { frame: 90, value: 1.3, easing: 'linear' },
    { frame: 120, value: 1, easing: 'linear' },
  ]

  scene.nodes = [shadow, ground, ball, title]
  return scene
}
