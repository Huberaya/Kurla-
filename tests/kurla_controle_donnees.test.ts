/**
 * BANC — le contrôle des données ne conclut jamais à l'aveugle
 * ============================================================
 *
 * Pourquoi ce banc, mesuré le 13/09/2026 :
 *
 *   · le schéma était vérifié **à la main** ;
 *   · les endpoints l'étaient toutes les quinze minutes ;
 *   · le contenu, lui, n'était surveillé par rien.
 *
 * Et c'est dans le contenu que les pannes sont arrivées : 16 fiches
 * repassées en `draft` (gamme peau vide plusieurs jours), puis une règle
 * exigeant le SKU fournisseur qui a vidé la boutique — 63 produits en base,
 * zéro servi.
 *
 * La sonde attrape un vide total. Elle ne voit ni « 63 → 40 », ni un prix
 * tombé à zéro, ni une fiche publiée mais inactive.
 *
 * Ce banc tient à deux règles, qui sont toute la valeur du contrôle :
 *
 *   1. **une baisse se voit** — et une lente érosion aussi, d'où la
 *      comparaison au maximum connu plutôt qu'à l'observation précédente ;
 *   2. **ce qui n'a pas pu être lu n'est pas conforme** — c'est inconnu, et
 *      l'inconnu fait échouer le contrôle au lieu de le faire passer.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';

const exec = promisify(execFile);
const RACINE = process.cwd();

const {
  ETATS,
  INVARIANTS,
  TOLERANCE_BAISSE,
  bilan,
  comparerAuMaximum,
  evaluer,
  invariantsNonEvalues,
  nouvelleReference
} = await import('../scripts/lib/donnees.mjs');

let verifications = 0;
function ok(label: string, fn: () => void): void {
  fn();
  verifications += 1;
  console.log(`  ✓ ${label}`);
}

// ---------------------------------------------------------------------------
// 1. La baisse
// ---------------------------------------------------------------------------

ok('sans maximum connu, on ne conclut rien : on écrit la référence', () => {
  const r = comparerAuMaximum(63, undefined);
  assert.equal(r.etat, ETATS.ok);
  assert.match(r.detail, /référence/);
});

ok('une chute à zéro est une anomalie, quelle que soit la tolérance', () => {
  const r = comparerAuMaximum(0, 63);
  assert.equal(r.etat, ETATS.anomalie);
  assert.match(r.detail, /tombé à 0/);
});

ok('une baisse au-delà de la tolérance est une anomalie', () => {
  assert.equal(comparerAuMaximum(50, 63).etat, ETATS.anomalie, '63 → 50 dépasse 10 %');
});

ok('une baisse dans la tolérance n\'en est pas une', () => {
  assert.equal(comparerAuMaximum(60, 63).etat, ETATS.ok, '63 → 60 tient dans 10 %');
  assert.equal(comparerAuMaximum(63, 63).etat, ETATS.ok);
  assert.equal(comparerAuMaximum(96, 63).etat, ETATS.ok, 'une hausse n\'est jamais une anomalie');
});

ok('la tolérance est un paramètre, pas une constante cachée', () => {
  assert.equal(TOLERANCE_BAISSE, 0.10);
  assert.equal(comparerAuMaximum(40, 63, 0.5).etat, ETATS.ok, 'tolérance 50 % : 40 passe');
  assert.equal(comparerAuMaximum(40, 63, 0.1).etat, ETATS.anomalie, 'tolérance 10 % : 40 ne passe pas');
});

// ---------------------------------------------------------------------------
// 2. L'inconnu : jamais un succès
// ---------------------------------------------------------------------------

ok('une lecture impossible donne « non vérifiable », pas « ok »', () => {
  const r = comparerAuMaximum(null, 63);
  assert.equal(r.etat, ETATS.non_verifiable, 'null et 0 ne doivent jamais se confondre : 0 est un compte, null est une absence de compte');
  assert.equal(comparerAuMaximum(Number.NaN, 63).etat, ETATS.non_verifiable);
});

ok('un invariant « attendu : 0 » évalue la mesure, même nulle', () => {
  const invariant = { id: 'x', libelle: 'x', pourquoi: 'x', attendu: 0 };
  assert.equal(evaluer(invariant, { valeur: 0 }, 5).etat, ETATS.ok);
  assert.equal(evaluer(invariant, { valeur: 3 }, 5).etat, ETATS.anomalie);
  const inconnu = evaluer(invariant, { valeur: null, erreur: 'HTTP 401' }, 5);
  assert.equal(inconnu.etat, ETATS.non_verifiable);
  assert.match(inconnu.detail, /401/, 'la raison doit être transmise, pas avalée');
});

// ---------------------------------------------------------------------------
// 3. La référence : le maximum ne décroît jamais
// ---------------------------------------------------------------------------

ok('le maximum connu ne redescend jamais', () => {
  let reference = nouvelleReference({}, 'produits', 63);
  reference = nouvelleReference(reference, 'produits', 40);
  assert.equal(reference.produits.maximum, 63, 'une baisse ne doit pas effacer le maximum');
  assert.equal(reference.produits.dernier, 40);
  reference = nouvelleReference(reference, 'produits', 96);
  assert.equal(reference.produits.maximum, 96);
});

ok('une érosion lente finit par être vue', () => {
  // 63 → 60 → 57 → 54 : chaque marche tient dans la tolérance (≈ 5 %),
  // l'écart total (14 %) ne tient pas. Comparer à la dernière valeur
  // laisserait passer les trois marches ; comparer au maximum voit la
  // troisième.
  let reference = nouvelleReference({}, 'produits', 63);
  assert.equal(comparerAuMaximum(60, reference.produits.maximum).etat, ETATS.ok, '63 → 60 : dans la tolérance');
  reference = nouvelleReference(reference, 'produits', 60);
  assert.equal(comparerAuMaximum(57, reference.produits.maximum).etat, ETATS.ok, '63 → 57 : dans la tolérance');
  reference = nouvelleReference(reference, 'produits', 57);
  assert.equal(comparerAuMaximum(54, reference.produits.maximum).etat, ETATS.anomalie, '63 → 54 : cumulé, ça ne passe plus');
  // Et la même marche, jugée sur la seule valeur précédente, serait passée.
  assert.equal(comparerAuMaximum(54, 57).etat, ETATS.ok, 'voilà pourquoi on garde le maximum');
});

// ---------------------------------------------------------------------------
// 4. Le bilan : ce qui bloque
// ---------------------------------------------------------------------------

ok('une anomalie ou un inconnu font échouer le contrôle', () => {
  const vide = bilan([{ etat: ETATS.ok }, { etat: ETATS.ok }]);
  assert.equal(vide.bloquant, false);
  assert.equal(vide.ok, 2);
  assert.equal(bilan([{ etat: ETATS.anomalie }]).bloquant, true);
  const inconnu = bilan([{ etat: ETATS.ok }, { etat: ETATS.non_verifiable }]);
  assert.equal(inconnu.bloquant, true, 'un contrôle qu\'on n\'a pas pu faire n\'est pas un contrôle réussi');
  assert.equal(inconnu.ok, 1, 'l\'inconnu ne doit pas être compté parmi les succès');
});

ok('tout invariant déclaré est mesuré, sinon le contrôle s\'allège en silence', () => {
  assert.deepEqual(invariantsNonEvalues({}), INVARIANTS.map((i) => i.id));
  const tous = Object.fromEntries(INVARIANTS.map((i) => [i.id, { valeur: 0 }]));
  assert.deepEqual(invariantsNonEvalues(tous), []);
});

ok('chaque invariant porte sa raison — un contrôle sans justification finit désactivé', () => {
  assert.ok(INVARIANTS.length >= 5, `attendu au moins 5 invariants, obtenu ${INVARIANTS.length}`);
  for (const invariant of INVARIANTS) {
    assert.ok(invariant.id && invariant.libelle, `invariant incomplet : ${JSON.stringify(invariant)}`);
    assert.ok(invariant.pourquoi && invariant.pourquoi.length > 20, `« ${invariant.id} » doit dire pourquoi il existe`);
    assert.ok('attendu' in invariant || invariant.baisse === true, `« ${invariant.id} » doit avoir une règle`);
  }
});

// ---------------------------------------------------------------------------
// 5. Le programme, lancé pour de vrai
// ---------------------------------------------------------------------------

async function lancer(environnement: Record<string, string>, args: string[] = []) {
  try {
    const { stdout, stderr } = await exec('node', ['scripts/verifier-donnees.mjs', ...args], {
      cwd: RACINE,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', ...environnement },
      timeout: 60_000
    });
    return { code: 0, sortie: stdout, erreur: stderr };
  } catch (error: any) {
    return { code: Number(error.code ?? 1), sortie: String(error.stdout ?? ''), erreur: String(error.stderr ?? '') };
  }
}

{
  const r = await lancer({}, ['--reference', '/tmp/ref-absente.json']);
  assert.equal(r.code, 2, `sans accès, le programme doit échouer (2), obtenu ${r.code}`);
  assert.match(r.erreur, /PAS vérifiées/, 'il doit dire que rien n\'a été vérifié, au lieu de se taire');
  verifications += 1;
  console.log('  ✓ sans accès à la base : échec 2 et le silence est nommé');
}

{
  // Base injoignable : cinq lectures échouent. Le contrôle doit échouer, pas
  // se rabattre sur un « rien d\'anormal ».
  const r = await lancer({
    SUPABASE_URL: 'http://127.0.0.1:1',
    SUPABASE_SECRET_KEY: 'cle',
    KURLA_PROD_URL: 'http://127.0.0.1:1'
  }, ['--reference', '/tmp/ref-injoignable.json']);
  assert.equal(r.code, 1, `base injoignable : échec 1 attendu, obtenu ${r.code}`);
  assert.match(r.sortie, /impossible\(s\) à vérifier/);
  assert.match(r.sortie, /n’est pas conforme : c’est inconnu/);
  verifications += 1;
  console.log('  ✓ base injoignable : échec 1, « inconnu » et non « rien d\'anormal »');
}

// ---------------------------------------------------------------------------
// 6. Le contrôle est branché — sinon il rejoint les 17 bancs oubliés
// ---------------------------------------------------------------------------

ok('une action exécute le contrôle des données et du schéma', () => {
  const brut = readFileSync(`${RACINE}/.github/workflows/donnees-schema.yml`, 'utf8');
  assert.match(brut, /verifier-donnees\.mjs/, 'le contrôle des données doit être exécuté');
  assert.match(brut, /verifier-schema\.mjs/, 'le contrôle du schéma doit être exécuté');
  assert.match(brut, /schedule:/, 'une exécution planifiée : la dérive arrive sans qu\'un push ne l\'apporte');
  assert.match(brut, /SUPABASE_SECRET_KEY/, 'l\'accès à la base doit venir des secrets du dépôt');
  assert.match(brut, /cache/, 'la référence des maximums doit survivre entre deux exécutions');
});

ok('en échec, le contrôle alerte', () => {
  const brut = readFileSync(`${RACINE}/.github/workflows/donnees-schema.yml`, 'utf8');
  assert.match(brut, /scripts\/alerter\.mjs/, 'une anomalie de données doit réveiller quelqu\'un');
  assert.match(brut, /if:\s*failure\(\)/);
});

console.log(`\n[PASS] Contrôle des données : ${verifications} vérifications — la baisse se voit (même lente, par comparaison au maximum), ce qui n'a pas pu être lu n'est jamais compté comme conforme, tout invariant déclaré est mesuré et justifié, et le contrôle est branché sur une action planifiée qui alerte.`);
