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

export function formatPropertyType(type: string, fallback?: string): string {
  if (!type) return fallback || '';
  return PROPERTY_TYPE_LABELS[type.toLowerCase()] || fallback || type;
}
