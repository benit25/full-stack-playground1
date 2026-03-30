import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || '')
    },
    server: {
      port: 3012,
      host: '0.0.0.0'
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
