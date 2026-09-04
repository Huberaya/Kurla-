/**
 * CHANTIER « PRÉCOMMANDE SANS DATE » — la promesse d'expédition, une seule fois.
 *
 * Trois défauts réels, constatés le 2026-09-03 :
 *
 *  1. **La même phrase était recopiée dans douze endroits** — fiche produit,
 *     panier, boutique, suivi, relance, e-mails, CGV — avec des variantes.
 *     Corriger la promesse supposait de les retrouver à la main ; une seule
 *     oubliée et le site se contredit lui-même.
 *
 *  2. **Les CGV décrivaient une fonctionnalité absente** : « un délai indicatif
 *     figure sur chaque fiche produit ». Aucune fiche produit n'affiche de
 *     délai, indicatif ou non.
 *
 *  3. **Les CGV citaient la loi à contresens.** Elles fixaient l'échéance à
 *     « 30 jours suivant la date de disponibilité annoncée ». Or aucune date
 *     n'est annoncée : le compteur ne démarrait jamais, et la cliente n'avait
 *     en réalité aucune échéance opposable — tout en lisant une clause qui
 *     paraît protectrice. L'article L. 216-1 du code de la consommation dit
 *     l'inverse : à défaut de date indiquée, livraison au plus tard trente
 *     jours après la conclusion du contrat.
 *
 * Ce banc verrouille les trois : une seule source, plus aucune occurrence en
 * dur, et une clause dont l'échéance court réellement.
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  ANNOUNCED_AT,
  ANNOUNCED_MAX_DAYS,
  DISPATCH_LEGAL,
  DISPATCH_SENTENCE,
  DISPATCH_SHORT,
  LEGAL_MAX_DAYS,
  formatDispatchDate,
  isValidDispatchDate,
  preorderCgvDelay,
  preorderCgvNotice,
  preorderDispatchPromise
} from '../src/lib/preorderPromise';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ——— 1. La promesse est complète et ne promet rien d'inventé ———
{
  const promise = preorderDispatchPromise();
  assert.ok(promise.short.length >= 15, 'formulation courte trop vague');
  assert.ok(promise.sentence.length >= 60, 'phrase complète trop vague');
  assert.ok(promise.legal.length >= 60, 'rappel légal absent ou trop court');

  // Le plancher légal figure dans TOUTES les variantes : c'est le seul engagement
  // qui tienne quand aucune date n'est annoncée.
  assert.match(promise.legal, /30 jours/, 'le délai légal doit être chiffré');
  assert.match(promise.legal, /annuler/, 'le droit d’annulation doit être rappelé');
  // Une échéance opposable doit figurer dans la phrase elle-même : « à la
  // réception du lot » seul ne dit rien à celle qui attend.
  assert.match(
    promise.sentence,
    /au plus tard \d+ jours|sous \d+ jours|le \d{1,2} \w+ \d{4}/,
    'la phrase ne comporte aucune échéance opposable'
  );

  // Aucune date inventée : tant que ANNOUNCED_AT est nul, aucune date ne doit
  // apparaître dans le texte servi aux clientes.
  const showsDate = /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/;
  if (ANNOUNCED_AT === null) {
    assert.equal(promise.kind, 'legal');
    assert.doesNotMatch(promise.sentence, showsDate, 'date annoncée alors qu’aucune n’est configurée');
    assert.doesNotMatch(promise.short, showsDate, 'date annoncée alors qu’aucune n’est configurée');
  }
  ok(`promesse « ${promise.kind} » : formulation, échéance légale, aucune date inventée`);
}

// ——— 2. Le basculement sur une date réelle fonctionne, sans rewrite ———
{
  assert.equal(isValidDispatchDate('2026-11-12'), true);
  assert.equal(isValidDispatchDate('2026-02-30'), false, 'le 30 février n’existe pas');
  assert.equal(isValidDispatchDate('12/11/2026'), false, 'format non ISO refusé');
  assert.equal(isValidDispatchDate(null), false);
  assert.equal(isValidDispatchDate(''), false);
  assert.equal(formatDispatchDate('2026-11-12'), '12 novembre 2026');

  // Contrôle croisé : l'implémentation actuelle doit rester cohérente avec la
  // configuration réellement déployée.
  assert.equal(DISPATCH_SHORT, preorderDispatchPromise().short);
  assert.equal(DISPATCH_SENTENCE, preorderDispatchPromise().sentence);
  assert.equal(DISPATCH_LEGAL, preorderDispatchPromise().legal);
  assert.equal(LEGAL_MAX_DAYS, 30);
  assert.ok(ANNOUNCED_MAX_DAYS === null || ANNOUNCED_MAX_DAYS > 0);
  ok('validation de date et cohérence des raccourcis avec la configuration');
}

// ——— 3. Les CGV ne décrivent plus une fonctionnalité absente ———
{
  const notice = preorderCgvNotice();
  const delay = preorderCgvDelay();

  assert.doesNotMatch(
    notice + delay,
    /délai indicatif figure sur chaque fiche produit/i,
    'les CGV annoncent un délai par produit qui n’existe nulle part'
  );
  assert.match(delay, /L\. 216-1/, 'la base légale doit être citée');
  assert.match(delay, /trente jours après la conclusion du contrat|30 jours après/i,
    'l’échéance doit courir depuis la commande, pas depuis une date non annoncée');
  assert.doesNotMatch(delay, /suivant la date de disponibilité annoncée/i,
    'cette échéance ne court jamais : aucune date de disponibilité n’est annoncée');
  assert.match(delay, /numéro de suivi/, 'l’information à l’expédition doit être rappelée');
  assert.ok(delay.length >= 300, 'clause de délai trop courte pour être opposable');
  ok('CGV : plus de fonctionnalité fantôme, échéance qui court réellement');
}

// ——— 4. Aucune occurrence de la formulation en dehors du module ———
{
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(full)) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src'));

  const stripComments = (text: string): string =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ');

  const orphans: string[] = [];
  const consumers = new Set<string>();

  for (const file of files) {
    // `path.replace` laisse un « ./ » en tête : on le retire pour comparer avec
    // la liste des emplacements attendus.
    const relative = file.replace(process.cwd(), '.').replace(/^\.\//, '');
    const text = stripComments(readFileSync(file, 'utf-8'));

    // Le module lui-même porte la formulation : c'est son rôle.
    if (relative.endsWith('src/lib/preorderPromise.ts')) continue;

    if (/réception du (premier )?lot|premier lot de production/.test(text)) {
      orphans.push(relative);
    }
    if (/from '.*preorderPromise'/.test(text)) consumers.add(relative);
  }

  assert.deepEqual(
    orphans,
    [],
    `formulation d'expédition recopiée hors du module : ${orphans.join(', ')}`
  );

  // Les emplacements qui doivent relayer la promesse. En oublier un, c'est
  // afficher deux versions différentes de la même engagement.
  const required = [
    'src/pages/ProductDetailPage.tsx',
    'src/components/CartDrawer.tsx',
    'src/pages/OrderTrackingPage.tsx',
    'src/components/AbandonedCartReminder.tsx',
    'src/lib/emailTemplates.ts',
    'src/pages/LegalPage.tsx'
  ];
  for (const relative of required) {
    assert.ok(consumers.has(relative), `${relative} n'affiche pas la promesse partagée`);
  }
  ok(`${consumers.size} emplacements relayent la source unique, aucune copie en dur`);
}

console.log(`\nCHANTIER PRÉCOMMANDE — ${checks} contrôles passés.\n`);
