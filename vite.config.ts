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
              // (15/09) Les animations partent dans leur propre morceau.
              // Sans cela, `motion` se retrouvait dans le morceau `vendor`
              // — donc téléchargé, analysé et démarré sur **toutes** les
              // pages, y compris celles qui n'animent rien. Le motif est
              // volontairement strict : « motion » apparaît aussi dans
              // `@emotion`, qui n'a rien à voir.
              if (/node_modules[/\\](motion|motion-dom|motion-utils|framer-motion)[/\\]/.test(id)) {
                return 'motion';
              }
              return 'vendor';
            }
            // (15/09) Le regroupement manuel « admin » a été retiré.
            // AdminDashboardPage est déjà chargée paresseusement
            // (lazy() dans src/lib/routeTable.tsx), mais forcer ces modules
            // dans un morceau nommé y attirait aussi le code partagé avec
            // l'entrée : le morceau devenait une dépendance statique et
            // Vite l'insérait en <link rel="modulepreload"> de index.html.
            // Résultat : 888 Ko (229 Ko compressés) téléchargés et analysés
            // sur la page d'accueil, téléphone compris, pour un écran
            // qu'aucun visiteur n'ouvre. Désormais Rollup découpe seul :
            // l'administration reste un morceau distinct, chargé à la demande.
          },
        },
      },
    },
    optimizeDeps: { include: ['react', 'react-dom'] },
  };
});
