import { Product, ProductGalleryImage } from '../types';

// Pre-generated image URLs
const p1LifestyleImg = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
const p5LifestyleImg = 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80';

export interface ProductImageAssets {
  hero: string;
  lifestyle?: string;
  gallery: ProductGalleryImage[];
}

/**
 * Registry mapping product IDs to generated image assets and high-quality fallback visuals
 */
export const PRODUCT_IMAGE_REGISTRY: Record<string, ProductImageAssets> = {
  p1: {
    hero: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80',
    lifestyle: p1LifestyleImg,
    gallery: [
      { url: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: p1LifestyleImg, label: '2. Mise en scène Mangue & Cacao (Générée Studio)', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', label: '3. Texture & Onctuosité Cacao', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80', label: '4. Application sur longueurs crépues', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Format Flacon Pompe 250ml', type: 'size', isOfficial: false }
    ]
  },
  p5: {
    hero: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80',
    lifestyle: p5LifestyleImg,
    gallery: [
      { url: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: p5LifestyleImg, label: '2. Mise en scène Romarin & Carapate (Générée Studio)', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', label: '3. Goutte d’Huile Ambrée sur Pipette', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80', label: '4. Massage Cuir Chevelu au Quotidien', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Flacon Pipette Verre 50ml', type: 'size', isOfficial: false }
    ]
  }
};

/**
 * Service function to retrieve enriched image gallery for any product.
 */
export function getEnrichedProductGallery(product: Product): ProductGalleryImage[] {
  const registered = PRODUCT_IMAGE_REGISTRY[product.id];
  if (registered && registered.gallery && registered.gallery.length > 0) {
    return registered.gallery;
  }
  if (product.galleryImages && product.galleryImages.length > 0) {
    return product.galleryImages;
  }
  // Default dynamic gallery generation based on product category & attributes
  return [
    { url: product.image, label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
    { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', label: '2. Vue détaillée & Texture', type: 'detail', isOfficial: false },
    { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '3. Décor & Lifestyle Clean Beauty', type: 'lifestyle', isOfficial: false },
    { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80', label: '4. Application & Rituel de Soin', type: 'use', isOfficial: false },
    { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Format & Packaging Nomade', type: 'size', isOfficial: false }
  ];
}

/**
 * Service function to generate realistic lifestyle prompts tailored to specific products
 */
export function buildProductLifestylePrompt(product: Product): string {
  return `Photorealistic luxury lifestyle product photography of ${product.name} (${product.category}), set in an elegant modern spa bathroom with soft warm sunlight, organic wooden textures, clean aesthetic studio shot, high end cosmetics display.`;
}
