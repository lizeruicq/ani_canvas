import { useRef, useState, useEffect } from 'react'
import {
  MousePointer2, Square, Circle, Minus, ArrowRight, Type, PenTool,
  Undo2, Redo2, Save, FolderOpen, Code2, PlaySquare, Sparkles, FilePlus,
  Bot, MessagesSquare, HardDriveDownload, Upload, CheckCircle2, CircleDashed,
  RefreshCw, Database, Link, Link2Off
} from 'lucide-react'
import { useEditor, Tool } from '../store'
import { useLLM } from '../llm/store'
import VideoExportModal from './VideoExportModal'
import LLMConfigModal from './LLMConfigModal'
import LLMChatModal from './LLMChatModal'

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
    newScene, loadDemo, isDirty, saveToLocalStorage, exportToFile, importFromFile,
    importDSL, fileSyncEnabled, setFileSyncEnabled, loadFromSceneFile, saveToSceneFile,
    syncingToFile
  } = useEditor()

  const [dslOpen, setDslOpen] = useState(false)
  const [dslText, setDslText] = useState('')
  const [videoOpen, setVideoOpen] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const connected = useLLM((s) => s.connected)
  const [llmConfigOpen, setLlmConfigOpen] = useState(false)
  const [llmChatOpen, setLlmChatOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 显示保存指示器
  useEffect(() => {
    if (isDirty) {
      setShowSaveIndicator(true)
    }
  }, [isDirty])

  const handleSaveNow = () => {
    saveToLocalStorage()
    if (fileSyncEnabled) {
      saveToSceneFile()
    }
    setShowSaveIndicator(false)
  }

  const handleExport = () => {
    exportToFile()
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    importFromFile(file).then((success) => {
      if (!success) alert('项目文件格式错误')
    })
    e.target.value = ''
  }

  const handleImportDSL = () => {
    if (importDSL(dslText)) { 
      setDslOpen(false)
      setDslText('')
    } else {
      alert('DSL 解析失败')
    }
  }

  const toggleFileSync = () => {
    setFileSyncEnabled(!fileSyncEnabled)
    if (!fileSyncEnabled) {
      loadFromSceneFile()
    }
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
          <div className="flex items-center gap-1 ml-1">
            {fileSyncEnabled && (
              <button
                onClick={toggleFileSync}
                title="文件同步已开启 - 点击关闭"
                className="flex items-center gap-1 text-[10px] text-ok hover:text-accent"
              >
                <Database size={10} />
                <span>scenes/scene.dsl</span>
              </button>
            )}
            {!fileSyncEnabled && (
              <button
                onClick={toggleFileSync}
                title="文件同步已关闭 - 点击开启"
                className="flex items-center gap-1 text-[10px] text-muted hover:text-accent"
              >
                <Link2Off size={10} />
                <span>文件同步</span>
              </button>
            )}
            {syncingToFile && (
              <span className="flex items-center gap-1 text-[10px] text-accent">
                <CircleDashed size={10} className="animate-spin" />
                <span>同步中...</span>
              </span>
            )}
            {showSaveIndicator && !syncingToFile && (
              <button 
                onClick={handleSaveNow}
                title="点击立即保存 (自动保存会在1秒后执行)"
                className="flex items-center gap-1 text-[10px] text-muted hover:text-accent"
              >
                <CircleDashed size={10} className="animate-spin" />
                <span>未保存</span>
              </button>
            )}
            {!isDirty && !syncingToFile && fileSyncEnabled && (
              <div className="flex items-center gap-1 text-[10px] text-ok">
                <CheckCircle2 size={10} />
                <span>已同步</span>
              </div>
            )}
            {!isDirty && !syncingToFile && !fileSyncEnabled && (
              <div className="flex items-center gap-1 text-[10px] text-ok">
                <CheckCircle2 size={10} />
                <span>已保存</span>
              </div>
            )}
          </div>
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
          <button title="新建场景" onClick={newScene} className="icon-btn"><FilePlus size={16} /></button>
          <button title="加载示例" onClick={loadDemo} className="icon-btn"><Sparkles size={16} /></button>
          <div className="w-px h-5 bg-edge mx-1" />
          <button title="撤销 ⌘Z" onClick={undo} disabled={past.length === 0} className="icon-btn disabled:opacity-30"><Undo2 size={16} /></button>
          <button title="重做 ⌘⇧Z" onClick={redo} disabled={future.length === 0} className="icon-btn disabled:opacity-30"><Redo2 size={16} /></button>
          <div className="w-px h-5 bg-edge mx-1" />
          <button title="立即保存" onClick={handleSaveNow} className={isDirty ? 'icon-btn text-accent' : 'icon-btn'}><Save size={16} /></button>
          {fileSyncEnabled && (
            <button title="从文件重新加载" onClick={loadFromSceneFile} className="icon-btn"><RefreshCw size={16} /></button>
          )}
          <button title="导出到 JSON 文件" onClick={handleExport} className="icon-btn"><HardDriveDownload size={16} /></button>
          <button title="从 JSON 文件导入" onClick={() => fileInputRef.current?.click()} className="icon-btn"><Upload size={16} /></button>
          <button title="导入 DSL" onClick={() => setDslOpen(true)} className="icon-btn"><Code2 size={16} /></button>
          <button title="导出视频" onClick={() => setVideoOpen(true)} className="icon-btn text-accent"><PlaySquare size={16} /></button>
          <div className="w-px h-5 bg-edge mx-1" />
          <button title="大模型配置" onClick={() => setLlmConfigOpen(true)} className="icon-btn relative">
            <Bot size={16} />
            <span className={['absolute top-1 right-1 w-1.5 h-1.5 rounded-full', connected ? 'bg-ok' : 'bg-muted/40'].join(' ')} />
          </button>
          {connected && (
            <button title="AI 对话生成动画" onClick={() => setLlmChatOpen(true)} className="icon-btn text-accent">
              <MessagesSquare size={16} />
            </button>
          )}
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

      {llmConfigOpen && <LLMConfigModal onClose={() => setLlmConfigOpen(false)} />}
      {llmChatOpen && <LLMChatModal onClose={() => setLlmChatOpen(false)} />}
    </>
  )
}
