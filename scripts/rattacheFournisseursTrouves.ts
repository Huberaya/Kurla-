/**
 * RATTACHEMENT DES FOURNISSEURS TROUVÉS — 16/09/2026
 *
 * Deuxième temps du chantier « 52 produits sans fournisseur ». Le premier
 * (recherche) a livré `docs/RECHERCHE_FOURNISSEURS_2026-09-16.md`. Celui-ci
 * écrit ce que la recherche a établi, et rien de plus.
 *
 * Trois garde-fous, parce qu'écrire dans la base engage :
 *
 *  1. **Simulation par défaut.** Le script ne touche à rien sans `APPLIQUER=1`.
 *     Le plan est imprimé et relisible avant toute écriture.
 *  2. **Vérification avant écriture.** Chaque produit visé doit exister ET
 *     avoir `supplier_id` NULL. Au moindre écart, le script s'arrête : cela
 *     voudrait dire que quelqu'un a rattacheé un fournisseur entre-temps, et
 *     l'écraser serait détruire un travail, pas le compléter.
 *  3. **Annulation préparée d'avance.** Le script produit un fichier SQL qui
 *     remet les 52 produits dans leur état exact d'avant.
 *
 * Ce que ce script NE fait PAS, et pourquoi :
 *  - il ne rattache rien quand aucune voie d'achat n'existe (The Ordinary,
 *    Isntree) : rattacher le propriétaire de la marque ferait croire qu'on
 *    peut commander ;
 *  - il ne choisit pas de façonnier pour les 16 produits de marque propre :
 *    c'est une comparaison de devis, donc une décision ;
 *  - il ne modifie ni le statut de publication, ni les prix, ni les visuels ;
 *  - il n'invente aucun contact : ce qui n'est pas vérifié reste vide.
 */
import { writeFileSync } from 'node:fs';
import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;

import { normalizeSupplierName, supplierIdFromName } from '../src/lib/db/supplierStore';

const URL_BASE = 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const CLE = process.env.SUPABASE_SECRET_KEY || '';
const APPLIQUER = process.env.APPLIQUER === '1';
const SOURCE = 'docs/RECHERCHE_FOURNISSEURS_2026-09-16.md';

async function rest(method: string, chemin: string, corps?: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    method,
    headers: {
      apikey: CLE,
      Authorization: `Bearer ${CLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${method} ${chemin} → ${r.status} ${texte.slice(0, 400)}`);
  return texte ? JSON.parse(texte) : [];
}

interface NouveauFournisseur {
  /** Identifiant explicite, quand le nom donnerait un identifiant laid. */
  id?: string;
  legalName: string;
  tradeName?: string;
  supplierType: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  notes: string;
}

