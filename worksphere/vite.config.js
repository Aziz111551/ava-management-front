import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2019',
  },
  resolve: {
    dedupe: ['date-fns'],
  },
  optimizeDeps: {
    include: [
      'date-fns/format',
      'date-fns/parseISO',
      'date-fns/isThisWeek',
      'date-fns/startOfMonth',
      'date-fns/endOfMonth',
    ],
    esbuildOptions: {
      target: 'es2019',
    },
  },
})
