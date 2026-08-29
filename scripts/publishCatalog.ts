/**
 * CHANTIER 14 — ÉCRITURE DU CONTENU DES FICHES ET PUBLICATION.
 *
 * Le contenu vient de `docs/PROPOSITION_FICHES_PRODUITS.md` (soumis à relecture
 * le 29/08/2026). Rien n'est ajouté ici qui ne figure dans ce document : ce
 * script est un applicateur, pas un rédacteur.
 *
 * Deux produits sont exclus volontairement : p14 et p15 portent le nom de
 * marques tierces réelles (`Eadem`, `Black Girl Sunscreen`) et leurs visuels
 * montrent les produits de ces marques. Leur reprise sous marque KURLA attend
 * le nom que le propriétaire doit donner.
 *
 * Usage :
 *   … npx tsx scripts/publishCatalog.ts              # dry-run
 *   … npx tsx scripts/publishCatalog.ts --apply      # écrit, vérifie, publie
 */
import { getSupabaseServerClient } from '../src/lib/supabaseClient';
import { serverDb } from '../src/lib/serverDb';
import { recordCatalogValidation, getCatalogPublicationReadiness } from '../src/lib/db/catalogStore';

const ADMIN_ID = '00c987c2-b224-4b33-a43f-bd80ece98cb0'; // hubertbay@gmail.com, superadmin

/** Marques tierces : hors périmètre tant que la reprise n'est pas nommée. */
const EXCLUDED = ['p14', 'p15'];

interface FicheContent {
  benefitPrimary: string;
  forWho: string;
  notIdealIf: string;
  howToUse: string;
  texture: string;
  usageFrequency: string;
  warnings: string[];
  /** Réécriture d'une description non conforme, sinon la fiche est inchangée. */
  description?: string;
}

