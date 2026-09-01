"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAppointment = exports.updateAppointment = exports.createAppointment = exports.getAppointment = exports.getAppointments = void 0;
const socket_1 = require("../utils/socket");
const prisma_1 = require("../utils/prisma");
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
// Get all appointments
const getAppointments = async (req, res) => {
    try {
        const { status, propertyId, search } = req.query;
        const authReq = req;
        const role = authReq.user?.role;
        const userId = authReq.user?.id;
        const email = authReq.user?.email;
        let appointments;
        if (role === 'admin' || role === 'agent') {
            appointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    ...(status && status !== 'all' ? { status: status } : {}),
                    ...(propertyId ? { propertyId: propertyId } : {}),
                    ...(search
                        ? {
                            OR: [
                                { clientName: { contains: search, mode: 'insensitive' } },
                                { clientEmail: { contains: search, mode: 'insensitive' } },
                            ],
                        }
                        : {}),
                },
                include: {
                    property: {
                        select: { id: true, title: true, city: true },
                    },
                },
                orderBy: { date: 'desc' },
            });
        }
        else {
            // Clients can only see their own appointments
            const conditions = [];
            if (email)
                conditions.push({ clientEmail: email });
            const userRecord = userId ? await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { phone: true }
            }) : null;
            if (userRecord?.phone) {
                conditions.push({ clientPhone: userRecord.phone });
            }
            appointments = await prisma_1.prisma.appointment.findMany({
                where: conditions.length > 0 ? { OR: conditions } : { id: 'none' },
                include: {
                    property: {
                        select: { id: true, title: true, city: true },
                    },
                },
                orderBy: { date: 'desc' },
            });
        }
        res.json(appointments);
    }
    catch (error) {
        logger_1.logger.error('Get appointments error:', error);
        res.status(500).json({ error: 'Failed to get appointments' });
    }
};
exports.getAppointments = getAppointments;
// Get single appointment
const getAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req;
        const role = authReq.user?.role;
        const userId = authReq.user?.id;
        const email = authReq.user?.email;
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: {
                property: {
                    select: { id: true, title: true, city: true, price: true },
                },
            },
        });
        if (!appointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        // Fetch user phone to do full phone matching as well
        const userRecord = userId ? await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        }) : null;
        // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
        const isOwner = (appointment.clientEmail && appointment.clientEmail === email) ||
            (appointment.clientPhone && userRecord?.phone && appointment.clientPhone === userRecord.phone);
        if (role !== 'admin' && role !== 'agent' && !isOwner) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        res.json(appointment);
    }
    catch (error) {
        logger_1.logger.error('Get appointment error:', error);
        res.status(500).json({ error: 'Failed to get appointment' });
    }
};
exports.getAppointment = getAppointment;
// Create appointment (Public - clients can book)
const createAppointment = async (req, res) => {
    try {
        const { clientName, clientEmail, clientPhone, date, time, propertyId, notes, source, meetingType } = req.body;
        // time is optional — appointments can be saved without a confirmed time
        if (!clientName || !date) {
            res.status(400).json({ error: 'Client name and date are required' });
            return;
        }
        // Verify property exists if provided
        if (propertyId) {
            const property = await prisma_1.prisma.property.findUnique({
                where: { id: propertyId },
            });
            if (!property) {
                res.status(404).json({ error: 'Property not found' });
                return;
            }
        }
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                clientName,
                clientEmail,
                clientPhone,
                date: new Date(date),
                time: time || null,
                propertyId: propertyId || null,
                notes,
                source: source || 'other',
                meetingType: meetingType || 'visite',
                status: 'pending',
            },
            include: {
                property: {
                    select: { id: true, title: true, city: true },
                },
            },
        });
        res.status(201).json(appointment);
        // Emit socket event for real-time updates
        (0, socket_1.emitToAdmin)('appointment_new', appointment);
        // Send appointment booking notifications
        try {
            const formattedDate = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
            const timeLabel = time ? ` à ${time}` : ' (heure à définir)';
            // Create notification for admins/agents
            await (0, notificationService_1.createNotification)({
                type: 'appointment_new',
                title: 'Nouveau Rendez-vous',
                message: `Nouveau rendez-vous planifié pour le ${formattedDate}${timeLabel}.`,
                icon: 'Calendar',
                link: '/admin',
                userId: null,
                metadata: { appointmentId: appointment.id }
            });
            // Find matching user to emit to their personal socket room and create personal notification
            if (appointment.clientEmail || appointment.clientPhone) {
                const clientUser = await prisma_1.prisma.user.findFirst({
                    where: {
                        OR: [
                            ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                            ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                        ]
                    },
                    select: { id: true }
                });
                if (clientUser) {
                    (0, socket_1.emitToUser)(clientUser.id, 'appointment_new', appointment);
                    // Create notification for the client user
                    await (0, notificationService_1.createNotification)({
                        type: 'appointment_new',
                        title: 'Rendez-vous Confirmé',
                        message: `Votre demande de rendez-vous pour le ${formattedDate}${timeLabel} a été reçue.`,
                        icon: 'Calendar',
                        link: '/dashboard',
                        userId: clientUser.id,
                        metadata: { appointmentId: appointment.id }
                    });
                }
            }
        }
        catch (notifErr) {
            logger_1.logger.error('Failed to create appointment notifications:', notifErr);
        }
    }
    catch (error) {
        logger_1.logger.error('Create appointment error:', error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};
exports.createAppointment = createAppointment;
// Update appointment status
const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, date, time, source, meetingType, propertyId, clientName, clientPhone, clientEmail } = req.body;
        const existingAppointment = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: { property: true },
        });
        if (!existingAppointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        const { role, id: userId, email } = req.user || {};
        // Fetch user phone to do full phone matching as well
        const userRecord = userId ? await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        }) : null;
        // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
        const isOwner = (existingAppointment.clientEmail && existingAppointment.clientEmail === email) ||
            (existingAppointment.clientPhone && userRecord?.phone && existingAppointment.clientPhone === userRecord.phone);
        if (role !== 'admin' && role !== 'agent' && !isOwner) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        // Clients cannot approve/accept their own appointments! Only Admins/Agents can change status (except to cancel/reject their own)!
        if (role !== 'admin' && role !== 'agent' && status && status !== existingAppointment.status) {
            if (status !== 'rejected') {
                res.status(403).json({ error: 'Access denied: Clients cannot approve or reopen appointments' });
                return;
            }
        }
        const appointment = await prisma_1.prisma.appointment.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(date && { date: new Date(date) }),
                // Allow explicitly clearing time by passing empty string
                ...(time !== undefined && { time: time || null }),
                ...(source && { source }),
                ...(meetingType && { meetingType }),
                ...(propertyId !== undefined && { propertyId }),
                ...(clientName && { clientName }),
                ...(clientPhone !== undefined && { clientPhone }),
                ...(clientEmail !== undefined && { clientEmail }),
            },
            include: {
                property: {
                    select: { id: true, title: true, city: true },
                },
            },
        });
        // Create notification for status changes
        if (status && status !== existingAppointment.status) {
            const notificationType = status === 'accepted' ? 'appointment_accept' : status === 'rejected' ? 'appointment_reject' : null;
            if (notificationType) {
                try {
                    await prisma_1.prisma.notification.create({
                        data: {
                            type: notificationType,
                            message: `Appointment ${status}: ${existingAppointment.clientName}${existingAppointment.property ? ` for ${existingAppointment.property.title}` : ''}`,
                            entityId: id,
                        },
                    });
                }
                catch (notificationError) {
                    logger_1.logger.error('Failed to create status notification:', notificationError);
                }
            }
        }
        res.json(appointment);
        // Emit socket event for real-time updates
        (0, socket_1.emitToAdmin)('appointment_update', appointment);
        // Find matching user to emit to their personal socket room
        if (appointment.clientEmail || appointment.clientPhone) {
            const clientUser = await prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                        ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                    ]
                },
                select: { id: true }
            });
            if (clientUser) {
                (0, socket_1.emitToUser)(clientUser.id, 'appointment_update', appointment);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Update appointment error:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
};
exports.updateAppointment = updateAppointment;
// Delete appointment
const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req;
        const role = authReq.user?.role;
        const userId = authReq.user?.id;
        const email = authReq.user?.email;
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: { property: true },
        });
        if (!appointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        // Fetch user phone to do full phone matching as well
        const userRecord = userId ? await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        }) : null;
        // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
        const isOwner = (appointment.clientEmail && appointment.clientEmail === email) ||
            (appointment.clientPhone && userRecord?.phone && appointment.clientPhone === userRecord.phone);
        if (role !== 'admin' && role !== 'agent' && !isOwner) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        await prisma_1.prisma.appointment.delete({
            where: { id },
        });
        // Create notification
        try {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'appointment_delete',
                    message: `Appointment deleted: ${appointment.clientName}${appointment.property ? ` for ${appointment.property.title}` : ''}`,
                    entityId: id,
                },
            });
        }
        catch (notificationError) {
            logger_1.logger.error('Failed to create delete notification:', notificationError);
        }
        res.json({ message: 'Appointment deleted successfully' });
        // Emit socket event for real-time updates
        (0, socket_1.emitToAdmin)('appointment_delete', { id });
        // Find matching user to emit to their personal socket room
        if (appointment.clientEmail || appointment.clientPhone) {
            const clientUser = await prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                        ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                    ]
                },
                select: { id: true }
            });
            if (clientUser) {
                (0, socket_1.emitToUser)(clientUser.id, 'appointment_delete', { id });
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Delete appointment error:', error);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
};
exports.deleteAppointment = deleteAppointment;
//# sourceMappingURL=appointmentController.js.map