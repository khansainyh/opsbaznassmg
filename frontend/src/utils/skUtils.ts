import { SKHistory, UPZ } from '../types/upz';

/**
 * Daftar Kode Nomor Kecamatan (Abjad A–Z) Kota Semarang
 * 16 Kecamatan di Kota Semarang
 */
export const KECAMATAN_KODE_MAP: Record<string, string> = {
  'Banyumanik': '01',
  'Candisari': '02',
  'Gajahmungkur': '03',
  'Gayamsari': '04',
  'Genuk': '05',
  'Gunungpati': '06',
  'Mijen': '07',
  'Ngaliyan': '08',
  'Pedurungan': '09',
  'Semarang Barat': '10',
  'Semarang Selatan': '11',
  'Semarang Tengah': '12',
  'Semarang Timur': '13',
  'Semarang Utara': '14',
  'Tembalang': '15',
  'Tugu': '16'
};

/**
 * Mengambil kode 2 digit kecamatan berdasarkan nama kecamatan
 */
export function getKecamatanCode(kecamatan?: string): string {
  if (!kecamatan) return '01';
  const clean = kecamatan.replace(/^kec(amatan)?\.?\s*/i, '').trim().toLowerCase();
  
  if (/^\d{2}$/.test(clean)) return clean;
  if (/^\d+$/.test(clean)) return clean.padStart(2, '0');

  for (const [name, code] of Object.entries(KECAMATAN_KODE_MAP)) {
    if (name.toLowerCase() === clean) return code;
  }
  for (const [name, code] of Object.entries(KECAMATAN_KODE_MAP)) {
    if (clean.includes(name.toLowerCase()) || name.toLowerCase().includes(clean)) return code;
  }
  return '01';
}

/**
 * Konversi angka bulan ke format Romawi
 */
export function getRomanMonth(monthNum: number): string {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return roman[monthNum - 1] || "I";
}

/**
 * Map UPZ category to its respective numbering group
 */
export function getSKGroupForCategory(category: string): string {
  if (['Instansi Vertikal', 'OPD', 'BUMD'].includes(category)) {
    return 'institutional';
  }
  if (['Pemerintah Kecamatan', 'Kecamatan'].includes(category)) {
    return 'kecamatan';
  }
  if (['Perusahaan Swasta', 'Organisasi Profesi', 'Yayasan'].includes(category)) {
    return 'private_org';
  }
  if (['Masjid & Mushola', 'Masjid/Musholla', 'Masjid', 'Musholla'].includes(category)) {
    return 'mosque';
  }
  if (['Univ/PT/Pendidikan Menengah', 'Pendidikan Dasar'].includes(category)) {
    return 'education';
  }
  return category;
}

/**
 * Parse SK number string ke object { base, version }
 * "36"   → { base: 36, version: 0 }
 * "36.1" → { base: 36, version: 1 }
 * "089/SK-MM-01.P0/BAZNAS-SMG/VIII/2026" → { base: 89, version: 0 }
 * "089/SK-MM-01.P1/BAZNAS-SMG/VIII/2026" → { base: 89, version: 1 }
 */
export function parseSKNumber(skNumber: any): { base: number; version: number } {
  const skStr = skNumber !== null && skNumber !== undefined ? String(skNumber).trim() : '';
  if (!skStr) {
    return { base: 0, version: 0 };
  }

  // 1. Format lengkap SK Masjid/Musholla: e.g. "089/SK-MM-01.P0/BAZNAS-SMG/VIII/2026"
  const masjidMatch = skStr.match(/^(\d+)\/SK-MM-\d+\.P(\d+)/i);
  if (masjidMatch) {
    return {
      base: parseInt(masjidMatch[1], 10) || 0,
      version: parseInt(masjidMatch[2], 10) || 0
    };
  }

  // 2. Format P: e.g. "89.P1" atau "089.P0"
  const dotPMatch = skStr.match(/^(\d+)\.P(\d+)/i);
  if (dotPMatch) {
    return {
      base: parseInt(dotPMatch[1], 10) || 0,
      version: parseInt(dotPMatch[2], 10) || 0
    };
  }

  // 3. Format default titik: e.g. "89" atau "89.1" atau "089.2"
  const parts = skStr.split('.');
  const baseMatch = parts[0].match(/\d+/);
  const baseVal = baseMatch ? parseInt(baseMatch[0], 10) : parseInt(parts[0], 10);
  const versionVal = parts.length > 1 ? parseInt(parts[1].replace(/\D/g, ''), 10) : 0;

  return {
    base: isNaN(baseVal) ? 0 : baseVal,
    version: isNaN(versionVal) ? 0 : versionVal,
  };
}

/**
 * Format base + version ke string SK
 * (36, 0) → "36"
 * (36, 1) → "36.1"
 * (1574, 2) → "1574.2"
 */
export function formatSKNumber(base: number, version: number): string {
  return version === 0 ? `${base}` : `${base}.${version}`;
}

/**
 * Menghitung versi / frekuensi perubahan riwayat SK secara akurat:
 * - Pembentukan (entry ke-0) -> P0
 * - Pembaruan atau Perubahan ke-1 (entry ke-1) -> P1
 * - Pembaruan atau Perubahan ke-2 (entry ke-2) -> P2
 * - dan seterusnya...
 */
