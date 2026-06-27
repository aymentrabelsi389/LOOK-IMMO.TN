
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const properties = await prisma.property.findMany({
            select: {
                id: true,
                title: true,
                isFeatured: true,
                isNew: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        console.log('\nAll properties in database:');
        console.log('='.repeat(80));
        properties.forEach((p, i) => {
            console.log(`${i + 1}. ${p.title}`);
            console.log(`   ID: ${p.id}`);
            console.log(`   isFeatured: ${p.isFeatured}`);
            console.log(`   isNew: ${p.isNew}`);
            console.log(`   Updated: ${p.updatedAt}`);
            console.log('');
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
