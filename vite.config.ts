import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/table-tennis-game/',
  build: {
    outDir: 'docs',
  },
  plugins: [react()],
})
