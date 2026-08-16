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
  // 1. Determine Fund Source (ISTT / IST / ZAKAT / AMIL / APBD)
  let fundSource = 'ZAKAT';
  
  // Check account first if selected (the physical fund source)
  const accGroup = String(account?.kelompok_dana || '').toUpperCase().trim();
  if (accGroup.includes('INFAK_TERIKAT') || accGroup === 'IST') {
    fundSource = 'INFAK_TERIKAT';
  } else if (accGroup.includes('INFAK_TIDAK_TERIKAT') || accGroup.includes('TIDAK TERIKAT') || accGroup === 'ISTT') {
    fundSource = 'INFAK_TIDAK_TERIKAT';
  } else if (accGroup.includes('AMIL')) {
    fundSource = 'AMIL';
  } else if (accGroup.includes('APBD')) {
    fundSource = 'APBD';
  }

  // Also check proposal source fields
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
  const rules = await db.coaMappingRule.findMany({
    include: { debitCoa: true, kreditCoa: true }
  });

  // 3. Normalizer helper for tag
  const normalizeTag = (tag: string) => {
    if (!tag) return '';
    const u = String(tag).toUpperCase().trim();
    if (u.includes('INFAK_TERIKAT') || u.includes('TERIKAT') || u === 'IST') return 'INFAK_TERIKAT';
    if (u.includes('INFAK_TIDAK_TERIKAT') || u.includes('TIDAK TERIKAT') || u === 'ISTT' || u.includes('INFAK')) return 'INFAK_TIDAK_TERIKAT';
    if (u.includes('AMIL')) return 'AMIL';
    if (u.includes('APBD')) return 'APBD';
    if (u.includes('ZAKAT')) return 'ZAKAT';
    return u;
  };

  // Filter rules by fundSource
  const fundRules = rules.filter((r: any) => {
    if (!r.sumber_dana_tag || r.sumber_dana_tag === 'ALL') return true;
    return normalizeTag(r.sumber_dana_tag) === fundSource;
  });

  const matchingTipeKasRules = fundRules.filter((r: any) => !r.tipe_kas || r.tipe_kas === account?.tipe_kas || r.tipe_kas === 'ALL');
  const targetRules = matchingTipeKasRules.length > 0 ? matchingTipeKasRules : fundRules;

  // 4. Collect all possible program search terms for this proposal
  let programCode = '';
  let programName = '';
  if (proposal.program) {
    programCode = proposal.program.code || '';
    programName = proposal.program.name || '';
  }

  const rawTarget = String(proposal.jenis_permohonan || proposal.rkat_activity_id || '').trim();
  if ((!programCode || !programName) && rawTarget) {
    try {
      const foundProg = await db.program.findFirst({
        where: {
          OR: [
            { code: rawTarget },
            { name: rawTarget },
            { name: { contains: rawTarget } }
          ]
        }
      });
      if (foundProg) {
        programCode = foundProg.code || programCode;
        programName = foundProg.name || programName;
      }
    } catch (e) {
      // ignore
    }
  }

  // Build target candidates from proposal
  const targetTokens = [
    programCode,
    programName,
    proposal.jenis_permohonan,
    proposal.rkat_activity_id,
    proposal.program?.code,
    proposal.program?.name,
    proposal.program?.pilar_code
  ]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());

  // Function to check if a rule matches proposal program
  const matchProg = (ruleProg: string) => {
    if (!ruleProg) return false;
    const cleanRule = ruleProg.trim().toLowerCase();
    
    // Extract code and text parts: e.g. "230105 - Bantuan Infrastruktur Pendidikan"
    const ruleParts = cleanRule.split(/[-–|]/).map(p => p.trim());
    const ruleCodePart = cleanRule.split(' ')[0].split('-')[0].trim();

    for (const t of targetTokens) {
      if (!t) continue;
      // Direct exact match or inclusion
      if (t === cleanRule || t.includes(cleanRule) || cleanRule.includes(t)) return true;

      // Match sub parts (e.g. name or code)
      for (const rp of ruleParts) {
        if (rp && (rp === t || rp.includes(t) || t.includes(rp))) return true;
      }

      // Code prefix matching (e.g. 2301 or 230105)
      const tCode = t.split(' ')[0].split('-')[0].trim();
      if (ruleCodePart && tCode && !isNaN(Number(tCode.replace(/\./g, ''))) && !isNaN(Number(ruleCodePart.replace(/\./g, '')))) {
        if (tCode === ruleCodePart || tCode.startsWith(ruleCodePart) || ruleCodePart.startsWith(tCode)) return true;
      }

      // Significant words match (e.g. "infrastruktur", "pendidikan", "kemanusiaan")
      const words = t.split(/\s+/).filter(w => w.length > 4 && !['bantuan', 'program', 'melalui'].includes(w));
      for (const w of words) {
        if (cleanRule.includes(w)) return true;
      }
    }
    return false;
  };

  const targetAsnaf = String(proposal.asnaf || '').trim().toLowerCase();
  const matchAsnaf = (ruleAsnaf: string | null) => {
    if (!ruleAsnaf || ruleAsnaf.trim() === '' || ruleAsnaf.trim().toLowerCase() === 'global' || ruleAsnaf.trim().toLowerCase() === 'all' || ruleAsnaf.trim().toLowerCase() === 'non-asnaf') return true;
    const cleanRuleAsnaf = ruleAsnaf.trim().toLowerCase();
    if (cleanRuleAsnaf === targetAsnaf) return true;
    if (normalizeTag(ruleAsnaf) === normalizeTag(targetAsnaf)) return true;
    if (normalizeTag(ruleAsnaf) === normalizeTag(fundSource)) return true;
    return false;
  };

  let mappingRule = null;

  // Level 1: Match Program AND Specific Asnaf
  if (targetAsnaf) {
    mappingRule = targetRules.find((r: any) => matchProg(r.program_code) && r.asnaf_id && r.asnaf_id.trim().toLowerCase() === targetAsnaf);
  }

  // Level 2: Match Program AND Asnaf by tag / global
  if (!mappingRule) {
    mappingRule = targetRules.find((r: any) => matchProg(r.program_code) && matchAsnaf(r.asnaf_id));
  }

  // Level 3: Match Program in fundRules regardless of kas type
  if (!mappingRule) {
    mappingRule = fundRules.find((r: any) => matchProg(r.program_code));
  }

  // Level 4: Match ANY rule in targetRules for this fundSource (e.g. ISTT rule exists)
  if (!mappingRule && targetRules.length > 0) {
    mappingRule = targetRules.find((r: any) => matchAsnaf(r.asnaf_id)) || targetRules[0];
  }

  // Level 5: Match ANY rule in fundRules
  if (!mappingRule && fundRules.length > 0) {
    mappingRule = fundRules[0];
  }

  let debitCoaCode = null;

  // Primary: Debit COA from Matched CoaMappingRule
  if (mappingRule && mappingRule.debit_coa_code) {
    debitCoaCode = mappingRule.debit_coa_code;
  }

  // Standard Fallback by Fund Source (PSAK 109)
  if (!debitCoaCode) {
    if (fundSource === 'INFAK_TIDAK_TERIKAT') {
      debitCoaCode = '52040101'; // Penyaluran Infak dan Sedekah Tidak Terikat
    } else if (fundSource === 'INFAK_TERIKAT') {
      debitCoaCode = '53010101'; // Penyaluran Infak Terikat
    } else if (fundSource === 'AMIL') {
      debitCoaCode = '54010101';
    } else if (fundSource === 'APBD') {
      debitCoaCode = '55010101';
    } else {
      // ZAKAT: check asnaf
      if (targetAsnaf.includes('fakir')) debitCoaCode = '51020101';
      else if (targetAsnaf.includes('miskin')) debitCoaCode = '51030101';
      else if (targetAsnaf.includes('sabil')) debitCoaCode = '51070101';
      else if (targetAsnaf.includes('ibnu')) debitCoaCode = '51080101';
      else if (targetAsnaf.includes('mualaf')) debitCoaCode = '51040101';
      else if (targetAsnaf.includes('gharim')) debitCoaCode = '51060101';
      else if (targetAsnaf.includes('riqab')) debitCoaCode = '51050101';
      else debitCoaCode = '51010101'; // Penyaluran Zakat
    }
  }

  // Verify debit COA exists in DB or upsert standard account
  if (debitCoaCode) {
    const existing = await db.chartOfAccounts.findUnique({ where: { coa_code: debitCoaCode } as any });
    if (!existing) {
      let defaultName = 'Penyaluran ZIS';
      if (debitCoaCode === '52040101') defaultName = 'Penyaluran Infak Tidak Terikat';
      else if (debitCoaCode === '53010101') defaultName = 'Penyaluran Infak Terikat';
      else if (debitCoaCode.startsWith('51')) defaultName = 'Penyaluran Zakat';
      
      await db.chartOfAccounts.upsert({
        where: { coa_code: debitCoaCode } as any,
        update: {},
        create: {
          coa_code: debitCoaCode,
          nama_akun: defaultName,
          klasifikasi: 'Penyaluran',
          tipe_dana: fundSource
        } as any
      });
    }
  }

  return { debitCoaCode, mappingRule, fundSource };
}
