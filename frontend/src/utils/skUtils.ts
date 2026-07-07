import { SKHistory, UPZ } from '../types/upz';

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
  if (['Masjid & Mushola'].includes(category)) {
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
 * "1574" → { base: 1574, version: 0 }
 * "1574.3" → { base: 1574, version: 3 }
 */
export function parseSKNumber(skNumber: any): { base: number; version: number } {
  const skStr = skNumber !== null && skNumber !== undefined ? String(skNumber).trim() : '';
  if (!skStr) {
    return { base: 0, version: 0 };
  }
  const parts = skStr.split('.');
  const baseVal = parseInt(parts[0], 10);
  const versionVal = parts.length > 1 ? parseInt(parts[1], 10) : 0;
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
 * Hitung nomor SK berikutnya untuk PEMBARUAN / PERUBAHAN SK
 * Increment hanya bagian version; base tetap sama
 * "36"   → "36.1"
 * "36.1" → "36.2"
 * "1574" → "1574.1"
 * "1574.3" → "1574.4"
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
 * "36"   → "SK Pembentukan (No. 36)"
 * "36.1" → "SK Pembaruan ke-1 (No. 36.1)"
 * "36.2" → "SK Pembaruan ke-2 (No. 36.2)"
 */
export function getSKLabel(skNumber: string): string {
  const { version } = parseSKNumber(skNumber);
  if (version === 0) return `SK Pembentukan (No. ${skNumber})`;
  return `SK Pembaruan ke-${version} (No. ${skNumber})`;
}

/**
 * Cek apakah sebuah nomor SK merupakan SK pembentukan (bukan pembaruan)
 */
export function isSKPembentukan(skNumber: string): boolean {
  return parseSKNumber(skNumber).version === 0;
}
