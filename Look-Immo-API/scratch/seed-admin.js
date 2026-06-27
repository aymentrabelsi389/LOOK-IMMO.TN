
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@lookimmo.com';
    const password = 'admin123';
    const name = 'Admin User';

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            console.log('Admin user already exists. Updating password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    role: 'admin'
                }
            });
            console.log('Admin password updated to: ' + password);
        } else {
            console.log('Creating admin user...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role: 'admin'
                }
            });
            console.log('Admin user created successfully.');
            console.log('Email:', email);
            console.log('Password:', password);
        }
    } catch (e) {
        console.error('Error seeding admin:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
