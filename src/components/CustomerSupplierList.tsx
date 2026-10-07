import React, { useState } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Upload,
  History,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';
import { CommercialDocument, Customer, Supplier } from '../types';
import { exportCustomersToExcel } from '../utils/exporters';
import { parseCustomersFromExcel, parseSuppliersFromExcel, readExcelFile } from '../utils/importers';
import { formatCurrency, formatDate, getDocumentTypeName, getStatusDetails } from '../utils/formatters';

interface CustomerSupplierListProps {
  customers: Customer[];
  suppliers: Supplier[];
  documents: CommercialDocument[];
  darkMode: boolean;
  onSaveCustomer: (c: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSaveSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onViewDocument: (doc: CommercialDocument) => void;
}

export const CustomerSupplierList: React.FC<CustomerSupplierListProps> = ({
  customers,
  suppliers,
  documents,
  darkMode,
  onSaveCustomer,
  onDeleteCustomer,
  onSaveSupplier,
  onDeleteSupplier,
  onViewDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Customer history view modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('Casablanca');
  const [formIce, setFormIce] = useState('');
  const [formIfCode, setFormIfCode] = useState('');
  const [formRc, setFormRc] = useState('');
  const [formPatente, setFormPatente] = useState('');
  const [formRib, setFormRib] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('30 jours');
  const [formNotes, setFormNotes] = useState('');

  const openCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormName(customer.name);
      setFormContact(customer.contactPerson || '');
      setFormEmail(customer.email || '');
      setFormPhone(customer.phone || '');
      setFormAddress(customer.address || '');
      setFormCity(customer.city || 'Casablanca');
      setFormIce(customer.ice || '');
      setFormIfCode(customer.ifCode || '');
      setFormRc(customer.rc || '');
      setFormPatente(customer.patente || '');
      setFormPaymentTerms(customer.paymentTerms || '30 jours');
      setFormNotes(customer.notes || '');
    } else {
      setEditingCustomer(null);
      setFormName('');
      setFormContact('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      setFormCity('Casablanca');
      setFormIce('');
      setFormIfCode('');
      setFormRc('');
      setFormPatente('');
      setFormPaymentTerms('30 jours');
      setFormNotes('');
    }
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const openSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormName(supplier.name);
      setFormContact(supplier.contactPerson || '');
      setFormEmail(supplier.email || '');
      setFormPhone(supplier.phone || '');
      setFormAddress(supplier.address || '');
      setFormCity(supplier.city || 'Casablanca');
      setFormIce(supplier.ice || '');
      setFormIfCode(supplier.ifCode || '');
      setFormRc(supplier.rc || '');
      setFormPatente(supplier.patente || '');
      setFormRib(supplier.rib || '');
      setFormPaymentTerms(supplier.paymentTerms || 'Comptant');
      setFormNotes(supplier.notes || '');
    } else {
      setEditingSupplier(null);
      setFormName('');
      setFormContact('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      setFormCity('Casablanca');
      setFormIce('');
      setFormIfCode('');
      setFormRc('');
      setFormPatente('');
      setFormRib('');
      setFormPaymentTerms('Comptant');
      setFormNotes('');
    }
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      alert('Le nom ou la raison sociale est obligatoire.');
      return;
    }

    if (activeTab === 'customers') {
      const saved: Customer = {
        id: editingCustomer?.id || `cust-${Date.now()}`,
        name: formName.trim(),
        contactPerson: formContact.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        ice: formIce.trim(),
        ifCode: formIfCode.trim(),
        rc: formRc.trim(),
        patente: formPatente.trim(),
        paymentTerms: formPaymentTerms,
        notes: formNotes,
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      };
      onSaveCustomer(saved);
    } else {
      const saved: Supplier = {
        id: editingSupplier?.id || `supp-${Date.now()}`,
        name: formName.trim(),
        contactPerson: formContact.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        ice: formIce.trim(),
        ifCode: formIfCode.trim(),
        rc: formRc.trim(),
        patente: formPatente.trim(),
        rib: formRib.trim(),
        paymentTerms: formPaymentTerms,
        notes: formNotes,
        createdAt: editingSupplier?.createdAt || new Date().toISOString(),
      };
      onSaveSupplier(saved);
    }

    setIsModalOpen(false);
  };

