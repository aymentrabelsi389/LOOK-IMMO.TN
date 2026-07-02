import { describe, it, expect } from 'vitest';

// Set up browser mocks globally BEFORE dynamically importing modules
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

// Dynamically import to ensure global mocks are set before module evaluation
const { getImageSrc } = await import('./imageUtils');

describe('Image Utility Helpers', () => {
  it('should parse legacy plain-URL image entry', () => {
    const entry = '/uploads/properties/prop1.jpg';
    expect(getImageSrc(entry)).toContain('/uploads/properties/prop1.jpg');
  });

  it('should parse new JSON-stringified multi-size image entry', () => {
    const entry = JSON.stringify({
      thumb: '/uploads/properties/prop1-thumb.webp',
      medium: '/uploads/properties/prop1-medium.webp',
      large: '/uploads/properties/prop1-large.webp'
    });
    expect(getImageSrc(entry, 'thumb')).toContain('prop1-thumb.webp');
    expect(getImageSrc(entry, 'medium')).toContain('prop1-medium.webp');
    expect(getImageSrc(entry, 'large')).toContain('prop1-large.webp');
  });

  it('should return empty string if no image entry is provided', () => {
    expect(getImageSrc(null)).toBe('');
    expect(getImageSrc(undefined)).toBe('');
  });
});
