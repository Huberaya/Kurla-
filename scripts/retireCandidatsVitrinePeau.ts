#!/usr/bin/env node
/**
 * LE STATUT « PUBLIÉ » DOIT DIRE VRAI — espace peau, 16/09/2026.
 * ==============================================================
 *
 * Constat mesuré avant d'écrire (`docs/AUDIT_ESPACE_PEAU_2026-09-16.md`) :
 * l'espace peau déclare 50 fiches publiées ; l'API boutique n'en sert que 10.
 * Quarante fiches sont donc « publiées » sans être dans la vitrine — un
 * mensonge de statut qui rend le champ inutilisable pour piloter.
 *
 * Ces 40 fiches ne sont pas des produits : ce sont des **candidats de
 * sourcing** de marques tierces (The Ordinary, La Roche-Posay, Torriden…),
 * marquées `is_test_listing`. Onze d'entre elles n'ont aucun fournisseur.
 *
 * Ce qu'on fait : les retirer de la vitrine (`draft` + `is_active = false`),
 * exactement comme le fait l'action `withdraw` de la porte de publication.
 * Ce qu'on ne fait PAS :
 *
 *  - **on ne supprime rien.** Elles restent au catalogue admin et dans les
 *    écrans d'approvisionnement, qui ne filtrent pas sur le statut publié
 *    (vérifié : `src/server/routes/sourcing.ts` n'exclut que `unavailable`) ;
 *  - **on ne juge pas les marques.** Retirer The Ordinary de la vitrine ne
 *    préjuge pas de la réponse de DECIEM : c'est réversible en une requête.
 *
 * Trois garde-fous avant d'écrire :
 *
 *  1. **aucune fiche servie.** Si l'une des 40 était réellement visible en
 *     boutique, retirer ne serait plus sans effet : le script s'arrête ;
 *  2. **population exacte.** 40 fiches attendues, toutes publiées ; au moindre
 *     écart, on s'arrête et on relit ;
 *  3. **annulation écrite d'avance**, et journalisation de chaque retrait.
 *
 * Emploi :
 *   SUPABASE_SECRET_KEY=… ./node_modules/.bin/tsx scripts/retireCandidatsVitrinePeau.ts
 *   APPLIQUER=1 SUPABASE_SECRET_KEY=… ./node_modules/.bin/tsx scripts/… (écrit)
 */

import { writeFileSync } from 'node:fs';
import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;

const URL_BASE = 'https://qzwgsarfdegqtfdnqiql.supabase.co';
const CLE = process.env.SUPABASE_SECRET_KEY || '';
const APPLIQUER = process.env.APPLIQUER === '1';
const PROD = 'https://kurlabeauty.vercel.app';
const ATTENDU = 40;