  // Import Excel handler
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelFile(file);
      if (activeTab === 'customers') {
        const parsed = parseCustomersFromExcel(rawRows);
        parsed.forEach((c) => {
          if (c.name) {
            onSaveCustomer({
              id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: c.name,
              contactPerson: c.contactPerson || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              city: c.city || 'Casablanca',
              ice: c.ice || '',
              ifCode: c.ifCode || '',
              rc: c.rc || '',
              patente: c.patente || '',
              paymentTerms: c.paymentTerms || '30 jours',
              createdAt: new Date().toISOString(),
            });
          }
        });
        alert(`${parsed.length} client(s) importé(s) avec succès !`);
      } else {
        const parsed = parseSuppliersFromExcel(rawRows);
        parsed.forEach((s) => {
          if (s.name) {
            onSaveSupplier({
              id: `supp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: s.name,
              contactPerson: s.contactPerson || '',
              email: s.email || '',
              phone: s.phone || '',
              address: s.address || '',
              city: s.city || 'Casablanca',
              ice: s.ice || '',
              ifCode: s.ifCode || '',
              rc: s.rc || '',
              patente: s.patente || '',
              paymentTerms: s.paymentTerms || 'Comptant',
              createdAt: new Date().toISOString(),
            });
          }
        });
        alert(`${parsed.length} fournisseur(s) importé(s) avec succès !`);
      }
    } catch (err: any) {
      alert(`Erreur lors de l'import Excel: ${err?.message || 'Format non reconnu'}`);
    }
    e.target.value = '';
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ice || '').toLowerCase().includes(q) ||
      (c.contactPerson || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.ice || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top tabs & actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Toggle Clients / Fournisseurs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Clients ({customers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-500" />
            <span>Fournisseurs ({suppliers.length})</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, ICE, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Export Excel */}
          {activeTab === 'customers' && (
            <button
              onClick={() => exportCustomersToExcel(customers)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 cursor-pointer"
              title="Exporter tous les clients vers Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}

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

          {/* Add Contact */}
          <button
            onClick={() => (activeTab === 'customers' ? openCustomerModal() : openSupplierModal())}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouveau {activeTab === 'customers' ? 'Client' : 'Fournisseur'}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-bold border-b border-inherit">
              <tr>
                <th className="px-5 py-3.5">Nom & Raison Sociale</th>
                <th className="px-5 py-3.5">Identifiants Légaux (ICE / IF)</th>
                <th className="px-5 py-3.5">Contact & Coordonnées</th>
                <th className="px-5 py-3.5">Ville & Adresse</th>
                <th className="px-5 py-3.5">Conditions Règlement</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeTab === 'customers' ? (
                filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Aucun client trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const custDocs = documents.filter((d) => d.customerId === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{cust.name}</span>
                          </div>
                          {cust.contactPerson && (
                            <div className="text-[11px] text-slate-500 font-normal">
                              Attn: {cust.contactPerson}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            ICE : {cust.ice || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            IF : {cust.ifCode || '-'} • RC : {cust.rc || '-'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {cust.phone && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cust.phone}</span>
                            </div>
                          )}
                          {cust.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400">
                              <Mail className="w-3 h-3" />
                              <span>{cust.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{cust.city}</div>
                          {cust.address && <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{cust.address}</div>}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {cust.paymentTerms || '30 jours'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Historique des pièces */}
                            <button
                              onClick={() => setHistoryCustomer(cust)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer relative"
                              title="Historique des documents de ce client"
                            >
                              <History className="w-4 h-4" />
                              {custDocs.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                                  {custDocs.length}
                                </span>
                              )}
                            </button>

                            {/* Modifier */}
                            <button
                              onClick={() => openCustomerModal(cust)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Modifier la fiche client"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Supprimer */}
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer le client "${cust.name}" ?`)) {
                                  onDeleteCustomer(cust.id);
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
                )
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Aucun fournisseur trouvé.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supp) => (
                  <tr key={supp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {supp.name}
                      {supp.contactPerson && (
                        <div className="text-[11px] text-slate-500 font-normal">
                          Attn: {supp.contactPerson}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-mono text-[11px] font-bold">ICE: {supp.ice || '-'}</div>
                      <div className="text-[10px] text-slate-500">
                        IF: {supp.ifCode || '-'} • RC: {supp.rc || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{supp.phone || '-'}</div>
                      <div className="text-indigo-600 text-[11px]">{supp.email}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold">{supp.city}</div>
                      <div className="text-[10px] text-slate-500">{supp.address}</div>
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {supp.paymentTerms}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openSupplierModal(supp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer le fournisseur "${supp.name}" ?`)) {
                              onDeleteSupplier(supp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Fiche Client / Fournisseur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>
                  {editingCustomer || editingSupplier ? 'Modifier la Fiche' : 'Nouvelle Fiche'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold uppercase">
                  {activeTab === 'customers' ? 'Client' : 'Fournisseur'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Nom */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Raison Sociale / Nom *
                </label>
                <input
                  type="text"
                  placeholder="ex: ATLAS LOGISTIQUE SARL"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                />
              </div>

              {/* Interlocuteur */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Interlocuteur / Contact
                </label>
                <input
                  type="text"
                  placeholder="ex: M. Ahmed Benani"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  placeholder="+212 5..."
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="contact@societe.ma"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Ville */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  placeholder="Casablanca, Rabat, Tanger..."
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Adresse */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Adresse complète
                </label>
                <input
                  type="text"
                  placeholder="Numéro, Rue, Quartier, Zone Industrielle..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Section Fiscale Marocaine */}
              <div className="md:col-span-2 pt-2 border-t">
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 mb-2">
                  Identifiants Fiscaux & Administratifs
                </h4>
              </div>

              {/* ICE */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ICE (Identifiant Commun de l'Entreprise)
                </label>
                <input
                  type="text"
                  placeholder="002345678000092"
                  value={formIce}
                  onChange={(e) => setFormIce(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              {/* IF */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  IF (Identifiant Fiscal)
                </label>
                <input
                  type="text"
                  placeholder="45892134"
                  value={formIfCode}
                  onChange={(e) => setFormIfCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              {/* RC */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  RC (Registre de Commerce)
                </label>
                <input
                  type="text"
                  placeholder="152433"
                  value={formRc}
                  onChange={(e) => setFormRc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              {/* Patente */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Patente (Taxe Professionnelle)
                </label>
                <input
                  type="text"
                  placeholder="34215689"
                  value={formPatente}
                  onChange={(e) => setFormPatente(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              {/* RIB si Fournisseur */}
              {activeTab === 'suppliers' && (
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    RIB Bancaire (24 chiffres)
                  </label>
                  <input
                    type="text"
                    placeholder="011 780 0000 123456789012 34"
                    value={formRib}
                    onChange={(e) => setFormRib(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              )}

              {/* Conditions de paiement */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Conditions de Paiement
                </label>
                <select
                  value={formPaymentTerms}
                  onChange={(e) => setFormPaymentTerms(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Comptant">Comptant à réception</option>
                  <option value="30 jours">30 jours nets</option>
                  <option value="30 jours fin de mois">30 jours fin de mois</option>
                  <option value="60 jours">60 jours nets</option>
                  <option value="Acompte 30% solde livraison">Acompte 30% solde livraison</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Notes internes
                </label>
                <textarea
                  rows={2}
                  placeholder="Observations particulières..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
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
                Enregistrer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique des Documents du Client */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Historique commercial : {historyCustomer.name}
                </h3>
                <p className="text-xs text-slate-500">
                  ICE : {historyCustomer.ice || '-'} • Ville : {historyCustomer.city}
                </p>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {documents.filter((d) => d.customerId === historyCustomer.id).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucun document enregistré pour ce client.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                      <tr>
                        <th className="p-2.5">Type & N°</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Total HT</th>
                        <th className="p-2.5 text-right">Total TTC</th>
                        <th className="p-2.5 text-right">Reste</th>
                        <th className="p-2.5 text-center">Statut</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documents
                        .filter((d) => d.customerId === historyCustomer.id)
                        .map((doc) => {
                          const statusInfo = getStatusDetails(doc.status);
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold">
                                {getDocumentTypeName(doc.docType)} {doc.documentNumber}
                              </td>
                              <td className="p-2.5 text-slate-500">{formatDate(doc.issueDate)}</td>
                              <td className="p-2.5 text-right font-medium">
                                {formatCurrency(doc.totalHt, doc.currency)}
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-white">
                                {formatCurrency(doc.totalTtc, doc.currency)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-rose-600">
                                {formatCurrency(doc.remainingAmount, doc.currency)}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  onClick={() => {
                                    setHistoryCustomer(null);
                                    onViewDocument(doc);
                                  }}
                                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                                >
                                  Ouvrir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-4 mt-6">
              <button
                onClick={() => setHistoryCustomer(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
