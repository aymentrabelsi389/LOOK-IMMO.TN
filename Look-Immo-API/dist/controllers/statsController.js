"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.getPropertyStats = exports.getDashboardStats = exports.trackVisit = void 0;
const prisma_1 = require("../utils/prisma");
// Track a website visit
const trackVisit = async (req, res) => {
    try {
        const authReq = req;
        const { path } = req.body;
        // Ignore admin, agent, and localhost development visits
        if (authReq.user?.role === 'admin' ||
            authReq.user?.role === 'agent' ||
            req.ip === '::1' ||
            req.ip === '127.0.0.1' ||
            req.ip === '::ffff:127.0.0.1') {
            res.json({ success: true, ignored: true });
            return;
        }
        await prisma_1.prisma.websiteVisit.create({
            data: {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                path: path || '/',
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        // Silent error for tracking
        res.status(500).json({ error: 'Failed to track visit' });
    }
};
exports.trackVisit = trackVisit;
// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const [totalUsers, totalProperties, totalVisits, totalAppointments, totalMessages, pendingAppointments, unreadMessages, usersByRole, propertiesByType, propertiesByStatus, recentProperties, recentAppointments, totalWebsiteVisits, onlineVisitCount, todayAppointments,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.property.count(),
            prisma_1.prisma.visit.count(),
            prisma_1.prisma.appointment.count(),
            prisma_1.prisma.message.count(),
            prisma_1.prisma.appointment.count({ where: { status: 'pending' } }),
            prisma_1.prisma.message.count({ where: { status: 'unread' } }),
            prisma_1.prisma.user.groupBy({
                by: ['role'],
                _count: { id: true },
            }),
            prisma_1.prisma.property.groupBy({
                by: ['type'],
                _count: { id: true },
            }),
            prisma_1.prisma.property.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma_1.prisma.property.findMany({
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
            prisma_1.prisma.appointment.findMany({
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
            prisma_1.prisma.websiteVisit.count({
                where: {
                    NOT: [
                        { ip: '::1' },
                        { ip: '127.0.0.1' },
                        { ip: '::ffff:127.0.0.1' }
                    ]
                }
            }),
            prisma_1.prisma.websiteVisit.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
                    NOT: [
                        { ip: '::1' },
                        { ip: '127.0.0.1' },
                        { ip: '::ffff:127.0.0.1' }
                    ]
                }
            }),
            prisma_1.prisma.appointment.count({
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
        const performanceResults = await Promise.all(monthRanges.map(({ start, end }) => Promise.all([
            prisma_1.prisma.websiteVisit.count({
                where: {
                    createdAt: { gte: start, lt: end },
                    NOT: [{ ip: '::1' }, { ip: '127.0.0.1' }, { ip: '::ffff:127.0.0.1' }]
                }
            }),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } })
        ])));
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
                usersByRole: usersByRole.map((u) => ({
                    role: u.role,
                    count: u._count.id,
                })),
                propertiesByType: propertiesByType.map((p) => ({
                    type: p.type,
                    count: p._count.id,
                })),
                propertiesByStatus: propertiesByStatus.map((p) => ({
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
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
};
exports.getDashboardStats = getDashboardStats;
// Get property statistics
const getPropertyStats = async (req, res) => {
    try {
        const [totalValue, avgPrice, propertiesByCity,] = await Promise.all([
            prisma_1.prisma.property.aggregate({
                _sum: { price: true },
            }),
            prisma_1.prisma.property.aggregate({
                _avg: { price: true },
            }),
            prisma_1.prisma.property.groupBy({
                by: ['city'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
        ]);
        res.json({
            totalValue: totalValue._sum.price || 0,
            averagePrice: avgPrice._avg.price || 0,
            byCity: propertiesByCity.map((p) => ({
                city: p.city,
                count: p._count.id,
            })),
        });
    }
    catch (error) {
        console.error('Get property stats error:', error);
        res.status(500).json({ error: 'Failed to get property statistics' });
    }
};
exports.getPropertyStats = getPropertyStats;
// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [newUsersThisMonth, activeAgents,] = await Promise.all([
            prisma_1.prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma_1.prisma.user.count({
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
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get user statistics' });
    }
};
exports.getUserStats = getUserStats;
//# sourceMappingURL=statsController.js.map