"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.updateMessage = exports.createMessage = exports.getMessage = exports.getMessages = void 0;
const socket_1 = require("../utils/socket");
const prisma_1 = require("../utils/prisma");
// Get all messages
const getMessages = async (req, res) => {
    try {
        const { status, search } = req.query;
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                ...(status && status !== 'all' ? { status: status } : {}),
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { message: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(messages);
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
};
exports.getMessages = getMessages;
// Get single message
const getMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await prisma_1.prisma.message.findUnique({
            where: { id },
        });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        res.json(message);
    }
    catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: 'Failed to get message' });
    }
};
exports.getMessage = getMessage;
// Create message (Public - contact form with subject support)
const createMessage = async (req, res) => {
    try {
        const { name, fullName, email, phone, subject, message: messageText } = req.body;
        const senderName = name || fullName;
        if (!senderName || !email || !messageText) {
            res.status(400).json({ error: 'Name, email, and message are required' });
            return;
        }
        const message = await prisma_1.prisma.message.create({
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
        (0, socket_1.emitToAdmin)('message_new', message);
    }
    catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
};
exports.createMessage = createMessage;
// Update message status
const updateMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const existingMessage = await prisma_1.prisma.message.findUnique({
            where: { id },
        });
        if (!existingMessage) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        const message = await prisma_1.prisma.message.update({
            where: { id },
            data: { status },
        });
        res.json(message);
        // Emit socket event for real-time updates
        (0, socket_1.emitToAdmin)('message_update', message);
    }
    catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
};
exports.updateMessage = updateMessage;
// Delete message
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await prisma_1.prisma.message.findUnique({
            where: { id },
        });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        await prisma_1.prisma.message.delete({
            where: { id },
        });
        // Create notification
        await prisma_1.prisma.notification.create({
            data: {
                type: 'message_delete',
                message: `Message deleted from: ${message.name}`,
                entityId: id,
            },
        });
        res.json({ message: 'Message deleted successfully' });
        // Emit socket event for real-time updates
        (0, socket_1.emitToAdmin)('message_delete', { id });
    }
    catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};
exports.deleteMessage = deleteMessage;
//# sourceMappingURL=messageController.js.map