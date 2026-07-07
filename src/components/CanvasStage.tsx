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
    scene, currentFrame, selectedIds, tool, playing,
    selectNode, selectNodes, clearSelection,
    beginTouch, liveSet, liveSetMany, addNode,
  } = useEditor()

  const transformerRef = useRef<Konva.Transformer | null>(null)
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map())

  // 筐选状态
  const [marquee, setMarquee] = useState<{ start: Pt; end: Pt } | null>(null)
  // 多选拖拽时记录每个节点的初始位置
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

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

  // 更新 Transformer 绑定的节点
  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    if (tool === 'select' && !playing && selectedIds.length === 1) {
      const node = nodeRefs.current.get(selectedIds[0])
      if (node) {
        tr.nodes([node])
        tr.getLayer()?.batchDraw()
        return
      }
    }
    tr.nodes([])
    tr.getLayer()?.batchDraw()
  }, [selectedIds, tool, scene.nodes, currentFrame, playing])

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

  // 检查节点是否与矩形相交
  const nodeIntersects = (node: SceneNode, rect: { x: number; y: number; w: number; h: number }): boolean => {
    const eff = effectiveProps(node, currentFrame)
    let nx = eff.x, ny = eff.y
    let nw = node.width, nh = node.height

    if (node.type === 'line' || node.type === 'arrow') {
      if (node.points.length < 4) return false
      const xs = node.points.filter((_, i) => i % 2 === 0)
      const ys = node.points.filter((_, i) => i % 2 === 1)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      nw = maxX - minX
      nh = maxY - minY
    }

    if (node.type === 'text') {
      nw = node.text.length * node.fontSize * 0.6
      nh = node.fontSize * 1.2
    }

    return (
      nx < rect.x + rect.w &&
      nx + nw > rect.x &&
      ny < rect.y + rect.h &&
      ny + nh > rect.y
    )
  }

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      // 点击空白处
      if (e.target === e.target.getStage()) {
        const pos = toStage(e.evt.clientX, e.evt.clientY)
        setMarquee({ start: pos, end: pos })
      }
      return
    }
    const pos = toStage(e.evt.clientX, e.evt.clientY)
    setDrawing({ type: tool, start: pos, current: pos, points: [pos] })
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (marquee) {
      const pos = toStage(e.evt.clientX, e.evt.clientY)
      setMarquee({ ...marquee, end: pos })
      return
    }
    if (!drawing) return
    const pos = toStage(e.evt.clientX, e.evt.clientY)
    if (drawing.type === 'path') {
      setDrawing({ ...drawing, current: pos, points: [...drawing.points, pos] })
    } else {
      setDrawing({ ...drawing, current: pos })
    }
  }

  const handleStageMouseUp = () => {
    if (marquee) {
      const x = Math.min(marquee.start.x, marquee.end.x)
      const y = Math.min(marquee.start.y, marquee.end.y)
      const w = Math.abs(marquee.end.x - marquee.start.x)
      const h = Math.abs(marquee.end.y - marquee.start.y)
      setMarquee(null)

      // 如果筐选范围太小，视为点击空白处，取消选择
      if (w < 3 || h < 3) {
        clearSelection()
        return
      }

      // 选中所有相交的节点
      const hitIds = scene.nodes
        .filter(n => !n.locked && n.visible && nodeIntersects(n, { x, y, w, h }))
        .map(n => n.id)
      if (hitIds.length > 0) {
        selectNodes(hitIds)
      } else {
        clearSelection()
      }
      return
    }

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

    const shiftKey = e.evt.shiftKey
    const isAlreadySelected = selectedIds.includes(node.id)

    if (shiftKey) {
      // Shift+点击：切换选择
      if (isAlreadySelected) {
        if (selectedIds.length > 1) {
          selectNodes(selectedIds.filter(id => id !== node.id))
        }
      } else {
        selectNodes([...selectedIds, node.id])
      }
    } else if (!isAlreadySelected) {
      // 点击未选中的节点：只选这个
      selectNode(node.id)
    }
    // 如果已选中且非 Shift，保持当前选择，准备拖拽

    // 记录所有选中节点的初始位置
    const ids = shiftKey ? (isAlreadySelected ? selectedIds : [...selectedIds, node.id]) : (isAlreadySelected ? selectedIds : [node.id])
    dragStartPositions.current.clear()
    ids.forEach(id => {
      const n = scene.nodes.find(x => x.id === id)
      if (n) {
        const eff = effectiveProps(n, currentFrame)
        dragStartPositions.current.set(id, { x: eff.x, y: eff.y })
      }
    })
  }

  const handleDragStart = () => beginTouch()

  const handleDragEnd = (node: SceneNode, e: Konva.KonvaEventObject<DragEvent>) => {
    const k = e.target
    const newX = k.x()
    const newY = k.y()
    const startPos = dragStartPositions.current.get(node.id)

    if (selectedIds.length > 1 && selectedIds.includes(node.id) && startPos) {
      // 多选拖拽：计算位移量，应用到所有选中节点
      const dx = newX - startPos.x
      const dy = newY - startPos.y

      const otherIds = selectedIds.filter(id => id !== node.id)
      const xs = otherIds.map(id => {
        const sp = dragStartPositions.current.get(id)
        return (sp?.x ?? 0) + dx
      })
      const ys = otherIds.map(id => {
        const sp = dragStartPositions.current.get(id)
        return (sp?.y ?? 0) + dy
      })

      // 先更新其他节点
      if (otherIds.length > 0) {
        liveSetMany(otherIds, 'x', xs)
        liveSetMany(otherIds, 'y', ys)
      }
      // 再更新拖拽的节点
      liveSet(node.id, 'x', newX)
      liveSet(node.id, 'y', newY)
    } else {
      liveSet(node.id, 'x', newX)
      liveSet(node.id, 'y', newY)
    }

    dragStartPositions.current.clear()
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

  // 筐选框的坐标
  const marqueeRect = marquee ? {
    x: Math.min(marquee.start.x, marquee.end.x),
    y: Math.min(marquee.start.y, marquee.end.y),
    w: Math.abs(marquee.end.x - marquee.start.x),
    h: Math.abs(marquee.end.y - marquee.start.y),
  } : null

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
          onMouseLeave={() => { setDrawing(null); setMarquee(null) }}
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
              const isSelected = selectedIds.includes(node.id)
              return (
                <NodeRenderer
                  key={node.id}
                  node={node}
                  eff={eff}
                  nodeRef={(ref) => {
                    if (ref) nodeRefs.current.set(node.id, ref)
                    else nodeRefs.current.delete(node.id)
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(node, e)}
                  onDragStart={canDrag ? handleDragStart : undefined}
                  onDragEnd={canDrag ? (e) => handleDragEnd(node, e) : undefined}
                  onTransformStart={canDrag ? handleTransformStart : undefined}
                  onTransformEnd={canDrag ? (e) => handleTransformEnd(node, e) : undefined}
                />
              )
            })}

            {previewNode && <NodeRenderer node={previewNode} eff={effectiveProps(previewNode, currentFrame)} />}

            {/* 多选高亮框 */}
            {selectedIds.length > 1 && scene.nodes.map(node => {
              if (!selectedIds.includes(node.id)) return null
              const eff = effectiveProps(node, currentFrame)
              let w = node.width, h = node.height
              if (node.type === 'line' || node.type === 'arrow') {
                if (node.points.length >= 4) {
                  const xs = node.points.filter((_, i) => i % 2 === 0)
                  const ys = node.points.filter((_, i) => i % 2 === 1)
                  w = Math.max(...xs) - Math.min(...xs)
                  h = Math.max(...ys) - Math.min(...ys)
                }
              }
              if (node.type === 'text') {
                w = node.text.length * node.fontSize * 0.6
                h = node.fontSize * 1.2
              }
              return (
                <Rect
                  key={`sel-${node.id}`}
                  x={eff.x}
                  y={eff.y}
                  width={w}
                  height={h}
                  stroke="#4f7cff"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 2 / scale]}
                  listening={false}
                />
              )
            })}

            {/* 筐选框 */}
            {marqueeRect && (
              <Rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.w}
                height={marqueeRect.h}
                fill="rgba(79, 124, 255, 0.12)"
                stroke="#4f7cff"
                strokeWidth={1 / scale}
                dash={[4 / scale, 2 / scale]}
                listening={false}
              />
            )}

            <Transformer
              ref={transformerRef}
              visible={tool === 'select' && selectedIds.length === 1 && !playing}
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
        {selectedIds.length > 1 && (
          <>
            <span className="text-edge2">·</span>
            <span className="text-accent">已选 {selectedIds.length} 个</span>
          </>
        )}
      </div>

      {tool !== 'select' && (
        <div className="absolute bottom-3 left-3 bg-accent/15 border border-accent/30 rounded-md px-2 py-1 text-xs text-accent pointer-events-none">
          {tool === 'text' ? '点击画布添加文本' : tool === 'path' ? '拖拽自由绘制' : '拖拽绘制形状'}
        </div>
      )}

      {tool === 'select' && selectedIds.length === 0 && (
        <div className="absolute bottom-3 left-3 bg-panel1/80 border border-edge rounded-md px-2 py-1 text-xs text-muted pointer-events-none">
          拖拽空白处筐选 · Shift+点击多选
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
