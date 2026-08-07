import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('Seeded Users:');
    users.forEach(u => {
        console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
