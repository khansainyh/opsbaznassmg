export interface ProposalForDisbursementKeterangan {
  program?: { name?: string | null } | null;
  jenis_permohonan?: string | null;
  jenis_pengajuan?: string | null;
  nama_pemohon?: string | null;
  nama_instansi?: string | null;
  nama_anak?: string | null;
  alamat?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
}

/**
  * Generates standard journal/ledger description for disbursement:
  * Default: (nama program) an. (nama pemohon), (alamat) (kelurahan) (kecamatan)
  * With Child Name: (nama program) an. (nama anak) (nama instansi), (alamat) (kelurahan) (kecamatan)
  * Lembaga: (nama program) an. (nama instansi), (alamat) (kelurahan) (kecamatan)
  */
export function formatDisbursementKeterangan(proposal: ProposalForDisbursementKeterangan): string {
  // 1. Program Name
  const rawProgramName = proposal.program?.name || proposal.jenis_permohonan || 'Bantuan';
  const cleanProgram = rawProgramName.toLowerCase().startsWith('bantuan') 
    ? rawProgramName 
    : `Bantuan ${rawProgramName}`;

  // 2. Determine Subjek (an. ...)
  const isLembaga = proposal.jenis_pengajuan === 'Lembaga' || 
    (proposal.nama_instansi && (!proposal.nama_pemohon || proposal.nama_pemohon === proposal.nama_instansi));

  const hasNamaAnak = Boolean(
    proposal.nama_anak && 
    proposal.nama_anak.trim() !== '' && 
    proposal.nama_anak.trim() !== '-'
  );

  let targetName = '';

  if (isLembaga) {
    // Format Lembaga: (nama instansi)
    targetName = (proposal.nama_instansi && proposal.nama_instansi.trim() !== '-' ? proposal.nama_instansi.trim() : proposal.nama_pemohon?.trim()) || 'Lembaga Tanpa Nama';
  } else if (hasNamaAnak) {
    // Format Nama Anak: (nama anak) (nama instansi)
    const anak = proposal.nama_anak!.trim();
    const instansi = (proposal.nama_instansi && proposal.nama_instansi.trim() !== '-' && !proposal.nama_instansi.toLowerCase().startsWith('kel.')) 
      ? ` ${proposal.nama_instansi.trim()}` 
      : '';
    targetName = `${anak}${instansi}`;
  } else {
    // Default Pemohon: (nama pemohon)
    targetName = (proposal.nama_pemohon && proposal.nama_pemohon.trim() !== '-' ? proposal.nama_pemohon.trim() : proposal.nama_instansi?.trim()) || 'Pemohon Tanpa Nama';
  }

  // 3. Address details: (alamat) (kelurahan) (kecamatan)
  const addressParts: string[] = [];
  if (proposal.alamat && proposal.alamat.trim() !== '' && proposal.alamat.trim() !== '-') {
    addressParts.push(proposal.alamat.trim());
  }
  if (proposal.kelurahan && proposal.kelurahan.trim() !== '' && proposal.kelurahan.trim() !== '-') {
    addressParts.push(proposal.kelurahan.trim());
  }
  if (proposal.kecamatan && proposal.kecamatan.trim() !== '' && proposal.kecamatan.trim() !== '-') {
    addressParts.push(proposal.kecamatan.trim());
  }

  const addressStr = addressParts.length > 0 ? `, ${addressParts.join(' ')}` : '';

  return `${cleanProgram} an. ${targetName}${addressStr}`;
}
