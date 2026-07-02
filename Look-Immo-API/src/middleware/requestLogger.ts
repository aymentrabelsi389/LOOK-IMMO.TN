import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { requestContextStore } from '../utils/requestContext';
import { logger } from '../utils/logger';

// ─── 1. Request-ID Middleware ─────────────────────────────────────────────────
// Must be the FIRST middleware registered so the requestId is available to all
// subsequent middleware and route handlers via AsyncLocalStorage.
//
// Honours the X-Request-Id header sent by upstream load balancers / Nginx so
// the same ID is preserved across your infrastructure boundary. If absent, a
// fresh UUID v4 is generated.
export const requestIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Expose it back to the client for client-side correlation (e.g., Sentry)
    res.setHeader('X-Request-Id', requestId);

    // Run the rest of the request's async chain inside the ALS context so
    // logger.* calls anywhere downstream automatically include requestId.
    requestContextStore.run({ requestId }, next);
};

// ─── 2. Morgan HTTP Logger ────────────────────────────────────────────────────
// Captures HTTP request/response metadata and pipes it into Winston so every
// HTTP log line is a JSON object with the same requestId as application logs.
morgan.token('request-id', (req: Request) => req.headers['x-request-id'] as string ?? '');

// Write-stream adapter: forwards morgan output to winston at 'http' level
const morganStream = {
    write: (message: string) => {
        // morgan appends a newline — trim before logging
        logger.log('http', message.trim());
    },
};

export const httpLogger = morgan(
    // Custom JSON-ish token format — stays parseable in log aggregators
    ':method :url :status :res[content-length]b - :response-time ms',
    { stream: morganStream },
);
