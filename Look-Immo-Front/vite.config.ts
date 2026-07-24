import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  return {
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // ── Mapping layer: heaviest libraries first ──────────────────────
            // Leaflet + react-leaflet (map rendering) — only used on
            // ContactPage and PropertyDetailsPage
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-leaflet';
            }

            // Recharts + D3 (chart rendering) — only used in admin
            // DashboardStats, never on public routes
            if (id.includes('recharts') || id.includes('/d3')) {
              return 'vendor-charts';
            }

            // socket.io-client — large (~180 kB), only connects after auth
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'vendor-socket';
            }

            // @dnd-kit — drag-and-drop, only in PropertiesManagement (admin)
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }

            // @tanstack/react-query — data fetching layer
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }

            // Lucide icons — large but tree-shaken; keep separate so
            // per-route chunks don't duplicate icon code
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // zod — validation, only used in forms
            if (id.includes('zod')) {
              return 'vendor-zod';
            }

            // date-fns — if present
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }


            // Everything else (zustand, cookie utilities, etc.)
            return 'vendor';
          }
        }
      }
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