const CONTENT: Record<string, FicheContent> = {
  p1: {
    benefitPrimary: 'Scelle l’hydratation dans la fibre et facilite le démêlage.',
    forWho: 'Cheveux texturés 3C à 4C qui cassent au démêlage.',
    notIdealIf: 'Cheveux fins à faible densité : la texture riche peut alourdir. Allergie connue au beurre de mangue ou au cacao.',
    howToUse: 'Sur cheveux humides, une noisette répartie sur les longueurs et les pointes, en insistant sur les zones les plus sèches. Ne se rince pas.',
    texture: 'Crème riche et fondante.',
    usageFrequency: 'À chaque lavage, ou en retouche sur cheveux secs.',
    warnings: ['Usage externe.', 'Éviter le contact avec les yeux.', 'En cas d’irritation, espacer les applications et consulter si elle persiste.']
  },
  p2: {
    benefitPrimary: 'Nettoie le cuir chevelu sans décaper les huiles naturelles.',
    forWho: 'Cheveux texturés 3A à 4C, cuirs chevelus qui tiraillent après le lavage.',
    notIdealIf: 'Recherche d’un lavage clarifiant ponctuel : ce shampoing est conçu pour un nettoyage doux, pas pour un lavage agressif.',
    howToUse: 'Sur cuir chevelu mouillé, masser du bout des doigts, rincer abondamment. Un second passage est possible si les longueurs sont très chargées en coiffage.',
    texture: 'Gel lavant, mousse fine.',
    usageFrequency: 'À chaque lavage, selon le rythme habituel.',
    warnings: ['Usage externe.', 'Éviter le contact avec les yeux.']
  },
  p3: {
    benefitPrimary: 'Nourrit la fibre poreuse et limite la casse au brossage.',
    forWho: 'Cheveux 4A à 4C à porosité forte, longueurs rêches qui accrochent.',
    notIdealIf: 'Cheveux à faible porosité : un masque riche peut rester en surface et alourdir.',
    howToUse: 'Après le shampoing, sur cheveux essorés, appliquer sur les longueurs. Laisser poser le temps indiqué sur l’étiquette, démêler aux doigts, rincer abondamment.',
    texture: 'Masque épais.',
    usageFrequency: 'Une fois par semaine, ou après chaque séance de coiffage protecteur.',
    warnings: ['Usage externe.', 'Éviter le contact avec les yeux.']
  },
  p4: {
    benefitPrimary: 'Apaise les tiraillements du cuir chevelu après la pose de tresses.',
    forWho: 'Braids, twists et locks, cuirs chevelus qui tiraillent entre deux poses.',
    notIdealIf: 'Cuir chevelu lésé, irrité ou présentant des plaies. Sensibilité connue au menthol ou à la menthe poivrée.',
    howToUse: 'Vaporiser raie par raie sur le cuir chevelu, masser légèrement. Ne se rince pas.',
    texture: 'Spray aqueux léger.',
    usageFrequency: 'Au besoin, entre deux poses.',
    warnings: ['Usage externe.', 'Éviter les yeux et les muqueuses.', 'La présence d’huile de menthe poivrée peut être sensibilisante : test dans le pli du coude 24 h avant la première utilisation.']
  },
  p5: {
    benefitPrimary: 'Nourrit le cuir chevelu et les longueurs sans les alourdir.',
    forWho: 'Tous types de cheveux, cuirs chevelus secs, longueurs qui cassent.',
    notIdealIf: 'Cuir chevelu gras ou sujet aux folliculites : une huile peut entretenir l’obstruction.',
    howToUse: 'Quelques gouttes en massage du cuir chevelu, ou une goutte sur les pointes. Ne se rince pas.',
    texture: 'Huile sèche.',
    usageFrequency: '2 à 3 fois par semaine.',
    warnings: ['Usage externe.', 'Éviter le contact avec les yeux.', 'Test cutané préalable conseillé.']
  },
  p6: {
    description: 'Protection solaire à large spectre formulée pour les carnations riches en mélanine : fini invisible, sans trace blanche, qui s’associe au soin anti-marques pour limiter l’assombrissement des taches sous exposition.',
    benefitPrimary: 'Protège des UVA et UVB avec un fini invisible sur peaux mélaninées.',
    forWho: 'Peaux mates à foncées exposées au soleil, en complément d’un soin anti-marques.',
    notIdealIf: 'Exposition prolongée sans réapplication. Enfants sans avis médical.',
    howToUse: 'Dernière étape de la routine du matin, sur l’ensemble du visage et du cou. Réappliquer toutes les deux heures en cas d’exposition continue, et après avoir transpiré.',
    texture: 'Sérum fluide, fini invisible.',
    usageFrequency: 'Chaque matin, avec réapplication en exposition.',
    warnings: ['Aucune protection solaire n’est totale.', 'Réduire l’exposition aux heures les plus intenses.', 'L’exposition excessive au soleil est un risque pour la santé.']
  },
  p7: {
    benefitPrimary: 'Limite la friction du coton et préserve l’hydratation des longueurs pendant la nuit.',
    forWho: 'Tous types de cheveux texturés, coiffures protectrices et perruques.',
    notIdealIf: '',
    howToUse: 'Rassembler les longueurs, glisser le bonnet en partant de la nuque. Lavage à la main ou en cycle doux, séchage à l’air libre.',
    texture: 'Satin microfibre, format XL.',
    usageFrequency: 'Chaque nuit.',
    warnings: []
  },
  p8: {
    benefitPrimary: 'Démêle les spires serrées sans arracher les nœuds.',
    forWho: 'Cheveux 3B à 4C, démêlage sur cheveux humides.',
    notIdealIf: 'Démêlage à sec sur cheveux très emmêlés : le démêlage commence aux pointes, sur cheveux hydratés.',
    howToUse: 'Sur cheveux humides et imprégnés de leave-in, démêler des pointes vers les racines par sections.',
    texture: 'Picots flexibles.',
    usageFrequency: 'À chaque démêlage.',
    warnings: []
  },
  p9: {
    benefitPrimary: 'Définit les boucles et les twists avec de la brillance, sans effet cartonné.',
    forWho: 'Boucles 3B à 4A, coiffages qui durcissent ou s’effritent.',
    notIdealIf: 'Cheveux fins qui perdent le volume au coiffage.',
    howToUse: 'Sur cheveux humides, répartir par sections, froisser les longueurs vers le haut. Laisser sécher à l’air libre ou au diffuseur.',
    texture: 'Crème de coiffage souple.',
    usageFrequency: 'À chaque coiffage.',
    warnings: ['Usage externe.', 'Éviter le contact avec les yeux.']
  },
  p10: {
    benefitPrimary: 'Accompagne l’atténuation progressive des marques sombres.',
    forWho: 'Peaux mates, foncées ou mixtes, marques laissées par les imperfections.',
    notIdealIf: 'Peau lésée ou en poussée inflammatoire active. Grossesse ou allaitement sans avis médical.',
    howToUse: 'Matin et soir sur peau propre, quelques gouttes sur les zones concernées, puis crème hydratante. En journée, protection solaire indispensable.',
    texture: 'Sérum fluide.',
    usageFrequency: 'Matin et soir.',
    warnings: ['Usage externe.', 'Test cutané préalable conseillé.', 'Éviter le contour des yeux.', 'L’atténuation des marques prend plusieurs semaines et varie d’une peau à l’autre.']
  },
  p11: {
    benefitPrimary: 'Une routine de démêlage complète pour les enfants, sans tiraillement.',
    forWho: 'Enfants de 3 à 12 ans aux cheveux texturés.',
    notIdealIf: 'Cuir chevelu irrité ou lésé. Enfant de moins de 3 ans.',
    howToUse: 'Vaporiser le spray démêlant sur les longueurs humides, laisser agir quelques instants, démêler avec la brosse en partant des pointes, terminer par le leave-in. Utilisation par un adulte.',
    texture: 'Kit (spray + leave-in + brosse).',
    usageFrequency: 'À chaque démêlage.',
    warnings: ['Utilisation sous la surveillance d’un adulte.', 'Usage externe.', 'Éviter le contact avec les yeux.', 'En cas de contact, rincer abondamment à l’eau claire.']
  },
  p12: {
    benefitPrimary: 'Entretien complet des coiffures protectrices, du cuir chevelu à la nuit.',
    forWho: 'Braids, twists et locks, de la pose à la dépose.',
    notIdealIf: 'Cuir chevelu lésé ou sensible au menthol.',
    howToUse: 'Spray apaisant sur le cuir chevelu au besoin, huile sur les longueurs 2 à 3 fois par semaine, bonnet chaque nuit.',
    texture: 'Kit (spray + huile + bonnet satin).',
    usageFrequency: 'Selon les besoins, tout au long de la pose.',
    warnings: ['Usage externe.', 'Test cutané préalable conseillé pour les formules contenant de la menthe poivrée.']
  },
  p13: {
    description: 'Baume après-rasage à l’acide salicylique 1,5 % : il adoucit les poils drus, exfolie en surface pour limiter l’obstruction du follicule et apaise les sensations d’échauffement après le rasage.',
    benefitPrimary: 'Adoucit les poils drus et apaise la peau après le rasage.',
    forWho: 'Barbes à poils drus, peaux sensibles au rasage.',
    notIdealIf: 'Peau lésée, coupures de rasage ouvertes. Enfants. Allergie à l’acide salicylique.',
    howToUse: 'Après le rasage, sur peau propre et sèche, une fine couche sur la zone. Ne pas rincer. En journée, appliquer une protection solaire.',
    texture: 'Baume fondant.',
    usageFrequency: 'Après chaque rasage.',
    warnings: ['Usage externe.', 'L’acide salicylique peut être irritant : test cutané préalable conseillé.', 'En cas de boutons persistants, douloureux ou étendus, consulter un médecin : ce produit n’est pas un traitement.']
  },
  p16: {
    description: 'Réduit la friction nocturne et aide à conserver le niveau d’hydratation naturel de la peau et des cheveux.',
    benefitPrimary: 'Réduit la friction nocturne et aide à conserver l’hydratation des longueurs.',
    forWho: 'Tous types de cheveux, coiffures protectrices, perruques.',
    notIdealIf: '',
    howToUse: 'Enfiler sur l’oreiller, face soie au contact des cheveux. Lavage à la main ou cycle délicat à basse température, séchage à l’air libre.',
    texture: 'Soie de mûrier 22 momme.',
    usageFrequency: 'Chaque nuit ; lavage hebdomadaire.',
    warnings: []
  }
};

