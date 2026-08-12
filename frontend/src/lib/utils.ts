import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface MustahikDisplayInfo {
  title: string;
  subtitle: string;
  isLembaga: boolean;
  isPerorangan: boolean;
}

export function getMustahikDisplayName(item: any): MustahikDisplayInfo {
  if (!item) {
    return { title: 'Mustahik', subtitle: '', isLembaga: false, isPerorangan: true };
  }

  const jenisPengajuan = String(
    item.jenis_pengajuan || item.jenisPengajuan || item.jenis_ajuan || ''
  ).toLowerCase().trim();
  const isLembaga = jenisPengajuan.includes('lembaga');

  const namaAnak = String(item.nama_anak || item.namaAnak || '').trim();
  const namaPemohon = String(item.nama_pemohon || item.namaPemohon || '').trim();
  const namaInstansi = String(item.nama_instansi || item.namaInstansi || '').trim();

  const isGarbage = (s: string) => !s || s.toLowerCase().includes('tanpa nama') || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s === '-';

  const cleanInstansi = isGarbage(namaInstansi) ? '' : namaInstansi;
  const cleanPemohon = isGarbage(namaPemohon) ? '' : namaPemohon;
  const cleanAnak = isGarbage(namaAnak) ? '' : namaAnak;

  if (isLembaga) {
    // Pengajuan Lembaga:
    // Judul Utama: Nama Instansi/Lembaga (fallback: Nama Pemohon)
    const title = cleanInstansi || cleanPemohon || 'Lembaga / Instansi';
    const subtitle = cleanPemohon && cleanPemohon !== title ? `Pimpinan/PJ: ${cleanPemohon}` : '';
    return { title, subtitle, isLembaga: true, isPerorangan: false };
  } else {
    // Pengajuan Perorangan:
    // 1. Jika ada Nama Anak: Judul = Nama Anak, Subtitle = Orang Tua / Sekolah
    // 2. Jika tidak ada Nama Anak: Judul = Nama Pemohon, Subtitle = Instansi/Sekolah jika ada
    // 3. Fallback: Nama Instansi jika hanya ada instansi
    let title = '';
    let subtitle = '';

    if (cleanAnak) {
      title = cleanAnak;
      if (cleanPemohon && cleanInstansi) {
        subtitle = `Orang Tua: ${cleanPemohon} · ${cleanInstansi}`;
      } else if (cleanPemohon) {
        subtitle = `Orang Tua / Wali: ${cleanPemohon}`;
      } else if (cleanInstansi) {
        subtitle = `Sekolah/Instansi: ${cleanInstansi}`;
      }
    } else if (cleanPemohon) {
      title = cleanPemohon;
      if (cleanInstansi) {
        subtitle = `Instansi/Sekolah: ${cleanInstansi}`;
      }
    } else if (cleanInstansi) {
      title = cleanInstansi;
    } else {
      title = 'Mustahik';
    }

    return { title, subtitle, isLembaga: false, isPerorangan: true };
  }
}

