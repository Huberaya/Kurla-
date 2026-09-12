import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installApiFailureInterceptor} from './lib/apiDiagnostics';
import {initAnalytics} from './lib/analytics';
import {captureAttribution} from './lib/attribution';
import {captureReferralCode} from './lib/referralCapture';
import {initBrowserMonitoring} from './lib/browserMonitoring';

// Le diagnostic d'erreur API reste synchrone : un déploiement sans backend
// doit être nommé comme tel, pas affiché comme un NOT_FOUND brut.
installApiFailureInterceptor();
try { initBrowserMonitoring(); } catch { /* monitoring never blocks the app */ }

// Le reste (analytics, attribution, parrainage) est différé après le premier
// paint — 3 scripts tiers au démarrage = LCP pénalisé pour zéro valeur perçue.
const defer = (fn: () => void) => {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
};
defer(() => {
  // Charge les fournisseurs d'analytics UNIQUEMENT si un identifiant est configuré
  try { initAnalytics(); } catch {}
  try { captureAttribution(); } catch {}
  try { captureReferralCode(); } catch {}
});

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
