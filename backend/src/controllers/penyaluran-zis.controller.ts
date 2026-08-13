import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';
import { syncRealisasiFromProposal } from './proposal.controller';

export const getPenyaluranZis = async (req: Request, res: Response): Promise<void> => {
  try {
    const ALLOWED_STATUS_LIST = [
      'ACC',
      'Pencairan_Dana',
      'Pencairan Dana',
      'Antrean_Pencairan',
      'Antrean Pencairan',
      'Realisasi_Bantuan',
      'Realisasi Bantuan',
      'Antrean_SIMBA',
      'Antrean SIMBA',
      'Antrean_Arsip',
      'Antrean Arsip',
      'Selesai & Arsip',
      'Selesai',
      'CAIR'
    ];

    const proposals = await prisma.proposal.findMany({
      where: {
        OR: [
          { status: { in: ALLOWED_STATUS_LIST as any } },
          { memo_source: 'DIRECT_PENYALURAN' }
        ]
      },
      select: {
        id: true,
        agenda_no: true,
        tanggal_masuk: true,
        nama_instansi: true,
        pimpinan_organisasi: true,
        nama_pemohon: true,
        nama_anak: true,
        nik: true,
        tempat_lahir: true,
        tanggal_lahir: true,
        jenis_kelamin: true,
        alamat: true,
        kelurahan: true,
        kecamatan: true,
        pekerjaan: true,
        jenis_permohonan: true,
        no_telpon: true,
        email: true,
        jam_pengajuan: true,
        yang_mengajukan: true,
        has_memo: true,
        memo_source: true,
        jenis_pengajuan: true,
        rekomendasi: true,
        keterangan: true,
        status: true,
        mustahik_id: true,
        created_at: true,
        updated_at: true,
        nominal: true,
        tipe_bantuan: true,
        asnaf: true,
        rekomendasi_kabag: true,
        rkat_activity_id: true,
        frekuensi_berulang: true,
        is_rutin: true,
        program: {
          select: {
            code: true,
            name: true,
            pilar_code: true,
            budget_rkat: true,
            rkat_details: true,
            pilar: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        mustahik: {
          select: {
            id: true,
            nama: true,
            nik: true,
            nrm: true,
            alamat: true,
            handphone: true,
            telepon: true,
            kategori: true,
            jenis_kelamin: true,
            nama_pimpinan: true,
            jenis_lembaga: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const proposalIds = proposals.map(p => p.id);
    const realisasiList = await prisma.realisasi.findMany({
      where: { proposal_id: { in: proposalIds } },
      include: {
        journalEntries: {
          where: { debit: { gt: 0 } },
          include: { coa: true }
        }
      },
      orderBy: { tanggal: 'desc' }
    });
    const realisasiMap = new Map<string, { tanggal: Date; coa_code?: string; coa_name?: string }>();
    for (const r of realisasiList) {
      if (r.proposal_id && !realisasiMap.has(r.proposal_id)) {
        const debitEntry = r.journalEntries && r.journalEntries.length > 0 ? r.journalEntries[0] : null;
        realisasiMap.set(r.proposal_id, {
          tanggal: r.tanggal,
          coa_code: debitEntry?.coa_code,
          coa_name: debitEntry?.coa?.nama_akun
        });
      }
    }

    const mappingRules = await prisma.coaMappingRule.findMany({
      include: { debitCoa: true }
    });
    const allCoa = await prisma.chartOfAccounts.findMany();
    const coaNameMap = new Map(allCoa.map(c => [c.coa_code, c.nama_akun]));

    const mapped = proposals
      .filter(p => {
        const isDirect = p.memo_source === 'DIRECT_PENYALURAN' || (p.keterangan || '').includes('[DIRECT PENYALURAN]');
        const s = (p.status || '').toLowerCase();
        const isDisbursement = s.includes('acc') || s.includes('pencairan') || s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
        return isDirect || isDisbursement;
      })
      .map(p => {
        const isDirect = p.memo_source === 'DIRECT_PENYALURAN' || (p.keterangan || '').includes('[DIRECT PENYALURAN]');
        const relData = realisasiMap.get(p.id);
        const tglCair = relData?.tanggal || (p.status && (p.status.toLowerCase().includes('cair') || p.status.toLowerCase().includes('realisasi') || p.status.toLowerCase().includes('simba') || p.status.toLowerCase().includes('arsip') || p.status.toLowerCase().includes('selesai')) ? p.updated_at : null);

        // Determine COA code & name
        let resolvedCoaCode = relData?.coa_code || null;
        let resolvedCoaName = relData?.coa_name || null;

        if (!resolvedCoaCode) {
          // Resolve fundSource
          let fundSource = 'ZAKAT';
          const possibleSources = [p.asnaf, p.rekomendasi_kabag, p.tipe_bantuan];
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

          const targetAsnaf = String(p.asnaf || '').trim().toLowerCase();
          const pCode = String(p.program?.code || p.jenis_permohonan || '').trim().toLowerCase();
          const pName = String(p.program?.name || '').trim().toLowerCase();

          const matchProg = (ruleProg: string) => {
            if (!ruleProg) return false;
            const cleanRule = ruleProg.trim().toLowerCase();
            const cleanRuleCode = cleanRule.split(' ')[0].split('-')[0].trim();
            if (pCode && (pCode === cleanRule || pCode.includes(cleanRule) || cleanRule.includes(pCode))) return true;
            if (pName && (pName === cleanRule || pName.includes(cleanRule) || cleanRule.includes(pName))) return true;
            if (cleanRuleCode && pCode && (pCode === cleanRuleCode || pCode.startsWith(cleanRuleCode) || cleanRuleCode.startsWith(pCode))) return true;
            return false;
          };

          const matchAsnaf = (ruleAsnaf: string | null) => {
            if (!ruleAsnaf || ruleAsnaf.trim() === '' || ruleAsnaf.trim().toLowerCase() === 'global') return true;
            return ruleAsnaf.trim().toLowerCase() === targetAsnaf;
          };

          const fundRules = mappingRules.filter(r => !r.sumber_dana_tag || r.sumber_dana_tag === 'ALL' || r.sumber_dana_tag === fundSource);
          let matchedRule = fundRules.find(r => matchProg(r.program_code) && r.asnaf_id && r.asnaf_id.trim().toLowerCase() === targetAsnaf);
          if (!matchedRule) {
            matchedRule = fundRules.find(r => matchProg(r.program_code) && matchAsnaf(r.asnaf_id));
          }

          if (matchedRule) {
            resolvedCoaCode = matchedRule.debit_coa_code;
            resolvedCoaName = matchedRule.debitCoa?.nama_akun || coaNameMap.get(resolvedCoaCode) || null;
          }
        }

        if (!resolvedCoaCode) {
          resolvedCoaCode = p.program?.code || '519999999';
          resolvedCoaName = coaNameMap.get(resolvedCoaCode) || p.program?.name || p.jenis_permohonan || 'Beban Penyaluran ZIS';
        }

        return {
          ...p,
          asal_data: isDirect ? 'Jalur Direct' : 'Jalur Proposal',
          tanggal_pencairan_real: tglCair,
          tanggal_realisasi: tglCair,
          coa_code: resolvedCoaCode,
          coa_name: resolvedCoaName || coaNameMap.get(resolvedCoaCode) || p.program?.name || 'Beban Penyaluran ZIS'
        };
      })
      .sort((a, b) => {
        const getStatusRank = (statusStr: string | null | undefined): number => {
          if (!statusStr) return 1;
          const s = statusStr.trim().toLowerCase();
          // 1. Antrean Pencairan (Paling Atas)
          if (s.includes('pencairan') || s === 'acc' || s === 'cair') return 1;
          // 2. Realisasi Bantuan
          if (s.includes('realisasi')) return 2;
          // 3. Antrean SIMBA
          if (s.includes('simba') && !s.includes('arsip') && !s.includes('selesai')) return 3;
          // 4. Antrean Arsip
          if ((s.includes('arsip') && !s.includes('selesai')) || s === 'antrean arsip' || s === 'antrean_arsip') return 4;
          // 5. Selesai (Paling Bawah)
          if (s.includes('selesai') || s.includes('synced') || (s.includes('simba') && s.includes('arsip'))) return 5;
          return 1;
        };

        const rankA = getStatusRank(a.status);
        const rankB = getStatusRank(b.status);

        if (rankA !== rankB) {
          return rankA - rankB; // Lower rank (1 = Pencairan) comes first
        }

        const timeA = new Date(a.created_at || a.tanggal_masuk || 0).getTime();
        const timeB = new Date(b.created_at || b.tanggal_masuk || 0).getTime();
        return timeB - timeA;
      });

    res.status(200).json({
      status: 'success',
      data: mapped
    });
  } catch (error) {
    console.error('Error fetching Penyaluran ZIS:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const createDirectPenyaluran = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      mustahik_id,
      nama_pemohon,
      nama_instansi,
      nik,
      kategori = 'Perorangan',
      alamat = 'Kota Semarang',
      no_telpon = '080000000000',
      jenis_permohonan,
      rkat_activity_id,
      asnaf = 'Miskin',
      nominal = 0,
      keterangan = 'Penyaluran Direct',
      tipe_bantuan = 'Konsumtif',
      jenis_kelamin = 'Pria',
      yang_mengajukan = 'Direct Penyaluran',
      has_memo = false,
      memo_source = 'DIRECT_PENYALURAN',
      volume = 1,
      rekomendasi_unit_cost
    } = req.body;

    if (!nama_pemohon || Number(nominal) <= 0) {
      res.status(400).json({ error: 'Nama penerima dan nominal bantuan wajib diisi.' });
      return;
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      res.status(400).json({ error: 'User admin tidak ditemukan.' });
      return;
    }

    // Auto-register or locate Mustahik
    let mustahikRecord: any = null;
    if (mustahik_id) {
      mustahikRecord = await prisma.mustahik.findUnique({ where: { id: String(mustahik_id) } });
    }

    const cleanNik = nik && String(nik).trim() ? String(nik).trim() : null;
    if (!mustahikRecord && cleanNik) {
      mustahikRecord = await prisma.mustahik.findUnique({ where: { nik: cleanNik } });
    }

    if (!mustahikRecord) {
      mustahikRecord = await prisma.mustahik.create({
        data: {
          kategori: kategori === 'Lembaga' ? 'Lembaga' : 'Perorangan',
          nik: cleanNik,
          nama: String(nama_pemohon),
          nama_pimpinan: kategori === 'Lembaga' ? String(nama_instansi || nama_pemohon) : null,
          jenis_lembaga: kategori === 'Lembaga' ? 'Lembaga' : null,
          jenis_kelamin: kategori === 'Lembaga' ? null : String(jenis_kelamin || 'Pria'),
          alamat: String(alamat || 'Kota Semarang'),
          telepon: String(no_telpon || '080000000000'),
          catatan: 'Didaftarkan via Direct Penyaluran ZIS'
        }
      });
    }

    const parsedNominal = Math.round(Number(nominal));
    const asnafUpper = String(asnaf || '').toUpperCase().trim();
    let computedDana = 'Zakat';
    if (asnafUpper === 'ISTT' || asnafUpper.includes('TIDAK TERIKAT')) {
      computedDana = 'Infak Tidak Terikat';
    } else if (asnafUpper === 'IST' || asnafUpper.includes('TERIKAT')) {
      computedDana = 'Infak Terikat';
    }

    // Create Proposal Record directly in 'ACC' / 'Pencairan_Dana' status
    const newProposal = await prisma.proposal.create({
      data: {
        tanggal_masuk: new Date(),
        nama_pemohon: String(nama_pemohon),
        nama_instansi: nama_instansi ? String(nama_instansi) : null,
        nik: cleanNik || (mustahikRecord.nik || '-'),
        jenis_kelamin: String(jenis_kelamin || 'Pria'),
        alamat: String(alamat || 'Kota Semarang'),
        no_telpon: String(no_telpon || '080000000000'),
        jenis_permohonan: jenis_permohonan ? String(jenis_permohonan) : null,
        rkat_activity_id: rkat_activity_id ? String(rkat_activity_id) : null,
        nominal: parsedNominal,
        tipe_bantuan: String(tipe_bantuan || 'Konsumtif'),
        asnaf: String(asnaf || 'Miskin'),
        rekomendasi_kabag: computedDana,
        keterangan: `[DIRECT PENYALURAN] ${keterangan}`,
        jenis_pengajuan: kategori === 'Lembaga' ? 'Lembaga' : 'Perorangan',
        yang_mengajukan: String(yang_mengajukan || 'Direct Penyaluran'),
        has_memo: Boolean(has_memo || memo_source),
        memo_source: memo_source ? String(memo_source) : 'DIRECT_PENYALURAN',
        volume: Number(volume) || 1,
        rekomendasi_unit_cost: rekomendasi_unit_cost ? Number(rekomendasi_unit_cost) : parsedNominal,
        status: 'ACC',
        mustahik_id: mustahikRecord.id
      },
      include: {
        program: true,
        mustahik: true
      }
    });

    // Create PengajuanPencairan record so it instantly appears in Antrean Pencairan Keuangan
    const noPengajuanStr = `PP-DIR/${new Date().getFullYear()}/${String(newProposal.agenda_no).padStart(4, '0')}`;

    await prisma.pengajuanPencairan.create({
      data: {
        no_pengajuan: noPengajuanStr,
        tanggal: new Date(),
        pengaju_id: defaultUser.id,
        kategori_biaya: 'Penyaluran ZIS',
        keterangan: `[DIRECT PENYALURAN] ${nama_pemohon} - ${keterangan}`,
        nominal: new Prisma.Decimal(parsedNominal),
        status: StatusPengajuan.CAIR,
        sumber_dana: computedDana
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        ...newProposal,
        asal_data: 'Jalur Direct'
      }
    });
  } catch (error) {
    console.error('Error creating direct Penyaluran ZIS:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const updatePenyaluranZis = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    const {
      nama_pemohon,
      nama_instansi,
      nik,
      alamat,
      no_telpon,
      jenis_permohonan,
      rkat_activity_id,
      asnaf,
      nominal,
      keterangan,
      tipe_bantuan,
      jenis_pengajuan,
      jenis_kelamin,
      yang_mengajukan,
      has_memo,
      memo_source,
      volume,
      rekomendasi_unit_cost
    } = req.body;

    const existing = await prisma.proposal.findUnique({ where: { id: targetId } });
    if (!existing) {
      res.status(404).json({ error: 'Data penyaluran tidak ditemukan.' });
      return;
    }

    let computedDana = existing.rekomendasi_kabag;
    if (asnaf !== undefined) {
      const asnafUpper = String(asnaf).toUpperCase().trim();
      if (asnafUpper === 'ISTT' || asnafUpper.includes('TIDAK TERIKAT')) {
        computedDana = 'Infak Tidak Terikat';
      } else if (asnafUpper === 'IST' || asnafUpper.includes('TERIKAT')) {
        computedDana = 'Infak Terikat';
      } else {
        computedDana = 'Zakat';
      }
    }

    const updated = await prisma.proposal.update({
      where: { id: targetId },
      data: {
        ...(nama_pemohon !== undefined && { nama_pemohon: String(nama_pemohon) }),
        ...(nama_instansi !== undefined && { nama_instansi: nama_instansi ? String(nama_instansi) : null }),
        ...(nik !== undefined && { nik: String(nik) }),
        ...(alamat !== undefined && { alamat: String(alamat) }),
        ...(no_telpon !== undefined && { no_telpon: String(no_telpon) }),
        ...(jenis_permohonan !== undefined && { jenis_permohonan: jenis_permohonan ? String(jenis_permohonan) : null }),
        ...(rkat_activity_id !== undefined && { rkat_activity_id: rkat_activity_id ? String(rkat_activity_id) : null }),
        ...(asnaf !== undefined && { asnaf: String(asnaf), rekomendasi_kabag: computedDana }),
        ...(nominal !== undefined && { nominal: Math.round(Number(nominal)) }),
        ...(keterangan !== undefined && { keterangan: String(keterangan) }),
        ...(tipe_bantuan !== undefined && { tipe_bantuan: String(tipe_bantuan) }),
        ...(jenis_pengajuan !== undefined && { jenis_pengajuan: String(jenis_pengajuan) }),
        ...(jenis_kelamin !== undefined && { jenis_kelamin: String(jenis_kelamin) }),
        ...(yang_mengajukan !== undefined && { yang_mengajukan: String(yang_mengajukan) }),
        ...(has_memo !== undefined && { has_memo: Boolean(has_memo) }),
        ...(memo_source !== undefined && { memo_source: memo_source ? String(memo_source) : null }),
        ...(volume !== undefined && { volume: Math.max(1, Number(volume) || 1) }),
        ...(rekomendasi_unit_cost !== undefined && { rekomendasi_unit_cost: Number(rekomendasi_unit_cost) || null })
      },
      include: {
        program: true,
        mustahik: true
      }
    });

    await syncRealisasiFromProposal(targetId);

    res.status(200).json({
      status: 'success',
      data: updated
    });
  } catch (error) {
    console.error('Error updating Penyaluran ZIS:', error);
    res.status(500).json({ error: String(error) });
  }
};
