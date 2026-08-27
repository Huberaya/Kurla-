import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

import { intelligenceStore } from '../src/lib/intelligenceStore';
import { resolveRoute } from '../src/lib/routeTable';
import { computeArchetypeRating } from '../src/lib/outcomeEvidence';
import { evaluateReplenishment } from '../src/lib/shelf';
import { checkJurisdiction } from '../src/lib/ingredientGraph';
import { summarizeReturnInsights } from '../src/lib/returnInsight';
import { handleContradiction } from '../src/lib/proEndorsement';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';

/**
 * CHANTIER A — Fermer les trous.
 *
 * L'objet de ce test n'est pas de re-vérifier la logique pure : elle l'est déjà
 * ailleurs. Il vérifie que les cinq fonctions qui étaient en état « logique
 * seule » — testées mais jamais appelées par rien — sont désormais atteignables
 * depuis le store, donc depuis une route.
 *
 * Chaque assertion passe par `intelligenceStore`, le vrai chemin de production.
 */
async function runChantierATests(): Promise<void> {
  const userId = 'chantier-a-user';

  // Purge de départ : le store est un singleton partagé entre les suites.
  await intelligenceStore.deleteIntelligenceData(userId);

  const profile = createEmptyBeautyProfile();
  profile.hair.curlPattern = '4c';
  profile.hair.porosity = 'forte';

  // ---------------------------------------------------------------------
  // 1. NOTE PAR ARCHÉTYPE — computeArchetypeRating branché
  // ---------------------------------------------------------------------

  const derivation = await intelligenceStore.syncUserArchetype(userId, profile);
  assert.ok(derivation.id, 'L’archétype doit être dérivé pour rattacher les avis.');

  // 1a. Sous le seuil k : la note n'est pas publiée.
  intelligenceStore.seedReviewForTest('prod-shea', userId, 5);
  const belowThreshold = await intelligenceStore.getArchetypeRatingsForProduct('prod-shea');
  assert.equal(belowThreshold.length, 1, 'Un archétype avec un avis doit apparaître.');
  assert.equal(belowThreshold[0].publishable, false, 'Sous le seuil k, la note ne doit pas être publiée.');
  assert.equal(belowThreshold[0].rating, null, 'Une note non publiable doit rester null.');
  assert.ok(belowThreshold[0].suppressionReason, 'La raison de la suppression doit être donnée.');

  // 1b. Un avis d'utilisateur sans archétype déclaré n'est rattachable à aucun
  //     archétype. C'est voulu : KURLA ne devine pas la texture d'un avisant.
  //     Le chemin Supabase applique la même règle par jointure.
  intelligenceStore.seedReviewForTest('prod-shea', 'utilisateur-sans-profil', 1);
  const unattributed = await intelligenceStore.getArchetypeRatingsForProduct('prod-shea');
  assert.equal(unattributed[0].reviewCount, 1, 'Un avis sans archétype ne doit pas être compté.');

  // 1c. Au seuil : la note est publiée. Le seuil par défaut est 5.
  //     Chaque avisant doit avoir un archétype déclaré pour être rattachable.
  for (let index = 0; index < 4; index += 1) {
    const otherUserId = `autre-user-${index}`;
    await intelligenceStore.syncUserArchetype(otherUserId, profile);
    intelligenceStore.seedReviewForTest('prod-shea', otherUserId, 4);
  }
  const publishable = await intelligenceStore.getArchetypeRatingsForProduct('prod-shea');
  assert.equal(publishable.length, 1);
  assert.equal(publishable[0].reviewCount, 5, 'Les cinq avis rattachables doivent être comptés.');
  assert.equal(publishable[0].publishable, true, 'Au seuil k, la note doit être publiée.');
  assert.ok(typeof publishable[0].rating === 'number', 'Une note publiable doit être un nombre.');

  // 1c. Le store et la fonction pure donnent le même résultat : la preuve que
  //     le store appelle bien computeArchetypeRating et non une copie.
  const direct = computeArchetypeRating('prod-shea', derivation.id, derivation.labelFr, [5, 4, 4, 4, 4]);
  assert.equal(publishable[0].rating, direct.rating, 'Le store doit déléguer à computeArchetypeRating.');
  assert.equal(publishable[0].reviewCount, direct.reviewCount);

  // 1d. Un produit sans avis ne renvoie pas de note inventée.
  const empty = await intelligenceStore.getArchetypeRatingsForProduct('prod-inexistant');
  assert.deepEqual(empty, [], 'Sans avis, aucune note ne doit être fabriquée.');

  // ---------------------------------------------------------------------
  // 2. RÉASSORT PRÉDICTIF — evaluateReplenishment branché
  // ---------------------------------------------------------------------

  await intelligenceStore.addShelfItem(userId, {
    freeLabel: 'Shampooing doux',
    status: 'in_use',
    routineStep: 'cleanse',
    estimatedRemainingPercent: 15
  });
  await intelligenceStore.addShelfItem(userId, {
    freeLabel: 'Masque inconnu',
    status: 'owned',
    routineStep: 'deep_condition'
    // Pas de consommation déclarée : le signal doit le dire, pas deviner.
  });

  const replenishment = await intelligenceStore.evaluateShelfReplenishment(userId, 5);
  assert.equal(replenishment.signals.length, 2, 'Les deux articles actifs doivent être évalués.');
  assert.equal(replenishment.due.length, 1, 'Un seul article est sous le seuil de notification.');
  assert.equal(replenishment.due[0].label, 'Shampooing doux');
  assert.ok(replenishment.due[0].daysUntilEmpty !== null, 'Avec une consommation déclarée, la date de fin est estimable.');

  const undeclared = replenishment.signals.find(signal => signal.label === 'Masque inconnu');
  assert.ok(undeclared, 'L’article sans consommation doit rester dans les signaux.');
  assert.equal(undeclared!.shouldNotify, false, 'Sans consommation déclarée, aucune notification.');
  assert.equal(undeclared!.daysUntilEmpty, null, 'Sans consommation déclarée, aucune date inventée.');
  assert.match(undeclared!.message, /ne peut pas estimer|devine pas/i, 'Le message doit dire que KURLA ne devine pas.');

  // Preuve de délégation : le store appelle bien evaluateReplenishment.
  const shelfItems = await intelligenceStore.getShelf(userId);
  const directSignal = evaluateReplenishment(
    shelfItems.find(item => item.freeLabel === 'Shampooing doux')!,
    { weeklyUsagePercent: 5 }
  );
  assert.equal(
    replenishment.signals.find(signal => signal.label === 'Shampooing doux')!.daysUntilEmpty,
    directSignal.daysUntilEmpty,
    'Le store doit déléguer à evaluateReplenishment.'
  );

  // ---------------------------------------------------------------------
  // 3. FILTRAGE PAR JURIDICTION — checkJurisdiction branché
  // ---------------------------------------------------------------------

  intelligenceStore.seedJurisdictionRestrictionForTest({
    ingredientId: 'hydroquinone',
    jurisdiction: 'US',
    status: 'restricted',
    limitPercent: 2,
    reference: 'FDA OTC monograph'
  });
  intelligenceStore.seedJurisdictionRestrictionForTest({
    ingredientId: 'mercury',
    jurisdiction: 'US',
    status: 'prohibited',
    reference: 'FDA'
  });

  const usFindings = await intelligenceStore.assessJurisdiction(['hydroquinone', 'glycerin'], 'US');
  assert.equal(usFindings.length, 1, 'Seul l’ingrédient réglementé doit remonter.');
  assert.equal(usFindings[0].ingredientId, 'hydroquinone');
  assert.equal(usFindings[0].status, 'restricted');

  const prohibited = await intelligenceStore.assessJurisdiction(['mercury'], 'US');
  assert.equal(prohibited[0].status, 'prohibited');

  // Une autre juridiction ne doit pas hériter des règles US.
  const frFindings = await intelligenceStore.assessJurisdiction(['mercury'], 'FR');
  assert.deepEqual(frFindings, [], 'Les règles d’une juridiction ne doivent pas déborder sur une autre.');

  // Preuve de délégation.
  const directJurisdiction = checkJurisdiction(
    ['mercury'],
    await intelligenceStore.getJurisdictionRestrictions('US'),
    'US'
  );
  assert.equal(prohibited[0].status, directJurisdiction[0].status, 'Le store doit déléguer à checkJurisdiction.');

  // ---------------------------------------------------------------------
  // 4. INTELLIGENCE DES RETOURS — summarizeReturnInsights branché
  // ---------------------------------------------------------------------

  // 4a. Un motif invalide est refusé : un retour non motivé n'est pas exploitable.
  await assert.rejects(
    () => intelligenceStore.recordReturnInsight(userId, 'ret-1', { reason: 'motif_inventé' }),
    /Motif de retour invalide/,
    'Un motif hors vocabulaire doit être refusé.'
  );

  // 4b. Un motif valide est enregistré.
  const insight = await intelligenceStore.recordReturnInsight(userId, 'ret-2', {
    orderId: 'ord-1',
    productId: 'prod-shea',
    reason: 'too_heavy',
    textureMismatch: true,
    shared: true
  });
  assert.equal(insight.reason, 'too_heavy');
  assert.equal(insight.archetypeId, derivation.id, 'Le retour doit être rattaché à l’archétype de l’utilisateur.');
  assert.equal(insight.isShared, true, 'Le partage doit refléter le consentement explicite.');

  // 4c. Sans consentement, le retour n'est pas marqué partagé.
  const privateInsight = await intelligenceStore.recordReturnInsight(userId, 'ret-3', {
    productId: 'prod-shea',
    reason: 'reaction'
  });
  assert.equal(privateInsight.isShared, false, 'Le consentement ne doit jamais être présumé.');

  // 4d. Le résumé passe par summarizeReturnInsights.
  const summary = await intelligenceStore.summarizeProductReturns('prod-shea', 100);
  assert.equal(summary.productId, 'prod-shea');
  assert.equal(summary.totalReturns, 2, 'Les deux retours du produit doivent être comptés.');
  const directSummary = summarizeReturnInsights(
    'prod-shea',
    await intelligenceStore.getReturnInsightRecords('prod-shea'),
    { soldQuantity: 100 }
  );
  assert.equal(summary.totalReturns, directSummary.totalReturns, 'Le store doit déléguer à summarizeReturnInsights.');
  assert.equal(summary.informativeReturns, directSummary.informativeReturns);

  // ---------------------------------------------------------------------
  // 5. CO-SIGNATURE PROFESSIONNELLE — handleContradiction branché
  // ---------------------------------------------------------------------

  // 5a. Une co-signature sans justification est refusée.
  await assert.rejects(
    () => intelligenceStore.createEndorsement({
      professionalId: 'pro-1',
      professionalName: 'Dr. Test',
      professionalVerified: true,
      clientUserId: userId,
      stance: 'approved',
      rationale: '   '
    }),
    /sans justification/,
    'Une co-signature sans justification ne doit pas être enregistrée.'
  );

  // 5b. Une contradiction prime sur l'IA et est escaladée.
  const contradiction = await intelligenceStore.createEndorsement({
    professionalId: 'pro-1',
    professionalName: 'Dr. Test',
    professionalVerified: true,
    clientUserId: userId,
    productId: 'prod-shea',
    stance: 'contradicted',
    rationale: 'Le beurre de karité est comédogène sur ce cuir chevelu.'
  });
  const action = intelligenceStore.applyProfessionalJudgement(contradiction);
  assert.equal(action.applyOverride, true, 'Une contradiction doit remplacer la recommandation de l’IA.');
  assert.notEqual(action.escalation, 'none', 'Une contradiction doit être escaladée, jamais ignorée.');
  assert.match(action.message, /contredit/i);

  // Preuve de délégation.
  assert.deepEqual(action, handleContradiction(contradiction), 'Le store doit déléguer à handleContradiction.');

  // 5c. Une approbation n'applique pas d'override.
  const approval = await intelligenceStore.createEndorsement({
    professionalId: 'pro-1',
    professionalName: 'Dr. Test',
    professionalVerified: true,
    clientUserId: userId,
    stance: 'approved',
    rationale: 'Routine adaptée à la porosité déclarée.'
  });
  assert.equal(intelligenceStore.applyProfessionalJudgement(approval).applyOverride, false);

  // 5d. Un professionnel non vérifié ne peut pas être affiché publiquement.
  const unverified = await intelligenceStore.createEndorsement({
    professionalId: 'pro-2',
    professionalName: 'Non vérifié',
    professionalVerified: false,
    clientUserId: userId,
    productId: 'prod-shea',
    stance: 'approved',
    rationale: 'Je valide.',
    isDisplayable: true,
    clientConsentAt: new Date().toISOString()
  });
  const gate = intelligenceStore.resolveEndorsementDisplay(unverified);
  assert.equal(gate.allowed, false, 'Un professionnel non vérifié ne doit pas co-signer publiquement.');
  assert.match(gate.reason || '', /vérifiée/i);

  // 5e. Le taux d'accord n'est pas publié sous le seuil d'échantillon.
  const impact = intelligenceStore.getProfessionalImpact('pro-1', [contradiction, approval]);
  assert.equal(impact.total, 2);
  assert.match(impact.statement, /échantillon|co-signature/i);

  // ---------------------------------------------------------------------
  // 6. WASH DAY — humidité et événements réellement transmis
  // ---------------------------------------------------------------------

  const serverSource = await readFile('server.ts', 'utf-8');
  assert.match(
    serverSource,
    /humidityPercent,\s*\n\s*hardWater: cycle\.hardWater/,
    'Le plan du wash day doit recevoir l’humidité, sinon la logique reste muette.'
  );
  assert.doesNotMatch(
    serverSource,
    /events: \[\],/,
    'Les événements ne doivent plus être codés en dur à vide.'
  );
  assert.match(
    serverSource,
    /kind: 'protective_style', occurredAt: activeStyle\.installedAt/,
    'Une coiffure protectrice active doit devenir un événement du cycle.'
  );

  // ---------------------------------------------------------------------
  // 7. ROUTES — les cinq branchements sont exposés
  // ---------------------------------------------------------------------

  const requiredRoutes: [string, RegExp][] = [
    ['GET /api/me/data', /app\.get\('\/api\/me\/data'/],
    ['DELETE /api/account', /app\.delete\('\/api\/account'/],
    ['GET archetype-ratings', /app\.get\('\/api\/products\/:productId\/archetype-ratings'/],
    ['GET /api/shelf/replenishment', /app\.get\('\/api\/shelf\/replenishment'/],
    ['POST returns insight', /app\.post\('\/api\/returns\/:returnId\/insight'/],
    ['GET admin return-insights', /app\.get\('\/api\/admin\/return-insights\/:productId'/],
    ['POST /api/jurisdiction/assess', /app\.post\('\/api\/jurisdiction\/assess'/],
    ['POST /api/endorsements', /app\.post\('\/api\/endorsements'/],
    ['GET product endorsements', /app\.get\('\/api\/products\/:productId\/endorsements'/],
    ['POST endorsement apply', /app\.post\('\/api\/endorsements\/:endorsementId\/apply'/]
  ];
  for (const [label, pattern] of requiredRoutes) {
    assert.match(serverSource, pattern, `La route ${label} doit exister.`);
  }

  // La suppression de compte exige une confirmation explicite.
  assert.match(serverSource, /confirm !== 'SUPPRIMER'/, 'La suppression doit exiger une confirmation explicite.');
  // L'export déclare ce qui est conservé plutôt que de le laisser deviner.
  assert.match(serverSource, /obligations comptables et fiscales/i, 'L’export doit déclarer la conservation légale.');

  // ---------------------------------------------------------------------
  // 8. ÉCRANS — recherche sémantique et routine builder
  // ---------------------------------------------------------------------

  const searchPage = await readFile('src/pages/SmartSearchPage.tsx', 'utf-8');
  assert.match(searchPage, /searchByQuery/, 'L’écran de recherche doit appeler l’API.');
  assert.match(searchPage, /unresolved/, 'Ce que le parseur n’a pas compris doit être affiché.');
  assert.match(searchPage, /n’ont pas été ignorés en silence|pas été ignorés/i, 'Le non-interprété doit être expliqué.');

  const routinePage = await readFile('src/pages/RoutineBuilderPage.tsx', 'utf-8');
  assert.match(routinePage, /buildRoutinePlan/, 'L’écran doit appeler l’API du routine builder.');
  assert.match(routinePage, /conflicts/, 'Les conflits détectés doivent être affichés.');
  assert.match(routinePage, /alreadyOwned/, 'Une étape déjà possédée ne doit pas être revendue.');
  assert.match(routinePage, /unfulfilled/, 'Une étape non pourvue doit être déclarée.');

  // Depuis le chantier 7.1, le routage est déclaratif : on vérifie que l'URL
  // résout réellement, au lieu de chercher le texte de l'ancienne cascade.
  assert.ok(resolveRoute('/recherche'), 'La recherche doit être routée.');
  assert.ok(resolveRoute('/routine-builder'), 'Le routine builder doit être routé.');

  const navSource = await readFile('src/components/Navbar.tsx', 'utf-8');
  assert.match(navSource, /href="\/recherche"/, 'La recherche doit être accessible depuis la navigation.');
  assert.match(navSource, /href="\/routine-builder"/, 'Le routine builder doit être accessible depuis la navigation.');

  // ---------------------------------------------------------------------
  // 9. PURGE DES DONNÉES FICTIVES
  // ---------------------------------------------------------------------

  const purged = [
    'src/components/UgcWallSection.tsx',
    'src/components/KurlaProSection.tsx',
    'src/components/ConsultationBookingModal.tsx',
    'src/pages/ProProfilePage.tsx'
  ];
  for (const file of purged) {
    const source = await readFile(file, 'utf-8');
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*MOCK_PROS[^}]*\}\s*from/,
      `${file} ne doit plus importer MOCK_PROS.`
    );
  }

  // Le mur UGC ne doit plus contenir de témoignage inventé.
  const ugc = await readFile('src/components/UgcWallSection.tsx', 'utf-8');
  assert.doesNotMatch(ugc, /name: '(Nadia|Kenza|Fatou|Awa)/, 'Aucun témoignage inventé ne doit subsister.');
  assert.match(ugc, /volontairement vide|Aucun témoignage/i, 'L’absence de témoignage doit être dite.');

  // Le profil pro ne doit plus afficher d'avis codés en dur.
  const proPage = await readFile('src/pages/ProProfilePage.tsx', 'utf-8');
  assert.doesNotMatch(proPage, /author: '(Sonia|Clarisse)/, 'Aucun avis client inventé ne doit subsister.');

  // Les images Unsplash ne sont pas des données fictives : elles restent.
  const gallery = await readFile('src/components/TextureGallerySection.tsx', 'utf-8');
  assert.match(gallery, /TEXTURE_GALLERY/, 'La galerie de textures ne contient que des images, elle est conservée.');

  // ---------------------------------------------------------------------
  // 10. VOCABULAIRES CONTRÔLÉS — la migration remplit les tables vides
  // ---------------------------------------------------------------------

  const migration = await readFile('supabase/migrations/20260847000000_kurla_taxonomy_terms.sql', 'utf-8');
  assert.match(migration, /INSERT INTO public\.kurla_taxonomy_terms/, 'La migration doit insérer des termes.');
  for (const need of ['hydrater_cheveux', 'reduire_casse', 'definir_boucles', 'taches_hyperpigmentation']) {
    assert.match(migration, new RegExp(`'${need}'`), `Le besoin ${need} doit être dans le vocabulaire.`);
  }
  for (const texture of ['3A', '4C']) {
    assert.match(migration, new RegExp(`'${texture}'`), `La texture ${texture} doit être dans le vocabulaire.`);
  }
  // La dérive entre les deux codes concurrents est rendue visible, pas masquée.
  assert.match(migration, /parent_term_id = 'need_cuir_chevelu'/, 'La synonymie doit être explicite.');
  // Un vocabulaire contrôlé ne doit pas contenir de case « autre » libre.
  assert.doesNotMatch(migration, /'routine_step',\s*'other'/, '« other » ne doit pas entrer dans le vocabulaire.');
  // Garde-fou : aucune taxonomie vide.
  assert.match(migration, /Vocabulaire contrôlé incomplet/, 'Une taxonomie vide doit faire échouer la migration.');

  // ---------------------------------------------------------------------
  // Nettoyage
  // ---------------------------------------------------------------------

  await intelligenceStore.deleteIntelligenceData(userId);

  console.log('[PASS] Chantier A : les cinq fonctions en « logique seule » sont branchées sur le store et exposées par des routes, RGPD export/suppression en 1 clic, humidité et événements transmis au wash day, écrans de recherche et de routine builder câblés, données fictives purgées, vocabulaires contrôlés alimentés.');
}

runChantierATests().catch(error => {
  console.error('[FAIL] Chantier A — fermeture des trous:', error);
  process.exitCode = 1;
});
