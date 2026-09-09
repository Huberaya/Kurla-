import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Le bundle principal dépassait 632 kB (182 kB gz) → LCP pénalisé.
      // On isole les vendors pour que le hero reste léger et cacheable.
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react';
              if (id.includes('motion')) return 'motion';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('three')) return 'three';
              if (id.includes('@google/genai') || id.includes('stripe')) return 'vendor-server';
              if (id.includes('gsap')) return 'gsap';
              return 'vendor';
            }
            // Admin is lourd (522 kB) → isolé, ne charge jamais sur la home
            if (id.includes('src/pages/AdminDashboardPage') || id.includes('src/components/Admin')) return 'admin';
            if (id.includes('src/pages/CustomerAccountPage') || id.includes('src/components/BeautyProfile')) return 'account';
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'motion', 'lucide-react'],
    },
  };
});
