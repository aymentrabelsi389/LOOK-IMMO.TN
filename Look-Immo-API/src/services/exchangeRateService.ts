import cron from 'node-cron';
import { getCache, setCache } from '../utils/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const REDIS_KEY = 'exchange_rates:TND';
const REDIS_TTL_SECONDS = 7200; // 2 hours — survives one missed cron run
const CRON_SCHEDULE = '0 * * * *'; // top of every hour

export interface ExchangeRateData {
    rates: {
        TND: number;
        USD: number;
        EUR: number;
    };
    updatedAt: string; // ISO string
    source: 'redis' | 'memory' | 'default';
}

// Hard-coded last-resort defaults (absolute fallback if API never responded yet)
const HARDCODED_DEFAULTS: ExchangeRateData = {
    rates: { TND: 1, USD: 0.32, EUR: 0.30 },
    updatedAt: new Date(0).toISOString(),
    source: 'default',
};

// In-process memory cache — survives Redis outages
let inMemoryRates: ExchangeRateData | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch & cache function
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAndCacheRates = async (): Promise<void> => {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
    // open.er-api.com free tier doesn't require a key; the key param is silently ignored
    const url = apiKey
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/TND`
        : 'https://open.er-api.com/v6/latest/TND';

    try {
        // Node 18+ has native fetch; for older runtimes this still works via
        // the global fetch polyfill shipped with ts-node-dev
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} from exchange rate API`);
        }
        const data = await res.json() as { result?: string; rates?: Record<string, number> };

        if (data.result !== 'success' && !data.rates) {
            throw new Error('Unexpected response shape from exchange rate API');
        }

        const rates = data.rates!;
        const payload: ExchangeRateData = {
            rates: {
                TND: 1,
                USD: rates.USD ?? HARDCODED_DEFAULTS.rates.USD,
                EUR: rates.EUR ?? HARDCODED_DEFAULTS.rates.EUR,
            },
            updatedAt: new Date().toISOString(),
            source: 'redis', // when read back, it will come from Redis
        };

        // 1. Persist to Redis (TTL = 2h so one missed cron cycle is safe)
        await setCache(REDIS_KEY, payload, REDIS_TTL_SECONDS);

        // 2. Update in-memory fallback
        inMemoryRates = { ...payload, source: 'memory' };

        console.log(`[ExchangeRates] ✅ Fetched fresh rates — USD: ${payload.rates.USD.toFixed(4)}, EUR: ${payload.rates.EUR.toFixed(4)}`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ExchangeRates] ⚠️  Failed to fetch rates: ${msg}. Serving last-known-good.`);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Read rates — Redis → memory → hardcoded default (never throws)
// ─────────────────────────────────────────────────────────────────────────────
export const getCurrentRates = async (): Promise<ExchangeRateData> => {
    try {
        const cached = await getCache(REDIS_KEY) as ExchangeRateData | null;
        if (cached?.rates) {
            return { ...cached, source: 'redis' };
        }
    } catch {
        // Redis unavailable — fall through to memory
    }

    if (inMemoryRates?.rates) {
        return inMemoryRates;
    }

    return HARDCODED_DEFAULTS;
};

// ─────────────────────────────────────────────────────────────────────────────
// Cron initialiser — call once on server startup
// ─────────────────────────────────────────────────────────────────────────────
export const initExchangeRateCron = (): void => {
    // Fetch immediately on startup so the cache is warm before the first request
    fetchAndCacheRates().catch(() => {});

    // Then refresh every hour on the hour
    cron.schedule(CRON_SCHEDULE, () => {
        console.log('[ExchangeRates] ⏰ Hourly cron triggered — refreshing rates...');
        fetchAndCacheRates().catch(() => {});
    }, {
        timezone: 'Africa/Tunis',
    });

    console.log('[ExchangeRates] Cron job scheduled (every hour). Initial fetch in progress...');
};
