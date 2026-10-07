# Lot 2 — Comptes, cloisonnement et première connexion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à chaque utilisateur un espace professionnel isolé, accessible par e-mail et mot de passe, avec un assistant de première connexion qui recueille le minimum légal marocain.

**Architecture:** Le front parle directement à Supabase avec la clé `anon` et le jeton de l'utilisateur ; **le cloisonnement est garanti par les politiques RLS de PostgreSQL**, pas par du code applicatif. La fonction Express ne garde que les routes IA, désormais protégées par jeton. Les signatures publiques de `src/services/api.ts` ne changent pas — aucun composant métier n'est touché.

**Tech Stack:** React 19, Vite 8, TypeScript, `@supabase/supabase-js`, PostgreSQL / RLS, vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-auth-multi-tenant-pwa-design.md` (§6 à §14, §15 lots 2 et 3)

**Prérequis :** le lot 1 (`2026-10-07-lot1-pwa-installable.md`) doit être terminé — il installe `vitest`, dont ce plan dépend dès la tâche 1.

## Global Constraints

- Langue de toute l'interface et des commentaires de code : **français**.
- **`service_role` ne touche plus aux données utilisateur.** Elle ne sert qu'à l'administration, à `/api/health` et au nettoyage des tests.
- Le front envoie explicitement `owner_id` ; sa véracité est garantie par `with check (owner_id = auth.uid())`, jamais par confiance.
- Clé primaire des collections : **`(owner_id, id)`**. Les identifiants restent générés par le navigateur (`cust-${Date.now()}`).
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont **publiques par conception** et nécessaires **au moment du build**.
- Longueur minimale du mot de passe : **8 caractères**, validée côté front *et* côté projet Supabase.
- Confirmation d'e-mail Supabase : **désactivée**.
- Aucun secret en dur dans le code ; `.env` reste ignoré par git.
- `npx tsc --noEmit` et `npm test` doivent passer à chaque commit.
- Entre la tâche 5 et la tâche 8, **l'application est volontairement inutilisable** : les données de démonstration ont disparu et l'aiguillage de session n'existe pas encore. Ne pas déployer dans cet intervalle.

## Review Focus

Classes d'entrées que la spec implique mais qu'aucune tâche n'exerce spontanément, de la plus probable à la moins probable. Chacune reçoit son test dans la tâche propriétaire.

1. **Lecture croisée entre deux comptes** — avec le jeton de A, lire une ligne de B doit renvoyer **vide**, pas une erreur serveur ni la donnée. C'est la garantie centrale du produit. → Tâche 1.
2. **`owner_id` forgé** — une insertion au nom d'un autre compte doit être **rejetée** par PostgreSQL, même si le front est compromis. → Tâche 1.
3. **Changement de compte sur le même appareil** — téléphone partagé ou revente : aucune donnée du compte précédent ne doit apparaître, même brièvement au chargement. → Tâche 3.
4. **Perte de réseau en cours d'usage** — l'application doit afficher le cache en lecture seule, pas un écran vide ni une exception non rattrapée. → Tâche 5.
5. **Session expirée pendant la saisie de l'assistant** — l'utilisateur doit revenir à la connexion avec un message clair, sans que sa société soit à moitié écrite. → Tâche 7.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `database/supabase_auth_migration.sql` | Migration complète : `owner_id`, clés composites, index, triggers, RLS (créé) |
| `tests/rls-isolation.test.ts` | Test d'intégration de l'étanchéité, contre le vrai Supabase (créé) |
| `src/services/supabaseClient.ts` | Client Supabase unique du front (créé) |
| `src/services/localCache.ts` | Cache synchrone **cloisonné par compte** (créé) |
| `tests/localCache.test.ts` | Tests du cloisonnement du cache (créé) |
| `src/utils/companyValidation.ts` | Validation **pure** des champs de société (créé) |
| `tests/companyValidation.test.ts` | Tests de validation (créé) |
| `src/services/api.ts` | Bascule vers Supabase direct ; suppression des données de démonstration (modifié) |
| `src/components/AuthScreen.tsx` | Connexion et création de compte (créé) |
| `src/components/OnboardingWizard.tsx` | Assistant de première connexion, 3 étapes (créé) |
| `src/App.tsx` | Aiguillage de session (modifié) |
| `app.ts` | Retrait des routes de données, verrou par jeton sur l'IA (modifié) |
| `supabase.ts` | Réduit à `healthCheck` (modifié) |

---

### Task 1: Migration SQL et preuve de l'étanchéité

La garantie de cloisonnement est la raison d'être de ce lot. On l'écrit **et on la prouve** avant d'écrire une ligne de front.

**Files:**
- Create: `database/supabase_auth_migration.sql`
- Create: `tests/rls-isolation.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: 5 tables `fx_*` portant `owner_id`, clés `(owner_id, id)` sauf `fx_company` (clé `owner_id`), politiques RLS `for all to authenticated`.

- [ ] **Step 1 : Écrire le script de migration complet**

Fichier **exécutable d'un seul bloc**. Les 5 tables sont vides (vérifié) : il les recrée.

```sql
-- ==========================================================
-- FACTURES DIGITALE — Cloisonnement par utilisateur
-- ==========================================================
-- À exécuter UNE SEULE FOIS, d'un seul bloc, dans :
--   Supabase Dashboard > SQL Editor > New query > Run
--
-- Remplace database/supabase_schema.sql, qui ne connaissait
-- qu'un seul espace global accessible via service_role.
--
-- Après cette migration, chaque ligne appartient à un compte
-- Supabase et PostgreSQL interdit lui-même toute lecture ou
-- écriture croisée.
-- ==========================================================

begin;

-- ---------- 1. Société : une seule par compte ----------
-- owner_id devient la clé primaire : la contrainte « singleton »
-- de l'ancien schéma n'a plus de raison d'être.
drop table if exists public.fx_company cascade;
create table public.fx_company (
  owner_id   uuid primary key
             references auth.users(id) on delete cascade
             default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 2. Collections : clé composite (owner_id, id) ----------
-- Les identifiants sont generes par le navigateur sous la forme
-- `cust-${Date.now()}` : ils ne sont PAS uniques entre comptes.
-- La clé composite rend les collisions inoffensives.
drop table if exists public.fx_customers cascade;
create table public.fx_customers (
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

drop table if exists public.fx_suppliers cascade;
create table public.fx_suppliers (
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

drop table if exists public.fx_products cascade;
create table public.fx_products (
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- Les lignes de document sont incluses dans data->'items'.
drop table if exists public.fx_documents cascade;
create table public.fx_documents (
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- ---------- 3. Index, en tête de owner_id ----------
-- Toute requête étant filtrée par compte, owner_id vient en premier.
create index fx_customers_owner_name_idx   on public.fx_customers (owner_id, (data->>'name'));
create index fx_suppliers_owner_name_idx   on public.fx_suppliers (owner_id, (data->>'name'));
create index fx_products_owner_ref_idx     on public.fx_products  (owner_id, (data->>'reference'));
create index fx_documents_owner_number_idx on public.fx_documents (owner_id, (data->>'number'));
create index fx_documents_owner_type_idx   on public.fx_documents (owner_id, (data->>'type'));
create index fx_documents_owner_date_idx   on public.fx_documents (owner_id, (data->>'date') desc);

-- ---------- 4. Horodatage automatique ----------
create or replace function public.fx_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fx_company_touch before update on public.fx_company
  for each row execute function public.fx_touch_updated_at();
create trigger fx_customers_touch before update on public.fx_customers
  for each row execute function public.fx_touch_updated_at();
create trigger fx_suppliers_touch before update on public.fx_suppliers
  for each row execute function public.fx_touch_updated_at();
create trigger fx_products_touch before update on public.fx_products
  for each row execute function public.fx_touch_updated_at();
create trigger fx_documents_touch before update on public.fx_documents
  for each row execute function public.fx_touch_updated_at();

-- ==========================================================
-- 5. CLOISONNEMENT
-- ==========================================================
-- `using` filtre ce qui est lisible ; `with check` interdit
-- d'écrire au nom d'autrui. Les deux sont nécessaires :
-- `using` seul laisserait passer une insertion usurpée.
-- ==========================================================
alter table public.fx_company   enable row level security;
alter table public.fx_customers enable row level security;
alter table public.fx_suppliers enable row level security;
alter table public.fx_products  enable row level security;
alter table public.fx_documents enable row level security;

create policy fx_company_own on public.fx_company
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy fx_customers_own on public.fx_customers
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy fx_suppliers_own on public.fx_suppliers
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy fx_products_own on public.fx_products
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy fx_documents_own on public.fx_documents
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Droits encadrés par les politiques ci-dessus.
grant select, insert, update, delete on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
to authenticated;

-- Un visiteur non authentifié n'a accès à rien.
revoke all on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
from anon;

commit;
```

