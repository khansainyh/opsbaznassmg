const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Mengosongkan data transaksi di database secara aman...");
  
  const tables = [
    'JournalEntry',
    'Realisasi',
    'CashMutationDetail',
    'CashMutation',
    'PenerimaanZis',
    'PengajuanLog',
    'PengajuanPencairan',
    'Proposal',
    'Surat',
    'Notification',
    'Upz',
    'Mustahik',
    'Muzakki'
  ];

  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    
    for (const table of tables) {
      console.log(`🧹 Mengosongkan tabel: ${table}...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    }
    
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    console.log("✅ Berhasil! Semua data di tabel transaksional telah dikosongkan.");
    console.log("ℹ️ Tabel User, RKAT, Pilar, Program, dan COA tetap aman.");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat mengosongkan database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
