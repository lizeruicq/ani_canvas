import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  AnimatableProp, EasingType, Keyframe, NodeType, Scene, SceneNode,
} from './types'
import { createNode, createScene, createDemoScene, uid } from './model/defaults'
import { effectiveProps } from './model/effective'
import { parseDSL } from './model/dsl'

export type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'path'

const clone = (s: Scene): Scene => JSON.parse(JSON.stringify(s))

interface EditorState {
  scene: Scene
  selectedId: string | null
  currentFrame: number
  playing: boolean
  loop: boolean
  autoKey: boolean
  tool: Tool
  past: Scene[]
  future: Scene[]

  setTool: (t: Tool) => void
  selectNode: (id: string | null) => void
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
  deleteNode: (id: string) => void
  duplicateNode: (id: string) => void
  reorderNode: (id: string, dir: -1 | 1) => void
  toggleVisible: (id: string) => void
  toggleLock: (id: string) => void
  renameNode: (id: string, name: string) => void

  beginTouch: () => void
  liveSet: (id: string, prop: AnimatableProp, value: number) => void
  liveStyle: (id: string, partial: Partial<SceneNode>) => void

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

export const useEditor = create<EditorState>()(immer((set, get) => ({
  scene: createDemoScene(),
  selectedId: null,
  currentFrame: 0,
  playing: false,
  loop: true,
  autoKey: false,
  tool: 'select',
  past: [],
  future: [],

  setTool: (t) => set({ tool: t, selectedId: t === 'select' ? get().selectedId : null }),
  selectNode: (id) => set({ selectedId: id }),
  setCurrentFrame: (f) =>
    set((s) => ({ currentFrame: Math.max(0, Math.min(s.scene.duration, Math.round(f))) })),
  setPlaying: (p) => set({ playing: p }),
  toggleLoop: () => set((s) => ({ loop: !s.loop })),
  toggleAutoKey: () => set((s) => ({ autoKey: !s.autoKey })),
  setFps: (n) => set((s) => { snapshot(get()); s.scene.fps = Math.max(1, Math.round(n)) }),
  setDuration: (n) => set((s) => { snapshot(get()); s.scene.duration = Math.max(1, Math.round(n)) }),
  setBackground: (c) => set((s) => { snapshot(get()); s.scene.background = c }),
  setName: (n) => set((s) => { snapshot(get()); s.scene.name = n }),

  addNode: (type, partial) => {
    const node = createNode(type, partial)
    set((s) => { snapshot(s); s.scene.nodes.push(node); s.selectedId = node.id })
    return node.id
  },
  addNodeAt: (type, x, y) => {
    const node = createNode(type, { x, y })
    set((s) => { snapshot(s); s.scene.nodes.push(node); s.selectedId = node.id })
    return node.id
  },
  updateNode: (id, partial) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => Object.assign(n, partial)) }),
  deleteNode: (id) =>
    set((s) => {
      snapshot(s)
      s.scene.nodes = s.scene.nodes.filter((n) => n.id !== id)
      if (s.selectedId === id) s.selectedId = null
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
      s.selectedId = c.id
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
    }),
  toggleVisible: (id) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.visible = !n.visible)) }),
  toggleLock: (id) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.locked = !n.locked)) }),
  renameNode: (id, name) =>
    set((s) => { snapshot(s); withNode(s, id, (n) => (n.name = name)) }),

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
    }),
  liveStyle: (id, partial) =>
    set((s) => { withNode(s, id, (n) => Object.assign(n, partial)) }),

  addKeyframe: (id, prop) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n) return
      snapshot(s)
      writeKeyframeAt(n, prop, s.currentFrame, effectiveProps(n, s.currentFrame)[prop])
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
    }),
  removeKeyframe: (id, prop, frame) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      n.keyframes[prop] = n.keyframes[prop]!.filter((k) => k.frame !== frame)
      if (n.keyframes[prop]!.length === 0) delete n.keyframes[prop]
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
    }),
  setKeyframeEasing: (id, prop, frame, easing) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      const k = n.keyframes[prop]!.find((x) => x.frame === frame)
      if (k) k.easing = easing
    }),
  setKeyframeValue: (id, prop, frame, value) =>
    set((s) => {
      const n = s.scene.nodes.find((x) => x.id === id)
      if (!n || !n.keyframes[prop]) return
      snapshot(s)
      const k = n.keyframes[prop]!.find((x) => x.frame === frame)
      if (k) k.value = value
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return
      const prev = s.past[s.past.length - 1]
      s.past = s.past.slice(0, -1)
      s.future = [clone(s.scene), ...s.future].slice(0, 60)
      s.scene = prev
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return
      const next = s.future[0]
      s.future = s.future.slice(1)
      s.past = [...s.past, clone(s.scene)].slice(-60)
      s.scene = next
    }),

  loadScene: (sc) => set({ scene: sc, selectedId: null, currentFrame: 0, past: [], future: [] }),
  newScene: () => set({ scene: createScene(), selectedId: null, currentFrame: 0, past: [], future: [] }),
  loadDemo: () => set({ scene: createDemoScene(), selectedId: null, currentFrame: 0, past: [], future: [] }),
  importProjectJSON: (json) => {
    try {
      const sc = JSON.parse(json) as Scene
      if (!sc.nodes || !sc.version) return false
      set({ scene: sc, selectedId: null, currentFrame: 0, past: [], future: [] })
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
      set({ scene: sc, selectedId: null, currentFrame: 0, past: [], future: [] })
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
    s.selectedId = null
    s.currentFrame = 0
  }),
})))
