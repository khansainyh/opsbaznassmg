import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Menghapus semua proposal untuk mengosongkan data...');
  await prisma.proposal.deleteMany();
  
  // Reset auto-increment agar tabel kembali mulai dari 1
  console.log('Me-reset nomor agenda menjadi 1...');
  await prisma.$executeRawUnsafe(`ALTER TABLE Proposal AUTO_INCREMENT = 1`);
  
  console.log('Selesai!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
