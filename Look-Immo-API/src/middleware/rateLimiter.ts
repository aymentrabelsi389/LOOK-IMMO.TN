import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

// Global API rate limiter (generous to handle normal navigation)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 5000 : 999999, // Extremely generous limit for development
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.' }
});

// Stricter rate limiter for authentication routes (login, register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 50 : 99999, // Relaxed limit for auth in development
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion depuis cette IP, veuillez réessayer dans 15 minutes.' }
});

// Extremely strict rate limiter for password reset requests to prevent abuse
export const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 5 : 99999, // Stricter limit in production (5 requests per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de demandes de réinitialisation de mot de passe, veuillez réessayer dans 15 minutes.' }
});

