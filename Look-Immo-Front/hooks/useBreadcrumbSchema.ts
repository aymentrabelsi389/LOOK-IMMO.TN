import { useEffect } from 'react';

export interface BreadcrumbSchemaItem {
  name: string;
  /** Omit for the current (last) page */
  item?: string;
}

/**
 * Injects a BreadcrumbList JSON-LD <script> into <head> for SEO.
 * Mirrors the same DOM-mutation pattern as useSEO and cleans up on unmount.
 */
export const useBreadcrumbSchema = (items: BreadcrumbSchemaItem[]) => {
  useEffect(() => {
    if (!items.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((crumb, index) => {
        const entry: Record<string, unknown> = {
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
        };
        if (crumb.item) entry.item = crumb.item;
        return entry;
      }),
    };

    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-schema', 'breadcrumb');
    script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
    document.head.appendChild(script);

    return () => {
      // Remove only the breadcrumb script we injected (identified by data-schema)
      document.head.querySelectorAll('script[data-schema="breadcrumb"]').forEach(el => el.remove());
    };
  }, [JSON.stringify(items)]);
};
