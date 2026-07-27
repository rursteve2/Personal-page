import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // three is by far the largest dependency; splitting it out means the shell
    // can paint while the scene chunk is still arriving.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
