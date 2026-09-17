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
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

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

console.log(`[PASS] Filtres du catalogue : ${avecFiltres.length} panneaux sur ${panneaux.length} utilisent le calcul partagé` +
  ` · ${Object.keys(DISPENSES).length} dispense(s) nominative(s).`);
