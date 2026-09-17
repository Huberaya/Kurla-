/**
 * CHANTIER 3 — conversion piste → fournisseur, 0 nom libre.
 *
 * Invariants : upsertProspect n'écrit pas supplier_id ; la conversion est un
 * acte explicite ; un lien déjà posé n'est pas écrasé ; une piste n'est pas
 * une fiche.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { serverDb } from '../src/lib/serverDb';
import {
  seedInMemoryProspects,
  upsertProspect,
  listProspects,
  linkProspectSupplier,
  PROSPECT_CONTACT_TO_SUPPLIER_TYPE,
} from '../src/lib/db/prospectStore';
import { createSupplier } from '../src/lib/db/supplierStore';

const ADMIN = 'admin-c3';

function reset(): void {
  serverDb.inMemoryProspects = [];
  serverDb.inMemoryCandidates = [];
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  seedInMemoryProspects(serverDb);
}

let checks = 0;
function ok(label: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
    console.log(`  ✓ ${label}`);
  });
}

async function main(): Promise<void> {
  reset();

  await ok('upsertProspect ignore un supplierId passé en entrée', async () => {
    const updated = await upsertProspect(serverDb, ADMIN, {
      id: 'c01', name: 'Nappy Queen', route: 'A', status: 'emailed', supplierId: 'sup-invente',
    });
    assert.equal(updated.supplierId ?? null, null);
    const listed = (await listProspects(serverDb)).find(p => p.id === 'c01');
    assert.equal(listed?.supplierId ?? null, null);
  });

  await ok('créer la fiche depuis la piste : raison sociale = nom, non vérifiée', async () => {
    const result = await linkProspectSupplier(serverDb, ADMIN, 'c01', { create: true });
    assert.equal(result.created, true);
    assert.equal(result.supplier.legalName, 'Nappy Queen');
    assert.equal(result.supplier.verificationStatus, 'not_provided');
    assert.equal(result.prospect.supplierId, result.supplier.id);
    assert.equal(result.prospect.supplier?.legalName, 'Nappy Queen');
    assert.equal(result.supplier.supplierType, PROSPECT_CONTACT_TO_SUPPLIER_TYPE.brand_fr);
  });

  await ok('une mise à jour de statut ne casse pas le lien', async () => {
    const updated = await upsertProspect(serverDb, ADMIN, {
      id: 'c01', name: 'Nappy Queen', route: 'A', status: 'replied',
    });
    assert.equal(updated.status, 'replied');
    assert.ok(updated.supplierId);
    const listed = (await listProspects(serverDb)).find(p => p.id === 'c01');
    assert.equal(listed?.supplierId, updated.supplierId);
  });

  await ok('un lien déjà posé n’est pas écrasé', async () => {
    const other = await createSupplier(serverDb, ADMIN, { legalName: 'Autre Maison C3' });
    await assert.rejects(
      () => linkProspectSupplier(serverDb, ADMIN, 'c01', { supplierId: other.id }),
      /n’est pas écrasé|pas écrasé/,
    );
  });

  await ok('lier une piste à une fiche existante, sans créer', async () => {
    const fiche = await createSupplier(serverDb, ADMIN, { legalName: 'Weleda Conversion C3' });
    const result = await linkProspectSupplier(serverDb, ADMIN, 'c02', { supplierId: fiche.id });
    assert.equal(result.created, false);
    assert.equal(result.prospect.supplierId, fiche.id);
    assert.equal(result.supplier.id, fiche.id);
  });

  await ok('sans create ni supplierId : refus, rien n’est inventé', async () => {
    await assert.rejects(
      () => linkProspectSupplier(serverDb, ADMIN, 'c03', {}),
      /Indiquez un fournisseur/,
    );
    const listed = (await listProspects(serverDb)).find(p => p.id === 'c03');
    assert.equal(listed?.supplierId ?? null, null);
  });

  await ok('les panneaux catalogue/lots/pipeline/identifiés passent par SupplierName', () => {
    const src = join(process.cwd(), 'src');
    const read = (relative: string) => readFileSync(join(src, relative), 'utf8');
    const panels = [
      'components/CatalogAdminPanel.tsx',
      'components/BatchAdminPanel.tsx',
      'components/CatalogPipelinePanel.tsx',
      'components/IdentifiedProductsPanel.tsx',
      'components/ProductLifecyclePanel.tsx',
      'components/ProductSourcesPanel.tsx',
      'components/SourcingProspectsPanel.tsx',
    ];
    const missing = panels.filter(panel => !read(panel).includes('<SupplierName'));
    assert.deepEqual(missing, [], `SupplierName manquant : ${missing.join(', ') || 'aucun'}`);
    assert.ok(read('server/routes/prospects.ts').includes('/prospects/:id/supplier'), 'route de conversion présente');
    assert.ok(!read('lib/db/prospectStore.ts').includes('supplier_id: record.supplierId'), 'upsertProspect n’écrit pas supplier_id');
  });

  console.log(`\n[PASS] Conversion piste → fournisseur (chantier 3) : ${checks} contrôles — acte explicite, 0 nom libre, lien non écrasé.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
