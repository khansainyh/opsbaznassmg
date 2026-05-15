// Data dummy untuk Executive Dashboard
// Nanti bisa diganti dengan data real dari API

export const tahunAnggaran = 2026;

// ============================================================
// THE BIG 3
// ============================================================
export const bigThreeData = {
  pengumpulan: {
    realisasi: 7_284_500_000,
    target: 18_000_000_000,
    bulan: 'Mei 2026',
  },
  pendistribusian: {
    realisasi: 4_912_750_000,
    target: 16_200_000_000,
    bulan: 'Mei 2026',
  },
  sisaAnggaran: {
    nilai: 2_371_750_000,
    keterangan: 'Saldo tersedia untuk didistribusikan',
  },
};

// ============================================================
// PROPORSI PER PILAR/PROGRAM
// ============================================================
export const proporsiPilar = [
  {
    kode: '1100',
    nama: 'Semarang Peduli',
    warna: '#f97316',   // orange
    realisasi: 620_000_000,
    target: 1_500_000_000,
    penerima: 148,
  },
  {
    kode: '1200',
    nama: 'Semarang Sehat',
    warna: '#10b981',   // emerald
    realisasi: 430_000_000,
    target: 1_200_000_000,
    penerima: 97,
  },
  {
    kode: '1300',
    nama: 'Semarang Cerdas',
    warna: '#3b82f6',   // blue
    realisasi: 515_000_000,
    target: 1_800_000_000,
    penerima: 212,
  },
  {
    kode: '1400',
    nama: 'Semarang Taqwa',
    warna: '#8b5cf6',   // violet
    realisasi: 218_000_000,
    target: 900_000_000,
    penerima: 54,
  },
  {
    kode: '2100',
    nama: 'Semarang Makmur',
    warna: '#eab308',   // yellow
    realisasi: 410_500_000,
    target: 2_250_000_000,
    penerima: 76,
  },
];

// ============================================================
// TREN BULANAN (Pengumpulan vs Penyaluran)
// ============================================================
export const trenBulanan = [
  { bulan: 'Jan', pengumpulan: 720_000_000, penyaluran: 380_000_000 },
  { bulan: 'Feb', pengumpulan: 685_000_000, penyaluran: 410_000_000 },
  { bulan: 'Mar', pengumpulan: 810_000_000, penyaluran: 495_000_000 },
  { bulan: 'Apr', pengumpulan: 930_000_000, penyaluran: 560_000_000 },
  { bulan: 'Mei', pengumpulan: 702_250_000, penyaluran: 348_500_000 },
];

// ============================================================
// TOP 5 PROGRAM TERSALUR
// ============================================================
export const topProgram = [
  { nama: 'Bantuan Pendidikan Dasar & Menengah', kode: '1301', jumlah: 87, total: 248_500_000 },
  { nama: 'Bantuan Biaya Hidup', kode: '1102', jumlah: 63, total: 189_000_000 },
  { nama: 'Bantuan Modal Usaha', kode: '2101', jumlah: 41, total: 246_000_000 },
  { nama: 'Bantuan Pengobatan', kode: '1201', jumlah: 52, total: 156_000_000 },
  { nama: 'Rumah Tidak Layak Huni', kode: '1105', jumlah: 18, total: 180_000_000 },
];

// ============================================================
// SEBARAN PROPOSAL PER KECAMATAN (Drill-down Pie Chart)
// 16 Kecamatan Kota Semarang
// ============================================================
export const kecamatanList = [
  'Semarang Barat', 'Semarang Tengah', 'Semarang Timur', 'Semarang Selatan',
  'Semarang Utara', 'Pedurungan', 'Tembalang', 'Banyumanik',
  'Gayamsari', 'Genuk', 'Ngaliyan', 'Candisari',
  'Gajahmungkur', 'Gunungpati', 'Mijen', 'Tugu',
];

