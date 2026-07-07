import { AnimatableProp, EasingType, Keyframe, NodeType, Scene, SceneNode } from '../types'
import { createNode, createScene } from './defaults'

// 行式 DSL,便于 AI/人直接编写场景
//  scene fps=30 duration=150 width=1280 height=720 bg=#eef2f7
//  rect name=Agent x=180 y=300 w=200 h=130 fill=#5b8cff radius=22 thick=5
//  text name=标题 x=360 y=120 text="智能体调用工具" size=46 fill=#1a2233
//  arrow name=调用 x=400 y=365 points=0,0,460,0 fill=#ffd166 thick=6
//  keyframe Agent.x @0 = -260 [back]
//  keyframe Agent.x @25 = 180 [linear]

const ANIMATABLE_PROPS: AnimatableProp[] = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity']

function quoteIfNeeded(v: string): string {
  if (v === '') return '""'
  if (/[\s"=]/.test(v)) return `"${v.replace(/"/g, '\\"')}"`
  return v
}

function sanitizeName(name: string, used: Set<string>): string {
  let base = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_一-龥]/g, '_') || 'node'
  if (!used.has(base)) return base
  let i = 1
  while (used.has(`${base}_${i}`)) i += 1
  return `${base}_${i}`
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toString()
}

export function exportDSL(scene: Scene): string {
  const lines: string[] = []
  const used = new Set<string>()
  const nameMap = new Map<SceneNode, string>()

  lines.push('# Scene')
  const sceneParts = [
    `name=${quoteIfNeeded(scene.name)}`,
    `fps=${scene.fps}`,
    `duration=${scene.duration}`,
    `width=${scene.width}`,
    `height=${scene.height}`,
    `bg=${scene.background}`,
  ]
  lines.push(`scene ${sceneParts.join(' ')}`)
  lines.push('')

  if (scene.nodes.length > 0) {
    lines.push('# Nodes')
    for (const node of scene.nodes) {
      const safe = sanitizeName(node.name, used)
      used.add(safe)
      nameMap.set(node, safe)

      const parts: string[] = [`name=${quoteIfNeeded(safe)}`]
      parts.push(`x=${fmt(node.x)}`)
      parts.push(`y=${fmt(node.y)}`)
      parts.push(`rotation=${fmt(node.rotation)}`)
      parts.push(`opacity=${fmt(node.opacity)}`)
      parts.push(`visible=${node.visible ? 1 : 0}`)
      parts.push(`locked=${node.locked ? 1 : 0}`)

      if (node.type === 'rect' || node.type === 'ellipse') {
        parts.push(`w=${fmt(node.width)}`)
        parts.push(`h=${fmt(node.height)}`)
      }
      parts.push(`fill=${quoteIfNeeded(node.fill)}`)
      if (node.stroke !== '') parts.push(`stroke=${quoteIfNeeded(node.stroke)}`)
      parts.push(`thick=${fmt(node.strokeWidth)}`)
      if (node.type === 'rect') parts.push(`radius=${fmt(node.cornerRadius)}`)

      if (node.type === 'text') {
        parts.push(`text=${quoteIfNeeded(node.text)}`)
        parts.push(`size=${fmt(node.fontSize)}`)
      }
      if ((node.type === 'line' || node.type === 'arrow') && node.points.length > 0) {
        parts.push(`points=${node.points.map(fmt).join(',')}`)
      }
      if (node.type === 'path') {
        parts.push(`path=${quoteIfNeeded(node.pathData)}`)
      }

      lines.push(`${node.type} ${parts.join(' ')}`)
    }
    lines.push('')
  }

  const kfLines: string[] = []
  for (const node of scene.nodes) {
    const target = nameMap.get(node)
    if (!target) continue
    for (const prop of ANIMATABLE_PROPS) {
      const kfs = node.keyframes[prop]
      if (!kfs || kfs.length === 0) continue
      for (const kf of kfs) {
        kfLines.push(`keyframe ${target}.${prop} @${kf.frame} = ${fmt(kf.value)} [${kf.easing}]`)
      }
    }
  }
  if (kfLines.length > 0) {
    lines.push('# Keyframes')
    lines.push(...kfLines)
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

function tokenize(line: string): string[] {
  const tokens: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; cur += ch; continue }
    if (ch === ' ' && !inQ) { if (cur) tokens.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur) tokens.push(cur)
  return tokens
}

function parseKV(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const t of tokens) {
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    out[k] = v
  }
  return out
}

const num = (v: string | undefined, d: number) => (v == null || isNaN(+v) ? d : +v)

const NODE_TYPES: NodeType[] = ['rect', 'ellipse', 'line', 'arrow', 'text', 'path']

export function parseDSL(text: string): Scene | null {
  const scene = createScene()
  const nodeIndex: Record<string, SceneNode> = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const tokens = tokenize(line)
    const cmd = tokens[0]
    const rest = tokens.slice(1)

    if (cmd === 'scene') {
      const kv = parseKV(rest)
      if (kv.fps) scene.fps = num(kv.fps, scene.fps)
      if (kv.duration) scene.duration = num(kv.duration, scene.duration)
      if (kv.width) scene.width = num(kv.width, scene.width)
      if (kv.height) scene.height = num(kv.height, scene.height)
      if (kv.bg) scene.background = kv.bg
      if (kv.name) scene.name = kv.name
      continue
    }

    if (cmd === 'keyframe') {
      const target = rest[0]
      const at = rest.find((t) => t.startsWith('@'))
      const eqi = rest.indexOf('=')
      if (!target || !at || eqi < 0) continue
      const dot = target.lastIndexOf('.')
      const nodeName = target.slice(0, dot)
      const prop = target.slice(dot + 1) as AnimatableProp
      const frame = num(at.slice(1), 0)
      const value = num(rest[eqi + 1], 0)
      const easeTok = rest.find((t) => t.startsWith('[') && t.endsWith(']'))
      const easing = (easeTok ? easeTok.slice(1, -1) : 'linear') as EasingType
      const node = nodeIndex[nodeName]
      if (!node) continue
      const kfs = node.keyframes[prop] ? [...node.keyframes[prop]!] : []
      const idx = kfs.findIndex((k) => k.frame === frame)
      const kf: Keyframe = { frame, value, easing }
      if (idx >= 0) kfs[idx] = kf
      else { kfs.push(kf); kfs.sort((a, b) => a.frame - b.frame) }
      node.keyframes[prop] = kfs
      continue
    }

    if ((NODE_TYPES as string[]).includes(cmd)) {
      const kv = parseKV(rest)
      const node = createNode(cmd as NodeType)
      node.x = num(kv.x, node.x)
      node.y = num(kv.y, node.y)
      if (kv.w) node.width = +kv.w
      if (kv.h) node.height = +kv.h
      if (kv.fill) node.fill = kv.fill
      if (kv.stroke) node.stroke = kv.stroke
      if (kv.thick) node.strokeWidth = +kv.thick
      if (kv.radius) node.cornerRadius = +kv.radius
      if (kv.size) node.fontSize = +kv.size
      if (kv.text) node.text = kv.text
      if (kv.points) node.points = kv.points.split(',').map((n) => +n)
      if (kv.path) node.pathData = kv.path
      if (kv.rotation) node.rotation = +kv.rotation
      if (kv.opacity != null) node.opacity = Math.max(0, Math.min(1, +kv.opacity))
      if (kv.visible != null) node.visible = kv.visible === '1' || kv.visible.toLowerCase() === 'true'
      if (kv.locked != null) node.locked = kv.locked === '1' || kv.locked.toLowerCase() === 'true'
      node.name = kv.name ?? node.name
      nodeIndex[node.name] = node
      scene.nodes.push(node)
      continue
    }
  }
  return scene
}
