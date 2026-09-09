import { useState, useEffect } from 'react';
import { useTranslation } from './useTranslation';
import { translateText } from '@/services/translationService';

export function useAutoTranslate(originalText?: string) {
  const { language } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  useEffect(() => {
    if (!originalText || language !== 'en') {
      setTranslatedText('');
      setIsTranslating(false);
      return;
    }

    let isMounted = true;
    setIsTranslating(true);

    translateText(originalText, 'en', 'fr')
      .then((res) => {
        if (isMounted) {
          setTranslatedText(res);
          setIsTranslating(false);
        }
      })
      .catch((err) => {
        console.error('useAutoTranslate error:', err);
        if (isMounted) {
          setIsTranslating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [originalText, language]);

  const isTranslated = language === 'en' && Boolean(translatedText) && translatedText !== originalText;
  const displayText = showOriginal || language !== 'en' ? originalText || '' : translatedText || originalText || '';

  const toggleOriginal = () => {
    setShowOriginal((prev) => !prev);
  };

  return {
    displayText,
    isTranslating,
    isTranslated,
    showOriginal,
    toggleOriginal,
    language
  };
}
