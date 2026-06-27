const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const appts = await prisma.appointment.findMany({
            include: { property: true }
        });
        console.log('--- ALL APPOINTMENTS IN DATABASE ---');
        console.log(JSON.stringify(appts, null, 2));
    } catch (err) {
        console.error('Error fetching appointments:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
