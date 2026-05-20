import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Memulai migrasi/update target RKAT...');

  // Contoh data kegiatan RKAT (Target Asnaf)
  const rkatActivities = [
    {
      // ID bebas namun unik
      id: "act-bantuan-biaya-hidup-miskin",
      name: "Bantuan Biaya Hidup Sembako",
      asnaf: "Miskin",
      frekuensi: 1, // 1 kali dalam setahun
      nominal: 250000, // Unit Cost per Mustahik
      mustahik: 500, // Target Jumlah Mustahik
      keterangan: "Bantuan biaya hidup untuk asnaf miskin (Sembako)"
    },
    {
      id: "act-bantuan-biaya-hidup-fakir",
      name: "Bantuan Santunan Bulanan",
      asnaf: "Fakir",
      frekuensi: 12, // 12 kali dalam setahun (Rutin setiap bulan)
      nominal: 500000,
      mustahik: 100,
      keterangan: "Bantuan santunan rutin bulanan fakir"
    }
  ];

  // Kode program SIMBA BAZNAS yang ingin diperbarui
  // Pastikan program dengan kode ini sudah ada di database. 
  // Contoh: '1102' adalah Bantuan Biaya Hidup di Pilar Semarang Peduli
  const programCode = '1102';

  try {
    const existingProgram = await prisma.program.findUnique({
      where: { code: programCode }
    });

    if (!existingProgram) {
      console.log(`❌ Program dengan kode ${programCode} tidak ditemukan di database.`);
      return;
    }

    // Update rkat_details JSON field
    await prisma.program.update({
      where: { code: programCode },
      data: {
        rkat_details: rkatActivities,
        budget_rkat: rkatActivities.reduce((acc, act) => acc + (act.nominal * act.mustahik * act.frekuensi), 0)
      }
    });

    console.log(`✅ Berhasil memperbarui target RKAT untuk program ${programCode}`);
  } catch (error) {
    console.error(`❌ Terjadi kesalahan saat migrasi RKAT:`, error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
