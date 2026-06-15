export interface SKHistory {
  id: string;
  upzId: string;
  skNumber: string;
  startDate: string;
  endDate: string;
  pimpinanName: string;
  status: 'Aktif' | 'Tidak Aktif';
  skType?: 'Baru' | 'Pembaruan' | 'Perubahan';
}

// Struktur pengurus per jabatan (nama + alamat, tanpa input jabatan manual)
export interface PengurusEntry {
  nama: string;
  alamat?: string;
}

// Anggota tambahan untuk OPD & Kecamatan (fleksibel, disimpan sebagai JSON array)
export interface AnggotaTambahan {
  nama: string;
  alamat?: string;
}

export interface UPZPengurus {
  penasehat: PengurusEntry;
  ketua: PengurusEntry;
  sekretaris: PengurusEntry;
  bendahara: PengurusEntry;
  anggota1: PengurusEntry;
  anggota2: PengurusEntry;
  // Hanya untuk OPD & Kecamatan - bisa kosong untuk kategori lainnya
  anggotaTambahan?: AnggotaTambahan[];
}

export interface UPZMetadata {
  address: string;
  upzPhone?: string;
  pengurus: UPZPengurus;
  // Legacy fields - kept for backward compat
  pimpinanTitle?: string;
  pimpinanName?: string;
  pimpinanAddress?: string;
  phone?: string;
  onBalanceType?: 'Pengumpulan' | 'Pembantuan Pendistribusian dan Pendayagunaan';
}

export interface UPZ {
  id: string;
  code: string;
  name: string;
  category: string;
  type: 'On-Balance' | 'Off-Balance';
  kecamatan: string;
  kelurahan: string;
  activeSKNumber: string;
  skStartYear: string;
  skExpiryDate: string;
  metadata: UPZMetadata;
  totalSetoran?: number;
  hakSalur?: number;
  status?: 'Aktif' | 'Tidak Aktif' | 'Mengundurkan Diri';
  resignationDate?: string;
  resignationReason?: string;
}
