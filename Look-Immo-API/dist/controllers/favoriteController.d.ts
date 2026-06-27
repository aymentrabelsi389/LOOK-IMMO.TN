import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getFavorites: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addFavorite: (req: AuthRequest, res: Response) => Promise<void>;
export declare const removeFavorite: (req: AuthRequest, res: Response) => Promise<void>;
export declare const checkFavorite: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=favoriteController.d.ts.map