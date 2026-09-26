import { Request, Response } from 'express';
import { prisma } from '../../core/database/prisma';
import { asyncHandler } from '../../core/errors';

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  // Higher default than other lists: this feeds accounting/reporting views
  // that typically want "all transactions for the year" in one call.
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 500));

  const [transactions, total] = await Promise.all([
    prisma.financeTransaction.findMany({
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.financeTransaction.count(),
  ]);

  res.setHeader('X-Total-Count', String(total));
  res.json(transactions);
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
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
});

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
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
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.financeTransaction.delete({
    where: { id },
  });
  res.json({ success: true });
});