/**
 * Note d'attestation des visuels.
 *
 * Elle dit ce qui est vrai : ce sont des photos de stock sous licence Unsplash,
 * acceptées par le propriétaire en attendant les photos produit. Écrire
 * « visuels vérifiés » sans cette précision transformerait un choix assumé en
 * vérification qui n'a pas eu lieu.
 */
const IMAGE_NOTE = 'Visuels de stock sous licence Unsplash (17 lignes, product_images.url), acceptés par le propriétaire le 29/08/2026 en attendant le remplacement par les photos produit réelles. Droits couverts par la licence Unsplash : statut licensed. Aucun visuel ne montre le produit vendu.';
const BRAND_NOTE = 'Marque propre à KURLA : l’usage du nom et des actifs est attesté par le propriétaire (hubertbay@gmail.com, superadmin) le 29/08/2026.';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error('Base réelle indisponible.');

  const { data, error } = await supabase.from('products').select('id, name, brand, category').order('id');
  if (error) throw new Error(`Lecture du catalogue impossible : ${error.message}`);
  const rows = (data || []) as Array<{ id: string; name: string; brand: string; category: string }>;

  const targets = rows.filter(row => !EXCLUDED.includes(row.id));
  console.log(`${apply ? 'APPLICATION' : 'DRY-RUN'} — ${targets.length} produit(s), ${EXCLUDED.length} exclu(s) (${EXCLUDED.join(', ')}).\n`);

  let written = 0;
  let published = 0;
  const failures: string[] = [];

  for (const row of targets) {
    const content = CONTENT[row.id];
    if (!content) { failures.push(`${row.id} : aucun contenu proposé`); continue; }
    console.log(`${row.id} — ${row.name} [${row.brand} / ${row.category}]`);

    if (apply) {
      try {
        /**
         * Les droits sur les visuels ne s'écrivent que si les visuels sont
         * redéclarés (`imagesChanged` en interne) : passer le seul statut ne
         * change rien. On renvoie donc les visuels existants, inchangés, avec
         * leur statut de droits — c'est la déclaration, pas une modification.
         */
        const { data: imageRows, error: imageError } = await supabase
          .from('product_images')
          .select('url, alt, position, image_type')
          .eq('product_id', row.id)
          .order('position', { ascending: true });
        if (imageError) throw new Error(`Lecture des visuels impossible : ${imageError.message}`);
        const declaredImages = (imageRows || []).map((image: any, index: number) => ({
          url: String(image.url),
          alt: image.alt ? String(image.alt) : undefined,
          position: Number.isInteger(image.position) ? image.position : index,
          imageType: image.image_type === 'hero' || image.image_type === 'detail' ? image.image_type : 'gallery',
          ownershipStatus: 'licensed',
          sourceNote: 'Photo de stock sous licence Unsplash, en attente de remplacement par la photo produit.'
        }));

        await serverDb.saveCatalogProduct(ADMIN_ID, {
          id: row.id,
          images: declaredImages,
          benefitPrimary: content.benefitPrimary,
          forWho: content.forWho,
          notIdealIf: content.notIdealIf,
          howToUse: content.howToUse,
          texture: content.texture,
          usageFrequency: content.usageFrequency,
          warnings: content.warnings,
          ...(content.description ? { description: content.description } : {}),
          isActive: true,
          imageOwnershipStatus: 'licensed'
        });
        written += 1;
      } catch (writeError: any) {
        failures.push(`${row.id} : écriture refusée — ${writeError.message}`);
        console.log(`   ÉCRITURE REFUSÉE : ${writeError.message}`);
        continue;
      }

      // Redéclarer les visuels repasse le contrôle en `pending` : on le
      // réenregistre aussitôt, avec la même note.
      await recordCatalogValidation(serverDb as never, ADMIN_ID, row.id, 'images', 'passed', undefined, IMAGE_NOTE);
      await recordCatalogValidation(serverDb as never, ADMIN_ID, row.id, 'brand', 'passed', undefined, BRAND_NOTE);

      const readiness = await getCatalogPublicationReadiness(serverDb as never, row.id);
      if (readiness.ready) {
        await serverDb.updateCatalogStatus(row.id, 'published');
        published += 1;
        console.log('   → PUBLIÉ');
      } else {
        console.log(`   → non publiable : ${readiness.missing.map(item => item.label).join(' ; ')}`);
      }
    } else {
      console.log(`   ${Object.keys(content).length} champs à écrire${content.description ? ' (description réécrite)' : ''} + isActive + imageOwnershipStatus=licensed`);
    }
  }

  console.log(`\nécritures : ${written} | publiés : ${published} | échecs : ${failures.length}`);
  for (const failure of failures) console.log(`  · ${failure}`);
  if (EXCLUDED.length > 0) console.log(`\nExclus volontairement : ${EXCLUDED.join(', ')} — marques tierces, reprise en attente du nom choisi.`);
}

main().catch(error => {
  console.error('ÉCHEC :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
