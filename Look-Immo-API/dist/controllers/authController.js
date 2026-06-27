"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyResetCode = exports.forgotPassword = exports.getMe = exports.refresh = exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../utils/prisma");
const emailService_1 = require("../services/emailService");
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'fallback-access-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
    path: '/',
};
const setAuthCookies = (res, userId, email, role) => {
    const accessToken = jsonwebtoken_1.default.sign({ id: userId, email, role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userId, email, role }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    res.cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: hashedPassword, phone, role: 'client' },
            select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        });
        setAuthCookies(res, user.id, user.email, user.role);
        res.status(201).json({ user: { ...user, favorites: [] } });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { favorites: { select: { propertyId: true } } },
        });
        if (!user) {
            res.status(401).json({ error: 'Aucun compte trouvé avec cet e-mail' });
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Mot de passe incorrect' });
            return;
        }
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        setAuthCookies(res, user.id, user.email, user.role);
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin, // ✅ Return actual stored lastLogin (before update)
                favorites: user.favorites.map((f) => f.propertyId),
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
};
exports.logout = logout;
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            res.status(401).json({ error: 'No refresh token' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_TOKEN_SECRET);
        // Verify user still exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        // Issue new access token (and rotate refresh token)
        setAuthCookies(res, user.id, user.email, user.role);
        res.json({ message: 'Token refreshed' });
    }
    catch (error) {
        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.clearCookie('refresh_token', COOKIE_OPTIONS);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
};
exports.refresh = refresh;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma_1.prisma.user.findUnique({
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
            favorites: user.favorites.map((f) => f.propertyId),
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};
exports.getMe = getMe;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        // Generic response to prevent user enumeration
        const genericSuccess = { message: "Si un compte est associé à cet e-mail, un code de vérification vous a été envoyé." };
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            // Log audit for security
            console.log(`[AUDIT] Password reset requested for non-existent email: ${email}`);
            res.json(genericSuccess);
            return;
        }
        // Generate secure random 6-digit code
        const code = crypto_1.default.randomInt(100000, 999999).toString();
        const resetCodeHash = await bcryptjs_1.default.hash(code, 10);
        const resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetCodeHash,
                resetCodeExpiresAt,
                resetAttempts: 0
            }
        });
        console.log(`[AUDIT] Password reset code generated and hashed for user: ${user.email}`);
        // Send email
        await (0, emailService_1.sendResetCodeEmail)(user.email, code);
        res.json(genericSuccess);
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
};
exports.forgotPassword = forgotPassword;
const verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            res.status(400).json({ error: 'Email and code are required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { resetAttempts: { increment: 1 } }
        });
        const isValid = await bcryptjs_1.default.compare(code, user.resetCodeHash);
        if (!isValid) {
            console.log(`[AUDIT] Failed reset code attempt (${user.resetAttempts + 1}/5) for user: ${user.email}`);
            res.status(400).json({ error: 'Code de vérification incorrect' });
            return;
        }
        res.json({ message: 'Code vérifié avec succès' });
    }
    catch (error) {
        console.error('Verify reset code error:', error);
        res.status(500).json({ error: 'Failed to verify reset code' });
    }
};
exports.verifyResetCode = verifyResetCode;
const resetPassword = async (req, res) => {
    try {
        const { email, code, password } = req.body;
        if (!email || !code || !password) {
            res.status(400).json({ error: 'Email, code, and new password are required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
        const isValid = await bcryptjs_1.default.compare(code, user.resetCodeHash);
        if (!isValid) {
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { resetAttempts: { increment: 1 } }
            });
            res.status(400).json({ error: 'Code de vérification incorrect' });
            return;
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Update password and clear reset fields
        await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map