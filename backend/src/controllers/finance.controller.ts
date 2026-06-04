import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// ==========================================
// 1. Chart of Accounts (COA) Controllers
// ==========================================

export const getCOAs = async (req: Request, res: Response) => {
  try {
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
    const { coa_code, nama_akun, klasifikasi, tipe_dana } = req.body;
    if (!coa_code || !nama_akun) {
      res.status(400).json({ error: 'Kode COA dan Nama Akun wajib diisi' });
      return;
    }
    const coa = await prisma.chartOfAccounts.upsert({
      where: { coa_code },
      update: { nama_akun, klasifikasi, tipe_dana },
      create: { coa_code, nama_akun, klasifikasi, tipe_dana }
    });
    res.status(201).json(coa);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateCOA = async (req: Request, res: Response) => {
  try {
    const { coa_code } = req.params;
    const { nama_akun, klasifikasi, tipe_dana } = req.body;
    const coa = await prisma.chartOfAccounts.update({
      where: { coa_code } as any,
      data: { nama_akun, klasifikasi, tipe_dana }
    });
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
    const { nama_akun, tipe_kas, kelompok_dana, saldo, no_rekening, kode_laci, coa_code } = req.body;
    if (!nama_akun || !tipe_kas || !kelompok_dana || !coa_code) {
      res.status(400).json({ error: 'Nama, tipe kas, kelompok dana, dan COA wajib diisi' });
      return;
    }
    const account = await prisma.bankAccount.create({
      data: {
        nama_akun,
        tipe_kas,
        kelompok_dana,
        saldo: new Prisma.Decimal(saldo || 0),
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
    const { nama_akun, tipe_kas, kelompok_dana, saldo, no_rekening, kode_laci, coa_code } = req.body;
    const account = await prisma.bankAccount.update({
      where: { account_id: id } as any,
      data: {
        nama_akun,
        tipe_kas,
        kelompok_dana,
        saldo: saldo !== undefined ? new Prisma.Decimal(saldo) : undefined,
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
    const rule = await prisma.coaMappingRule.create({
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
    const { id } = req.params;
    await prisma.coaMappingRule.delete({ where: { rule_id: id } as any });
    res.status(204).send();
  } catch (error) {
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
      include: { program: true } as any
    }) as any;

    if (!proposal) {
      res.status(404).json({ error: 'Proposal tidak ditemukan' });
      return;
    }

    const rawProgramCode = proposal.jenis_permohonan || '';
    let activeProgramCode = rawProgramCode;
    if (rawProgramCode.includes('.')) {
      activeProgramCode = rawProgramCode.split('.')[0];
    }
    const proposalAsnaf = proposal.asnaf || 'Miskin';
    const amount = Number(proposal.nominal || 0);

    let targetProgram = proposal.program;
    if (!targetProgram || targetProgram.code !== activeProgramCode) {
      targetProgram = await prisma.program.findUnique({
        where: { code: activeProgramCode }
      });
    }

    // Robust variation-friendly tag logic
    let tag = 'ZAKAT';
    const rawTag = proposal.tipe_bantuan || proposal.rekomendasi_kabag || 'Zakat';
    if (rawTag === 'IST' || rawTag === 'Infak Terikat' || rawTag === 'INFAK_TERIKAT') {
      tag = 'INFAK_TERIKAT';
    } else if (rawTag === 'ISTT' || rawTag === 'Infak Tidak Terikat' || rawTag === 'INFAK_TIDAK_TERIKAT') {
      tag = 'INFAK_TIDAK_TERIKAT';
    } else if (rawTag === 'APBD') {
      tag = 'APBD';
    } else if (rawTag === 'AMIL') {
      tag = 'AMIL';
    } else {
      tag = 'ZAKAT';
    }

    let rkatSpesifik = {
      nama_kegiatan: 'Program Global (Belum Diatur)',
      asnaf: proposalAsnaf,
      total_pagu: 0,
      sisa_pagu: 0,
      status: 'OVER_BUDGET'
    };

    let rkatAlternatif = {
      nama_kegiatan: 'Program Global (Alternatif)',
      asnaf: 'Semua Asnaf',
      total_pagu: 0,
      sisa_pagu: 0,
      status: 'OVER_BUDGET'
    };

    let activitiesStatus: any[] = [];

    if (targetProgram) {
      const budgetGlobal = targetProgram.budget_rkat || 0;
      rkatSpesifik.total_pagu = budgetGlobal;
      rkatSpesifik.sisa_pagu = budgetGlobal;
      rkatSpesifik.nama_kegiatan = targetProgram.name;

      rkatAlternatif.total_pagu = budgetGlobal;
      rkatAlternatif.sisa_pagu = budgetGlobal;
      rkatAlternatif.nama_kegiatan = targetProgram.name;

      const rkatDetailsStr = targetProgram.rkat_details;
      if (rkatDetailsStr) {
        const details = typeof rkatDetailsStr === 'string'
          ? JSON.parse(rkatDetailsStr)
          : rkatDetailsStr;

        if (Array.isArray(details)) {
          // Pre-calculate real-time pagu and sisa for all activities
          for (const act of details) {
            const total = Number(act.mustahik || 0) * Number(act.frekuensi || 1) * Number(act.nominal || 0);
            const journalSum = await prisma.journalEntry.aggregate({
              _sum: { debit: true },
              where: {
                coa_code: { startsWith: '5' },
                realisasi: { rkat_id: act.id || '' }
              }
            });
            const terpakai = Number(journalSum._sum.debit || 0);
            const sisa = total - terpakai;
            activitiesStatus.push({
              id: act.id,
              name: act.name,
              keterangan: act.keterangan || '',
              asnaf: act.asnaf,
              nominal: Number(act.nominal || 0),
              mustahik: Number(act.mustahik || 0),
              frekuensi: Number(act.frekuensi || 1),
              total_pagu: total,
              terpakai_saat_ini: terpakai,
              sisa_pagu: sisa,
              status: sisa >= amount ? 'CUKUP' : 'OVER_BUDGET'
            });
          }

          // 1. Specific matching asnaf activity
          const matchedAct = details.find(
            d => d.id === proposal.rkat_activity_id || 
            (d.asnaf && d.asnaf.toLowerCase() === proposalAsnaf.toLowerCase())
          );

          if (matchedAct) {
            const total = Number(matchedAct.mustahik || 0) * Number(matchedAct.frekuensi || 1) * Number(matchedAct.nominal || 0);
            rkatSpesifik.total_pagu = total;
            rkatSpesifik.nama_kegiatan = matchedAct.name || targetProgram.name;
            rkatSpesifik.asnaf = matchedAct.asnaf || proposalAsnaf;

            // Sum debits for matched asnaf
            const journalSumSpesifik = await prisma.journalEntry.aggregate({
              _sum: { debit: true },
              where: {
                coa_code: { startsWith: '5' },
                realisasi: { rkat_id: matchedAct.id || activeProgramCode || '' }
              }
            });
            const realisasiSpesifik = Number(journalSumSpesifik._sum.debit || 0);
            rkatSpesifik.sisa_pagu = total - realisasiSpesifik;
            rkatSpesifik.status = rkatSpesifik.sisa_pagu >= amount ? 'CUKUP' : 'OVER_BUDGET';
          } else {
            // Fallback global sum
            const journalSumSpesifik = await prisma.journalEntry.aggregate({
              _sum: { debit: true },
              where: {
                coa_code: { startsWith: '5' },
                realisasi: { rkat_id: activeProgramCode || '' }
              }
            });
            const realisasiSpesifik = Number(journalSumSpesifik._sum.debit || 0);
            rkatSpesifik.sisa_pagu = budgetGlobal - realisasiSpesifik;
            rkatSpesifik.status = rkatSpesifik.sisa_pagu >= amount ? 'CUKUP' : 'OVER_BUDGET';
          }

          // 2. Alternative global asnaf activity
          const altAct = details.find(d => !d.asnaf || d.asnaf.toLowerCase() === 'semua' || d.asnaf.toLowerCase() === 'semua asnaf');
          if (altAct) {
            const total = Number(altAct.mustahik || 0) * Number(altAct.frekuensi || 1) * Number(altAct.nominal || 0);
            rkatAlternatif.total_pagu = total;
            rkatAlternatif.nama_kegiatan = altAct.name || targetProgram.name;
            rkatAlternatif.asnaf = 'Semua Asnaf';

            // Sum debits for global asnaf alternative
            const journalSumAlt = await prisma.journalEntry.aggregate({
              _sum: { debit: true },
              where: {
                coa_code: { startsWith: '5' },
                realisasi: { rkat_id: altAct.id || activeProgramCode || '' }
              }
            });
            const realisasiAlt = Number(journalSumAlt._sum.debit || 0);
            rkatAlternatif.sisa_pagu = total - realisasiAlt;
            rkatAlternatif.status = rkatAlternatif.sisa_pagu >= amount ? 'CUKUP' : 'OVER_BUDGET';
          } else {
            // Fallback global program
            const journalSumAlt = await prisma.journalEntry.aggregate({
              _sum: { debit: true },
              where: {
                coa_code: { startsWith: '5' },
                realisasi: { rkat_id: activeProgramCode || '' }
              }
            });
            const realisasiAlt = Number(journalSumAlt._sum.debit || 0);
            rkatAlternatif.sisa_pagu = budgetGlobal - realisasiAlt;
            rkatAlternatif.status = rkatAlternatif.sisa_pagu >= amount ? 'CUKUP' : 'OVER_BUDGET';
          }
        }
      }
    }

    // 2. Sum physical bank/cash accounts matching the tag
    const accountsSum = await prisma.bankAccount.aggregate({
      _sum: { saldo: true },
      where: { kelompok_dana: tag }
    });
    const totalSaldoKasRiil = Number(accountsSum._sum.saldo || 0);

    // Sum details for ZAKAT, ISTT, IST
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
      nama_program: targetProgram?.name || 'Program Penyaluran',
      sumber_dana_yang_dipakai: tag,
      proposal_nominal: amount,
      proposal_asnaf: proposalAsnaf,
      rkat_spesifik: rkatSpesifik,
      rkat_alternatif: rkatAlternatif,
      rkat_activities: activitiesStatus,
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
    const rkatStatusMap = new Map<string, { total_pagu: number; terpakai_saat_ini: number; sisa_pagu: number; name: string }>();
    const proposalDetails = [];

    let detectedTag = 'ZAKAT';

    for (const id of proposalIds) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: id } as any,
        include: { program: true } as any
      }) as any;

      if (!proposal) continue;

      const amount = Number(proposal.nominal || 0);
      totalAmount += amount;

      let tag = 'ZAKAT';
      const rawTag = proposal.tipe_bantuan || proposal.rekomendasi_kabag || 'Zakat';
      if (rawTag === 'IST' || rawTag === 'Infak Terikat' || rawTag === 'INFAK_TERIKAT') {
        tag = 'INFAK_TERIKAT';
      } else if (rawTag === 'ISTT' || rawTag === 'Infak Tidak Terikat' || rawTag === 'INFAK_TIDAK_TERIKAT') {
        tag = 'INFAK_TIDAK_TERIKAT';
      } else if (rawTag === 'APBD') {
        tag = 'APBD';
      } else if (rawTag === 'AMIL') {
        tag = 'AMIL';
      } else {
        tag = 'ZAKAT';
      }
      
      detectedTag = tag;

      const rawProgramCode = proposal.jenis_permohonan || '';
      let activeProgramCode = rawProgramCode;
      if (rawProgramCode.includes('.')) {
        activeProgramCode = rawProgramCode.split('.')[0];
      }
      
      let targetProgram = proposal.program;
      if (!targetProgram || targetProgram.code !== activeProgramCode) {
        targetProgram = await prisma.program.findUnique({
          where: { code: activeProgramCode }
        });
      }

      if (targetProgram) {
        const rkatDetailsStr = targetProgram.rkat_details;
        if (rkatDetailsStr) {
          const details = typeof rkatDetailsStr === 'string'
            ? JSON.parse(rkatDetailsStr)
            : rkatDetailsStr;

          if (Array.isArray(details)) {
            const matchedAct = details.find(
              d => d.id === proposal.rkat_activity_id || 
              (d.asnaf && d.asnaf.toLowerCase() === (proposal.asnaf || 'miskin').toLowerCase())
            );

            if (matchedAct) {
              const actId = matchedAct.id;
              const total = Number(matchedAct.mustahik || 0) * Number(matchedAct.frekuensi || 1) * Number(matchedAct.nominal || 0);
              
              if (!rkatStatusMap.has(actId)) {
                const journalSum = await prisma.journalEntry.aggregate({
                  _sum: { debit: true },
                  where: {
                    coa_code: { startsWith: '5' },
                    realisasi: { rkat_id: actId }
                  }
                });
                const terpakai = Number(journalSum._sum.debit || 0);
                rkatStatusMap.set(actId, {
                  total_pagu: total,
                  terpakai_saat_ini: terpakai,
                  sisa_pagu: total - terpakai,
                  name: matchedAct.name || targetProgram.name
                });
              }
            }
          }
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

      let fundSource = 'ZAKAT';
      const possibleSources = [proposal.rekomendasi_kabag, proposal.tipe_bantuan];
      for (const src of possibleSources) {
        if (!src) continue;
        const normalized = src.toUpperCase().trim();
        if (normalized.includes('ZAKAT')) {
          fundSource = 'ZAKAT';
          break;
        } else if (normalized.includes('INFAK_TERIKAT') || normalized.includes('TERIKAT') || normalized === 'IST') {
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
        }
      }

      const rules = await prisma.coaMappingRule.findMany({
        where: {
          program_code: proposal.jenis_permohonan || '',
          tipe_kas: account.tipe_kas,
          sumber_dana_tag: fundSource
        }
      });

      let mappingRule = null;
      if (proposal.asnaf) {
        const normAsnaf = proposal.asnaf.toLowerCase().trim();
        mappingRule = rules.find(r => r.asnaf_id && r.asnaf_id.toLowerCase().trim() === normAsnaf);
      }

      if (!mappingRule) {
        await prisma.chartOfAccounts.upsert({
          where: { coa_code: '519999999' } as any,
          update: {},
          create: {
            coa_code: '519999999',
            nama_akun: 'Penyaluran Lain-lain (Emergency Fallback)',
            klasifikasi: 'Beban',
            tipe_dana: 'ZAKAT'
          } as any
        });
      }

      const debitCoaCode = mappingRule ? mappingRule.debit_coa_code : '519999999';
      const debitCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: debitCoaCode } as any });
      
      const programName = proposal.program?.name || proposal.jenis_permohonan || 'Bantuan';
      const formattedKeterangan = `Bantuan ${programName.replace(/^Bantuan\s+/i, '')} an. ${proposal.nama_pemohon}`;

      debitEntries.push({
        coa_code: debitCoaCode,
        nama_akun: `${debitCoa ? debitCoa.nama_akun : 'Penyaluran Lainnya (Kategori Darurat)'} (${formattedKeterangan})`,
        nominal
      });

      const kreditCoaCode = account.coa_code;
      const kreditCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: kreditCoaCode } as any });

      kreditEntries.push({
        coa_code: kreditCoaCode,
        nama_akun: `${kreditCoa ? kreditCoa.nama_akun : account.nama_akun} (${formattedKeterangan})`,
        nominal
      });
    }

    const kreditCoaCode = account.coa_code;
    const kreditCoa = await prisma.chartOfAccounts.findUnique({ where: { coa_code: kreditCoaCode } as any });

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
        nama_akun: kreditCoa ? kreditCoa.nama_akun : account.nama_akun
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
          include: { program: true }
        }) as any;
        if (!proposal) {
          throw new Error(`Proposal dengan ID ${id} tidak ditemukan`);
        }
        proposals.push(proposal);
        totalNominal += Number(proposal.nominal || 0);
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

      // 1. Decrement account balance by total nominal
      await tx.bankAccount.update({
        where: { account_id: selectedAccountId } as any,
        data: {
          saldo: { decrement: new Prisma.Decimal(totalNominal) }
        }
      });

      // 2. Loop through each proposal to create separate Realisasi and journal entries (1 debit + 1 credit per proposal)
      for (const proposal of proposals) {
        const nominal = Number(proposal.nominal || 0);
        
        let fundSource = 'ZAKAT';
        const possibleSources = [proposal.rekomendasi_kabag, proposal.tipe_bantuan];
        for (const src of possibleSources) {
          if (!src) continue;
          const normalized = src.toUpperCase().trim();
          if (normalized.includes('ZAKAT')) {
            fundSource = 'ZAKAT';
            break;
          } else if (normalized.includes('INFAK_TERIKAT') || normalized.includes('TERIKAT') || normalized === 'IST') {
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
          }
        }

        const rules = await tx.coaMappingRule.findMany({
          where: {
            program_code: proposal.jenis_permohonan || '',
            tipe_kas: account.tipe_kas,
            sumber_dana_tag: fundSource
          }
        });

        let mappingRule = null;
        if (proposal.asnaf) {
          const normAsnaf = proposal.asnaf.toLowerCase().trim();
          mappingRule = rules.find(r => r.asnaf_id && r.asnaf_id.toLowerCase().trim() === normAsnaf);
        }

        if (!mappingRule) {
          await tx.chartOfAccounts.upsert({
            where: { coa_code: '519999999' } as any,
            update: {},
            create: {
              coa_code: '519999999',
              nama_akun: 'Penyaluran Lain-lain (Emergency Fallback)',
              klasifikasi: 'Beban',
              tipe_dana: 'ZAKAT'
            } as any
          });
        }

        const debitCoaCode = mappingRule ? mappingRule.debit_coa_code : '519999999';

        const programName = proposal.program?.name || proposal.jenis_permohonan || 'Bantuan';
        const formattedKeterangan = `Bantuan ${programName.replace(/^Bantuan\s+/i, '')} an. ${proposal.nama_pemohon}`;

        // Create Realisasi record for this individual proposal
        const realisasiTrx = await tx.realisasi.create({
          data: {
            proposal_id: proposal.id,
            rkat_id: proposal.rkat_activity_id || proposal.jenis_permohonan || 'GENERAL',
            tanggal: new Date(),
            keterangan: formattedKeterangan
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
        const kreditCoaCode = account.coa_code;
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: kreditCoaCode,
            debit: new Prisma.Decimal(0.00),
            kredit: new Prisma.Decimal(nominal),
            account_id: selectedAccountId
          }
        });

        // Update proposal status
        await tx.proposal.update({
          where: { id: proposal.id } as any,
          data: { status: 'Selesai & Arsip' }
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
    const entries = await prisma.journalEntry.findMany({
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
        }
      ]
    });
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// ==========================================
// 8. Create Manual Expense (Non-Proposal)
// ==========================================
export const createManualExpense = async (req: Request, res: Response) => {
  try {
    const { sourceAccountId, type, nominal, keterangan, tanggalTransaksi, tanggalCatatan } = req.body;

    if (!sourceAccountId || !type || !nominal || Number(nominal) <= 0 || !keterangan) {
      res.status(400).json({ error: 'Sumber dana, jenis transaksi (Kredit/Pengeluaran), nominal, dan keterangan wajib diisi' });
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

    const newDraft = {
      id: `mut-${Date.now()}`,
      tanggalCatatan: tglCatat,
      tanggal: tglTx,
      bankAccountId: sourceAccountId,
      bankName: sourceAccount.nama_akun,
      keteranganBank: keterangan.trim(),
      nominal: Number(nominal),
      type: 'KREDIT', // Selalu KREDIT (Pengeluaran)
      status: 'PENDING'
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
