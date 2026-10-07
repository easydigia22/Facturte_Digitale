import React from 'react';
import { Search, Sparkles, Plus, Bell, RefreshCw, FileText } from 'lucide-react';
import { Company, DocumentType } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  company: Company;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenAi: () => void;
  onNewDocument: (type: DocumentType) => void;
  onRefresh: () => void;
  darkMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  company,
  searchTerm,
  setSearchTerm,
  onOpenAi,
  onNewDocument,
  onRefresh,
  darkMode,
}) => {
  return (
    <header
      className={`h-16 px-6 border-b flex items-center justify-between transition-colors duration-200 z-10 ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Title & Context */}
      <div>
        <h2 className="text-lg font-extrabold tracking-tight leading-none text-slate-900 dark:text-white flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {company.currency}
          </span>
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher document, client, référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Sync/Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          title="Actualiser les données"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>

        {/* Quick New Facture */}
        <button
          onClick={() => onNewDocument('facture')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl text-white shadow-sm hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
          style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
        >
          <Plus className="w-4 h-4" />
          <span>+ Facture</span>
        </button>
      </div>
    </header>
  );
};
