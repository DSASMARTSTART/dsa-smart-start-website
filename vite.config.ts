import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Per-language locale chunks
              if (id.includes('/locales/it/')) return 'locale-it';
              if (id.includes('/locales/sr/')) return 'locale-sr';
              if (id.includes('/locales/es/')) return 'locale-es';
              // Split vendor chunks for better caching
              if (id.includes('node_modules/react-dom')) return 'react-vendor';
              if (id.includes('node_modules/react')) return 'react-vendor';
              if (id.includes('node_modules/@supabase')) return 'supabase';
              if (id.includes('node_modules/@tanstack/react-query')) return 'query';
              if (id.includes('node_modules/lucide-react')) return 'ui-icons';
              if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n';
            }
          }
        },
        chunkSizeWarningLimit: 600, // Increase limit slightly
      }
    };
});
