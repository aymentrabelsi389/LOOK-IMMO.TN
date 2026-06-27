import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrencyCode, ExchangeRates } from '../types';

const DEFAULT_RATES: ExchangeRates = {
  USD: 0.32,
  EUR: 0.30,
  TND: 1,
};

interface CurrencyStore {
  currency: CurrencyCode;
  rates: ExchangeRates;
  autoFetch: boolean;
  lastUpdated: number;
  // Actions
  setCurrency: (c: CurrencyCode) => void;
  updateRate: (code: CurrencyCode, rate: number) => void;
  setAutoFetch: (v: boolean) => void;
  fetchRatesIfStale: () => Promise<void>;
  formatValue: (value: number) => string;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'TND',
      rates: DEFAULT_RATES,
      autoFetch: true,
      lastUpdated: 0,

      setCurrency: (currency) => set({ currency }),

      updateRate: (code, rate) =>
        set((state) => ({
          rates: { ...state.rates, [code]: rate },
          lastUpdated: Date.now(),
        })),

      setAutoFetch: (autoFetch) => set({ autoFetch }),

      fetchRatesIfStale: async () => {
        const { autoFetch, lastUpdated } = get();
        if (!autoFetch) return;
        const isStale = Date.now() - lastUpdated > 43200000; // 12 hours
        if (!isStale) return;

        try {
          const res = await fetch('https://open.er-api.com/v6/latest/TND');
          const data = await res.json();
          if (data?.rates) {
            set({
              rates: {
                TND: 1,
                USD: data.rates.USD || DEFAULT_RATES.USD,
                EUR: data.rates.EUR || DEFAULT_RATES.EUR,
              },
              lastUpdated: Date.now(),
            });
          }
        } catch (err) {
          console.error('Failed to fetch exchange rates:', err);
        }
      },

      formatValue: (valueInTND: number) => {
        const { currency, rates } = get();
        const rate = rates[currency];
        const converted = Math.round(valueInTND * rate);
        const formattedNumber = converted
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        if (currency === 'TND') return `${formattedNumber} DT`;
        if (currency === 'EUR') return `${formattedNumber} €`;
        if (currency === 'USD') return `$ ${formattedNumber}`;
        return `${formattedNumber} ${currency}`;
      },
    }),
    {
      name: 'lookimmo-currency', // replaces manual localStorage keys
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        autoFetch: state.autoFetch,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
