import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Seeds (or resets) the initial admin account.
 *
 * SECURITY: credentials are never hardcoded. Provide them via env vars:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 * If SEED_ADMIN_PASSWORD is omitted, a strong random password is generated
 * and printed ONCE to the console — copy it immediately, it is not stored
 * anywhere in plaintext (only its bcrypt hash is persisted).
 */
async function main() {
    const email = process.env.SEED_ADMIN_EMAIL;
    if (!email) {
        console.error('❌ SEED_ADMIN_EMAIL is required to run the seed script.');
        console.error('   Example: SEED_ADMIN_EMAIL=admin@yourdomain.com SEED_ADMIN_PASSWORD=... npm run seed');
        process.exit(1);
    }

    const providedPassword = process.env.SEED_ADMIN_PASSWORD;
    const generatedPassword = providedPassword ? null : crypto.randomBytes(18).toString('base64url');
    const plaintextPassword = providedPassword || generatedPassword!;

    if (plaintextPassword.length < 12) {
        console.error('❌ SEED_ADMIN_PASSWORD must be at least 12 characters.');
        process.exit(1);
    }

    const password = await bcrypt.hash(plaintextPassword, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password,
            role: 'admin',
        },
        create: {
            email,
            name: process.env.SEED_ADMIN_NAME || 'Admin',
            password,
            role: 'admin',
            phone: process.env.SEED_ADMIN_PHONE || undefined,
        },
    });

    console.log('✅ Admin user upserted:', { id: user.id, email: user.email, role: user.role });
    if (generatedPassword) {
        console.log('');
        console.log('⚠️  Generated password (shown once, not stored anywhere in plaintext):');
        console.log(`    ${generatedPassword}`);
        console.log('');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
