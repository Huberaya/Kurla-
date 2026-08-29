import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/**
 * Banc « le rôle d'un compte ne s'écrit jamais depuis le client ».
 *
 * Constat du 29/08/2026 : `AuthContext.fetchProfile` upsertait un profil de
 * repli avec `role: 'customer'` en dur, sur `onConflict: 'id'`. PostgREST ne
 * met à jour que les colonnes fournies — donc une simple lecture de profil en
 * échec **rétrogradait un compte existant**, y compris le seul superadmin.
 *
 * Et la rétrogradation est à sens unique : la politique RLS
 * « Profiles update policy » autorise l'écriture via `OR public.is_admin()`,
 * si bien que l'administrateur peut écraser son propre rôle ; ensuite
 * `is_admin()` renvoie faux et l'accès est définitivement perdu.
 *
 * Ce banc est une **garde de non-régression sur les sources**, pas un test
 * comportemental : reproduire la rétrogradation exigerait une session
 * administrateur réelle, qu'aucun banc ne peut fabriquer. Il vérifie les trois
 * conditions qui, ensemble, rendent la rétrogradation impossible.
 */
async function runAdminRoleGuardTests(): Promise<void> {
  const authContext = await readFile('src/context/AuthContext.tsx', 'utf8');
  const authMigration = await readFile('supabase/migrations/20260805100000_phase2_auth_profiles.sql', 'utf8');
  const initSchema = await readFile('supabase/migrations/20260804000000_init_kurla_schema.sql', 'utf8');

  // 1. Le payload de repli ne doit pas porter `role`.
  const payloadStart = authContext.indexOf('const newProfilePayload = {');
  assert.ok(payloadStart > -1, 'le payload de repli de fetchProfile est introuvable');
  const payloadEnd = authContext.indexOf('};', payloadStart);
  /**
   * Les commentaires sont retirés avant l'inspection : la garde doit lire le
   * code, pas la prose. Sans cela, le commentaire qui *explique* pourquoi
   * `role` est absent — et qui cite `role: 'customer'` — faisait échouer le
   * banc sur un fichier déjà corrigé.
   */
  const payload = authContext
    .slice(payloadStart, payloadEnd)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  assert.ok(
    !/\brole\s*:/.test(payload),
    'le payload de repli écrit `role` : une lecture de profil en échec rétrograderait un compte existant'
  );
  // Le payload doit quand même exister et porter l'identifiant.
  assert.ok(/\bid\s*:\s*userId/.test(payload), 'le payload de repli doit porter l’identifiant');

  // 2. La politique RLS doit continuer d'interdire l'auto-escalade.
  const updatePolicy = authMigration.slice(
    authMigration.indexOf('CREATE POLICY "Profiles update policy"'),
    authMigration.indexOf(';', authMigration.indexOf('CREATE POLICY "Profiles update policy"'))
  );
  assert.ok(updatePolicy.length > 0, 'politique « Profiles update policy » introuvable');
  assert.ok(
    /role IS NOT DISTINCT FROM/.test(updatePolicy),
    'la politique de mise à jour ne protège plus la colonne `role` : un compte pourrait s’auto-escalader'
  );

  // 3. Omettre `role` doit rester sans danger : la colonne a un défaut.
  assert.ok(
    /role TEXT NOT NULL DEFAULT 'customer'/.test(initSchema),
    'la colonne `role` n’a plus de défaut NOT NULL : omettre la colonne à l’insertion échouerait'
  );

  console.log(
    '[PASS] Garde rôle admin : le payload de repli n’écrit pas `role`, la politique RLS interdit toujours l’auto-escalade, et la colonne `role` a son défaut NOT NULL.'
  );
}

runAdminRoleGuardTests().catch(error => {
  console.error('[FAIL] Garde rôle admin :', error);
  process.exitCode = 1;
});
