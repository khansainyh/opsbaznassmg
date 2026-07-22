import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const list = await prisma.penerimaanZis.findMany({
      where: {
        status_simba: {
          not: 'FAILED'
        },
        NOT: [
          {
            no_kuitansi: {
              contains: 'Gagal'
            }
          },
          {
            AND: [
              { keterangan: { not: null } },
              { keterangan: { contains: 'Gagal Potong' } }
            ]
          },
          {
            AND: [
              { keterangan: { not: null } },
              { keterangan: { contains: 'failed_deduction' } }
            ]
          }
        ]
      },
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

    // Double-ensure in-memory filtering for Gagal Potong and FAILED
    const cleanList = listWithCoa.filter((item: any) => {
      const k = (item.keterangan || '').toLowerCase();
      const nk = (item.no_kuitansi || '').toLowerCase();
      if (item.status_simba === 'FAILED') return false;
      if (nk.includes('/ gagal /') || nk.includes('gagal potong') || nk.includes('gagal')) return false;
      if (k.includes('gagal potong') || k.includes('failed_deduction') || k.includes('failed')) return false;
      return true;
    });

    res.status(200).json({ status: 'success', data: cleanList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const createPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const { 
      no_kuitansi, muzakki_id, rkat_id, bank_account_id, nominal, 
      metode_pembayaran, tanggal_pembayaran, keterangan, coa_code, no_transaksi_simba
    } = req.body;

    if (!muzakki_id || (!rkat_id && !coa_code) || !bank_account_id || !nominal || Number(nominal) <= 0) {
      res.status(400).json({ error: 'Muzakki, program RKAT (atau COA jika di luar RKAT), rekening penerima, dan nominal harus diisi dengan benar' });
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

      let rkat = null;
      if (rkat_id) {
        rkat = await tx.rkatPengumpulan.findUnique({ where: { id: rkat_id } });
        if (!rkat) throw new Error('Program RKAT Pengumpulan tidak ditemukan');
      }

      const bankAccount = await tx.bankAccount.findUnique({ where: { account_id: bank_account_id } });
      if (!bankAccount) throw new Error('Rekening penerima tidak ditemukan');

      const formattedKeterangan = keterangan || (
        rkat 
          ? `Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama}`
          : `Penerimaan ZIS di luar RKAT via ${bankAccount.nama_akun} dari ${muzakki.nama}`
      );

      // Update BankAccount balance (increment)
      await tx.bankAccount.update({
        where: { account_id: bank_account_id },
        data: {
          saldo: { increment: new Prisma.Decimal(tNominal) }
        }
      });

      // Fetch or create credit ChartOfAccounts
      let creditCoaCode = coa_code || '41010101';
      if (rkat) {
        creditCoaCode = coa_code || (rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101');
      }
      
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

      // Create Realisasi record
      const realisasiTrx = await tx.realisasi.create({
        data: {
          rkat_id: rkat_id || null,
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

      // 4. Automated Hak Amil Calculations & Journal Entries
      let mappedKategori = '';
      if (rkat) {
        const cat = rkat.kategori.toUpperCase();
        if (cat === 'ZAKAT') {
          if (rkat.nama_program.toLowerCase().includes('fitrah')) {
            mappedKategori = 'Zakat Fitrah';
          } else {
            mappedKategori = 'Zakat Maal';
          }
        } else if (cat === 'INFAK') {
          mappedKategori = 'Infak';
        } else if (cat === 'SEDEKAH') {
          mappedKategori = 'Sedekah';
        }
      } else {
        if (creditCoaCode.startsWith('41')) {
          if (creditCoaCode.includes('fitrah')) {
            mappedKategori = 'Zakat Fitrah';
          } else {
            mappedKategori = 'Zakat Maal';
          }
        } else if (creditCoaCode.startsWith('42')) {
          mappedKategori = 'Infak';
        }
      }

      if (mappedKategori) {
        // Determine the rule category based on muzakki UPZ and type
        let mappedKategoriRule = '';
        let isPembantuan = false;
        let upzObj = null;

        if (muzakki && muzakki.upz) {
          upzObj = await tx.upz.findFirst({
            where: {
              OR: [
                { id: muzakki.upz },
                { nama_upz: muzakki.upz }
              ]
            }
          });
          
          if (upzObj) {
            isPembantuan = ((upzObj.metadata as any)?.type === 'On-Balance') &&
              ((upzObj.metadata as any)?.metadata?.onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan');
          }
        }

        if (mappedKategori.startsWith('Zakat')) {
          if (!muzakki || !muzakki.upz) {
            mappedKategoriRule = 'Zakat - Mandiri';
          } else if (isPembantuan) {
            mappedKategoriRule = 'Zakat - UPZ Pembantuan';
          } else {
            mappedKategoriRule = 'Zakat - UPZ Pengumpulan';
          }
        } else if (mappedKategori === 'Infak' || mappedKategori === 'Sedekah') {
          if (!muzakki || !muzakki.upz) {
            mappedKategoriRule = 'Infak/Sedekah Tidak Terikat - Mandiri';
          } else if (isPembantuan) {
            mappedKategoriRule = 'Infak/Sedekah Tidak Terikat - UPZ Pembantuan';
          } else {
            mappedKategoriRule = 'Infak/Sedekah Tidak Terikat - UPZ Pengumpulan';
          }
        }

        if (mappedKategoriRule) {
          // Query all mapping rules to find matches
          const mappings = await tx.penerimaanMapping.findMany();
          let mapping = mappings.find(m => {
            if (!m.coa_codes) return false;
            const codes = m.coa_codes.split(',').map(c => c.trim());
            return codes.includes(creditCoaCode);
          });

          // Fallback to channel-based category if no direct COA mapping exists
          if (!mapping) {
            mapping = mappings.find(m => m.kategori === mappedKategoriRule);
          }

          if (mapping) {
            const hakAmilPct = Number(mapping.persentase_amil);
            const upzAmilPct = Number(mapping.persentase_upz);
            const baznasAmilPct = Number(mapping.persentase_baznas);
            const coaDebitBeban = mapping.coa_debit_beban;
            const coaKreditAmil = mapping.coa_kredit_amil;
            const coaKreditUtang = mapping.coa_kredit_utang;

            if (hakAmilPct > 0) {
              const amilDebit = tNominal * (hakAmilPct / 100);
              const amilBaznasCredit = tNominal * (baznasAmilPct / 100);
              const amilUpzCredit = tNominal * (upzAmilPct / 100);

            // Create Journal Entries for Hak Amil if amilDebit > 0
            if (amilDebit > 0) {
              const ensureCoaExists = async (code: string, name: string, klasifikasi: string, tipeDana: string) => {
                const exists = await tx.chartOfAccounts.findUnique({ where: { coa_code: code } });
                if (!exists) {
                  await tx.chartOfAccounts.create({
                    data: {
                      coa_code: code,
                      nama_akun: name,
                      klasifikasi: klasifikasi,
                      tipe_dana: tipeDana
                    }
                  });
                }
              };

              await ensureCoaExists(coaDebitBeban, `Beban Hak Amil ${mappedKategoriRule}`, 'Beban', 'AMIL');
              await ensureCoaExists(coaKreditAmil, `Pendapatan Hak Amil ${mappedKategoriRule}`, 'Pendapatan', 'AMIL');
              await ensureCoaExists(coaKreditUtang, `Utang Bagian Hak Amil UPZ ${mappedKategoriRule}`, 'Kewajiban', 'AMIL');

              // Debit: Beban Hak Amil
              await tx.journalEntry.create({
                data: {
                  transaksi_id: realisasiTrx.transaksi_id,
                  coa_code: coaDebitBeban,
                  debit: new Prisma.Decimal(amilDebit),
                  kredit: new Prisma.Decimal(0.00),
                  account_id: null
                }
              });

              // Credit: Pendapatan Hak Amil (Baznas portion)
              if (amilBaznasCredit > 0) {
                await tx.journalEntry.create({
                  data: {
                    transaksi_id: realisasiTrx.transaksi_id,
                    coa_code: coaKreditAmil,
                    debit: new Prisma.Decimal(0.00),
                    kredit: new Prisma.Decimal(amilBaznasCredit),
                    account_id: null
                  }
                });
              }

              // Credit: Utang UPZ (UPZ portion)
              if (amilUpzCredit > 0) {
                await tx.journalEntry.create({
                  data: {
                    transaksi_id: realisasiTrx.transaksi_id,
                    coa_code: coaKreditUtang,
                    debit: new Prisma.Decimal(0.00),
                    kredit: new Prisma.Decimal(amilUpzCredit),
                    account_id: null
                  }
                });
              }
            }
          }
        }
      }
    }


      // 3. Create PenerimaanZis record in PENDING state (but with transaksi_id set)
      const penerimaan = await tx.penerimaanZis.create({
        data: {
          no_kuitansi: generatedKuitansi,
          muzakki_id,
          rkat_id: rkat_id || null,
          bank_account_id,
          nominal: new Prisma.Decimal(tNominal),
          metode_pembayaran: metode_pembayaran || 'TRANSFER',
          no_transaksi_simba: no_transaksi_simba || null,
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
    const { status_simba, keterangan, no_transaksi_simba } = req.body;

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

    if (status_simba === 'SYNCED' && existing.metode_pembayaran === 'TUNAI' && (!no_transaksi_simba || !no_transaksi_simba.trim())) {
      res.status(400).json({ error: 'No Transaksi SIMBA wajib diisi untuk metode pembayaran Kas Tunai!' });
      return;
    }

    const dataToUpdate: any = { status_simba };
    if (keterangan !== undefined) {
      dataToUpdate.keterangan = keterangan;
    }
    if (no_transaksi_simba !== undefined) {
      dataToUpdate.no_transaksi_simba = no_transaksi_simba;
    }

    const updated = await prisma.penerimaanZis.update({
      where: { id },
      data: dataToUpdate,
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
      metode_pembayaran, tanggal_pembayaran, keterangan, coa_code, no_transaksi_simba
    } = req.body;

    const existing = await prisma.penerimaanZis.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Data penerimaan tidak ditemukan' });
      return;
    }

    const tNominal = Number(nominal || 0);
    if (!muzakki_id || (!rkat_id && !coa_code) || !bank_account_id || tNominal <= 0) {
      res.status(400).json({ error: 'Muzakki, program RKAT (atau COA jika di luar RKAT), rekening penerima, dan nominal harus diisi dengan benar' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      let bankAccount = await tx.bankAccount.findUnique({ where: { account_id: bank_account_id } });
      if (!bankAccount) throw new Error('Rekening penerima tidak ditemukan');

      let rkat = null;
      if (rkat_id) {
        rkat = await tx.rkatPengumpulan.findUnique({ where: { id: rkat_id } });
        if (!rkat) throw new Error('Program RKAT tidak ditemukan');
      }

      const muzakki = await tx.muzakki.findUnique({ where: { id: muzakki_id } });
      if (!muzakki) throw new Error('Muzakki tidak ditemukan');

      const formattedKeterangan = keterangan || (
        rkat
          ? `Penerimaan ZIS program ${rkat.nama_program} via ${bankAccount.nama_akun} dari ${muzakki.nama}`
          : `Penerimaan ZIS di luar RKAT via ${bankAccount.nama_akun} dari ${muzakki.nama}`
      );

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
            rkat_id: rkat_id || null,
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
        let creditCoaCode = coa_code || '41010101';
        if (rkat) {
          creditCoaCode = coa_code || (rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '41010101');
        }
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
          rkat_id: rkat_id || null,
          bank_account_id,
          nominal: new Prisma.Decimal(tNominal),
          metode_pembayaran: metode_pembayaran || 'TRANSFER',
          no_transaksi_simba: no_transaksi_simba || null,
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

export const migratePenerimaanZis = async (req: Request, res: Response) => {
  try {
    const { transactions, options } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ error: 'Array transactions wajib diisi' });
      return;
    }

    const skipJournal = options?.skipJournal !== false; // Default true for historical migration

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Pre-fetch bank accounts and muzakkis for faster resolution
    const bankAccounts = await prisma.bankAccount.findMany();
    const muzakkis = await prisma.muzakki.findMany();

    const bankAccountMap = new Map<string, string>();
    bankAccounts.forEach(acc => {
      bankAccountMap.set(acc.account_id, acc.account_id);
      bankAccountMap.set(acc.nama_akun.toLowerCase(), acc.account_id);
      if (acc.no_rekening) bankAccountMap.set(acc.no_rekening.trim(), acc.account_id);
    });

    const muzakkiNikMap = new Map<string, string>();
    const muzakkiNamaMap = new Map<string, string>();
    muzakkis.forEach(m => {
      if (m.nik) muzakkiNikMap.set(m.nik.trim(), m.id);
      muzakkiNamaMap.set(m.nama.toLowerCase().trim(), m.id);
    });

    for (let i = 0; i < transactions.length; i++) {
      const txData = transactions[i];
      const rowNum = txData.rowNum || (i + 1);

      try {
        const nominal = Number(txData.nominal || 0);
        if (nominal <= 0) {
          throw new Error('Nominal transaksi harus lebih besar dari 0');
        }

        // 1. Resolve Bank Account
        let bankAccountId = txData.bank_account_id;
        if (!bankAccountId && txData.bank_account_name) {
          bankAccountId = bankAccountMap.get(String(txData.bank_account_name).toLowerCase().trim());
        }
        if (!bankAccountId) {
          // Fallback to first active bank account if available
          bankAccountId = bankAccounts[0]?.account_id;
        }

        if (!bankAccountId) {
          throw new Error('Rekening bank/kas tidak valid');
        }

        // 2. Resolve Muzakki
        let muzakkiId = txData.muzakki_id || null;
        if (!muzakkiId && txData.nik_muzakki) {
          muzakkiId = muzakkiNikMap.get(String(txData.nik_muzakki).trim()) || null;
        }
        if (!muzakkiId && txData.nama_muzakki) {
          muzakkiId = muzakkiNamaMap.get(String(txData.nama_muzakki).toLowerCase().trim()) || null;
        }

        // 3. Resolve Kuitansi & SIMBA Transaction Number
        const simbaNo = txData.no_transaksi_simba ? String(txData.no_transaksi_simba).trim() : null;
        let kuitansiNo = txData.no_kuitansi ? String(txData.no_kuitansi).trim() : null;

        if (!kuitansiNo) {
          kuitansiNo = simbaNo || `PZ-HIST-${Date.now()}-${i + 1}`;
        }

        const statusSimba = txData.status_simba || (simbaNo ? 'SYNCED' : 'PENDING');
        const tanggalTrx = txData.tanggal_pembayaran ? new Date(txData.tanggal_pembayaran) : new Date();

        await prisma.$transaction(async (tx) => {
          // Create PenerimaanZis record
          await tx.penerimaanZis.create({
            data: {
              no_kuitansi: kuitansiNo,
              no_transaksi_simba: simbaNo,
              status_simba: statusSimba,
              muzakki_id: muzakkiId,
              rkat_id: txData.rkat_id || null,
              bank_account_id: bankAccountId,
              nominal: new Prisma.Decimal(nominal),
              metode_pembayaran: txData.metode_pembayaran || 'TRANSFER',
              tanggal_pembayaran: tanggalTrx,
              keterangan: txData.keterangan || 'Migrasi Historis Pengumpulan ZIS'
            }
          });

          // ONLY create journal and update balance if skipJournal is false
          if (!skipJournal) {
            await tx.bankAccount.update({
              where: { account_id: bankAccountId },
              data: { saldo: { increment: new Prisma.Decimal(nominal) } }
            });

            const realisasi = await tx.realisasi.create({
              data: {
                rkat_id: txData.rkat_id || null,
                tanggal: tanggalTrx,
                keterangan: txData.keterangan || 'Penerimaan ZIS'
              }
            });

            const bankAcc = bankAccounts.find(b => b.account_id === bankAccountId);
            const debitCoa = bankAcc ? bankAcc.coa_code : '11010101';
            const creditCoa = txData.coa_code || '41010101';

            await tx.journalEntry.createMany({
              data: [
                {
                  transaksi_id: realisasi.transaksi_id,
                  coa_code: debitCoa,
                  debit: new Prisma.Decimal(nominal),
                  kredit: new Prisma.Decimal(0),
                  account_id: bankAccountId
                },
                {
                  transaksi_id: realisasi.transaksi_id,
                  coa_code: creditCoa,
                  debit: new Prisma.Decimal(0),
                  kredit: new Prisma.Decimal(nominal),
                  account_id: null
                }
              ]
            });
          }
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          rowNum,
          keterangan: txData.keterangan || 'N/A',
          error: err.message || String(err)
        });
      }
    }

    res.status(200).json({
      status: 'success',
      totalCount: transactions.length,
      successCount,
      failedCount,
      errors
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
