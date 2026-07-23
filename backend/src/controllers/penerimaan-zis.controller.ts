import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const isAll = req.query.all === 'true';
    const search = ((req.query.search as string) || '').trim();
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const baseWhere: any = {
      status_simba: { not: 'FAILED' },
      NOT: [
        { no_kuitansi: { contains: 'Gagal' } },
        { AND: [{ keterangan: { not: null } }, { keterangan: { contains: 'Gagal Potong' } }] },
        { AND: [{ keterangan: { not: null } }, { keterangan: { contains: 'failed_deduction' } }] }
      ]
    };

    if (startDate && endDate) {
      baseWhere.tanggal_pembayaran = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`)
      };
    }

    if (search) {
      baseWhere.OR = [
        { no_kuitansi: { contains: search } },
        { keterangan: { contains: search } },
        { kode_program: { contains: search } },
        { jenis_program: { contains: search } },
        { muzakki: { is: { nama: { contains: search } } } },
        { upz: { is: { nama_upz: { contains: search } } } }
      ];
    }

    const [totalRecords, aggregateSum, list] = await prisma.$transaction([
      prisma.penerimaanZis.count({ where: baseWhere }),
      prisma.penerimaanZis.aggregate({
        where: baseWhere,
        _sum: { nominal: true }
      }),
      prisma.penerimaanZis.findMany({
        where: baseWhere,
        include: {
          muzakki: true,
          rkat: true,
          upz: true,
          bankAccount: true
        } as any,
        orderBy: { tanggal_pembayaran: 'desc' },
        ...(isAll ? {} : { skip: (page - 1) * limit, take: limit })
      })
    ]);

    const totalPages = isAll ? 1 : Math.ceil(totalRecords / limit);
    const totalNominal = Number(aggregateSum._sum.nominal || 0);

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

    res.status(200).json({
      status: 'success',
      data: listWithCoa,
      pagination: {
        total: totalRecords,
        page,
        limit: isAll ? totalRecords : limit,
        totalPages
      },
      summary: {
        totalTransactions: totalRecords,
        totalNominal
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const createPenerimaanZis = async (req: Request, res: Response) => {
  try {
    const { 
      no_kuitansi, muzakki_id, rkat_id, upz_id, kode_program, jenis_program, bank_account_id, nominal, 
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

      let bankAccount = await tx.bankAccount.findUnique({ where: { account_id: bank_account_id } });
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

export const PROGRAM_KODE_TO_RKAT_MAP: Record<string, { rkat_no: string | null; jenis: string; isUpz: boolean }> = {
  '101.1': { rkat_no: '2', jenis: 'Zakat Maal Perorangan', isUpz: false },
  '101.2': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah Perorangan', isUpz: false },
  '101.3': { rkat_no: '16', jenis: 'CSR/PKBL', isUpz: false },
  '101.4': { rkat_no: '14', jenis: 'Qurban', isUpz: false },
  '101.5': { rkat_no: '15', jenis: 'Fidyah Perorangan', isUpz: false },
  '101.8': { rkat_no: '7', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat', isUpz: false },
  '101.9': { rkat_no: '10', jenis: 'Penerimaan Infak Sedekah Terikat Kas', isUpz: false },
  '101.10': { rkat_no: '11', jenis: 'Penerimaan Infak Sedekah Terikat Natura', isUpz: false },
  '101.11': { rkat_no: '13', jenis: 'Infak/Sedekah Terikat Operasional Amil', isUpz: false },
  '101.12': { rkat_no: '10', jenis: 'Infak dan Sedekah Terikat DSK Lainnya', isUpz: false },
  '101.13': { rkat_no: '1', jenis: 'Zakat Maal Entitas', isUpz: false },
  '101.14': { rkat_no: null, jenis: 'Belum Diketahui', isUpz: false },

  '102.1': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kota (UPZ Pengumpulan)', isUpz: true },
  '102.2': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)', isUpz: true },
  '102.3': { rkat_no: '4', jenis: 'Zakat Maal UPZ Penyaluran', isUpz: true },
  '102.4': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah via UPZ', isUpz: true },
  '102.5': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota (UPZ Pengumpulan)', isUpz: true },
  '102.6': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan (UPZ Pengumpulan)', isUpz: true },
  '102.7': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', isUpz: true },
  '102.7.1': { rkat_no: '9', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Penyaluran', isUpz: true },
  '102.8': { rkat_no: '14', jenis: 'Qurban Via UPZ', isUpz: true },
  '102.9': { rkat_no: '15', jenis: 'Fidyah Via UPZ', isUpz: true },
  '102.10': { rkat_no: '10', jenis: 'DSKL Lainnya Via UPZ', isUpz: true },
  '102.11': { rkat_no: '3', jenis: 'Zakat Maal UPZ Pengumpulan', isUpz: true }
};

export const getRekapitulasiBulananZis = async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? Number(req.query.month) : (req.query.bulan ? Number(req.query.bulan) : new Date().getMonth() + 1);
    const year = req.query.year ? Number(req.query.year) : (req.query.tahun ? Number(req.query.tahun) : new Date().getFullYear());

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const list = await prisma.penerimaanZis.findMany({
      where: {
        tanggal_pembayaran: {
          gte: startDate,
          lte: endDate
        },
        status_simba: { not: 'FAILED' }
      },
      include: {
        upz: true,
        rkat: true
      } as any
    });

    const allUpzs = await prisma.upz.findMany({
      orderBy: { nama_upz: 'asc' }
    });

    const categories: Record<string, any[]> = {
      'UNIT PENGUMPUL ZAKAT SETDA': [],
      'UNIT PENGUMPUL ZAKAT BADAN': [],
      'UNIT PENGUMPUL ZAKAT DINAS': [],
      'UNIT PENGUMPUL ZAKAT BUMD': [],
      'UNIT PENGUMPUL ZAKAT INSTANSI VERTIKAL': [],
      'UNIT PENGUMPUL ZAKAT KECAMATAN': [],
      'UNIT PENGUMPUL ZAKAT SEKOLAH / MADRASAH': [],
      'UNIT PENGUMPUL ZAKAT (PENGUMPULAN)': [],
      'PENERIMAAN ZIS UMUM': []
    };

    const upzTotalsMap = new Map<string, { zakat: number; infak: number }>();

    list.forEach((tx: any) => {
      const upzKey = tx.upz_id || tx.upz?.nama_upz || 'UMUM';
      if (!upzTotalsMap.has(upzKey)) {
        upzTotalsMap.set(upzKey, { zakat: 0, infak: 0 });
      }
      const item = upzTotalsMap.get(upzKey)!;
      const nom = Number(tx.nominal || 0);

      const kp = String(tx.kode_program || '');
      const programName = String(tx.jenis_program || tx.rkat?.program || '').toLowerCase();

      const isZakat = kp.startsWith('101.1') || kp.startsWith('101.2') || kp.startsWith('101.13') ||
                      kp.startsWith('102.1') || kp.startsWith('102.2') || kp.startsWith('102.3') ||
                      kp.startsWith('102.4') || kp.startsWith('102.11') ||
                      programName.includes('zakat');

      if (isZakat) {
        item.zakat += nom;
      } else {
        item.infak += nom;
      }
    });

    allUpzs.forEach((u: any) => {
      let catName = 'UNIT PENGUMPUL ZAKAT (PENGUMPULAN)';
      const nama = u.nama_upz.toUpperCase();

      if (nama.includes('BAGIAN') || nama.includes('SETDA') || nama.includes('SEKRETARIAT DPRD')) {
        catName = 'UNIT PENGUMPUL ZAKAT SETDA';
      } else if (nama.includes('BADAN') || nama.includes('BAPPEDA') || nama.includes('INSPEKTORAT') || nama.includes('SATPOL') || nama.includes('BPBD')) {
        catName = 'UNIT PENGUMPUL ZAKAT BADAN';
      } else if (nama.includes('DINAS') || nama.includes('DISPENDUK') || nama.includes('DISCOM') || nama.includes('PUSKESMAS')) {
        catName = 'UNIT PENGUMPUL ZAKAT DINAS';
      } else if (nama.includes('PDAM') || nama.includes('BPR') || nama.includes('PERUSDA') || nama.includes('BUMD')) {
        catName = 'UNIT PENGUMPUL ZAKAT BUMD';
      } else if (nama.includes('KEMENTERIAN') || nama.includes('KEMENAG') || nama.includes('BPS') || nama.includes('VERTIKAL')) {
        catName = 'UNIT PENGUMPUL ZAKAT INSTANSI VERTIKAL';
      } else if (nama.includes('KECAMATAN')) {
        catName = 'UNIT PENGUMPUL ZAKAT KECAMATAN';
      } else if (nama.includes('SD') || nama.includes('SMP') || nama.includes('SMA') || nama.includes('MI') || nama.includes('MTS') || nama.includes('MAN') || nama.includes('SEKOLAH')) {
        catName = 'UNIT PENGUMPUL ZAKAT SEKOLAH / MADRASAH';
      }

      const totals = upzTotalsMap.get(u.id) || upzTotalsMap.get(u.nama_upz) || { zakat: 0, infak: 0 };

      if (!categories[catName]) categories[catName] = [];
      categories[catName].push({
        id: u.id,
        nama_upz: u.nama_upz,
        zakat: totals.zakat,
        infak: totals.infak,
        total: totals.zakat + totals.infak
      });
    });

    const umumTotals = upzTotalsMap.get('UMUM') || { zakat: 0, infak: 0 };
    categories['PENERIMAAN ZIS UMUM'] = [
      { id: 'umum-1', nama_upz: 'ZIS Individu (Masyarakat)', zakat: umumTotals.zakat, infak: umumTotals.infak, total: umumTotals.zakat + umumTotals.infak }
    ];

    res.status(200).json({
      status: 'success',
      period: { month, year },
      categories
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const migratePenerimaanZis = async (req: Request, res: Response) => {
  try {
    const { transactions, options } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ error: 'Array transactions wajib diisi' });
      return;
    }

    const skipJournal = options?.skipJournal !== false;

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    const bankAccounts = await prisma.bankAccount.findMany();
    const muzakkis = await prisma.muzakki.findMany();
    const rkats = await prisma.rkatPengumpulan.findMany();
    const upzs = await prisma.upz.findMany();

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

    const getVal = (obj: any, keys: string[]) => {
      if (!obj) return null;
      for (const k of Object.keys(obj)) {
        const cleanK = k.trim().toLowerCase();
        for (const targetKey of keys) {
          if (cleanK === targetKey.trim().toLowerCase()) {
            const val = obj[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return val;
            }
          }
        }
      }
      return null;
    };

    for (let i = 0; i < transactions.length; i++) {
      const txData = transactions[i];
      const rowNum = txData.rowNum || (i + 1);

      try {
        const rawNominalVal = getVal(txData, ['Nominal', 'nominal', 'NOMINAL', 'Nominal_Rp', 'Jumlah', 'Total', 'Jumlah Rp']);
        let rawNominal = rawNominalVal;
        if (typeof rawNominal === 'string') {
          rawNominal = rawNominal.replace(/[^0-9.-]+/g, '');
        }
        const nominal = Number(rawNominal || 0);
        if (nominal <= 0) {
          throw new Error('Nominal transaksi harus lebih besar dari 0');
        }

        let bankAccountId = txData.bank_account_id;
        const sourceQuery = String(getVal(txData, ['Sumber Dana', 'sumber_dana', 'bank_account_name', 'Bank', 'Rekening', 'Kas & Bank']) || '').toLowerCase().trim();

        if (!bankAccountId && sourceQuery) {
          bankAccountId = bankAccountMap.get(sourceQuery);
          if (!bankAccountId) {
            const matched = bankAccounts.find(acc =>
              acc.nama_akun.toLowerCase().includes(sourceQuery) ||
              sourceQuery.includes(acc.nama_akun.toLowerCase()) ||
              (acc.no_rekening && sourceQuery.includes(acc.no_rekening.toLowerCase()))
            );
            if (matched) bankAccountId = matched.account_id;
          }
        }

        if (!bankAccountId) bankAccountId = bankAccounts[0]?.account_id;
        if (!bankAccountId) throw new Error('Rekening bank/kas tidak valid');

        let muzakkiId = txData.muzakki_id || null;
        const inputNamaMuzakki = String(getVal(txData, ['Nama Muzakki', 'nama_muzakki', 'Nama', 'Muzakki', 'Penyetor']) || '').trim();
        const inputNikMuzakki = String(getVal(txData, ['nik_muzakki', 'nik', 'NIK']) || '').trim();

        if (!muzakkiId && inputNikMuzakki) muzakkiId = muzakkiNikMap.get(inputNikMuzakki) || null;
        if (!muzakkiId && inputNamaMuzakki) muzakkiId = muzakkiNamaMap.get(inputNamaMuzakki.toLowerCase()) || null;

        const rowKeterangan = String(getVal(txData, ['Keterangan', 'keterangan', 'Uraian', 'Deskripsi', 'Catatan']) || '').trim();
        if (!muzakkiId && rowKeterangan) {
          const match = rowKeterangan.match(/(?:a\.n|an\.|dari|bapak|ibu)\s+([A-Za-z\s]+)/i);
          if (match && match[1]) {
            const extractedName = match[1].trim().toLowerCase();
            muzakkiId = muzakkiNamaMap.get(extractedName) || null;
          }
        }

        let rawKodeProgram = getVal(txData, ['Kode Program', 'kode_program', 'Kode_Program', 'Kode', 'Kode Prog']);
        if (typeof rawKodeProgram === 'number') rawKodeProgram = String(rawKodeProgram);
        let kodeProgram = rawKodeProgram ? String(rawKodeProgram).trim() : null;

        let rawJenisProgram = getVal(txData, ['Jenis Program', 'jenis_program', 'Jenis_Program', 'Program']);
        let jenisProgram = rawJenisProgram ? String(rawJenisProgram).trim() : null;
        let rkatId = txData.rkat_id || null;

        if (kodeProgram && PROGRAM_KODE_TO_RKAT_MAP[kodeProgram]) {
          const mapItem = PROGRAM_KODE_TO_RKAT_MAP[kodeProgram];
          if (!jenisProgram) jenisProgram = mapItem.jenis;
          if (!rkatId && mapItem.rkat_no) {
            const matchedRkat = rkats.find(r => r.no === mapItem.rkat_no || r.id === mapItem.rkat_no);
            if (matchedRkat) rkatId = matchedRkat.id;
          }
        }

        let upzId = txData.upz_id || null;
        const upzQuery = String(getVal(txData, ['Nama UPZ', 'nama_upz', 'upz_nama', 'UPZ', 'Nama OPD / UPZ', 'OPD']) || '').toLowerCase().trim();
        if (!upzId && upzQuery) {
          const matchedUpz = upzs.find(u =>
            u.nama_upz.toLowerCase().includes(upzQuery) ||
            upzQuery.includes(u.nama_upz.toLowerCase())
          );
          if (matchedUpz) upzId = matchedUpz.id;
        }

        const simbaNo = String(getVal(txData, ['no_transaksi_simba', 'No Transaksi', 'no_transaksi', 'No. Transaksi', 'No Transaksi SIMBA']) || '').trim() || null;
        let kuitansiNo = String(getVal(txData, ['no_kuitansi', 'No Transaksi', 'no_transaksi', 'No Kuitansi', 'Kuitansi']) || '').trim() || null;
        if (!kuitansiNo) {
          kuitansiNo = simbaNo || `PZ-HIST-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 10000)}`;
        }

        const existingKuitansi = await prisma.penerimaanZis.findUnique({ where: { no_kuitansi: kuitansiNo } });
        if (existingKuitansi) {
          kuitansiNo = `${kuitansiNo}-DUP-${i + 1}-${Math.floor(Math.random() * 1000)}`;
        }

        const statusSimba = txData.status_simba || (simbaNo ? 'SYNCED' : 'PENDING');
        
        let tanggalTrx = new Date();
        const rawDateVal = getVal(txData, ['Tanggal Trx', 'tanggal_pembayaran', 'tanggal_trx', 'Tanggal', 'Tgl']);
        if (rawDateVal !== null && rawDateVal !== undefined) {
          if (typeof rawDateVal === 'number') {
            tanggalTrx = new Date(Math.round((rawDateVal - 25569) * 86400 * 1000));
          } else {
            const rawDateStr = String(rawDateVal).trim();
            if (rawDateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const parts = rawDateStr.split('/');
              tanggalTrx = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
            } else if (rawDateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
              const parts = rawDateStr.split('-');
              tanggalTrx = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
            } else {
              tanggalTrx = new Date(rawDateStr);
            }
          }
        }
        if (isNaN(tanggalTrx.getTime())) {
          tanggalTrx = new Date();
        }

        await prisma.$transaction(async (tx) => {
          const createdRecord = await tx.penerimaanZis.create({
            data: {
              no_kuitansi: kuitansiNo,
              no_transaksi_simba: simbaNo,
              status_simba: statusSimba,
              muzakki_id: muzakkiId,
              upz_id: upzId,
              rkat_id: rkatId,
              kode_program: kodeProgram,
              jenis_program: jenisProgram,
              bank_account_id: bankAccountId,
              nominal: new Prisma.Decimal(nominal),
              metode_pembayaran: txData.metode_pembayaran || 'TRANSFER',
              tanggal_pembayaran: tanggalTrx,
              keterangan: txData.keterangan || 'Migrasi Historis Pengumpulan ZIS'
            } as any
          });

          if (!skipJournal) {
            await tx.bankAccount.update({
              where: { account_id: bankAccountId },
              data: { saldo: { increment: new Prisma.Decimal(nominal) } }
            });

            const realisasi = await tx.realisasi.create({
              data: {
                rkat_id: rkatId,
                tanggal: tanggalTrx,
                keterangan: txData.keterangan || 'Penerimaan ZIS'
              }
            });

            await tx.penerimaanZis.update({
              where: { id: createdRecord.id },
              data: { transaksi_id: realisasi.transaksi_id }
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
        console.error(`[MIGRATE ERROR] Baris ${rowNum}:`, err.message || err);
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
      errors,
      summary: {
        total: transactions.length,
        success: successCount,
        failed: failedCount,
        errors
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
