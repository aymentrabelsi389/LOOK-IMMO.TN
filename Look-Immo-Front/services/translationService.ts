/**
 * Translation service with persistent localStorage & in-memory caching.
 * Translates dynamic property descriptions and text on-the-fly.
 */

const memoryCache = new Map<string, string>();

const getCacheKey = (text: string, targetLang: string): string => {
  return `trans_${targetLang}_${text.trim().slice(0, 80)}_${text.length}`;
};

export async function translateText(
  text: string,
  targetLang: string = 'en',
  sourceLang: string = 'fr'
): Promise<string> {
  if (!text || !text.trim() || targetLang === sourceLang) {
    return text;
  }

  const cacheKey = getCacheKey(text, targetLang);

  // Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(`look_immo_${cacheKey}`);
    if (cached) {
      memoryCache.set(cacheKey, cached);
      return cached;
    }
  } catch {
    // localStorage might be unavailable or full
  }

  // Attempt 1: Google Translate public endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((chunk: any) => chunk[0] || '').join('');
        if (translated) {
          saveToCache(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    console.warn('[translateText] Primary translation service failed, trying fallback:', err);
  }

  // Attempt 2: MyMemory free translation API fallback
  try {
    const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.slice(0, 500)
    )}&langpair=${sourceLang}|${targetLang}`;

    const response = await fetch(fallbackUrl);
    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        saveToCache(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.error('[translateText] Fallback translation service failed:', err);
  }

  // Return original text if translation failed
  return text;
}

function saveToCache(cacheKey: string, text: string) {
  memoryCache.set(cacheKey, text);
  try {
    localStorage.setItem(`look_immo_${cacheKey}`, text);
  } catch {
    // Ignore storage quota exceeded
  }
}

