import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const refresh: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<void>;
export declare const verifyResetCode: (req: Request, res: Response) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map