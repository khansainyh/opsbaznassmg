export interface AsnafTarget {
  id: string;
  name?: string;
  asnaf?: 'Fakir' | 'Miskin' | 'Amil' | 'Mualaf' | 'Riqab' | 'Gharim' | 'Fisabilillah' | 'Ibnu Sabil' | '';
  frekuensi: number | string;
  nominal: number;
  mustahik: number;
  keterangan?: string;
}

export interface Program {
  code: string;
  name: string;
  asnafTargets?: AsnafTarget[];
  nominalUmum?: number;
  rkat_details?: AsnafTarget[];
  budget_rkat?: number;
}

export interface Pilar {
  code: string;
  name: string;
  category: string;
  status: 'Aktif' | 'Non-aktif';
  programs: Program[];
}

export const pilarData: Pilar[] = [
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
