import { PrismaClient } from '@prisma/client';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
    console.log('Populating denormalized ratings for existing properties...');

    const properties = await prisma.property.findMany({
        select: {
            id: true,
            title: true
        }
    });

    console.log(`Found ${properties.length} properties.`);

    for (const property of properties) {
        const aggregate = await prisma.rating.aggregate({
            where: { propertyId: property.id },
            _count: {
                stars: true
            },
            _avg: {
                stars: true
            }
        });

        const count = aggregate._count.stars || 0;
        const avg = aggregate._avg.stars || 0;

        await prisma.property.update({
            where: { id: property.id },
            data: {
                averageRating: avg,
                ratingsCount: count
            } as any
        });

        console.log(`Property "${property.title}": ratingsCount = ${count}, averageRating = ${avg}`);
    }

    console.log('Done populating denormalized ratings!');
}

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
