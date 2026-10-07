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

const STORAGE_KEYS = {
  COMPANY: 'facturx_company',
  CUSTOMERS: 'facturx_customers',
  SUPPLIERS: 'facturx_suppliers',
  PRODUCTS: 'facturx_products',
  DOCUMENTS: 'facturx_documents',
};

// Données initiales par défaut
const DEFAULT_COMPANY: Company = {
  id: 'comp-001',
  name: 'ATLAS SOLUTIONS & TECHNOLOGIES SARL',
  legalForm: 'SARL au capital de 100 000 DH',
  address: "Angle Bd Zerktouni & Bd d'Anfa, 4ème étage N°12",
  city: 'Casablanca',
  postalCode: '20050',
  country: 'Maroc',
  phone: '+212 5 22 45 67 89',
  email: 'contact@atlas-tech.ma',
  website: 'https://atlas-tech.ma',
  ice: '002345678000092',
  ifCode: '45892134',
  rc: '152433',
  patente: '34215689',
  cnss: '8765432',
  rib: '011 780 0000 123456789012 34',
  bankName: 'Attijariwafa Bank - Agence Anfa',
  currency: 'MAD',
  currencySymbol: 'DH',
  defaultVatRate: 20,
  logoUrl: '',
  primaryColor: '#4f46e5',
  headerText: 'Solutions Digitales, ERP & Infrastructure Cloud pour Entreprises',
  footerText: 'ATLAS SOLUTIONS SARL - RC Casablanca 152433 - IF 45892134 - ICE 002345678000092 - Patente 34215689 - CNSS 8765432',
  invoiceTerms: 'Paiement à 30 jours à réception de facture. Tout retard donnera lieu à une pénalité légale.',
  quotationTerms: 'Ce devis est valable pour une durée de 30 jours à compter de sa date d’émission.',
};

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: 'NOVA DISTRIBUTION SARL',
    contactPerson: 'M. Karim Benjelloun',
    email: 'k.benjelloun@novadistrib.ma',
    phone: '+212 6 61 23 45 67',
    address: 'Z.I. Ain Sebaa, Route 110',
    city: 'Casablanca',
    ice: '001987654000081',
    ifCode: '38902145',
    rc: '124987',
    patente: '21984530',
    paymentTerms: '30 jours fin de mois',
    notes: 'Client grand compte, livraison prioritaire',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'cust-002',
    name: 'MAROC LOGISTIQUE & TRANSIT',
    contactPerson: 'Mme. Salma Amrani',
    email: 'direction@maroclogistique.ma',
    phone: '+212 5 37 88 99 00',
    address: '15 Rue Al Fourat, Agdal',
    city: 'Rabat',
    ice: '003214569000045',
    ifCode: '41209874',
    rc: '87654',
    patente: '19874523',
    paymentTerms: 'Comptant',
    createdAt: '2026-01-18T14:30:00Z',
  },
  {
    id: 'cust-003',
    name: 'TANGER SMART TEXTILE SA',
    contactPerson: 'M. Youssef El Fassi',
    email: 'achat@tangersmart.ma',
    phone: '+212 5 39 33 22 11',
    address: "Zone Franche d'Exportation",
    city: 'Tanger',
    ice: '004561239000033',
    ifCode: '52309811',
    rc: '45892',
    patente: '31209845',
    paymentTerms: '60 jours',
    createdAt: '2026-02-01T09:15:00Z',
  },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-001',
    name: 'DELL TECHNOLOGIES MAROC',
    contactPerson: 'M. Mehdi Tazi',
    email: 'commercial@dell.ma',
    phone: '+212 5 22 99 88 77',
    address: 'Marina Casablanca, Tour Crystal 2',
    city: 'Casablanca',
    ice: '001555666000012',
    ifCode: '10984532',
    rc: '98432',
    patente: '44556677',
    rib: '007 780 0000 987654321012 88',
    paymentTerms: '30 jours',
    createdAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'supp-002',
    name: 'INWI PRO ENTREPRISES',
    contactPerson: 'Service Comptes Entreprises',
    email: 'pro@inwi.ma',
    phone: '+212 5 29 00 00 00',
    address: 'Sidi Maârouf, Zenith Millenium',
    city: 'Casablanca',
    ice: '001777888000099',
    ifCode: '22334455',
    rc: '77665',
    patente: '88776655',
    paymentTerms: 'Prélèvement',
    createdAt: '2026-01-08T11:00:00Z',
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    reference: 'SRV-DEV-01',
    name: 'Développement Application Web sur mesure',
    type: 'service',
    category: 'Services Numériques',
    description: 'Conception ergonomique UI/UX, développement full-stack Node/React et déploiement cloud sécurisé.',
    unitPriceHt: 18000,
    vatRate: 20,
    unit: 'Prestation',
    stockQuantity: 0,
    purchasePriceHt: 6000,
  },
  {
    id: 'prod-002',
    reference: 'SRV-MAINT-01',
    name: 'Contrat Maintenance & Infogérance Mensuelle',
    type: 'service',
    category: 'Maintenance',
    description: 'Support technique prioritaire, sauvegardes redondantes hebdomadaires et mises à jour proactives.',
    unitPriceHt: 4500,
    vatRate: 20,
    unit: 'Mois',
    stockQuantity: 0,
    purchasePriceHt: 1200,
  },
  {
    id: 'prod-003',
    reference: 'HW-SRV-DELL',
    name: 'Serveur Rack Dell PowerEdge R650',
    type: 'product',
    category: 'Matériel Informatique',
    description: 'Serveur d’entreprise biprocesseur Xeon Silver, 64 Go RAM ECC, 2x960 Go SSD Enterprise NVMe.',
    unitPriceHt: 32000,
    vatRate: 20,
    unit: 'U',
    stockQuantity: 6,
    minStockAlert: 2,
    purchasePriceHt: 24500,
  },
  {
    id: 'prod-004',
    reference: 'SW-LIC-PRO',
    name: 'Pack Licence Logicielle FacturX Entreprise',
    type: 'product',
    category: 'Licences & Logiciels',
    description: 'Licence 10 utilisateurs avec modules Ventes, Facturation électronique, Stocks et Export comptable.',
    unitPriceHt: 8500,
    vatRate: 20,
    unit: 'Licence',
    stockQuantity: 50,
    minStockAlert: 5,
    purchasePriceHt: 3500,
  },
];

