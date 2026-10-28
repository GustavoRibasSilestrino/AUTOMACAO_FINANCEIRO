import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // necessário para abrir via file:// dentro do Electron
  plugins: [react()],
  server: { port: 5173 },
})
