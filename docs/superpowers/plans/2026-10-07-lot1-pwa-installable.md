# Lot 1 — Application installable et lien partageable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'application installable depuis un lien WhatsApp sur Android et iOS, et faire apparaître une vignette de partage, sans toucher à l'authentification.

**Architecture:** Toute la logique d'affichage du bandeau d'installation est concentrée dans **une fonction pure** (`installAdvice`) testable sans navigateur ; le composant React ne fait que lire le contexte et appliquer sa décision. Le service worker est écrit à la main, sans plugin de build, pour ne pas alourdir un arbre de dépendances déjà fragile.

**Tech Stack:** React 19, Vite 8, TypeScript, vitest (ajouté par ce plan), service worker natif, manifeste W3C.

**Spec:** `docs/superpowers/specs/2026-10-07-auth-multi-tenant-pwa-design.md` (§9 Installation et parcours WhatsApp, §15 lot 1)

## Global Constraints

- Langue de toute l'interface et des commentaires de code : **français**.
- **Aucune dépendance de production ajoutée.** Seul `vitest` entre, en devDependency.
- `npm install` doit continuer de fonctionner tel quel — `.npmrc` porte `legacy-peer-deps=true`.
- Couleur de thème : `#4f46e5` (identique à `Company.primaryColor`).
- URL de production : `https://facturte-digitale.vercel.app`.
- Les métas Open Graph exigent des **URL absolues** : WhatsApp ignore les chemins relatifs.
- Le service worker ne met **jamais** en cache `/api/*` ni aucune origine externe.
- `npx tsc --noEmit` doit passer sans erreur à chaque commit.

## Review Focus

Classes d'entrées que la spec implique mais qu'aucune tâche n'exerce spontanément, de la plus probable à la moins probable. Chacune reçoit son test dans la tâche propriétaire.

1. **User-agent vide ou inconnu** (robot, navigateur exotique) — ne doit ni planter ni afficher d'instructions absurdes : le bandeau reste masqué. → Tâche 2.
2. **iPhone à l'intérieur de WhatsApp** — doit afficher « ouvrir dans Safari », *pas* les instructions d'ajout à l'écran d'accueil, qui sont inopérantes dans une vue embarquée. → Tâche 2.
3. **Application déjà installée** — aucun bandeau, même lorsque l'utilisateur rouvre le lien depuis WhatsApp. La détection du mode autonome prime sur tout le reste. → Tâche 2.
4. **Version périmée servie après déploiement** — une navigation doit toujours tenter le réseau avant de servir la coquille en cache. → Tâche 5.
5. **Fichiers du manifeste avalés par la réécriture SPA** — `vercel.json` réécrit tout ce qui n'est pas `/api/` vers `index.html` ; `/manifest.webmanifest` et `/sw.js` doivent malgré tout être servis tels quels. → Tâche 7.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `vitest.config.ts` | Configuration du lanceur de tests (créé) |
| `src/utils/platform.ts` | Fonctions **pures** de détection de contexte et décision d'affichage (créé) |
| `tests/platform.test.ts` | Tests de la décision d'installation (créé) |
| `public/manifest.webmanifest` | Manifeste W3C (créé) |
| `public/sw.js` | Service worker, stratégies de cache (créé) |
| `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `og-image.png` | Icônes et vignette de partage (créés) |
| `scripts/brand-assets.html` | Gabarit de rendu des images, pour regénération (créé) |
| `src/components/InstallPrompt.tsx` | Bandeau d'installation, trois variantes d'affichage (créé) |
| `index.html` | Liens manifeste, métas Apple et Open Graph (modifié) |
| `src/main.tsx` | Enregistrement du service worker en production (modifié) |
| `src/App.tsx` | Montage du bandeau (modifié) |
| `package.json` | devDependency `vitest`, scripts `test` (modifié) |

---

### Task 1: Outillage de test

Sans lanceur, aucune des tâches suivantes ne peut être vérifiée. Cette tâche ne livre rien de visible mais conditionne tout le reste.

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: rien.
- Produces: la commande `npm test` exécute tous les fichiers `tests/**/*.test.ts`.

- [ ] **Step 1 : Écrire le test de fumée**

```ts
// tests/smoke.test.ts
import { describe, expect, it } from 'vitest';

