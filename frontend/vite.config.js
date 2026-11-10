import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The backend's CORS allowlist expects http://localhost:5173. Fail loudly if
  // the port is taken instead of silently moving to 5174 and getting CORS errors.
  server: { port: 5173, strictPort: true },
})
