import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getRatings: (req: Request, res: Response) => Promise<void>;
export declare const getRating: (req: Request, res: Response) => Promise<void>;
export declare const createRating: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteRating: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ratingController.d.ts.map