import { useLanguageStore } from '../stores/useLanguageStore';
import { translations, TranslationKey } from '../utils/translations';

export const useTranslation = () => {
  const { language, setLanguage, toggleLanguage } = useLanguageStore();

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.fr;
    let text: string = langDict[key] || translations.fr[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return text;
  };

  return {
    t,
    language,
    setLanguage,
    toggleLanguage,
    isFr: language === 'fr',
    isEn: language === 'en',
  };
};
