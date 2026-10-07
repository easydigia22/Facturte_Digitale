import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Mail,
  Copy,
  Check,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '../services/api';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  darkMode: boolean;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currency,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'relance' | 'devis_intro' | 'describe' | 'pricing'>('relance');
  const [inputText, setInputText] = useState('');
  const [categoryInput, setCategoryInput] = useState('Informatique & Services');
  const [costInput, setCostInput] = useState<string>('2000');
  const [resultText, setResultText] = useState('');
  const [priceResult, setPriceResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setResultText('');
    setPriceResult(null);

    try {
      if (activeTab === 'relance') {
        const text = inputText || 'Facture FAC-2026-0002 de 20 400 DH pour le client Tanger Textile en retard de 15 jours';
        const res = await api.polishCommercialText(text, 'relance');
        setResultText(res);
      } else if (activeTab === 'devis_intro') {
        const text = inputText || 'Proposition pour refonte plateforme e-commerce et hébergement cloud avec remise 10%';
        const res = await api.polishCommercialText(text, 'email');
        setResultText(res);
      } else if (activeTab === 'describe') {
        const title = inputText || 'Audit de Sécurité & Test d’Intrusion';
        const res = await api.generateAiDescription(title, categoryInput);
        setResultText(res);
      } else if (activeTab === 'pricing') {
        const title = inputText || 'Contrat de maintenance annuelle serveur cloud';
        const cost = parseFloat(costInput) || 0;
        const res = await api.suggestAiPricing(title, categoryInput, cost);
        setPriceResult(res);
      }
    } catch (err: any) {
      setResultText(`Erreur lors de la génération: ${err?.message || 'Vérifiez la connexion'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    const textToCopy = resultText || (priceResult ? `Prix recommandé: ${priceResult.recommended} ${currency}. ${priceResult.note}` : '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border p-6 flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Assistant Commercial IA Pro
                </h3>
                <p className="text-xs text-slate-500">
                  Génération et optimisation assistée par intelligence artificielle
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4">
            <button
              onClick={() => {
                setActiveTab('relance');
                setInputText('');
                setResultText('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'relance'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              <span>Relance Facture</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('devis_intro');
                setInputText('');
                setResultText('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'devis_intro'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Accompagnement Devis</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('describe');
                setInputText('');
                setResultText('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'describe'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Description Article</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('pricing');
                setInputText('');
                setPriceResult(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Suggestion Tarifaire</span>
            </button>
          </div>

          {/* Form input */}
          <div className="space-y-3 text-xs mb-4">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                {activeTab === 'relance' && 'Détails de la relance (numéro de facture, client, retard, montant)'}
                {activeTab === 'devis_intro' && 'Détails de la proposition commerciale à accompagner'}
                {activeTab === 'describe' && 'Nom de la prestation ou de l’article'}
                {activeTab === 'pricing' && 'Nom du produit ou service à analyser'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  activeTab === 'relance'
                    ? 'Ex: Relancer Nova Distribution pour la facture FAC-2026-0002 de 27 000 DH impayée depuis 15 jours'
                    : activeTab === 'devis_intro'
                    ? 'Ex: Envoi du devis DEV-2026-0001 pour la refonte ERP de Tanger Smart Textile avec remise de 5%'
                    : 'Ex: Installation & Configuration Serveur Dédié Linux Ubuntu Haute Disponibilité'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            {(activeTab === 'describe' || activeTab === 'pricing') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                {activeTab === 'pricing' && (
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Coût d'achat / Prix de revient ({currency})
                    </label>
                    <input
                      type="number"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isLoading ? 'Génération par l’IA en cours...' : 'Générer avec l’IA'}</span>
          </button>

          {/* Result Block */}
          {(resultText || priceResult) && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Résultat généré
                </span>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              {resultText && (
                <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                  {resultText}
                </div>
              )}

              {priceResult && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                      <div className="text-[10px] text-slate-500 font-bold">Prix Plancher</div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        {priceResult.min} {currency}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold">Recommandé</div>
                      <div className="font-extrabold text-emerald-600 text-sm">
                        {priceResult.recommended} {currency}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                      <div className="text-[10px] text-slate-500 font-bold">Prix Premium</div>
                      <div className="font-bold text-indigo-600">
                        {priceResult.max} {currency}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1">
                    {priceResult.note}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
