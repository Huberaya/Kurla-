import { Product, ProductGalleryImage } from '../types';

export interface ProductImageAssets {
  hero: string;
  lifestyle?: string;
  gallery: ProductGalleryImage[];
}

/**
 * Returns only images attached to the published catalogue record. This helper
 * deliberately has no stock-photo or demo fallback: image ownership and
 * provenance are part of the publication gate.
 */
export function getEnrichedProductGallery(product: Product): ProductGalleryImage[] {
  if (product.galleryImages?.length) return product.galleryImages;
  if (!product.image) return [];
  const rawProduct = product as Product & { imageOwnershipStatus?: ProductGalleryImage['imageTrust']; imagesValidationStatus?: string };
  const ownership = rawProduct.imageOwnershipStatus || product.quality?.brandVerification === 'verified' && 'brand_provided';
  const trust = rawProduct.imagesValidationStatus === 'verified'
    ? (ownership === 'brand_provided' ? 'brand_provided' : ownership === 'licensed' ? 'licensed' : 'unverified')
    : product.quality?.imagesValidation === 'verified'
      ? (product.quality.brandVerification === 'verified' ? 'brand_provided' : 'licensed')
      : 'unverified';
  return [{
    url: product.image,
    label: 'Image du catalogue',
    type: 'hero',
    imageTrust: trust
  }];
}

export function buildProductLifestylePrompt(product: Product): string {
  return `Photographie éditoriale à produire pour ${product.name}, sans modifier ni remplacer les images validées du catalogue.`;
}
