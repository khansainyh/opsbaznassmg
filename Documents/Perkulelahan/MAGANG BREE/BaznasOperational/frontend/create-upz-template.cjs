const XLSX = require('xlsx');

const headers = [
  "Nama Instansi/Masjid/UPZ", 
  "Kategori (OPD / Kecamatan / Sekolah / Masjid\/Musholla / Yayasan\/Lembaga)", 
  "Jenis Pengelolaan (On-Balance / Off-Balance)", 
  "Kecamatan", 
  "Kelurahan", 
  "Alamat Lengkap UPZ", 
  "No. Telepon UPZ", 
  "Nomor SK Aktif", 
  "Tahun Mulai SK (YYYY)", 
  "Tahun Berakhir SK (YYYY)",
  "Nama Penasehat", 
  "Alamat Penasehat",
  "Nama Ketua",
  "Alamat Ketua",
  "Nama Sekretaris",
  "Alamat Sekretaris",
  "Nama Bendahara",
  "Alamat Bendahara",
  "Nama Anggota 1",
  "Alamat Anggota 1",
  "Nama Anggota 2",
  "Alamat Anggota 2",
  "Nama Anggota 3 (Khusus OPD/Kecamatan - kosongkan jika tidak ada)",
  "Alamat Anggota 3 (Khusus OPD/Kecamatan)",
  "Nama Anggota 4 (Khusus OPD/Kecamatan - kosongkan jika tidak ada)",
  "Alamat Anggota 4 (Khusus OPD/Kecamatan)",
];

const sampleData = [
  [
    "UPZ Masjid Raya Baiturrahman",
    "Masjid/Musholla",
    "On-Balance",
    "Semarang Tengah",
    "Pekunden",
    "Jl. Pandanaran No. 126",
    "024-12345678",
    "SK/BAZNAS/2023/001",
    "2023",
    "2026",
    "Dr. H. Ahmad Daroji",
    "Jl. Mawar No 10, Semarang",
    "Budi Santoso",
    "Jl. Pandanaran Gang 1",
    "Siti Aminah",
    "Jl. Pandanaran Gang 2",
    "Agus Riyadi",
    "Jl. Pandanaran Gang 3",
    "Hendra Wijaya",
    "Jl. Pandanaran Gang 4",
    "Rina Kusuma",
    "Jl. Pandanaran Gang 5",
    "",
    "",
    "",
    ""
  ],
  [
    "UPZ Kecamatan Banyumanik",
    "Kecamatan",
    "Off-Balance",
    "Banyumanik",
    "Banyumanik",
    "Jl. Setiabudi No. 200",
    "024-98765432",
    "SK/BAZNAS/2024/012",
    "2024",
    "2027",
    "Drs. H. Surya Atmaja",
    "Jl. Setiabudi Barat 1",
    "Ir. Bambang Prasetyo",
    "Jl. Setiabudi Barat 2",
    "Dewi Lestari",
    "Jl. Srondol Kulon 5",
    "Fauzi Rahman",
    "Jl. Srondol Wetan 3",
    "Ahmad Fauzan",
    "Jl. Padangsari 10",
    "Yulia Wati",
    "Jl. Banyumanik Raya 7",
    "Ridwan Hakim",
    "Jl. Banyumanik Raya 8",
    "Nisa Aulia",
    "Jl. Banyumanik Raya 9"
  ]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

const colWidths = headers.map(h => ({ wch: Math.max(h.length + 3, 20) }));
ws['!cols'] = colWidths;

XLSX.utils.book_append_sheet(wb, ws, "Format_Migrasi_UPZ");

XLSX.writeFile(wb, "Template_Migrasi_Database_UPZ.xlsx");
console.log("Template created at Template_Migrasi_Database_UPZ.xlsx!");
