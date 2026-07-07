import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '../store'
import { exportDSL } from '../model/dsl'
import { RotateCcw, Check } from 'lucide-react'

export default function CodeEditor() {
  const { scene, applyDSL } = useEditor()
  const canonical = useMemo(() => exportDSL(scene), [scene])

  const [text, setText] = useState(canonical)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 外部场景变化时同步代码（仅在未编辑状态下，避免光标跳动）
  useEffect(() => {
    if (dirty) return
    if (text !== canonical) {
      setText(canonical)
      setError(null)
    }
  }, [canonical, dirty, text])

  const apply = () => {
    if (!dirty && text === canonical) return
    if (applyDSL(text)) {
      setDirty(false)
      setError(null)
      // 应用成功后显示规范化的 DSL，避免名称净化等造成的潜在不一致
      setText(exportDSL(useEditor.getState().scene))
    } else {
      setError('DSL 解析失败，请检查语法（例如关键帧目标不存在、命令错误等）')
    }
  }

  const reset = () => {
    setText(canonical)
    setDirty(false)
    setError(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setDirty(true)
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const t = e.currentTarget
      const start = t.selectionStart ?? 0
      const end = t.selectionEnd ?? 0
      const spaces = '  '
      t.value = t.value.slice(0, start) + spaces + t.value.slice(end)
      t.selectionStart = t.selectionEnd = start + spaces.length
      setText(t.value)
      setDirty(true)
      setError(null)
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      apply()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      reset()
      return
    }
  }

  const handleBlur = () => {
    if (dirty) apply()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-edge bg-panel1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">DSL</span>
          {dirty && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/15 text-warn">已修改</span>}
          {error && <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/15 text-danger">错误</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            title="重置 (Esc)"
            className="icon-btn p-1.5"
            disabled={!dirty && text === canonical}
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={apply}
            title="应用 (Ctrl+Enter)"
            className={[
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
              dirty || text !== canonical
                ? 'bg-accent text-white hover:brightness-110'
                : 'bg-panel2 text-muted cursor-default',
            ].join(' ')}
          >
            <Check size={12} />
            应用
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          spellCheck={false}
          className={[
            'absolute inset-0 w-full h-full resize-none p-3 font-mono text-[12px] leading-relaxed outline-none',
            'bg-ink text-text border-0',
            error ? 'ring-2 ring-danger/40' : 'focus:ring-2 focus:ring-accent/30',
          ].join(' ')}
          placeholder={'# 在此编辑动画 DSL\nscene name="未命名" fps=30 duration=150\nrect name=A x=100 y=100 w=200 h=120 fill=#4f7cff\nkeyframe A.x @0 = 100 [linear]'}
        />
      </div>

      {error && (
        <div className="px-3 py-2 border-t border-danger/20 bg-danger/10 text-danger text-[11px] shrink-0">
          {error}
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-edge bg-panel1 text-[10px] text-muted flex justify-between shrink-0">
        <span>Ctrl+Enter 应用 · Esc 重置</span>
        <span>{text.split('\n').length} 行</span>
      </div>
    </div>
  )
}
