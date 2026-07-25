import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * One-off password reset utility.
 * Usage: RESET_EMAIL=user@example.com RESET_PASSWORD=... npx ts-node src/scripts/reset-pass.ts
 * (Never hardcode an email/password here — this file is committed to the repo.)
 */
async function main() {
    const email = process.env.RESET_EMAIL;
    const newPassword = process.env.RESET_PASSWORD;

    if (!email || !newPassword) {
        console.error('Set RESET_EMAIL and RESET_PASSWORD env vars before running this script.');
        process.exit(1);
    }
    if (newPassword.length < 8) {
        console.error('RESET_PASSWORD must be at least 8 characters.');
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    // Revoke existing sessions for this account, same as the forgot-password flow.
    await prisma.refreshToken.deleteMany({ where: { user: { email } } });

    console.log(`Password reset for ${email}. All existing sessions revoked.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