// ── 1. Les entités identifiées ────────────────────────────────────────────
// Chaque ligne est sourcée. Ce qui n'a pas pu être vérifié reste vide plutôt
// que complété par vraisemblance.
export const NOUVEAUX: NouveauFournisseur[] = [
  {
    legalName: 'Laboratoire IN’OYA SAS',
    tradeName: 'IN’OYA',
    supplierType: 'laboratory',
    country: 'FR',
    website: 'https://www.inoya-laboratoire.com',
    contactEmail: 'contact@inoya-laboratoire.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Priorité 1 du dossier.',
      'RCS Aix-en-Provence 534 452 768. Siège : Pôle d’activités Y. Morandat, 1480 avenue d’Arménie, 13120 Gardanne. Bureau : 128 rue de la Boétie, 75008 Paris. Tél. +33 4 42 90 72 28.',
      'Laboratoire français fondé en 2011, brevet CNRS/Aix-Marseille sur l’hyperpigmentation des peaux noires et mates. Déjà en pharmacies, parapharmacies, Monoprix, Nocibé. Même positionnement que KURLA, taille humaine : la cible la plus accessible de la liste.',
      'État : aucune demande envoyée, aucun accord. À ne pas présenter comme acquis.',
    ].join('\n'),
  },
  {
    id: 'sup-weleda-fr',
    legalName: 'WELEDA S.A.',
    tradeName: 'Weleda France',
    supplierType: 'brand',
    country: 'FR',
    website: 'https://www.weleda.fr',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'SIREN 945 850 246. Siège : 9 rue Eugène Jung, CS 20152, 68331 Huningue Cedex. Tél. +33 3 89 69 68 00.',
      'Réserve : une source décrit l’activité de l’établissement comme de la fabrication, une autre comme de l’entreposage. L’activité de gros (NAF 46.45Z) reste à confirmer au premier échange — c’est elle qui conditionne l’ouverture de compte en direct.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'Laboratoire Gravier Production',
    tradeName: 'Cosmo Naturel',
    supplierType: 'laboratory',
    country: 'FR',
    website: 'https://www.laboratoiregravier.com',
    contactEmail: 'contact@labogravier.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'SIRET 891 977 266 00016. ZAE du Grand Lussan, 30580 Lussan. Tél. +33 4 66 57 44 52. Contact achats : Nathalie Fabre. Adhérent Cosmed et Cosmebio.',
      'Édite les marques Cosmo Naturel, CE’BIO, Harmonie Verte. Bio, fabrication France. Le canal gros existe (Organic Alliance distribue déjà la marque) : c’est un point d’entrée indirect si le compte direct tarde.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'Oomylab',
    supplierType: 'contract_manufacturer',
    country: 'FR',
    website: 'https://www.oomylab.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Façonnier pour la marque propre KURLA Skincare.',
      'SIREN 899 989 859. 19 rue Le Dean / 2 bis rue Haute, 29000 Quimper. Téléphone non vérifié à ce jour.',
      'Spécialiste des peaux noires, petites et moyennes séries, ISO 22716. Le mieux aligné avec le positionnement KURLA. NON CHOISI à ce jour : le choix entre façonniers relève d’une comparaison de devis.',
      'État : aucun contact, aucun devis.',
    ].join('\n'),
  },
  {
    legalName: 'Les Laboratoires Phytodia',
    tradeName: 'Phytodia',
    supplierType: 'contract_manufacturer',
    country: 'FR',
    website: 'https://www.phytodia.com',
    contactEmail: 'labo@phytodia.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Façonnier pour la marque propre KURLA Skincare.',
      'SIREN 809 300 304. 35 rue Benjamin Baillaud, 67400 Illkirch (parc d’innovation). Tél. +33 3 67 78 08 60 — coordonnées relevées sur leur page « Façonnage ».',
      'Lots dès 2 kg de vrac (≈ 40 pots de 50 ml), BPF, accompagnement réglementaire. Le mieux adapté à un lot pilote. NON CHOISI à ce jour.',
      'État : aucun contact, aucun devis.',
    ].join('\n'),
  },
  {
    legalName: 'Pierre Fabre Dermo-Cosmétique',
    tradeName: 'Pierre Fabre (Avène, Klorane, Ducray)',
    supplierType: 'laboratory',
    country: 'FR',
    website: 'https://www.pierre-fabre.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'Entité : Les Cauquillous, 81500 Lavaur (SIREN 319 137 576). Groupe : Pierre Fabre SA, Castres. Accueil général +33 5 62 48 85 00 — ce n’est PAS un service distribution, la demande d’agrément passe par l’espace professionnel de chaque marque (à identifier).',
      'Distribution sélective. Élément favorable : le Conseil de la Concurrence a déjà enjoint Pierre Fabre de renoncer à l’interdiction de vente en ligne, ce qui rend la revente en ligne défendable une fois l’agrément obtenu.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'NAOS France',
    tradeName: 'Bioderma',
    supplierType: 'laboratory',
    country: 'FR',
    website: 'https://www.bioderma.fr',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'SAS au capital de 10 091 400 €, RCS Lyon 817 485 725. Siège : 141 cours Gambetta, 69003 Lyon. Tél. +33 4 72 11 48 00. Groupe NAOS également à Aix-en-Provence (355 rue Pierre-Simon Laplace) — Bioderma est la marque concernée ici.',
      'Distribution sélective : agrément à obtenir.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'ISDIN',
    supplierType: 'brand',
    country: 'ES',
    website: 'https://www.isdin.com',
    contactEmail: 'customer.fr@isdin.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'Siège Barcelone (1975, groupe Esteve + Puig). Établissement français : 24 boulevard Gallieni, 92130 Issy-les-Moulineaux. Tél. +33 1 55 95 00 92 — service consommateur, PAS un service distribution.',
      'Aucune filiale de gros française identifiée. Réseau pharmacies et parapharmacies.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'Beiersdorf',
    tradeName: 'Eucerin',
    supplierType: 'brand',
    country: 'DE',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Propriétaire de la marque Eucerin.',
      'Réserve : site et coordonnées du bon interlocuteur (filiale française ou centrale) NON vérifiés à ce jour — laissés vides plutôt que complétés par vraisemblance.',
      'Voie : compte direct ou grossiste agréé, à instruire.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    id: 'sup-loreal-fr',
    legalName: 'L’Oréal',
    tradeName: 'La Roche-Posay, L’Oréal Paris',
    supplierType: 'brand',
    country: 'FR',
    website: 'https://fr.lorealpartnershop.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Propriétaire de La Roche-Posay et L’Oréal Paris.',
      'Fait structurant, vérifié dans leurs conditions générales : marques distribuées de manière sélective dans l’EEE par des distributeurs ou grossistes agréés, revente hors réseau interdite, et vente en ligne soumise à un agrément spécifique. Toute commande sans agrément est une faute commerciale, pas un raccourci.',
      'Réserve : les sites qui se présentent en ligne comme « distributeur agréé La Roche-Posay » sont des revendeurs tiers auto-déclarés. Aucun n’a été retenu comme fournisseur.',
      'État : aucune demande envoyée.',
    ].join('\n'),
  },
  {
    legalName: 'Qogita',
    supplierType: 'distributor',
    website: 'https://www.qogita.com',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire.',
      'Place de marché B2B : 500+ distributeurs vérifiés, faibles minimums de commande. Pays du siège non vérifié à ce jour.',
      'Voie retenue pour The INKEY List, qui n’ouvre pas de compte direct aux revendeurs.',
      'État : aucun compte, aucune commande.',
    ].join('\n'),
  },
  {
    legalName: 'Sparcos',
    supplierType: 'distributor',
    country: 'PL',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Voie de repli pour les marques coréennes.',
      'Réserve : site et coordonnées non vérifiés à ce jour.' +
      '\nDistributeur exclusif COSRX et Beauty of Joseon. Commande dès 300 €. Pas de rattachement produit à ce jour : Qudo Beauty a été retenu en priorité (sans minimum, CPNP déjà enregistré).',
      'État : aucun contact.',
    ].join('\n'),
  },
  {
    legalName: 'MiiN Trade',
    supplierType: 'distributor',
    country: 'ES',
    notes: [
      'Identifié le 16/09/2026 — recherche documentaire. Voie de repli pour COSRX.',
      'Réserve : site et coordonnées non vérifiés à ce jour.' +
      '\nDistributeur officiel COSRX en Europe. Pas de rattachement produit à ce jour — voir Sparcos et Qudo Beauty.',
      'État : aucun contact.',
    ].join('\n'),
  },
];

