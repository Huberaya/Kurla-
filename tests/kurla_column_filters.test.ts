/**
 * FILTRES PAR COLONNE — contrat du calcul partagé.
 *
 * Ces filtres sont posés sous les colonnes d'une vingtaine de panneaux du
 * dashboard. S'ils ne calculent pas tous pareil, l'utilisateur ne peut pas
 * prévoir ce qu'un filtre fait — et un filtre imprévisible est un filtre qu'on
 * n'utilise pas. Ce banc fige les comportements qui pourraient diverger :
 *
 *   - accents et casse ignorés (« Sérum » trouvé en tapant « serum »),
 *   - plusieurs mots = tous les mots doivent coller,
 *   - un filtre vide ne retire rien (aucun filtre = liste complète),
 *   - 0 est une donnée, pas une absence (stock nul ≠ stock inconnu),
 *   - les filtres se combinent (ET), jamais ne s'additionnent (OU),
 *   - l'ordre d'origine est conservé : un filtre ne trie pas,
 *   - les valeurs absentes sont trouvables par le filtre « Vide ».
 *
 * Aucune route, aucun fetch : ce module est du calcul pur.
 */
import { strict as assert } from 'node:assert';
import {
  activeFilterLabels,
  applyColumnFilters,
  emptyFilterState,
  hasActiveFilter,
  hasValue,
  normalizeFilterText,
  type ColumnFilter,
} from '../src/lib/columnFilters';

const rows = [
  { id: '1', name: 'Sérum Éclat', brand: 'KURLA', status: 'published', price: 24.9, stock: 0, supplierId: 'sup-1' },
  { id: '2', name: 'Huile d’Argan bio', brand: 'Baraka', status: 'draft', price: 18, stock: 12, supplierId: '' },
  { id: '3', name: 'Crème nourrissante', brand: '', status: 'draft', price: 0, stock: 5, supplierId: 'sup-2' },
];

const filters: ColumnFilter[] = [
  { key: 'name', kind: 'text', get: row => row.name },
  { key: 'brand', kind: 'text', get: row => row.brand },
  { key: 'status', kind: 'enum', get: row => row.status, options: [{ value: 'published', label: 'Publié' }, { value: 'draft', label: 'Brouillon' }] },
  { key: 'price', kind: 'numeric', get: row => row.price, unit: ' €' },
  { key: 'stock', kind: 'present', get: row => row.stock, presentLabels: { filled: 'En stock', empty: 'Stock nul ou inconnu' } },
  { key: 'supplier', kind: 'present', get: row => row.supplierId, presentLabels: { filled: 'Avec fournisseur', empty: 'Sans fournisseur' } },
];

/* 1. Normalisation : accents, casse, espaces multiples. */
{
  assert.equal(normalizeFilterText('Sérum Éclat'), 'serum eclat');
  assert.equal(normalizeFilterText('  Huile   d’Argan  '), 'huile d’argan');
  assert.equal(normalizeFilterText(null), '');
  assert.equal(normalizeFilterText(42), '42');
  console.log('✓ accents, casse et espaces normalisés');
}

/* 2. « Rempli » : 0 est une donnée, pas une absence. */
{
  assert.equal(hasValue(0), true, '0 est une donnée (stock nul, prix nul)');
  assert.equal(hasValue(''), false);
  assert.equal(hasValue('   '), false);
  assert.equal(hasValue(null), false);
  assert.equal(hasValue(undefined), false);
  assert.equal(hasValue([]), false, 'tableau vide = rien à montrer');
  assert.equal(hasValue(['a']), true);
  assert.equal(hasValue(false), true, 'un booléen est une information');
  console.log('✓ 0 = donnée, vide/null/tableau vide = absence');
}

/* 3. Un état vide ne retire rien, et l'ordre est conservé. */
{
  const state = emptyFilterState(filters);
  assert.deepEqual(Object.keys(state), ['name', 'brand', 'status', 'price', 'stock', 'supplier']);
  assert.equal(hasActiveFilter(state), false);
  const out = applyColumnFilters(rows, filters, state);
  assert.deepEqual(out.map(r => r.id), ['1', '2', '3'], 'aucun filtre = liste complète, dans l’ordre');
  console.log('✓ état vide = liste complète, ordre conservé');
}

/* 4. Texte : accents ignorés, plusieurs mots = tous les mots. */
{
  const byName = (value: string) => applyColumnFilters(rows, filters, { ...emptyFilterState(filters), name: value }).map(r => r.id);
  assert.deepEqual(byName('serum'), ['1'], '« serum » trouve « Sérum Éclat »');
  assert.deepEqual(byName('SÉRUM'), ['1'], 'casse ignorée');
  assert.deepEqual(byName('argan bio'), ['2'], 'plusieurs mots : tous doivent coller');
  assert.deepEqual(byName('bio argan'), ['2'], 'l’ordre des mots n’importe pas');
  assert.deepEqual(byName('crème'), ['3'], 'accent tapé fonctionne aussi');
  assert.deepEqual(byName('zzz'), [], 'rien ne correspond → liste vide, pas liste complète');
  console.log('✓ texte : accents ignorés, tous les mots doivent coller');
}

