import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Menyuntikkan data dummy untuk testing (Proposals & Surats)...');

  // PROPOSALS
  const proposals = [
    {
      nama_pemohon: "Ahmad Fulan",
      jenis_permohonan: "1101",
      tanggal_masuk: new Date(),
      status: "Pending", // Review Kabag / Scan
      alamat: "Jl. Pemuda No 1",
      jam_pengajuan: "09:00",
      file_gdrive_link: "https://example.com/dummy.pdf"
    },
    {
      nama_pemohon: "Budi Santoso",
      jenis_permohonan: "1102",
      tanggal_masuk: new Date(),
      status: "Review_Kabag_Administrasi", // Kabag Admin
      alamat: "Jl. Pandanaran No 2",
      jam_pengajuan: "10:00",
      file_gdrive_link: "https://example.com/dummy.pdf"
    },
    {
      nama_pemohon: "Cici Rahayu",
      jenis_permohonan: "1201",
      tanggal_masuk: new Date(),
      status: "Tim_Survei", // Tim Survei
      alamat: "Jl. Pahlawan No 3",
      jam_pengajuan: "11:00",
      file_gdrive_link: "https://example.com/dummy.pdf"
    },
    {
      nama_pemohon: "Dedi Kurniawan",
      jenis_permohonan: "1301",
      tanggal_masuk: new Date(),
      status: "Review_Kepala_Pelaksana", // Kepala Pelaksana
      alamat: "Jl. MT Haryono No 4",
      jam_pengajuan: "12:00",
      file_gdrive_link: "https://example.com/dummy.pdf",
      surveyorName: "Relawan 1",
      score: 85,
      urgencyLevel: "Tinggi",
      isBeingSurveyed: false
    },
    {
      nama_pemohon: "Eka Putri",
      jenis_permohonan: "2101",
      tanggal_masuk: new Date(),
      status: "Persetujuan Pimpinan", // Pimpinan
      alamat: "Jl. Mataram No 5",
      jam_pengajuan: "13:00",
      file_gdrive_link: "https://example.com/dummy.pdf",
      surveyorName: "Relawan 2",
      score: 95,
      urgencyLevel: "Sangat Kritis",
      catatanKepala: "Mohon segera diproses, kondisi darurat."
    },
    {
      nama_pemohon: "Fahmi Idrus",
      jenis_permohonan: "1401",
      tanggal_masuk: new Date(),
      status: "Penentuan Nominal", // Penentuan Nominal
      alamat: "Jl. Gajah Mada No 6",
      jam_pengajuan: "14:00",
      file_gdrive_link: "https://example.com/dummy.pdf",
      surveyorName: "Relawan 3",
      score: 70,
      urgencyLevel: "Normal",
      catatanKepala: "Disetujui untuk proses nominal.",
      catatanPimpinan: "Setuju, berikan sesuai standar RKAT."
    }
  ];

  for (const p of proposals) {
    await prisma.proposal.create({
      data: p
    });
  }
  console.log(`Berhasil menambahkan ${proposals.length} proposal testing.`);

  // SURATS
  const surats = [
    {
      nama_instansi: "Yayasan Al-Ikhlas",
      keperluan: "Permohonan Bantuan Operasional",
      tanggal_masuk: new Date(),
      status: "Registrasi",
      jam_pengajuan: "09:30"
    },
    {
      nama_instansi: "Masjid Baiturrahman",
      keperluan: "Renovasi Atap Masjid",
      tanggal_masuk: new Date(),
      status: "Review Kabag Admin",
      jam_pengajuan: "10:30",
      file_gdrive_link: "https://example.com/dummy.pdf"
    },
    {
      nama_instansi: "Panti Asuhan Sejahtera",
      keperluan: "Bantuan Sembako Bulanan",
      tanggal_masuk: new Date(),
      status: "Review Kepala Pelaksana",
      jam_pengajuan: "11:30",
      file_gdrive_link: "https://example.com/dummy.pdf"
    },
    {
      nama_instansi: "Sekolah Dasar Islam Terpadu",
      keperluan: "Bantuan Beasiswa Siswa Kurang Mampu",
      tanggal_masuk: new Date(),
      status: "Review Pimpinan",
      jam_pengajuan: "12:30",
      file_gdrive_link: "https://example.com/dummy.pdf",
      catatanKepala: "Sudah diverifikasi dan direkomendasikan untuk dibantu."
    }
  ];

  for (const s of surats) {
    await prisma.surat.create({
      data: s
    });
  }
  console.log(`Berhasil menambahkan ${surats.length} surat testing.`);

  console.log('✅ Seeding Dummy Data Testing SELESAI!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
