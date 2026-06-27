import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@lookimmo.tn';
    const password = await bcrypt.hash('password123', 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password,
            role: 'admin',
            name: 'Admin Look Immo', // Ensure name is set if updating
        },
        create: {
            email,
            name: 'Admin Look Immo',
            password,
            role: 'admin',
            phone: '+216 98 720 473'
        },
    });

    console.log('Admin user upserted:', { id: user.id, email: user.email, role: user.role });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
