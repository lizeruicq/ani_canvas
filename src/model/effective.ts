import { SceneNode } from '../types'
import { sampleKeyframes } from './interpolate'

export interface EffectiveProps {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
}

// 计算节点在指定帧的有效(动画后)属性
export function effectiveProps(node: SceneNode, frame: number): EffectiveProps {
  return {
    x: sampleKeyframes(node.keyframes.x, frame, node.x),
    y: sampleKeyframes(node.keyframes.y, frame, node.y),
    rotation: sampleKeyframes(node.keyframes.rotation, frame, node.rotation),
    scaleX: sampleKeyframes(node.keyframes.scaleX, frame, node.scaleX),
    scaleY: sampleKeyframes(node.keyframes.scaleY, frame, node.scaleY),
    opacity: sampleKeyframes(node.keyframes.opacity, frame, node.opacity),
  }
}
