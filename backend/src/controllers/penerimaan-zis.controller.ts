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
      metode_pembayaran, tanggal_pembayaran, keterangan, coa_code
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
