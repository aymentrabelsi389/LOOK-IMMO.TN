import { Request, Response } from 'express';
import { getCurrentRates } from '../services/exchangeRateService';

/**
 * GET /api/exchange-rates
 * Public endpoint — returns current TND-based exchange rates served from
 * Redis cache (or in-memory fallback). The response includes metadata so
 * clients can detect stale/default data and act accordingly.
 */
export const getExchangeRates = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await getCurrentRates();
        res.json(data);
    } catch (error) {
        console.error('[ExchangeRates] Unexpected error in getExchangeRates:', error);
        // Even on unexpected errors return hardcoded defaults so the frontend
        // never shows broken prices
        res.json({
            rates: { TND: 1, USD: 0.32, EUR: 0.30 },
            updatedAt: new Date(0).toISOString(),
            source: 'default',
        });
    }
};
