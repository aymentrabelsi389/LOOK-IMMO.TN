"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUser = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const authController_1 = require("./authController");
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
// Get all users (Admin only)
const getUsers = async (req, res) => {
    try {
        const { role, search } = req.query;
        const users = await prisma_1.prisma.user.findMany({
            where: {
                ...(role && role !== 'all' ? { role: role } : {}),
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLogin: true,
                favorites: {
                    select: { propertyId: true }
                },
                _count: {
                    select: {
                        properties: true,
                        ratings: true
                    },
                },
                ratings: {
                    select: {
                        id: true,
                        stars: true,
                        comment: true,
                        createdAt: true,
                        property: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Transform favorites to array of property IDs
        const transformedUsers = users.map(user => ({
            ...user,
            favorites: user.favorites.map((f) => f.propertyId)
        }));
        res.json(transformedUsers);
    }
    catch (error) {
        logger_1.logger.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};
exports.getUsers = getUsers;
// Get single user
const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLogin: true,
                favorites: {
                    select: { propertyId: true }
                },
                properties: {
                    select: { id: true, title: true },
                },
                ratings: {
                    select: {
                        id: true,
                        stars: true,
                        comment: true,
                        createdAt: true,
                        property: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                },
            },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Transform favorites to array of property IDs
        res.json({
            ...user,
            favorites: user.favorites.map((f) => f.propertyId)
        });
    }
    catch (error) {
        logger_1.logger.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};
exports.getUser = getUser;
// Create user (Admin only)
const createUser = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                role: role || 'client',
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLogin: true,
            },
        });
        // Create notification
        try {
            await (0, notificationService_1.createNotification)({
                type: 'user_signup',
                title: 'Nouvel Utilisateur',
                message: `Nouvel utilisateur créé : ${user.name} (${user.role})`,
                icon: 'UserPlus',
                link: '/admin',
                userId: null,
                metadata: { userId: user.id },
            });
        }
        catch (notifError) {
            logger_1.logger.error('Failed to create user notification:', notifError);
        }
        res.status(201).json(user);
    }
    catch (error) {
        logger_1.logger.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};
exports.createUser = createUser;
// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, role, password } = req.body;
        const requestingUser = req.user;
        if (!requestingUser) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Only the user themselves or an admin can update a profile
        const isAdmin = requestingUser.role === 'admin';
        const isSelf = requestingUser.id === id;
        if (!isAdmin && !isSelf) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        // Only admins can change roles
        if (role && !isAdmin) {
            res.status(403).json({ error: 'Only admins can change user roles' });
            return;
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Check for duplicate email if email is being changed
        if (email && email !== existingUser.email) {
            const emailTaken = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                res.status(400).json({ error: 'Email already registered to another account' });
                return;
            }
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (phone !== undefined)
            updateData.phone = phone;
        if (role && isAdmin)
            updateData.role = role;
        if (password)
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                lastLogin: true,
            },
        });
        // Revoking sessions on password change: if a password changes here,
        // any stolen/leaked session (including the attacker's, if this
        // change is a compromise-recovery action) should stop working —
        // same behavior resetPassword already has. Note this runs whenever
        // *any* password field is present, whether the caller is the user
        // themselves or an admin resetting someone else's password.
        if (password) {
            await prisma_1.prisma.refreshToken.deleteMany({ where: { userId: id } });
        }
        // Notification if role changed
        if (role && role !== existingUser.role) {
            try {
                await (0, notificationService_1.createNotification)({
                    type: 'user_role_change',
                    title: 'Rôle Modifié',
                    message: `Rôle utilisateur modifié : ${user.name} (${existingUser.role} → ${role})`,
                    icon: 'UserCheck',
                    link: '/admin',
                    userId: null,
                    metadata: { userId: user.id },
                });
            }
            catch (notifError) {
                logger_1.logger.error('Failed to create user role change notification:', notifError);
            }
        }
        // If the caller changed their own password, their current session's
        // access/refresh cookies are now stale relative to the revoked
        // refresh token — clear them so the client re-authenticates cleanly
        // instead of hitting a confusing 401 on the next silent refresh.
        if (password && isSelf) {
            res.clearCookie('access_token', authController_1.COOKIE_OPTIONS);
            res.clearCookie('refresh_token', authController_1.COOKIE_OPTIONS);
        }
        res.json(user);
    }
    catch (error) {
        logger_1.logger.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        await prisma_1.prisma.user.delete({
            where: { id },
        });
        // Create notification
        try {
            await (0, notificationService_1.createNotification)({
                type: 'user_delete',
                title: 'Utilisateur Supprimé',
                message: `Utilisateur supprimé : ${user.name} (${user.email})`,
                icon: 'UserX',
                link: '/admin',
                userId: null,
                metadata: { userId: id },
            });
        }
        catch (notifError) {
            logger_1.logger.error('Failed to create user delete notification:', notifError);
        }
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=userController.js.map