describe('outillage de test', () => {
  it('exécute les assertions', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2 : Lancer le test et constater l'échec**

Run: `npm test`
Expected: ÉCHEC — `npm error Missing script: "test"`.

- [ ] **Step 3 : Installer vitest et déclarer la configuration**

```bash
npm install -D vitest
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

Dans `package.json`, ajouter aux `scripts` :

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4 : Lancer le test et constater le succès**

Run: `npm test`
Expected: SUCCÈS — `1 passed`.

- [ ] **Step 5 : Vérifier que le typage reste sain**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 6 : Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "test: installe vitest comme lanceur de tests"
```

> Note : `package-lock.json` est ignoré par `.gitignore`. La commande `git add` ci-dessus l'ignorera silencieusement — c'est voulu, le projet suit `bun.lock`.

---

### Task 2: Décision d'affichage du bandeau

Toute l'intelligence du parcours d'installation tient ici, en fonctions pures. Le composant React de la tâche 6 n'aura plus qu'à obéir.

**Files:**
- Create: `src/utils/platform.ts`
- Create: `tests/platform.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type InstallAdvice = 'hidden' | 'prompt' | 'ios-instructions' | 'open-in-browser'`
  - `isInAppBrowser(ua: string): boolean`
  - `isIos(ua: string): boolean`
  - `isStandalone(probe: StandaloneProbe): boolean`
  - `interface StandaloneProbe { navigatorStandalone?: boolean; matchMedia?: (q: string) => { matches: boolean } }`
  - `installAdvice(ctx: { ua: string; standalone: boolean; promptAvailable: boolean }): InstallAdvice`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// tests/platform.test.ts
import { describe, expect, it } from 'vitest';
import {
  installAdvice,
  isInAppBrowser,
  isIos,
  isStandalone,
} from '../src/utils/platform';

const UA = {
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 WhatsApp/2.23',
  whatsappIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.23',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
};

describe('isInAppBrowser', () => {
  it('reconnaît WhatsApp sur Android', () => {
    expect(isInAppBrowser(UA.whatsappAndroid)).toBe(true);
  });

  it('reconnaît WhatsApp sur iPhone', () => {
    expect(isInAppBrowser(UA.whatsappIphone)).toBe(true);
  });

  it('ne signale pas Chrome Android', () => {
    expect(isInAppBrowser(UA.chromeAndroid)).toBe(false);
  });

  it('ne signale pas Safari iOS', () => {
    expect(isInAppBrowser(UA.safariIphone)).toBe(false);
  });

  it('tolère un user-agent vide', () => {
    expect(isInAppBrowser('')).toBe(false);
  });
});

describe('isIos', () => {
  it('reconnaît un iPhone', () => {
    expect(isIos(UA.safariIphone)).toBe(true);
  });

  it('ne reconnaît pas Android', () => {
    expect(isIos(UA.chromeAndroid)).toBe(false);
  });
});

describe('isStandalone', () => {
  it('détecte le mode autonome iOS', () => {
    expect(isStandalone({ navigatorStandalone: true })).toBe(true);
  });

  it('détecte le mode autonome via display-mode', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: true }) })).toBe(true);
  });

  it('renvoie faux dans un onglet ordinaire', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: false }) })).toBe(false);
  });

  it('renvoie faux quand aucune sonde n’est disponible', () => {
    expect(isStandalone({})).toBe(false);
  });
});

describe('installAdvice', () => {
  it('masque tout quand l’application est déjà installée', () => {
    expect(
      installAdvice({ ua: UA.chromeAndroid, standalone: true, promptAvailable: true })
    ).toBe('hidden');
  });

  it('masque tout même si l’app installée est rouverte depuis WhatsApp', () => {
    expect(
      installAdvice({ ua: UA.whatsappAndroid, standalone: true, promptAvailable: false })
    ).toBe('hidden');
  });

  it('demande d’ouvrir dans le navigateur depuis WhatsApp Android', () => {
    expect(
      installAdvice({ ua: UA.whatsappAndroid, standalone: false, promptAvailable: false })
    ).toBe('open-in-browser');
  });

  it('demande d’ouvrir dans le navigateur depuis WhatsApp iPhone, pas les instructions iOS', () => {
    expect(
      installAdvice({ ua: UA.whatsappIphone, standalone: false, promptAvailable: false })
    ).toBe('open-in-browser');
  });

  it('propose l’installation native quand le navigateur le permet', () => {
    expect(
      installAdvice({ ua: UA.chromeAndroid, standalone: false, promptAvailable: true })
    ).toBe('prompt');
  });

  it('affiche les instructions sur Safari iOS', () => {
    expect(
      installAdvice({ ua: UA.safariIphone, standalone: false, promptAvailable: false })
    ).toBe('ios-instructions');
  });

  it('reste masqué sur un navigateur de bureau sans invite disponible', () => {
    expect(
      installAdvice({ ua: UA.chromeDesktop, standalone: false, promptAvailable: false })
    ).toBe('hidden');
  });

  it('reste masqué pour un user-agent vide', () => {
    expect(installAdvice({ ua: '', standalone: false, promptAvailable: false })).toBe(
      'hidden'
    );
  });
});
```

- [ ] **Step 2 : Lancer les tests et constater l'échec**

Run: `npm test`
Expected: ÉCHEC — `Failed to resolve import "../src/utils/platform"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
// src/utils/platform.ts

