/**
 * BANC — les filtres du catalogue se calculent tous pareil
 * ========================================================
 *
 * Demande du 17/09/2026 : « dans le catalogue, je veux des filtres dans toutes
 * les sections. »
 *
 * Le piège n'est pas d'oublier un filtre : c'est qu'un panneau invente le sien.
 * Un filtre qui ignore les accents ici et les respecte là, qui traite 0 comme
 * une absence dans un écran et comme une donnée dans l'autre, n'est pas un
 * filtre — c'est une devinette. Le calcul partagé (`src/lib/columnFilters`,
 * banc `kurla_column_filters`) existe précisément pour ça.
 *
 * Ce banc lit quels panneaux sont montés dans la famille « Catalogue & Stock »,
 * regarde lesquels affichent des listes, et exige qu'ils passent tous par le
 * module partagé. Un panneau sans liste n'a rien à filtrer et n'est pas
 * inquiété.
 *
 * La liste des dispenses est **fermée et nominative** : en dispenser un est un
 * acte délibéré, visible en revue.
 */

import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { applyColumnFilters, distinctOptions, listFilter } from '../src/lib/columnFilters';

const RACINE = process.cwd();

/** Onglets de la famille « Catalogue & Stock ». */
const ONGLETS_CATALOGUE = ['pipeline', 'cockpit', 'identified', 'catalog', 'batches', 'guide_dropship'];

/**
 * Panneaux dispensés, avec la raison. Un guide n'affiche pas de liste : lui
 * mettre des filtres serait décoratif.
 */
const DISPENSES: Record<string, string> = {
  DropshipGuidePanel: "guide : aucune liste à filtrer (1 seule boucle de rendu)",
};

/** Panneaux montés dans les onglets de la famille Catalogue. */
function panneauxDuCatalogue(): string[] {
  const lignes = readFileSync(path.join(RACINE, 'src/pages/AdminDashboardPage.tsx'), 'utf8').split('\n');
  const montes = new Map<string, Set<string>>();
  let courant: string | null = null;
  for (const ligne of lignes) {
    const m = /activeTab\s*===\s*'([a-z0-9_]+)'/.exec(ligne);
    if (m && !ligne.includes('!activeTab')) { courant = m[1]; continue; }
    if (!courant) continue;
    for (const p of ligne.matchAll(/<([A-Z][A-Za-z0-9]*Panel)\b/g)) {
      if (!montes.has(courant)) montes.set(courant, new Set());
      montes.get(courant)!.add(p[1]);
    }
  }
  const noms = new Set<string>();
  for (const onglet of ONGLETS_CATALOGUE) for (const p of montes.get(onglet) ?? []) noms.add(p);
  return [...noms].sort();
}

function sourceDe(nom: string): string | null {
  const fichier = path.join(RACINE, 'src/components', `${nom}.tsx`);
  return existsSync(fichier) ? readFileSync(fichier, 'utf8') : null;
}

// ---------------------------------------------------------------------------
// 1. Tout panneau du catalogue qui affiche des listes passe par le module
//    partagé.
// ---------------------------------------------------------------------------
const manquants: string[] = [];
const dispensesInutiles: string[] = [];

