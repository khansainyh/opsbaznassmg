import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

const filePath = path.join(__dirname, '../data/mutations.json');

// Helper to read mutations from JSON file
const readMutations = (): any[] => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      const defaultMutations: any[] = [];
      fs.writeFileSync(filePath, JSON.stringify(defaultMutations, null, 2), 'utf-8');
      return defaultMutations;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (error) {
    console.error('Error reading mutations file:', error);
    return [];
  }
};

// Helper to write mutations to JSON file
const writeMutations = (data: any[]) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing mutations file:', error);
  }
};

export const getMutations = async (req: Request, res: Response) => {
  try {
    const mutations = readMutations();
    
    // Find all bank accounts to assign dynamically if bankAccountId is empty
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { tipe_kas: 'BANK' }
    });

    let updated = false;
    const mapped = mutations.map(m => {
      if (!m.bankAccountId && bankAccounts.length > 0) {
        // Try matching by bank name prefix or fallback to first bank account
        const match = bankAccounts.find(ba => ba.nama_akun.toLowerCase().includes(m.bankName.split(' ')[0].toLowerCase())) || bankAccounts[0];
        if (match) {
          m.bankAccountId = match.account_id;
          m.bankName = match.nama_akun;
          updated = true;
        }
      }
      if (!m.type) {
        m.type = 'DEBIT'; // Default legacy bank statement mutations to DEBIT (money in)
        updated = true;
      }
      return m;
    });

    if (updated) {
      writeMutations(mapped);
    }

    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createMutation = async (req: Request, res: Response) => {
  try {
    const { tanggal, bankAccountId, keteranganBank, nominal } = req.body;
    if (!tanggal || !bankAccountId || !keteranganBank || !nominal) {
      res.status(400).json({ error: 'Tanggal, bankAccount, keteranganBank, dan nominal wajib diisi' });
      return;
    }

    const account = await prisma.bankAccount.findUnique({
      where: { account_id: bankAccountId } as any
    }) as any;

    if (!account) {
      res.status(404).json({ error: 'Akun Bank tidak ditemukan' });
      return;
    }

    const mutations = readMutations();
    const newMutation = {
      id: `mut-${Date.now()}`,
      tanggal,
      bankAccountId,
      bankName: account.nama_akun,
      keteranganBank,
      nominal: Number(nominal),
      type: 'DEBIT', // Default for bank mutations created manually on the bank side (credited statement = money in)
      status: 'PENDING'
    };

    mutations.push(newMutation);
    writeMutations(mutations);

    res.status(201).json(newMutation);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteMutation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mutations = readMutations();
    const index = mutations.findIndex(m => m.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Mutasi bank tidak ditemukan' });
      return;
    }

    mutations.splice(index, 1);
    writeMutations(mutations);

    res.status(200).json({ success: true, message: 'Mutasi bank berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const reconcileMutation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { muzakkiId, muzakkiName, coaCode, rkatId, sumberDana, keteranganRealisasi, userName } = req.body;

    const mutations = readMutations();
    const mutationIndex = mutations.findIndex(m => m.id === id);

    if (mutationIndex === -1) {
      res.status(404).json({ error: 'Mutasi bank/transaksi tidak ditemukan' });
      return;
    }

    const mutation = mutations[mutationIndex];
    if (mutation.status === 'RECONCILED') {
      res.status(400).json({ error: 'Mutasi/transaksi sudah terekonsiliasi' });
      return;
    }

    const isDebit = mutation.type !== 'KREDIT';

    if (!coaCode || (isDebit && !sumberDana) || !keteranganRealisasi) {
      res.status(400).json({ error: 'Kode COA, Sumber Dana (untuk Penerimaan), dan Keterangan wajib diisi' });
      return;
    }

    let bankAccount = await prisma.bankAccount.findUnique({
      where: { account_id: mutation.bankAccountId } as any
    }) as any;

    if (!bankAccount) {
      const allAccounts = await prisma.bankAccount.findMany();
      const matched = allAccounts.find(a => 
        a.nama_akun.toLowerCase().includes(mutation.bankName.toLowerCase()) ||
        mutation.bankName.toLowerCase().includes(a.nama_akun.toLowerCase())
      ) as any;
      if (matched) {
        bankAccount = matched;
        mutation.bankAccountId = matched.account_id;
      }
    }

    if (!bankAccount) {
      res.status(404).json({ error: 'Akun bank/kas tidak ditemukan' });
      return;
    }

    // If Kredit, verify that there is enough balance
    if (!isDebit && Number(bankAccount.saldo) < Number(mutation.nominal)) {
      res.status(400).json({ 
        error: `Saldo di ${bankAccount.nama_akun} tidak mencukupi untuk memposting transaksi ini! Tersedia: Rp ${Number(bankAccount.saldo).toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(mutation.nominal).toLocaleString('id-ID')}` 
      });
      return;
    }

    // Post to ledger inside database transaction!
    await prisma.$transaction(async (tx) => {
      const nominal = Number(mutation.nominal);

      // 1. Create Realisasi entry
      const realisasi = await tx.realisasi.create({
        data: {
          rkat_id: isDebit ? (rkatId || null) : null,
          tanggal: new Date(mutation.tanggal),
          keterangan: isDebit
            ? `Rekonsiliasi Mutasi - Penerimaan dari ${muzakkiName || 'Hamba Allah'} (${keteranganRealisasi})`
            : `Rekonsiliasi Mutasi - Penyaluran/Penggunaan (${keteranganRealisasi})`
        }
      });

      // 2. Update Bank account balance
      if (isDebit) {
        await tx.bankAccount.update({
          where: { account_id: mutation.bankAccountId } as any,
          data: {
            saldo: { increment: new Prisma.Decimal(nominal) }
          }
        });
      } else {
        await tx.bankAccount.update({
          where: { account_id: mutation.bankAccountId } as any,
          data: {
            saldo: { decrement: new Prisma.Decimal(nominal) }
          }
        });
      }

      // 3. JournalEntries mapping depending on Debit vs Kredit
      if (isDebit) {
        // JournalEntry (Debit) -> Bank Account COA Code
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasi.transaksi_id,
            coa_code: bankAccount.coa_code,
            debit: new Prisma.Decimal(nominal),
            kredit: new Prisma.Decimal(0),
            account_id: mutation.bankAccountId
          }
        });

        // JournalEntry (Credit) -> Chosen Penerimaan COA Code
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasi.transaksi_id,
            coa_code: coaCode,
            debit: new Prisma.Decimal(0),
            kredit: new Prisma.Decimal(nominal),
            account_id: null
          }
        });

        // 4. Create synced PenerimaanZis entry
        if (rkatId) {
          const noKuitansi = `BSZ-MUT-${mutation.id}`;
          const existingKuitansi = await tx.penerimaanZis.findUnique({
            where: { no_kuitansi: noKuitansi }
          });

          if (!existingKuitansi) {
            await tx.penerimaanZis.create({
              data: {
                no_kuitansi: noKuitansi,
                muzakki_id: muzakkiId || null,
                rkat_id: rkatId,
                bank_account_id: mutation.bankAccountId,
                nominal: new Prisma.Decimal(nominal),
                metode_pembayaran: 'TRANSFER',
                tanggal_pembayaran: new Date(mutation.tanggal),
                keterangan: keteranganRealisasi,
                status_simba: 'SYNCED',
                transaksi_id: realisasi.transaksi_id
              }
            });
          }
        }
      } else {
        // JournalEntry (Debit) -> Chosen Penyaluran/Beban COA Code (from Pelaporan)
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasi.transaksi_id,
            coa_code: coaCode,
            debit: new Prisma.Decimal(nominal),
            kredit: new Prisma.Decimal(0),
            account_id: null
          }
        });

        // JournalEntry (Credit) -> Bank Account COA Code
        await tx.journalEntry.create({
          data: {
            transaksi_id: realisasi.transaksi_id,
            coa_code: bankAccount.coa_code,
            debit: new Prisma.Decimal(0),
            kredit: new Prisma.Decimal(nominal),
            account_id: mutation.bankAccountId
          }
        });
      }
    });

    // Update JSON mutation state
    mutation.status = 'RECONCILED';
    mutation.reconciledAt = new Date().toISOString();
    mutation.reconciledBy = userName || 'Staff';
    mutation.muzakkiId = muzakkiId || null;
    mutation.muzakkiName = muzakkiName || 'Hamba Allah';
    mutation.coaCode = coaCode;
    mutation.sumberDana = isDebit ? sumberDana : '-';
    mutation.keteranganRealisasi = keteranganRealisasi;

    mutations[mutationIndex] = mutation;
    writeMutations(mutations);

    res.status(200).json({ success: true, message: 'Transaksi berhasil direkonsiliasi dan diposting ke Buku Besar!' });
  } catch (error) {
    console.error('Error during bank mutation reconciliation:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const identifyMutationAsPenerimaan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { muzakkiId, rkatId, userName, keterangan } = req.body;

    const mutations = readMutations();
    const mutationIndex = mutations.findIndex(m => m.id === id);

    if (mutationIndex === -1) {
      res.status(404).json({ error: 'Mutasi bank tidak ditemukan' });
      return;
    }

    const mutation = mutations[mutationIndex];
    if (mutation.status === 'RECONCILED') {
      res.status(400).json({ error: 'Mutasi bank sudah diidentifikasi/terekonsiliasi' });
      return;
    }

    if (!muzakkiId || !rkatId) {
      res.status(400).json({ error: 'Muzakki dan Kegiatan (RKAT) wajib dipilih' });
      return;
    }

    // Fetch required database records
    const muzakki = await prisma.muzakki.findUnique({ where: { id: muzakkiId } });
    if (!muzakki) {
      res.status(450).json({ error: 'Muzakki tidak ditemukan' });
      return;
    }

    const rkat = await prisma.rkatPengumpulan.findUnique({ where: { id: rkatId } });
    if (!rkat) {
      res.status(404).json({ error: 'Program RKAT tidak ditemukan' });
      return;
    }

    let bankAccount = await prisma.bankAccount.findUnique({ where: { account_id: mutation.bankAccountId } });
    if (!bankAccount) {
      const allAccounts = await prisma.bankAccount.findMany();
      const matched = allAccounts.find(a => 
        a.nama_akun.toLowerCase().includes(mutation.bankName.toLowerCase()) ||
        mutation.bankName.toLowerCase().includes(a.nama_akun.toLowerCase())
      );
      if (matched) {
        bankAccount = matched;
        mutation.bankAccountId = matched.account_id;
      }
    }
    if (!bankAccount) {
      res.status(404).json({ error: 'Rekening penerima tidak ditemukan' });
      return;
    }

    // Generate custom kuitansi
    const noKuitansi = `BSZ-MUT-${mutation.id}`;

    // Verify kuitansi is unique
    const existingKuitansi = await prisma.penerimaanZis.findUnique({
      where: { no_kuitansi: noKuitansi }
    });
    if (existingKuitansi) {
      res.status(400).json({ error: 'Mutasi bank ini sudah teridentifikasi sebagai Penerimaan ZIS' });
      return;
    }

    const nominal = Number(mutation.nominal);
    const formattedKeterangan = keterangan || `Identifikasi Mutasi: Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama} (Keterangan Bank: ${mutation.keteranganBank})`;

    // Create PenerimaanZis record in PENDING state (since SIMBA sync will trigger journal/balance entries later)
    await prisma.penerimaanZis.create({
      data: {
        no_kuitansi: noKuitansi,
        muzakki_id: muzakkiId,
        rkat_id: rkatId,
        bank_account_id: mutation.bankAccountId,
        nominal: new Prisma.Decimal(nominal),
        metode_pembayaran: 'TRANSFER',
        tanggal_pembayaran: new Date(mutation.tanggal),
        keterangan: formattedKeterangan,
        status_simba: 'PENDING',
        transaksi_id: null
      }
    });

    // Update JSON mutation state
    mutation.status = 'RECONCILED';
    mutation.reconciledAt = new Date().toISOString();
    mutation.reconciledBy = userName || 'Staff';
    mutation.muzakkiId = muzakkiId;
    mutation.muzakkiName = muzakki.nama;
    mutation.coaCode = rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101';
    mutation.sumberDana = rkat.kategori || 'ZAKAT';
    mutation.keteranganRealisasi = formattedKeterangan;

    mutations[mutationIndex] = mutation;
    writeMutations(mutations);

    res.status(200).json({ success: true, message: 'Berhasil mengidentifikasi mutasi bank sebagai Penerimaan ZIS (masuk antrean SIMBA)!' });
  } catch (error: any) {
    console.error('Error identifying bank mutation:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
