export interface RKATDetail {
  asnaf: 'Fakir' | 'Miskin' | 'Amil' | 'Mualaf' | 'Riqab' | 'Gharim' | 'Fisabilillah' | 'Ibnu Sabil';
  nominal: number;
  frekuensi: string;
}

export interface AsnafTarget {
  id: string;
  asnaf: 'Fakir' | 'Miskin' | 'Amil' | 'Mualaf' | 'Riqab' | 'Gharim' | 'Fisabilillah' | 'Ibnu Sabil';
  frekuensi: number | string;
  nominal: number;
  mustahik: number;
  keterangan?: string;
}

export interface Program {
  code: string;
  name: string;
  budget_rkat?: number;
  rkat_details?: RKATDetail[];
  asnafTargets?: AsnafTarget[];
  nominalUmum?: number;
}

export interface Pilar {
  code: string;
  name: string;
  category: string;
  status: 'Aktif' | 'Non-aktif';
  programs: Program[];
}

export const ASNAF_OPTIONS = [
  'Fakir',
  'Miskin',
  'Amil',
  'Mualaf',
  'Riqab',
  'Gharim',
  'Fisabilillah',
  'Ibnu Sabil'
] as const;

export const pilarData: Pilar[] = [
  {
    code: "1100",
    name: "Semarang Peduli",
    category: "Kemanusiaan & Sosial",
    status: "Aktif",
    programs: [
      { code: "1101", name: "Bantuan Makanan", rkat_details: [{ asnaf: "Fakir", nominal: 32000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 32000, frekuensi: "1" }] },
      { code: "1102", name: "Bantuan Biaya Hidup" },
      { code: "1102.1", name: "Bantuan Biaya Hidup Rutin", rkat_details: [{ asnaf: "Fakir", nominal: 250000, frekuensi: "12" }, { asnaf: "Miskin", nominal: 200000, frekuensi: "12" }] },
      { code: "1102.2", name: "Bantuan Biaya Hidup Santunan", rkat_details: [{ asnaf: "Fakir", nominal: 100000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 100000, frekuensi: "1" }] },
      { code: "1102.3", name: "Bantuan Biaya Hidup Sembako", rkat_details: [{ asnaf: "Fakir", nominal: 150000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 150000, frekuensi: "1" }] },
      { code: "1103", name: "Bantuan Penyaluran Fitrah", rkat_details: [{ asnaf: "Fakir", nominal: 45000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 45000, frekuensi: "1" }] },
      { code: "1104", name: "Bantuan Penyaluran Kurban", rkat_details: [{ asnaf: "Fakir", nominal: 3000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 3000000, frekuensi: "1" }] },
      { code: "1105", name: "Rumah Tidak Layak Huni", rkat_details: [{ asnaf: "Fakir", nominal: 15000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 15000000, frekuensi: "1" }] },
      { code: "1106", name: "Respon Darurat Bencana", rkat_details: [{ asnaf: "Gharim", nominal: 1000000, frekuensi: "1" }] },
      { code: "1107", name: "Pemulihan Pascabencana" },
      { code: "1108", name: "Pemulasaran Jenazah", rkat_details: [{ asnaf: "Ibnu Sabil", nominal: 500000, frekuensi: "1" }, { asnaf: "Fakir", nominal: 500000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 500000, frekuensi: "1" }] },
      { code: "1109", name: "Khitanan Massal", rkat_details: [{ asnaf: "Fakir", nominal: 500000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 500000, frekuensi: "1" }] },
      { code: "1110", name: "Bantuan Alat Kesehatan" },
      { code: "1110.1", name: "Bantuan Alat Kesehatan Kursi Roda", rkat_details: [{ asnaf: "Fakir", nominal: 1500000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 1500000, frekuensi: "1" }] },
      { code: "1110.2", name: "Bantuan Alat Kesehatan Kruk" },
      { code: "1110.3", name: "Bantuan Alat Kesehatan Kaki Palsu", rkat_details: [{ asnaf: "Fakir", nominal: 2000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 2000000, frekuensi: "1" }] },
      { code: "1110.4", name: "Bantuan Alat Kesehatan Tangan Palsu" },
      { code: "1110.5", name: "Bantuan Alat Kesehatan Walker" },
      { code: "1110.6", name: "Bantuan Alat Kesehatan Alat Bantu Dengar", rkat_details: [{ asnaf: "Fakir", nominal: 1000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 1000000, frekuensi: "1" }] },
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
      { code: "1201", name: "Bantuan Pengobatan", rkat_details: [{ asnaf: "Fakir", nominal: 2000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 1500000, frekuensi: "1" }] },
      { code: "1202", name: "Bantuan Transportasi dan/Atau Akomodasi Pasien", rkat_details: [{ asnaf: "Fakir", nominal: 100000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 100000, frekuensi: "1" }, { asnaf: "Ibnu Sabil", nominal: 70000, frekuensi: "1" }] },
      { code: "1203", name: "Bantuan Asuransi Kesehatan", rkat_details: [{ asnaf: "Fisabilillah", nominal: 8400, frekuensi: "12" }] },
      { code: "2201", name: "Bantuan Sanitasi", rkat_details: [{ asnaf: "Fakir", nominal: 1600000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 1600000, frekuensi: "1" }] },
      { code: "2202", name: "Bantuan Sumur Air", rkat_details: [{ asnaf: "Miskin", nominal: 2500000, frekuensi: "1" }, { asnaf: "Fisabilillah", nominal: 2500000, frekuensi: "1" }] },
      { code: "2203", name: "Bantuan Edukasi/Promosi Kesehatan" },
      { code: "2204", name: "Bantuan Penyediaan Air Bersih" },
      { code: "2205", name: "Pencegahan dan Penanggulangan Stunting", rkat_details: [{ asnaf: "Fakir", nominal: 150000, frekuensi: "12" }, { asnaf: "Miskin", nominal: 150000, frekuensi: "12" }] },
    ]
  },
  {
    code: "1300",
    name: "Semarang Cerdas",
    category: "Pendidikan & Pengembangan Karakter",
    status: "Aktif",
    programs: [
      { code: "1301", name: "Bantuan Pendidikan Dasar dan Menengah", rkat_details: [{ asnaf: "Fakir", nominal: 500000, frekuensi: "2" }, { asnaf: "Miskin", nominal: 500000, frekuensi: "2" }, { asnaf: "Fakir", nominal: 1000000, frekuensi: "2" }, { asnaf: "Miskin", nominal: 1000000, frekuensi: "2" }] },
      { code: "1302", name: "Bantuan Pendidikan Dasar dan Menengah | Melalui UPZ Dinas Pendidikan" },
      { code: "1303", name: "Bantuan Pendidikan Dasar dan Menengah Hak 30% UPZ" },
      { code: "2301", name: "Bantuan Pendidikan Tinggi Dalam Negeri", rkat_details: [{ asnaf: "Fisabilillah", nominal: 6000000, frekuensi: "2" }, { asnaf: "Miskin", nominal: 6000000, frekuensi: "2" }] },
      { code: "2302", name: "Bantuan Infrastruktur Pendidikan", rkat_details: [{ asnaf: "Fisabilillah", nominal: 10000000, frekuensi: "1" }] },
      { code: "2303", name: "Program Pembinaan dan Pengembangan Karakter dan Kompetensi", rkat_details: [{ asnaf: "Fisabilillah", nominal: 1000000, frekuensi: "1" }] },
    ]
  },
  {
    code: "1400",
    name: "Semarang Taqwa",
    category: "Keagamaan & Dakwah",
    status: "Aktif",
    programs: [
      { code: "1401", name: "Bantuan Kafalah/ Mukafaah Dai", rkat_details: [{ asnaf: "Fisabilillah", nominal: 500000, frekuensi: "12" }, { asnaf: "Miskin", nominal: 500000, frekuensi: "12" }] },
      { code: "1402", name: "Bantuan Perlengkapan Ibadah", rkat_details: [{ asnaf: "Fisabilillah", nominal: 2000000, frekuensi: "1" }] },
      { code: "1403", name: "Bantuan Syiar Dakwah", rkat_details: [{ asnaf: "Fisabilillah", nominal: 3000000, frekuensi: "1" }] },
      { code: "1404", name: "Bantuan Sarana Dakwah" },
      { code: "1405", name: "Program Pembinaan, Pendampingan, dan Advokasi Mualaf", rkat_details: [{ asnaf: "Mualaf", nominal: 1000000, frekuensi: "1" }] },
      { code: "1406", name: "Program Advokasi/Bantuan Hukum", rkat_details: [{ asnaf: "Gharim", nominal: 2500000, frekuensi: "1" }] },
      { code: "1407", name: "Bantuan Renovasi/Operasional pada Masjid/Mushola/Yayasan/Lembaga", rkat_details: [{ asnaf: "Fisabilillah", nominal: 2500000, frekuensi: "1" }] },
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
      { code: "2101", name: "Bantuan Modal Usaha", rkat_details: [{ asnaf: "Fakir", nominal: 2000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 1500000, frekuensi: "1" }] },
      { code: "2102", name: "Bantuan Ketrampilan Kerja", rkat_details: [{ asnaf: "Miskin", nominal: 1000000, frekuensi: "1" }] },
      { code: "2103", name: "Bantuan Pengembangan Usaha", rkat_details: [{ asnaf: "Miskin", nominal: 3000000, frekuensi: "1" }] },
      { code: "2103.1", name: "Bantuan Pengembangan Usaha Pemasaran Usaha" },
      { code: "2104", name: "Bantuan Infrastruktur Pelatihan Ketrampilan Kerja" },
      { code: "2105", name: "Program Pemberdayaan Petani (Lumbung Pangan)" },
      { code: "2106", name: "Program ZCD untuk Kampung Zakat" },
      { code: "2107", name: "Program Balai Ternak", rkat_details: [{ asnaf: "Miskin", nominal: 10000000, frekuensi: "1" }] },
      { code: "2108.1", name: "Program Z-Mart", rkat_details: [{ asnaf: "Miskin", nominal: 5000000, frekuensi: "1" }] },
      { code: "2108.2", name: "Program Z-Chicken", rkat_details: [{ asnaf: "Miskin", nominal: 5000000, frekuensi: "1" }] },
      { code: "2108.3", name: "Program Z-Auto", rkat_details: [{ asnaf: "Miskin", nominal: 5000000, frekuensi: "1" }] },
      { code: "2109", name: "Pembiayaan Zakat Mikro", rkat_details: [{ asnaf: "Gharim", nominal: 2000000, frekuensi: "1" }, { asnaf: "Miskin", nominal: 2000000, frekuensi: "1" }] },
      { code: "2110", name: "Optimasi dan Pemasaran Produk Usaha" },
      { code: "2111", name: "Program Santripreneur", rkat_details: [{ asnaf: "Fisabilillah", nominal: 2500000, frekuensi: "1" }] },
      { code: "2112", name: "Bantuan Modal Usaha UPZ BADKO LPQ (hak 70% UPZ)" },
      { code: "2113", name: "ZCD via CSR" },
    ]
  }
];
