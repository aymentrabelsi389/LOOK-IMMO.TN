import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
}

export const useSEO = ({ title, description, keywords, canonical }: SEOProps) => {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = 'Look Immo';
    const formattedTitle = title.includes(baseTitle) ? title : `${title} | ${baseTitle}`;
    document.title = formattedTitle;

    // 2. Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    if (description) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription.setAttribute(
        'content',
        "Look Immo - Votre agence immobilière haut de gamme et prestige en Tunisie. Trouvez des villas, appartements et terrains d'exception à vendre ou à louer."
      );
    }

    // 3. Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    if (keywords) {
      metaKeywords.setAttribute('content', keywords);
    } else {
      metaKeywords.setAttribute(
        'content',
        'immobilier tunisie, villa prestige marsa, appartement haut de gamme tunis, look immo'
      );
    }

    // 4. Update Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }

    if (canonical) {
      linkCanonical.setAttribute('href', canonical);
    } else {
      // Determine canonical URL dynamically: origin + pathname
      // If there is a 'page' query param, preserve it because paginated pages have unique content sets.
      // Other filter parameters (like type, city, sort) are stripped to avoid duplicate indexing.
      const url = new URL(window.location.href);
      const page = url.searchParams.get('page');
      let canonicalUrl = url.origin + url.pathname;
      if (page) {
        canonicalUrl += `?page=${page}`;
      }
      linkCanonical.setAttribute('href', canonicalUrl);
    }
  }, [title, description, keywords, canonical]);
};

