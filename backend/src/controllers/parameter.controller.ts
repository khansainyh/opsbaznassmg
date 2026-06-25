import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const defaultSurveyTemplate = JSON.stringify([
  { id: 'luasBangunan', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Luas Bangunan', options: [{ val: 3, label: '≤ 8 m² (Sangat sempit)' }, { val: 2, label: '8 m² - 10 m²' }, { val: 1, label: '> 10 m² (Lebih luas)' }] },
  { id: 'jenisLantai', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Lantai Tanah', options: [{ val: 3, label: 'Tanah' }, { val: 2, label: 'Plester / Semen' }, { val: 1, label: 'Keramik' }] },
  { id: 'jenisDinding', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Dinding Rumah', options: [{ val: 3, label: 'Papan / Tripleks / Bambu' }, { val: 2, label: 'Tembok Bata (Belum diplester/diaci)' }, { val: 1, label: 'Tembok Keramik / Tembok dicat rapi' }] },
  { id: 'statusTempatTinggal', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Status Tempat Tinggal', options: [{ val: 4, label: 'Kost' }, { val: 3, label: 'Kontrak / Sewa' }, { val: 2, label: 'Menumpang' }, { val: 1, label: 'Milik Sendiri' }] },
  { id: 'fasilitasMck', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Fasilitas MCK', options: [{ val: 2, label: 'Umum / MCK Bersama' }, { val: 1, label: 'Milik Sendiri (Di dalam rumah)' }] },
  { id: 'sumberAirMinum', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Sumber Air Minum', options: [{ val: 2, label: 'Bukan Air Bersih (Sumur keruh, dll)' }, { val: 1, label: 'Air Bersih (PDAM, sumur bor layak)' }] },
  { id: 'jenisPenerangan', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Penerangan', options: [{ val: 3, label: 'Lampu Minyak / Non-Listrik' }, { val: 2, label: 'Listrik 450 VA (Subsidi) / Numpang' }, { val: 1, label: 'Listrik ≥ 900 VA' }] },
  { id: 'kondisiDapur', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Kondisi Dapur', options: [{ val: 4, label: 'Kayu Bakar / Arang' }, { val: 3, label: 'Minyak Tanah' }, { val: 2, label: 'Gas 3 kg LPG (Subsidi)' }, { val: 1, label: 'Gas 12 kg / Bright Gas' }] },
  { id: 'pekerjaanKepala', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Pekerjaan Kepala Rumah Tangga', options: [{ val: 3, label: 'Tidak Bekerja / Pengangguran' }, { val: 2, label: 'Petani Gurem / Nelayan / Buruh Serabutan' }, { val: 1, label: 'Karyawan / Pedagang Mandiri' }] },
  { id: 'pendidikanKepala', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Pendidikan Kepala Rumah Tangga', options: [{ val: 3, label: 'Tidak Pernah Sekolah' }, { val: 2, label: 'SD - SMP' }, { val: 1, label: 'SMA - S1' }] },
  { id: 'frekuensiMakan', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Frekuensi Makan Dalam Sehari', options: [{ val: 3, label: '1 Kali sehari' }, { val: 2, label: '2 Kali sehari' }, { val: 1, label: '3 Kali sehari' }] },
  { id: 'kemampuanLauk', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Kemampuan Beli Lauk Bergizi (Mingguan)', options: [{ val: 3, label: '1 Kali seminggu (atau tidak pernah)' }, { val: 2, label: '2 Kali seminggu' }, { val: 1, label: '≥ 3 Kali seminggu' }] },
  { id: 'kemampuanPakaian', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Kemampuan Beli Pakaian Baru', options: [{ val: 3, label: '1 Kali setahun (hanya sumbangan)' }, { val: 2, label: '2 Kali setahun' }, { val: 1, label: '≥ 3 Kali setahun' }] },
  { id: 'asumsiBantuan', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Asumsi Subsidi / Bantuan Lain', options: [{ val: 4, label: 'Tidak Ada bantuan sama sekali' }, { val: 3, label: 'Ada sumbangan rutin < Rp 50.000/bulan' }, { val: 2, label: 'Ada bantuan dari kerabat > Rp 100.000/bulan' }, { val: 1, label: 'Biaya hidup ditanggung anak mandiri' }] },
  { id: 'keadaanFisik', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Keadaan Fisik', options: [{ val: 4, label: 'Manula dan Sakit (Bedridden)' }, { val: 3, label: 'Manula (Sehat tapi tidak kuat kerja)' }, { val: 2, label: 'Cacat Produktif (Masih bisa aktivitas ringan)' }, { val: 1, label: 'Sehat / Produktif (Usia kerja normal)' }] },
  { id: 'tanggunganKategori', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Tanggungan Khusus', options: [{ val: 3, label: 'Anak Masih Sekolah' }, { val: 2, label: 'Keluarga Lainnya (Orang tua sakit)' }, { val: 1, label: 'Tidak Ada Tanggungan (Lajang/Mandiri)' }] },
  { id: 'hutang', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Kondisi Hutang', options: [{ val: 2, label: 'Terjerat Rentenir / Pinjaman Online' }, { val: 1, label: 'Non Rentenir / Bank Ringan / Tidak Ada' }] },
  { id: 'kesehatan', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Kemampuan Penuhi Kebutuhan Kesehatan', options: [{ val: 2, label: 'Tidak Ada Kemampuan (Tidak punya BPJS KIS/PBI)' }, { val: 1, label: 'Ada Kemampuan (BPJS Mandiri / Bayar sendiri)' }] }
]);

const defaultLembagaSurveyTemplate = JSON.stringify([
  { id: 'berbadanHukum', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Berbadan Hukum', options: [{ val: 3, label: 'Yayasan' }, { val: 2, label: 'Pemerintah' }, { val: 1, label: 'Tidak Berbadan Hukum' }] },
  { id: 'usiaBerdiri', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Usia Berdiri', options: [{ val: 5, label: '8-10 th' }, { val: 4, label: '6-8 th' }, { val: 3, label: '4-6 th' }, { val: 2, label: '2-4 th' }, { val: 1, label: '0-2 th' }] },
  { id: 'bidangGarapan', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Bidang Garapan', options: [{ val: 5, label: 'Pendidikan' }, { val: 4, label: 'Sosial' }, { val: 3, label: 'Jasa' }, { val: 2, label: 'Dakwah' }, { val: 1, label: 'Lainnya' }] },
  { id: 'daerahJangkauan', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Daerah Jangkauan', options: [{ val: 5, label: 'Nasional' }, { val: 4, label: 'Provinsi' }, { val: 3, label: 'Kabupaten/Kota' }, { val: 2, label: 'Kecamatan' }, { val: 1, label: 'Kelurahan' }] },
  { id: 'layakJenisKegiatan', section: 'B', sectionTitle: 'Bagian B: Kelayakan', label: 'Kelayakan Jenis Kegiatan', options: [{ val: 2, label: 'Layak' }, { val: 1, label: 'Tidak Layak' }] },
  { id: 'layakJumlahPenerima', section: 'B', sectionTitle: 'Bagian B: Kelayakan', label: 'Kelayakan Jumlah Penerima Manfaat', options: [{ val: 2, label: 'Layak' }, { val: 1, label: 'Tidak Layak' }] }
]);

const defaultParams = [
  { key: 'bps_garis_kemiskinan', value: '709000', description: 'Garis Kemiskinan BPS (Rupiah per Kapita)' },
  { key: 'upz_hak_salur_persentase', value: '30', description: 'Persentase Hak Salur UPZ (%)' },
  { key: 'upz_hak_salur_pengumpulan', value: '30', description: 'Persentase Hak Salur UPZ Pengumpulan (%)' },
  { key: 'upz_hak_salur_pembantuan', value: '70', description: 'Persentase Hak Salur UPZ Pembantuan Pendistribusian & Pendayagunaan (%)' },
  { key: 'survey_template_individu', value: defaultSurveyTemplate, description: 'Template Form Asesmen Individu / Perorangan Konsumtif (JSON)' },
  { key: 'survey_template_perorangan_produktif', value: defaultSurveyTemplate, description: 'Template Form Asesmen Perorangan Produktif (JSON)' },
  { key: 'survey_template_lembaga', value: defaultLembagaSurveyTemplate, description: 'Template Form Asesmen Lembaga (JSON)' },
  { key: 'rkat_pengumpulan_no_zakat', value: '3', description: 'Nomor Urut RKAT Zakat Maal UPZ Pengumpulan' },
  { key: 'rkat_pengumpulan_no_infak', value: '8', description: 'Nomor Urut RKAT Infak/Sedekah UPZ Pengumpulan' },
  { key: 'coa_penerimaan_zakat', value: '41020201', description: 'Kode Akun (COA) Kredit Zakat Maal UPZ Pengumpulan' },
  { key: 'coa_penerimaan_infak', value: '42020101', description: 'Kode Akun (COA) Kredit Infak/Sedekah UPZ Pengumpulan' }
];

export const getParameters = async (req: Request, res: Response) => {
  try {
    const deprecatedKeys = [
      'hak_amil_zakat_maal',
      'hak_amil_infak_sedekah',
      'hak_amil_zakat_fitrah',
      'coa_debit_beban_amil_zakat',
      'coa_kredit_pendapatan_amil_zakat',
      'coa_kredit_utang_upz',
      'hak_amil_zakat_upz_pengumpulan',
      'hak_amil_upz_bagian',
      'hak_amil_baznas_bagian'
    ];
    await prisma.systemParameter.deleteMany({
      where: {
        key: { in: deprecatedKeys }
      }
    });

    let params = await prisma.systemParameter.findMany();
    
    // Check if each default parameter exists, otherwise insert it
    for (const dp of defaultParams) {
      const exists = params.some(p => p.key === dp.key);
      if (!exists) {
        const created = await prisma.systemParameter.create({
          data: dp
        });
        params.push(created);
      }
    }
    
    res.status(200).json(params);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
};

export const getParameterByKey = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const param = await prisma.systemParameter.findUnique({
      where: { key }
    });
    if (!param) {
      return res.status(404).json({ error: 'Parameter not found' });
    }
    res.status(200).json(param);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parameter' });
  }
};

export const upsertParameter = async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;
    const param = await prisma.systemParameter.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
    res.status(200).json(param);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save parameter' });
  }
};
