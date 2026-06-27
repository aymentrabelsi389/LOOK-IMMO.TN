import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

// Track a website visit
export const trackVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { path } = req.body;

        // Ignore admin, agent, and localhost development visits
        if (
            authReq.user?.role === 'admin' ||
            authReq.user?.role === 'agent' ||
            req.ip === '::1' ||
            req.ip === '127.0.0.1' ||
            req.ip === '::ffff:127.0.0.1'
        ) {
            res.json({ success: true, ignored: true });
            return;
        }

        await prisma.websiteVisit.create({
            data: {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                path: path || '/',
            },
        });
        res.json({ success: true });
    } catch (error) {
        // Silent error for tracking
        res.status(500).json({ error: 'Failed to track visit' });
    }
};

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [
            totalUsers,
            totalProperties,
            totalVisits,
            totalAppointments,
            totalMessages,
            pendingAppointments,
            unreadMessages,
            usersByRole,
            propertiesByType,
            propertiesByStatus,
            recentProperties,
            recentAppointments,
            totalWebsiteVisits,
            onlineVisitCount,
            todayAppointments,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.property.count(),
            prisma.visit.count(),
            prisma.appointment.count(),
            prisma.message.count(),
            prisma.appointment.count({ where: { status: 'pending' } }),
            prisma.message.count({ where: { status: 'unread' } }),
            prisma.user.groupBy({
                by: ['role'],
                _count: { id: true },
            }),
            prisma.property.groupBy({
                by: ['type'],
                _count: { id: true },
            }),
            prisma.property.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma.property.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    city: true,
                    price: true,
                    createdAt: true,
                    images: true // We'll show first image
                },
            }),
            prisma.appointment.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    clientName: true,
                    date: true,
                    time: true,
                    status: true,
                    createdAt: true,
                    property: { select: { title: true } },
                },
            }),
            prisma.websiteVisit.count({
                where: {
                    NOT: [
                        { ip: '::1' },
                        { ip: '127.0.0.1' },
                        { ip: '::ffff:127.0.0.1' }
                    ]
                }
            }),
            prisma.websiteVisit.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
                    NOT: [
                        { ip: '::1' },
                        { ip: '127.0.0.1' },
                        { ip: '::ffff:127.0.0.1' }
                    ]
                }
            }),
            prisma.appointment.count({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd,
                    }
                }
            })
        ]);

        // Calculate performance (last 6 months) — all 12 queries run in parallel
        const monthRanges = Array.from({ length: 6 }, (_, i) => {
            const start = new Date();
            start.setMonth(start.getMonth() - (5 - i));
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            return { start, end };
        });

        const performanceResults = await Promise.all(
            monthRanges.map(({ start, end }) =>
                Promise.all([
                    prisma.websiteVisit.count({
                        where: {
                            createdAt: { gte: start, lt: end },
                            NOT: [{ ip: '::1' }, { ip: '127.0.0.1' }, { ip: '::ffff:127.0.0.1' }]
                        }
                    }),
                    prisma.user.count({ where: { createdAt: { gte: start, lt: end } } })
                ])
            )
        );

        const performance = monthRanges.map(({ start }, i) => ({
            month: start.toLocaleString('default', { month: 'short' }),
            visits: performanceResults[i][0],
            signups: performanceResults[i][1],
        }));

        res.json({
            totals: {
                users: totalUsers,
                properties: totalProperties,
                visits: totalWebsiteVisits,
                appointments: totalAppointments,
                messages: totalMessages,
                todayAppointments: todayAppointments,
            },
            pending: {
                appointments: pendingAppointments,
                messages: unreadMessages,
            },
            breakdown: {
                usersByRole: usersByRole.map((u: any) => ({
                    role: u.role,
                    count: u._count.id,
                })),
                propertiesByType: propertiesByType.map((p: any) => ({
                    type: p.type,
                    count: p._count.id,
                })),
                propertiesByStatus: propertiesByStatus.map((p: any) => ({
                    status: p.status,
                    count: p._count.id,
                })),
            },
            recent: {
                properties: recentProperties,
                appointments: recentAppointments,
            },
            performance,
            onlineCount: onlineVisitCount, // ✅ Real 5-minute window count
            siteViews: totalWebsiteVisits,
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
};

// Get property statistics
export const getPropertyStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const [
            totalValue,
            avgPrice,
            propertiesByCity,
        ] = await Promise.all([
            prisma.property.aggregate({
                _sum: { price: true },
            }),
            prisma.property.aggregate({
                _avg: { price: true },
            }),
            prisma.property.groupBy({
                by: ['city'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
        ]);

        res.json({
            totalValue: totalValue._sum.price || 0,
            averagePrice: avgPrice._avg.price || 0,
            byCity: propertiesByCity.map((p: any) => ({
                city: p.city,
                count: p._count.id,
            })),
        });
    } catch (error) {
        console.error('Get property stats error:', error);
        res.status(500).json({ error: 'Failed to get property statistics' });
    }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            newUsersThisMonth,
            activeAgents,
        ] = await Promise.all([
            prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma.user.count({
                where: {
                    role: 'agent',
                    properties: { some: {} },
                },
            }),
        ]);

        res.json({
            newUsersThisMonth,
            activeAgents,
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get user statistics' });
    }
};
