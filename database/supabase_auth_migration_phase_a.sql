-- ==========================================================
-- FACTURES DIGITALE — Cloisonnement, PHASE A
-- ==========================================================
-- NON DESTRUCTIF. N'ajoute qu'une colonne nullable et son
-- défaut. L'application continue de fonctionner pendant et
-- après : aucune contrainte n'est durcie ici.
--
-- À exécuter d'un seul bloc dans :
--   Supabase Dashboard > SQL Editor > New query > Run
--
-- Réversible : alter table ... drop column owner_id;
-- ==========================================================

begin;

-- Colonne propriétaire, NULLABLE pour l'instant : les lignes existantes
-- n'ont pas encore de compte à qui être rattachées. C'est la phase B qui
-- les rattache, puis durcit la contrainte.
--
-- Le défaut auth.uid() s'applique aux insertions futures : PostgreSQL
-- remplit la colonne depuis le jeton, sans que le front ait à le faire.
alter table public.fx_company   add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.fx_customers add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.fx_suppliers add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.fx_products  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.fx_documents add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.fx_company   alter column owner_id set default auth.uid();
alter table public.fx_customers alter column owner_id set default auth.uid();
alter table public.fx_suppliers alter column owner_id set default auth.uid();
alter table public.fx_products  alter column owner_id set default auth.uid();
alter table public.fx_documents alter column owner_id set default auth.uid();

commit;
