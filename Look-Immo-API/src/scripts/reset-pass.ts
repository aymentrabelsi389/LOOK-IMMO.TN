import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 12);
    await prisma.user.update({
        where: { email: 'aymentrabelsi389@gmail.com' },
        data: { password: hashedPassword }
    });
    console.log('Password reset to password123 successfully.');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
