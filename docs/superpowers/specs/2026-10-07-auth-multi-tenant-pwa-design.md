# Espace professionnel, authentification et installation mobile

**Date** : 2026-10-07
**Statut** : design, en attente de validation
**Projet** : Factures Digitale (FacturX Pro)

---

## 1. Objectif

Un professionnel reçoit un lien sur WhatsApp, l'ouvre, installe l'application sur
son téléphone, crée son compte et émet sa première facture conforme — **sans
assistance technique**.

Trois chantiers s'enchaînent pour y arriver :

1. **Authentification** — il n'en existe aucune aujourd'hui.
2. **Cloisonnement par utilisateur** — les tables n'ont aucune notion de propriétaire.
3. **Application installable (PWA)** — ni manifeste, ni service worker, ni icônes.

### Ce qui vaudra réussite

- Un inconnu part du lien WhatsApp et arrive à une facture valide sans aide.
- Deux utilisateurs sur la même base ne voient **jamais** les données l'un de l'autre,
  et cette garantie est vérifiable autrement qu'en relisant du code applicatif.
- L'application se lance depuis l'écran d'accueil, sans barre d'adresse.

---

## 2. Vocabulaire

Distinction à ne jamais confondre dans tout ce document :

| Terme | Sens |
|---|---|
| **Utilisateur** | Le professionnel qui se connecte, possède un espace et émet des documents. C'est lui qui reçoit le lien WhatsApp. |
| **Client** | Une fiche `Customer` en base — un client **de** l'utilisateur, destinataire d'une facture. Ne se connecte jamais. |

---

## 3. État de départ

- SPA React 19 + Vite 8 + Tailwind 4. Navigation par `useState`, **sans routeur**.
- Fonction serverless Express sur Vercel (`app.ts` → `api/index.ts`).
- Supabase : 5 tables `fx_*` au format `{ id text pk, data jsonb, created_at, updated_at }`,
  RLS activé **sans aucune politique**, accès réservé à `service_role` côté serveur.
- **Les 5 tables sont vides** (vérifié le 2026-10-07) : aucune donnée à préserver.
- Société de démonstration (ATLAS SOLUTIONS) et jeux de clients/produits/documents
  fictifs codés en dur dans `src/services/api.ts` (~330 lignes sur 817).
- Aucun `og:image` dans `index.html`, alors que `twitter:card` annonce
  `summary_large_image` : un lien partagé n'affiche aucune vignette.

### Le point d'appui

Tous les accès aux données du front passent par un **seul** objet, `api`, dans
`src/services/api.ts`. Les signatures publiques (`api.getCustomers()`,
`api.saveCustomer(c)`, …) resteront identiques : **aucun composant métier ne change**.
Seules les entrailles de ce fichier basculent de `fetch('/api/...')` vers Supabase.

---

## 4. Décisions actées

| Sujet | Décision |
|---|---|
| Accès | **Inscription libre** — toute personne détenant le lien crée son compte |
| Identité | **E-mail + mot de passe** (aucune dépendance externe, aucun coût, pas de limite de débit) |
| Modèle | **Un utilisateur = un espace** (une société, ses données) |
| Premier lancement | **Assistant court**, puis espace vierge |
| Architecture | **Le front parle directement à Supabase**, cloisonnement par RLS |

---

## 5. Architecture retenue

```
                    ┌──────────────────────────────┐
  Navigateur /      │  SPA React (PWA installable) │
  écran d'accueil   │  clé anon + jeton utilisateur│
                    └───────┬──────────────┬───────┘
                            │              │
              données       │              │  IA (secret requis)
              + auth        │              │
                            ▼              ▼
                   ┌─────────────┐  ┌──────────────────┐
                   │  Supabase   │  │ Fonction Express │
                   │  Auth + RLS │  │  /api/ai/*       │
                   └─────────────┘  └────────┬─────────┘
                                             │ GEMINI_API_KEY
                                             ▼
                                        Gemini API
```

**Le cloisonnement est assuré par PostgreSQL, pas par du code applicatif.** Une
politique RLS oubliée est visible et auditable en SQL ; un filtre `owner_id`
oublié dans une route Express ne l'est pas. Sur une application de facturation,
cette différence est décisive.

Conséquence directe : **`service_role` cesse de toucher aux données utilisateur.**
Elle ne sert plus qu'à l'administration et à `/api/health`.

---

## 6. Modèle de données et migration

