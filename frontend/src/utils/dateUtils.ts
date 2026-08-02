export const formatTanggalIndo = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim() || dateStr === '-') return '-';
  const str = dateStr.trim();
  
  // Return directly if already formatted as "DD Month YYYY"
  if (/^\d{1,2}\s+[A-Za-z\u00C0-\u024F]+\s+\d{4}$/.test(str)) return str;

  let d = new Date(str);
  if (isNaN(d.getTime())) {
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (parts[2].length === 4) {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  }

  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};
