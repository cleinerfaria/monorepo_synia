-- =============================================
-- Seed: Vias de Administração Padrão
-- =============================================

-- Inserir vias de administração padrão para todas as empresas existentes
INSERT INTO administration_routes (company_id, name, abbreviation, description)
SELECT 
  c.id,
  route.name,
  route.abbreviation,
  route.description
FROM company c
CROSS JOIN (
  VALUES 
    ('Oral', 'VO', 'Administração pela boca'),
    ('Endovenosa', 'EV', 'Administração diretamente na veia'),
    ('Intramuscular', 'IM', 'Administração no músculo'),
    ('Subcutânea', 'SC', 'Administração sob a pele'),
    ('Tópica', 'TOP', 'Aplicação na pele'),
    ('Retal', 'VR', 'Administração pelo reto'),
    ('Nasal', 'VN', 'Administração pelo nariz'),
    ('Inalatória', 'INAL', 'Administração por inalação'),
    ('Hipodermóclise', 'HDC', 'Administração por via subcutânea'),
    ('Oftálmica', 'OFT', 'Aplicação nos olhos'),
    ('Otológica', 'OTO', 'Aplicação nos ouvidos'),
    ('Sublingual', 'SL', 'Administração sob a língua'),
    ('Sonda Nasoenteral', 'SNE', 'Administração por sonda nasoenteral'),
    ('Sonda Nasogástrica', 'SNG', 'Administração por sonda nasogástrica'),
    ('Sonda Vesical', 'VES', 'Administração por sonda vesical'),
    ('Sonda Orogástrica', 'SOG', 'Administração por sonda orogástrica'),
    ('Sonda Oroenteral', 'SOE', 'Administração por sonda oroenteral'),
    ('Gastrostomia', 'GTM', 'Administração por sonda de gastrostomia'),
    ('Jejunostomia', 'JTM', 'Administração por sonda de jejunostomia'),
    ('Transdérmica', 'TD', 'Administração através da pele (adesivos)')
) AS route(name, abbreviation, description)
ON CONFLICT (company_id, name) DO NOTHING;
