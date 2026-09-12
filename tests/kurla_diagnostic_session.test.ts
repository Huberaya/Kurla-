/**
 * BANC — Session du diagnostic : le dernier diagnostic prime (13/09/2026)
 * ========================================================================
 *
 * Bug corrigé : la page résultat lisait la clé peau en premier (session +
 * localStorage persistant) — après un diagnostic peau, le diagnostic
 * cheveux suivant affichait les réponses du diagnostic PEAU dans le même
 * onglet. Le marqueur « dernier diagnostic » (kurla_diagnostic_latest)
 * tranche désormais ; le contenu des réponses vérifie le pôle affiché.
 *
 * Contrat verrouillé :
 *  1. Peau puis cheveux dans le même onglet → les réponses CHEVEUX sont
 *     affichées (le localStorage peau persistant ne masque plus) ;
 *  2. Cheveux puis peau → les réponses peau sont affichées ;
 *  3. Sans marqueur (session ancienne) → comportement hérité : peau d’abord ;
 *  4. Marqueur présent mais clé vide → dernier recours sur l’autre pôle,
 *     le pôle affiqué suit toujours le contenu réel ;
 *  5. Résultat : toujours le dernier généré (clé commune), secours explicite
 *     si absent/illisible.
 *
 * Exécution : npx tsx tests/kurla_diagnostic_session.test.ts
 */

import assert from 'node:assert/strict';

class MemStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null; }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

const session = new MemStorage();
const local = new MemStorage();
// Les stubs sont posés avant tout appel de la lib (la lib ne lit le storage
// que dans ses fonctions, jamais au chargement du module).
(globalThis as Record<string, unknown>).sessionStorage = session;
(globalThis as Record<string, unknown>).localStorage = local;

const { markLatestDiagnostic, readDiagnosticSession } = await import('../src/lib/diagnosticSession');

let checks = 0;
const ok = async (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log(`  ✓ ${label}`);
};

const reset = () => { session.clear(); local.clear(); };
const SKIN_ANSWERS = { skinType: 'mixte', skinConcerns: ['taches'], skinObjectives: ['attenuer_taches'], sensitivity: 'moyenne' };
const HAIR_ANSWERS = { texture: 'crepue', style: 'naturel', priority: 'hydratation', porosity: 'forte', scalp: 'normal' };
const AI_RESULT = { summary: 'Résumé généré.', recommendedRoutine: 'Routine', reason: 'r', steps: [], warnings: [], productHandles: [], requiresHumanReview: false, generatedWithAI: false, source: 'test' };

console.log('Banc session diagnostic — le dernier diagnostic prime\n');

await ok('peau puis cheveux dans le même onglet : les réponses cheveux sont affichées', () => {
  reset();
  session.setItem('kurla_diagnostic_answers_skin', JSON.stringify(SKIN_ANSWERS));
  local.setItem('kurla_skin_answers', JSON.stringify(SKIN_ANSWERS));
  markLatestDiagnostic('skin');
  session.setItem('kurla_diagnostic_result', JSON.stringify(AI_RESULT));
  assert.equal(readDiagnosticSession().isSkin, true, 'le diagnostic peau d’abord est bien affiché');

  // Le diagnostic cheveux s’exécute ensuite, même onglet.
  session.setItem('kurla_diagnostic_answers', JSON.stringify(HAIR_ANSWERS));
  markLatestDiagnostic('hair');
  const s = readDiagnosticSession();
  assert.equal(s.isSkin, false, 'le dernier diagnostic (cheveux) doit primer');
  assert.equal(s.pole, 'hair');
  assert.equal(s.answers.texture, 'crepue', 'les réponses affichées sont celles du diagnostic cheveux');
  assert.equal(s.answers.skinType, undefined, 'aucune réponse peau ne fuite dans le résultat cheveux');
});

await ok('cheveux puis peau : les réponses peau sont affichées', () => {
  reset();
  session.setItem('kurla_diagnostic_answers', JSON.stringify(HAIR_ANSWERS));
  markLatestDiagnostic('hair');
  session.setItem('kurla_diagnostic_answers_skin', JSON.stringify(SKIN_ANSWERS));
  local.setItem('kurla_skin_answers', JSON.stringify(SKIN_ANSWERS));
  markLatestDiagnostic('skin');
  const s = readDiagnosticSession();
  assert.equal(s.isSkin, true, 'le dernier diagnostic (peau) doit primer');
  assert.equal(s.answers.skinType, 'mixte', 'les réponses affichées sont celles du diagnostic peau');
});

await ok('sans marqueur (session ancienne) : comportement hérité, peau d’abord', () => {
  reset();
  session.setItem('kurla_diagnostic_answers', JSON.stringify(HAIR_ANSWERS));
  local.setItem('kurla_skin_answers', JSON.stringify(SKIN_ANSWERS));
  const s = readDiagnosticSession();
  assert.equal(s.isSkin, true, 'comportement hérité conservé (localStorage peau persistant)');

  reset();
  session.setItem('kurla_diagnostic_answers', JSON.stringify(HAIR_ANSWERS));
  assert.equal(readDiagnosticSession().isSkin, false, 'cheveux seul → pôle cheveux');
});

await ok('marqueur présent mais clé du pôle vide : dernier recours, contenu vérifié', () => {
  reset();
  local.setItem('kurla_skin_answers', JSON.stringify(SKIN_ANSWERS));
  markLatestDiagnostic('hair'); // le diagnostic cheveux n’a rien pu écrire
  const s = readDiagnosticSession();
  assert.equal(s.isSkin, true, 'le pôle affiché suit le contenu réel des réponses');
  assert.equal(s.answers.skinType, 'mixte');

  reset();
  markLatestDiagnostic('hair'); // rien nulle part
  const empty = readDiagnosticSession();
  assert.equal(empty.answers, empty.answers, 'aucune exception');
  assert.equal(Object.keys(empty.answers).length, 0, 'réponses vides, pas de données inventées');
});

await ok('résultat : toujours le dernier généré, secours explicite sinon', () => {
  reset();
  const s1 = readDiagnosticSession();
  assert.equal(s1.result.source, 'fallback', 'aucun résultat en session → secours explicite');
  session.setItem('kurla_diagnostic_result', JSON.stringify(AI_RESULT));
  assert.equal(readDiagnosticSession().result.summary, 'Résumé généré.', 'le dernier résultat généré est affiché');
  session.setItem('kurla_diagnostic_result', 'JSON cassé{');
  assert.equal(readDiagnosticSession().result.source, 'fallback', 'cache illisible → secours explicite, pas d’exception');
});

await ok('le marqueur est écrit dans sessionStorage par les deux pôles', () => {
  reset();
  markLatestDiagnostic('skin');
  assert.equal(session.getItem('kurla_diagnostic_latest'), 'skin');
  markLatestDiagnostic('hair');
  assert.equal(session.getItem('kurla_diagnostic_latest'), 'hair', 'le dernier appel écrase le précédent');
});

console.log(`\n${checks} checks session diagnostic validés.`);
