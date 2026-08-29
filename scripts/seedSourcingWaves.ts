/**
 * CHANTIER 16C — ENREGISTREMENT DES BESOINS DE SOURCING, VAGUE 1.
 *
 * Le contenu vient de `docs/CHANTIER_16_APPROVISIONNEMENT.md` §B.2 (trous de
 * gamme hiérarchisés) et §G (définition de la vague 1). Rien n'est ajouté ici
 * qui ne figure dans ce document : ce script est un applicateur, pas un
 * rédacteur — exactement la discipline du script de publication du chantier 14.
 *
 * Ce qui n'est PAS ici, et qui ne peut pas y être :
 *   - aucun fournisseur : aucun n'a été contacté, aucun n'a répondu ;
 *   - aucun prix, MOQ ou délai : ces chiffres viennent d'un devis réel ;
 *   - aucun document de conformité : ils s'enregistrent avec fichier et date.
 *
 * Usage :
 *   … npx tsx scripts/seedSourcingWaves.ts              # dry-run
 *   … npx tsx scripts/seedSourcingWaves.ts --apply      # écrit puis vérifie
 */
import { createSourcingItem, listSourcingItems, getSourcingItem } from '../src/lib/db/sourcingStore';
import { serverDb } from '../src/lib/serverDb';

const ADMIN_ID = '00c987c2-b224-4b33-a43f-bd80ece98cb0'; // hubertbay@gmail.com, superadmin
const WAVE = 'vague-1';

/**
 * Socle exigé de tout cosmétique mis sur le marché dans l'Union. Ces quatre
 * pièces ne sont pas une préférence KURLA : sans elles, le produit ne peut pas
 * être notifié ni vendu.
 */
const COSMETIC_BASE = ['responsible_person', 'pif', 'cpsr', 'cpnp_notification'];

interface WaveItem {
  id: string;
  title: string;
  category: string;
  rationale: string;
  requiredDocuments: string[];
  specification?: string;
}

const WAVE_1: WaveItem[] = [
  {
    id: 'vague-1-apres-shampoing-rince',
    title: 'Après-shampoing rincé',
    category: 'soin capillaire',
    rationale:
      'Trou n°1 du catalogue. Le catalogue lave (p2) et scelle (p1), mais ne démêle pas sous la douche. ' +
      'Sur cheveux 4A-4C, l’après-shampoing est le geste qui précède tous les autres ; son absence rend la routine incomplète. ' +
      'C’est le premier produit à sourcer.',
    requiredDocuments: [...COSMETIC_BASE, 'gmp_iso_22716', 'certificate_of_analysis', 'microplastic_free']
  },
  {
    id: 'vague-1-shampoing-clarifiant',
    title: 'Shampoing clarifiant',
    category: 'soin capillaire',
    rationale:
      'Trou n°2 du catalogue. Le champ « à éviter si » de p2 dit lui-même qu’il n’est pas fait pour les résidus de coiffage épais. ' +
      'Or les coiffures protectrices (p4, p12) en produisent. Nous promettons un besoin que nous ne couvrons pas.',
    requiredDocuments: [...COSMETIC_BASE, 'gmp_iso_22716', 'certificate_of_analysis', 'microplastic_free']
  },
  {
    id: 'vague-1-faconnier-soins-cheveux',
    title: 'Façonnier qualifié pour les 9 soins cheveux',
    category: 'façonnage',
    rationale:
      'Vague 1 de la définition du chantier : un façonnier qualifié pour les 9 soins cheveux du catalogue. ' +
      'Les fiches ont été écrites au chantier 14, mais aucun produit n’a de fournisseur rattaché : ' +
      'la colonne supplier_id est vide sur les 16 références. Sans façonnier retenu, il n’y a ni lot, ni coût servi, ni traçabilité.',
    requiredDocuments: [...COSMETIC_BASE, 'gmp_iso_22716']
  }
];

/**
 * Les documents exigés des deux produits rincés incluent l’attestation sans
 * microplastique : l’interdiction AGEC vise les cosmétiques rincés au-delà de
 * 0,01 % de la masse, et elle est en vigueur depuis le 1er janvier 2026. Ce
 * n’est pas une marge de négociation, donc ce n’est pas négociable ici.
 */
function assertCoherent(): void {
  for (const item of WAVE_1) {
    if (item.title.toLowerCase().includes('shampoing') && !item.requiredDocuments.includes('microplastic_free')) {
      throw new Error(`${item.id} : un produit rincé doit exiger l'attestation sans microplastique.`);
    }
    for (const required of COSMETIC_BASE) {
      if (!item.requiredDocuments.includes(required)) throw new Error(`${item.id} : document cosmétique de base manquant (${required}).`);
    }
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  assertCoherent();

  const existing = await listSourcingItems(serverDb as never);
  const existingIds = new Set(existing.map(item => item.id));

  console.log(`\nCHANTIER 16C — vague 1 — mode ${apply ? 'ÉCRITURE' : 'DRY-RUN'}`);
  console.log(`Besoins déjà enregistrés : ${existing.length}`);

  for (const item of WAVE_1) {
    if (existingIds.has(item.id)) {
      console.log(`  = ${item.id} — déjà présent, inchangé`);
      continue;
    }
    if (!apply) {
      console.log(`  + ${item.id} — serait créé (${item.requiredDocuments.length} documents exigés)`);
      continue;
    }
    const created = await createSourcingItem(serverDb as never, ADMIN_ID, {
      id: item.id,
      wave: WAVE,
      title: item.title,
      category: item.category,
      rationale: item.rationale,
      requiredDocuments: item.requiredDocuments
    });
    console.log(`  + ${created.id} — créé, ${created.requiredDocuments.length} documents exigés`);
  }

  if (!apply) {
    console.log('\nAucune écriture. Relancez avec --apply pour enregistrer.');
    return;
  }

  // Vérification par relecture, pas par confiance en l'écriture.
  const after = await listSourcingItems(serverDb as never, WAVE);
  console.log(`\nVérification — besoins de la vague 1 relus : ${after.length}`);
  for (const item of WAVE_1) {
    const read = await getSourcingItem(serverDb as never, item.id);
    const ok = read
      && read.title === item.title
      && read.requiredDocuments.length === item.requiredDocuments.length
      && read.status === 'to_source';
    console.log(`  ${ok ? '✓' : '✗'} ${item.id} — statut ${read?.status}, documents ${read?.requiredDocuments.length}`);
    if (!ok) throw new Error(`Vérification échouée pour ${item.id}`);
  }

  console.log(`\nAucun fournisseur créé, aucun prix saisi, aucune demande envoyée.`);
  console.log(`Étape suivante : générer les demandes de prix, les compléter, les envoyer.`);
}

main().catch(error => {
  console.error('\n[ÉCHEC]', error?.message || error);
  process.exitCode = 1;
});
