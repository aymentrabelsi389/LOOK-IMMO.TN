import { Request, Response, NextFunction } from 'express';

// Retrieve allowed origins from environment (matching CORS configuration)
const getAllowedOrigins = (): string[] => {
    return [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000'
    ].filter((origin): origin is string => !!origin);
};

/**
 * CSRF Protection Guard middleware.
 * Validates Origin/Referer headers on all state-mutating requests (POST, PUT, DELETE, PATCH).
 * If the request's origin does not match the allowed frontend domains, it blocks the request
 * with a 403 Forbidden to prevent cross-site request forgery.
 */
export const csrfGuard = (req: Request, res: Response, next: NextFunction): void => {
    // 1. Safe methods (GET, HEAD, OPTIONS) do not mutate state and are exempt
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // 2. Extract Origin and Referer headers
    const origin = req.headers.origin as string | undefined;
    const referer = req.headers.referer as string | undefined;

    const allowedOrigins = getAllowedOrigins();

    // 3. Helper to validate if a given origin string is in the allowed list
    const isAllowed = (originStr: string): boolean => {
        try {
            const parsedOrigin = new URL(originStr).origin;
            return allowedOrigins.some(allowed => {
                try {
                    return new URL(allowed).origin === parsedOrigin;
                } catch {
                    return allowed === parsedOrigin;
                }
            });
        } catch {
            return false;
        }
    };

    // 4. Validate Origin header if present
    if (origin) {
        if (isAllowed(origin)) {
            return next();
        }
        console.warn(`[CSRF Guard] Blocked request from unauthorized Origin: ${origin}`);
        res.status(403).json({ error: 'CSRF protection: request origin not allowed' });
        return;
    }

    // 5. Fallback: Validate Referer header if Origin header is absent (common in some browser flows/older browsers)
    if (referer) {
        if (isAllowed(referer)) {
            return next();
        }
        console.warn(`[CSRF Guard] Blocked request from unauthorized Referer: ${referer}`);
        res.status(403).json({ error: 'CSRF protection: request referer not allowed' });
        return;
    }

    // 6. Block if both Origin and Referer are missing on a mutating method (typical of programmatic scripts trying to bypass browser checks)
    console.warn(`[CSRF Guard] Blocked request: Missing both Origin and Referer headers on mutating method ${req.method} for path ${req.path}`);
    res.status(403).json({ error: 'CSRF protection: missing origin/referer header' });
};
