-- ====================================================================
-- FacturX Pro - Schéma PostgreSQL (Production & Migration Cloud SQL)
-- ====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Entreprise & Paramètres
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(50) DEFAULT 'SARL',
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Maroc',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    ice VARCHAR(50),
    if_code VARCHAR(50),
    rc VARCHAR(50),
    patente VARCHAR(50),
    cnss VARCHAR(50),
    rib VARCHAR(50),
    bank_name VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'MAD',
    currency_symbol VARCHAR(10) DEFAULT 'DH',
    tax_system VARCHAR(50) DEFAULT 'TVA 20%',
    default_vat_rate NUMERIC(5,2) DEFAULT 20.00,
    logo_url TEXT,
    stamp_url TEXT,
    signature_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#4f46e5',
    secondary_color VARCHAR(20) DEFAULT '#0f172a',
    header_text TEXT,
    footer_text TEXT,
    invoice_terms TEXT,
    quotation_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Utilisateurs & Authentification
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK(role IN ('admin', 'manager', 'accountant', 'sales')) DEFAULT 'admin',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Maroc',
    ice VARCHAR(50),
    if_code VARCHAR(50),
    rc VARCHAR(50),
    patente VARCHAR(50),
    cnss VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT '30 jours',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    ice VARCHAR(50),
    if_code VARCHAR(50),
    rc VARCHAR(50),
    patente VARCHAR(50),
    rib VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT 'Comptant',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Catalogue Produits & Services
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    reference VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) CHECK(type IN ('product', 'service')) DEFAULT 'product',
    category VARCHAR(100),
    description TEXT,
    unit_price_ht NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    unit VARCHAR(30) DEFAULT 'U',
    stock_quantity NUMERIC(12,2) DEFAULT 0,
    min_stock_alert NUMERIC(12,2) DEFAULT 5,
    purchase_price_ht NUMERIC(15,2) DEFAULT 0.00,
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Documents Commerciaux
CREATE TABLE IF NOT EXISTS commercial_documents (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    doc_type VARCHAR(30) CHECK(doc_type IN ('devis', 'facture', 'bon_commande', 'bon_livraison', 'avoir', 'proforma')) NOT NULL,
    document_number VARCHAR(100) UNIQUE NOT NULL,
    reference_external VARCHAR(100),
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(30) CHECK(status IN ('draft', 'sent', 'validated', 'accepted', 'rejected', 'delivered', 'paid', 'partially_paid', 'unpaid', 'cancelled')) DEFAULT 'draft',
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    total_ht NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_vat NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_ttc NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15,2) DEFAULT 0.00,
    remaining_amount NUMERIC(15,2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    converted_from_id VARCHAR(64) REFERENCES commercial_documents(id) ON DELETE SET NULL,
    converted_to_id VARCHAR(64) REFERENCES commercial_documents(id) ON DELETE SET NULL,
    notes TEXT,
    terms_and_conditions TEXT,
    currency VARCHAR(10) DEFAULT 'MAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lignes de Documents
CREATE TABLE IF NOT EXISTS document_items (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id VARCHAR(64) REFERENCES commercial_documents(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    reference VARCHAR(100),
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit VARCHAR(30) DEFAULT 'U',
    unit_price_ht NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    vat_rate NUMERIC(5,2) DEFAULT 20.00,
    total_ht NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_vat NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_ttc NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    item_order INT DEFAULT 0
);

-- 8. Règlements
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id VARCHAR(64) REFERENCES commercial_documents(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'virement',
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pg_docs_type_date ON commercial_documents(doc_type, issue_date);
CREATE INDEX IF NOT EXISTS idx_pg_docs_customer ON commercial_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_pg_docs_status ON commercial_documents(status);
CREATE INDEX IF NOT EXISTS idx_pg_products_ref ON products(reference);