// ── 2. Enrichissement de deux fiches déjà présentes ───────────────────────
export const ENRICHISSEMENTS: Array<{ id: string; website?: string; notesSuffixe: string }> = [
  {
    id: 'sup-qudo-beauty-ro',
    website: 'https://www.qudobeauty.com',
    notesSuffixe: [
      '',
      '— Complété le 16/09/2026 —',
      'Qudo Beauty SRL, Roumanie (TVA RO50381912). 86+ marques coréennes, entrepôt européen.',
      'Deux raisons de l’avoir retenu : aucun minimum de commande, et produits déjà enregistrés CPNP — donc revendables en l’état en UE. C’est la seule voie de la liste qui satisfait la porte de publication sans démarche supplémentaire.',
      'Attention : la présence d’Isntree dans leur catalogue n’est PAS vérifiée.',
    ].join('\n'),
  },
  {
    id: 'sup-deciem-the-ordinary',
    notesSuffixe: [
      '',
      '— Complété le 16/09/2026 —',
      'Aucun rattachement produit : aucun canal de gros identifié. DECIEM ne fournit qu’un distributeur officiel par pays, et un grossiste historique rapporte par écrit qu’Estée Lauder a progressivement coupé l’approvisionnement des anciens fournisseurs.',
      'Conséquence : les 10 fiches The Ordinary publiées n’ont pas de voie d’achat légale connue. Ces éléments viennent de sources indirectes (forums, blog de fournisseur) — à confirmer par un écrit à DECIEM avant toute décision de dépublication.',
      'Fiche conservée dans le référentiel comme entité identifiée, non comme source utilisable.',
    ].join('\n'),
  },
];

