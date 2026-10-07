-- ==========================================================
-- FACTURES DIGITALE — Schéma Supabase (PostgreSQL)
-- ==========================================================
-- À exécuter une seule fois dans :
--   Supabase Dashboard > SQL Editor > New query > Run
--
-- Design : chaque entité est stockée en JSONB, à l'identique
-- des types TypeScript de src/types/index.ts. Cela garantit
-- qu'aucune transformation n'est nécessaire entre le front,
-- le serveur Express et la base.
-- ==========================================================

-- ---------- Entreprise (singleton : une seule ligne) ----------
create table if not exists public.fx_company (
  id          text primary key default 'singleton',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint fx_company_singleton check (id = 'singleton')
);

-- ---------- Clients ----------
create table if not exists public.fx_customers (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Fournisseurs ----------
create table if not exists public.fx_suppliers (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Produits / Services ----------
create table if not exists public.fx_products (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Documents commerciaux (devis, factures, BL, avoirs...) ----------
-- Les lignes (items) sont incluses dans `data->'items'`.
create table if not exists public.fx_documents (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Index de recherche ----------
create index if not exists fx_customers_name_idx
  on public.fx_customers ((data->>'name'));
create index if not exists fx_suppliers_name_idx
  on public.fx_suppliers ((data->>'name'));
create index if not exists fx_products_ref_idx
  on public.fx_products ((data->>'reference'));
create index if not exists fx_documents_number_idx
  on public.fx_documents ((data->>'number'));
create index if not exists fx_documents_type_idx
  on public.fx_documents ((data->>'type'));
create index if not exists fx_documents_date_idx
  on public.fx_documents ((data->>'date') desc);
create index if not exists fx_documents_customer_idx
  on public.fx_documents ((data->>'customerId'));

-- ---------- Horodatage automatique ----------
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

drop trigger if exists fx_company_touch on public.fx_company;
create trigger fx_company_touch before update on public.fx_company
  for each row execute function public.fx_touch_updated_at();

drop trigger if exists fx_customers_touch on public.fx_customers;
create trigger fx_customers_touch before update on public.fx_customers
  for each row execute function public.fx_touch_updated_at();

drop trigger if exists fx_suppliers_touch on public.fx_suppliers;
create trigger fx_suppliers_touch before update on public.fx_suppliers
  for each row execute function public.fx_touch_updated_at();

drop trigger if exists fx_products_touch on public.fx_products;
create trigger fx_products_touch before update on public.fx_products
  for each row execute function public.fx_touch_updated_at();

drop trigger if exists fx_documents_touch on public.fx_documents;
create trigger fx_documents_touch before update on public.fx_documents
  for each row execute function public.fx_touch_updated_at();

-- ==========================================================
-- SÉCURITÉ — Row Level Security
-- ==========================================================
-- RLS activé SANS aucune policy publique : la clé `anon`
-- (navigateur) ne peut donc ni lire ni écrire. Seul le serveur
-- Express, porteur de la clé `service_role`, accède aux données
-- (service_role contourne RLS par conception).
-- ==========================================================
alter table public.fx_company   enable row level security;
alter table public.fx_customers enable row level security;
alter table public.fx_suppliers enable row level security;
alter table public.fx_products  enable row level security;
alter table public.fx_documents enable row level security;

-- Révoque tout accès direct aux rôles exposés publiquement.
revoke all on public.fx_company,   public.fx_customers,
              public.fx_suppliers, public.fx_products,
              public.fx_documents
  from anon, authenticated;
