import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getAppointments: (req: Request, res: Response) => Promise<void>;
export declare const getAppointment: (req: Request, res: Response) => Promise<void>;
export declare const createAppointment: (req: Request, res: Response) => Promise<void>;
export declare const updateAppointment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteAppointment: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=appointmentController.d.ts.map