import { useEffect, useRef, useState } from 'react'

interface VSplitterProps {
  value: number
  onChange: (v: number) => void
  side: 'left' | 'right'
  min?: number
  max?: number
}

// 竖向分割条:左右拖动调整相邻面板宽度
export default function VSplitter({ value, onChange, side, min = 180, max = 520 }: VSplitterProps) {
  const start = useRef({ x: 0, v: 0 })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) return
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - start.current.x
      const v = side === 'left' ? start.current.v + delta : start.current.v - delta
      onChange(Math.max(min, Math.min(max, Math.round(v))))
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, side, min, max, onChange])

  return (
    <div
      className="w-px bg-edge shrink-0 relative cursor-ew-resize group"
      onMouseDown={(e) => { e.preventDefault(); start.current = { x: e.clientX, v: value }; setDragging(true) }}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-30" />
      <div className="absolute inset-y-0 left-0 w-px bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
