import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Server,
  Layers,
  Copy,
} from 'lucide-react';
import { localStore } from '../services/api';

interface BackupRestoreProps {
  darkMode: boolean;
  onRefreshData: () => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({ darkMode, onRefreshData }) => {
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'sqlite' | 'postgres'>('sqlite');
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Full JSON Export
  const handleExportBackup = () => {
    const backupData = {
      app: 'FacturX Pro',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      company: localStore.getCompany(),
      customers: localStore.getCustomers(),
      suppliers: localStore.getSuppliers(),
      products: localStore.getProducts(),
      documents: localStore.getDocuments(),
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FacturX_Sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore handler
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.company) localStore.saveCompany(parsed.company);
        if (parsed.customers) localStore.saveCustomers(parsed.customers);
        if (parsed.suppliers) localStore.saveSuppliers(parsed.suppliers);
        if (parsed.products) localStore.saveProducts(parsed.products);
        if (parsed.documents) localStore.saveDocuments(parsed.documents);

        setRestoreSuccess(true);
        onRefreshData();
        setTimeout(() => setRestoreSuccess(false), 4000);
      } catch (err: any) {
        alert(`Erreur de restauration du fichier JSON : ${err?.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download SQL script directly
  const handleDownloadSchema = (type: 'sqlite' | 'postgres') => {
    const filename = type === 'sqlite' ? 'sqlite_schema.sql' : 'postgres_schema.sql';
    const link = document.createElement('a');
    link.href = `/api/database/${type}-schema`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(label);
    setTimeout(() => setCopiedSql(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <span>Sauvegarde, Restauration & Schémas SQL</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Exportez l'intégralité de votre base de données, restaurez un backup ou téléchargez les scripts SQL pour SQLite et PostgreSQL.
        </p>
      </div>

      {restoreSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Base de données restaurée avec succès ! Vos données sont immédiatement actives.</span>
        </div>
      )}

      {/* Action cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export JSON Card */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 w-fit rounded-xl mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">
              Export Complet de Sauvegarde
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Téléchargez une archive complète au format JSON contenant : votre société, clients, fournisseurs, catalogue produits et l'historique complet de tous vos devis, factures, bons de commande et livraisons.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger la Sauvegarde Complète (.json)</span>
          </button>
        </div>

        {/* Restore JSON Card */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 w-fit rounded-xl mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">
              Restaurer une Sauvegarde
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Réimportez un fichier de sauvegarde précédemment exporté. Vos fiches clients, articles et documents seront restaurés instantanément en conservant leurs identifiants et numéros.
            </p>
          </div>

          <label className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-2 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Sélectionner un fichier de sauvegarde (.json)</span>
            <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* SQL Database Schema Section */}
      <div
        className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>Schéma Relationnel SQL (10 Tables Normalisées)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prêt pour SQLite (local/embarqué) ou migration vers PostgreSQL (Cloud SQL, Supabase, Neon)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveSchemaTab('sqlite')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSchemaTab === 'sqlite'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                SQLite
              </button>
              <button
                onClick={() => setActiveSchemaTab('postgres')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSchemaTab === 'postgres'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                PostgreSQL
              </button>
            </div>

            <button
              onClick={() => handleDownloadSchema(activeSchemaTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger .sql</span>
            </button>
          </div>
        </div>

        {/* Tables description list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs mb-4">
          {[
            { name: 'companies', desc: 'Identifiants fiscaux & coordonnées' },
            { name: 'users', desc: 'Comptes & rôles sécurité' },
            { name: 'customers', desc: 'Clients avec ICE, IF, RC, Patente' },
            { name: 'suppliers', desc: 'Fournisseurs & RIB' },
            { name: 'products', desc: 'Catalogue & alertes stock' },
            { name: 'commercial_documents', desc: 'Devis, Factures, BC, BL, Avoirs' },
            { name: 'document_items', desc: 'Lignes, P.U., Remises, TVA' },
            { name: 'payments', desc: 'Règlements & traçabilité bancaire' },
          ].map((t) => (
            <div
              key={t.name}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{t.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Code Preview Block */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-slate-800">
            <span>{activeSchemaTab === 'sqlite' ? 'database/sqlite_schema.sql' : 'database/postgres_schema.sql'}</span>
            <button
              onClick={() => copyToClipboard(activeSchemaTab === 'sqlite' ? SQLITE_SNIPPET : POSTGRES_SNIPPET, 'snippet')}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSql === 'snippet' ? 'Copié !' : 'Copier le script SQL'}</span>
            </button>
          </div>
          <pre className="p-4 text-[11px] font-mono leading-relaxed bg-slate-950 text-slate-200 overflow-x-auto max-h-64">
            {activeSchemaTab === 'sqlite' ? SQLITE_SNIPPET : POSTGRES_SNIPPET}
          </pre>
        </div>
      </div>

      {/* Reset Demo Data */}
      <div className="p-4 rounded-2xl border border-rose-200/50 bg-rose-50/30 dark:bg-rose-950/20 dark:border-rose-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <div>
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Réinitialiser avec les données de démonstration
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-400">
              Recharge l'entreprise exemple SARL avec clients, articles et factures types.
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Voulez-vous réinitialiser toutes les données avec la base de démonstration ?')) {
              localStore.resetToDefault();
              onRefreshData();
            }
          }}
          className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 border border-rose-300 dark:border-rose-800 rounded-xl hover:bg-rose-100 cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
};

const SQLITE_SNIPPET = `-- FacturX Pro - Schéma SQLite (Local & Léger)
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ice TEXT,
    if_code TEXT,
    rc TEXT,
    patente TEXT,
    phone TEXT,
    email TEXT,
    currency TEXT DEFAULT 'MAD',
    default_vat_rate REAL DEFAULT 20.0
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id),
    name TEXT NOT NULL,
    ice TEXT,
    if_code TEXT,
    rc TEXT,
    patente TEXT,
    city TEXT,
    payment_terms TEXT DEFAULT '30 jours'
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('product', 'service')),
    unit_price_ht REAL NOT NULL,
    vat_rate REAL DEFAULT 20.0,
    stock_quantity REAL DEFAULT 0
);

CREATE TABLE commercial_documents (
    id TEXT PRIMARY KEY,
    doc_type TEXT NOT NULL,
    document_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    issue_date DATE NOT NULL,
    status TEXT DEFAULT 'draft',
    total_ht REAL NOT NULL,
    total_vat REAL NOT NULL,
    total_ttc REAL NOT NULL,
    paid_amount REAL DEFAULT 0
);`;

const POSTGRES_SNIPPET = `-- FacturX Pro - Schéma PostgreSQL (Production & Cloud SQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE companies (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    ice VARCHAR(50),
    if_code VARCHAR(50),
    rc VARCHAR(50),
    patente VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'MAD',
    default_vat_rate NUMERIC(5,2) DEFAULT 20.00
);

CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ice VARCHAR(50),
    if_code VARCHAR(50),
    rc VARCHAR(50),
    patente VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT '30 jours'
);

CREATE TABLE commercial_documents (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    doc_type VARCHAR(30) NOT NULL,
    document_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL,
    total_ht NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_vat NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_ttc NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15,2) DEFAULT 0.00
);`;