export function getEffectiveSKVersion(history: SKHistory, allHistoriesForUPZ?: SKHistory[]): number {
  if (!history) return 0;

  // 1. Jika ada daftar riwayat SK untuk UPZ tersebut:
  if (allHistoriesForUPZ && Array.isArray(allHistoriesForUPZ) && allHistoriesForUPZ.length > 0) {
    const list = allHistoriesForUPZ;
    const historyIndex = list.findIndex(h => h.id === history.id);
    if (historyIndex >= 0) {
      return historyIndex; // idx 0 -> P0, idx 1 -> P1, idx 2 -> P2, dst.
    }
  }

  // 2. Jika nomor SK secara eksplisit memiliki versi (misal 209.1, 209.P1, atau ...P1/...)
  const parsed = parseSKNumber(history.skNumber);
  if (parsed.version > 0) {
    return parsed.version;
  }

  // 3. Berdasarkan skType jika berdiri sendiri
  if (history.skType === 'Perubahan' || history.skType === 'Pembaruan') {
    return 1;
  }

  return 0;
}

/**
 * Format nomor SK khusus kategori Masjid & Musholla
 * Format: 089/SK-MM-01.P0/BAZNAS-SMG/VIII/2026
 */
export function formatMasjidSKNumber(
  skNumber: string | number,
  kecamatan?: string,
  date?: Date,
  versionOverride?: number
): string {
  const skStr = String(skNumber || '').trim();

  // Jika sudah format lengkap SK Masjid/Musholla
  if (/^\d{3}\/SK-MM-\d{2}\.P\d+\/BAZNAS-SMG\/[IVXLCDM]+\/\d{4}$/i.test(skStr)) {
    if (versionOverride !== undefined) {
      return skStr.replace(/\.P\d+\//i, `.P${versionOverride}/`);
    }
    return skStr;
  }

  const d = date || new Date();
  const romanMonth = getRomanMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const kecCode = getKecamatanCode(kecamatan);
  const { base, version } = parseSKNumber(skNumber);
  const finalVersion = versionOverride !== undefined ? versionOverride : version;
  const nomorUrut = String(base || 1).padStart(3, '0');
  const frekuensi = `P${finalVersion}`;

  return `${nomorUrut}/SK-MM-${kecCode}.${frekuensi}/BAZNAS-SMG/${romanMonth}/${year}`;
}

/**
 * Format nomor SK lengkap sesuai kategori
 */
export function formatFullSKNumber(
  category: string,
  skNumber: string | number,
  kecamatan?: string,
  date?: Date,
  versionOverride?: number
): string {
  const d = date || new Date();
  const romanMonth = getRomanMonth(d.getMonth() + 1);
  const year = d.getFullYear();

  if (category === 'Masjid & Mushola' || category === 'Masjid/Musholla' || category === 'Masjid' || category === 'Musholla') {
    return formatMasjidSKNumber(skNumber, kecamatan, d, versionOverride);
  }

  const { base } = parseSKNumber(skNumber);
  const finalVersion = versionOverride !== undefined ? versionOverride : parseSKNumber(skNumber).version;
  const skFormatted = formatSKNumber(base, finalVersion);

  return `${skFormatted} -SK / A.1 / BAZNAS - SMG / ${romanMonth}/${year}`;
}

/**
 * Hitung nomor SK berikutnya untuk PEMBARUAN / PERUBAHAN SK
 * Increment hanya bagian version; base tetap sama
 */
export function getNextRenewalSKNumber(currentActiveSKNumber: string): string {
  const { base, version } = parseSKNumber(currentActiveSKNumber);
  return formatSKNumber(base, version + 1);
}

/**
 * Hitung nomor SK dasar (base) berikutnya untuk REGISTRASI UPZ BARU
 * Berdasarkan grup kategori UPZ
 */
export function getNextBaseSKNumber(allSKHistories: SKHistory[], allUPZs: UPZ[], targetCategory: string): number {
  if (!allSKHistories || !Array.isArray(allSKHistories) || allSKHistories.length === 0) return 1;
  if (!allUPZs || !Array.isArray(allUPZs) || allUPZs.length === 0) return 1;

  const targetGroup = getSKGroupForCategory(targetCategory || '');

  // Map UPZ ID to Category
  const upzCategoryMap = new Map<string, string>();
  for (const upz of allUPZs) {
    if (upz && upz.id) {
      upzCategoryMap.set(upz.id, upz.category || '');
    }
  }

  // Filter histories matching the target category group
  const groupHistories = allSKHistories.filter((sk) => {
    if (!sk || !sk.upzId) return false;
    const category = upzCategoryMap.get(sk.upzId);
    if (!category) return false;
    return getSKGroupForCategory(category) === targetGroup;
  });

  if (groupHistories.length === 0) return 1;

  const bases = groupHistories
    .map((sk) => sk && sk.skNumber ? parseSKNumber(sk.skNumber).base : 0)
    .filter(base => base > 0);

  if (bases.length === 0) return 1;
  return Math.max(...bases) + 1;
}

/**
 * Ambil label yang human-readable dari nomor SK
 */
export function getSKLabel(skNumber: string, category?: string): string {
  const { version } = parseSKNumber(skNumber);
  const isMasjid = category === 'Masjid & Mushola' || category === 'Masjid/Musholla';
  if (version === 0) {
    return isMasjid ? `SK Pembentukan (P0)` : `SK Pembentukan (No. ${skNumber})`;
  }
  return isMasjid ? `SK Perubahan Ke-${version} (P${version})` : `SK Pembaruan ke-${version} (No. ${skNumber})`;
}

/**
 * Cek apakah sebuah nomor SK merupakan SK pembentukan (bukan pembaruan)
 */
export function isSKPembentukan(skNumber: string): boolean {
  return parseSKNumber(skNumber).version === 0;
}
