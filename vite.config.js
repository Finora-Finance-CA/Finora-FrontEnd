import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, send /api requests to the local API so the browser sees a
    // single origin and the API doesn't need CORS set up.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
