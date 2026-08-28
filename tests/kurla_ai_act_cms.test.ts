import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import {
  AI_DISCLOSURE_LABEL,
  evaluateEditorialCompliance,
  normalizeGenerationMode,
  resolveResponsiblePerson
} from '../src/lib/editorialCompliance';

/**
 * CHANTIER 9 (bloc A4) — banc AI Act, article 50(4) appliqué au CMS.
 *
 * La règle : un texte généré par IA publié pour informer le public doit être
 * signalé, sauf relecture humaine assumée par une personne nommée. Ce banc
 * vérifie la règle elle-même (cas limites compris), puis son application là où
 * elle compte : la publication.
 */

const REVIEWED_AT = '2026-08-20T09:30:00.000Z';

function baseArticle(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Entretenir des boucles 4C sans les assécher',
    slug: 'boucles-4c-entretien',
    category: 'guide',
    contentType: 'article',
    content: 'Un texte long, sourcé, sans promesse de résultat.',
    excerpt: 'Les gestes qui comptent.',
    author: 'Rédaction KURLA',
    language: 'fr',
    topic: 'general',
    readTime: '6 min',
    evidenceLevel: 'reviewed',
    sources: [{ label: 'Revue de dermatologie cosmétique', url: 'https://example.org/etude' }],
    translations: { en: { title: 'Caring for 4C curls', excerpt: 'What matters.', content: 'A long, sourced text.' } },
    ...overrides
  };
}

