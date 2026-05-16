import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const pilarData = [
  {
    code: "1100",
    name: "Semarang Peduli",
    category: "Kemanusiaan & Sosial",
    status: "Aktif",
    programs: [
      { code: "1101", name: "Bantuan Makanan" },
      { code: "1102", name: "Bantuan Biaya Hidup" },
      { code: "1102.1", name: "Bantuan Biaya Hidup Rutin" },
      { code: "1102.2", name: "Bantuan Biaya Hidup Santunan" },
      { code: "1102.3", name: "Bantuan Biaya Hidup Sembako" },
      { code: "1103", name: "Bantuan Penyaluran Fitrah" },
      { code: "1104", name: "Bantuan Penyaluran Kurban" },
      { code: "1105", name: "Rumah Tidak Layak Huni" },
      { code: "1106", name: "Respon Darurat Bencana" },
      { code: "1107", name: "Pemulihan Pascabencana" },
      { code: "1108", name: "Pemulasaran Jenazah" },
      { code: "1109", name: "Khitanan Massal" },
      { code: "1110", name: "Bantuan Alat Kesehatan" },
      { code: "1110.1", name: "Bantuan Alat Kesehatan Kursi Roda" },
      { code: "1110.2", name: "Bantuan Alat Kesehatan Kruk" },
      { code: "1110.3", name: "Bantuan Alat Kesehatan Kaki Palsu" },
      { code: "1110.4", name: "Bantuan Alat Kesehatan Tangan Palsu" },
      { code: "1110.5", name: "Bantuan Alat Kesehatan Walker" },
      { code: "1110.6", name: "Bantuan Alat Kesehatan Alat Bantu Dengar" },
      { code: "1110.7", name: "Bantuan Alat Kesehatan Tongkat" },
      { code: "1110.8", name: "Bantuan Alat Kesehatan Sepatu Afo" },
      { code: "1111", name: "Bantuan Biaya Hidup hak 30% UPZ" },
      { code: "1112", name: "Bantuan Biaya Hidup hak 70% UPZ Kemenag" },
    ]
  },
  {
    code: "1200",
    name: "Semarang Sehat",
    category: "Kesehatan & Lingkungan",
    status: "Aktif",
    programs: [
      { code: "1201", name: "Bantuan Pengobatan" },
      { code: "1202", name: "Bantuan Transportasi dan/Atau Akomodasi Pasien" },
      { code: "1203", name: "Bantuan Asuransi Kesehatan" },
      { code: "2201", name: "Bantuan Sanitasi" },
      { code: "2202", name: "Bantuan Sumur Air" },
      { code: "2203", name: "Bantuan Edukasi/Promosi Kesehatan" },
      { code: "2204", name: "Bantuan Penyediaan Air Bersih" },
      { code: "2205", name: "Pencegahan dan Penanggulangan Stunting" },
    ]
  },
  {
    code: "1300",
    name: "Semarang Cerdas",
    category: "Pendidikan & Pengembangan Karakter",
    status: "Aktif",
    programs: [
      { code: "1301", name: "Bantuan Pendidikan Dasar dan Menengah" },
      { code: "1302", name: "Bantuan Pendidikan Dasar dan Menengah | Melalui UPZ Dinas Pendidikan" },
      { code: "1303", name: "Bantuan Pendidikan Dasar dan Menengah Hak 30% UPZ" },
      { code: "2301", name: "Bantuan Pendidikan Tinggi Dalam Negeri" },
      { code: "2302", name: "Bantuan Infrastruktur Pendidikan" },
      { code: "2303", name: "Program Pembinaan dan Pengembangan Karakter dan Kompetensi" },
    ]
  },
  {
    code: "1400",
    name: "Semarang Taqwa",
    category: "Keagamaan & Dakwah",
    status: "Aktif",
    programs: [
      { code: "1401", name: "Bantuan Kafalah/ Mukafaah Dai" },
      { code: "1402", name: "Bantuan Perlengkapan Ibadah" },
      { code: "1403", name: "Bantuan Syiar Dakwah" },
      { code: "1404", name: "Bantuan Sarana Dakwah" },
      { code: "1405", name: "Program Pembinaan, Pendampingan, dan Advokasi Mualaf" },
      { code: "1406", name: "Program Advokasi/Bantuan Hukum" },
      { code: "1407", name: "Bantuan Renovasi/Operasional pada Masjid/Mushola/Yayasan/Lembaga" },
      { code: "1408", name: "Pengembangan Kebijakan Publik dan Kajian Strategis" },
      { code: "1409", name: "Bantuan Kafalah/Mukafaah Dai Hak 30% UPZ" },
    ]
  },
  {
    code: "2100",
    name: "Semarang Makmur",
    category: "Ekonomi & Pemberdayaan UMKM",
    status: "Aktif",
    programs: [
      { code: "2101", name: "Bantuan Modal Usaha" },
      { code: "2102", name: "Bantuan Ketrampilan Kerja" },
      { code: "2103", name: "Bantuan Pengembangan Usaha" },
      { code: "2103.1", name: "Bantuan Pengembangan Usaha Pemasaran Usaha" },
      { code: "2104", name: "Bantuan Infrastruktur Pelatihan Ketrampilan Kerja" },
      { code: "2105", name: "Program Pemberdayaan Petani (Lumbung Pangan)" },
      { code: "2106", name: "Program ZCD untuk Kampung Zakat" },
      { code: "2107", name: "Program Balai Ternak" },
      { code: "2108.1", name: "Program Z-Mart" },
      { code: "2108.2", name: "Program Z-Chicken" },
      { code: "2108.3", name: "Program Z-Auto" },
      { code: "2109", name: "Pembiayaan Zakat Mikro" },
      { code: "2110", name: "Optimasi dan Pemasaran Produk Usaha" },
      { code: "2111", name: "Program Santripreneur" },
      { code: "2112", name: "Bantuan Modal Usaha UPZ BADKO LPQ (hak 70% UPZ)" },
      { code: "2113", name: "ZCD via CSR" },
    ]
  }
];

