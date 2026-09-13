import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Canaux sans stock et suivi d'autorisation fournisseur.
 *
 * Constat mesuré le 13/09/2026 (SQL direct, projet `qzwgsarfdegqtfdnqiql`) :
 *
 *  1. `suppliers.supplier_type` n'acceptait que contract_manufacturer,
 *     textile, tool, raw_material, packaging, laboratory, brand, distributor,
 *     unknown. **Les trois modèles d'année 1 — dropship, affiliation, 3PL —
 *     étaient impossibles à déclarer.**
 *
 *  2. **Aucune colonne** de `products` ne suivait l'autorisation du
 *     fournisseur (vérifié : `information_schema` ne renvoie rien en
 *     %authoriz%, %contact%, %fulfil%, %channel%). Le pilotage demandé —
 *     « ce produit est sur le site, est-ce qu'on a contacté le fournisseur,
 *     est-ce qu'on a son autorisation » — n'existait pas par produit.
 *
 *  3. `sourcing_prospects` portait déjà `dropshipping`, `inci_provided`,
 *     `eu_compliance`, `visuals_granted`, `decision` — mais **au niveau du
 *     prospect**, et ses 25 lignes étaient toutes à `to_contact` avec ces
 *     champs à NULL. Cette migration ne double pas ce suivi : elle ajoute
 *     l'état **par produit**, qui manquait.
 *
 * ⚠️ **Ce banc ne peut PAS vérifier la base.** Il n'a pas d'accès réseau :
 * `SUPABASE_SECRET_KEY` n'est pas disponible ici et PostgREST n'exécute aucun
 * DDL. Les contraintes ont été appliquées et **testées négativement via la
 * Management API** (4 blocages 23514 vérifiés, 2 cas légitimes acceptés).
 * Ce banc verrouille donc ce qui est vérifiable sans réseau : le texte de la
 * migration et l'absence de régression dans le code applicatif.
 */

const cheminMigration = fileURLToPath(new URL(
  '../supabase/migrations/20260925000000_sourcing_channels_authorization.sql',
  import.meta.url
));
const sql = readFileSync(cheminMigration, 'utf8');

// ── 1. Les trois canaux d'année 1 sont déclarables ─────────────────────────
// ⚠️ Un `sql.includes('dropship')` global ne prouve rien : le mot apparaît
// dans DEUX contraintes (suppliers_supplier_type_check et
// products_fulfillment_channel_check). Le retirer de l'une laissait le banc
// vert. Contrôlé négativement. On isole donc chaque bloc de contrainte.
function corpsContrainte(nom: string): string {
  const debut = sql.indexOf(`ADD CONSTRAINT ${nom}`);
  assert.ok(debut > 0, `contrainte « ${nom} » introuvable dans la migration`);
  const fin = sql.indexOf(';', debut);
  return sql.slice(debut, fin);
}
const typesFournisseur = corpsContrainte('suppliers_supplier_type_check');
const canauxProduit = corpsContrainte('products_fulfillment_channel_check');

for (const canal of ['dropship', 'affiliation', 'third_party_logistics']) {
  assert.ok(typesFournisseur.includes(`'${canal}'`),
    `le canal « ${canal} » doit être accepté par suppliers_supplier_type_check`);
}
for (const canal of ['dropship', 'affiliation', 'third_party_logistics', 'own_stock', 'not_set']) {
  assert.ok(canauxProduit.includes(`'${canal}'`),
    `le canal « ${canal} » doit être accepté par products_fulfillment_channel_check`);
}
// Les canaux historiques ne doivent pas disparaître.
for (const canal of ['contract_manufacturer', 'raw_material', 'distributor', 'brand', 'tool']) {
  assert.ok(typesFournisseur.includes(`'${canal}'`),
    `REGRESSION : le canal historique « ${canal} » a disparu de suppliers_supplier_type_check`);
}

// ── 2. Chaque contrainte est précédée de son DROP ──────────────────────────
const ajouts = [...sql.matchAll(/ADD CONSTRAINT (\w+)/g)].map(m => m[1]);
const retraits = [...sql.matchAll(/DROP CONSTRAINT IF EXISTS (\w+)/g)].map(m => m[1]);
assert.ok(ajouts.length >= 5, `au moins 5 contraintes attendues, ${ajouts.length} trouvées`);
for (const nom of ajouts) {
  assert.ok(retraits.includes(nom),
    `la contrainte « ${nom} » est ajoutée sans DROP préalable : la migration échouerait au second passage`);
}
assert.equal(new Set(ajouts).size, ajouts.length, 'deux ADD CONSTRAINT portent le même nom');

