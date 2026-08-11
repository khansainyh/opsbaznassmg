import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';

export const getPenyaluranZis = async (req: Request, res: Response): Promise<void> => {
  try {
    const proposals = await prisma.proposal.findMany({
      where: {
        OR: [
          { status: { in: ['ACC', 'Pencairan_Dana', 'Antrean_Pencairan', 'Realisasi Bantuan', 'Realisasi_Bantuan', 'Antrean SIMBA', 'Antrean_SIMBA', 'Selesai & Arsip', 'Antrean Arsip', 'Selesai', 'CAIR'] } },
          { memo_source: 'DIRECT_PENYALURAN' }
        ]
      },
      include: {
        program: true,
        mustahik: true
      },
      orderBy: { created_at: 'desc' }
    });

    const mapped = proposals.map(p => {
      const isDirect = p.memo_source === 'DIRECT_PENYALURAN' || (p.keterangan || '').includes('[DIRECT PENYALURAN]');
      return {
        ...p,
        asal_data: isDirect ? 'Jalur Direct' : 'Jalur Proposal'
      };
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
    const finalNik = String(nik || `3374${Date.now().toString().slice(-12)}`).trim();
    let mustahikRecord = await prisma.mustahik.findUnique({ where: { nik: finalNik } });

    if (!mustahikRecord) {
      mustahikRecord = await prisma.mustahik.create({
        data: {
          kategori: kategori === 'Lembaga' ? 'Lembaga' : 'Perorangan',
          nik: finalNik,
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

    // Create Proposal Record directly in 'ACC' / 'Pencairan_Dana' status
    const newProposal = await prisma.proposal.create({
      data: {
        tanggal_masuk: new Date(),
        nama_pemohon: String(nama_pemohon),
        nama_instansi: nama_instansi ? String(nama_instansi) : null,
        nik: finalNik,
        jenis_kelamin: String(jenis_kelamin || 'Pria'),
        alamat: String(alamat || 'Kota Semarang'),
        no_telpon: String(no_telpon || '080000000000'),
        jenis_permohonan: jenis_permohonan ? String(jenis_permohonan) : null,
        rkat_activity_id: rkat_activity_id ? String(rkat_activity_id) : null,
        nominal: parsedNominal,
        tipe_bantuan: String(tipe_bantuan || 'Konsumtif'),
        asnaf: String(asnaf || 'Miskin'),
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
        sumber_dana: 'Zakat'
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
        ...(asnaf !== undefined && { asnaf: String(asnaf) }),
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
