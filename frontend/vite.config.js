import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The backend (backend/, FastAPI): the pages ask their own address for /api (the data) and /media (the people's photos) and the dev server forwards those to it, so a
// phone on the Wi-Fi needs nothing but the page's address and the backend has no CORS to allow. It listens on 8001 (backend/README.md).
const backend = { '/api': 'http://127.0.0.1:8001', '/media': 'http://127.0.0.1:8001' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Listen on all network interfaces so a phone on the same Wi-Fi can open the dev server (http://<this PC's LAN IP>:5173).
  server: { host: true, proxy: backend },
  preview: { proxy: backend },
})
