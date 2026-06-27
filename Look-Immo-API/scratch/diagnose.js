const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    
    // Test: Create a test property
    const testUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!testUser) {
      console.log('❌ No admin user found. Please check users table.');
      return;
    }
    console.log(`✅ Admin user found: ${testUser.name} (${testUser.email})`);

    const testProp = await prisma.property.create({
      data: {
        title: 'TEST - Auto Diagnostic Property',
        price: 100000,
        type: 'sale',
        city: 'Tunis',
        ownerId: testUser.id,
        status: 'available',
        images: [],
      }
    });
    console.log(`✅ Property CREATE works! ID: ${testProp.id}`);

    // Test: Update it
    await prisma.property.update({
      where: { id: testProp.id },
      data: { title: 'TEST - Updated Title' }
    });
    console.log(`✅ Property UPDATE works!`);

    // Test: Delete it
    await prisma.property.delete({ where: { id: testProp.id } });
    console.log(`✅ Property DELETE works!`);

    console.log('\n🎉 All database operations are working correctly.');
    console.log('If saves disappear after refresh, it is an authentication/session issue - not a database issue.');

    // Print all current properties
    const props = await prisma.property.findMany({ select: { id: true, title: true, city: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
    console.log(`\n📦 Current properties in database (${props.length}):`);
    props.forEach(p => console.log(`  - [${p.id}] ${p.title} (${p.city})`));

  } catch (e) {
    console.error('❌ Test FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
