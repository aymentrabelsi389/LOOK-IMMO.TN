const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany({
    select: { id: true, title: true, isHotDeal: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(properties, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
