import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'fr' | 'en';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'fr', // French is the default

      setLanguage: (language) => set({ language }),

      toggleLanguage: () =>
        set({ language: get().language === 'fr' ? 'en' : 'fr' }),
    }),
    {
      name: 'lookimmo-language',
    }
  )
);
