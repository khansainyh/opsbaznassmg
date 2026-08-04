import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

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
    const { transactions, bank_account_id, tanggal_pembayaran, is_transit_source, source_coa, selected_transit_id } = req.body;
    const isTransit = is_transit_source === true || is_transit_source === 'true' || source_coa === '49000001';
    // transactions: Array of { muzakki_id: string, nominal: number, keterangan: string }
    
    if (!bank_account_id || !Array.isArray(transactions) || transactions.length === 0) {
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

    let totalBatchNominal = 0;

    // Process all in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const paramRkatZakatNo = await tx.systemParameter.findUnique({ where: { key: 'rkat_pengumpulan_no_zakat' } });
      const paramRkatInfakNo = await tx.systemParameter.findUnique({ where: { key: 'rkat_pengumpulan_no_infak' } });
      const paramCoaZakat = await tx.systemParameter.findUnique({ where: { key: 'coa_penerimaan_zakat' } });
      const paramCoaInfak = await tx.systemParameter.findUnique({ where: { key: 'coa_penerimaan_infak' } });

      const rkatZakatNo = paramRkatZakatNo?.value || '3';
      const rkatInfakNo = paramRkatInfakNo?.value || '8';
      const coaZakatCode = paramCoaZakat?.value || '41020201';
      const coaInfakCode = paramCoaInfak?.value || '42020101';

      const rkatZakat = await tx.rkatPengumpulan.findFirst({
        where: {
          OR: [
            { no: rkatZakatNo },
            { nama_program: { contains: "Zakat Maal Perorangan via UPZ Pengumpulan" } }
          ]
        }
      });
      const rkatInfak = await tx.rkatPengumpulan.findFirst({
        where: {
          OR: [
            { no: rkatInfakNo },
            { nama_program: { contains: "Infak/Sedekah Tidak Terikat via UPZ Pengumpulan" } }
          ]
        }
      });

      // Get month name in Indonesian
      const monthsIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthsIndo[paymentDate.getMonth()];
      const yearNum = paymentDate.getFullYear();
      const prefix = `Penerimaan Bank Jateng (${monthName} ${yearNum}) -`;

      // Count distinct batch names in this month/year to compute next batch number
      const existingRecords = await tx.penerimaanZis.findMany({
        where: {
          no_kuitansi: {
            startsWith: prefix
          }
        },
        select: {
          no_kuitansi: true
        }
      });

      let nextBatchNum = 1;
      if (existingRecords.length > 0) {
        const batchNums = existingRecords.map(rec => {
          const batchPart = rec.no_kuitansi.split(' / ')[0];
          const numStr = batchPart.replace(prefix, '').trim();
          const parsed = parseInt(numStr, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
        nextBatchNum = Math.max(...batchNums, 0) + 1;
      }

      const batchName = `${prefix} ${nextBatchNum}`;

      const createdItems: any[] = [];
      let totalNominal = 0;
      const allUpzs = await tx.upz.findMany();

      // Ensure credit COAs exist once before the loop
      const coaZakatExists = await tx.chartOfAccounts.findUnique({ where: { coa_code: coaZakatCode } });
      if (!coaZakatExists) {
        await tx.chartOfAccounts.create({
          data: {
            coa_code: coaZakatCode,
            nama_akun: 'Zakat Maal Perorangan via UPZ Pengumpulan',
            klasifikasi: 'Penerimaan',
            tipe_dana: 'ZAKAT'
          }
        });
      }
      const coaInfakExists = await tx.chartOfAccounts.findUnique({ where: { coa_code: coaInfakCode } });
      if (!coaInfakExists) {
        await tx.chartOfAccounts.create({
          data: {
            coa_code: coaInfakCode,
            nama_akun: 'Infak/Sedekah Tidak Terikat via UPZ Pengumpulan',
            klasifikasi: 'Penerimaan',
            tipe_dana: 'INFAK_TIDAK_TERIKAT'
          }
        });
      }

      // Pre-fetch all Muzakki records in a single query
      const muzakkiIds = Array.from(new Set(transactions.map((t: any) => t.muzakki_id).filter(Boolean)));
      const muzakkis = await tx.muzakki.findMany({
        where: { id: { in: muzakkiIds as string[] } }
      });
      const muzakkiMap = new Map(muzakkis.map(m => [m.id, m]));

      const penerimaanZisRecords: any[] = [];
      const realisasiRecords: any[] = [];
      const journalEntryRecords: any[] = [];
      const muzakkiUpdates: { id: string; no_rekening: string }[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const item = transactions[i];
        const nominalVal = Number(item.nominal);
        totalNominal += nominalVal;
        totalBatchNominal += nominalVal;

        const no_kuitansi = `${batchName} / ${i + 1}`;

        const muzakki = muzakkiMap.get(item.muzakki_id);
        if (!muzakki) throw new Error(`Muzakki dengan ID ${item.muzakki_id} tidak ditemukan`);

        if (item.no_rekening && muzakki.no_rekening !== item.no_rekening) {
          muzakkiUpdates.push({ id: muzakki.id, no_rekening: item.no_rekening });
          muzakki.no_rekening = item.no_rekening;
        }

        const isZakat = nominalVal >= 100000;
        const targetRkat = isZakat ? rkatZakat : rkatInfak;
        if (!targetRkat) {
          throw new Error(`RKAT target untuk ${isZakat ? `Zakat (no. ${rkatZakatNo})` : `Infak (no. ${rkatInfakNo})`} tidak ditemukan di database.`);
        }
        const rkat_id = targetRkat.id;
        const creditCoaCode = isZakat ? coaZakatCode : coaInfakCode;

        const cleanOpd = item.opd ? (String(item.opd).startsWith('UPZ') ? String(item.opd) : `UPZ ${String(item.opd)}`) : 'UPZ';
        const rawOpdName = item.opd ? String(item.opd).replace(/^UPZ\s+/i, '').toLowerCase().trim() : '';

        let upz_id: string | null = null;
        if (rawOpdName) {
          const matchedUpz = allUpzs.find(u => 
            u.nama_upz.toLowerCase().includes(rawOpdName) ||
            rawOpdName.includes(u.nama_upz.toLowerCase())
          );
          if (matchedUpz) upz_id = matchedUpz.id;
        }

        let kode_program = isZakat ? '102.1' : '102.5';
        let jenis_program = isZakat ? 'Zakat Maal UPZ Kota (UPZ Pengumpulan)' : 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota (UPZ Pengumpulan)';

        if (rawOpdName.includes('kecamatan')) {
          kode_program = isZakat ? '102.2' : '102.6';
          jenis_program = isZakat ? 'Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)' : 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan (UPZ Pengumpulan)';
        }

        const formattedKeterangan = `Terima ${isZakat ? 'Zakat Maal' : 'Infak'} a.n ${muzakki.nama} (${cleanOpd})`;

        const penerimaanId = randomUUID();
        const transaksi_id = randomUUID();

        penerimaanZisRecords.push({
          id: penerimaanId,
          no_kuitansi,
          muzakki_id: item.muzakki_id,
          upz_id,
          rkat_id,
          kode_program,
          jenis_program,
          bank_account_id,
          nominal: new Prisma.Decimal(nominalVal),
          metode_pembayaran: 'TRANSFER',
          tanggal_pembayaran: paymentDate,
          keterangan: formattedKeterangan,
          status_simba: 'PENDING',
          no_transaksi_simba: null,
          transaksi_id: transaksi_id
        });

        realisasiRecords.push({
          transaksi_id: transaksi_id,
          rkat_id,
          tanggal: paymentDate,
          keterangan: formattedKeterangan,
          nrm: selected_transit_id || null
        });

        const debitCoaCode = isTransit ? '49000001' : bankAccount.coa_code;
        const debitAccountId = isTransit ? null : bank_account_id;

        journalEntryRecords.push({
          entry_id: randomUUID(),
          transaksi_id: transaksi_id,
          coa_code: debitCoaCode,
          debit: new Prisma.Decimal(nominalVal),
          kredit: new Prisma.Decimal(0.00),
          account_id: debitAccountId
        });

        journalEntryRecords.push({
          entry_id: randomUUID(),
          transaksi_id: transaksi_id,
          coa_code: creditCoaCode,
          debit: new Prisma.Decimal(0.00),
          kredit: new Prisma.Decimal(nominalVal),
          account_id: null
        });
      }

      // Update Muzakki account numbers
      for (const mUpd of muzakkiUpdates) {
        await tx.muzakki.update({
          where: { id: mUpd.id },
          data: { no_rekening: mUpd.no_rekening }
        });
      }

      // Execute Bulk Inserts (1 query per model instead of thousands inside loop)
      if (penerimaanZisRecords.length > 0) {
        await tx.penerimaanZis.createMany({ data: penerimaanZisRecords });
      }
      if (realisasiRecords.length > 0) {
        await tx.realisasi.createMany({ data: realisasiRecords });
      }
      if (journalEntryRecords.length > 0) {
        await tx.journalEntry.createMany({ data: journalEntryRecords });
      }

      // Process failed transactions in bulk
      const failedTransactions = req.body.failedTransactions || [];
      const failedPenerimaanRecords: any[] = [];
      for (let j = 0; j < failedTransactions.length; j++) {
        const failedItem = failedTransactions[j];
        const nominalVal = Number(failedItem.nominal) || 0;
        const no_kuitansi = `${batchName} / Gagal / ${j + 1}`;
        
        const failedKeterangan = JSON.stringify({
          type: 'failed_deduction',
          nama: failedItem.nama || '-',
          opd: failedItem.opd || 'Lainnya',
          no_rekening: failedItem.no_rekening || '-',
          keterangan: failedItem.keterangan || 'Gagal Potong'
        });

        failedPenerimaanRecords.push({
          id: randomUUID(),
          no_kuitansi,
          muzakki_id: null,
          rkat_id: null,
          bank_account_id,
          nominal: new Prisma.Decimal(nominalVal),
          metode_pembayaran: 'TRANSFER',
          tanggal_pembayaran: paymentDate,
          keterangan: failedKeterangan,
          status_simba: 'FAILED',
          transaksi_id: null
        });
      }

      if (failedPenerimaanRecords.length > 0) {
        await tx.penerimaanZis.createMany({ data: failedPenerimaanRecords });
      }

      // Update BankAccount balance only if not transit source
      if (!isTransit) {
        await tx.bankAccount.update({
          where: { account_id: bank_account_id },
          data: {
            saldo: { increment: new Prisma.Decimal(totalNominal) }
          }
        });
      }

      return createdItems;
    }, {
      maxWait: 30000,
      timeout: 300000 // 5 minutes timeout for large bulk batch import (e.g. 1200+ transactions)
    });

    if (selected_transit_id) {
      try {
        const fs = require('fs');
        const path = require('path');
        const jsonPath = path.join(__dirname, '../data/mutations.json');
        if (fs.existsSync(jsonPath)) {
          const muts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8') || '[]');
          let updated = false;
          const newMuts = muts.map((m: any) => {
            if (m.id === selected_transit_id) {
              updated = true;
              const currentAllocated = Number(m.allocatedNominal || 0) + Number(totalBatchNominal || 0);
              const totalMutNominal = Number(m.nominal || 0);
              const isFullyReconciled = currentAllocated >= totalMutNominal - 0.01;

              return {
                ...m,
                allocatedNominal: currentAllocated,
                status: isFullyReconciled ? 'RECONCILED' : 'PARTIAL',
                reconciledAt: new Date().toISOString(),
                reconciledBy: 'System / Bank Jateng Import'
              };
            }
            return m;
          });
          if (updated) {
            fs.writeFileSync(jsonPath, JSON.stringify(newMuts, null, 2), 'utf-8');
          }
        }
      } catch (mErr) {
        console.error('Error updating mutations.json status:', mErr);
      }
    }

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
        OR: [
          {
            no_kuitansi: {
              startsWith: 'BSZ-JTG-'
            }
          },
          {
            no_kuitansi: {
              startsWith: 'Penerimaan Bank Jateng ('
            }
          }
        ]
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

export const deleteBatch = async (req: Request, res: Response): Promise<void> => {
  const batchName = req.params.batchName as string;
  try {
    if (!batchName) {
      res.status(400).json({ status: 'error', error: 'Nama batch tidak boleh kosong' });
      return;
    }

    // Find all records in this batch
    const records = await prisma.penerimaanZis.findMany({
      where: {
        OR: [
          { no_kuitansi: { startsWith: `${batchName} / ` } },
          { no_kuitansi: batchName }
        ]
      }
    });

    if (records.length === 0) {
      res.status(404).json({ status: 'error', error: 'Batch tidak ditemukan atau tidak memiliki transaksi' });
      return;
    }

    // Process deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Group total nominal by bank account to decrement balance
      const balanceDecrements: Record<string, number> = {};
      for (const rec of records) {
        if (rec.bank_account_id && rec.nominal && rec.status_simba !== 'FAILED') {
          const nominalVal = Number(rec.nominal);
          balanceDecrements[rec.bank_account_id] = (balanceDecrements[rec.bank_account_id] || 0) + nominalVal;
        }
      }

      // Decrement Bank Account balances
      for (const [bankId, amount] of Object.entries(balanceDecrements)) {
        await tx.bankAccount.update({
          where: { account_id: bankId },
          data: {
            saldo: { decrement: new Prisma.Decimal(amount) }
          }
        });
      }

      // Collect all transaction IDs and linked mutation IDs (nrm)
      const txIds = records.map(r => r.transaksi_id).filter(id => id !== null) as string[];
      let affectedNrms: string[] = [];

      if (txIds.length > 0) {
        const linkedRealisasi = await tx.realisasi.findMany({
          where: {
            transaksi_id: { in: txIds },
            nrm: { not: null }
          },
          select: { nrm: true }
        });
        affectedNrms = Array.from(new Set(linkedRealisasi.map(r => r.nrm).filter(Boolean))) as string[];

        // Delete Journal Entries
        await tx.journalEntry.deleteMany({
          where: {
            transaksi_id: { in: txIds }
          }
        });

        // Delete ZIS receipts
        await tx.penerimaanZis.deleteMany({
          where: {
            id: { in: records.map(r => r.id) }
          }
        });

        // Delete Realisasi records
        await tx.realisasi.deleteMany({
          where: {
            transaksi_id: { in: txIds }
          }
        });
      } else {
        // Fallback: delete ZIS receipts directly if no transaksi_id
        await tx.penerimaanZis.deleteMany({
          where: {
            id: { in: records.map(r => r.id) }
          }
        });
      }

      // Revert mutations.json status for affected transit mutations
      if (affectedNrms.length > 0) {
        try {
          const fs = require('fs');
          const path = require('path');
          const jsonPath = path.join(__dirname, '../data/mutations.json');
          if (fs.existsSync(jsonPath)) {
            const muts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8') || '[]');
            let updated = false;

            for (const nrm of affectedNrms) {
              const remainingRealisasi = await tx.realisasi.findMany({
                where: { nrm },
                select: { transaksi_id: true }
              });
              const remainingTxIds = remainingRealisasi.map(r => r.transaksi_id);

              const remainingReceipts = remainingTxIds.length > 0
                ? await tx.penerimaanZis.aggregate({
                    where: {
                      transaksi_id: { in: remainingTxIds },
                      status_simba: { not: 'FAILED' }
                    },
                    _sum: { nominal: true }
                  })
                : { _sum: { nominal: null } };

              const remainingAllocated = Number(remainingReceipts._sum?.nominal || 0);

              muts.forEach((m: any) => {
                if (m.id === nrm) {
                  updated = true;
                  const sisa = Math.max(0, Number(m.nominal || 0) - remainingAllocated);
                  m.allocatedNominal = remainingAllocated;
                  m.status = remainingAllocated <= 0.01 ? 'PENDING' : (sisa <= 0.01 ? 'RECONCILED' : 'PARTIAL');
                }
              });
            }

            if (updated) {
              fs.writeFileSync(jsonPath, JSON.stringify(muts, null, 2), 'utf-8');
            }
          }
        } catch (mErr) {
          console.error('Error updating mutations.json in deleteBatch:', mErr);
        }
      }
    });

    res.status(200).json({ status: 'success', message: `Batch ${batchName} berhasil dihapus` });
  } catch (error: any) {
    console.error('Error deleting Bank Jateng batch:', error);
    res.status(500).json({ status: 'error', error: error.message || String(error) });
  }
};

export const updateBatchSimba = async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ status: 'error', message: 'Daftar transaksi yang di-update tidak boleh kosong' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        if (!item.id) continue;
        const simbaNo = item.no_transaksi_simba ? String(item.no_transaksi_simba).trim() : null;
        await tx.penerimaanZis.update({
          where: { id: item.id },
          data: {
            no_transaksi_simba: simbaNo,
            status_simba: (simbaNo && simbaNo.length > 0) ? 'SYNCED' : 'PENDING'
          }
        });
      }
    });

    res.status(200).json({ status: 'success', message: 'Berhasil meng-update No Transaksi SIMBA Batch!' });
  } catch (error: any) {
    console.error('Error updating Batch SIMBA:', error);
    res.status(500).json({ status: 'error', error: error.message || String(error) });
  }
};