async function main() {
  console.log('Menghapus data lama (reset)...');
  await prisma.proposal.deleteMany();
  await prisma.program.deleteMany();
  await prisma.pilar.deleteMany();
  await prisma.user.deleteMany();

  console.log('Menyuntikkan Master Data Pilar & Program SIMBA BAZNAS...');
  for (const pilar of pilarData) {
    await prisma.pilar.create({
      data: {
        code: pilar.code,
        name: pilar.name,
        category: pilar.category,
        status: pilar.status,
      }
    });

    for (const prog of pilar.programs) {
      await prisma.program.create({
        data: {
          code: prog.code,
          name: prog.name,
          pilar_code: pilar.code
        }
      });
    }
  }



  console.log('Menyuntikkan Dummy Akun (User)...');
  const defaultPassword = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'superadmin@baznas.org', password_hash: defaultPassword, role: 'Super_Admin' as const, name: 'Super Admin BAZNAS' },
    { email: 'ketua@baznas.org', password_hash: defaultPassword, role: 'Ketua' as const, name: 'Ketua BAZNAS' },
    { email: 'wakilketua1@baznas.org', password_hash: defaultPassword, role: 'Wakil_Ketua_I' as const, name: 'Wakil Ketua I' },
    { email: 'wakilketua2@baznas.org', password_hash: defaultPassword, role: 'Wakil_Ketua_II' as const, name: 'Wakil Ketua II' },
    { email: 'wakilketua3@baznas.org', password_hash: defaultPassword, role: 'Wakil_Ketua_III' as const, name: 'Wakil Ketua III' },
    { email: 'wakilketua4@baznas.org', password_hash: defaultPassword, role: 'Wakil_Ketua_IV' as const, name: 'Wakil Ketua IV' },
    { email: 'kalak@baznas.org', password_hash: defaultPassword, role: 'Kepala_Pelaksana' as const, name: 'Kepala Pelaksana' },
    { email: 'kabagadmin@baznas.org', password_hash: defaultPassword, role: 'Kabag_Administrasi' as const, name: 'Kabag Admin' },
    { email: 'stafadmin@baznas.org', password_hash: defaultPassword, role: 'Staf_Administrasi' as const, name: 'Staf Admin' },
    { email: 'stafdistribusi@baznas.org', password_hash: defaultPassword, role: 'Staf_Distribusi' as const, name: 'Staf Distribusi' },
    { email: 'stafpelaporan@baznas.org', password_hash: defaultPassword, role: 'Staf_Pelaporan_Pengumpulan' as const, name: 'Staf Pelaporan' },
    { email: 'keuangan@baznas.org', password_hash: defaultPassword, role: 'Keuangan' as const, name: 'Divisi Keuangan' },
    { email: 'relawan@baznas.org', password_hash: defaultPassword, role: 'Relawan' as const, name: 'Relawan Lapangan' },
    { email: 'timmonev@baznas.org', password_hash: defaultPassword, role: 'Tim_Monev' as const, name: 'Tim Monev' },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user as any });
  }

  console.log('Menyuntikkan Dummy Proposal untuk Testing Tim Survei...');
  const proposals = [
    {
      nama_pemohon: 'Bapak Sudirman (Khusus Tim Monev)',
      jenis_permohonan: '2101', // Bantuan Modal Usaha
      tanggal_masuk: new Date(),
      status: 'Survei Assessment',
      kecamatan: 'Semarang Tengah',
      alamat: 'Jl. Pemuda No. 1'
    },
    {
      nama_pemohon: 'Ibu Wati (Khusus Tim Monev)',
      jenis_permohonan: '2103', // Bantuan Pengembangan Usaha
      tanggal_masuk: new Date(),
      status: 'Proses Disposisi',
      kecamatan: 'Semarang Barat',
      alamat: 'Jl. Jendral Sudirman No. 2'
    },
    {
      nama_pemohon: 'Bapak Agus (Khusus Relawan)',
      jenis_permohonan: '1102', // Bantuan Biaya Hidup
      tanggal_masuk: new Date(),
      status: 'Survei Assessment',
      kecamatan: 'Semarang Utara',
      alamat: 'Jl. Hasanudin No. 3'
    },
    {
      nama_pemohon: 'Mbah Karyo (Khusus Relawan)',
      jenis_permohonan: '1201', // Bantuan Pengobatan
      tanggal_masuk: new Date(),
      status: 'Proses Disposisi',
      kecamatan: 'Semarang Timur',
      alamat: 'Jl. Majapahit No. 4'
    }
  ];

  for (const prop of proposals) {
    await prisma.proposal.create({ data: prop as any });
  }

  console.log('✅ Seeding SELESAI!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
