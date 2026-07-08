import { parseDSL } from './src/model/dsl'
import { effectiveProps } from './src/model/effective'
import { readFileSync, writeFileSync } from 'fs'

const text = readFileSync('./scenes/scene.dsl', 'utf-8')
const sc = parseDSL(text)!
function esc(s: string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function svgForFrame(frame: number): string {
  const W = sc.width, H = sc.height
  const p: string[] = []
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`)
  p.push(`<rect width="${W}" height="${H}" fill="${sc.background}"/>`)
  for (const n of sc.nodes) {
    const e = effectiveProps(n, frame)
    if (!n.visible) continue
    const op = e.opacity
    const st = op < 1 ? ` opacity="${op}"` : ''
    const stroke = n.stroke ? ` stroke="${n.stroke}" stroke-width="${n.strokeWidth}"` : ''
    if (n.type === 'rect') {
      p.push(`<rect x="${e.x}" y="${e.y}" width="${n.width}" height="${n.height}" fill="${n.fill}"${stroke} rx="${n.cornerRadius||0}" ry="${n.cornerRadius||0}"${st}/>`)
    } else if (n.type === 'ellipse') {
      p.push(`<ellipse cx="${e.x}" cy="${e.y}" rx="${n.width/2}" ry="${n.height/2}" fill="${n.fill}"${stroke}${st}/>`)
    } else if (n.type === 'text') {
      p.push(`<text x="${e.x}" y="${e.y}" font-size="${n.fontSize}" fill="${n.fill}"${stroke} dominant-baseline="hanging" font-family="PingFang SC, sans-serif"${st}>${esc(n.text)}</text>`)
    }
  }
  p.push(`</svg>`)
  return p.join('\n')
}
const frame = Number(process.argv[2] ?? 95)
writeFileSync('/tmp/scene_frame.svg', svgForFrame(frame))
console.log('wrote svg frame', frame)
