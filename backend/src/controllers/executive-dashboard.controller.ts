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
      'Selesai',
      'Realisasi Bantuan',
      'Antrean Arsip',
      'Antrean_Arsip',
      'Arsip',
      'CAIR'
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
      SELECT MONTH(COALESCE(tanggal_pencairan, updated_at, tanggal_masuk)) as month, SUM(nominal) as total
      FROM Proposal
      WHERE status IN ('Selesai & Arsip', 'Selesai', 'Realisasi Bantuan', 'Antrean Arsip', 'Antrean_Arsip', 'Arsip', 'CAIR')
        AND COALESCE(tanggal_pencairan, updated_at, tanggal_masuk) >= ${startDate} AND COALESCE(tanggal_pencairan, updated_at, tanggal_masuk) <= ${endDate}
      GROUP BY MONTH(COALESCE(tanggal_pencairan, updated_at, tanggal_masuk))
    `;

    const targetSums = await prisma.rkatPengumpulan.aggregate({
      _sum: {
        target_jan: true,
        target_feb: true,
        target_mar: true,
        target_apr: true,
        target_mei: true,
        target_jun: true,
        target_jul: true,
        target_agt: true,
        target_sep: true,
        target_okt: true,
        target_nov: true,
        target_des: true,
      }
    });

    const monthlyTargets = [
      Number(targetSums._sum.target_jan || 0),
      Number(targetSums._sum.target_feb || 0),
      Number(targetSums._sum.target_mar || 0),
      Number(targetSums._sum.target_apr || 0),
      Number(targetSums._sum.target_mei || 0),
      Number(targetSums._sum.target_jun || 0),
      Number(targetSums._sum.target_jul || 0),
      Number(targetSums._sum.target_agt || 0),
      Number(targetSums._sum.target_sep || 0),
      Number(targetSums._sum.target_okt || 0),
      Number(targetSums._sum.target_nov || 0),
      Number(targetSums._sum.target_des || 0),
    ];

    const totalMonthlyTargetsSum = monthlyTargets.reduce((a, b) => a + b, 0);
    const finalMonthlyTargets = totalMonthlyTargetsSum > 0 
      ? monthlyTargets 
      : Array(12).fill(pengumpulanTarget / 12);

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const trenBulanan = monthsShort.map((month, idx) => {
      const mNum = idx + 1;
      const pengKey = monthlyPengumpulan.find((x: any) => Number(x.month) === mNum);
      const penyKey = monthlyPenyaluran.find((x: any) => Number(x.month) === mNum);
      return {
        bulan: month,
        pengumpulan: Number(pengKey ? pengKey.total : 0),
        penyaluran: Number(penyKey ? penyKey.total : 0),
        target: finalMonthlyTargets[idx],
      };
    });

    // 4. Robust Proposal-to-Program & Pilar Matching
    const dbPilars = await prisma.pilar.findMany({
      include: {
        programs: true,
      },
    });

    const allPrograms = await prisma.program.findMany({
      include: { pilar: true }
    });

    const allProposals = await prisma.proposal.findMany({
      where: {
        status: {
          not: 'Ditolak'
        },
        tanggal_masuk: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const programProposalsMap = new Map<string, any[]>();
    const directCodeMap = new Map<string, string>();
    const subActivityMap = new Map<string, string>();

    allPrograms.forEach((prog) => {
      programProposalsMap.set(prog.code, []);
      directCodeMap.set(prog.code, prog.code);
      if (prog.code.includes('.')) {
        directCodeMap.set(prog.code.replace(/\./g, ''), prog.code);
      }

      const details = (Array.isArray(prog.rkat_details) ? prog.rkat_details : []) as any[];
      details.forEach((item: any) => {
        if (item.id) subActivityMap.set(String(item.id).trim(), prog.code);
        if (item.code) subActivityMap.set(String(item.code).trim(), prog.code);
        if (item.kode) subActivityMap.set(String(item.kode).trim(), prog.code);
        if (item.no) subActivityMap.set(String(item.no).trim(), prog.code);
        if (item.asnafTargetId) subActivityMap.set(String(item.asnafTargetId).trim(), prog.code);
      });
    });

    const findProgramCodeInstant = (prop: any): string | null => {
      const target2 = prop.rkat_activity_id ? String(prop.rkat_activity_id).trim() : '';
      if (target2) {
        if (directCodeMap.has(target2)) return directCodeMap.get(target2)!;
        if (subActivityMap.has(target2)) return subActivityMap.get(target2)!;
      }

      const target1 = prop.jenis_permohonan ? String(prop.jenis_permohonan).trim() : '';
      if (target1) {
        if (directCodeMap.has(target1)) return directCodeMap.get(target1)!;
        if (subActivityMap.has(target1)) return subActivityMap.get(target1)!;

        const clean1 = target1.replace(/\./g, '');
        if (directCodeMap.has(clean1)) return directCodeMap.get(clean1)!;

        if (clean1.length >= 4) {
          const p4 = clean1.substring(0, 4);
          if (directCodeMap.has(p4)) return directCodeMap.get(p4)!;
        }
      }

      return null;
    };

    allProposals.forEach(prop => {
      const matchedProgCode = findProgramCodeInstant(prop);
      if (matchedProgCode && programProposalsMap.has(matchedProgCode)) {
        programProposalsMap.get(matchedProgCode)!.push(prop);
      }
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

    const pilarNames: Record<string, string> = {
      '1100': 'Semarang Peduli (Kemanusiaan)',
      '1200': 'Semarang Sehat (Kesehatan)',
      '1300': 'Semarang Cerdas (Pendidikan)',
      '1400': 'Semarang Taqwa (Dakwah & Advokasi)',
      '2100': 'Semarang Makmur (Ekonomi)',
      '2101': 'Kemanusiaan',
      '2201': 'Kesehatan',
      '2301': 'Pendidikan',
      '2401': 'Ekonomi',
      '2501': 'Dakwah & Advokasi',
    };

    const proporsiPilar = dbPilars.map((pilar) => {
      const target = pilar.programs.reduce((sum, prog) => sum + (prog.budget_rkat || 0), 0);
      let realisasi = 0;
      let penerima = 0;

      pilar.programs.forEach((prog) => {
        const props = programProposalsMap.get(prog.code) || [];
        penerima += props.length;
        realisasi += props.reduce((pSum, prop) => pSum + (Number(prop.nominal) || 0), 0);
      });

      const code = pilar.code;
      const name = (pilar.name && pilar.name.trim() !== '') ? pilar.name.trim() : (pilarNames[code] || `Pilar ${code}`);

      return {
        kode: code,
        nama: name,
        warna: pilarColors[code] || '#64748b',
        realisasi,
        target: target || 1000000000,
        penerima,
      };
    });

    // 5. Sebaran Proposal per Kecamatan (per Pilar)
    const sebaranKecamatan: Record<string, { kecamatan: string; jumlah: number }[]> = {};
    dbPilars.forEach((pilar) => {
      sebaranKecamatan[pilar.code] = [];
    });

    dbPilars.forEach((pilar) => {
      const kecCounts: Record<string, number> = {};
      pilar.programs.forEach((prog) => {
        const props = programProposalsMap.get(prog.code) || [];
        props.forEach((pr) => {
          if (pr.kecamatan && pr.kecamatan.trim() !== '') {
            const kec = pr.kecamatan.trim();
            kecCounts[kec] = (kecCounts[kec] || 0) + 1;
          }
        });
      });

      Object.entries(kecCounts).forEach(([kecamatan, jumlah]) => {
        sebaranKecamatan[pilar.code].push({ kecamatan, jumlah });
      });

      sebaranKecamatan[pilar.code].sort((a, b) => b.jumlah - a.jumlah);
    });

    // 6. Top 5 Program Tersalur
    const topProgram = allPrograms
      .map((prog) => {
        const props = programProposalsMap.get(prog.code) || [];
        const total = props.reduce((sum, prop) => sum + (Number(prop.nominal) || 0), 0);
        return {
          nama: prog.name,
          kode: prog.code,
          jumlah: props.length,
          total,
        };
      })
      .filter((p) => p.total > 0 || p.jumlah > 0)
      .sort((a, b) => b.total - a.total || b.jumlah - a.jumlah)
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
