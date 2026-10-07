import React, { useState } from 'react';
import {
  Printer,
  FileCode,
  FileSpreadsheet,
  X,
  CreditCard,
  Edit,
  ArrowRightLeft,
  CheckCircle,
} from 'lucide-react';
import { CommercialDocument, Company, Customer, DocumentType } from '../types';
import { formatCurrency, formatDate, getDocumentTypeName, getStatusDetails } from '../utils/formatters';
import { amountToLegalWords } from '../utils/numberToWords';
import { exportDocumentToWord, exportDocumentToExcel } from '../utils/exporters';

interface DocumentPreviewProps {
  document: CommercialDocument;
  company: Company;
  customer?: Customer;
  darkMode: boolean;
  onClose: () => void;
  onEdit: (doc: CommercialDocument) => void;
  onConvert: (docId: string, targetType: DocumentType) => void;
  onRecordPayment: (docId: string, amount: number, method: string) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: doc,
  company,
  customer,
  darkMode,
  onClose,
  onEdit,
  onConvert,
  onRecordPayment,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(doc.remainingAmount || 0);
  const [payMethod, setPayMethod] = useState<string>('Virement');

  const statusInfo = getStatusDetails(doc.status);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePayment = () => {
    if (payAmount <= 0) return;
    onRecordPayment(doc.id, payAmount, payMethod);
    setShowPaymentModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center p-2 sm:p-6 animate-in fade-in">
      {/* Top Action Toolbar (hidden during print) */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{getDocumentTypeName(doc.docType)} {doc.documentNumber}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Aperçu avant impression et options d’export
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Enregistrer un règlement */}
          {doc.docType === 'facture' && doc.remainingAmount > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Encaisser règlement</span>
            </button>
          )}