export const sebaranKecamatan: Record<string, { kecamatan: string; jumlah: number }[]> = {
  '1100': [ // Semarang Peduli
    { kecamatan: 'Semarang Barat',   jumlah: 24 },
    { kecamatan: 'Pedurungan',       jumlah: 19 },
    { kecamatan: 'Tembalang',        jumlah: 17 },
    { kecamatan: 'Ngaliyan',         jumlah: 14 },
    { kecamatan: 'Genuk',            jumlah: 13 },
    { kecamatan: 'Semarang Utara',   jumlah: 11 },
    { kecamatan: 'Banyumanik',       jumlah: 10 },
    { kecamatan: 'Semarang Timur',   jumlah:  9 },
    { kecamatan: 'Gayamsari',        jumlah:  8 },
    { kecamatan: 'Semarang Selatan', jumlah:  7 },
    { kecamatan: 'Candisari',        jumlah:  6 },
    { kecamatan: 'Gajahmungkur',     jumlah:  5 },
    { kecamatan: 'Semarang Tengah',  jumlah:  4 },
    { kecamatan: 'Gunungpati',       jumlah:  3 },
    { kecamatan: 'Mijen',            jumlah:  2 },
    { kecamatan: 'Tugu',             jumlah:  1 },
  ],
  '1200': [ // Semarang Sehat
    { kecamatan: 'Tembalang',        jumlah: 18 },
    { kecamatan: 'Banyumanik',       jumlah: 15 },
    { kecamatan: 'Pedurungan',       jumlah: 12 },
    { kecamatan: 'Semarang Barat',   jumlah: 10 },
    { kecamatan: 'Ngaliyan',         jumlah:  9 },
    { kecamatan: 'Genuk',            jumlah:  8 },
    { kecamatan: 'Semarang Utara',   jumlah:  7 },
    { kecamatan: 'Gayamsari',        jumlah:  6 },
    { kecamatan: 'Semarang Timur',   jumlah:  5 },
    { kecamatan: 'Gunungpati',       jumlah:  4 },
    { kecamatan: 'Candisari',        jumlah:  4 },
    { kecamatan: 'Semarang Selatan', jumlah:  3 },
    { kecamatan: 'Gajahmungkur',     jumlah:  3 },
    { kecamatan: 'Semarang Tengah',  jumlah:  2 },
    { kecamatan: 'Mijen',            jumlah:  2 },
    { kecamatan: 'Tugu',             jumlah:  1 },
  ],
  '1300': [ // Semarang Cerdas
    { kecamatan: 'Tembalang',        jumlah: 42 },
    { kecamatan: 'Pedurungan',       jumlah: 35 },
    { kecamatan: 'Banyumanik',       jumlah: 28 },
    { kecamatan: 'Semarang Barat',   jumlah: 22 },
    { kecamatan: 'Ngaliyan',         jumlah: 18 },
    { kecamatan: 'Genuk',            jumlah: 15 },
    { kecamatan: 'Semarang Utara',   jumlah: 13 },
    { kecamatan: 'Gayamsari',        jumlah: 11 },
    { kecamatan: 'Gunungpati',       jumlah: 10 },
    { kecamatan: 'Semarang Timur',   jumlah:  8 },
    { kecamatan: 'Candisari',        jumlah:  7 },
    { kecamatan: 'Mijen',            jumlah:  6 },
    { kecamatan: 'Semarang Selatan', jumlah:  5 },
    { kecamatan: 'Gajahmungkur',     jumlah:  5 },
    { kecamatan: 'Semarang Tengah',  jumlah:  3 },
    { kecamatan: 'Tugu',             jumlah:  2 },
  ],
  '1400': [ // Semarang Taqwa
    { kecamatan: 'Semarang Tengah',  jumlah: 12 },
    { kecamatan: 'Semarang Utara',   jumlah: 10 },
    { kecamatan: 'Semarang Barat',   jumlah:  8 },
    { kecamatan: 'Ngaliyan',         jumlah:  7 },
    { kecamatan: 'Tembalang',        jumlah:  5 },
    { kecamatan: 'Pedurungan',       jumlah:  4 },
    { kecamatan: 'Gajahmungkur',     jumlah:  4 },
    { kecamatan: 'Gunungpati',       jumlah:  3 },
    { kecamatan: 'Genuk',            jumlah:  3 },
    { kecamatan: 'Candisari',        jumlah:  2 },
    { kecamatan: 'Banyumanik',       jumlah:  2 },
    { kecamatan: 'Gayamsari',        jumlah:  2 },
    { kecamatan: 'Semarang Timur',   jumlah:  2 },
    { kecamatan: 'Semarang Selatan', jumlah:  1 },
    { kecamatan: 'Mijen',            jumlah:  1 },
    { kecamatan: 'Tugu',             jumlah:  1 },
  ],
  '2100': [ // Semarang Makmur
    { kecamatan: 'Ngaliyan',         jumlah: 16 },
    { kecamatan: 'Mijen',            jumlah: 13 },
    { kecamatan: 'Gunungpati',       jumlah: 12 },
    { kecamatan: 'Genuk',            jumlah: 10 },
    { kecamatan: 'Tembalang',        jumlah:  9 },
    { kecamatan: 'Pedurungan',       jumlah:  8 },
    { kecamatan: 'Tugu',             jumlah:  7 },
    { kecamatan: 'Semarang Barat',   jumlah:  6 },
    { kecamatan: 'Banyumanik',       jumlah:  5 },
    { kecamatan: 'Gayamsari',        jumlah:  4 },
    { kecamatan: 'Semarang Utara',   jumlah:  3 },
    { kecamatan: 'Semarang Timur',   jumlah:  3 },
    { kecamatan: 'Semarang Selatan', jumlah:  2 },
    { kecamatan: 'Candisari',        jumlah:  2 },
    { kecamatan: 'Gajahmungkur',     jumlah:  2 },
    { kecamatan: 'Semarang Tengah',  jumlah:  1 },
  ],
};

