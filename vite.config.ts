import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('three')) return 'three';
              if (id.includes('@google/genai') || id.includes('stripe')) return 'ai-vendor';
              return 'vendor';
            }
            if (id.includes('src/pages/AdminDashboardPage') || id.includes('src/components/Admin')) return 'admin';
          },
        },
      },
    },
    optimizeDeps: { include: ['react', 'react-dom'] },
  };
});
