import { BACKEND_URL } from '../services/api';

/** Multi-size image variants generated on upload */
export interface ImageVariants {
  thumb: string;   // 400px wide
  medium: string;  // 800px wide
  large: string;   // 1400px wide
  lqip?: string;   // base64 data URL (~20px blurred JPEG) for inline placeholder
}

/**
 * Parse a raw string from `property.images[]`.
 * Returns an ImageVariants object for new multi-size images,
 * or the original string for legacy plain-URL images.
 */
export function parseImageEntry(entry: string): ImageVariants | string {
  if (!entry) return entry;
  // New format: JSON stringified { thumb, medium, large }
  if (entry.startsWith('{')) {
    try {
      const parsed = JSON.parse(entry);
      if (parsed && parsed.thumb && parsed.medium && parsed.large) {
        return parsed as ImageVariants;
      }
    } catch {
      // Not valid JSON — treat as legacy string
    }
  }
  return entry;
}

/** Resolve a /uploads/... path to a full absolute URL (same as resolveImage in api.ts) */
function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http')) {
    return `${BACKEND_URL}${url}`;
  }
  return url;
}

/**
 * Get a specific size URL from a property image entry.
 * Falls back gracefully: new images use the requested variant,
 * old string images always return the resolved string.
 *
 * @param entry   Raw string from property.images[]
 * @param size    Desired size variant ('thumb' | 'medium' | 'large'), default 'large'
 */
export function getImageSrc(
  entry: string | undefined | null,
  size: keyof ImageVariants = 'large'
): string {
  if (!entry) return '';
  const parsed = parseImageEntry(entry);
  if (typeof parsed === 'string') {
    return resolveUrl(parsed);
  }
  return resolveUrl(parsed[size] || parsed.large || '');
}

/**
 * Build an `srcSet` string for a property image entry.
 * Returns a proper "400w 800w 1400w" srcset for new multi-size images.
 * Returns undefined for legacy string images (no srcset will be set).
 */
export function buildSrcSet(
  entry: string | undefined | null
): string | undefined {
  if (!entry) return undefined;
  const parsed = parseImageEntry(entry);
  if (typeof parsed === 'string') return undefined;
  return [
    `${resolveUrl(parsed.thumb)} 400w`,
    `${resolveUrl(parsed.medium)} 800w`,
    `${resolveUrl(parsed.large)} 1400w`,
  ].join(', ');
}

/**
 * Get the LQIP (Low Quality Image Placeholder) base64 data URL for a property image entry.
 * Returns undefined for legacy string images — use a plain CSS background as fallback.
 */
export function getLQIP(
  entry: string | undefined | null
): string | undefined {
  if (!entry) return undefined;
  const parsed = parseImageEntry(entry);
  if (typeof parsed === 'string') return undefined;
  return parsed.lqip;
}
