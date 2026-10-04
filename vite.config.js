import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Listen on all network interfaces so a phone on the same Wi-Fi can open the dev server (http://<this PC's LAN IP>:5173).
  server: { host: true },
})
