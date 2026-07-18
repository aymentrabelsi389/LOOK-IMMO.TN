import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrencyCode, ExchangeRates } from '@/types';
import { exchangeRatesAPI } from '@/services/api';

// ── Last-resort in-browser defaults ──────────────────────────────────────────
// These are only used if the backend /api/exchange-rates endpoint is unreachable.
// In normal operation the backend cron refreshes rates every hour.
const DEFAULT_RATES: ExchangeRates = {
  USD: 0.32,
  EUR: 0.30,
  TND: 1,
};

// Stale threshold — matches the backend cron interval (1 hour)
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

interface CurrencyStore {
  currency: CurrencyCode;
  rates: ExchangeRates;
  autoFetch: boolean;
  lastUpdated: number;
  rateSource: 'redis' | 'memory' | 'default' | 'local'; // 'local' = browser fallback
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
      rateSource: 'default',

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

        // Skip if data is fresher than 1 hour
        if (Date.now() - lastUpdated < STALE_THRESHOLD_MS) return;

        try {
          // Call the backend — rates are already validated and cached there
          const data = await exchangeRatesAPI.get();

          set({
            rates: {
              TND: 1,
              USD: data.rates.USD ?? DEFAULT_RATES.USD,
              EUR: data.rates.EUR ?? DEFAULT_RATES.EUR,
            },
            lastUpdated: Date.now(),
            rateSource: data.source,
          });
        } catch (err) {
          // Backend unreachable (offline dev, network error, etc.)
          // Keep serving whatever is already in the persisted store.
          console.warn('[CurrencyStore] Could not fetch rates from backend:', err);
          // Only mark as local fallback if we're still on stale defaults
          const { lastUpdated: lu } = get();
          if (lu === 0) {
            set({ rateSource: 'local' });
          }
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
      name: 'lookimmo-currency',
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        autoFetch: state.autoFetch,
        lastUpdated: state.lastUpdated,
        rateSource: state.rateSource,
      }),
    }
  )
);
