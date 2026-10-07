# Mémoire projet — Factures Digitale

## 2026-10-07 — Branchement du stockage Supabase

Demande : ajouter l'URL + les clés Supabase pour stocker les données.

Constat initial : projet Supabase `<project-ref>` joignable et clés
valides (PostgREST authentifie), mais **base entièrement vide** — aucune table.
`node_modules` non installé, et le MCP Supabase refuse l'accès à ce projet
(« You do not have permission »), donc impossible d'appliquer le DDL par outil.

Réalisé :
- `.env` créé (URL + anon + service_role) ; `.env.example` documenté.
- `database/supabase_schema.sql` : 5 tables JSONB `fx_*` + index + triggers
  `updated_at` + RLS activé sans policy publique + `revoke` sur anon/authenticated.
- `supabase.ts` : couche PostgREST via `fetch` natif (list / upsert / remove /
  replaceAll / getCompany / saveCompany / healthCheck).
- `server.ts` : objet `store` unifié derrière les routes `/api/*` existantes —
  Supabase quand disponible, repli transparent sur `store.json` sinon ;
  `/api/health` expose `storage` et `supabaseConfigured` ; nouvelle route
  `/api/database/supabase-schema` ; `healthCheck` au démarrage.
- README : section « Stockage des données — Supabase ».

Vérifié : `npx tsc --noEmit` passe ; serveur démarré sur deux ports,
`/api/health` et `/api/customers` répondent, diagnostic de démarrage correct.

Reste à faire côté utilisateur : exécuter `database/supabase_schema.sql` dans le
SQL Editor Supabase, puis redémarrer — le serveur pousse alors automatiquement
les données locales existantes vers les tables vides.

## 2026-10-07 — Mise en ligne GitHub + Vercel

Tables Supabase confirmees presentes (le SQL a ete execute cote utilisateur) :
ecriture verifiee de bout en bout, en local puis depuis la fonction serverless.

GitHub : depot `easydigia22/Facturte_Digitale` (public), `git init` + branche
`main`, 2 commits puis 2 de plus pour Vercel. Scan anti-secrets avant chaque
push (aucun JWT indexe) ; la reference du projet Supabase a ete anonymisee
dans `.wolf/` avant publication.

Vercel : scope `easydigia`, projet `facturte-digitale`.
- Le connecteur MCP Vercel n'a pas acces au scope (403) -> passage par le CLI.
- Decoupage `app.ts` (Express partage) / `server.ts` (lanceur local) /
  `api/index.ts` (fonction serverless) + `vercel.json`.
- 3 variables Supabase definies en Sensitive sur Production et Preview.
- Premier deploiement en echec : `npm install exited with 1` (meme ERESOLVE
  qu'en local) -> `.npmrc` avec `legacy-peer-deps=true`.
- Preview validee (health, GET, POST ecrivant reellement dans Supabase, SPA),
  puis promotion en production.

Production : https://facturte-digitale.vercel.app
`/api/health` renvoie `storage: supabase`, `runtime: vercel-serverless`.

Reste : `GEMINI_API_KEY` n'est pas definie sur Vercel, les fonctions IA sont
donc inactives en production (`aiReady: false`).