- [ ] **Step 2 : Écrire le test d'étanchéité, qui doit échouer**

Ce test parle au **vrai** Supabase : c'est la seule façon de prouver qu'une politique RLS fait ce qu'elle annonce. Il se saute proprement si les clés sont absentes.

```ts
// tests/rls-isolation.test.ts
/**
 * Preuve du cloisonnement entre comptes.
 *
 * Ce test ne simule rien : il crée deux vrais comptes, écrit une fiche avec
 * chacun, puis vérifie que PostgreSQL refuse toute lecture ou écriture croisée.
 * Un test qui simulerait Supabase ne prouverait rien du tout.
 *
 * Variables requises : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URL_BASE = process.env.SUPABASE_URL ?? '';
const CLE_ANON = process.env.SUPABASE_ANON_KEY ?? '';
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const configure = Boolean(URL_BASE && CLE_ANON && CLE_SERVICE);

interface Compte {
  id: string;
  jeton: string;
  email: string;
}

/** Crée un compte et renvoie son identifiant et son jeton d'accès. */
async function creerCompte(): Promise<Compte> {
  const email = `test-rls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemple.test`;
  const reponse = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: CLE_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'MotDePasse123!' }),
  });
  const corps = await reponse.json();
  if (!reponse.ok) throw new Error(`signup ${reponse.status} ${JSON.stringify(corps)}`);
  if (!corps.access_token) {
    throw new Error(
      'Aucun jeton renvoyé : la confirmation d’e-mail est probablement encore ' +
        'active dans Supabase (Authentication > Providers > Email > Confirm email).'
    );
  }
  return { id: corps.user.id, jeton: corps.access_token, email };
}

/** Appel PostgREST au nom d'un utilisateur. */
function commeUtilisateur(jeton: string, chemin: string, init: RequestInit = {}) {
  return fetch(`${URL_BASE}/rest/v1${chemin}`, {
    ...init,
    headers: {
      apikey: CLE_ANON,
      Authorization: `Bearer ${jeton}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function supprimerCompte(id: string): Promise<void> {
  await fetch(`${URL_BASE}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` },
  });
}

describe.skipIf(!configure)('cloisonnement RLS entre comptes', () => {
  let alice: Compte;
  let bob: Compte;

  beforeAll(async () => {
    alice = await creerCompte();
    bob = await creerCompte();

    // Chacun crée une fiche client portant VOLONTAIREMENT le même identifiant,
    // ce que la clé composite (owner_id, id) doit rendre inoffensif.
    for (const compte of [alice, bob]) {
      const reponse = await commeUtilisateur(compte.jeton, '/fx_customers', {
        method: 'POST',
        body: JSON.stringify({
          owner_id: compte.id,
          id: 'cust-collision',
          data: { id: 'cust-collision', name: `Client de ${compte.email}` },
        }),
      });
      expect(reponse.status, await reponse.text()).toBeLessThan(300);
    }
  }, 60_000);

  afterAll(async () => {
    // La suppression du compte efface ses données par cascade.
    if (alice) await supprimerCompte(alice.id);
    if (bob) await supprimerCompte(bob.id);
  }, 30_000);

  it('laisse chacun lire sa propre fiche', async () => {
    const reponse = await commeUtilisateur(alice.jeton, '/fx_customers?select=id,data');
    const lignes = await reponse.json();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].data.name).toContain(alice.email);
  });

  it('un identifiant identique chez deux comptes ne provoque aucun conflit', async () => {
    const reponse = await commeUtilisateur(bob.jeton, '/fx_customers?select=id,data');
    const lignes = await reponse.json();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].data.name).toContain(bob.email);
  });

  it('refuse la lecture de la fiche d’un autre compte', async () => {
    const reponse = await commeUtilisateur(
      alice.jeton,
      `/fx_customers?select=id,data&owner_id=eq.${bob.id}`
    );
    expect(reponse.status).toBe(200);
    // Vide, et non une erreur : RLS filtre, il ne proteste pas.
    expect(await reponse.json()).toEqual([]);
  });

  it('refuse d’écrire au nom d’un autre compte', async () => {
    const reponse = await commeUtilisateur(alice.jeton, '/fx_customers', {
      method: 'POST',
      body: JSON.stringify({
        owner_id: bob.id, // usurpation
        id: 'cust-usurpe',
        data: { id: 'cust-usurpe', name: 'Inséré au nom de Bob' },
      }),
    });
    expect(reponse.status).toBe(403);
  });

  it('refuse de modifier la fiche d’un autre compte', async () => {
    const reponse = await commeUtilisateur(
      alice.jeton,
      `/fx_customers?id=eq.cust-collision&owner_id=eq.${bob.id}`,
      { method: 'PATCH', body: JSON.stringify({ data: { name: 'Détourné' } }) }
    );
    // Aucune ligne visible donc aucune ligne modifiée.
    expect(reponse.status).toBeLessThan(300);
    const verification = await commeUtilisateur(bob.jeton, '/fx_customers?select=data');
    const lignes = await verification.json();
    expect(lignes[0].data.name).toContain(bob.email);
  });

  it('refuse tout accès sans authentification', async () => {
    const reponse = await fetch(`${URL_BASE}/rest/v1/fx_customers?select=id`, {
      headers: { apikey: CLE_ANON },
    });
    // Soit refus franc, soit liste vide : jamais de donnée.
    if (reponse.status === 200) expect(await reponse.json()).toEqual([]);
    else expect([401, 403]).toContain(reponse.status);
  });

  it('la société est bien limitée à une par compte', async () => {
    const premier = await commeUtilisateur(alice.jeton, '/fx_company', {
      method: 'POST',
      body: JSON.stringify({ owner_id: alice.id, data: { name: 'Société Alice' } }),
    });
    expect(premier.status).toBeLessThan(300);

    const second = await commeUtilisateur(alice.jeton, '/fx_company', {
      method: 'POST',
      body: JSON.stringify({ owner_id: alice.id, data: { name: 'Seconde société' } }),
    });
    // Clé primaire sur owner_id : le second insert entre en conflit.
    expect(second.status).toBe(409);
  });
});
```

- [ ] **Step 3 : Lancer le test et constater l'échec**

```bash
set -a && . ./.env && set +a && npm test -- tests/rls-isolation.test.ts
```

Expected: ÉCHEC — les tables n'ont pas encore de colonne `owner_id`, les insertions sont refusées (`42703 column "owner_id" does not exist`) ou la politique manque.

- [ ] **Step 4 : Appliquer la migration**

Ouvrir **Supabase Dashboard → SQL Editor → New query**, coller **l'intégralité** de `database/supabase_auth_migration.sql`, puis **Run**.

Avant cela, vérifier que la confirmation d'e-mail est désactivée :
*Authentication → Providers → Email → Confirm email* **OFF**. Sans ça, `signup` ne renvoie pas de jeton et le test échoue avec un message explicite.

- [ ] **Step 5 : Lancer le test et constater le succès**

```bash
set -a && . ./.env && set +a && npm test -- tests/rls-isolation.test.ts
```

Expected: SUCCÈS — 7 tests passent. **C'est la preuve que le produit cloisonne.**

- [ ] **Step 6 : Commit**

```bash
git add database/supabase_auth_migration.sql tests/rls-isolation.test.ts
git commit -m "feat: cloisonnement par compte avec RLS, prouvé par test d'intégration"
```

---

### Task 2: Client Supabase du front

**Files:**
- Create: `src/services/supabaseClient.ts`
- Modify: `.env`, `.env.example`

**Interfaces:**
- Consumes: rien.
- Produces: `supabase` (instance `SupabaseClient`), `utilisateurCourantId(): Promise<string | null>`.

- [ ] **Step 1 : Installer la bibliothèque**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2 : Déclarer les variables d'environnement**

Ajouter à `.env` (valeurs réelles, fichier ignoré par git) :

```
# Exposées au navigateur (préfixe VITE_). Publiques par conception :
# c'est le RLS qui protège les données, pas le secret de la clé anon.
VITE_SUPABASE_URL="https://qnojuppxnmzxmhbtlbhm.supabase.co"
VITE_SUPABASE_ANON_KEY="<même valeur que SUPABASE_ANON_KEY>"
```

Et à `.env.example` :

```
# Exposées au navigateur (préfixe VITE_), requises AU BUILD.
# Publiques par conception : le RLS protège les données, pas le secret.
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="MY_SUPABASE_ANON_KEY"
```

- [ ] **Step 3 : Écrire le client**

```ts
// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase unique du front.
 *
 * La clé `anon` est publique par conception : elle n'ouvre aucun accès par
 * elle-même. Ce sont les politiques RLS, côté PostgreSQL, qui décident de ce
 * que le porteur du jeton peut lire ou écrire.
 *
 * La clé `service_role` ne doit JAMAIS apparaître ici : elle contourne RLS.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cleAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !cleAnon) {
  throw new Error(
    'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises. ' +
      'Elles doivent être définies au moment du build (Vercel → Settings → ' +
      'Environment Variables, pour Production et Preview).'
  );
}

