/**
 * Mirrors the meta-building logic already used client-side in
 * hooks/useSEO.ts and pages/PropertyDetailsPage.tsx / BlogPostPage.tsx,
 * so bots and real users see the same title/description/JSON-LD —
 * this file is just the server-side equivalent, run before any JS executes.
 */

// ── Bot detection ────────────────────────────────────────────────────────
// Search crawlers + link-unfurling bots (social apps). Real browsers never
// match these, so this list can be broad without affecting normal users.
const BOT_UA_PATTERNS = [
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /SkypeUriPreview/i,
  /vkShare/i,
  /Googlebot/i,
  /bingbot/i,
  /DuckDuckBot/i,
  /Applebot/i,
  /Baiduspider/i,
  /YandexBot/i,
  /Pinterestbot/i,
  /redditbot/i,
  /W3C_Validator/i,
];

export function isBotUserAgent(userAgent = '') {
  return BOT_UA_PATTERNS.some((re) => re.test(userAgent));
}

// ── Image resolution (mirrors utils/imageUtils.ts) ──────────────────────
function resolveUrl(url, backendUrl) {
  if (!url) return url;
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http')) {
    return `${backendUrl}${url}`;
  }
  return url;
}

/** property.images[] entries are either a legacy plain URL string, or a
 * JSON-stringified { thumb, medium, large, lqip } object. */
export function getImageSrc(entry, backendUrl, size = 'large') {
  if (!entry) return '';
  if (entry.startsWith('{')) {
    try {
      const parsed = JSON.parse(entry);
      if (parsed?.thumb && parsed?.medium && parsed?.large) {
        return resolveUrl(parsed[size] || parsed.large, backendUrl);
      }
    } catch {
      // not JSON — fall through to legacy string handling
    }
  }
  return resolveUrl(entry, backendUrl);
}

// ── HTML escaping — meta content comes from admin-entered data, still
// treat it as untrusted when injecting into a raw HTML string. ──────────
export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PROPERTY_TYPE_LABELS = {
  apartment: 'Appartement',
  villa: 'Villa',
  depot: 'Dépôt',
  commercial: 'Bureau / Local',
  land: 'Terrain',
  studio: 'Studio',
  duplex: 'Duplex',
  triplex: 'Triplex',
  penthouse: 'Penthouse',
  commerce: 'Commerce',
};

const DEFAULT_META = {
  title: 'Look Immo | Premium Real Estate Tunisia',
  description:
    "Plateforme immobilière haut de gamme en Tunisie. Vente et location d'appartements, villas, bureaux, et terrains.",
  image: null, // caller falls back to the static index.html default
};

export function buildPropertyMeta(property, { siteUrl, backendUrl, pathname }) {
  if (!property) return null;
  const typeLabel = PROPERTY_TYPE_LABELS[property.type] || 'Bien';
  const listingLabel = property.listingType === 'sale' ? 'Vente' : 'Location';
  const city = property.location?.city || '';

  const title = `${property.title} - ${typeLabel} à ${listingLabel} à ${city} | Look Immo`;
  const description = property.description
    ? property.description.slice(0, 300)
    : `${typeLabel} à ${property.listingType === 'sale' ? 'vendre' : 'louer'} située à ${city}. ${property.features?.area ? `${property.features.area}m². ` : ''}Découvrez les photos et détails sur Look Immo.`;
  const image = getImageSrc(property.images?.[0], backendUrl, 'large');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description,
    url: `${siteUrl}${pathname}`,
    image: (property.images || []).map((img) => getImageSrc(img, backendUrl, 'large')).filter(Boolean),
    datePosted: property.createdAt,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'TND',
      availability:
        property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      streetAddress: property.location?.address,
      addressCountry: 'TN',
    },
  };

  return { title, description, image, jsonLd };
}

export function buildBlogPostMeta(post, { siteUrl, backendUrl, pathname }) {
  if (!post) return null;
  const title = `${post.title} | Look Immo Blog`;
  const description = post.excerpt || post.content?.replace(/<[^>]+>/g, '').slice(0, 300) || DEFAULT_META.description;
  const image = getImageSrc(post.image, backendUrl, 'large');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    image: image || undefined,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    url: `${siteUrl}${pathname}`,
    author: { '@type': 'Organization', name: 'Look Immo' },
  };

  return { title, description, image, jsonLd };
}

export function defaultMeta() {
  return { ...DEFAULT_META };
}
