import React from 'react';
import {
  HelpCircle,
  X,
  FileCheck2,
  Clock,
  Download,
  Database,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  darkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border p-6 flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Guide Utilisateur & Déploiement - FacturX Pro
                </h3>
                <p className="text-xs text-slate-500">
                  Documentation complète pour TPE, PME et Auto-entrepreneurs
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

          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {/* Guide Express < 2 minutes */}
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
              <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Créer un devis ou une facture en moins de 2 minutes</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <li>
                  Cliquez sur <strong>"+ Facture"</strong> ou <strong>"Créer un Document"</strong> dans la barre latérale.
                </li>
                <li>
                  Sélectionnez le client dans la liste (ou cliquez sur <em>"+ Nouveau client rapide"</em> pour saisir Nom et ICE).
                </li>
                <li>
                  Dans la table des articles, sélectionnez un produit du catalogue (remplissage automatique des prix et TVA) ou tapez directement la désignation.
                </li>
                <li>
                  Vérifiez le Total TTC et l'arrêté légal en toutes lettres calculé automatiquement.
                </li>
                <li>
                  Cliquez sur <strong>"Enregistrer & Imprimer"</strong> pour générer votre document ou l'exporter en <strong>PDF</strong>, <strong>Word (.docx)</strong> ou <strong>Excel (.xlsx)</strong> !
                </li>
              </ol>
            </div>

            {/* Mentions légales au Maroc */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mentions Légales Obligatoires (CGI Maroc & DGI)</span>
              </h4>
              <p className="mb-2">
                Conformément à la législation fiscale marocaine, les documents commerciaux doivent obligatoirement comporter :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="font-bold text-indigo-600">ICE (15 chiffres)</div>
                  <div className="text-[11px] text-slate-500">Identifiant Commun obligatoire client & vendeur</div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="font-bold text-indigo-600">IF (Identifiant Fiscal)</div>
                  <div className="text-[11px] text-slate-500">Numéro attribué par la Direction Générale des Impôts</div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="font-bold text-indigo-600">RC (Tribunal)</div>
                  <div className="text-[11px] text-slate-500">Numéro d’immatriculation au Registre du Commerce</div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="font-bold text-indigo-600">Patente (TP)</div>
                  <div className="text-[11px] text-slate-500">Numéro de la Taxe Professionnelle</div>
                </div>
              </div>
            </div>

            {/* Cycle de conversion automatique */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-600" />
                <span>Chaîne Commerciale Complète & Conversion 1-Clic</span>
              </h4>
              <p>
                FacturX Pro permet de transformer un document en un clic sans aucune resaisie :
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">Devis (DEV)</span>
                <span>&rarr;</span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">Bon de Commande (BC)</span>
                <span>&rarr;</span>
                <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg">Bon de Livraison (BL)</span>
                <span>&rarr;</span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">Facture (FAC)</span>
                <span>&rarr;</span>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg">Avoir (AV)</span>
              </div>
            </div>

            {/* Exports multi-formats */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Exports Professionnels PDF, Word & Excel</span>
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>PDF :</strong> Mise en page prête à l'impression avec logo, mentions légales, tableau des totaux, cachet et signature.
                </li>
                <li>
                  <strong>Word (.docx) :</strong> Fichier natif éditable Microsoft Word reprenant fidèlement les colonnes et les styles.
                </li>
                <li>
                  <strong>Excel (.xlsx) :</strong> Tableur structuré pour votre expert-comptable ou archivage avec ventilation de la TVA.
                </li>
              </ul>
            </div>

            {/* Instructions d'installation technique */}
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Instructions d'Installation & Déploiement</span>
              </h4>
              <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                <p># 1. Cloner et installer les dépendances</p>
                <p className="text-emerald-400">npm install</p>
                <p className="mt-2"># 2. Démarrer le serveur de développement full-stack</p>
                <p className="text-emerald-400">npm run dev</p>
                <p className="mt-2"># 3. Compiler pour la production</p>
                <p className="text-emerald-400">npm run build</p>
                <p className="mt-2"># 4. Schéma SQL SQLite & PostgreSQL</p>
                <p className="text-indigo-300">database/sqlite_schema.sql | database/postgres_schema.sql</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
