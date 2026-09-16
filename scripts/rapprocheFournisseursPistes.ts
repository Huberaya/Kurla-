/**
 * RAPPROCHEMENT PISTE → FOURNISSEUR
 * =================================
 *
 * Objet : relier `sourcing_prospects.supplier_id` aux fiches de `suppliers`,
 * pour qu'une information saisie sur un fournisseur apparaisse partout où ce
 * fournisseur est mentionné.
 *
 * Constat mesuré le 16/09/2026 : 30 fiches dans `suppliers`, 28 dans
 * `sourcing_prospects`, **0 lien** entre les deux, et 3 noms communs. Remplir
 * une fiche ne changeait donc rien ailleurs : l'information existait sans être
 * rattachée.
 *
 * Pourquoi la fonction de pliage est importée et non réécrite : une
 * approximation « à peu près » en SQL ou dans ce script lierait des fiches qui
 * n'ont rien à voir. `normalizeSupplierName` est la seule définition de
 * l'identité d'un fournisseur dans ce projet — on l'importe, on ne la
 * redevine pas. Un banc vérifie qu'aucune copie ne peut diverger.
 *
 * Règles :
 *   · une piste n'est reliée que si **un seul** fournisseur correspond ;
 *   · une piste déjà reliée n'est jamais écrasée ;
 *   · rien n'est recopié d'une table dans l'autre — on pose un lien, pas un
 *     doublon ;
 *   · simulation par défaut ; `APPLIQUER=1` pour écrire.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { normalizeSupplierName } from '../src/lib/db/supplierStore';

/** Une fiche telle qu'on en a besoin ici, et rien de plus. */
export interface FicheFournisseur { id: string; legal_name?: string | null; trade_name?: string | null }
export interface FichePiste { id: string; name?: string | null; supplier_id?: string | null }

export interface Rapprochement {
  aRelier: { id: string; nom: string; supplierId: string }[];
  ambigus: { id: string; nom: string; candidats: string[] }[];
  sansCorrespondance: string[];
  dejaRelies: string[];
}

/**
 * Logique pure du rapprochement : séparée de l'accès réseau pour être
 * vérifiée par un banc. Une piste n'est reliée que si **un seul** fournisseur
 * correspond ; deux candidats valent mieux qu'un lien faux, alors on ne fait
 * rien et on nomme l'ambiguïté.
 */
export function rapprocher(fournisseurs: FicheFournisseur[], pistes: FichePiste[]): Rapprochement {
  const index = new Map<string, Set<string>>();
  for (const f of fournisseurs) {
    for (const nom of [f.legal_name, f.trade_name]) {
      const cle = normalizeSupplierName(nom);
      if (!cle) continue;
      if (!index.has(cle)) index.set(cle, new Set());
      index.get(cle)!.add(f.id);
    }
  }

  const resultat: Rapprochement = { aRelier: [], ambigus: [], sansCorrespondance: [], dejaRelies: [] };
  for (const p of pistes) {
    const nom = p.name ?? '';
    if (p.supplier_id) { resultat.dejaRelies.push(nom); continue; }
    const cle = normalizeSupplierName(nom);
    const trouves = cle ? index.get(cle) : undefined;
    if (!trouves || trouves.size === 0) { resultat.sansCorrespondance.push(nom); continue; }
    if (trouves.size > 1) { resultat.ambigus.push({ id: p.id, nom, candidats: [...trouves] }); continue; }
    resultat.aRelier.push({ id: p.id, nom, supplierId: [...trouves][0] });
  }
  return resultat;
}

const URL_BASE = process.env.SUPABASE_URL;
const CLE = process.env.SUPABASE_SECRET_KEY;
const APPLIQUER = process.env.APPLIQUER === '1';

async function lire(chemin: string): Promise<any[]> {
  const reponse = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    headers: { apikey: CLE!, Authorization: `Bearer ${CLE}` }
  });
  if (!reponse.ok) return [];
  const corps = await reponse.json();
  return Array.isArray(corps) ? corps : [];
}

