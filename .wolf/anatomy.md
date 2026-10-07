# Anatomie — Factures Digitale

Application de facturation (Maroc) : devis, factures, BL, avoirs.
Stack : React 19 + Vite 8 + Tailwind 4 (front) / Express + tsx (serveur) / Supabase (données).

## Racine
| Fichier | Rôle |
|---|---|
| `server.ts` | Serveur Express : API REST `/api/*`, couche de stockage unifiée (Supabase ↔ store.json), endpoints IA Gemini, middleware Vite |
| `supabase.ts` | Persistance Supabase via API REST PostgREST (`fetch` natif, zéro dépendance npm). Serveur uniquement — porte la clé `service_role` |
| `vite.config.ts` | Config Vite (utilise `__dirname`, avertissement natif bénin) |
| `.env` | Secrets réels : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. Ignoré par git (`.env*`) |
| `.env.example` | Gabarit documenté des variables |

## `database/`
| Fichier | Rôle |
|---|---|
| `supabase_schema.sql` | **DDL actif.** 5 tables JSONB (`fx_*`) + index + triggers `updated_at` + RLS verrouillé. À exécuter dans le SQL Editor Supabase |
| `postgres_schema.sql` | Schéma relationnel de référence (export/BI). **Non utilisé** par l'app |
| `sqlite_schema.sql` | Variante SQLite de référence |
| `seeds.sql` | Jeux de données d'exemple |
| `store.json` | Cache / repli local généré au runtime |

## `src/`
| Chemin | Rôle |
|---|---|
| `App.tsx`, `main.tsx` | Racine React |
| `services/api.ts` | Client API unifié + `localStore` (localStorage) en repli instantané ; contient les jeux de données par défaut |
| `types/index.ts` | Types métier — **source de vérité** du format JSONB en base |
| `components/` | Dashboard, DocumentEditor, DocumentPreview, DocumentList, CustomerSupplierList, ProductCatalog, CompanySettings, BackupRestore, AiAssistantModal, UserGuideModal, Header, Sidebar |
| `utils/` | `exporters` (docx/xlsx), `importers`, `formatters`, `numberToWords` |

## Chaîne de persistance

    Composant React -> src/services/api.ts -> fetch /api/* -> server.ts (store)
            |                   | (repli)                        | (repli)
            |             localStorage                   database/store.json
            |                                                    |
            +--------------------> supabase.ts -> PostgREST -> Supabase

## Points d'attention
- `tsconfig.json` : `moduleResolution: "bundler"` + `allowImportingTsExtensions` → les imports internes du serveur s'écrivent **`./supabase.ts`** (pas `.js`).
- `node_modules` s'installe avec `npm install --legacy-peer-deps` (conflit préexistant `vite@8` / `esbuild` via `tsx`).
