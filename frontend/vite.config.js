import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 19006,
    host: '0.0.0.0',
    middlewareMode: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
