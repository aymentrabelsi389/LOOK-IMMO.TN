import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that rejected promises and thrown
 * errors are automatically forwarded to the global error handler via `next(err)`.
 *
 * Before:
 *   router.get('/users', async (req, res) => {
 *     try { ... } catch (e) { res.status(500).json({ error: 'Failed' }); }
 *   });
 *
 * After:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     // just throw — the global handler takes care of it
 *   }));
 */
export const asyncHandler = <
    Req extends Request = Request,
    Res extends Response = Response
>(
    fn: (req: Req, res: Res, next: NextFunction) => Promise<void> | Promise<any>
) => {
    return (req: Req, res: Res, next?: NextFunction): Promise<any> => {
        return Promise.resolve(fn(req, res, (next || (() => {})) as NextFunction)).catch((err) => {
            if (next) {
                next(err);
            } else {
                throw err;
            }
        });
    };
};