/**
 * Détection de contexte navigateur et décision d'affichage du bandeau
 * d'installation.
 *
 * Tout est pur et sans effet de bord : l'appelant fournit le user-agent et
 * l'état observé. C'est ce qui rend ce parcours testable sans navigateur.
 */

/** Navigateurs intégrés à une application, incapables d'installer une PWA. */
const NAVIGATEURS_INTEGRES = [
  /WhatsApp/i,
  /FBAN|FBAV|FB_IAB/i, // Facebook, Messenger
  /Instagram/i,
  /Line\//i,
  /MicroMessenger/i, // WeChat
  /TikTok/i,
];

/**
 * `true` si la page tourne dans la vue embarquée d'une application.
 * Couvre aussi la WebView Android générique, repérable au jeton `; wv)`.
 */
export function isInAppBrowser(ua: string): boolean {
  if (!ua) return false;
  if (NAVIGATEURS_INTEGRES.some((motif) => motif.test(ua))) return true;
  return /;\s*wv\)/.test(ua);
}

/** `true` sur iPhone, iPad ou iPod. */
export function isIos(ua: string): boolean {
  return /iPad|iPhone|iPod/.test(ua);
}

export interface StandaloneProbe {
  /** `navigator.standalone`, propre à Safari iOS. */
  navigatorStandalone?: boolean;
  /** `window.matchMedia`, restreint à ce dont on a besoin. */
  matchMedia?: (query: string) => { matches: boolean };
}

/** `true` si l'application est lancée depuis l'écran d'accueil. */
export function isStandalone(probe: StandaloneProbe): boolean {
  if (probe.navigatorStandalone === true) return true;
  return probe.matchMedia?.('(display-mode: standalone)').matches === true;
}

export type InstallAdvice =
  /** Ne rien afficher. */
  | 'hidden'
  /** Un bouton déclenchant l'invite native du navigateur. */
  | 'prompt'
  /** La marche à suivre « Partager → Sur l'écran d'accueil ». */
  | 'ios-instructions'
  /** Inviter à rouvrir le lien dans un vrai navigateur. */
  | 'open-in-browser';

/**
 * Décide ce qu'il faut montrer. L'ordre des règles compte :
 *
 * 1. Déjà installée : plus rien à proposer, quel que soit le contexte.
 * 2. Vue embarquée : l'installation y est impossible, il faut en sortir —
 *    y compris sur iPhone, où les instructions d'ajout à l'écran d'accueil
 *    seraient inopérantes.
 * 3. Invite native disponible : c'est le chemin le plus court.
 * 4. iOS : aucune invite programmable, seules des instructions.
 * 5. Sinon : se taire plutôt que d'afficher un message inutile.
 */
export function installAdvice(ctx: {
  ua: string;
  standalone: boolean;
  promptAvailable: boolean;
}): InstallAdvice {
  if (ctx.standalone) return 'hidden';
  if (isInAppBrowser(ctx.ua)) return 'open-in-browser';
  if (ctx.promptAvailable) return 'prompt';
  if (isIos(ctx.ua)) return 'ios-instructions';
  return 'hidden';
}
```

- [ ] **Step 4 : Lancer les tests et constater le succès**

Run: `npm test`
Expected: SUCCÈS — 19 tests passent.

- [ ] **Step 5 : Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 6 : Commit**

```bash
git add src/utils/platform.ts tests/platform.test.ts
git commit -m "feat: décision d'affichage du bandeau d'installation"
```

---

### Task 3: Icônes et vignette de partage

Les images sont des actifs statiques : elles sont générées une fois puis commitées. Aucun outil de build n'est ajouté pour ça.

**Files:**
- Create: `scripts/brand-assets.html`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/apple-touch-icon.png`, `public/og-image.png`

