import assert from 'node:assert/strict';

import { normalizeBarcode, isLikelyBarcode } from '../src/lib/barcodeLookup';

/**
 * SCAN CODE-BARRES (KURLA Shelf) — banc de normalisation.
 *
 * La reconnaissance réseau dépend d'Open Beauty Facts et n'est pas testée
 * ici (et ne doit jamais inventer un produit). Ce qui est garanti par le
 * code, et donc testé : le code-barres est réduit à ses chiffres, sa
 * longueur est validée (EAN-8/12/13/14), et un code invalide renvoie null
 * plutôt qu'une recherche erronée.
 */

function main(): void {
  // Nettoyage : espaces, tirets, préfixe.
  assert.equal(normalizeBarcode(' 301-234 567-8907 '), '3012345678907');
  assert.equal(normalizeBarcode('EAN : 5449000000996'), '5449000000996');

  // Longueurs acceptées (8 à 14 chiffres).
  assert.equal(normalizeBarcode('12345678'), '12345678');       // EAN-8
  assert.equal(normalizeBarcode('0737628064502'), '0737628064502'); // UPC-12
  assert.equal(normalizeBarcode('3012345678907'), '3012345678907'); // EAN-13

  // Invalides : trop court, trop long, lettres, vide.
  assert.equal(normalizeBarcode('1234567'), null);
  assert.equal(normalizeBarcode('123456789012345'), null);
  assert.equal(normalizeBarcode('abcdefgh'), null);
  assert.equal(normalizeBarcode(''), null);

  // Helper de forme.
  assert.equal(isLikelyBarcode('3012345678907'), true);
  assert.equal(isLikelyBarcode('7 chiffres'), false);

  console.log('[PASS] Code-barres : normalisation chiffres seuls, longueurs EAN/UPC acceptées, invalides rejetés (jamais de recherche inventée).');
}

main();
