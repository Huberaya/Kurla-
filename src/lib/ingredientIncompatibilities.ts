/**
 * CHANTIER 1, lot 2 — INCOMPATIBILITÉS DE FORMULATION / DE ROUTINE.
 *
 * Utilisé par findConflicts() pour alerter quand deux ingrédients présents
 * dans une même routine (ou une même formule) se neutralisent, se dégradent
 * ou s'additionnent en irritation.
 *
 * Règle de preuve : on n'énonce QUE des interactions de formulation reconnues
 * (sens physico-chimique documenté / consensus formulationniste). On garde un
 * niveau de preuve prudent ('B' = consensus de formulation, 'C' = pratique
 * courante recommandée) et on ne revendique pas d'étude clinique que nous
 * n'avons pas. Il ne s'agit JAMAIS de recommandations médicales : ce sont des
 * conseils de superposition de soins grand public.
 *
 * Sévérités :
 *  - 'space_out' : à utiliser à des moments différents (matin/soir ou jours
 *    distincts), pas de danger à proprement parler mais efficacité/ tolérance
 *    dégradées ensemble ;
 *  - 'caution'   : association possible mais avec précautions (pH, irritation
 *    additive, fenêtre d'application) ;
 *  - 'avoid'     : association déconseillée (dégradation, neutralisation ou
 *    irritation forte attendue).
 *
 * Les ids font référence aux entités du graphe (public.ingredients.id).
 */

export type Severity = "space_out" | "caution" | "avoid";

export interface IncompatibilityFact {
  ingredientA: string;
  ingredientB: string;
  severity: Severity;
  explanation: string;
  evidenceLevel: "A" | "B" | "C" | "D" | "not_established";
  /** Courte référence de la source (consensus formulation / SCCS / manuels). */
  source: string;
}

/**
 * Règles d'incompatibilité sur le périmètre des ingrédients du graphe.
 * La paire est orientée sans signification (le moteur teste les deux sens).
 */
