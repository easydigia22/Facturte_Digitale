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
- `npm install` échoue sans `--legacy-peer-deps` (conflit `vite@8` / `esbuild` de `tsx`). Préexistant.
- Le MCP Supabase de cette session n'a **pas** les droits sur le projet
  `<project-ref>` → le DDL doit passer par le SQL Editor du dashboard.
- PostgREST exige un filtre sur tout `DELETE` → utiliser `?id=not.is.null` pour vider une table.

## Do-Not-Repeat
- Ne pas exposer `SUPABASE_SERVICE_ROLE_KEY` au front (aucun préfixe `VITE_`) : elle contourne RLS.
- Ne pas ajouter `@supabase/supabase-js` : l'arbre de dépendances est fragile,
  l'API REST via `fetch` natif suffit et reste sans dépendance.
- Ne pas supprimer le repli `store.json` / `localStorage` : l'app doit rester utilisable hors ligne.
- Ne pas brancher l'app sur `database/postgres_schema.sql` (schéma relationnel de
  référence uniquement) — le format réel est le JSONB des tables `fx_*`.