          {/* Modifier */}
          <button
            onClick={() => onEdit(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Modifier</span>
          </button>

          {/* Word export */}
          <button
            onClick={() => exportDocumentToWord(doc, company, customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 cursor-pointer"
            title="Télécharger en Word (.docx)"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>

          {/* Excel export */}
          <button
            onClick={() => exportDocumentToExcel(doc, company, customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 cursor-pointer"
            title="Télécharger en Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* PDF / Imprimer */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-md hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
            style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DOCUMENT PAGE (A4 Print-Ready Container) */}
      {/* ======================================================== */}
      <div
        id="printable-document"
        className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 min-h-[1050px] flex flex-col justify-between print:shadow-none print:border-none print:m-0 print:p-6 print:rounded-none"
      >
        <div>
          {/* Header row: Company branding & Document Banner */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b pb-6">
            {/* Left: Company identity */}
            <div className="max-w-[55%]">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-16 max-w-[220px] object-contain mb-3"
                />
              ) : (
                <div
                  className="inline-block px-3 py-1 rounded-lg text-white font-black text-lg mb-2"
                  style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
                >
                  {company.name}
                </div>
              )}

              <div className="text-sm font-extrabold text-slate-900">{company.name}</div>
              <div className="text-xs text-slate-600 mt-0.5">{company.legalForm}</div>
              <div className="text-xs text-slate-600 mt-0.5">{company.address}, {company.city}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Tél : {company.phone} • Email : {company.email}
              </div>
              {company.website && (
                <div className="text-xs text-slate-600">Web : {company.website}</div>
              )}

              {/* Mentions fiscales officielles marocaines */}
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium grid grid-cols-2 gap-x-2">
                <span>ICE : <strong className="text-slate-800">{company.ice}</strong></span>
                <span>IF : <strong className="text-slate-800">{company.ifCode}</strong></span>
                <span>RC : <strong className="text-slate-800">{company.rc}</strong></span>
                <span>Patente : <strong className="text-slate-800">{company.patente}</strong></span>
              </div>
            </div>

            {/* Right: Document details */}
            <div className="sm:text-right max-w-[45%] flex flex-col sm:items-end">
              <div
                className="inline-block px-4 py-1.5 rounded-xl text-white font-black text-sm uppercase tracking-wider mb-2 shadow-xs"
                style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
              >
                {getDocumentTypeName(doc.docType)}
              </div>

              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {doc.documentNumber}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div>
                  Date d'émission : <strong className="text-slate-900">{formatDate(doc.issueDate)}</strong>
                </div>
                {doc.dueDate && (
                  <div>
                    Date d'échéance : <strong className="text-slate-900">{formatDate(doc.dueDate)}</strong>
                  </div>
                )}
                {doc.referenceExternal && (
                  <div>
                    Réf. Bon de commande : <strong className="text-slate-900">{doc.referenceExternal}</strong>
                  </div>
                )}
              </div>

              {/* Status Stamp Watermark */}
              {doc.status === 'paid' && (
                <div className="mt-3 inline-block px-3 py-1 border-2 border-emerald-600 text-emerald-600 font-black rounded-lg text-xs uppercase tracking-widest rotate-[-3deg]">
                  PAYÉ EN TOTALITÉ
                </div>
              )}
            </div>
          </div>

          {/* Client Destination Card */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Destinataire / Client
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {customer?.name || doc.customerName || 'Client divers'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {customer?.address || doc.customerAddress || ''}
              </div>
              <div className="text-xs text-slate-600">
                {customer?.city || doc.customerCity || ''}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-0.5 sm:text-right">
              <div>
                ICE Client : <strong className="text-slate-800">{customer?.ice || doc.customerIce || '-'}</strong>
              </div>
              {customer?.ifCode && (
                <div>
                  Identifiant Fiscal : <strong className="text-slate-800">{customer.ifCode}</strong>
                </div>
              )}
              {customer?.rc && (
                <div>
                  Registre de Commerce : <strong className="text-slate-800">{customer.rc}</strong>
                </div>
              )}
              {customer?.contactPerson && (
                <div>
                  À l'attention de : <strong className="text-slate-800">{customer.contactPerson}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Table des Articles & Lignes */}
          <div className="overflow-hidden border border-slate-200 rounded-xl my-6">
            <table className="w-full text-left text-xs">
              <thead
                className="text-white uppercase font-extrabold"
                style={{ backgroundColor: company.primaryColor || '#4f46e5' }}
              >
                <tr>
                  <th className="px-3 py-2.5 w-16">Réf.</th>
                  <th className="px-3 py-2.5">Désignation</th>
                  <th className="px-3 py-2.5 text-right w-16">Qté</th>
                  <th className="px-3 py-2.5 text-right w-24">P.U. HT</th>
                  {doc.discountAmount > 0 && <th className="px-3 py-2.5 text-right w-16">Rem.%</th>}
                  <th className="px-3 py-2.5 text-right w-16">TVA</th>
                  <th className="px-3 py-2.5 text-right w-28">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doc.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                      {item.reference || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">{item.description}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(item.unitPriceHt, doc.currency)}
                    </td>
                    {doc.discountAmount > 0 && (
                      <td className="px-3 py-2.5 text-right text-rose-600 font-medium">
                        {item.discountPercent ? `${item.discountPercent}%` : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {item.vatRate}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(item.totalHt, doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section Totaux et Arrêté */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
            {/* Modalités & Arrêté légal */}
            <div className="space-y-4">
              {/* Arrêté en toutes lettres */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-extrabold text-slate-700 block mb-1">
                  Arrêté de la présente pièce à la somme de :
                </span>
                <p className="italic font-bold text-slate-900 leading-relaxed">
                  "{amountToLegalWords(doc.totalTtc, doc.currency)} TTC"
                </p>
              </div>

              {/* Coordonnées bancaires */}
              <div className="text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 block">Modalités de règlement :</span>
                <div>Banque : <strong>{company.bankName}</strong></div>
                <div>RIB (Maroc 24 chiffres) : <strong className="font-mono text-slate-900">{company.rib}</strong></div>
                {doc.termsAndConditions && (
                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {doc.termsAndConditions}
                  </div>
                )}
              </div>
            </div>

            {/* Tableau des totaux */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Hors Taxes (HT) :</span>
                <span className="font-bold text-slate-900">{formatCurrency(doc.totalHt, doc.currency)}</span>
              </div>

              {doc.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Remise ({doc.discountPercent}%) :</span>
                  <span>-{formatCurrency(doc.discountAmount, doc.currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Total TVA :</span>
                <span className="font-bold text-slate-900">{formatCurrency(doc.totalVat, doc.currency)}</span>
              </div>

              <div
                className="flex justify-between text-base font-black pt-2 border-t border-slate-300"
                style={{ color: company.primaryColor || '#4f46e5' }}
              >
                <span>TOTAL TTC :</span>
                <span>{formatCurrency(doc.totalTtc, doc.currency)}</span>
              </div>

              {/* Détail paiement */}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Montant Réglé :</span>
                  <span>{formatCurrency(doc.paidAmount, doc.currency)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-black text-sm">
                  <span>Reste à Payer (Net) :</span>
                  <span>{formatCurrency(doc.remainingAmount, doc.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cachet & Signature area */}
          <div className="grid grid-cols-2 gap-8 my-8 pt-4">
            <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl min-h-[110px] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Pour le Client (Bon pour accord & Cachet)
              </span>
              <div className="text-[10px] text-slate-400">Date et signature</div>
            </div>

            <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl min-h-[110px] flex flex-col justify-between relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Pour la Direction / Cachet & Signature
              </span>

              {/* Affichage du cachet ou signature uploadés s'ils existent */}
              {company.stampUrl ? (
                <img
                  src={company.stampUrl}
                  alt="Cachet"
                  className="max-h-16 mx-auto object-contain my-1"
                />
              ) : company.signatureUrl ? (
                <img
                  src={company.signatureUrl}
                  alt="Signature"
                  className="max-h-14 mx-auto object-contain my-1"
                />
              ) : (
                <div className="text-[11px] font-serif italic text-slate-700 my-auto">
                  {company.name}
                </div>
              )}

              <div className="text-[10px] text-slate-400">Signataire habilité</div>
            </div>
          </div>
        </div>

        {/* Footer avec mentions légales obligatoires */}
        <div className="border-t border-slate-200 pt-4 mt-6 text-center text-[10px] text-slate-500 leading-relaxed">
          <p>{company.footerText || `${company.name} • ${company.legalForm} • ${company.address}, ${company.city}`}</p>
          <p className="mt-0.5">
            ICE : {company.ice} • IF : {company.ifCode} • RC : {company.rc} • Patente : {company.patente} • CNSS : {company.cnss || '-'}
          </p>
        </div>
      </div>

      {/* Modal Enregistrement de Paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
              Enregistrer un Règlement
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reste à régler : <strong className="text-rose-600">{formatCurrency(doc.remainingAmount, doc.currency)}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Montant encaissé ({doc.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  max={doc.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 font-extrabold text-sm text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Mode de règlement
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Effet / Traite">Effet / Traite</option>
                  <option value="Carte Bancaire">Carte Bancaire</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                Valider l'encaissement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
