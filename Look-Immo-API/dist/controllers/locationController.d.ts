import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getLocations: (req: Request, res: Response) => Promise<void>;
export declare const getLocation: (req: Request, res: Response) => Promise<void>;
export declare const createLocation: (req: Request, res: Response) => Promise<void>;
export declare const updateLocation: (req: Request, res: Response) => Promise<void>;
export declare const deleteLocation: (req: Request, res: Response) => Promise<void>;
export declare const updateLocationOrder: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=locationController.d.ts.map