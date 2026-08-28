import {
  TextureGapMemberRow,
  TextureGapProductRow,
  TextureGapReport,
  aggregateTextureGap,
  concernsFromProfile
} from '../textureGap';
import { deriveArchetype } from '../archetype';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess, isPublishableProduct } from './internal';

import type { BeautyProfile } from '../beautyProfile';
import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.6a — TEXTURE GAP REPORT : lecture et agrégation.
 *
 * Ce module ne publie aucune donnée individuelle. Il lit des profils et des
 * produits, les transforme en comptes par (archétype × préoccupation), et confie
 * le rapport à `aggregateTextureGap`, qui applique la k-anonymité par absence.
 *
 * L'archétype est dérivé du profil par la même fonction pure que le reste du
 * produit (`deriveArchetype`) : aucun classement maison, aucune dimension
 * inventée pour compléter un profil incomplet.
 */

/** Nombre de profils relus. Borné : le rapport ne doit pas devenir une requête sans fin. */
const TEXTURE_GAP_MEMBER_LIMIT = 5_000;
const TEXTURE_GAP_PRODUCT_LIMIT = 2_000;

export interface TextureGapAvailability {
  membersRead: number;
  membersWithArchetype: number;
  /** `true` si la borne de lecture a été atteinte : le rapport est partiel. */
  membersTruncated: boolean;
  productsRead: number;
  publishedProducts: number;
  /**
   * Chaque produit publié est-il rattaché à ses archétypes ? Tant que le graphe
   * ingrédient × archétype ne couvre pas le catalogue, la réponse est non — et
   * le rapport rend des verdicts `donnees_insuffisantes` plutôt que des angles
   * morts qu'il ne peut pas mesurer.
   */
  archetypeMappingComplete: boolean;
  /** Raison lisible quand la couverture du catalogue n'est pas connue. */
  coverageKnown: boolean;
  coverageNote: string;
  persistence: 'supabase' | 'server_fallback';
}

export interface TextureGapReportResult {
  report: TextureGapReport;
  availability: TextureGapAvailability;
}

function profileFromRow(row: any): BeautyProfile | undefined {
  const profile = row?.profile;
  return profile && typeof profile === 'object' ? (profile as BeautyProfile) : undefined;
}

function toProductRow(row: any): TextureGapProductRow {
  return {
    id: String(row.id),
    concerns: Array.isArray(row.concerns) ? row.concerns.map(String) : [],
    published: isPublishableProduct(row) === true,
    // Aucun rattachement produit × archétype n'existe encore : `product_ingredients`
    // est vide. Le dire explicitement vaut mieux que supposer une couverture.
    archetypeIds: []
  };
}

export async function getTextureGapReport(
  store: SupabaseServerStore,
  options: { limit?: number } = {}
): Promise<TextureGapReportResult> {
  const limit = Math.min(Math.max(options.limit ?? TEXTURE_GAP_MEMBER_LIMIT, 1), TEXTURE_GAP_MEMBER_LIMIT);
  const supabase = getSupabaseServerClient();

  let members: TextureGapMemberRow[] = [];
  let products: TextureGapProductRow[] = [];
  let membersTruncated = false;

  if (supabase) {
    const [archetypeResult, profileResult, productResult] = await Promise.all([
      supabase.from('user_archetypes').select('user_id, archetype_id').limit(limit),
      supabase.from('beauty_profiles').select('user_id, profile').limit(limit),
      supabase.from('products').select('*').limit(TEXTURE_GAP_PRODUCT_LIMIT)
    ]);
    ensureDatabaseSuccess('lecture des archétypes membres', archetypeResult.error);
    ensureDatabaseSuccess('lecture des profils beauté', profileResult.error);
    ensureDatabaseSuccess('lecture du catalogue', productResult.error);

    const archetypeRows = archetypeResult.data ?? [];
    const profileRows = profileResult.data ?? [];
    membersTruncated = archetypeRows.length >= limit || profileRows.length >= limit;

    const archetypeIdByUser = new Map<string, string>();
    for (const row of archetypeRows) archetypeIdByUser.set(String(row.user_id), String(row.archetype_id));

    members = profileRows.map(row => {
      const userId = String(row.user_id);
      const profile = profileFromRow(row);
      const derivation = deriveArchetype(profile);
      const storedId = archetypeIdByUser.get(userId);
      return {
        userId,
        archetypeId: storedId ?? derivation.id,
        // Le libellé n'est repris que si l'identifiant stocké correspond à celui
        // dérivé : sinon on préfère l'identifiant brut à un libellé approximatif.
        archetypeLabel: !storedId || storedId === derivation.id ? derivation.labelFr : undefined,
        concerns: concernsFromProfile(profile)
      };
    });

    products = (productResult.data ?? []).map(toProductRow);
  } else {
    members = [...store.inMemoryBeautyProfiles.entries()].map(([userId, record]) => {
      const derivation = deriveArchetype(record.profile);
      return {
        userId,
        archetypeId: derivation.id,
        archetypeLabel: derivation.labelFr,
        concerns: concernsFromProfile(record.profile)
      };
    });
    membersTruncated = members.length >= limit;
    products = store.inMemoryProducts.map(toProductRow);
  }

  const publishedProducts = products.filter(product => product.published).length;
  const archetypeMappingComplete =
    publishedProducts > 0 && products.every(product => !product.published || product.archetypeIds.length > 0);

  const report = aggregateTextureGap({
    members: members.slice(0, limit),
    products,
    archetypeMappingComplete,
    generatedAt: new Date().toISOString()
  });

  return {
    report,
    availability: {
      membersRead: members.length,
      membersWithArchetype: members.filter(member => Boolean(member.archetypeId)).length,
      membersTruncated,
      productsRead: products.length,
      publishedProducts,
      archetypeMappingComplete,
      coverageKnown: archetypeMappingComplete,
      coverageNote: archetypeMappingComplete
        ? 'Chaque produit publié est rattaché à ses archétypes : la couverture est mesurable.'
        : publishedProducts === 0
          ? 'Aucun produit publié : la couverture du catalogue ne peut pas être mesurée.'
          : 'Les produits ne sont pas rattachés aux archétypes (graphe ingrédient × archétype incomplet) : la couverture est inconnue, aucun angle mort n’est affirmé.',
      persistence: supabase ? 'supabase' : 'server_fallback'
    }
  };
}
