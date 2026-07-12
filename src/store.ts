import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  AnimatableProp, EasingType, Keyframe, NodeType, Scene, SceneNode,
} from './types'
import { createNode, createScene, createDemoScene, uid } from './model/defaults'
import { effectiveProps } from './model/effective'
import { parseDSL, exportDSL } from './model/dsl'

export type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'path'

const LOCAL_STORAGE_KEY = 'ani-canvas-scene'
const AUTO_SAVE_DELAY = 1000

const clone = (s: Scene): Scene => JSON.parse(JSON.stringify(s))

// 尝试从 localStorage 加载场景
const loadSavedScene = (): Scene => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      const sc = JSON.parse(saved) as Scene
      if (sc.nodes && sc.version) {
        return sc
      }
    }
  } catch {
    // 忽略加载错误
  }
  return createDemoScene()
}

interface EditorState {
  scene: Scene
  selectedIds: string[]
  currentFrame: number
  playing: boolean
  loop: boolean
  autoKey: boolean
  tool: Tool
  past: Scene[]
  future: Scene[]
  isDirty: boolean
  fileSyncEnabled: boolean
  syncingToFile: boolean

  setTool: (t: Tool) => void
  selectNode: (id: string | null, addToSelection?: boolean) => void
  selectNodes: (ids: string[]) => void
  clearSelection: () => void
  toggleNodeSelection: (id: string) => void
  setCurrentFrame: (f: number) => void
  setPlaying: (p: boolean) => void
  toggleLoop: () => void
  toggleAutoKey: () => void
  setFps: (n: number) => void
  setDuration: (n: number) => void
  setBackground: (c: string) => void
  setName: (n: string) => void

  addNode: (type: NodeType, partial?: Partial<SceneNode>) => string
  addNodeAt: (type: NodeType, x: number, y: number) => string
  updateNode: (id: string, partial: Partial<SceneNode>) => void
  updateNodes: (ids: string[], partial: Partial<SceneNode>) => void
  deleteNode: (id: string) => void
  deleteSelectedNodes: () => void
  duplicateNode: (id: string) => void
  reorderNode: (id: string, dir: -1 | 1) => void
  toggleVisible: (id: string) => void
  toggleLock: (id: string) => void
  renameNode: (id: string, name: string) => void

  beginTouch: () => void
  liveSet: (id: string, prop: AnimatableProp, value: number) => void
  liveSetMany: (ids: string[], prop: AnimatableProp, values: number[]) => void
  liveStyle: (id: string, partial: Partial<SceneNode>) => void
  liveStyleMany: (ids: string[], partial: Partial<SceneNode>) => void

  addKeyframe: (id: string, prop: AnimatableProp) => void
  addKeyframeAll: (id: string) => void
  removeKeyframe: (id: string, prop: AnimatableProp, frame: number) => void
  moveKeyframe: (id: string, prop: AnimatableProp, fromFrame: number, toFrame: number) => void
  setKeyframeEasing: (id: string, prop: AnimatableProp, frame: number, easing: EasingType) => void
  setKeyframeValue: (id: string, prop: AnimatableProp, frame: number, value: number) => void

  undo: () => void
  redo: () => void

  loadScene: (s: Scene) => void
  newScene: () => void
  loadDemo: () => void
  importProjectJSON: (json: string) => boolean
  exportProjectJSON: () => string
  importDSL: (text: string) => boolean
  applyDSL: (text: string) => boolean
  applyScene: (sc: Scene) => void

  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  exportToFile: () => void
  importFromFile: (file: File) => Promise<boolean>

  // 文件同步功能
  setFileSyncEnabled: (enabled: boolean) => void
  loadFromSceneFile: () => Promise<boolean>
  saveToSceneFile: () => Promise<boolean>
}

function snapshot(state: { scene: Scene; past: Scene[]; future: Scene[] }) {
  state.past = [...state.past, clone(state.scene)].slice(-60)
  state.future = []
}

function withNode(state: EditorState, id: string, fn: (n: SceneNode) => void) {
  const n = state.scene.nodes.find((x) => x.id === id)
  if (n) fn(n)
}

function writeKeyframeAt(n: SceneNode, prop: AnimatableProp, frame: number, value: number) {
  const kfs = n.keyframes[prop] ? [...n.keyframes[prop]!] : []
  const idx = kfs.findIndex((k) => k.frame === frame)
  if (idx >= 0) {
    kfs[idx] = { ...kfs[idx], value }
  } else {
    kfs.push({ frame, value, easing: 'easeOut' })
    kfs.sort((a, b) => a.frame - b.frame)
  }
  n.keyframes[prop] = kfs
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let fileSaveTimer: ReturnType<typeof setTimeout> | null = null

const scheduleAutoSave = (get: () => EditorState) => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSaveTimer = setTimeout(() => {
    get().saveToLocalStorage()
  }, AUTO_SAVE_DELAY)
}

const scheduleFileSave = (get: () => EditorState) => {
  if (fileSaveTimer) {
    clearTimeout(fileSaveTimer)
  }
  fileSaveTimer = setTimeout(() => {
    if (get().fileSyncEnabled) {
      get().saveToSceneFile()
    }
  }, AUTO_SAVE_DELAY)
}

