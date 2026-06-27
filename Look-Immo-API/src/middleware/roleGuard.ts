import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Role = 'admin' | 'agent' | 'client';

export const roleGuard = (...allowedRoles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};

// Shorthand guards
export const adminOnly = roleGuard('admin');
export const agentOnly = roleGuard('agent');
export const agentOrAdmin = roleGuard('admin', 'agent');
export const clientOnly = roleGuard('client');
export const authenticated = roleGuard('admin', 'agent', 'client');
