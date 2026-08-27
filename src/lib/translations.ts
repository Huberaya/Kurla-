/**
 * CHANTIER 7.5 — dictionnaire de traductions.
 *
 * `en` est typé `typeof fr` : le compilateur refuse toute clé présente dans une
 * locale et absente de l'autre. C'est le filet qui évite qu'une langue dégénère
 * en trous au fil des ajouts.
 *
 * Périmètre initial : le chrome (navigation, pied de page) et les libellés
 * communs. Le corps des 46 pages reste à traduire progressivement ; le framework
 * (provider + `t`) est déjà en place pour l'accueillir.
 */
import type { Locale } from './i18n';

const fr = {
  nav: {
    diagnostic: 'Diagnostic',
    assistant: 'Assistant IA',
    shop: 'Boutique',
    tools: 'Outils',
    pro: 'KURLA Pro',
    community: 'Communauté',
    kids: 'KURLA Kids',
    protectiveStyles: 'Protective Styles',
    melaninSkin: 'Peaux Mélaninées',
    men: 'Hommes Grooming',
    family: 'Famille',
    login: 'Connexion',
    search: 'Rechercher',
    spaces: 'Espaces Spécialisés',
    diagnosticCta: 'Diagnostic (2 min)',
    language: 'Langue',
  },
  footer: {
    tagline:
      'Plateforme européenne dédiée aux cheveux texturés, aux peaux riches en mélanine et à la beauté afro & multiculturelle.',
    quote: '“La beauté texturée, enfin comprise.”',
    platform: 'Plateforme',
    diagHair: 'Diagnostic Cheveux',
    diagSkin: 'Diagnostic Peau',
    routines: 'Routines Certifiées',
    shopBundles: 'Boutique & Bundles',
    marketplace: 'Marketplace',
    findPro: 'Trouver un pro',
    becomePro: 'Devenir pro KURLA',
    charter: 'Charte Qualité',
    journal: 'Journal & Guides',
    spaces: 'Espaces & Légal',
    client: 'Espace Client',
    familySpace: 'Espace Famille',
    proSpace: 'Espace Pro',
    cgv: 'CGV & Mentions',
    privacy: 'Confidentialité',
    nonMedical: 'Avis important non médical :',
    nonMedicalBody:
      'Les recommandations fournies par la plateforme KURLA Beauty sont des conseils de soin beauté non médicaux. Elles ne remplacent en aucun cas l’avis, le diagnostic ou le traitement dispensé par un dermatologue ou un professionnel de santé diplômé. En cas de douleur, brûlure, plaie ou réaction allergique, veuillez immédiatement consulter un médecin.',
    rights: 'Tous droits réservés.',  },
  pages: {
    manifesto: {
      eyebrow: 'Le Manifeste KURLA Beauty',
      title: 'La beauté texturée, enfin comprise.',
      subtitle: 'Pour une beauté afro & multiculturelle valorisée, sans compromis ni stéréotypes.',
      p1Title: '01. Fin de l’improvisation',
      p1Body:
        'Pendant des décennies, les cheveux crépus, bouclés, locksés et les peaux riches en mélanine ont été cantonnés à des rayons « exotiques » au fond des supermarchés. KURLA redéfinit les standards en associant la science de la porosité à la chaleur du soin transmis.',
      p2Title: '02. Transparence et Charte Qualité Pro',
      p2Body:
        'Nos partenaires coiffeurs, braiders et locticians signent une charte stricte : pas de tiraillement excessif de la racine, aucun jugement sur la texture au naturel et hygiène rigoureuse du matériel.',
      p3Title: '03. Éthique et transparence non médicale',
      p3Body:
        'KURLA propose des recommandations beauté cosmétiques. Nous ne dispensons pas de diagnostics médicaux. Si une problématique cutanée ou un problème d’alopécie nécessite une prise en charge médicale, nous orientons la communauté vers des médecins ou dermatologues qualifiés.',
    },
    melaninSkin: {
      eyebrow: 'Peaux Riches en Mélanine',
      title: 'Éclat Naturel, Anti-Taches & Protection Solaire Invisible',
      intro:
        'Des soins formulés spécifiquement pour la biologie des peaux métissées et foncées : respect de la barrière cutanée, prévention de l’hyperpigmentation et solaires zéro trace.',
      ctaDiagnostic: 'Faire le Diagnostic Peau (2 min)',
      ctaShop: 'Voir les produits Skincare Mélanine',
      pillar: 'Pilier',
      p1Title: 'SPF 50 Incolore Obligatoire',
      p1Body:
        'Les rayons UV stimulent la mélanogenèse et assombrissent les marques d’acné. Appliquer un fluide invisible tous les matins.',
      p2Title: 'Douceur Anti-Inflammatoire',
      p2Body:
        'Toute agression physique (gommage à gros grains, perçage de bouton) crée une tache. Privilégier la Niacinamide 5 % et l’Acide Hyaluronique.',
      p3Title: 'Hydratation Profonde',
      p3Body:
        'La peau foncée déshydratée perd sa réfraction naturelle et devient grisée ou terne. Restaurer les céramides pour révéler l’éclat.',
      disclaimerTitle: 'Disclaimer cosmétique prudent :',
      disclaimerBody:
        'KURLA Beauty ne promet pas la disparition miraculeuse des taches ou des cicatrices profondes. Nos soins accompagnent l’apparence, l’uniformité du teint et le confort cutané. En cas de mélasma sévère ou d’hyperpigmentation étendue, consultez un dermatologue.',
    },
    protectiveStyles: {
      eyebrow: 'Protective Styles & Braids Care',
      title: 'Knotless, Braids, Locks & Wigs : protéger sans abîmer',
      intro:
        'Tout le savoir-faire pour réussir sa pose, garder un cuir chevelu frais et sain, et réussir la dépose sans casse de la ligne de pousse.',
      ctaDiagnostic: 'Diagnostic Protective Style (2 min)',
      ctaFindPro: 'Trouver une braider / loctician certifiée',
      alertTitle: 'Guide d’alerte : « Mes tresses sont-elles trop serrées ? »',
      alertIntro: 'Signes de traction excessive nécessitant une action immédiate pour prévenir l’alopécie.',
      alarmTitle: '🚨 Signes d’alarme :',
      alarm1: 'Douleur vive persistante plus de 12 heures après la pose.',
      alarm2: 'Petits boutons blancs ou rouges le long des tempes ou de la nuque.',
      alarm3: 'Impossibilité de poser la tête à plat pour dormir sans antalgique.',
      actionTitle: '✅ Que faire immédiatement :',
      action1: 'Vaporiser la lotion apaisante menthe & aloe vera sur les racines.',
      action2: 'Défaire impérativement les tresses de bordure si des boutons apparaissent.',
      action3: 'Ne jamais attacher les braids en chignon lourd pendant les 3 premiers jours.',
      phase: 'Phase',
      phase1Title: 'Avant la pose',
      phase1Body:
        'Faire un soin clarifiant léger puis un masque protéiné fortifiant. Sécher les cheveux aux doigts et au sérum thermo-protecteur.',
      phase2Title: 'Pendant la pose',
      phase2Body:
        'Appliquer la lotion à embout applicateur 2 fois par semaine. Dormir impérativement avec le bonnet satin XL pour braids.',
      phase3Title: 'Après la dépose',
      phase3Body:
        'Démêler au doigt avec une huile de baobab AVANT de mouiller, pour retirer les poussières et les cheveux morts tombés naturellement.',
    },
  },
} as const;

