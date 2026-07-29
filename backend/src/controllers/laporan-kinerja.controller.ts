import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Default COA Mappings for seeding
// Default COA Mappings for seeding
const defaultMappings = [
  // --- PENGUMPULAN: RKAT PENGUMPULAN ---
  { tab: 'pengumpulan', row_key: 'rkat_zakat_maal_badan', row_label: 'Zakat Maal Badan', coa_codes: '4110201' },
  { tab: 'pengumpulan', row_key: 'rkat_zakat_maal_perorangan', row_label: 'Zakat Maal Perorangan', coa_codes: '4110101,4110102' },
  { tab: 'pengumpulan', row_key: 'rkat_zakat_maal_upz_pengumpulan', row_label: 'Zakat Maal Perorangan via UPZ Pengumpulan', coa_codes: '4110101,4110102' },
  { tab: 'pengumpulan', row_key: 'rkat_zakat_maal_upz_penyaluran', row_label: 'Zakat Maal Perorangan via UPZ Penyaluran', coa_codes: '4110101,4110102' },
  { tab: 'pengumpulan', row_key: 'rkat_zakat_fitrah', row_label: 'Zakat Fitrah', coa_codes: '4110103' },
  { tab: 'pengumpulan', row_key: 'rkat_zakat_fitrah_upz_penyaluran', row_label: 'Zakat Fitrah via UPZ Penyaluran', coa_codes: '4110103' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_tidak_terikat', row_label: 'Infak/Sedekah Tidak Terikat', coa_codes: '4120101,4120102' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_tidak_terikat_upz_pengumpulan', row_label: 'Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', coa_codes: '4120101,4120102' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_tidak_terikat_upz_penyaluran', row_label: 'Infak/Sedekah Tidak Terikat via UPZ Penyaluran', coa_codes: '4120101,4120102' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_terikat_program', row_label: 'Infak/Sedekah Terikat-Program', coa_codes: '4120103' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_terikat_natura', row_label: 'Infak/Sedekah Terikat-Program Natura', coa_codes: '4120103' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_terikat_palestina', row_label: 'Infak/Sedekah Terikat-Program SDI/Palestina', coa_codes: '4120103' },
  { tab: 'pengumpulan', row_key: 'rkat_infak_terikat_operasional', row_label: 'Infak/Sedekah Terikat Operasional', coa_codes: '4120103' },
  { tab: 'pengumpulan', row_key: 'rkat_dskl_kurban', row_label: 'Kurban', coa_codes: '4120104' },
  { tab: 'pengumpulan', row_key: 'rkat_dskl_fidyah', row_label: 'Fidyah', coa_codes: '4120105' },
  { tab: 'pengumpulan', row_key: 'rkat_csr', row_label: 'Corporate Social Responsibility', coa_codes: '4120202' },
  { tab: 'pengumpulan', row_key: 'rkat_dana_titipan', row_label: 'Dana Titipan', coa_codes: '4140101' },

  // --- PENGUMPULAN: MUZAKKI & MUNFIQ ---
  { tab: 'pengumpulan', row_key: 'muzakki_individu', row_label: 'Muzakki Individu', coa_codes: '4110101,4110102' },
  { tab: 'pengumpulan', row_key: 'muzakki_fitrah_individu', row_label: 'Muzakki Fitrah Individu', coa_codes: '4110103' },
  { tab: 'pengumpulan', row_key: 'munfiq_individu', row_label: 'Munfiq Individu', coa_codes: '4120101,4120102' },
  { tab: 'pengumpulan', row_key: 'donatur_qurban', row_label: 'Donatur Qurban', coa_codes: '4120104' },
  { tab: 'pengumpulan', row_key: 'donatur_fidyah', row_label: 'Donatur Fidyah', coa_codes: '4120105' },
  { tab: 'pengumpulan', row_key: 'donatur_dskl', row_label: 'Donatur DSKL', coa_codes: '4130101' },
  { tab: 'pengumpulan', row_key: 'muzakki_badan', row_label: 'Muzakki Badan', coa_codes: '4110201' },
  { tab: 'pengumpulan', row_key: 'munfiq_badan', row_label: 'Munfiq Badan', coa_codes: '4120201' },
  { tab: 'pengumpulan', row_key: 'donatur_csr', row_label: 'Donatur CSR', coa_codes: '4120202' },

  // --- PENYALURAN ---
  { tab: 'penyaluran', row_key: 'zakat_fakir', row_label: 'Penyaluran Dana Zakat untuk Fakir', coa_codes: '5110101' },
  { tab: 'penyaluran', row_key: 'zakat_miskin', row_label: 'Penyaluran Dana Zakat untuk Miskin', coa_codes: '5110102' },
  { tab: 'penyaluran', row_key: 'zakat_amil', row_label: 'Penyaluran Dana Zakat Untuk Amil', coa_codes: '5110103' },
  { tab: 'penyaluran', row_key: 'zakat_muallaf', row_label: 'Penyaluran Dana Zakat Untuk Muallaf', coa_codes: '5110104' },
  { tab: 'penyaluran', row_key: 'zakat_riqab', row_label: 'Penyaluran Dana Zakat Untuk Riqab', coa_codes: '5110105' },
  { tab: 'penyaluran', row_key: 'zakat_gharimin', row_label: 'Penyaluran Dana Zakat Untuk Gharimin', coa_codes: '5110106' },
  { tab: 'penyaluran', row_key: 'zakat_fisabilillah', row_label: 'Penyaluran Dana Zakat Untuk Fisabilillah', coa_codes: '5110107' },
  { tab: 'penyaluran', row_key: 'zakat_ibnu_sabil', row_label: 'Penyaluran Dana Zakat Untuk Ibnu Sabil', coa_codes: '5110108' },
  { tab: 'penyaluran', row_key: 'fitrah_fakir', row_label: 'Penyaluran Zakat Fitrah untuk fakir', coa_codes: '5110201' },
  { tab: 'penyaluran', row_key: 'fitrah_miskin', row_label: 'Penyaluran Zakat Fitrah untuk Miskin', coa_codes: '5110202' },
  { tab: 'penyaluran', row_key: 'fitrah_amil', row_label: 'Penyaluran Zakat Fitrah untuk Amil', coa_codes: '5110203' },
  { tab: 'penyaluran', row_key: 'infaq_tidak_terikat', row_label: 'Infaq Tidak Terikat', coa_codes: '5120101' },
  { tab: 'penyaluran', row_key: 'infaq_terikat', row_label: 'Infaq Terikat', coa_codes: '5120102' },
  { tab: 'penyaluran', row_key: 'infaq_penyaluran', row_label: 'Infaq Penyaluran', coa_codes: '5120103' },
  { tab: 'penyaluran', row_key: 'csr', row_label: 'Penyaluran CSR', coa_codes: '5120104' },
  { tab: 'penyaluran', row_key: 'qurban', row_label: 'Penyaluran Qurban', coa_codes: '5120105' },
  { tab: 'penyaluran', row_key: 'fidyah', row_label: 'Penyaluran Fidyah', coa_codes: '5120106' },
  { tab: 'penyaluran', row_key: 'dskl', row_label: 'Penyaluran DSKL', coa_codes: '5120107' },
  { tab: 'penyaluran', row_key: 'infaq_amil', row_label: 'Penyaluran Infaq untuk Amil', coa_codes: '5120108' },
  { tab: 'penyaluran', row_key: 'sapi_kerbau', row_label: 'Sapi/Kerbau', coa_codes: '5130101' },
  { tab: 'penyaluran', row_key: 'domba_kambing', row_label: 'Domba/Kambing', coa_codes: '5130102' },
  { tab: 'penyaluran', row_key: 'pilar_2101', row_label: 'Bidang Kemanusiaan', coa_codes: '5140101' },
  { tab: 'penyaluran', row_key: 'pilar_2201', row_label: 'Bidang Kesehatan', coa_codes: '5140102' },
  { tab: 'penyaluran', row_key: 'pilar_2301', row_label: 'Bidang Pendidikan', coa_codes: '5140103' },
  { tab: 'penyaluran', row_key: 'pilar_2401', row_label: 'Bidang Ekonomi', coa_codes: '5140104' },
  { tab: 'penyaluran', row_key: 'pilar_2501', row_label: 'Bidang Dakwah-Advokasi', coa_codes: '5140105' },
  { tab: 'penyaluran', row_key: 'operasional_sdm', row_label: 'Operasional SDM', coa_codes: '5150101' },
  { tab: 'penyaluran', row_key: 'operasional_non_sdm', row_label: 'Operasional Kegiatan (Non SDM)', coa_codes: '5150102' },
  { tab: 'penyaluran', row_key: 'titipan_2101', row_label: 'Bidang Kemanusiaan (Titipan)', coa_codes: '5160101' },
  { tab: 'penyaluran', row_key: 'titipan_2201', row_label: 'Bidang Kesehatan (Titipan)', coa_codes: '5160102' },
  { tab: 'penyaluran', row_key: 'titipan_2301', row_label: 'Bidang Pendidikan (Titipan)', coa_codes: '5160103' },
  { tab: 'penyaluran', row_key: 'titipan_2401', row_label: 'Bidang Ekonomi (Titipan)', coa_codes: '5160104' },
  { tab: 'penyaluran', row_key: 'titipan_2501', row_label: 'Bidang Dakwah-Advokasi (Titipan)', coa_codes: '5160105' },
  { tab: 'penyaluran', row_key: 'apbn', row_label: 'APBN', coa_codes: '5170101' },
  { tab: 'penyaluran', row_key: 'apbd_provinsi', row_label: 'APBD Provinsi', coa_codes: '5170102' },
  { tab: 'penyaluran', row_key: 'apbd_kab_kota', row_label: 'APBD Kab/Kota', coa_codes: '5170103' },
  { tab: 'penyaluran', row_key: 'hak_pimpinan_amil', row_label: 'Hak keuangan Pimpinan Baznas Dari Dana Amil', coa_codes: '5180101' },
  { tab: 'penyaluran', row_key: 'hak_pimpinan_apbn', row_label: 'Hak keuangan Pimpinan Baznas Dari APBN', coa_codes: '5180102' },
  { tab: 'penyaluran', row_key: 'hak_pimpinan_apbd', row_label: 'Hak keuangan Pimpinan Baznas Dari APBD Kab/Kota', coa_codes: '5180103' }
];

