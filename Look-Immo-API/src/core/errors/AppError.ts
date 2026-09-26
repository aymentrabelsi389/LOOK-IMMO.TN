/**
 * Custom Error Hierarchy for LOOK-IMMO API
 *
 * Usage:
 *   throw new NotFoundError('Property not found');
 *   throw new BadRequestError('Email is required');
 *   throw new UnauthorizedError('Invalid credentials');
 *   throw new ForbiddenError('Admin access required');
 *   throw new ConflictError('Email already registered');
 *   throw new ValidationError('Invalid input data', [{ path: 'email', message: 'Invalid format' }]);
 *   throw new TooManyRequestsError('Rate limit exceeded');
 *   throw new UnsupportedMediaTypeError('Only WebP and JPEG images are supported');
 *
 * The global error handler in index.ts catches these and returns
 * the correct HTTP status code + JSON response format.
 */

export class AppError extends Error {
    /** HTTP status code to send to the client */
    public readonly statusCode: number;

    /**
     * If true, the error message is safe to show to end users.
     * Unexpected errors (plain `Error`, DB crashes, etc.) are NOT operational
     * and get a generic "Internal server error" message in production.
     */
    public readonly isOperational: boolean;

    /** Optional structured metadata or validation errors */
    public readonly details?: Array<{ path: string; message: string }> | Record<string, unknown>;

    constructor(
        message: string,
        statusCode: number,
        isOperational = true,
        details?: Array<{ path: string; message: string }> | Record<string, unknown>
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;

        // Maintain proper prototype chain for `instanceof` checks across transpiled TS/JS
        Object.setPrototypeOf(this, new.target.prototype);

        // Capture stack trace (skip this constructor frame)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// ─── 400 Bad Request ──────────────────────────────────────────────────────────
export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details?: Array<{ path: string; message: string }> | Record<string, unknown>) {
        super(message, 400, true, details);
    }
}

// ─── 401 Unauthorized ─────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

// ─── 403 Forbidden ────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403);
    }
}

// ─── 404 Not Found ────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

// ─── 409 Conflict ─────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

// ─── 413 Payload Too Large ────────────────────────────────────────────────────
export class PayloadTooLargeError extends AppError {
    constructor(message = 'Payload too large') {
        super(message, 413);
    }
}

// ─── 415 Unsupported Media Type ───────────────────────────────────────────────
export class UnsupportedMediaTypeError extends AppError {
    constructor(message = 'Unsupported media type') {
        super(message, 415);
    }
}

// ─── 422 Unprocessable Entity / Validation ───────────────────────────────────
export class ValidationError extends AppError {
    constructor(
        message = 'Validation failed',
        details?: Array<{ path: string; message: string }>
    ) {
        super(message, 422, true, details);
    }
}

// ─── 429 Too Many Requests ────────────────────────────────────────────────────
export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
    }
}

// ─── 500 Internal Server Error ────────────────────────────────────────────────
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', isOperational = false) {
        super(message, 500, isOperational);
    }
}