### 6.1 Deux changements par table

**Une colonne propriétaire**, rattachée aux comptes Supabase :

```sql
owner_id uuid not null
  references auth.users(id) on delete cascade
  default auth.uid()
```

Le `on delete cascade` fait que supprimer un compte efface l'intégralité de ses
données — utile directement pour la CNDP et le RGPD.

**Une clé primaire composite `(owner_id, id)`** au lieu de `id` seul.

Motif précis : les identifiants sont générés **par le navigateur**, sous la forme
`cust-${Date.now()}`, `doc-${Date.now()}`, `prod-${Date.now()}`
(`src/components/CustomerSupplierList.tsx:151`, `DocumentEditor.tsx:214`,
`ProductCatalog.tsx:108`). Ils ne sont donc pas uniques entre utilisateurs : deux
inscrits créant une fiche la même milliseconde entreraient en collision sur une clé
globale, et le second verrait son enregistrement rejeté par la politique de
sécurité — avec un échec incompréhensible. La clé composite supprime le problème
sans toucher à la génération d'identifiants existante.

`fx_company` est le cas particulier : une seule société par compte, donc `owner_id`
devient directement la clé primaire et la contrainte `singleton` actuelle disparaît.
Le champ `Company.id` du type TypeScript subsiste à l'intérieur du JSONB `data`,
mais n'a plus de rôle d'identification — le compte fait désormais office de clé.

### 6.2 Pourquoi le front envoie quand même `owner_id`

Le front enverra explicitement `{ owner_id, id, data }`, même si la colonne a un
défaut. Deux raisons :

1. PostgREST a besoin que les colonnes de `on_conflict=owner_id,id` soient dans la
   charge utile pour construire un `INSERT … ON CONFLICT` fiable.
2. Aucune confiance n'est accordée à cette valeur : `with check (owner_id = auth.uid())`
   fait rejeter par PostgreSQL toute tentative d'écrire au nom d'autrui. Le défaut
   reste en place comme seconde barrière.

### 6.3 Script de migration

Fichier à créer : **`database/supabase_auth_migration.sql`**, exécutable **d'un seul
bloc** dans le SQL Editor Supabase. Les tables étant vides, il les recrée.

> ⚠️ **Le bloc ci-dessous est un extrait de conception, pas un script exécutable.**
> Les tables répétitives et les triggers y sont résumés par des commentaires. Ne le
> copiez pas dans le SQL Editor : il échouerait. Le script complet et exécutable
> sera le fichier `database/supabase_auth_migration.sql`, écrit à la mise en œuvre.

```sql
begin;

-- ========== 1. Société : une par utilisateur ==========
drop table if exists public.fx_company cascade;
create table public.fx_company (
  owner_id   uuid primary key
             references auth.users(id) on delete cascade
             default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 2. Collections : clé composite (owner_id, id) ==========
drop table if exists public.fx_customers cascade;
create table public.fx_customers (
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- (fx_suppliers, fx_products, fx_documents : structure identique)

-- ========== 3. Index, en tête de owner_id ==========
create index fx_customers_owner_name_idx   on public.fx_customers (owner_id, (data->>'name'));
create index fx_suppliers_owner_name_idx   on public.fx_suppliers (owner_id, (data->>'name'));
create index fx_products_owner_ref_idx     on public.fx_products  (owner_id, (data->>'reference'));
create index fx_documents_owner_number_idx on public.fx_documents (owner_id, (data->>'number'));
create index fx_documents_owner_type_idx   on public.fx_documents (owner_id, (data->>'type'));
create index fx_documents_owner_date_idx   on public.fx_documents (owner_id, (data->>'date') desc);

-- ========== 4. Horodatage (triggers recréés après drop) ==========
create or replace function public.fx_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
-- un trigger before update par table

-- ========== 5. Cloisonnement ==========
alter table public.fx_company   enable row level security;
alter table public.fx_customers enable row level security;
alter table public.fx_suppliers enable row level security;
alter table public.fx_products  enable row level security;
alter table public.fx_documents enable row level security;

create policy fx_customers_own on public.fx_customers
  for all to authenticated
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());
-- une politique identique par table

grant select, insert, update, delete on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
to authenticated;

revoke all on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
from anon;

commit;
```

---

## 7. Authentification

### 7.1 Technique

- Ajout de `@supabase/supabase-js` au front — nécessaire pour la persistance de
  session, le rafraîchissement automatique du jeton et `onAuthStateChange`.
  L'installation fonctionne désormais grâce au `.npmrc` (`legacy-peer-deps=true`).