**Interfaces:**
- Consumes: rien.
- Produces: cinq fichiers PNG dans `public/`, recopiés tels quels dans `dist/` par Vite.

- [ ] **Step 1 : Créer le gabarit de rendu**

```html
<!-- scripts/brand-assets.html -->
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: transparent; font-family: system-ui, -apple-system, sans-serif; }

      .tuile {
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #fff;
        font-weight: 800;
        letter-spacing: -0.04em;
      }
      /* Zone de sécurité pour les icônes « maskable » : le contenu utile
         doit tenir dans le cercle central de 80 % du côté. */
      .tuile.maskable .glyphe { transform: scale(0.72); }

      .banniere {
        width: 1200px; height: 630px;
        display: flex; flex-direction: column; justify-content: center;
        gap: 28px; padding: 90px;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #2e1065 100%);
        color: #fff;
      }
      .banniere h1 { font-size: 86px; font-weight: 800; letter-spacing: -0.03em; }
      .banniere p  { font-size: 38px; font-weight: 500; opacity: 0.92; line-height: 1.3; }
      .banniere .pastille {
        align-self: flex-start; font-size: 26px; font-weight: 600;
        padding: 12px 26px; border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
      }
    </style>
  </head>
  <body>
    <!-- Chaque bloc est capturé séparément par son identifiant. -->
    <div class="tuile" id="icone" style="width: 512px; height: 512px; font-size: 230px">
      <span class="glyphe">FX</span>
    </div>

    <div class="tuile maskable" id="icone-maskable" style="width: 512px; height: 512px; font-size: 230px">
      <span class="glyphe">FX</span>
    </div>

    <div class="banniere" id="banniere">
      <span class="pastille">Maroc — ICE, IF, RC, TVA</span>
      <h1>FacturX Pro</h1>
      <p>Devis, factures et bons de livraison conformes,<br />depuis votre téléphone.</p>
    </div>
  </body>
</html>
```

- [ ] **Step 2 : Capturer les images**

Ouvrir `scripts/brand-assets.html` dans un navigateur piloté (outils Playwright) et capturer chaque bloc par son identifiant :

| Capture | Élément | Dimensions | Fichier |
|---|---|---|---|
| Icône standard | `#icone` | 512 × 512 | `public/icon-512.png` |
| Icône standard | `#icone` | 192 × 192 (redimensionné) | `public/icon-192.png` |
| Icône masquable | `#icone-maskable` | 512 × 512 | `public/icon-512-maskable.png` |
| Icône Apple | `#icone` | 180 × 180 (redimensionné) | `public/apple-touch-icon.png` |
| Vignette de partage | `#banniere` | 1200 × 630 | `public/og-image.png` |

- [ ] **Step 3 : Vérifier les fichiers produits**

```bash
ls -l public/*.png
```

Expected: cinq fichiers, chacun non vide. `og-image.png` doit rester **sous 300 Ko** — au-delà, WhatsApp renonce parfois à afficher la vignette.

```bash
du -k public/og-image.png
```

- [ ] **Step 4 : Commit**

```bash
git add scripts/brand-assets.html public/icon-192.png public/icon-512.png \
        public/icon-512-maskable.png public/apple-touch-icon.png public/og-image.png
git commit -m "feat: icônes de l'application et vignette de partage"
```

---

### Task 4: Manifeste et métas de partage

**Files:**
- Create: `public/manifest.webmanifest`
- Modify: `index.html`

**Interfaces:**
- Consumes: les PNG de la tâche 3.
- Produces: `/manifest.webmanifest` servi à la racine ; métas Open Graph en URL absolues.

- [ ] **Step 1 : Écrire le manifeste**

```json
{
  "name": "FacturX Pro — Gestion Commerciale & Facturation",
  "short_name": "FacturX",
  "description": "Devis, factures, bons de livraison et avoirs conformes à la réglementation marocaine.",
  "lang": "fr",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#f8fafc",
  "theme_color": "#4f46e5",
  "categories": ["business", "finance", "productivity"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2 : Compléter `index.html`**

Dans `<head>`, juste après la balise `<meta name="description" …>`, insérer :

```html
    <meta name="theme-color" content="#4f46e5" />
    <link rel="manifest" href="/manifest.webmanifest" />

    <!-- iOS : pas d'invite d'installation, mais ces métas conditionnent
         l'apparence une fois ajouté à l'écran d'accueil. -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="FacturX" />
