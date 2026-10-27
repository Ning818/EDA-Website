import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The admin is an application of its own: it has its own dependencies, build and port, and nothing in it imports the website's code (../src). It reaches the API only through
// HTTP, the same way the website does: the dev server forwards /api and /media to the API on port 8001, so the browser sees a single address and there is no CORS to allow.
// `changeOrigin: false` keeps the browser's own Host header (localhost:5174) on the way: the API's cross-site check (backend/README.md, "Pages of other sites") compares the Origin
// of a request that changes something with its Host, and Vite's short form of a proxy rewrites the Host to the API's, which the check would take for another site.
const forward = (target) => ({ target, changeOrigin: false })
const api = { '/api': forward('http://127.0.0.1:8001'), '/media': forward('http://127.0.0.1:8001') }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true, proxy: api },
  preview: { port: 5174, strictPort: true, proxy: api },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./test/setup.js'],
  },
})
