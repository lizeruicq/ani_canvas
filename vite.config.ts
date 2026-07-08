import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fileSyncPlugin from './vite-plugin-file-sync'

export default defineConfig({
  plugins: [react(), fileSyncPlugin()],
  server: { port: 5173, host: 'localhost' },
})
