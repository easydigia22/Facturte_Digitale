-- ====================================================================
-- FacturX Pro - Données de Démonstration (Seeds)
-- ====================================================================

INSERT OR IGNORE INTO companies (
    id, name, legal_form, address, city, postal_code, country,
    phone, email, website, ice, if_code, rc, patente, cnss, rib, bank_name,
    currency, currency_symbol, default_vat_rate, header_text, footer_text
) VALUES (
    'comp-001',
    'ATLAS SOLUTIONS & TECHNOLOGIES SARL',
    'SARL d''associé unique',
    'Angle Bd Zerktouni & Bd d''Anfa, 4ème étage N°12',
    'Casablanca',
    '20050',
    'Maroc',
    '+212 5 22 45 67 89',
    'contact@atlas-tech.ma',
    'https://atlas-tech.ma',
    '002345678000092',
    '45892134',
    '152433',
    '34215689',
    '8765432',
    '011 780 0000 123456789012 34',
    'Attijariwafa Bank',
    'MAD',
    'DH',
    20.0,
    'Solutions Informatiques, Logiciels Métiers & Cloud pour Entreprises',
    'ATLAS SOLUTIONS SARL au capital de 100 000 DH - RC : 152433 Casablanca - IF : 45892134 - ICE : 002345678000092 - Patente : 34215689 - CNSS : 8765432'
);

INSERT OR IGNORE INTO customers (
    id, company_id, name, contact_person, email, phone, address, city, ice, if_code, rc, patente, payment_terms
) VALUES 
('cust-001', 'comp-001', 'NOVA DISTRIBUTION SARL', 'M. Karim Benjelloun', 'k.benjelloun@novadistrib.ma', '+212 6 61 23 45 67', 'Z.I. Ain Sebaa, Route 110', 'Casablanca', '001987654000081', '38902145', '124987', '21984530', '30 jours fin de mois'),
('cust-002', 'comp-001', 'MAROC LOGISTIQUE & TRANSIT', 'Mme. Salma Amrani', 'direction@maroclogistique.ma', '+212 5 37 88 99 00', '15 Rue Al Fourat, Agdal', 'Rabat', '003214569000045', '41209874', '87654', '19874523', 'Comptant'),
('cust-003', 'comp-001', 'TANGER SMART TEXTILE SA', 'M. Youssef El Fassi', 'achat@tangersmart.ma', '+212 5 39 33 22 11', 'Zone Franche d''Exportation', 'Tanger', '004561239000033', '52309811', '45892', '31209845', '60 jours');

INSERT OR IGNORE INTO products (
    id, company_id, reference, name, type, category, description, unit_price_ht, vat_rate, unit, stock_quantity
) VALUES
('prod-001', 'comp-001', 'SRV-DEV-01', 'Développement Application Web sur mesure', 'service', 'Services Informatiques', 'Conception, développement full-stack et mise en production d''une plateforme web cloud.', 18000.00, 20.0, 'Prestation', 0),
('prod-002', 'comp-001', 'SRV-MAINT-01', 'Contrat Maintenance & Infogérance Annuelle', 'service', 'Maintenance', 'Support technique prioritaire 24/7, sauvegardes automatisées et mises à jour de sécurité.', 4500.00, 20.0, 'Mois', 0),
('prod-003', 'comp-001', 'HW-SRV-DELL', 'Serveur Rack Dell PowerEdge R650', 'product', 'Matériel', 'Serveur biprocesseur Intel Xeon Silver, 64 Go RAM ECC, 2x960GB SSD Enterprise RAID.', 32000.00, 20.0, 'U', 8),
('prod-004', 'comp-001', 'SW-LIC-PRO', 'Pack Licence FacturX Entreprise 10 Postes', 'product', 'Logiciel', 'Licence perpétuelle avec modules Ventes, Achats, Stocks et Multi-devises.', 8500.00, 20.0, 'Licence', 25);
