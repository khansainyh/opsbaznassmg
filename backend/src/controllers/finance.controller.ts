import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { formatDisbursementKeterangan, resolveDisbursementCoa } from '../utils/formatDisbursement';

// ==========================================
// 1. Chart of Accounts (COA) Controllers
// ==========================================

export const getCOAs = async (req: Request, res: Response) => {
  try {
    const transitCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: '49000001' } });
    if (!transitCoa) {
      await prisma.chartOfAccounts.create({
        data: {
          coa_code: '49000001',
          nama_akun: 'Penerimaan ZIS Belum Teridentifikasi (Transit)',
          klasifikasi: 'Penerimaan Transit',
          tipe_dana: 'TRANSIT'
        }
      });
    }

    const coas = await prisma.chartOfAccounts.findMany({
      orderBy: { coa_code: 'asc' }
    });
    res.status(200).json(coas);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createCOA = async (req: Request, res: Response) => {
  try {
    const { coa_code, nama_akun, klasifikasi, tipe_dana, saldo_awal } = req.body;
    if (!coa_code || !nama_akun) {
      res.status(400).json({ error: 'Kode COA dan Nama Akun wajib diisi' });
      return;
    }

    const oldCoa = await prisma.chartOfAccounts.findUnique({
      where: { coa_code }
    });

    const coa = await prisma.chartOfAccounts.upsert({
      where: { coa_code },
      update: { nama_akun, klasifikasi, tipe_dana, saldo_awal: saldo_awal !== undefined ? Number(saldo_awal) : undefined },
      create: { coa_code, nama_akun, klasifikasi, tipe_dana, saldo_awal: saldo_awal !== undefined ? Number(saldo_awal) : 0 }
    });

    if (saldo_awal !== undefined && oldCoa) {
      const diff = Number(saldo_awal) - Number(oldCoa.saldo_awal || 0);
      if (diff !== 0) {
        await prisma.bankAccount.updateMany({
          where: { coa_code },
          data: {
            saldo: {
              increment: new Prisma.Decimal(diff)
            }
          }
        });
      }
    }

    res.status(201).json(coa);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateCOA = async (req: Request, res: Response) => {
  try {
    const { coa_code } = req.params;
    const { nama_akun, klasifikasi, tipe_dana, saldo_awal } = req.body;

    const oldCoa = await prisma.chartOfAccounts.findUnique({
      where: { coa_code } as any
    });

    const coa = await prisma.chartOfAccounts.update({
      where: { coa_code } as any,
      data: {
        nama_akun,
        klasifikasi,
        tipe_dana,
        saldo_awal: saldo_awal !== undefined ? Number(saldo_awal) : undefined
      }
    });

    if (saldo_awal !== undefined && oldCoa) {
      const diff = Number(saldo_awal) - Number(oldCoa.saldo_awal || 0);
      if (diff !== 0) {
        await prisma.bankAccount.updateMany({
          where: { coa_code } as any,
          data: {
            saldo: {
              increment: new Prisma.Decimal(diff)
            }
          }
        });
      }
    }

    res.status(200).json(coa);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteCOA = async (req: Request, res: Response) => {
  try {
    const { coa_code } = req.params;
    await prisma.chartOfAccounts.delete({ where: { coa_code } as any });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 2. Bank & Kas Accounts Controllers
// ==========================================

export const getAccounts = async (req: Request, res: Response) => {
  try {
    // Ensure "Non Kas" virtual account exists in the database
    const nonKasAccount = await prisma.bankAccount.findUnique({ where: { account_id: 'non_kas' } });
    if (!nonKasAccount) {
      const nonKasCoaCode = '11010199';
      await prisma.chartOfAccounts.upsert({
        where: { coa_code: nonKasCoaCode },
        update: {},
        create: {
          coa_code: nonKasCoaCode,
          nama_akun: 'Penerimaan Non-Kas / Barang',
          klasifikasi: 'Aset',
          tipe_dana: 'ZAKAT'
        }
      });
      await prisma.bankAccount.create({
        data: {
          account_id: 'non_kas',
          nama_akun: 'Non Kas',
          tipe_kas: 'NON_KAS',
          kelompok_dana: 'ZAKAT',
          saldo: new Prisma.Decimal(0.00),
          coa_code: nonKasCoaCode
        }
      });
    }

    const accounts = await prisma.bankAccount.findMany({
      include: { coa: true },
      orderBy: { tipe_kas: 'asc' }
    });
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const { nama_akun, tipe_kas, kelompok_dana, no_rekening, kode_laci, coa_code } = req.body;
    if (!nama_akun || !tipe_kas || !kelompok_dana || !coa_code) {
      res.status(400).json({ error: 'Nama, tipe kas, kelompok dana, dan COA wajib diisi' });
      return;
    }

    // Ambil saldo awal dari master COA
    const coa = await prisma.chartOfAccounts.findUnique({
      where: { coa_code }
    });
    const initialSaldo = coa ? Number(coa.saldo_awal || 0) : 0;

    const account = await prisma.bankAccount.create({
      data: {
        nama_akun,
        tipe_kas,
        kelompok_dana,
        saldo: new Prisma.Decimal(initialSaldo),
        no_rekening,
        kode_laci,
        coa_code
      },
      include: { coa: true }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nama_akun, tipe_kas, kelompok_dana, no_rekening, kode_laci, coa_code } = req.body;

    const oldAccount = await prisma.bankAccount.findUnique({
      where: { account_id: id } as any
    });

    let updatedSaldo = undefined;
    if (coa_code && coa_code !== oldAccount?.coa_code) {
      // Jika COA berubah, update saldo kas sesuai saldo awal COA baru
      const coa = await prisma.chartOfAccounts.findUnique({
        where: { coa_code }
      });
      updatedSaldo = coa ? new Prisma.Decimal(coa.saldo_awal || 0) : undefined;
    }

    const account = await prisma.bankAccount.update({
      where: { account_id: id } as any,
      data: {
        nama_akun,
        tipe_kas,
        kelompok_dana,
        saldo: updatedSaldo,
        no_rekening,
        kode_laci,
        coa_code
      },
      include: { coa: true }
    });
    res.status(200).json(account);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.bankAccount.delete({ where: { account_id: id } as any });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 3. COA Mapping Rules Controllers
// ==========================================

export const getMappingRules = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.coaMappingRule.findMany({
      include: {
        debitCoa: true,
        kreditCoa: true
      }
    });
    res.status(200).json(rules);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createMappingRule = async (req: Request, res: Response) => {
  try {
    const { program_code, asnaf_id, tipe_kas, sumber_dana_tag, debit_coa_code, kredit_coa_code } = req.body;
    if (!program_code || !tipe_kas || !sumber_dana_tag || !debit_coa_code || !kredit_coa_code) {
      res.status(400).json({ error: 'Data program, tipe kas, sumber dana, debit COA, dan kredit COA wajib diisi' });
      return;
    }
    // Check if a rule with this combination already exists
    const existingRule = await prisma.coaMappingRule.findFirst({
      where: {
        program_code,
        asnaf_id: asnaf_id || null,
        tipe_kas,
        sumber_dana_tag
      }
    });

    let rule;
    if (existingRule) {
      rule = await prisma.coaMappingRule.update({
        where: { rule_id: existingRule.rule_id },
        data: {
          debit_coa_code,
          kredit_coa_code
        },
        include: {
          debitCoa: true,
          kreditCoa: true
        }
      });
      res.status(200).json(rule);
    } else {
      rule = await prisma.coaMappingRule.create({
        data: {
          program_code,
          asnaf_id: asnaf_id || null,
          tipe_kas,
          sumber_dana_tag,
          debit_coa_code,
          kredit_coa_code
        },
        include: {
          debitCoa: true,
          kreditCoa: true
        }
      });
      res.status(201).json(rule);
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateMappingRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { program_code, asnaf_id, tipe_kas, sumber_dana_tag, debit_coa_code, kredit_coa_code } = req.body;
    const rule = await prisma.coaMappingRule.update({
      where: { rule_id: id } as any,
      data: {
        program_code,
        asnaf_id: asnaf_id !== undefined ? (asnaf_id || null) : undefined,
        tipe_kas,
        sumber_dana_tag,
        debit_coa_code,
        kredit_coa_code
      },
      include: {
        debitCoa: true,
        kreditCoa: true
      }
    });
    res.status(200).json(rule);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteMappingRule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id || (req.params as any).rule_id;
    if (id) {
      await prisma.coaMappingRule.deleteMany({
        where: { rule_id: String(id) }
      });
    }
    res.status(200).json({ status: 'success', message: 'Aturan berhasil dihapus' });
  } catch (error) {
    console.error('[DELETE MAPPING RULE ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 4. Double-Guard Checking Logic
// ==========================================

export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId } as any,
      include: { program: { include: { pilar: true } } } as any
    }) as any;

    if (!proposal) {
      res.status(404).json({ error: 'Proposal tidak ditemukan' });
      return;
    }

    const rawProgramCode = String(proposal.jenis_permohonan || '').trim();
    const proposalAsnaf = proposal.asnaf || 'Miskin';
    const amount = Number(proposal.nominal || 0);

    // Robust variation-friendly tag logic
    let tag = 'ZAKAT';
    const rawTag = proposal.asnaf || proposal.rekomendasi_kabag || proposal.tipe_bantuan || 'Zakat';
    const rawTagUpper = String(rawTag).toUpperCase().trim();
    if (rawTagUpper === 'IST' || rawTagUpper.includes('INFAK_TERIKAT') || (rawTagUpper.includes('TERIKAT') && !rawTagUpper.includes('TIDAK'))) {
      tag = 'INFAK_TERIKAT';
    } else if (rawTagUpper === 'ISTT' || rawTagUpper.includes('TIDAK TERIKAT') || rawTagUpper.includes('INFAK_TIDAK_TERIKAT')) {
      tag = 'INFAK_TIDAK_TERIKAT';
    } else if (rawTagUpper.includes('APBD')) {
      tag = 'APBD';
    } else if (rawTagUpper.includes('AMIL')) {
      tag = 'AMIL';
    } else {
      tag = 'ZAKAT';
    }

    // 1. Fetch all programs with pilars to support multi-activity RKAT structures
    const allPrograms = await prisma.program.findMany({
      include: { pilar: true },
      orderBy: { code: 'asc' }
    });

    const allActivities: any[] = [];

    for (const prog of allPrograms) {
      const details = typeof prog.rkat_details === 'string'
        ? JSON.parse(prog.rkat_details || '[]')
        : (prog.rkat_details || []);

      if (Array.isArray(details) && details.length > 0) {
        for (let idx = 0; idx < details.length; idx++) {
          const act = details[idx];
          const actId = String(act.id || act.asnafTargetId || `act-${prog.code}-${act.asnaf || 'all'}-${idx}`);
          const actName = act.name || prog.name;
          const actKeterangan = act.keterangan || act.spesifikasi || act.name || prog.name;
          const actAsnaf = act.asnaf || 'Semua';
          const actNominal = Number(act.nominal || act.unitCost || 0);
          let total = Number(act.mustahik || 0) * Number(act.frekuensi || 1) * actNominal;
          if (total === 0 && Number(prog.budget_rkat) > 0 && details.length === 1) {
            total = Number(prog.budget_rkat);
          }

          const matchRkatIds = [actId, String(act.no || ''), act.coaCode, (details.length === 1 ? prog.code : null)].filter(Boolean) as string[];
          const journalSum = await prisma.journalEntry.aggregate({
            _sum: { debit: true },
            where: {
              coa_code: { startsWith: '5' },
              realisasi: {
                rkat_id: { in: matchRkatIds }
              }
            }
          });
          const terpakai = Number(journalSum._sum.debit || 0);
          const sisa = total - terpakai;

          allActivities.push({
            id: actId,
            program_code: prog.code,
            program_name: prog.name,
            pilar_code: prog.pilar_code,
            pilar_name: prog.pilar?.name || '',
            name: actName,
            keterangan: actKeterangan,
            asnaf: actAsnaf,
            nominal: actNominal,
            total_pagu: total,
            terpakai: terpakai,
            sisa_pagu: sisa,
            status: amount <= sisa ? 'AVAILABLE' : 'OVER_BUDGET',
            is_target_program: false,
            coaCode: act.coaCode,
            no: act.no
          });
        }
      } else {
        // Fallback for programs without rkat_details
        const total = Number(prog.budget_rkat || 0);
        const journalSum = await prisma.journalEntry.aggregate({
          _sum: { debit: true },
          where: {
            coa_code: { startsWith: '5' },
            realisasi: { rkat_id: prog.code }
          }
        });
        const terpakai = Number(journalSum._sum.debit || 0);
        const sisa = total - terpakai;

        allActivities.push({
          id: prog.code,
          program_code: prog.code,
          program_name: prog.name,
          pilar_code: prog.pilar_code,
          pilar_name: prog.pilar?.name || '',
          name: prog.name,
          keterangan: prog.name,
          asnaf: 'Semua',
          nominal: total,
          total_pagu: total,
          terpakai: terpakai,
          sisa_pagu: sisa,
          status: amount <= sisa ? 'AVAILABLE' : 'OVER_BUDGET',
          is_target_program: false
        });
      }
    }

    // 2. Identify target program and exact matched activity
    let targetProgram: any = proposal.program || null;
    let matchedAct: any = null;

    // A. Priority 1: Match by explicit proposal.rkat_activity_id
    if (proposal.rkat_activity_id) {
      const pRkatId = String(proposal.rkat_activity_id).trim();
      matchedAct = allActivities.find(a => 
        String(a.id) === pRkatId || 
        String(a.no) === pRkatId || 
        String(a.coaCode) === pRkatId
      );
      if (matchedAct) {
        targetProgram = allPrograms.find(p => p.code === matchedAct.program_code) || targetProgram;
      }
    }

    // B. Priority 2: Match by proposal.program or rawProgramCode
    if (!targetProgram && rawProgramCode) {
      targetProgram = allPrograms.find(p => 
        p.code === rawProgramCode || 
        p.name.toLowerCase() === rawProgramCode.toLowerCase() ||
        p.name.toLowerCase().includes(rawProgramCode.toLowerCase()) ||
        rawProgramCode.toLowerCase().includes(p.name.toLowerCase())
      );
      if (!targetProgram && rawProgramCode.includes('.')) {
        const parentCode = rawProgramCode.split('.')[0].trim();
        targetProgram = allPrograms.find(p => p.code === parentCode);
      }
    }

    // C. Priority 3: If targetProgram found, find matching activity within targetProgram
    if (targetProgram && !matchedAct) {
      const progActivities = allActivities.filter(a => a.program_code === targetProgram.code);
      if (progActivities.length > 0) {
        const pAsnafLower = proposalAsnaf.toLowerCase().trim();
        matchedAct = progActivities.find(a => (a.asnaf || '').toLowerCase().trim() === pAsnafLower)
          || progActivities.find(a => (a.asnaf || '').toLowerCase().includes(pAsnafLower))
          || progActivities.find(a => (a.keterangan || '').toLowerCase().includes(rawProgramCode.toLowerCase()))
          || progActivities[0];
      }
    }

    // D. Priority 4: Search matching activity name/keterangan across all activities if still not found
    if (!matchedAct && rawProgramCode) {
      matchedAct = allActivities.find(a => 
        a.name.toLowerCase() === rawProgramCode.toLowerCase() ||
        a.keterangan.toLowerCase().includes(rawProgramCode.toLowerCase())
      );
      if (matchedAct) {
        targetProgram = allPrograms.find(p => p.code === matchedAct.program_code) || targetProgram;
      }
    }

    // E. Fallback
    if (!matchedAct && allActivities.length > 0) {
      matchedAct = allActivities[0];
      if (!targetProgram) {
        targetProgram = allPrograms.find(p => p.code === matchedAct.program_code) || null;
      }
    }

    // 3. Filter only relevant RKAT activities linked in settingan RKAT
    const targetCode = targetProgram ? targetProgram.code : (matchedAct ? matchedAct.program_code : '');
    
    // Strict filtering: Only activities belonging to the matched program in settingan RKAT
    let relevantActivities = allActivities.filter(a => a.program_code === targetCode);
    
    // Fallback: If no direct activities found for this program code but targetProgram exists with pilar, filter by pilar
    if (relevantActivities.length === 0 && targetProgram?.pilar_code) {
      relevantActivities = allActivities.filter(a => a.pilar_code === targetProgram.pilar_code);
    }
    
    // If still empty (e.g. unmapped program), fallback to matchedAct if exists
    if (relevantActivities.length === 0 && matchedAct) {
      relevantActivities = [matchedAct];
    }

    relevantActivities.forEach(a => {
      a.is_target_program = a.program_code === targetCode;
    });

    const sortedActivities = [
      ...relevantActivities.filter(a => a.is_target_program),
      ...relevantActivities.filter(a => !a.is_target_program)
    ];

    // 4. Construct rkat_spesifik and rkat_alternatif
    let rkatSpesifik = {
      nama_kegiatan: matchedAct ? (matchedAct.keterangan || matchedAct.name) : (targetProgram?.name || 'Program Global'),
      asnaf: matchedAct?.asnaf || proposalAsnaf,
      total_pagu: matchedAct?.total_pagu || (targetProgram?.budget_rkat || 0),
      sisa_pagu: matchedAct?.sisa_pagu || (targetProgram?.budget_rkat || 0),
      status: (matchedAct ? matchedAct.sisa_pagu : (targetProgram?.budget_rkat || 0)) >= amount ? 'CUKUP' : 'OVER_BUDGET'
    };

    const altAct = allActivities.find(a => a.is_target_program && (a.asnaf?.toLowerCase() === 'semua' || a.asnaf?.toLowerCase() === 'semua asnaf'))
      || allActivities.find(a => a.asnaf?.toLowerCase() === 'semua' || a.asnaf?.toLowerCase() === 'semua asnaf')
      || (allActivities.length > 0 ? allActivities[0] : null);

    let rkatAlternatif = {
      nama_kegiatan: altAct ? (altAct.keterangan || altAct.name) : 'Program Global (Alternatif)',
      asnaf: 'Semua Asnaf',
      total_pagu: altAct ? altAct.total_pagu : 0,
      sisa_pagu: altAct ? altAct.sisa_pagu : 0,
      status: (altAct ? altAct.sisa_pagu : 0) >= amount ? 'CUKUP' : 'OVER_BUDGET'
    };

    // 5. Sum physical bank/cash accounts matching the tag
    const accountsSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: tag }
    });
    const totalSaldoKasRiil = Number(accountsSum._sum.saldo || 0);

    const zakatSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'ZAKAT' }
    });
    const isttSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'INFAK_TIDAK_TERIKAT' }
    });
    const istSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'INFAK_TERIKAT' }
    });

    const saldoZakat = Number(zakatSum._sum.saldo || 0);
    const saldoIstt = Number(isttSum._sum.saldo || 0);
    const saldoIst = Number(istSum._sum.saldo || 0);

    res.status(200).json({
      nama_program: targetProgram?.name || (matchedAct?.program_name || 'Program Penyaluran'),
      program_code: targetCode,
      pilar_name: targetProgram?.pilar?.name || matchedAct?.pilar_name || '',
      sumber_dana_yang_dipakai: tag,
      proposal_nominal: amount,
      proposal_asnaf: proposalAsnaf,
      rkat_spesifik: rkatSpesifik,
      rkat_alternatif: rkatAlternatif,
      rkat_activities: sortedActivities,
      kas_riil: {
        total_tersedia: totalSaldoKasRiil,
        status: totalSaldoKasRiil >= amount ? 'AMAN' : 'LIKUIDITAS_KRITIS',
        detail: {
          zakat: saldoZakat,
          istt: saldoIstt,
          ist: saldoIst
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const checkAvailabilityBatch = async (req: Request, res: Response) => {
  try {
    const { proposalIds } = req.body;
    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
      res.status(400).json({ error: 'Proposal IDs array is required' });
      return;
    }

    let totalAmount = 0;
    const rkatStatusMap = new Map<string, { total_pagu: number; terpakai_saat_ini: number; sisa_pagu: number; name: string; keterangan?: string }>();
    const proposalDetails = [];

    let detectedTag = 'ZAKAT';

    const allPrograms = await prisma.program.findMany({
      include: { pilar: true }
    });

    for (const id of proposalIds) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: id } as any,
        include: { program: true } as any
      }) as any;

      if (!proposal) continue;

      const amount = Number(proposal.nominal || 0);
      totalAmount += amount;

      let tag = 'ZAKAT';
      const rawTag = proposal.asnaf || proposal.rekomendasi_kabag || proposal.tipe_bantuan || 'Zakat';
      const rawTagUpper = String(rawTag).toUpperCase().trim();
      if (rawTagUpper === 'IST' || rawTagUpper.includes('INFAK_TERIKAT') || (rawTagUpper.includes('TERIKAT') && !rawTagUpper.includes('TIDAK'))) {
        tag = 'INFAK_TERIKAT';
      } else if (rawTagUpper === 'ISTT' || rawTagUpper.includes('TIDAK TERIKAT') || rawTagUpper.includes('INFAK_TIDAK_TERIKAT')) {
        tag = 'INFAK_TIDAK_TERIKAT';
      } else if (rawTagUpper.includes('APBD')) {
        tag = 'APBD';
      } else if (rawTagUpper.includes('AMIL')) {
        tag = 'AMIL';
      } else {
        tag = 'ZAKAT';
      }

      detectedTag = tag;

      const rawProgramCode = String(proposal.jenis_permohonan || '').trim();
      const pRkatId = proposal.rkat_activity_id ? String(proposal.rkat_activity_id).trim() : '';

      let matchedAct: any = null;
      let targetProg: any = proposal.program || null;

      // Match across all programs
      for (const prog of allPrograms) {
        const details = typeof prog.rkat_details === 'string'
          ? JSON.parse(prog.rkat_details || '[]')
          : (prog.rkat_details || []);

        if (Array.isArray(details) && details.length > 0) {
          if (pRkatId) {
            const found = details.find((d: any) => String(d.id) === pRkatId || String(d.no) === pRkatId || String(d.coaCode) === pRkatId);
            if (found) {
              matchedAct = { ...found, programName: prog.name, programCode: prog.code };
              targetProg = prog;
              break;
            }
          }
          if (!matchedAct && (prog.code === rawProgramCode || prog.name.toLowerCase() === rawProgramCode.toLowerCase())) {
            const pAsnafLower = (proposal.asnaf || 'miskin').toLowerCase();
            const found = details.find((d: any) => (d.asnaf || '').toLowerCase() === pAsnafLower) || details[0];
            if (found) {
              matchedAct = { ...found, programName: prog.name, programCode: prog.code };
              targetProg = prog;
              break;
            }
          }
        }
      }

      if (matchedAct) {
        const actId = String(matchedAct.id || `act-${matchedAct.programCode}-${matchedAct.asnaf || 'all'}`);
        const total = Number(matchedAct.mustahik || 0) * Number(matchedAct.frekuensi || 1) * Number(matchedAct.nominal || matchedAct.unitCost || 0);

        if (!rkatStatusMap.has(actId)) {
          const matchRkatIds = [actId, String(matchedAct.no || ''), matchedAct.coaCode, matchedAct.programCode].filter(Boolean) as string[];
          const journalSum = await prisma.journalEntry.aggregate({
            _sum: { debit: true },
            where: {
              coa_code: { startsWith: '5' },
              realisasi: { rkat_id: { in: matchRkatIds } }
            }
          });
          const terpakai = Number(journalSum._sum.debit || 0);
          rkatStatusMap.set(actId, {
            total_pagu: total,
            terpakai_saat_ini: terpakai,
            sisa_pagu: total - terpakai,
            name: matchedAct.name || matchedAct.programName,
            keterangan: matchedAct.keterangan || matchedAct.spesifikasi || matchedAct.name || matchedAct.programName
          });
        }
      } else if (targetProg) {
        const progCode = targetProg.code;
        const total = Number(targetProg.budget_rkat || 0);
        if (!rkatStatusMap.has(progCode)) {
          const journalSum = await prisma.journalEntry.aggregate({
            _sum: { debit: true },
            where: {
              coa_code: { startsWith: '5' },
              realisasi: { rkat_id: progCode }
            }
          });
          const terpakai = Number(journalSum._sum.debit || 0);
          rkatStatusMap.set(progCode, {
            total_pagu: total,
            terpakai_saat_ini: terpakai,
            sisa_pagu: total - terpakai,
            name: targetProg.name,
            keterangan: targetProg.name
          });
        }
      }

      proposalDetails.push({
        id: proposal.id,
        nama: proposal.nama_pemohon,
        nominal: amount,
        asnaf: proposal.asnaf || 'Miskin',
        tag: tag
      });
    }

    const rkatActivities = Array.from(rkatStatusMap.entries()).map(([id, val]) => {
      return {
        id,
        name: val.name,
        keterangan: val.keterangan || val.name,
        total_pagu: val.total_pagu,
        terpakai_saat_ini: val.terpakai_saat_ini,
        sisa_pagu: val.sisa_pagu,
        status: val.sisa_pagu >= totalAmount ? 'CUKUP' : 'OVER_BUDGET'
      };
    });

    const accountsSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: detectedTag }
    });
    const totalSaldoKasRiil = Number(accountsSum._sum.saldo || 0);

    const zakatSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'ZAKAT' }
    });
    const isttSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'INFAK_TIDAK_TERIKAT' }
    });
    const istSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: 'INFAK_TERIKAT' }
    });

    const saldoZakat = Number(zakatSum._sum.saldo || 0);
    const saldoIstt = Number(isttSum._sum.saldo || 0);
    const saldoIst = Number(istSum._sum.saldo || 0);

    res.status(200).json({
      sumber_dana_yang_dipakai: detectedTag,
      proposal_nominal_total: totalAmount,
      rkat_activities: rkatActivities,
      kas_riil: {
        total_tersedia: totalSaldoKasRiil,
        status: totalSaldoKasRiil >= totalAmount ? 'AMAN' : 'LIKUIDITAS_KRITIS',
        detail: {
          zakat: saldoZakat,
          istt: saldoIstt,
          ist: saldoIst
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 5. Double-Entry Auto-Journaling Disbursement
// ==========================================

export const previewDisbursement = async (req: Request, res: Response) => {
  try {
    const { proposalId, proposalIds, selectedAccountId } = req.body;
    if ((!proposalId && (!proposalIds || proposalIds.length === 0)) || !selectedAccountId) {
      res.status(400).json({ error: 'Proposal ID atau daftar Proposal IDs dan Account ID wajib dipilih' });
      return;
    }

    const ids = proposalIds && Array.isArray(proposalIds) ? proposalIds : [proposalId];

    let totalNominal = 0;
    const debitEntries: any[] = [];
    const kreditEntries: any[] = [];

    const account = await prisma.bankAccount.findUnique({
      where: { account_id: selectedAccountId } as any,
      include: { coa: true } as any
    }) as any;

    if (!account) {
      res.status(404).json({ error: 'Rekening tidak ditemukan' });
      return;
    }

    for (const id of ids) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: id } as any,
        include: { program: true } as any
      }) as any;
      if (!proposal) continue;

      const nominal = Number(proposal.nominal || 0);
      totalNominal += nominal;

      const resolved = await resolveDisbursementCoa(proposal, account, prisma);
      const debitCoaCode = resolved?.debitCoaCode || '519999999';

      let debitCoa = null;
      if (debitCoaCode) {
        try {
          debitCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: debitCoaCode } as any });
        } catch (e) {
          console.warn('[PREVIEW DISBURSE] Gagal cari debitCoa:', e);
        }
      }

      const formattedKeterangan = formatDisbursementKeterangan(proposal);

      debitEntries.push({
        coa_code: debitCoaCode,
        nama_akun: `${debitCoa ? debitCoa.nama_akun : 'Penyaluran ZIS'} (${formattedKeterangan})`,
        nominal
      });

      const kreditCoaCode = account.coa_code || account.coa?.coa_code || '1110101';
      let kreditCoa = null;
      if (kreditCoaCode) {
        try {
          kreditCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: kreditCoaCode } as any });
        } catch (e) {
          console.warn('[PREVIEW DISBURSE] Gagal cari kreditCoa:', e);
        }
      }

      kreditEntries.push({
        coa_code: kreditCoaCode,
        nama_akun: `${kreditCoa ? kreditCoa.nama_akun : (account.nama_akun || 'Kas/Bank')} (${formattedKeterangan})`,
        nominal
      });
    }

    const kreditCoaCode = account.coa_code || account.coa?.coa_code || '1110101';
    let kreditCoa = null;
    if (kreditCoaCode) {
      try {
        kreditCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: kreditCoaCode } as any });
      } catch (e) {}
    }

    res.status(200).json({
      nominal: totalNominal,
      debitEntries,
      kreditEntries,
      debit: {
        coa_code: debitEntries[0]?.coa_code || '519999999',
        nama_akun: debitEntries.length === 1 ? debitEntries[0].nama_akun : `Penyaluran ${debitEntries.length} Proposal (Batch)`
      },
      kredit: {
        coa_code: kreditCoaCode,
        nama_akun: kreditCoa ? kreditCoa.nama_akun : (account.nama_akun || 'Kas/Bank')
      },
      balanced: true
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const executeDisbursement = async (req: Request, res: Response) => {
  try {
    const { proposalId, proposalIds, selectedAccountId, keterangan } = req.body;
    if ((!proposalId && (!proposalIds || proposalIds.length === 0)) || !selectedAccountId) {
      res.status(400).json({ error: 'Proposal ID atau daftar Proposal IDs dan Account ID wajib dipilih' });
      return;
    }

    const ids = proposalIds && Array.isArray(proposalIds) ? proposalIds : [proposalId];

    const result = await prisma.$transaction(async (tx) => {
      let totalNominal = 0;
      const proposals = [];

      for (const id of ids) {
        const proposal = await tx.proposal.findUnique({
          where: { id: id } as any,
          include: { program: true, mustahik: true }
        }) as any;
        if (!proposal) {
          throw new Error(`Proposal dengan ID ${id} tidak ditemukan`);
        }

        const existingRealisasi = await tx.realisasi.findFirst({
          where: { proposal_id: proposal.id }
        });
        if (existingRealisasi) {
          console.warn(`[DISBURSE SKIPPED] Proposal ${proposal.id} (Agenda ${proposal.agenda_no}) sudah memiliki Realisasi ${existingRealisasi.transaksi_id}`);
          continue;
        }

        proposals.push(proposal);
        totalNominal += Number(proposal.nominal || 0);
      }

      if (proposals.length === 0) {
        return { success: true, message: 'Seluruh proposal dalam daftat telah pernah dicairkan.' };
      }

      const account = await tx.bankAccount.findUnique({
        where: { account_id: selectedAccountId } as any
      }) as any;

      if (!account) {
        throw new Error('Rekening tidak ditemukan');
      }

      if (Number(account.saldo) < totalNominal) {
        throw new Error(`Saldo di ${account.nama_akun} tidak mencukupi! Tersedia: ${account.saldo}, Dibutuhkan: ${totalNominal}`);
      }

      // 1. Decrement account balance by total nominal of valid proposals
      await tx.bankAccount.update({
        where: { account_id: selectedAccountId } as any,
        data: {
          saldo: { decrement: new Prisma.Decimal(totalNominal) }
        }
      });

      // 2. Loop through each proposal to create separate Realisasi and journal entries (1 debit + 1 credit per proposal)
      for (const proposal of proposals) {
        const nominal = Number(proposal.nominal || 0);

        const resolved = await resolveDisbursementCoa(proposal, account, tx);
        const debitCoaCode = resolved?.debitCoaCode || '519999999';

        const formattedKeterangan = formatDisbursementKeterangan(proposal);

        let initialNrm = proposal.mustahik?.nrm || null;
        const isByName = proposal.jenis_pengajuan === 'Lembaga' && proposal.penerima_detail && Array.isArray(proposal.penerima_detail) && proposal.penerima_detail.length > 0;
        if (isByName) {
          const nrms = (proposal.penerima_detail as any[]).map(p => p.nrm).filter(Boolean);
          if (nrms.length > 0) {
            initialNrm = nrms.join(', ');
          }
        }

        // Create Realisasi record for this individual proposal
        const realisasiTrx = await tx.realisasi.create({
          data: {
            proposal_id: proposal.id,
            rkat_id: proposal.rkat_activity_id || proposal.jenis_permohonan || 'GENERAL',
            tanggal: new Date(),
            keterangan: formattedKeterangan,
            nrm: initialNrm
          }
        });

        // 3. Create Debit entry for this specific proposal
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: debitCoaCode,
            debit: new Prisma.Decimal(nominal),
            kredit: new Prisma.Decimal(0.00),
            account_id: null
          }
        });

        // 4. Create Kredit entry for this specific proposal
        const kreditCoaCode = account.coa_code || account.coa?.coa_code || '1110101';
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: kreditCoaCode,
            debit: new Prisma.Decimal(0.00),
            kredit: new Prisma.Decimal(nominal),
            account_id: selectedAccountId
          }
        });

        // Update proposal status to Realisasi_Bantuan so it proceeds to Realisasi Bantuan queue
        await tx.proposal.update({
          where: { id: proposal.id } as any,
          data: { status: 'Realisasi_Bantuan' }
        });
      }

      return { success: true, message: `${proposals.length} Pencairan Berhasil & Jurnal Akuntansi Otomatis Terbentuk!` };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 6. Tarik Tunai Split (Replenishment Laci)