async function ecrire(id: string, supplierId: string): Promise<boolean> {
  const reponse = await fetch(`${URL_BASE}/rest/v1/sourcing_prospects?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: CLE!,
      Authorization: `Bearer ${CLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ supplier_id: supplierId })
  });
  return reponse.ok;
}

async function colonnePresente(): Promise<boolean> {
  const reponse = await fetch(`${URL_BASE}/rest/v1/sourcing_prospects?select=supplier_id&limit=1`, {
    headers: { apikey: CLE!, Authorization: `Bearer ${CLE}` }
  });
  return reponse.ok;
}

async function main(): Promise<void> {
  if (!URL_BASE || !CLE) {
    console.error('Il faut SUPABASE_URL et SUPABASE_SECRET_KEY.');
    process.exit(1);
  }

  console.log(`Rapprochement piste → fournisseur\n  ${URL_BASE}\n`);

  const presente = await colonnePresente();
  if (!presente) {
    console.log('ÉTAT : la colonne sourcing_prospects.supplier_id n’existe pas encore.');
    console.log('      Appliquer d’abord supabase/migrations/20261004000000_supplier_link.sql,');
    console.log('      puis rejouer ce script. Rien n’a été écrit.');
    return;
  }

  const [fournisseurs, pistes] = await Promise.all([
    lire('suppliers?select=id,legal_name,trade_name'),
    lire('sourcing_prospects?select=id,name,supplier_id')
  ]);
  console.log(`  ${fournisseurs.length} fournisseurs · ${pistes.length} pistes\n`);

  const { aRelier, ambigus, sansCorrespondance, dejaRelies } = rapprocher(fournisseurs, pistes);

  console.log('RÉSULTAT DU RAPPROCHEMENT');
  console.log(`  déjà reliées          : ${dejaRelies.length}`);
  console.log(`  à relier              : ${aRelier.length}`);
  console.log(`  ambiguës (non touchées): ${ambigus.length}`);
  console.log(`  sans correspondance   : ${sansCorrespondance.length}\n`);

  for (const r of aRelier) console.log(`   relier  ${r.nom}  →  ${r.supplierId}`);
  for (const a of ambigus) console.log(`   AMBIGU  ${a.nom}  →  ${a.candidats.join(' | ')}`);

  if (aRelier.length > 0) {
    const fichier = path.join(process.cwd(), 'docs', 'RAPPROCHEMENT_PISTES_annulation.sql');
    writeFileSync(
      fichier,
      `-- Annulation du rapprochement — à exécuter dans l'éditeur SQL Supabase.\n` +
      `-- Remet supplier_id à NULL pour les ${aRelier.length} piste(s) reliées.\n\n` +
      aRelier
        .map(r => `UPDATE public.sourcing_prospects SET supplier_id = NULL WHERE id = '${r.id}'; -- ${r.nom}`)
        .join('\n') +
      `\n\nNOTIFY pgrst, 'reload schema';\n`,
      'utf8'
    );
    console.log(`\n  annulation écrite : ${path.relative(process.cwd(), fichier)}`);
  }

  if (!APPLIQUER) {
    console.log('\nSIMULATION — rien n’a été écrit. APPLIQUER=1 pour exécuter.');
    return;
  }

  let ecrits = 0;
  for (const r of aRelier) if (await ecrire(r.id, r.supplierId)) ecrits++;
  console.log(`\nAPPLIQUÉ — ${ecrits}/${aRelier.length} piste(s) reliée(s).`);
}

// Ce fichier exporte `rapprocher` pour être vérifié par un banc : il ne doit
// donc rien déclencher à l'import.
const estLanceDirectement = () =>
  (process.argv[1] || '').replace(/\\/g, '/').endsWith('rapprocheFournisseursPistes.ts');

if (estLanceDirectement()) {
  main().catch(erreur => {
    console.error('Échec :', erreur);
    process.exit(1);
  });
}
