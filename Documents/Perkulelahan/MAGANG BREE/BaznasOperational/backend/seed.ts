import { PrismaClient } from '@prisma/client';
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

const mustahikData = [
  {
    nrm: "NRM-001",
    nama: "Budi Santoso",
    nik: "3374012345670001",
    tempat_lahir: "Semarang",
    tanggal_lahir: "1980-05-12",
    jenis_kelamin: "L",
    pekerjaan: "Buruh Harian",
    alamat: "Jl. Pemuda No. 1, Semarang Tengah",
    handphone: "081234567890",
  },
  {
    nrm: "NRM-002",
    nama: "Siti Aminah",
    nik: "3374012345670002",
    tempat_lahir: "Semarang",
    tanggal_lahir: "1975-08-20",
    jenis_kelamin: "P",
    pekerjaan: "Pedagang Asongan",
    alamat: "Jl. MT Haryono No. 10, Semarang Timur",
    handphone: "081234567891",
  },
  {
    nrm: "NRM-003",
    nama: "Ahmad Fauzi",
    nik: "3374012345670003",
    tempat_lahir: "Kendal",
    tanggal_lahir: "1990-11-05",
    jenis_kelamin: "L",
    pekerjaan: "Pengangguran",
    alamat: "Jl. Pandanaran No. 50, Semarang Selatan",
    handphone: "081234567892",
  },
  {
    nrm: "NRM-004",
    nama: "Rina Wati",
    nik: "3374012345670004",
    tempat_lahir: "Demak",
    tanggal_lahir: "1988-02-15",
    jenis_kelamin: "P",
    pekerjaan: "Ibu Rumah Tangga",
    alamat: "Jl. Siliwangi No. 100, Semarang Barat",
    handphone: "081234567893",
  },
  {
    nrm: "NRM-005",
    nama: "Joko Supriyanto",
    nik: "3374012345670005",
    tempat_lahir: "Semarang",
    tanggal_lahir: "1965-07-22",
    jenis_kelamin: "L",
    pekerjaan: "Pensiunan",
    alamat: "Jl. Setiabudi No. 200, Banyumanik",
    handphone: "081234567894",
  }
];

async function seed() {
  for (const p of pilarData) {
    await prisma.pilar.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        category: p.category,
        status: p.status
      }
    });

    for (const prog of p.programs) {
      await prisma.program.upsert({
        where: { code: prog.code },
        update: {},
        create: {
          code: prog.code,
          name: prog.name,
          pilar_code: p.code,
          budget_rkat: null
        }
      });
    }
  }

  // Clear existing proposals for clean test data
  await prisma.proposal.deleteMany();

  // Create Mustahiks
  const createdMustahiks = [];
  for (const m of mustahikData) {
    const mustahik = await prisma.mustahik.upsert({
      where: { nik: m.nik },
      update: {},
      create: m
    });
    createdMustahiks.push(mustahik);
  }

  // Create Proposals for testing Pendistribusian & Pendayagunaan
  const proposalData = [
    {
      nama_pemohon: createdMustahiks[0].nama,
      nik: createdMustahiks[0].nik,
      alamat: createdMustahiks[0].alamat,
      kecamatan: "Semarang Tengah",
      jenis_permohonan: "1102", // Bantuan Biaya Hidup (Konsumtif -> Foto Orang)
      status: "Survei Assessment", 
      tanggal_masuk: new Date(),
      mustahik_id: createdMustahiks[0].id,
      isBeingSurveyed: false,
    },
    {
      nama_pemohon: createdMustahiks[1].nama,
      nik: createdMustahiks[1].nik,
      alamat: createdMustahiks[1].alamat,
      kecamatan: "Semarang Timur",
      jenis_permohonan: "2201", // Bantuan Sanitasi (Sanitasi -> Foto Toilet)
      status: "Survei Assessment", 
      tanggal_masuk: new Date(),
      mustahik_id: createdMustahiks[1].id,
      isBeingSurveyed: false,
    },
    {
      nama_pemohon: createdMustahiks[2].nama,
      nik: createdMustahiks[2].nik,
      alamat: createdMustahiks[2].alamat,
      kecamatan: "Semarang Selatan",
      jenis_permohonan: "2101", // Bantuan Modal Usaha (Produktif -> Foto Produk)
      status: "Survei Assessment", 
      tanggal_masuk: new Date(),
      mustahik_id: createdMustahiks[2].id,
      isBeingSurveyed: false,
    },
    {
      nama_pemohon: createdMustahiks[3].nama,
      nik: createdMustahiks[3].nik,
      alamat: createdMustahiks[3].alamat,
      kecamatan: "Semarang Barat",
      jenis_permohonan: "1301", // Bantuan Pendidikan Dasar
      status: "Review Kepala Pelaksana", // Disetujui
      surveyorName: "Relawan C",
      tanggal_masuk: new Date(),
      mustahik_id: createdMustahiks[3].id,
      isBeingSurveyed: true,
      score: 18,
      urgencyLevel: "Tinggi",
      survey_data: {
        pendapatanTotal: "1500000",
        jumlahTanggungan: "3",
        luasBangunan: 2,
        jenisLantai: 2,
        jenisDinding: 2,
        statusTempatTinggal: 3,
        pekerjaanKepala: 2,
        frekuensiMakan: 2,
        kemampuanLauk: 2,
        keadaanFisik: 2,
        hutang: 1,
        kesehatan: 1
      }
    },
    {
      nama_pemohon: createdMustahiks[4].nama,
      nik: createdMustahiks[4].nik,
      alamat: createdMustahiks[4].alamat,
      kecamatan: "Banyumanik",
      jenis_permohonan: "1105", // RTLH
      status: "Penentuan Nominal", // Antrean Bantuan / Disetujui
      surveyorName: "Relawan D",
      tanggal_masuk: new Date(),
      mustahik_id: createdMustahiks[4].id,
      isBeingSurveyed: true,
      score: 30,
      urgencyLevel: "Sangat Kritis",
      survey_data: {
        pendapatanTotal: "0",
        jumlahTanggungan: "2",
        luasBangunan: 3,
        jenisLantai: 3,
        jenisDinding: 3,
        statusTempatTinggal: 4,
        pekerjaanKepala: 3,
        frekuensiMakan: 3,
        kemampuanLauk: 3,
        keadaanFisik: 4,
        hutang: 2,
        kesehatan: 2
      }
    }
  ];


  for (const p of proposalData) {
    await prisma.proposal.create({
      data: p
    });
  }

  console.log('Seed completed with Test Proposals');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
