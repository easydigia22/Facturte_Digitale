import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } from 'docx';
import * as XLSX from 'xlsx';
import { CommercialDocument, Company, Customer } from '../types';
import { formatCurrency, formatDate, getDocumentTypeName } from './formatters';
import { amountToLegalWords } from './numberToWords';

/**
 * Exporte un document commercial au format Microsoft Word (.docx)
 */
export async function exportDocumentToWord(
  doc: CommercialDocument,
  company: Company,
  customer?: Customer
): Promise<void> {
  const docTypeName = getDocumentTypeName(doc.docType).toUpperCase();
  const titleText = `${docTypeName} N° ${doc.documentNumber}`;

  // En-tête société
  const companyInfoParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: company.name, bold: true, size: 28, color: company.primaryColor.replace('#', '') || '1E3A8A' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${company.legalForm} - ${company.address}, ${company.city}`, size: 18, color: '4B5563' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Tél: ${company.phone} | Email: ${company.email} | Web: ${company.website || '-'}`, size: 18, color: '4B5563' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `ICE: ${company.ice} | IF: ${company.ifCode} | RC: ${company.rc} | Patente: ${company.patente}`, size: 16, color: '6B7280' }),
      ],
    }),
  ];

  // Client info
  const clientInfoParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: 'DESTINATAIRE / CLIENT :', bold: true, size: 20, color: '111827' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: customer?.name || doc.customerName || 'Client divers', bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: customer?.address || doc.customerAddress || '', size: 18 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: customer?.city || doc.customerCity || '', size: 18 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `ICE: ${customer?.ice || doc.customerIce || '-'} | IF: ${customer?.ifCode || '-'}`, size: 16, color: '4B5563' }),
      ],
    }),
  ];

  // Document meta
  const metaParagraphs = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: titleText, bold: true, size: 24, color: '1E3A8A' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `Date d'émission : ${formatDate(doc.issueDate)}`, size: 18 }),
      ],
    }),
    ...(doc.dueDate ? [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `Date d'échéance : ${formatDate(doc.dueDate)}`, size: 18 }),
        ],
      })
    ] : []),
  ];

  // Table des lignes de document
  const tableRows: TableRow[] = [
    // Header
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Réf.', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 4200, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Désignation', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Qté', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'P.U. HT', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TVA', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 1600, type: WidthType.DXA },
          shading: { fill: 'F3F4F6' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total HT', bold: true, size: 18 })] })],
        }),
      ],
    }),
  ];

  // Items
  doc.items.forEach((item) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.reference || '-', size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.description, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${item.quantity} ${item.unit || ''}`, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(item.unitPriceHt, doc.currency), size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${item.vatRate}%`, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(item.totalHt, doc.currency), size: 18 })] })],
          }),
        ],
      })
    );
  });

  const wordDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...companyInfoParagraphs,
          new Paragraph({ spacing: { after: 200 } }),
          ...metaParagraphs,
          new Paragraph({ spacing: { after: 200 } }),
          ...clientInfoParagraphs,
          new Paragraph({ spacing: { after: 300 } }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ spacing: { after: 300 } }),
          // Totaux
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Total HT : ${formatCurrency(doc.totalHt, doc.currency)}`, size: 20 }),
            ],
          }),
          ...(doc.discountAmount > 0 ? [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: `Remise (${doc.discountPercent}%) : -${formatCurrency(doc.discountAmount, doc.currency)}`, size: 18, color: 'DC2626' }),
              ],
            })
          ] : []),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Total TVA : ${formatCurrency(doc.totalVat, doc.currency)}`, size: 20 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `TOTAL TTC : ${formatCurrency(doc.totalTtc, doc.currency)}`, bold: true, size: 26, color: '1E3A8A' }),
            ],
          }),
          new Paragraph({ spacing: { after: 200 } }),
          // Arrêté en toutes lettres
          new Paragraph({
            children: [
              new TextRun({ text: `Arrêté la présente facture à la somme de : `, bold: true, size: 18 }),
              new TextRun({ text: amountToLegalWords(doc.totalTtc, doc.currency), italics: true, size: 18 }),
            ],
          }),
          new Paragraph({ spacing: { after: 200 } }),
          // Coordonnées bancaires
          new Paragraph({
            children: [
              new TextRun({ text: `Règlement par virement sur le compte : `, size: 18, bold: true }),
              new TextRun({ text: `${company.bankName || 'Banque'} - RIB : ${company.rib || '-'}`, size: 18 }),
            ],
          }),
          new Paragraph({ spacing: { after: 200 } }),
          // Conditions
          ...(doc.termsAndConditions ? [
            new Paragraph({
              children: [
                new TextRun({ text: `Conditions : ${doc.termsAndConditions}`, size: 16, color: '6B7280' }),
              ],
            })
          ] : []),
          new Paragraph({ spacing: { after: 300 } }),
          // Bas de page légal
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: company.footerText || `${company.name} - ICE : ${company.ice} - RC : ${company.rc} - IF : ${company.ifCode}`, size: 14, color: '9CA3AF' }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.documentNumber}_${doc.docType}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte un document commercial au format Microsoft Excel (.xlsx)
 */
