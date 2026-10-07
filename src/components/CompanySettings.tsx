import React, { useState } from 'react';
import {
  Building2,
  Save,
  Upload,
  Image as ImageIcon,
  Palette,
  FileCheck,
  CreditCard,
  Stamp,
  CheckCircle,
} from 'lucide-react';
import { Company } from '../types';

interface CompanySettingsProps {
  company: Company;
  darkMode: boolean;
  onSaveCompany: (updated: Company) => void;
}

const PRESET_COLORS = [
  { label: 'Indigo Impérial', hex: '#4f46e5' },
  { label: 'Bleu Marine Odoo', hex: '#1e3a8a' },
  { label: 'Émeraude Finance', hex: '#059669' },
  { label: 'Bordeaux & Rubis', hex: '#991b1b' },
  { label: 'Bleu Pétrole', hex: '#0e7490' },
  { label: 'Ardoise Sombre', hex: '#334155' },
];

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  company: initialCompany,
  darkMode,
  onSaveCompany,
}) => {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: keyof Company, value: any) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleImageUpload = (
    field: 'logoUrl' | 'stampUrl' | 'signatureUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      handleChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSaveCompany(company);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Paramètres de l'Entreprise & Modèles</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personnalisez vos mentions fiscales marocaines (ICE, IF, RC, Patente), votre charte graphique et vos coordonnées bancaires.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
          style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
        >
          {isSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Modifications enregistrées !' : 'Enregistrer les paramètres'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne gauche : Informations Société & Identifiants légaux */}
        <div className="md:col-span-2 space-y-6">
          {/* Fiche Raison Sociale */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Identité & Coordonnées</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nom / Raison Sociale de la Société *
                </label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-extrabold text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Forme Juridique
                </label>
                <input
                  type="text"
                  placeholder="ex: SARL, SARL AU, SA, Auto-entrepreneur"
                  value={company.legalForm}
                  onChange={(e) => handleChange('legalForm', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Adresse du Siège Social
                </label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email Professionnel
                </label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Site Web
                </label>
                <input
                  type="text"
                  value={company.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Mentions Légales Marocaines */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>Mentions Fiscales Obligatoires (DGI / OMPIC)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ICE (Identifiant Commun de l’Entreprise - 15 chiffres) *
                </label>
                <input
                  type="text"
                  value={company.ice}
                  onChange={(e) => handleChange('ice', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Identifiant Fiscal (IF) *
                </label>
                <input
                  type="text"
                  value={company.ifCode}
                  onChange={(e) => handleChange('ifCode', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Registre de Commerce (RC & Tribunal) *
                </label>
                <input
                  type="text"
                  value={company.rc}
                  onChange={(e) => handleChange('rc', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Patente (Taxe Professionnelle) *
                </label>
                <input
                  type="text"
                  value={company.patente}
                  onChange={(e) => handleChange('patente', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  N° CNSS
                </label>
                <input
                  type="text"
                  value={company.cnss || ''}
                  onChange={(e) => handleChange('cnss', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Coordonnées Bancaires & Devise */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>Modalités Bancaires & Devise</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nom de la Banque & Agence
                </label>
                <input
                  type="text"
                  placeholder="ex: Attijariwafa Bank, BCP, BMCE, CIH, SGMB..."
                  value={company.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Devise Principale
                </label>
                <select
                  value={company.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="MAD">MAD (Dirham Marocain - DH)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="USD">USD ($ - Dollar US)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  RIB Bancaire (Relevé d'Identité Bancaire - 24 chiffres au Maroc)
                </label>
                <input
                  type="text"
                  placeholder="011 780 0000 123456789012 34"
                  value={company.rib}
                  onChange={(e) => handleChange('rib', e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Personnalisation Graphique, Logo, Cachet, Signature */}
        <div className="space-y-6">
          {/* Charte Graphique & Couleurs */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-500" />
              <span>Couleur de Marque</span>
            </h3>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleChange('primaryColor', c.hex)}
                    className={`w-8 h-8 rounded-xl border-2 transition-transform cursor-pointer ${
                      company.primaryColor === c.hex ? 'scale-110 border-slate-900 dark:border-white shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Code Hexadécimal personnalisé
                </label>
                <input
                  type="text"
                  value={company.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Logo Société */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Logo de l'Entreprise</span>
            </h3>

            {company.logoUrl ? (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-center relative group">
                <img
                  src={company.logoUrl}
                  alt="Logo"
                  className="h-16 max-w-full mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => handleChange('logoUrl', '')}
                  className="text-[10px] text-rose-500 font-bold underline mt-2 cursor-pointer"
                >
                  Supprimer le logo
                </button>
              </div>
            ) : (
              <div className="mb-3 p-4 border border-dashed rounded-xl text-center text-xs text-slate-400">
                Aucun logo configuré
              </div>
            )}

            <label className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Téléverser un logo (PNG, JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('logoUrl', e)}
                className="hidden"
              />
            </label>
          </div>

          {/* Cachet & Tampon */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Stamp className="w-4 h-4 text-rose-500" />
              <span>Cachet / Tampon Officiel</span>
            </h3>

            {company.stampUrl ? (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-center">
                <img
                  src={company.stampUrl}
                  alt="Cachet"
                  className="h-16 max-w-full mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => handleChange('stampUrl', '')}
                  className="text-[10px] text-rose-500 font-bold underline mt-2 cursor-pointer"
                >
                  Supprimer le cachet
                </button>
              </div>
            ) : (
              <div className="mb-3 p-4 border border-dashed rounded-xl text-center text-xs text-slate-400">
                Aucun cachet importé
              </div>
            )}

            <label className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Téléverser le cachet</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('stampUrl', e)}
                className="hidden"
              />
            </label>
          </div>

          {/* Signature électronique */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>Signature Électronique</span>
            </h3>

            {company.signatureUrl ? (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-center">
                <img
                  src={company.signatureUrl}
                  alt="Signature"
                  className="h-14 max-w-full mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => handleChange('signatureUrl', '')}
                  className="text-[10px] text-rose-500 font-bold underline mt-2 cursor-pointer"
                >
                  Supprimer la signature
                </button>
              </div>
            ) : (
              <div className="mb-3 p-4 border border-dashed rounded-xl text-center text-xs text-slate-400">
                Aucune signature enregistrée
              </div>
            )}

            <label className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Téléverser la signature</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('signatureUrl', e)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
