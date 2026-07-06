import { useState } from 'react'
import {
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  Type, Square, Circle, Minus, ArrowRight, PenTool, Copy, Trash2,
} from 'lucide-react'
import { useEditor } from '../store'
import { NodeType } from '../types'

const ICONS: Record<NodeType, React.ElementType> = {
  rect: Square, ellipse: Circle, line: Minus, arrow: ArrowRight, text: Type, path: PenTool,
}

export default function LayersPanel({ width }: { width: number }) {
  const {
    scene, selectedId, selectNode, reorderNode,
    toggleVisible, toggleLock, renameNode, duplicateNode, deleteNode,
  } = useEditor()

  return (
    <div className="flex flex-col border-r border-edge bg-panel1 shrink-0" style={{ width }}>
      <div className="h-10 flex items-center px-3 border-b border-edge">
        <span className="section-label">图层</span>
        <span className="ml-auto text-[10px] text-muted tabular-nums">{scene.nodes.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {scene.nodes.slice().reverse().map((node, displayIdx) => {
          const actualIdx = scene.nodes.length - 1 - displayIdx
          return (
            <LayerRow
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              onSelect={() => selectNode(node.id)}
              onToggleVisible={() => toggleVisible(node.id)}
              onToggleLock={() => toggleLock(node.id)}
              onMoveUp={() => reorderNode(node.id, 1)}
              onMoveDown={() => reorderNode(node.id, -1)}
              onRename={(name) => renameNode(node.id, name)}
              onDuplicate={() => duplicateNode(node.id)}
              onDelete={() => deleteNode(node.id)}
              canMoveUp={actualIdx < scene.nodes.length - 1}
              canMoveDown={actualIdx > 0}
            />
          )
        })}
        {scene.nodes.length === 0 && (
          <div className="px-3 py-8 text-xs text-muted text-center">暂无图层<br /><span className="text-[10px]">用顶部工具绘制</span></div>
        )}
      </div>
    </div>
  )
}

interface LayerRowProps {
  node: import('../types').SceneNode
  selected: boolean
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function LayerRow(props: LayerRowProps) {
  const {
    node, selected, onSelect, onToggleVisible, onToggleLock,
    onMoveUp, onMoveDown, onRename, onDuplicate, onDelete, canMoveUp, canMoveDown,
  } = props
  const [editing, setEditing] = useState(false)
  const Icon = ICONS[node.type]

  return (
    <div
      onClick={onSelect}
      className={[
        'group flex flex-col px-2 py-1.5 border-b border-edge/40 cursor-pointer transition-colors',
        selected ? 'bg-accent/15' : 'hover:bg-panel2/50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: node.fill }} />
        <Icon size={13} className="text-muted shrink-0" />
        {editing ? (
          <input
            autoFocus
            defaultValue={node.name}
            className="flex-1 bg-ink border border-accent rounded px-1 text-xs outline-none"
            onBlur={(e) => { onRename(e.target.value || node.name); setEditing(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs truncate select-none"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
          >
            {node.name}
          </span>
        )}
        {!node.visible && <EyeOff size={11} className="text-muted/50 shrink-0" />}
        {node.locked && <Lock size={11} className="text-muted/50 shrink-0" />}
      </div>
      <div className="flex items-center justify-end gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button title="上移" onClick={(e) => { e.stopPropagation(); onMoveUp() }} disabled={!canMoveUp} className="p-0.5 rounded hover:bg-panel3 disabled:opacity-20"><ChevronUp size={12} /></button>
        <button title="下移" onClick={(e) => { e.stopPropagation(); onMoveDown() }} disabled={!canMoveDown} className="p-0.5 rounded hover:bg-panel3 disabled:opacity-20"><ChevronDown size={12} /></button>
        <button title={node.visible ? '隐藏' : '显示'} onClick={(e) => { e.stopPropagation(); onToggleVisible() }} className="p-0.5 rounded hover:bg-panel3">{node.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
        <button title={node.locked ? '解锁' : '锁定'} onClick={(e) => { e.stopPropagation(); onToggleLock() }} className="p-0.5 rounded hover:bg-panel3">{node.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
        <button title="复制" onClick={(e) => { e.stopPropagation(); onDuplicate() }} className="p-0.5 rounded hover:bg-panel3"><Copy size={12} /></button>
        <button title="删除" onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-0.5 rounded hover:bg-danger/20 text-danger"><Trash2 size={12} /></button>
      </div>
    </div>
  )
}
