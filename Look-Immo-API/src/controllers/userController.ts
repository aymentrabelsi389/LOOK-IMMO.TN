import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

// Get all users (Admin only)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

// Get single user
export const getUser = async (req: Request, res: Response): Promise<void> => {
    try {
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
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Transform favorites to array of property IDs
        res.json({
            ...user,
            favorites: user.favorites.map((f: any) => f.propertyId)
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

// Create user (Admin only)
export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
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
        await prisma.notification.create({
            data: {
                type: 'user_role_change',
                message: `New user created: ${user.name} (${user.role})`,
                entityId: user.id,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
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

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check for duplicate email if email is being changed
        if (email && email !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                res.status(400).json({ error: 'Email already registered to another account' });
                return;
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

        // Notification if role changed
        if (role && role !== existingUser.role) {
            await prisma.notification.create({
                data: {
                    type: 'user_role_change',
                    message: `User role changed: ${user.name} (${existingUser.role} → ${role})`,
                    entityId: user.id,
                },
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        await prisma.user.delete({
            where: { id },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'user_delete',
                message: `User deleted: ${user.name} (${user.email})`,
                entityId: id,
            },
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