/**
 * Deux fiches existaient déjà en base. On les réutilise plutôt que d'en créer
 * un doublon : deux fiches pour une même entité, c'est le défaut que la
 * normalisation des noms est censée empêcher.
 */
export const FICHES_EXISTANTES: Record<string, string> = {
  'Qudo Beauty': 'sup-qudo-beauty-ro',
  DECIEM: 'sup-deciem-the-ordinary',
};

// ── 3. Le rattachement, marque par marque ─────────────────────────────────
// `null` = aucune voie d'achat établie : le produit reste sans fournisseur et
// l'annotation dit pourquoi. C'est un résultat, pas un échec du chantier.
// La base écrit « L'Oréal Paris » et « IN'OYA » avec une apostrophe droite,
// pas typographique. Comparer les chaînes brutes ferait échouer la marque
// entière — donc on apparie sur une forme repliée.
export const cleMarque = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const RATTACHEMENT: Array<{ marque: string; cle: string | null; note: string }> = [
  {
    marque: 'La Roche-Posay',
    cle: 'L’Oréal',
    note: 'Fournisseur identifié le 16/09/2026 : L’Oréal, propriétaire de la marque et détentrice du droit de revente. Ce rattachement dit QUI doit autoriser, pas encore À QUI l’on commande : le canal d’achat reste un grossiste dermo agréé, à identifier. Distribution sélective + agrément internet spécifique (vérifié dans leurs CGV) : sans accord écrit, aucune commande. ' + SOURCE,
  },
  {
    marque: 'L’Oréal Paris',
    cle: 'L’Oréal',
    note: 'Fournisseur identifié le 16/09/2026 : L’Oréal, propriétaire de la marque. Ce rattachement dit QUI doit autoriser ; le canal d’achat (grossiste dermo agréé) reste à identifier. Distribution sélective + agrément internet spécifique. ' + SOURCE,
  },
  {
    marque: 'COSRX',
    cle: 'Qudo Beauty',
    note: 'Canal d’achat identifié le 16/09/2026 : Qudo Beauty (RO) — aucun minimum de commande, produits déjà enregistrés CPNP, donc revendables en l’état. Compte non ouvert, aucune commande. Repli : Sparcos (dès 300 €), MiiN Trade. ' + SOURCE,
  },
  {
    marque: 'Beauty of Joseon',
    cle: 'Qudo Beauty',
    note: 'Canal d’achat identifié le 16/09/2026 : Qudo Beauty (RO), aucun minimum, CPNP enregistré. Compte non ouvert. Repli : Sparcos, distributeur exclusif de la marque (dès 300 €). ' + SOURCE,
  },
  {
    marque: 'The INKEY List',
    cle: 'Qogita',
    note: 'Canal d’achat identifié le 16/09/2026 : Qogita, place de marché B2B. La marque n’ouvre pas de compte direct aux revendeurs — c’est la réponse au « grossiste à identifier » du 14/09. ' + SOURCE,
  },
  {
    marque: 'Weleda',
    cle: 'WELEDA S.A.',
    note: 'Fournisseur identifié le 16/09/2026 : WELEDA S.A., Huningue (SIREN 945 850 246). Une source décrit une activité de gros, une autre de la fabrication : à confirmer au premier échange, c’est ce qui conditionne l’ouverture de compte en direct. ' + SOURCE,
  },
  {
    marque: 'Cosmo Naturel',
    cle: 'Laboratoire Gravier Production',
    note: 'Fournisseur identifié le 16/09/2026 : Laboratoire Gravier Production, Lussan (SIRET 891 977 266 00016), éditeur de Cosmo Naturel. Contact achats identifié. Voie indirecte existante : la marque est déjà distribuée en gros par Organic Alliance. ' + SOURCE,
  },
  {
    marque: 'Bioderma',
    cle: 'NAOS France',
    note: 'Fournisseur identifié le 16/09/2026 : NAOS France, Lyon (RCS 817 485 725), propriétaire de Bioderma. Ce rattachement dit QUI doit autoriser ; le canal d’achat reste à identifier. Distribution sélective. ' + SOURCE,
  },
  {
    marque: 'Klorane',
    cle: 'Pierre Fabre Dermo-Cosmétique',
    note: 'Fournisseur identifié le 16/09/2026 : Pierre Fabre Dermo-Cosmétique, Lavaur, propriétaire de la marque — ce rattachement dit QUI doit autoriser. Élément favorable : le Conseil de la Concurrence a déjà enjoint Pierre Fabre de renoncer à l’interdiction de vente en ligne, la revente en ligne est donc défendable une fois l’agrément obtenu. Canal d’achat : à identifier. ' + SOURCE,
  },
  {
    marque: 'Ducray',
    cle: 'Pierre Fabre Dermo-Cosmétique',
    note: 'Fournisseur identifié le 16/09/2026 : Pierre Fabre Dermo-Cosmétique, Lavaur. Ce rattachement dit QUI doit autoriser ; canal d’achat à identifier. Distribution sélective. ' + SOURCE,
  },
  {
    marque: 'Avène',
    cle: 'Pierre Fabre Dermo-Cosmétique',
    note: 'Fournisseur identifié le 16/09/2026 : Pierre Fabre Dermo-Cosmétique, Lavaur. Ce rattachement dit QUI doit autoriser ; canal d’achat à identifier. Distribution sélective. ' + SOURCE,
  },
  {
    marque: 'Eucerin',
    cle: 'Beiersdorf',
    note: 'Fournisseur identifié le 16/09/2026 : Beiersdorf, propriétaire d’Eucerin. Ce rattachement dit QUI doit autoriser. Réserve : ni l’interlocuteur ni la voie (compte direct ou grossiste agréé) n’ont pu être vérifiés. ' + SOURCE,
  },
  {
    marque: 'Isdin',
    cle: 'ISDIN',
    note: 'Fournisseur identifié le 16/09/2026 : ISDIN (Barcelone ; établissement français à Issy-les-Moulineaux). Ce rattachement dit QUI doit autoriser. Aucune filiale de gros française identifiée : le canal d’achat reste ouvert. ' + SOURCE,
  },
  {
    marque: 'IN’OYA',
    cle: 'Laboratoire IN’OYA SAS',
    note: 'Fournisseur identifié le 16/09/2026 : Laboratoire IN’OYA SAS, Gardanne (RCS Aix-en-Provence 534 452 768). Priorité 1 — laboratoire français, brevet CNRS sur l’hyperpigmentation des peaux noires et mates, taille humaine, déjà en pharmacies et chez Monoprix. Tél. +33 4 42 90 72 28, contact@inoya-laboratoire.com. ' + SOURCE,
  },
  {
    marque: 'The Ordinary',
    cle: null,
    note: '— 16/09/2026 — AUCUN fournisseur rattaché : aucun canal de gros identifié. DECIEM ne fournit qu’un distributeur officiel par pays et l’approvisionnement des grossistes historiques aurait été interrompu par Estée Lauder. La piste « grossiste dermo » du 14/09 est donc à instruire avec prudence pour cette marque. À confirmer par écrit auprès de DECIEM avant toute décision. ' + SOURCE,
  },
  {
    marque: 'Isntree',
    cle: null,
    note: '— 16/09/2026 — AUCUN fournisseur rattaché : aucun grossiste européen identifié pour Isntree. Pistes à instruire : Qudo Beauty, Sparcos, MiiN — présence de la marque non vérifiée chez aucun d’eux. YesStyle n’est qu’un revendeur agréé, pas un fournisseur. ' + SOURCE,
  },
  {
    marque: 'KURLA Skincare',
    cle: null,
    note: '— 16/09/2026 — Marque propre : aucun façonnier rattaché, donc aucun choix fait. Deux repérés et vérifiés — Oomylab (Quimper, ISO 22716, peaux noires) et Phytodia (Illkirch, lots dès 2 kg, +33 3 67 78 08 60). Le choix relève d’une comparaison de devis. ' + SOURCE,
  },
];

