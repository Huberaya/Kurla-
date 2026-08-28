-- ============================================================
-- LOT D'INGRÉDIENTS VÉRIFIÉS — LOT 1 (chantier 10, bloc B4)
--
-- Généré par scripts/build-ingredient-migration.py depuis la trace
-- docs/data/ingredient_batch_1.json (retraits du 2026-08-28).
-- NE PAS ÉDITER À LA MAIN : toute ligne doit correspondre à une
-- vérification tracée.
--
-- Niveau 1 (9 lignes) : INCI présent littéralement dans la
--   liste de synonymes PubChem + numéro CAS publié → verification_status
--   = 'verified'.
-- Niveau 2 (14 lignes) : entité botanique dont l'espèce est
--   vérifiée (NCBI Taxonomy) mais dont la dénomination INCI complète n'est
--   publiée par aucune des deux sources → verification_status = 'pending'.
-- Écartées (2 lignes) : aucune source n'a confirmé l'identité ;
--   elles ne sont PAS insérées.
--
-- Fonctions cosmétiques : volontairement vides pour les nouvelles lignes.
-- Aucune source consultée ne publie de fonction par ingrédient ; en écrire
-- une serait une affirmation sans preuve. Les lignes déjà présentes (seed
-- 20260851, preuve 'consensus') conservent leurs fonctions.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROVENANCE : chaque ligne vérifiée porte sa source, son URL et sa date.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingredient_provenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  source_label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  retrieved_at DATE NOT NULL,
  cas_number TEXT,
  evidence_tier SMALLINT NOT NULL DEFAULT 1 CHECK (evidence_tier IN (1, 2)),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredient_provenance_unique UNIQUE (ingredient_id, source_url)
);
CREATE INDEX IF NOT EXISTS idx_ingredient_provenance_ingredient
  ON public.ingredient_provenance(ingredient_id);

