
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    try {
        // 1. Create a user first (owner)
        if (!user) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            user = await prisma.user.create({
                data: {
                    name: 'Admin Test',
                    email: 'admin@test.com',
                    password: hashedPassword,
                    role: 'admin'
                }
            });
            console.log('Created test user');
        }


        // 2. Create property with isFeatured: true
        const property = await prisma.property.create({
            data: {
                title: 'Test Feature Persistence',
                description: 'Test Description',
                price: 1000,
                type: 'sale',
                category: 'apartment',
                city: 'Tunis',
                status: 'available',
                isFeatured: true, // EXPLICITLY TRUE
                isNew: true,
                ownerId: user.id
            }
        });

        console.log('Created property:', property.id);
        console.log('isFeatured (Create):', property.isFeatured);

        // 3. Read it back
        const readProp = await prisma.property.findUnique({
            where: { id: property.id }
        });
        console.log('isFeatured (Read):', readProp.isFeatured);

        // 4. Update it to false
        const updatedProp = await prisma.property.update({
            where: { id: property.id },
            data: { isFeatured: false }
        });
        console.log('isFeatured (Update False):', updatedProp.isFeatured);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
