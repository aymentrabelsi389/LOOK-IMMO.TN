import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { emitToAdmin, emitToUser } from '../../core/socket/socket';
import { prisma } from '../../core/database/prisma';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../../core/errors';
import { CreateAppointmentDTO, UpdateAppointmentDTO } from './appointment.schema';

// Get all appointments
export const getAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { status, propertyId, search } = req.query;
    const authReq = req as AuthRequest;
    const role = authReq.user?.role;
    const userId = authReq.user?.id;
    const email = authReq.user?.email;

    let appointments;
    if (role === 'admin' || role === 'agent') {
        appointments = await prisma.appointment.findMany({
            where: {
                ...(status && status !== 'all' ? { status: status as any } : {}),
                ...(propertyId ? { propertyId: propertyId as string } : {}),
                ...(search
                    ? {
                        OR: [
                            { clientName: { contains: search as string, mode: 'insensitive' } },
                            { clientEmail: { contains: search as string, mode: 'insensitive' } },
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
    } else {
        // Clients can only see their own appointments
        const conditions: any[] = [];
        if (email) conditions.push({ clientEmail: email });

        const userRecord = userId ? await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        }) : null;

        if (userRecord?.phone) {
            conditions.push({ clientPhone: userRecord.phone });
        }

        appointments = await prisma.appointment.findMany({
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
});

// Get single appointment
export const getAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const role = authReq.user?.role;
    const userId = authReq.user?.id;
    const email = authReq.user?.email;

    const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
            property: {
                select: { id: true, title: true, city: true, price: true },
            },
        },
    });

    if (!appointment) {
        throw new NotFoundError('Appointment not found');
    }

    // Fetch user phone to do full phone matching as well
    const userRecord = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
    }) : null;

    // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
    const isOwner = (appointment.clientEmail && appointment.clientEmail === email) ||
                    (appointment.clientPhone && userRecord?.phone && appointment.clientPhone === userRecord.phone);

    if (role !== 'admin' && role !== 'agent' && !isOwner) {
        throw new ForbiddenError('Access denied');
    }

    res.json(appointment);
});

