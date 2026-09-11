-- C2 — reprise explicite du fonds peau existant
--
-- Cette reprise ne déduit jamais un phototype, une race, une ethnicité ou une
-- profondeur de ton depuis skin_types, le nom ou le texte marketing.
--
-- Les préoccupations/objectifs ci-dessous sont une traduction versionnée des
-- codes legacy déjà présents dans products.concerns. Les codes legacy restent
-- inchangés pour compatibilité ; les champs C2 deviennent la source des filtres.
--
-- Les textures/finis ne sont remplis que lorsque l'ancien champ texture porte
-- une valeur non ambiguë correspondant exactement au vocabulaire contrôlé.
-- Les autres valeurs restent NULL : aucune conversion automatique de « sérum »,
-- « fluide », « satiné », « invisible » ou « non gras ».
-- Aucun phototype n'est renseigné : aucune fiche fournie ne contient une preuve
-- explicite suffisante pour cette dimension.

UPDATE public.products AS p
SET
  skin_types = v.skin_types,
  skin_concerns = v.skin_concerns,
  skin_objectives = v.skin_objectives,
  skin_texture_code = v.skin_texture_code,
  skin_finish_code = v.skin_finish_code,
  skin_supported_phototypes = ARRAY[]::text[],
  skin_taxonomy_version = '2026-09-18.c2'
FROM (
  VALUES
    ('p10', ARRAY['mixte']::text[], ARRAY['taches','imperfections','sensibilite']::text[], ARRAY['attenuer_taches','reduire_imperfections','apaiser']::text[], NULL::text, NULL::text),
    ('p14', ARRAY[]::text[], ARRAY['taches']::text[], ARRAY['attenuer_taches','hydrater']::text[], NULL::text, NULL::text),
    ('p15', ARRAY[]::text[], ARRAY['protection_solaire','taches']::text[], ARRAY['proteger_spf','attenuer_taches','hydrater']::text[], NULL::text, NULL::text),
    ('p6', ARRAY[]::text[], ARRAY['protection_solaire','taches']::text[], ARRAY['proteger_spf','attenuer_taches','hydrater']::text[], NULL::text, NULL::text),
    ('peau-ess-001', ARRAY['mixte','grasse','sensible']::text[], ARRAY['sensibilite']::text[], ARRAY['hydrater','apaiser','renforcer_barriere']::text[], 'gel'::text, 'naturel'::text),
    ('peau-ess-002', ARRAY['mixte','seche','sensible']::text[], ARRAY['sensibilite']::text[], ARRAY['hydrater','renforcer_barriere','apaiser']::text[], NULL::text, NULL::text),
    ('peau-ess-003', ARRAY['mixte','grasse','sensible']::text[], ARRAY['protection_solaire','taches']::text[], ARRAY['proteger_spf','attenuer_taches','hydrater']::text[], NULL::text, NULL::text),
    ('peau-ess-004', ARRAY['mixte','seche','sensible']::text[], ARRAY['sensibilite']::text[], ARRAY['hydrater','apaiser']::text[], NULL::text, NULL::text),
    ('peau-ess-005', ARRAY['mixte','grasse']::text[], ARRAY['teint_terne','taches','imperfections']::text[], ARRAY['eclat','attenuer_taches','reduire_imperfections']::text[], NULL::text, NULL::text),
    ('peau-ess-006', ARRAY['mixte','grasse','sensible']::text[], ARRAY['teint_terne','taches','imperfections']::text[], ARRAY['eclat','attenuer_taches','reduire_imperfections']::text[], NULL::text, NULL::text),
    ('peau-ess-007', ARRAY['mixte','grasse','sensible','seche']::text[], ARRAY['imperfections','taches','sensibilite']::text[], ARRAY['reduire_imperfections','attenuer_taches','apaiser']::text[], NULL::text, 'naturel'::text),
    ('peau-ess-008', ARRAY['mixte','grasse','seche','sensible']::text[], ARRAY['taches','teint_terne']::text[], ARRAY['attenuer_taches','eclat']::text[], NULL::text, 'mat'::text),
    ('peau-ess-009', ARRAY['mixte','grasse','normale']::text[], ARRAY['teint_terne','taches','rides']::text[], ARRAY['eclat','attenuer_taches','prevenir_age']::text[], NULL::text, NULL::text),
    ('peau-ess-010', ARRAY['mixte','grasse','normale','seche']::text[], ARRAY['rides','taches','imperfections']::text[], ARRAY['prevenir_age','attenuer_taches','reduire_imperfections']::text[], NULL::text, NULL::text),
    ('peau-ess-011', ARRAY['mixte','grasse','sensible','seche']::text[], ARRAY['imperfections']::text[], ARRAY['hydrater','renforcer_barriere','reduire_imperfections']::text[], 'gel'::text, NULL::text),
    ('peau-ess-012', ARRAY['seche','tres_seche','sensible']::text[], ARRAY['sensibilite']::text[], ARRAY['hydrater','renforcer_barriere','apaiser']::text[], 'baume'::text, NULL::text),
    ('peau-ess-013', ARRAY['seche','tres_seche','sensible']::text[], ARRAY[]::text[], ARRAY['hydrater','renforcer_barriere']::text[], 'baume'::text, NULL::text),
    ('peau-ess-014', ARRAY['mixte','grasse','seche','sensible']::text[], ARRAY['protection_solaire','taches']::text[], ARRAY['proteger_spf','attenuer_taches']::text[], NULL::text, 'naturel'::text),
    ('peau-ess-015', ARRAY['mixte','grasse']::text[], ARRAY['imperfections']::text[], ARRAY['reduire_imperfections']::text[], 'gel'::text, NULL::text),
    ('peau-ess-016', ARRAY['seche','sensible','mixte']::text[], ARRAY['sensibilite']::text[], ARRAY['hydrater','renforcer_barriere','apaiser']::text[], 'creme'::text, NULL::text)
) AS v(id, skin_types, skin_concerns, skin_objectives, skin_texture_code, skin_finish_code)
WHERE p.id = v.id
  AND p.category = 'peau';

-- Contrôle : le backfill ne doit écrire ni race/ethnicité dans skin_types,
-- ni un phototype déduit. Les fiches sans preuve restent partiellement connues.
