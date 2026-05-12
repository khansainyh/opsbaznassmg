import { UPZ, SKHistory } from '../types/upz';

export const upzData: UPZ[] = [
  {
    id: 'upz-1',
    code: 'UPZ-OPD-001',
    name: 'Dinas Pendidikan Kota Semarang',
    category: 'OPD',
    type: 'On-Balance',
    kecamatan: 'Semarang Tengah',
    kelurahan: 'Pekunden',
    activeSKNumber: '12.1',
    skExpiryDate: '2028-12-31',
    metadata: {
      address: 'Jl. Pemuda No. 148',
      upzPhone: '024-1234567',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'Dr. Budi Santoso',
      pimpinanAddress: 'Jl. Ahmad Yani No. 10',
      phone: '081234567890'
    },
    totalSetoran: 50000000,
    hakSalur: 15000000
  },
  {
    id: 'upz-2',
    code: 'UPZ-MAS-001',
    name: 'Masjid Agung Jawa Tengah',
    category: 'Masjid',
    type: 'Off-Balance',
    kecamatan: 'Pedurungan',
    kelurahan: 'Tlogosari Kulon',
    activeSKNumber: '15.3',
    skExpiryDate: '2027-10-15',
    metadata: {
      address: 'Jl. Gajah Raya',
      upzPhone: '024-7654321',
      pimpinanTitle: 'Penasehat',
      pimpinanName: 'KH. Ali Mustofa',
      pimpinanAddress: 'Jl. Majapahit No. 5',
      phone: '089876543210'
    }
  }
];

export const skHistoryData: SKHistory[] = [
  {
    id: 'sk-1',
    upzId: 'upz-1',
    skNumber: '12.1',
    startDate: '2023-01-01',
    endDate: '2028-12-31',
    pimpinanName: 'Dr. Budi Santoso',
    status: 'Aktif'
  },
  {
    id: 'sk-2',
    upzId: 'upz-2',
    skNumber: '15.3',
    startDate: '2022-10-15',
    endDate: '2027-10-15',
    pimpinanName: 'KH. Ali Mustofa',
    status: 'Aktif'
  }
];
