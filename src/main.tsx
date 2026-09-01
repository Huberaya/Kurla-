import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installApiFailureInterceptor} from './lib/apiDiagnostics';
import {initAnalytics} from './lib/analytics';

// Charge les fournisseurs d'analytics UNIQUEMENT si un identifiant est
// configuré (VITE_GA_MEASUREMENT_ID / VITE_PLAUSIBLE_DOMAIN). Sans variable,
// aucun script tiers n'est téléchargé.
initAnalytics();

// Installe le diagnostic d'erreur API avant le premier rendu : un déploiement
// sans backend doit être nommé comme tel, pas affiché comme un NOT_FOUND brut.
installApiFailureInterceptor();

// CHANTIER 8.7 — application mobile installable. Le service worker n'est
// enregistré qu'en production : en développement il servirait un cache périmé
// à chaque changement de code. Son périmètre exclut /api/ : voir public/sw.js.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Une installation ratée n'est pas une panne : l'application continue de
      // fonctionner comme un site. Rien ne doit être promis pour autant.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
