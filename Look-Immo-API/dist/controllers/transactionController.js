"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.getTransactions = void 0;
const prisma_1 = require("../utils/prisma");
const getTransactions = async (req, res) => {
    try {
        const transactions = await prisma_1.prisma.financeTransaction.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
const createTransaction = async (req, res) => {
    try {
        const { type, propertyTitle, clientName, date, commission, paymentReceived, paymentMode, notes } = req.body;
        const newTx = await prisma_1.prisma.financeTransaction.create({
            data: {
                type,
                propertyTitle,
                clientName,
                date: date ? new Date(date) : new Date(),
                commission: parseFloat(commission) || 0,
                paymentReceived: paymentReceived === 'yes' || paymentReceived === true,
                paymentMode: paymentMode || 'espèces',
                notes: notes || '',
            }
        });
        res.status(201).json(newTx);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};
exports.createTransaction = createTransaction;
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, propertyTitle, clientName, date, commission, paymentReceived, paymentMode, notes } = req.body;
        const dataToUpdate = {
            ...(type && { type }),
            ...(propertyTitle && { propertyTitle }),
            ...(clientName && { clientName }),
            ...(date && { date: new Date(date) }),
            ...(commission !== undefined && { commission: parseFloat(commission) }),
            ...(paymentReceived !== undefined && { paymentReceived: paymentReceived === 'yes' || paymentReceived === true }),
            ...(paymentMode && { paymentMode }),
            ...(notes !== undefined && { notes }),
        };
        const updated = await prisma_1.prisma.financeTransaction.update({
            where: { id },
            data: dataToUpdate,
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.financeTransaction.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
};
exports.deleteTransaction = deleteTransaction;
//# sourceMappingURL=transactionController.js.map