```

Puis, à la suite des balises `og:` existantes :

```html
    <meta property="og:url" content="https://facturte-digitale.vercel.app/" />
    <meta property="og:site_name" content="FacturX Pro" />
    <meta property="og:locale" content="fr_MA" />
    <meta property="og:image" content="https://facturte-digitale.vercel.app/og-image.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="FacturX Pro — devis, factures et bons de livraison conformes" />
    <meta name="twitter:image" content="https://facturte-digitale.vercel.app/og-image.png" />
```

- [ ] **Step 3 : Vérifier la validité du manifeste et la présence des métas**

```bash
python3 -I -c "import json; json.load(open('public/manifest.webmanifest')); print('manifeste valide')"
grep -c "og:image\|rel=\"manifest\"" index.html
```

Expected: `manifeste valide`, et un compte d'au moins 4.

- [ ] **Step 4 : Vérifier que le build recopie les actifs**

Run: `npx vite build && ls dist/manifest.webmanifest dist/og-image.png`
Expected: les deux fichiers existent dans `dist/`.

- [ ] **Step 5 : Commit**

```bash
git add public/manifest.webmanifest index.html
git commit -m "feat: manifeste PWA et métas de partage WhatsApp"
```

---

### Task 5: Service worker

**Files:**
- Create: `public/sw.js`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: rien.
- Produces: `/sw.js` enregistré au chargement, en production seulement.

- [ ] **Step 1 : Écrire le service worker**

```js
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
```

- [ ] **Step 2 : Enregistrer le service worker**

À la fin de `src/main.tsx`, ajouter :

```ts
// Service worker : production uniquement. En développement, le middleware Vite
// sert les modules à la volée et un cache intermédiaire ne ferait que nuire.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erreur) => {
      console.warn('Enregistrement du service worker impossible', erreur);
    });
  });
}
```

- [ ] **Step 3 : Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune sortie. (`public/sw.js` n'est pas typé : c'est un fichier servi tel quel, hors du graphe de compilation.)

- [ ] **Step 4 : Vérifier le comportement « réseau d'abord » à la lecture**

Relire `public/sw.js` et confirmer les trois points de la Review Focus n° 4 :
- la branche `requete.mode === 'navigate'` appelle `fetch` **avant** `caches.match` ;
- `reponse.clone()` est appelé **de façon synchrone**, avant tout `await` — sinon le corps est déjà consommé et la mise en cache échoue silencieusement ;
- `/api/` et les origines externes sortent de la fonction sans `respondWith`.

- [ ] **Step 5 : Commit**

```bash
git add public/sw.js src/main.tsx
git commit -m "feat: service worker, réseau d'abord sur la navigation"
```

---

### Task 6: Bandeau d'installation

**Files:**
- Create: `src/components/InstallPrompt.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `installAdvice`, `isStandalone`, `InstallAdvice` de `src/utils/platform.ts` (tâche 2).
- Produces: le composant `<InstallPrompt />`, sans props.

- [ ] **Step 1 : Écrire le composant**

