/**
 * Application Express partagee.
 *
 * Deux points d'entree l'utilisent :
 *  - server.ts    : serveur Node local (dev avec middleware Vite, ou prod self-hosted)
 *  - api/index.ts : fonction serverless Vercel
 *
 * Ce module ne contient donc ni `listen()` ni middleware Vite.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import * as supabase from './supabase.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '15mb' }));

// Base de données locale persistante (JSON / SQLite representation)
const DB_FILE = path.join(__dirname, 'database', 'store.json');

// Création du dossier database s'il n'existe pas
if (!process.env.VERCEL && !fs.existsSync(path.join(__dirname, 'database'))) {
  fs.mkdirSync(path.join(__dirname, 'database'), { recursive: true });
}

// Initialisation de la DB
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Erreur lecture store.json', e);
    }
  }
  return {
    company: null,
    customers: [],
    suppliers: [],
    products: [],
    documents: [],
  };
}

/**
 * Sur Vercel le systeme de fichiers est en lecture seule (hors /tmp) et chaque
 * invocation est isolee : le repli disque n'a aucun sens et toute ecriture
 * echouerait. Supabase y est donc l'unique source de verite.
 */
const EPHEMERAL_FS = Boolean(process.env.VERCEL);

function saveDb(data: any) {
  if (EPHEMERAL_FS) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur sauvegarde store.json', e);
  }
}

let db = loadDb();

// ==========================================
// COUCHE DE STOCKAGE UNIFIEE
// ==========================================
// Supabase est la source de verite des qu'il est configure dans .env.
// En l'absence de configuration (ou en cas de panne reseau), le serveur
// retombe automatiquement sur database/store.json : l'application reste
// utilisable hors ligne.
// ==========================================

const useSupabase = supabase.isSupabaseConfigured();
let supabaseReady = false;

type Collection = 'customers' | 'suppliers' | 'products' | 'documents';

const TABLES: Record<Collection, supabase.TableName> = {
  customers: 'fx_customers',
  suppliers: 'fx_suppliers',
  products: 'fx_products',
  documents: 'fx_documents',
};

/** `true` si les lectures/ecritures doivent passer par Supabase. */
function online(): boolean {
  return useSupabase && supabaseReady;
}

/**
 * Verifie Supabase une seule fois, a la demande. Le serveur local appelle ceci
 * au demarrage ; en serverless, la premiere requete la declenche et le resultat
 * est reutilise tant que l'instance reste chaude.
 */
let readyProbe: Promise<void> | null = null;

export function ensureSupabaseReady(): Promise<void> {
  if (!useSupabase) return Promise.resolve();
  if (!readyProbe) {
    readyProbe = supabase.healthCheck().then((health) => {
      supabaseReady = health.ok;
      console.log(
        health.ok
          ? `[supabase] stockage distant actif - ${health.message}`
          : `[supabase] INDISPONIBLE (${health.message})`
      );
    });
  }
  return readyProbe;
}

/** Journalise une panne Supabase et signale le repli sur le fichier local. */
function fallback(action: string, e: unknown): void {
  console.error(`[supabase] ${action} echoue - repli sur store.json :`, e);
}

const store = {
  async getCompany(): Promise<any> {
    if (online()) {
      try {
        const company = await supabase.getCompany<any>();
        if (company) {
          db.company = company;
          saveDb(db);
          return company;
        }
        // Premiere execution : la base distante est vide, on l'initialise
        // avec le contenu local s'il existe.
        if (db.company) await supabase.saveCompany(db.company);
        return db.company || {};
      } catch (e) {
        fallback('getCompany', e);
      }
    }
    return db.company || {};
  },

  async saveCompany(company: any): Promise<any> {
    db.company = company;
    saveDb(db);
    if (online()) {
      try {
        await supabase.saveCompany(company);
      } catch (e) {
        fallback('saveCompany', e);
      }
    }
    return company;
  },

  async list(collection: Collection): Promise<any[]> {
    if (online()) {
      try {
        const rows = await supabase.list<any>(TABLES[collection]);
        if (rows.length) {
          db[collection] = rows;
          saveDb(db);
          return rows;
        }
        // Base distante vide : on y pousse les donnees locales existantes.
        const local = db[collection] || [];
        if (local.length) await supabase.replaceAll(TABLES[collection], local);
        return local;
      } catch (e) {
        fallback(`list ${collection}`, e);
      }
    }
    return db[collection] || [];
  },

  async save(collection: Collection, entity: any): Promise<any> {
    const list = db[collection] || [];
    const index = list.findIndex((item: any) => item.id === entity.id);
    if (index >= 0) {
      list[index] = entity;
    } else {
      list.unshift(entity);
    }
    db[collection] = list;
    saveDb(db);

    if (online()) {
      try {
        await supabase.upsert(TABLES[collection], entity);
      } catch (e) {
        fallback(`save ${collection}`, e);
      }
    }
    return entity;
  },

  async remove(collection: Collection, id: string): Promise<void> {
    db[collection] = (db[collection] || []).filter((item: any) => item.id !== id);
    saveDb(db);

    if (online()) {
      try {
        await supabase.remove(TABLES[collection], id);
      } catch (e) {
        fallback(`remove ${collection}`, e);
      }
    }
  },

  /** Restauration complete depuis une sauvegarde JSON. */
  async restore(data: any): Promise<void> {
    db = data;
    saveDb(db);

    if (online()) {
      if (db.company) await supabase.saveCompany(db.company);
      for (const collection of Object.keys(TABLES) as Collection[]) {
        await supabase.replaceAll(TABLES[collection], db[collection] || []);
      }
    }
  },
};