export const supabase = createClient(url, cleAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Aucun lien magique n'est utilisé : inutile d'analyser l'URL au chargement.
    detectSessionInUrl: false,
  },
});

/** Identifiant du compte connecté, ou `null`. */
export async function utilisateurCourantId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
```

- [ ] **Step 4 : Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 5 : Commit**

```bash
git add src/services/supabaseClient.ts .env.example package.json
git commit -m "feat: client Supabase du front"
```

---

### Task 3: Cache local cloisonné par compte

`App.tsx` lit le cache de façon **synchrone** à l'initialisation (lignes 31-35) et `computeDashboardStats()` l'exige aussi. Le cache reste donc nécessaire — mais il devient un risque de fuite entre comptes sur un même appareil.

**Files:**
- Create: `src/services/localCache.ts`
- Create: `tests/localCache.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type Collection = 'company' | 'customers' | 'suppliers' | 'products' | 'documents'`
  - `interface CacheStorage { getItem; setItem; removeItem; key; length }`
  - `class LocalCache { constructor(store: CacheStorage); definirUtilisateur(id: string | null): void; lire<T>(c: Collection, defaut: T): T; ecrire<T>(c: Collection, valeur: T): void; purger(): void }`
  - `export const localCache: LocalCache` (adossé à `window.localStorage`)

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// tests/localCache.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalCache, type CacheStorage } from '../src/services/localCache';

/** localStorage factice, suffisant pour l'interface CacheStorage. */
function creerStockage(): CacheStorage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>();
  return {
    contenu,
    get length() {
      return contenu.size;
    },
    key: (i: number) => Array.from(contenu.keys())[i] ?? null,
    getItem: (k: string) => contenu.get(k) ?? null,
    setItem: (k: string, v: string) => void contenu.set(k, v),
    removeItem: (k: string) => void contenu.delete(k),
  };
}

describe('LocalCache', () => {
  let stockage: ReturnType<typeof creerStockage>;
  let cache: LocalCache;

  beforeEach(() => {
    stockage = creerStockage();
    cache = new LocalCache(stockage);
  });

  it('écrit puis relit pour le compte courant', () => {
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [{ id: 'c1' }]);
    expect(cache.lire('customers', [])).toEqual([{ id: 'c1' }]);
  });

  it('préfixe les clés par l’identifiant du compte', () => {
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [1]);
    expect(stockage.contenu.has('facturx:alice:customers')).toBe(true);
  });

  it('purge tout quand un AUTRE compte se connecte', () => {
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [{ id: 'secret-alice' }]);

    cache.definirUtilisateur('bob');
    expect(cache.lire('customers', [])).toEqual([]);
    // Rien d'Alice ne subsiste, même sous son propre préfixe.
    expect(stockage.contenu.has('facturx:alice:customers')).toBe(false);
  });

  it('ne purge pas quand le même compte revient', () => {
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [{ id: 'c1' }]);

    const cache2 = new LocalCache(stockage);
    cache2.definirUtilisateur('alice');
    expect(cache2.lire('customers', [])).toEqual([{ id: 'c1' }]);
  });

  it('purge à la déconnexion', () => {
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [{ id: 'c1' }]);

    cache.definirUtilisateur(null);
    expect(stockage.contenu.size).toBe(0);
  });

  it('renvoie le défaut et n’écrit rien sans compte défini', () => {
    cache.ecrire('customers', [{ id: 'c1' }]);
    expect(cache.lire('customers', [])).toEqual([]);
    expect(stockage.contenu.size).toBe(0);
  });

  it('renvoie le défaut si la valeur stockée est illisible', () => {
    cache.definirUtilisateur('alice');
    stockage.contenu.set('facturx:alice:customers', '{ceci n’est pas du JSON');
    expect(cache.lire('customers', ['defaut'])).toEqual(['defaut']);
  });

  it('survit à un stockage indisponible', () => {
    const casse: CacheStorage = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error('navigation privée');
      },
      setItem: () => {
        throw new Error('quota dépassé');
      },
      removeItem: () => {
        throw new Error('indisponible');
      },
    };
    const resistant = new LocalCache(casse);
    expect(() => resistant.definirUtilisateur('alice')).not.toThrow();
    expect(() => resistant.ecrire('customers', [1])).not.toThrow();
    expect(resistant.lire('customers', ['defaut'])).toEqual(['defaut']);
  });

  it('ne touche pas aux clés étrangères au cache', () => {
    stockage.contenu.set('autre-application', 'à conserver');
    cache.definirUtilisateur('alice');
    cache.ecrire('customers', [1]);
    cache.definirUtilisateur('bob');
    expect(stockage.contenu.get('autre-application')).toBe('à conserver');
  });
});
```

- [ ] **Step 2 : Lancer les tests et constater l'échec**

Run: `npm test -- tests/localCache.test.ts`
Expected: ÉCHEC — `Failed to resolve import "../src/services/localCache"`.

- [ ] **Step 3 : Écrire l'implémentation**

```ts
// src/services/localCache.ts

/**
 * Cache synchrone des données, cloisonné par compte.
 *
 * Pourquoi un cache : `App.tsx` initialise son état de façon synchrone et
 * `computeDashboardStats()` n'est pas asynchrone. Un simple appel réseau ne
 * suffirait donc pas.
 *
 * Pourquoi cloisonné : sur un téléphone partagé, ou après un changement de
 * compte, les données du compte précédent apparaîtraient — brièvement au
 * chargement, ce qui suffit à constituer une fuite. Les clés sont donc
 * préfixées par l'identifiant du compte, et tout est purgé dès qu'un autre
 * compte se présente ou qu'on se déconnecte.
 */

export type Collection =
  | 'company'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'documents';

/** Sous-ensemble de `localStorage` dont on a besoin — injectable pour les tests. */
export interface CacheStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

const PREFIXE = 'facturx';
const CLE_DERNIER_COMPTE = `${PREFIXE}:lastUser`;

export class LocalCache {
  private utilisateurId: string | null = null;

  constructor(private readonly stockage: CacheStorage) {}

  /**
   * Déclare le compte courant. Purge le cache si le compte diffère du
   * précédent, ou si l'on se déconnecte (`null`).
   */
  definirUtilisateur(utilisateurId: string | null): void {
    const precedent = this.lireBrut(CLE_DERNIER_COMPTE);

    if (utilisateurId === null || (precedent !== null && precedent !== utilisateurId)) {
      this.purger();
    }

    this.utilisateurId = utilisateurId;
    if (utilisateurId !== null) {
      this.ecrireBrut(CLE_DERNIER_COMPTE, utilisateurId);
    }
  }

  lire<T>(collection: Collection, defaut: T): T {
    const cle = this.cle(collection);
    if (cle === null) return defaut;

    const brut = this.lireBrut(cle);
    if (brut === null) return defaut;

    try {
      return JSON.parse(brut) as T;
    } catch {
      // Valeur corrompue : on préfère le défaut à une exception en plein rendu.
      return defaut;
    }
  }

  ecrire<T>(collection: Collection, valeur: T): void {
    const cle = this.cle(collection);
    if (cle === null) return;
    this.ecrireBrut(cle, JSON.stringify(valeur));
  }

  /** Supprime toutes les clés du cache, tous comptes confondus. */
  purger(): void {
    const aSupprimer: string[] = [];
    try {
      for (let i = 0; i < this.stockage.length; i += 1) {
        const cle = this.stockage.key(i);
        if (cle !== null && cle.startsWith(`${PREFIXE}:`)) aSupprimer.push(cle);
      }
    } catch {
      return;
    }
    for (const cle of aSupprimer) {
      try {
        this.stockage.removeItem(cle);
      } catch {
        // Stockage indisponible : rien de mieux à faire que continuer.
      }
    }
  }

  private cle(collection: Collection): string | null {
    return this.utilisateurId === null
      ? null
      : `${PREFIXE}:${this.utilisateurId}:${collection}`;
  }

  private lireBrut(cle: string): string | null {
    try {
      return this.stockage.getItem(cle);
    } catch {
      return null;
    }
  }

  private ecrireBrut(cle: string, valeur: string): void {
    try {
      this.stockage.setItem(cle, valeur);
    } catch {
      // Navigation privée ou quota dépassé : le cache est un confort, pas la
      // source de vérité. On n'interrompt pas l'utilisateur pour ça.
    }
  }
}

/** Instance utilisée par l'application. */
export const localCache = new LocalCache(
  typeof localStorage === 'undefined'
    ? { length: 0, key: () => null, getItem: () => null, setItem: () => {}, removeItem: () => {} }
    : localStorage
);
```

