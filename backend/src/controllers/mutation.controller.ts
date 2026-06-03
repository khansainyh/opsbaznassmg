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
      status: 'PENDING'
    };

    mutations.push(newMutation);
    writeMutations(mutations);

    res.status(201).json(newMutation);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const reconcileMutation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { muzakkiId, muzakkiName, coaCode, sumberDana, keteranganRealisasi, userName } = req.body;

    if (!coaCode || !sumberDana || !keteranganRealisasi) {
      res.status(400).json({ error: 'Kode COA, Sumber Dana, dan Keterangan wajib diisi' });
      return;
    }

    const mutations = readMutations();
    const mutationIndex = mutations.findIndex(m => m.id === id);

    if (mutationIndex === -1) {
      res.status(404).json({ error: 'Mutasi bank tidak ditemukan' });
      return;
    }

    const mutation = mutations[mutationIndex];
    if (mutation.status === 'RECONCILED') {
      res.status(400).json({ error: 'Mutasi bank sudah terekonsiliasi' });
      return;
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { account_id: mutation.bankAccountId } as any
    }) as any;

    if (!bankAccount) {
      res.status(404).json({ error: 'Akun bank tidak ditemukan' });
      return;
    }

    // Post to ledger inside database transaction!
    await prisma.$transaction(async (tx) => {
      const nominal = Number(mutation.nominal);

      // 1. Create Realisasi entry
      const realisasi = await tx.realisasi.create({
        data: {
          tanggal: new Date(mutation.tanggal),
          keterangan: `Rekonsiliasi Mutasi Bank - Penerimaan dari ${muzakkiName || 'Hamba Allah'} (${keteranganRealisasi})`
        }
      });

      // 2. Increment Bank account balance
      await tx.bankAccount.update({
        where: { account_id: mutation.bankAccountId } as any,
        data: {
          saldo: { increment: new Prisma.Decimal(nominal) }
        }
      });

      // 3. JournalEntry (Debit) -> Bank Account COA Code
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: bankAccount.coa_code,
          debit: new Prisma.Decimal(nominal),
          kredit: new Prisma.Decimal(0),
          account_id: mutation.bankAccountId
        }
      });

      // 4. JournalEntry (Credit) -> Chosen Penerimaan COA Code
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: coaCode,
          debit: new Prisma.Decimal(0),
          kredit: new Prisma.Decimal(nominal),
          account_id: null
        }
      });
    });

    // Update JSON mutation state
    mutation.status = 'RECONCILED';
    mutation.reconciledAt = new Date().toISOString();
    mutation.reconciledBy = userName || 'Staff';
    mutation.muzakkiId = muzakkiId || null;
    mutation.muzakkiName = muzakkiName || 'Hamba Allah';
    mutation.coaCode = coaCode;
    mutation.sumberDana = sumberDana;
    mutation.keteranganRealisasi = keteranganRealisasi;

    mutations[mutationIndex] = mutation;
    writeMutations(mutations);

    res.status(200).json({ success: true, message: 'Mutasi Bank berhasil direkonsiliasi dan diposting ke Buku Besar!' });
  } catch (error) {
    console.error('Error during bank mutation reconciliation:', error);
    res.status(500).json({ error: String(error) });
  }
};
