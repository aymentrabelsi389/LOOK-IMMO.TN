"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const getAccessTokenSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Prefer HTTP-only cookie
        let token = req.cookies?.access_token;
        logger_1.logger.debug('auth check', { hasCookie: !!req.cookies?.access_token, hasAuthHeader: !!req.headers.authorization });
        // 2. Fallback to Bearer header (for backward compatibility)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Trust the JWT signature — no DB lookup needed on every request.
        // The access token expires in 15 minutes, limiting any risk from deleted users.
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, getAccessTokenSecret());
        }
        catch (err) {
            logger_1.logger.debug('token verify error', { message: err && err.message });
            throw err;
        }
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next();
    }
    catch (_error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.access_token;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, getAccessTokenSecret());
            // Trust the JWT — no DB lookup on optional auth paths
            req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        }
        next();
    }
    catch {
        next(); // Continue without auth on failure
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map