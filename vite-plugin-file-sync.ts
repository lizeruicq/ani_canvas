import fs from 'fs'
import path from 'path'
import { Plugin, ViteDevServer } from 'vite'

const SCENE_FILE = path.resolve(process.cwd(), 'scenes/scene.dsl')

export default function fileSyncPlugin(): Plugin {
  return {
    name: 'file-sync-plugin',
    configureServer(server: ViteDevServer) {
      // 确保目录存在
      const scenesDir = path.dirname(SCENE_FILE)
      if (!fs.existsSync(scenesDir)) {
        fs.mkdirSync(scenesDir, { recursive: true })
      }

      // 如果文件不存在，创建一个默认的
      if (!fs.existsSync(SCENE_FILE)) {
        const defaultContent = `# AniCanvas 场景配置文件
# AI 可以直接编辑此文件来修改动画场景

scene 
  name="未命名场景"
  fps=30
  duration=150
  width=1280
  height=720
  bg=#eef2f7

rect 
  name="Agent"
  x=180
  y=300
  w=200
  h=130
  fill=#4f7cff
  stroke=
  thick=0
  radius=22
  rotation=0
  opacity=1
  visible=1
  locked=0

text 
  name="标题"
  x=360
  y=120
  text="智能体调用工具"
  fill=#1a2233
  size=46
  rotation=0
  opacity=1
  visible=1
  locked=0

keyframe Agent.x @0 = -260 [back]
keyframe Agent.x @25 = 180 [linear]
`
        fs.writeFileSync(SCENE_FILE, defaultContent, 'utf-8')
      }

      // 监听文件变化
      let debounceTimer: NodeJS.Timeout | null = null
      fs.watchFile(SCENE_FILE, { interval: 300 }, () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          server.ws.send({
            type: 'custom',
            event: 'scene-file-changed',
            data: { timestamp: Date.now() }
          })
        }, 200)
      })

      // 提供 API 接口
      server.middlewares.use('/api/scene', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method === 'GET') {
          try {
            const content = fs.readFileSync(SCENE_FILE, 'utf-8')
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.writeHead(200)
            res.end(content)
          } catch (e) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: 'Failed to read scene file' }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              fs.writeFileSync(SCENE_FILE, body, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.writeHead(200)
              res.end(JSON.stringify({ success: true }))
            } catch (e) {
              res.writeHead(500)
              res.end(JSON.stringify({ error: 'Failed to write scene file' }))
            }
          })
          return
        }

        next()
      })
    }
  }
}
