import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';

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
      include: {
        program: true,
        mustahik: true
      },
      orderBy: { created_at: 'desc' }
    });

    const mapped = proposals
      .filter(p => {
        const isDirect = p.memo_source === 'DIRECT_PENYALURAN' || (p.keterangan || '').includes('[DIRECT PENYALURAN]');
        const s = (p.status || '').toLowerCase();
        const isDisbursement = s.includes('acc') || s.includes('pencairan') || s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
        return isDirect || isDisbursement;
      })
      .map(p => {
        const isDirect = p.memo_source === 'DIRECT_PENYALURAN' || (p.keterangan || '').includes('[DIRECT PENYALURAN]');
        return {
          ...p,
          asal_data: isDirect ? 'Jalur Direct' : 'Jalur Proposal'
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
      memo_source = 'DIRECT_PENYALURAN'
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
      memo_source
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
        ...(memo_source !== undefined && { memo_source: memo_source ? String(memo_source) : null })
      },
      include: {
        program: true,
        mustahik: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: updated
    });
  } catch (error) {
    console.error('Error updating Penyaluran ZIS:', error);
    res.status(500).json({ error: String(error) });
  }
};
