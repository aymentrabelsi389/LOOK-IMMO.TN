import { TranslationKey } from './translations';

export const PROPERTY_TYPE_KEYS: Record<string, TranslationKey> = {
  land: 'typeLand',
  villa: 'typeVilla',
  apartment: 'typeApartment',
  duplex: 'typeDuplex',
  triplex: 'typeTriplex',
  penthouse: 'typePenthouse',
  commercial: 'typeCommercial',
  depot: 'typeDepot',
  studio: 'typeStudio',
  commerce: 'typeCommerce'
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  land: 'Terrain',
  villa: 'Villa',
  apartment: 'Appartement',
  duplex: 'Duplex',
  triplex: 'Triplex',
  penthouse: 'Penthouse',
  commercial: 'Bureau / Local',
  depot: 'Dépôt',
  studio: 'Studio',
  commerce: 'Commerce'
};

export function formatPropertyType(type: string, fallback?: string, t?: (key: TranslationKey) => string): string {
  if (!type) return fallback || '';
  const key = PROPERTY_TYPE_KEYS[type.toLowerCase()];
  if (t && key) {
    return t(key);
  }
  return PROPERTY_TYPE_LABELS[type.toLowerCase()] || fallback || type;
}