// ==========================================

export const executeReplenishment = async (req: Request, res: Response) => {
  try {
    const { sourceBankId, allocations, keterangan } = req.body;
    // allocations array format: [{ targetAccountId: '...', nominal: 1000000 }]
    if (!sourceBankId || !allocations || !Array.isArray(allocations)) {
      res.status(400).json({ error: 'Bank sumber dan daftar alokasi wajib diisi' });
      return;
    }

    const totalDitarik = allocations.reduce((sum, item) => sum + Number(item.nominal), 0);

    const result = await prisma.$transaction(async (tx) => {
      const bankSumber = await tx.bankAccount.findUnique({
        where: { account_id: sourceBankId } as any
      }) as any;

      if (!bankSumber || bankSumber.tipe_kas !== 'BANK') {
        throw new Error('Bank sumber tidak valid atau bukan bertipe BANK');
      }

      if (Number(bankSumber.saldo) < totalDitarik) {
        throw new Error(`Saldo Bank tidak mencukupi untuk melakukan penarikan! Tersedia: ${bankSumber.saldo}, Penarikan: ${totalDitarik}`);
      }

      // 1. Potong Saldo Bank Sumber
      await tx.bankAccount.update({
        where: { account_id: sourceBankId } as any,
        data: {
          saldo: { decrement: new Prisma.Decimal(totalDitarik) }
        }
      });

      // 2. Buat Master Mutasi Kas
      const mutation = await tx.cashMutation.create({
        data: {
          source_account_id: sourceBankId,
          nominal_total: new Prisma.Decimal(totalDitarik),
          tanggal: new Date(),
          keterangan: keterangan || `[Mutasi Internal] Tarik Tunai dari ${bankSumber.nama_akun}`
        }
      });

      // 3. Catat Transaksi Realisasi Global
      const realisasiTrx = await tx.realisasi.create({
        data: {
          tanggal: new Date(),
          keterangan: `[Mutasi Internal] Tarik Tunai dari ${bankSumber.nama_akun} ke Laci Kasir`
        }
      });

      // 4. Jurnal Kredit untuk Bank Sumber
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasiTrx.transaksi_id,
          coa_code: bankSumber.coa_code,
          debit: new Prisma.Decimal(0.00),
          kredit: new Prisma.Decimal(totalDitarik),
          account_id: sourceBankId
        }
      });

      // 5. Loop Alokasi Laci Kasir (Debit)
      for (const alloc of allocations) {
        const laciTujuan = await tx.bankAccount.findUnique({
          where: { account_id: alloc.targetAccountId } as any
        }) as any;

        if (!laciTujuan || laciTujuan.tipe_kas !== 'TUNAI') {
          throw new Error('Laci kasir tujuan tidak valid atau bukan bertipe TUNAI');
        }

        // Tambah saldo ke laci tujuan
        await tx.bankAccount.update({
          where: { account_id: alloc.targetAccountId } as any,
          data: {
            saldo: { increment: new Prisma.Decimal(alloc.nominal) }
          }
        });

        // Simpan rincian mutasi split
        await tx.cashMutationDetail.create({
          data: {
            mutation_id: mutation.mutation_id,
            target_account_id: alloc.targetAccountId,
            nominal_alokasi: new Prisma.Decimal(alloc.nominal)
          }
        });

        // Jurnal Debet untuk masing-masing laci
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: laciTujuan.coa_code,
            debit: new Prisma.Decimal(alloc.nominal),
            kredit: new Prisma.Decimal(0.00),
            account_id: alloc.targetAccountId
          }
        });
      }

      return { success: true, message: 'Mutasi Tarik Tunai & Jurnal Double-Entry Berhasil!' };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 7. General Journal Ledger View API