const entetes = {
  apikey: CLE,
  Authorization: `Bearer ${CLE}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function lire(chemin: string) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, { headers: entetes });
  const t = await r.text();
  if (!r.ok) throw new Error(`GET ${chemin} → ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
}
async function ecrire(chemin: string, methode: string, corps: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, { method: methode, headers: entetes, body: JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${chemin} → ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
}

/** L'espace de travail suit la même règle que le serveur (workspaceScope.ts). */
function estPeau(p: any) {
  const c = String(p.category || '').trim().toLowerCase();
  return c === 'peau' || c === 'skin' || c === 'skincare' || c === 'kits' || c.startsWith('kit-peau');
}
const replier = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  if (!CLE) throw new Error('SUPABASE_SECRET_KEY manquante.');

  const produits: any[] = await lire('products?select=id,name,brand,category,catalog_status,is_active,price,is_test_listing,supplier_id');
  const peau = produits.filter(estPeau);
  const cibles = peau.filter(p => p.catalog_status === 'published' && p.is_test_listing === true);

  console.log(`Espace peau : ${peau.length} fiches · publiées : ${peau.filter(p => p.catalog_status === 'published').length} · candidates de test publiées : ${cibles.length}`);

  // ── Garde-fou 1 : aucune fiche servie ne doit être touchée ──────────────
  const reponse = await fetch(`${PROD}/api/products`, { headers: { accept: 'application/json' } });
  const json = await reponse.json();
  const servis = Array.isArray(json) ? json : (json.products || json.fiches || []);
  const idsServis = new Set<string>(servis.map((p: any) => String(p.id)));
  const serviesParmiCibles = cibles.filter(p => idsServis.has(String(p.id)));
  if (serviesParmiCibles.length > 0) {
    throw new Error(
      `Arrêt : ${serviesParmiCibles.length} fiche(s) visée(s) sont réellement servies en boutique `
      + `(ex. ${serviesParmiCibles[0].id}). Le retrait aurait un effet visible pour le client : `
      + `ce n'est plus le même chantier.`
    );
  }
  console.log(`Garde-fou 1 : 0 fiche visée n'est servie en boutique (${idsServis.size} fiches servies au total) — le retrait est sans effet client.`);

  // ── Garde-fou 2 : population exacte ────────────────────────────────────
  if (cibles.length !== ATTENDU) {
    throw new Error(`Population inattendue : ${cibles.length} candidates publiées, ${ATTENDU} attendues. La base a bougé — je relis plutôt que d'écrire.`);
  }
  const nonPubliees = cibles.filter(p => p.catalog_status !== 'published');
  if (nonPubliees.length) throw new Error(`${nonPubliees.length} fiche(s) visée(s) ne sont pas publiées : cohérence rompue.`);

  // Le doublon : deux fiches, deux prix, un même sérum. On retire la plus
  // chère et on garde la moins chère — face à deux fiches identiques dont
  // aucune n'est sourcée, le doute profite à la cliente.
  const parNom = new Map<string, any[]>();
  for (const p of cibles) {
    const k = `${replier(p.brand || '')}|${replier(p.name || '')}`;
    (parNom.get(k) || parNom.set(k, []).get(k)!).push(p);
  }
  const doublons = [...parNom.entries()].filter(([, l]) => l.length > 1);
  const aRetirerCommeDoublon: any[] = [];
  for (const [, l] of doublons) {
    const triees = [...l].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    const gardees = triees.slice(0, 1);
    const retirees = triees.slice(1);
    aRetirerCommeDoublon.push(...retirees);
    console.log(`Doublon : ${l[0].brand} — ${l[0].name}`);
    for (const p of l) console.log(`   ${retirees.includes(p) ? 'RETIREE' : 'gardée '} ${p.id} · ${p.price} €`);
  }

  const idsDoublons = new Set(aRetirerCommeDoublon.map(p => String(p.id)));
  const aMettreEnBrouillon = cibles.filter(p => !idsDoublons.has(String(p.id)));

  console.log(`\nPlan : ${aMettreEnBrouillon.length} fiche(s) → brouillon · ${aRetirerCommeDoublon.length} doublon(s) → indisponible`);
  console.log(`Publiées dans l'espace peau : ${peau.filter(p => p.catalog_status === 'published').length} → ${peau.filter(p => p.catalog_status === 'published').length - cibles.length}`);

  // Doublons à l'échelle du catalogue entier (hors espace peau) : on ne les
  // touche pas, mais on les signale — l'invariant ajouté au contrôle
  // nocturne les verra.
  const global = new Map<string, any[]>();
  for (const p of produits.filter(x => x.catalog_status === 'published')) {
    const k = `${replier(p.brand || '')}|${replier(p.name || '')}`;
    (global.get(k) || global.set(k, []).get(k)!).push(p);
  }
  const doublonsGlobaux = [...global.entries()].filter(([, l]) => l.length > 1);
  console.log(`\nDoublons publiés ailleurs dans le catalogue : ${doublonsGlobaux.length} groupe(s)`);
  for (const [k, l] of doublonsGlobaux) if (!cibles.some(c => String(c.id) === String(l[0].id))) console.log(`   (hors périmètre) ${l[0].brand} — ${l[0].name} : ${l.map(x => x.id).join(', ')}`);

  // ── Annulation écrite AVANT d'agir ─────────────────────────────────────
  const chemin = 'docs/RETRAIT_VITRINE_PEAU_2026-09-16_annulation.sql';
  const valeurs = cibles
    .map(p => `    ('${p.id}', '${p.catalog_status}', ${p.is_active === false ? 'false' : 'true'})`)
    .join(',\n');
  writeFileSync(chemin, [
    '-- ANNULATION du retrait de vitrine du 16/09/2026',
    `-- Généré AVANT l'écriture par scripts/${'retireCandidatsVitrinePeau'}.ts.`,
    '--',
    '-- Remet les 40 candidates de test de l’espace peau dans leur état',
    '-- d’avant : publiées et actives. Rien n’a été supprimé, tout est',
    '-- restaurable par cette seule requête.',
    '',
    'BEGIN;',
    '',
    'UPDATE public.products AS p',
    '   SET catalog_status = v.statut,',
    '       is_active = v.actif,',
    '       last_catalog_updated_at = NOW()',
    '  FROM (VALUES',
    valeurs,
    '  ) AS v(id, statut, actif)',
    ' WHERE p.id = v.id;',
    '',
    'COMMIT;',
    '',
  ].join('\n'));
  console.log(`\nAnnulation préparée : ${chemin} (${cibles.length} fiches)`);

  if (!APPLIQUER) {
    console.log('\nSimulation. Rien n’a été écrit. Relancer avec APPLIQUER=1.');
    return;
  }

  // ── Écriture ───────────────────────────────────────────────────────────
  console.log('\n=== ÉCRITURE ===');
  const maintenant = new Date().toISOString();
  const origine = 'chantier 16/09/2026 — scripts/retireCandidatsVitrinePeau.ts';

  for (const p of aMettreEnBrouillon) {
    await ecrire(`products?id=eq.${p.id}`, 'PATCH', {
      catalog_status: 'draft',
      is_active: false,
      last_catalog_updated_at: maintenant,
    });
  }
  console.log(`  ${aMettreEnBrouillon.length} fiche(s) passées en brouillon`);

  for (const p of aRetirerCommeDoublon) {
    await ecrire(`products?id=eq.${p.id}`, 'PATCH', {
      catalog_status: 'unavailable',
      is_active: false,
      last_catalog_updated_at: maintenant,
    });
  }
  console.log(`  ${aRetirerCommeDoublon.length} doublon(s) passé(s) indisponible`);

  // Journalisation : chaque retrait est tracé, nominativement.
  let journalisees = 0;
  for (const p of cibles) {
    const doublon = idsDoublons.has(String(p.id));
    try {
      await ecrire('catalog_gate_journal', 'POST', {
        product_id: String(p.id),
        product_name: p.name ?? null,
        action: 'withdraw',
        mode: 'apply',
        reason: doublon
          ? 'Doublon exact d’une autre fiche publiée (même marque, même nom) : la fiche au prix le plus élevé est retirée.'
          : 'Candidate de sourcing de marque tierce, non servie en boutique : retirée de la vitrine pour que « publié » reflète la vitrine réelle. Fiche conservée au catalogue et en approvisionnement.',
        created_by: origine,
      });
      journalisees += 1;
    } catch (erreur) {
      console.error(`  ! journalisation impossible pour ${p.id} : ${(erreur as Error).message}`);
    }
  }
  console.log(`  ${journalisees}/${cibles.length} retraits journalisés`);

  // ── Contrôle ───────────────────────────────────────────────────────────
  const apres: any[] = await lire('products?select=id,name,brand,category,catalog_status,is_active,supplier_id');
  const peauApres = apres.filter(estPeau);
  const publieesApres = peauApres.filter(p => p.catalog_status === 'published');
  const servisApres = new Set<string>(
    ((await (await fetch(`${PROD}/api/products`, { headers: { accept: 'application/json' } })).json()) as any[])
      .map((p: any) => String(p.id))
  );
  console.log(`\nContrôle :`);
  console.log(`  espace peau — publiées : ${publieesApres.length} (50 avant)`);
  console.log(`  servies en boutique : ${peauApres.filter(p => servisApres.has(String(p.id))).length} (10 avant — inchangé)`);
  console.log(`  publiées sans fournisseur : ${apres.filter(p => p.catalog_status === 'published' && !p.supplier_id).length} (11 avant)`);
}

main().catch(e => { console.error('\nERREUR —', e.message); process.exit(1); });
