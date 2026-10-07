import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Service worker : production uniquement. En développement, le middleware Vite
// sert les modules à la volée et un cache intermédiaire ne ferait que nuire.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erreur) => {
      console.warn('Enregistrement du service worker impossible', erreur);
    });
  });
}
