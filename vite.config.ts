import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        // Keep the original Host (localhost:5173) so the Worker derives the
        // frontend origin for the OAuth redirect_uri — otherwise the callback
        // lands on the Worker's port (8788) instead of the Vite dev server.
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('headersSent' in res && !res.headersSent) {
              (res as import('http').ServerResponse).writeHead(503)
              res.end()
            }
          })
        },
      },
    },
  },
})
