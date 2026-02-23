import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.geojson'],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 2048, // 2MB - warning só para chunks realmente grandes
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false, // Remove sourcemaps em produção para reduzir tamanho
    rollupOptions: {
      output: {
        manualChunks: function (id) {
          var _a;
          // Vendor libraries - importante consolidar os principais
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) {
              return 'vendor-echarts';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('@tanstack/react-table')) {
              return 'vendor-table';
            }
            if (id.includes('react-hook-form') || id.includes('react-hot-toast')) {
              return 'vendor-forms';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@headlessui') || id.includes('@floating-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('date-fns') || id.includes('clsx')) {
              return 'vendor-utils';
            }
            // Consolidar React e outras libs no vendor-core para evitar chunks vazios
            if (id.includes('react') || id.includes('zustand')) {
              return 'vendor-core';
            }
          }
          // Lazy-loaded pages ficam em chunks separados
          if (id.includes('pages/')) {
            var pageName =
              (_a = id.split('pages/')[1]) === null || _a === void 0 ? void 0 : _a.split('/')[0];
            if (pageName) return 'page-'.concat(pageName);
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: function (assetInfo) {
          var info = assetInfo.name.split('.');
          var ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return 'img/[name]-[hash].'.concat(ext);
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'fonts/[name]-[hash].'.concat(ext);
          }
          return 'assets/[name]-[hash].'.concat(ext);
        },
      },
    },
  },
});
