import { Request, Response, NextFunction } from 'express';
/**
 * Express middleware that intercepts `/property/:id` and `/blog-post/:id`.
 *
 * - Social crawlers  → receives a full HTML page with dynamic OG/Twitter tags
 *                      populated from the database (cached for 5 min).
 * - Real users       → receives the SPA index.html served directly from disk
 *                      (identical result to Nginx serving it, just via Express).
 */
export declare const seoInjector: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=seoInjector.d.ts.map