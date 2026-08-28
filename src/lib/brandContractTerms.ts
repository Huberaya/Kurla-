import { createHash } from 'node:crypto';

import { BRAND_TEST_K_THRESHOLD } from './brandTest';

/**
 * CHANTIER 12 (bloc D) — TEXTE DU CONTRAT MARQUE.
 *
 * Ce module est volontairement **hors** du domaine lié (`bindDomain`) : il
 * n'exporte que des constantes, et une constante exportée depuis un `*Store.ts`
 * provoque une erreur TS2345 à la liaison.
 *
 * Le texte est la chose signée. Toute modification change `termsHash` et rend
 * les signatures existantes caduques : c'est le but. Une marque qui a signé v1
 * doit signer v2 pour continuer.
 */
export const BRAND_CONTRACT_TERMS_VERSION = 'KURLA-BRAND-v1';

export const BRAND_CONTRACT_TERMS_TEXT = `CONTRAT DE TEST PRODUIT — KURLA BEAUTY
Version ${BRAND_CONTRACT_TERMS_VERSION}

1. Objet. KURLA organise, pour la marque signataire, un test produit auprès
   d'un panel de membres volontaires, et lui remet un rapport d'observation.

2. Ce que la marque reçoit. Uniquement des agrégats k-anonymes : des
   effectifs et des répartitions calculés sur un minimum de ${BRAND_TEST_K_THRESHOLD} membres par
   cellule. Aucun identifiant, aucun nom, aucun contact, aucune photographie,
   aucune réponse individuelle, aucune donnée de santé ou de profil beauté
   n'est transmis à la marque, sous quelque forme que ce soit.

3. Ce que KURLA ne cède pas. Aucune donnée personnelle n'est cédée, vendue,
   louée ou mise à disposition de la marque. KURLA ne fournit aucune liste de
   membres, aucun segment exploitable pour du ciblage publicitaire, et aucun
   accès permettant de reconstituer une identité par recoupement.

4. Consentement des membres. Un membre participe après avoir rejoint le test
   explicitement et peut se retirer à tout moment. Son retrait est pris en
   compte : il n'est plus compté dans les effectifs. Un membre qui n'a pas
   déclaré de résultat n'est pas compté comme résultat.

5. Rapports. Le rapport remis est le rapport k-anonyme produit par la
   plateforme. KURLA ne modifie pas les résultats pour les rendre favorables et
   n'ajoute aucune interprétation marketing. Un résultat défavorable est remis
   tel quel.

6. Rémunération. Le test est facturé au tarif indiqué sur le contrat. Aucun
   paiement ne conditionne le contenu du rapport.

7. Durée et fin. Le contrat court jusqu'à sa résiliation par l'une des
   parties. La résiliation n'efface pas les rapports déjà remis ; elle interdit
   toute nouvelle demande de test.

8. Version. Ce contrat porte sur la version ${BRAND_CONTRACT_TERMS_VERSION} du texte. Toute
   modification du texte exige une nouvelle signature des deux parties.
`;

/** Empreinte du texte signé — ce que les deux parties engagent. */
export function brandContractTermsHash(): string {
  // Calculé à l'appel, pas à l'import : le banc peut ainsi vérifier que le hash
  // correspond bien au texte courant.
  return createHash('sha256').update(BRAND_CONTRACT_TERMS_TEXT).digest('hex');
}
