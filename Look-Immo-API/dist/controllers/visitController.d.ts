import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getVisits: (req: Request, res: Response) => Promise<void>;
export declare const getVisit: (req: Request, res: Response) => Promise<void>;
export declare const createVisit: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteVisit: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=visitController.d.ts.map