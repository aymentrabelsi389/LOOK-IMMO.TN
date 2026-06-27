import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — prevents multiple connection pools being opened
// (one per controller) which causes memory leaks and exhausts DB connections.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
