import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { COOKIE_OPTIONS } from '../auth/auth.controller';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../../core/errors';
import { CreateUserDTO, UpdateUserDTO } from './user.schema';

// Get all users (Admin only)
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { role, search } = req.query;

    const users = await prisma.user.findMany({
        where: {
            ...(role && role !== 'all' ? { role: role as any } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' } },
                        { email: { contains: search as string, mode: 'insensitive' } },
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
        favorites: user.favorites.map((f: any) => f.propertyId)
    }));

    res.json(transformedUsers);
});

// Get single user
export const getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
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
        throw new NotFoundError('User not found');
    }

    // Transform favorites to array of property IDs
    res.json({
        ...user,
        favorites: user.favorites.map((f: any) => f.propertyId)
    });
});

// Create user (Admin only)
export const createUser = asyncHandler(async (req: Request<Record<string, never>, unknown, CreateUserDTO>, res: Response): Promise<void> => {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
        throw new BadRequestError('Name, email, and password are required');
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
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
        await createNotification({
            type: 'user_signup',
            title: 'Nouvel Utilisateur',
            message: `Nouvel utilisateur créé : ${user.name} (${user.role})`,
            icon: 'UserPlus',
            link: '/admin',
            userId: null,
            metadata: { userId: user.id },
        });
    } catch (notifError) {
        // notification failures should not abort user creation
    }

    res.status(201).json(user);
});

// Update user
export const updateUser = asyncHandler(async (req: AuthRequest & { body: UpdateUserDTO }, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, phone, role, password } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
        throw new UnauthorizedError('Authentication required');
    }

    // Only the user themselves or an admin can update a profile
    const isAdmin = requestingUser.role === 'admin';
    const isSelf = requestingUser.id === id;

    if (!isAdmin && !isSelf) {
        throw new ForbiddenError('Insufficient permissions');
    }

    // Only admins can change roles
    if (role && !isAdmin) {
        throw new ForbiddenError('Only admins can change user roles');
    }

    const existingUser = await prisma.user.findUnique({
        where: { id },
    });

    if (!existingUser) {
        throw new NotFoundError('User not found');
    }

    // Check for duplicate email if email is being changed
    if (email && email !== existingUser.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email } });
        if (emailTaken) {
            throw new ConflictError('Email already registered to another account');
        }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role && isAdmin) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
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
        await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    // Notification if role changed
    if (role && role !== existingUser.role) {
        try {
            await createNotification({
                type: 'user_role_change',
                title: 'Rôle Modifié',
                message: `Rôle utilisateur modifié : ${user.name} (${existingUser.role} → ${role})`,
                icon: 'UserCheck',
                link: '/admin',
                userId: null,
                metadata: { userId: user.id },
            });
        } catch (notifError) {
            logger.error('Failed to create user role change notification:', notifError);
        }
    }

    // If the caller changed their own password, their current session's
    // access/refresh cookies are now stale relative to the revoked
    // refresh token — clear them so the client re-authenticates cleanly
    // instead of hitting a confusing 401 on the next silent refresh.
    if (password && isSelf) {
        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.clearCookie('refresh_token', COOKIE_OPTIONS);
    }

    res.json(user);
});

// Delete user
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    await prisma.user.delete({
        where: { id },
    });

    // Create notification
    try {
        await createNotification({
            type: 'user_delete',
            title: 'Utilisateur Supprimé',
            message: `Utilisateur supprimé : ${user.name} (${user.email})`,
            icon: 'UserX',
            link: '/admin',
            userId: null,
            metadata: { userId: id },
        });
    } catch (notifError) {
        logger.error('Failed to create user delete notification:', notifError);
    }

    res.json({ message: 'User deleted successfully' });
});
