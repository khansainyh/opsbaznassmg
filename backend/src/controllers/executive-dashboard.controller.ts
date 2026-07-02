import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getExecutiveDashboardData = async (req: Request, res: Response) => {
  try {
    const yearStr = req.query.year as string;
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 1. Total Pengumpulan ZIS (from PenerimaanZis in the given year)
    const pengumpulanAgg = await prisma.penerimaanZis.aggregate({
      where: {
        tanggal_pembayaran: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        nominal: true,
      },
    });
    const pengumpulanRealisasi = Number(pengumpulanAgg._sum.nominal || 0);

    // Sum Target Pengumpulan from RkatPengumpulan
    const rkatPengumpulanSum = await prisma.rkatPengumpulan.aggregate({
      _sum: {
        nilai_anggaran: true,
      },
    });
    const pengumpulanTarget = Number(rkatPengumpulanSum._sum.nilai_anggaran || 18000000000); // fallback to 18M

    // 2. Total Penyaluran (from Proposal where status in finished statuses in the given year)
    const finishedStatuses = [
      'Selesai & Arsip',
      'Realisasi Bantuan',
      'MENUNGGU_SIMBA',
      'MENUNGGU_REALISASI_DISTRIBUSI',
      'Pencairan Dana',
      'Antrean Arsip',
      'Antrean_Arsip',
      'Arsip'
    ];
    const penyaluranAgg = await prisma.proposal.aggregate({
      where: {
        status: {
          in: finishedStatuses,
        },
        tanggal_masuk: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        nominal: true,
      },
      _count: {
        id: true,
      },
    });
    const penyaluranRealisasi = Number(penyaluranAgg._sum.nominal || 0);
    const penyaluranCount = penyaluranAgg._count.id || 0;

    // Sum Target Penyaluran from Program budget_rkat
    const programPenyaluranSum = await prisma.program.aggregate({
      _sum: {
        budget_rkat: true,
      },
    });
    const penyaluranTarget = Number(programPenyaluranSum._sum.budget_rkat || 16200000000); // fallback to 16.2M

    // Sisa Anggaran connected to sum of BankAccount balances
    const bankAccounts = await prisma.bankAccount.findMany();
    const sisaAnggaranNilai = bankAccounts.reduce((sum, acc) => sum + Number(acc.saldo || 0), 0);

    // 3. Tren Bulanan (Jan - Des) for current year
    const monthlyPengumpulan = await prisma.$queryRaw<
      { month: number; total: number }[]
    >`
      SELECT MONTH(tanggal_pembayaran) as month, SUM(nominal) as total
      FROM PenerimaanZis
      WHERE tanggal_pembayaran >= ${startDate} AND tanggal_pembayaran <= ${endDate}
      GROUP BY MONTH(tanggal_pembayaran)
    `;

    const monthlyPenyaluran = await prisma.$queryRaw<
      { month: number; total: number }[]
    >`
      SELECT MONTH(tanggal_masuk) as month, SUM(nominal) as total
      FROM Proposal
      WHERE status IN ('Selesai & Arsip', 'Realisasi Bantuan', 'MENUNGGU_SIMBA', 'MENUNGGU_REALISASI_DISTRIBUSI', 'Pencairan Dana', 'Antrean Arsip', 'Antrean_Arsip', 'Arsip')
        AND tanggal_masuk >= ${startDate} AND tanggal_masuk <= ${endDate}
      GROUP BY MONTH(tanggal_masuk)
    `;

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const trenBulanan = monthsShort.map((month, idx) => {
      const mNum = idx + 1;
      const pengKey = monthlyPengumpulan.find((x: any) => Number(x.month) === mNum);
      const penyKey = monthlyPenyaluran.find((x: any) => Number(x.month) === mNum);
      return {
        bulan: month,
        pengumpulan: Number(pengKey ? pengKey.total : 0),
        penyaluran: Number(penyKey ? penyKey.total : 0),
      };
    });

    // 4. Proporsi per Pilar
    const dbPilars = await prisma.pilar.findMany({
      include: {
        programs: {
          include: {
            proposals: {
              where: {
                status: {
                  in: finishedStatuses,
                },
                tanggal_masuk: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
      },
    });

    const pilarColors: Record<string, string> = {
      '1100': '#f97316', // Semarang Peduli (orange)
      '1200': '#10b981', // Semarang Sehat (emerald)
      '1300': '#3b82f6', // Semarang Cerdas (blue)
      '1400': '#8b5cf6', // Semarang Taqwa (violet)
      '2100': '#eab308', // Semarang Makmur (yellow)
      '2101': '#f97316', // Semarang Peduli (orange)
      '2201': '#10b981', // Semarang Sehat (emerald)
      '2301': '#3b82f6', // Semarang Cerdas (blue)
      '2401': '#eab308', // Semarang Makmur (yellow)
      '2501': '#8b5cf6', // Semarang Taqwa (violet)
    };

    const proporsiPilar = dbPilars.map((pilar) => {
      const target = pilar.programs.reduce((sum, prog) => sum + (prog.budget_rkat || 0), 0);
      const realisasi = pilar.programs.reduce((sum, prog) => {
        return sum + prog.proposals.reduce((pSum, prop) => pSum + (Number(prop.nominal) || 0), 0);
      }, 0);
      const penerima = pilar.programs.reduce((sum, prog) => sum + prog.proposals.length, 0);
      const code = pilar.code;

      return {
        kode: code,
        nama: pilar.name,
        warna: pilarColors[code] || '#64748b',
        realisasi,
        target: target || 1000000000,
        penerima,
      };
    });

    // 5. Sebaran Proposal per Kecamatan (per Pilar)
    const sebaranKecamatanRaw = await prisma.$queryRaw<
      { pilar_code: string; kecamatan: string; jumlah: number }[]
    >`
      SELECT p.pilar_code, pr.kecamatan, COUNT(pr.id) as jumlah
      FROM Proposal pr
      JOIN Program p ON pr.jenis_permohonan = p.code
      WHERE pr.status IN ('Selesai & Arsip', 'Realisasi Bantuan', 'MENUNGGU_SIMBA', 'MENUNGGU_REALISASI_DISTRIBUSI', 'Pencairan Dana', 'Antrean Arsip', 'Antrean_Arsip', 'Arsip')
        AND pr.tanggal_masuk >= ${startDate} AND pr.tanggal_masuk <= ${endDate}
        AND pr.kecamatan IS NOT NULL AND pr.kecamatan != ''
      GROUP BY p.pilar_code, pr.kecamatan
    `;

    const sebaranKecamatan: Record<string, { kecamatan: string; jumlah: number }[]> = {};
    dbPilars.forEach((pilar) => {
      sebaranKecamatan[pilar.code] = [];
    });

    sebaranKecamatanRaw.forEach((row: any) => {
      const pCode = row.pilar_code;
      if (sebaranKecamatan[pCode]) {
        sebaranKecamatan[pCode].push({
          kecamatan: row.kecamatan,
          jumlah: Number(row.jumlah || 0),
        });
      }
    });

    Object.keys(sebaranKecamatan).forEach((k) => {
      sebaranKecamatan[k].sort((a, b) => b.jumlah - a.jumlah);
    });

    // 6. Top 5 Program Tersalur
    const topProgramsRaw = await prisma.program.findMany({
      include: {
        proposals: {
          where: {
            status: {
              in: finishedStatuses,
            },
            tanggal_masuk: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const topProgram = topProgramsRaw
      .map((prog) => {
        const total = prog.proposals.reduce((sum, prop) => sum + (Number(prop.nominal) || 0), 0);
        return {
          nama: prog.name,
          kode: prog.code,
          jumlah: prog.proposals.length,
          total,
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    res.status(200).json({
      status: 'success',
      tahunAnggaran: year,
      bigThreeData: {
        pengumpulan: {
          realisasi: pengumpulanRealisasi,
          target: pengumpulanTarget,
          bulan: currentMonthName,
        },
        pendistribusian: {
          realisasi: penyaluranRealisasi,
          target: penyaluranTarget,
          bulan: currentMonthName,
        },
        sisaAnggaran: {
          nilai: sisaAnggaranNilai,
          keterangan: 'Saldo tersedia untuk didistribusikan',
        },
      },
      proporsiPilar,
      trenBulanan,
      topProgram,
      sebaranKecamatan,
    });
  } catch (error) {
    console.error('[EXECUTIVE DASHBOARD ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
};