- [ ] **Step 4 : Lancer les tests et constater le succès**

Run: `npm test -- tests/localCache.test.ts`
Expected: SUCCÈS — 9 tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/services/localCache.ts tests/localCache.test.ts
git commit -m "feat: cache local cloisonné par compte, purgé au changement d'utilisateur"
```

---

### Task 4: Validation des champs de société

Fonctions pures, extraites pour que l'assistant de la tâche 7 n'ait plus qu'à afficher des messages.

**Files:**
- Create: `src/utils/companyValidation.ts`
- Create: `tests/companyValidation.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type ErreursChamps = Partial<Record<string, string>>`
  - `normaliserNumero(valeur: string): string`
  - `validerIdentite(v: { name: string }): ErreursChamps`
  - `validerIdentifiants(v: { ice: string; ifCode: string; rc: string }): ErreursChamps`
  - `validerCoordonnees(v: { city: string; phone: string }): ErreursChamps`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// tests/companyValidation.test.ts
import { describe, expect, it } from 'vitest';
import {
  normaliserNumero,
  validerCoordonnees,
  validerIdentifiants,
  validerIdentite,
} from '../src/utils/companyValidation';

describe('normaliserNumero', () => {
  it('retire espaces, tirets et points', () => {
    expect(normaliserNumero(' 002 345-678.000092 ')).toBe('002345678000092');
  });
});

describe('validerIdentite', () => {
  it('accepte un nom renseigné', () => {
    expect(validerIdentite({ name: 'ATLAS SARL' })).toEqual({});
  });

  it('refuse un nom vide', () => {
    expect(validerIdentite({ name: '   ' }).name).toBeTruthy();
  });
});

describe('validerIdentifiants', () => {
  const valides = { ice: '002345678000092', ifCode: '45892134', rc: '152433' };

  it('accepte des identifiants conformes', () => {
    expect(validerIdentifiants(valides)).toEqual({});
  });

  it('accepte un ICE saisi avec des espaces', () => {
    expect(validerIdentifiants({ ...valides, ice: '002 345 678 000 092' })).toEqual({});
  });

  it('refuse un ICE de 14 chiffres', () => {
    expect(validerIdentifiants({ ...valides, ice: '00234567800009' }).ice).toBeTruthy();
  });

  it('refuse un ICE de 16 chiffres', () => {
    expect(validerIdentifiants({ ...valides, ice: '0023456780000921' }).ice).toBeTruthy();
  });

  it('refuse un ICE contenant des lettres', () => {
    expect(validerIdentifiants({ ...valides, ice: '00234567800009A' }).ice).toBeTruthy();
  });

  it('refuse un ICE vide', () => {
    expect(validerIdentifiants({ ...valides, ice: '' }).ice).toBeTruthy();
  });

  it('refuse un IF non numérique', () => {
    expect(validerIdentifiants({ ...valides, ifCode: 'IF-4589' }).ifCode).toBeTruthy();
  });

  it('refuse un RC vide', () => {
    expect(validerIdentifiants({ ...valides, rc: '' }).rc).toBeTruthy();
  });
});

describe('validerCoordonnees', () => {
  it('accepte une ville et un téléphone marocain', () => {
    expect(validerCoordonnees({ city: 'Casablanca', phone: '+212 5 22 45 67 89' })).toEqual(
      {}
    );
  });

  it('refuse une ville vide', () => {
    expect(validerCoordonnees({ city: '', phone: '+212522456789' }).city).toBeTruthy();
  });

  it('refuse un téléphone trop court', () => {
    expect(validerCoordonnees({ city: 'Rabat', phone: '0522' }).phone).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer les tests et constater l'échec**

Run: `npm test -- tests/companyValidation.test.ts`
Expected: ÉCHEC — module introuvable.

- [ ] **Step 3 : Écrire l'implémentation**

```ts
// src/utils/companyValidation.ts

/**
 * Validation des champs de société exigés pour émettre une facture valide
 * au Maroc. Fonctions pures : l'assistant de première connexion n'a plus
 * qu'à afficher les messages renvoyés.
 */

export type ErreursChamps = Partial<Record<string, string>>;

/** Retire les séparateurs de saisie courants d'un identifiant numérique. */
export function normaliserNumero(valeur: string): string {
  return valeur.replace(/[\s.\-/]/g, '');
}

export function validerIdentite(v: { name: string }): ErreursChamps {
  const erreurs: ErreursChamps = {};
  if (!v.name.trim()) erreurs.name = 'La raison sociale est obligatoire.';
  return erreurs;
}

export function validerIdentifiants(v: {
  ice: string;
  ifCode: string;
  rc: string;
}): ErreursChamps {
  const erreurs: ErreursChamps = {};

  const ice = normaliserNumero(v.ice);
  if (!ice) erreurs.ice = 'L’ICE est obligatoire sur une facture marocaine.';
  else if (!/^\d{15}$/.test(ice)) erreurs.ice = 'L’ICE comporte exactement 15 chiffres.';

  const identifiantFiscal = normaliserNumero(v.ifCode);
  if (!identifiantFiscal) erreurs.ifCode = 'L’identifiant fiscal est obligatoire.';
  else if (!/^\d+$/.test(identifiantFiscal))
    erreurs.ifCode = 'L’identifiant fiscal ne contient que des chiffres.';

  const registre = normaliserNumero(v.rc);
  if (!registre) erreurs.rc = 'Le registre de commerce est obligatoire.';
  else if (!/^\d+$/.test(registre))
    erreurs.rc = 'Le registre de commerce ne contient que des chiffres.';

  return erreurs;
}

export function validerCoordonnees(v: { city: string; phone: string }): ErreursChamps {
  const erreurs: ErreursChamps = {};

  if (!v.city.trim()) erreurs.city = 'La ville est obligatoire.';

  const chiffres = v.phone.replace(/\D/g, '');
  if (!chiffres) erreurs.phone = 'Le téléphone est obligatoire.';
  else if (chiffres.length < 9) erreurs.phone = 'Ce numéro paraît incomplet.';

  return erreurs;
}
```

- [ ] **Step 4 : Lancer les tests et constater le succès**

Run: `npm test -- tests/companyValidation.test.ts`
Expected: SUCCÈS — 14 tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/utils/companyValidation.ts tests/companyValidation.test.ts
git commit -m "feat: validation des identifiants légaux de la société"
```

---

### Task 5: Bascule de `api.ts` vers Supabase direct

Le cœur du lot. Les **signatures publiques ne changent pas**, sauf `getCompany()` qui peut désormais renvoyer `null` — c'est précisément ce qui déclenchera l'assistant.

**Files:**
- Modify: `src/services/api.ts` (réécriture des entrailles ; suppression de `DEFAULT_COMPANY`, `DEFAULT_CUSTOMERS`, `DEFAULT_SUPPLIERS`, `DEFAULT_PRODUCTS`, `DEFAULT_DOCUMENTS` et de la classe `StorageService`)

**Interfaces:**
- Consumes: `supabase`, `utilisateurCourantId` (tâche 2) ; `localCache` (tâche 3).
- Produces:
  - `api.getCompany(): Promise<Company | null>` ← **signature modifiée**
  - `api.updateCompany(data: Partial<Company>): Promise<Company>`
  - `api.getCustomers / getSuppliers / getProducts / getDocuments: Promise<T[]>`
  - `api.saveCustomer / saveSupplier / saveProduct / saveDocument`
  - `api.deleteCustomer / deleteSupplier / deleteProduct / deleteDocument`
  - `api.convertDocument`, `api.computeDashboardStats` (inchangés)
  - `api.generateAiDescription`, `api.suggestAiPricing`, `api.polishCommercialText` (envoient désormais le jeton)
  - `api.horsLigne: boolean` — vrai après un échec réseau, pour le bandeau de la tâche 8
  - `localCache` réexporté sous le nom `localStore` pour ne pas toucher `App.tsx` tout de suite

- [ ] **Step 1 : Écrire le test de dégradation hors ligne**