export const useEditor = create<EditorState>()(immer((set, get) => ({
  scene: loadSavedScene(),
  selectedIds: [],
  currentFrame: 0,
  playing: false,
  loop: true,
  autoKey: false,
  tool: 'select',
  past: [],
  future: [],
  isDirty: false,
  fileSyncEnabled: true,
  syncingToFile: false,

  setTool: (t) => set({ tool: t, selectedIds: t === 'select' ? get().selectedIds : [] }),
  selectNode: (id, addToSelection = false) => set((s) => {
    if (!id) {
      s.selectedIds = []
    } else if (addToSelection) {
      if (!s.selectedIds.includes(id)) {
        s.selectedIds = [...s.selectedIds, id]
      }
    } else {
      s.selectedIds = [id]
    }
  }),
  selectNodes: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  toggleNodeSelection: (id) => set((s) => {
    if (s.selectedIds.includes(id)) {
      s.selectedIds = s.selectedIds.filter(i => i !== id)
    } else {
      s.selectedIds = [...s.selectedIds, id]
    }
  }),
  setCurrentFrame: (f) =>
    set((s) => {
      const next = Math.max(0, Math.min(s.scene.duration, Math.round(f)))
      // 帧号未变直接返回,避免 zustand 触发订阅者重渲染
      if (next === s.currentFrame) return {}
      return { currentFrame: next }
    }),
  setPlaying: (p) => set({ playing: p }),
  toggleLoop: () => set((s) => ({ loop: !s.loop })),
  toggleAutoKey: () => set((s) => ({ autoKey: !s.autoKey })),
  setFps: (n) => set((s) => { snapshot(get()); s.scene.fps = Math.max(1, Math.round(n)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  setDuration: (n) => set((s) => { snapshot(get()); s.scene.duration = Math.max(1, Math.round(n)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  setBackground: (c) => set((s) => { snapshot(get()); s.scene.background = c; s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  setName: (n) => set((s) => { snapshot(get()); s.scene.name = n; s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),

  addNode: (type, partial) => {
    const node = createNode(type, partial)
    set((s) => { snapshot(s); s.scene.nodes.push(node); s.selectedIds = [node.id]; s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) })
    return node.id
  },
  addNodeAt: (type, x, y) => {
    const node = createNode(type, { x, y })
    set((s) => { snapshot(s); s.scene.nodes.push(node); s.selectedIds = [node.id]; s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) })
    return node.id
  },
  updateNode: (id, partial) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => Object.assign(n, partial)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  updateNodes: (ids, partial) =>
    set((s) => {
      snapshot(s)
      ids.forEach(id => withNode(s, id, (n) => Object.assign(n, partial)))
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  deleteNode: (id) =>
    set((s) => {
      snapshot(s)
      s.scene.nodes = s.scene.nodes.filter((n) => n.id !== id)
      s.selectedIds = s.selectedIds.filter(i => i !== id)
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  deleteSelectedNodes: () =>
    set((s) => {
      snapshot(s)
      s.scene.nodes = s.scene.nodes.filter((n) => !s.selectedIds.includes(n.id))
      s.selectedIds = []
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  duplicateNode: (id) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n) return
      snapshot(s)
      const c: SceneNode = JSON.parse(JSON.stringify(n))
      c.id = uid(n.type)
      c.name = n.name + ' 副本'
      c.x = n.x + 24
      c.y = n.y + 24
      s.scene.nodes.push(c)
      s.selectedIds = [c.id]
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  reorderNode: (id, dir) =>
    set((s) => {
      const i = s.scene.nodes.findIndex((n) => n.id === id)
      if (i < 0) return
      const j = i + dir
      if (j < 0 || j >= s.scene.nodes.length) return
      snapshot(s)
      const arr = s.scene.nodes
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  toggleVisible: (id) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.visible = !n.visible)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  toggleLock: (id) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.locked = !n.locked)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  renameNode: (id, name) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.name = name)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),

  beginTouch: () => set((s) => { snapshot(s) }),
  // autoKey 开启时,任何属性改动都在当前帧写关键帧;否则仅当轨道已存在时写关键帧
  liveSet: (id, prop, value) =>
    set((s) => {
      withNode(s, id, (n) => {
        const hasTrack = !!n.keyframes[prop] && n.keyframes[prop]!.length > 0
        if (s.autoKey || hasTrack) {
          writeKeyframeAt(n, prop, s.currentFrame, value)
        } else {
          (n as any)[prop] = value
        }
      })
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  liveSetMany: (ids, prop, values) =>
    set((s) => {
      ids.forEach((id, i) => {
        withNode(s, id, (n) => {
          const hasTrack = !!n.keyframes[prop] && n.keyframes[prop]!.length > 0
          if (s.autoKey || hasTrack) {
            writeKeyframeAt(n, prop, s.currentFrame, values[i])
          } else {
            (n as any)[prop] = values[i]
          }
        })
      })
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  liveStyle: (id, partial) =>
    set((s) => { withNode(s, id, (n) => Object.assign(n, partial)); s.isDirty = true; scheduleAutoSave(get); scheduleFileSave(get) }),
  liveStyleMany: (ids, partial) =>
    set((s) => {
      ids.forEach(id => withNode(s, id, (n) => Object.assign(n, partial)))
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),

  addKeyframe: (id, prop) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n) return
      snapshot(s)
      writeKeyframeAt(n, prop, s.currentFrame, effectiveProps(n, s.currentFrame)[prop])
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  addKeyframeAll: (id) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n) return
      snapshot(s)
      const eff = effectiveProps(n, s.currentFrame)
      ;(['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'] as AnimatableProp[]).forEach((p) =>
        writeKeyframeAt(n, p, s.currentFrame, eff[p]),
      )
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  removeKeyframe: (id, prop, frame) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      n.keyframes[prop] = n.keyframes[prop]!.filter((k) => k.frame !== frame)
      if (n.keyframes[prop]!.length === 0) delete n.keyframes[prop]
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  moveKeyframe: (id, prop, fromFrame, toFrame) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      const k = n.keyframes[prop]!.find((x) => x.frame === fromFrame)
      if (!k) return
      k.frame = Math.max(0, Math.round(toFrame))
      n.keyframes[prop]!.sort((a, b) => a.frame - b.frame)
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  setKeyframeEasing: (id, prop, frame, easing) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      const k = n.keyframes[prop]!.find((x) => x.frame === frame)
      if (k) k.easing = easing
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  setKeyframeValue: (id, prop, frame, value) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      const k = n.keyframes[prop]!.find((x) => x.frame === frame)
      if (k) k.value = value
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return
      const prev = s.past[s.past.length - 1]
      s.past = s.past.slice(0, -1)
      s.future = [clone(s.scene), ...s.future].slice(0, 60)
      s.scene = prev
      s.selectedIds = []
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return
      const next = s.future[0]
      s.future = s.future.slice(1)
      s.past = [...s.past, clone(s.scene)].slice(-60)
      s.scene = next
      s.selectedIds = []
      s.isDirty = true
      scheduleAutoSave(get)
      scheduleFileSave(get)
    }),

  loadScene: (sc) => set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true }),
  newScene: () => set({ scene: createScene(), selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true }),
  loadDemo: () => set({ scene: createDemoScene(), selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true }),
  importProjectJSON: (json) => {
    try {
      const sc = JSON.parse(json) as Scene
      if (!sc.nodes || !sc.version) return false
      set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true })
      scheduleAutoSave(get)
      scheduleFileSave(get)
      return true
    } catch {
      return false
    }
  },
  exportProjectJSON: () => JSON.stringify(get().scene, null, 2),
  importDSL: (text) => {
    try {
      const sc = parseDSL(text)
      if (!sc) return false
      set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true })
      scheduleAutoSave(get)
      scheduleFileSave(get)
      return true
    } catch {
      return false
    }
  },
  applyDSL: (text) => {
    try {
      const sc = parseDSL(text)
      if (!sc) return false
      get().applyScene(sc)
      return true
    } catch {
      return false
    }
  },
  applyScene: (sc) => set((s) => {
    snapshot(s)
    s.scene = sc
    s.selectedIds = []
    s.currentFrame = 0
    s.isDirty = true
    scheduleAutoSave(get)
    scheduleFileSave(get)
  }),

  saveToLocalStorage: () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(get().scene))
      set({ isDirty: false })
    } catch (e) {
      console.error('Failed to save scene to localStorage:', e)
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const sc = JSON.parse(saved) as Scene
        if (sc.nodes && sc.version) {
          set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: false })
        }
      }
    } catch (e) {
      console.error('Failed to load scene from localStorage:', e)
    }
  },

  exportToFile: () => {
    const scene = get().scene
    const dataStr = JSON.stringify(scene, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `${scene.name || 'scene'}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  },

  importFromFile: async (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const sc = JSON.parse(content) as Scene
          if (sc.nodes && sc.version) {
            set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: true })
            scheduleAutoSave(get)
            scheduleFileSave(get)
            resolve(true)
          } else {
            resolve(false)
          }
        } catch {
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsText(file)
    })
  },

  setFileSyncEnabled: (enabled) => set({ fileSyncEnabled: enabled }),

  loadFromSceneFile: async () => {
    try {
      const response = await fetch('/api/scene')
      if (!response.ok) return false
      const dslText = await response.text()
      const sc = parseDSL(dslText)
      if (!sc) return false
      set({ scene: sc, selectedIds: [], currentFrame: 0, past: [], future: [], isDirty: false })
      return true
    } catch (e) {
      console.error('Failed to load from scene file:', e)
      return false
    }
  },

  saveToSceneFile: async () => {
    try {
      set({ syncingToFile: true })
      const dslText = exportDSL(get().scene)
      const response = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: dslText
      })
      if (!response.ok) return false
      set({ isDirty: false, syncingToFile: false })
      return true
    } catch (e) {
      console.error('Failed to save to scene file:', e)
      set({ syncingToFile: false })
      return false
    }
  }
})))
