import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileDown,
  RefreshCw,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  ArrowRightLeft,
  ChevronDown,
  Receipt,
  ShoppingCart,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { CommercialDocument, Company, Customer, DocumentStatus, DocumentType } from '../types';
import { formatCurrency, formatDate, getDocumentTypeName, getStatusDetails } from '../utils/formatters';
import { exportDocumentToWord, exportDocumentToExcel } from '../utils/exporters';

interface DocumentListProps {
  documents: CommercialDocument[];
  customers: Customer[];
  company: Company;
  filterType?: DocumentType | 'all';
  darkMode: boolean;
  onNewDocument: (type: DocumentType) => void;
  onEditDocument: (doc: CommercialDocument) => void;
  onViewDocument: (doc: CommercialDocument) => void;
  onDeleteDocument: (id: string) => void;
  onConvertDocument: (sourceDocId: string, targetType: DocumentType) => void;
  onStatusChange: (docId: string, newStatus: DocumentStatus) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  customers,
  company,
  filterType = 'all',
  darkMode,
  onNewDocument,
  onEditDocument,
  onViewDocument,
  onDeleteDocument,
  onConvertDocument,
  onStatusChange,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>(filterType);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [openConvertMenuId, setOpenConvertMenuId] = useState<string | null>(null);

  // Sync when prop filterType changes
  React.useEffect(() => {
    setSelectedType(filterType);
  }, [filterType]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Type filter
      if (selectedType !== 'all' && doc.docType !== selectedType) return false;

      // Status filter
      if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;

      // Customer filter
      if (selectedCustomerId !== 'all' && doc.customerId !== selectedCustomerId) return false;

      // Search query (number, client name, notes, reference)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = doc.documentNumber.toLowerCase().includes(q);
        const matchesClient = (doc.customerName || '').toLowerCase().includes(q);
        const matchesRef = (doc.referenceExternal || '').toLowerCase().includes(q);
        const matchesItem = doc.items.some((i) => i.description.toLowerCase().includes(q));
        if (!matchesNumber && !matchesClient && !matchesRef && !matchesItem) return false;
      }

      // Date filter
      if (dateFrom && doc.issueDate < dateFrom) return false;
      if (dateTo && doc.issueDate > dateTo) return false;

      // Amount filter
      if (minAmount && doc.totalTtc < parseFloat(minAmount)) return false;
      if (maxAmount && doc.totalTtc > parseFloat(maxAmount)) return false;