export function exportDocumentToExcel(
  doc: CommercialDocument,
  company: Company,
  customer?: Customer
): void {
  const wb = XLSX.utils.book_new();

  const data: (string | number)[][] = [
    [company.name],
    [`${company.address}, ${company.city}`],
    [`Tél: ${company.phone} | Email: ${company.email}`],
    [`ICE: ${company.ice} | IF: ${company.ifCode} | RC: ${company.rc} | Patente: ${company.patente}`],
    [],
    [`${getDocumentTypeName(doc.docType).toUpperCase()} N° :`, doc.documentNumber],
    [`Date d'émission :`, formatDate(doc.issueDate)],
    [`Date d'échéance :`, doc.dueDate ? formatDate(doc.dueDate) : '-'],
    [`Statut :`, doc.status],
    [],
    [`Client / Destinataire :`, customer?.name || doc.customerName || 'Client divers'],
    [`Adresse Client :`, customer?.address || doc.customerAddress || ''],
    [`ICE Client :`, customer?.ice || doc.customerIce || '-'],
    [`IF Client :`, customer?.ifCode || '-'],
    [],
    ['Réf.', 'Désignation', 'Quantité', 'Unité', 'Prix Unitaire HT', 'Remise %', 'TVA %', 'Total HT', 'Total TTC'],
  ];

  doc.items.forEach((item) => {
    data.push([
      item.reference || '-',
      item.description,
      item.quantity,
      item.unit || 'U',
      item.unitPriceHt,
      item.discountPercent || 0,
      item.vatRate,
      item.totalHt,
      item.totalTtc,
    ]);
  });

  data.push([]);
  data.push(['', '', '', '', '', '', 'Total HT :', doc.totalHt, doc.currency]);
  if (doc.discountAmount > 0) {
    data.push(['', '', '', '', '', '', `Remise (${doc.discountPercent}%) :`, -doc.discountAmount, doc.currency]);
  }
  data.push(['', '', '', '', '', '', 'Total TVA :', doc.totalVat, doc.currency]);
  data.push(['', '', '', '', '', '', 'Total TTC :', doc.totalTtc, doc.currency]);
  data.push(['', '', '', '', '', '', 'Montant Payé :', doc.paidAmount, doc.currency]);
  data.push(['', '', '', '', '', '', 'Reste à Payer :', doc.remainingAmount, doc.currency]);
  data.push([]);
  data.push(['Montant en lettres :', amountToLegalWords(doc.totalTtc, doc.currency)]);
  data.push(['Banque & RIB :', `${company.bankName} - ${company.rib}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, doc.documentNumber);

  XLSX.writeFile(wb, `${doc.documentNumber}_${doc.docType}.xlsx`);
}

/**
 * Exporte la liste complète des clients en Excel (.xlsx)
 */
export function exportCustomersToExcel(customers: Customer[]): void {
  const wb = XLSX.utils.book_new();
  const rows = customers.map((c) => ({
    'ID': c.id,
    'Nom / Raison Sociale': c.name,
    'Interlocuteur': c.contactPerson || '',
    'Email': c.email || '',
    'Téléphone': c.phone || '',
    'Adresse': c.address || '',
    'Ville': c.city || '',
    'ICE': c.ice || '',
    'Identifiant Fiscal (IF)': c.ifCode || '',
    'RC': c.rc || '',
    'Patente': c.patente || '',
    'Conditions Paiement': c.paymentTerms || '',
    'Notes': c.notes || '',
    'Date de Création': formatDate(c.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  XLSX.writeFile(wb, `Clients_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporte le catalogue de produits et services en Excel (.xlsx)
 */
export function exportProductsToExcel(products: any[]): void {
  const wb = XLSX.utils.book_new();
  const rows = products.map((p) => ({
    'Référence': p.reference,
    'Désignation': p.name,
    'Type': p.type === 'service' ? 'Service' : 'Produit',
    'Catégorie': p.category || '',
    'Prix Vente HT': p.unitPriceHt,
    'Taux TVA %': p.vatRate,
    'Unité': p.unit || 'U',
    'Stock Actuel': p.stockQuantity ?? 0,
    'Alerte Stock Min': p.minStockAlert ?? 0,
    'Prix Achat HT': p.purchasePriceHt ?? 0,
    'Description': p.description || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Produits_Services');
  XLSX.writeFile(wb, `Catalogue_Produits_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