```tsx
// src/components/InstallPrompt.tsx
import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { installAdvice, isStandalone, type InstallAdvice } from '../utils/platform';

/** Événement non standard, absent des types du DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLE_REFUS = 'facturx:install-refuse';

export const InstallPrompt: React.FC = () => {
  const [invite, setInvite] = useState<BeforeInstallPromptEvent | null>(null);
  const [refuse, setRefuse] = useState<boolean>(
    () => localStorage.getItem(CLE_REFUS) === '1'
  );
  const [lienCopie, setLienCopie] = useState(false);

  useEffect(() => {
    const surInvite = (event: Event) => {
      // Empêche l'invite spontanée du navigateur : on la déclenche nous-mêmes,
      // au moment où l'utilisateur appuie sur notre bouton.
      event.preventDefault();
      setInvite(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', surInvite);
    return () => window.removeEventListener('beforeinstallprompt', surInvite);
  }, []);

  const conseil: InstallAdvice = installAdvice({
    ua: navigator.userAgent,
    standalone: isStandalone({
      navigatorStandalone: (navigator as { standalone?: boolean }).standalone,
      matchMedia: (q) => window.matchMedia(q),
    }),
    promptAvailable: invite !== null,
  });

  if (conseil === 'hidden' || refuse) return null;

  const masquer = () => {
    localStorage.setItem(CLE_REFUS, '1');
    setRefuse(true);
  };

  const installer = async () => {
    if (!invite) return;
    await invite.prompt();
    const { outcome } = await invite.userChoice;
    if (outcome === 'accepted') setInvite(null);
  };

  const copierLien = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLienCopie(true);
    setTimeout(() => setLienCopie(false), 2500);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 print:hidden">
      <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-indigo-600 p-4 text-white shadow-2xl">
        <div className="min-w-0 flex-1">
          {conseil === 'prompt' && (
            <>
              <p className="font-semibold">Installer FacturX sur votre appareil</p>
              <p className="mt-0.5 text-sm text-indigo-100">
                Accès direct depuis l’écran d’accueil, sans barre d’adresse.
              </p>
              <button
                onClick={installer}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700"
              >
                <Download size={16} /> Installer l’application
              </button>
            </>
          )}

          {conseil === 'open-in-browser' && (
            <>
              <p className="font-semibold">Ouvrez ce lien dans votre navigateur</p>
              <p className="mt-0.5 text-sm text-indigo-100">
                L’installation n’est pas possible depuis WhatsApp. Touchez le menu
                <span className="font-semibold"> ⋮ </span>
                puis « Ouvrir dans le navigateur », ou copiez le lien et collez-le dans Chrome.
              </p>
              <button
                onClick={copierLien}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700"
              >
                {lienCopie ? 'Lien copié ✓' : 'Copier le lien'}
              </button>
            </>
          )}

          {conseil === 'ios-instructions' && (
            <>
              <p className="font-semibold">Ajouter FacturX à votre écran d’accueil</p>
              <ol className="mt-1 space-y-1 text-sm text-indigo-100">
                <li className="flex items-center gap-1.5">
                  1. Touchez <Share size={14} className="inline" /> en bas de l’écran
                </li>
                <li>2. Faites défiler, puis « Sur l’écran d’accueil »</li>
                <li>3. Confirmez par « Ajouter »</li>
              </ol>
            </>
          )}
        </div>

        <button
          onClick={masquer}
          aria-label="Masquer ce message"
          className="rounded-lg p-1 text-indigo-200 hover:bg-indigo-500 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2 : Monter le composant**

Dans `src/App.tsx`, ajouter l'import en tête :

```tsx
import { InstallPrompt } from './components/InstallPrompt';
```

Puis, dans le `return` du composant `App`, juste avant la fermeture du `<div>` racine :

```tsx
      <InstallPrompt />
```

- [ ] **Step 3 : Vérifier le typage et les tests**

Run: `npx tsc --noEmit && npm test`
Expected: aucune erreur de typage, tous les tests passent.

- [ ] **Step 4 : Vérifier à l'œil en local**

Run: `npm run dev` puis ouvrir `http://localhost:3000`
Expected: sur un navigateur de bureau sans invite disponible, **aucun bandeau** ne s'affiche (conseil `hidden`). C'est le comportement attendu, pas une panne.

Pour voir la variante WhatsApp, forcer le user-agent dans les outils de développement du navigateur en y ajoutant `WhatsApp/2.23`, puis recharger : le bandeau « Ouvrez ce lien dans votre navigateur » doit apparaître.

- [ ] **Step 5 : Commit**

```bash
git add src/components/InstallPrompt.tsx src/App.tsx
git commit -m "feat: bandeau d'installation adapté au contexte (WhatsApp, iOS, Android)"
```

---

### Task 7: Déploiement et vérification de bout en bout

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: une production installable, dont le lien affiche une vignette.

- [ ] **Step 1 : Vérifier que la réécriture SPA n'avale pas les fichiers PWA**

C'est le risque n° 5 de la Review Focus : `vercel.json` réécrit `/((?!api/).*)` vers `/index.html`. Sur Vercel, les `rewrites` ne s'appliquent **qu'après** échec de la recherche d'un fichier statique — mais il faut le constater, pas le supposer.

Déployer en préproduction :

```bash
npx vercel@latest deploy --scope easydigia --yes
```

Puis, sur l'URL de préproduction renvoyée :

```bash
npx vercel@latest curl "<url-preprod>/manifest.webmanifest" -i --scope easydigia
npx vercel@latest curl "<url-preprod>/sw.js" -i --scope easydigia
```

