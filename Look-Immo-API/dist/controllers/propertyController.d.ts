import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getProperties: (req: Request, res: Response) => Promise<void>;
export declare const getProperty: (req: Request, res: Response) => Promise<void>;
export declare const createProperty: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateProperty: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteProperty: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePropertyOrder: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=propertyController.d.ts.map