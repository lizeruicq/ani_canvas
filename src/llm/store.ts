import { create } from 'zustand'

export interface LLMConfig {
  apiKey: string
  baseURL: string
  modelId: string
}

interface LLMState {
  config: LLMConfig
  connected: boolean
  setConfig: (c: Partial<LLMConfig>) => void
  setConnected: (c: boolean) => void
}

const STORAGE_KEY = 'anicanvas.llm'

const DEFAULT_CONFIG: LLMConfig = {
  apiKey: '',
  baseURL: 'https://api.deepseek.com/v1',
  modelId: 'deepseek-chat',
}

interface Persisted {
  apiKey: string
  baseURL: string
  modelId: string
  connected: boolean
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return {
        apiKey: p.apiKey ?? DEFAULT_CONFIG.apiKey,
        baseURL: p.baseURL ?? DEFAULT_CONFIG.baseURL,
        modelId: p.modelId ?? DEFAULT_CONFIG.modelId,
        connected: p.connected ?? false,
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG, connected: false }
}

function persist(config: LLMConfig, connected: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, connected }))
  } catch {
    /* ignore */
  }
}

const initial = load()

export const useLLM = create<LLMState>((set, get) => ({
  config: {
    apiKey: initial.apiKey,
    baseURL: initial.baseURL,
    modelId: initial.modelId,
  },
  connected: initial.connected,
  setConfig: (c) => {
    const config = { ...get().config, ...c }
    set({ config })
    persist(config, get().connected)
  },
  setConnected: (connected) => {
    set({ connected })
    persist(get().config, connected)
  },
}))
