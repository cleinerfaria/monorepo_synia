-- =============================================
-- Seed: Atualizar ordem de prescrição das vias
-- =============================================

-- Atualizar a ordem de prescrição baseado nas vias mais comuns
UPDATE administration_routes SET prescription_order = 
  CASE name
    WHEN 'Endovenosa' THEN 10
    WHEN 'Intramuscular' THEN 20
    WHEN 'Subcutânea' THEN 30
    WHEN 'Hipodermóclise' THEN 30

    WHEN 'Oral' THEN 40
    WHEN 'Gastrostomia' THEN 40
    WHEN 'Jejunostomia' THEN 40
    WHEN 'Sonda Nasoenteral' THEN 40
    WHEN 'Sonda Nasogástrica' THEN 40
    WHEN 'Sonda Orogástrica' THEN 40
    WHEN 'Sonda Oroenteral' THEN 40
    WHEN 'Sublingual' THEN 40

    WHEN 'Nasal' THEN 60
    WHEN 'Inalatória' THEN 60

    WHEN 'Transdérmica' THEN 80
    WHEN 'Tópica' THEN 80
    WHEN 'Oftálmica' THEN 80
    WHEN 'Otológica' THEN 80

    WHEN 'Sonda Vesical' THEN 90
    WHEN 'Retal' THEN 90

    ELSE 999
  END
WHERE prescription_order = 999;