export const INGREDIENT_INCOMPATIBILITIES: IncompatibilityFact[] = [
  // ---------------- Rétinoïdes / acides : irritation additive + pH
  {
    ingredientA: "retinol",
    ingredientB: "salicylic-acid",
    severity: "avoid",
    explanation:
      "Le rétinol et l'acide salicylique (BHA) sont tous deux irritants et accélèrent le renouvellement cutané : ensemble, ils augmentent fortement rougeurs, desquamation et sensibilité. Les utiliser à des jours différents.",
    evidenceLevel: "B",
    source: "Consensus formulationniste / recommandations dermatologiques grand public (routine soin).",
  },
  {
    ingredientA: "retinol",
    ingredientB: "lactic-acid",
    severity: "avoid",
    explanation:
      "Le rétinol associé à un acide de fruit (AHA, ici acide lactique) ajoute l'irritation et peut déstabiliser le rétinol (pH acide). À espacer (soirs différents).",
    evidenceLevel: "B",
    source: "Consensus formulationniste (stabilité des rétinoïdes en milieu acide).",
  },
  {
    ingredientA: "retinol",
    ingredientB: "citric-acid",
    severity: "caution",
    explanation:
      "Le rétinol est sensible au pH acide ; un apport conjoint d'acide citrique peut accélérer sa dégradation et augmenter l'irritation. En pratique, les acides et le rétinol se séparent dans la routine.",
    evidenceLevel: "C",
    source: "Données de stabilité des rétinoïdes (sensibilité au pH).",
  },

  // ---------------- Vitamine C (acide ascorbique) et acides / rétinol
  {
    ingredientA: "ascorbic-acid",
    ingredientB: "lactic-acid",
    severity: "caution",
    explanation:
      "L'acide ascorbique (vitamine C) et les AHA sont tous deux acides et potentiellement irritants ; leur superposition peut provoquer picotements et rougeurs sur peaux sensibles. Les espacer ou séparer matin/soir.",
    evidenceLevel: "B",
    source: "Consensus soin cutané (tolérance des actifs acides superposés).",
  },
  {
    ingredientA: "ascorbic-acid",
    ingredientB: "salicylic-acid",
    severity: "space_out",
    explanation:
      "Vitamine C le matin (antioxydant, soutient la protection sous UV) et BHA le soir : superposés, l'irritation s'additionne. Les séparer dans la journée est la pratique recommandée.",
    evidenceLevel: "C",
    source: "Recommandations de routine soin (séparation des actifs).",
  },
  {
    ingredientA: "ascorbic-acid",
    ingredientB: "retinol",
    severity: "space_out",
    explanation:
      "La vitamine C (antioxydante, plutôt le matin) et le rétinol (plutôt le soir) sont classiquement séparés : tous deux irritants pour les peaux non habituées, leur superposition est mal tolérée.",
    evidenceLevel: "C",
    source: "Consensus de routine soin (séparation matin/soir).",
  },

  // ---------------- Niacinamide et acifs à bas pH
  {
    ingredientA: "niacinamide",
    ingredientB: "lactic-acid",
    severity: "caution",
    explanation:
      "À très bas pH, la niacinamide peut générer un peu d'acide nicotinique irritant et voir sa tolérance réduite en présence d'AHA. Une peau habituée tolère, mais sur peau sensible on les espace ou on utilise la niacinamide à pH neutre.",
    evidenceLevel: "B",
    source: "Littérature formulation (hydrolyse de la niacinamide en milieu acide).",
  },
  {
    ingredientA: "niacinamide",
    ingredientB: "salicylic-acid",
    severity: "caution",
    explanation:
      "Même principe qu'avec les AHA : l'association niacinamide + BHA est possible mais peut irriter les peaux sensibles du fait de contextes de pH différents. Tester progressivement ou espacer.",
    evidenceLevel: "C",
    source: "Consensus de tolérance de routine.",
  },
  {
    ingredientA: "niacinamide",
    ingredientB: "ascorbic-acid",
    severity: "caution",
    explanation:
      "L'idée reçue d'une incompatibilité chimique est largement nuancée : les deux sont surtout irritants séparément, donc leur superposition peut rougir les peaux sensibles. Aucune neutralisation réelle à concentration d'usage.",
    evidenceLevel: "C",
    source: "Recoupements formulationnistes (mythe vs tolérance).",
  },

  // ---------------- Conservateurs isothiazolinones : sensibilisation puissante
  {
    ingredientA: "methylisothiazolinone",
    ingredientB: "methylchloroisothiazolinone",
    severity: "caution",
    explanation:
      "Le mélange CMIT/MIT et la MIT sont des conservateurs très sensibilisants : leur présence cumulée dans plusieurs produits d'une même routine augmente l'exposition et le risque d'allergie de contact. Limiter le nombre de produits qui en contiennent.",
    evidenceLevel: "A",
    source: "SCCS / Règlement (CE) 1223/2009 (restrictions Annexe V ; MIT interdite en non-rincé).",
  },

  // ---------------- Antioxydants / oxydants
  {
    ingredientA: "tocopherol",
    ingredientB: "citric-acid",
    severity: "caution",
    explanation:
      "L'acide citrique (chélateur) et le tocophérol (antioxydant) sont en général synergiques dans une formule, mais dans une routine superposée à vif un pH très acide peut irriter ; à surveiller sur peau sensible. Pas de contre-indication formelle.",
    evidenceLevel: "D",
    source: "Prudence formulation (tolérance), pas d'interdiction.",
  },

  // ---------------- Tensioactifs agressifs + protéines/conditionneurs cationiques en routine de lavage
  {
    ingredientA: "sodium-lauryl-sulfate",
    ingredientB: "cetrimonium-chloride",
    severity: "caution",
    explanation:
      "Un tensioactif anionique très décapant (SLS) suivi d'un conditionneur cationique neutralise une partie de ce dernier par interaction de charges et augmente le dessèchement. Préférer un tensioactif plus doux (SLES/bétaïne) avant un soin cationique.",
    evidenceLevel: "B",
    source: "Chimie des tensioactifs (complexation anionique/cationique).",
  },
  {
    ingredientA: "sodium-lauryl-sulfate",
    ingredientB: "behentrimonium-chloride",
    severity: "caution",
    explanation:
      "Même interaction de charges : un shampoing très anionique (SLS) réduit la fixation des conditionneurs cationiques (chlorure de béhentrimonium) et assèche davantage. Rincer le shampoing avant le soin et privilégier des bases lavantes douces.",
    evidenceLevel: "B",
    source: "Chimie de formulation capillaire (anionique/cationique).",
  },
  {
    ingredientA: "sodium-laureth-sulfate",
    ingredientB: "cetrimonium-chloride",
    severity: "space_out",
    explanation:
      "Le SLES (anionique, plus doux que le SLS) interagit aussi avec les cationiques : bien rincer le shampoing avant d'appliquer le conditionneur pour que ce dernier se fixe sur la fibre.",
    evidenceLevel: "C",
    source: "Pratique de formulation capillaire (rinçage entre lavage et soin).",
  },

  // ---------------- Solaire + actifs qui irritent (conseil de superposition)
  {
    ingredientA: "titanium-dioxide",
    ingredientB: "retinol",
    severity: "space_out",
    explanation:
      "Le rétinol photosensibilise : il s'applique le soir, et la protection UV (filtre minéral) le matin. Les deux dans le même soin du matin n'a pas de sens et le rétinol doit toujours être associé à une protection UV diurne.",
    evidenceLevel: "C",
    source: "Recommandations d'usage des rétinoïdes (protection UV obligatoire).",
  },
  {
    ingredientA: "zinc-oxide",
    ingredientB: "retinol",
    severity: "space_out",
    explanation:
      "Même conseil : rétinol le soir, filtre UV (oxyde de zinc) le matin. La protection solaire est indispensable en cure de rétinol.",
    evidenceLevel: "C",
    source: "Recommandations d'usage des rétinoïdes.",
  },

  // ---------------- Hydroquinone : interdite en UE (rappel juridictionnel + irritation)
  {
    ingredientA: "hydroquinone",
    ingredientB: "retinol",
    severity: "avoid",
    explanation:
      "Outre que l'hydroquinone est interdite dans les cosmétiques dans l'UE (Annexe II), son association avec le rétinol est extrêmement irritante. Elle ne doit pas figurer dans un produit KURLA vendu en UE.",
    evidenceLevel: "A",
    source: "Règlement (CE) 1223/2009, Annexe II (interdiction) + tolérance cutanée.",
  },

  // ---------------- Acides entre eux : irritation additive (superposition)
  {
    ingredientA: "salicylic-acid",
    ingredientB: "lactic-acid",
    severity: "avoid",
    explanation:
      "BHA (acide salicylique) et AHA (acide lactique) superposés additionnent leur action exfoliante et irritante : risque de rougeurs, brûlures et perte de barrière cutanée. Choisir l'un ou l'autre, pas les deux dans la même application.",
    evidenceLevel: "B",
    source: "Consensus dermatologique/grand public (ne pas cumuler les exfoliants acides).",
  },
  {
    ingredientA: "citric-acid",
    ingredientB: "salicylic-acid",
    severity: "caution",
    explanation:
      "L'acide citrique (ajusteur de pH / AHA léger) associé au BHA peut renforcer l'acidité et l'irritation. À concentration d'usage en tant qu'ajusteur de pH l'effet est faible, mais éviter de superposer un produit riche en acide citrique et un exfoliant BHA.",
    evidenceLevel: "C",
    source: "Prudence de superposition (pH et irritation).",
  },

  // ---------------- Alcool + actifs / barrière
  {
    ingredientA: "isopropyl-alcohol",
    ingredientB: "niacinamide",
    severity: "space_out",
    explanation:
      "Une forte teneur en alcool isopropylique irrite et déshydrate ; appliquer un actif comme la niacinamide juste après un produit très alcoolisé réduit la tolérance. Laisser poser/absorber ou préférer des bases peu alcoolisées.",
    evidenceLevel: "D",
    source: "Conseil de tolérance (alcool dénaturant et barrière cutanée).",
  },

  // ---------------- Parfums/allergènes + conservateurs sensibilisants : charge allergénique cumulative
  {
    ingredientA: "linalool",
    ingredientB: "methylisothiazolinone",
    severity: "caution",
    explanation:
      "Les terpènes parfumés oxydés (linalool) et les isothiazolinones sont parmi les principaux allergènes de contact cosmétiques : multiplier les produits qui combinent parfums allergènes et MIT/CMIT augmente le risque global de sensibilisation.",
    evidenceLevel: "B",
    source: "SCCS (allergènes parfumants + isothiazolinones, contacts déclarés).",
  },
  {
    ingredientA: "limonene",
    ingredientB: "methylisothiazolinone",
    severity: "caution",
    explanation:
      "Le limonène (surtout oxydé) est un allergène fréquent ; combiné à des conservateurs isothiazolinone très sensibilisants, il alourdit la charge allergénique d'une routine. Privilégier des produits peu parfumés pour les peaux réactives.",
    evidenceLevel: "B",
    source: "SCCS (allergènes parfumants + isothiazolinones).",
  },

  // ---------------- Exfoliants acides + soleil (photosensibilisation / PIH)
  {
    ingredientA: "lactic-acid",
    ingredientB: "titanium-dioxide",
    severity: "space_out",
    explanation:
      "Les AHA (acide lactique) augmentent la photosensibilité : ils s'appliquent le soir et s'accompagnent obligatoirement d'un filtre UV le matin. Ne pas compter sur l'AHA comme protection solaire.",
    evidenceLevel: "B",
    source: "Recommandations d'usage des AHA (protection UV).",
  },
  {
    ingredientA: "salicylic-acid",
    ingredientB: "zinc-oxide",
    severity: "space_out",
    explanation:
      "Le BHA s'utilise plutôt le soir ; le filtre UV (oxyde de zinc) le matin. Après exfoliation, la protection solaire est essentielle, surtout sur peaux mélanisées pour limiter les taches post-inflammatoires.",
    evidenceLevel: "C",
    source: "Conseil de routine (exfoliation + UV).",
  },

  // ---------------- Chélateurs / cations en formulation
  {
    ingredientA: "disodium-edta",
    ingredientB: "zinc_pca",
    severity: "caution",
    explanation:
      "Les chélateurs puissants (EDTA) peuvent complexer les cations métalliques (zinc du PCA de zinc) et réduire leur disponibilité dans une même formule. En routine superposée l'effet est faible ; en formulation, on les gère au dosage.",
    evidenceLevel: "C",
    source: "Chimie des chélateurs (complexation métallique).",
  },

  // ---------------- Acide salicylique / salicylés et concentrations
  {
    ingredientA: "salicylic-acid",
    ingredientB: "sodium-salicylate",
    severity: "caution",
    explanation:
      "L'acide salicylique et le salicylate de sodium relèvent du même actif (salicylés) : les superposer additionne la concentration et l'irritation sans bénéfice. Vérifier qu'un seul produit de la routine apporte du salicylé.",
    evidenceLevel: "B",
    source: "Règlement (CE) 1223/2009 Annexe V/3 (limites globales en acide salicylique).",
  },
  {
    ingredientA: "benzoic-acid",
    ingredientB: "sodium-benzoate",
    severity: "caution",
    explanation:
      "L'acide benzoïque et le benzoate de sodium sont comptés ensemble au titre de l'Annexe V/1 : multiplier les produits qui en contiennent additionne la charge en conservateur, à respecter dans le produit fini.",
    evidenceLevel: "A",
    source: "Règlement (CE) 1223/2009, Annexe V/1 (exprimé en acide).",
  },
  {
    ingredientA: "sodium-benzoate",
    ingredientB: "e211",
    severity: "caution",
    explanation:
      "E211 est le benzoate de sodium : ne pas compter deux fois le même conservateur. La somme des benzoates d'une formule doit rester sous la limite de l'Annexe V/1.",
    evidenceLevel: "A",
    source: "Règlement (CE) 1223/2009, Annexe V/1.",
  },

  // ---------------- Ajusteurs de pH (base forte) + actifs acides
  {
    ingredientA: "sodium-hydroxide",
    ingredientB: "lactic-acid",
    severity: "caution",
    explanation:
      "La soude (ajusteur de pH) neutralise les acides : dans une formule mal équilibrée elle peut annuler l'action d'un AHA comme l'acide lactique. En produit fini le pH est déjà ajusté ; cette interaction concerne la formulation, pas la superposition de deux produits du commerce.",
    evidenceLevel: "D",
    source: "Neutralisation acide-base (formulation).",
  },
  {
    ingredientA: "sodium-hydroxide",
    ingredientB: "salicylic-acid",
    severity: "caution",
    explanation:
      "La soude neutralise l'acide salicylique (formation de salicylate) : le pH de la formule conditionne l'activité kératolytique. Réglage de formulation, sans risque pour l'utilisateur final d'un produit fini stable.",
    evidenceLevel: "D",
    source: "Chimie acide-base (formulation).",
  },

  // ---------------- Tensioactifs entre eux : charge décapante
  {
    ingredientA: "sodium-lauryl-sulfate",
    ingredientB: "sodium-laureth-sulfate",
    severity: "caution",
    explanation:
      "SLS et SLES sont tous deux anioniques et décapants ; les cumuler dans une même routine de lavage (shampoing + nettoyant) assèche fortement cheveux crépus et cuir chevelu sensible. Un seul lavage tensioactif, puis conditionnement, est préférable.",
    evidenceLevel: "B",
    source: "Connaissance de formulation capillaire (pouvoir dégraissant des sulfates).",
  },
  {
    ingredientA: "sodium-lauryl-sulfate",
    ingredientB: "cocamidopropyl_betaine",
    severity: "space_out",
    explanation:
      "La bétaïne (CAPB) est justement utilisée pour adoucir le SLS dans une formule, mais deux produits distincts très riches en SLS restent décapants. Privilégier un seul nettoyant, idéalement enrichi en bétaïne/APG, sur cheveux texturés.",
    evidenceLevel: "C",
    source: "Formulation des nettoyants doux (association sulfate/bétaïne).",
  },

  // ---------------- Silicones et résidus sur fibre non traitée (conseil capillaire)
  {
    ingredientA: "dimethiconol",
    ingredientB: "stearamidopropyl-dimethylamine",
    severity: "space_out",
    explanation:
      "Le silicone filmogène (dimethiconol) déposé avant un conditionneur cationique peut gêner l'adhésion de ce dernier sur la fibre si le silicone n'est pas rincé. Appliquer le soin cationique sur cheveux propres et rincés ; les silicones en leave-on viennent après.",
    evidenceLevel: "C",
    source: "Pratique de formulation capillaire (ordre de dépôt des actifs).",
  },
  {
    ingredientA: "cyclopentasiloxane",
    ingredientB: "behentrimonium-chloride",
    severity: "space_out",
    explanation:
      "Le cyclopentasiloxane (silicone volatil) en leave-in peut former un film qui limite la pénétration d'un conditionneur cationique appliqué ensuite. Respecter l'ordre : conditionneur cationique sous l'eau, puis silicone en finition.",
    evidenceLevel: "C",
    source: "Ordre d'application des soins capillaires (charge puis film).",
  },

  // ---------------- Menthol / fraîcheur et actifs irritants
  {
    ingredientA: "menthol",
    ingredientB: "salicylic-acid",
    severity: "caution",
    explanation:
      "Le menthol potentialise la sensation de picotement ; associé au BHA sur une peau déjà exfoliée ou sensible, il peut donner une impression de brûlure. Rien de toxique, mais espacer sur peaux réactives.",
    evidenceLevel: "D",
    source: "Sensation cutanée (menthol récepteurs TRPM8), tolérance.",
  },
  {
    ingredientA: "menthol",
    ingredientB: "lactic-acid",
    severity: "caution",
    explanation:
      "Comme avec le BHA, le menthol accentue la sensation de picotement d'un AHA. Sur peau sensible ou après gommage, éviter la superposition immédiate.",
    evidenceLevel: "D",
    source: "Tolérance cutanée (sensations liées au menthol).",
  },

  // ---------------- Huiles essentielles allergènes + peau sensible
  {
    ingredientA: "melaleuca_alternifolia",
    ingredientB: "salicylic-acid",
    severity: "caution",
    explanation:
      "L'huile essentielle de tea tree (parfumante, sensibilisante) sur une peau déjà exfoliée par du BHA augmente le risque d'irritation et d'allergie de contact. Ne pas l'appliquer pure ni sur peau lésée.",
    evidenceLevel: "B",
    source: "SCCS/HE : huiles essentielles et risque de sensibilisation sur peau abîmée.",
  },
  {
    ingredientA: "rosmarinus_officinalis",
    ingredientB: "lactic-acid",
    severity: "caution",
    explanation:
      "L'huile essentielle de romarin (parfumante) combinée à un AHA peut irriter les peaux sensibles du fait de l'exfoliation qui augmente la pénétration. L'usage doit rester cosmétique, dilué, et sans visée thérapeutique.",
    evidenceLevel: "C",
    source: "Prudence HE sur peau exfoliée (sensibilisation).",
  },
  {
    ingredientA: "mentha_piperita",
    ingredientB: "menthol",
    severity: "caution",
    explanation:
      "L'huile essentielle de menthe poivrée est naturellement riche en menthol : les superposer additionne l'effet fraîcheur/irritant. Les huiles essentielles de menthe sont déconseillées sur jeunes enfants et peaux réactives.",
    evidenceLevel: "C",
    source: "Composition HE menthe (menthol) et recommandations d'usage cosmétique.",
  },

  // ---------------- Parfums allergènes entre eux : charge déclarative
  {
    ingredientA: "citronellol",
    ingredientB: "geraniol",
    severity: "space_out",
    explanation:
      "Citronellol et géraniol sont tous deux des allergènes parfumants à déclarer ; leur présence cumulée dans plusieurs produits parfumés d'une routine augmente l'exposition. Sur peau sensible, préférer les formules sans parfum.",
    evidenceLevel: "B",
    source: "Règlement (CE) 1223/2009 Annexe III + (UE) 2023/1545 (allergènes à déclarer).",
  },
  {
    ingredientA: "linalool",
    ingredientB: "hydroxycitronellal",
    severity: "space_out",
    explanation:
      "Le linalool oxydé et l'hydroxycitronellal sont des sensibilisants connus ; multiplier les produits parfumés qui en contiennent accroît le risque d'allergie de contact cumulative. Pas de danger aigu, mais limiter la charge parfumante quotidienne.",
    evidenceLevel: "B",
    source: "SCCS (sensibilisants parfumants oxydés).",
  },
  {
    ingredientA: "citral",
    ingredientB: "limonene",
    severity: "space_out",
    explanation:
      "Citral et limonène (surtout oxydés) comptent parmi les terpènes parfumants les plus sensibilisants. Une routine cumulant plusieurs produits parfumés augmente l'exposition ; préférer le sans-parfum pour les peaux réactives.",
    evidenceLevel: "B",
    source: "SCCS / Annexe III (allergènes parfumants).",
  },
  // ---------------- Conservateurs phénoxyéthanol + autres (charge)
  {
    ingredientA: "phenoxyethanol",
    ingredientB: "benzyl-alcohol",
    severity: "space_out",
    explanation:
      "Le phénoxyéthanol et l'alcool benzylique sont deux conservateurs différents mais souvent présents dans des produits distincts d'une même routine. Aucune interaction chimique dangereuse ; il s'agit seulement de ne pas multiplier inutilement les conservateurs sur peaux très sensibles.",
    evidenceLevel: "D",
    source: "Tolérance des conservateurs (pas d'interdiction de coexistence).",
  },

  // ---------------- Beurres épais + protéines sur cheveux fins (cosmétique capillaire)
  {
    ingredientA: "butyrospermum_parkii",
    ingredientB: "hydrolyzed_rice",
    severity: "space_out",
    explanation:
      "Le beurre de karité très occlusif appliqué avant une protéine de riz hydrolysée peut limiter sa fixation sur la fibre. Protéines puis beurre en scellement : l'ordre (soin léger d'abord, corps gras en finition) préserve le gainage sur cheveux texturés.",
    evidenceLevel: "D",
    source: "Méthode capillaire (ordre soin protéiné / scellement au beurre).",
  },
];

/** Recherche des règles touchant un ingrédient. */
export function incompatibilitiesFor(ingredientId: string): IncompatibilityFact[] {
  return INGREDIENT_INCOMPATIBILITIES.filter(
    (r) => r.ingredientA === ingredientId || r.ingredientB === ingredientId
  );
}
