import { useEffect, useRef, useState } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Repeat, ChevronLeft, ChevronRight, CircleDot, GripHorizontal, ChevronDown, EyeOff,
} from 'lucide-react'
import { useEditor } from '../store'
import { ANIMATABLE_PROPS, PROP_LABEL, AnimatableProp } from '../types'

const MIN_FRAME_WIDTH = 6
const MAX_FRAME_WIDTH = 40
const TRACK_HEIGHT = 22
const HEADER_HEIGHT = 32

export default function Timeline() {
  const {
    scene, currentFrame, playing, loop, autoKey, selectedIds,
    setCurrentFrame, setPlaying, toggleLoop, toggleAutoKey, selectNode,
    addKeyframe, removeKeyframe, moveKeyframe,
  } = useEditor()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'head' | 'kf' | null>(null)
  const [dragKf, setDragKf] = useState<{ nodeId: string; prop: AnimatableProp; frame: number } | null>(null)
  const [th, setTh] = useState(236)
  const [resizing, setResizing] = useState(false)
  const [frameWidth, setFrameWidth] = useState(12)
  // 折叠集合:不在集合中 = 展开。默认全部展开,这样关键帧直接可见
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  // 根据容器宽度和总帧数动态计算每帧宽度
  useEffect(() => {
    const updateFrameWidth = () => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.clientWidth
      // 计算目标宽度，确保至少有一定的最小宽度
      const targetWidth = Math.max(
        MIN_FRAME_WIDTH,
        Math.min(MAX_FRAME_WIDTH, containerWidth / (scene.duration + 10))
      )
      setFrameWidth(targetWidth)
    }

    updateFrameWidth()
    window.addEventListener('resize', updateFrameWidth)
    return () => window.removeEventListener('resize', updateFrameWidth)
  }, [scene.duration])

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // 播放:用浮点累加器,避免高刷新率(120Hz)下每帧增量<0.5被 round 抹掉而卡死
  useEffect(() => {
    if (!playing) return
    let acc = useEditor.getState().currentFrame
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const s = useEditor.getState()
      acc += dt * s.scene.fps
      if (acc >= s.scene.duration) {
        if (s.loop) acc = 0
        else { acc = s.scene.duration; s.setPlaying(false) }
      }
      s.setCurrentFrame(acc)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // 顶边拖拽调高度
  useEffect(() => {
    if (!resizing) return
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e: MouseEvent) => setTh(Math.max(172, Math.min(Math.round(window.innerHeight * 0.74), window.innerHeight - e.clientY)))
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  const frameToX = (f: number) => f * frameWidth
  const xToFrame = (x: number) => Math.max(0, Math.min(scene.duration, Math.round(x / frameWidth)))

  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0)
    setCurrentFrame(xToFrame(x))
  }

  // 播放头 / 关键帧拖拽
  useEffect(() => {
    if (dragging !== 'head') return
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0)
      setCurrentFrame(xToFrame(x))
    }
    const onUp = () => { setDragging(null); setDragKf(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, scene.duration, frameWidth])

  const jumpKeyframe = (dir: -1 | 1) => {
    if (selectedIds.length === 0) return
    const firstId = selectedIds[0]
    const node = scene.nodes.find((n) => n.id === firstId)
    if (!node) return
    const frames = new Set<number>()
    Object.values(node.keyframes).forEach((arr) => arr?.forEach((k) => frames.add(k.frame)))
    const sorted = [...frames].sort((a, b) => a - b)
    if (dir === -1) {
      const prev = sorted.filter((f) => f < currentFrame).pop()
      if (prev != null) setCurrentFrame(prev)
    } else {
      const next = sorted.find((f) => f > currentFrame)
      if (next != null) setCurrentFrame(next)
    }
  }

  const totalWidth = (scene.duration + 10) * frameWidth

  return (
    <div className="flex flex-col border-t border-edge bg-panel1 shrink-0" style={{ height: th }}>
      <div
        className="h-1.5 cursor-ns-resize group relative shrink-0"
        onMouseDown={(e) => { e.preventDefault(); setResizing(true) }}
        title="拖拽调整时间轴高度"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-edge group-hover:bg-accent/60 transition-colors" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0.5 text-edge2 group-hover:text-accent/70 transition-colors"><GripHorizontal size={10} /></div>
      </div>

      {/* Transport */}
      <div className="h-10 flex items-center px-3 border-b border-edge gap-1 shrink-0">
        <button title="跳到开头" onClick={() => setCurrentFrame(0)} className="icon-btn"><SkipBack size={15} /></button>
        <button
          title={playing ? '暂停 (空格)' : '播放 (空格)'}
          onClick={() => setPlaying(!playing)}
          className="w-8 h-8 grid place-items-center rounded-lg bg-accent text-white hover:brightness-110"
        >
          {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
        <button title="跳到结尾" onClick={() => setCurrentFrame(scene.duration)} className="icon-btn"><SkipForward size={15} /></button>
        <div className="w-px h-5 bg-edge mx-1" />
        <button title="循环" onClick={toggleLoop} className={loop ? 'icon-btn icon-btn-active' : 'icon-btn'}><Repeat size={15} /></button>
        <button
          title="自动关键帧 (K)"
          onClick={toggleAutoKey}
          className={['icon-btn relative', autoKey ? 'text-danger bg-danger/15 hover:bg-danger/25 hover:text-danger' : ''].join(' ')}
        >
          <CircleDot size={15} />
          {autoKey && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
        </button>
        <div className="w-px h-5 bg-edge mx-1" />
        <button onClick={() => jumpKeyframe(-1)} disabled={selectedIds.length === 0} title="上一关键帧" className="icon-btn disabled:opacity-30"><ChevronLeft size={15} /></button>
        <button onClick={() => jumpKeyframe(1)} disabled={selectedIds.length === 0} title="下一关键帧" className="icon-btn disabled:opacity-30"><ChevronRight size={15} /></button>
        <div className="flex-1" />
        {autoKey && <span className="text-[10px] text-danger font-semibold uppercase tracking-wider mr-2">自动关键</span>}
        <div className="text-xs font-mono text-muted tabular-nums">
          <span className="text-text">{String(Math.round(currentFrame)).padStart(3, '0')}</span>
          <span className="mx-1">/</span>{scene.duration}
          <span className="ml-2 text-muted/70">@ {scene.fps}fps</span>
        </div>
      </div>

      {/* Body: flow 布局,播放头垂直覆盖全部内容 */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        <div className="relative" style={{ width: totalWidth, minHeight: '100%' }}>
          {/* Ruler (sticky) */}
          <div className="sticky top-0 z-10 border-b border-edge bg-panel1/95 backdrop-blur" style={{ height: HEADER_HEIGHT }}>
            {Array.from({ length: scene.duration + 1 }, (_, f) => f).map((f) => {
              // 根据当前 frameWidth 动态调整刻度密度
              let majorInterval = 30
              let minorInterval = 5
              if (frameWidth < 8) { majorInterval = 60; minorInterval = 10 }
              if (frameWidth > 20) { majorInterval = 10; minorInterval = 5 }
              const major = f % majorInterval === 0
              const minor = f % minorInterval === 0
              return (
                <div key={f} className="absolute top-0 bottom-0" style={{ left: frameToX(f) }}>
                  <div className={['absolute bottom-0 w-px', major ? 'h-3 bg-edge2' : minor ? 'h-2 bg-edge' : 'h-1 bg-edge/60'].join(' ')} />
                  {major && frameWidth >= 6 && <div className="absolute bottom-2.5 left-1 text-[9px] text-muted tabular-nums select-none">{f}</div>}
                </div>
              )
            })}
          </div>

          {/* Tracks */}
          <div>
            {scene.nodes.map((node) => {
              const expanded = !collapsed.has(node.id)
              return (
                <div key={node.id} className="border-b border-edge/40">
                  <div
                    className="relative h-7 flex items-center gap-1.5 px-2 cursor-pointer hover:bg-panel2/50"
                    style={{ background: selectedIds.includes(node.id) ? 'rgba(79,124,255,0.12)' : undefined }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedIds.includes(node.id) && selectedIds.length === 1) toggleCollapse(node.id)
                      else { selectNode(node.id); setCollapsed((prev) => prev.has(node.id) ? (() => { const n = new Set(prev); n.delete(node.id); return n })() : prev) }
                    }}
                  >
                    <ChevronDown size={12} className={['text-muted transition-transform', expanded ? '' : '-rotate-90'].join(' ')} />
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: node.fill }} />
                    <span className="text-[11px] text-text truncate select-none max-w-[160px]">{node.name}</span>
                    {!node.visible && <EyeOff size={11} className="text-muted/50" />}
                  </div>

                  {expanded && ANIMATABLE_PROPS.map((prop) => {
                    const kfs = node.keyframes[prop] || []
                    const hasCurrent = kfs.some((k) => k.frame === Math.round(currentFrame))
                    return (
                      <div
                        key={prop}
                        className="relative border-b border-edge/20 hover:bg-panel2/40"
                        style={{ height: TRACK_HEIGHT }}
                        onClick={(e) => { e.stopPropagation(); handleTrackClick(e) }}
                      >
                        <span className="absolute left-1.5 text-[9px] text-muted/70 leading-[22px] select-none">{PROP_LABEL[prop]}</span>
                        {kfs.map((kf) => (
                          <KeyframeDot
                            key={`${node.id}-${prop}-${kf.frame}`}
                            x={frameToX(kf.frame)}
                            y={TRACK_HEIGHT / 2}
                            selected={Math.round(currentFrame) === kf.frame}
                            onClick={(e) => { e.stopPropagation(); setCurrentFrame(kf.frame) }}
                            onDelete={(e) => { e.stopPropagation(); removeKeyframe(node.id, prop, kf.frame) }}
                            onMouseDown={(e) => { e.stopPropagation(); setDragging('kf'); setDragKf({ nodeId: node.id, prop, frame: kf.frame }) }}
                          />
                        ))}
                        <button
                          className={'absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 rounded-[1px] kf-toggle' + (hasCurrent ? ' kf-toggle-on' : '')}
                          title={hasCurrent ? '删除当前关键帧' : '添加关键帧'}
                          onClick={(e) => { e.stopPropagation(); if (hasCurrent) removeKeyframe(node.id, prop, Math.round(currentFrame)); else addKeyframe(node.id, prop) }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {scene.nodes.length === 0 && <div className="px-3 py-8 text-xs text-muted text-center">暂无图层</div>}
          </div>

          {/* Playhead: 覆盖全部内容高度 */}
          <div className="absolute top-0 bottom-0 w-px bg-accent z-20 pointer-events-none" style={{ left: frameToX(currentFrame) }}>
            <div
              className="absolute -top-0.5 -left-[5px] w-[11px] h-[11px] bg-accent rotate-45 rounded-[2px] shadow cursor-ew-resize pointer-events-auto"
              onMouseDown={(e) => { e.stopPropagation(); setDragging('head') }}
            />
          </div>
        </div>
      </div>

      {dragging === 'kf' && dragKf && (
        <DragGhost
          containerRef={containerRef}
          frameWidth={frameWidth}
          duration={scene.duration}
          onCommit={(frame) => { if (frame !== dragKf.frame) moveKeyframe(dragKf.nodeId, dragKf.prop, dragKf.frame, frame) }}
        />
      )}
    </div>
  )
}

function KeyframeDot(props: {
  x: number
  y: number
  selected: boolean
  onClick: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
}) {
  const { x, y, selected, onClick, onDelete, onMouseDown } = props
  return (
    <div
      className={'absolute w-2.5 h-2.5 rotate-45 rounded-[1px] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 kf-dot' + (selected ? ' kf-dot-selected' : '')}
      style={{ left: x, top: y }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => { e.preventDefault(); onDelete(e) }}
    />
  )
}

function DragGhost(props: { containerRef: React.RefObject<HTMLDivElement>; frameWidth: number; duration: number; onCommit: (frame: number) => void }) {
  const { containerRef, frameWidth, duration, onCommit } = props
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const xToFrame = (x: number) => Math.max(0, Math.min(duration, Math.round(x / frameWidth)))
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const onUp = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0)
        onCommit(xToFrame(x))
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [frameWidth, duration])
  if (!pos) return null
  return <div className="fixed w-2.5 h-2.5 rotate-45 rounded-[1px] bg-accent pointer-events-none z-50" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
}
