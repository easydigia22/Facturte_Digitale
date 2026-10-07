import { DocumentType, DocumentStatus } from '../types';

export function formatCurrency(amount: number = 0, currency: string = 'MAD'): string {
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  if (currency === 'MAD') return `${formatted} DH`;
  if (currency === 'EUR') return `${formatted} €`;
  if (currency === 'USD') return `$${formatted}`;
  return `${formatted} ${currency}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getDocumentTypeName(docType: DocumentType): string {
  switch (docType) {
    case 'devis':
      return 'Devis';
    case 'facture':
      return 'Facture';
    case 'bon_commande':
      return 'Bon de Commande';
    case 'bon_livraison':
      return 'Bon de Livraison';
    case 'avoir':
      return 'Facture d’Avoir';
    case 'proforma':
      return 'Facture Proforma';
    default:
      return 'Document';
  }
}

export function getDocumentPrefix(docType: DocumentType): string {
  switch (docType) {
    case 'devis':
      return 'DEV';
    case 'facture':
      return 'FAC';
    case 'bon_commande':
      return 'BC';
    case 'bon_livraison':
      return 'BL';
    case 'avoir':
      return 'AV';
    case 'proforma':
      return 'PRO';
  }
}

export function generateNextDocNumber(existingNumbers: string[], docType: DocumentType): string {
  const currentYear = new Date().getFullYear();
  const prefix = getDocumentPrefix(docType);
  const regex = new RegExp(`^${prefix}-${currentYear}-(\\d{4,})$`);

  let maxSeq = 0;
  for (const num of existingNumbers) {
    const match = num.match(regex);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `${prefix}-${currentYear}-${nextSeq}`;
}

export function getStatusDetails(status: DocumentStatus): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'draft':
      return { label: 'Brouillon', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };
    case 'sent':
      return { label: 'Envoyé', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'validated':
      return { label: 'Validé', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    case 'accepted':
      return { label: 'Accepté', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'rejected':
      return { label: 'Refusé', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' };
    case 'delivered':
      return { label: 'Livré', bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' };
    case 'paid':
      return { label: 'Payé', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' };
    case 'partially_paid':
      return { label: 'Paiement partiel', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'unpaid':
      return { label: 'Impayé', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-600' };
    case 'cancelled':
      return { label: 'Annulé', bg: 'bg-zinc-100', text: 'text-zinc-600', dot: 'bg-zinc-400' };
    default:
      return { label: status, bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
  }
}
