import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  base: './', // necessário para abrir via file:// dentro do Electron
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(version) }, // versão mostrada no rodapé do app
  server: { port: 5173 },
})
