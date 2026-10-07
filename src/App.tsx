import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DocumentList } from './components/DocumentList';
import { DocumentEditor } from './components/DocumentEditor';
import { DocumentPreview } from './components/DocumentPreview';
import { CustomerSupplierList } from './components/CustomerSupplierList';
import { ProductCatalog } from './components/ProductCatalog';
import { CompanySettings } from './components/CompanySettings';
import { BackupRestore } from './components/BackupRestore';
import { AiAssistantModal } from './components/AiAssistantModal';
import { UserGuideModal } from './components/UserGuideModal';
import {
  CommercialDocument,
  Company,
  Customer,
  DocumentStatus,
  DocumentType,
  Product,
  Supplier,
} from './types';
import { api, localStore } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Main data states
  const [company, setCompany] = useState<Company>(localStore.getCompany());
  const [customers, setCustomers] = useState<Customer[]>(localStore.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(localStore.getSuppliers());
  const [products, setProducts] = useState<Product[]>(localStore.getProducts());
  const [documents, setDocuments] = useState<CommercialDocument[]>(localStore.getDocuments());

  // Editor and Preview modal states
  const [editingDocument, setEditingDocument] = useState<CommercialDocument | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState<boolean>(false);
  const [createDocType, setCreateDocType] = useState<DocumentType>('facture');
  const [previewingDocument, setPreviewingDocument] = useState<CommercialDocument | null>(null);

  // AI & Guide modals
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Sync with backend API on mount
  const refreshData = async () => {
    try {
      const [comp, custs, supps, prods, docs] = await Promise.all([
        api.getCompany(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getProducts(),
        api.getDocuments(),
      ]);
      setCompany(comp);
      setCustomers(custs);
      setSuppliers(supps);
      setProducts(prods);
      setDocuments(docs);
    } catch (_) {
      // Fallback localStore
      setCompany(localStore.getCompany());
      setCustomers(localStore.getCustomers());
      setSuppliers(localStore.getSuppliers());
      setProducts(localStore.getProducts());
      setDocuments(localStore.getDocuments());
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update dark mode class on root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle New Document trigger
  const handleNewDocument = (type: DocumentType) => {
    setCreateDocType(type);
    setEditingDocument(null);
    setIsCreatingDocument(true);
  };

  // Handle Save Document from Editor
  const handleSaveDocument = async (doc: CommercialDocument, andPrint: boolean = false) => {
    await api.saveDocument(doc);
    setDocuments(localStore.getDocuments());
    setIsCreatingDocument(false);
    setEditingDocument(null);

    if (andPrint) {
      setPreviewingDocument(doc);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments(localStore.getDocuments());
  };

  // Handle Status change from table dropdown
  const handleStatusChange = async (docId: string, newStatus: DocumentStatus) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    let updatedPaid = doc.paidAmount;
    let updatedRemaining = doc.remainingAmount;

    if (newStatus === 'paid') {
      updatedPaid = doc.totalTtc;
      updatedRemaining = 0;
    } else if (newStatus === 'unpaid') {
      updatedPaid = 0;
      updatedRemaining = doc.totalTtc;
    }

    const updated: CommercialDocument = {
      ...doc,
      status: newStatus,
      paidAmount: updatedPaid,
      remainingAmount: updatedRemaining,
    };

    await api.saveDocument(updated);
    setDocuments(localStore.getDocuments());
  };

  // Handle Convert Document
  const handleConvertDocument = async (sourceId: string, targetType: DocumentType) => {
    const converted = await api.convertDocument(sourceId, targetType);
    setDocuments(localStore.getDocuments());
    if (converted) {
      setPreviewingDocument(converted);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (docId: string, amount: number, method: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const newPaid = Math.min(doc.totalTtc, Math.round((doc.paidAmount + amount) * 100) / 100);
    const newRemaining = Math.max(0, Math.round((doc.totalTtc - newPaid) * 100) / 100);
    const newStatus: DocumentStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const updated: CommercialDocument = {
      ...doc,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentMethod: method,
    };

    await api.saveDocument(updated);
    setDocuments(localStore.getDocuments());
    setPreviewingDocument(updated);
  };

  // Handle Save Customer
  const handleSaveCustomer = async (cust: Customer) => {
    await api.saveCustomer(cust);
    setCustomers(localStore.getCustomers());
  };

  const handleDeleteCustomer = async (id: string) => {
    await api.deleteCustomer(id);
    setCustomers(localStore.getCustomers());
  };

  // Handle Save Supplier
  const handleSaveSupplier = async (supp: Supplier) => {
    await api.saveSupplier(supp);
    setSuppliers(localStore.getSuppliers());
  };

  const handleDeleteSupplier = async (id: string) => {
    await api.deleteSupplier(id);
    setSuppliers(localStore.getSuppliers());
  };

  // Handle Save Product
  const handleSaveProduct = async (prod: Product) => {
    await api.saveProduct(prod);
    setProducts(localStore.getProducts());
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    setProducts(localStore.getProducts());
  };

  // Handle Save Company
  const handleSaveCompany = async (updatedComp: Company) => {
    await api.updateCompany(updatedComp);
    setCompany(updatedComp);
  };

  // Compute live dashboard stats
  const stats = useMemo(() => {
    return api.computeDashboardStats();
  }, [documents]);

  // Counts for sidebar badges
  const counts = useMemo(() => {
    return {
      devis: documents.filter((d) => d.docType === 'devis').length,
      factures: documents.filter((d) => d.docType === 'facture').length,
      commandes: documents.filter((d) => d.docType === 'bon_commande').length,
      livraisons: documents.filter((d) => d.docType === 'bon_livraison').length,
      avoirs: documents.filter((d) => d.docType === 'avoir' || d.docType === 'proforma').length,
      clients: customers.length,
      produits: products.length,
    };
  }, [documents, customers, products]);

  // Header Titles
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Tableau de Bord', subtitle: 'Indicateurs clés, chiffre d’affaires et raccourcis' };
      case 'devis':
        return { title: 'Gestion des Devis', subtitle: 'Devis commerciaux, offres tarifaires et validité' };
      case 'factures':
        return { title: 'Factures de Vente', subtitle: 'Facturation légale avec TVA, encaissements et relances' };
      case 'commandes':
        return { title: 'Bons de Commande', subtitle: 'Engagements clients et commandes fournisseurs' };
      case 'livraisons':
        return { title: 'Bons de Livraison', subtitle: 'Bordereaux de livraison et expéditions' };
      case 'avoirs':
        return { title: 'Avoirs & Factures Proforma', subtitle: 'Notes de crédit, retours et proforma' };
      case 'clients':
        return { title: 'Répertoire Clients', subtitle: 'Fiches clients avec ICE, IF, RC, Patente et historique' };
      case 'fournisseurs':
        return { title: 'Fournisseurs & Partenaires', subtitle: 'Gestion des achats, coordonnées et RIB' };
      case 'produits':
        return { title: 'Catalogue Articles & Services', subtitle: 'Gestion des prix HT, taux TVA et stocks' };
      case 'parametres':
        return { title: 'Paramètres Société & Modèles', subtitle: 'Logo, cachet, signature, couleurs et mentions légales' };
      case 'backup':
        return { title: 'Sauvegarde & Schéma SQL', subtitle: 'Export/import JSON et schémas SQLite & PostgreSQL' };
      case 'guide':
        return { title: 'Guide Utilisateur', subtitle: 'Prise en main, raccourcis et réglementation marocaine' };
      default:
        return { title: 'FacturX Pro', subtitle: '' };
    }
  };

  const headerInfo = getHeaderInfo();
  const existingNumbers = documents.map((d) => d.documentNumber);

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsCreatingDocument(false);
          setEditingDocument(null);
          setActiveTab(tab);
        }}
        company={company}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onNewDocument={handleNewDocument}
        onOpenAi={() => setIsAiModalOpen(true)}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          company={company}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onOpenAi={() => setIsAiModalOpen(true)}
          onNewDocument={handleNewDocument}
          onRefresh={refreshData}
          darkMode={darkMode}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Si en mode création ou modification de document */}
          {isCreatingDocument || editingDocument ? (
            <DocumentEditor
              initialDocument={editingDocument}
              defaultDocType={createDocType}
              existingNumbers={existingNumbers}
              customers={customers}
              products={products}
              company={company}
              darkMode={darkMode}
              onSave={handleSaveDocument}
              onCancel={() => {
                setIsCreatingDocument(false);
                setEditingDocument(null);
              }}
              onSaveNewCustomer={handleSaveCustomer}
            />
          ) : (
            <>
              {/* Tab: Dashboard */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  stats={stats}
                  recentDocuments={documents}
                  products={products}
                  company={company}
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                />
              )}

              {/* Tab: Devis */}
              {activeTab === 'devis' && (
                <DocumentList
                  documents={documents}
                  customers={customers}
                  company={company}
                  filterType="devis"
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onEditDocument={(doc) => setEditingDocument(doc)}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onDeleteDocument={handleDeleteDocument}
                  onConvertDocument={handleConvertDocument}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Tab: Factures */}
              {activeTab === 'factures' && (
                <DocumentList
                  documents={documents}
                  customers={customers}
                  company={company}
                  filterType="facture"
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onEditDocument={(doc) => setEditingDocument(doc)}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onDeleteDocument={handleDeleteDocument}
                  onConvertDocument={handleConvertDocument}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Tab: Bons de commande */}
              {activeTab === 'commandes' && (
                <DocumentList
                  documents={documents}
                  customers={customers}
                  company={company}
                  filterType="bon_commande"
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onEditDocument={(doc) => setEditingDocument(doc)}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onDeleteDocument={handleDeleteDocument}
                  onConvertDocument={handleConvertDocument}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Tab: Bons de livraison */}
              {activeTab === 'livraisons' && (
                <DocumentList
                  documents={documents}
                  customers={customers}
                  company={company}
                  filterType="bon_livraison"
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onEditDocument={(doc) => setEditingDocument(doc)}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onDeleteDocument={handleDeleteDocument}
                  onConvertDocument={handleConvertDocument}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Tab: Avoirs & Proforma */}
              {activeTab === 'avoirs' && (
                <DocumentList
                  documents={documents}
                  customers={customers}
                  company={company}
                  filterType="all"
                  darkMode={darkMode}
                  onNewDocument={handleNewDocument}
                  onEditDocument={(doc) => setEditingDocument(doc)}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                  onDeleteDocument={handleDeleteDocument}
                  onConvertDocument={handleConvertDocument}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Tab: Clients & Fournisseurs */}
              {(activeTab === 'clients' || activeTab === 'fournisseurs') && (
                <CustomerSupplierList
                  customers={customers}
                  suppliers={suppliers}
                  documents={documents}
                  darkMode={darkMode}
                  onSaveCustomer={handleSaveCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  onSaveSupplier={handleSaveSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onViewDocument={(doc) => setPreviewingDocument(doc)}
                />
              )}

              {/* Tab: Articles & Services */}
              {activeTab === 'produits' && (
                <ProductCatalog
                  products={products}
                  currency={company.currency}
                  darkMode={darkMode}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}

              {/* Tab: Paramètres Société */}
              {activeTab === 'parametres' && (
                <CompanySettings
                  company={company}
                  darkMode={darkMode}
                  onSaveCompany={handleSaveCompany}
                />
              )}

              {/* Tab: Sauvegarde & SQL */}
              {activeTab === 'backup' && (
                <BackupRestore
                  darkMode={darkMode}
                  onRefreshData={refreshData}
                />
              )}

              {/* Tab: Guide */}
              {activeTab === 'guide' && (
                <div className="max-w-4xl mx-auto">
                  <UserGuideModal
                    isOpen={true}
                    onClose={() => setActiveTab('dashboard')}
                    darkMode={darkMode}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {previewingDocument && (
        <DocumentPreview
          document={previewingDocument}
          company={company}
          customer={customers.find((c) => c.id === previewingDocument.customerId)}
          darkMode={darkMode}
          onClose={() => setPreviewingDocument(null)}
          onEdit={(doc) => {
            setPreviewingDocument(null);
            setEditingDocument(doc);
          }}
          onConvert={(id, target) => {
            setPreviewingDocument(null);
            handleConvertDocument(id, target);
          }}
          onRecordPayment={handleRecordPayment}
        />
      )}

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currency={company.currency}
        darkMode={darkMode}
      />
    </div>
  );
}
