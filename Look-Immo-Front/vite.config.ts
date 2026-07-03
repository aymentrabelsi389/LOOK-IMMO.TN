import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    plugins: [react()],

    // ─── Fix: CJS/ESM interop for mixed-module libraries (recharts, react-leaflet…)
    // Without this, Rollup replaces require('react') with named imports but leaves
    // bare `React.createContext(...)` calls unrewritten → ReferenceError at runtime.
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    // ─── Fix: Pre-bundle React with esbuild so the module is available as a proper
    // ESM singleton before any vendor chunk that references it is evaluated.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },

    resolve: {
      // ─── Fix: Guarantee one single React instance across ALL chunks.
      // Prevents duplicate React copies when deep dependencies resolve their own.
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});