/** Enveloppe une route async : toute exception devient une reponse 500 propre. */
function route(
  handler: (req: express.Request, res: express.Response) => Promise<unknown>
) {
  return (req: express.Request, res: express.Response) => {
    ensureSupabaseReady()
      .then(() => handler(req, res))
      .catch((e) => {
        console.error(`[api] ${req.method} ${req.path} :`, e);
        if (!res.headersSent) res.status(500).json({ error: String(e?.message || e) });
      });
  };
}

// Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (e) {
    console.error('Initialisation GoogleGenAI échouée', e);
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// Health check
app.get('/api/health', route(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiReady: !!aiClient,
    storage: online() ? 'supabase' : EPHEMERAL_FS ? 'none' : 'local-json',
    supabaseConfigured: useSupabase,
    runtime: EPHEMERAL_FS ? 'vercel-serverless' : 'node-server',
  });
}));

// Company
app.get('/api/company', route(async (req, res) => {
  res.json(await store.getCompany());
}));

app.put('/api/company', route(async (req, res) => {
  res.json(await store.saveCompany(req.body));
}));

// Customers
app.get('/api/customers', route(async (req, res) => {
  res.json(await store.list('customers'));
}));

app.post('/api/customers', route(async (req, res) => {
  res.json(await store.save('customers', req.body));
}));

app.delete('/api/customers/:id', route(async (req, res) => {
  await store.remove('customers', req.params.id);
  res.json({ success: true });
}));

// Suppliers
app.get('/api/suppliers', route(async (req, res) => {
  res.json(await store.list('suppliers'));
}));

app.post('/api/suppliers', route(async (req, res) => {
  res.json(await store.save('suppliers', req.body));
}));

app.delete('/api/suppliers/:id', route(async (req, res) => {
  await store.remove('suppliers', req.params.id);
  res.json({ success: true });
}));

// Products
app.get('/api/products', route(async (req, res) => {
  res.json(await store.list('products'));
}));

app.post('/api/products', route(async (req, res) => {
  res.json(await store.save('products', req.body));
}));

app.delete('/api/products/:id', route(async (req, res) => {
  await store.remove('products', req.params.id);
  res.json({ success: true });
}));

// Documents
app.get('/api/documents', route(async (req, res) => {
  res.json(await store.list('documents'));
}));

app.post('/api/documents', route(async (req, res) => {
  res.json(await store.save('documents', req.body));
}));

app.delete('/api/documents/:id', route(async (req, res) => {
  await store.remove('documents', req.params.id);
  res.json({ success: true });
}));

