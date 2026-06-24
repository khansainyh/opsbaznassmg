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
    const { tanggal, bankAccountId, keteranganBank, nominal, type } = req.body;
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
      type: type === 'KREDIT' ? 'KREDIT' : 'DEBIT',
      status: 'PENDING'
    };

    mutations.push(newMutation);
    writeMutations(mutations);

    res.status(201).json(newMutation);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateMutation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tanggal, bankAccountId, keteranganBank, nominal, type } = req.body;

    const mutations = readMutations();
    const index = mutations.findIndex(m => m.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Mutasi bank tidak ditemukan' });
      return;
    }

    const mutation = mutations[index];
    if (mutation.status === 'RECONCILED') {
      res.status(400).json({ error: 'Mutasi bank yang sudah direkonsiliasi tidak dapat diubah' });
      return;
    }

    const account = await prisma.bankAccount.findUnique({
      where: { account_id: bankAccountId } as any
    }) as any;

    if (!account) {
      res.status(404).json({ error: 'Akun Bank tidak ditemukan' });
      return;
    }

    mutation.tanggal = tanggal || mutation.tanggal;
    mutation.bankAccountId = bankAccountId || mutation.bankAccountId;
    mutation.bankName = account.nama_akun;
    mutation.keteranganBank = keteranganBank || mutation.keteranganBank;
    mutation.nominal = nominal !== undefined ? Number(nominal) : mutation.nominal;
    mutation.type = type === 'KREDIT' ? 'KREDIT' : 'DEBIT';

    mutations[index] = mutation;
    writeMutations(mutations);

    res.status(200).json(mutation);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const bulkCreateMutations = async (req: Request, res: Response) => {
  try {
    const { bankAccountId, items } = req.body;
    if (!bankAccountId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Data bankAccountId dan list items wajib dikirim' });
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
    const created: any[] = [];

    items.forEach((item: any, idx: number) => {
      const { tanggal, keteranganBank, nominal, type } = item;
      
      // Basic check
      if (!tanggal || !keteranganBank || !nominal) return;

      const newMutation = {
        id: `mut-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        tanggal,
        bankAccountId,
        bankName: account.nama_akun,
        keteranganBank,
        nominal: Number(nominal),
        type: type === 'KREDIT' ? 'KREDIT' : 'DEBIT',
        status: 'PENDING'
      };

      mutations.push(newMutation);
      created.push(newMutation);
    });

    writeMutations(mutations);

    res.status(201).json({ success: true, count: created.length, data: created });
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
    const id = String(req.params.id);
    const { muzakkiId, muzakkiName, coaCode, rkatId, sumberDana, keteranganRealisasi, userName } = req.body;

    const mutations = readMutations();
    const mutationIndex = mutations.findIndex(m => m.id === id);

    if (mutationIndex === -1) {
      res.status(404).json({ error: 'Mutasi bank/transaksi tidak ditemukan' });
      return;
    }

    const mutation = mutations[mutationIndex];
    const isEdit = mutation.status === 'RECONCILED';
    const isDebit = mutation.type !== 'KREDIT';

    if (!coaCode || (isDebit && !sumberDana) || !keteranganRealisasi) {
      res.status(400).json({ error: 'Kode COA, Sumber Dana (untuk Penerimaan), dan Keterangan wajib diisi' });
      return;
    }

    let existingRealisasi: any = null;
    if (isEdit) {
      existingRealisasi = await prisma.realisasi.findFirst({
        where: { nrm: id }
      });
      if (!existingRealisasi && isDebit) {
        const pz = await prisma.penerimaanZis.findUnique({
          where: { no_kuitansi: `BSZ-MUT-${id}` }
        });
        if (pz && pz.transaksi_id) {
          existingRealisasi = await prisma.realisasi.findUnique({
            where: { transaksi_id: pz.transaksi_id }
          });
        }
      }
      if (!existingRealisasi) {
        res.status(404).json({ error: 'Data realisasi transaksi terekonsiliasi tidak ditemukan di database' });
        return;
      }
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
      const kasAccount = await prisma.bankAccount.findUnique({
        where: { account_id: bankAccount?.account_id || mutation.bankAccountId }
      });
      if (!kasAccount) {
        res.status(404).json({ error: 'Akun bank/kas tidak ditemukan' });
        return;
      }
      bankAccount = kasAccount;
    }

    // If Kredit, verify that there is enough balance (adjusting for old nominal if editing)
    const nominal = Number(mutation.nominal);
    const oldNominal = isEdit ? Number(mutation.nominal) : 0;
    const currentBalance = Number(bankAccount.saldo);
    if (!isDebit && !isEdit && currentBalance < nominal) {
      res.status(400).json({ 
        error: `Saldo di ${bankAccount.nama_akun} tidak mencukupi untuk memposting transaksi ini! Tersedia: Rp ${currentBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${nominal.toLocaleString('id-ID')}` 
      });
      return;
    }

    // Post to ledger inside database transaction!
    await prisma.$transaction(async (tx) => {
      // Revert old bank account balance if edit
      if (isEdit) {
        if (isDebit) {
          await tx.bankAccount.update({
            where: { account_id: mutation.bankAccountId } as any,
            data: {
              saldo: { decrement: new Prisma.Decimal(oldNominal) }
            }
          });
        } else {
          await tx.bankAccount.update({
            where: { account_id: mutation.bankAccountId } as any,
            data: {
              saldo: { increment: new Prisma.Decimal(oldNominal) }
            }
          });
        }
      }

      // Update or create Realisasi entry
      let realisasi;
      const realisasiKeterangan = isDebit
        ? `Rekonsiliasi Mutasi - Penerimaan dari ${muzakkiName || 'Hamba Allah'} (${keteranganRealisasi})`
        : `Rekonsiliasi Mutasi - Penyaluran/Penggunaan (${keteranganRealisasi})`;

      if (isEdit && existingRealisasi) {
        realisasi = await tx.realisasi.update({
          where: { transaksi_id: existingRealisasi.transaksi_id },
          data: {
            rkat_id: rkatId || null,
            keterangan: realisasiKeterangan,
            nrm: id
          }
        });
      } else {
        realisasi = await tx.realisasi.create({
          data: {
            rkat_id: rkatId || null,
            tanggal: new Date(mutation.tanggal),
            keterangan: realisasiKeterangan,
            nrm: id
          }
        });
      }

      // Update Bank account balance with new nominal
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

      // Delete old journal entries if editing
      if (isEdit && existingRealisasi) {
        await tx.journalEntry.deleteMany({
          where: { transaksi_id: existingRealisasi.transaksi_id }
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

        // Create or update synced PenerimaanZis entry
        const noKuitansi = `BSZ-MUT-${mutation.id}`;
        if (isEdit) {
          await tx.penerimaanZis.update({
            where: { no_kuitansi: noKuitansi },
            data: {
              muzakki_id: muzakkiId || null,
              rkat_id: rkatId || null,
              bank_account_id: mutation.bankAccountId,
              nominal: new Prisma.Decimal(nominal),
              keterangan: keteranganRealisasi
            }
          });
        } else {
          const existingKuitansi = await tx.penerimaanZis.findUnique({
            where: { no_kuitansi: noKuitansi }
          });

          if (!existingKuitansi) {
            await tx.penerimaanZis.create({
              data: {
                no_kuitansi: noKuitansi,
                muzakki_id: muzakkiId || null,
                rkat_id: rkatId || null,
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
    mutation.rkatId = rkatId || null;
    mutation.sumberDana = isDebit ? sumberDana : '-';
    mutation.keteranganRealisasi = keteranganRealisasi;

    mutations[mutationIndex] = mutation;
    writeMutations(mutations);

    res.status(200).json({ success: true, message: isEdit ? 'Rekonsiliasi transaksi berhasil diperbarui dan Jurnal Buku Besar disesuaikan!' : 'Transaksi berhasil direkonsiliasi dan diposting ke Buku Besar!' });
  } catch (error) {
    console.error('Error during bank mutation reconciliation:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const identifyMutationAsPenerimaan = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { muzakkiId, rkatId, coaCode, userName, keterangan } = req.body;

    const mutations = readMutations();
    const mutationIndex = mutations.findIndex(m => m.id === id);

    if (mutationIndex === -1) {
      res.status(404).json({ error: 'Mutasi bank tidak ditemukan' });
      return;
    }

    const mutation = mutations[mutationIndex];
    const isEdit = mutation.status === 'RECONCILED';

    if (!muzakkiId || (!rkatId && !coaCode)) {
      res.status(400).json({ error: 'Muzakki dan Kegiatan (atau COA jika di luar RKAT) wajib dipilih' });
      return;
    }

    let existingRealisasi: any = null;
    if (isEdit) {
      existingRealisasi = await prisma.realisasi.findFirst({
        where: { nrm: id }
      });
      if (!existingRealisasi) {
        const pz = await prisma.penerimaanZis.findUnique({
          where: { no_kuitansi: `BSZ-MUT-${id}` }
        });
        if (pz && pz.transaksi_id) {
          existingRealisasi = await prisma.realisasi.findUnique({
            where: { transaksi_id: pz.transaksi_id }
          });
        }
      }
      if (!existingRealisasi) {
        res.status(404).json({ error: 'Data realisasi transaksi terekonsiliasi tidak ditemukan di database' });
        return;
      }
    }

    // Fetch required database records
    const muzakki = await prisma.muzakki.findUnique({ where: { id: muzakkiId } });
    if (!muzakki) {
      res.status(400).json({ error: 'Muzakki tidak ditemukan' });
      return;
    }

    let rkat = null;
    if (rkatId) {
      rkat = await prisma.rkatPengumpulan.findUnique({ where: { id: rkatId } });
      if (!rkat) {
        res.status(404).json({ error: 'Program RKAT tidak ditemukan' });
        return;
      }
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

    // Verify kuitansi is unique (only if not editing)
    if (!isEdit) {
      const existingKuitansi = await prisma.penerimaanZis.findUnique({
        where: { no_kuitansi: noKuitansi }
      });
      if (existingKuitansi) {
        res.status(400).json({ error: 'Mutasi bank ini sudah teridentifikasi sebagai Penerimaan ZIS' });
        return;
      }
    }

    const nominal = Number(mutation.nominal);
    const formattedKeterangan = keterangan || (
      rkat
        ? `Identifikasi Mutasi: Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama} (Keterangan Bank: ${mutation.keteranganBank})`
        : `Identifikasi Mutasi: Penerimaan ZIS di luar RKAT via ${bankAccount.nama_akun} dari ${muzakki.nama} (Keterangan Bank: ${mutation.keteranganBank})`
    );

    let creditCoaCode = coaCode || '41010101';
    if (rkat) {
      creditCoaCode = coaCode || (rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101');
    }

    await prisma.$transaction(async (tx) => {
      // Revert old bank account balance if edit
      if (isEdit) {
        await tx.bankAccount.update({
          where: { account_id: mutation.bankAccountId },
          data: {
            saldo: { decrement: new Prisma.Decimal(nominal) }
          }
        });
      }

      // Fetch or create credit COA code
      const coaExists = await tx.chartOfAccounts.findUnique({ where: { coa_code: creditCoaCode } });
      if (!coaExists) {
        await tx.chartOfAccounts.create({
          data: {
            coa_code: creditCoaCode,
            nama_akun: rkat ? `Penerimaan ${rkat.nama_program}` : `Penerimaan di luar RKAT (${creditCoaCode})`,
            klasifikasi: 'Penerimaan',
            tipe_dana: (rkat && rkat.kategori.toUpperCase() === 'ZAKAT') ? 'ZAKAT' : 'INFAK_TIDAK_TERIKAT'
          }
        });
      }

      // Update or create Realisasi entry
      let realisasi;
      if (isEdit && existingRealisasi) {
        realisasi = await tx.realisasi.update({
          where: { transaksi_id: existingRealisasi.transaksi_id },
          data: {
            rkat_id: rkatId || null,
            keterangan: formattedKeterangan,
            nrm: id
          }
        });
      } else {
        realisasi = await tx.realisasi.create({
          data: {
            rkat_id: rkatId || null,
            tanggal: new Date(mutation.tanggal),
            keterangan: formattedKeterangan,
            nrm: id
          }
        });
      }

      // Update Bank account balance (add nominal)
      await tx.bankAccount.update({
        where: { account_id: mutation.bankAccountId },
        data: {
          saldo: { increment: new Prisma.Decimal(nominal) }
        }
      });

      // Delete old journal entries if editing
      if (isEdit && existingRealisasi) {
        await tx.journalEntry.deleteMany({
          where: { transaksi_id: existingRealisasi.transaksi_id }
        });
      }

      // Create Debit JournalEntry (Bank Account)
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: bankAccount.coa_code,
          debit: new Prisma.Decimal(nominal),
          kredit: new Prisma.Decimal(0),
          account_id: mutation.bankAccountId
        }
      });

      // Create Credit JournalEntry (Revenue COA)
      await tx.journalEntry.create({
        data: {
          transaksi_id: realisasi.transaksi_id,
          coa_code: creditCoaCode,
          debit: new Prisma.Decimal(0),
          kredit: new Prisma.Decimal(nominal),
          account_id: null
        }
      });

      // Create or update PenerimaanZis record in PENDING state (but with transaksi_id set)
      if (isEdit) {
        await tx.penerimaanZis.update({
          where: { no_kuitansi: noKuitansi },
          data: {
            muzakki_id: muzakkiId,
            rkat_id: rkatId || null,
            bank_account_id: mutation.bankAccountId,
            nominal: new Prisma.Decimal(nominal),
            keterangan: formattedKeterangan
          }
        });
      } else {
        await tx.penerimaanZis.create({
          data: {
            no_kuitansi: noKuitansi,
            muzakki_id: muzakkiId,
            rkat_id: rkatId || null,
            bank_account_id: mutation.bankAccountId,
            nominal: new Prisma.Decimal(nominal),
            metode_pembayaran: 'TRANSFER',
            tanggal_pembayaran: new Date(mutation.tanggal),
            keterangan: formattedKeterangan,
            status_simba: 'PENDING',
            transaksi_id: realisasi.transaksi_id
          }
        });
      }
    });

    // Update JSON mutation state
    mutation.status = 'RECONCILED';
    mutation.reconciledAt = new Date().toISOString();
    mutation.reconciledBy = userName || 'Staff';
    mutation.muzakkiId = muzakkiId;
    mutation.muzakkiName = muzakki.nama;
    mutation.coaCode = creditCoaCode;
    mutation.rkatId = rkatId || null;
    mutation.sumberDana = rkat ? (rkat.kategori || 'ZAKAT') : 'ZAKAT';
    mutation.keteranganRealisasi = formattedKeterangan;

    mutations[mutationIndex] = mutation;
    writeMutations(mutations);

    res.status(200).json({ success: true, message: isEdit ? 'Identifikasi penerimaan mutasi berhasil diperbarui!' : 'Berhasil mengidentifikasi mutasi bank sebagai Penerimaan ZIS (masuk antrean SIMBA)!' });
  } catch (error: any) {
    console.error('Error identifying bank mutation:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
