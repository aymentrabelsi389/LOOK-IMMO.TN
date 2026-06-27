
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for Admin user...');
    try {
        const admin = await prisma.user.findUnique({
            where: { email: 'admin@lookimmo.com' }
        });

        if (admin) {
            console.log('SUCCESS: Admin user found.');
            console.log('ID:', admin.id);
            console.log('Role:', admin.role);
            // Don't log the full password hash for security, just length/presence
            console.log('Password Hash Length:', admin.password ? admin.password.length : 0);
        } else {
            console.log('FAILURE: Admin user NOT found.');
        }
    } catch (e) {
        console.error('ERROR: Database query failed.');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
