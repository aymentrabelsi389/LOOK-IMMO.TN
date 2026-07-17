import { resetPassword } from './authController';
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';

jest.mock('../utils/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        refreshToken: {
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

jest.mock('../services/emailService', () => ({
    sendResetCodeEmail: jest.fn(),
}));

describe('authController resetPassword', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {
                email: 'test@example.com',
                code: '123456',
                password: 'newPassword123'
            }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
        };
    });

    it('should successfully reset password, update user, revoke all active refresh tokens, and clear cookies', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            resetCodeHash: 'hashedResetCode',
            resetCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes in future
            resetAttempts: 0,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prisma.user.update as jest.Mock).mockResolvedValue({});
        (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

        await resetPassword(mockReq as Request, mockRes as Response);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'test@example.com' }
        });
        expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashedResetCode');
        expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
        
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-123' },
            data: {
                password: 'hashedNewPassword',
                resetCodeHash: null,
                resetCodeExpiresAt: null,
                resetAttempts: 0
            }
        });

        // Verify that refreshToken.deleteMany is called with the user's ID
        expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'user-123' }
        });

        expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Votre mot de passe a été réinitialisé avec succès.'
        });
    });

    it('should return 400 if user does not exist or has no reset code', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await resetPassword(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Code invalide ou expiré' });
        expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 if reset code has expired', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            resetCodeHash: 'hashedResetCode',
            resetCodeExpiresAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes in past
            resetAttempts: 0,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        await resetPassword(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Code expiré' });
        expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 if reset code is invalid and increment attempts', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            resetCodeHash: 'hashedResetCode',
            resetCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 5),
            resetAttempts: 1,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await resetPassword(mockReq as Request, mockRes as Response);

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-123' },
            data: { resetAttempts: { increment: 1 } }
        });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Code de vérification incorrect' });
        expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
});
