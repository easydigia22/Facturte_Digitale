import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  ShoppingCart,
  Truck,
  RotateCcw,
  Users,
  Building2,
  Package,
  Settings,
  Database,
  HelpCircle,
  PlusCircle,
  Sparkles,
  Sun,
  Moon,
  FileCheck2,
} from 'lucide-react';
import { Company, DocumentType } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'devis'
  | 'factures'
  | 'commandes'
  | 'livraisons'
  | 'avoirs'
  | 'clients'
  | 'fournisseurs'
  | 'produits'
  | 'parametres'
  | 'backup'
  | 'guide';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  company: Company;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onNewDocument: (type: DocumentType) => void;
  onOpenAi: () => void;
  counts: {
    devis: number;
    factures: number;
    commandes: number;
    livraisons: number;
    avoirs: number;
    clients: number;
    produits: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  company,
  darkMode,
  setDarkMode,
  onNewDocument,
  onOpenAi,
  counts,
}) => {
  const [showNewDropdown, setShowNewDropdown] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, badge: null },
    { id: 'devis', label: 'Devis', icon: FileText, badge: counts.devis },
    { id: 'factures', label: 'Factures', icon: Receipt, badge: counts.factures },
    { id: 'commandes', label: 'Bons de Commande', icon: ShoppingCart, badge: counts.commandes },
    { id: 'livraisons', label: 'Bons de Livraison', icon: Truck, badge: counts.livraisons },
    { id: 'avoirs', label: 'Avoirs & Proforma', icon: RotateCcw, badge: counts.avoirs },
    { id: 'clients', label: 'Clients', icon: Users, badge: counts.clients },
    { id: 'fournisseurs', label: 'Fournisseurs', icon: Building2, badge: null },
    { id: 'produits', label: 'Articles & Services', icon: Package, badge: counts.produits },
    { id: 'parametres', label: 'Paramètres Société', icon: Settings, badge: null },
    { id: 'backup', label: 'Sauvegarde & SQL', icon: Database, badge: null },
  ];

  return (
    <aside
      className={`w-64 flex-shrink-0 flex flex-col border-r transition-colors duration-200 select-none ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-inherit flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md text-lg"
            style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
          >
            FX
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>FacturX Pro</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PME
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={company.name}>
              {company.name}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-3 border-b border-inherit relative">
        <button
          onClick={() => setShowNewDropdown(!showNewDropdown)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm text-white shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Créer un Document</span>
        </button>

        {showNewDropdown && (
          <div
            className={`absolute left-3 right-3 top-16 z-50 rounded-xl shadow-xl border p-1.5 transition-all animate-in fade-in zoom-in-95 ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-3 py-1 uppercase tracking-wider">
              Type de document
            </div>
            <button
              onClick={() => {
                onNewDocument('facture');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Nouvelle Facture</span>
            </button>
            <button
              onClick={() => {
                onNewDocument('devis');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Nouveau Devis</span>
            </button>
            <button
              onClick={() => {
                onNewDocument('bon_commande');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              <span>Nouveau Bon de Commande</span>
            </button>
            <button
              onClick={() => {
                onNewDocument('bon_livraison');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Truck className="w-4 h-4 text-teal-500" />
              <span>Nouveau Bon de Livraison</span>
            </button>
            <button
              onClick={() => {
                onNewDocument('proforma');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-purple-500" />
              <span>Nouvelle Proforma</span>
            </button>
            <button
              onClick={() => {
                onNewDocument('avoir');
                setShowNewDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>Nouvel Avoir</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Assistant Banner */}
      <div className="p-3 mx-2 my-1 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-900/50">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Module IA Pro</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
          Générez vos descriptions d'articles, analysez vos prix et relancez vos factures.
        </p>
        <button
          onClick={onOpenAi}
          className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ouvrir l'IA</span>
        </button>
      </div>

      {/* Footer / Theme & Guide */}
      <div className="p-3 border-t border-inherit flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => setActiveTab('guide')}
          className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Guide & Aide</span>
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </aside>
  );
};
