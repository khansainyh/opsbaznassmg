import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';

// Generate no_pengajuan: PP/MM/YYYY/XXXX
async function generateNoPengajuan(): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const prefix = `PP/${month}/${year}/`;

  // Find the count of pengajuans in this month & year
  const count = await prisma.pengajuanPencairan.count({
    where: {
      no_pengajuan: {
        startsWith: prefix,
      },
    },
  });

  const nextNumber = String(count + 1).padStart(4, '0');
  return `${prefix}${nextNumber}`;
}

export const createPengajuan = async (req: Request, res: Response) => {
  try {
    const { pengaju_id, kategori_biaya, keterangan, nominal, rkat_id } = req.body;

    if (!pengaju_id || !kategori_biaya || !keterangan || !nominal || Number(nominal) <= 0) {
      res.status(400).json({ error: 'Pengaju, kategori biaya, keterangan, dan nominal wajib diisi valid.' });
      return;
    }

    // Fetch the user to determine their role and starting status
    const user = await prisma.user.findUnique({
      where: { id: pengaju_id },
    });

    if (!user) {
      res.status(404).json({ error: 'User pengaju tidak ditemukan.' });
      return;
    }

    const no_pengajuan = await generateNoPengajuan();
    const parsedNominal = new Prisma.Decimal(nominal);

    // Initial status determined by user role:
    // If the submitter is already a Kabag or Kabid (not a Staf), they skip WAITING_KABID.
    // They go straight to the next level based on the nominal.
    let initialStatus: StatusPengajuan = StatusPengajuan.WAITING_KABID;
    const isKabagOrKabid = user.role.startsWith('Kabag') || user.role.startsWith('Wakil_Ketua') || user.role === 'Ketua' || user.role === 'Kepala_Pelaksana';

    if (isKabagOrKabid) {
      if (Number(nominal) < 1000000) {
        initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        initialStatus = StatusPengajuan.WAITING_KAPEL;
      }
    }

    const newPengajuan = await prisma.$transaction(async (tx) => {
      const p = await tx.pengajuanPencairan.create({
        data: {
          no_pengajuan,
          pengaju_id,
          kategori_biaya,
          keterangan,
          nominal: parsedNominal,
          rkat_id: rkat_id || null,
          status: initialStatus,
        },
      });

      await tx.pengajuanLog.create({
        data: {
          pengajuan_id: p.id,
          actor_id: pengaju_id,
          action: 'SUBMIT',
          catatan: 'Pengajuan pencairan dibuat.',
        },
      });

      return p;
    });

    res.status(201).json({ status: 'success', data: newPengajuan });
  } catch (error) {
    console.error('Create Pengajuan Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const getPengajuans = async (req: Request, res: Response) => {
  try {
    const { userId, role, tab } = req.query;

    const whereClause: any = {};

    if (tab === 'my-requests' && userId) {
      whereClause.pengaju_id = String(userId);
    } else if (tab === 'pending' && role) {
      const userRole = String(role);
      // Determine what statuses this role can approve
      if (userRole === 'Kepala_Pelaksana') {
        whereClause.status = StatusPengajuan.WAITING_KAPEL;
      } else if (userRole === 'Wakil_Ketua_III') {
        whereClause.status = StatusPengajuan.WAITING_WAKA3;
      } else if (userRole === 'Ketua') {
        whereClause.status = StatusPengajuan.WAITING_KETUA;
      } else if (userRole === 'Kabag_Keuangan') {
        whereClause.status = StatusPengajuan.WAITING_FINANCE_APP;
      } else if (userRole.startsWith('Kabag') || userRole.startsWith('Kabid')) {
        // Any other Kabag/Kabid approves initial WAITING_KABID stage
        whereClause.status = StatusPengajuan.WAITING_KABID;
      } else {
        // Regular staff see nothing in "pending" approval queue
        res.status(200).json({ status: 'success', data: [] });
        return;
      }
    } else if (tab === 'queue') {
      // Payout queue for Keuangan
      whereClause.status = StatusPengajuan.APPROVED;
    }

    const list = await prisma.pengajuanPencairan.findMany({
      where: whereClause,
      include: {
        pengaju: {
          select: { name: true, role: true, email: true },
        },
        rkat: {
          select: { no: true, nama: true, coa_codes: true },
        },
        logs: {
          include: {
            actor: { select: { name: true, role: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    console.error('Get Pengajuans Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const approvePengajuan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { actorId, catatan } = req.body;

    if (!actorId) {
      res.status(400).json({ error: 'Actor ID wajib disertakan.' });
      return;
    }

    const pengajuan = await prisma.pengajuanPencairan.findUnique({
      where: { id },
    });

    if (!pengajuan) {
      res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
      return;
    }

    const nominal = Number(pengajuan.nominal);
    let nextStatus: StatusPengajuan = pengajuan.status;

    if (pengajuan.status === StatusPengajuan.WAITING_KABID) {
      if (nominal < 1000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_KAPEL;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_KAPEL) {
      if (nominal < 15000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_WAKA3;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_WAKA3) {
      if (nominal < 25000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_KETUA;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_KETUA) {
      nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
    } else if (pengajuan.status === StatusPengajuan.WAITING_FINANCE_APP) {
      nextStatus = StatusPengajuan.APPROVED;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.pengajuanPencairan.update({
        where: { id },
        data: { status: nextStatus },
      });

      await tx.pengajuanLog.create({
        data: {
          pengajuan_id: id,
          actor_id: actorId,
          action: 'APPROVE',
          catatan: catatan || 'Menyetujui pengajuan.',
        },
      });

      return p;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Approve Pengajuan Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const rejectPengajuan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { actorId, alasan_penolakan } = req.body;

    if (!actorId || !alasan_penolakan) {
      res.status(400).json({ error: 'Actor ID dan Alasan Penolakan wajib disertakan.' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.pengajuanPencairan.update({
        where: { id },
        data: {
          status: StatusPengajuan.DITOLAK,
          alasan_penolakan,
        },
      });

      await tx.pengajuanLog.create({
        data: {
          pengajuan_id: id,
          actor_id: actorId,
          action: 'REJECT',
          catatan: alasan_penolakan,
        },
      });

      return p;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Reject Pengajuan Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const disbursePengajuan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { actorId, bankAccountId, sumberDana, catatan } = req.body;

    if (!actorId || !bankAccountId || !sumberDana) {
      res.status(400).json({ error: 'Actor ID, Rekening Bank, dan Sumber Dana wajib diisi.' });
      return;
    }

    const pengajuan = await prisma.pengajuanPencairan.findUnique({
      where: { id },
      include: { pengaju: true },
    }) as any;

    if (!pengajuan) {
      res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
      return;
    }

    if (pengajuan.status !== StatusPengajuan.APPROVED) {
      res.status(400).json({ error: 'Pengajuan belum disetujui pimpinan sepenuhnya.' });
      return;
    }

    const nominal = Number(pengajuan.nominal);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch bank account and ensure balance is sufficient
      const account = await tx.bankAccount.findUnique({
        where: { account_id: bankAccountId },
      });

      if (!account) {
        throw new Error('Rekening pembayar tidak ditemukan.');
      }

      if (Number(account.saldo) < nominal) {
        throw new Error(`Saldo di ${account.nama_akun} tidak mencukupi! Tersedia: ${account.saldo}, Dibutuhkan: ${nominal}`);
      }

      // 2. Update Pengajuan record to CAIR
      const p = await tx.pengajuanPencairan.update({
        where: { id },
        data: {
          status: StatusPengajuan.CAIR,
          bank_account_id: bankAccountId,
          sumber_dana: sumberDana,
        },
      });

      // 3. Log the payment
      await tx.pengajuanLog.create({
        data: {
          pengajuan_id: id,
          actor_id: actorId,
          action: 'DISBURSE',
          catatan: catatan || 'Dana dicairkan dan rancangan mutasi dikirim ke Pelaporan.',
        },
      });

      // 4. Write PENDING draft mutation to mutations.json
      const mutationsFilePath = path.join(__dirname, '../data/mutations.json');
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
        console.error('Error reading mutations file in disbursePengajuan:', readErr);
      }

      const newDraft = {
        id: `mut-${Date.now()}`,
        tanggalCatatan: new Date().toISOString().split('T')[0],
        tanggal: new Date().toISOString().split('T')[0],
        bankAccountId: bankAccountId,
        bankName: account.nama_akun,
        keteranganBank: `Disbursement Pengajuan: "${pengajuan.keterangan}" an. ${pengajuan.pengaju.name}`,
        nominal: nominal,
        type: 'KREDIT',
        status: 'PENDING',
        kategori_biaya: pengajuan.kategori_biaya || 'Lain-lain'
      };

      mutations.push(newDraft);
      fs.writeFileSync(mutationsFilePath, JSON.stringify(mutations, null, 2), 'utf-8');

      return p;
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Disburse Pengajuan Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const deletePengajuan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.query.userId as string | undefined;

    if (!id) {
      res.status(400).json({ error: 'ID pengajuan wajib disertakan.' });
      return;
    }

    const pengajuan = await prisma.pengajuanPencairan.findUnique({
      where: { id },
    });

    if (!pengajuan) {
      res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
      return;
    }

    if (pengajuan.status === StatusPengajuan.CAIR) {
      res.status(400).json({ error: 'Pengajuan yang sudah dicairkan tidak dapat dihapus.' });
      return;
    }

    if (userId && pengajuan.pengaju_id !== String(userId)) {
      const user = await prisma.user.findUnique({ where: { id: String(userId) } });
      if (user?.role !== 'Super_Admin') {
        res.status(403).json({ error: 'Anda hanya dapat menghapus pengajuan yang Anda buat sendiri.' });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pengajuanLog.deleteMany({
        where: { pengajuan_id: id },
      });
      await tx.pengajuanPencairan.delete({
        where: { id },
      });
    });

    res.status(200).json({ status: 'success', message: 'Pengajuan pencairan berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete Pengajuan Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
