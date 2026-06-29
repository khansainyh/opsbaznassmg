import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  LineChart, 
  TrendingUp, 
  Users, 
  Percent, 
  Calendar, 
  Download, 
  Search, 
  ChevronRight, 
  Layers,
  Award,
  Settings2,
  X,
  Save,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// Helper to format currency in IDR
const formatCurrency = (val: number | string) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Helper for percentage
const formatPercent = (real: number, target: number) => {
  if (!target || target === 0) return '0,00%';
  const pct = (real / target) * 100;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pct) + '%';
};

const formatPercentNumber = (real: number, target: number) => {
  if (!target || target === 0) return 0;
  return (real / target) * 100;
};

// Helper for simple number formatting
const formatNumber = (val: number) => {
  return new Intl.NumberFormat('id-ID').format(val);
};

export default function LaporanKinerja() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pengumpulan' | 'penyaluran'>('pengumpulan');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [rkatPengumpulanList, setRkatPengumpulanList] = useState<any[]>([]);
  const [muzakkiMunfiqList, setMuzakkiMunfiqList] = useState<any[]>([]);
  const [rkatPenyaluranList, setRkatPenyaluranList] = useState<any[]>([]);
  const [mustahikGrowthList, setMustahikGrowthList] = useState<any[]>([]);

  // Settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [editingMappingKey, setEditingMappingKey] = useState<string | null>(null);
  const [editingCoaCodes, setEditingCoaCodes] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchMappingQuery, setSearchMappingQuery] = useState('');
  const [mappingFilterTab, setMappingFilterTab] = useState<'pengumpulan' | 'penyaluran'>('pengumpulan');

  const fetchMappings = async () => {
    try {
      const res = await axios.get('/api/laporan-kinerja/mappings');
      setMappings(res.data);
    } catch (err) {
      console.error('Gagal mengambil mapping COA:', err);
    }
  };

  const handleOpenSettings = () => {
    fetchMappings();
    setIsSettingsOpen(true);
  };

  const handleStartEdit = (item: any) => {
    setEditingMappingKey(item.row_key);
    setEditingCoaCodes(item.coa_codes || '');
  };

  const handleCancelEdit = () => {
    setEditingMappingKey(null);
    setEditingCoaCodes('');
  };

  const handleSaveMapping = async (row_key: string) => {
    setSaveLoading(true);
    try {
      await axios.post('/api/laporan-kinerja/mappings', {
        row_key,
        coa_codes: editingCoaCodes
      });
      await fetchMappings();
      setEditingMappingKey(null);
      setEditingCoaCodes('');
      fetchData();
    } catch (err) {
      console.error('Gagal menyimpan mapping:', err);
      alert('Gagal menyimpan mapping COA');
    } finally {
      setSaveLoading(false);
    }
  };

  // Years option
  const yearOptions = [2026, 2025, 2024, 2023];

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRkat, resMuzakki, resPenyaluran] = await Promise.all([
        axios.get(`/api/laporan-kinerja/pengumpulan?year=${selectedYear}`),
        axios.get(`/api/laporan-kinerja/muzakki-munfiq?year=${selectedYear}`),
        axios.get(`/api/laporan-kinerja/penyaluran?year=${selectedYear}`)
      ]);

      if (resRkat.data.status === 'success') {
        setRkatPengumpulanList(resRkat.data.data);
      }
      if (resMuzakki.data.status === 'success') {
        setMuzakkiMunfiqList(resMuzakki.data.data);
      }
      if (resPenyaluran.data.status === 'success') {
        setRkatPenyaluranList(resPenyaluran.data.rkatPenyaluranList);
        setMustahikGrowthList(resPenyaluran.data.mustahikGrowthList);
      }
    } catch (err) {
      console.error('Gagal mengambil data Laporan Kinerja:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Months map helper
  const months = [
    { key: 'jan', label: 'Januari' },
    { key: 'feb', label: 'Februari' },
    { key: 'mar', label: 'Maret' },
    { key: 'apr', label: 'April' },
    { key: 'mei', label: 'Mei' },
    { key: 'jun', label: 'Juni' },
    { key: 'jul', label: 'Juli' },
    { key: 'agt', label: 'Agustus' },
    { key: 'sep', label: 'September' },
    { key: 'okt', label: 'Oktober' },
    { key: 'nov', label: 'November' },
    { key: 'des', label: 'Desember' }
  ];

  // Filter & Group Realisasi RKAT Pengumpulan
  const groupedRkatData = useMemo(() => {
    // Apply search filter
    const query = searchQuery.toLowerCase();
    const filtered = rkatPengumpulanList.filter(item => 
      (item.nama_program || '').toLowerCase().includes(query) ||
      (item.no || '').toLowerCase().includes(query) ||
      (item.kategori || '').toLowerCase().includes(query)
    );

    // Grouping structure
    const groups: Record<string, { title: string; items: any[] }> = {
      zakat: { title: 'Penerimaan Zakat', items: [] },
      infak: { title: 'Penerimaan Infak / Sedekah', items: [] },
      dskl: { title: 'DSKL & CSR', items: [] },
      titipan: { title: 'Dana Titipan', items: [] }
    };

    filtered.forEach(item => {
      const kat = (item.kategori || '').toLowerCase();
      if (kat === 'zakat') {
        groups.zakat.items.push(item);
      } else if (kat === 'infak') {
        groups.infak.items.push(item);
      } else if (kat === 'dskl' || kat === 'csr') {
        groups.dskl.items.push(item);
      } else if (kat === 'dana titipan' || kat === 'titipan') {
        groups.titipan.items.push(item);
      } else {
        // Default to infak/sedekah
        groups.infak.items.push(item);
      }
    });

    // If "Dana Titipan" group is empty and search is empty, add a default placeholder row like the screenshot
    if (groups.titipan.items.length === 0 && !searchQuery) {
      groups.titipan.items.push({
        id: 'titipan-placeholder',
        no: '2.18',
        kategori: 'Dana Titipan',
        nama_program: 'Dana Titipan',
        nilai_anggaran: 0,
        realisasi_total: 0,
        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
      });
    }

    return Object.entries(groups).map(([key, group]) => ({
      key,
      ...group
    }));
  }, [rkatPengumpulanList, searchQuery]);

  // Statistics summaries
  const totals = useMemo(() => {
    let target = 0;
    let real = 0;
    const monthlySum: Record<string, number> = {
      jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
    };

    rkatPengumpulanList.forEach(item => {
      target += Number(item.nilai_anggaran) || 0;
      real += Number(item.realisasi_total) || 0;
      months.forEach(m => {
        monthlySum[m.key] += Number(item[m.key]) || 0;
      });
    });

    return { target, real, monthlySum };
  }, [rkatPengumpulanList]);

  // Total unique Muzakki / Munfiq sum
  const totalMuzakkiMunfiqCount = useMemo(() => {
    let sum = 0;
    muzakkiMunfiqList.forEach(row => {
      sum += row.total || 0;
    });
    return sum;
  }, [muzakkiMunfiqList]);

  // Group calculations helper
  const calculateGroupTotals = (items: any[]) => {
    let target = 0;
    let real = 0;
    const monthlySum: Record<string, number> = {
      jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
    };

    items.forEach(item => {
      target += Number(item.nilai_anggaran) || 0;
      real += Number(item.realisasi_total) || 0;
      months.forEach(m => {
        monthlySum[m.key] += Number(item[m.key]) || 0;
      });
    });

    return { target, real, monthlySum };
  };

  // Group calculations for Muzakki/Munfiq sections
  const groupedMuzakkiData = useMemo(() => {
    const groups: Record<string, { title: string; items: any[] }> = {
      individu: { title: 'Muzakki Individu', items: [] },
      badan: { title: 'Muzakki Badan', items: [] }
    };

    muzakkiMunfiqList.forEach(item => {
      if (item.section === 'Muzakki Individu') {
        groups.individu.items.push(item);
      } else {
        groups.badan.items.push(item);
      }
    });

    return Object.entries(groups).map(([key, val]) => ({
      key,
      ...val
    }));
  }, [muzakkiMunfiqList]);

  // Muzakki / Munfiq Grand Totals
  const muzakkiGrandTotals = useMemo(() => {
    const monthlySum = Array(12).fill(0);
    let totalSum = 0;

    muzakkiMunfiqList.forEach(item => {
      totalSum += item.total || 0;
      if (Array.isArray(item.monthly)) {
        item.monthly.forEach((val: number, idx: number) => {
          monthlySum[idx] += val || 0;
        });
      }
    });

    return { monthlySum, totalSum };
  }, [muzakkiMunfiqList]);

  // Group Penyaluran RKAT data
  const groupedPenyaluranRkatData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = rkatPenyaluranList.filter(item => 
      (item.label || '').toLowerCase().includes(query) ||
      (item.code || '').toLowerCase().includes(query)
    );

    const groups: Record<string, { title: string; items: any[] }> = {
      zakat_ashnaf: { title: 'Penyaluran Berdasarkan Ashnaf - Dana Zakat', items: [] },
      zakat_fitrah: { title: 'Penyaluran Berdasarkan Ashnaf - Zakat Fitrah', items: [] },
      dana_infaq: { title: 'Penyaluran Dana Infaq', items: [] },
      qurban_ekor: { title: 'Penyaluran Dana Qurban (Ekor)', items: [] },
      bidang_program: { title: 'Penyaluran Berdasarkan Bidang Program', items: [] },
      dana_operasional: { title: 'Penyaluran Dana Operasional', items: [] },
      dana_titipan: { title: 'Penyaluran Dana Titipan', items: [] },
      penggunaan_apbd: { title: 'Penggunaan APBD untuk Operasional', items: [] },
      hak_keuangan_pimpinan: { title: 'Hak Keuangan Pimpinan BAZNAS', items: [] }
    };

    filtered.forEach(item => {
      if (groups[item.section]) {
        groups[item.section].items.push(item);
      }
    });

    return Object.entries(groups).map(([key, group]) => ({
      key,
      ...group
    }));
  }, [rkatPenyaluranList, searchQuery]);

  // Penyaluran RKAT totals
  const penyaluranTotals = useMemo(() => {
    let target = 0;
    let real = 0;
    const monthlySum: Record<string, number> = {
      jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
    };

    rkatPenyaluranList.forEach(item => {
      const primarySections = ['zakat_ashnaf', 'zakat_fitrah', 'dana_infaq', 'dana_operasional', 'penggunaan_apbd', 'hak_keuangan_pimpinan'];
      if (primarySections.includes(item.section)) {
        target += Number(item.nilai_anggaran) || 0;
        real += Number(item.realisasi_total) || 0;
        months.forEach(m => {
          monthlySum[m.key] += Number(item[m.key]) || 0;
        });
      }
    });

    return { target, real, monthlySum };
  }, [rkatPenyaluranList]);

  // Group Mustahik Growth data
  const groupedMustahikData = useMemo(() => {
    const groups: Record<string, { title: string; items: any[] }> = {
      mustahik_program: { title: 'Bantuan Bidang Program Per Orang', items: [] },
      ikk_penyaluran: { title: 'IKK Penyaluran', items: [] }
    };

    mustahikGrowthList.forEach(item => {
      if (groups[item.section]) {
        groups[item.section].items.push(item);
      }
    });

    return Object.entries(groups).map(([key, val]) => ({
      key,
      ...val
    }));
  }, [mustahikGrowthList]);

  // Mustahik Grand Totals
  const mustahikGrandTotals = useMemo(() => {
    const monthlySum = Array(12).fill(0);
    let totalSum = 0;

    mustahikGrowthList.forEach(item => {
      if (item.section === 'mustahik_program') {
        totalSum += item.total || 0;
        if (Array.isArray(item.monthly)) {
          item.monthly.forEach((val: number, idx: number) => {
            monthlySum[idx] += val || 0;
          });
        }
      }
    });

    return { monthlySum, totalSum };
  }, [mustahikGrowthList]);

  // Export to Excel Function
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (activeTab === 'pengumpulan') {
        // --- Sheet 1: Realisasi RKAT Pengumpulan ---
        const rkatRows: any[] = [];
        
        // Headers
        rkatRows.push([`LAPORAN KINERJA REALISASI RKAT PENGUMPULAN - TAHUN ${selectedYear}`]);
        rkatRows.push([]);
        rkatRows.push([
          'Kode', 'Keterangan / Program', 'Target RKAT', 'Realisasi Total', 'Persentase',
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]);

        // Grouped Data
        groupedRkatData.forEach(group => {
          rkatRows.push([group.title.toUpperCase()]);
          
          group.items.forEach(item => {
            rkatRows.push([
              item.no || '',
              item.nama_program || '',
              Number(item.nilai_anggaran) || 0,
              Number(item.realisasi_total) || 0,
              formatPercent(Number(item.realisasi_total), Number(item.nilai_anggaran)),
              Number(item.jan) || 0, Number(item.feb) || 0, Number(item.mar) || 0, Number(item.apr) || 0,
              Number(item.mei) || 0, Number(item.jun) || 0, Number(item.jul) || 0, Number(item.agt) || 0,
              Number(item.sep) || 0, Number(item.okt) || 0, Number(item.nov) || 0, Number(item.des) || 0
            ]);
          });

          // Group totals
          const gt = calculateGroupTotals(group.items);
          rkatRows.push([
            '',
            `SUBTOTAL ${group.title}`,
            gt.target,
            gt.real,
            formatPercent(gt.real, gt.target),
            gt.monthlySum.jan, gt.monthlySum.feb, gt.monthlySum.mar, gt.monthlySum.apr,
            gt.monthlySum.mei, gt.monthlySum.jun, gt.monthlySum.jul, gt.monthlySum.agt,
            gt.monthlySum.sep, gt.monthlySum.okt, gt.monthlySum.nov, gt.monthlySum.des
          ]);
          rkatRows.push([]);
        });

        // Grand totals
        rkatRows.push([
          'TOTAL',
          'TOTAL PENGUMPULAN',
          totals.target,
          totals.real,
          formatPercent(totals.real, totals.target),
          totals.monthlySum.jan, totals.monthlySum.feb, totals.monthlySum.mar, totals.monthlySum.apr,
          totals.monthlySum.mei, totals.monthlySum.jun, totals.monthlySum.jul, totals.monthlySum.agt,
          totals.monthlySum.sep, totals.monthlySum.okt, totals.monthlySum.nov, totals.monthlySum.des
        ]);

        const wsRkat = XLSX.utils.aoa_to_sheet(rkatRows);
        XLSX.utils.book_append_sheet(wb, wsRkat, "RKAT_Pengumpulan");


        // --- Sheet 2: Laporan Muzakki / Munfiq ---
        const mmRows: any[] = [];
        mmRows.push([`LAPORAN KINERJA JUMLAH MUZAKKI & MUNFIQ - TAHUN ${selectedYear}`]);
        mmRows.push([]);
        mmRows.push([
          'Kode', 'Keterangan', 'Jumlah',
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]);

        groupedMuzakkiData.forEach(group => {
          mmRows.push([group.title.toUpperCase()]);
          
          group.items.forEach(item => {
            mmRows.push([
              item.code || '',
              item.label || '',
              item.total || 0,
              ...(item.monthly || Array(12).fill(0))
            ]);
          });
          mmRows.push([]);
        });

        // Grand totals for Muzakki/Munfiq
        mmRows.push([
          '',
          'TOTAL DONATUR',
          muzakkiGrandTotals.totalSum,
          ...muzakkiGrandTotals.monthlySum
        ]);

        const wsMm = XLSX.utils.aoa_to_sheet(mmRows);
        XLSX.utils.book_append_sheet(wb, wsMm, "Muzakki_Munfiq");

        // Save file
        XLSX.writeFile(wb, `Laporan_Kinerja_Pengumpulan_${selectedYear}.xlsx`);
      } else {
        // --- Sheet 1: Realisasi RKAT Penyaluran ---
        const rkatRows: any[] = [];
        
        // Headers
        rkatRows.push([`LAPORAN KINERJA REALISASI RKAT PENYALURAN - TAHUN ${selectedYear}`]);
        rkatRows.push([]);
        rkatRows.push([
          'Kode', 'Keterangan / Program', 'Target RKAT', 'Realisasi Total', 'Persentase',
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]);

        // Grouped Data
        groupedPenyaluranRkatData.forEach(group => {
          rkatRows.push([group.title.toUpperCase()]);
          
          group.items.forEach(item => {
            rkatRows.push([
              item.code || '',
              item.label || '',
              Number(item.nilai_anggaran) || 0,
              Number(item.realisasi_total) || 0,
              formatPercent(Number(item.realisasi_total), Number(item.nilai_anggaran)),
              Number(item.jan) || 0, Number(item.feb) || 0, Number(item.mar) || 0, Number(item.apr) || 0,
              Number(item.mei) || 0, Number(item.jun) || 0, Number(item.jul) || 0, Number(item.agt) || 0,
              Number(item.sep) || 0, Number(item.okt) || 0, Number(item.nov) || 0, Number(item.des) || 0
            ]);
          });

          // Group totals
          const gt = calculateGroupTotals(group.items);
          rkatRows.push([
            '',
            `SUBTOTAL ${group.title}`,
            gt.target,
            gt.real,
            formatPercent(gt.real, gt.target),
            gt.monthlySum.jan, gt.monthlySum.feb, gt.monthlySum.mar, gt.monthlySum.apr,
            gt.monthlySum.mei, gt.monthlySum.jun, gt.monthlySum.jul, gt.monthlySum.agt,
            gt.monthlySum.sep, gt.monthlySum.okt, gt.monthlySum.nov, gt.monthlySum.des
          ]);
          rkatRows.push([]);
        });

        // Grand totals
        rkatRows.push([
          'TOTAL',
          'TOTAL PENYALURAN',
          penyaluranTotals.target,
          penyaluranTotals.real,
          formatPercent(penyaluranTotals.real, penyaluranTotals.target),
          penyaluranTotals.monthlySum.jan, penyaluranTotals.monthlySum.feb, penyaluranTotals.monthlySum.mar, penyaluranTotals.monthlySum.apr,
          penyaluranTotals.monthlySum.mei, penyaluranTotals.monthlySum.jun, penyaluranTotals.monthlySum.jul, penyaluranTotals.monthlySum.agt,
          penyaluranTotals.monthlySum.sep, penyaluranTotals.monthlySum.okt, penyaluranTotals.monthlySum.nov, penyaluranTotals.monthlySum.des
        ]);

        const wsRkat = XLSX.utils.aoa_to_sheet(rkatRows);
        XLSX.utils.book_append_sheet(wb, wsRkat, "RKAT_Penyaluran");


        // --- Sheet 2: Laporan Pertumbuhan Mustahik ---
        const mustahikRows: any[] = [];
        mustahikRows.push([`LAPORAN KINERJA JUMLAH PERTUMBUHAN MUSTAHIK - TAHUN ${selectedYear}`]);
        mustahikRows.push([]);
        mustahikRows.push([
          'Kode', 'Keterangan', 'Jumlah',
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]);

        groupedMustahikData.forEach(group => {
          mustahikRows.push([group.title.toUpperCase()]);
          
          group.items.forEach(item => {
            mustahikRows.push([
              item.code || '',
              item.label || '',
              item.total || 0,
              ...(item.monthly || Array(12).fill(0))
            ]);
          });
          mustahikRows.push([]);
        });

        // Grand totals for Mustahik
        mustahikRows.push([
          '',
          'TOTAL MUSTAHIK',
          mustahikGrandTotals.totalSum,
          ...mustahikGrandTotals.monthlySum
        ]);

        const wsMustahik = XLSX.utils.aoa_to_sheet(mustahikRows);
        XLSX.utils.book_append_sheet(wb, wsMustahik, "Mustahik_Growth");

        // Save file
        XLSX.writeFile(wb, `Laporan_Kinerja_Penyaluran_${selectedYear}.xlsx`);
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor data ke Excel.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 h-full overflow-y-auto w-full custom-scrollbar">
      
      {/* Top Breadcrumb & Page title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Laporan Kinerja</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LineChart className="size-8 text-primary" />
            Laporan Kinerja
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Monitor realisasi RKAT dan pertumbuhan jumlah donatur Muzakki & Munfiq secara dinamis.
          </p>
        </div>

        {/* Filters and export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year select */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="size-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>

          {/* Unduh Excel Button */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all"
            title="Download Laporan Format Excel"
          >
            <Download className="size-4" />
            Unduh Excel
          </button>

          {/* Settings Button (Only for Super Admin) */}
          {user?.role === 'Super_Admin' && (
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all"
              title="Pengaturan Hubungan COA Laporan Kinerja"
            >
              <Settings2 className="size-4" />
              Mapping COA
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pengumpulan')}
          className={cn(
            "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'pengumpulan' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Bidang Pengumpulan
        </button>
        <button
          onClick={() => setActiveTab('penyaluran')}
          className={cn(
            "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'penyaluran' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Bidang Penyaluran
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pengumpulan' ? (
          <motion.div
            key="pengumpulan-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Quick KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Target */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target RKAT Pengumpulan</span>
                  <span className="text-lg font-black text-slate-900 block">{formatCurrency(totals.target)}</span>
                </div>
                <div className="size-11 bg-primary/5 rounded-xl flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="size-5" />
                </div>
              </div>

              {/* Card 2: Total Realisasi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Realisasi Pengumpulan</span>
                  <span className="text-lg font-black text-slate-900 block">{formatCurrency(totals.real)}</span>
                </div>
                <div className="size-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="size-5" />
                </div>
              </div>

              {/* Card 3: Capaian Percentage */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1 w-full">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Persentase Capaian</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{formatPercent(totals.real, totals.target)}</span>
                    <span className="text-[10px] text-slate-400 font-bold">dari target</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(formatPercentNumber(totals.real, totals.target), 100)}%` }} 
                    />
                  </div>
                </div>
                <div className="size-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform ml-2">
                  <Percent className="size-5" />
                </div>
              </div>

              {/* Card 4: Muzakki / Munfiq count */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Muzakki & Munfiq</span>
                  <span className="text-lg font-black text-slate-900 block">{formatNumber(totalMuzakkiMunfiqCount)} Donatur</span>
                </div>
                <div className="size-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="size-5" />
                </div>
              </div>
            </div>

            {/* Section 1: Realisasi Target RKAT Pengumpulan Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="size-4.5 text-primary" />
                    Laporan Realisasi Target RKAT Pengumpulan
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Bandingkan pagu anggaran RKAT dengan penerimaan kas yang masuk ke rekening BAZNAS per program.
                  </p>
                </div>

                {/* Table Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari program pengumpulan..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 italic">Memuat data laporan...</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3.5 shrink-0 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Kode</th>
                        <th className="px-4 py-3.5 min-w-[240px] sticky left-[64px] bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Keterangan / Program</th>
                        <th className="px-4 py-3.5 text-right bg-slate-100/50">RKAT</th>
                        <th className="px-4 py-3.5 text-right bg-emerald-50/30">Realisasi</th>
                        <th className="px-4 py-3.5 text-right bg-amber-50/30">Prosentase</th>
                        {months.map(m => (
                          <th key={m.key} className="px-4 py-3.5 text-right font-mono">{m.label.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {groupedRkatData.map((group) => {
                        if (group.items.length === 0 && searchQuery) return null;

                        const grpTotals = calculateGroupTotals(group.items);

                        return (
                          <React.Fragment key={group.key}>
                            {/* Group Header Row */}
                            <tr className="bg-slate-50/50">
                              <td colSpan={17} className="px-4 py-2.5 font-black text-slate-900 uppercase tracking-widest text-[9px] bg-slate-50/60 sticky left-0 z-0">
                                {group.title}
                              </td>
                            </tr>

                            {/* Data Rows */}
                            {group.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-400 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.no}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800 sticky left-[64px] bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] truncate max-w-[260px]">
                                  {item.nama_program}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-600 bg-slate-100/20">
                                  {formatCurrency(item.nilai_anggaran)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                                  {formatCurrency(item.realisasi_total)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 bg-amber-50/10">
                                  {formatPercent(Number(item.realisasi_total), Number(item.nilai_anggaran))}
                                </td>
                                {months.map(m => (
                                  <td key={m.key} className="px-4 py-3 text-right font-mono text-slate-500">
                                    {Number(item[m.key]) > 0 ? formatCurrency(item[m.key]) : 'Rp0'}
                                  </td>
                                ))}
                              </tr>
                            ))}

                            {/* Group Sub-Total Row */}
                            <tr className="bg-slate-50/40 font-bold border-t border-slate-200">
                              <td className="px-4 py-3 sticky left-0 bg-slate-50/60 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]"></td>
                              <td className="px-4 py-3 text-slate-700 uppercase tracking-wider text-[10px] sticky left-[64px] bg-slate-50/60 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                SUBTOTAL {group.title}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 bg-slate-100/50">
                                {formatCurrency(grpTotals.target)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-800 bg-emerald-50/20">
                                {formatCurrency(grpTotals.real)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-800 bg-amber-50/20">
                                {formatPercent(grpTotals.real, grpTotals.target)}
                              </td>
                              {months.map(m => (
                                <td key={m.key} className="px-4 py-3 text-right font-mono text-slate-700 bg-slate-50/30">
                                  {formatCurrency(grpTotals.monthlySum[m.key])}
                                </td>
                              ))}
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                        <td className="px-4 py-4 sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]"></td>
                        <td className="px-4 py-4 text-slate-900 uppercase tracking-widest text-[10px] sticky left-[64px] bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]">
                          TOTAL PENGUMPULAN
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-slate-950 bg-slate-200/50">
                          {formatCurrency(totals.target)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-emerald-900 bg-emerald-100/30">
                          {formatCurrency(totals.real)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-slate-900 bg-amber-100/30">
                          {formatPercent(totals.real, totals.target)}
                        </td>
                        {months.map(m => (
                          <td key={m.key} className="px-4 py-4 text-right font-mono text-slate-900 bg-slate-200/30">
                            {formatCurrency(totals.monthlySum[m.key])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Muzakki / Munfiq Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="size-4.5 text-primary" />
                  Laporan Jumlah Pertumbuhan Muzakki & Munfiq
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Jumlah muzakki (zakat) dan munfiq (infak/sedekah) perorangan dan lembaga yang aktif menyetor setiap bulannya.
                </p>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 italic">Memuat data donatur...</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3.5 shrink-0 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Kode</th>
                        <th className="px-4 py-3.5 min-w-[240px] sticky left-[64px] bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Keterangan</th>
                        <th className="px-4 py-3.5 text-right bg-slate-100/50">Jumlah</th>
                        {months.map(m => (
                          <th key={m.key} className="px-4 py-3.5 text-right font-mono">{m.label.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {groupedMuzakkiData.map((group) => {
                        if (group.items.length === 0 && searchQuery) return null;

                        return (
                          <React.Fragment key={group.key}>
                            {/* Group Header Row */}
                            <tr className="bg-slate-50/50">
                              <td colSpan={15} className="px-4 py-2.5 font-black text-slate-900 uppercase tracking-widest text-[9px] bg-slate-50/60 sticky left-0 z-0">
                                {group.title}
                              </td>
                            </tr>

                            {/* Data Rows */}
                            {group.items.map((item) => (
                              <tr key={item.key} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-400 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.code}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800 sticky left-[64px] bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.label}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-primary bg-slate-100/30">
                                  {formatNumber(item.total)}
                                </td>
                                {item.monthly && item.monthly.map((val: number, idx: number) => (
                                  <td key={idx} className="px-4 py-3 text-right font-mono text-slate-600">
                                    {val > 0 ? formatNumber(val) : '0'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                        <td className="px-4 py-4 sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]"></td>
                        <td className="px-4 py-4 text-slate-900 uppercase tracking-widest text-[10px] sticky left-[64px] bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]">
                          TOTAL DONATUR
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-primary bg-slate-200/50">
                          {formatNumber(muzakkiGrandTotals.totalSum)}
                        </td>
                        {muzakkiGrandTotals.monthlySum.map((val: number, idx: number) => (
                          <td key={idx} className="px-4 py-4 text-right font-mono text-slate-900 bg-slate-200/30">
                            {formatNumber(val)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="penyaluran-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Quick KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Target */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target RKAT Penyaluran</span>
                  <span className="text-lg font-black text-slate-900 block">{formatCurrency(penyaluranTotals.target)}</span>
                </div>
                <div className="size-11 bg-primary/5 rounded-xl flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="size-5" />
                </div>
              </div>

              {/* Card 2: Total Realisasi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Realisasi Penyaluran</span>
                  <span className="text-lg font-black text-slate-900 block">{formatCurrency(penyaluranTotals.real)}</span>
                </div>
                <div className="size-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="size-5" />
                </div>
              </div>

              {/* Card 3: Capaian Percentage */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1 w-full">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Persentase Capaian</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{formatPercent(penyaluranTotals.real, penyaluranTotals.target)}</span>
                    <span className="text-[10px] text-slate-400 font-bold">dari target</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(formatPercentNumber(penyaluranTotals.real, penyaluranTotals.target), 100)}%` }} 
                    />
                  </div>
                </div>
                <div className="size-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform ml-2">
                  <Percent className="size-5" />
                </div>
              </div>

              {/* Card 4: Mustahik count */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Penerima Manfaat (Mustahik)</span>
                  <span className="text-lg font-black text-slate-900 block">{formatNumber(mustahikGrandTotals.totalSum)} Jiwa</span>
                </div>
                <div className="size-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="size-5" />
                </div>
              </div>
            </div>

            {/* Section 1: Realisasi Target RKAT Penyaluran Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="size-4.5 text-primary" />
                    Laporan Realisasi Target RKAT Penyaluran
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Bandingkan pagu anggaran RKAT Penyaluran dengan realisasi penyaluran dana zakat, infak, dan sedekah per program.
                  </p>
                </div>

                {/* Table Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari program penyaluran..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 italic">Memuat data laporan...</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3.5 shrink-0 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Kode</th>
                        <th className="px-4 py-3.5 min-w-[240px] sticky left-[64px] bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Keterangan / Program</th>
                        <th className="px-4 py-3.5 text-right bg-slate-100/50">RKAT</th>
                        <th className="px-4 py-3.5 text-right bg-emerald-50/30">Realisasi</th>
                        <th className="px-4 py-3.5 text-right bg-amber-50/30">Prosentase</th>
                        {months.map(m => (
                          <th key={m.key} className="px-4 py-3.5 text-right font-mono">{m.label.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {groupedPenyaluranRkatData.map((group) => {
                        if (group.items.length === 0 && searchQuery) return null;

                        const grpTotals = calculateGroupTotals(group.items);

                        return (
                          <React.Fragment key={group.key}>
                            {/* Group Header Row */}
                            <tr className="bg-slate-50/50">
                              <td colSpan={17} className="px-4 py-2.5 font-black text-slate-900 uppercase tracking-widest text-[9px] bg-slate-50/60 sticky left-0 z-0">
                                {group.title}
                              </td>
                            </tr>

                            {/* Data Rows */}
                            {group.items.map((item) => (
                              <tr key={item.code} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-400 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.code}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800 sticky left-[64px] bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] truncate max-w-[260px]">
                                  {item.label}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-600 bg-slate-100/20">
                                  {formatCurrency(item.nilai_anggaran)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                                  {formatCurrency(item.realisasi_total)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 bg-amber-50/10">
                                  {formatPercent(Number(item.realisasi_total), Number(item.nilai_anggaran))}
                                </td>
                                {months.map(m => (
                                  <td key={m.key} className="px-4 py-3 text-right font-mono text-slate-500">
                                    {Number(item[m.key]) > 0 ? formatCurrency(item[m.key]) : 'Rp0'}
                                  </td>
                                ))}
                              </tr>
                            ))}

                            {/* Group Sub-Total Row */}
                            <tr className="bg-slate-50/40 font-bold border-t border-slate-200">
                              <td className="px-4 py-3 sticky left-0 bg-slate-50/60 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]"></td>
                              <td className="px-4 py-3 text-slate-700 uppercase tracking-wider text-[10px] sticky left-[64px] bg-slate-50/60 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                SUBTOTAL {group.title}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 bg-slate-100/50">
                                {formatCurrency(grpTotals.target)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-800 bg-emerald-50/20">
                                {formatCurrency(grpTotals.real)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-800 bg-amber-50/20">
                                {formatPercent(grpTotals.real, grpTotals.target)}
                              </td>
                              {months.map(m => (
                                <td key={m.key} className="px-4 py-3 text-right font-mono text-slate-700 bg-slate-50/30">
                                  {formatCurrency(grpTotals.monthlySum[m.key])}
                                </td>
                              ))}
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                        <td className="px-4 py-4 sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]"></td>
                        <td className="px-4 py-4 text-slate-900 uppercase tracking-widest text-[10px] sticky left-[64px] bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]">
                          TOTAL PENYALURAN
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-slate-950 bg-slate-200/50">
                          {formatCurrency(penyaluranTotals.target)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-emerald-900 bg-emerald-100/30">
                          {formatCurrency(penyaluranTotals.real)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-slate-900 bg-amber-100/30">
                          {formatPercent(penyaluranTotals.real, penyaluranTotals.target)}
                        </td>
                        {months.map(m => (
                          <td key={m.key} className="px-4 py-4 text-right font-mono text-slate-900 bg-slate-200/30">
                            {formatCurrency(penyaluranTotals.monthlySum[m.key])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Mustahik Growth Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="size-4.5 text-primary" />
                  Laporan Jumlah Pertumbuhan Mustahik & Penerima Manfaat
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Jumlah mustahik dan penerima manfaat bantuan ZIS perorangan dan lembaga per bidang program dan Indikator Kinerja Kunci (IKK).
                </p>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 italic">Memuat data mustahik...</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3.5 shrink-0 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Kode</th>
                        <th className="px-4 py-3.5 min-w-[240px] sticky left-[64px] bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Keterangan</th>
                        <th className="px-4 py-3.5 text-right bg-slate-100/50">Jumlah</th>
                        {months.map(m => (
                          <th key={m.key} className="px-4 py-3.5 text-right font-mono">{m.label.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {groupedMustahikData.map((group) => {
                        if (group.items.length === 0 && searchQuery) return null;

                        return (
                          <React.Fragment key={group.key}>
                            {/* Group Header Row */}
                            <tr className="bg-slate-50/50">
                              <td colSpan={15} className="px-4 py-2.5 font-black text-slate-900 uppercase tracking-widest text-[9px] bg-slate-50/60 sticky left-0 z-0">
                                {group.title}
                              </td>
                            </tr>

                            {/* Data Rows */}
                            {group.items.map((item) => (
                              <tr key={item.code} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-400 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.code}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800 sticky left-[64px] bg-white z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                                  {item.label}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-primary bg-slate-100/30">
                                  {formatNumber(item.total)}
                                </td>
                                {item.monthly && item.monthly.map((val: number, idx: number) => (
                                  <td key={idx} className="px-4 py-3 text-right font-mono text-slate-600">
                                    {val > 0 ? formatNumber(val) : '0'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                        <td className="px-4 py-4 sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]"></td>
                        <td className="px-4 py-4 text-slate-900 uppercase tracking-widest text-[10px] sticky left-[64px] bg-slate-100 z-10 shadow-[1px_0_0_0_rgba(203,213,225,1)]">
                          TOTAL MUSTAHIK
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-primary bg-slate-200/50">
                          {formatNumber(mustahikGrandTotals.totalSum)}
                        </td>
                        {mustahikGrandTotals.monthlySum.map((val: number, idx: number) => (
                          <td key={idx} className="px-4 py-4 text-right font-mono text-slate-900 bg-slate-200/30">
                            {formatNumber(val)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings COA Mapping Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Settings2 className="size-5 text-primary" />
                    Pengaturan COA Laporan Kinerja
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    Hubungkan baris Laporan Kinerja dengan kode COA Akuntansi untuk perhitungan otomatis.
                  </p>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Subheader/Filters */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tab switcher inside settings */}
                <div className="flex bg-slate-200 p-0.5 rounded-lg w-fit">
                  <button
                    onClick={() => setMappingFilterTab('pengumpulan')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                      mappingFilterTab === 'pengumpulan' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Pengumpulan
                  </button>
                  <button
                    onClick={() => setMappingFilterTab('penyaluran')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                      mappingFilterTab === 'penyaluran' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Penyaluran
                  </button>
                </div>

                {/* Search field */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari label baris..."
                    value={searchMappingQuery}
                    onChange={(e) => setSearchMappingQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Modal Body / Table */}
              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Nama Baris / Label</th>
                      <th className="py-2.5 px-3 w-[60%]">Kode COA (Pisahkan dengan koma)</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings
                      .filter(m => m.tab === mappingFilterTab)
                      .filter(m => (m.row_label || '').toLowerCase().includes(searchMappingQuery.toLowerCase()))
                      .map((item) => {
                        const isEditing = editingMappingKey === item.row_key;
                        return (
                          <tr key={item.row_key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs font-medium text-slate-700">
                            <td className="py-3 px-3">
                              <span className="font-bold block text-slate-800">{item.row_label}</span>
                              <span className="font-mono text-[10px] text-slate-400">{item.row_key}</span>
                            </td>
                            <td className="py-3 px-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingCoaCodes}
                                  onChange={(e) => setEditingCoaCodes(e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50"
                                  placeholder="Contoh: 5110101, 5110102"
                                />
                              ) : (
                                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 block w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                  {item.coa_codes || 'Belum di-mapping (Kosong)'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveMapping(item.row_key)}
                                    disabled={saveLoading}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg hover:shadow-sm transition-all"
                                    title="Simpan"
                                  >
                                    <Save className="size-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
                                    title="Batal"
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                                  title="Edit Mapping COA"
                                >
                                  <Edit2 className="size-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Total Mappings: {mappings.filter(m => m.tab === mappingFilterTab).length} Baris</span>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
