-- ====================================================================
-- FacturX Pro - Schéma de Base de Données SQLite (Compatible Local)
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. Entreprise & Paramètres
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_form TEXT DEFAULT 'SARL',
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Maroc',
    phone TEXT,
    email TEXT,
    website TEXT,
    ice TEXT,
    if_code TEXT,
    rc TEXT,
    patente TEXT,
    cnss TEXT,
    rib TEXT,
    bank_name TEXT,
    currency TEXT DEFAULT 'MAD',
    currency_symbol TEXT DEFAULT 'DH',
    tax_system TEXT DEFAULT 'TVA 20%',
    default_vat_rate REAL DEFAULT 20.0,
    logo_url TEXT,
    stamp_url TEXT,
    signature_url TEXT,
    primary_color TEXT DEFAULT '#4f46e5',
    secondary_color TEXT DEFAULT '#0f172a',
    header_text TEXT,
    footer_text TEXT,
    invoice_terms TEXT,
    quotation_terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Utilisateurs & Authentification / Rôles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'manager', 'accountant', 'sales')) DEFAULT 'admin',
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Maroc',
    ice TEXT,
    if_code TEXT,
    rc TEXT,
    patente TEXT,
    cnss TEXT,
    payment_terms TEXT DEFAULT '30 jours',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_code TEXT,
    rc TEXT,
    patente TEXT,
    rib TEXT,
    payment_terms TEXT DEFAULT 'Comptant',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Catalogue Produits & Services
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('product', 'service')) DEFAULT 'product',
    category TEXT,
    description TEXT,
    unit_price_ht REAL NOT NULL DEFAULT 0.0,
    vat_rate REAL NOT NULL DEFAULT 20.0,
    unit TEXT DEFAULT 'U',
    stock_quantity REAL DEFAULT 0,
    min_stock_alert REAL DEFAULT 5,
    purchase_price_ht REAL DEFAULT 0.0,
    barcode TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Documents Commerciaux Unifiés (Devis, Factures, BC, BL, Avoirs, Proforma)
CREATE TABLE IF NOT EXISTS commercial_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    doc_type TEXT CHECK(doc_type IN ('devis', 'facture', 'bon_commande', 'bon_livraison', 'avoir', 'proforma')) NOT NULL,
    document_number TEXT UNIQUE NOT NULL,
    reference_external TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT CHECK(status IN ('draft', 'sent', 'validated', 'accepted', 'rejected', 'delivered', 'paid', 'partially_paid', 'unpaid', 'cancelled')) DEFAULT 'draft',
    discount_percent REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    total_ht REAL NOT NULL DEFAULT 0.0,
    total_vat REAL NOT NULL DEFAULT 0.0,
    total_ttc REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL DEFAULT 0.0,
    remaining_amount REAL DEFAULT 0.0,
    payment_method TEXT,
    converted_from_id TEXT REFERENCES commercial_documents(id) ON DELETE SET NULL,
    converted_to_id TEXT REFERENCES commercial_documents(id) ON DELETE SET NULL,
    notes TEXT,
    terms_and_conditions TEXT,
    currency TEXT DEFAULT 'MAD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lignes de Documents
CREATE TABLE IF NOT EXISTS document_items (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES commercial_documents(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    reference TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'U',
    unit_price_ht REAL NOT NULL DEFAULT 0.0,
    discount_percent REAL DEFAULT 0.0,
    vat_rate REAL NOT NULL DEFAULT 20.0,
    total_ht REAL NOT NULL DEFAULT 0.0,
    total_vat REAL NOT NULL DEFAULT 0.0,
    total_ttc REAL NOT NULL DEFAULT 0.0,
    item_order INTEGER DEFAULT 0
);

-- 8. Règlements & Paiements
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES commercial_documents(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('virement', 'cheque', 'especes', 'traite', 'carte', 'autre')) DEFAULT 'virement',
    reference TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_docs_type_date ON commercial_documents(doc_type, issue_date);
CREATE INDEX IF NOT EXISTS idx_docs_customer ON commercial_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_docs_status ON commercial_documents(status);
CREATE INDEX IF NOT EXISTS idx_products_ref ON products(reference);
