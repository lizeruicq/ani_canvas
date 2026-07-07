import type { LLMConfig } from './store'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 用户填的是 base URL(如 https://api.deepseek.com/v1),补全成 /chat/completions
function chatEndpoint(baseURL: string): string {
  const u = baseURL.trim().replace(/\/+$/, '')
  if (/\/chat\/completions$/.test(u)) return u
  return `${u}/chat/completions`
}

export async function chatCompletion(
  config: LLMConfig,
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  if (!config.apiKey) throw new Error('请先配置 API Key')
  if (!config.modelId) throw new Error('请先配置模型 ID')

  const body: Record<string, unknown> = {
    model: config.modelId,
    messages,
    temperature: opts?.temperature ?? 0.7,
    stream: false,
  }
  if (opts?.maxTokens != null) body.max_tokens = opts.maxTokens

  let res: Response
  try {
    res = await fetch(chatEndpoint(config.baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('网络请求失败(可能是 Base URL 错误、网络问题或 CORS 跨域限制):' + (e as Error).message)
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const j = await res.json()
      detail = j?.error?.message || j?.message || j?.error || detail
    } catch {
      try {
        const t = await res.text()
        if (t) detail = t.slice(0, 200)
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content) {
    throw new Error('返回格式异常:缺少 choices[0].message.content')
  }
  return content
}

export async function testConnection(config: LLMConfig): Promise<void> {
  await chatCompletion(config, [{ role: 'user', content: 'ping' }], {
    temperature: 0,
    maxTokens: 8,
  })
}

// 从模型回复中抽取 DSL:优先取最后一个 ``` 代码块,否则用全文
export function extractDSL(text: string): string {
  const re = /```(?:[a-zA-Z]*)?\n?([\s\S]*?)```/g
  const fences = [...text.matchAll(re)]
  if (fences.length) return fences[fences.length - 1][1].trim()
  return text.trim()
}
