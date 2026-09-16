-- ANNULATION du rattachement du 16/09/2026
-- Généré AVANT l’écriture par scripts/rattacheFournisseursTrouves.ts.
--
-- Particularité : 26 des 52 produits portaient déjà une note du 14/09
-- (campagne d’e-mails de sourcing préparée, non envoyée). L’annulation
-- restaure donc la valeur exacte de chaque produit au lieu de tout
-- remettre à NULL, faute de quoi elle effacerait un travail accompli.
--
-- Ordre : les produits d’abord (clé étrangère), puis les fiches créées.

BEGIN;

UPDATE public.products AS p
   SET supplier_id = v.supplier_id,
       supplier_authorization_note = v.note,
       last_catalog_updated_at = NOW()
  FROM (VALUES
    ('src-lrp-005', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-003', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-004', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-006', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-lrp-007', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-loreal-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo / contact L''Oréal) préparé · non contacté'::text),
    ('fond-cosrx-snail', NULL::text, NULL::text),
    ('src-cosrx-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°1–2 (Pibukare/EOLYS) préparé · non contacté'::text),
    ('src-cosrx-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°1–2 (Pibukare/EOLYS) préparé · non contacté'::text),
    ('fond-boj-glow', NULL::text, NULL::text),
    ('src-inkey-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grossiste dermo — à identifier) préparé · non contacté'::text),
    ('src-weleda-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°8 (Weleda pro) préparé · non contacté'::text),
    ('src-weleda-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°8 (Weleda pro) préparé · non contacté'::text),
    ('src-cosmo-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°9 (Cosmo Naturel) préparé · non contacté'::text),
    ('src-bio-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-klorane-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-ducray-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-avene-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-euc-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-euc-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo) préparé · non contacté'::text),
    ('src-isdin-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo / contact Isdin) préparé · non contacté'::text),
    ('src-isdin-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grosiste dermo / contact Isdin) préparé · non contacté'::text),
    ('src-inoya-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°7 (IN''OYA direct) préparé · non contacté'::text),
    ('fond-to-005', NULL::text, NULL::text),
    ('fond-to-001', NULL::text, NULL::text),
    ('fond-to-004', NULL::text, NULL::text),
    ('fond-to-007', NULL::text, NULL::text),
    ('fond-to-006', NULL::text, NULL::text),
    ('fond-to-008', NULL::text, NULL::text),
    ('fond-to-002', NULL::text, NULL::text),
    ('fond-to-003', NULL::text, NULL::text),
    ('src-to-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grossiste dermo — à identifier) préparé · non contacté'::text),
    ('src-to-002', NULL::text, 'Sourcing en cours (14/09/2026) — email n°10 (grossiste dermo — à identifier) préparé · non contacté'::text),
    ('src-isntree-001', NULL::text, 'Sourcing en cours (14/09/2026) — email n°1–2 (Pibukare/EOLYS) préparé · non contacté'::text),
    ('peau-ess-013', NULL::text, NULL::text),
    ('peau-ess-005', NULL::text, NULL::text),
    ('peau-ess-016', NULL::text, NULL::text),
    ('peau-ess-001', NULL::text, NULL::text),
    ('peau-ess-004', NULL::text, NULL::text),
    ('peau-ess-002', NULL::text, NULL::text),
    ('peau-ess-011', NULL::text, NULL::text),
    ('peau-ess-003', NULL::text, NULL::text),
    ('peau-ess-007', NULL::text, NULL::text),
    ('peau-ess-012', NULL::text, NULL::text),
    ('peau-ess-015', NULL::text, NULL::text),
    ('peau-ess-006', NULL::text, NULL::text),
    ('peau-ess-014', NULL::text, NULL::text),
    ('peau-ess-009', NULL::text, NULL::text),
    ('peau-ess-008', NULL::text, NULL::text),
    ('peau-ess-010', NULL::text, NULL::text)
  ) AS v(id, supplier_id, note)
 WHERE p.id = v.id;

DELETE FROM public.suppliers WHERE id IN ('sup-laboratoire-in-oya', 'sup-weleda-fr', 'sup-laboratoire-gravier-production', 'sup-oomylab', 'sup-les-laboratoires-phytodia', 'sup-pierre-fabre-dermo-cosmetique', 'sup-naos-france', 'sup-isdin', 'sup-beiersdorf', 'sup-loreal-fr', 'sup-qogita', 'sup-sparcos', 'sup-miin-trade');

COMMIT;
