import { UPZ, SKHistory } from '../types/upz';

// ─── DATA UPZ ────────────────────────────────────────────────────────────────
// activeSKNumber = nomor SK yang sedang aktif
// Format: "36"   = SK Pembentukan pertama, belum pernah diperbarui
//         "36.1" = sudah pernah diperbarui 1x
//         "36.2" = sudah diperbarui 2x, dst.
//
// Nomor dasar (integer) unik secara global lintas semua kategori.
// Pembaruan hanya increment versi (.x), base tidak berubah.
// ─────────────────────────────────────────────────────────────────────────────

export const upzData: UPZ[] = [
  // ── OPD ──────────────────────────────────────────────────────────────────
  {
    id: 'upz-opd-001',
    code: 'UPZ-OPD-001',
    name: 'Dinas Pendidikan Kota Semarang',
    category: 'OPD',
    type: 'On-Balance',
    kecamatan: 'Semarang Tengah',
    kelurahan: 'Pekunden',
    activeSKNumber: '12.2',   // Pembentukan: 12 → Pembaruan 1: 12.1 → Pembaruan 2: 12.2
    skStartYear: '2023',
    skExpiryDate: '2028-06-30',
    metadata: {
      address: 'Jl. Pemuda No. 148, Semarang',
      upzPhone: '024-3511836',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'Dr. H. Bunyamin, M.Pd',
      pimpinanAddress: 'Jl. Gajah Mada No. 10, Semarang',
      phone: '081234560001',
      pengurus: {
        penasehat: { nama: 'Dr. H. Bunyamin, M.Pd', alamat: 'Jl. Gajah Mada No. 10, Semarang' },
        ketua: { nama: 'Drs. Wahyu Hendarwanto', alamat: 'Jl. Siliwangi No. 45, Semarang' },
        sekretaris: { nama: 'Hj. Rina Kusumawati, S.E', alamat: 'Jl. Pemuda No. 30, Semarang' },
        bendahara: { nama: 'Agus Triyono, S.Kom', alamat: 'Jl. MT. Haryono No. 12, Semarang' },
        anggota1: { nama: 'Siti Mulyani', alamat: 'Jl. Kartini No. 5, Semarang' },
        anggota2: { nama: 'Bambang Irawan', alamat: 'Jl. Panjaitan No. 8, Semarang' },
        anggotaTambahan: [
          { nama: 'Drs. Soegiyono', alamat: 'Jl. Hasanuddin No. 3, Semarang' },
          { nama: 'Sri Handayani, S.Pd', alamat: 'Jl. Pattimura No. 2, Semarang' },
        ]
      }
    },
    totalSetoran: 85_000_000,
    hakSalur: 25_500_000,
  },

  // ── Kecamatan ─────────────────────────────────────────────────────────────
  {
    id: 'upz-kec-001',
    code: 'UPZ-KEC-001',
    name: 'UPZ Kecamatan Tembalang',
    category: 'Kecamatan',
    type: 'On-Balance',
    kecamatan: 'Tembalang',
    kelurahan: 'Tembalang',
    activeSKNumber: '47.1',   // Pembentukan: 47 → Pembaruan 1: 47.1
    skStartYear: '2022',
    skExpiryDate: '2027-09-30',
    metadata: {
      address: 'Jl. Semarang Indah No. 1, Tembalang',
      upzPhone: '024-7471234',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'Drs. H. Slamet Riyadi',
      pimpinanAddress: 'Jl. Mulawarman No. 5, Tembalang',
      phone: '081234560002',
      pengurus: {
        penasehat: { nama: 'Drs. H. Slamet Riyadi', alamat: 'Jl. Mulawarman No. 5, Tembalang' },
        ketua: { nama: 'H. Ahmad Fauzi, S.IP', alamat: 'Jl. Ngesrep No. 10, Tembalang' },
        sekretaris: { nama: 'Endang Suryani', alamat: 'Jl. Kedungmundu No. 7, Tembalang' },
        bendahara: { nama: 'Drs. Susanto', alamat: 'Jl. Banjarsari No. 3, Tembalang' },
        anggota1: { nama: 'Farida Yuliani', alamat: 'Jl. Jangli No. 2, Tembalang' },
        anggota2: { nama: 'Heru Santoso', alamat: 'Jl. Gondang No. 6, Tembalang' },
      }
    },
    totalSetoran: 42_500_000,
    hakSalur: 12_750_000,
  },

  // ── Masjid ────────────────────────────────────────────────────────────────
  {
    id: 'upz-mas-001',
    code: 'UPZ-MAS-001',
    name: 'Masjid Agung Jawa Tengah',
    category: 'Masjid',
    type: 'Off-Balance',
    kecamatan: 'Pedurungan',
    kelurahan: 'Tlogosari Kulon',
    activeSKNumber: '15.3',   // Pembentukan: 15 → P1: 15.1 → P2: 15.2 → P3: 15.3
    skStartYear: '2021',
    skExpiryDate: '2026-07-15',
    metadata: {
      address: 'Jl. Gajah Raya, Tlogosari Kulon',
      upzPhone: '024-6723456',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'KH. Drs. Ali Mustofa, M.Ag',
      pimpinanAddress: 'Jl. Majapahit No. 5, Semarang Timur',
      phone: '089876543210',
      pengurus: {
        penasehat: { nama: 'KH. Drs. Ali Mustofa, M.Ag', alamat: 'Jl. Majapahit No. 5, Semarang' },
        ketua: { nama: 'Ustadz H. Syaifudin Zuhri', alamat: 'Jl. Tlogomulyo No. 3, Pedurungan' },
        sekretaris: { nama: 'Ahmad Kholil, S.Ag', alamat: 'Jl. Pedurungan Kidul No. 8' },
        bendahara: { nama: 'H. Moch. Zamroni', alamat: 'Jl. Pedurungan Lor No. 12' },
        anggota1: { nama: 'Sholeh Muhbib', alamat: 'Jl. Tlogosari Kulon No. 4' },
        anggota2: { nama: 'Hj. Nur Hayati', alamat: 'Jl. Tlogosari Wetan No. 6' },
      }
    },
    totalSetoran: 120_000_000,
    hakSalur: 36_000_000,
  },
  {
    id: 'upz-mas-002',
    code: 'UPZ-MAS-002',
    name: 'Masjid Annur Kel. Sekaran',
    category: 'Masjid',
    type: 'Off-Balance',
    kecamatan: 'Gunungpati',
    kelurahan: 'Sekaran',
    activeSKNumber: '1424',   // SK Pembentukan, belum pernah diperbarui
    skStartYear: '2024',
    skExpiryDate: '2029-03-10',
    metadata: {
      address: 'Jl. Raya Sekaran No. 5, Gunungpati',
      upzPhone: '024-8508765',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'H. Miftahul Huda',
      pimpinanAddress: 'Jl. Sekaran Indah No. 2, Gunungpati',
      phone: '081234560004',
      pengurus: {
        penasehat: { nama: 'H. Miftahul Huda', alamat: 'Jl. Sekaran Indah No. 2, Gunungpati' },
        ketua: { nama: 'Ustadz Ridwan Fauzi', alamat: 'Jl. Sekaran Baru No. 7, Gunungpati' },
        sekretaris: { nama: 'Arifin Hidayat', alamat: 'Jl. Sekaran Timur No. 1, Gunungpati' },
        bendahara: { nama: 'Kholid Mawardi', alamat: 'Jl. Sekaran Barat No. 4, Gunungpati' },
        anggota1: { nama: 'Slamet Widodo', alamat: 'Jl. Kandri No. 3, Gunungpati' },
        anggota2: { nama: 'Nur Aziz', alamat: 'Jl. Sadeng No. 5, Gunungpati' },
      }
    },
    totalSetoran: 18_500_000,
    hakSalur: 5_550_000,
  },

  // ── Sekolah ───────────────────────────────────────────────────────────────
  {
    id: 'upz-skl-001',
    code: 'UPZ-SKL-001',
    name: 'SDN Karangayu 01',
    category: 'Sekolah',
    type: 'On-Balance',
    kecamatan: 'Semarang Barat',
    kelurahan: 'Karangayu',
    activeSKNumber: '36.2',   // Pembentukan: 36 → P1: 36.1 → P2: 36.2
    skStartYear: '2023',
    skExpiryDate: '2028-01-01',
    metadata: {
      address: 'Jl. Karangayu Raya No. 1, Semarang Barat',
      upzPhone: '024-7600001',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'Dra. Hj. Sri Wahyuni',
      pimpinanAddress: 'Jl. Srondol No. 5, Banyumanik',
      phone: '081234560005',
      pengurus: {
        penasehat: { nama: 'Dra. Hj. Sri Wahyuni', alamat: 'Jl. Srondol No. 5, Banyumanik' },
        ketua: { nama: 'Umi Kulsum, S.Pd', alamat: 'Jl. Karangayu No. 3, Semarang Barat' },
        sekretaris: { nama: 'Tuti Rahayu, S.Pd', alamat: 'Jl. Krapyak No. 2, Semarang Barat' },
        bendahara: { nama: 'Suprihatin', alamat: 'Jl. Manyaran No. 7, Semarang Barat' },
        anggota1: { nama: 'Rini Setiawati', alamat: 'Jl. Kalibanteng No. 4, Semarang Barat' },
        anggota2: { nama: 'Yulianto, S.Pd', alamat: 'Jl. Jrakah No. 1, Tugu' },
      }
    },
    totalSetoran: 12_000_000,
    hakSalur: 3_600_000,
  },

  // ── Yayasan ───────────────────────────────────────────────────────────────
  {
    id: 'upz-yay-001',
    code: 'UPZ-YAY-001',
    name: 'Yayasan Al-Hikmah Ngaliyan',
    category: 'Yayasan/Lembaga',
    type: 'Off-Balance',
    kecamatan: 'Ngaliyan',
    kelurahan: 'Ngaliyan',
    activeSKNumber: '88.1',   // Pembentukan: 88 → Pembaruan 1: 88.1
    skStartYear: '2022',
    skExpiryDate: '2027-12-31',
    metadata: {
      address: 'Jl. Prof. Dr. Hamka No. 12, Ngaliyan',
      upzPhone: '024-7618800',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'KH. Moch. Nasiruddin, M.Ag',
      pimpinanAddress: 'Jl. Gondoriyo No. 5, Ngaliyan',
      phone: '081234560006',
      pengurus: {
        penasehat: { nama: 'KH. Moch. Nasiruddin, M.Ag', alamat: 'Jl. Gondoriyo No. 5, Ngaliyan' },
        ketua: { nama: 'Drs. H. Syukri Fathoni', alamat: 'Jl. Ngaliyan Raya No. 8' },
        sekretaris: { nama: 'Imron Rosyadi, Lc', alamat: 'Jl. Beringin No. 3, Ngaliyan' },
        bendahara: { nama: 'Hj. Badriyah', alamat: 'Jl. Bringin Indah No. 7, Ngaliyan' },
        anggota1: { nama: 'Abdul Hamid', alamat: 'Jl. Tambakaji No. 2, Ngaliyan' },
        anggota2: { nama: 'Fatimah Zahra', alamat: 'Jl. Walisongo No. 10, Ngaliyan' },
      }
    },
    totalSetoran: 35_000_000,
    hakSalur: 10_500_000,
  },
];

