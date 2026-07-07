import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://phoebe-health.github.io/office-screensaver/dash/
// The existing bouncing-logo screensaver stays at /office-screensaver/ (repo root index.html).
export default defineConfig({
  base: '/office-screensaver/dash/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Paths are resolved relative to the Vite project root (this dir).
      input: {
        index: 'index.html',
        'token-burner': 'token-burner.html',
        texts: 'texts.html',
      },
    },
  },
})
