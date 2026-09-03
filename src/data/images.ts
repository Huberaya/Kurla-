// Photographie de marque : réelle, vérifiée, et représentative des personnes à qui
// KURLA s'adresse — femmes, hommes et enfants afro-descendants / métis, cheveux
// texturés, peaux riches en mélanine.
//
// Source unique : src/data/brandImages.ts (généré par scripts/buildBrandVisuals.py).
// Chaque visuel porte son texte alternatif en français et son crédit photographe.
//
// Règles tenues par ce fichier :
//  - aucun visuel ne provient d'une banque d'images générée par IA ;
//  - aucun visuel ne montre une personne qui ne correspond pas à l'audience ;
//  - aucun visuel n'est utilisé pour affirmer quelque chose qu'il ne montre pas
//    (ces photos sont décoratives, elles ne sont ni des produits ni des avis).
import { BRAND_IMAGES } from './brandImages';
import type { BrandImage } from '../types';

/** Image plein écran de la page d'accueil. */
export const HERO_IMAGE: BrandImage = BRAND_IMAGES.afroStudio;
/** Poster du héros (avant lecture d'un éventuel média). */
export const HERO_VIDEO_FRAME: BrandImage = BRAND_IMAGES.afroStudio;

export const AFRICAN_WOMAN_COMBING_IMAGE: BrandImage = BRAND_IMAGES.washDay;
export const STYLIST_IMAGE: BrandImage = BRAND_IMAGES.salonStyling;
export const MELANIN_SKIN_IMAGE: BrandImage = BRAND_IMAGES.skincareTowel;
export const KIDS_CARE_IMAGE: BrandImage = BRAND_IMAGES.childNature;
export const PROTECTIVE_IMAGE: BrandImage = BRAND_IMAGES.braidsYellow;
export const MEN_GROOMING_IMAGE: BrandImage = BRAND_IMAGES.manSmile;

export interface TextureGalleryItem {
  id: string;
  title: string;
  tag: string;
  cat: string;
  href: string;
  image: BrandImage;
}

export const TEXTURE_GALLERY: TextureGalleryItem[] = [
  {
    id: '1',
    title: 'Cheveux crépus 4C',
    tag: 'Volume & nutrition',
    cat: '4c',
    href: '/diagnostic/cheveux',
    image: BRAND_IMAGES.afroPortrait,
  },
  {
    id: '2',
    title: 'Boucles 3B/3C',
    tag: 'Définition & équilibre',
    cat: 'boucles',
    href: '/diagnostic/cheveux',
    image: BRAND_IMAGES.textureCurls,
  },
  {
    id: '3',
    title: 'Knotless braids',
    tag: 'Coiffure protectrice',
    cat: 'braids',
    href: '/protective-styles',
    image: BRAND_IMAGES.braidsYellow,
  },
  {
    id: '4',
    title: 'Locks & microlocks',
    tag: 'Soin du cuir chevelu',
    cat: 'braids',
    href: '/diagnostic/cheveux?need=locks',
    image: BRAND_IMAGES.locsGlasses,
  },
  {
    id: '5',
    title: 'Éclat peau mélaninée',
    tag: 'Éclat & protection',
    cat: 'skin',
    href: '/melanin-skin',
    image: BRAND_IMAGES.skincareTowel,
  },
  {
    id: '6',
    title: 'Démêlage enfant',
    tag: 'Douceur sans larmes',
    cat: 'kids',
    href: '/kids',
    image: BRAND_IMAGES.childNature,
  },
  {
    id: '7',
    title: 'Grooming homme',
    tag: 'Waves & barbe',
    cat: 'hommes',
    href: '/hommes',
    image: BRAND_IMAGES.manCrewNeck,
  },
  {
    id: '8',
    title: 'Votre coiffeuse formée aux textures',
    tag: 'Gestes de pro',
    cat: 'pro',
    href: '/professionnels',
    image: BRAND_IMAGES.salonStyling,
  },
];
