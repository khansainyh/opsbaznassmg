import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const lookupMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body; // Array of { no_rekening: string, nama: string, opd: string, nominal: number }
    if (!Array.isArray(items)) {
      res.status(400).json({ status: 'error', message: 'Items must be an array' });
      return;
    }

    const results = [];
    for (const item of items) {
      const norek = item.no_rekening ? String(item.no_rekening).trim() : '';
      const name = item.nama ? String(item.nama).trim() : '';
      let muzakki = null;
      if (norek) {
        muzakki = await prisma.muzakki.findUnique({
          where: { no_rekening: norek }
        });
      }
      
      // Fallback: search by name case-insensitive
      if (!muzakki && name) {
        muzakki = await prisma.muzakki.findFirst({
          where: {
            nama: name
          }
        });
      }
      
      results.push({
        ...item,
        matched: !!muzakki,
        muzakki_id: muzakki ? muzakki.id : null,
        npwz: muzakki ? muzakki.npwz : null,
        nama_muzakki: muzakki ? muzakki.nama : null
      });
    }

    res.status(200).json({ status: 'success', data: results });
  } catch (error) {
    console.error('Error looking up Muzakki:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const approveBankJateng = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactions, bank_account_id, rkat_id, tanggal_pembayaran, coa_code } = req.body;
    // transactions: Array of { muzakki_id: string, nominal: number, keterangan: string }
    
    if (!bank_account_id || !rkat_id || !Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ status: 'error', message: 'Parameter tidak lengkap atau transaksi kosong' });
      return;
    }

    const paymentDate = tanggal_pembayaran ? new Date(tanggal_pembayaran) : new Date();

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { account_id: bank_account_id }
    });
    if (!bankAccount) {
      res.status(404).json({ status: 'error', message: 'Rekening penerima tidak ditemukan' });
      return;
    }

    const rkat = await prisma.rkatPengumpulan.findUnique({
      where: { id: rkat_id }
    });
    if (!rkat) {
      res.status(404).json({ status: 'error', message: 'Program RKAT tidak ditemukan' });
      return;
    }

    // Determine credit COA code (same logic as ZIS receipt)
    const creditCoaCode = coa_code || (rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101');
    
    // Ensure credit COA exists
    const coaExists = await prisma.chartOfAccounts.findUnique({ where: { coa_code: creditCoaCode } });
    if (!coaExists) {
      await prisma.chartOfAccounts.create({
        data: {
          coa_code: creditCoaCode,
          nama_akun: `Penerimaan ${rkat.nama_program}`,
          klasifikasi: 'Penerimaan',
          tipe_dana: rkat.kategori.toUpperCase() === 'ZAKAT' ? 'ZAKAT' : 'INFAK_TIDAK_TERIKAT'
        }
      });
    }

    // Process all in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdItems = [];
      let totalNominal = 0;

      for (let i = 0; i < transactions.length; i++) {
        const item = transactions[i];
        const nominalVal = Number(item.nominal);
        totalNominal += nominalVal;

        // Generate kuitansi (BSZ number)
        const no_kuitansi = `BSZ-JTG-${Date.now()}-${i}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Get Muzakki info
        const muzakki = await tx.muzakki.findUnique({
          where: { id: item.muzakki_id }
        });
        if (!muzakki) throw new Error(`Muzakki dengan ID ${item.muzakki_id} tidak ditemukan`);

        // Link bank account to muzakki if not set or different
        if (item.no_rekening && muzakki.no_rekening !== item.no_rekening) {
          await tx.muzakki.update({
            where: { id: muzakki.id },
            data: { no_rekening: item.no_rekening }
          });
        }

        const formattedKeterangan = item.keterangan || `Penerimaan Bank Jateng program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama}`;

        // 1. Create PenerimaanZis record (status SYNCED immediately)
        const penerimaan = await tx.penerimaanZis.create({
          data: {
            no_kuitansi,
            muzakki_id: item.muzakki_id,
            rkat_id,
            bank_account_id,
            nominal: new Prisma.Decimal(nominalVal),
            metode_pembayaran: 'TRANSFER',
            tanggal_pembayaran: paymentDate,
            keterangan: formattedKeterangan,
            status_simba: 'SYNCED',
            transaksi_id: null
          }
        });

        // 2. Create Realisasi record
        const realisasiTrx = await tx.realisasi.create({
          data: {
            rkat_id,
            tanggal: paymentDate,
            keterangan: formattedKeterangan
          }
        });

        // 3. Update PenerimaanZis with the transaksi_id
        await tx.penerimaanZis.update({
          where: { id: penerimaan.id },
          data: { transaksi_id: realisasiTrx.transaksi_id }
        });

        // 4. Create Debit entry (Cash/Bank account)
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: bankAccount.coa_code,
            debit: new Prisma.Decimal(nominalVal),
            kredit: new Prisma.Decimal(0.00),
            account_id: bank_account_id
          }
        });

        // 5. Create Credit entry (Revenue COA)
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasiTrx.transaksi_id,
            coa_code: creditCoaCode,
            debit: new Prisma.Decimal(0.00),
            kredit: new Prisma.Decimal(nominalVal),
            account_id: null
          }
        });

        createdItems.push(penerimaan);
      }

      // 6. Update BankAccount balance with total sum (batch addition)
      await tx.bankAccount.update({
        where: { account_id: bank_account_id },
        data: {
          saldo: { increment: new Prisma.Decimal(totalNominal) }
        }
      });

      return createdItems;
    });

    res.status(200).json({ status: 'success', data: results });
  } catch (error: any) {
    console.error('Error approving Bank Jateng transactions:', error);
    res.status(500).json({ status: 'error', error: error.message || String(error) });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await prisma.penerimaanZis.findMany({
      where: {
        no_kuitansi: {
          startsWith: 'BSZ-JTG-'
        }
      },
      include: {
        muzakki: true,
        bankAccount: true,
        rkat: true
      },
      orderBy: {
        tanggal_pembayaran: 'desc'
      }
    });

    res.status(200).json({ status: 'success', data: history });
  } catch (error) {
    console.error('Error fetching Bank Jateng history:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
