/**
 * CHANTIER 8.2 — Inventaire de l'API du store : le filet du découpage.
 *
 * `src/lib/serverDb.ts` fait 6 240 lignes et porte tout le SQL. Le découper par
 * domaine sans filet, c'est perdre une méthode sans s'en apercevoir : un appel
 * `serverDb.getReturnsByUser()` disparu ne casse pas au chargement, il casse à la
 * première demande de retour client.
 *
 * Ce banc énumère ce qui est **réellement appelable** sur le singleton — méthodes
 * du prototype *et* méthodes ajoutées par composition — avec leur arité, et le
 * compare à un inventaire de référence. Toute différence est une régression :
 * une méthode ajoutée doit l'être volontairement, une méthode disparue doit être
 * expliquée.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { serverDb } from '../src/lib/serverDb';

const FIXTURE = path.join(process.cwd(), 'tests', 'fixtures', 'store_api_inventory.json');

function describeApi(target: object): string[] {
  const entries = new Map<string, number>();

  // Méthodes ajoutées par composition (assignées sur l'instance) puis méthodes de
  // la chaîne de prototypes : les deux font partie de l'API appelable.
  for (const source of [target, ...prototypeChain(target)]) {
    for (const name of Object.getOwnPropertyNames(source)) {
      if (name === 'constructor' || entries.has(name)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(source, name);
      if (typeof descriptor?.value !== 'function') continue;
      entries.set(name, descriptor.value.length);
    }
  }

  return [...entries.entries()]
    .map(([name, arity]) => `${name}/${arity}`)
    .sort((a, b) => a.localeCompare(b));
}

function prototypeChain(target: object): object[] {
  const chain: object[] = [];
  let current = Object.getPrototypeOf(target);
  while (current && current !== Object.prototype) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  return chain;
}

async function main(): Promise<void> {
  const api = describeApi(serverDb);

  assert.ok(api.length > 100, `Attendu plus de 100 méthodes sur le store, obtenu ${api.length}.`);

  // Quelques points d'entrée critiques : s'ils disparaissent, rien d'autre n'a
  // d'importance. Vérifiés explicitement pour que le message soit lisible.
  for (const required of ['saveOrder', 'getOrderById', 'getProducts', 'getProductById', 'processStripeRefund', 'initialize']) {
    assert.ok(api.some(entry => entry.startsWith(`${required}/`)), `Méthode critique absente du store : ${required}`);
  }

  // Régénération volontaire : KURLA_UPDATE_FIXTURE=1. À utiliser quand une
  // fonctionnalité ajoute des méthodes au store (chantier 8.3 par exemple). Le
  // banc affiche alors exactement ce qui change, pour que la mise à jour de la
  // référence reste un acte conscient et non un réflexe.
  if (process.env.KURLA_UPDATE_FIXTURE === '1') {
    const previous = existsSync(FIXTURE)
      ? (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { methods: string[] }).methods
      : [];
    const removed = previous.filter(entry => !api.includes(entry));
    const added = api.filter(entry => !previous.includes(entry));
    writeFileSync(FIXTURE, `${JSON.stringify({ generatedAt: new Date().toISOString(), methods: api }, null, 2)}\n`);
    console.log(
      `[PASS] Inventaire de référence mis à jour : ${api.length} méthodes. ` +
        `Ajoutées : ${added.join(', ') || 'aucune'}. Retirées ou arité modifiée : ${removed.join(', ') || 'aucune'}.`
    );
    return;
  }

  if (!existsSync(FIXTURE)) {
    mkdirSync(path.dirname(FIXTURE), { recursive: true });
    writeFileSync(FIXTURE, `${JSON.stringify({ generatedAt: new Date().toISOString(), methods: api }, null, 2)}\n`);
    console.log(`[PASS] Inventaire de l'API du store créé : ${api.length} méthodes figées dans ${path.relative(process.cwd(), FIXTURE)}.`);
    return;
  }

  const reference = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { methods: string[] };
  const missing = reference.methods.filter(entry => !api.includes(entry));
  const added = api.filter(entry => !reference.methods.includes(entry));

  assert.deepEqual(
    { missing, added },
    { missing: [], added: [] },
    `L'API du store a changé.\n  Disparues ou arité modifiée : ${missing.join(', ') || 'aucune'}\n  Nouvelles : ${added.join(', ') || 'aucune'}`
  );

  console.log(
    `[PASS] Chantier 8.2 : ${api.length} méthodes appelables sur le store, identiques à l'inventaire de référence ` +
    `(nom + arité), points d'entrée critiques présents.`
  );
}

try {
  await main();
} catch (error) {
  console.error('[FAIL] Chantier 8.2 — inventaire de l’API du store :', error);
  process.exitCode = 1;
}
