# Cerebrum — Factures Digitale

## Préférences
- Langue de travail et de documentation : **français** (y compris les commentaires de code).
- Les secrets vont dans `.env` (déjà couvert par `.gitignore` via `.env*`), jamais en dur dans le code.

## Apprentissages
- **ESM + dotenv** : un module importé est évalué *avant* le corps du module
  importateur. Lire `process.env` au niveau racine d'un module importé par
  `server.ts` donne des valeurs vides car `dotenv.config()` n'a pas encore tourné.
  → lire l'environnement **paresseusement** (dans des fonctions).
- `tsconfig.json` utilise `moduleResolution: "bundler"` + `allowImportingTsExtensions`
  → les imports relatifs côté serveur s'écrivent `./fichier.ts`.
- Le conflit `vite@8` / `esbuild` de `tsx` est désormais résolu par `.npmrc` (`legacy-peer-deps=true`) : il cassait aussi le build Vercel, pas seulement l'install locale.
- **Vercel ne fait pas tourner de serveur Express persistant** : il faut exporter l'app depuis `api/index.ts` et servir le front statiquement depuis `dist/`.
- En serverless il n'y a **pas de phase de démarrage** : toute initialisation (sonde Supabase) doit être paresseuse et mémorisée, pas faite avant un `listen()`.
- Le système de fichiers Vercel est en **lecture seule** hors `/tmp` : garder tout repli disque derrière un garde `process.env.VERCEL`.
- Le connecteur MCP Vercel n'a **pas** les droits sur le scope `easydigia` (403) → utiliser le CLI `vercel --scope easydigia`.
- `vercel curl` avale les options curl si elles sont placées avant l'URL : mettre l'URL en premier, puis `-X POST`, `-d`, etc.
- Le MCP Supabase de cette session n'a **pas** les droits sur le projet
  `<project-ref>` → le DDL doit passer par le SQL Editor du dashboard.
- PostgREST exige un filtre sur tout `DELETE` → utiliser `?id=not.is.null` pour vider une table.

## Déploiement
- Dépôt : https://github.com/easydigia22/Facturte_Digitale (public, branche `main`).
- Production : https://facturte-digitale.vercel.app — `vercel deploy --prod --scope easydigia`.
- Toujours valider en preview (`vercel deploy`) avant de promouvoir.
- **Scanner les secrets avant tout push** : dépôt public.

## Do-Not-Repeat
- Ne pas exposer `SUPABASE_SERVICE_ROLE_KEY` au front (aucun préfixe `VITE_`) : elle contourne RLS.
- Ne pas ajouter `@supabase/supabase-js` : l'arbre de dépendances est fragile,
  l'API REST via `fetch` natif suffit et reste sans dépendance.
- Ne pas supprimer le repli `store.json` / `localStorage` : l'app doit rester utilisable hors ligne.
- Ne pas brancher l'app sur `database/postgres_schema.sql` (schéma relationnel de
  référence uniquement) — le format réel est le JSONB des tables `fx_*`.
- Ne pas remettre de `listen()` ni de middleware Vite dans `app.ts` : il est importe par la fonction serverless.
