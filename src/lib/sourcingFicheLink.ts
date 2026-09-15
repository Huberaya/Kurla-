/**
 * CHANTIER C3 (15/09/2026) — LIAISON CANDIDAT SOURCING → FICHE CATALOGUE.
 *
 * « La liaison n'est pas une vue mais une clé » (étude pipeline §3.4).
 * Le payload généré ne contient QUE des données réelles du candidat et de
 * son prospect : jamais de prix inventé (un prix absent = pas de prix),
 * jamais de visuel, jamais d'INCI. La fiche naît en `draft`, inactive :
 * c'est la porte de publication (C4) qui décidera de la suite.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildFicheFromCandidate(candidate: any, prospect: any | null): Record<string, any> {
  const productName = typeof candidate?.product === 'string' ? candidate.product.trim() : '';
  if (!productName) throw new Error('Le candidat n’a pas de nom de produit — fiche impossible.');

  const brand = typeof candidate?.brand === 'string' && candidate.brand.trim() !== '' ? candidate.brand.trim() : undefined;
  const publicPrice = Number(candidate?.public_price_cents);
  const payload: Record<string, any> = {
    slug: `${slugify(brand ? `${brand} ${productName}` : productName)}-${String(candidate.id).slice(-6)}`,
    name: productName,
    catalog_status: 'draft',
    is_active: false,
    // La clé de liaison : la fiche sait d'où elle vient.
    source_candidate_id: String(candidate.id),
  };
  if (brand) payload.brand = brand;
  // Prix public constaté UNIQUEMENT s'il est réel (> 0). Jamais 0, jamais inventé.
  if (Number.isFinite(publicPrice) && publicPrice > 0) payload.price = publicPrice / 100;
  if (typeof candidate?.category === 'string' && candidate.category.trim() !== '') payload.category = candidate.category.trim();
  const supplierName = typeof prospect?.name === 'string' && prospect.name.trim() !== '' ? prospect.name.trim() : undefined;
  if (supplierName) payload.sourceSupplier = supplierName;
  payload.description = `Fiche générée depuis le sourcing candidat (${candidate.id}). Description, INCI et visuels à compléter avant publication.`;
  return payload;
}