// Create appointment (Public - clients can book)
export const createAppointment = asyncHandler(async (req: Request<Record<string, never>, unknown, CreateAppointmentDTO>, res: Response): Promise<void> => {
    const { clientName, clientEmail, clientPhone, date, time, propertyId, notes, source, meetingType } = req.body;

    // time is optional — appointments can be saved without a confirmed time
    if (!clientName || !date) {
        throw new BadRequestError('Client name and date are required');
    }

    // Verify property exists if provided
    if (propertyId) {
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundError('Property not found');
        }
    }

    const appointment = await prisma.appointment.create({
        data: {
            clientName,
            clientEmail,
            clientPhone,
            date: new Date(date),
            time: time || null,
            propertyId: propertyId || null,
            notes,
            source: (source || 'other') as any,
            meetingType: (meetingType || 'visite') as any,
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
    emitToAdmin('appointment_new', appointment);

    // Send appointment booking notifications
    try {
        const formattedDate = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const timeLabel = time ? ` à ${time}` : ' (heure à définir)';

        // Create notification for admins/agents
        await createNotification({
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
            const clientUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                        ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                    ]
                },
                select: { id: true }
            });
            if (clientUser) {
                emitToUser(clientUser.id, 'appointment_new', appointment);

                // Create notification for the client user
                await createNotification({
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
    } catch (notifErr) {
        logger.error('Failed to create appointment notifications:', notifErr);
    }
});

// Update appointment status
export const updateAppointment = asyncHandler(async (req: AuthRequest & { body: UpdateAppointmentDTO }, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, notes, date, time, source, meetingType, propertyId, clientName, clientPhone, clientEmail } = req.body;

    const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: { property: true },
    });

    if (!existingAppointment) {
        throw new NotFoundError('Appointment not found');
    }

    const { role, id: userId, email } = req.user || {};

    // Fetch user phone to do full phone matching as well
    const userRecord = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
    }) : null;

    // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
    const isOwner = (existingAppointment.clientEmail && existingAppointment.clientEmail === email) ||
                    (existingAppointment.clientPhone && userRecord?.phone && existingAppointment.clientPhone === userRecord.phone);

    if (role !== 'admin' && role !== 'agent' && !isOwner) {
        throw new ForbiddenError('Access denied');
    }

    // Clients cannot approve/accept their own appointments! Only Admins/Agents can change status (except to cancel/reject their own)!
    if (role !== 'admin' && role !== 'agent' && status && status !== existingAppointment.status) {
        if (status !== 'rejected') {
            throw new ForbiddenError('Access denied: Clients cannot approve or reopen appointments');
        }
    }

    const appointment = await prisma.appointment.update({
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
        const notificationType =
            status === 'accepted' ? 'appointment_accept' : status === 'rejected' ? 'appointment_reject' : null;

        if (notificationType) {
            try {
                const isAccepted = status === 'accepted';
                const statusFr = isAccepted ? 'accepté' : 'refusé';
                const clientLabel = existingAppointment.clientName && existingAppointment.clientName !== 'N/A'
                    ? ` de ${existingAppointment.clientName}`
                    : '';
                const propLabel = existingAppointment.property ? ` pour ${existingAppointment.property.title}` : '';
                const message = `Rendez-vous ${statusFr}${clientLabel}${propLabel}`;

                await createNotification({
                    type: notificationType,
                    title: isAccepted ? 'Rendez-vous Accepté' : 'Rendez-vous Refusé',
                    message,
                    icon: 'Calendar',
                    link: '/admin',
                    userId: null,
                    metadata: { appointmentId: id },
                });
            } catch (notificationError) {
                logger.error('Failed to create status notification:', notificationError);
            }
        }
    }

    res.json(appointment);

    // Emit socket event for real-time updates
    emitToAdmin('appointment_update', appointment);

    // Find matching user to emit to their personal socket room
    if (appointment.clientEmail || appointment.clientPhone) {
        const clientUser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                    ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                ]
            },
            select: { id: true }
        });
        if (clientUser) {
            emitToUser(clientUser.id, 'appointment_update', appointment);
        }
    }
});

// Delete appointment
export const deleteAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const role = authReq.user?.role;
    const userId = authReq.user?.id;
    const email = authReq.user?.email;

    const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { property: true },
    });

    if (!appointment) {
        throw new NotFoundError('Appointment not found');
    }

    // Fetch user phone to do full phone matching as well
    const userRecord = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
    }) : null;

    // Authorization check: Admin/Agent or the owner of the appointment (by email or phone)
    const isOwner = (appointment.clientEmail && appointment.clientEmail === email) ||
                    (appointment.clientPhone && userRecord?.phone && appointment.clientPhone === userRecord.phone);

    if (role !== 'admin' && role !== 'agent' && !isOwner) {
        throw new ForbiddenError('Access denied');
    }

    await prisma.appointment.delete({
        where: { id },
    });

    // Create notification
    try {
        const clientLabel = appointment.clientName && appointment.clientName !== 'N/A'
            ? ` de ${appointment.clientName}`
            : '';
        const propLabel = appointment.property ? ` pour ${appointment.property.title}` : '';
        await createNotification({
            type: 'appointment_delete',
            title: 'Rendez-vous Supprimé',
            message: `Rendez-vous supprimé${clientLabel}${propLabel}`,
            icon: 'Calendar',
            link: '/admin',
            userId: null,
            metadata: { appointmentId: id },
        });
    } catch (notificationError) {
        logger.error('Failed to create delete notification:', notificationError);
    }

    res.json({ message: 'Appointment deleted successfully' });

    // Emit socket event for real-time updates
    emitToAdmin('appointment_delete', { id });

    // Find matching user to emit to their personal socket room
    if (appointment.clientEmail || appointment.clientPhone) {
        const clientUser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(appointment.clientEmail ? [{ email: appointment.clientEmail }] : []),
                    ...(appointment.clientPhone ? [{ phone: appointment.clientPhone }] : [])
                ]
            },
            select: { id: true }
        });
        if (clientUser) {
            emitToUser(clientUser.id, 'appointment_delete', { id });
        }
    }
});
