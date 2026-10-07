import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Sparkles,
  ArrowLeft,
  UserPlus,
  HelpCircle,
} from 'lucide-react';
import { CommercialDocument, Company, Customer, DocumentItem, DocumentType, Product } from '../types';
import { formatCurrency, generateNextDocNumber, getDocumentTypeName } from '../utils/formatters';
import { amountToLegalWords } from '../utils/numberToWords';
import { api } from '../services/api';

interface DocumentEditorProps {
  initialDocument?: CommercialDocument | null;
  defaultDocType?: DocumentType;
  existingNumbers: string[];
  customers: Customer[];
  products: Product[];
  company: Company;
  darkMode: boolean;
  onSave: (doc: CommercialDocument, andPrint?: boolean) => void;
  onCancel: () => void;
  onSaveNewCustomer?: (customer: Customer) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialDocument,
  defaultDocType = 'facture',
  existingNumbers,
  customers,
  products,
  company,
  darkMode,
  onSave,
  onCancel,
  onSaveNewCustomer,
}) => {
  // Document base state
  const [docType, setDocType] = useState<DocumentType>(initialDocument?.docType || defaultDocType);
  const [documentNumber, setDocumentNumber] = useState<string>(
    initialDocument?.documentNumber || generateNextDocNumber(existingNumbers, defaultDocType)
  );
  const [referenceExternal, setReferenceExternal] = useState<string>(initialDocument?.referenceExternal || '');
  const [customerId, setCustomerId] = useState<string>(initialDocument?.customerId || (customers[0]?.id || ''));
  const [issueDate, setIssueDate] = useState<string>(
    initialDocument?.issueDate || new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState<string>(
    initialDocument?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<any>(initialDocument?.status || (docType === 'facture' ? 'unpaid' : 'draft'));
  const [discountPercent, setDiscountPercent] = useState<number>(initialDocument?.discountPercent || 0);
  const [paidAmount, setPaidAmount] = useState<number>(initialDocument?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>(initialDocument?.paymentMethod || 'Virement bancaire');
  const [notes, setNotes] = useState<string>(initialDocument?.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    initialDocument?.termsAndConditions || (docType === 'devis' ? company.quotationTerms : company.invoiceTerms)
  );

  // Quick Client creation modal state
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustIce, setNewCustIce] = useState('');
  const [newCustCity, setNewCustCity] = useState('Casablanca');
  const [newCustPhone, setNewCustPhone] = useState('');

  // AI loading state
  const [aiLoadingIndex, setAiLoadingIndex] = useState<number | null>(null);

  // Items
  const [items, setItems] = useState<DocumentItem[]>(
    initialDocument?.items || [
      {
        id: `item-${Date.now()}`,
        reference: 'SRV-01',
        description: 'Prestation de service ou produit',
        quantity: 1,
        unit: 'U',
        unitPriceHt: 1000,
        discountPercent: 0,
        vatRate: company.defaultVatRate || 20,
        totalHt: 1000,
        totalVat: 200,
        totalTtc: 1200,
      },
    ]
  );

  // Re-generate document number when docType changes if creating new
  useEffect(() => {
    if (!initialDocument) {
      setDocumentNumber(generateNextDocNumber(existingNumbers, docType));
      if (docType === 'facture') setStatus('unpaid');
      else setStatus('draft');
      setTermsAndConditions(docType === 'devis' ? company.quotationTerms : company.invoiceTerms);
    }
  }, [docType]);

  // Recalculate item line totals
  const recalculateItem = (item: DocumentItem): DocumentItem => {
    const qte = item.quantity || 0;
    const pu = item.unitPriceHt || 0;
    const itemDisc = (item.discountPercent || 0) / 100;
    const vat = (item.vatRate || 0) / 100;

    const baseHt = qte * pu;
    const lineDiscountAmount = baseHt * itemDisc;
    const lineHt = Math.round((baseHt - lineDiscountAmount) * 100) / 100;
    const lineVat = Math.round((lineHt * vat) * 100) / 100;
    const lineTtc = Math.round((lineHt + lineVat) * 100) / 100;

    return {
      ...item,
      totalHt: lineHt,
      totalVat: lineVat,
      totalTtc: lineTtc,
    };
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    const current = { ...newItems[index], [field]: value };
    newItems[index] = recalculateItem(current);
    setItems(newItems);
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newItems = [...items];
    const current = {
      ...newItems[index],
      productId: prod.id,
      reference: prod.reference,
      description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
      unitPriceHt: prod.unitPriceHt,
      vatRate: prod.vatRate,
      unit: prod.unit,
    };
    newItems[index] = recalculateItem(current);
    setItems(newItems);
  };

  const addItem = () => {
    const newItem: DocumentItem = {
      id: `item-${Date.now()}`,
      reference: '',
      description: '',
      quantity: 1,
      unit: 'U',
      unitPriceHt: 0,
      discountPercent: 0,
      vatRate: company.defaultVatRate || 20,
      totalHt: 0,
      totalVat: 0,
      totalTtc: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // AI Description Generator for a line item
  const handleGenerateAiDesc = async (index: number) => {
    const item = items[index];
    if (!item.description && !item.reference) return;
    setAiLoadingIndex(index);
    try {
      const enhanced = await api.generateAiDescription(item.description || item.reference, 'Prestation Professionnelle');
      handleItemChange(index, 'description', enhanced);
    } catch (_) {
    } finally {
      setAiLoadingIndex(null);
    }
  };

  // Global calculations
  const rawTotalHt = items.reduce((acc, cur) => acc + cur.totalHt, 0);
  const globalDiscountAmount = Math.round((rawTotalHt * (discountPercent / 100)) * 100) / 100;
  const netTotalHt = rawTotalHt - globalDiscountAmount;
  const totalVat = Math.round(
    items.reduce((acc, cur) => {
      // ajuster la tva proportionnellement à la remise globale
      const ratio = rawTotalHt > 0 ? (rawTotalHt - globalDiscountAmount) / rawTotalHt : 1;
      return acc + cur.totalVat * ratio;
    }, 0) * 100
  ) / 100;
  const totalTtc = Math.round((netTotalHt + totalVat) * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((totalTtc - paidAmount) * 100) / 100);

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Save handler
  const handleSubmit = (andPrint: boolean = false) => {
    if (!customerId) {
      alert('Veuillez sélectionner ou créer un client.');
      return;
    }
    if (items.length === 0 || !items[0].description) {
      alert('Veuillez ajouter au moins une ligne d’article avec une désignation.');
      return;
    }

    const docToSave: CommercialDocument = {
      id: initialDocument?.id || `doc-${Date.now()}`,
      docType,
      documentNumber,
      referenceExternal,
      customerId,
      customerName: selectedCustomer?.name,
      customerIce: selectedCustomer?.ice,
      customerAddress: selectedCustomer?.address,
      customerCity: selectedCustomer?.city,
      issueDate,
      dueDate,
      status: paidAmount >= totalTtc && docType === 'facture' ? 'paid' : status,
      discountPercent,
      discountAmount: globalDiscountAmount,
      totalHt: netTotalHt,
      totalVat,
      totalTtc,
      paidAmount,
      remainingAmount,
      paymentMethod,
      notes,
      termsAndConditions,
      currency: company.currency,
      items,
      createdAt: initialDocument?.createdAt || new Date().toISOString(),
    };

    onSave(docToSave, andPrint);
  };

  // Quick customer save
  const handleQuickCustomer = () => {
    if (!newCustName.trim()) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      contactPerson: '',
      email: '',
      phone: newCustPhone,
      address: '',
      city: newCustCity,
      ice: newCustIce,
      ifCode: '',
      rc: '',
      patente: '',
      paymentTerms: '30 jours',
      createdAt: new Date().toISOString(),
    };

    if (onSaveNewCustomer) {
      onSaveNewCustomer(newCust);
    }
    setCustomerId(newCust.id);
    setShowQuickCustomerModal(false);
    setNewCustName('');
    setNewCustIce('');
    setNewCustPhone('');
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{initialDocument ? 'Modifier' : 'Nouveau'} {getDocumentTypeName(docType)}</span>
              <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {documentNumber}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Remplissez les détails et validez pour générer les exports PDF, Word et Excel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Enregistrer & Imprimer</span>
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
            style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div
        className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Type de Document */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Type de Document
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="facture">Facture</option>
              <option value="devis">Devis</option>
              <option value="bon_commande">Bon de Commande</option>
              <option value="bon_livraison">Bon de Livraison</option>
              <option value="proforma">Facture Proforma</option>
              <option value="avoir">Facture d’Avoir</option>
            </select>
          </div>

          {/* Numéro Document */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Numéro Légal
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Client Destinataire */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Client Destinataire
              </label>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Nouveau client rapide</span>
              </button>
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Sélectionnez un client...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.ice ? `(ICE: ${c.ice})` : ''} - {c.city}
                </option>
              ))}
            </select>
          </div>

          {/* Date d'émission */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Date d'Émission
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Date d'échéance */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Date d'Échéance
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="validated">Validé</option>
              <option value="accepted">Accepté</option>
              <option value="paid">Payé</option>
              <option value="partially_paid">Paiement partiel</option>
              <option value="unpaid">Impayé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          {/* Référence externe */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Réf. Externe / Bon N°
            </label>
            <input
              type="text"
              placeholder="ex: BC-CLIENT-2026-9"
              value={referenceExternal}
              onChange={(e) => setReferenceExternal(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Selected Customer Preview Banner */}
        {selectedCustomer && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</span>
              {selectedCustomer.address && <span> • {selectedCustomer.address}, {selectedCustomer.city}</span>}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              {selectedCustomer.ice && <span>ICE: <strong className="text-slate-700 dark:text-slate-300">{selectedCustomer.ice}</strong></span>}
              {selectedCustomer.ifCode && <span>IF: <strong className="text-slate-700 dark:text-slate-300">{selectedCustomer.ifCode}</strong></span>}
              {selectedCustomer.rc && <span>RC: <strong className="text-slate-700 dark:text-slate-300">{selectedCustomer.rc}</strong></span>}
            </div>
          </div>
        )}
      </div>

      {/* Lignes du document */}
      <div
        className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Articles & Prestations
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white shadow-sm hover:brightness-105 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ajouter une ligne</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-bold border-b border-inherit">
              <tr>
                <th className="px-2 py-2.5 w-32">Article Catalogue</th>
                <th className="px-2 py-2.5 w-24">Réf.</th>
                <th className="px-2 py-2.5 min-w-[200px]">Désignation & Détails</th>
                <th className="px-2 py-2.5 w-16 text-right">Qté</th>
                <th className="px-2 py-2.5 w-16">Unité</th>
                <th className="px-2 py-2.5 w-24 text-right">P.U. HT</th>
                <th className="px-2 py-2.5 w-16 text-right">Rem.%</th>
                <th className="px-2 py-2.5 w-20 text-right">TVA%</th>
                <th className="px-2 py-2.5 w-24 text-right">Total HT</th>
                <th className="px-2 py-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  {/* Catalogue pick */}
                  <td className="px-2 py-2">
                    <select
                      onChange={(e) => handleSelectProduct(index, e.target.value)}
                      className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Sélectionner...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.reference} - {p.name.slice(0, 18)}...
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Ref */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Réf."
                      value={item.reference}
                      onChange={(e) => handleItemChange(index, 'reference', e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>

                  {/* Designation & AI button */}
                  <td className="px-2 py-2">
                    <div className="relative">
                      <textarea
                        rows={2}
                        placeholder="Description complète de la prestation ou du produit..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateAiDesc(index)}
                        disabled={aiLoadingIndex === index}
                        className="absolute right-1 bottom-2 p-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 rounded hover:bg-indigo-100 flex items-center gap-0.5 cursor-pointer"
                        title="Enrichir avec l'IA"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{aiLoadingIndex === index ? 'Génération...' : 'IA'}</span>
                      </button>
                    </div>
                  </td>

                  {/* Qte */}
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 text-right font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>

                  {/* Unite */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="U"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>

                  {/* PU HT */}
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitPriceHt}
                      onChange={(e) => handleItemChange(index, 'unitPriceHt', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 text-right font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>

                  {/* Remise % */}
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(e) => handleItemChange(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>

                  {/* TVA % */}
                  <td className="px-2 py-2 text-right">
                    <select
                      value={item.vatRate}
                      onChange={(e) => handleItemChange(index, 'vatRate', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 text-right font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="20">20%</option>
                      <option value="14">14%</option>
                      <option value="10">10%</option>
                      <option value="7">7%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>

                  {/* Total HT */}
                  <td className="px-2 py-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.totalHt, company.currency)}
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conditions, Notes & Arrêté légal */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Conditions Générales de Règlement
            </label>
            <textarea
              rows={2}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Notes Particulières / Instructions de livraison
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Livraison au quai n°4, réception par M. Tazi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Arrêté légal en toutes lettres */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
              Mention Légale en toutes lettres (Art. CGI & Code de commerce)
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic mt-1">
              " Arrêté la présente pièce à la somme de : {amountToLegalWords(totalTtc, company.currency)} TTC "
            </p>
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div
          className={`p-6 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h4 className="font-extrabold text-base text-slate-900 dark:text-white border-b pb-2">
            Récapitulatif Financier
          </h4>

          {/* Total HT Brut */}
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total HT Brut :</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatCurrency(rawTotalHt, company.currency)}
            </span>
          </div>

          {/* Remise Globale */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">Remise Globale :</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-14 text-xs p-1 text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <span className="text-slate-400">%</span>
              </div>
            </div>
            <span className="font-semibold text-rose-600">
              -{formatCurrency(globalDiscountAmount, company.currency)}
            </span>
          </div>

          {/* Net Commercial HT */}
          <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200 pt-1 border-t">
            <span>Total Net HT :</span>
            <span>{formatCurrency(netTotalHt, company.currency)}</span>
          </div>

          {/* TVA */}
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total TVA :</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatCurrency(totalVat, company.currency)}
            </span>
          </div>

          {/* TOTAL TTC */}
          <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t">
            <span>TOTAL TTC :</span>
            <span style={{ color: company.primaryColor || '#4f46e5' }}>
              {formatCurrency(totalTtc, company.currency)}
            </span>
          </div>

          {/* Montant Payé & Reste à payer */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-600 dark:text-slate-400">
                Acompte / Montant Réglé :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={totalTtc}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-28 text-xs p-1 text-right font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600"
                />
                <span className="text-slate-400 font-bold">{company.currency}</span>
              </div>
            </div>

            <div className="flex justify-between text-xs font-black">
              <span className="text-rose-600">Reste à Payer (Solde) :</span>
              <span className="text-rose-600 text-sm">
                {formatCurrency(remainingAmount, company.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Quick New Customer */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
              Ajout Rapide de Client
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nom / Raison Sociale *
                </label>
                <input
                  type="text"
                  placeholder="ex: SOCIETE MAGHREB SERVICES SARL"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ICE (15 chiffres)
                </label>
                <input
                  type="text"
                  placeholder="001234567000088"
                  value={newCustIce}
                  onChange={(e) => setNewCustIce(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="+212 6..."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleQuickCustomer}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              >
                Créer & Associer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
