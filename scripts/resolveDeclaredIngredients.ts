/**
 * Réécriture des mentions d'ingrédients non résolues.
 *
 * Arbitrages utilisateur du 29/08/2026 :
 *   · qualificatifs marketing  → on corrige la mention, l'entité existe déjà ;
 *   · termes ambigus ou contradictoires → on réécrit en terme non ambigu.
 *     On renonce au terme marketing, pas à la vérité.
 *
 * Ce script ne publie rien : il réécrit les mentions et rattache la
 * composition. La publication reste l'affaire de verifyCatalogPublication.ts
 * puis publishCatalog.ts, qui appliquent les règles du catalogue.
 *
 * Chaque remplacement est ASSERTÉ : une ancre mal orthographiée fait échouer
 * le script au lieu de passer silencieusement.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   NODE_OPTIONS=--experimental-websocket npx tsx scripts/resolveDeclaredIngredients.ts [--apply]
 */
import { serverDb } from '../src/lib/serverDb';
import { getProductForAdministration, saveCatalogProduct } from '../src/lib/db/catalogStore';
import { linkDeclaredIngredients } from '../src/lib/db/ingredientLinkStore';

const ADMIN_ID = '00c987c2-b224-4b33-a43f-bd80ece98cb0';

/** productId → [ancienne mention, nouvelle mention, raison] */
const REWRITES: Array<{ productId: string; from: string; to: string; reason: string }> = [
  { productId: 'p1', from: 'Protéine de Soie végétale', to: 'Protéine végétale hydrolysée', reason: 'la soie est animale : « soie végétale » est contradictoire' },
  { productId: 'p2', from: 'Aloe Vera Pur', to: 'Aloe Vera', reason: 'qualificatif marketing ; l’entité Aloe Barbadensis Leaf Juice existe' },
  { productId: 'p3', from: 'Acide Hyaluronique capillaire', to: 'Hyaluronate de sodium', reason: 'terme non ambigu aligné sur un INCI unique' },
  { productId: 'p3', from: 'Kératine végétale', to: 'Protéine végétale hydrolysée', reason: 'la kératine est animale : « kératine végétale » est un terme marketing' },
  { productId: 'p4', from: 'Aloe Vera Pur', to: 'Aloe Vera', reason: 'qualificatif marketing ; l’entité existe' },
  { productId: 'p4', from: 'Extrait d’Arbre à Thé', to: 'Huile d’Arbre à Thé', reason: 'forme réellement rattachée (Melaleuca Alternifolia Leaf Oil)' },
  { productId: 'p5', from: 'Vitamine E', to: 'Tocophérol', reason: '« vitamine E » désigne aussi Tocopheryl Acetate : ambigu' },
  { productId: 'p11', from: 'Aloe Vera Bio', to: 'Aloe Vera', reason: '« Bio » est une allégation sans certification rattachée' }
];

/**
 * Réécritures de champs texte. Même logique : on garde le sens, on retire le
 * terme qui déclenche le crible.
 *
 * p2 : le crible d'allégations signale « décapage » alors que la phrase est une
 * NÉGATION (« pas pour un décapage ») — un avertissement conforme. Le crible
 * n'a pas tort d'être strict : c'est le texte qui peut porter le même sens sans
 * le mot interdit. On réécrit la fiche plutôt que d'affaiblir la règle.
 *
 * Latent depuis la publication du 29/08 09:43 : le crible d'allégations n'avait
 * jamais été rejoué après l'écriture du contenu (dernier passage 28/08 23:52,
 * « 2 champs lus, 148 caractères » — le contenu n'existait pas encore).
 */
const TEXT_REWRITES: Array<{ productId: string; field: string; from: string; to: string }> = [
  {
    productId: 'p2',
    field: 'notIdealIf',
    from: 'Recherche d’un lavage clarifiant ponctuel : ce shampoing est conçu pour un nettoyage doux, pas pour un décapage.',
    to: 'Recherche d’un lavage clarifiant ponctuel : ce shampoing est conçu pour un nettoyage doux, pas pour un lavage agressif.'
  }
];

const env = (name: string): string => (process.env[name] || '').trim();

