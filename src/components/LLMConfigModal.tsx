import { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useLLM } from '../llm/store'
import { testConnection } from '../llm/api'

export default function LLMConfigModal({ onClose }: { onClose: () => void }) {
  const { config, setConfig, connected, setConnected } = useLLM()
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [modelId, setModelId] = useState(config.modelId)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const canSubmit = !!apiKey.trim() && !!baseURL.trim() && !!modelId.trim()

  const handleTest = async () => {
    if (!canSubmit) return
    setTesting(true)
    setResult(null)
    try {
      await testConnection({ apiKey, baseURL, modelId })
      setConfig({ apiKey, baseURL, modelId })
      setConnected(true)
      setResult({ ok: true, msg: '连接成功' })
    } catch (e) {
      setConnected(false)
      setResult({ ok: false, msg: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    setConfig({ apiKey, baseURL, modelId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-panel1 border border-edge rounded-xl p-5 w-[460px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">大模型配置</h3>
            <span className={['text-[10px] px-1.5 py-0.5 rounded-full font-medium', connected ? 'bg-ok/15 text-ok' : 'bg-panel2 text-muted'].join(' ')}>
              {connected ? '已连接' : '未连接'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-panel2 rounded text-muted hover:text-text"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-muted mb-1">API Base URL</label>
            <input className="field w-full font-mono" value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="https://api.deepseek.com/v1" />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">API Key</label>
            <input className="field w-full font-mono" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">模型 ID</label>
            <input className="field w-full font-mono" value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="deepseek-chat" />
          </div>
        </div>

        {result && (
          <div className={['mt-3 flex items-center gap-1.5 text-xs', result.ok ? 'text-ok' : 'text-danger'].join(' ')}>
            {result.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span className="break-all">{result.msg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleTest}
            disabled={testing || !canSubmit}
            className="px-3 py-1.5 text-xs border border-edge rounded-lg hover:bg-panel2 disabled:opacity-40 flex items-center gap-1.5 text-text"
          >
            {testing && <Loader2 size={13} className="animate-spin" />}
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:brightness-110">保存</button>
        </div>

        <p className="mt-3 text-[10px] text-muted leading-relaxed">
          需 OpenAI 兼容接口(自动补全 <span className="font-mono">/chat/completions</span>)。配置仅保存在本机浏览器(localStorage)。连接成功后右上角会出现对话按钮。若测试报 CORS 跨域错误,说明该服务商不允许浏览器直连,需使用支持跨域的服务商或代理。
        </p>
      </div>
    </div>
  )
}
