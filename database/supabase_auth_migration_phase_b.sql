-- ==========================================================
-- FACTURES DIGITALE — Cloisonnement, PHASE B
-- ==========================================================
-- À N'EXÉCUTER QU'APRÈS :
--   1. la phase A (supabase_auth_migration_phase_a.sql)
--   2. la création du compte propriétaire dans
--      Supabase Dashboard > Authentication > Users > Add user
--      (cocher « Auto Confirm User », relever l'UUID affiché)
--
-- AVANT D'EXÉCUTER : remplacer les CINQ occurrences de
-- <UUID-DU-COMPTE> par l'UUID relevé.
--
-- Cette phase durcit les contraintes sur des données réelles.
-- Une sauvegarde doit exister dans sauvegardes/.
-- Le tout tient dans une transaction : en cas d'erreur, rien
-- n'est appliqué.
-- ==========================================================

begin;

-- ---------- 1. Rattacher les données existantes ----------
update public.fx_company   set owner_id = '<UUID-DU-COMPTE>' where owner_id is null;
update public.fx_customers set owner_id = '<UUID-DU-COMPTE>' where owner_id is null;
update public.fx_suppliers set owner_id = '<UUID-DU-COMPTE>' where owner_id is null;
update public.fx_products  set owner_id = '<UUID-DU-COMPTE>' where owner_id is null;
update public.fx_documents set owner_id = '<UUID-DU-COMPTE>' where owner_id is null;

-- Garde-fou : interrompt la transaction si une ligne n'a pas de
-- propriétaire. Sans lui, le « set not null » ci-dessous échouerait plus
-- loin avec un message nettement moins clair.
do $$
declare orphelines int;
begin
  select (select count(*) from public.fx_company   where owner_id is null)
       + (select count(*) from public.fx_customers where owner_id is null)
       + (select count(*) from public.fx_suppliers where owner_id is null)
       + (select count(*) from public.fx_products  where owner_id is null)
       + (select count(*) from public.fx_documents where owner_id is null)
    into orphelines;
  if orphelines > 0 then
    raise exception 'Migration interrompue : % ligne(s) sans owner_id.', orphelines;
  end if;
end;
$$;

-- ---------- 2. Rendre la colonne obligatoire ----------
alter table public.fx_company   alter column owner_id set not null;
alter table public.fx_customers alter column owner_id set not null;
alter table public.fx_suppliers alter column owner_id set not null;
alter table public.fx_products  alter column owner_id set not null;
alter table public.fx_documents alter column owner_id set not null;

-- ---------- 3. Société : le compte devient la clé ----------
-- La contrainte « singleton » n'a plus de sens : une société PAR COMPTE.
alter table public.fx_company drop constraint if exists fx_company_singleton;
alter table public.fx_company drop constraint if exists fx_company_pkey;
alter table public.fx_company add primary key (owner_id);
-- L'ancien « id » devient décoratif ; il subsiste dans le JSONB « data ».
alter table public.fx_company drop column if exists id;

-- ---------- 4. Collections : clé composite (owner_id, id) ----------
-- Les identifiants sont générés par le navigateur sous la forme
-- cust-<horodatage> : ils ne sont PAS uniques entre comptes. La clé
-- composite rend les collisions inoffensives.
alter table public.fx_customers drop constraint if exists fx_customers_pkey;
alter table public.fx_customers add primary key (owner_id, id);
alter table public.fx_suppliers drop constraint if exists fx_suppliers_pkey;
alter table public.fx_suppliers add primary key (owner_id, id);
alter table public.fx_products  drop constraint if exists fx_products_pkey;
alter table public.fx_products  add primary key (owner_id, id);
alter table public.fx_documents drop constraint if exists fx_documents_pkey;
alter table public.fx_documents add primary key (owner_id, id);

-- ---------- 5. Index, en tête de owner_id ----------
drop index if exists public.fx_customers_name_idx;
drop index if exists public.fx_suppliers_name_idx;
drop index if exists public.fx_products_ref_idx;
drop index if exists public.fx_documents_number_idx;
drop index if exists public.fx_documents_type_idx;
drop index if exists public.fx_documents_date_idx;
drop index if exists public.fx_documents_customer_idx;

create index if not exists fx_customers_owner_name_idx   on public.fx_customers (owner_id, (data->>'name'));
create index if not exists fx_suppliers_owner_name_idx   on public.fx_suppliers (owner_id, (data->>'name'));
create index if not exists fx_products_owner_ref_idx     on public.fx_products  (owner_id, (data->>'reference'));
create index if not exists fx_documents_owner_number_idx on public.fx_documents (owner_id, (data->>'number'));
create index if not exists fx_documents_owner_type_idx   on public.fx_documents (owner_id, (data->>'type'));
create index if not exists fx_documents_owner_date_idx   on public.fx_documents (owner_id, (data->>'date') desc);

-- ==========================================================
-- 6. CLOISONNEMENT
-- ==========================================================
-- « using » filtre ce qui est lisible ; « with check » interdit d'écrire
-- au nom d'autrui. Les deux sont nécessaires : « using » seul laisserait
-- passer une insertion usurpée.
-- ==========================================================
alter table public.fx_company   enable row level security;
alter table public.fx_customers enable row level security;
alter table public.fx_suppliers enable row level security;
alter table public.fx_products  enable row level security;
alter table public.fx_documents enable row level security;

drop policy if exists fx_company_own   on public.fx_company;
drop policy if exists fx_customers_own on public.fx_customers;
drop policy if exists fx_suppliers_own on public.fx_suppliers;
drop policy if exists fx_products_own  on public.fx_products;
drop policy if exists fx_documents_own on public.fx_documents;

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

grant select, insert, update, delete on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
to authenticated;

revoke all on
  public.fx_company, public.fx_customers, public.fx_suppliers,
  public.fx_products, public.fx_documents
from anon;

commit;
