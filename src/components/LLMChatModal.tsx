import { useRef, useState, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { useLLM } from '../llm/store'
import { chatCompletion, extractDSL } from '../llm/api'
import { ANIMATION_SYSTEM_PROMPT } from '../llm/prompt'
import { parseDSL } from '../model/dsl'
import { useEditor } from '../store'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  status?: 'loading' | 'applied' | 'error' | 'done'
}

const EXAMPLES = [
  '生成一个弹跳的小球,落地有挤压效果',
  '演示 Agent 调用工具的流程',
  '用箭头动画讲解 ReAct 循环',
]

export default function LLMChatModal({ onClose }: { onClose: () => void }) {
  const config = useLLM((s) => s.config)
  const applyScene = useEditor((s) => s.applyScene)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: '描述你想要的动画,我会生成场景配置并加载到画布。主题建议围绕智能体开发原理。', status: 'done' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const prompt = text.trim()
    if (!prompt || busy) return
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content: prompt }, { role: 'assistant', content: '', status: 'loading' }])
    try {
      const reply = await chatCompletion(
        config,
        [
          { role: 'system', content: ANIMATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 },
      )
      const dsl = extractDSL(reply)
      const scene = parseDSL(dsl)
      if (!scene || scene.nodes.length === 0) throw new Error('未能从模型回复中解析出有效场景,请重试或换种描述')
      applyScene(scene)
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: dsl, status: 'applied' }
        return copy
      })
    } catch (e) {
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: (e as Error).message, status: 'error' }
        return copy
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute right-5 bottom-5 w-[400px] h-[560px] bg-panel1 border border-edge rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
        <div className="h-11 flex items-center px-3 border-b border-edge gap-2 shrink-0">
          <Sparkles size={15} className="text-accent" />
          <span className="text-sm font-semibold">AI 动画生成</span>
          <span className="text-[10px] text-muted truncate flex-1 ml-1 font-mono">{config.modelId}</span>
          <button onClick={onClose} className="p-1 hover:bg-panel2 rounded text-muted hover:text-text"><X size={16} /></button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                disabled={busy}
                className="text-[11px] px-2 py-1 rounded-full border border-edge text-muted hover:bg-panel2 hover:text-text disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-edge shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="描述想要的动画…(Enter 发送)"
              rows={2}
              className="field flex-1 resize-none"
              disabled={busy}
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="w-9 h-9 shrink-0 grid place-items-center rounded-lg bg-accent text-white hover:brightness-110 disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user'
  if (msg.status === 'loading') {
    return (
      <div className="flex justify-start">
        <div className="bg-panel2 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-muted flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin" /> 生成中…
        </div>
      </div>
    )
  }
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div className={[
        'max-w-[90%] px-3 py-2 text-xs',
        isUser ? 'bg-accent text-white rounded-2xl rounded-br-sm' : 'bg-panel2 text-text rounded-2xl rounded-bl-sm',
      ].join(' ')}>
        {msg.status === 'applied' && (
          <div className="text-ok font-semibold mb-1 flex items-center gap-1"><CheckCircle2 size={12} /> 已应用到画布(可 ⌘Z 撤销)</div>
        )}
        {msg.status === 'error' ? (
          <span className="text-danger whitespace-pre-wrap break-words">{msg.content}</span>
        ) : msg.status === 'applied' ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[10px] max-h-44 overflow-y-auto bg-panel1/70 rounded p-1.5 leading-relaxed">{msg.content}</pre>
        ) : (
          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        )}
      </div>
    </div>
  )
}
