"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'fallback-access-secret';
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Prefer HTTP-only cookie
        let token = req.cookies?.access_token;
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
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next();
    }
    catch (error) {
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
            const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
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