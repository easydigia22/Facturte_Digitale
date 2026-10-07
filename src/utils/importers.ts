import * as XLSX from 'xlsx';
import { Customer, Product, Supplier } from '../types';

/**
 * Lit un fichier Excel et renvoie un tableau d'objets bruts
 */
export async function readExcelFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function findKey(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const pk of possibleKeys) {
    const found = rowKeys.find((k) => k.trim().toLowerCase() === pk.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== '') {
      return row[found];
    }
  }
  return '';
}

/**
 * Convertit les lignes Excel en fiches Clients
 */
export function parseCustomersFromExcel(rows: Record<string, any>[]): Partial<Customer>[] {
  return rows.map((row) => {
    const name = findKey(row, ['nom', 'raison sociale', 'nom / raison sociale', 'client', 'name', 'societe', 'entreprise']) || 'Client sans nom';
    const contactPerson = findKey(row, ['contact', 'interlocuteur', 'responsable', 'contact person', 'gerant']);
    const email = findKey(row, ['email', 'e-mail', 'courriel', 'mail']);
    const phone = findKey(row, ['telephone', 'téléphone', 'tel', 'phone', 'gsm', 'mobile']);
    const address = findKey(row, ['adresse', 'address', 'rue']);
    const city = findKey(row, ['ville', 'city', 'localite']) || 'Casablanca';
    const ice = String(findKey(row, ['ice', 'identifiant commun', 'i.c.e']) || '');
    const ifCode = String(findKey(row, ['if', 'i.f', 'identifiant fiscal', 'code if', 'nif']) || '');
    const rc = String(findKey(row, ['rc', 'r.c', 'registre de commerce']) || '');
    const patente = String(findKey(row, ['patente', 'tp', 'taxe professionnelle']) || '');
    const paymentTerms = findKey(row, ['paiement', 'condition', 'conditions paiement', 'payment terms']) || '30 jours';

    return {
      name,
      contactPerson,
      email,
      phone: String(phone),
      address,
      city,
      ice,
      ifCode,
      rc,
      patente,
      paymentTerms,
    };
  });
}

/**
 * Convertit les lignes Excel en fiches Fournisseurs
 */
export function parseSuppliersFromExcel(rows: Record<string, any>[]): Partial<Supplier>[] {
  return rows.map((row) => {
    const name = findKey(row, ['nom', 'raison sociale', 'fournisseur', 'name', 'societe']) || 'Fournisseur';
    const contactPerson = findKey(row, ['contact', 'interlocuteur', 'responsable']);
    const email = findKey(row, ['email', 'e-mail', 'courriel']);
    const phone = findKey(row, ['telephone', 'téléphone', 'tel', 'phone']);
    const address = findKey(row, ['adresse', 'address']);
    const city = findKey(row, ['ville', 'city']) || 'Casablanca';
    const ice = String(findKey(row, ['ice', 'i.c.e']) || '');
    const ifCode = String(findKey(row, ['if', 'i.f', 'identifiant fiscal']) || '');
    const rc = String(findKey(row, ['rc', 'r.c']) || '');
    const patente = String(findKey(row, ['patente']) || '');
    const paymentTerms = findKey(row, ['paiement', 'condition', 'conditions paiement']) || 'Comptant';

    return {
      name,
      contactPerson,
      email,
      phone: String(phone),
      address,
      city,
      ice,
      ifCode,
      rc,
      patente,
      paymentTerms,
    };
  });
}

/**
 * Convertit les lignes Excel en Articles / Services du catalogue
 */
export function parseProductsFromExcel(rows: Record<string, any>[]): Partial<Product>[] {
  return rows.map((row, index) => {
    const reference = findKey(row, ['reference', 'référence', 'ref', 'code', 'sku']) || `ART-${(index + 1).toString().padStart(4, '0')}`;
    const name = findKey(row, ['designation', 'désignation', 'nom', 'article', 'name', 'produit', 'service']) || 'Article sans nom';
    const typeRaw = findKey(row, ['type', 'nature']);
    const type: 'product' | 'service' = String(typeRaw).toLowerCase().includes('serv') ? 'service' : 'product';
    const category = findKey(row, ['categorie', 'catégorie', 'famille', 'category']) || 'Général';
    const unitPriceHt = parseFloat(String(findKey(row, ['prix ht', 'prix vente ht', 'pu ht', 'prix', 'unit price']) || '0')) || 0;
    const vatRate = parseFloat(String(findKey(row, ['tva', 'taux tva', 'taux tva %', 'vat']) || '20')) || 20;
    const unit = findKey(row, ['unite', 'unité', 'unit']) || 'U';
    const stockQuantity = parseFloat(String(findKey(row, ['stock', 'quantite', 'quantité', 'stock actuel', 'qte']) || '0')) || 0;
    const minStockAlert = parseFloat(String(findKey(row, ['alerte stock', 'stock min', 'min stock']) || '5')) || 5;
    const purchasePriceHt = parseFloat(String(findKey(row, ['prix achat', 'prix achat ht', 'cout']) || '0')) || 0;
    const description = findKey(row, ['description', 'detail', 'details', 'note']) || '';

    return {
      reference,
      name,
      type,
      category,
      unitPriceHt,
      vatRate,
      unit,
      stockQuantity,
      minStockAlert,
      purchasePriceHt,
      description,
    };
  });
}