-- ------------------------------------------------------------
-- 2. INGRÉDIENTS
-- ------------------------------------------------------------
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('glycerin', 'Glycerin', 'glycerin', ARRAY['glycérine', 'glycérine végétale'], '{}', 'polyols', 'végétal ou synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('niacinamide', 'Niacinamide', 'niacinamide', ARRAY['vitamine B3', 'niacinamide'], '{}', 'vitamines', 'synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('panthenol', 'Panthenol', 'panthenol', ARRAY['provitamine B5', 'panthénol'], '{}', 'vitamines', 'synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('squalane', 'Squalane', 'squalane', ARRAY['squalane végétal', 'squalane'], '{}', 'lipides', 'végétal', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('allantoin', 'Allantoin', 'allantoin', ARRAY['allantoïne', 'allantoine'], '{}', 'actifs', 'synthèse ou végétal', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('salicylic-acid', 'Salicylic Acid', 'salicylic acid', ARRAY['acide salicylique', 'bha'], '{}', 'acides', 'synthèse ou végétal', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('tranexamic_acid', 'Tranexamic Acid', 'tranexamic acid', ARRAY['acide tranexamique'], '{}', 'actifs', 'synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('zinc_pca', 'Zinc PCA', 'zinc pca', ARRAY['zinc pca', 'pca de zinc'], '{}', 'minéraux', 'synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('melaleuca_alternifolia', 'Melaleuca Alternifolia Leaf Oil', 'melaleuca alternifolia leaf oil', ARRAY['huile d''arbre à thé', 'tea tree'], '{}', 'huiles essentielles', 'végétal', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('butyrospermum_parkii', 'Butyrospermum Parkii Butter', 'butyrospermum parkii butter', ARRAY['beurre de karité', 'karité'], '{}', 'beurres', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('mangifera_indica', 'Mangifera Indica Seed Butter', 'mangifera indica seed butter', ARRAY['beurre de mangue'], '{}', 'beurres', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('simmondsia_chinensis', 'Simmondsia Chinensis Seed Oil', 'simmondsia chinensis seed oil', ARRAY['huile de jojoba', 'jojoba'], '{}', 'huiles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('helianthus_annuus', 'Helianthus Annuus Seed Oil', 'helianthus annuus seed oil', ARRAY['huile de tournesol', 'tournesol'], '{}', 'huiles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('argania_spinosa', 'Argania Spinosa Kernel Oil', 'argania spinosa kernel oil', ARRAY['huile d''argan', 'argan'], '{}', 'huiles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('persea_gratissima', 'Persea Gratissima Oil', 'persea gratissima oil', ARRAY['huile d''avocat', 'avocat'], '{}', 'huiles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('ricinus_communis', 'Ricinus Communis Seed Oil', 'ricinus communis seed oil', ARRAY['huile de carapate', 'carapate', 'huile de ricin', 'black castor oil'], '{}', 'huiles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('aloe_barbadensis', 'Aloe Barbadensis Leaf Juice', 'aloe barbadensis leaf juice', ARRAY['aloe vera', 'aloès'], '{}', 'extraits', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('rosmarinus_officinalis', 'Rosmarinus Officinalis Leaf Oil', 'rosmarinus officinalis leaf oil', ARRAY['huile de romarin', 'romarin à cinéole'], '{}', 'huiles essentielles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('althaea_officinalis', 'Althaea Officinalis Root Extract', 'althaea officinalis root extract', ARRAY['extrait de guimauve', 'guimauve'], '{}', 'extraits', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('avena_sativa', 'Avena Sativa Kernel Extract', 'avena sativa kernel extract', ARRAY['avoine douce', 'avoine colloïdale'], '{}', 'extraits', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('theobroma_cacao', 'Theobroma Cacao Extract', 'theobroma cacao extract', ARRAY['extrait de cacao', 'cacao'], '{}', 'extraits', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('hydrolyzed_rice', 'Hydrolyzed Rice Protein', 'hydrolyzed rice protein', ARRAY['protéine de riz'], '{}', 'protéines', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at) VALUES ('mentha_piperita', 'Mentha Piperita Oil', 'mentha piperita oil', ARRAY['menthe poivrée', 'hydrolat de menthe poivrée'], '{}', 'huiles essentielles', 'végétal', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 3. PROVENANCE DES LIGNES CI-DESSUS
-- ------------------------------------------------------------
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('glycerin', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/753', '2026-08-28', '56-81-5', 1, 'INCI vérifié : glycerin') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('niacinamide', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/936', '2026-08-28', '98-92-0', 1, 'INCI vérifié : niacinamide') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('panthenol', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/4678', '2026-08-28', '16485-10-2', 1, 'INCI vérifié : panthenol') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('squalane', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/8089', '2026-08-28', '111-01-3', 1, 'INCI vérifié : SQUALANE') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('allantoin', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/204', '2026-08-28', '97-59-6', 1, 'INCI vérifié : allantoin') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('salicylic-acid', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/338', '2026-08-28', '69-72-7', 1, 'INCI vérifié : salicylic acid') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('tranexamic_acid', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/5526', '2026-08-28', '701-54-2', 1, 'INCI vérifié : tranexamic acid') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('zinc_pca', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/11602214', '2026-08-28', '15454-75-8', 1, 'INCI vérifié : Zinc PCA') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('melaleuca_alternifolia', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/22833361', '2026-08-28', '8022-72-8', 1, 'INCI vérifié : Melaleuca alternifolia leaf oil') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('butyrospermum_parkii', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/292385', '2026-08-28', NULL, 2, 'Binôme vérifié : Butyrospermum Parkii (taxid 292385)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('mangifera_indica', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/29780', '2026-08-28', NULL, 2, 'Binôme vérifié : Mangifera Indica (taxid 29780)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('simmondsia_chinensis', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/3999', '2026-08-28', NULL, 2, 'Binôme vérifié : Simmondsia Chinensis (taxid 3999)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('helianthus_annuus', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/4232', '2026-08-28', NULL, 2, 'Binôme vérifié : Helianthus Annuus (taxid 4232)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('argania_spinosa', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/2945705', '2026-08-28', NULL, 2, 'Binôme vérifié : Argania Spinosa (taxid 2945705)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('persea_gratissima', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/3435', '2026-08-28', NULL, 2, 'Binôme vérifié : Persea Gratissima (taxid 3435)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('ricinus_communis', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/3988', '2026-08-28', NULL, 2, 'Binôme vérifié : Ricinus Communis (taxid 3988)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('aloe_barbadensis', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/34199', '2026-08-28', NULL, 2, 'Binôme vérifié : Aloe Barbadensis (taxid 34199)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('rosmarinus_officinalis', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/39367', '2026-08-28', NULL, 2, 'Binôme vérifié : Rosmarinus Officinalis (taxid 39367)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('althaea_officinalis', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/145745', '2026-08-28', NULL, 2, 'Binôme vérifié : Althaea Officinalis (taxid 145745)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('avena_sativa', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/4498', '2026-08-28', NULL, 2, 'Binôme vérifié : Avena Sativa (taxid 4498)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('theobroma_cacao', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/3641', '2026-08-28', NULL, 2, 'Binôme vérifié : Theobroma Cacao (taxid 3641)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('hydrolyzed_rice', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/4530', '2026-08-28', NULL, 2, 'Binôme vérifié : Hydrolyzed Rice (taxid 4530)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note) VALUES ('mentha_piperita', 'NCBI Taxonomy — espèce vérifiée (la dénomination INCI complète n''y est pas publiée)', 'https://www.ncbi.nlm.nih.gov/taxonomy/34256', '2026-08-28', NULL, 2, 'Binôme vérifié : Mentha Piperita (taxid 34256)') ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;

-- ------------------------------------------------------------
-- 4. LIAISONS PRODUIT × INGRÉDIENT (calculées depuis les mentions déclarées)
--    source = 'declared' : la marque déclare, KURLA n'a pas analysé.
-- ------------------------------------------------------------
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p1', 'mangifera_indica', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p1', 'theobroma_cacao', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p1', 'helianthus_annuus', 3, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p2', 'althaea_officinalis', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p3', 'ricinus_communis', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p4', 'mentha_piperita', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p4', 'glycerin', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p5', 'ricinus_communis', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p5', 'simmondsia_chinensis', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p6', 'squalane', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p9', 'butyrospermum_parkii', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p9', 'hydrolyzed_rice', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p9', 'argania_spinosa', 3, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p10', 'zinc_pca', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p11', 'avena_sativa', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p12', 'mentha_piperita', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p12', 'ricinus_communis', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p13', 'melaleuca_alternifolia', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p13', 'aloe_barbadensis', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p13', 'allantoin', 3, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p14', 'niacinamide', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p15', 'persea_gratissima', 1, TRUE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p15', 'simmondsia_chinensis', 2, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;
INSERT INTO public.product_ingredients (product_id, ingredient_id, inci_rank, is_key_ingredient, source) VALUES ('p15', 'helianthus_annuus', 3, FALSE, 'declared') ON CONFLICT (product_id, ingredient_id) DO UPDATE SET inci_rank = EXCLUDED.inci_rank, source = EXCLUDED.source;

-- Mentions déclarées SANS correspondance dans le lot vérifié : elles ne sont
-- volontairement rattachées à rien. Une liaison approximative fausserait
-- silencieusement toutes les statistiques en aval.
--   produit p1 : Protéine de Soie végétale
--   produit p10 : Niacinamide 5% ; Acide Tranexamique 3%
--   produit p11 : Aloe Vera Bio ; Huile de Caméline
--   produit p12 : Satin Grade A
--   produit p13 : Acide Salicylique 1.5%
--   produit p14 : Amber Algae ; Vitamin C Ester ; Encapsulated Kojic Acid
--   produit p15 : Jus de Cacao
--   produit p16 : 100% Soie de Mûrier Grade 6A
--   produit p2 : Aloe Vera Pur ; Cocamidopropyl Betaine
--   produit p3 : Acide Hyaluronique capillaire ; Kératine végétale
--   produit p4 : Aloe Vera Pur ; Extrait d’Arbre à Thé
--   produit p5 : Huile de Romarin à Cinéole ; Vitamine E
--   produit p6 : Niacinamide 4% ; Filtres Solaires Organiques invisibles ; Vitamine E
--   produit p7 : Satin de Soie Synthétique Haute Densité Non Absorbant
--   produit p8 : Matériau Ergonomique Souple

