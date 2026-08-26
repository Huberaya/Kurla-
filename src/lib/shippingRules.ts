export type ShippingMethod = 'standard' | 'express';

export interface ShippingAddressInput {
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ShippingOption {
  country: string;
  label: string;
  standardCents: number;
  expressCents: number;
  freeFromCents?: number;
  estimatedStandardDays: string;
  estimatedExpressDays: string;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { country: 'FR', label: 'France métropolitaine', standardCents: 490, expressCents: 990, freeFromCents: 6000, estimatedStandardDays: '2 à 4 jours ouvrés', estimatedExpressDays: '1 à 2 jours ouvrés' },
  { country: 'BE', label: 'Belgique', standardCents: 690, expressCents: 1290, freeFromCents: 8000, estimatedStandardDays: '3 à 5 jours ouvrés', estimatedExpressDays: '1 à 3 jours ouvrés' },
  { country: 'LU', label: 'Luxembourg', standardCents: 690, expressCents: 1290, freeFromCents: 8000, estimatedStandardDays: '3 à 5 jours ouvrés', estimatedExpressDays: '1 à 3 jours ouvrés' },
  { country: 'DE', label: 'Allemagne', standardCents: 890, expressCents: 1590, estimatedStandardDays: '4 à 6 jours ouvrés', estimatedExpressDays: '2 à 3 jours ouvrés' },
  { country: 'ES', label: 'Espagne', standardCents: 890, expressCents: 1590, estimatedStandardDays: '4 à 6 jours ouvrés', estimatedExpressDays: '2 à 3 jours ouvrés' },
  { country: 'IT', label: 'Italie', standardCents: 890, expressCents: 1590, estimatedStandardDays: '4 à 6 jours ouvrés', estimatedExpressDays: '2 à 3 jours ouvrés' },
  { country: 'NL', label: 'Pays-Bas', standardCents: 890, expressCents: 1590, estimatedStandardDays: '4 à 6 jours ouvrés', estimatedExpressDays: '2 à 3 jours ouvrés' },
  { country: 'PT', label: 'Portugal', standardCents: 890, expressCents: 1590, estimatedStandardDays: '4 à 6 jours ouvrés', estimatedExpressDays: '2 à 3 jours ouvrés' },
];

export function getShippingOption(country: string): ShippingOption | undefined {
  return SHIPPING_OPTIONS.find(option => option.country === country.toUpperCase());
}

export function calculateShippingCents(subtotalCents: number, country: string, method: ShippingMethod): number {
  const option = getShippingOption(country);
  if (!option) throw new Error('La livraison n’est pas encore disponible pour ce pays.');
  if (method === 'standard' && option.freeFromCents !== undefined && subtotalCents >= option.freeFromCents) return 0;
  return method === 'express' ? option.expressCents : option.standardCents;
}

export function normalizeShippingAddress(input: unknown): ShippingAddressInput {
  if (!input || typeof input !== 'object') throw new Error('Une adresse de livraison est requise.');
  const value = input as Record<string, unknown>;
  const fullName = typeof value.fullName === 'string' ? value.fullName.trim() : '';
  const street = typeof value.street === 'string' ? value.street.trim() : '';
  const city = typeof value.city === 'string' ? value.city.trim() : '';
  const postalCode = typeof value.postalCode === 'string' ? value.postalCode.trim() : '';
  const country = typeof value.country === 'string' ? value.country.trim().toUpperCase() : '';
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';

  if (fullName.length < 2 || fullName.length > 120) throw new Error('Nom de livraison invalide.');
  if (street.length < 4 || street.length > 180) throw new Error('Adresse de livraison invalide.');
  if (city.length < 2 || city.length > 100) throw new Error('Ville de livraison invalide.');
  if (!/^[A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ .-]{2,14}$/.test(postalCode)) throw new Error('Code postal invalide.');
  if (!getShippingOption(country)) throw new Error('La livraison n’est pas encore disponible pour ce pays.');
  if (phone && !/^[+0-9() .-]{7,25}$/.test(phone)) throw new Error('Numéro de téléphone invalide.');

  return { fullName, street, city, postalCode, country, ...(phone ? { phone } : {}) };
}

export function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}
