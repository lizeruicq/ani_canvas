import { Rect, Ellipse, Line, Arrow, Text, Path } from 'react-konva'
import type Konva from 'konva'
import { SceneNode } from '../types'
import { EffectiveProps } from '../model/effective'

export interface NodeRendererProps {
  node: SceneNode
  eff: EffectiveProps
  nodeRef?: (ref: Konva.Node | null) => void
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onTransformStart?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onTransformEnd?: (e: Konva.KonvaEventObject<MouseEvent>) => void
}

export default function NodeRenderer(props: NodeRendererProps) {
  const { node, eff } = props
  const common = {
    x: eff.x,
    y: eff.y,
    rotation: eff.rotation,
    scaleX: eff.scaleX,
    scaleY: eff.scaleY,
    opacity: eff.opacity,
    visible: node.visible,
    draggable: !node.locked && props.onDragEnd !== undefined,
    onMouseDown: props.onMouseDown,
    onDragStart: props.onDragStart,
    onDragEnd: props.onDragEnd,
    onTransformStart: props.onTransformStart,
    onTransformEnd: props.onTransformEnd,
  }

  switch (node.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          ref={props.nodeRef as any}
          width={node.width}
          height={node.height}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          cornerRadius={node.cornerRadius}
        />
      )
    case 'ellipse':
      return (
        <Ellipse
          {...common}
          ref={props.nodeRef as any}
          radiusX={node.width / 2}
          radiusY={node.height / 2}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
        />
      )
    case 'line':
      return (
        <Line
          {...common}
          ref={props.nodeRef as any}
          points={node.points}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )
    case 'arrow':
      return (
        <Arrow
          {...common}
          ref={props.nodeRef as any}
          points={node.points}
          fill={node.stroke}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          pointerLength={16}
          pointerWidth={12}
          lineCap="round"
          lineJoin="round"
        />
      )
    case 'text':
      return (
        <Text
          {...common}
          ref={props.nodeRef as any}
          text={node.text}
          fontSize={node.fontSize}
          fill={node.fill}
          width={node.width || undefined}
          height={node.height || undefined}
        />
      )
    case 'path':
      return (
        <Path
          {...common}
          ref={props.nodeRef as any}
          data={node.pathData}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
        />
      )
    default:
      return null
  }
}
