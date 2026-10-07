<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/97087e0c-d7e7-412b-8d97-86eda8dc58f6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Stockage des données — Supabase

Les données (entreprise, clients, fournisseurs, produits, documents) sont
persistées dans Supabase. Le serveur Express est le **seul** à parler à
Supabase : la clé `service_role` ne quitte jamais le backend.

### Mise en route (une seule fois)

1. Renseigner `.env` à partir de `.env.example` :
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (Dashboard Supabase → Project Settings → API).
2. Créer les tables : ouvrir **Supabase Dashboard → SQL Editor → New query**,
   coller le contenu de [`database/supabase_schema.sql`](database/supabase_schema.sql)
   et cliquer **Run**.
3. Démarrer : `npm run dev`

Au démarrage, le serveur affiche l'état du stockage :

```
[supabase] stockage distant actif - connecté à https://xxxx.supabase.co
```

### Repli automatique

Si Supabase n'est pas configuré, que les tables manquent, ou en cas de panne
réseau, le serveur bascule sur `database/store.json` et l'application reste
utilisable. Chaque écriture est **toujours** appliquée localement puis propagée
à Supabase, jamais l'inverse — aucune donnée n'est perdue en cas de coupure.

L'état courant est consultable sur `GET /api/health` :

```json
{ "storage": "supabase", "supabaseConfigured": true }
```

### Modèle de données

Chaque entité est stockée en JSONB (`{ id, data }`), à l'identique des types
TypeScript de `src/types/index.ts` — aucune transformation entre le front, le
serveur et la base.

| Table           | Contenu                                           |
|-----------------|---------------------------------------------------|
| `fx_company`    | Entreprise émettrice (ligne unique `singleton`)   |
| `fx_customers`  | Clients                                           |
| `fx_suppliers`  | Fournisseurs                                      |
| `fx_products`   | Catalogue produits / services                     |
| `fx_documents`  | Devis, factures, BL, avoirs (lignes incluses)     |

RLS est activé sans aucune policy publique : la clé `anon` ne donne accès à
rien. Seul `service_role`, côté serveur, lit et écrit.

> `database/postgres_schema.sql` reste disponible comme schéma relationnel
> de référence (export / BI). Il n'est pas utilisé par l'application.

## Déploiement — Vercel

Production : **https://facturte-digitale.vercel.app**

Vercel ne fait pas tourner de serveur Express persistant. Le projet est donc
découpé en deux :

| Point d'entrée | Rôle |
|---|---|
| `app.ts` | Application Express (routes `/api/*`) — **partagée** |
| `server.ts` | Serveur Node local : middleware Vite en dev, `dist/` en prod self-hosted |
| `api/index.ts` | Fonction serverless Vercel — exporte `app` tel quel |

`vercel.json` construit le front avec `vite build` vers `dist/`, réécrit
`/api/*` vers la fonction et tout le reste vers `index.html` (SPA).

### Variables d'environnement

À définir dans **Vercel → Settings → Environment Variables** (Production et
Preview), en type *Sensitive* :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` *(optionnel — les fonctions IA sont inactives sans elle)*

### Spécificités serverless

- **Pas de repli disque.** Le système de fichiers est en lecture seule et
  chaque invocation est isolée : les écritures `store.json` sont désactivées
  dès que `VERCEL` est défini. **Supabase est l'unique source de vérité en
  production** — le schéma doit donc être appliqué avant tout usage.
- **Pas de phase de démarrage.** La vérification Supabase est paresseuse
  (`ensureSupabaseReady`) et son résultat réutilisé tant que l'instance
  reste chaude.

`GET /api/health` indique le runtime effectif :

```json
{ "storage": "supabase", "runtime": "vercel-serverless" }
```

### Redéploiement

```bash
vercel deploy --prod --scope easydigia
```

> `.npmrc` fixe `legacy-peer-deps=true` : sans lui `npm install` échoue
> (conflit `vite@8` / `esbuild` embarqué par `tsx`), en local comme sur Vercel.