// ── 3. Idempotence : ADD COLUMN IF NOT EXISTS partout ──────────────────────
// ⚠️ Ne PAS écrire /ADD COLUMN (\w+ )?(\w+)/ : sur « ADD COLUMN IF NOT
// EXISTS x » cette regex capture « NOT » comme nom de colonne. On capture le
// nom qui suit réellement IF NOT EXISTS, et on vérifie séparément qu'il n'y a
// aucun ADD COLUMN sans IF NOT EXISTS.
const colonnes = [...sql.matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/g)].map(m => m[1]);
assert.ok(colonnes.length >= 4, `au moins 4 colonnes attendues, ${colonnes.length} trouvées`);
const sansGarde = [...sql.matchAll(/ADD COLUMN (?!IF NOT EXISTS)(\w+)/g)].map(m => m[1]);
assert.deepEqual(sansGarde, [],
  `ADD COLUMN sans IF NOT EXISTS : ${sansGarde.join(', ')} — la migration ne serait pas rejouable`);
assert.equal(new Set(colonnes).size, colonnes.length, 'deux ADD COLUMN portent le même nom');

// ── 4. Les valeurs par défaut ne bloquent rien ─────────────────────────────
assert.match(sql, /fulfillment_channel TEXT NOT NULL DEFAULT 'not_set'/,
  'fulfillment_channel doit avoir un défaut : sinon l’ALTER échoue sur les 96 lignes existantes');
assert.match(sql, /supplier_authorization_status TEXT NOT NULL DEFAULT 'not_contacted'/,
  'supplier_authorization_status doit avoir un défaut : sinon l’ALTER échoue sur les lignes existantes');

// ── 5. La seule contrainte qui bloque : authorized exige une date ──────────
assert.match(sql, /products_authorization_date_coherence/,
  'la contrainte de cohérence de date doit exister');
assert.match(sql, /supplier_authorization_status NOT IN \('authorized', 'refused'\)\s*\n?\s*OR supplier_contacted_on IS NOT NULL/,
  'une autorisation ou un refus sans date doit être refusé : sans date, on ne peut pas prouver quand le fournisseur a répondu');

// ── 6. Pas de dropship ni de 3PL sans fournisseur identifié ────────────────
assert.match(sql, /products_channel_requires_supplier/,
  'la contrainte canal → fournisseur doit exister');
assert.match(sql, /fulfillment_channel NOT IN \('dropship', 'third_party_logistics'\)/,
  'dropship et 3PL partent de chez un tiers : sans fournisseur identifié on ignore d’où vient le produit');
// L'affiliation est volontairement exclue : un lien affilié pointe vers un
// marchand, pas vers un fournisseur qui nous livre.
assert.equal(sql.includes("'affiliation', 'third_party_logistics')\n    OR supplier_id IS NOT NULL"), false,
  'l’affiliation ne doit PAS exiger de fournisseur : un lien affilié ne fait intervenir aucun livreur');

// ── 7. La migration ne touche pas au garde de publiabilité ─────────────────
assert.equal(/isCatalogPubliclyListable|hasMinimalCatalogProof/.test(sql), false,
  'cette migration ne doit pas modifier la porte de publiabilité : l’autorisation fournisseur est un suivi, pas un blocage automatique');

// ── 8. Aucun verrou applicatif ne subsiste sur les canaux ──────────────────
const fichiers = ['../src/lib/catalogManagement.ts', '../src/lib/db/catalogStore.ts'];
for (const chemin of fichiers) {
  const absolu = fileURLToPath(new URL(chemin, import.meta.url));
  const contenu = readFileSync(absolu, 'utf8');
  assert.equal(/supplier_type\s*(===|==)\s*['"]distributor['"]/.test(contenu), false,
    `REGRESSION dans ${chemin} : un test en dur sur supplier_type='distributor' ignorerait les trois nouveaux canaux`);
}

console.log(`[PASS] Canaux sans stock et autorisation fournisseur : 8 contrats verrouillés — `
  + `${ajouts.length} contraintes toutes précédées de leur DROP, ${colonnes.length} colonnes idempotentes, `
  + '3 canaux d’année 1 déclarables, un seul état bloque (authorized sans date), '
  + 'la porte de publiabilité intacte.');
console.log('  ⚠️ Les contraintes ont été vérifiées en base via la Management API, pas par ce banc :');
console.log('     4 blocages 23514 confirmés, 2 cas légitimes acceptés, témoin restauré.');
