/**
 * Couche de persistance Supabase (serveur uniquement).
 *
 * Utilise l'API REST de Supabase (PostgREST) via `fetch` natif, afin de
 * n'introduire aucune dépendance npm supplémentaire.
 *
 * SÉCURITÉ : ce module n'est importé que par server.ts. La clé
 * `service_role` ne doit jamais atteindre le navigateur.
 */

// Lecture paresseuse de l'environnement : les imports ESM sont évalués AVANT
// le corps du module importateur, donc avant l'appel à dotenv.config().
// Lire process.env au niveau du module donnerait toujours des valeurs vides.
function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
}

/**
 * Clé utilisée par le serveur : `service_role` en priorité (contourne RLS),
 * `anon` en secours si seule celle-ci est fournie.
 */
function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
}

/** Indique si Supabase est configuré. Sinon, le serveur bascule sur store.json. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && serviceKey());
}

export type TableName =
  | 'fx_company'
  | 'fx_customers'
  | 'fx_suppliers'
  | 'fx_products'
  | 'fx_documents';

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${supabaseUrl()}/rest/v1${path}`, init);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `Supabase ${init.method || 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`
    );
  }
  return text ? JSON.parse(text) : null;
}

/** Ligne générique : { id, data } où `data` contient l'entité métier. */
interface Row<T> {
  id: string;
  data: T;
}

/**
 * Liste toutes les entités d'une table, triées par date de création
 * décroissante (les plus récentes en premier, comme l'UI l'attend).
 */
export async function list<T>(table: TableName): Promise<T[]> {
  const rows: Row<T>[] = await request(
    `/${table}?select=id,data&order=created_at.desc`,
    { headers: headers() }
  );
  return (rows || []).map((r) => r.data);
}

/** Insère ou met à jour une entité identifiée par `id`. */
export async function upsert<T extends { id: string }>(
  table: TableName,
  entity: T
): Promise<T> {
  await request(`/${table}?on_conflict=id`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: entity.id, data: entity }),
  });
  return entity;
}

/** Remplace intégralement le contenu d'une table (utilisé par la restauration). */
export async function replaceAll<T extends { id: string }>(
  table: TableName,
  entities: T[]
): Promise<void> {
  // `id=not.is.null` : PostgREST exige un filtre sur tout DELETE.
  await request(`/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });

  if (!entities.length) return;

  await request(`/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(entities.map((e) => ({ id: e.id, data: e }))),
  });
}

/** Supprime une entité par son `id`. */
export async function remove(table: TableName, id: string): Promise<void> {
  await request(`/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
}

/** Lit l'entreprise (ligne singleton). Renvoie `null` si non initialisée. */
export async function getCompany<T>(): Promise<T | null> {
  const rows: Row<T>[] = await request(
    `/fx_company?select=id,data&id=eq.singleton&limit=1`,
    { headers: headers() }
  );
  return rows && rows.length ? rows[0].data : null;
}

/** Écrit l'entreprise (ligne singleton). */
export async function saveCompany<T>(company: T): Promise<T> {
  await request(`/fx_company?on_conflict=id`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 'singleton', data: company }),
  });
  return company;
}

/**
 * Vérifie la connexion et la présence des tables au démarrage.
 * Ne lève pas d'exception : renvoie un diagnostic exploitable.
 */
export async function healthCheck(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'SUPABASE_URL / clé absente(s) de .env' };
  }
  try {
    await request(`/fx_company?select=id&limit=1`, { headers: headers() });
    return { ok: true, message: `connecté à ${supabaseUrl()}` };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('PGRST205') || msg.includes('schema cache')) {
      return {
        ok: false,
        message:
          'tables absentes — exécutez database/supabase_schema.sql dans le SQL Editor Supabase',
      };
    }
    return { ok: false, message: msg };
  }
}
