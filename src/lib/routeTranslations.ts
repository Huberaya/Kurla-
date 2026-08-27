/**
 * CHANTIER 7.5 — contenu anglais des routes.
 *
 * Règle de publication, volontairement stricte : une URL `/en/…` n'est déclarée
 * comme version anglaise (hreflang, sitemap, prérendu) QUE si le corps de la
 * page est réellement traduit. Sinon, publier un alternate `hreflang="en"` vers
 * une page dont le texte est en français serait faux aux yeux des moteurs — et
 * KURLA ne publie pas d'affirmation qu'elle ne tient pas.
 *
 * Les routes non traduites ne cassent rien pour autant : l'application les sert
 * quand même sous `/en/…` (le chrome, lui, est bilingue), mais elles portent le
 * canonique français et aucun hreflang. Pas de doublon indexé, pas d'alternate
 * mensonger.
 *
 * Le français reste dans `routeMeta.ts` : on n'ajoute pas un champ `titleEn`
 * dans chacune des 46 entrées pour deux locales.
 */

import type { RouteMeta } from './routeMeta';
import type { Locale } from './i18n';
import { DEFAULT_LOCALE, hreflangAlternates, localizedPath } from './i18n';

export interface LocalizedCopy {
  title: string;
  description: string;
}

/**
 * Titres et méta-descriptions anglais, indexés par chemin canonique sans
 * locale. La présence d'une entrée = « cette route a une version anglaise ».
 */
export const EN_ROUTE_CONTENT: Record<string, LocalizedCopy> = {
  '/manifeste': {
    title: 'The KURLA manifesto',
    description:
      'Brand neutrality, ingredient-level evidence, refusal of medical diagnosis. What KURLA commits to — and what it refuses.',
  },
  '/melanin-skin': {
    title: 'Melanin-rich skin: the guide | KURLA',
    description:
      'Post-inflammatory hyperpigmentation, sun protection, skin barrier. What the literature actually says for Fitzpatrick IV to VI.',
  },
  '/protective-styles': {
    title: 'Protective styles: duration, tension, upkeep | KURLA',
    description:
      'Braids, twists, cornrows, wigs: what each protective style really costs your hair, and how long to keep it.',
  },
};

/** Cette route possède-t-elle une version anglaise publiée ? */
export function hasEnglishVersion(basePath: string): boolean {
  return Object.prototype.hasOwnProperty.call(EN_ROUTE_CONTENT, basePath);
}

export interface LocalizedRouteMeta {
  /** Métadonnées dans la langue réellement servie sur cette URL. */
  meta: RouteMeta;
  /** Chemin à déclarer en `<link rel="canonical">`. */
  canonicalPath: string;
  /** Alternates hreflang, vides si la route n'a pas de version anglaise. */
  alternates: { hreflang: string; href: string }[];
}

/**
 * Localise les métadonnées d'une route.
 *
 * - français : titre fr, canonique nu ;
 * - anglais traduit : titre en, canonique `/en/…`, alternates fr/en/x-default ;
 * - anglais non traduit : on garde le titre français (c'est le contenu servi)
 *   et on canonise vers la page française.
 */
export function localizeRouteMeta(
  meta: RouteMeta,
  locale: Locale,
  basePath: string,
  siteUrl: string,
): LocalizedRouteMeta {
  const available = hasEnglishVersion(basePath);
  const translated = available && locale !== DEFAULT_LOCALE;
  // Les deux langues déclarent la même paire : un hreflang posé sur une seule
  // des deux versions n'est pas pris en compte de façon fiable.
  const alternates = available ? hreflangAlternates(basePath, siteUrl) : [];

  if (translated) {
    const copy = EN_ROUTE_CONTENT[basePath];
    return {
      meta: { ...meta, title: copy.title, description: copy.description },
      canonicalPath: localizedPath(basePath, locale),
      alternates,
    };
  }

  return {
    meta,
    canonicalPath: basePath,
    alternates,
  };
}

/**
 * Liste des chemins de base publiés en anglais. Consommée par le générateur de
 * sitemap (alternates `xhtml:link` + URLs `/en/…`) et par le prérendu.
 */
export function englishBasePaths(): string[] {
  return Object.keys(EN_ROUTE_CONTENT);
}
