import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Menghapus seluruh data Proposal dan Surat...');
  
  // Hapus semua data transaksi
  await prisma.proposal.deleteMany();
  await prisma.surat.deleteMany();
  
  console.log('Mereset penomoran Agenda (AUTO_INCREMENT) kembali ke 1...');
  // Eksekusi raw query untuk mereset auto-increment di MySQL
  await prisma.$executeRawUnsafe(`ALTER TABLE Proposal AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE Surat AUTO_INCREMENT = 1;`);
  
  console.log('✅ Proses reset selesai! No Agenda akan dimulai dari 1.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