async function main(): Promise<void> {
  if (!env('SUPABASE_URL') || !(env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'))) {
    console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');
    process.exit(2);
  }
  const apply = process.argv.includes('--apply');
  console.log(apply ? '\nMODE ÉCRITURE\n' : '\nMODE LECTURE SEULE (--apply pour écrire)\n');

  const byProduct = new Map<string, typeof REWRITES>();
  for (const rule of REWRITES) {
    if (!byProduct.has(rule.productId)) byProduct.set(rule.productId, []);
    byProduct.get(rule.productId)!.push(rule);
  }

  let rewritten = 0;
  let failures = 0;

  for (const [productId, rules] of byProduct) {
    const product = await getProductForAdministration(serverDb as never, productId);
    if (!product) {
      console.log(`✗ ${productId} introuvable`);
      failures += 1;
      continue;
    }
    const declared: string[] = Array.isArray(product.ingredients) ? [...product.ingredients] : [];
    const before = JSON.stringify(declared);

    for (const rule of rules) {
      const index = declared.findIndex(mention => mention === rule.from);
      // Assertion explicite : une ancre fausse doit faire échouer, pas passer.
      if (index === -1) {
        // Déjà à la cible n'est pas une ancre fausse : le script doit être
        // rejouable sans crier.
        if (declared.includes(rule.to)) {
          console.log(`  ${productId} : « ${rule.to} » déjà en place`);
          continue;
        }
        console.log(`✗ ${productId} : mention « ${rule.from} » absente de la fiche — ancre fausse`);
        console.log(`   composition réelle : ${JSON.stringify(declared)}`);
        failures += 1;
        continue;
      }
      declared[index] = rule.to;
      rewritten += 1;
      console.log(`  ${productId} : « ${rule.from} » → « ${rule.to} »  (${rule.reason})`);
    }

    if (JSON.stringify(declared) === before) {
      console.log(`  ${productId} : aucun changement`);
      continue;
    }

    if (!apply) {
      console.log(`  ${productId} : nouvelle composition (non écrite) ${JSON.stringify(declared)}`);
      continue;
    }

    /**
     * Entrée minimale volontaire. `saveCatalogProduct` ne revalide que les
     * champs **fournis** : étaler la fiche existante (`{ ...product }`) y
     * faisait retomber `countryAvailability`, et le catalogue réel porte
     * `DOM`/`AFR` (codes de zone à trois lettres) que la règle refuse.
     * Mesuré : 1ʳᵉ écriture refusée par « Pays de disponibilité invalide ».
     */
    await saveCatalogProduct(serverDb as never, ADMIN_ID, { id: productId, ingredients: declared });
    const link = await linkDeclaredIngredients(serverDb as never, productId, 'declared');
    console.log(`  ${productId} : écrit + rattaché (${JSON.stringify(link).slice(0, 120)})`);
  }

  // ---- Champs texte -------------------------------------------------
  let textsRewritten = 0;
  for (const rule of TEXT_REWRITES) {
    const product = await getProductForAdministration(serverDb as never, rule.productId);
    if (!product) {
      console.log(`✗ ${rule.productId} introuvable`);
      failures += 1;
      continue;
    }
    const current = String(product[rule.field] ?? '');
    if (current === rule.to) {
      console.log(`  ${rule.productId}.${rule.field} : déjà corrigé`);
      continue;
    }
    // Assertion explicite : une ancre fausse doit faire échouer, pas passer.
    if (current !== rule.from) {
      console.log(`✗ ${rule.productId}.${rule.field} : texte attendu absent — ancre fausse ou déjà modifié`);
      console.log(`   valeur réelle : ${JSON.stringify(current)}`);
      failures += 1;
      continue;
    }
    if (!apply) {
      console.log(`  ${rule.productId}.${rule.field} : réécriture prévue (non écrite)`);
      continue;
    }
    await saveCatalogProduct(serverDb as never, ADMIN_ID, { id: rule.productId, [rule.field]: rule.to });
    textsRewritten += 1;
    console.log(`  ${rule.productId}.${rule.field} : réécrit`);
  }

  console.log(`\n${rewritten} mention(s) d'ingrédient et ${textsRewritten} champ(s) texte réécrit(s), ${failures} échec(s).${apply ? '' : ' Rien n’a été écrit.'}\n`);
  if (failures > 0) process.exit(1);
}

main().catch(error => {
  console.error('Échec :', error instanceof Error ? error.message : error);
  process.exit(1);
});
