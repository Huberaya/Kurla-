import { serverDb } from '../src/lib/serverDb';
import { calculateKurlaFit } from '../src/lib/kurlaFit';
import { createEmptyBeautyProfile, normalizeBeautyProfile } from '../src/lib/beautyProfile';
import { isSupabaseServerConfigured } from '../src/lib/supabaseClient';

async function runBeautyProfileTests() {
  if (isSupabaseServerConfigured()) {
    console.log('[SKIP] Beauty profile fallback tests: a real Supabase server is configured.');
    return;
  }

  const userId = 'beauty-profile-test-user';
  const empty = createEmptyBeautyProfile();
  const profile = normalizeBeautyProfile({
    ...empty,
    hair: {
      ...empty.hair,
      texturePatterns: ['4C', '3C'],
      curlPattern: 'mixte',
      porosity: 'forte',
      density: 'forte',
      dryness: 'forte',
      breakage: 'frequente',
      scalpCondition: 'gras',
      scalpConcerns: ['demangeaisons'],
      zones: {
        ...empty.hair.zones,
        scalp: { ...empty.hair.zones.scalp, dryness: 'faible', concerns: ['sebum'] },
        ends: { ...empty.hair.zones.ends, dryness: 'forte', breakage: 'frequente' }
      }
    },
    skin: {
      ...empty.skin,
      sensitivity: 'moyenne',
      hyperpigmentationTendency: 'frequente',
      postInflammatoryMarks: 'frequentes',
      hydration: 'deshydratee',
      spfUsage: 'parfois'
    },
    environment: { ...empty.environment, climate: 'froid_sec', waterQuality: 'calcaire' }
  });

  const saved = await serverDb.saveBeautyProfile(userId, profile);
  if (saved.confidence.overall <= 0 || saved.profile.hair.texturePatterns.length !== 2) throw new Error('Le profil détaillé n’a pas été normalisé et enregistré.');

  const loaded = await serverDb.getBeautyProfile(userId);
  if (!loaded || loaded.profile.hair.zones.ends.breakage !== 'frequente') throw new Error('Le profil enregistré n’est pas relisible.');

  const history = await serverDb.getBeautyProfileHistory(userId);
  if (history.length !== 1 || history[0].confidence.overall !== saved.confidence.overall) throw new Error('L’historique du profil n’a pas été créé.');

  const fit = calculateKurlaFit({ category: 'cheveux', needs: ['hydrater_cheveux', 'reduire_casse'] }, saved.profile);
  if (fit.score !== 100 || fit.evidence.length === 0 || fit.reasons.length === 0) throw new Error('Le KURla Fit n’est pas calculé à partir de preuves explicables.');

  await serverDb.deleteBeautyProfile(userId);
  if (await serverDb.getBeautyProfile(userId)) throw new Error('La suppression du profil beauté a échoué.');
  if ((await serverDb.getBeautyProfileHistory(userId)).length !== 0) throw new Error('La suppression de l’historique beauté a échoué.');

  console.log('[PASS] Beauty profile: données détaillées, historique, KURla Fit explicable et suppression validés.');
}

runBeautyProfileTests().catch(error => {
  console.error('[FAIL] Beauty profile tests:', error);
  process.exitCode = 1;
});
