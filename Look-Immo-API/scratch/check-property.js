
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Get the first property
        const property = await prisma.property.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        if (property) {
            console.log('Most recently updated property:');
            console.log('ID:', property.id);
            console.log('Title:', property.title);
            console.log('isFeatured:', property.isFeatured);
            console.log('isNew:', property.isNew);
            console.log('Type (isFeatured):', typeof property.isFeatured);
        } else {
            console.log('No properties found in database');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