      return true;
    });
  }, [
    documents,
    selectedType,
    selectedStatus,
    selectedCustomerId,
    searchQuery,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
  ]);

  // Totals for filtered selection
  const totalFilteredTTC = filteredDocs.reduce((acc, cur) => acc + cur.totalTtc, 0);
  const totalFilteredPaid = filteredDocs.reduce((acc, cur) => acc + cur.paidAmount, 0);
  const totalFilteredRemaining = filteredDocs.reduce((acc, cur) => acc + cur.remainingAmount, 0);

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'facture':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';
      case 'devis':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300';
      case 'bon_commande':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
      case 'bon_livraison':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300';
      case 'proforma':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300';
      case 'avoir':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Type tabs pill */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'facture', label: 'Factures' },
            { id: 'devis', label: 'Devis' },
            { id: 'bon_commande', label: 'Commandes' },
            { id: 'bon_livraison', label: 'Livraisons' },
            { id: 'proforma', label: 'Proforma' },
            { id: 'avoir', label: 'Avoirs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              showAdvancedFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtres avancés</span>
          </button>

          <button
            onClick={() => onNewDocument(selectedType === 'all' ? 'facture' : selectedType)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-sm hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
            style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Document</span>
          </button>
        </div>
      </div>

      {/* Advanced filters drawer */}
      {showAdvancedFilters && (
        <div
          className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150 ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Statut */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="all">Tous les statuts</option>
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

          {/* Client */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Client</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="all">Tous les clients</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Période (Du / Au)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-1/2 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-1/2 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Montant range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Montant TTC (Min / Max)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-1/2 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-1/2 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-4 text-xs ${
          darkMode ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-slate-900 dark:text-white">{filteredDocs.length}</strong> document(s) affiché(s)
          </span>
          <span>•</span>
          <span>
            Total TTC :{' '}
            <strong className="text-slate-900 dark:text-white">{formatCurrency(totalFilteredTTC, company.currency)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Encaissé : {formatCurrency(totalFilteredPaid, company.currency)}
          </span>
          <span>•</span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Reste à recouvrer : {formatCurrency(totalFilteredRemaining, company.currency)}
          </span>
        </div>
      </div>

      {/* Table list */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-inherit">
              <tr>
                <th className="px-4 py-3.5">Numéro & Type</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Client & ICE</th>
                <th className="px-4 py-3.5 text-right">Total HT</th>
                <th className="px-4 py-3.5 text-right">Total TTC</th>
                <th className="px-4 py-3.5 text-right">Payé / Reste</th>
                <th className="px-4 py-3.5 text-center">Statut</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Aucun document ne correspond aux critères.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const statusInfo = getStatusDetails(doc.status);
                  const isConvertOpen = openConvertMenuId === doc.id;
                  const customer = customers.find((c) => c.id === doc.customerId);

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition group"
                    >
                      {/* Numéro & Type */}
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${getDocTypeBadge(
                              doc.docType
                            )}`}
                          >
                            {getDocumentTypeName(doc.docType)}
                          </span>
                          <span>{doc.documentNumber}</span>
                        </div>
                        {doc.convertedFromId && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>Converti depuis source</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div>{formatDate(doc.issueDate)}</div>
                        {doc.dueDate && (
                          <div className="text-[10px] text-slate-400">Éch : {formatDate(doc.dueDate)}</div>
                        )}
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {doc.customerName || 'Client divers'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {doc.customerIce ? `ICE: ${doc.customerIce}` : (customer?.ice ? `ICE: ${customer.ice}` : '-')}
                        </div>
                      </td>

                      {/* Total HT */}
                      <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                        {formatCurrency(doc.totalHt, doc.currency)}
                      </td>

                      {/* Total TTC */}
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(doc.totalTtc, doc.currency)}
                      </td>

                      {/* Payé / Reste */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatCurrency(doc.paidAmount, doc.currency)}
                        </div>
                        {doc.remainingAmount > 0 && (
                          <div className="text-[10px] text-rose-500 font-bold">
                            Reste: {formatCurrency(doc.remainingAmount, doc.currency)}
                          </div>
                        )}
                      </td>

                      {/* Statut (clickable to quickly change) */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-block relative">
                          <select
                            value={doc.status}
                            onChange={(e) => onStatusChange(doc.id, e.target.value as DocumentStatus)}
                            className={`text-[11px] font-bold py-1 px-2.5 rounded-full border-none cursor-pointer focus:ring-0 ${statusInfo.bg} ${statusInfo.text}`}
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
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Voir / Imprimer PDF */}
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Voir & Imprimer PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Modifier */}
                          <button
                            onClick={() => onEditDocument(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Export Word */}
                          <button
                            onClick={() => exportDocumentToWord(doc, company, customer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Exporter Word (.docx)"
                          >
                            <FileCode className="w-4 h-4" />
                          </button>

                          {/* Export Excel */}
                          <button
                            onClick={() => exportDocumentToExcel(doc, company, customer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Exporter Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* Conversion Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenConvertMenuId(isConvertOpen ? null : doc.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Convertir ce document"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>

                            {isConvertOpen && (
                              <div
                                className={`absolute right-0 top-8 z-30 w-48 rounded-xl shadow-xl border p-1 text-left animate-in fade-in zoom-in-95 ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                                  Convertir en...
                                </div>
                                {doc.docType === 'devis' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'facture');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Convertir en Facture</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'bon_commande');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Bon de Commande</span>
                                    </button>
                                  </>
                                )}
                                {doc.docType === 'bon_commande' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'bon_livraison');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Truck className="w-3.5 h-3.5 text-teal-500" />
                                      <span>Bon de Livraison</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'facture');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Facture</span>
                                    </button>
                                  </>
                                )}
                                {doc.docType === 'facture' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'avoir');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Créer un Avoir</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onConvertDocument(doc.id, 'bon_livraison');
                                        setOpenConvertMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Truck className="w-3.5 h-3.5 text-teal-500" />
                                      <span>Bon de Livraison</span>
                                    </button>
                                  </>
                                )}
                                {doc.docType !== 'devis' && doc.docType !== 'bon_commande' && doc.docType !== 'facture' && (
                                  <button
                                    onClick={() => {
                                      onConvertDocument(doc.id, 'facture');
                                      setOpenConvertMenuId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Convertir en Facture</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Supprimer */}
                          <button
                            onClick={() => {
                              if (confirm(`Êtes-vous sûr de vouloir supprimer le document ${doc.documentNumber} ?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