```ts
// tests/apiOffline.test.ts
import { describe, expect, it } from 'vitest';
import { LocalCache, type CacheStorage } from '../src/services/localCache';

/**
 * Review Focus n° 4 : une panne réseau ne doit jamais produire d'écran vide.
 * On vérifie ici le contrat de repli sur lequel `api.ts` s'appuie — lire le
 * cache plutôt que propager l'exception.
 */
function creerStockage(): CacheStorage {
  const contenu = new Map<string, string>();
  return {
    get length() {
      return contenu.size;
    },
    key: (i) => Array.from(contenu.keys())[i] ?? null,
    getItem: (k) => contenu.get(k) ?? null,
    setItem: (k, v) => void contenu.set(k, v),
    removeItem: (k) => void contenu.delete(k),
  };
}

/** Reproduit la stratégie de repli appliquée dans api.ts. */
async function lireAvecRepli<T>(
  distant: () => Promise<T>,
  cache: LocalCache,
  collection: 'customers',
  defaut: T
): Promise<T> {
  try {
    const valeur = await distant();
    cache.ecrire(collection, valeur);
    return valeur;
  } catch {
    return cache.lire(collection, defaut);
  }
}

describe('repli hors ligne', () => {
  it('sert le cache quand le réseau échoue', async () => {
    const cache = new LocalCache(creerStockage());
    cache.definirUtilisateur('alice');

    await lireAvecRepli(async () => [{ id: 'c1' }], cache, 'customers', []);

    const resultat = await lireAvecRepli<{ id: string }[]>(
      () => Promise.reject(new Error('réseau indisponible')),
      cache,
      'customers',
      []
    );
    expect(resultat).toEqual([{ id: 'c1' }]);
  });

  it('renvoie le défaut si le cache est vide et le réseau absent', async () => {
    const cache = new LocalCache(creerStockage());
    cache.definirUtilisateur('alice');

    const resultat = await lireAvecRepli<{ id: string }[]>(
      () => Promise.reject(new Error('réseau indisponible')),
      cache,
      'customers',
      []
    );
    expect(resultat).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer et constater l'échec**

Run: `npm test -- tests/apiOffline.test.ts`
Expected: ÉCHEC — le module `localCache` existe (tâche 3) mais le fichier de test n'existe pas encore ; après création, il doit passer. Si la tâche 3 n'est pas faite, l'import échoue.

- [ ] **Step 3 : Réécrire les entrailles de `api.ts`**

Remplacer l'intégralité du fichier par la structure suivante. **Les constantes de démonstration et la classe `StorageService` disparaissent** (environ 400 lignes supprimées).

```ts
import {
  CommercialDocument,
  Company,
  Customer,
  DashboardStats,
  DocumentType,
  Product,
  Supplier,
} from '../types';
import { generateNextDocNumber } from '../utils/formatters';
import { localCache } from './localCache';
import { supabase, utilisateurCourantId } from './supabaseClient';

/**
 * Accès aux données.
 *
 * Le front parle directement à Supabase : le cloisonnement entre comptes est
 * assuré par les politiques RLS de PostgreSQL, pas par ce fichier. `owner_id`
 * est envoyé explicitement, mais PostgreSQL rejette toute valeur autre que
 * celle du jeton (`with check (owner_id = auth.uid())`).
 *
 * `localCache` sert de repli en lecture quand le réseau manque, et de source
 * synchrone pour `computeDashboardStats()`.
 */

/** Réexport : `App.tsx` et les composants continuent d'utiliser ce nom. */
export const localStore = localCache;

/** Passe à `true` dès qu'une lecture distante échoue ; remis à `false` au succès. */
export const etatReseau = { horsLigne: false };

type TableCollection = 'fx_customers' | 'fx_suppliers' | 'fx_products' | 'fx_documents';

async function lireCollection<T>(
  table: TableCollection,
  collection: 'customers' | 'suppliers' | 'products' | 'documents'
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .order('created_at', { ascending: false });

  if (error) {
    etatReseau.horsLigne = true;
    return localCache.lire<T[]>(collection, []);
  }

  etatReseau.horsLigne = false;
  const liste = (data ?? []).map((ligne) => ligne.data as T);
  localCache.ecrire(collection, liste);
  return liste;
}

async function enregistrer<T extends { id: string }>(
  table: TableCollection,
  collection: 'customers' | 'suppliers' | 'products' | 'documents',
  entite: T
): Promise<T> {
  const ownerId = await utilisateurCourantId();
  if (!ownerId) throw new Error('Session expirée. Veuillez vous reconnecter.');

  const { error } = await supabase
    .from(table)
    .upsert(
      { owner_id: ownerId, id: entite.id, data: entite },
      { onConflict: 'owner_id,id' }
    );
  if (error) throw new Error(error.message);

  const liste = localCache.lire<T[]>(collection, []);
  const index = liste.findIndex((item) => item.id === entite.id);
  if (index >= 0) liste[index] = entite;
  else liste.unshift(entite);
  localCache.ecrire(collection, liste);

  return entite;
}

async function supprimer(
  table: TableCollection,
  collection: 'customers' | 'suppliers' | 'products' | 'documents',
  id: string
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);

  const liste = localCache.lire<{ id: string }[]>(collection, []);
  localCache.ecrire(
    collection,
    liste.filter((item) => item.id !== id)
  );
}

/** Joint le jeton de session aux appels de la fonction Express. */
async function enteteAuth(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  return jeton ? { Authorization: `Bearer ${jeton}` } : {};
}

export const api = {
  // ---------- Société ----------

  /** `null` si le compte n'a pas encore de société : déclenche l'assistant. */
  async getCompany(): Promise<Company | null> {
    const { data, error } = await supabase.from('fx_company').select('data').maybeSingle();

    if (error) {
      etatReseau.horsLigne = true;
      return localCache.lire<Company | null>('company', null);
    }

    etatReseau.horsLigne = false;
    if (!data) return null;

    const societe = data.data as Company;
    localCache.ecrire('company', societe);
    return societe;
  },

  async updateCompany(donnees: Partial<Company>): Promise<Company> {
    const ownerId = await utilisateurCourantId();
    if (!ownerId) throw new Error('Session expirée. Veuillez vous reconnecter.');

    const actuelle = localCache.lire<Company | null>('company', null);
    const fusionnee = { ...(actuelle ?? {}), ...donnees } as Company;

    const { error } = await supabase
      .from('fx_company')
      .upsert({ owner_id: ownerId, data: fusionnee }, { onConflict: 'owner_id' });
    if (error) throw new Error(error.message);

    localCache.ecrire('company', fusionnee);
    return fusionnee;
  },

  // ---------- Collections ----------
  getCustomers: () => lireCollection<Customer>('fx_customers', 'customers'),
  saveCustomer: (c: Customer) => enregistrer('fx_customers', 'customers', c),
  deleteCustomer: (id: string) => supprimer('fx_customers', 'customers', id),

  getSuppliers: () => lireCollection<Supplier>('fx_suppliers', 'suppliers'),
  saveSupplier: (s: Supplier) => enregistrer('fx_suppliers', 'suppliers', s),
  deleteSupplier: (id: string) => supprimer('fx_suppliers', 'suppliers', id),

  getProducts: () => lireCollection<Product>('fx_products', 'products'),
  saveProduct: (p: Product) => enregistrer('fx_products', 'products', p),
  deleteProduct: (id: string) => supprimer('fx_products', 'products', id),

  getDocuments: () => lireCollection<CommercialDocument>('fx_documents', 'documents'),
  saveDocument: (d: CommercialDocument) => enregistrer('fx_documents', 'documents', d),
  deleteDocument: (id: string) => supprimer('fx_documents', 'documents', id),

  // ---------- Logique métier ----------
  // `convertDocument` et `computeDashboardStats` conservent leur corps actuel.
  // Seule la source de lecture change, selon cette correspondance exacte :
  //
  //   localStore.getCompany()    ->  localCache.lire<Company | null>('company', null)
  //   localStore.getCustomers()  ->  localCache.lire<Customer[]>('customers', [])
  //   localStore.getSuppliers()  ->  localCache.lire<Supplier[]>('suppliers', [])
  //   localStore.getProducts()   ->  localCache.lire<Product[]>('products', [])
  //   localStore.getDocuments()  ->  localCache.lire<CommercialDocument[]>('documents', [])
  //   localStore.saveDocuments(x) -> localCache.ecrire('documents', x)
  //
  // `computeDashboardStats` doit tolérer une société absente : si
  // `localCache.lire('company', null)` renvoie null, utiliser 'MAD' comme devise
  // par défaut plutôt que de déréférencer `company.currency`.

  // ---------- IA : désormais authentifiée ----------
  async generateAiDescription(title: string, category: string): Promise<string> {
    const reponse = await fetch('/api/ai/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await enteteAuth()) },
      body: JSON.stringify({ title, category }),
    });
    if (!reponse.ok) throw new Error('Le service de description est indisponible.');
    const { result } = await reponse.json();
    return result as string;
  },

  async suggestAiPricing(
    title: string,
    category: string,
    purchasePrice?: number
  ): Promise<{ min: number; recommended: number; max: number; note: string }> {
    const reponse = await fetch('/api/ai/price-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await enteteAuth()) },
      body: JSON.stringify({ title, category, purchasePrice }),
    });
    if (!reponse.ok) throw new Error('Le service de suggestion tarifaire est indisponible.');
    return (await reponse.json()) as {
      min: number;
      recommended: number;
      max: number;
      note: string;
    };
  },

  async polishCommercialText(
    text: string,
    style: 'email' | 'terms' | 'relance'
  ): Promise<string> {
    const reponse = await fetch('/api/ai/text-polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await enteteAuth()) },
      body: JSON.stringify({ text, style }),
    });
    if (!reponse.ok) throw new Error('Le service de reformulation est indisponible.');
    const { result } = await reponse.json();
    return result as string;
  },
};
```

- [ ] **Step 4 : Lancer les tests et le typage**

Run: `npm test && npx tsc --noEmit`
Expected: les tests passent. **`tsc` signalera des erreurs dans `App.tsx`** sur `getCompany()` qui peut valoir `null` — c'est attendu et corrigé à la tâche 8.

- [ ] **Step 5 : Commit**

```bash
git add src/services/api.ts tests/apiOffline.test.ts
git commit -m "refactor: accès direct à Supabase, suppression des données de démonstration"
```

---

### Task 6: Écran de connexion et de création de compte

**Files:**
- Create: `src/components/AuthScreen.tsx`

**Interfaces:**
- Consumes: `supabase` (tâche 2).
- Produces: `<AuthScreen />`, sans props. Ne gère pas la redirection : `onAuthStateChange` dans `App.tsx` (tâche 8) s'en charge.
- Produces: `messageErreurAuth(brut: string): string` — traduction des messages Supabase.

- [ ] **Step 1 : Écrire le composant**

```tsx
// src/components/AuthScreen.tsx
import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

