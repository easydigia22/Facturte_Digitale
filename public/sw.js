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
      // Purge des actifs hachés à chaque activation.
      //
      // Le nom du cache est constant, donc la boucle ci-dessus ne supprime
      // jamais rien : chaque déploiement ajoutait un jeu complet de bundles
      // (xlsx, docx, @google/genai : plusieurs mégaoctets) sans qu'aucun ne
      // soit retiré. Au bout de quelques déploiements, le quota de l'origine
      // est atteint sur un téléphone d'entrée de gamme et le navigateur évince
      // *tout* le stockage de l'origine, coquille comprise.
      //
      // On repart donc d'un cache d'actifs vide : le coût est un re-téléchargement
      // au premier lancement après mise à jour, ce que le réseau d'abord sur la
      // navigation impose déjà. La coquille, elle, est conservée.
      .then(() =>
        caches.open(CACHE).then((cache) =>
          cache.keys().then((requetes) =>
            Promise.all(
              requetes
                .filter((requete) => new URL(requete.url).pathname.startsWith('/assets/'))
                .map((requete) => cache.delete(requete))
            )
          )
        )
      )
      .catch(() => {})
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
          // Ne remplacer la coquille que par une réponse saine.
          //
          // Sans ce filtre, un 500 de Vercel pendant un mauvais déploiement,
          // une page 401 de protection de déploiement ou une page de
          // maintenance écrasait la coquille connue comme bonne : toute
          // navigation hors ligne servait ensuite cette page d'erreur comme
          // application, sans que la personne puisse comprendre pourquoi.
          //
          // `type === 'basic'` écarte aussi les réponses `opaqueredirect` :
          // une requête de navigation porte `redirect: 'manual'`, donc une
          // réponse de redirection revient opaque et `cache.put` la rejette.
          if (reponse.ok && reponse.type === 'basic') {
            const copie = reponse.clone(); // cloner AVANT tout await
            caches
              .open(CACHE)
              .then((cache) => cache.put(COQUILLE, copie))
              // Quota dépassé, réponse inattendue : un rejet non capturé ici
              // deviendrait une « unhandled rejection » dans le worker.
              .catch(() => {});
          }
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
              caches
                .open(CACHE)
                .then((cache) => cache.put(requete, copie))
                .catch(() => {}); // quota, réponses opaques
            }
            return reponse;
          })
      )
    );
  }
});