for (const nom of panneauxDuCatalogue()) {
  const source = sourceDe(nom);
  if (!source) continue; // composant hors src/components : rien à vérifier ici.
  const boucles = (source.match(/\.map\(/g) ?? []).length;
  const utiliseLeModulePartage = source.includes("from '../lib/columnFilters'");

  if (boucles >= 2 && !utiliseLeModulePartage) manquants.push(`${nom} (${boucles} boucles)`);
  // Une dispense qui n'a plus lieu d'être doit être retirée, pas conservée.
  if (DISPENSES[nom] && boucles >= 2) dispensesInutiles.push(nom);
}

assert.deepEqual(
  manquants,
  [],
  "Panneau(x) du catalogue qui affichent des listes sans passer par le calcul partagé (src/lib/columnFilters)."
);

assert.deepEqual(
  dispensesInutiles,
  [],
  "Dispense(s) devenue(s) injustifiée(s) : le panneau affiche désormais des listes et doit être filtré."
);

// ---------------------------------------------------------------------------
// 2. Le banc porte bien sur quelque chose : s'il ne trouve aucun panneau,
//    c'est qu'il est cassé, pas que tout va bien.
// ---------------------------------------------------------------------------
const panneaux = panneauxDuCatalogue();
assert.ok(panneaux.length >= 5, `Seulement ${panneaux.length} panneau(x) détecté(s) : la lecture du dashboard a changé.`);

const avecFiltres = panneaux.filter(n => (sourceDe(n) ?? '').includes("from '../lib/columnFilters'"));
assert.ok(avecFiltres.length >= 5, `Seulement ${avecFiltres.length} panneau(x) filtré(s).`);

// ---------------------------------------------------------------------------
// 3. LISTES DÉROULANTES (17/09, demande « des filtres avec des listes
//    déroulantes sur tous les tableaux ») : le menu ne propose que des valeurs
//    qui existent, il les compte, il regroupe les vides, et il refuse de devenir
//    un menu de 300 entrées.
// ---------------------------------------------------------------------------
const lignes = [
  { marque: 'Qudo', categorie: 'cheveux', stock: 0 },
  { marque: 'Qudo', categorie: 'peau', stock: 3 },
  { marque: 'Baraka', categorie: 'cheveux', stock: null },
  { marque: '', categorie: null, stock: 12 },
  { marque: '  ', categorie: undefined, stock: 1 },
];

const marques = distinctOptions(lignes, r => r.marque);
assert.deepEqual(marques.options.map(o => o.value), ['Qudo', 'Baraka', '__empty__'],
  `les plus fréquentes d'abord, puis l'alphabet, les vides à la fin (mesuré : ${marques.options.map(o => o.value).join(', ')})`);
assert.equal(marques.options[0].label, 'Qudo (2)', 'le compte accompagne la valeur');
assert.equal(marques.options[2].label, '(vide) (2)', `'' et '   ' sont regroupés en une seule option (mesuré : ${marques.options[2].label})`);

// Un 0 n'est pas une absence : il doit rester une valeur du menu.
const stocks = distinctOptions(lignes, r => r.stock);
assert.ok(stocks.options.some(o => o.value === '0'), 'stock 0 proposé comme valeur, pas rangé dans « vide »');
assert.ok(stocks.options.some(o => o.value === '__empty__'), 'null et undefined groupés dans « vide »');

// Le filtre `list` retire exactement les lignes qui ne portent pas la valeur.
const filtre = listFilter({ key: 'marque', rows: lignes, get: r => r.marque });
assert.equal(filtre.kind, 'list', 'peu de valeurs distinctes → liste déroulante');
assert.deepEqual(
  applyColumnFilters(lignes, [filtre], { marque: 'Qudo' }).map(r => r.categorie),
  ['cheveux', 'peau'],
  'choisir une marque ne garde que ses lignes'
);
assert.equal(
  applyColumnFilters(lignes, [filtre], { marque: '__empty__' }).length, 2,
  "l'option « vide » rend les lignes sans marque, pas toutes les lignes"
);
assert.equal(
  applyColumnFilters(lignes, [filtre], { marque: '' }).length, lignes.length,
  'aucun choix = aucune ligne retirée'
);

// Trop de valeurs : on garde la saisie libre plutôt qu'un menu inutilisable.
const trop = listFilter({
  key: 'ref',
  rows: Array.from({ length: 80 }, (_, i) => ({ ref: `ref-${i}` })),
  get: r => r.ref,
});
assert.equal(trop.kind, 'text', `80 valeurs distinctes → repli en saisie libre (mesuré : ${trop.kind})`);
assert.equal(
  applyColumnFilters([{ ref: 'huile argan bio' }], [trop], { ref: 'argan' }).length, 1,
  'le repli filtre toujours, par contains'
);

// Une ligne qui porte PLUSIEURS valeurs (pièces manquantes, documents détenus) :
// le menu propose chaque valeur séparément, pas la concaténation.
const multi = [
  { manque: ['INCI absente', 'Marque absente'] },
  { manque: ['INCI absente'] },
  { manque: [] },
];
const manqueOptions = distinctOptions(multi, r => r.manque);
assert.deepEqual(manqueOptions.options.map(o => o.value), ['INCI absente', 'Marque absente', '__empty__'],
  `chaque pièce est une option distincte (mesuré : ${manqueOptions.options.map(o => o.value).join(', ')})`);
const manqueFiltre = listFilter({ key: 'manque', rows: multi, get: r => r.manque, emptyLabel: 'Dossier complet' });
assert.equal(applyColumnFilters(multi, [manqueFiltre], { manque: 'Marque absente' }).length, 1,
  'choisir une pièce ne garde que les lignes qui la portent');
assert.equal(applyColumnFilters(multi, [manqueFiltre], { manque: '__empty__' }).length, 1,
  '« Dossier complet » ne rend que la ligne sans aucun manque');

console.log('[PASS] Listes déroulantes : valeurs réelles comptées, vides groupés, lignes multi-valeurs, repli en saisie libre au-delà de 60 valeurs.');

// ---------------------------------------------------------------------------
// 4. Ce que la demande du 17/09 (« des listes déroulantes sur tous les
//    tableaux » + « simplifier les tableaux ») doit laisser dans le code.
//    Les dispenses sont nominatives : un filtre qui redevient une saisie libre
//    sans raison doit faire échouer le banc, pas passer inaperçu.
// ---------------------------------------------------------------------------
// Portée élargie le 17/09 (2e passe) : « des listes déroulantes sur TOUS les
// tableaux » — le banc scanne désormais CHAQUE panneau du dashboard qui
// importe le module partagé, pas seulement la famille Catalogue.
const FAMILLE_CATALOGUE = readdirSync(path.join(RACINE, 'src/components'))
  .filter(fichier => fichier.endsWith('.tsx'))
  .map(fichier => fichier.replace(/\.tsx$/, ''))
  .filter(nom => (sourceDe(nom) ?? '').includes("from '../lib/columnFilters'"));
/** Saisies libres admises, avec la raison. Tout ajout doit être justifié ici. */
const SAISIES_LIBRES_ADMISES: Record<string, string> = {
  // L'allégation est un texte d'extrait (« huile d'argan pressée à froid… ») :
  // autant d'extraits que de phrases, un menu déroulant n'aurait pas de fin.
  'CatalogClaimsAuditPanel:term': "extrait d'allégation, texte libre par nature",
  // Une date d'expiration se cherche au mois près (« 2026-10 ») : la saisie
  // partielle est plus rapide qu'un menu de dates exactes.
  'DerogationsPanel:expires': 'recherche par mois, saisie partielle voulue',
};

const saisiesNonJustifiees: string[] = [];
let listesPosees = 0;
for (const nom of FAMILLE_CATALOGUE) {
  const code = sourceDe(nom) ?? '';
  listesPosees += (code.match(/listFilter\(/g) || []).length;
  for (const ligne of code.split('\n')) {
    const cle = /key: '([a-zA-Z]+)', kind: 'text'/.exec(ligne);
    if (cle && !SAISIES_LIBRES_ADMISES[`${nom}:${cle[1]}`]) saisiesNonJustifiees.push(`${nom}:${cle[1]}`);
  }
}
// Le banc porte sur quelque chose : si le scan ne trouve plus de panneaux,
// c'est qu'il est cassé, pas que tout va bien.
assert.ok(FAMILLE_CATALOGUE.length >= 8, `Scan des panneaux cassé : ${FAMILLE_CATALOGUE.length} trouvé(s).`);
assert.deepEqual(
  saisiesNonJustifiees, [],
  `Filtre(s) redevenu(s) saisie libre sans dispense nominative : ${saisiesNonJustifiees.join(', ')}`
);
assert.ok(listesPosees >= 33, `Seulement ${listesPosees} liste(s) déroulante(s) posée(s) dans le dashboard (attendu ≥ 33).`);

// Simplification : la densité est un réglage visible, pas un comportement caché.
for (const nom of ['CatalogAdminPanel', 'OperationsCockpitPanel']) {
  const code = sourceDe(nom) ?? '';
  assert.ok(code.includes('TableDensityToggle'), `${nom} n'expose plus la bascule de densité.`);
  assert.ok(code.includes("useState<'compact' | 'full'>('compact')"), `${nom} ne démarre plus en mode condensé.`);
  // Une bascule qui ne pilote rien est pire qu'absente : elle promet un
  // changement d'affichage qui ne vient pas. Ce contrôle a attrapé un vrai
  // défaut — après un merge, l'état était déclaré et la bascule posée, mais
  // plus aucune ligne ne lisait `density`.
  const usages = (code.match(/density === '(full|compact)'/g) || []).length;
  assert.ok(usages >= 2, `${nom} : la bascule de densité ne pilote que ${usages} endroit(s) — elle ne sert à rien.`);
}

console.log(`[PASS] Listes déroulantes : ${listesPosees} filtres à liste dans tout le dashboard (${FAMILLE_CATALOGUE.length} panneaux scannés)` +
  ` · ${Object.keys(SAISIES_LIBRES_ADMISES).length} saisie(s) libre(s) admise(s) et nominative(s)` +
  ` · densité condensée par défaut sur les 2 tableaux principaux.`);

console.log(`[PASS] Filtres du catalogue : ${avecFiltres.length} panneaux sur ${panneaux.length} utilisent le calcul partagé` +
  ` · ${Object.keys(DISPENSES).length} dispense(s) nominative(s).`);
