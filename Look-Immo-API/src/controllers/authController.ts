import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { sendResetCodeEmail } from '../services/emailService';
import { createNotification } from '../services/notificationService';

const getAccessTokenSecret = () => process.env.JWT_SECRET || 'fallback-access-secret';
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const ACCESS_TOKEN_EXPIRY = process.env.NODE_ENV === 'production' ? '15m' : '2h';
const REFRESH_TOKEN_EXPIRY = '7d';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as 'lax',  // 'lax' works for same-domain nginx proxy; 'strict' blocks cookies on navigations
    path: '/',
};

const setAuthCookies = async (
    res: Response,
    userId: string,
    email: string,
    role: string,
    existingFamilyId?: string
) => {
    const accessToken = jwt.sign(
        { id: userId, email, role },
        getAccessTokenSecret(),
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate secure random identifiers
    const tokenId = crypto.randomUUID();
    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshToken = jwt.sign(
        { id: userId, email, role, token: tokenId, familyId },
        getRefreshTokenSecret(),
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Persist refresh token to the database
    await prisma.refreshToken.create({
        data: {
            token: tokenId,
            userId,
            familyId,
            expiresAt,
        },
    });

    res.cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 2 * 60 * 60 * 1000, // prod: 15min, dev: 2h
    });

    res.cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Also return tokens in response body for Bearer token fallback (useful in dev/proxy setups)
    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, phone, role: 'client' },
            select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        });

        const tokens = await setAuthCookies(res, user.id, user.email, user.role);

        // Send registration notification for admins
        try {
            await createNotification({
                type: 'user_signup',
                title: 'Nouvel Utilisateur',
                message: `${user.name} a créé un nouveau compte.`,
                icon: 'UserPlus',
                link: '/admin',
                userId: null,
                metadata: { userId: user.id }
            });
        } catch (notifErr) {
            console.error('Failed to create signup notification:', notifErr);
        }

        res.status(201).json({ user: { ...user, favorites: [] }, accessToken: tokens.accessToken });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { favorites: { select: { propertyId: true } } },
        });

        if (!user) {
            res.status(401).json({ error: 'Aucun compte trouvé avec cet e-mail' });
            return;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Mot de passe incorrect' });
            return;
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

        const tokens = await setAuthCookies(res, user.id, user.email, user.role);

        res.json({
            accessToken: tokens.accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                favorites: user.favorites.map((f: any) => f.propertyId),
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) {
            // Attempt to decode to clean up the token family from the database
            const decoded = jwt.decode(refreshToken) as { familyId?: string } | null;
            if (decoded?.familyId) {
                await prisma.refreshToken.deleteMany({
                    where: { familyId: decoded.familyId }
                });
            }
        }
    } catch (error) {
        console.error('Logout token revocation error:', error);
    }

    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            res.status(401).json({ error: 'No refresh token' });
            return;
        }

        const decoded = jwt.verify(refreshToken, getRefreshTokenSecret()) as {
            id: string;
            email: string;
            role: string;
            token?: string;
            familyId?: string;
        };

        if (!decoded.token || !decoded.familyId) {
            res.clearCookie('access_token', COOKIE_OPTIONS);
            res.clearCookie('refresh_token', COOKIE_OPTIONS);
            res.status(401).json({ error: 'Invalid refresh token structure' });
            return;
        }

        // 1. Look up the token in the database
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: decoded.token },
        });

        // 2. Reuse detection (Compromise Signal)
        if (tokenRecord?.used) {
            console.warn(`[Security Alert] Refresh token reuse detected for family ${decoded.familyId}. Revoking family!`);
            await prisma.refreshToken.deleteMany({
                where: { familyId: decoded.familyId },
            });
            res.clearCookie('access_token', COOKIE_OPTIONS);
            res.clearCookie('refresh_token', COOKIE_OPTIONS);
            res.status(401).json({ error: 'Compromise detected. Session revoked.' });
            return;
        }

        // 3. Token not found at all
        if (!tokenRecord) {
            res.clearCookie('access_token', COOKIE_OPTIONS);
            res.clearCookie('refresh_token', COOKIE_OPTIONS);
            res.status(401).json({ error: 'Refresh token not found' });
            return;
        }

        // 4. Token expired
        if (new Date() > tokenRecord.expiresAt) {
            await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
            res.clearCookie('access_token', COOKIE_OPTIONS);
            res.clearCookie('refresh_token', COOKIE_OPTIONS);
            res.status(401).json({ error: 'Expired refresh token' });
            return;
        }

        // Verify user still exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        // 5. Rotate: mark current token as used
        await prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { used: true },
        });

        // 6. Issue new access token and rotated refresh token (preserving same familyId)
        const tokens = await setAuthCookies(res, user.id, user.email, user.role, decoded.familyId);

        res.json({ message: 'Token refreshed', accessToken: tokens.accessToken });
    } catch {
        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.clearCookie('refresh_token', COOKIE_OPTIONS);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLogin: true, // ✅ Include lastLogin
                favorites: { select: { propertyId: true } },
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            ...user,
            favorites: user.favorites.map((f: any) => f.propertyId),
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Generic response to prevent user enumeration
        const genericSuccess = { message: "Si un compte est associé à cet e-mail, un code de vérification vous a été envoyé." };

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            // Log audit for security
            console.log(`[AUDIT] Password reset requested for non-existent email: ${email}`);
            res.json(genericSuccess);
            return;
        }

        // Generate secure random 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        const resetCodeHash = await bcrypt.hash(code, 10);
        const resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetCodeHash,
                resetCodeExpiresAt,
                resetAttempts: 0
            }
        });

        console.log(`[AUDIT] Password reset code generated and hashed for user: ${user.email}`);

        // Send email
        await sendResetCodeEmail(user.email, code);

        res.json(genericSuccess);
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
};

