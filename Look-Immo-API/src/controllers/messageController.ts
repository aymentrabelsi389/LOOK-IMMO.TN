import { Request, Response } from 'express';
import { emitToAdmin } from '../utils/socket';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notificationService';

// Get all messages
export const getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, search } = req.query;

        const messages = await prisma.message.findMany({
            where: {
                ...(status && status !== 'all' ? { status: status as any } : {}),
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search as string, mode: 'insensitive' } },
                            { email: { contains: search as string, mode: 'insensitive' } },
                            { message: { contains: search as string, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
};

// Get single message
export const getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        res.json(message);
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: 'Failed to get message' });
    }
};

// Create message (Public - contact form with subject support)
export const createMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, fullName, email, phone, subject, message: messageText } = req.body;
        const senderName = name || fullName;

        if (!senderName || !email || !messageText) {
            res.status(400).json({ error: 'Name, email, and message are required' });
            return;
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
            console.error('Failed to create message notification:', notifErr);
        }
    } catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
};

// Update message status
export const updateMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const existingMessage = await prisma.message.findUnique({
            where: { id },
        });

        if (!existingMessage) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        const message = await prisma.message.update({
            where: { id },
            data: { status },
        });

        res.json(message);

        // Emit socket event for real-time updates
        emitToAdmin('message_update', message);
    } catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
};

// Delete message
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        await prisma.message.delete({
            where: { id },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'message_delete',
                message: `Message deleted from: ${message.name}`,
                entityId: id,
            },
        });

        res.json({ message: 'Message deleted successfully' });

        // Emit socket event for real-time updates
        emitToAdmin('message_delete', { id });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};
