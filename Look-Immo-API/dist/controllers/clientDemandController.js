"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClientDemand = exports.updateClientDemand = exports.createClientDemand = exports.getClientDemands = void 0;
const prisma_1 = require("../utils/prisma");
// Get all client demands
const getClientDemands = async (req, res) => {
    try {
        const { status, type, search } = req.query;
        const demands = await prisma_1.prisma.clientDemand.findMany({
            where: {
                ...(status && status !== 'all' ? { status: status } : {}),
                ...(type && type !== 'all' ? { type: type } : {}),
                ...(search
                    ? {
                        OR: [
                            { clientName: { contains: search, mode: 'insensitive' } },
                            { phone: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(demands);
    }
    catch (error) {
        console.error('Get client demands error:', error);
        res.status(500).json({ error: 'Failed to get client demands' });
    }
};
exports.getClientDemands = getClientDemands;
// Create client demand
const createClientDemand = async (req, res) => {
    try {
        const { clientName, phone, description, location, type, budget, priority, status } = req.body;
        if (!clientName || !description || !location || !type) {
            res.status(400).json({ error: 'Client name, description, location, and type are required' });
            return;
        }
        const demand = await prisma_1.prisma.clientDemand.create({
            data: {
                clientName,
                phone,
                description,
                location,
                type,
                budget: budget ? parseFloat(budget) : null,
                priority: priority || 'medium',
                status: status || 'searching',
            },
        });
        res.status(201).json(demand);
    }
    catch (error) {
        console.error('Create client demand error:', error);
        res.status(500).json({ error: 'Failed to create client demand' });
    }
};
exports.createClientDemand = createClientDemand;
// Update client demand
const updateClientDemand = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (data.budget) {
            data.budget = parseFloat(data.budget);
        }
        const demand = await prisma_1.prisma.clientDemand.update({
            where: { id },
            data,
        });
        res.json(demand);
    }
    catch (error) {
        console.error('Update client demand error:', error);
        res.status(500).json({ error: 'Failed to update client demand' });
    }
};
exports.updateClientDemand = updateClientDemand;
// Delete client demand
const deleteClientDemand = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.clientDemand.delete({
            where: { id },
        });
        res.json({ message: 'Client demand deleted successfully' });
    }
    catch (error) {
        console.error('Delete client demand error:', error);
        res.status(500).json({ error: 'Failed to delete client demand' });
    }
};
exports.deleteClientDemand = deleteClientDemand;
//# sourceMappingURL=clientDemandController.js.map