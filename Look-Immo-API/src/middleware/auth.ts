import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

const getAccessTokenSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // 1. Prefer HTTP-only cookie
        let token = req.cookies?.access_token;

        logger.debug('auth check', { hasCookie: !!req.cookies?.access_token, hasAuthHeader: !!req.headers.authorization });

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
            decoded = jwt.verify(token, getAccessTokenSecret()) as {
                id: string;
                email: string;
                role: string;
            };
        } catch (err) {
            logger.debug('token verify error', { message: err && (err as Error).message });
            throw err;
        }

        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next();
    } catch (_error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token = req.cookies?.access_token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (token) {
            const decoded = jwt.verify(token, getAccessTokenSecret()) as {
                id: string;
                email: string;
                role: string;
            };
            // Trust the JWT — no DB lookup on optional auth paths
            req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        }

        next();
    } catch {
        next(); // Continue without auth on failure
    }
};
