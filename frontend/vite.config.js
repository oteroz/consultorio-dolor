import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isPagesBuild = mode === 'pages';
  const base = isPagesBuild ? (process.env.VITE_BASE_PATH || '/') : '/';

  return {
    plugins: [react()],
    base,
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: isPagesBuild ? 'dist' : '../backend/public',
      emptyOutDir: true,
    },
  };
});