async function main() {
  if (!CLE) throw new Error('SUPABASE_SECRET_KEY manquante.');

  const existants: any[] = await rest('GET', 'suppliers?select=id,legal_name,legal_name_normalized,website,notes');
  const parNomNormalise = new Map<string, any>();
  for (const s of existants) parNomNormalise.set(normalizeSupplierName(s.legal_name), s);
  const parId = new Map<string, any>(existants.map(s => [String(s.id), s]));

  const produits: any[] = await rest(
    'GET',
    'products?select=id,name,brand,supplier_id,supplier_authorization_note&order=brand'
  );
  const cibles = produits.filter(p => !p.supplier_id);
  if (cibles.length !== 52) {
    throw new Error(`Population inattendue : ${cibles.length} produits sans fournisseur (52 attendus). Le périmètre a changé — je m'arrête plutôt que d'écrire sur une base qui a bougé.`);
  }

  // ── Résolution des fournisseurs, sans jamais deviner ────────────────────
  const idParCle = new Map<string, string>();
  const aCreer: any[] = [];
  for (const f of NOUVEAUX) {
    const norm = normalizeSupplierName(f.legalName);
    const deja = parNomNormalise.get(norm);
    if (deja) {
      idParCle.set(f.legalName, String(deja.id));
      console.log(`  = déjà présent : ${f.legalName} → ${deja.id} (aucune création)`);
      continue;
    }
    // Les 16 fiches déjà en base portent toutes le préfixe `sup-` : on le
    // garde pour que le référentiel reste lisible d'un seul coup d'œil.
    const id = f.id || `sup-${supplierIdFromName(f.legalName)}`;
    if (parId.has(id)) throw new Error(`Conflit d'identifiant sur ${id} : une fiche existe déjà sous cet id avec un autre nom. À trancher à la main.`);
    idParCle.set(f.legalName, id);
    aCreer.push({
      id,
      legal_name: f.legalName,
      legal_name_normalized: norm,
      trade_name: f.tradeName ?? null,
      supplier_type: f.supplierType,
      country: f.country ?? null,
      website: f.website ?? null,
      contact_name: null,
      contact_email: f.contactEmail ?? null,
      moq_units: null,
      lead_time_days: null,
      certifications: [],
      // Rien de tout cela n'a été vérifié par une personne avec des pièces :
      // la valeur reste `not_provided`. C'est la règle du référentiel.
      verification_status: 'not_provided',
      notes: f.notes,
      updated_at: new Date().toISOString(),
    });
  }
  for (const [cle, id] of Object.entries(FICHES_EXISTANTES)) idParCle.set(cle, id);

  // ── Le plan, marque par marque ──────────────────────────────────────────
  console.log(`\n=== PLAN ${APPLIQUER ? '(ÉCRITURE)' : '(SIMULATION — rien n’est écrit)'} ===`);
  console.log(`\nFournisseurs à créer : ${aCreer.length}`);
  for (const f of aCreer) console.log(`  + ${f.id} | ${f.legal_name} | ${f.supplier_type} | ${f.country || 'pays ?'}`);
  console.log(`\nFiches à enrichir : ${ENRICHISSEMENTS.length}`);
  for (const e of ENRICHISSEMENTS) console.log(`  ~ ${e.id}`);

  // État d'origine, produit par produit : c'est lui qui permet d'annuler
  // exactement, y compris là où une note existait déjà.
  const avant = new Map<string, { supplierId: string | null; note: string | null }>();
  for (const p of cibles) avant.set(String(p.id), { supplierId: p.supplier_id ?? null, note: p.supplier_authorization_note ?? null });

  const groupes = new Map<string, { ids: string[]; supplierId: string | null; note: string }>();
  let rattaches = 0;
  let nonRattaches = 0;
  let notesCompletes = 0;
  console.log('\nProduits :');
  for (const r of RATTACHEMENT) {
    const liste = cibles.filter(p => cleMarque(p.brand) === cleMarque(r.marque));
    if (liste.length === 0) throw new Error(`Marque « ${r.marque} » introuvable parmi les produits sans fournisseur.`);
    const supplierId = r.cle ? idParCle.get(r.cle) : null;
    if (r.cle && !supplierId) throw new Error(`Fournisseur « ${r.cle} » non résolu.`);
    for (const p of liste) {
      const id = String(p.id);
      const precedent = avant.get(id)!;
      // 26 produits portent déjà une note du 14/09 — une campagne d'e-mails
      // préparée et non encore envoyée. On la complète, on ne l'écrase
      // jamais : effacer une trace d'avancement, c'est détruire un travail.
      const note = precedent.note ? `${precedent.note}\n\n— 16/09/2026 — ${r.note}` : r.note;
      if (precedent.note) notesCompletes += 1;
      const cleGroupe = `${supplierId || 'aucun'}|${note}`;
      const groupe = groupes.get(cleGroupe) || { ids: [], supplierId, note };
      groupe.ids.push(id);
      groupes.set(cleGroupe, groupe);
    }
    if (supplierId) rattaches += liste.length; else nonRattaches += liste.length;
    console.log(`  ${r.marque.padEnd(18)} ${String(liste.length).padStart(2)} produit(s) → ${supplierId || 'AUCUN (annoté seulement)'}`);
  }
  console.log(`\nTotal : ${rattaches} rattachés, ${nonRattaches} annotés sans rattachement.`);
  console.log(`Notes déjà présentes (14/09) : ${notesCompletes} produit(s) — complétées, jamais remplacées.`);
  const idsModifies = [...groupes.values()].flatMap(g => g.ids);

  // ── Annulation : écrite AVANT d'agir ────────────────────────────────────
  // Elle restaure la valeur EXACTE de chaque produit. Remettre les notes à
  // NULL effacerait la campagne du 14/09, qui ne m'appartient pas.
  const cheminAnnulation = 'docs/RATTACHEMENT_FOURNISSEURS_2026-09-16_annulation.sql';
  const ech = (v: string | null) => (v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
  const valeurs = idsModifies
    .map(id => {
      const a = avant.get(id)!;
      return `    ('${id}', ${ech(a.supplierId)}::text, ${ech(a.note)}::text)`;
    })
    .join(',\n');
  writeFileSync(cheminAnnulation, [
    '-- ANNULATION du rattachement du 16/09/2026',
    '-- Généré AVANT l’écriture par scripts/rattacheFournisseursTrouves.ts.',
    '--',
    '-- Particularité : 26 des 52 produits portaient déjà une note du 14/09',
    '-- (campagne d’e-mails de sourcing préparée, non envoyée). L’annulation',
    '-- restaure donc la valeur exacte de chaque produit au lieu de tout',
    '-- remettre à NULL, faute de quoi elle effacerait un travail accompli.',
    '--',
    '-- Ordre : les produits d’abord (clé étrangère), puis les fiches créées.',
    '',
    'BEGIN;',
    '',
    'UPDATE public.products AS p',
    '   SET supplier_id = v.supplier_id,',
    '       supplier_authorization_note = v.note,',
    '       last_catalog_updated_at = NOW()',
    '  FROM (VALUES',
    valeurs,
    '  ) AS v(id, supplier_id, note)',
    ' WHERE p.id = v.id;',
    '',
    aCreer.length
      ? `DELETE FROM public.suppliers WHERE id IN (${aCreer.map(f => `'${f.id}'`).join(', ')});\n`
      : '',
    'COMMIT;',
    '',
  ].join('\n'));
  console.log(`\nAnnulation préparée : ${cheminAnnulation} (${idsModifies.length} produits, ${aCreer.length} fiches)`);

  if (!APPLIQUER) {
    console.log('\nSimulation terminée. Rien n’a été écrit. Relancer avec APPLIQUER=1 pour exécuter.');
    return;
  }

  // ── Écriture ────────────────────────────────────────────────────────────
  console.log('\n=== ÉCRITURE ===');
  const verif: any[] = await rest('GET', 'products?select=id,supplier_id,supplier_authorization_note');
  const idsVises = new Set(idsModifies);
  // Deux garde-fous, pour deux dégâts différents.
  const dejaRattaches = verif.filter((p: any) => idsVises.has(String(p.id)) && p.supplier_id);
  if (dejaRattaches.length) {
    throw new Error(`Arrêt : ${dejaRattaches.length} produit(s) visé(s) ont déjà un fournisseur (ex. ${dejaRattaches[0].id}). Je n’écrase pas un rattachement fait entre-temps.`);
  }
  // Une note qui bouge entre la lecture et l'écriture : la cible est mouvante,
  // mieux vaut relire que fusionner dans du texte qui n'est plus celui qu'on a lu.
  const notesBougees = verif.filter((p: any) => {
    if (!idsVises.has(String(p.id))) return false;
    return (p.supplier_authorization_note ?? null) !== (avant.get(String(p.id))?.note ?? null);
  });
  if (notesBougees.length) {
    throw new Error(`Arrêt : ${notesBougees.length} note(s) ont changé depuis la lecture (ex. ${notesBougees[0].id}). Je m’arrête et je relis.`);
  }

  for (const f of aCreer) {
    await rest('POST', 'suppliers', f);
    console.log(`  + fournisseur ${f.id}`);
  }
  for (const e of ENRICHISSEMENTS) {
    const actuel = parId.get(e.id);
    if (!actuel) { console.log(`  ! ${e.id} introuvable, enrichissement ignoré`); continue; }
    await rest('PATCH', `suppliers?id=eq.${e.id}`, {
      ...(e.website && !actuel.website ? { website: e.website } : {}),
      notes: `${actuel.notes ? `${actuel.notes}\n` : ''}${e.notesSuffixe}`,
      updated_at: new Date().toISOString(),
    });
    console.log(`  ~ fiche ${e.id} enrichie`);
  }
  for (const [, g] of groupes) {
    const corps: Record<string, unknown> = {
      supplier_authorization_note: g.note,
      last_catalog_updated_at: new Date().toISOString(),
    };
    if (g.supplierId) corps.supplier_id = g.supplierId;
    const res = await rest('PATCH', `products?id=in.(${g.ids.join(',')})`, corps);
    console.log(`  → ${res.length} produit(s) mis à jour${g.supplierId ? ` (→ ${g.supplierId})` : ' (annotation seule)'}`);
  }
  const apres: any[] = await rest('GET', 'products?select=id,supplier_id');
  console.log(`\nContrôle : ${apres.filter(p => !p.supplier_id).length} produits sans fournisseur (52 avant le chantier).`);
}
// Un script ne s'exécute pas à l'import : le banc `rattachement_fournisseurs`
// importe ces tables pour en vérifier les invariants, et un import ne doit
// jamais déclencher un appel réseau.
const estLanceDirectement = () => (process.argv[1] || '').replace(/\\/g, '/').endsWith('rattacheFournisseursTrouves.ts');

if (estLanceDirectement()) {
  main().catch(e => { console.error('\nERREUR —', e.message); process.exit(1); });
}