- Nouveau module `src/services/supabaseClient.ts` : client unique, lu depuis
  `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Ces deux variables sont **publiques par conception** et finissent dans le bundle.
  C'est normal : c'est le RLS qui protège les données, pas le secret de la clé.
  Elles sont nécessaires **au moment du build** sur Vercel.

### 7.2 Écrans

Un seul composant `src/components/AuthScreen.tsx`, deux onglets :

- **Connexion** : e-mail, mot de passe.
- **Créer un compte** : e-mail, mot de passe (**8 caractères minimum**).
  Le minimum par défaut de Supabase est 6 : il sera porté à 8 côté projet
  *et* validé côté front, pour que le message d'erreur arrive avant l'envoi.

Pas de routeur : l'app n'en a pas, et l'état de session suffit à décider quoi afficher.

### 7.3 Le piège de configuration

**La confirmation d'e-mail doit être désactivée** dans Supabase
(*Authentication → Providers → Email → Confirm email* **OFF**).

Si elle reste active, `signUp` renvoie un utilisateur **sans session** : l'inscrit
attend un e-mail que le SMTP intégré de Supabase plafonne à quelques envois par
heure. L'objectif « sans assistance technique » tombe immédiatement.

### 7.4 L'aiguillage dans `App.tsx`

```
session en cours de lecture  →  écran de chargement
session absente              →  <AuthScreen/>
session + aucune société     →  <OnboardingWizard/>
session + société            →  l'application
```

« Aucune société » se détecte au fait que `api.getCompany()` renvoie `null`.
Cela implique un changement de comportement : la méthode renvoie aujourd'hui
`DEFAULT_COMPANY`. Les constantes de démonstration (`DEFAULT_COMPANY`,
`DEFAULT_CUSTOMERS`, `DEFAULT_SUPPLIERS`, `DEFAULT_PRODUCTS`, `DEFAULT_DOCUMENTS`)
sont **supprimées**.

---

## 8. Assistant de première connexion

`src/components/OnboardingWizard.tsx`, trois étapes, écrit une ligne `fx_company`.

| Étape | Champs | Obligatoires |
|---|---|---|
| 1. Identité | nom, forme juridique, devise (MAD), taux de TVA (20 %) | nom |
| 2. Identifiants légaux | ICE, IF, RC, patente, CNSS | ICE, IF, RC |
| 3. Coordonnées | adresse, ville, code postal, téléphone, e-mail, site | ville, téléphone |

Validation : ICE sur 15 chiffres, IF et RC numériques. Les champs facultatifs
restent vides sans bloquer.

Logo, cachet, signature, couleurs, RIB et mentions légales **ne sont pas demandés
ici** : ils restent dans les Paramètres Société, modifiables à tout moment. L'objectif
de l'assistant est le minimum légal pour émettre une facture marocaine valide, pas
un formulaire de 28 champs.

Si l'écriture échoue, l'utilisateur **reste dans l'assistant** avec une possibilité de
réessayer. Jamais de bascule vers une application sans société.

---

## 9. Installation et parcours WhatsApp

Trois obstacles réels se dressent entre le lien WhatsApp et une icône sur l'écran
d'accueil. Les ignorer, c'est garantir l'appel à l'aide.

### 9.1 Le navigateur intégré de WhatsApp n'installe pas les PWA

Un lien tapé depuis WhatsApp s'ouvre dans une vue embarquée où l'installation est
indisponible. `src/components/InstallPrompt.tsx` détecte ce contexte
(`WhatsApp`, `FBAN`, `FBAV`, `Instagram`, ou `; wv)` sur Android) et affiche
« Ouvrez ce lien dans Chrome », avec un bouton de copie du lien.

### 9.2 iOS n'offre aucun bouton d'installation

Sur iPhone, le seul chemin est *Partager → Sur l'écran d'accueil*. Impossible à
déclencher par programme. Le composant affiche donc la marche à suivre illustrée
quand il détecte Safari iOS.

### 9.3 Android et bureau

Capture de `beforeinstallprompt`, puis bouton « Installer l'application » appelant
`prompt()`. Si l'app tourne déjà en mode autonome
(`matchMedia('(display-mode: standalone)')`), le composant ne s'affiche pas.

### 9.4 Fichiers PWA

- `public/manifest.webmanifest` : nom, `short_name` « FacturX », `start_url: "/"`,
  `display: "standalone"`, `theme_color: "#4f46e5"`, `lang: "fr"`, icônes 192 et 512
  plus une 512 `maskable`.
- `public/sw.js`, écrit à la main (~50 lignes), **sans dépendance de build** —
  l'arbre npm est déjà fragile.
  - navigation : réseau d'abord, repli sur l'`index.html` en cache ;
  - `/assets/*` (noms hachés) : cache d'abord, sinon réseau puis mise en cache ;
  - `/api/*` et Supabase : **jamais** mis en cache.
  - *Compromis assumé* : le premier lancement hors ligne exige une visite en ligne
    préalable. Un plugin de build précacherait les fichiers hachés dès l'installation,
    au prix d'une dépendance supplémentaire — non retenu.
- Enregistrement dans `main.tsx`, uniquement en production (`import.meta.env.PROD`).

### 9.5 La vignette WhatsApp

Ajouts dans `index.html` : `og:image` (**absent aujourd'hui**), `og:url`,
`og:site_name`, `og:locale`, dimensions de l'image, `theme-color`,
`apple-touch-icon` et les métas `apple-mobile-web-app-*`.

Icônes et image de partage (1200 × 630) générées en PNG par capture Playwright
d'un gabarit HTML. WhatsApp exige une URL absolue et ne lit pas le SVG.

---

## 10. Cache local et étanchéité entre utilisateurs

`localStore` (localStorage) sert de cache synchrone : `App.tsx` l'interroge
directement à l'initialisation (lignes 31-35) et `computeDashboardStats()` est
synchrone. Ce cache reste donc nécessaire.

**Mais il devient un risque de fuite.** Sur un téléphone partagé, ou après un
changement de compte, l'utilisateur B verrait apparaître les données de A.
Parades :

- Les clés sont préfixées par l'identifiant du compte : `facturx:{userId}:customers`.
- À la déconnexion, **toutes** les clés `facturx:*` sont purgées.
- À la connexion, si l'identifiant diffère du dernier connu (`facturx:lastUser`),
  purge avant tout affichage.

> **Arbitrage.** Une version antérieure de ce document annonçait, en §12, que le
> cache survivait à une expiration de session. C'était intenable : une déconnexion
> volontaire et une expiration se présentent toutes deux comme une session nulle,
> et le code ne peut pas les distinguer de façon fiable. Conserver le cache dans ce
> cas laisserait les données d'un professionnel lisibles sur un téléphone partagé
> après simple péremption du jeton. **La purge s'applique donc à toute session
> nulle.** Le coût est nul sur les données — elles vivent dans Supabase — et ne
> concerne que la consultation hors ligne, qui exige de toute façon une
> reconnexion.

---

## 11. Ce que devient la fonction Express

**Conservé :**

- `/api/ai/describe`, `/api/ai/price-suggest`, `/api/ai/text-polish` — ils ont besoin
  de `GEMINI_API_KEY`, qui ne doit pas quitter le serveur.
- `/api/health`, `/api/database/*-schema`.

**Ajouté — et ce n'est pas un détail :** ces trois routes IA sont **aujourd'hui
ouvertes à tous**. N'importe qui peut les appeler et consommer votre quota Gemini.
Elles exigeront désormais un jeton Supabase valide, vérifié par un appel à
`GET {SUPABASE_URL}/auth/v1/user`. Un aller-retour supplémentaire par appel IA,
largement acceptable.

**Supprimé :** toutes les routes de données (`/api/company`, `/api/customers`,
`/api/suppliers`, `/api/products`, `/api/documents`) et `/api/backup/*`.
`BackupRestore.tsx` a été vérifié : il **n'appelle aucune route serveur**, il
construit tout côté client. Leur retrait ne casse rien.

`supabase.ts` côté serveur est réduit à `healthCheck`. La couche `store` et le repli
`store.json` disparaissent : le front ne passe plus par le serveur pour ses données.

---

## 12. Gestion des erreurs

| Situation | Comportement |
|---|---|
| E-mail déjà inscrit | « Un compte existe déjà avec cet e-mail » + bascule vers Connexion |
| Mot de passe trop court | Validation avant envoi, message sous le champ |
| Identifiants invalides | Message unique, sans préciser lequel est faux |
| Hors ligne à la connexion | « Connexion internet requise pour se connecter » |
| Session expirée en cours d'usage | Retour à l'écran de connexion, **cache local purgé** |
| Hors ligne pendant l'usage | Bandeau « hors ligne — lecture seule », affichage depuis le cache |
| Violation RLS | Ne doit pas arriver ; message générique + trace console |
| Échec d'écriture de la société | Maintien dans l'assistant, bouton Réessayer |

---

## 13. Configuration requise

**Supabase**
- *Authentication → Providers → Email* : activé, **Confirm email OFF**.
- *Authentication → URL Configuration* : Site URL
  `https://facturte-digitale.vercel.app`.
- *Authentication → Policies* : longueur minimale du mot de passe portée à **8**.
- Exécuter `database/supabase_auth_migration.sql`.

**Vercel** (Production **et** Preview)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — requises **au build**.
- `SUPABASE_SERVICE_ROLE_KEY` conservée pour `/api/health` uniquement.
- `GEMINI_API_KEY` toujours absente : les fonctions IA resteront inactives tant
  qu'elle n'est pas définie.

---

## 14. Vérifications

Le projet n'a **aucun lanceur de tests** installé. Les vérifications sont donc
explicites et manuelles, mais réelles :

1. `npx tsc --noEmit` passe.
2. Création de deux comptes distincts, chacun avec sa société via l'assistant.
3. **Test d'étanchéité, le plus important** : avec le jeton d'accès de A, appeler
   directement l'API REST sur une ligne de B → doit renvoyer vide, pas une erreur
   serveur.
4. **Test de non-usurpation** : tentative d'insertion avec un `owner_id` forgé →
   doit être rejetée (403).
5. Contrôle `service_role` : les lignes portent bien deux `owner_id` différents.
6. PWA : manifeste servi, service worker enregistré, rechargement hors ligne
   fonctionnel après une visite en ligne.
7. Métas de partage : `og:image` atteignable en URL absolue.
8. **À votre charge** : l'installation réelle depuis WhatsApp sur un Android et un
   iPhone. Je ne peux pas la tester.

---

## 15. Découpage de la mise en œuvre

La spec couvre trois chantiers. Ils se répartissent en trois lots, dont l'ordre
n'est pas indifférent :

| Lot | Contenu | Dépendances |
|---|---|---|
| **1 — Installable et partageable** | manifeste, service worker, icônes, `og:image`, composant d'installation et détection du navigateur WhatsApp | **aucune** |
| **2 — Comptes et cloisonnement** | migration SQL, client Supabase, écran de connexion, bascule de `api.ts` vers l'accès direct, cache local préfixé, nettoyage d'`app.ts` | lot 1 indépendant |
| **3 — Première connexion** | assistant en trois étapes, suppression des données de démonstration | lot 2 |

**Le lot 1 ne dépend de rien** et peut être livré seul, immédiatement : vous
obtiendriez la vignette WhatsApp et une application installable avant même que
l'authentification existe. Le lot 2 est le cœur du travail. Le lot 3 est court mais
ne peut pas précéder le 2.

Entre le lot 2 et le lot 3, l'application est **inutilisable** : les données de
démonstration ont disparu et aucune société n'existe encore. Ces deux lots doivent
donc être livrés ensemble, ou le lot 3 immédiatement après.

---

## 16. Hors périmètre

Réinitialisation de mot de passe par e-mail · plusieurs utilisateurs par société ·
plusieurs sociétés par utilisateur · paiement et abonnement · notifications push ·
écriture hors ligne avec file d'attente · arabe et multilingue.

---

## 17. Risques connus

**Pas de réinitialisation de mot de passe au lancement.** C'est la faille la plus
sérieuse vis-à-vis de l'objectif : un mot de passe oublié = un appel à vous. Elle
exige un vrai SMTP. Recommandation forte en suite immédiate — un connecteur Resend
est déjà disponible dans l'environnement de travail.

**Inscription libre = aucune protection contre les abus.** Toute personne recevant
le lien transféré peut créer un compte. Les limites de débit de Supabase amortissent,
mais un captcha sera à envisager si le lien circule largement.

**Un service worker peut servir une version périmée** après déploiement. Atténué par
la stratégie « réseau d'abord » sur la navigation.

**L'installation iOS ne peut pas être déclenchée par programme** — seules des
instructions sont possibles. Un utilisateur iPhone pressé risque de ne pas installer.

**La suppression des données de démonstration** rend le premier écran vide.
L'assistant puis un espace clairement neuf atténuent l'effet.
