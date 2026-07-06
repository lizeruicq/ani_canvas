export type NodeType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'path'

export type EasingType =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'back' | 'elastic' | 'bounce'

// 可被关键帧动画化的数值属性
export type AnimatableProp =
  | 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY' | 'opacity'

export interface Keyframe {
  frame: number
  value: number
  easing: EasingType
}

export interface SceneNode {
  id: string
  name: string
  type: NodeType
  visible: boolean
  locked: boolean
  // 可动画属性的基础(静态)值
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
  // 静态几何 / 样式
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius: number
  // 文本
  text: string
  fontSize: number
  // line/arrow: 相对 (x,y) 原点的点序列 [x1,y1,x2,y2,...]
  points: number[]
  // path: 相对 (x,y) 的 SVG path data
  pathData: string
  // 每个可动画属性的关键帧轨道
  keyframes: Partial<Record<AnimatableProp, Keyframe[]>>
}

export interface Scene {
  version: number
  name: string
  fps: number
  duration: number
  width: number
  height: number
  background: string
  nodes: SceneNode[]
}

export const ANIMATABLE_PROPS: AnimatableProp[] = [
  'x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity',
]

export const PROP_LABEL: Record<AnimatableProp, string> = {
  x: 'X', y: 'Y', rotation: '旋转', scaleX: '缩放X', scaleY: '缩放Y', opacity: '不透明度',
}

export const EASINGS: EasingType[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut', 'back', 'elastic', 'bounce',
]