// ==========================================

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page, limit, search, coaCodes } = req.query;

    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.realisasi = whereClause.realisasi || {};
      if (startDate) {
        whereClause.realisasi.tanggal = {
          ...whereClause.realisasi.tanggal,
          gte: new Date(`${startDate}T00:00:00.000Z`)
        };
      }
      if (endDate) {
        whereClause.realisasi.tanggal = {
          ...whereClause.realisasi.tanggal,
          lte: new Date(`${endDate}T23:59:59.999Z`)
        };
      }
    }

    if (coaCodes) {
      const codes = String(coaCodes).split(',').map(c => c.trim()).filter(Boolean);
      if (codes.length > 0) {
        whereClause.coa_code = { in: codes };
      }
    }

    if (search) {
      const searchStr = String(search).trim();
      if (searchStr) {
        whereClause.OR = [
          { coa_code: { contains: searchStr } },
          { coa: { nama_akun: { contains: searchStr } } },
          { account: { nama_akun: { contains: searchStr } } },
          { realisasi: { keterangan: { contains: searchStr } } }
        ];
      }
    }

    const isAll = String(limit).toLowerCase() === 'all';
    const pageNum = parseInt(String(page || 1), 10) || 1;
    const limitNum = isAll ? 1000000 : (parseInt(String(limit || 20), 10) || 20);
    const skip = isAll ? 0 : (pageNum - 1) * limitNum;

    const [entries, totalCount, aggregateSum] = await Promise.all([
      prisma.journalEntry.findMany({
        where: whereClause,
        include: {
          realisasi: true,
          coa: true,
          account: true
        },
        orderBy: [
          {
            realisasi: {
              tanggal: 'desc'
            }
          },
          {
            realisasi: {
              createdAt: 'desc'
            }
          },
          {
            debit: 'desc'
          }
        ],
        skip,
        take: limitNum
      }),
      prisma.journalEntry.count({ where: whereClause }),
      prisma.journalEntry.aggregate({
        where: whereClause,
        _sum: {
          debit: true,
          kredit: true
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      data: entries,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages
      },
      summary: {
        totalDebit: Number(aggregateSum._sum.debit || 0),
        totalKredit: Number(aggregateSum._sum.kredit || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const getCoaSummaries = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.realisasi = {};
      if (startDate) {
        whereClause.realisasi.tanggal = {
          gte: new Date(`${startDate}T00:00:00.000Z`)
        };
      }
      if (endDate) {
        whereClause.realisasi.tanggal = {
          ...whereClause.realisasi.tanggal,
          lte: new Date(`${endDate}T23:59:59.999Z`)
        };
      }
    }

    const grouped = await prisma.journalEntry.groupBy({
      by: ['coa_code'],
      where: whereClause,
      _sum: {
        debit: true,
        kredit: true
      }
    });

    const summaryMap: Record<string, { debit: number; kredit: number }> = {};
    grouped.forEach(item => {
      summaryMap[item.coa_code] = {
        debit: Number(item._sum.debit || 0),
        kredit: Number(item._sum.kredit || 0)
      };
    });

    res.status(200).json(summaryMap);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 8. Create Manual Expense (Non-Proposal)
// ==========================================
export const createManualExpense = async (req: Request, res: Response) => {
  try {
    const { sourceAccountId, type, nominal, judul, keterangan, tanggalTransaksi, tanggalCatatan, kategoriBiaya } = req.body;

    if (!sourceAccountId || !type || !nominal || Number(nominal) <= 0 || (!judul && !keterangan)) {
      res.status(400).json({ error: 'Sumber dana, jenis transaksi, nominal, dan judul pengeluaran wajib diisi' });
      return;
    }

    if (type !== 'KREDIT') {
      res.status(400).json({ error: 'Pencatatan manual hanya mendukung transaksi Pengeluaran (KREDIT)' });
      return;
    }

    // Dapatkan akun kas sumber untuk memastikan eksistensinya dan harus bertipe TUNAI
    const sourceAccount = await prisma.bankAccount.findUnique({
      where: { account_id: sourceAccountId } as any
    }) as any;

    if (!sourceAccount) {
      res.status(404).json({ error: 'Akun sumber dana tidak ditemukan' });
      return;
    }

    if (sourceAccount.tipe_kas !== 'TUNAI') {
      res.status(400).json({ error: 'Pencatatan manual hanya diperbolehkan menggunakan Kas (Tunai), bukan Bank' });
      return;
    }

    // Path ke file mutations.json
    const mutationsFilePath = path.join(__dirname, '../data/mutations.json');

    // Baca data yang sudah ada
    let mutations: any[] = [];
    try {
      const dir = path.dirname(mutationsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(mutationsFilePath)) {
        const content = fs.readFileSync(mutationsFilePath, 'utf-8');
        mutations = JSON.parse(content || '[]');
      }
    } catch (readErr) {
      console.error('Error reading mutations file in createManualExpense:', readErr);
    }

    const tglTx = tanggalTransaksi || new Date().toISOString().split('T')[0];
    const tglCatat = tanggalCatatan || new Date().toISOString().split('T')[0];
    const judulPengeluaran = (judul && judul.trim()) ? judul.trim() : (keterangan ? keterangan.trim() : 'Pengeluaran Kas');

    const newDraft = {
      id: `mut-${Date.now()}`,
      tanggalCatatan: tglCatat,
      tanggal: tglTx,
      bankAccountId: sourceAccountId,
      bankName: sourceAccount.nama_akun,
      judul: judulPengeluaran,
      keterangan: keterangan ? keterangan.trim() : '',
      keteranganBank: judulPengeluaran,
      nominal: Number(nominal),
      type: 'KREDIT', // Selalu KREDIT (Pengeluaran)
      status: 'PENDING',
      kategori_biaya: kategoriBiaya || 'Lain-lain'
    };

    mutations.push(newDraft);

    // Tulis kembali ke file
    fs.writeFileSync(mutationsFilePath, JSON.stringify(mutations, null, 2), 'utf-8');

    res.status(200).json({
      success: true,
      message: `Pengeluaran manual kas berhasil dicatat sebagai draft gantung untuk diverifikasi tim Pelaporan!`,
      draftId: newDraft.id
    });
  } catch (error) {
    console.error('Error in createManualExpense:', error);
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 9. Ledger Balancing & Health Check API
// ==========================================
export const checkLedgerHealth = async (req: Request, res: Response) => {
  try {
    // 1. Overall ledger totals using aggregation
    const overallAgg = await prisma.journalEntry.aggregate({
      _sum: {
        debit: true,
        kredit: true
      }
    });

    const totalDebit = Number(overallAgg._sum.debit || 0);
    const totalKredit = Number(overallAgg._sum.kredit || 0);

    // 2. Find unbalanced transactions using aggregation
    const unbalancedGroups = await prisma.journalEntry.groupBy({
      by: ['transaksi_id'],
      _sum: {
        debit: true,
        kredit: true
      }
    });

    const unbalancedTxIds = unbalancedGroups
      .filter(g => Math.abs(Number(g._sum.debit || 0) - Number(g._sum.kredit || 0)) > 0.01)
      .map(g => g.transaksi_id);

    const unbalancedTransactions = [];
    if (unbalancedTxIds.length > 0) {
      const unbalancedTxDetails = await prisma.realisasi.findMany({
        where: { transaksi_id: { in: unbalancedTxIds } },
        include: { journalEntries: true }
      });
      for (const tx of unbalancedTxDetails) {
        const debit = tx.journalEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
        const kredit = tx.journalEntries.reduce((sum, e) => sum + Number(e.kredit || 0), 0);
        unbalancedTransactions.push({
          transaksi_id: tx.transaksi_id,
          keterangan: tx.keterangan,
          tanggal: tx.tanggal,
          debit,
          kredit,
          difference: Math.abs(debit - kredit)
        });
      }
    }

    // 3. Bank reconciliation check using aggregation
    const accounts = await prisma.bankAccount.findMany({
      include: { coa: true }
    });

    const bankAggregates = await prisma.journalEntry.groupBy({
      by: ['account_id'],
      _sum: {
        debit: true,
        kredit: true
      },
      where: {
        account_id: { not: null }
      }
    });

    const bankAggMap: Record<string, { debit: number; kredit: number }> = {};
    for (const agg of bankAggregates) {
      if (agg.account_id) {
        bankAggMap[agg.account_id] = {
          debit: Number(agg._sum.debit || 0),
          kredit: Number(agg._sum.kredit || 0)
        };
      }
    }

    const bankChecks = [];
    for (const acc of accounts) {
      const agg = bankAggMap[acc.account_id] || { debit: 0, kredit: 0 };
      const accDebit = agg.debit;
      const accKredit = agg.kredit;
      const calculatedBalance = Number(acc.coa?.saldo_awal || 0) + accDebit - accKredit;
      const currentSaldo = Number(acc.saldo || 0);
      const difference = Math.abs(calculatedBalance - currentSaldo);

      bankChecks.push({
        account_id: acc.account_id,
        nama_akun: acc.nama_akun,
        tipe_kas: acc.tipe_kas,
        coa_code: acc.coa_code,
        saldo_awal: Number(acc.coa?.saldo_awal || 0),
        totalDebit: accDebit,
        totalKredit: accKredit,
        calculatedBalance,
        currentSaldo,
        difference,
        isMatch: difference < 0.01
      });
    }

    const isSystemHealthy = unbalancedTransactions.length === 0 && bankChecks.every(b => b.isMatch) && Math.abs(totalDebit - totalKredit) < 0.01;

    res.status(200).json({
      success: true,
      health: {
        isSystemHealthy,
        overall: {
          totalDebit,
          totalKredit,
          difference: Math.abs(totalDebit - totalKredit),
          isBalanced: Math.abs(totalDebit - totalKredit) < 0.01
        },
        unbalancedTransactions,
        bankChecks
      }
    });
  } catch (error) {
    console.error('Error checking ledger health:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const syncBankBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.bankAccount.findMany({ include: { coa: true } });
    const bankAggregates = await prisma.journalEntry.groupBy({
      by: ['account_id'],
      _sum: { debit: true, kredit: true },
      where: { account_id: { not: null } }
    });

    const bankAggMap: Record<string, { debit: number; kredit: number }> = {};
    for (const agg of bankAggregates) {
      if (agg.account_id) {
        bankAggMap[agg.account_id] = {
          debit: Number(agg._sum.debit || 0),
          kredit: Number(agg._sum.kredit || 0)
        };
      }
    }

    let updatedCount = 0;
    for (const acc of accounts) {
      const agg = bankAggMap[acc.account_id] || { debit: 0, kredit: 0 };
      const accDebit = agg.debit;
      const accKredit = agg.kredit;
      const calculatedBalance = Number(acc.coa?.saldo_awal || 0) + accDebit - accKredit;

      await prisma.bankAccount.update({
        where: { account_id: acc.account_id },
        data: { saldo: calculatedBalance }
      });
      updatedCount++;
    }

    res.status(200).json({ status: 'success', message: `Berhasil menyelaraskan ${updatedCount} saldo akun kas & bank dengan Buku Besar.` });
  } catch (error) {
    console.error('Error syncing bank balances:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const getReplenishments = async (req: Request, res: Response) => {
  try {
    const list = await prisma.cashMutation.findMany({
      include: {
        sourceAccount: true,
        details: {
          include: {
            targetAccount: true
          }
        }
      },
      orderBy: {
        tanggal: 'desc'
      }
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const migrateBukuBesar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactions, force, allowDuplicates } = req.body;
    const shouldSkipDeduplication = force === true || allowDuplicates === true;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ error: 'Data transaksi tidak ditemukan atau kosong' });
      return;
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // Pre-fetch all bank accounts to cache them in memory and avoid querying the DB for every row
    const bankAccounts = await prisma.bankAccount.findMany();
    const bankAccountMap = new Map(bankAccounts.map(b => [String(b.coa_code).trim(), b.account_id]));

    // Pre-fetch candidate realisasi records for all dates present in the batch
    const dates = transactions
      .map(t => t.tanggal ? new Date(t.tanggal) : null)
      .filter((d): d is Date => d !== null);

    const candidateRealisasis = await prisma.realisasi.findMany({
      where: {
        tanggal: { in: dates }
      },
      include: {
        journalEntries: true
      }
    });

    const itemsToInsert: any[] = [];

    for (const row of transactions) {
      const rowNum = row.rowNum || 'Unknown';
      if (!row.tanggal || !row.nominal || !row.coa_debit || !row.coa_kredit) {
        errors.push({
          rowNum,
          keterangan: row.keterangan || 'N/A',
          error: 'Kolom penting (tanggal, nominal, coa_debit, coa_kredit) tidak lengkap.'
        });
        continue;
      }

      const coaDebitStr = String(row.coa_debit).trim();
      const coaKreditStr = String(row.coa_kredit).trim();
      const rowDate = new Date(row.tanggal).getTime();
      const rowKet = (row.keterangan || 'Transaksi Historis').trim();
      const rowNominal = Number(row.nominal);

      if (!shouldSkipDeduplication) {
        // Check deduplication in-memory using candidateRealisasis
        const existingTx = candidateRealisasis.find(tx => {
          const txDate = new Date(tx.tanggal).getTime();
          const txKet = (tx.keterangan || 'Transaksi Historis').trim();
          if (txDate !== rowDate || txKet !== rowKet) {
            return false;
          }
          
          const hasDebitMatch = tx.journalEntries.some(
            e => e.coa_code === coaDebitStr && Number(e.debit) === rowNominal
          );
          const hasCreditMatch = tx.journalEntries.some(
            e => e.coa_code === coaKreditStr && Number(e.kredit) === rowNominal
          );
          
          return hasDebitMatch && hasCreditMatch;
        });

        if (existingTx) {
          skippedCount++;
          continue;
        }
      }

      itemsToInsert.push(row);
    }

    if (itemsToInsert.length > 0) {
      // Attempt single bulk transaction for maximum performance
      try {
        await prisma.$transaction(async (tx) => {
          for (const row of itemsToInsert) {
            const coaDebitStr = String(row.coa_debit).trim();
            const coaKreditStr = String(row.coa_kredit).trim();
            const nominalDecimal = new Prisma.Decimal(row.nominal);

            let debitAccountId = bankAccountMap.get(coaDebitStr) || null;
            let kreditAccountId = bankAccountMap.get(coaKreditStr) || null;

            if (row.bank_account_id) {
              const isKredit = String(row.tipe_mutasi).toUpperCase() === 'KREDIT';
              if (isKredit) {
                kreditAccountId = row.bank_account_id;
              } else {
                debitAccountId = row.bank_account_id;
              }
            }

            const realisasi = await tx.realisasi.create({
              data: {
                tanggal: new Date(row.tanggal),
                keterangan: row.keterangan || 'Transaksi Historis',
                nrm: row.nrm || null,
              }
            });

            await tx.journalEntry.create({
              data: {
                transaksi_id: realisasi.transaksi_id,
                coa_code: coaDebitStr,
                debit: nominalDecimal,
                kredit: new Prisma.Decimal(0.00),
                account_id: debitAccountId
              }
            });

            await tx.journalEntry.create({
              data: {
                transaksi_id: realisasi.transaksi_id,
                coa_code: coaKreditStr,
                debit: new Prisma.Decimal(0.00),
                kredit: nominalDecimal,
                account_id: kreditAccountId
              }
            });

            if (debitAccountId) {
              await tx.bankAccount.update({
                where: { account_id: debitAccountId } as any,
                data: {
                  saldo: { increment: nominalDecimal }
                }
              });
            }
            if (kreditAccountId) {
              await tx.bankAccount.update({
                where: { account_id: kreditAccountId } as any,
                data: {
                  saldo: { decrement: nominalDecimal }
                }
              });
            }
          }
        }, {
          maxWait: 15000,
          timeout: 30000
        });

        successCount += itemsToInsert.length;
      } catch (batchErr: any) {
        console.warn('Batch transaction failed, falling back to row-by-row processing:', batchErr);
        // Fallback to row-by-row transactions so valid rows still commit and bad ones are logged
        for (const row of itemsToInsert) {
          const rowNum = row.rowNum || 'Unknown';
          const coaDebitStr = String(row.coa_debit).trim();
          const coaKreditStr = String(row.coa_kredit).trim();
          const nominalDecimal = new Prisma.Decimal(row.nominal);

          try {
            await prisma.$transaction(async (tx) => {
              let debitAccountId = bankAccountMap.get(coaDebitStr) || null;
              let kreditAccountId = bankAccountMap.get(coaKreditStr) || null;

              if (row.bank_account_id) {
                const isKredit = String(row.tipe_mutasi).toUpperCase() === 'KREDIT';
                if (isKredit) {
                  kreditAccountId = row.bank_account_id;
                } else {
                  debitAccountId = row.bank_account_id;
                }
              }

              const realisasi = await tx.realisasi.create({
                data: {
                  tanggal: new Date(row.tanggal),
                  keterangan: row.keterangan || 'Transaksi Historis',
                  nrm: row.nrm || null,
                }
              });

              await tx.journalEntry.create({
                data: {
                  transaksi_id: realisasi.transaksi_id,
                  coa_code: coaDebitStr,
                  debit: nominalDecimal,
                  kredit: new Prisma.Decimal(0.00),
                  account_id: debitAccountId
                }
              });

              await tx.journalEntry.create({
                data: {
                  transaksi_id: realisasi.transaksi_id,
                  coa_code: coaKreditStr,
                  debit: new Prisma.Decimal(0.00),
                  kredit: nominalDecimal,
                  account_id: kreditAccountId
                }
              });

              if (debitAccountId) {
                await tx.bankAccount.update({
                  where: { account_id: debitAccountId } as any,
                  data: {
                    saldo: { increment: nominalDecimal }
                  }
                });
              }
              if (kreditAccountId) {
                await tx.bankAccount.update({
                  where: { account_id: kreditAccountId } as any,
                  data: {
                    saldo: { decrement: nominalDecimal }
                  }
                });
              }
            }, {
              maxWait: 5000,
              timeout: 10000
            });

            successCount++;
          } catch (rowErr: any) {
            console.error(`Error migrating row ${rowNum} during fallback:`, rowErr);
            errors.push({
              rowNum,
              keterangan: row.keterangan || 'N/A',
              error: rowErr.message || String(rowErr)
});
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      successCount,
      skippedCount,
      failedCount: errors.length,
      errors,
      message: `Migrasi selesai: ${successCount} transaksi berhasil, ${skippedCount} dilewati (duplikat), ${errors.length} transaksi gagal.`
    });
  } catch (error) {
    console.error('Error migrating Buku Besar:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const createManualJournalEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tanggal, nominal, coa_debit, coa_kredit, keterangan, nrm } = req.body;

    if (!tanggal || !nominal || Number(nominal) <= 0 || !coa_debit || !coa_kredit || !keterangan) {
      res.status(400).json({ error: 'Tanggal, nominal (> 0), COA Debit, COA Kredit, dan Redaksi/Keterangan wajib diisi.' });
      return;
    }

    const coaDebitStr = String(coa_debit).trim();
    const coaKreditStr = String(coa_kredit).trim();

    if (coaDebitStr === coaKreditStr) {
      res.status(400).json({ error: 'Akun COA Debit dan Akun COA Kredit tidak boleh sama.' });
      return;
    }

    // Verify both COA exist
    const [foundDebitCoa, foundKreditCoa] = await Promise.all([
      prisma.chartOfAccounts.findUnique({ where: { coa_code: coaDebitStr } }),
      prisma.chartOfAccounts.findUnique({ where: { coa_code: coaKreditStr } })
    ]);

    if (!foundDebitCoa) {
      res.status(400).json({ error: `Akun COA Debit (${coaDebitStr}) tidak ditemukan dalam database.` });
      return;
    }

    if (!foundKreditCoa) {
      res.status(400).json({ error: `Akun COA Kredit (${coaKreditStr}) tidak ditemukan dalam database.` });
      return;
    }

    const bankAccounts = await prisma.bankAccount.findMany();
    const bankAccountMap = new Map(bankAccounts.map(b => [String(b.coa_code).trim(), b.account_id]));

    const debitAccountId = bankAccountMap.get(coaDebitStr) || null;
    const kreditAccountId = bankAccountMap.get(coaKreditStr) || null;
    const nominalDecimal = new Prisma.Decimal(nominal);

    // Ensure transaction timestamp preserves current time for accurate intra-day sorting
    let trxDate: Date;
    if (tanggal) {
      const now = new Date();
      const parts = String(tanggal).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        trxDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        trxDate = new Date(tanggal);
      }
    } else {
      trxDate = new Date();
    }

    const result = await prisma.$transaction(async (tx) => {
      const realisasi = await tx.realisasi.create({
        data: {
          tanggal: trxDate,
          keterangan: String(keterangan).trim(),
          nrm: nrm || null,
        }
      });

      const entryDebit = await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: coaDebitStr,
          debit: nominalDecimal,
          kredit: new Prisma.Decimal(0.00),
          account_id: debitAccountId
        }
      });

      const entryKredit = await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: coaKreditStr,
          debit: new Prisma.Decimal(0.00),
          kredit: nominalDecimal,
          account_id: kreditAccountId
        }
      });

      if (debitAccountId) {
        await tx.bankAccount.update({
          where: { account_id: debitAccountId } as any,
          data: {
            saldo: { increment: nominalDecimal }
          }
        });
      }
      if (kreditAccountId) {
        await tx.bankAccount.update({
          where: { account_id: kreditAccountId } as any,
          data: {
            saldo: { decrement: nominalDecimal }
          }
        });
      }

      return { realisasi, entryDebit, entryKredit };
    });

    res.status(201).json({
      status: 'success',
      message: 'Jurnal transaksi berhasil dicatat ke Buku Besar.',
      data: result
    });
  } catch (error) {
    console.error('Error in createManualJournalEntry:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const getTransitEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const results: any[] = [];

    // 1. Fetch from Prisma JournalEntry (COA 49000001)
    const transitCredits = await prisma.journalEntry.findMany({
      where: {
        coa_code: '49000001',
        kredit: { gt: 0 }
      },
      include: {
        realisasi: true,
        account: true
      },
      orderBy: {
        realisasi: { tanggal: 'desc' }
      }
    });

    for (const c of transitCredits) {
      const nominalAwal = Number(c.kredit || 0);

      // Check allocated receipts for this transit
      const linkedReceipts = await prisma.penerimaanZis.aggregate({
        where: {
          OR: [
            { no_kuitansi: { contains: c.transaksi_id } },
            { keterangan: { contains: c.transaksi_id } }
          ],
          status_simba: { not: 'FAILED' }
        },
        _sum: { nominal: true }
      });

      const allocated = Number(linkedReceipts._sum.nominal || 0);
      const sisa = Math.max(0, nominalAwal - allocated);

      if (sisa > 0.01) {
        results.push({
          transaksi_id: c.transaksi_id,
          tanggal: c.realisasi?.tanggal,
          keterangan: allocated > 0
            ? `${c.realisasi?.keterangan || 'Mutasi Transit'} (Sisa Potongan: Rp ${sisa.toLocaleString('id-ID')} / Total: Rp ${nominalAwal.toLocaleString('id-ID')})`
            : (c.realisasi?.keterangan || 'Mutasi Transit (Belum Teridentifikasi)'),
          nominal_awal: sisa,
          total_nominal_awal: nominalAwal,
          allocated_nominal: allocated,
          account_id: c.account_id,
          bank_account_name: c.account?.nama_akun || 'Bank',
          source: 'JOURNAL'
        });
      }
    }

    // 2. Fetch from mutations.json (Pending or Partial mutations with remaining balance)
    const jsonPath = path.join(__dirname, '../data/mutations.json');
    if (fs.existsSync(jsonPath)) {
      const muts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8') || '[]');
      let fileUpdated = false;
      
      for (const m of muts) {
        // STRICT RULE 1: Only DEBIT mutations (money in), NEVER KREDIT (money out)
        if (m.type === 'KREDIT') continue;

        // Dynamic DB Scan: Find all Realisasi linked to this mutation (nrm === m.id)
        const linkedRealisasi = await prisma.realisasi.findMany({
          where: { nrm: m.id },
          select: { transaksi_id: true }
        });
        const linkedTxIds = linkedRealisasi.map(r => r.transaksi_id);

        const linkedReceipts = linkedTxIds.length > 0
          ? await prisma.penerimaanZis.aggregate({
              where: {
                transaksi_id: { in: linkedTxIds },
                status_simba: { not: 'FAILED' }
              },
              _sum: { nominal: true }
            })
          : { _sum: { nominal: null } };

        const dbAllocated = Number(linkedReceipts._sum?.nominal || 0);
        const actualAllocated = dbAllocated;
        const totalNominal = Number(m.nominal || 0);
        const sisa = Math.max(0, totalNominal - actualAllocated);

        // Sync mutations.json state if needed
        if (actualAllocated !== Number(m.allocatedNominal || 0) || (sisa <= 0.01 && m.status !== 'RECONCILED') || (sisa > 0.01 && actualAllocated > 0 && m.status !== 'PARTIAL') || (actualAllocated <= 0.01 && m.status !== 'PENDING')) {
          m.allocatedNominal = actualAllocated;
          if (sisa <= 0.01) {
            m.status = 'RECONCILED';
          } else if (actualAllocated > 0) {
            m.status = 'PARTIAL';
          } else {
            m.status = 'PENDING';
          }
          fileUpdated = true;
        }

        // STRICT RULE 2: Only show UNIDENTIFIED or PARTIAL mutations with remaining balance > 0
        if (m.status === 'RECONCILED' || sisa <= 0.01) continue;

        if (!results.some(r => r.transaksi_id === m.id)) {
          results.push({
            transaksi_id: m.id,
            tanggal: m.tanggal || m.tanggalCatatan,
            keterangan: actualAllocated > 0
              ? `${m.keteranganBank || 'Mutasi'} (Sisa Potongan: Rp ${sisa.toLocaleString('id-ID')} / Total: Rp ${totalNominal.toLocaleString('id-ID')})`
              : (m.keteranganBank || 'Mutasi Belum Teridentifikasi'),
            nominal_awal: sisa,
            total_nominal_awal: totalNominal,
            allocated_nominal: actualAllocated,
            account_id: m.bankAccountId,
            bank_account_name: m.bankName || 'Bank Jateng',
            source: 'MUTATION_JSON'
          });
        }
      }

      if (fileUpdated) {
        try {
          fs.writeFileSync(jsonPath, JSON.stringify(muts, null, 2), 'utf-8');
        } catch (fErr) {
          console.error('Error auto-syncing mutations.json:', fErr);
        }
      }
    }

    res.status(200).json({ status: 'success', data: results });
  } catch (error: any) {
    console.error('Error fetching transit entries:', error);
    res.status(500).json({ status: 'error', error: error.message || String(error) });
  }
};

export const getProposalJournalDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proposalId } = req.params;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId } as any,
      include: { program: true, mustahik: true } as any
    }) as any;

    if (!proposal) {
      res.status(404).json({ error: 'Proposal tidak ditemukan' });
      return;
    }

    // 1. Find existing Realisasi & Journal Entries
    const realisasi = await prisma.realisasi.findFirst({
      where: {
        OR: [
          { proposal_id: proposal.id },
          ...(proposal.nama_pemohon ? [{ keterangan: { contains: proposal.nama_pemohon } }] : [])
        ]
      },
      include: {
        journalEntries: {
          include: {
            coa: true,
            account: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Resolve Debit & Kredit info
    let debitEntry: any = null;
    let kreditEntry: any = null;

    if (realisasi && realisasi.journalEntries && realisasi.journalEntries.length > 0) {
      const debit = realisasi.journalEntries.find(j => Number(j.debit) > 0);
      const kredit = realisasi.journalEntries.find(j => Number(j.kredit) > 0);

      if (debit) {
        debitEntry = {
          coa_code: debit.coa_code,
          coa_name: debit.coa?.nama_akun || 'Beban Penyaluran ZIS',
          nominal: Number(debit.debit),
          type: 'DEBIT'
        };
      }

      if (kredit) {
        kreditEntry = {
          coa_code: kredit.coa_code,
          coa_name: kredit.coa?.nama_akun || (kredit.account?.nama_akun ? `Kas/Bank - ${kredit.account.nama_akun}` : 'Kas & Setara Kas'),
          account_id: kredit.account_id,
          nama_akun: kredit.account?.nama_akun || null,
          no_rekening: kredit.account?.no_rekening || null,
          nominal: Number(kredit.kredit),
          type: 'KREDIT'
        };
      }
    }

    // Fallback: If no journal entry yet or missing debit info, resolve from CoaMappingRule
    if (!debitEntry) {
      const resolved = await resolveDisbursementCoa(proposal, null, prisma);
      const coaRec = await prisma.chartOfAccounts.findFirst({
        where: { coa_code: resolved.debitCoaCode }
      });

      debitEntry = {
        coa_code: resolved.debitCoaCode,
        coa_name: coaRec?.nama_akun || 'Beban Penyaluran ZIS (Mapping Otomatis)',
        nominal: Number(proposal.nominal || 0),
        type: 'DEBIT',
        is_estimated: true
      };
    }

    res.status(200).json({
      status: 'success',
      data: {
        proposal_id: proposal.id,
        agenda_no: proposal.agenda_no,
        nama_pemohon: proposal.nama_pemohon,
        asnaf: proposal.asnaf,
        nominal: Number(proposal.nominal || 0),
        realisasi: realisasi ? {
          transaksi_id: realisasi.transaksi_id,
          tanggal: realisasi.tanggal,
          createdAt: realisasi.createdAt,
          keterangan: realisasi.keterangan,
          nrm: realisasi.nrm
        } : null,
        debit: debitEntry,
        kredit: kreditEntry,
        journal_entries: realisasi?.journalEntries || []
      }
    });
  } catch (error) {
    console.error('Error fetching proposal journal detail:', error);
    res.status(500).json({ error: String(error) });
  }
};