async function runAiActCmsTests(): Promise<void> {
  // ---------------------------------------------------------------------
  // 1. La règle, cas par cas.
  // ---------------------------------------------------------------------
  const human = evaluateEditorialCompliance({ generatedBy: 'human' });
  assert.equal(human.mode, 'human');
  assert.equal(human.compliant, true);
  assert.equal(human.disclosureLabel, null);

  const bare = evaluateEditorialCompliance({ generatedBy: 'ai' });
  assert.equal(bare.mode, 'ai_not_compliant');
  assert.equal(bare.compliant, false);
  assert.ok(bare.missing.includes('aiDisclosure (signalement au public)'));
  assert.ok(bare.missing.some(field => field.startsWith('editorialReview.reviewedBy')));

  const disclosed = evaluateEditorialCompliance({ generatedBy: 'ai', aiDisclosure: true });
  assert.equal(disclosed.mode, 'ai_disclosed');
  assert.equal(disclosed.compliant, true);
  assert.equal(disclosed.disclosureLabel, AI_DISCLOSURE_LABEL);

  const controlled = evaluateEditorialCompliance({
    generatedBy: 'ai',
    editorialReview: { reviewedBy: 'Amina Traoré', reviewedAt: REVIEWED_AT, responsibilityAccepted: true }
  });
  assert.equal(controlled.mode, 'ai_editorial_control');
  assert.equal(controlled.compliant, true);
  assert.equal(controlled.responsiblePerson, 'Amina Traoré');
  // L'exemption ne supprime pas la transparence affichée au lecteur.
  assert.equal(controlled.disclosureLabel, AI_DISCLOSURE_LABEL);

  // « Relu par la rédaction » sans personne nommée ne vaut pas exemption.
  assert.equal(evaluateEditorialCompliance({ generatedBy: 'ai', editorialReview: { reviewedBy: 'KURLA', reviewedAt: REVIEWED_AT, responsibilityAccepted: true } }).compliant, false);
  assert.equal(resolveResponsiblePerson({ reviewedBy: 'IA' }), null);
  assert.equal(resolveResponsiblePerson({ reviewedBy: 'Amina' }), null);
  assert.equal(resolveResponsiblePerson({ reviewedBy: 'Amina Traoré' }), 'Amina Traoré');

  // Relecture sans date, ou sans validation explicite : non conforme.
  assert.equal(evaluateEditorialCompliance({ generatedBy: 'ai', editorialReview: { reviewedBy: 'Amina Traoré', responsibilityAccepted: true } }).compliant, false);
  assert.equal(evaluateEditorialCompliance({ generatedBy: 'ai', editorialReview: { reviewedBy: 'Amina Traoré', reviewedAt: REVIEWED_AT } }).compliant, false);

  // L'assistance par IA est traitée comme de l'IA : même obligation.
  assert.equal(normalizeGenerationMode('ai_assisted'), 'ai_assisted');
  assert.equal(evaluateEditorialCompliance({ generatedBy: 'ai_assisted' }).compliant, false);

  // Les colonnes de base (snake_case) sont lues telles quelles.
  const fromRow = evaluateEditorialCompliance({
    generated_by: 'ai',
    editorial_review: { reviewedBy: 'Amina Traoré', reviewedAt: REVIEWED_AT, responsibilityAccepted: true }
  });
  assert.equal(fromRow.mode, 'ai_editorial_control');

  // ---------------------------------------------------------------------
  // 2. La publication est refusée tant que la règle n'est pas satisfaite.
  // ---------------------------------------------------------------------
  await assert.rejects(
    () => serverDb.saveContentArticle(baseArticle({ generatedBy: 'ai', status: 'published' }), 'admin-1'),
    /Publication refusée/
  );

  // Un brouillon généré par IA reste enregistrable : la rédaction travaille.
  const draft = await serverDb.saveContentArticle(baseArticle({ generatedBy: 'ai', slug: 'brouillon-ia' }), 'admin-1');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.editorialCompliance.compliant, false);

  // Publié avec signalement : accepté, et la transparence est portée.
  const publishedDisclosed = await serverDb.saveContentArticle(
    baseArticle({ generatedBy: 'ai', aiDisclosure: true, slug: 'boucles-4c-entretien', status: 'published' }),
    'admin-1'
  );
  assert.equal(publishedDisclosed.status, 'published');
  assert.equal(publishedDisclosed.editorialCompliance.mode, 'ai_disclosed');
  assert.equal(publishedDisclosed.generatedBy, 'ai');

  // Publié sous contrôle éditorial nommé : accepté.
  const publishedControlled = await serverDb.saveContentArticle(
    baseArticle({
      generatedBy: 'ai',
      slug: 'cuir-chevelu-sensible',
      status: 'published',
      editorialReview: { reviewedBy: 'Amina Traoré', reviewedAt: REVIEWED_AT, responsibilityAccepted: true }
    }),
    'admin-1'
  );
  assert.equal(publishedControlled.status, 'published');
  assert.equal(publishedControlled.editorialCompliance.mode, 'ai_editorial_control');

  // Un texte humain se publie sans rien prouver.
  const humanArticle = await serverDb.saveContentArticle(
    baseArticle({ generatedBy: 'human', slug: 'lavage-doux', status: 'published' }),
    'admin-1'
  );
  assert.equal(humanArticle.status, 'published');
  assert.equal(humanArticle.editorialCompliance.mode, 'human');

  // ---------------------------------------------------------------------
  // 3. Le public voit le signalement, l'administration voit l'audit.
  // ---------------------------------------------------------------------
  const publicArticles = await serverDb.getPublishedArticles();
  const disclosedPublic = publicArticles.find((article: any) => article.slug === 'boucles-4c-entretien');
  assert.ok(disclosedPublic, 'l’article publié avec signalement doit être accessible publiquement');
  assert.equal(disclosedPublic.generatedBy, 'ai');
  assert.equal(disclosedPublic.aiDisclosure, AI_DISCLOSURE_LABEL);
  const humanPublic = publicArticles.find((article: any) => article.slug === 'lavage-doux');
  assert.equal(humanPublic.aiDisclosure, null);

  const report = await serverDb.getEditorialComplianceReport();
  assert.equal(report.total, 4);
  assert.equal(report.notCompliant, 1);
  const flagged = report.articles.find(article => article.slug === 'brouillon-ia');
  assert.ok(flagged && flagged.compliant === false);
  assert.ok(flagged!.missing.length > 0);

  // ---------------------------------------------------------------------
  // 4. Les routes CMS ne sont pas ouvertes au public.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const write = await fetch(`${baseUrl}/api/admin/content/articles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'attacker', 'x-admin-key': 'forged' },
      body: JSON.stringify(baseArticle({ generatedBy: 'ai', status: 'published' }))
    });
    assert.equal(write.status, 401);

    const audit = await fetch(`${baseUrl}/api/admin/content/compliance`);
    assert.equal(audit.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] AI Act 50(4) banc : règle appliquée à la publication, exemption exige une personne nommée, audit et transparence publics.');
}

runAiActCmsTests().catch(error => {
  console.error('[FAIL] AI Act 50(4) banc :', error);
  process.exitCode = 1;
});
