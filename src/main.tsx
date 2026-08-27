import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installApiFailureInterceptor} from './lib/apiDiagnostics';

// Installe le diagnostic d'erreur API avant le premier rendu : un déploiement
// sans backend doit être nommé comme tel, pas affiché comme un NOT_FOUND brut.
installApiFailureInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
