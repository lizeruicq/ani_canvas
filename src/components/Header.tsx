import { useRef, useState } from 'react'
import {
  MousePointer2, Square, Circle, Minus, ArrowRight, Type, PenTool,
  Undo2, Redo2, Save, FolderOpen, Code2, PlaySquare, Sparkles, FilePlus,
} from 'lucide-react'
import { useEditor, Tool } from '../store'
import VideoExportModal from './VideoExportModal'

const TOOLS: { id: Tool; label: string; icon: React.ElementType; key: string }[] = [
  { id: 'select', label: '选择', icon: MousePointer2, key: '1' },
  { id: 'rect', label: '矩形', icon: Square, key: '2' },
  { id: 'ellipse', label: '椭圆', icon: Circle, key: '3' },
  { id: 'line', label: '直线', icon: Minus, key: '4' },
  { id: 'arrow', label: '箭头', icon: ArrowRight, key: '5' },
  { id: 'text', label: '文本', icon: Type, key: '6' },
  { id: 'path', label: '画笔', icon: PenTool, key: '7' },
]

export default function Header() {
  const {
    scene, tool, setTool, undo, redo, past, future, setName,
    newScene, loadDemo, exportProjectJSON, importProjectJSON, importDSL,
  } = useEditor()

  const [dslOpen, setDslOpen] = useState(false)
  const [dslText, setDslText] = useState('')
  const [videoOpen, setVideoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    const blob = new Blob([exportProjectJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scene.name || 'project'}.anicanvas.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (!importProjectJSON(String(reader.result))) alert('项目文件格式错误')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportDSL = () => {
    if (importDSL(dslText)) { setDslOpen(false); setDslText('') }
    else alert('DSL 解析失败')
  }

  return (
    <>
      <header className="h-12 flex items-center px-3 gap-3 border-b border-edge bg-panel1 shrink-0">
        <div className="flex items-center gap-2 pr-3 border-r border-edge">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent2 grid place-items-center shadow-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          <input
            defaultValue={scene.name}
            className="bg-transparent font-semibold text-sm w-28 outline-none border-b border-transparent hover:border-edge focus:border-accent px-0.5"
            onBlur={(e) => { const v = e.target.value.trim(); if (v) setName(v) }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
        </div>

        <div className="flex items-center gap-0.5 bg-ink/60 rounded-xl p-1 border border-edge">
          {TOOLS.map((t) => {
            const Icon = t.icon
            const active = tool === t.id
            return (
              <button
                key={t.id}
                title={`${t.label} (${t.key})`}
                onClick={() => setTool(t.id)}
                className={[
                  'h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all',
                  active
                    ? 'bg-gradient-to-br from-accent to-accent2 text-white shadow-sm'
                    : 'text-muted hover:text-text hover:bg-panel2',
                ].join(' ')}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button title="新建" onClick={newScene} className="icon-btn"><FilePlus size={16} /></button>
          <button title="加载示例" onClick={loadDemo} className="icon-btn"><Sparkles size={16} /></button>
          <div className="w-px h-5 bg-edge mx-1" />
          <button title="撤销 ⌘Z" onClick={undo} disabled={past.length === 0} className="icon-btn disabled:opacity-30"><Undo2 size={16} /></button>
          <button title="重做 ⌘⇧Z" onClick={redo} disabled={future.length === 0} className="icon-btn disabled:opacity-30"><Redo2 size={16} /></button>
          <div className="w-px h-5 bg-edge mx-1" />
          <button title="保存 JSON" onClick={handleSave} className="icon-btn"><Save size={16} /></button>
          <button title="打开 JSON" onClick={() => fileInputRef.current?.click()} className="icon-btn"><FolderOpen size={16} /></button>
          <button title="导入 DSL" onClick={() => setDslOpen(true)} className="icon-btn"><Code2 size={16} /></button>
          <button title="导出视频" onClick={() => setVideoOpen(true)} className="icon-btn text-accent"><PlaySquare size={16} /></button>
          <input ref={fileInputRef} type="file" accept=".json,.anicanvas.json" onChange={handleLoad} className="hidden" />
        </div>
      </header>

      {dslOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="bg-panel1 border border-edge rounded-2xl p-5 w-[480px] shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">导入 DSL</h3>
            <textarea
              value={dslText}
              onChange={(e) => setDslText(e.target.value)}
              placeholder={'scene fps=30 duration=150 width=1280 height=720 bg=#eef2f7\nrect name=Agent x=180 y=300 w=200 h=130 fill=#4f7cff\nkeyframe Agent.x @0 = -260 [back]\nkeyframe Agent.x @25 = 180 [linear]'}
              className="field w-full h-48 font-mono resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setDslOpen(false)} className="px-3 py-1.5 text-xs text-muted hover:text-text">取消</button>
              <button onClick={handleImportDSL} className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:brightness-110">导入</button>
            </div>
          </div>
        </div>
      )}

      {videoOpen && <VideoExportModal onClose={() => setVideoOpen(false)} />}
    </>
  )
}
