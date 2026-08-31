-- ============================================================
-- CHANTIER 1, lot 2 — INCOMPATIBILITÉS DE FORMULATION / ROUTINE
-- Généré le 2026-08-31 par scripts/buildIncompatibilities.ts
--
-- Interactions reconnues de formulation/tolérance (consensus
-- formulationniste, SCCS pour les conservateurs/allergènes).
-- Ce ne sont PAS des conseils médicaux : des règles de
-- superposition de soins grand public. Niveau de preuve prudent.
-- Idempotent (ON CONFLICT sur la paire d'ingrédients).
-- ============================================================

BEGIN;

INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('retinol', 'salicylic-acid', 'avoid', 'Le rétinol et l''acide salicylique (BHA) sont tous deux irritants et accélèrent le renouvellement cutané : ensemble, ils augmentent fortement rougeurs, desquamation et sensibilité. Les utiliser à des jours différents. [Source : Consensus formulationniste / recommandations dermatologiques grand public (routine soin).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'retinol', 'avoid', 'Le rétinol associé à un acide de fruit (AHA, ici acide lactique) ajoute l''irritation et peut déstabiliser le rétinol (pH acide). À espacer (soirs différents). [Source : Consensus formulationniste (stabilité des rétinoïdes en milieu acide).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('citric-acid', 'retinol', 'caution', 'Le rétinol est sensible au pH acide ; un apport conjoint d''acide citrique peut accélérer sa dégradation et augmenter l''irritation. En pratique, les acides et le rétinol se séparent dans la routine. [Source : Données de stabilité des rétinoïdes (sensibilité au pH).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('ascorbic-acid', 'lactic-acid', 'caution', 'L''acide ascorbique (vitamine C) et les AHA sont tous deux acides et potentiellement irritants ; leur superposition peut provoquer picotements et rougeurs sur peaux sensibles. Les espacer ou séparer matin/soir. [Source : Consensus soin cutané (tolérance des actifs acides superposés).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('ascorbic-acid', 'salicylic-acid', 'space_out', 'Vitamine C le matin (antioxydant, soutient la protection sous UV) et BHA le soir : superposés, l''irritation s''additionne. Les séparer dans la journée est la pratique recommandée. [Source : Recommandations de routine soin (séparation des actifs).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('ascorbic-acid', 'retinol', 'space_out', 'La vitamine C (antioxydante, plutôt le matin) et le rétinol (plutôt le soir) sont classiquement séparés : tous deux irritants pour les peaux non habituées, leur superposition est mal tolérée. [Source : Consensus de routine soin (séparation matin/soir).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'niacinamide', 'caution', 'À très bas pH, la niacinamide peut générer un peu d''acide nicotinique irritant et voir sa tolérance réduite en présence d''AHA. Une peau habituée tolère, mais sur peau sensible on les espace ou on utilise la niacinamide à pH neutre. [Source : Littérature formulation (hydrolyse de la niacinamide en milieu acide).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('niacinamide', 'salicylic-acid', 'caution', 'Même principe qu''avec les AHA : l''association niacinamide + BHA est possible mais peut irriter les peaux sensibles du fait de contextes de pH différents. Tester progressivement ou espacer. [Source : Consensus de tolérance de routine.]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('ascorbic-acid', 'niacinamide', 'caution', 'L''idée reçue d''une incompatibilité chimique est largement nuancée : les deux sont surtout irritants séparément, donc leur superposition peut rougir les peaux sensibles. Aucune neutralisation réelle à concentration d''usage. [Source : Recoupements formulationnistes (mythe vs tolérance).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('methylchloroisothiazolinone', 'methylisothiazolinone', 'caution', 'Le mélange CMIT/MIT et la MIT sont des conservateurs très sensibilisants : leur présence cumulée dans plusieurs produits d''une même routine augmente l''exposition et le risque d''allergie de contact. Limiter le nombre de produits qui en contiennent. [Source : SCCS / Règlement (CE) 1223/2009 (restrictions Annexe V ; MIT interdite en non-rincé).]', 'A')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('citric-acid', 'tocopherol', 'caution', 'L''acide citrique (chélateur) et le tocophérol (antioxydant) sont en général synergiques dans une formule, mais dans une routine superposée à vif un pH très acide peut irriter ; à surveiller sur peau sensible. Pas de contre-indication formelle. [Source : Prudence formulation (tolérance), pas d''interdiction.]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('cetrimonium-chloride', 'sodium-lauryl-sulfate', 'caution', 'Un tensioactif anionique très décapant (SLS) suivi d''un conditionneur cationique neutralise une partie de ce dernier par interaction de charges et augmente le dessèchement. Préférer un tensioactif plus doux (SLES/bétaïne) avant un soin cationique. [Source : Chimie des tensioactifs (complexation anionique/cationique).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('behentrimonium-chloride', 'sodium-lauryl-sulfate', 'caution', 'Même interaction de charges : un shampoing très anionique (SLS) réduit la fixation des conditionneurs cationiques (chlorure de béhentrimonium) et assèche davantage. Rincer le shampoing avant le soin et privilégier des bases lavantes douces. [Source : Chimie de formulation capillaire (anionique/cationique).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('cetrimonium-chloride', 'sodium-laureth-sulfate', 'space_out', 'Le SLES (anionique, plus doux que le SLS) interagit aussi avec les cationiques : bien rincer le shampoing avant d''appliquer le conditionneur pour que ce dernier se fixe sur la fibre. [Source : Pratique de formulation capillaire (rinçage entre lavage et soin).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('retinol', 'titanium-dioxide', 'space_out', 'Le rétinol photosensibilise : il s''applique le soir, et la protection UV (filtre minéral) le matin. Les deux dans le même soin du matin n''a pas de sens et le rétinol doit toujours être associé à une protection UV diurne. [Source : Recommandations d''usage des rétinoïdes (protection UV obligatoire).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('retinol', 'zinc-oxide', 'space_out', 'Même conseil : rétinol le soir, filtre UV (oxyde de zinc) le matin. La protection solaire est indispensable en cure de rétinol. [Source : Recommandations d''usage des rétinoïdes.]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('hydroquinone', 'retinol', 'avoid', 'Outre que l''hydroquinone est interdite dans les cosmétiques dans l''UE (Annexe II), son association avec le rétinol est extrêmement irritante. Elle ne doit pas figurer dans un produit KURLA vendu en UE. [Source : Règlement (CE) 1223/2009, Annexe II (interdiction) + tolérance cutanée.]', 'A')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'salicylic-acid', 'avoid', 'BHA (acide salicylique) et AHA (acide lactique) superposés additionnent leur action exfoliante et irritante : risque de rougeurs, brûlures et perte de barrière cutanée. Choisir l''un ou l''autre, pas les deux dans la même application. [Source : Consensus dermatologique/grand public (ne pas cumuler les exfoliants acides).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('citric-acid', 'salicylic-acid', 'caution', 'L''acide citrique (ajusteur de pH / AHA léger) associé au BHA peut renforcer l''acidité et l''irritation. À concentration d''usage en tant qu''ajusteur de pH l''effet est faible, mais éviter de superposer un produit riche en acide citrique et un exfoliant BHA. [Source : Prudence de superposition (pH et irritation).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('isopropyl-alcohol', 'niacinamide', 'space_out', 'Une forte teneur en alcool isopropylique irrite et déshydrate ; appliquer un actif comme la niacinamide juste après un produit très alcoolisé réduit la tolérance. Laisser poser/absorber ou préférer des bases peu alcoolisées. [Source : Conseil de tolérance (alcool dénaturant et barrière cutanée).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('linalool', 'methylisothiazolinone', 'caution', 'Les terpènes parfumés oxydés (linalool) et les isothiazolinones sont parmi les principaux allergènes de contact cosmétiques : multiplier les produits qui combinent parfums allergènes et MIT/CMIT augmente le risque global de sensibilisation. [Source : SCCS (allergènes parfumants + isothiazolinones, contacts déclarés).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('limonene', 'methylisothiazolinone', 'caution', 'Le limonène (surtout oxydé) est un allergène fréquent ; combiné à des conservateurs isothiazolinone très sensibilisants, il alourdit la charge allergénique d''une routine. Privilégier des produits peu parfumés pour les peaux réactives. [Source : SCCS (allergènes parfumants + isothiazolinones).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'titanium-dioxide', 'space_out', 'Les AHA (acide lactique) augmentent la photosensibilité : ils s''appliquent le soir et s''accompagnent obligatoirement d''un filtre UV le matin. Ne pas compter sur l''AHA comme protection solaire. [Source : Recommandations d''usage des AHA (protection UV).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('salicylic-acid', 'zinc-oxide', 'space_out', 'Le BHA s''utilise plutôt le soir ; le filtre UV (oxyde de zinc) le matin. Après exfoliation, la protection solaire est essentielle, surtout sur peaux mélanisées pour limiter les taches post-inflammatoires. [Source : Conseil de routine (exfoliation + UV).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('disodium-edta', 'zinc_pca', 'caution', 'Les chélateurs puissants (EDTA) peuvent complexer les cations métalliques (zinc du PCA de zinc) et réduire leur disponibilité dans une même formule. En routine superposée l''effet est faible ; en formulation, on les gère au dosage. [Source : Chimie des chélateurs (complexation métallique).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('salicylic-acid', 'sodium-salicylate', 'caution', 'L''acide salicylique et le salicylate de sodium relèvent du même actif (salicylés) : les superposer additionne la concentration et l''irritation sans bénéfice. Vérifier qu''un seul produit de la routine apporte du salicylé. [Source : Règlement (CE) 1223/2009 Annexe V/3 (limites globales en acide salicylique).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('benzoic-acid', 'sodium-benzoate', 'caution', 'L''acide benzoïque et le benzoate de sodium sont comptés ensemble au titre de l''Annexe V/1 : multiplier les produits qui en contiennent additionne la charge en conservateur, à respecter dans le produit fini. [Source : Règlement (CE) 1223/2009, Annexe V/1 (exprimé en acide).]', 'A')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('e211', 'sodium-benzoate', 'caution', 'E211 est le benzoate de sodium : ne pas compter deux fois le même conservateur. La somme des benzoates d''une formule doit rester sous la limite de l''Annexe V/1. [Source : Règlement (CE) 1223/2009, Annexe V/1.]', 'A')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'sodium-hydroxide', 'caution', 'La soude (ajusteur de pH) neutralise les acides : dans une formule mal équilibrée elle peut annuler l''action d''un AHA comme l''acide lactique. En produit fini le pH est déjà ajusté ; cette interaction concerne la formulation, pas la superposition de deux produits du commerce. [Source : Neutralisation acide-base (formulation).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('salicylic-acid', 'sodium-hydroxide', 'caution', 'La soude neutralise l''acide salicylique (formation de salicylate) : le pH de la formule conditionne l''activité kératolytique. Réglage de formulation, sans risque pour l''utilisateur final d''un produit fini stable. [Source : Chimie acide-base (formulation).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('sodium-laureth-sulfate', 'sodium-lauryl-sulfate', 'caution', 'SLS et SLES sont tous deux anioniques et décapants ; les cumuler dans une même routine de lavage (shampoing + nettoyant) assèche fortement cheveux crépus et cuir chevelu sensible. Un seul lavage tensioactif, puis conditionnement, est préférable. [Source : Connaissance de formulation capillaire (pouvoir dégraissant des sulfates).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('cocamidopropyl_betaine', 'sodium-lauryl-sulfate', 'space_out', 'La bétaïne (CAPB) est justement utilisée pour adoucir le SLS dans une formule, mais deux produits distincts très riches en SLS restent décapants. Privilégier un seul nettoyant, idéalement enrichi en bétaïne/APG, sur cheveux texturés. [Source : Formulation des nettoyants doux (association sulfate/bétaïne).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('dimethiconol', 'stearamidopropyl-dimethylamine', 'space_out', 'Le silicone filmogène (dimethiconol) déposé avant un conditionneur cationique peut gêner l''adhésion de ce dernier sur la fibre si le silicone n''est pas rincé. Appliquer le soin cationique sur cheveux propres et rincés ; les silicones en leave-on viennent après. [Source : Pratique de formulation capillaire (ordre de dépôt des actifs).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('behentrimonium-chloride', 'cyclopentasiloxane', 'space_out', 'Le cyclopentasiloxane (silicone volatil) en leave-in peut former un film qui limite la pénétration d''un conditionneur cationique appliqué ensuite. Respecter l''ordre : conditionneur cationique sous l''eau, puis silicone en finition. [Source : Ordre d''application des soins capillaires (charge puis film).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('menthol', 'salicylic-acid', 'caution', 'Le menthol potentialise la sensation de picotement ; associé au BHA sur une peau déjà exfoliée ou sensible, il peut donner une impression de brûlure. Rien de toxique, mais espacer sur peaux réactives. [Source : Sensation cutanée (menthol récepteurs TRPM8), tolérance.]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'menthol', 'caution', 'Comme avec le BHA, le menthol accentue la sensation de picotement d''un AHA. Sur peau sensible ou après gommage, éviter la superposition immédiate. [Source : Tolérance cutanée (sensations liées au menthol).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('melaleuca_alternifolia', 'salicylic-acid', 'caution', 'L''huile essentielle de tea tree (parfumante, sensibilisante) sur une peau déjà exfoliée par du BHA augmente le risque d''irritation et d''allergie de contact. Ne pas l''appliquer pure ni sur peau lésée. [Source : SCCS/HE : huiles essentielles et risque de sensibilisation sur peau abîmée.]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('lactic-acid', 'rosmarinus_officinalis', 'caution', 'L''huile essentielle de romarin (parfumante) combinée à un AHA peut irriter les peaux sensibles du fait de l''exfoliation qui augmente la pénétration. L''usage doit rester cosmétique, dilué, et sans visée thérapeutique. [Source : Prudence HE sur peau exfoliée (sensibilisation).]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('mentha_piperita', 'menthol', 'caution', 'L''huile essentielle de menthe poivrée est naturellement riche en menthol : les superposer additionne l''effet fraîcheur/irritant. Les huiles essentielles de menthe sont déconseillées sur jeunes enfants et peaux réactives. [Source : Composition HE menthe (menthol) et recommandations d''usage cosmétique.]', 'C')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('citronellol', 'geraniol', 'space_out', 'Citronellol et géraniol sont tous deux des allergènes parfumants à déclarer ; leur présence cumulée dans plusieurs produits parfumés d''une routine augmente l''exposition. Sur peau sensible, préférer les formules sans parfum. [Source : Règlement (CE) 1223/2009 Annexe III + (UE) 2023/1545 (allergènes à déclarer).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('hydroxycitronellal', 'linalool', 'space_out', 'Le linalool oxydé et l''hydroxycitronellal sont des sensibilisants connus ; multiplier les produits parfumés qui en contiennent accroît le risque d''allergie de contact cumulative. Pas de danger aigu, mais limiter la charge parfumante quotidienne. [Source : SCCS (sensibilisants parfumants oxydés).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('citral', 'limonene', 'space_out', 'Citral et limonène (surtout oxydés) comptent parmi les terpènes parfumants les plus sensibilisants. Une routine cumulant plusieurs produits parfumés augmente l''exposition ; préférer le sans-parfum pour les peaux réactives. [Source : SCCS / Annexe III (allergènes parfumants).]', 'B')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('benzyl-alcohol', 'phenoxyethanol', 'space_out', 'Le phénoxyéthanol et l''alcool benzylique sont deux conservateurs différents mais souvent présents dans des produits distincts d''une même routine. Aucune interaction chimique dangereuse ; il s''agit seulement de ne pas multiplier inutilement les conservateurs sur peaux très sensibles. [Source : Tolérance des conservateurs (pas d''interdiction de coexistence).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;
INSERT INTO public.ingredient_incompatibilities (ingredient_a, ingredient_b, severity, explanation, evidence_level)
VALUES ('butyrospermum_parkii', 'hydrolyzed_rice', 'space_out', 'Le beurre de karité très occlusif appliqué avant une protéine de riz hydrolysée peut limiter sa fixation sur la fibre. Protéines puis beurre en scellement : l''ordre (soin léger d''abord, corps gras en finition) préserve le gainage sur cheveux texturés. [Source : Méthode capillaire (ordre soin protéiné / scellement au beurre).]', 'D')
ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, evidence_level = EXCLUDED.evidence_level;

COMMIT;
