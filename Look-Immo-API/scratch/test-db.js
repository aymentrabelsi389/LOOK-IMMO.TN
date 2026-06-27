
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Successfully connected to database');
        const count = await prisma.property.count();
        console.log(`Found ${count} properties`);
        const properties = await prisma.property.findMany({ take: 1 });
        console.log('First property:', properties[0]);
    } catch (e) {
        console.error('Connection error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
