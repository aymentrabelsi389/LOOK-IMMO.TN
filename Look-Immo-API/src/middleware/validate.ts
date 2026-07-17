import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate and parse the request against the schema
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            }) as any;
            
            // Assign back parsed and transformed values to req
            if (parsed.body !== undefined) req.body = parsed.body;
            if (parsed.query !== undefined) req.query = parsed.query;
            if (parsed.params !== undefined) req.params = parsed.params;
            
            next();
        } catch (error: any) {
            if (error instanceof ZodError) {
                // Map the Zod errors to a cleaner format
                const formattedErrors = error.issues.map((err: any) => ({
                    path: err.path.join('.'),
                    message: err.message
                }));

                // Return 400 Bad Request if validation fails
                return res.status(400).json({
                    error: 'Validation failed',
                    details: formattedErrors
                });
            }
            // If it's a different error, pass it to global error handler
            next(error);
        }
    };
};
