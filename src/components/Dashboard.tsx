import React from 'react';
import {
  TrendingUp,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  PlusCircle,
  Eye,
  FileCheck2,
  Package,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { CommercialDocument, Company, DashboardStats, DocumentType, Product } from '../types';
import { formatCurrency, formatDate, getDocumentTypeName, getStatusDetails } from '../utils/formatters';

interface DashboardProps {
  stats: DashboardStats;
  recentDocuments: CommercialDocument[];
  products: Product[];
  company: Company;
  darkMode: boolean;
  onNewDocument: (type: DocumentType) => void;
  onViewDocument: (doc: CommercialDocument) => void;
  onNavigateToTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  recentDocuments,
  products,
  company,
  darkMode,
  onNewDocument,
  onViewDocument,
  onNavigateToTab,
}) => {
  // Articles en alerte stock
  const lowStockProducts = products.filter(
    (p) => p.type === 'product' && p.minStockAlert && p.stockQuantity <= p.minStockAlert
  );

  // Calcul du taux de conversion devis -> factures
  const totalQuotes = stats.quotationCount || 1;
  const convertedQuotes = recentDocuments.filter(
    (d) => d.docType === 'devis' && (d.status === 'accepted' || d.convertedToId)
  ).length;
  const conversionRate = Math.min(100, Math.round((convertedQuotes / totalQuotes) * 100));

  // Max revenue for bar chart scaling
  const maxMonthlyAmount = Math.max(...stats.monthlyRevenue.map((m) => m.amount), 10000);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Alerte stock faible si présent */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Alerte de Stock Faible ({lowStockProducts.length} articles)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Certains produits ont atteint ou dépassé leur seuil critique :{' '}
                {lowStockProducts.map((p) => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('produits')}
            className="text-xs font-bold text-amber-800 dark:text-amber-200 underline hover:opacity-80 cursor-pointer"
          >
            Gérer les stocks &rarr;
          </button>
        </div>
      )}

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'Affaires Encaissé */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Chiffre d'Affaires Encaissé
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.totalRevenue, company.currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Facturation réelle à jour</span>
          </div>
        </div>

        {/* Factures Payées vs Impayées */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Factures Impayées / En attente
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.unpaidInvoicesAmount, company.currency)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{stats.unpaidInvoicesCount} factures en retard</span>
            <span className="text-emerald-600 font-semibold">{stats.paidInvoicesCount} réglées</span>
          </div>
        </div>

        {/* Devis en cours / En attente */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Devis en Négociation
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.pendingQuotesAmount, company.currency)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{stats.pendingQuotesCount} devis en cours</span>
            <span className="font-semibold text-indigo-600">{stats.quotationCount} émis au total</span>
          </div>
        </div>

        {/* Volume Global des Pièces */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Documents Commerciaux
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.quotationCount + stats.invoiceCount + stats.orderCount + stats.deliveryCount}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{stats.orderCount} BC</span>
            <span>•</span>
            <span>{stats.deliveryCount} BL</span>
            <span>•</span>
            <span className="text-purple-600 font-bold">{conversionRate}% conversion</span>
          </div>
        </div>
      </div>

      {/* Section Graphique & Raccourcis Rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique Statistique Mensuel */}
        <div
          className={`p-6 rounded-2xl border lg:col-span-2 transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Évolution de la Facturation Mensuelle
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Volume facturé TTC par mois sur les derniers mois
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase">Devise</span>
              <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{company.currency}</div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-700/60">
            {stats.monthlyRevenue.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.amount / maxMonthlyAmount) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[11px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-lg z-20">
                    {formatCurrency(item.amount, company.currency)} ({item.count} factures)
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl h-full flex items-end overflow-hidden p-1">
                    <div
                      className="w-full rounded-lg transition-all duration-500 group-hover:brightness-110"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: company.primaryColor || '#4f46e5',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-md"
                style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
              />
              Facturation TTC
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total facturé : {formatCurrency(stats.totalRevenue + stats.unpaidInvoicesAmount, company.currency)}
            </span>
          </div>
        </div>

        {/* Raccourcis Création Rapide (< 2 minutes) */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              Création Express &lt; 2 min
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Générez vos pièces commerciales avec numérotation légale automatique.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => onNewDocument('facture')}
                className="w-full p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Créer une Facture
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      FAC-2026-XXXX avec TVA
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                onClick={() => onNewDocument('devis')}
                className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      Créer un Devis
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-400">
                      DEV-2026-XXXX avec validité
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </button>

              <button
                onClick={() => onNewDocument('bon_commande')}
                className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/50 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Bon de Commande
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">
                      BC-2026-XXXX client/fournisseur
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </button>

              <button
                onClick={() => onNavigateToTab('clients')}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Ajouter ou Importer Client
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fiches avec ICE, IF, RC, Patente
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Derniers Documents Commerciaux */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Derniers Documents Commerciaux
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Devis, factures et bons émis récemment
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('factures')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Voir tous les documents &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-inherit">
              <tr>
                <th className="px-5 py-3">Type & N°</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3 text-right">Total HT</th>
                <th className="px-5 py-3 text-right">Total TTC</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentDocuments.slice(0, 7).map((doc) => {
                const statusInfo = getStatusDetails(doc.status);
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-1.5 py-0.5 rounded uppercase font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {getDocumentTypeName(doc.docType)}
                        </span>
                        <span>{doc.documentNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {formatDate(doc.issueDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {doc.customerName || 'Client divers'}
                      </div>
                      {doc.customerIce && (
                        <div className="text-[10px] text-slate-400">ICE: {doc.customerIce}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrency(doc.totalHt, doc.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(doc.totalTtc, doc.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onViewDocument(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
