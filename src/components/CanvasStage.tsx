import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Transformer, Rect } from 'react-konva'
import type Konva from 'konva'
import { useEditor } from '../store'
import { SceneNode, NodeType } from '../types'
import { effectiveProps } from '../model/effective'
import NodeRenderer from './NodeRenderers'

interface Pt { x: number; y: number }

export default function CanvasStage() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const {
    scene, currentFrame, selectedId, tool, playing, selectNode,
    beginTouch, liveSet, addNode,
  } = useEditor()

  const transformerRef = useRef<Konva.Transformer | null>(null)
  const selectedRef = useRef<Konva.Node | null>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = Math.min(size.w / Math.max(1, scene.width), size.h / Math.max(1, scene.height))
  const stageW = scene.width * scale
  const stageH = scene.height * scale
  const offsetX = (size.w - stageW) / 2
  const offsetY = (size.h - stageH) / 2

  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    if (selectedRef.current && tool === 'select' && !playing) {
      tr.nodes([selectedRef.current])
      tr.getLayer()?.batchDraw()
    } else {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
    }
  }, [selectedId, tool, scene.nodes, currentFrame, playing])

  const [drawing, setDrawing] = useState<{
    type: NodeType
    start: Pt
    current: Pt
    points: Pt[]
  } | null>(null)

  const toStage = (clientX: number, clientY: number): Pt => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    }
  }

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      if (e.target === e.target.getStage()) selectNode(null)
      return
    }
    const pos = toStage(e.evt.clientX, e.evt.clientY)
    setDrawing({ type: tool, start: pos, current: pos, points: [pos] })
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawing) return
    const pos = toStage(e.evt.clientX, e.evt.clientY)
    if (drawing.type === 'path') {
      setDrawing({ ...drawing, current: pos, points: [...drawing.points, pos] })
    } else {
      setDrawing({ ...drawing, current: pos })
    }
  }

  const handleStageMouseUp = () => {
    if (!drawing) return
    const { type, start, current, points } = drawing
    setDrawing(null)

    if (type === 'text') {
      addNode('text', { x: start.x, y: start.y })
      return
    }
    if (type === 'line' || type === 'arrow') {
      if (Math.abs(current.x - start.x) < 2 && Math.abs(current.y - start.y) < 2) return
      addNode(type, { x: start.x, y: start.y, points: [0, 0, current.x - start.x, current.y - start.y] })
      return
    }
    if (type === 'rect' || type === 'ellipse') {
      const x = Math.min(start.x, current.x)
      const y = Math.min(start.y, current.y)
      const w = Math.abs(current.x - start.x)
      const h = Math.abs(current.y - start.y)
      if (w < 2 || h < 2) return
      addNode(type, { x, y, width: w, height: h })
      return
    }
    if (type === 'path') {
      if (points.length < 2) return
      const ox = points[0].x
      const oy = points[0].y
      const d = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x - ox).toFixed(2)} ${(p.y - oy).toFixed(2)}`)
        .join(' ')
      addNode('path', { x: ox, y: oy, pathData: d, fill: 'transparent', stroke: '#1a2233', strokeWidth: 4 })
    }
  }

  const handleNodeMouseDown = (node: SceneNode, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'select' || node.locked) return
    e.cancelBubble = true
    selectNode(node.id)
  }

  const handleDragStart = () => beginTouch()
  const handleDragEnd = (node: SceneNode, e: Konva.KonvaEventObject<DragEvent>) => {
    const k = e.target
    liveSet(node.id, 'x', k.x())
    liveSet(node.id, 'y', k.y())
  }
  const handleTransformStart = () => beginTouch()
  const handleTransformEnd = (node: SceneNode, e: Konva.KonvaEventObject<MouseEvent>) => {
    const k = e.target
    liveSet(node.id, 'x', k.x())
    liveSet(node.id, 'y', k.y())
    liveSet(node.id, 'rotation', k.rotation())
    liveSet(node.id, 'scaleX', k.scaleX())
    liveSet(node.id, 'scaleY', k.scaleY())
  }

  const previewNode: SceneNode | null = (() => {
    if (!drawing) return null
    const { type, start, current, points } = drawing
    if (type === 'rect' || type === 'ellipse') {
      const x = Math.min(start.x, current.x)
      const y = Math.min(start.y, current.y)
      const w = Math.abs(current.x - start.x)
      const h = Math.abs(current.y - start.y)
      if (w < 2 || h < 2) return null
      return { ...createPreviewBase(type), x, y, width: w, height: h } as SceneNode
    }
    if (type === 'line' || type === 'arrow') {
      if (Math.abs(current.x - start.x) < 2 && Math.abs(current.y - start.y) < 2) return null
      return { ...createPreviewBase(type), x: start.x, y: start.y, points: [0, 0, current.x - start.x, current.y - start.y] } as SceneNode
    }
    if (type === 'path' && points.length > 1) {
      const ox = points[0].x
      const oy = points[0].y
      const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x - ox).toFixed(2)} ${(p.y - oy).toFixed(2)}`).join(' ')
      return { ...createPreviewBase('path'), x: ox, y: oy, pathData: d, fill: 'transparent', stroke: '#4f7cff', strokeWidth: 3 } as SceneNode
    }
    return null
  })()

  const canDrag = tool === 'select'

  return (
    <div ref={wrapperRef} className="canvas-backdrop absolute inset-0 flex items-center justify-center">
      {size.w === 0 || size.h === 0 ? (
        <div className="text-xs text-muted">加载画布...</div>
      ) : (
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={() => setDrawing(null)}
        >
          <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
            <Rect
              x={0} y={0}
              width={scene.width} height={scene.height}
              fill={scene.background}
              stroke="#c4ccd9"
              strokeWidth={1 / scale}
              shadowColor="#1a2233"
              shadowBlur={40 / scale}
              shadowOpacity={0.16}
              shadowOffsetY={16 / scale}
              listening={false}
            />

            {scene.nodes.map((node) => {
              const eff = effectiveProps(node, currentFrame)
              return (
                <NodeRenderer
                  key={node.id}
                  node={node}
                  eff={eff}
                  nodeRef={selectedId === node.id ? (ref) => { selectedRef.current = ref } : undefined}
                  onMouseDown={(e) => handleNodeMouseDown(node, e)}
                  onDragStart={canDrag ? handleDragStart : undefined}
                  onDragEnd={canDrag ? (e) => handleDragEnd(node, e) : undefined}
                  onTransformStart={canDrag ? handleTransformStart : undefined}
                  onTransformEnd={canDrag ? (e) => handleTransformEnd(node, e) : undefined}
                />
              )
            })}

            {previewNode && <NodeRenderer node={previewNode} eff={effectiveProps(previewNode, currentFrame)} />}

            <Transformer
              ref={transformerRef}
              visible={tool === 'select' && !!selectedId && !playing}
              rotateAnchorOffset={24}
              anchorSize={8}
              anchorCornerRadius={2}
              borderStroke="#4f7cff"
              anchorStroke="#4f7cff"
              anchorFill="#ffffff"
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] text-muted font-mono tabular-nums bg-panel1/80 border border-edge rounded-md px-2 py-1 pointer-events-none">
        <span>{scene.width}×{scene.height}</span>
        <span className="text-edge2">·</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>

      {tool !== 'select' && (
        <div className="absolute bottom-3 left-3 bg-accent/15 border border-accent/30 rounded-md px-2 py-1 text-xs text-accent pointer-events-none">
          {tool === 'text' ? '点击画布添加文本' : tool === 'path' ? '拖拽自由绘制' : '拖拽绘制形状'}
        </div>
      )}
    </div>
  )
}

function createPreviewBase(type: NodeType): Partial<SceneNode> {
  return {
    id: 'preview', name: '预览', type, visible: true, locked: true,
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.6,
    width: 0, height: 0, fill: '#4f7cff', stroke: '#c4ccd9', strokeWidth: 3,
    cornerRadius: 0, text: '', fontSize: 24, points: [], pathData: '', keyframes: {},
  }
}
