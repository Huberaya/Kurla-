/**
 * Garde de régression sur la liaison des stores.
 *
 * Bug couvert : les tests unitaires basculaient silencieusement sur la base
 * réelle dès que `SUPABASE_URL` et une clé secrète étaient présents dans
 * l'environnement. Le même `npm test` passait donc sur une machine et échouait
 * sur une autre, sur des identifiants de fixture non UUID et des contraintes de
 * clé étrangère. Ce test verrouille le comportement explicite introduit par
 * `KURLA_STORE_MODE`.
 */
import { strict as assert } from 'node:assert';
import {
  describeStoreBinding,
  getSupabaseStoreMode,
  isSupabaseServerConfigured,
} from '../src/lib/supabaseClient';

const FAKE_URL = 'https://example-project.supabase.co';
const FAKE_SECRET = 'service-role-key-not-a-real-key';

async function runStoreBindingTests() {
  const saved = {
    mode: process.env.KURLA_STORE_MODE,
    url: process.env.SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY,
  };

  try {
    // Configuration serveur crédible : c'est elle qui déclenchait le basculement
    // implicite vers la base réelle.
    process.env.SUPABASE_URL = FAKE_URL;
    process.env.SUPABASE_SECRET_KEY = FAKE_SECRET;

    // 1. Défaut historique préservé : base réelle si configurée.
    delete process.env.KURLA_STORE_MODE;
    assert.equal(getSupabaseStoreMode(), 'auto', 'le mode par défaut doit rester auto');
    assert.equal(isSupabaseServerConfigured(), true, 'auto + identifiants => base réelle');
    assert.equal(describeStoreBinding().binding, 'supabase');

    // 2. Le mode mémoire force le repli même avec des identifiants valides :
    //    c'est la garantie que recherche la suite unitaire.
    process.env.KURLA_STORE_MODE = 'memory';
    assert.equal(getSupabaseStoreMode(), 'memory');
    assert.equal(
      isSupabaseServerConfigured(),
      false,
      'KURLA_STORE_MODE=memory doit neutraliser la liaison à la base réelle'
    );
    assert.equal(describeStoreBinding().binding, 'memory');
    assert.equal(describeStoreBinding().credentialsPresent, true, 'les identifiants restent détectés');
    assert.equal(describeStoreBinding().unsatisfied, false);

    // 3. Le mode serveur sans identifiants est signalé, jamais simulé : un run
    //    « base réelle » ne doit pas pouvoir passer pour vert sur le repli mémoire.
    //    Les identifiants sont retirés ici : c'est la condition testée.
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.KURLA_STORE_MODE = 'server';
    assert.equal(describeStoreBinding().unsatisfied, true, 'server sans identifiants => insatisfait');
    assert.equal(describeStoreBinding().binding, 'memory');
    assert.equal(isSupabaseServerConfigured(), false);

    // Identifiants restaurés : le mode serveur devient satisfait.
    process.env.SUPABASE_URL = FAKE_URL;
    process.env.SUPABASE_SECRET_KEY = FAKE_SECRET;
    assert.equal(describeStoreBinding().unsatisfied, false, 'server + identifiants => satisfait');
    assert.equal(describeStoreBinding().binding, 'supabase');
    assert.equal(isSupabaseServerConfigured(), true);

    process.env.KURLA_STORE_MODE = 'SERVER';
    assert.equal(getSupabaseStoreMode(), 'server', 'la valeur doit être insensible à la casse');

    process.env.KURLA_STORE_MODE = 'n-importe-quoi';
    assert.equal(getSupabaseStoreMode(), 'auto', 'une valeur inconnue retombe sur auto');
  } finally {
    for (const [key, value] of Object.entries({
      KURLA_STORE_MODE: saved.mode,
      SUPABASE_URL: saved.url,
      SUPABASE_SECRET_KEY: saved.secret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log('[PASS] Liaison des stores explicite : memory/serveur/auto déterministes.');
}

runStoreBindingTests().catch(error => {
  console.error('[FAIL] Liaison des stores:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
