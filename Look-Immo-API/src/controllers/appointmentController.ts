import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { emitToAdmin, emitToUser } from '../utils/socket';
import { prisma } from '../utils/prisma';

// Get all appointments
export const getAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ error: 'Failed to get appointments' });
    }
};

// Get single appointment
export const getAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
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
            res.status(404).json({ error: 'Appointment not found' });
            return;
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
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json(appointment);
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({ error: 'Failed to get appointment' });
    }
};

// Create appointment (Public - clients can book)
export const createAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clientName, clientEmail, clientPhone, date, time, propertyId, notes, source, meetingType } = req.body;

        if (!clientName || !date || !time) {
            res.status(400).json({ error: 'Client name, date, and time are required' });
            return;
        }

        // Verify property exists if provided
        if (propertyId) {
            const property = await prisma.property.findUnique({
                where: { id: propertyId },
            });

            if (!property) {
                res.status(404).json({ error: 'Property not found' });
                return;
            }
        }

        const appointment = await prisma.appointment.create({
            data: {
                clientName,
                clientEmail,
                clientPhone,
                date: new Date(date),
                time,
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
        emitToAdmin('appointment_new', appointment);

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
                emitToUser(clientUser.id, 'appointment_new', appointment);
            }
        }
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};

// Update appointment status
export const updateAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, notes, date, time, source, meetingType, propertyId, clientName, clientPhone, clientEmail } = req.body;

        const existingAppointment = await prisma.appointment.findUnique({
            where: { id },
            include: { property: true },
        });

        if (!existingAppointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
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

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(date && { date: new Date(date) }),
                ...(time && { time }),
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
                    await prisma.notification.create({
                        data: {
                            type: notificationType,
                            message: `Appointment ${status}: ${existingAppointment.clientName}${existingAppointment.property ? ` for ${existingAppointment.property.title}` : ''}`,
                            entityId: id,
                        },
                    });
                } catch (notificationError) {
                    console.error('Failed to create status notification:', notificationError);
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
    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
};

// Delete appointment
export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
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
            res.status(404).json({ error: 'Appointment not found' });
            return;
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
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        await prisma.appointment.delete({
            where: { id },
        });

        // Create notification
        try {
            await prisma.notification.create({
                data: {
                    type: 'appointment_delete',
                    message: `Appointment deleted: ${appointment.clientName}${appointment.property ? ` for ${appointment.property.title}` : ''}`,
                    entityId: id,
                },
            });
        } catch (notificationError) {
            console.error('Failed to create delete notification:', notificationError);
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
    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
};
