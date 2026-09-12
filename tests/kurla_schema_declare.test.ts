/**
 * BANC — le schéma que le code interroge est déclaré quelque part
 * ==============================================================
 *
 * Vercel déploie à chaque pousse ; les migrations Supabase s'appliquent à
 * la main. Rien ne signale l'écart entre les deux, et le code déployé peut
 * interroger une table que la base n'a pas.
 *
 * Mesuré le 12/09/2026 : `photo_ai_analyses` et `push_subscriptions`
 * étaient absentes de la production alors que le code les requêtait déjà
 * (`photoAnalysisStore.ts`, `pushSubscriptionStore.ts`). Aucune erreur
 * visible — les notifications push partent dans un `.catch` qui se contente
 * d'une ligne de journal : la fonctionnalité a l'air de marcher et
 * n'envoie jamais rien.
 *
 * Ce banc ne peut pas interroger la base (il tourne en mémoire, comme les
 * autres). Il vérifie ce qui est vérifiable sans elle : **toute table
 * requêtée par le code est déclarée dans une migration**. L'écart restant
 * — une migration déclarée mais non appliquée — relève de
 * `scripts/verifier-schema.mjs`, lancé à la mise en ligne.
 *
 * La logique d'extraction est partagée avec ce vérificateur
 * (`scripts/lib/schema.mjs`) pour que les deux ne divergent pas.
 */

import assert from 'node:assert/strict';
import { objetsDeclares, tablesRequetees, sansCommentaires, MOTIF_TABLE, MOTIF_VUE } from '../scripts/lib/schema.mjs';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const declarees = objetsDeclares();
const requetees = tablesRequetees();

ok('l’extracteur lit réellement les migrations et le code', () => {
  // Sans ce contrôle, un extracteur cassé qui ne renverrait rien ferait
  // passer tous les autres dans le vide : zéro table, zéro écart.
  assert.ok(declarees.size > 50, `seulement ${declarees.size} objets déclarés — l’extracteur est cassé`);
  assert.ok(requetees.size > 50, `seulement ${requetees.size} tables requêtées — l’extracteur est cassé`);
});

ok('toute table requêtée par le code est déclarée dans une migration', () => {
  const orphelines = [...requetees.keys()].filter((table) => !declarees.has(table));
  if (orphelines.length === 0) return;
  assert.fail(
    `${orphelines.length} table(s) requêtée(s) sans migration déclarée — une requête\n` +
    `      qui ne peut pas aboutir, ou une table créée hors migrations :\n` +
    orphelines.map((t) => `      ${t}  (premier usage : ${requetees.get(t)})`).join('\n')
  );
});

ok('l’extracteur voit juste (auto-vérification)', () => {
  const nomDe = (sql: string) => [...sql.matchAll(MOTIF_TABLE)].map((m) => m[1]);

  // Les formes courantes de déclaration.
  assert.deepEqual(nomDe('CREATE TABLE IF NOT EXISTS public.foo ('), ['foo'], 'if not exists + schéma');
  assert.deepEqual(nomDe('create table bar();'), ['bar'], 'minuscules');
  assert.deepEqual(nomDe('create table "ma_table" ('), ['ma_table'], 'nom entre guillemets');
  assert.deepEqual(nomDe('create table only baz ('), ['baz'], 'only');
  assert.deepEqual(nomDe('create table if not exists\n  qux ('), ['qux'], 'saut de ligne');

  // Et le piège réel : un commentaire parle de DDL sans en être.
  const commentaire = "-- son `CREATE TABLE IF NOT EXISTS` saute la création\n-- not CREATE TABLE IF NOT EXISTS only:\ncreate table reel (";
  assert.deepEqual(nomDe(sansCommentaires(commentaire)), ['reel'], 'un commentaire a été pris pour du DDL');
  assert.deepEqual(nomDe(commentaire).filter((n) => n === 'IF' || n === 'only'), ['IF', 'only'],
    'sans le nettoyage, le commentaire produit des tables fantômes — c’est bien pour cela qu’il existe');

  // Bloc de commentaire également.
  assert.deepEqual(nomDe(sansCommentaires('/* create table fantome ( */ create table vraie (')), ['vraie']);

  // Le code interroge aussi des vues : `batch_order_trace` et
  // `professional_dossier_access` en sont, et elles sont déclarées par
  // `CREATE VIEW`. Les ignorer les faisait passer pour des requêtes sans
  // déclaration aucune.
  const nomDeVue = (sql: string) => [...sql.matchAll(MOTIF_VUE)].map((m) => m[1]);
  assert.deepEqual(nomDeVue('CREATE VIEW public.batch_order_trace AS'), ['batch_order_trace']);
  assert.deepEqual(nomDeVue('create or replace view ma_vue as'), ['ma_vue']);
  assert.deepEqual(nomDeVue('CREATE MATERIALIZED VIEW public.mv_x AS'), ['mv_x']);
  assert.deepEqual(nomDeVue('create view if not exists v2 as'), ['v2']);
});

console.log(`\n${checks} contrôles passés — schéma : ${declarees.size} tables déclarées, ${requetees.size} requêtées par le code\n`);
