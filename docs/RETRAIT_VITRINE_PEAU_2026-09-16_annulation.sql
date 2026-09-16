-- ANNULATION du retrait de vitrine du 16/09/2026
-- Généré AVANT l'écriture par scripts/retireCandidatsVitrinePeau.ts.
--
-- Remet les 40 candidates de test de l’espace peau dans leur état
-- d’avant : publiées et actives. Rien n’a été supprimé, tout est
-- restaurable par cette seule requête.

BEGIN;

UPDATE public.products AS p
   SET catalog_status = v.statut,
       is_active = v.actif,
       last_catalog_updated_at = NOW()
  FROM (VALUES
    ('fond-to-004', 'published', true),
    ('src-lrp-007', 'published', true),
    ('src-euc-002', 'published', true),
    ('src-bio-001', 'published', true),
    ('fond-to-008', 'published', true),
    ('fond-cosrx-snail', 'published', true),
    ('fond-boj-glow', 'published', true),
    ('src-lrp-003', 'published', true),
    ('src-lrp-005', 'published', true),
    ('src-lrp-002', 'published', true),
    ('src-lrp-006', 'published', true),
    ('src-lrp-001', 'published', true),
    ('src-loreal-001', 'published', true),
    ('src-weleda-001', 'published', true),
    ('src-weleda-002', 'published', true),
    ('src-isntree-001', 'published', true),
    ('src-cosmo-001', 'published', true),
    ('src-isdin-002', 'published', true),
    ('fond-to-001', 'published', true),
    ('fond-to-002', 'published', true),
    ('src-inoya-001', 'published', true),
    ('fond-to-003', 'published', true),
    ('fond-to-006', 'published', true),
    ('src-cosrx-002', 'published', true),
    ('fond-to-007', 'published', true),
    ('peau-test-torriden-dive-in-serum', 'published', true),
    ('peau-test-torriden-dive-in-creme', 'published', true),
    ('src-to-001', 'published', true),
    ('peau-test-torriden-dive-in-mousse', 'published', true),
    ('src-cosrx-001', 'published', true),
    ('src-euc-001', 'published', true),
    ('peau-test-torriden-balanceful-gel', 'published', true),
    ('src-isdin-001', 'published', true),
    ('peau-test-torriden-balanceful-disques', 'published', true),
    ('peau-test-boj-tonique-riz', 'published', true),
    ('src-inkey-001', 'published', true),
    ('fond-to-005', 'published', true),
    ('src-lrp-004', 'published', true),
    ('src-to-002', 'published', true),
    ('src-avene-001', 'published', true)
  ) AS v(id, statut, actif)
 WHERE p.id = v.id;

COMMIT;
