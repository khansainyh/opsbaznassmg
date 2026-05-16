import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`UPDATE User SET role = 'Ketua' WHERE role IN ('WK_Distribusi', 'WK_Pengumpulan')`;
  console.log('Roles updated to Ketua temporarily');
}

main().catch(console.error).finally(() => prisma.$disconnect());
