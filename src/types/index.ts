export type DocumentType = 
  | 'devis' 
  | 'facture' 
  | 'bon_commande' 
  | 'bon_livraison' 
  | 'avoir' 
  | 'proforma';

export type DocumentStatus = 
  | 'draft'          // Brouillon
  | 'sent'           // Envoyé
  | 'validated'      // Validé
  | 'accepted'       // Accepté
  | 'rejected'       // Rejeté
  | 'delivered'      // Livré
  | 'paid'           // Payé
  | 'partially_paid' // Partiellement payé
  | 'unpaid'         // Impayé
  | 'cancelled';     // Annulé

export interface Company {
  id: string;
  name: string;
  legalForm: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  ice: string;        // Identifiant Commun de l’Entreprise (Maroc)
  ifCode: string;     // Identifiant Fiscal
  rc: string;         // Registre de Commerce
  patente: string;    // Taxe Professionnelle / Patente
  cnss?: string;      // Caisse Nationale de Sécurité Sociale
  rib: string;        // Relevé d'Identité Bancaire
  bankName: string;
  currency: string;
  currencySymbol: string;
  defaultVatRate: number;
  logoUrl?: string;
  stampUrl?: string;   // Cachet
  signatureUrl?: string; // Signature
  primaryColor: string;
  headerText: string;
  footerText: string;
  invoiceTerms: string;
  quotationTerms: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  ice: string;
  ifCode: string;
  rc: string;
  patente: string;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  ice: string;
  ifCode: string;
  rc: string;
  patente: string;
  rib?: string;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  type: 'product' | 'service';
  category: string;
  description: string;
  unitPriceHt: number;
  vatRate: number;
  unit: string;
  stockQuantity: number;
  minStockAlert?: number;
  purchasePriceHt?: number;
  barcode?: string;
}

export interface DocumentItem {
  id: string;
  productId?: string;
  reference: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  discountPercent: number;
  vatRate: number;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
}

export interface CommercialDocument {
  id: string;
  docType: DocumentType;
  documentNumber: string; // ex: DEV-2026-0001, FAC-2026-0001
  referenceExternal?: string;
  customerId: string;
  customerName?: string;
  customerIce?: string;
  customerAddress?: string;
  customerCity?: string;
  supplierId?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string;  // YYYY-MM-DD
  status: DocumentStatus;
  discountPercent: number;
  discountAmount: number;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string;
  convertedFromId?: string;
  convertedToId?: string;
  notes?: string;
  termsAndConditions?: string;
  currency: string;
  items: DocumentItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  documentId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface DashboardStats {
  quotationCount: number;
  invoiceCount: number;
  orderCount: number;
  deliveryCount: number;
  totalRevenue: number;
  pendingQuotesCount: number;
  pendingQuotesAmount: number;
  paidInvoicesCount: number;
  paidInvoicesAmount: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  monthlyRevenue: { month: string; amount: number; count: number }[];
}
