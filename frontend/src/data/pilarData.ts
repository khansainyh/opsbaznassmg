export interface AsnafTarget {
  id: string;
  name?: string;
  asnaf?: 'Fakir' | 'Miskin' | 'Amil' | 'Mualaf' | 'Riqab' | 'Gharim' | 'Fisabilillah' | 'Ibnu Sabil' | 'IST' | 'ISTT' | '';
  frekuensi: number | string;
  nominal: number;
  mustahik: number;
  keterangan?: string;
  noUrut?: number;
  coaCode?: string;
}

export interface Program {
  code: string;
  name: string;
  tipe?: 'Konsumtif' | 'Produktif';
  asnafTargets?: AsnafTarget[];
  nominalUmum?: number;
  rkat_details?: AsnafTarget[];
  budget_rkat?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Pilar {
  code: string;
  name: string;
  category: string;
  status: 'Aktif' | 'Non-aktif';
  programs: Program[];
  created_at?: string;
  updated_at?: string;
}

export const pilarData: Pilar[] = [
  {
    code: "1100",
    name: "Semarang Peduli",
    category: "Kemanusiaan & Sosial",
    status: "Aktif",
    programs: [
      { code: "1101", name: "Bantuan Makanan", tipe: "Konsumtif" },
      { code: "1102", name: "Bantuan Biaya Hidup", tipe: "Konsumtif" },
      { code: "1102.1", name: "Bantuan Biaya Hidup Rutin", tipe: "Konsumtif" },
      { code: "1102.2", name: "Bantuan Biaya Hidup Santunan", tipe: "Konsumtif" },
      { code: "1102.3", name: "Bantuan Biaya Hidup Sembako", tipe: "Konsumtif" },
      { code: "1103", name: "Bantuan Penyaluran Fitrah", tipe: "Konsumtif" },
      { code: "1104", name: "Bantuan Penyaluran Kurban", tipe: "Konsumtif" },
      { code: "1105", name: "Rumah Tidak Layak Huni", tipe: "Konsumtif" },
      { code: "1106", name: "Respon Darurat Bencana", tipe: "Konsumtif" },
      { code: "1107", name: "Pemulihan Pascabencana", tipe: "Konsumtif" },
      { code: "1108", name: "Pemulasaran Jenazah", tipe: "Konsumtif" },
      { code: "1109", name: "Khitanan Massal", tipe: "Konsumtif" },
      { code: "1110", name: "Bantuan Alat Kesehatan", tipe: "Konsumtif" },
      { code: "1110.1", name: "Bantuan Alat Kesehatan Kursi Roda", tipe: "Konsumtif" },
      { code: "1110.2", name: "Bantuan Alat Kesehatan Kruk", tipe: "Konsumtif" },
      { code: "1110.3", name: "Bantuan Alat Kesehatan Kaki Palsu", tipe: "Konsumtif" },
      { code: "1110.4", name: "Bantuan Alat Kesehatan Tangan Palsu", tipe: "Konsumtif" },
      { code: "1110.5", name: "Bantuan Alat Kesehatan Walker", tipe: "Konsumtif" },
      { code: "1110.6", name: "Bantuan Alat Kesehatan Alat Bantu Dengar", tipe: "Konsumtif" },
      { code: "1110.7", name: "Bantuan Alat Kesehatan Tongkat", tipe: "Konsumtif" },
      { code: "1110.8", name: "Bantuan Alat Kesehatan Sepatu Afo", tipe: "Konsumtif" },
      { code: "1111", name: "Bantuan Biaya Hidup hak 30% UPZ", tipe: "Konsumtif" },
      { code: "1112", name: "Bantuan Biaya Hidup hak 70% UPZ Kemenag", tipe: "Konsumtif" },
    ]
  },
  {
    code: "1200",
    name: "Semarang Sehat",
    category: "Kesehatan & Lingkungan",
    status: "Aktif",
    programs: [
      { code: "1201", name: "Bantuan Pengobatan", tipe: "Konsumtif" },
      { code: "1202", name: "Bantuan Transportasi dan/Atau Akomodasi Pasien", tipe: "Konsumtif" },
      { code: "1203", name: "Bantuan Asuransi Kesehatan", tipe: "Konsumtif" },
      { code: "2201", name: "Bantuan Sanitasi", tipe: "Produktif" },
      { code: "2202", name: "Bantuan Sumur Air", tipe: "Produktif" },
      { code: "2203", name: "Bantuan Edukasi/Promosi Kesehatan", tipe: "Produktif" },
      { code: "2204", name: "Bantuan Penyediaan Air Bersih", tipe: "Produktif" },
      { code: "2205", name: "Pencegahan dan Penanggulangan Stunting", tipe: "Produktif" },
    ]
  },
  {
    code: "1300",
    name: "Semarang Cerdas",
    category: "Pendidikan & Pengembangan Karakter",
    status: "Aktif",
    programs: [
      { code: "1301", name: "Bantuan Pendidikan Dasar dan Menengah", tipe: "Konsumtif" },
      { code: "1302", name: "Bantuan Pendidikan Dasar dan Menengah | Melalui UPZ Dinas Pendidikan", tipe: "Konsumtif" },
      { code: "1303", name: "Bantuan Pendidikan Dasar dan Menengah Hak 30% UPZ", tipe: "Konsumtif" },
      { code: "2301", name: "Bantuan Pendidikan Tinggi Dalam Negeri", tipe: "Produktif" },
      { code: "2302", name: "Bantuan Infrastruktur Pendidikan", tipe: "Produktif" },
      { code: "2303", name: "Program Pembinaan dan Pengembangan Karakter dan Kompetensi", tipe: "Produktif" },
    ]
  },
  {
    code: "1400",
    name: "Semarang Taqwa",
    category: "Keagamaan & Dakwah",
    status: "Aktif",
    programs: [
      { code: "1401", name: "Bantuan Kafalah/ Mukafaah Dai", tipe: "Konsumtif" },
      { code: "1402", name: "Bantuan Perlengkapan Ibadah", tipe: "Konsumtif" },
      { code: "1403", name: "Bantuan Syiar Dakwah", tipe: "Konsumtif" },
      { code: "1404", name: "Bantuan Sarana Dakwah", tipe: "Konsumtif" },
      { code: "1405", name: "Program Pembinaan, Pendampingan, dan Advokasi Mualaf", tipe: "Konsumtif" },
      { code: "1406", name: "Program Advokasi/Bantuan Hukum", tipe: "Konsumtif" },
      { code: "1407", name: "Bantuan Renovasi/Operasional pada Masjid/Mushola/Yayasan/Lembaga", tipe: "Konsumtif" },
      { code: "1408", name: "Pengembangan Kebijakan Publik dan Kajian Strategis", tipe: "Konsumtif" },
      { code: "1409", name: "Bantuan Kafalah/Mukafaah Dai Hak 30% UPZ", tipe: "Konsumtif" },
    ]
  },
  {
    code: "2100",
    name: "Semarang Makmur",
    category: "Ekonomi & Pemberdayaan UMKM",
    status: "Aktif",
    programs: [
      { code: "2101", name: "Bantuan Modal Usaha", tipe: "Produktif" },
      { code: "2102", name: "Bantuan Ketrampilan Kerja", tipe: "Produktif" },
      { code: "2103", name: "Bantuan Pengembangan Usaha", tipe: "Produktif" },
      { code: "2103.1", name: "Bantuan Pengembangan Usaha Pemasaran Usaha", tipe: "Produktif" },
      { code: "2104", name: "Bantuan Infrastruktur Pelatihan Ketrampilan Kerja", tipe: "Produktif" },
      { code: "2105", name: "Program Pemberdayaan Petani (Lumbung Pangan)", tipe: "Produktif" },
      { code: "2106", name: "Program ZCD untuk Kampung Zakat", tipe: "Produktif" },
      { code: "2107", name: "Program Balai Ternak", tipe: "Produktif" },
      { code: "2108.1", name: "Program Z-Mart", tipe: "Produktif" },
      { code: "2108.2", name: "Program Z-Chicken", tipe: "Produktif" },
      { code: "2108.3", name: "Program Z-Auto", tipe: "Produktif" },
      { code: "2109", name: "Pembiayaan Zakat Mikro", tipe: "Produktif" },
      { code: "2110", name: "Optimasi dan Pemasaran Produk Usaha", tipe: "Produktif" },
      { code: "2111", name: "Program Santripreneur", tipe: "Produktif" },
      { code: "2112", name: "Bantuan Modal Usaha UPZ BADKO LPQ (hak 70% UPZ)", tipe: "Produktif" },
      { code: "2113", name: "ZCD via CSR", tipe: "Produktif" },
    ]
  }
];
