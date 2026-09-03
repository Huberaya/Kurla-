import React, { useState } from 'react';
import type { BrandImage as BrandImageData } from '../types';

/**
 * Construit l'URL d'un visuel de marque.
 *
 * L'art-direction est faite côté CDN (imgix, servi par images.unsplash.com) :
 *  - `fit=crop` + `w` ET `h` => le ratio est imposé serveur, aucune image déformée,
 *    aucun décalage de mise en page (CLS) et pas de bande vide.
 *  - `crop=faces,entropy` => le cadrage garde le visage quand il y en a un, sinon
 *    il se cale sur la zone la plus « informative » de la photo.
 *  - `auto=format` => WebP/AVIF selon le navigateur.
 */
const UNSPLASH = 'https://images.unsplash.com';
const WIDTHS = [400, 600, 800, 1200, 1600, 2000];

export function brandImageSrc(image: BrandImageData, width: number, ratio: number, quality = 78): string {
  const height = Math.max(1, Math.round(width / ratio));
  const params = [
    'auto=format',
    'fit=crop',
    'crop=faces,entropy',
    `w=${width}`,
    `h=${height}`,
    `q=${quality}`,
  ];
  return `${UNSPLASH}/${image.photoId}?${params.join('&')}`;
}

export function brandImageSrcSet(image: BrandImageData, ratio: number, quality = 78): string {
  return WIDTHS.map((w) => `${brandImageSrc(image, w, ratio, quality)} ${w}w`).join(', ');
}

export interface BrandImageProps {
  image: BrandImageData;
  /**
   * Ratio largeur / hauteur du cadre. Il est appliqué au conteneur (CSS aspect-ratio)
   * ET à l'URL du CDN, donc le cadrage est identique avant et après chargement.
   */
  ratio: number;
  /** Attribut `sizes` — indispensable pour que le navigateur choisisse la bonne largeur. */
  sizes?: string;
  className?: string;
  wrapperClassName?: string;
  /** Désactive le lazy-loading (à réserver au tout premier écran). */
  priority?: boolean;
  /**
   * Voile chaud optionnel : harmonise les photos entre elles et les rattache à la
   * palette KURLA (cuivre #C8753D sur encre #050403).
   */
  grade?: 'none' | 'warm';
  /** Contenu posé au-dessus de la photo (dégradé de lisibilité, texte, badge…). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /**
   * Mode « remplissage » : la photo occupe tout son parent positionné
   * (`absolute inset-0`) au lieu d'imposer son propre ratio. Le ratio reste
   * transmis au CDN pour que le cadrage soit fait côté serveur.
   */
  fill?: boolean;
  /**
   * Ratio alternatif sous 640 px. Un portrait recadré en 16/10 sur un écran de
   * téléphone devient un gros plan inexploitable ; on demande donc au CDN un
   * cadrage portrait sur mobile via <picture>. Laissé vide = même ratio partout.
   */
  mobileRatio?: number;
}

/**
 * Image de marque art-dirigée.
 *
 * Trois garanties par rapport à un `<img>` brut :
 *  1. le cadre ne bouge jamais (ratio imposé + fond couleur + LQIP flouté) ;
 *  2. le sujet est toujours cadré (crop=faces côté CDN) ;
 *  3. une image cassée n'existe plus : en cas d'échec réseau on affiche un
 *     dégradé de marque, jamais le pictogramme « image rompue » du navigateur.
 */
const BrandImageComponent: React.FC<BrandImageProps> = ({
  image,
  ratio,
  sizes = '100vw',
  className = '',
  wrapperClassName = '',
  priority = false,
  grade = 'none',
  children,
  style,
  fill = false,
  mobileRatio,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`block relative overflow-hidden ${fill ? 'w-full h-full' : ''} ${wrapperClassName}`}
      style={{
        aspectRatio: fill ? undefined : String(ratio),
        backgroundColor: image.color,
        backgroundImage: `url(${image.lqip})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...style,
      }}
    >
      {failed ? (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 20% 10%, rgba(200,117,61,0.55), transparent 60%), radial-gradient(100% 80% at 85% 90%, rgba(212,154,99,0.35), transparent 55%), linear-gradient(160deg, #2A1810 0%, #050403 70%)',
          }}
        />
      ) : (
        <picture>
          {mobileRatio ? (
            <source
              media="(max-width: 640px)"
              srcSet={brandImageSrcSet(image, mobileRatio)}
              sizes={sizes}
            />
          ) : null}
          <img
            src={brandImageSrc(image, 800, ratio)}
            srcSet={brandImageSrcSet(image, ratio)}
            sizes={sizes}
            alt={image.alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </picture>
      )}

      {grade === 'warm' && !failed && (
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none kurla-grade"
        />
      )}

      {children}
    </span>
  );
};

export const BrandImage = React.memo(BrandImageComponent);
export default BrandImage;
