import { Request, Response } from 'express';
import { getCurrentRates } from '../exchange-rates/exchangeRate.service';

/**
 * GET /api/exchange-rates
 * Public endpoint — returns current TND-based exchange rates served from
 * Redis cache (or in-memory fallback). The response includes metadata so
 * clients can detect stale/default data and act accordingly.
 *
 * NOTE: This handler intentionally catches errors itself (instead of using
 * asyncHandler) because it must ALWAYS return a valid response with fallback
 * rates — the frontend needs exchange rate data to render prices correctly.
 */
export const getExchangeRates = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await getCurrentRates();
        res.json(data);
    } catch (_error) {
        // Even on unexpected errors return hardcoded defaults so the frontend
        // never shows broken prices
        res.json({
            rates: { TND: 1, USD: 0.32, EUR: 0.30 },
            updatedAt: new Date(0).toISOString(),
            source: 'default',
        });
    }
};
