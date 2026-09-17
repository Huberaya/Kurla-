/**
 * CHANTIER 16 — Connecteurs API fail-closed.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_CONNECTORS_YEAR1,
  CONNECTOR_CATALOG,
  FORBIDDEN_AGGREGATORS,
  SIGNED_CONNECTOR_CONTRACTS,
  apiConnectorsAdminNote,
  attemptConnectorCall,
  hairAccessoryDoesNotNeedApi,
  isConnectorLive,
  liveConnectors,
  year1ApisAreOff,
} from '../src/lib/apiConnectors';
import { AFFILIATE_TRACKING_LIVE } from '../src/lib/affiliateOffer';
import { THREE_PL_WMS_LIVE } from '../src/lib/threePlProcedure';

let checks = 0;
const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`  ✓ ${label}`); };

console.log('\n=== C16 — Connecteurs API (fail-closed) ===\n');

ok('année 1 : toutes les API éteintes, 0 contrat signé', () => {
  assert.equal(API_CONNECTORS_YEAR1, false);
  assert.equal(THREE_PL_WMS_LIVE, false);
  assert.equal(AFFILIATE_TRACKING_LIVE, false);
  assert.deepEqual([...SIGNED_CONNECTOR_CONTRACTS], []);
  assert.equal(year1ApisAreOff(), true);
  assert.deepEqual(liveConnectors(), []);
});

ok('catalogue : live=false, contrat=null, pas d’agrégateur', () => {
  assert.ok(CONNECTOR_CATALOG.length >= 6);
  for (const row of CONNECTOR_CATALOG) {
    assert.equal(row.live, false);
    assert.equal(row.signedContractId, null);
    assert.equal(isConnectorLive(row.id), false);
    assert.equal((FORBIDDEN_AGGREGATORS as readonly string[]).includes(row.id), false);
  }
});

ok('sync / commande / ASN / pixel : refus nommé, jamais ok', () => {
  const actions = ['sync_stock', 'push_order', 'asn', 'generate_affiliate_link', 'postback'] as const;
  for (const action of actions) {
    const refused = attemptConnectorCall({ connectorId: 'africanfabs', action });
    assert.equal(refused.ok, false);
    assert.equal(refused.live, false);
    assert.match(refused.reason, /contrat|mailto|année 1/i);
  }
});

ok('contrat inventé refusé', () => {
  const refused = attemptConnectorCall({
    connectorId: 'huboo',
    action: 'asn',
    claimedContractId: 'contrat-invente-2026',
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /inventé/);
});

ok('agrégateur hors an 1 refusé', () => {
  const refused = attemptConnectorCall({ connectorId: 'aliexpress', action: 'push_order' });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /agrégateur/);
});

ok('cosmétique Skin : pas d’API dropship', () => {
  const refused = attemptConnectorCall({
    connectorId: 'africanfabs',
    action: 'push_order',
    category: 'peau',
    sourceModel: 'dropshipping',
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /Skin|cosmétique/i);
});

ok('accessoire Hair p35 n’a pas besoin d’API', () => {
  assert.equal(hairAccessoryDoesNotNeedApi('p35'), true);
  assert.equal(hairAccessoryDoesNotNeedApi('launch-p35'), true);
});

ok('note admin honnête', () => {
  assert.match(apiConnectorsAdminNote(), /0 contrat/);
  assert.match(apiConnectorsAdminNote(), /0 appel/);
});

ok('aucun fetch HTTP vers un connecteur dans src/', () => {
  const banned = /(?:fetch|axios|got)\s*\(\s*['"`]https?:\/\/[^'"`]*(africanfabs|afrowholesale|huboo|cubyn|aliexpress|cjdrop|spocket|zendrop)/i;
  const apiHost = /https?:\/\/(?:api|openapi)\.(?:africanfabs|afrowholesale|huboo|cubyn)/i;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(path);
    }
  };
  walk('src');
  const hits: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (banned.test(text) || apiHost.test(text)) hits.push(file);
  }
  assert.deepEqual(hits, []);
});

ok('C16 ne réécrit pas launchCatalog / fulfillment', () => {
  const src = readFileSync('src/lib/apiConnectors.ts', 'utf8');
  assert.match(src, /aucun appel réseau/);
  assert.match(src, /Hair/);
  const launch = readFileSync('src/lib/launchCatalog.ts', 'utf8');
  const fulfillment = readFileSync('src/lib/fulfillment.ts', 'utf8');
  assert.match(launch, /export const LAUNCH_PRODUCTS/);
  assert.match(fulfillment, /export const TAMPON_3PL/);
});

console.log(`\n[PASS] C16 connecteurs : ${checks} recettes.`);
