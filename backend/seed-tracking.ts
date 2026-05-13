import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const mustahiks = [
  { nrm:'NRM-T01', nama:'Hendra Wijaya',     nik:'3374021111110001', tempat_lahir:'Semarang', tanggal_lahir:'1982-03-10', jenis_kelamin:'L', pekerjaan:'Buruh Harian',      alamat:'Jl. Anjasmoro No. 12', handphone:'081311110001' },
  { nrm:'NRM-T02', nama:'Dewi Kusuma',       nik:'3374021111110002', tempat_lahir:'Demak',    tanggal_lahir:'1990-07-25', jenis_kelamin:'P', pekerjaan:'Pedagang Kecil',    alamat:'Jl. Imam Bonjol No. 3', handphone:'081311110002' },
  { nrm:'NRM-T03', nama:'Suparman',          nik:'3374021111110003', tempat_lahir:'Kendal',   tanggal_lahir:'1970-12-01', jenis_kelamin:'L', pekerjaan:'Kuli Bangunan',     alamat:'Jl. Hasanuddin No. 7',  handphone:'081311110003' },
  { nrm:'NRM-T04', nama:'Aisyah Rahmawati',  nik:'3374021111110004', tempat_lahir:'Semarang', tanggal_lahir:'1995-05-18', jenis_kelamin:'P', pekerjaan:'Ibu Rumah Tangga', alamat:'Jl. Pamularsih No. 22', handphone:'081311110004' },
  { nrm:'NRM-T05', nama:'Bambang Hariadi',   nik:'3374021111110005', tempat_lahir:'Grobogan', tanggal_lahir:'1968-09-14', jenis_kelamin:'L', pekerjaan:'Tukang Becak',     alamat:'Jl. Jurnatan No. 5',    handphone:'081311110005' },
  { nrm:'NRM-T06', nama:'Nurul Hidayah',     nik:'3374021111110006', tempat_lahir:'Semarang', tanggal_lahir:'1987-04-30', jenis_kelamin:'P', pekerjaan:'Buruh Cuci',       alamat:'Jl. Pandan No. 9',      handphone:'081311110006' },
  { nrm:'NRM-T07', nama:'Agus Setiawan',     nik:'3374021111110007', tempat_lahir:'Semarang', tanggal_lahir:'1978-11-22', jenis_kelamin:'L', pekerjaan:'Petani',           alamat:'Jl. Gunungpati No. 4',  handphone:'081311110007' },
  { nrm:'NRM-T08', nama:'Sri Mulyani',       nik:'3374021111110008', tempat_lahir:'Demak',    tanggal_lahir:'1983-02-08', jenis_kelamin:'P', pekerjaan:'Pengangguran',     alamat:'Jl. Pedurungan No. 11', handphone:'081311110008' },
  { nrm:'NRM-T09', nama:'Wahyu Prasetyo',    nik:'3374021111110009', tempat_lahir:'Semarang', tanggal_lahir:'1992-06-15', jenis_kelamin:'L', pekerjaan:'Buruh Pabrik',     alamat:'Jl. Genuk Indah No. 3', handphone:'081311110009' },
  { nrm:'NRM-T10', nama:'Fatimah Azzahra',   nik:'3374021111110010', tempat_lahir:'Kudus',    tanggal_lahir:'1996-08-20', jenis_kelamin:'P', pekerjaan:'Tidak Bekerja',    alamat:'Jl. Ngaliyan No. 6',    handphone:'081311110010' },
  { nrm:'NRM-T11', nama:'Rusdi Santoso',     nik:'3374021111110011', tempat_lahir:'Semarang', tanggal_lahir:'1975-01-05', jenis_kelamin:'L', pekerjaan:'Nelayan',          alamat:'Jl. Tugu No. 2',        handphone:'081311110011' },
  { nrm:'NRM-T12', nama:'Mardiyah',          nik:'3374021111110012', tempat_lahir:'Semarang', tanggal_lahir:'1980-10-12', jenis_kelamin:'P', pekerjaan:'Pedagang Asongan', alamat:'Jl. Candisari No. 8',   handphone:'081311110012' },
  { nrm:'NRM-T13', nama:'Teguh Wibowo',      nik:'3374021111110013', tempat_lahir:'Blora',    tanggal_lahir:'1985-03-28', jenis_kelamin:'L', pekerjaan:'Supir Ojol',       alamat:'Jl. Tembalang No. 15',  handphone:'081311110013' },
  { nrm:'NRM-T14', nama:'Sinta Dewi',        nik:'3374021111110014', tempat_lahir:'Semarang', tanggal_lahir:'1993-12-03', jenis_kelamin:'P', pekerjaan:'Ibu Rumah Tangga', alamat:'Jl. Mijen No. 7',       handphone:'081311110014' },
  { nrm:'NRM-T15', nama:'Yusuf Arifin',      nik:'3374021111110015', tempat_lahir:'Semarang', tanggal_lahir:'1971-07-19', jenis_kelamin:'L', pekerjaan:'Buruh Lepas',      alamat:'Jl. Gajahmungkur No. 3',handphone:'081311110015' },
  { nrm:'NRM-T16', nama:'Khusnul Khotimah',  nik:'3374021111110016', tempat_lahir:'Demak',    tanggal_lahir:'1989-09-09', jenis_kelamin:'P', pekerjaan:'Penjual Gorengan', alamat:'Jl. Gayamsari No. 10',  handphone:'081311110016' },
  { nrm:'NRM-T17', nama:'Darmaji',           nik:'3374021111110017', tempat_lahir:'Semarang', tanggal_lahir:'1965-04-14', jenis_kelamin:'L', pekerjaan:'Pensiunan',        alamat:'Jl. Banyumanik No. 5',  handphone:'081311110017' },
  { nrm:'NRM-T18', nama:'Rahayu Ningsih',    nik:'3374021111110018', tempat_lahir:'Grobogan', tanggal_lahir:'1991-11-30', jenis_kelamin:'P', pekerjaan:'Buruh Harian',     alamat:'Jl. Karangrejo No. 1',  handphone:'081311110018' },
];

