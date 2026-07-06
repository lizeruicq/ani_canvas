import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import { X } from 'lucide-react'
import { useEditor } from '../store'
import { effectiveProps } from '../model/effective'
import NodeRenderer from './NodeRenderers'

interface VideoExportModalProps {
  onClose: () => void
}

export default function VideoExportModal({ onClose }: VideoExportModalProps) {
  const { scene, currentFrame, setCurrentFrame } = useEditor()
  const [progress, setProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [log, setLog] = useState('')
  const stageRef = useRef<any>(null)

  const codec = (() => {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9'
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) return 'video/webm;codecs=vp8'
    return 'video/webm'
  })()

  const runExport = async () => {
    if (!stageRef.current) return
    setExporting(true)
    setLog('初始化录制器...')

    const stage = stageRef.current.getStage()
    const canvas = stage.content.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) {
      setLog('错误：无法获取画布')
      setExporting(false)
      return
    }

    const stream = canvas.captureStream(scene.fps)
    const recorder = new MediaRecorder(stream, { mimeType: codec })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${scene.name || 'animation'}.webm`
        a.click()
        URL.revokeObjectURL(url)
        resolve()
      }

      recorder.start()
      setLog('录制中...')

      let frame = 0
      const step = async () => {
        if (frame > scene.duration) {
          recorder.stop()
          setLog('完成')
          return
        }
        setCurrentFrame(frame)
        stage.batchDraw()
        setProgress(Math.round((frame / scene.duration) * 100))
        frame += 1
        await new Promise((r) => setTimeout(r, 1000 / scene.fps))
        step()
      }
      step()
    })

    setExporting(false)
  }

  // Restore original frame when modal closes
  const originalFrame = useRef(currentFrame)
  useEffect(() => {
    originalFrame.current = currentFrame
    return () => setCurrentFrame(originalFrame.current)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-panel1 border border-edge rounded-lg p-4 w-[560px] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">导出视频</h3>
          <button
            onClick={onClose}
            disabled={exporting}
            className="p-1 hover:bg-panel2 rounded disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted mb-3">
          将动画导出为 WebM 视频（{scene.width}×{scene.height}, {scene.fps}fps, {scene.duration} 帧）。
          录制过程需要实时播放，请耐心等待。
        </p>

        {/* Hidden stage for rendering */}
        <div className="absolute left-[-9999px]">
          <Stage
            ref={stageRef}
            width={scene.width}
            height={scene.height}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={scene.width}
                height={scene.height}
                fill={scene.background}
              />
              {scene.nodes.map((node) => (
                <NodeRenderer
                  key={node.id}
                  node={node}
                  eff={effectiveProps(node, currentFrame)}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        <div className="mb-3">
          <div className="h-2 bg-panel2 rounded overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] text-muted mt-1">{log} {progress > 0 && `${progress}%`}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-3 py-1.5 text-xs hover:bg-panel2 rounded disabled:opacity-30"
          >
            关闭
          </button>
          <button
            onClick={runExport}
            disabled={exporting}
            className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {exporting ? '导出中...' : '导出 WebM'}
          </button>
        </div>
      </div>
    </div>
  )
}