const DEFAULT_DOCUMENTS: CommercialDocument[] = [
  {
    id: 'doc-001',
    docType: 'facture',
    documentNumber: 'FAC-2026-0001',
    customerId: 'cust-001',
    customerName: 'NOVA DISTRIBUTION SARL',
    customerIce: '001987654000081',
    customerAddress: 'Z.I. Ain Sebaa, Route 110',
    customerCity: 'Casablanca',
    issueDate: '2026-02-15',
    dueDate: '2026-03-15',
    status: 'paid',
    discountPercent: 0,
    discountAmount: 0,
    totalHt: 22500,
    totalVat: 4500,
    totalTtc: 27000,
    paidAmount: 27000,
    remainingAmount: 0,
    paymentMethod: 'Virement Attijariwafa',
    notes: 'Règlement reçu avec succès le 20/02/2026.',
    termsAndConditions: 'Paiement à 30 jours à réception.',
    currency: 'MAD',
    createdAt: '2026-02-15T10:00:00Z',
    items: [
      {
        id: 'item-001',
        productId: 'prod-001',
        reference: 'SRV-DEV-01',
        description: 'Développement Module Ventes & Portail B2B',
        quantity: 1,
        unit: 'Prestation',
        unitPriceHt: 18000,
        discountPercent: 0,
        vatRate: 20,
        totalHt: 18000,
        totalVat: 3600,
        totalTtc: 21600,
      },
      {
        id: 'item-002',
        productId: 'prod-002',
        reference: 'SRV-MAINT-01',
        description: 'Mise en service & Infogérance Premier mois',
        quantity: 1,
        unit: 'Mois',
        unitPriceHt: 4500,
        discountPercent: 0,
        vatRate: 20,
        totalHt: 4500,
        totalVat: 900,
        totalTtc: 5400,
      },
    ],
  },
  {
    id: 'doc-002',
    docType: 'devis',
    documentNumber: 'DEV-2026-0001',
    customerId: 'cust-002',
    customerName: 'MAROC LOGISTIQUE & TRANSIT',
    customerIce: '003214569000045',
    customerAddress: '15 Rue Al Fourat, Agdal',
    customerCity: 'Rabat',
    issueDate: '2026-03-01',
    dueDate: '2026-03-31',
    status: 'sent',
    discountPercent: 5,
    discountAmount: 1600,
    totalHt: 30400,
    totalVat: 6080,
    totalTtc: 36480,
    paidAmount: 0,
    remainingAmount: 36480,
    notes: 'Devis pour renouvellement de l’infrastructure serveur.',
    termsAndConditions: 'Validité de l’offre : 30 jours. Acompte de 30% à la commande.',
    currency: 'MAD',
    createdAt: '2026-03-01T14:00:00Z',
    items: [
      {
        id: 'item-003',
        productId: 'prod-003',
        reference: 'HW-SRV-DELL',
        description: 'Serveur Rack Dell PowerEdge R650 (Remise commerciale 5% appliquée)',
        quantity: 1,
        unit: 'U',
        unitPriceHt: 32000,
        discountPercent: 5,
        vatRate: 20,
        totalHt: 30400,
        totalVat: 6080,
        totalTtc: 36480,
      },
    ],
  },
  {
    id: 'doc-003',
    docType: 'facture',
    documentNumber: 'FAC-2026-0002',
    customerId: 'cust-003',
    customerName: 'TANGER SMART TEXTILE SA',
    customerIce: '004561239000033',
    customerAddress: "Zone Franche d'Exportation",
    customerCity: 'Tanger',
    issueDate: '2026-03-10',
    dueDate: '2026-04-10',
    status: 'unpaid',
    discountPercent: 0,
    discountAmount: 0,
    totalHt: 17000,
    totalVat: 3400,
    totalTtc: 20400,
    paidAmount: 5000,
    remainingAmount: 15400,
    notes: 'Acompte de 5000 DH reçu, reste 15 400 DH en attente.',
    termsAndConditions: 'Règlement à 30 jours.',
    currency: 'MAD',
    createdAt: '2026-03-10T09:30:00Z',
    items: [
      {
        id: 'item-004',
        productId: 'prod-004',
        reference: 'SW-LIC-PRO',
        description: 'Pack Licence Logicielle FacturX Entreprise (2 packs)',
        quantity: 2,
        unit: 'Licence',
        unitPriceHt: 8500,
        discountPercent: 0,
        vatRate: 20,
        totalHt: 17000,
        totalVat: 3400,
        totalTtc: 20400,
      },
    ],
  },
  {
    id: 'doc-004',
    docType: 'bon_commande',
    documentNumber: 'BC-2026-0001',
    customerId: 'cust-001',
    customerName: 'NOVA DISTRIBUTION SARL',
    customerIce: '001987654000081',
    issueDate: '2026-03-12',
    dueDate: '2026-03-25',
    status: 'validated',
    discountPercent: 0,
    discountAmount: 0,
    totalHt: 9000,
    totalVat: 1800,
    totalTtc: 10800,
    paidAmount: 0,
    remainingAmount: 10800,
    notes: 'Bon de commande validé par le client.',
    currency: 'MAD',
    createdAt: '2026-03-12T11:00:00Z',
    items: [
      {
        id: 'item-005',
        productId: 'prod-002',
        reference: 'SRV-MAINT-01',
        description: 'Maintenance trimestrielle (2 mois additionnels)',
        quantity: 2,
        unit: 'Mois',
        unitPriceHt: 4500,
        discountPercent: 0,
        vatRate: 20,
        totalHt: 9000,
        totalVat: 1800,
        totalTtc: 10800,
      },
    ],
  },
  {
    id: 'doc-005',
    docType: 'bon_livraison',
    documentNumber: 'BL-2026-0001',
    customerId: 'cust-001',
    customerName: 'NOVA DISTRIBUTION SARL',
    customerIce: '001987654000081',
    issueDate: '2026-03-15',
    status: 'delivered',
    discountPercent: 0,
    discountAmount: 0,
    totalHt: 9000,
    totalVat: 1800,
    totalTtc: 10800,
    paidAmount: 0,
    remainingAmount: 10800,
    notes: 'Matériel et livrables réceptionnés sans réserve.',
    currency: 'MAD',
    createdAt: '2026-03-15T15:00:00Z',
    items: [
      {
        id: 'item-006',
        productId: 'prod-002',
        reference: 'SRV-MAINT-01',
        description: 'Livraison livrables informatiques et PV de recette',
        quantity: 2,
        unit: 'Mois',
        unitPriceHt: 4500,
        discountPercent: 0,
        vatRate: 20,
        totalHt: 9000,
        totalVat: 1800,
        totalTtc: 10800,
      },
    ],
  },
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  getCompany(): Company {
    return this.get<Company>(STORAGE_KEYS.COMPANY, DEFAULT_COMPANY);
  }

  saveCompany(company: Company): Company {
    this.set(STORAGE_KEYS.COMPANY, company);
    return company;
  }

  getCustomers(): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
  }

  saveCustomers(customers: Customer[]): void {
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
  }

  getSuppliers(): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  saveSuppliers(suppliers: Supplier[]): void {
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  getProducts(): Product[] {
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }

  saveProducts(products: Product[]): void {
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  getDocuments(): CommercialDocument[] {
    return this.get<CommercialDocument[]>(STORAGE_KEYS.DOCUMENTS, DEFAULT_DOCUMENTS);
  }

  saveDocuments(documents: CommercialDocument[]): void {
    this.set(STORAGE_KEYS.DOCUMENTS, documents);
  }

  resetToDefault(): void {
    this.set(STORAGE_KEYS.COMPANY, DEFAULT_COMPANY);
    this.set(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    this.set(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    this.set(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    this.set(STORAGE_KEYS.DOCUMENTS, DEFAULT_DOCUMENTS);
  }
}

export const localStore = new StorageService();

/**
 * Client API unifié avec fallback local instantané
 */
export const api = {
  // Entreprise
  async getCompany(): Promise<Company> {
    try {
      const res = await fetch('/api/company');
      if (res.ok) {
        const data = await res.json();
        localStore.saveCompany(data);
        return data;
      }
    } catch (_) {}
    return localStore.getCompany();
  },

  async updateCompany(data: Partial<Company>): Promise<Company> {
    const updated = { ...localStore.getCompany(), ...data };
    localStore.saveCompany(updated);
    try {
      await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (_) {}
    return updated;
  },

  // Clients
  async getCustomers(): Promise<Customer[]> {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        localStore.saveCustomers(data);
        return data;
      }
    } catch (_) {}
    return localStore.getCustomers();
  },

  async saveCustomer(customer: Customer): Promise<Customer> {
    const list = localStore.getCustomers();
    const index = list.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.unshift(customer);
    }
    localStore.saveCustomers(list);
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
    } catch (_) {}
    return customer;
  },

  async deleteCustomer(id: string): Promise<void> {
    const list = localStore.getCustomers().filter((c) => c.id !== id);
    localStore.saveCustomers(list);
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (_) {}
  },

  // Fournisseurs
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        localStore.saveSuppliers(data);
        return data;
      }
    } catch (_) {}
    return localStore.getSuppliers();
  },

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    const list = localStore.getSuppliers();
    const index = list.findIndex((s) => s.id === supplier.id);
    if (index >= 0) {
      list[index] = supplier;
    } else {
      list.unshift(supplier);
    }
    localStore.saveSuppliers(list);
    try {
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier),
      });
    } catch (_) {}
    return supplier;
  },

  async deleteSupplier(id: string): Promise<void> {
    const list = localStore.getSuppliers().filter((s) => s.id !== id);
    localStore.saveSuppliers(list);
    try {
      await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    } catch (_) {}
  },

  // Produits
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        localStore.saveProducts(data);
        return data;
      }
    } catch (_) {}
    return localStore.getProducts();
  },

  async saveProduct(product: Product): Promise<Product> {
    const list = localStore.getProducts();
    const index = list.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      list[index] = product;
    } else {
      list.unshift(product);
    }
    localStore.saveProducts(list);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    } catch (_) {}
    return product;
  },

  async deleteProduct(id: string): Promise<void> {
    const list = localStore.getProducts().filter((p) => p.id !== id);
    localStore.saveProducts(list);
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch (_) {}
  },

  // Documents
  async getDocuments(): Promise<CommercialDocument[]> {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        localStore.saveDocuments(data);
        return data;
      }
    } catch (_) {}
    return localStore.getDocuments();
  },

  async saveDocument(doc: CommercialDocument): Promise<CommercialDocument> {
    const list = localStore.getDocuments();
    const index = list.findIndex((d) => d.id === doc.id);
    if (index >= 0) {
      list[index] = { ...doc, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(doc);
    }
    localStore.saveDocuments(list);
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
    } catch (_) {}
    return doc;
  },

  async deleteDocument(id: string): Promise<void> {
    const list = localStore.getDocuments().filter((d) => d.id !== id);
    localStore.saveDocuments(list);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    } catch (_) {}
  },

  // Conversion automatique
  async convertDocument(sourceDocId: string, targetType: DocumentType): Promise<CommercialDocument | null> {
    const docs = localStore.getDocuments();
    const sourceDoc = docs.find((d) => d.id === sourceDocId);
    if (!sourceDoc) return null;

    const existingNumbers = docs.map((d) => d.documentNumber);
    const newDocNumber = generateNextDocNumber(existingNumbers, targetType);

    const convertedDoc: CommercialDocument = {
      ...sourceDoc,
      id: `doc-${Date.now()}`,
      docType: targetType,
      documentNumber: newDocNumber,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: targetType === 'facture' ? 'unpaid' : 'draft',
      paidAmount: targetType === 'avoir' ? sourceDoc.paidAmount : 0,
      remainingAmount: targetType === 'avoir' ? 0 : sourceDoc.totalTtc,
      convertedFromId: sourceDoc.id,
      notes: `Généré automatiquement depuis le ${sourceDoc.documentNumber}`,
      createdAt: new Date().toISOString(),
    };

    // Marquer le document source comme converti
    sourceDoc.convertedToId = convertedDoc.id;
    if (sourceDoc.docType === 'devis' && targetType === 'facture') {
      sourceDoc.status = 'accepted';
    }

    docs.unshift(convertedDoc);
    localStore.saveDocuments(docs);
    return convertedDoc;
  },

  // Calcul des statistiques pour le tableau de bord
  computeDashboardStats(): DashboardStats {
    const docs = localStore.getDocuments();

    const quotationCount = docs.filter((d) => d.docType === 'devis').length;
    const invoiceCount = docs.filter((d) => d.docType === 'facture').length;
    const orderCount = docs.filter((d) => d.docType === 'bon_commande').length;
    const deliveryCount = docs.filter((d) => d.docType === 'bon_livraison').length;

    // Chiffre d'affaires = total des factures payées ou validées
    const invoices = docs.filter((d) => d.docType === 'facture' && d.status !== 'cancelled');
    const totalRevenue = invoices.reduce((acc, cur) => acc + cur.paidAmount, 0);

    const pendingQuotes = docs.filter((d) => d.docType === 'devis' && (d.status === 'draft' || d.status === 'sent'));
    const pendingQuotesCount = pendingQuotes.length;
    const pendingQuotesAmount = pendingQuotes.reduce((acc, cur) => acc + cur.totalTtc, 0);

    const paidInvoices = invoices.filter((d) => d.status === 'paid');
    const paidInvoicesCount = paidInvoices.length;
    const paidInvoicesAmount = paidInvoices.reduce((acc, cur) => acc + cur.totalTtc, 0);

    const unpaidInvoices = invoices.filter((d) => d.status === 'unpaid' || d.status === 'partially_paid');
    const unpaidInvoicesCount = unpaidInvoices.length;
    const unpaidInvoicesAmount = unpaidInvoices.reduce((acc, cur) => acc + cur.remainingAmount, 0);

    // Chiffre d'affaires mensuel sur les 6 derniers mois
    const monthsMap: Record<string, { amount: number; count: number }> = {};
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    // Initialiser les 6 derniers mois
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthsMap[label] = { amount: 0, count: 0 };
    }

    invoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthsMap[label]) {
        monthsMap[label].amount += inv.totalTtc;
        monthsMap[label].count += 1;
      }
    });

    const monthlyRevenue = Object.entries(monthsMap).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    }));

    return {
      quotationCount,
      invoiceCount,
      orderCount,
      deliveryCount,
      totalRevenue,
      pendingQuotesCount,
      pendingQuotesAmount,
      paidInvoicesCount,
      paidInvoicesAmount,
      unpaidInvoicesCount,
      unpaidInvoicesAmount,
      monthlyRevenue,
    };
  },

  // IA Assistant endpoints
  async generateAiDescription(title: string, category: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.description;
      }
    } catch (_) {}
    return `Prestation professionnelle de haute qualité : ${title} conforme aux normes du secteur ${category}. Garantie d'exécution rigoureuse et accompagnement dédié.`;
  },

  async suggestAiPricing(title: string, category: string, purchasePrice?: number): Promise<{ min: number; recommended: number; max: number; note: string }> {
    try {
      const res = await fetch('/api/ai/price-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, purchasePrice }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    const base = purchasePrice && purchasePrice > 0 ? purchasePrice * 1.4 : 5000;
    return {
      min: Math.round(base * 0.85),
      recommended: Math.round(base),
      max: Math.round(base * 1.35),
      note: 'Estimation basée sur les ratios moyens du marché marocain et des prestations professionnelles B2B.',
    };
  },

  async polishCommercialText(text: string, style: 'email' | 'terms' | 'relance'): Promise<string> {
    try {
      const res = await fetch('/api/ai/text-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.result;
      }
    } catch (_) {}
    if (style === 'relance') {
      return `Madame, Monsieur,\n\nSauf erreur ou omission de notre part, nous constatons que la facture ci-jointe reste impayée à ce jour. Nous vous prions de bien vouloir procéder à son règlement par virement bancaire dans les meilleurs délais.\n\nRestant à votre entière disposition, nous vous prions d'agréer nos salutations distinguées.`;
    }
    return text;
  },
};
