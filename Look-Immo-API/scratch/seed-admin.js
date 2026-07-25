// NOTE: superseded by `npm run seed` (prisma/seed.ts), which does the same
// thing safely (env-based credentials). Kept here only for reference and
// fixed to remove the hardcoded default password this script used to ship.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || 'Admin User';

    if (!email || !password) {
        console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars before running this script.');
        console.error('Prefer `npm run seed` instead — this script is kept for reference only.');
        process.exit(1);
    }
    if (password.length < 12) {
        console.error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
        process.exit(1);
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        const hashedPassword = await bcrypt.hash(password, 12);

        if (existingUser) {
            console.log('Admin user already exists. Updating password...');
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword, role: 'admin' }
            });
            console.log('Admin password updated.');
        } else {
            console.log('Creating admin user...');
            await prisma.user.create({
                data: { email, name, password: hashedPassword, role: 'admin' }
            });
            console.log('Admin user created successfully. Email:', email);
        }
    } catch (e) {
        console.error('Error seeding admin:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
