import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

let isPixelInitialized = false;
let currentPixelId = '';

/**
 * Safely initialize the official Meta (Facebook) Pixel script.
 * Injects the standard fbevents.js snippet into the head once.
 */
export function initMetaPixel(pixelId: string | undefined | null): boolean {
  if (typeof window === 'undefined' || !pixelId) return false;

  const cleanId = pixelId.trim();
  if (!cleanId || cleanId.length < 5) return false;

  if (isPixelInitialized && currentPixelId === cleanId) {
    return true;
  }

  try {
    /* eslint-disable */
    if (!window.fbq) {
      const n: any = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      window.fbq = n;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onerror = () => {
        console.warn('[Meta Pixel] Failed to load fbevents.js (possibly blocked by an adblocker).');
      };
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }
    /* eslint-enable */

    window.fbq('init', cleanId);
    isPixelInitialized = true;
    currentPixelId = cleanId;
    return true;
  } catch (err) {
    console.error('[Meta Pixel] Error initializing pixel:', err);
    return false;
  }
}

/**
 * Track generic Meta Pixel standard or custom events safely.
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq || !isPixelInitialized) return;
  try {
    if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  } catch (err) {
    console.warn(`[Meta Pixel] Error tracking event "${eventName}":`, err);
  }
}

/**
 * Track a PageView event
 */
export function trackPageView() {
  trackMetaEvent('PageView');
}

/**
 * Track a Property view (ViewContent standard event)
 */
export function trackViewContent(property: {
  id: string;
  title: string;
  price?: number;
  type?: string;
  listingType?: string;
  city?: string;
}) {
  trackMetaEvent('ViewContent', {
    content_name: property.title,
    content_category: property.type || 'real_estate',
    content_ids: [property.id],
    content_type: 'product',
    value: property.price || 0,
    currency: 'TND',
    listing_type: property.listingType || 'sale',
    city: property.city || ''
  });
}

/**
 * Track a Lead event (appointment, demand submission, contact inquiry)
 */
export function trackLead(source: string, details?: Record<string, any>) {
  trackMetaEvent('Lead', {
    content_name: source,
    ...details
  });
}

/**
 * Track a Contact event (phone call click, whatsapp, contact form)
 */
export function trackContact(method?: string) {
  trackMetaEvent('Contact', {
    contact_method: method || 'form'
  });
}

/**
 * Track a Search event on listing / filters
 */
export function trackSearch(query: string) {
  if (!query || query.trim().length === 0) return;
  trackMetaEvent('Search', {
    search_string: query.trim()
  });
}

/**
 * React Hook to auto-initialize Meta Pixel and track pageviews across route transitions.
 */
export function useMetaPixel(pixelId?: string | null) {
  const location = useLocation();
  const prevPathRef = useRef('');

  useEffect(() => {
    if (pixelId) {
      const initialized = initMetaPixel(pixelId);
      if (initialized) {
        trackPageView();
      }
    }
  }, [pixelId]);

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    if (prevPathRef.current && prevPathRef.current !== fullPath && isPixelInitialized) {
      trackPageView();
    }
    prevPathRef.current = fullPath;
  }, [location.pathname, location.search]);
}
