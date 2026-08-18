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
    const { pengaju_id, kategori_biaya, judul, keterangan, nominal, rkat_id } = req.body;

    if (!pengaju_id || !kategori_biaya || (!judul && !keterangan) || !nominal || Number(nominal) <= 0) {
      res.status(400).json({ error: 'Pengaju, kategori biaya, judul pengajuan, dan nominal wajib diisi valid.' });
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
    let initialStatus: StatusPengajuan = StatusPengajuan.WAITING_KABID;
    const userRole = user.role;

    if (userRole === 'Staf_Administrasi') {
      // Staf Administrasi -> directly to Kabag Administrasi
      initialStatus = StatusPengajuan.WAITING_KABAG_ADMIN;
    } else if (userRole === 'Kabag_Administrasi') {
      // Kabag Administrasi -> skips Kabag Admin
      if (Number(nominal) <= 1000000) {
        initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        initialStatus = StatusPengajuan.WAITING_KAPEL;
      }
    } else if (userRole.startsWith('Kabag') || userRole.startsWith('Kabid')) {
      // Other Kabags -> skips initial bidang, goes directly to Kabag Administrasi
      initialStatus = StatusPengajuan.WAITING_KABAG_ADMIN;
    } else if (userRole === 'Kepala_Pelaksana') {
      // Kapel -> skips Kapel
      if (Number(nominal) <= 15000000) {
        initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        initialStatus = StatusPengajuan.WAITING_WAKA4;
      }
    } else if (userRole === 'Wakil_Ketua_IV') {
      if (Number(nominal) <= 25000000) {
        initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        initialStatus = StatusPengajuan.WAITING_WAKA3;
      }
    } else if (userRole === 'Wakil_Ketua_III' || userRole === 'Wakil_Ketua_I' || userRole === 'Wakil_Ketua_II') {
      if (Number(nominal) <= 100000000) {
        initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        initialStatus = StatusPengajuan.WAITING_KETUA;
      }
    } else if (userRole === 'Ketua' || userRole === 'Super_Admin') {
      initialStatus = StatusPengajuan.WAITING_FINANCE_APP;
    } else {
      // Regular staff of other departments (Pendistribusian, Pendayagunaan, Pengumpulan, Pelaporan, Keuangan, dll.)
      initialStatus = StatusPengajuan.WAITING_KABID;
    }

    const newPengajuan = await prisma.$transaction(async (tx) => {
      const p = await tx.pengajuanPencairan.create({
        data: {
          no_pengajuan,
          pengaju_id,
          kategori_biaya,
          judul: judul ? String(judul).trim() : null,
          keterangan: keterangan ? String(keterangan).trim() : (judul ? String(judul).trim() : '-'),
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

    const whereClause: any = {
      no_pengajuan: { startsWith: 'PP/' },
      kategori_biaya: { not: 'Penyaluran ZIS' },
    };

    if (tab === 'my-requests' && userId) {
      whereClause.pengaju_id = String(userId);
    } else if (tab === 'pending' && role) {
      const userRole = String(role);
      // Determine what statuses this role can approve
      if (userRole === 'Kepala_Pelaksana') {
        whereClause.status = StatusPengajuan.WAITING_KAPEL;
      } else if (userRole === 'Wakil_Ketua_IV') {
        whereClause.status = StatusPengajuan.WAITING_WAKA4;
      } else if (userRole === 'Wakil_Ketua_III' || userRole === 'Wakil_Ketua_I' || userRole === 'Wakil_Ketua_II') {
        whereClause.status = StatusPengajuan.WAITING_WAKA3;
      } else if (userRole === 'Ketua') {
        whereClause.status = StatusPengajuan.WAITING_KETUA;
      } else if (userRole === 'Kabag_Keuangan') {
        whereClause.status = StatusPengajuan.WAITING_FINANCE_APP;
      } else if (userRole === 'Kabag_Administrasi') {
        whereClause.status = { in: [StatusPengajuan.WAITING_KABAG_ADMIN, StatusPengajuan.WAITING_KABID] };
      } else if (userRole.startsWith('Kabag') || userRole.startsWith('Kabid')) {
        // Any other Kabag/Kabid approves initial WAITING_KABID stage
        whereClause.status = StatusPengajuan.WAITING_KABID;
      } else if (userRole === 'Super_Admin') {
        whereClause.status = { notIn: [StatusPengajuan.DRAFT, StatusPengajuan.APPROVED, StatusPengajuan.CAIR, StatusPengajuan.DITOLAK] };
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
      // Step 1: Kabag Bidang approves -> goes to Kabag Administrasi (SDM & Umum)
      nextStatus = StatusPengajuan.WAITING_KABAG_ADMIN;
    } else if (pengajuan.status === StatusPengajuan.WAITING_KABAG_ADMIN) {
      // Step 2: Kabag Administrasi approves -> check nominal threshold
      if (nominal <= 1000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_KAPEL;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_KAPEL) {
      // Step 3: Kepala Pelaksana approves -> check nominal threshold
      if (nominal <= 15000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_WAKA4;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_WAKA4) {
      // Step 4: Wakil Ketua IV approves -> check nominal threshold
      if (nominal <= 25000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_WAKA3;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_WAKA3) {
      // Step 5: Wakil Ketua III approves -> check nominal threshold
      if (nominal <= 100000000) {
        nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
      } else {
        nextStatus = StatusPengajuan.WAITING_KETUA;
      }
    } else if (pengajuan.status === StatusPengajuan.WAITING_KETUA) {
      // Step 6: Ketua approves -> goes to Kabag Keuangan
      nextStatus = StatusPengajuan.WAITING_FINANCE_APP;
    } else if (pengajuan.status === StatusPengajuan.WAITING_FINANCE_APP) {
      // Step 7: Kabag Keuangan approves -> APPROVED (Siap Cair)
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
    const { actorId, bankAccountId, sumberDana, catatan, nominalRealisasi, linkNota, breakdownItems } = req.body;

    if (!actorId || !bankAccountId) {
      res.status(400).json({ error: 'Actor ID dan Rekening Bank wajib diisi.' });
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

    const nominalAwal = Number(pengajuan.nominal);
    const hasBreakdown = Array.isArray(breakdownItems) && breakdownItems.length > 0;
    
    let nominalRiil = nominalAwal;
    if (hasBreakdown) {
      nominalRiil = breakdownItems.reduce((acc: number, it: any) => acc + (Number(it.nominal) || 0), 0);
    } else {
      const parsedRiil = nominalRealisasi !== undefined && nominalRealisasi !== null ? Number(nominalRealisasi) : NaN;
      nominalRiil = (!isNaN(parsedRiil) && parsedRiil > 0) ? parsedRiil : nominalAwal;
    }

    if (nominalRiil > nominalAwal) {
      res.status(400).json({ 
        error: `Nominal pencairan riil (Rp ${nominalRiil.toLocaleString('id-ID')}) tidak boleh melebihi plafon pengajuan awal yang telah disetujui (Rp ${nominalAwal.toLocaleString('id-ID')}).` 
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch bank account and ensure balance is sufficient
      const account = await tx.bankAccount.findUnique({
        where: { account_id: bankAccountId },
      });

      if (!account) {
        throw new Error('Rekening pembayar tidak ditemukan.');
      }

      if (Number(account.saldo) < nominalRiil) {
        throw new Error(`Saldo di ${account.nama_akun} tidak mencukupi! Tersedia: Rp ${Number(account.saldo).toLocaleString('id-ID')}, Dibutuhkan: Rp ${nominalRiil.toLocaleString('id-ID')}`);
      }

      const finalSumberDana = (sumberDana && String(sumberDana).trim()) ? String(sumberDana).trim() : (account.kelompok_dana || 'AMIL');

      // 2. Update Pengajuan record to CAIR
      const p = await tx.pengajuanPencairan.update({
        where: { id },
        data: {
          status: StatusPengajuan.CAIR,
          bank_account_id: bankAccountId,
          sumber_dana: finalSumberDana,
          nominal_realisasi: new Prisma.Decimal(nominalRiil),
          link_nota: linkNota ? String(linkNota).trim() : null,
        },
      });

      // 3. Log the payment
      let logMsg = `Dana dicairkan sebesar Rp ${nominalRiil.toLocaleString('id-ID')}`;
      if (hasBreakdown) {
        logMsg += ` (Pencairan dipecah ${breakdownItems.length} penerima by-name)`;
      }
      if (nominalRiil < nominalAwal) {
        const hemat = nominalAwal - nominalRiil;
        logMsg += ` (Plafon Awal: Rp ${nominalAwal.toLocaleString('id-ID')}, Efisiensi: Rp ${hemat.toLocaleString('id-ID')})`;
      }
      if (linkNota) {
        logMsg += ` | Link Nota: ${linkNota.trim()}`;
      }
      if (catatan) {
        logMsg += ` | Catatan: ${catatan.trim()}`;
      }

      await tx.pengajuanLog.create({
        data: {
          pengajuan_id: id,
          actor_id: actorId,
          action: 'DISBURSE',
          catatan: logMsg,
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

      const ringkasanJurnal = (pengajuan.judul && pengajuan.judul.trim()) 
        ? pengajuan.judul.trim() 
        : (pengajuan.keterangan || 'Pengajuan Operasional');

      if (hasBreakdown) {
        breakdownItems.forEach((item: any, idx: number) => {
          const itemNominal = Number(item.nominal) || 0;
          if (itemNominal <= 0) return;
          const itemNama = (item.nama_penerima || '').trim();
          const itemKet = (item.keterangan || '').trim();
          
          // Pure By-Name text (without global title)
          const itemBankDesc = itemNama 
            ? `${itemNama}${itemKet ? ` - ${itemKet}` : ''}`
            : (itemKet || ringkasanJurnal);

          const newDraft = {
            id: `mut-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            tanggalCatatan: new Date().toISOString().split('T')[0],
            tanggal: new Date().toISOString().split('T')[0],
            bankAccountId: bankAccountId,
            bankName: account.nama_akun,
            judul: itemNama || ringkasanJurnal,
            keterangan: itemKet || pengajuan.keterangan || null,
            keteranganBank: itemBankDesc,
            keteranganRealisasi: itemBankDesc,
            nominal: itemNominal,
            type: 'KREDIT',
            status: 'PENDING',
            kategori_biaya: pengajuan.kategori_biaya || 'Lain-lain',
            link_nota: linkNota ? String(linkNota).trim() : null,
            rkat_id: item.rkat_id || pengajuan.rkat_id || null,
            rkatId: item.rkat_id || pengajuan.rkat_id || null,
            coa_code: item.coa_code || null,
            coaCode: item.coa_code || null,
            nama_penerima: itemNama || null
          };
          mutations.push(newDraft);
        });
      } else {
        const standardDesc = `${ringkasanJurnal} an. ${pengajuan.pengaju?.name || 'Pengaju'}`;
        const newDraft = {
          id: `mut-${Date.now()}`,
          tanggalCatatan: new Date().toISOString().split('T')[0],
          tanggal: new Date().toISOString().split('T')[0],
          bankAccountId: bankAccountId,
          bankName: account.nama_akun,
          judul: pengajuan.judul || null,
          keterangan: pengajuan.keterangan || null,
          keteranganBank: standardDesc,
          keteranganRealisasi: standardDesc,
          nominal: nominalRiil,
          type: 'KREDIT',
          status: 'PENDING',
          kategori_biaya: pengajuan.kategori_biaya || 'Lain-lain',
          link_nota: linkNota ? String(linkNota).trim() : null,
          rkat_id: pengajuan.rkat_id || null,
          rkatId: pengajuan.rkat_id || null,
          coa_code: pengajuan.coa_code || null,
          coaCode: pengajuan.coa_code || null
        };
        mutations.push(newDraft);
      }

      fs.writeFileSync(mutationsFilePath, JSON.stringify(mutations, null, 2), 'utf-8');

      return p;
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Disburse Pengajuan Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const updatePengajuanNota = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { linkNota, actorId } = req.body;

    const pengajuan = await prisma.pengajuanPencairan.findUnique({ where: { id } });
    if (!pengajuan) {
      res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
      return;
    }

    const updated = await prisma.pengajuanPencairan.update({
      where: { id },
      data: {
        link_nota: linkNota ? String(linkNota).trim() : null
      }
    });

    if (actorId) {
      await prisma.pengajuanLog.create({
        data: {
          pengajuan_id: id,
          actor_id: actorId,
          action: 'UPDATE_NOTA',
          catatan: linkNota ? `Memperbarui tautan nota: ${linkNota.trim()}` : 'Menghapus tautan nota.'
        }
      });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    console.error('Update Pengajuan Nota Error:', error);
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
