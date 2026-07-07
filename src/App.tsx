import { useEffect, useState } from 'react'
import Header from './components/Header'
import LayersPanel from './components/LayersPanel'
import CanvasStage from './components/CanvasStage'
import PropertiesPanel from './components/PropertiesPanel'
import Timeline from './components/Timeline'
import Splitter from './components/Splitter'
import FileWatcher from './components/FileWatcher'
import { useEditor } from './store'

export default function App() {
  const {
    selectedId, deleteNode, setPlaying, setCurrentFrame,
    undo, redo, setTool, selectNode, toggleAutoKey,
  } = useEditor()
  const [layersW, setLayersW] = useState(244)
  const [propsW, setPropsW] = useState(288)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (inField) return

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedId) { e.preventDefault(); deleteNode(selectedId) }
          break
        case ' ':
          e.preventDefault()
          { const ae = document.activeElement as HTMLElement | null; if (ae && ae.tagName === 'BUTTON') ae.blur() }
          setPlaying(!useEditor.getState().playing)
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentFrame(useEditor.getState().currentFrame - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentFrame(useEditor.getState().currentFrame + 1)
          break
        case 'Escape':
          selectNode(null)
          setTool('select')
          break
        case 'k':
        case 'K':
          toggleAutoKey()
          break
        case '1': setTool('select'); break
        case '2': setTool('rect'); break
        case '3': setTool('ellipse'); break
        case '4': setTool('line'); break
        case '5': setTool('arrow'); break
        case '6': setTool('text'); break
        case '7': setTool('path'); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, deleteNode, setPlaying, setCurrentFrame, undo, redo, setTool, selectNode, toggleAutoKey])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink text-text">
      <FileWatcher />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LayersPanel width={layersW} />
        <Splitter value={layersW} onChange={setLayersW} side="left" min={180} max={480} />
        <div className="flex-1 relative overflow-hidden">
          <CanvasStage />
        </div>
        <Splitter value={propsW} onChange={setPropsW} side="right" min={220} max={520} />
        <PropertiesPanel width={propsW} />
      </div>
      <Timeline />
    </div>
  )
}
