import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPrograms = [
  {
    code: '1101',
    pilar_code: '1100',
    name: 'Bantuan Sembako Dhuafa',
    budget_rkat: 50000000,
    rkat_details: [
      { id: '1101-1', name: 'Sembako Paket Bulanan Fakir', asnaf: 'Fakir', nominal: 350000, mustahik: 100, frekuensi: 1 },
      { id: '1101-2', name: 'Sembako Paket Bulanan Miskin', asnaf: 'Miskin', nominal: 350000, mustahik: 42, frekuensi: 1 }
    ]
  },
  {
    code: '1102',
    pilar_code: '1100',
    name: 'Bantuan Kebencanaan & Tanggap Darurat',
    budget_rkat: 75000000,
    rkat_details: [
      { id: '1102-1', name: 'Bantuan Kebakaran Rumah', asnaf: 'Fakir', nominal: 5000000, mustahik: 5, frekuensi: 1 },
      { id: '1102-2', name: 'Bantuan Korban Banjir', asnaf: 'Miskin', nominal: 1000000, mustahik: 50, frekuensi: 1 }
    ]
  },
  {
    code: '1201',
    pilar_code: '1200',
    name: 'Bantuan Pengobatan Fakir Miskin',
    budget_rkat: 60000000,
    rkat_details: [
      { id: '1201-1', name: 'Bantuan Rawat Inap Rumah Sakit', asnaf: 'Fakir', nominal: 3000000, mustahik: 10, frekuensi: 1 },
      { id: '1201-2', name: 'Bantuan Tebus Obat Kronis', asnaf: 'Miskin', nominal: 1500000, mustahik: 20, frekuensi: 1 }
    ]
  },
  {
    code: '1202',
    pilar_code: '1200',
    name: 'Bantuan BPJS Kesehatan Mustahik',
    budget_rkat: 40000000,
    rkat_details: [
      { id: '1202-1', name: 'Bantuan Pelunasan Tunggakan BPJS', asnaf: 'Miskin', nominal: 1200000, mustahik: 33, frekuensi: 1 }
    ]
  },
  {
    code: '1301',
    pilar_code: '1300',
    name: 'Beasiswa Santri & Mahasiswa BAZNAS',
    budget_rkat: 100000000,
    rkat_details: [
      { id: '1301-1', name: 'Beasiswa Pendidikan Bulanan', asnaf: 'Fakir', nominal: 1000000, mustahik: 50, frekuensi: 2 }
    ]
  },
  {
    code: '1302',
    pilar_code: '1300',
    name: 'Bantuan Pelunasan Tunggakan Sekolah',
    budget_rkat: 45000000,
    rkat_details: [
      { id: '1302-1', name: 'Bantuan Tunggakan SPP Sekolah', asnaf: 'Miskin', nominal: 1500000, mustahik: 30, frekuensi: 1 }
    ]
  },
  {
    code: '1401',
    pilar_code: '1400',
    name: 'Bantuan Sarpras Masjid/Mushola',
    budget_rkat: 80000000,
    rkat_details: [
      { id: '1401-1', name: 'Bantuan Renovasi Sarana Ibadah', asnaf: 'Fisabilillah', nominal: 10000000, mustahik: 8, frekuensi: 1 }
    ]
  },
  {
    code: '1402',
    pilar_code: '1400',
    name: 'Bantuan Insentif Guru TPQ',
    budget_rkat: 35000000,
    rkat_details: [
      { id: '1402-1', name: 'Bantuan Insentif Mengajar Guru TPQ', asnaf: 'Fisabilillah', nominal: 500000, mustahik: 70, frekuensi: 1 }
    ]
  },
  {
    code: '2101',
    pilar_code: '2100',
    name: 'Bantuan Modal Usaha Mikro (Z-Mart)',
    budget_rkat: 120000000,
    rkat_details: [
      { id: '2101-1', name: 'Bantuan Modal Dagang Warung Klontong', asnaf: 'Miskin', nominal: 3000000, mustahik: 40, frekuensi: 1 }
    ]
  },
  {
    code: '2102',
    pilar_code: '2100',
    name: 'Bantuan Pelatihan Kewirausahaan',
    budget_rkat: 30000000,
    rkat_details: [
      { id: '2102-1', name: 'Pagu Kelas Pelatihan & Modal Start-up', asnaf: 'Miskin', nominal: 2500000, mustahik: 12, frekuensi: 1 }
    ]
  }
];

async function main() {
  console.log('Memulai migrasi Program BAZNAS...');

  // 1. Ambil pilar yang terdaftar di database untuk validasi relasi program
  const existingPilars = await prisma.pilar.findMany();
  const existingPilarCodes = new Set(existingPilars.map(p => p.code));

  console.log(`Ditemukan ${existingPilars.length} Pilar terdaftar di database.`);

  // 2. Lakukan upsert program hanya jika Pilar bersangkutan sudah ada
  console.log('Memigrasi data Program...');
  for (const prog of defaultPrograms) {
    if (!existingPilarCodes.has(prog.pilar_code)) {
      console.warn(`[LEWAT] Program [${prog.code}] ${prog.name} dilewati karena Pilar [${prog.pilar_code}] belum di-input manual di database.`);
      continue;
    }

    await prisma.program.upsert({
      where: { code: prog.code },
      update: {
        pilar_code: prog.pilar_code,
        name: prog.name,
        budget_rkat: prog.budget_rkat,
        rkat_details: prog.rkat_details as any
      },
      create: {
        code: prog.code,
        pilar_code: prog.pilar_code,
        name: prog.name,
        budget_rkat: prog.budget_rkat,
        rkat_details: prog.rkat_details as any
      }
    });
    console.log(`- Program [${prog.code}] ${prog.name} berhasil di-upsert.`);
  }

  console.log('Migrasi Program selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat migrasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
