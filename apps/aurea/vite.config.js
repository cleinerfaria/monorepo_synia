var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
var packageJsonPath = path.resolve(__dirname, 'package.json');
var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
var appVersion = (_a = packageJson.version) !== null && _a !== void 0 ? _a : '0.0.0';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: function (id) {
          // Vendor core - inclui dependências com circularidade
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/zustand') ||
            id.includes('node_modules/@react-google-maps') ||
            id.includes('node_modules/leaflet')
          ) {
            return 'vendor-core';
          }
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/date-fns')) {
            return 'vendor-data';
          }
          if (
            id.includes('node_modules/@headlessui') ||
            id.includes('node_modules/@heroicons') ||
            id.includes('node_modules/recharts')
          ) {
            return 'vendor-ui';
          }
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/react-hot-toast')
          ) {
            return 'vendor-forms';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/fast-xml-parser')) {
            return 'vendor-utils';
          }
          // Agrupa TODAS as páginas em um chunk único
          // (evita circularidades entre páginas diferentes)
          if (id.includes('/pages/')) {
            return 'pages';
          }
          // Agrupa componentes UI
          if (id.includes('/components/ui/')) {
            return 'components-ui';
          }
          // Hooks e lib ficam distribuídos automaticamente
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
