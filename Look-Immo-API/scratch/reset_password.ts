import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const updatedUser = await prisma.user.update({
        where: { email: 'admin@lookimmo.tn' },
        data: { password: hashedPassword, role: 'admin' }
    });
    console.log(`Password reset successfully for ${updatedUser.email} to '${password}' with role '${updatedUser.role}'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
