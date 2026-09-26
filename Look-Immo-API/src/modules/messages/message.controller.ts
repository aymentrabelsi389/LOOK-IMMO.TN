import { Request, Response } from 'express';
import { emitToAdmin } from '../../core/socket/socket';
import { prisma } from '../../core/database/prisma';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, NotFoundError } from '../../core/errors';
import { CreateMessageDTO, UpdateMessageDTO } from './message.schema';

// Get all messages
export const getMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));

    const where = {
        ...(status && status !== 'all' ? { status: status as any } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search as string, mode: 'insensitive' as const } },
                    { email: { contains: search as string, mode: 'insensitive' as const } },
                    { message: { contains: search as string, mode: 'insensitive' as const } },
                ],
            }
            : {}),
    };

    const [messages, total] = await Promise.all([
        prisma.message.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.message.count({ where }),
    ]);

    res.setHeader('X-Total-Count', String(total));
    res.json(messages);
});

// Get single message
export const getMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
        where: { id },
    });

    if (!message) {
        throw new NotFoundError('Message not found');
    }

    res.json(message);
});

// Create message (Public - contact form with subject support)
export const createMessage = asyncHandler(async (req: Request<Record<string, never>, unknown, CreateMessageDTO>, res: Response): Promise<void> => {
    const { name, fullName, email, phone, subject, message: messageText } = req.body;
    const senderName = name || fullName;

    if (!senderName || !email || !messageText) {
        throw new BadRequestError('Name, email, and message are required');
    }

    const message = await prisma.message.create({
        data: {
            name: senderName,
            email,
            phone,
            subject: subject || null,
            message: messageText,
            status: 'unread',
        },
    });

    res.status(201).json(message);

    // Emit socket event for real-time updates
    emitToAdmin('message_new', message);

    // Create contact message notification for admins
    try {
        await createNotification({
            type: 'message_new',
            title: 'Nouveau Message',
            message: `Vous avez reçu un nouveau message de ${message.name}.`,
            icon: 'MessageSquare',
            link: '/admin', // Will show messages tab in AdminPanel
            userId: null,
            metadata: { messageId: message.id }
        });
    } catch (notifErr) {
        // notification failures should not abort message creation
    }
});

// Update message status
export const updateMessage = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateMessageDTO>, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    const existingMessage = await prisma.message.findUnique({
        where: { id },
    });

    if (!existingMessage) {
        throw new NotFoundError('Message not found');
    }

    const message = await prisma.message.update({
        where: { id },
        data: { status: status as any },
    });

    res.json(message);

    // Emit socket event for real-time updates
    emitToAdmin('message_update', message);
});

// Delete message
export const deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
        where: { id },
    });

    if (!message) {
        throw new NotFoundError('Message not found');
    }

    await prisma.message.delete({
        where: { id },
    });

    // Create notification
    try {
        await createNotification({
            type: 'message_delete',
            title: 'Message Supprimé',
            message: `Message supprimé de : ${message.name}`,
            icon: 'Trash',
            link: '/admin',
            userId: null,
            metadata: { messageId: id },
        });
    } catch (notifError) {
        logger.error('Failed to create message delete notification:', notifError);
    }

    res.json({ message: 'Message deleted successfully' });

    // Emit socket event for real-time updates
    emitToAdmin('message_delete', { id });
});