export type TranslationKey = string;

/**
 * `fr` est déclaré `as const` pour servir de référence de structure, mais les
 * feuilles sont élargies en `string` : sans cela, `en` devrait reprendre les
 * libellés français mot pour mot. La parité des clés, elle, reste vérifiée —
 * une clé manquante ou surnuméraire dans `en` est une erreur de compilation.
 */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
type Dictionary = DeepString<typeof fr>;

const en: Dictionary = {
  nav: {
    diagnostic: 'Diagnostic',
    assistant: 'AI Assistant',
    shop: 'Shop',
    tools: 'Tools',
    pro: 'KURLA Pro',
    community: 'Community',
    kids: 'KURLA Kids',
    protectiveStyles: 'Protective Styles',
    melaninSkin: 'Melanin Skin',
    men: 'Men Grooming',
    family: 'Family',
    login: 'Sign in',
    search: 'Search',
    spaces: 'Specialised Spaces',
    diagnosticCta: 'Diagnostic (2 min)',
    language: 'Language',
  },
  footer: {
    tagline:
      'European platform for textured hair, melanin-rich skin and afro & multicultural beauty.',
    quote: '“Textured beauty, finally understood.”',
    platform: 'Platform',
    diagHair: 'Hair Diagnostic',
    diagSkin: 'Skin Diagnostic',
    routines: 'Certified Routines',
    shopBundles: 'Shop & Bundles',
    marketplace: 'Marketplace',
    findPro: 'Find a professional',
    becomePro: 'Become a KURLA pro',
    charter: 'Quality Charter',
    journal: 'Journal & Guides',
    spaces: 'Spaces & Legal',
    client: 'Client Area',
    familySpace: 'Family Area',
    proSpace: 'Pro Area',
    cgv: 'Terms & Legal',
    privacy: 'Privacy',
    nonMedical: 'Important non-medical notice:',
    nonMedicalBody:
      'The recommendations provided by KURLA Beauty are non-medical beauty care advice. They never replace the opinion, diagnosis or treatment of a qualified dermatologist or healthcare professional. In case of pain, burning, open wound or allergic reaction, consult a doctor immediately.',
    rights: 'All rights reserved.',  },
  pages: {
    manifesto: {
      eyebrow: 'The KURLA Beauty Manifesto',
      title: 'Textured beauty, finally understood.',
      subtitle: 'For an afro & multicultural beauty that is valued, without compromise or stereotypes.',
      p1Title: '01. No more guesswork',
      p1Body:
        'For decades, coily, curly and locked hair, and melanin-rich skin, were pushed to “ethnic” aisles at the back of supermarkets. KURLA redefines the standards by pairing the science of porosity with the warmth of care passed down.',
      p2Title: '02. Transparency and the Pro Quality Charter',
      p2Body:
        'Our partner hairstylists, braiders and locticians sign a strict charter: no excessive pulling at the root, no judgement of natural texture, and rigorous hygiene of the tools.',
      p3Title: '03. Ethics and non-medical transparency',
      p3Body:
        'KURLA provides cosmetic beauty recommendations. We do not provide medical diagnoses. Where a skin condition or hair loss needs medical care, we point the community to qualified doctors or dermatologists.',
    },
    melaninSkin: {
      eyebrow: 'Melanin-Rich Skin',
      title: 'Natural Glow, Dark-Spot Care & Invisible Sun Protection',
      intro:
        'Care formulated for the biology of deeper skin tones: respecting the skin barrier, preventing hyperpigmentation, and sunscreens that leave no white cast.',
      ctaDiagnostic: 'Take the Skin Diagnostic (2 min)',
      ctaShop: 'Browse melanin skincare',
      pillar: 'Pillar',
      p1Title: 'Colourless SPF 50, Every Day',
      p1Body:
        'UV rays stimulate melanogenesis and darken acne marks. Apply an invisible fluid every morning.',
      p2Title: 'Gentle, Anti-Inflammatory',
      p2Body:
        'Any physical aggression (coarse scrubs, picking a spot) leaves a mark. Favour 5 % niacinamide and hyaluronic acid.',
      p3Title: 'Deep Hydration',
      p3Body:
        'Dehydrated deeper skin loses its natural light refraction and looks ashy or dull. Restore ceramides to bring back the glow.',
      disclaimerTitle: 'A careful cosmetic disclaimer:',
      disclaimerBody:
        'KURLA Beauty does not promise the miraculous disappearance of dark spots or deep scars. Our care supports appearance, tone evenness and skin comfort. For severe melasma or extensive hyperpigmentation, consult a dermatologist.',
    },
    protectiveStyles: {
      eyebrow: 'Protective Styles & Braids Care',
      title: 'Knotless, Braids, Locks & Wigs: Protect Without Damage',
      intro:
        'Everything you need to get the installation right, keep your scalp fresh and healthy, and take the style down without breaking your hairline.',
      ctaDiagnostic: 'Protective Style Diagnostic (2 min)',
      ctaFindPro: 'Find a certified braider / loctician',
      alertTitle: 'Alert guide: “Are my braids too tight?”',
      alertIntro: 'Signs of excessive tension that call for immediate action to prevent traction alopecia.',
      alarmTitle: '🚨 Warning signs:',
      alarm1: 'Sharp pain still present more than 12 hours after installation.',
      alarm2: 'Small white or red bumps along the temples or the nape.',
      alarm3: 'Unable to rest your head flat to sleep without painkillers.',
      actionTitle: '✅ What to do right away:',
      action1: 'Spray the peppermint & aloe vera soothing lotion on your roots.',
      action2: 'Take down the edge braids immediately if bumps appear.',
      action3: 'Never tie braids into a heavy bun during the first 3 days.',
      phase: 'Phase',
      phase1Title: 'Before installation',
      phase1Body:
        'Do a light clarifying treatment, then a strengthening protein mask. Finger-dry the hair with a heat-protectant serum.',
      phase2Title: 'During the wear',
      phase2Body:
        'Apply the applicator-tip lotion twice a week. Always sleep with the XL satin bonnet for braids.',
      phase3Title: 'After take-down',
      phase3Body:
        'Finger-detangle with baobab oil BEFORE wetting, to remove dust and the hair that shed naturally.',
    },
  },
};

export const translations: Record<Locale, Dictionary> = { fr, en };

/**
 * Résout une clé en pointillés (`footer.findPro`) pour une locale, avec repli
 * sur le français puis sur la clé elle-même : une absence ne doit jamais casser
 * le rendu, seulement rester lisible.
 */
export function translate(locale: Locale, key: string): string {
  const read = (dict: unknown): unknown =>
    key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), dict);
  const value = read(translations[locale]) ?? read(translations.fr);
  return typeof value === 'string' ? value : key;
}
