const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function addLocations() {
  const locs = ['Tunis', 'Sousse', 'Hammamet', 'Monastir', 'Sfax', 'Djerba'];
  for (let i=0; i < locs.length; i++) {
    await prisma.location.create({ data: { name: locs[i], displayOrder: i } });
  }
  console.log('Locations added!');
}
addLocations().finally(() => prisma.$disconnect());