export const verifyResetCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            res.status(400).json({ error: 'Email and code are required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
            res.status(400).json({ error: 'Code invalide ou expiré' });
            return;
        }

        // Check if code has expired
        if (new Date() > user.resetCodeExpiresAt) {
            res.status(400).json({ error: 'Code expiré' });
            return;
        }

        // Check attempts limit
        if (user.resetAttempts >= 5) {
            res.status(400).json({ error: 'Trop de tentatives infructueuses. Veuillez générer un nouveau code.' });
            return;
        }

        // Increment attempts first
        await prisma.user.update({
            where: { id: user.id },
            data: { resetAttempts: { increment: 1 } }
        });

        const isValid = await bcrypt.compare(code, user.resetCodeHash);
        if (!isValid) {
            console.log(`[AUDIT] Failed reset code attempt (${user.resetAttempts + 1}/5) for user: ${user.email}`);
            res.status(400).json({ error: 'Code de vérification incorrect' });
            return;
        }

        res.json({ message: 'Code vérifié avec succès' });
    } catch (error) {
        console.error('Verify reset code error:', error);
        res.status(500).json({ error: 'Failed to verify reset code' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, code, password } = req.body;

        if (!email || !code || !password) {
            res.status(400).json({ error: 'Email, code, and new password are required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
            res.status(400).json({ error: 'Code invalide ou expiré' });
            return;
        }

        if (new Date() > user.resetCodeExpiresAt) {
            res.status(400).json({ error: 'Code expiré' });
            return;
        }

        if (user.resetAttempts >= 5) {
            res.status(400).json({ error: 'Trop de tentatives. Veuillez générer un nouveau code.' });
            return;
        }

        // Verify code
        const isValid = await bcrypt.compare(code, user.resetCodeHash);
        if (!isValid) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetAttempts: { increment: 1 } }
            });
            res.status(400).json({ error: 'Code de vérification incorrect' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and clear reset fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetCodeHash: null,
                resetCodeExpiresAt: null,
                resetAttempts: 0
            }
        });

        console.log(`[AUDIT] Password reset successfully for user: ${user.email}`);

        // Invalidate sessions on the client by clearing auth cookies
        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.clearCookie('refresh_token', COOKIE_OPTIONS);

        res.json({ message: 'Votre mot de passe a été réinitialisé avec succès.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
