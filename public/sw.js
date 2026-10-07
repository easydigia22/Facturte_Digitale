// public/sw.js
/**
 * Service worker de FacturX Pro.
 *
 * Écrit à la main, sans plugin de build : l'arbre de dépendances du projet est
 * fragile et un précache des fichiers hachés ne vaut pas une dépendance de plus.
 *
 * Conséquence assumée : le premier lancement hors ligne exige une visite en
 * ligne préalable, le temps que la coquille et les actifs entrent en cache.
 */
const CACHE = 'facturx-v1';
const COQUILLE = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(COQUILLE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);

  // Jamais de cache : API applicative et toute origine externe (Supabase,
  // polices Google). Une réponse d'API mise en cache serait un bogue de données.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation : réseau d'abord. Indispensable pour qu'un déploiement soit
  // pris en compte au lancement suivant plutôt que de servir une version périmée.
  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(COQUILLE, copie));
          return reponse;
        })
        .catch(() => caches.match(COQUILLE).then((hit) => hit || Response.error()))
    );
    return;
  }

  // Actifs aux noms hachés par Vite : immuables, donc cache d'abord.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(requete).then(
        (hit) =>
          hit ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE).then((cache) => cache.put(requete, copie));
            }
            return reponse;
          })
      )
    );
  }
});
