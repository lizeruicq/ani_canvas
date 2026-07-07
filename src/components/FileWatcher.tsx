import { useEffect } from 'react'
import { useEditor } from '../store'

export default function FileWatcher() {
  const { loadFromSceneFile, fileSyncEnabled } = useEditor()

  // 初始化时从文件加载
  useEffect(() => {
    if (fileSyncEnabled) {
      loadFromSceneFile()
    }
  }, [])

  // 监听文件变化
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'custom' && event.data?.event === 'scene-file-changed') {
        if (fileSyncEnabled) {
          loadFromSceneFile()
        }
      }
    }

    // Vite 的 HMR socket
    const ws = (window as any).__VITE_HMR_SOCKET__
    if (ws) {
      ws.addEventListener('message', handleMessage)
      return () => ws.removeEventListener('message', handleMessage)
    }

    // 备用方案：使用自定义事件
    const handleCustomEvent = (event: CustomEvent) => {
      if (fileSyncEnabled) {
        loadFromSceneFile()
      }
    }
    window.addEventListener('scene-file-changed', handleCustomEvent as EventListener)
    return () => window.removeEventListener('scene-file-changed', handleCustomEvent as EventListener)
  }, [fileSyncEnabled, loadFromSceneFile])

  return null
}
