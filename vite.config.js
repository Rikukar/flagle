import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Emit flag SVGs as files (don't inline as base64) so unused flags don't bloat
  // the JS bundle; the ones we use are preloaded during play.
  build: { assetsInlineLimit: 0 },
})
