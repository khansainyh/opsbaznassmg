import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Menambahkan data dummy untuk Monitoring Tugas (Tim Survei)...');

  const dummyProposals = [
    {
      tanggal_masuk: new Date(),
      nama_pemohon: 'Budi Santoso',
      alamat: 'Jl. Merdeka No. 10',
      kelurahan: 'Pandean Lamper',
      kecamatan: 'Gayamsari',
      no_telpon: '081234567890',
      jenis_permohonan: '1101', // Bantuan Makanan
      status: 'Survei Assessment',
      jenis_pengajuan: 'Individu',
    },
    {
      tanggal_masuk: new Date(),
      nama_pemohon: 'Siti Aminah',
      alamat: 'Jl. Pahlawan No. 25',
      kelurahan: 'Pleburan',
      kecamatan: 'Semarang Selatan',
      no_telpon: '089876543210',
      jenis_permohonan: '1102', // Bantuan Biaya Hidup
      status: 'Proses Disposisi',
      jenis_pengajuan: 'Individu',
    },
    {
      tanggal_masuk: new Date(),
      nama_pemohon: 'Agus Setiawan',
      alamat: 'Jl. Pemuda No. 40',
      kelurahan: 'Sekayu',
      kecamatan: 'Semarang Tengah',
      no_telpon: '085612349876',
      jenis_permohonan: '1201', // Bantuan Pengobatan
      status: 'Survei Assessment',
      jenis_pengajuan: 'Individu',
    },
    {
      tanggal_masuk: new Date(),
      nama_pemohon: 'Ratna Mulyani',
      alamat: 'Jl. Mataram No. 100',
      kelurahan: 'Karangkidul',
      kecamatan: 'Semarang Tengah',
      no_telpon: '081122334455',
      jenis_permohonan: '1301', // Bantuan Pendidikan Dasar
      status: 'Proses Disposisi',
      jenis_pengajuan: 'Individu',
    }
  ];

  for (const p of dummyProposals) {
    const created = await prisma.proposal.create({
      data: p
    });
    console.log(`✅ Berhasil membuat proposal: ${created.nama_pemohon} (Status: ${created.status})`);
  }

  console.log('🎉 Selesai menambahkan data dummy monitoring tugas!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
