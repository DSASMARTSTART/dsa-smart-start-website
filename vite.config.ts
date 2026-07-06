import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        // Respect an injected PORT (e.g. preview/CI harnesses) but default to 3000.
        port: process.env.PORT ? Number(process.env.PORT) : 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Strip noisy console.log/info/debug from PRODUCTION bundles (audit: 150+
      // console calls leaking internal flow). console.error/console.warn are kept
      // so genuine failures remain visible in production.
      esbuild: {
        pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
      // NOTE: no `define` for GEMINI_API_KEY here. Nothing in the app uses it, and
      // injecting it via define would bundle the key into client JS (audit S4). If a
      // Gemini feature is ever added, call it from a Supabase Edge Function with the
      // key kept server-side — never expose it to the browser.
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