/* 5. Enum : valeur exacte, et « non renseigné » est atteignable. */
{
  const byStatus = (value: string) => applyColumnFilters(rows, filters, { ...emptyFilterState(filters), status: value }).map(r => r.id);
  assert.deepEqual(byStatus('draft'), ['2', '3']);
  assert.deepEqual(byStatus('published'), ['1']);
  assert.deepEqual(byStatus('__empty__'), [], 'aucune ligne sans statut ici');
  const noBrand = applyColumnFilters(rows, [{ key: 'brand', kind: 'enum', get: r => r.brand, options: [] }], { brand: '__empty__' });
  assert.deepEqual(noBrand.map(r => r.id), ['3'], 'une valeur absente est filtrable');
  console.log('✓ enum : valeur exacte, absence atteignable');
}

/* 6. « Rempli / Vide » : le stock nul est du côté « rempli » (0 est une donnée),
      le fournisseur absent est du côté « vide ». */
{
  const state = emptyFilterState(filters);
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, stock: 'filled' }).map(r => r.id), ['1', '2', '3'], 'stock 0 = donnée présente');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, stock: 'absent' }).map(r => r.id), [], 'aucun stock manquant');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, supplier: 'absent' }).map(r => r.id), ['2'], '« Sans fournisseur » trouve la fiche non rattachée');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, supplier: 'filled' }).map(r => r.id), ['1', '3']);
  console.log('✓ rempli/vide : 0 reste une donnée, l’absence est trouvable');
}

/* 7. Numérique : valeur exacte, intervalle ouvert des deux côtés, virgule acceptée. */
{
  const state = emptyFilterState(filters);
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '18' }).map(r => r.id), ['2']);
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '18,0' }).map(r => r.id), ['2'], 'virgule décimale acceptée');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '10-20' }).map(r => r.id), ['2'], 'intervalle fermé');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '20-' }).map(r => r.id), ['1'], '« 20- » = 20 et plus');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '-10' }).map(r => r.id), ['3'], '« -10 » = jusqu’à 10');
  assert.deepEqual(applyColumnFilters(rows, filters, { ...state, price: '0' }).map(r => r.id), ['3'], 'prix 0 trouvé');
  console.log('✓ numérique : exact, intervalles ouverts, virgule');
}

/* 8. Combinaison : les filtres s'additionnent en ET, jamais en OU. */
{
  const state = emptyFilterState(filters);
  const both = applyColumnFilters(rows, filters, { ...state, status: 'draft', supplier: 'filled' }).map(r => r.id);
  assert.deepEqual(both, ['3'], 'brouillon ET avec fournisseur → une seule ligne');
  const none = applyColumnFilters(rows, filters, { ...state, status: 'published', supplier: 'absent' });
  assert.deepEqual(none, [], 'publié ET sans fournisseur → rien (pas d’union)');
  console.log('✓ plusieurs filtres = ET, jamais OU');
}

/* 9. Un filtre ne trie pas : l'ordre d'origine est conservé. */
{
  const many = Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `Produit ${i}`, brand: i % 2 ? 'X' : '' }));
  const out = applyColumnFilters(many, [{ key: 'brand', kind: 'text', get: r => r.brand }], { brand: 'x' });
  assert.deepEqual(out.map(r => r.id), ['1', '3', '5'], 'ordre d’origine conservé');
  console.log('✓ un filtre retire, il ne réordonne pas');
}

/* 10. Libellés du résumé et état actif. */
{
  const state = { ...emptyFilterState(filters), status: 'draft', supplier: 'absent', price: '10-20' };
  assert.equal(hasActiveFilter(state), true);
  assert.equal(hasActiveFilter(emptyFilterState(filters)), false);
  const labels = activeFilterLabels(filters, state);
  assert.deepEqual(labels, ['Brouillon', '10-20 €', 'Sans fournisseur'], 'libellés lisibles, dans l’ordre des filtres');
  console.log('✓ résumé : nombre et libellés des filtres actifs');
}

/* 11. Ligne au format inattendu : une valeur non numérique ne passe pas un
       filtre numérique (pas de 0 fantôme). */
{
  const odd = [{ id: 'a', price: 'nc' }, { id: 'b', price: 12 }];
  const numeric: ColumnFilter[] = [{ key: 'price', kind: 'numeric', get: r => r.price }];
  assert.deepEqual(applyColumnFilters(odd, numeric, { price: '10-20' }).map(r => r.id), ['b'], '« nc » ne vaut pas 0');
  console.log('✓ valeur non numérique ≠ 0 : elle ne passe pas un filtre numérique');
}

console.log('\n11 blocs de contrôles validés — normalisation, présence, texte, enum, numérique, combinaison, ordre, résumé.');