// AI Module Endpoints
app.post('/api/ai/describe', async (req, res) => {
  const { title, category } = req.body;
  if (!aiClient) {
    return res.json({
      description: `Prestation certifiée : ${title} (${category}). Exécution professionnelle, suivi technique garanti et conformité aux standards du secteur.`,
    });
  }

  try {
    const prompt = `Tu es un expert en rédaction commerciale B2B pour les entreprises marocaines et francophones.
Rédige une description commerciale concise, percutante et professionnelle (2 à 3 phrases claires) pour cet article ou prestation :
- Désignation : "${title}"
- Catégorie : "${category}"

Donne uniquement le texte final sans fioritures ni guillemets.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const desc = response.text ? response.text.trim() : `${title} - Service professionnel haut de gamme.`;
    res.json({ description: desc });
  } catch (err: any) {
    console.error('Erreur AI Describe:', err);
    res.json({
      description: `Prestation certifiée : ${title} (${category}). Respect des délais, qualité garantie et accompagnement expert.`,
    });
  }
});

app.post('/api/ai/price-suggest', async (req, res) => {
  const { title, category, purchasePrice } = req.body;
  const baseCost = Number(purchasePrice) || 0;

  if (!aiClient) {
    const min = baseCost > 0 ? Math.round(baseCost * 1.25) : 3000;
    const recommended = baseCost > 0 ? Math.round(baseCost * 1.5) : 5500;
    const max = baseCost > 0 ? Math.round(baseCost * 1.85) : 8500;
    return res.json({
      min,
      recommended,
      max,
      note: 'Estimation statistique standard basée sur une marge commerciale brute de 30% à 45%.',
    });
  }

  try {
    const prompt = `Tu es un consultant en tarification B2B et contrôle de gestion.
Pour l'article suivant :
- Nom : "${title}"
- Catégorie : "${category}"
- Coût d'achat / Prix de revient : ${baseCost} DH (MAD)

Analyse le prix de vente HT optimal pour le marché B2B.
Réponds STRICTEMENT sous forme de JSON valide avec ces clés :
{
  "min": number (prix plancher acceptable),
  "recommended": number (prix de vente recommandé),
  "max": number (prix premium avec valeur ajoutée),
  "note": string (brève explication de la rentabilité en 1 phrase)
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json(parsed);
    }
    throw new Error('Réponse JSON invalide');
  } catch (err) {
    const min = baseCost > 0 ? Math.round(baseCost * 1.25) : 3500;
    const recommended = baseCost > 0 ? Math.round(baseCost * 1.55) : 6000;
    const max = baseCost > 0 ? Math.round(baseCost * 1.9) : 9500;
    res.json({
      min,
      recommended,
      max,
      note: 'Prix indicatif calculé selon les marges moyennes constatées pour ce type de prestation.',
    });
  }
});

app.post('/api/ai/text-polish', async (req, res) => {
  const { text, style } = req.body;

  if (!aiClient) {
    if (style === 'relance') {
      return res.json({
        result: `Madame, Monsieur,\n\nNous constatons que la facture ci-jointe reste en attente de règlement à ce jour. Nous vous remercions par avance de bien vouloir effectuer le virement bancaire sous huitaine.\n\nRestant à votre entière disposition, nous vous adressons nos salutations respectueuses.`,
      });
    }
    return res.json({ result: text });
  }

  try {
    let prompt = '';
    if (style === 'relance') {
      prompt = `Rédige un email professionnel, courtois mais ferme de relance pour facture impayée à destination d'un client entreprise (contexte France / Maroc). Sois impeccable, poli et clair. Données : "${text}".`;
    } else if (style === 'email') {
      prompt = `Rédige un email d'envoi de devis ou facture très professionnel, courtois et engageant à partir de : "${text}".`;
    } else {
      prompt = `Améliore et reformule ce texte commercial pour le rendre plus professionnel, clair et persuasif : "${text}".`;
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ result: response.text ? response.text.trim() : text });
  } catch (err) {
    res.json({ result: text });
  }
});

// Backup & SQL Export
app.get('/api/backup/export', route(async (req, res) => {
  // L'export reflete l'etat distant lorsque Supabase est actif.
  const data = {
    company: await store.getCompany(),
    customers: await store.list('customers'),
    suppliers: await store.list('suppliers'),
    products: await store.list('products'),
    documents: await store.list('documents'),
  };
  res.json({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: online() ? 'supabase' : 'local-json',
    data,
  });
}));

app.post('/api/backup/restore', route(async (req, res) => {
  if (!req.body || !req.body.data) {
    return res.status(400).json({ error: 'Format de sauvegarde invalide.' });
  }
  await store.restore(req.body.data);
  res.json({
    success: true,
    message: online()
      ? 'Restauration effectuée avec succès (Supabase + local).'
      : 'Restauration effectuée avec succès (local).',
  });
}));

// SQLite and PostgreSQL schema downloads
app.get('/api/database/sqlite-schema', (req, res) => {
  const schemaPath = path.join(__dirname, 'database', 'sqlite_schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(schemaPath);
  } else {
    res.status(404).send('Schéma SQLite non trouvé');
  }
});

app.get('/api/database/supabase-schema', (req, res) => {
  const schemaPath = path.join(__dirname, 'database', 'supabase_schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(schemaPath);
  } else {
    res.status(404).send('Schéma Supabase non trouvé');
  }
});

app.get('/api/database/postgres-schema', (req, res) => {
  const schemaPath = path.join(__dirname, 'database', 'postgres_schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(schemaPath);
  } else {
    res.status(404).send('Schéma PostgreSQL non trouvé');
  }
});

export default app;
