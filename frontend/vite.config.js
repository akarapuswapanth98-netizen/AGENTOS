import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev server runs on :5173 to match backend CORS settings.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'flow-vendor': ['@xyflow/react'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'canvas-confetti'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
