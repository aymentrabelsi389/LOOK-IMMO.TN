import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.financeTransaction.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { type, propertyTitle, clientName, date, commission, paymentReceived, paymentMode, notes } = req.body;
    const newTx = await prisma.financeTransaction.create({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, propertyTitle, clientName, date, commission, paymentReceived, paymentMode, notes } = req.body;
    
    const dataToUpdate: any = {
      ...(type && { type }),
      ...(propertyTitle && { propertyTitle }),
      ...(clientName && { clientName }),
      ...(date && { date: new Date(date) }),
      ...(commission !== undefined && { commission: parseFloat(commission) }),
      ...(paymentReceived !== undefined && { paymentReceived: paymentReceived === 'yes' || paymentReceived === true }),
      ...(paymentMode && { paymentMode }),
      ...(notes !== undefined && { notes }),
    };

    const updated = await prisma.financeTransaction.update({
      where: { id },
      data: dataToUpdate,
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.financeTransaction.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};
