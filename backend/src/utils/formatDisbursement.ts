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

  let effectiveAnak = proposal.nama_anak && proposal.nama_anak.trim() !== '' && proposal.nama_anak.trim() !== '-' ? proposal.nama_anak.trim() : null;
  if (!effectiveAnak && (proposal as any).survey_data) {
    try {
      const s = typeof (proposal as any).survey_data === 'string' ? JSON.parse((proposal as any).survey_data) : (proposal as any).survey_data;
      const fromSurvey = s?.namaAnak || s?.nama_anak || s?.namaSiswa || s?.nama_siswa || s?.anak;
      if (fromSurvey && String(fromSurvey).trim() !== '' && String(fromSurvey).trim() !== '-') {
        effectiveAnak = String(fromSurvey).trim();
      }
    } catch (e) {}
  }

  let targetName = '';

  if (effectiveAnak) {
    // Format Nama Anak: (nama anak) (nama instansi)
    const instansi = (proposal.nama_instansi && proposal.nama_instansi.trim() !== '-' && !proposal.nama_instansi.toLowerCase().startsWith('kel.')) 
      ? ` ${proposal.nama_instansi.trim()}` 
      : '';
    targetName = `${effectiveAnak}${instansi}`;
  } else if (isLembaga) {
    // Format Lembaga: (nama instansi)
    targetName = (proposal.nama_instansi && proposal.nama_instansi.trim() !== '-' ? proposal.nama_instansi.trim() : proposal.nama_pemohon?.trim()) || 'Lembaga Tanpa Nama';
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

/**
 * Resolves the appropriate debit COA code based on CoaMappingRule, proposal RKAT activity, and fund source (IST/ISTT/Zakat)
 */
export async function resolveDisbursementCoa(proposal: any, account: any, db: any) {
  // 1. Determine Fund Source (prioritize proposal.asnaf)
  let fundSource = 'ZAKAT';
  const possibleSources = [proposal.asnaf, proposal.rekomendasi_kabag, proposal.tipe_bantuan];
  for (const src of possibleSources) {
    if (!src) continue;
    const normalized = String(src).toUpperCase().trim();
    if (normalized.includes('INFAK_TERIKAT') || normalized.includes('TERIKAT') || normalized === 'IST') {
      fundSource = 'INFAK_TERIKAT';
      break;
    } else if (normalized.includes('INFAK_TIDAK_TERIKAT') || normalized.includes('TIDAK TERIKAT') || normalized === 'ISTT' || normalized.includes('INFAK')) {
      fundSource = 'INFAK_TIDAK_TERIKAT';
      break;
    } else if (normalized.includes('AMIL')) {
      fundSource = 'AMIL';
      break;
    } else if (normalized.includes('APBD')) {
      fundSource = 'APBD';
      break;
    } else if (normalized.includes('ZAKAT')) {
      fundSource = 'ZAKAT';
      break;
    }
  }

  // 2. Query all rules from CoaMappingRule
  const rules = await db.coaMappingRule.findMany();

  const matchingTipeKasRules = rules.filter((r: any) => !r.tipe_kas || r.tipe_kas === account?.tipe_kas || r.tipe_kas === 'ALL');
  const targetRules = matchingTipeKasRules.length > 0 ? matchingTipeKasRules : rules;

  let mappingRule = null;
  const targetAsnaf = String(proposal.asnaf || '').trim().toLowerCase();

  const matchProg = (ruleProg: string) => {
    if (!ruleProg) return false;
    const cleanRule = ruleProg.trim().toLowerCase();
    const cleanRuleCode = cleanRule.split(' ')[0].split('-')[0].trim();

    const targets = [
      proposal.jenis_permohonan,
      proposal.rkat_activity_id,
      proposal.program?.name,
      proposal.program?.code,
      proposal.program_id
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());

    for (const t of targets) {
      const tCode = t.split(' ')[0].split('-')[0].trim();
      if (t === cleanRule || t.includes(cleanRule) || cleanRule.includes(t)) return true;
      if (cleanRuleCode && (tCode === cleanRuleCode || tCode.startsWith(cleanRuleCode) || cleanRuleCode.startsWith(tCode))) return true;
    }
    return false;
  };

  const matchAsnaf = (ruleAsnaf: string | null) => {
    if (!ruleAsnaf || ruleAsnaf.trim() === '' || ruleAsnaf.trim().toLowerCase() === 'global') return true;
    return ruleAsnaf.trim().toLowerCase() === targetAsnaf;
  };

  // Match A: Exact Program AND Exact Asnaf
  if (targetAsnaf) {
    mappingRule = targetRules.find((r: any) => matchProg(r.program_code) && r.asnaf_id && r.asnaf_id.trim().toLowerCase() === targetAsnaf);
  }

  // Match B: Exact Program AND Global/Empty Asnaf
  if (!mappingRule) {
    mappingRule = targetRules.find((r: any) => matchProg(r.program_code) && matchAsnaf(r.asnaf_id));
  }

  // Match C: Any Program AND Exact Asnaf
  if (!mappingRule && targetAsnaf) {
    mappingRule = targetRules.find((r: any) => matchAsnaf(r.asnaf_id));
  }

  // Match D: Fallback to any rule for this fundSource
  if (!mappingRule) {
    mappingRule = targetRules[0] || null;
  }

  let debitCoaCode = null;

  // Primary: CoaMappingRule
  if (mappingRule && mappingRule.debit_coa_code) {
    debitCoaCode = mappingRule.debit_coa_code;
  }

  // Secondary: Check if proposal.rkat_activity_id is an actual 5xxxx COA
  if (!debitCoaCode && proposal.rkat_activity_id && proposal.rkat_activity_id !== '519999999' && !proposal.rkat_activity_id.startsWith('asnaf-')) {
    const foundCoa = await db.chartOfAccounts.findUnique({
      where: { coa_code: proposal.rkat_activity_id }
    });
    if (foundCoa && foundCoa.coa_code.startsWith('5')) {
      debitCoaCode = foundCoa.coa_code;
    }
  }

  // Emergency Fallback: 519999999 if no rule is matched
  if (!debitCoaCode) {
    await db.chartOfAccounts.upsert({
      where: { coa_code: '519999999' } as any,
      update: {},
      create: {
        coa_code: '519999999',
        nama_akun: 'Penyaluran Lain-lain (Emergency Fallback)',
        klasifikasi: 'Beban',
        tipe_dana: 'ZAKAT'
      } as any
    });
    debitCoaCode = '519999999';
  }

  return { debitCoaCode, mappingRule, fundSource };
}
