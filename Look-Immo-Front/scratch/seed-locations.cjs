const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const locations = [
        { name: 'Carthage', city: 'Tunis', displayOrder: 1 },
        { name: 'La Marsa', city: 'Tunis', displayOrder: 2 },
        { name: 'Gammarth', city: 'Tunis', displayOrder: 3 },
        { name: 'Les Berges du Lac', city: 'Tunis', displayOrder: 4 },
        { name: 'Sousse', city: 'Sousse', displayOrder: 5 },
        { name: 'Hammamet', city: 'Hammamet', displayOrder: 6 },
        { name: 'Ennasr', city: 'Tunis', displayOrder: 7 },
        { name: 'Menzah', city: 'Tunis', displayOrder: 8 },
        { name: 'Ariana', city: 'Tunis', displayOrder: 9 },
        { name: 'Bizerte', city: 'Bizerte', displayOrder: 10 }
    ];

    console.log('Seeding locations...');
    for (const loc of locations) {
        await prisma.location.upsert({
            where: { name: loc.name },
            update: loc,
            create: loc
        });
    }
    console.log('Locations seeded successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
