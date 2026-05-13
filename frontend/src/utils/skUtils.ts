import { SKHistory } from '../types/upz';

/**
 * Parse SK number string ke object { base, version }
 * "36"   → { base: 36, version: 0 }
 * "36.1" → { base: 36, version: 1 }
 * "1574" → { base: 1574, version: 0 }
 * "1574.3" → { base: 1574, version: 3 }
 */
export function parseSKNumber(skNumber: string): { base: number; version: number } {
  const parts = skNumber.split('.');
  return {
    base: parseInt(parts[0], 10),
    version: parts.length > 1 ? parseInt(parts[1], 10) : 0,
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
 * Mencari max base dari SELURUH riwayat SK, lalu +1
 * Contoh: max existing base = 1573 → returns 1574
 */
export function getNextBaseSKNumber(allSKHistories: SKHistory[]): number {
  if (allSKHistories.length === 0) return 1;
  const bases = allSKHistories.map((sk) => parseSKNumber(sk.skNumber).base);
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