// ─── RIWAYAT SK ───────────────────────────────────────────────────────────────
// Berisi semua SK: pembentukan + semua pembaruan per UPZ
// Urutan: SK terlama di atas, SK terbaru di bawah
// ─────────────────────────────────────────────────────────────────────────────
export const skHistoryData: SKHistory[] = [
  // ── OPD-001: 12 → 12.1 → 12.2 ──────────────────────────────────────────
  { id: 'sk-opd001-v0', upzId: 'upz-opd-001', skNumber: '12',   startDate: '2013-07-01', endDate: '2018-06-30', pimpinanName: 'Drs. H. Gatot Triyono',     status: 'Tidak Aktif' },
  { id: 'sk-opd001-v1', upzId: 'upz-opd-001', skNumber: '12.1', startDate: '2018-07-01', endDate: '2023-06-30', pimpinanName: 'Dr. Agus Purwanto, M.Pd',   status: 'Tidak Aktif' },
  { id: 'sk-opd001-v2', upzId: 'upz-opd-001', skNumber: '12.2', startDate: '2023-07-01', endDate: '2028-06-30', pimpinanName: 'Dr. H. Bunyamin, M.Pd',     status: 'Aktif' },

  // ── Kec-001: 47 → 47.1 ─────────────────────────────────────────────────
  { id: 'sk-kec001-v0', upzId: 'upz-kec-001', skNumber: '47',   startDate: '2017-10-01', endDate: '2022-09-30', pimpinanName: 'Drs. Sujarwo',              status: 'Tidak Aktif' },
  { id: 'sk-kec001-v1', upzId: 'upz-kec-001', skNumber: '47.1', startDate: '2022-10-01', endDate: '2027-09-30', pimpinanName: 'Drs. H. Slamet Riyadi',    status: 'Aktif' },

  // ── Masjid-001: 15 → 15.1 → 15.2 → 15.3 ────────────────────────────────
  { id: 'sk-mas001-v0', upzId: 'upz-mas-001', skNumber: '15',   startDate: '2006-08-01', endDate: '2011-07-31', pimpinanName: 'Prof. KH. Ahmad Mardliyah', status: 'Tidak Aktif' },
  { id: 'sk-mas001-v1', upzId: 'upz-mas-001', skNumber: '15.1', startDate: '2011-08-01', endDate: '2016-07-31', pimpinanName: 'KH. Fadlolan Musyaffa',     status: 'Tidak Aktif' },
  { id: 'sk-mas001-v2', upzId: 'upz-mas-001', skNumber: '15.2', startDate: '2016-08-01', endDate: '2021-07-31', pimpinanName: 'Drs. H. Noor Ahmad, M.Ag',  status: 'Tidak Aktif' },
  { id: 'sk-mas001-v3', upzId: 'upz-mas-001', skNumber: '15.3', startDate: '2021-08-01', endDate: '2026-07-31', pimpinanName: 'KH. Drs. Ali Mustofa, M.Ag',status: 'Aktif' },

  // ── Masjid-002: 1424 (belum pernah diperbarui) ──────────────────────────
  { id: 'sk-mas002-v0', upzId: 'upz-mas-002', skNumber: '1424', startDate: '2024-03-10', endDate: '2029-03-09', pimpinanName: 'H. Miftahul Huda',          status: 'Aktif' },

  // ── Sekolah-001: 36 → 36.1 → 36.2 ──────────────────────────────────────
  { id: 'sk-skl001-v0', upzId: 'upz-skl-001', skNumber: '36',   startDate: '2013-01-01', endDate: '2018-12-31', pimpinanName: 'Sumiyati, S.Pd',            status: 'Tidak Aktif' },
  { id: 'sk-skl001-v1', upzId: 'upz-skl-001', skNumber: '36.1', startDate: '2019-01-01', endDate: '2022-12-31', pimpinanName: 'Sri Lestari, M.Pd',         status: 'Tidak Aktif' },
  { id: 'sk-skl001-v2', upzId: 'upz-skl-001', skNumber: '36.2', startDate: '2023-01-01', endDate: '2028-01-01', pimpinanName: 'Dra. Hj. Sri Wahyuni',      status: 'Aktif' },

  // ── Yayasan-001: 88 → 88.1 ──────────────────────────────────────────────
  { id: 'sk-yay001-v0', upzId: 'upz-yay-001', skNumber: '88',   startDate: '2017-01-01', endDate: '2022-12-31', pimpinanName: 'KH. Hasyim Asy\'ari, M.Ag', status: 'Tidak Aktif' },
  { id: 'sk-yay001-v1', upzId: 'upz-yay-001', skNumber: '88.1', startDate: '2023-01-01', endDate: '2027-12-31', pimpinanName: 'KH. Moch. Nasiruddin, M.Ag',status: 'Aktif' },
];
