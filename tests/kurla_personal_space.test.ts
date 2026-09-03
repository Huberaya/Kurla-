/**
 * CHANTIER ESPACE PERSONNEL — garde-fous du contenu de valeur.
 *
 * Deux régressions réelles motivent ce banc :
 *
 * 1. Le score de confiance du profil était multiplié par 100 deux fois :
 *    `confidence.overall` est déjà un pourcentage (0-100) côté serveur, et
 *    l'écran affichait « Profil complété à 4500 % ». Corrigé dans BeautyHub.
 * 2. En renommant « Génération IA » en « Génération KURLA », la tentation
 *    naturelle est d'aller jusqu'au bout et de gommer la mention d'IA partout.
 *    Ce serait une faute : l'article 50 du règlement (UE) 2024/1689 impose
 *    d'informer la personne qu'elle interagit avec une IA. On rebrande le
 *    libellé d'attente, jamais la mention légale.
 *
 * Ce banc vérifie donc que le contenu de valeur reste complet, que les liens
 * pointent vers de vraies routes, et que la transparence IA survit au rebranding.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { FEATURE_VALUE } from '../src/data/personalSpace';
import { ROUTES } from '../src/lib/routeTable';
import { AI_TRANSPARENCY } from '../src/lib/ai/guardrails';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ——— 1. Chaque outil expliqué est complet et pointe vers une vraie route ———
{
  const knownPaths = new Set(ROUTES.map((route) => route.path));
  assert.ok(FEATURE_VALUE.length >= 5, `Trop peu d'outils expliqués : ${FEATURE_VALUE.length}`);

  for (const feature of FEATURE_VALUE) {
    assert.ok(feature.id, 'identifiant manquant');
    assert.ok(feature.name.length >= 4, `${feature.id} : nom trop court`);
    assert.ok(feature.href.startsWith('/'), `${feature.id} : href non interne`);
    assert.ok(knownPaths.has(feature.href), `${feature.id} : ${feature.href} n'est pas une route connue`);

    assert.ok(feature.promesse.length >= 30, `${feature.id} : promesse trop vague`);
    assert.ok(feature.pourquoi.length >= 120, `${feature.id} : le « pourquoi » ne dit rien (${feature.pourquoi.length} car.)`);
    assert.ok(feature.gains.length >= 2 && feature.gains.length <= 4, `${feature.id} : entre 2 et 4 bénéfices attendus`);
    for (const gain of feature.gains) {
      assert.ok(gain.length >= 25, `${feature.id} : bénéfice trop court — « ${gain} »`);
    }
    assert.ok(feature.mecanisme.length >= 80, `${feature.id} : mécanisme non expliqué`);
    assert.match(feature.effort, /\d/, `${feature.id} : durée chiffrée attendue`);
    assert.ok(feature.cta.length >= 8, `${feature.id} : libellé de bouton trop court`);

    // Aucune promesse chiffrée inventée : pas de pourcentage dans les textes.
    const blob = [feature.promesse, feature.pourquoi, feature.mecanisme, ...feature.gains].join(' ');
    assert.doesNotMatch(blob, /\d+\s?%|×\d|\d+\s?fois plus/, `${feature.id} : promesse chiffrée non sourcée`);
  }

  const ids = FEATURE_VALUE.map((feature) => feature.id);
  assert.equal(new Set(ids).size, ids.length, 'Deux outils partagent le même identifiant');
  ok(`${FEATURE_VALUE.length} outils : pourquoi / bénéfices / mécanisme / durée, liens vérifiés, zéro chiffre inventé`);
}

// ——— 2. Le rebranding « Génération KURLA » ne doit pas effacer la mention IA ———
{
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(full)) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src'));

  const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf-8') }));

  // (a) les libellés d'attente parlent de KURLA, pas d'IA
  const iaGeneration = sources.filter(({ text }) => /Génération IA|génération de l’?IA/i.test(text));
  assert.deepEqual(
    iaGeneration.map(({ file }) => file.replace(process.cwd(), '.')),
    [],
    'Un libellé « Génération IA » est revenu — la marque, c’est KURLA',
  );

  const kurlaGeneration = sources.filter(({ text }) => /Génération KURLA/.test(text));
  assert.ok(kurlaGeneration.length >= 2, 'Le libellé « Génération KURLA » a disparu');
  ok(`${kurlaGeneration.length} libellés « Génération KURLA », 0 « Génération IA »`);

  // (b) la transparence IA, elle, doit RESTER
  assert.ok(
    AI_TRANSPARENCY.disclosure.includes('intelligence artificielle'),
    'La mention d’intelligence artificielle doit rester littérale (article 50, règlement UE 2024/1689)',
  );
  assert.ok(
    sources.some(({ text }) => text.includes('AI_TRANSPARENCY')),
    'Le module de transparence IA n’est plus utilisé nulle part',
  );
  const badge = readFileSync(join(process.cwd(), 'src', 'components', 'AiDisclosureBadge.tsx'), 'utf-8');
  assert.match(badge, /Assistant IA/, 'Le badge de transparence ne dit plus « Assistant IA »');
  ok('transparence IA préservée : mention littérale + badge toujours rendu');
}

console.log(`\nCHANTIER ESPACE PERSONNEL — ${checks} contrôles passés.\n`);