Expected: HTTP 200 avec le **contenu des fichiers**, et non le HTML de `index.html`.
Si l'un des deux renvoie du HTML, ajouter une exception explicite dans la réécriture de `vercel.json` :
`/((?!api/|sw\.js|manifest\.webmanifest|.*\.png).*)`.

- [ ] **Step 2 : Promouvoir en production**

```bash
npx vercel@latest deploy --prod --scope easydigia --yes
```

- [ ] **Step 3 : Vérifier les actifs en production**

```bash
U=https://facturte-digitale.vercel.app
curl -s -o /dev/null -w "manifeste  %{http_code} %{content_type}\n" "$U/manifest.webmanifest"
curl -s -o /dev/null -w "sw.js      %{http_code} %{content_type}\n" "$U/sw.js"
curl -s -o /dev/null -w "og-image   %{http_code} %{content_type} %{size_download}\n" "$U/og-image.png"
curl -s -o /dev/null -w "icone 512  %{http_code}\n" "$U/icon-512.png"
curl -s "$U/" | grep -o 'property="og:image" content="[^"]*"'
```

Expected: quatre fois HTTP 200, `og-image.png` de type `image/png`, et l'URL de `og:image` **absolue** (commençant par `https://`) — une URL relative est le motif n° 5 d'absence de vignette WhatsApp.

- [ ] **Step 4 : Vérifier l'installabilité dans un navigateur piloté**

Ouvrir l'URL de production avec les outils de navigateur et contrôler :
- `navigator.serviceWorker.getRegistrations()` renvoie une entrée ;
- aucune erreur de console liée au manifeste ;
- le manifeste est reconnu (onglet Application du navigateur).

- [ ] **Step 5 : Documenter**

Ajouter à `README.md`, après la section « Déploiement — Vercel » :

```markdown
## Application installable (PWA)

L'application s'installe depuis le navigateur et se lance ensuite depuis l'écran
d'accueil, sans barre d'adresse.

| Fichier | Rôle |
|---|---|
| `public/manifest.webmanifest` | Nom, icônes, couleurs, mode d'affichage |
| `public/sw.js` | Service worker : réseau d'abord sur la navigation, cache d'abord sur `/assets/*`, jamais de cache sur `/api/*` |
| `src/utils/platform.ts` | Décision **pure** d'affichage du bandeau — couverte par `tests/platform.test.ts` |
| `src/components/InstallPrompt.tsx` | Les trois variantes du bandeau |
| `scripts/brand-assets.html` | Gabarit de regénération des icônes et de la vignette |

### Le parcours depuis WhatsApp

Le navigateur intégré de WhatsApp **ne peut pas installer de PWA**. L'application
le détecte et invite à rouvrir le lien dans Chrome ou Safari. Sur iPhone, aucune
invite n'est programmable : la marche à suivre *Partager → Sur l'écran d'accueil*
est affichée à la place.

### Regénérer les images

Ouvrir `scripts/brand-assets.html` dans un navigateur et capturer les blocs
`#icone`, `#icone-maskable` et `#banniere` aux tailles indiquées dans le plan
`docs/superpowers/plans/2026-10-07-lot1-pwa-installable.md` (tâche 3).
Garder `og-image.png` sous 300 Ko.

### Premier lancement hors ligne

Il exige une visite en ligne préalable : le service worker ne précache pas les
fichiers hachés par Vite. Compromis assumé pour ne pas ajouter de plugin de build.
```

- [ ] **Step 6 : Commit**

```bash
git add README.md vercel.json
git commit -m "docs: documente l'application installable et le parcours WhatsApp"
git push origin main
```

- [ ] **Step 7 : À votre charge — vérification sur appareil réel**

Ces deux contrôles ne peuvent pas être automatisés et sortent de ce que je peux tester :

1. S'envoyer `https://facturte-digitale.vercel.app` sur WhatsApp et constater que la **vignette s'affiche** dans la conversation.
2. Toucher le lien depuis WhatsApp sur un **Android** puis sur un **iPhone**, et suivre le parcours jusqu'à l'icône sur l'écran d'accueil.

> WhatsApp met en cache les aperçus de lien. Si aucune vignette n'apparaît alors que
> l'étape 3 est verte, partager l'URL avec un paramètre factice
> (`?v=2`) pour forcer une nouvelle lecture.
