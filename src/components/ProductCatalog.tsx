import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Upload,
  Sparkles,
  AlertTriangle,
  X,
  TrendingUp,
} from 'lucide-react';
import { Product } from '../types';
import { exportProductsToExcel } from '../utils/exporters';
import { parseProductsFromExcel, readExcelFile } from '../utils/importers';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';

interface ProductCatalogProps {
  products: Product[];
  currency: string;
  darkMode: boolean;
  onSaveProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  currency,
  darkMode,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'product' | 'service'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [ref, setRef] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [category, setCategory] = useState('Informatique & Services');
  const [unitPriceHt, setUnitPriceHt] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);
  const [unit, setUnit] = useState('U');
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [purchasePriceHt, setPurchasePriceHt] = useState<number>(0);
  const [description, setDescription] = useState('');

  // AI loading states
  const [isAiDescLoading, setIsAiDescLoading] = useState(false);
  const [isAiPriceLoading, setIsAiPriceLoading] = useState(false);
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<{ min: number; recommended: number; max: number; note: string } | null>(null);

  const categories = Array.from(new Set(products.map((p) => p.category || 'Général'))).filter(Boolean);

  const openModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setRef(prod.reference);
      setName(prod.name);
      setType(prod.type);
      setCategory(prod.category || 'Général');
      setUnitPriceHt(prod.unitPriceHt);
      setVatRate(prod.vatRate);
      setUnit(prod.unit);
      setStockQuantity(prod.stockQuantity ?? 0);
      setMinStockAlert(prod.minStockAlert ?? 5);
      setPurchasePriceHt(prod.purchasePriceHt ?? 0);
      setDescription(prod.description || '');
    } else {
      setEditingProduct(null);
      const nextNum = (products.length + 1).toString().padStart(4, '0');
      setRef(`ART-${nextNum}`);
      setName('');
      setType('product');
      setCategory('Général');
      setUnitPriceHt(0);
      setVatRate(20);
      setUnit('U');
      setStockQuantity(10);
      setMinStockAlert(5);
      setPurchasePriceHt(0);
      setDescription('');
    }
    setAiPriceSuggestion(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('La désignation est obligatoire.');
      return;
    }
    if (!ref.trim()) {
      alert('La référence est obligatoire.');
      return;
    }

    const saved: Product = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      reference: ref.trim(),
      name: name.trim(),
      type,
      category,
      unitPriceHt,
      vatRate,
      unit: unit || 'U',
      stockQuantity: type === 'service' ? 0 : stockQuantity,
      minStockAlert: type === 'service' ? undefined : minStockAlert,
      purchasePriceHt,
      description,
    };

    onSaveProduct(saved);
    setIsModalOpen(false);
  };

  // AI Description Generator
  const handleGenerateAiDescription = async () => {
    if (!name.trim()) {
      alert('Veuillez entrer une désignation pour l’article.');
      return;
    }
    setIsAiDescLoading(true);
    try {
      const generated = await api.generateAiDescription(name, category);
      setDescription(generated);
    } catch (_) {
    } finally {
      setIsAiDescLoading(false);
    }
  };

  // AI Smart Pricing Suggestion
  const handleSuggestAiPricing = async () => {
    if (!name.trim()) {
      alert('Veuillez entrer une désignation pour l’article.');
      return;
    }
    setIsAiPriceLoading(true);
    try {
      const suggestion = await api.suggestAiPricing(name, category, purchasePriceHt);
      setAiPriceSuggestion(suggestion);
    } catch (_) {
    } finally {
      setIsAiPriceLoading(false);
    }
  };

  // Excel Import
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelFile(file);
      const parsed = parseProductsFromExcel(rawRows);
      parsed.forEach((p) => {
        if (p.name) {
          onSaveProduct({
            id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            reference: p.reference || `REF-${Math.floor(Math.random() * 9000 + 1000)}`,
            name: p.name,
            type: p.type || 'product',
            category: p.category || 'Général',
            unitPriceHt: p.unitPriceHt || 0,
            vatRate: p.vatRate ?? 20,
            unit: p.unit || 'U',
            stockQuantity: p.stockQuantity ?? 0,
            minStockAlert: p.minStockAlert ?? 5,
            purchasePriceHt: p.purchasePriceHt ?? 0,
            description: p.description || '',
          });
        }
      });
      alert(`${parsed.length} article(s) importé(s) dans le catalogue !`);
    } catch (err: any) {
      alert(`Erreur d'import Excel: ${err?.message || 'Fichier invalide'}`);
    }
    e.target.value = '';
  };

  const filteredProducts = products.filter((p) => {
    if (activeFilter !== 'all' && p.type !== activeFilter) return false;
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchRef = p.reference.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      return matchName || matchRef || matchCat;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Type pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tous ({products.length})
          </button>
          <button
            onClick={() => setActiveFilter('product')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'product'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Produits ({products.filter((p) => p.type === 'product').length})
          </button>
          <button
            onClick={() => setActiveFilter('service')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'service'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Services ({products.filter((p) => p.type === 'service').length})
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Réf, nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Export Excel */}
          <button
            onClick={() => exportProductsToExcel(products)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 cursor-pointer"
            title="Exporter le catalogue vers Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Import Excel */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importer Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              className="hidden"
            />
          </label>

          {/* Add Item */}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvel Article</span>
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-bold border-b border-inherit">
              <tr>
                <th className="px-5 py-3.5">Réf & Nature</th>
                <th className="px-5 py-3.5">Désignation</th>
                <th className="px-5 py-3.5">Catégorie</th>
                <th className="px-5 py-3.5 text-right">Prix Vente HT</th>
                <th className="px-5 py-3.5 text-right">TVA</th>
                <th className="px-5 py-3.5 text-right">Prix TTC</th>
                <th className="px-5 py-3.5 text-center">Stock</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Aucun produit ou service dans le catalogue.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const priceTtc = p.unitPriceHt * (1 + p.vatRate / 100);
                  const isLowStock =
                    p.type === 'product' && p.minStockAlert && p.stockQuantity <= p.minStockAlert;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {p.reference}
                        </div>
                        <span
                          className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            p.type === 'service'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {p.type === 'service' ? 'Service' : 'Produit'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                            {p.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {p.category || 'Général'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(p.unitPriceHt, currency)} / {p.unit || 'U'}
                      </td>

                      <td className="px-5 py-3.5 text-right font-semibold text-slate-500">
                        {p.vatRate}%
                      </td>

                      <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(priceTtc, currency)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {p.type === 'service' ? (
                          <span className="text-[11px] text-slate-400 italic">Illimité</span>
                        ) : (
                          <div className="inline-flex items-center gap-1 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] ${
                                isLowStock
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {p.stockQuantity} {p.unit || 'U'}
                            </span>
                            {isLowStock && (
                              <span title="Stock bas !">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer l'article "${p.name}" ?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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

      {/* Modal Fiche Article avec Module IA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>{editingProduct ? 'Modifier l’Article' : 'Nouvel Article / Service'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Type */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nature de l'élément *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="product">Produit matériel (avec gestion de stock)</option>
                  <option value="service">Prestation de Service (sans stock)</option>
                </select>
              </div>

              {/* Référence */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Référence / Code *
                </label>
                <input
                  type="text"
                  placeholder="ex: ART-0001 ou SRV-DEV-01"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              {/* Nom */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Désignation / Nom *
                </label>
                <input
                  type="text"
                  placeholder="ex: Développement Application Web Cloud"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Catégorie / Famille
                </label>
                <input
                  type="text"
                  placeholder="ex: Services, Matériel, Logiciels..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Unité */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Unité de mesure
                </label>
                <input
                  type="text"
                  placeholder="U, Prestation, Heure, Jour, Mois, Kg..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              {/* Prix d'achat HT */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Prix d'Achat HT / Coût de revient ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={purchasePriceHt}
                  onChange={(e) => setPurchasePriceHt(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              {/* Prix de vente HT & AI Suggérer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Prix de Vente HT ({currency}) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestAiPricing}
                    disabled={isAiPriceLoading}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiPriceLoading ? 'Calcul...' : 'Suggérer prix IA'}</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={unitPriceHt}
                  onChange={(e) => setUnitPriceHt(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-sm text-indigo-600"
                />
              </div>

              {/* Bloc Suggestion de prix IA si activé */}
              {aiPriceSuggestion && (
                <div className="md:col-span-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      Analyse Tarifaire IA
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnitPriceHt(aiPriceSuggestion.recommended)}
                      className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px] hover:bg-indigo-700 cursor-pointer"
                    >
                      Appliquer Recommandé ({aiPriceSuggestion.recommended} {currency})
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>Plancher : <strong>{aiPriceSuggestion.min} {currency}</strong></span>
                    <span>Recommandé : <strong className="text-emerald-600">{aiPriceSuggestion.recommended} {currency}</strong></span>
                    <span>Premium : <strong>{aiPriceSuggestion.max} {currency}</strong></span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">{aiPriceSuggestion.note}</p>
                </div>
              )}

              {/* Taux TVA */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Taux TVA Maroc
                </label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="20">20% (Taux normal standard)</option>
                  <option value="14">14% (Bâtiment, transport, électricité)</option>
                  <option value="10">10% (Restauration, hôtellerie, banques)</option>
                  <option value="7">7% (Produits de base, eau, médicaments)</option>
                  <option value="0">0% (Exonéré sans droit à déduction)</option>
                </select>
              </div>

              {/* Stock (si produit) */}
              {type === 'product' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Quantité en Stock Actuel
                    </label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Seuil d'Alerte Stock Minimum
                    </label>
                    <input
                      type="number"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    />
                  </div>
                </>
              )}

              {/* Description & Générateur IA */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Description Commerciale
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={isAiDescLoading}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiDescLoading ? 'Génération IA en cours...' : 'Rédiger avec IA'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Détails techniques, garanties, fonctionnalités..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              >
                Enregistrer l'article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
