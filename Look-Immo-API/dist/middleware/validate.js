"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate and parse the request against the schema
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Assign back parsed and transformed values to req
            if (parsed.body !== undefined)
                req.body = parsed.body;
            if (parsed.query !== undefined)
                req.query = parsed.query;
            if (parsed.params !== undefined)
                req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Map the Zod errors to a cleaner format
                const formattedErrors = error.issues.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                console.log("[DEBUG] Validation failed:", JSON.stringify(formattedErrors));
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
exports.validate = validate;
//# sourceMappingURL=validate.js.map