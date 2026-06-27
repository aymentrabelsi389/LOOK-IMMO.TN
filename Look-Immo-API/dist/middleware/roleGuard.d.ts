import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
type Role = 'admin' | 'agent' | 'client';
export declare const roleGuard: (...allowedRoles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const adminOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const agentOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const agentOrAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const clientOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const authenticated: (req: AuthRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=roleGuard.d.ts.map