const surveyDummy = {
  luasBangunan:2, jenisLantai:2, jenisDinding:2, statusTempatTinggal:3,
  fasilitasMck:2, sumberAirMinum:2, jenisPenerangan:1, kondisiDapur:2,
  aset:[], pendidikanKepala:2, pekerjaanKepala:2,
  pendapatanTotal:'1200000', jumlahTanggungan:'3',
  frekuensiMakan:2, kemampuanLauk:2, kemampuanPakaian:1,
  asumsiBantuan:2, keadaanFisik:1, tanggunganKategori:1,
  hutang:1, kesehatan:1, catatanLapangan:'Data hasil survei lapangan'
};

async function seedTracking() {
  // Upsert mustahiks
  const ms: any[] = [];
  for (const m of mustahiks) {
    const r = await prisma.mustahik.upsert({ where:{ nik:m.nik }, update:{}, create:m });
    ms.push(r);
  }

  // Delete tracking seed proposals if any (by nik pattern)
  await prisma.proposal.deleteMany({
    where: { nik: { startsWith: '33740211111' } }
  });

  const now = new Date();
  const d = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);

  const proposals = [
    // 1. Registrasi
    { nama_pemohon:ms[0].nama, nik:ms[0].nik, alamat:ms[0].alamat, kelurahan:'Salamanmloyo', kecamatan:'Semarang Barat',  jenis_permohonan:'1102', status:'Registrasi',              tanggal_masuk:d(1),  mustahik_id:ms[0].id, has_memo:false },
    { nama_pemohon:ms[1].nama, nik:ms[1].nik, alamat:ms[1].alamat, kelurahan:'Miroto',        kecamatan:'Semarang Tengah', jenis_permohonan:'1301', status:'Registrasi',              tanggal_masuk:d(2),  mustahik_id:ms[1].id, has_memo:true,  memo_source:'Wakil Ketua II' },
    // 2. Review Kabag
    { nama_pemohon:ms[2].nama, nik:ms[2].nik, alamat:ms[2].alamat, kelurahan:'Karangtempel',  kecamatan:'Semarang Timur',  jenis_permohonan:'1201', status:'Review Kabag',            tanggal_masuk:d(4),  mustahik_id:ms[2].id, has_memo:false },
    { nama_pemohon:ms[3].nama, nik:ms[3].nik, alamat:ms[3].alamat, kelurahan:'Karangayu',     kecamatan:'Semarang Barat',  jenis_permohonan:'1105', status:'Review Kabag',            tanggal_masuk:d(5),  mustahik_id:ms[3].id, has_memo:true,  memo_source:'Ketua BAZNAS' },
    // 3. Survei Assessment
    { nama_pemohon:ms[4].nama, nik:ms[4].nik, alamat:ms[4].alamat, kelurahan:'Jurnatan',      kecamatan:'Semarang Tengah', jenis_permohonan:'1102', status:'Survei Assessment',        tanggal_masuk:d(7),  mustahik_id:ms[4].id, surveyorName:'Relawan A', urgencyLevel:'Tinggi',        score:22, isBeingSurveyed:true,  survey_data:surveyDummy },
    { nama_pemohon:ms[5].nama, nik:ms[5].nik, alamat:ms[5].alamat, kelurahan:'Pandan',        kecamatan:'Candisari',       jenis_permohonan:'2201', status:'Survei Assessment',        tanggal_masuk:d(8),  mustahik_id:ms[5].id, surveyorName:'Relawan B', urgencyLevel:'Sedang',        score:15, isBeingSurveyed:true,  survey_data:surveyDummy },
    // 4. Survei Selesai
    { nama_pemohon:ms[6].nama, nik:ms[6].nik, alamat:ms[6].alamat, kelurahan:'Gunungpati',    kecamatan:'Gunungpati',      jenis_permohonan:'2101', status:'Survei Selesai',           tanggal_masuk:d(12), mustahik_id:ms[6].id, surveyorName:'Relawan C', urgencyLevel:'Sangat Kritis',  score:31, isBeingSurveyed:true,  survey_data:surveyDummy },
    { nama_pemohon:ms[7].nama, nik:ms[7].nik, alamat:ms[7].alamat, kelurahan:'Pedurungan',    kecamatan:'Pedurungan',      jenis_permohonan:'1301', status:'Survei Selesai',           tanggal_masuk:d(13), mustahik_id:ms[7].id, surveyorName:'Relawan D', urgencyLevel:'Tinggi',        score:24, isBeingSurveyed:true,  survey_data:surveyDummy },
    // 5. Review Kepala Pelaksana
    { nama_pemohon:ms[8].nama, nik:ms[8].nik, alamat:ms[8].alamat, kelurahan:'Genuk Indah',   kecamatan:'Genuk',           jenis_permohonan:'1102', status:'Review Kepala Pelaksana',  tanggal_masuk:d(15), mustahik_id:ms[8].id, surveyorName:'Relawan E', urgencyLevel:'Sangat Kritis',  score:35, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Direkomendasikan untuk segera diproses karena kondisi keluarga sangat memprihatinkan.' },
    // 6. Persetujuan Pimpinan (6 proposal)
    { nama_pemohon:ms[9].nama,  nik:ms[9].nik,  alamat:ms[9].alamat,  kelurahan:'Ngaliyan',     kecamatan:'Ngaliyan',        jenis_permohonan:'1301', status:'Persetujuan Pimpinan',    tanggal_masuk:d(18), mustahik_id:ms[9].id,  surveyorName:'Relawan A', urgencyLevel:'Tinggi',        score:27, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Layak disetujui. Mahasiswi semester 5 dari keluarga tidak mampu.', has_memo:true,  memo_source:'Wakil Ketua I' },
    { nama_pemohon:ms[10].nama, nik:ms[10].nik, alamat:ms[10].alamat, kelurahan:'Tugu',         kecamatan:'Tugu',            jenis_permohonan:'1105', status:'Persetujuan Pimpinan',    tanggal_masuk:d(19), mustahik_id:ms[10].id, surveyorName:'Relawan B', urgencyLevel:'Sangat Kritis',  score:38, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Kondisi rumah sangat tidak layak huni. Prioritaskan.', has_memo:false },
    { nama_pemohon:ms[11].nama, nik:ms[11].nik, alamat:ms[11].alamat, kelurahan:'Jatingaleh',   kecamatan:'Candisari',       jenis_permohonan:'1201', status:'Persetujuan Pimpinan',    tanggal_masuk:d(20), mustahik_id:ms[11].id, surveyorName:'Relawan C', urgencyLevel:'Sedang',        score:18, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Butuh bantuan pengobatan rutin. Direkomendasikan.', has_memo:true, memo_source:'Ketua BAZNAS' },
    { nama_pemohon:ms[12].nama, nik:ms[12].nik, alamat:ms[12].alamat, kelurahan:'Tembalang',    kecamatan:'Tembalang',       jenis_permohonan:'2101', status:'Persetujuan Pimpinan',    tanggal_masuk:d(21), mustahik_id:ms[12].id, surveyorName:'Relawan D', urgencyLevel:'Tinggi',        score:25, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Usaha kecil layak didukung modal. Prospek baik.', has_memo:false },
    { nama_pemohon:ms[13].nama, nik:ms[13].nik, alamat:ms[13].alamat, kelurahan:'Mijen',        kecamatan:'Mijen',           jenis_permohonan:'1102', status:'Persetujuan Pimpinan',    tanggal_masuk:d(22), mustahik_id:ms[13].id, surveyorName:'Relawan E', urgencyLevel:'Rendah',        score:14, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Keluarga dengan 5 tanggungan, penghasilan di bawah minimum.', has_memo:true, memo_source:'Wakil Ketua III' },
    { nama_pemohon:ms[14].nama, nik:ms[14].nik, alamat:ms[14].alamat, kelurahan:'Gajahmungkur', kecamatan:'Gajahmungkur',    jenis_permohonan:'1401', status:'Persetujuan Pimpinan',    tanggal_masuk:d(23), mustahik_id:ms[14].id, surveyorName:'Relawan A', urgencyLevel:'Sedang',        score:20, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Dai aktif dengan penghasilan sangat terbatas. Layak dibantu.', has_memo:false },
    // 7. Penentuan Nominal
    { nama_pemohon:ms[15].nama, nik:ms[15].nik, alamat:ms[15].alamat, kelurahan:'Gayamsari',    kecamatan:'Gayamsari',       jenis_permohonan:'1301', status:'Penentuan Nominal',       tanggal_masuk:d(25), mustahik_id:ms[15].id, surveyorName:'Relawan B', urgencyLevel:'Tinggi',        score:26, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Disetujui Kepala.', catatanPimpinan:'Setujui dengan penyesuaian nominal sesuai RKAT.' },
    // 8. Selesai & Arsip
    { nama_pemohon:ms[16].nama, nik:ms[16].nik, alamat:ms[16].alamat, kelurahan:'Banyumanik',   kecamatan:'Banyumanik',      jenis_permohonan:'1102', status:'Selesai & Arsip',         tanggal_masuk:d(30), mustahik_id:ms[16].id, surveyorName:'Relawan C', urgencyLevel:'Sangat Kritis',  score:33, isBeingSurveyed:true,  survey_data:surveyDummy, catatanKepala:'Disetujui.', catatanPimpinan:'Segera cairkan.', nominal:1500000, tipe_bantuan:'Tunai' },
    // 9. Ditolak
    { nama_pemohon:ms[17].nama, nik:ms[17].nik, alamat:ms[17].alamat, kelurahan:'Karangrejo',   kecamatan:'Banyumanik',      jenis_permohonan:'2101', status:'Ditolak',                 tanggal_masuk:d(35), mustahik_id:ms[17].id, catatanKepala:'Data tidak lengkap dan tidak memenuhi syarat penerima manfaat.' },
  ];

  for (const p of proposals) {
    await prisma.proposal.create({ data: p as any });
  }

  console.log(`✅ Seed tracking selesai: ${proposals.length} proposal dibuat.`);
}

seedTracking().catch(console.error).finally(() => prisma.$disconnect());