/**
 * Traduit les messages de Supabase, qui sont en anglais et parfois obscurs.
 * Un message d'erreur incompréhensible, c'est un appel à l'assistance.
 */
export function messageErreurAuth(brut: string): string {
  const m = brut.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cet e-mail. Utilisez « Se connecter ».';
  if (m.includes('invalid login credentials'))
    return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))
    return 'Ce compte attend une confirmation par e-mail. Contactez le support.';
  if (m.includes('password should be at least'))
    return 'Le mot de passe doit comporter au moins 8 caractères.';
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return 'Cette adresse e-mail n’est pas valide.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Patientez quelques minutes.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Connexion internet requise pour se connecter.';
  return 'La connexion a échoué. Réessayez dans un instant.';
}

type Mode = 'connexion' | 'inscription';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    setErreur(null);

    if (mode === 'inscription' && motDePasse.length < 8) {
      setErreur('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setEnCours(true);
    try {
      const { error } =
        mode === 'inscription'
          ? await supabase.auth.signUp({ email: email.trim(), password: motDePasse })
          : await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: motDePasse,
            });
      if (error) setErreur(messageErreurAuth(error.message));
      // En cas de succès, `onAuthStateChange` prend le relais dans App.tsx.
    } catch (e) {
      setErreur(messageErreurAuth(String(e)));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white">
            <FileText size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">FacturX Pro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Devis, factures et bons de livraison conformes.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(['connexion', 'inscription'] as Mode[]).map((valeur) => (
              <button
                key={valeur}
                type="button"
                onClick={() => {
                  setMode(valeur);
                  setErreur(null);
                }}
                className={`rounded-md py-2 text-sm font-semibold transition ${
                  mode === valeur
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {valeur === 'connexion' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <form onSubmit={soumettre} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label htmlFor="mdp" className="block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                id="mdp"
                type="password"
                required
                minLength={mode === 'inscription' ? 8 : undefined}
                autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              {mode === 'inscription' && (
                <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>
              )}
            </div>

            {erreur && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={enCours}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {enCours && <Loader2 size={16} className="animate-spin" />}
              {mode === 'inscription' ? 'Créer mon espace' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Vos données sont privées : chaque espace est cloisonné.
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2 : Écrire les tests de traduction des erreurs**

```ts
// tests/authMessages.test.ts
import { describe, expect, it } from 'vitest';
import { messageErreurAuth } from '../src/components/AuthScreen';

describe('messageErreurAuth', () => {
  it('traduit un compte déjà inscrit', () => {
    expect(messageErreurAuth('User already registered')).toContain('existe déjà');
  });

  it('traduit des identifiants invalides sans préciser lequel est faux', () => {
    const message = messageErreurAuth('Invalid login credentials');
    expect(message).toContain('incorrect');
    expect(message.toLowerCase()).not.toContain('mot de passe incorrect pour');
  });

  it('traduit une panne réseau', () => {
    expect(messageErreurAuth('TypeError: Failed to fetch')).toContain('internet');
  });

  it('traduit une limitation de débit', () => {
    expect(messageErreurAuth('Email rate limit exceeded')).toContain('tentatives');
  });

  it('donne un message générique pour une erreur inconnue', () => {
    expect(messageErreurAuth('quelque chose d’imprévu')).toContain('échoué');
  });
});
```

- [ ] **Step 3 : Lancer les tests**

Run: `npm test -- tests/authMessages.test.ts`
Expected: SUCCÈS — 5 tests passent.

- [ ] **Step 4 : Commit**

```bash
git add src/components/AuthScreen.tsx tests/authMessages.test.ts
git commit -m "feat: écran de connexion et de création de compte"
```

---

### Task 7: Assistant de première connexion

**Files:**
- Create: `src/components/OnboardingWizard.tsx`

**Interfaces:**
- Consumes: `validerIdentite`, `validerIdentifiants`, `validerCoordonnees`, `ErreursChamps` (tâche 4) ; `api.updateCompany` (tâche 5) ; `supabase` (tâche 2).
- Produces: `<OnboardingWizard onTermine={(societe: Company) => void} />`.
- Produces: `messageEchecEnregistrement(erreur: unknown): string` — exportée et testée.

- [ ] **Step 1 : Écrire le test qui échoue**

Review Focus n° 5 : une session expirée pendant la saisie ne doit pas laisser
l'utilisateur devant un message opaque, ni lui faire croire que sa société est
enregistrée. La décision est extraite en fonction pure pour être testable.

```ts
// tests/onboardingMessages.test.ts
import { describe, expect, it } from 'vitest';
import { messageEchecEnregistrement } from '../src/components/OnboardingWizard';

describe('messageEchecEnregistrement', () => {
  it('invite à se reconnecter quand la session a expiré', () => {
    const message = messageEchecEnregistrement(
      new Error('Session expirée. Veuillez vous reconnecter.')
    );
    expect(message).toContain('reconnect');
    // L'utilisateur doit savoir que sa saisie n'est pas perdue.
    expect(message).toContain('conservées');
  });

  it('reconnaît aussi un refus d’autorisation comme une session invalide', () => {
    expect(messageEchecEnregistrement(new Error('JWT expired'))).toContain('reconnect');
  });

  it('parle de connexion pour une panne réseau', () => {
    const message = messageEchecEnregistrement(new Error('TypeError: Failed to fetch'));
    expect(message).toContain('connexion');
    expect(message).not.toContain('reconnect');
  });

  it('reste compréhensible pour une erreur inconnue', () => {
    const message = messageEchecEnregistrement({ bizarre: true });
    expect(message).toContain('réessayez');
  });
});
```

- [ ] **Step 2 : Lancer le test et constater l'échec**

Run: `npm test -- tests/onboardingMessages.test.ts`
Expected: ÉCHEC — `messageEchecEnregistrement` n'est pas exportée.

- [ ] **Step 3 : Écrire le composant**

```tsx
// src/components/OnboardingWizard.tsx
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Company } from '../types';
import { api } from '../services/api';
import {
  normaliserNumero,
  validerCoordonnees,
  validerIdentifiants,
  validerIdentite,
  type ErreursChamps,
} from '../utils/companyValidation';

/**
 * Assistant de première connexion.
 *
 * Ne demande que le minimum légal pour émettre une facture marocaine valide.
 * Logo, cachet, signature, RIB, couleurs et mentions restent dans les
 * Paramètres Société : un formulaire de 28 champs au premier lancement ferait
 * fuir l'utilisateur, et c'est exactement ce qu'on cherche à éviter.
 */
interface Props {
  onTermine: (societe: Company) => void;
}

/**
 * Traduit un échec d'enregistrement en message actionnable.
 *
 * Extrait du composant pour être testable : c'est le seul endroit où
 * l'utilisateur apprend que sa session a expiré alors qu'il remplissait un
 * formulaire, et un message raté ici se solde par un appel à l'assistance.
 */
export function messageEchecEnregistrement(erreur: unknown): string {
  const brut = String(
    erreur instanceof Error ? erreur.message : JSON.stringify(erreur)
  ).toLowerCase();

  if (brut.includes('session') || brut.includes('jwt') || brut.includes('unauthorized')) {
    return 'Votre session a expiré. Reconnectez-vous — vos saisies sont conservées à l’écran.';
  }
  if (brut.includes('failed to fetch') || brut.includes('network')) {
    return 'Enregistrement impossible : vérifiez votre connexion, puis réessayez.';
  }
  return 'Enregistrement impossible pour le moment. Réessayez dans un instant.';
}

const ETAPES = ['Identité', 'Identifiants légaux', 'Coordonnées'] as const;

export const OnboardingWizard: React.FC<Props> = ({ onTermine }) => {
  const [etape, setEtape] = useState(0);
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [champs, setChamps] = useState({
    name: '',
    legalForm: '',
    ice: '',
    ifCode: '',
    rc: '',
    patente: '',
    cnss: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
  });

  const modifier = (cle: keyof typeof champs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setChamps((precedent) => ({ ...precedent, [cle]: e.target.value }));

  const validerEtape = (): ErreursChamps => {
    if (etape === 0) return validerIdentite(champs);
    if (etape === 1) return validerIdentifiants(champs);
    return validerCoordonnees(champs);
  };

  const suivant = async () => {
    const trouvees = validerEtape();
    setErreurs(trouvees);
    if (Object.keys(trouvees).length > 0) return;

    if (etape < ETAPES.length - 1) {
      setEtape(etape + 1);
      return;
    }

    setEnCours(true);
    setErreurGlobale(null);
    try {
      const societe = await api.updateCompany({
        id: `comp-${Date.now()}`,
        name: champs.name.trim(),
        legalForm: champs.legalForm.trim(),
        ice: normaliserNumero(champs.ice),
        ifCode: normaliserNumero(champs.ifCode),
        rc: normaliserNumero(champs.rc),
        patente: normaliserNumero(champs.patente),
        cnss: normaliserNumero(champs.cnss),
        address: champs.address.trim(),
        city: champs.city.trim(),
        postalCode: champs.postalCode.trim(),
        country: 'Maroc',
        phone: champs.phone.trim(),
        email: champs.email.trim(),
        website: '',
        rib: '',
        bankName: '',
        currency: 'MAD',
        currencySymbol: 'DH',
        defaultVatRate: 20,
        primaryColor: '#4f46e5',
        headerText: '',
        footerText: '',
        invoiceTerms:
          'Paiement à 30 jours à réception de facture. Tout retard donnera lieu à une pénalité légale.',
        quotationTerms:
          'Ce devis est valable pour une durée de 30 jours à compter de sa date d’émission.',
      } as Company);

      onTermine(societe);
    } catch (e) {
      // Review Focus n° 5 : on reste dans l'assistant. Jamais de bascule vers
      // une application sans société — l'utilisateur émettrait des factures vides.
      setErreurGlobale(messageEchecEnregistrement(e));
    } finally {
      setEnCours(false);
    }
  };

  const champ = (
    cle: keyof typeof champs,
    etiquette: string,
    options: { requis?: boolean; aide?: string } = {}
  ) => (
    <div>
      <label htmlFor={cle} className="block text-sm font-medium text-slate-700">
        {etiquette}
        {options.requis && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={cle}
        value={champs[cle]}
        onChange={modifier(cle)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      {erreurs[cle] ? (
        <p className="mt-1 text-xs text-rose-600">{erreurs[cle]}</p>
      ) : options.aide ? (
        <p className="mt-1 text-xs text-slate-500">{options.aide}</p>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Étape {etape + 1} sur {ETAPES.length}
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{ETAPES[etape]}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ces informations figureront sur vos factures. Vous pourrez les modifier
          à tout moment dans les Paramètres.
        </p>

        <div className="my-6 flex gap-1.5">
          {ETAPES.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index <= etape ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4">
          {etape === 0 && (
            <>
              {champ('name', 'Raison sociale', { requis: true })}
              {champ('legalForm', 'Forme juridique', {
                aide: 'Par exemple : SARL au capital de 100 000 DH',
              })}
            </>
          )}

          {etape === 1 && (
            <>
              {champ('ice', 'ICE', { requis: true, aide: '15 chiffres' })}
              {champ('ifCode', 'Identifiant fiscal (IF)', { requis: true })}
              {champ('rc', 'Registre de commerce (RC)', { requis: true })}
              {champ('patente', 'Patente')}
              {champ('cnss', 'CNSS')}
            </>
          )}

          {etape === 2 && (
            <>
              {champ('address', 'Adresse')}
              <div className="grid grid-cols-2 gap-4">
                {champ('city', 'Ville', { requis: true })}
                {champ('postalCode', 'Code postal')}
              </div>
              {champ('phone', 'Téléphone', { requis: true })}
              {champ('email', 'E-mail professionnel')}
            </>
          )}
        </div>

        {erreurGlobale && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {erreurGlobale}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEtape(Math.max(0, etape - 1))}
            disabled={etape === 0 || enCours}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 disabled:invisible"
          >
            <ArrowLeft size={16} /> Retour
          </button>

          <button
            type="button"
            onClick={suivant}
            disabled={enCours}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {enCours && <Loader2 size={16} className="animate-spin" />}
            {etape === ETAPES.length - 1 ? (
              <>
                <Check size={16} /> Terminer
              </>
            ) : (
              <>
                Continuer <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4 : Lancer le test et constater le succès**

Run: `npm test -- tests/onboardingMessages.test.ts`
Expected: SUCCÈS — 4 tests passent.

- [ ] **Step 5 : Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: plus d'erreur sur ce fichier. Celles de `App.tsx` subsistent jusqu'à la tâche 8.

- [ ] **Step 6 : Commit**

```bash
git add src/components/OnboardingWizard.tsx tests/onboardingMessages.test.ts
git commit -m "feat: assistant de première connexion en trois étapes"
```

---

### Task 8: Aiguillage de session

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` (tâche 2) ; `localCache` (tâche 3) ; `api`, `etatReseau` (tâche 5) ; `AuthScreen` (tâche 6) ; `OnboardingWizard` (tâche 7).
- Produces: une application qui n'affiche son contenu qu'à un compte authentifié pourvu d'une société.

- [ ] **Step 1 : Ajouter les imports et l'état de session**

En tête de `src/App.tsx` :

```tsx
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { localCache } from './services/localCache';
import { etatReseau } from './services/api';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
```

Remplacer l'initialisation synchrone des lignes 31-35 — `localStore.getCompany()` n'existe plus — par :

```tsx
  // `undefined` = session en cours de lecture ; `null` = non connecté.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [societeChargee, setSocieteChargee] = useState(false);

  const [company, setCompany] = useState<Company | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<CommercialDocument[]>([]);
```

- [ ] **Step 2 : Suivre les changements d'authentification**

```tsx
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // Purge le cache si un autre compte s'était connecté sur cet appareil.
      localCache.definirUtilisateur(data.session?.user.id ?? null);
      setSession(data.session);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => {
      // Toute session nulle purge le cache — déconnexion volontaire comme
      // expiration de jeton. Les deux sont indiscernables ici, et conserver le
      // cache après péremption laisserait les données lisibles sur un
      // téléphone partagé (voir l'arbitrage en §10 de la spec).
      localCache.definirUtilisateur(nouvelle?.user.id ?? null);
      setSession(nouvelle);
      setSocieteChargee(false);
      if (!nouvelle) {
        setCompany(null);
        setCustomers([]);
        setSuppliers([]);
        setProducts([]);
        setDocuments([]);
      }
    });

    return () => abonnement.subscription.unsubscribe();
  }, []);
```

- [ ] **Step 3 : Ne charger les données qu'une fois connecté**

Conditionner l'`useEffect` de chargement existant (lignes 50-68) à la présence d'une session :

```tsx
  useEffect(() => {
    if (!session) return;
    let annule = false;

    (async () => {
      const [societe, clients, fournisseurs, articles, docs] = await Promise.all([
        api.getCompany(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getProducts(),
        api.getDocuments(),
      ]);
      if (annule) return;
      setCompany(societe);
      setCustomers(clients);
      setSuppliers(fournisseurs);
      setProducts(articles);
      setDocuments(docs);
      setSocieteChargee(true);
    })();

    return () => {
      annule = true;
    };
  }, [session]);
```

- [ ] **Step 4 : Insérer les aiguillages avant le rendu principal**

Juste avant le `return` principal du composant `App` :

```tsx
  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Chargement…
      </div>
    );
  }

  if (session === null) return <AuthScreen />;

  if (!societeChargee) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Ouverture de votre espace…
      </div>
    );
  }

  if (company === null) {
    return <OnboardingWizard onTermine={(societe) => setCompany(societe)} />;
  }
```

- [ ] **Step 5 : Ajouter le bandeau hors ligne et la déconnexion**

Dans le rendu principal, avant `<InstallPrompt />` :

```tsx
      {etatReseau.horsLigne && (
        <div className="fixed inset-x-0 top-0 z-40 bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-white print:hidden">
          Hors ligne — consultation uniquement. Vos modifications ne sont pas enregistrées.
        </div>
      )}
```

Et passer au composant `Header` (ou `Sidebar`, selon l'emplacement retenu) un bouton de déconnexion :

```tsx
  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    // `onAuthStateChange` purge le cache et vide l'état.
  };
```

- [ ] **Step 6 : Remplacer les lectures de cache devenues obsolètes**

Rechercher toute occurrence restante de `localStore.get` dans `src/` et la remplacer par l'état React correspondant ou par `localCache.lire(...)` :

```bash
grep -rn "localStore\." src/
```

Expected après correction : aucune occurrence, ou seulement des `localCache.lire`.

- [ ] **Step 7 : Vérifier le typage et les tests**

Run: `npx tsc --noEmit && npm test`
Expected: **aucune erreur** — c'est à cette tâche que l'arbre redevient sain.

- [ ] **Step 8 : Vérifier le parcours en local**

Run: `npm run dev`

1. Ouvrir `http://localhost:3000` → l'écran de connexion s'affiche.
2. Créer un compte → l'assistant apparaît.
3. Remplir les trois étapes → l'application s'ouvre, **vide**.
4. Créer un client, recharger la page → il est toujours là.
5. Se déconnecter, créer un **second** compte → l'assistant réapparaît, et le client du premier compte est **invisible**.
6. Se reconnecter au premier compte → son client est de retour.

L'étape 5 est la vérification manuelle du Review Focus n° 3.

- [ ] **Step 9 : Commit**

```bash
git add src/App.tsx
git commit -m "feat: aiguillage de session, assistant au premier lancement, bandeau hors ligne"
```

---

### Task 9: Nettoyage du serveur et verrou sur les routes IA

**Files:**
- Modify: `app.ts`
- Modify: `supabase.ts`

**Interfaces:**
- Consumes: rien du front.
- Produces: `app.ts` réduit à `/api/health`, `/api/ai/*` (authentifiées) et `/api/database/*-schema`.

- [ ] **Step 1 : Supprimer les routes de données**

Retirer de `app.ts` : la couche `store`, les types `Collection` et `TABLES`, les fonctions `loadDb`/`saveDb`/`fallback`/`online`, la constante `DB_FILE`, et les routes `/api/company`, `/api/customers`, `/api/suppliers`, `/api/products`, `/api/documents`, `/api/backup/export`, `/api/backup/restore`.

`BackupRestore.tsx` a été vérifié : il n'appelle **aucune** route serveur, il construit tout côté client. Leur retrait ne casse rien.

- [ ] **Step 2 : Ajouter le verrou d'authentification**

```ts
/**
 * Exige un jeton Supabase valide.
 *
 * Sans ce verrou, les routes IA sont ouvertes à tous : n'importe qui peut les
 * appeler et consommer le quota Gemini du projet. La vérification coûte un
 * aller-retour vers Supabase, ce qui est négligeable devant un appel à Gemini.
 */
async function exigerUtilisateur(
  req: express.Request,
  res: express.Response
): Promise<boolean> {
  const entete = String(req.headers.authorization ?? '');
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : '';

  if (!jeton) {
    res.status(401).json({ error: 'Authentification requise.' });
    return false;
  }

  try {
    const reponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${jeton}`,
      },
    });
    if (!reponse.ok) {
      res.status(401).json({ error: 'Session invalide ou expirée.' });
      return false;
    }
    return true;
  } catch (e) {
    console.error('[auth] vérification du jeton impossible :', e);
    res.status(503).json({ error: 'Vérification de session indisponible.' });
    return false;
  }
}
```

Puis, en première ligne de chacune des trois routes `/api/ai/*` :

```ts
  if (!(await exigerUtilisateur(req, res))) return;
```

- [ ] **Step 3 : Réduire `supabase.ts`**

Ne conserver que `supabaseUrl()`, `serviceKey()`, `isSupabaseConfigured()`, `headers()`, `request()` et `healthCheck()`. Supprimer `list`, `upsert`, `replaceAll`, `remove`, `getCompany`, `saveCompany` et le type `TableName` : le front ne passe plus par le serveur pour ses données.

Adapter `healthCheck()` pour sonder `fx_company` avec `select=owner_id` (la colonne `id` n'existe plus sur cette table).

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit && npm test`
Expected: aucune erreur.

Run: `npm run dev` puis :

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s -X POST http://127.0.0.1:3000/api/ai/describe \
  -H "Content-Type: application/json" -d '{"title":"test","category":"test"}'
```

Expected: `/api/health` répond ; l'appel IA **sans jeton** renvoie `401 Authentification requise.`

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/customers
```

Expected: `404` — la route n'existe plus.

- [ ] **Step 5 : Commit**

```bash
git add app.ts supabase.ts
git commit -m "refactor: serveur réduit à l'IA et au diagnostic, routes IA authentifiées"
```

---

### Task 10: Configuration, déploiement et vérification finale

**Files:**
- Modify: `README.md`, `.wolf/anatomy.md`, `.wolf/cerebrum.md`, `.wolf/memory.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: une production fonctionnelle et cloisonnée.

- [ ] **Step 1 : Configurer Supabase**

- *Authentication → Providers → Email* : activé, **Confirm email OFF**.
- *Authentication → URL Configuration → Site URL* : `https://facturte-digitale.vercel.app`.
- Longueur minimale du mot de passe : **8**.

- [ ] **Step 2 : Déclarer les variables au build sur Vercel**

```bash
SU=$(grep '^VITE_SUPABASE_URL' .env | cut -d'"' -f2)
AK=$(grep '^VITE_SUPABASE_ANON_KEY' .env | cut -d'"' -f2)

for env in production preview; do
  printf '%s' "$SU" | npx vercel@latest env add VITE_SUPABASE_URL "$env" --force --scope easydigia
  printf '%s' "$AK" | npx vercel@latest env add VITE_SUPABASE_ANON_KEY "$env" --force --scope easydigia
done
```

> Non marquées `--sensitive` : ces valeurs finissent dans le bundle, les masquer dans l'interface Vercel n'apporterait qu'une fausse impression de secret.

- [ ] **Step 3 : Déployer en préproduction**

```bash
npx vercel@latest deploy --scope easydigia --yes
```

- [ ] **Step 4 : Vérifier la préproduction**

Sur l'URL renvoyée :

```bash
npx vercel@latest curl "<url>/api/health" --scope easydigia
npx vercel@latest curl "<url>/api/customers" -o /dev/null -w "%{http_code}\n" --scope easydigia
```

Expected: `/api/health` répond ; `/api/customers` renvoie **404**.

Puis, dans un navigateur : créer un compte, parcourir l'assistant, créer un client.

- [ ] **Step 5 : Rejouer le test d'étanchéité contre la base de production**

```bash
set -a && . ./.env && set +a && npm test
```

Expected: **tous** les tests passent, y compris les 7 de `rls-isolation`. C'est la vérification qui compte le plus avant une mise en production.

- [ ] **Step 6 : Promouvoir en production**

```bash
npx vercel@latest deploy --prod --scope easydigia --yes
```

- [ ] **Step 7 : Documenter**

Ajouter à `README.md` une section « Comptes et espaces professionnels » couvrant : l'inscription libre par e-mail et mot de passe, le cloisonnement par RLS (et le fait que `service_role` ne touche plus aux données), l'assistant de première connexion, le réglage *Confirm email OFF*, les variables `VITE_*` requises au build, et le lancement du test d'étanchéité.

Mettre à jour `.wolf/anatomy.md` (nouveaux fichiers, chaîne de persistance devenue front → Supabase), `.wolf/cerebrum.md` (`service_role` interdite au front ; ne jamais remplacer une politique RLS par un filtre applicatif) et `.wolf/memory.md` (entrée datée).

- [ ] **Step 8 : Commit**

```bash
git add README.md .wolf/
git commit -m "docs: comptes, cloisonnement par RLS et première connexion"
git push origin main
```

- [ ] **Step 9 : À votre charge — vérifications sur appareil réel**

1. Depuis WhatsApp sur un téléphone, ouvrir le lien, installer l'application, créer un compte et émettre une facture — **sans aide**. C'est le critère de réussite du projet.
2. Vérifier qu'un **mot de passe oublié** est bien l'impasse annoncée (§16 de la spec) et décider si Resend doit être branché tout de suite.
