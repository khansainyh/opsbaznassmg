import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const list = await prisma.penerimaanZis.findMany({
      include: {
        muzakki: true,
        rkat: true,
        bankAccount: true
      },
      orderBy: {
        tanggal_pembayaran: 'desc'
      }
    });

    const listWithCoa = await Promise.all(list.map(async (item: any) => {
      let coa_code = '';
      if (item.transaksi_id) {
        const creditEntry = await prisma.journalEntry.findFirst({
          where: {
            transaksi_id: item.transaksi_id,
            kredit: { gt: 0 }
          }
        });
        if (creditEntry) {
          coa_code = creditEntry.coa_code;
        }
      }
      return {
        ...item,
        coa_code
      };
    }));

    res.status(200).json({ status: 'success', data: listWithCoa });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const createPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const { 
      no_kuitansi, muzakki_id, rkat_id, bank_account_id, nominal, 
      metode_pembayaran, tanggal_pembayaran, keterangan
    } = req.body;

    if (!muzakki_id || !rkat_id || !bank_account_id || !nominal || Number(nominal) <= 0) {
      res.status(400).json({ error: 'Muzakki, program RKAT, rekening penerima, dan nominal harus diisi dengan benar' });
      return;
    }

    const tNominal = Number(nominal);
    const generatedKuitansi = no_kuitansi || `BSZ-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if kuitansi number is unique
      const existingKuitansi = await tx.penerimaanZis.findUnique({
        where: { no_kuitansi: generatedKuitansi }
      });
      if (existingKuitansi) {
        throw new Error(`Nomor kuitansi/BSZ ${generatedKuitansi} sudah terdaftar!`);
      }

      // 2. Fetch required entities
      const muzakki = await tx.muzakki.findUnique({ where: { id: muzakki_id } });
      if (!muzakki) throw new Error('Muzakki tidak ditemukan');

      const rkat = await tx.rkatPengumpulan.findUnique({ where: { id: rkat_id } });
      if (!rkat) throw new Error('Program RKAT Pengumpulan tidak ditemukan');

      const bankAccount = await tx.bankAccount.findUnique({ where: { account_id: bank_account_id } });
      if (!bankAccount) throw new Error('Rekening penerima tidak ditemukan');

      const formattedKeterangan = keterangan || `Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama}`;

      // Update BankAccount balance (increment)
      await tx.bankAccount.update({
        where: { account_id: bank_account_id },
        data: {
          saldo: { increment: new Prisma.Decimal(tNominal) }
        }
      });

      // Fetch or create credit ChartOfAccounts
      const creditCoaCode = rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101';
      const coaExists = await tx.chartOfAccounts.findUnique({ where: { coa_code: creditCoaCode } });
      if (!coaExists) {
        await tx.chartOfAccounts.create({
          data: {
            coa_code: creditCoaCode,
            nama_akun: `Penerimaan ${rkat.nama_program}`,
            klasifikasi: 'Penerimaan',
            tipe_dana: rkat.kategori.toUpperCase() === 'ZAKAT' ? 'ZAKAT' : 'INFAK_TIDAK_TERIKAT'
          }
        });
      }

      // Create Realisasi record
      const realisasiTrx = await tx.realisasi.create({
        data: {
          rkat_id: rkat_id,
          tanggal: tanggal_pembayaran ? new Date(tanggal_pembayaran) : new Date(),
          keterangan: formattedKeterangan
        }
      });

      // Create Debit entry (Cash/Bank account)
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasiTrx.transaksi_id,
          coa_code: bankAccount.coa_code,
          debit: new Prisma.Decimal(tNominal),
          kredit: new Prisma.Decimal(0.00),
          account_id: bank_account_id
        }
      });

      // Create Credit entry (Revenue COA)
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasiTrx.transaksi_id,
          coa_code: creditCoaCode,
          debit: new Prisma.Decimal(0.00),
          kredit: new Prisma.Decimal(tNominal),
          account_id: null
        }
      });

      // 3. Create PenerimaanZis record in PENDING state (but with transaksi_id set)
      const penerimaan = await tx.penerimaanZis.create({
        data: {
          no_kuitansi: generatedKuitansi,
          muzakki_id,
          rkat_id,
          bank_account_id,
          nominal: new Prisma.Decimal(tNominal),
          metode_pembayaran: metode_pembayaran || 'TRANSFER',
          tanggal_pembayaran: tanggal_pembayaran ? new Date(tanggal_pembayaran) : new Date(),
          keterangan: formattedKeterangan,
          status_simba: 'PENDING',
          transaksi_id: realisasiTrx.transaksi_id
        },
        include: {
          muzakki: true,
          rkat: true,
          bankAccount: true
        }
      });

      return penerimaan;
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const updateSimbaStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status_simba } = req.body;

    if (!['PENDING', 'SYNCED'].includes(status_simba)) {
      res.status(400).json({ error: 'Status SIMBA tidak valid' });
      return;
    }

    const existing = await prisma.penerimaanZis.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Data penerimaan tidak ditemukan' });
      return;
    }

    const updated = await prisma.penerimaanZis.update({
      where: { id },
      data: { status_simba },
      include: {
        muzakki: true,
        rkat: true,
        bankAccount: true
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const updatePenerimaanZis = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { 
      muzakki_id, rkat_id, bank_account_id, nominal, 
      metode_pembayaran, tanggal_pembayaran, keterangan, coa_code 
    } = req.body;

    const existing = await prisma.penerimaanZis.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Data penerimaan tidak ditemukan' });
      return;
    }

    const tNominal = Number(nominal || 0);
    if (!muzakki_id || !rkat_id || !bank_account_id || tNominal <= 0) {
      res.status(400).json({ error: 'Muzakki, program RKAT, rekening penerima, dan nominal harus diisi dengan benar' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      let bankAccount = await tx.bankAccount.findUnique({ where: { account_id: bank_account_id } });
      if (!bankAccount) throw new Error('Rekening penerima tidak ditemukan');

      const rkat = await tx.rkatPengumpulan.findUnique({ where: { id: rkat_id } });
      if (!rkat) throw new Error('Program RKAT tidak ditemukan');

      const muzakki = await tx.muzakki.findUnique({ where: { id: muzakki_id } });
      if (!muzakki) throw new Error('Muzakki tidak ditemukan');

      const formattedKeterangan = keterangan || `Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama}`;

      // If already synced, we need to adjust the balance and recreate journal entries
      if (existing.transaksi_id) {
        // 1. Revert old bank account balance
        await tx.bankAccount.update({
          where: { account_id: existing.bank_account_id },
          data: {
            saldo: { decrement: existing.nominal }
          }
        });

        // 2. Add new bank account balance
        bankAccount = await tx.bankAccount.update({
          where: { account_id: bank_account_id },
          data: {
            saldo: { increment: new Prisma.Decimal(tNominal) }
          }
        });

        // 3. Update Realisasi
        await tx.realisasi.update({
          where: { transaksi_id: existing.transaksi_id },
          data: {
            rkat_id: rkat_id,
            tanggal: tanggal_pembayaran ? new Date(tanggal_pembayaran) : new Date(),
            keterangan: formattedKeterangan
          }
        });

        // 4. Recreate Journal entries
        await tx.journalEntry.deleteMany({
          where: { transaksi_id: existing.transaksi_id }
        });

        // Create Debit entry
        await tx.journalEntry.create({
          data: {
            transaksi_id: existing.transaksi_id,
            coa_code: bankAccount.coa_code,
            debit: new Prisma.Decimal(tNominal),
            kredit: new Prisma.Decimal(0.00),
            account_id: bank_account_id
          }
        });

        // Determine credit COA code
        const creditCoaCode = coa_code || (rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101');
        const coaExists = await tx.chartOfAccounts.findUnique({ where: { coa_code: creditCoaCode } });
        if (!coaExists) {
          await tx.chartOfAccounts.create({
            data: {
              coa_code: creditCoaCode,
              nama_akun: `Penerimaan ${rkat.nama_program}`,
              klasifikasi: 'Penerimaan',
              tipe_dana: rkat.kategori.toUpperCase() === 'ZAKAT' ? 'ZAKAT' : 'INFAK_TIDAK_TERIKAT'
            }
          });
        }

        // Create Credit entry
        await tx.journalEntry.create({
          data: {
            transaksi_id: existing.transaksi_id,
            coa_code: creditCoaCode,
            debit: new Prisma.Decimal(0.00),
            kredit: new Prisma.Decimal(tNominal),
            account_id: null
          }
        });
      }

      // 5. Update PenerimaanZis record
      const updatedPenerimaan = await tx.penerimaanZis.update({
        where: { id },
        data: {
          muzakki_id,
          rkat_id,
          bank_account_id,
          nominal: new Prisma.Decimal(tNominal),
          metode_pembayaran: metode_pembayaran || 'TRANSFER',
          tanggal_pembayaran: tanggal_pembayaran ? new Date(tanggal_pembayaran) : new Date(),
          keterangan: formattedKeterangan
        },
        include: {
          muzakki: true,
          rkat: true,
          bankAccount: true
        }
      });

      return updatedPenerimaan;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const deletePenerimaanZis = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.penerimaanZis.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Data penerimaan tidak ditemukan' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Decrement BankAccount balance ONLY if synced
      if (existing.transaksi_id) {
        await tx.bankAccount.update({
          where: { account_id: existing.bank_account_id },
          data: {
            saldo: { decrement: existing.nominal }
          }
        });
      }

      // 2. Delete PenerimaanZis record
      await tx.penerimaanZis.delete({
        where: { id }
      });

      // 3. Delete Realisasi record (cascades journal entries)
      if (existing.transaksi_id) {
        await tx.realisasi.delete({
          where: { transaksi_id: existing.transaksi_id }
        });
      }
    });

    res.status(200).json({ status: 'success', message: 'Penerimaan ZIS berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
