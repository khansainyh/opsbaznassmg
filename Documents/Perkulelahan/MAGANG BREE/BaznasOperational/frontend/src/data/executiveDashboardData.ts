// Data dummy untuk Executive Dashboard
// Nanti bisa diganti dengan data real dari API

export const tahunAnggaran = 2026;

// ============================================================
// THE BIG 3
// ============================================================
export const bigThreeData = {
  pengumpulan: {
    realisasi: 3_847_250_000,
    target: 8_500_000_000,
    bulan: 'Mei 2026',
  },
  pendistribusian: {
    realisasi: 2_193_500_000,
    target: 7_650_000_000,
    bulan: 'Mei 2026',
  },
  sisaAnggaran: {
    nilai: 1_653_750_000,
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
