import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const getUser: (req: Request, res: Response) => Promise<void>;
export declare const createUser: (req: Request, res: Response) => Promise<void>;
export declare const updateUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map