const ensureDefaultMappingsExist = async () => {
  const existingMappings = await prisma.laporanKinerjaMapping.findMany({
    select: { row_key: true }
  });
  const existingKeys = new Set(existingMappings.map(e => e.row_key));
  const missing = defaultMappings.filter(m => !existingKeys.has(m.row_key));
  if (missing.length > 0) {
    await prisma.laporanKinerjaMapping.createMany({
      data: missing,
      skipDuplicates: true
    });
  }
};


export const getLaporanKinerjaMappings = async (req: Request, res: Response) => {
  try {
    await ensureDefaultMappingsExist();
    const mappings = await prisma.laporanKinerjaMapping.findMany({
      orderBy: [
        { tab: 'asc' },
        { row_key: 'asc' }
      ]
    });
    res.status(200).json(mappings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

const reportCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 30 * 1000;

export const invalidateReportCache = () => {
  reportCache.clear();
};

export const updateLaporanKinerjaMapping = async (req: Request, res: Response) => {
  try {
    const { row_key, coa_codes, tab, row_label } = req.body;
    if (!row_key) {
      return res.status(400).json({ error: 'row_key is required' });
    }

    const mapping = await prisma.laporanKinerjaMapping.upsert({
      where: { row_key },
      update: { 
        coa_codes,
        ...(row_label && { row_label }),
        ...(tab && { tab })
      },
      create: {
        row_key,
        row_label: row_label || row_key,
        tab: tab || 'pengumpulan',
        coa_codes: coa_codes || ''
      }
    });

    invalidateReportCache();
    res.status(200).json({ status: 'success', mapping });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const getMuzakkiMunfiqLaporan = async (req: Request, res: Response) => {
  try {
    const yearStr = req.query.year as string;
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    const cacheKey = `muzakki_munfiq_${year}`;
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cached.data);
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // Ensure mapping exists
    await ensureDefaultMappingsExist();
    const dbMappings = await prisma.laporanKinerjaMapping.findMany({
      where: { tab: 'pengumpulan' },
      select: { row_key: true, row_label: true, coa_codes: true }
    });

    // Fetch all ZIS receipts within the year using select projection
    const receipts = await prisma.penerimaanZis.findMany({
      where: {
        tanggal_pembayaran: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        tanggal_pembayaran: true,
        muzakki_id: true,
        muzakki: {
          select: { kategori: true }
        },
        rkat: {
          select: { coa_codes: true, kategori: true, nama_program: true }
        }
      }
    });

    // Structure mapping
    const categories: any[] = [
      { key: 'muzakki_individu', code: '3.1', label: 'Muzakki Individu', section: 'Muzakki Individu' },
      { key: 'muzakki_fitrah_individu', code: '3.2', label: 'Muzakki Fitrah Individu', section: 'Muzakki Individu' },
      { key: 'munfiq_individu', code: '3.3', label: 'Munfiq Individu', section: 'Muzakki Individu' },
      { key: 'donatur_qurban', code: '3.4', label: 'Donatur Qurban', section: 'Muzakki Individu' },
      { key: 'donatur_fidyah', code: '3.5', label: 'Donatur Fidyah', section: 'Muzakki Individu' },
      { key: 'donatur_dskl', code: '3.6', label: 'Donatur DSKL', section: 'Muzakki Individu' },
      { key: 'muzakki_badan', code: '3.7', label: 'Muzakki Badan', section: 'Muzakki Badan' },
      { key: 'munfiq_badan', code: '3.8', label: 'Munfiq Badan', section: 'Muzakki Badan' },
      { key: 'donatur_csr', code: '3.9', label: 'Donatur CSR', section: 'Muzakki Badan' }
    ];

    // Append new mapping keys from DB that are not in default categories
    dbMappings.forEach(dbm => {
      const exists = categories.some(c => c.key === dbm.row_key);
      if (!exists && (dbm.row_key.startsWith('muzakki_') || dbm.row_key.startsWith('munfiq_') || dbm.row_key.startsWith('donatur_'))) {
        const lowerLabel = dbm.row_label.toLowerCase();
        const section = lowerLabel.includes('badan') || lowerLabel.includes('perusahaan') ? 'Muzakki Badan' : 'Muzakki Individu';
        
        let code = '';
        const match = dbm.row_label.match(/^(\d+\.\d+)\s+/);
        if (match) {
          code = match[1];
        } else {
          const countInSection = categories.filter(c => c.section === section).length + 1;
          code = `3.${countInSection}`;
        }
        
        categories.push({
          key: dbm.row_key,
          code,
          label: dbm.row_label,
          section
        });
      }
    });

    // Initialize monthly values
    const result: Record<string, { code: string; label: string; section: string; monthly: number[] }> = {};
    categories.forEach(c => {
      result[c.key] = {
        code: c.code,
        label: c.label,
        section: c.section,
        monthly: Array(12).fill(0)
      };
    });

    // Set map to avoid double-counting the same registered muzakki in the same category/month
    const uniqueDonors = new Map<string, Set<string>>();

    // Pre-compute cleaned COA codes for fast matching
    const dbMappingsTargetCoas = dbMappings.map(m => ({
      row_key: m.row_key,
      targetCoas: m.coa_codes ? m.coa_codes.split(',').map(c => c.trim().replace(/[\s\.]/g, '')) : []
    }));

    receipts.forEach(p => {
      const date = new Date(p.tanggal_pembayaran);
      const mIdx = date.getMonth(); // 0-11
      if (mIdx < 0 || mIdx > 11) return;

      let targetKey = '';

      // 1. Try to match by COA Mapping in DB
      const rkatCoaCodesStr = p.rkat?.coa_codes || '';
      if (rkatCoaCodesStr) {
        const rkatCoaCodes = rkatCoaCodesStr.split(',').map(c => c.trim().replace(/[\s\.]/g, ''));
        const matched = dbMappingsTargetCoas.find(m => 
          rkatCoaCodes.some(rc => m.targetCoas.some(tc => rc.startsWith(tc)))
        );
        if (matched) {
          targetKey = matched.row_key;
        }
      }


      // 2. Fallback to legacy string matching if COA match fails
      if (!targetKey) {
        const isBadan = p.muzakki?.kategori === 'Badan';
        const rkatKategori = p.rkat?.kategori || 'Infak';
        const programName = (p.rkat?.nama_program || '').toLowerCase();

        if (!isBadan) {
          // Perorangan
          if (rkatKategori === 'Zakat') {
            if (programName.includes('fitrah')) {
              targetKey = 'muzakki_fitrah_individu';
            } else {
              targetKey = 'muzakki_individu';
            }
          } else if (rkatKategori === 'Infak') {
            targetKey = 'munfiq_individu';
          } else if (rkatKategori === 'DSKL') {
            if (programName.includes('kurban') || programName.includes('qurban')) {
              targetKey = 'donatur_qurban';
            } else if (programName.includes('fidyah')) {
              targetKey = 'donatur_fidyah';
            } else {
              targetKey = 'donatur_dskl';
            }
          } else if (rkatKategori === 'CSR') {
            targetKey = 'munfiq_individu';
          } else {
            targetKey = 'munfiq_individu';
          }
        } else {
          // Badan
          if (rkatKategori === 'Zakat') {
            targetKey = 'muzakki_badan';
          } else if (rkatKategori === 'Infak') {
            targetKey = 'munfiq_badan';
          } else if (rkatKategori === 'CSR' || programName.includes('corporate') || programName.includes('csr')) {
            targetKey = 'donatur_csr';
          } else {
            targetKey = 'munfiq_badan';
          }
        }
      }

      if (targetKey && result[targetKey]) {
        const uniqueKey = `${targetKey}_${mIdx}`;
        if (p.muzakki_id) {
          if (!uniqueDonors.has(uniqueKey)) {
            uniqueDonors.set(uniqueKey, new Set<string>());
          }
          const set = uniqueDonors.get(uniqueKey)!;
          if (!set.has(p.muzakki_id)) {
            set.add(p.muzakki_id);
            result[targetKey].monthly[mIdx]++;
          }
        } else {
          // Anonymous walk-in gets added unconditionally
          result[targetKey].monthly[mIdx]++;
        }
      }
    });

    // Convert output to array format
    const dataArray = categories.map(c => ({
      key: c.key,
      code: c.code,
      label: c.label,
      section: c.section,
      monthly: result[c.key].monthly,
      total: result[c.key].monthly.reduce((sum, val) => sum + val, 0)
    }));

    res.status(200).json({
      status: 'success',
      year,
      data: dataArray
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

const cleanNik = (nik: string | null | undefined): string => {
  if (!nik) return '';
  const cleaned = nik.replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : '';
};

const cleanName = (name: string | null | undefined): string => {
  if (!name) return '';
  let str = name.toLowerCase();
  str = str.replace(/,\s*(s\.?\w+|m\.?\w+|ph\.?d|h\.?j?|drs?\.?)/gi, ' ');
  str = str.replace(/\b(h\.?|hj\.?|drs\.?|dra\.?|ir\.?|st\.?|mm\.?|m\.si\.?|s\.kom\.?|s\.pd\.?|s\.t\.?)\b/gi, ' ');
  str = str.replace(/[^a-z0-9\s]/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
};

const cleanAddress = (addr: string | null | undefined): string => {
  if (!addr) return '';
  let str = addr.toLowerCase();
  str = str.replace(/[^a-z0-9\s]/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
};

export const getPenyaluranLaporan = async (req: Request, res: Response) => {
  try {
    const yearStr = req.query.year as string;
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    const cacheKey = `penyaluran_${year}`;
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cached.data);
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // Ensure mapping exists
    await ensureDefaultMappingsExist();
    const dbMappings = await prisma.laporanKinerjaMapping.findMany({
      where: { tab: 'penyaluran' },
      select: { row_key: true, row_label: true, coa_codes: true }
    });

    // Fetch all programs in the DB using select projection
    const dbPrograms = await prisma.program.findMany({
      select: {
        code: true,
        budget_rkat: true,
        pilar_code: true
      }
    });

    // Fetch realized proposals using select projection
    const realizedProposals = await prisma.proposal.findMany({
      where: {
        status: {
          in: ['Selesai & Arsip', 'Realisasi Bantuan', 'MENUNGGU_SIMBA', 'MENUNGGU_REALISASI_DISTRIBUSI', 'Pencairan Dana']
        },
        tanggal_masuk: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        mustahik_id: true,
        tanggal_masuk: true,
        nominal: true,
        asnaf: true,
        nama_pemohon: true,
        nik: true,
        alamat: true,
        program: {
          select: {
            code: true,
            name: true,
            tipe: true,
            pilar_code: true
          }
        },
        mustahik: {
          select: {
            nama: true,
            alamat: true,
            nrm: true,
            status_graduasi: true,
            nik: true
          }
        }
      }
    });

    // Fetch COA mappings and realized entries for proposals using select projection
    const coaMappingRules = await prisma.coaMappingRule.findMany({
      select: {
        program_code: true,
        asnaf_id: true,
        debit_coa_code: true
      }
    });

    const realisasiList = await prisma.realisasi.findMany({
      where: { proposal_id: { not: null } },
      select: {
        proposal_id: true,
        journalEntries: {
          select: {
            debit: true,
            coa_code: true
          }
        }
      }
    });

    // Pre-build Map lookups for O(1) matching
    const realisasiMap = new Map<string, any>();
    realisasiList.forEach(r => {
      if (r.proposal_id) realisasiMap.set(r.proposal_id, r);
    });

    const coaRuleMap = new Map<string, string>();
    coaMappingRules.forEach(r => {
      const ruleKey = `${r.program_code}_${(r.asnaf_id || '').toLowerCase().trim()}`;
      coaRuleMap.set(ruleKey, r.debit_coa_code);
    });

    const dbMappingsTargetCoas = dbMappings.map(m => ({
      row_key: m.row_key,
      targetCoas: m.coa_codes ? m.coa_codes.split(',').map(c => c.trim().replace(/[\s\.]/g, '')) : []
    }));

    // Pre-process proposals into lightweight structure ONCE
    const processedProposals = realizedProposals.map(p => {
      const date = new Date(p.tanggal_masuk);
      const mIdx = date.getMonth();
      const amt = Number(p.nominal) || 0;
      const mustahikId = p.mustahik_id || p.id;
      const normAsnaf = (p.asnaf || '').toLowerCase().trim();

      const matchingRealisasi = realisasiMap.get(p.id);
      let coaCode = '';
      if (matchingRealisasi) {
        const debitEntry = matchingRealisasi.journalEntries.find((je: any) => Number(je.debit) > 0);
        if (debitEntry) {
          coaCode = debitEntry.coa_code;
        }
      }

      if (!coaCode) {
        const ruleKey = `${p.program?.code || ''}_${normAsnaf}`;
        coaCode = coaRuleMap.get(ruleKey) || '';
      }

      let matchedRowKey = '';
      if (coaCode) {
        const cleanCoa = coaCode.replace(/[\s\.]/g, '');
        const matched = dbMappingsTargetCoas.find(m => m.targetCoas.some(tc => cleanCoa.startsWith(tc)));
        if (matched) {
          matchedRowKey = matched.row_key;
        }
      }

      const mustahikNama = p.mustahik?.nama || p.nama_pemohon || '';
      const mustahikNik = p.mustahik?.nik || p.nik || '';
      const mustahikAlamatRaw = p.mustahik?.alamat || p.alamat || '';

      return {
        id: p.id,
        mustahikId,
        mIdx,
        amt,
        coaCode,
        matchedRowKey,
        programCode: p.program?.code || '',
        programName: (p.program?.name || '').toLowerCase(),
        programTipe: p.program?.tipe || 'Konsumtif',
        pilarCode: p.program?.pilar_code,
        asnaf: normAsnaf,
        mustahikNama,
        mustahikAlamat: mustahikAlamatRaw.toLowerCase(),
        mustahikAlamatRaw,
        mustahikNrm: p.mustahik?.nrm,
        mustahikStatusGraduasi: p.mustahik?.status_graduasi,
        mustahikNik,
      };
    });

    // ----------------------------------------------------
    // TABLE 1: RKAT Penyaluran (Target vs Realisasi)
    // ----------------------------------------------------
    const rowsConfig: any[] = [
      // Zakat Ashnaf
      { key: 'zakat_fakir', code: '4.1', label: 'Penyaluran Dana Zakat untuk Fakir', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Fakir', fallbackTarget: 60000000 },
      { key: 'zakat_miskin', code: '4.2', label: 'Penyaluran Dana Zakat untuk Miskin', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Miskin', fallbackTarget: 6827160000 },
      { key: 'zakat_amil', code: '4.3', label: 'Penyaluran Dana Zakat Untuk Amil', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Amil', fallbackTarget: 1012000000 },
      { key: 'zakat_muallaf', code: '4.4', label: 'Penyaluran Dana Zakat Untuk Muallaf', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Muallaf', fallbackTarget: 170000000 },
      { key: 'zakat_riqab', code: '4.5', label: 'Penyaluran Dana Zakat Untuk Riqab', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Riqab', fallbackTarget: 0 },
      { key: 'zakat_gharimin', code: '4.6', label: 'Penyaluran Dana Zakat Untuk Gharimin', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Gharimin', fallbackTarget: 0 },
      { key: 'zakat_fisabilillah', code: '4.7', label: 'Penyaluran Dana Zakat Untuk Fisabilillah', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Fisabilillah', fallbackTarget: 1908640000 },
      { key: 'zakat_ibnu_sabil', code: '4.8', label: 'Penyaluran Dana Zakat Untuk Ibnu Sabil', section: 'zakat_ashnaf', type: 'zakat', asnaf: 'Ibnu Sabil', fallbackTarget: 7200000 },

      // Zakat Fitrah
      { key: 'fitrah_fakir', code: '4.9', label: 'Penyaluran Zakat Fitrah untuk fakir', section: 'zakat_fitrah', type: 'fitrah', asnaf: 'Fakir', fallbackTarget: 0 },
      { key: 'fitrah_miskin', code: '4.10', label: 'Penyaluran Zakat Fitrah untuk Miskin', section: 'zakat_fitrah', type: 'fitrah', asnaf: 'Miskin', fallbackTarget: 315000000 },
      { key: 'fitrah_amil', code: '4.11', label: 'Penyaluran Zakat Fitrah untuk Amil', section: 'zakat_fitrah', type: 'fitrah', asnaf: 'Amil', fallbackTarget: 0 },

      // Dana Infaq
      { key: 'infaq_tidak_terikat', code: '4.12', label: 'Infaq Tidak Terikat', section: 'dana_infaq', type: 'infaq_tidak_terikat', fallbackTarget: 5703800000 },
      { key: 'infaq_terikat', code: '4.13', label: 'Infaq Terikat', section: 'dana_infaq', type: 'infaq_terikat', fallbackTarget: 320000000 },
      { key: 'infaq_penyaluran', code: '4.14', label: 'Infaq Penyaluran', section: 'dana_infaq', type: 'infaq_penyaluran', fallbackTarget: 0 },
      { key: 'csr', code: '4.15', label: 'Penyaluran CSR', section: 'dana_infaq', type: 'csr', fallbackTarget: 405000000 },
      { key: 'qurban', code: '4.16', label: 'Penyaluran Qurban', section: 'dana_infaq', type: 'qurban', fallbackTarget: 315000000 },
      { key: 'fidyah', code: '4.17', label: 'Penyaluran Fidyah', section: 'dana_infaq', type: 'fidyah', fallbackTarget: 40000000 },
      { key: 'dskl', code: '4.18', label: 'Penyaluran DSKL', section: 'dana_infaq', type: 'dskl', fallbackTarget: 0 },
      { key: 'infaq_amil', code: '4.19', label: 'Penyaluran Infaq untuk Amil', section: 'dana_infaq', type: 'infaq_amil', fallbackTarget: 1616200000 },

      // Qurban Ekor
      { key: 'sapi_kerbau', code: '4.19', label: 'Sapi/Kerbau', section: 'qurban_ekor', type: 'sapi_kerbau', fallbackTarget: 0 },
      { key: 'domba_kambing', code: '4.20', label: 'Domba/Kambing', section: 'qurban_ekor', type: 'domba_kambing', fallbackTarget: 0 },

      // Program Bidang
      { key: 'pilar_2101', code: '4.19', label: 'Bidang Kemanusiaan', section: 'bidang_program', type: 'pilar', pilarCode: '2101', fallbackTarget: 3845350000 },
      { key: 'pilar_2201', code: '4.20', label: 'Bidang Kesehatan', section: 'bidang_program', type: 'pilar', pilarCode: '2201', fallbackTarget: 1657510000 },
      { key: 'pilar_2301', code: '4.21', label: 'Bidang Pendidikan', section: 'bidang_program', type: 'pilar', pilarCode: '2301', fallbackTarget: 3155450000 },
      { key: 'pilar_2401', code: '4.22', label: 'Bidang Ekonomi', section: 'bidang_program', type: 'pilar', pilarCode: '2401', fallbackTarget: 5338500000 },
      { key: 'pilar_2501', code: '4.23', label: 'Bidang Dakwah-Advokasi', section: 'bidang_program', type: 'pilar', pilarCode: '2501', fallbackTarget: 2074990000 },

      // Operasional
      { key: 'operasional_sdm', code: '4.24', label: 'Operasional SDM', section: 'dana_operasional', type: 'operasional_sdm', fallbackTarget: 1886749029 },
      { key: 'operasional_non_sdm', code: '4.25', label: 'Operasional Kegiatan (Non SDM)', section: 'dana_operasional', type: 'operasional_non_sdm', fallbackTarget: 1241450971 },

      // Dana Titipan
      { key: 'titipan_2101', code: '4.26', label: 'Bidang Kemanusiaan (Titipan)', section: 'dana_titipan', type: 'titipan_pilar', pilarCode: '2101', fallbackTarget: 0 },
      { key: 'titipan_2201', code: '4.27', label: 'Bidang Kesehatan (Titipan)', section: 'dana_titipan', type: 'titipan_pilar', pilarCode: '2201', fallbackTarget: 0 },
      { key: 'titipan_2301', code: '4.28', label: 'Bidang Pendidikan (Titipan)', section: 'dana_titipan', type: 'titipan_pilar', pilarCode: '2301', fallbackTarget: 0 },
      { key: 'titipan_2401', code: '4.29', label: 'Bidang Ekonomi (Titipan)', section: 'dana_titipan', type: 'titipan_pilar', pilarCode: '2401', fallbackTarget: 0 },
      { key: 'titipan_2501', code: '4.30', label: 'Bidang Dakwah-Advokasi (Titipan)', section: 'dana_titipan', type: 'titipan_pilar', pilarCode: '2501', fallbackTarget: 0 },

      // APBD
      { key: 'apbn', code: '4.31', label: 'APBN', section: 'penggunaan_apbd', type: 'apbn', fallbackTarget: 0 },
      { key: 'apbd_provinsi', code: '4.32', label: 'APBD Provinsi', section: 'penggunaan_apbd', type: 'apbd_provinsi', fallbackTarget: 0 },
      { key: 'apbd_kab_kota', code: '4.33', label: 'APBD Kab/Kota', section: 'penggunaan_apbd', type: 'apbd_kab_kota', fallbackTarget: 500000000 },

      // Hak Keuangan Pimpinan
      { key: 'hak_pimpinan_amil', code: '4.34', label: 'Hak keuangan Pimpinan Baznas Dari Dana Amil', section: 'hak_keuangan_pimpinan', type: 'hak_pimpinan_amil', fallbackTarget: 264582631 },
      { key: 'hak_pimpinan_apbn', code: '4.27', label: 'Hak keuangan Pimpinan Baznas Dari APBN', section: 'hak_keuangan_pimpinan', type: 'hak_pimpinan_apbn', fallbackTarget: 0 },
      { key: 'hak_pimpinan_apbd', code: '4.28', label: 'Hak keuangan Pimpinan Baznas Dari APBD Kab/Kota', section: 'hak_keuangan_pimpinan', type: 'hak_pimpinan_apbd', fallbackTarget: 0 }
    ];

    // Let's add any new custom mappings from DB that are not in rowsConfig
    dbMappings.forEach(dbm => {
      const existsInT3 = rowsConfig.some(row => row.key === dbm.row_key);
      if (!existsInT3) {
        let section = 'zakat_ashnaf';
        let type = 'zakat';
        const lowerLabel = dbm.row_label.toLowerCase();
        
        if (lowerLabel.includes('fitrah')) {
          section = 'zakat_fitrah';
          type = 'fitrah';
        } else if (lowerLabel.includes('infaq') || lowerLabel.includes('infak') || lowerLabel.includes('sedekah') || lowerLabel.includes('csr') || lowerLabel.includes('qurban') || lowerLabel.includes('fidyah') || lowerLabel.includes('dskl')) {
          section = 'dana_infaq';
          type = 'infaq_tidak_terikat';
        } else if (lowerLabel.includes('titipan')) {
          section = 'dana_titipan';
          type = 'titipan_pilar';
        } else if (lowerLabel.includes('pilar') || lowerLabel.includes('bidang')) {
          section = 'bidang_program';
          type = 'pilar';
        } else if (lowerLabel.includes('operasional')) {
          section = 'dana_operasional';
          type = 'operasional_non_sdm';
        }
        
        let code = '';
        const match = dbm.row_label.match(/^(\d+\.\d+)\s+/);
        if (match) {
          code = match[1];
        } else {
          const countInSection = rowsConfig.filter(r => r.section === section).length + 1;
          code = `4.${countInSection}`;
        }

        rowsConfig.push({
          key: dbm.row_key,
          code,
          label: dbm.row_label,
          section,
          type,
          fallbackTarget: 0,
          asnaf: lowerLabel.includes('fakir') ? 'Fakir' : lowerLabel.includes('miskin') ? 'Miskin' : undefined
        });
      }
    });

    // Compute Targets dynamically from dbPrograms
    const finalRkatList = rowsConfig.map(row => {
      let target = row.fallbackTarget;

      // Dynamic override from program budgets in DB if available
      if (row.type === 'pilar' && row.pilarCode) {
        const sumDb = dbPrograms
          .filter(p => p.pilar_code === row.pilarCode)
          .reduce((sum, p) => sum + (p.budget_rkat || 0), 0);
        if (sumDb > 0) {
          target = sumDb;
        }
      }

      // Initialize monthly values
      const monthly = Array(12).fill(0);

      // Distribute realization values from pre-processed proposals
      processedProposals.forEach(p => {
        if (p.mIdx < 0 || p.mIdx > 11) return;

        let isMatch = false;

        if (p.matchedRowKey && p.matchedRowKey === row.key) {
          isMatch = true;
        } else if (!p.matchedRowKey) {
          const rowAsnaf = (row.asnaf || '').toLowerCase();

          if (row.type === 'zakat') {
            const isZakatGeneral = !p.programCode.startsWith('210103') && !p.programName.includes('fitrah') && 
                                   !p.programName.includes('csr') && !p.programName.includes('qurban') && 
                                   !p.programName.includes('kurban') && !p.programName.includes('fidyah') && 
                                   !p.programName.includes('dskl');
            if (isZakatGeneral && p.asnaf === rowAsnaf) {
              isMatch = true;
            }
          } else if (row.type === 'fitrah') {
            const isFitrah = p.programCode.startsWith('210103') || p.programName.includes('fitrah');
            if (isFitrah && p.asnaf === rowAsnaf) {
              isMatch = true;
            }
          } else if (row.type === 'infaq_tidak_terikat') {
            isMatch = p.programName.includes('tidak terikat');
          } else if (row.type === 'infaq_terikat') {
            isMatch = p.programName.includes('terikat') && !p.programName.includes('tidak terikat');
          } else if (row.type === 'infaq_penyaluran') {
            isMatch = p.programName.includes('infaq penyaluran');
          } else if (row.type === 'csr') {
            isMatch = p.programName.includes('csr') || p.programCode.includes('240106.1');
          } else if (row.type === 'qurban') {
            isMatch = p.programName.includes('qurban') || p.programName.includes('kurban') || p.programCode.includes('210104');
          } else if (row.type === 'fidyah') {
            isMatch = p.programName.includes('fidyah');
          } else if (row.type === 'dskl') {
            isMatch = p.programName.includes('dskl');
          } else if (row.type === 'infaq_amil') {
            isMatch = p.programName.includes('infaq amil') || p.programName.includes('infaq untuk amil');
          } else if (row.type === 'pilar') {
            isMatch = p.pilarCode === row.pilarCode;
          } else if (row.type === 'titipan_pilar') {
            isMatch = p.pilarCode === row.pilarCode && (p.programName.includes('titipan') || p.programName.includes('dana titipan'));
          } else if (row.type === 'apbd_kab_kota') {
            isMatch = p.programName.includes('apbd');
          } else if (row.type === 'hak_pimpinan_amil') {
            isMatch = p.programName.includes('pimpinan') || p.programName.includes('hak pimpinan');
          }
        }

        if (isMatch) {
          monthly[p.mIdx] += p.amt;
        }
      });

      const realisasi_total = monthly.reduce((sum, v) => sum + v, 0);

      return {
        code: row.code,
        label: row.label,
        section: row.section,
        nilai_anggaran: target,
        realisasi_total,
        monthly,
        ...monthly.reduce((acc, v, idx) => {
          const keys = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'];
          acc[keys[idx]] = v;
          return acc;
        }, {} as Record<string, number>)
      };
    });

    // ----------------------------------------------------
    // TABLE 2: Mustahik Growth / Beneficiaries Statistics
    // ----------------------------------------------------
    const mustahikConfig = [
      { code: '5.1', label: 'Bidang Program kemanusiaan', section: 'mustahik_program', type: 'pilar', pilarCode: '2101' },
      { code: '5.2', label: 'Bidang Program Kesehatan', section: 'mustahik_program', type: 'pilar', pilarCode: '2201' },
      { code: '5.3', label: 'Bidang Program Pendidikan', section: 'mustahik_program', type: 'pilar', pilarCode: '2301' },
      { code: '5.4', label: 'Bidang Program Ekonomi', section: 'mustahik_program', type: 'pilar', pilarCode: '2401' },
      { code: '5.5', label: 'Bidang Program Dakwah-Advokasi', section: 'mustahik_program', type: 'pilar', pilarCode: '2501' },

      // IKK Penyaluran
      { code: '5.6', label: 'Jumlah Mustahik Program Penyaluran', section: 'ikk_penyaluran', type: 'total_mustahik' },
      { code: 'a.', label: 'Mustahik Program Pendistribusian', section: 'ikk_penyaluran', type: 'pendistribusian' },
      { code: 'b.', label: 'Mustahik Program Pendayagunaan', section: 'ikk_penyaluran', type: 'pendayagunaan' },
      { code: '5.7', label: 'Jumlah Mustahik Penerima Penyaluran dengan NIM/NRM', section: 'ikk_penyaluran', type: 'nim_nrm' },
      { code: '5.8', label: 'Mustahik yang dikeluarkan dari garis kemiskinan', section: 'ikk_penyaluran', type: 'kemiskinan' },
      { code: '5.9', label: 'Jumlah Desa Penerima Penyaluran Zakat', section: 'ikk_penyaluran', type: 'desa_zakat' },
      { code: '5.10', label: 'Jumlah Desa Program Pemberdayaan Berbasis Zakat', section: 'ikk_penyaluran', type: 'desa_pemberdayaan' },
      { code: '5.11', label: 'Mustahik penerima penyaluran yang menjadi muzakki', section: 'ikk_penyaluran', type: 'mustahik_to_muzakki' },
      { code: '5.12', label: 'Mustahik penerima penyaluran yang menjadi munfiq', section: 'ikk_penyaluran', type: 'mustahik_to_munfiq' }
    ];

    // Fetch all registered Muzakkis & payment receipts to check Mustahik transition
    const dbMuzakkis = await prisma.muzakki.findMany({
      select: {
        id: true,
        nama: true,
        nik: true,
        alamat: true,
        kategori: true
      }
    });

    const receipts = await prisma.penerimaanZis.findMany({
      where: { muzakki_id: { not: null } },
      select: {
        muzakki_id: true,
        rkat: { select: { kategori: true } }
      }
    });

    const muzakkiZakatSet = new Set<string>();
    const muzakkiInfakSet = new Set<string>();

    receipts.forEach(r => {
      if (r.muzakki_id) {
        const kat = r.rkat?.kategori || '';
        if (kat === 'Zakat') {
          muzakkiZakatSet.add(r.muzakki_id);
        } else if (kat === 'Infak' || kat === 'DSKL' || kat === 'CSR') {
          muzakkiInfakSet.add(r.muzakki_id);
        }
      }
    });

    const processedMuzakkis = dbMuzakkis.map(m => {
      const nikClean = cleanNik(m.nik);
      const nameClean = cleanName(m.nama);
      const addrClean = cleanAddress(m.alamat);
      const isZakat = muzakkiZakatSet.has(m.id);
      const isInfak = muzakkiInfakSet.has(m.id);

      return {
        id: m.id,
        nikClean,
        nameClean,
        addrClean,
        isMuzakki: isZakat || !isInfak,
        isMunfiq: isInfak || !isZakat
      };
    });

    const isMatchMuzakkiOrMunfiq = (p: any, targetType: 'mustahik_to_muzakki' | 'mustahik_to_munfiq'): boolean => {
      const pNik = cleanNik(p.mustahikNik);
      const pName = cleanName(p.mustahikNama);
      const pAddr = cleanAddress(p.mustahikAlamatRaw);
      if (!pNik && !pName) return false;

      return processedMuzakkis.some(m => {
        if (targetType === 'mustahik_to_muzakki' && !m.isMuzakki) return false;
        if (targetType === 'mustahik_to_munfiq' && !m.isMunfiq) return false;

        // 1. Match by NIK
        if (pNik && m.nikClean && pNik === m.nikClean) {
          return true;
        }

        // 2. Match by Name + Address
        if (pName && m.nameClean) {
          const nameExact = pName === m.nameClean;
          const nameContains = pName.length >= 4 && m.nameClean.length >= 4 && (pName.includes(m.nameClean) || m.nameClean.includes(pName));

          if (nameExact || nameContains) {
            if (!pAddr || !m.addrClean) return true;
            if (pAddr.includes(m.addrClean) || m.addrClean.includes(pAddr)) return true;
            const pWords = pAddr.split(' ').filter(w => w.length > 2);
            const mWords = m.addrClean.split(' ').filter(w => w.length > 2);
            if (pWords.some(w => mWords.includes(w))) return true;
          }
        }

        return false;
      });
    };

    // Fetch Mustahik master records directly from Mustahik table
    const dbMustahikMaster = await prisma.mustahik.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        nama: true,
        nik: true,
        nrm: true,
        alamat: true,
        status_graduasi: true,
        created_at: true
      }
    });

    const processedMustahikMaster = dbMustahikMaster.map(m => {
      const date = new Date(m.created_at);
      const mIdx = date.getMonth();
      return {
        id: m.id,
        mustahikId: m.id,
        mIdx,
        amt: 0,
        coaCode: '',
        matchedRowKey: '',
        programCode: '',
        programName: '',
        programTipe: 'Konsumtif',
        pilarCode: '',
        asnaf: '',
        mustahikNama: m.nama || '',
        mustahikAlamat: (m.alamat || '').toLowerCase(),
        mustahikAlamatRaw: m.alamat || '',
        mustahikNrm: m.nrm,
        mustahikStatusGraduasi: m.status_graduasi,
        mustahikNik: m.nik
      };
    });

    const combinedMustahikItems = [...processedProposals, ...processedMustahikMaster];

    // Compute unique mustahiks from pre-processed proposals and master Mustahik data
    const finalMustahikList = mustahikConfig.map(row => {
      const monthly = Array(12).fill(0);
      const uniqueDonorsMap = new Map<number, Set<string>>();

      combinedMustahikItems.forEach(p => {
        if (p.mIdx < 0 || p.mIdx > 11) return;

        const isPilarMatch = p.pilarCode === row.pilarCode;
        let isMatch = false;

        if (row.type === 'pilar') {
          isMatch = isPilarMatch;
        } else if (row.type === 'total_mustahik') {
          isMatch = true;
        } else if (row.type === 'pendistribusian') {
          isMatch = p.programTipe === 'Konsumtif';
        } else if (row.type === 'pendayagunaan') {
          isMatch = p.programTipe === 'Produktif';
        } else if (row.type === 'nim_nrm') {
          isMatch = !!p.mustahikNrm;
        } else if (row.type === 'kemiskinan') {
          isMatch = p.mustahikStatusGraduasi === 'Sudah';
        } else if (row.type === 'desa_zakat') {
          isMatch = p.mustahikAlamat.includes('desa') || p.mustahikAlamat.includes('kelurahan');
        } else if (row.type === 'desa_pemberdayaan') {
          isMatch = p.programTipe === 'Produktif' && (p.mustahikAlamat.includes('desa') || p.mustahikAlamat.includes('kelurahan'));
        } else if (row.type === 'mustahik_to_muzakki') {
          isMatch = isMatchMuzakkiOrMunfiq(p, 'mustahik_to_muzakki');
        } else if (row.type === 'mustahik_to_munfiq') {
          isMatch = isMatchMuzakkiOrMunfiq(p, 'mustahik_to_munfiq');
        }

        if (isMatch) {
          if (!uniqueDonorsMap.has(p.mIdx)) {
            uniqueDonorsMap.set(p.mIdx, new Set<string>());
          }
          const set = uniqueDonorsMap.get(p.mIdx)!;
          const keyToDedupe = p.mustahikId || cleanNik(p.mustahikNik) || cleanName(p.mustahikNama);
          if (keyToDedupe && !set.has(keyToDedupe)) {
            set.add(keyToDedupe);
            monthly[p.mIdx]++;
          }
        }
      });

      const total = monthly.reduce((sum, v) => sum + v, 0);

      return {
        code: row.code,
        label: row.label,
        section: row.section,
        total,
        monthly
      };
    });

    const responsePayload = {
      status: 'success',
      year,
      rkatPenyaluranList: finalRkatList,
      mustahikGrowthList: finalMustahikList
    };
    reportCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const getPengumpulanLaporan = async (req: Request, res: Response) => {
  try {
    const yearStr = req.query.year as string;
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    const cacheKey = `pengumpulan_${year}`;
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cached.data);
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // Ensure mapping exists
    await ensureDefaultMappingsExist();
    const dbMappings = await prisma.laporanKinerjaMapping.findMany({
      where: { tab: 'pengumpulan' },
      select: { row_key: true, row_label: true, coa_codes: true }
    });

    // Fetch all RKAT Pengumpulan items from DB (used to override target budgets)
    const dbRkatList = await prisma.rkatPengumpulan.findMany();

    // Map for fast O(1) lookup of RKAT items
    const dbRkatMap = new Map<string, any>();
    dbRkatList.forEach(item => {
      if (item.no) dbRkatMap.set(item.no.trim(), item);
      if (item.nama_program) dbRkatMap.set(item.nama_program.toLowerCase().trim(), item);
    });

    // Fetch all PenerimaanZis receipts within the year
    const receipts = await prisma.penerimaanZis.findMany({
      where: {
        tanggal_pembayaran: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        rkat: true
      }
    });

    const dbMappingsTargetCoas = dbMappings.map(m => ({
      row_key: m.row_key,
      targetCoas: m.coa_codes ? m.coa_codes.split(',').map(c => c.trim().replace(/[\s\.]/g, '')) : []
    }));

    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'];

    // Pre-process receipts ONCE
    const processedReceipts = receipts.map(p => {
      const date = new Date(p.tanggal_pembayaran);
      const mIdx = date.getMonth();
      const mKey = monthKeys[mIdx] || '';
      const amt = Number(p.nominal) || 0;
      const programName = (p.rkat?.nama_program || '').toLowerCase();

      let matchedRowKey = '';
      const rkatCoaCodesStr = p.rkat?.coa_codes || '';
      if (rkatCoaCodesStr) {
        const cleanCoas = rkatCoaCodesStr.split(',').map(c => c.trim().replace(/[\s\.]/g, ''));
        const matched = dbMappingsTargetCoas.find(m => 
          cleanCoas.some(rc => m.targetCoas.some(tc => rc.startsWith(tc)))
        );
        if (matched) {
          matchedRowKey = matched.row_key;
        }
      }

      return {
        mKey,
        amt,
        programName,
        matchedRowKey,
      };
    });

    const rowsConfig: any[] = [
      // Penerimaan Zakat
      { key: 'rkat_zakat_maal_badan', no: '1.1', nama_program: 'Zakat Maal Badan', kategori: 'Zakat', section: 'zakat', fallbackTarget: 50000000 },
      { key: 'rkat_zakat_maal_perorangan', no: '1.2', nama_program: 'Zakat Maal Perorangan', kategori: 'Zakat', section: 'zakat', fallbackTarget: 2000000000 },
      { key: 'rkat_zakat_maal_upz_pengumpulan', no: '1.3', nama_program: 'Zakat Maal Perorangan via UPZ Pengumpulan', kategori: 'Zakat', section: 'zakat', fallbackTarget: 500000000 },
      { key: 'rkat_zakat_maal_upz_penyaluran', no: '1.4', nama_program: 'Zakat Maal Perorangan via UPZ Penyaluran', kategori: 'Zakat', section: 'zakat', fallbackTarget: 100000000 },
      { key: 'rkat_zakat_fitrah', no: '1.5', nama_program: 'Zakat Fitrah', kategori: 'Zakat', section: 'zakat', fallbackTarget: 1500000000 },
      { key: 'rkat_zakat_fitrah_upz_penyaluran', no: '1.6', nama_program: 'Zakat Fitrah via UPZ Penyaluran', kategori: 'Zakat', section: 'zakat', fallbackTarget: 300000000 },

      // Penerimaan Infak / Sedekah
      { key: 'rkat_infak_tidak_terikat', no: '2.1', nama_program: 'Infak/Sedekah Tidak Terikat', kategori: 'Infak', section: 'infak', fallbackTarget: 1000000000 },
      { key: 'rkat_infak_tidak_terikat_upz_pengumpulan', no: '2.2', nama_program: 'Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', kategori: 'Infak', section: 'infak', fallbackTarget: 200000000 },
      { key: 'rkat_infak_tidak_terikat_upz_penyaluran', no: '2.3', nama_program: 'Infak/Sedekah Tidak Terikat via UPZ Penyaluran', kategori: 'Infak', section: 'infak', fallbackTarget: 50000000 },
      { key: 'rkat_infak_terikat_program', no: '2.4', nama_program: 'Infak/Sedekah Terikat-Program', kategori: 'Infak', section: 'infak', fallbackTarget: 500000000 },
      { key: 'rkat_infak_terikat_natura', no: '2.5', nama_program: 'Infak/Sedekah Terikat-Program Natura', kategori: 'Infak', section: 'infak', fallbackTarget: 100000000 },
      { key: 'rkat_infak_terikat_palestina', no: '2.6', nama_program: 'Infak/Sedekah Terikat-Program SDI/Palestina', kategori: 'Infak', section: 'infak', fallbackTarget: 150000000 },
      { key: 'rkat_infak_terikat_operasional', no: '2.7', nama_program: 'Infak/Sedekah Terikat Operasional', kategori: 'Infak', section: 'infak', fallbackTarget: 80000000 },

      // DSKL & CSR
      { key: 'rkat_dskl_kurban', no: '3.1', nama_program: 'Kurban', kategori: 'DSKL', section: 'dskl', fallbackTarget: 300000000 },
      { key: 'rkat_dskl_fidyah', no: '3.2', nama_program: 'Fidyah', kategori: 'DSKL', section: 'dskl', fallbackTarget: 40000000 },
      { key: 'rkat_csr', no: '3.3', nama_program: 'Corporate Social Responsibility', kategori: 'CSR', section: 'dskl', fallbackTarget: 405000000 },

      // Dana Titipan
      { key: 'rkat_dana_titipan', no: '2.18', nama_program: 'Dana Titipan', kategori: 'Dana Titipan', section: 'titipan', fallbackTarget: 0 }
    ];

    // Let's add any new custom mappings from DB that are not in rowsConfig
    dbMappings.forEach(dbm => {
      const exists = rowsConfig.some(row => row.key === dbm.row_key);
      if (!exists && dbm.row_key.startsWith('rkat_')) {
        let section = 'zakat';
        let kategori = 'Zakat';
        const lowerLabel = dbm.row_label.toLowerCase();
        if (lowerLabel.includes('infak') || lowerLabel.includes('sedekah') || lowerLabel.includes('infaq')) {
          section = 'infak';
          kategori = 'Infak';
        } else if (lowerLabel.includes('dskl') || lowerLabel.includes('kurban') || lowerLabel.includes('qurban') || lowerLabel.includes('fidyah') || lowerLabel.includes('csr')) {
          section = 'dskl';
          kategori = 'DSKL';
          if (lowerLabel.includes('csr')) kategori = 'CSR';
        } else if (lowerLabel.includes('titipan')) {
          section = 'titipan';
          kategori = 'Dana Titipan';
        }
        
        let no = '';
        const match = dbm.row_label.match(/^(\d+\.\d+)\s+/);
        if (match) {
          no = match[1];
        } else {
          const countInSection = rowsConfig.filter(r => r.section === section).length + 1;
          const sectionNum = section === 'zakat' ? '1' : section === 'infak' ? '2' : '3';
          no = `${sectionNum}.${countInSection}`;
        }
        
        rowsConfig.push({
          key: dbm.row_key,
          no,
          nama_program: dbm.row_label,
          kategori,
          section,
          fallbackTarget: 0
        });
      }
    });

    const finalRkatList = rowsConfig.map(row => {
      // Find matching item in DB Map to override targets
      const dbRkat = dbRkatMap.get(row.no.trim()) || dbRkatMap.get(row.nama_program.toLowerCase().trim());

      let nilai_anggaran = row.fallbackTarget;
      let target_jan = null, target_feb = null, target_mar = null, target_apr = null, target_mei = null, target_jun = null;
      let target_jul = null, target_agt = null, target_sep = null, target_okt = null, target_nov = null, target_des = null;

      if (dbRkat) {
        nilai_anggaran = Number(dbRkat.nilai_anggaran) || 0;
        target_jan = dbRkat.target_jan ? Number(dbRkat.target_jan) : null;
        target_feb = dbRkat.target_feb ? Number(dbRkat.target_feb) : null;
        target_mar = dbRkat.target_mar ? Number(dbRkat.target_mar) : null;
        target_apr = dbRkat.target_apr ? Number(dbRkat.target_apr) : null;
        target_mei = dbRkat.target_mei ? Number(dbRkat.target_mei) : null;
        target_jun = dbRkat.target_jun ? Number(dbRkat.target_jun) : null;
        target_jul = dbRkat.target_jul ? Number(dbRkat.target_jul) : null;
        target_agt = dbRkat.target_agt ? Number(dbRkat.target_agt) : null;
        target_sep = dbRkat.target_sep ? Number(dbRkat.target_sep) : null;
        target_okt = dbRkat.target_okt ? Number(dbRkat.target_okt) : null;
        target_nov = dbRkat.target_nov ? Number(dbRkat.target_nov) : null;
        target_des = dbRkat.target_des ? Number(dbRkat.target_des) : null;
      }

      // Initialize monthly realization values
      const monthly = {
        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0,
        jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
      };

      processedReceipts.forEach(p => {
        if (!p.mKey) return;
        let isMatch = false;

        if (p.matchedRowKey && p.matchedRowKey === row.key) {
          isMatch = true;
        } else if (!p.matchedRowKey) {
          const programName = p.programName;
          
          if (row.key === 'rkat_zakat_maal_badan') {
            isMatch = programName.includes('maal') && programName.includes('badan');
          } else if (row.key === 'rkat_zakat_maal_perorangan') {
            isMatch = programName.includes('maal') && programName.includes('perorangan') && !programName.includes('upz');
          } else if (row.key === 'rkat_zakat_maal_upz_pengumpulan') {
            isMatch = programName.includes('maal') && programName.includes('upz pengumpulan');
          } else if (row.key === 'rkat_zakat_maal_upz_penyaluran') {
            isMatch = programName.includes('maal') && programName.includes('upz penyaluran');
          } else if (row.key === 'rkat_zakat_fitrah') {
            isMatch = programName.includes('fitrah') && !programName.includes('upz');
          } else if (row.key === 'rkat_zakat_fitrah_upz_penyaluran') {
            isMatch = programName.includes('fitrah') && programName.includes('upz');
          } else if (row.key === 'rkat_infak_tidak_terikat') {
            isMatch = programName.includes('tidak terikat') && !programName.includes('upz');
          } else if (row.key === 'rkat_infak_tidak_terikat_upz_pengumpulan') {
            isMatch = programName.includes('tidak terikat') && programName.includes('upz pengumpulan');
          } else if (row.key === 'rkat_infak_tidak_terikat_upz_penyaluran') {
            isMatch = programName.includes('tidak terikat') && programName.includes('upz penyaluran');
          } else if (row.key === 'rkat_infak_terikat_program') {
            isMatch = programName.includes('terikat') && programName.includes('program') && !programName.includes('natura') && !programName.includes('palestina') && !programName.includes('sdi') && !programName.includes('operasional');
          } else if (row.key === 'rkat_infak_terikat_natura') {
            isMatch = programName.includes('terikat') && programName.includes('natura');
          } else if (row.key === 'rkat_infak_terikat_palestina') {
            isMatch = programName.includes('terikat') && (programName.includes('palestina') || programName.includes('sdi'));
          } else if (row.key === 'rkat_infak_terikat_operasional') {
            isMatch = programName.includes('terikat') && programName.includes('operasional');
          } else if (row.key === 'rkat_dskl_kurban') {
            isMatch = programName.includes('kurban') || programName.includes('qurban');
          } else if (row.key === 'rkat_dskl_fidyah') {
            isMatch = programName.includes('fidyah');
          } else if (row.key === 'rkat_csr') {
            isMatch = programName.includes('csr') || programName.includes('corporate');
          } else if (row.key === 'rkat_dana_titipan') {
            isMatch = programName.includes('titipan');
          }
        }

        if (isMatch) {
          monthly[p.mKey as keyof typeof monthly] += p.amt;
        }
      });

      const realisasi_total = Object.values(monthly).reduce((s, v) => s + v, 0);


      return {
        id: row.key,
        no: row.no,
        kategori: row.kategori,
        nama_program: row.nama_program,
        nilai_anggaran,
        realisasi_total,
        target_jan, target_feb, target_mar, target_apr, target_mei, target_jun,
        target_jul, target_agt, target_sep, target_okt, target_nov, target_des,
        ...monthly
      };
    });

    const responsePayload = {
      status: 'success',
      year,
      data: finalRkatList
    };
    reportCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
