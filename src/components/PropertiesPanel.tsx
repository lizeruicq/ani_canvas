import { Key, Copy, Trash2 } from 'lucide-react'
import { useEditor } from '../store'
import { ANIMATABLE_PROPS, PROP_LABEL, AnimatableProp, SceneNode, EASINGS, EasingType } from '../types'
import { effectiveProps } from '../model/effective'

export default function PropertiesPanel({ width }: { width: number }) {
  const {
    scene, selectedId, currentFrame, beginTouch, liveSet, liveStyle,
    addKeyframe, removeKeyframe, addKeyframeAll, deleteNode, duplicateNode,
    setKeyframeEasing,
  } = useEditor()

  const node = scene.nodes.find((n) => n.id === selectedId)
  if (!node) {
    return (
      <div className="flex flex-col border-l border-edge bg-panel1 shrink-0" style={{ width }}>
        <div className="h-10 flex items-center px-3 border-b border-edge"><span className="section-label">属性</span></div>
        <div className="flex-1 grid place-items-center text-xs text-muted">未选择对象</div>
      </div>
    )
  }

  const eff = effectiveProps(node, currentFrame)

  const num = (label: string, prop: AnimatableProp, step = 1, min?: number, max?: number) => {
    const kf = node.keyframes[prop]?.find((k) => k.frame === currentFrame)
    const hasKf = !!kf
    return (
      <div key={prop}>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="w-12 text-[11px] text-muted">{label}</label>
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            value={Number(eff[prop].toFixed(4))}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (Number.isNaN(v)) return
              beginTouch()
              liveSet(node.id, prop, max != null && min != null ? Math.max(min, Math.min(max, v)) : v)
            }}
            className="field flex-1"
          />
          <button
            title={hasKf ? '删除关键帧' : '添加关键帧'}
            onClick={() => { if (hasKf) removeKeyframe(node.id, prop, currentFrame); else addKeyframe(node.id, prop) }}
            className={hasKf ? 'p-1 rounded text-accent bg-accent/15' : 'p-1 rounded text-muted hover:bg-panel2'}
          >
            <Key size={12} />
          </button>
        </div>
        {hasKf && kf && (
          <div className="flex items-center gap-2 mb-1.5 pl-14">
            <label className="text-[10px] text-muted w-7">缓动</label>
            <select
              value={kf.easing}
              onChange={(e) => setKeyframeEasing(node.id, prop, currentFrame, e.target.value as EasingType)}
              className="field-sm flex-1"
            >
              {EASINGS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
      </div>
    )
  }

  const styleNum = (label: string, key: keyof SceneNode, step = 1) => (
    <div key={String(key)} className="flex items-center gap-2 mb-1.5">
      <label className="w-12 text-[11px] text-muted">{label}</label>
      <input
        type="number"
        step={step}
        value={Number((node[key] as number).toFixed(4))}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (Number.isNaN(v)) return
          beginTouch()
          liveStyle(node.id, { [key]: v } as Partial<SceneNode>)
        }}
        className="field flex-1"
      />
    </div>
  )

  const color = (label: string, key: 'fill' | 'stroke') => (
    <div key={key} className="flex items-center gap-2 mb-1.5">
      <label className="w-12 text-[11px] text-muted">{label}</label>
      <input
        type="color"
        value={node[key]}
        onChange={(e) => { beginTouch(); liveStyle(node.id, { [key]: e.target.value } as Partial<SceneNode>) }}
        className="h-7 w-9 bg-transparent border border-edge rounded cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={node[key]}
        onChange={(e) => { beginTouch(); liveStyle(node.id, { [key]: e.target.value } as Partial<SceneNode>) }}
        className="field flex-1 font-mono"
      />
    </div>
  )

  return (
    <div className="flex flex-col border-l border-edge bg-panel1 shrink-0 overflow-y-auto" style={{ width }}>
      <div className="h-10 flex items-center px-3 border-b border-edge">
        <span className="section-label">属性</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => duplicateNode(node.id)} title="复制" className="p-1 rounded hover:bg-panel2 text-muted hover:text-text"><Copy size={13} /></button>
          <button onClick={() => deleteNode(node.id)} title="删除" className="p-1 rounded hover:bg-danger/20 text-danger"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="px-3 pt-2.5">
        <div className="text-xs font-semibold truncate mb-2">{node.name}</div>
      </div>

      <div className="px-3 pb-3 border-b border-edge">
        <div className="section-label mb-2">变换</div>
        {ANIMATABLE_PROPS.map((p) =>
          num(PROP_LABEL[p], p, p === 'opacity' ? 0.05 : 1, p === 'opacity' ? 0 : undefined, p === 'opacity' ? 1 : undefined),
        )}
        <button
          onClick={() => addKeyframeAll(node.id)}
          className="mt-2 w-full py-1.5 text-[11px] bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors"
        >
          为所有属性打关键帧
        </button>
      </div>

      <div className="p-3">
        <div className="section-label mb-2">样式</div>
        {color('填充', 'fill')}
        {color('描边', 'stroke')}
        {styleNum('描边宽', 'strokeWidth', 1)}
        {node.type === 'rect' && styleNum('圆角', 'cornerRadius', 1)}
        {node.type === 'text' && (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="w-12 text-[11px] text-muted">文本</label>
              <input
                type="text"
                value={node.text}
                onChange={(e) => { beginTouch(); liveStyle(node.id, { text: e.target.value }) }}
                className="field flex-1"
              />
            </div>
            {styleNum('字号', 'fontSize', 1)}
          </>
        )}
        {(node.type === 'rect' || node.type === 'ellipse') && (
          <>
            {styleNum('宽度', 'width', 1)}
            {styleNum('高度', 'height', 1)}
          </>
        )}
      </div>
    </div>
  )
}
