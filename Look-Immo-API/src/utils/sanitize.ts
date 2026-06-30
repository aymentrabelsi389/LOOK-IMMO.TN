import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitizes an HTML string on the server using DOMPurify and JSDOM.
 * Allows safe formatting tags and links/images, but strips scripts,
 * event handlers, iframe, and other XSS vectors.
 */
export const sanitizeHTML = (html: string): string => {
    if (!html) return '';
    return purify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'b', 'i', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'span', 'ul', 'ol', 'li', 'br', 'a', 'img', 'blockquote', 'pre', 'code',
            'hr', 'div'
        ],
        ALLOWED_ATTR: [
            'href', 'target', 'src', 'alt', 'title', 'class', 'style', 'rel'
        ],
        ADD_ATTR: ['target'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
};
