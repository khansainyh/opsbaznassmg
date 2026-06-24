import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Search, 
  BookOpen, 
  TrendingUp,
  Activity,
  Calendar,
  Printer,
  ChevronDown,
  Check,
  X,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface COAItem {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana?: string;
  saldo_awal?: number;
}

export interface BankAccountItem {
  account_id: string;
  nama_akun: string;
  tipe_kas: 'TUNAI' | 'BANK';
  kelompok_dana: string;
  saldo: number;
}

export interface LedgerEntryItem {
  entry_id: string;
  transaksi_id: string;
  coa_code: string;
  debit: number;
  kredit: number;
  account_id?: string;
  coa: COAItem;
  account?: BankAccountItem;
  realisasi: {
    transaksi_id: string;
    proposal_id?: string;
    rkat_id?: string;
    tanggal: string;
    keterangan: string;
    createdAt?: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

const KAS_SETARA_KAS_CODES = [
  '11010101', '11010102', '11010103', '11010104', '11010105',
  '11010201', '11010202', '11010203', '11010204', '11010205',
  '11010206', '11010207', '11010208', '11010209', '11010210',
  '11010301', '11010302', '11010303', '11010304', '11010305',
  '11010501', '11010502', '11011501', '11011201'
];

export default function BukuBesar() {
  const [ledger, setLedger] = useState<LedgerEntryItem[]>([]);
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'jurnal' | 'rekap'>('jurnal');
  const [rekapFilterType, setRekapFilterType] = useState<'semua' | 'kas'>('semua');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [rekapSearchTerm, setRekapSearchTerm] = useState('');

  // Filter parameters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Selected COA Codes for filtering
  const [selectedCoas, setSelectedCoas] = useState<string[]>([]);
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);
  const [coaSearchTerm, setCoaSearchTerm] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to determine normal balance type
  const getNormalBalanceType = (coaCode: string, classification?: string) => {
    const firstChar = coaCode.trim()[0];
    const cls = classification?.toLowerCase() || '';
    
    if (
      firstChar === '1' || 
      firstChar === '5' || 
      firstChar === '6' || 
      cls.includes('aset') || 
      cls.includes('beban') || 
      cls.includes('biaya') || 
      cls.includes('pengeluaran')
    ) {
      return 'DEBIT';
    }
    return 'KREDIT';
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCoaDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Ledger & COAs on Mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLedger, resCoas, resHealth] = await Promise.all([
        axios.get('/api/finance/ledger'),
        axios.get('/api/finance/coa'),
        axios.get('/api/finance/ledger/health-check')
      ]);
      setLedger(resLedger.data);
      setCoas(resCoas.data);
      setHealthData(resHealth.data.health);
    } catch (e) {
      console.error('Gagal mengambil data buku besar:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle COA selection toggle
  const toggleCoaSelection = (code: string) => {
    setSelectedCoas(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code) 
        : [...prev, code]
    );
  };

  // Select all or clear COA selection
  const selectAllCoas = () => {
    setSelectedCoas(coas.map(c => c.coa_code));
  };

  const clearCoaSelection = () => {
    setSelectedCoas([]);
  };

  // Filtered COAs shown inside the dropdown search
  const filteredCoasForDropdown = useMemo(() => {
    return coas.filter(c => 
      c.coa_code.includes(coaSearchTerm) || 
      c.nama_akun.toLowerCase().includes(coaSearchTerm.toLowerCase())
    );
  }, [coas, coaSearchTerm]);

  // Main client-side filtered ledger entries based on dates, search, and COAs
  const filteredLedger = useMemo(() => {
    return ledger.filter(entry => {
      // 1. Date Range Filter
      const entryDate = entry.realisasi?.tanggal ? entry.realisasi.tanggal.split('T')[0] : '';
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;

      // 2. COA Filter
      if (selectedCoas.length > 0 && !selectedCoas.includes(entry.coa_code)) {
        return false;
      }

      // 3. Text Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        const matchesKeterangan = entry.realisasi?.keterangan?.toLowerCase().includes(search);
        const matchesCoaCode = entry.coa_code.includes(search);
        const matchesCoaName = entry.coa?.nama_akun?.toLowerCase().includes(search);
        const matchesAccountName = entry.account?.nama_akun?.toLowerCase().includes(search);
        return matchesKeterangan || matchesCoaCode || matchesCoaName || matchesAccountName;
      }

      return true;
    });
  }, [ledger, startDate, endDate, selectedCoas, searchTerm]);

  // Sorted ledger: Newest transaction date first.
  // Within the same transaction, show KREDIT entries before DEBIT entries.
  const sortedLedger = useMemo(() => {
    return [...filteredLedger].sort((a, b) => {
      // 1. Sort by date descending
      const dateA = new Date(a.realisasi?.tanggal || 0).getTime();
      const dateB = new Date(b.realisasi?.tanggal || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      
      // 2. If same date, sort by input time (createdAt) descending
      const createA = new Date(a.realisasi?.createdAt || a.realisasi?.tanggal || 0).getTime();
      const createB = new Date(b.realisasi?.createdAt || b.realisasi?.tanggal || 0).getTime();
      if (createB !== createA) {
        return createB - createA;
      }

      // 3. Group by transaction_id to keep entries of the same transaction together
      if (a.transaksi_id !== b.transaksi_id) {
        return b.transaksi_id.localeCompare(a.transaksi_id);
      }
      
      // 4. Within the same transaction, sort Kredit entries first (Number(kredit) > 0 before Number(debit) > 0)
      const isKreditA = Number(a.kredit) > 0 ? 1 : 0;
      const isKreditB = Number(b.kredit) > 0 ? 1 : 0;
      return isKreditB - isKreditA;
    });
  }, [filteredLedger]);

  // Compute total debit/kredit of filtered list
  const totalDebit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  }, [filteredLedger]);

  const totalKredit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.kredit || 0), 0);
  }, [filteredLedger]);

  // COA Summaries calculation for Rekapitulasi tab
  const coaSummaries = useMemo(() => {
    // 1. Group ledger entries by coa_code
    const ledgerByCoa: Record<string, { debit: number; kredit: number }> = {};
    filteredLedger.forEach(entry => {
      if (!ledgerByCoa[entry.coa_code]) {
        ledgerByCoa[entry.coa_code] = { debit: 0, kredit: 0 };
      }
      ledgerByCoa[entry.coa_code].debit += Number(entry.debit || 0);
      ledgerByCoa[entry.coa_code].kredit += Number(entry.kredit || 0);
    });

    // 2. Map over all COAs
    const summaries = coas.map(coa => {
      const entrySum = ledgerByCoa[coa.coa_code] || { debit: 0, kredit: 0 };
      const normalType = getNormalBalanceType(coa.coa_code, coa.klasifikasi);
      const saldoAwal = Number(coa.saldo_awal || 0);
      
      let saldo = 0;
      if (normalType === 'DEBIT') {
        saldo = saldoAwal + entrySum.debit - entrySum.kredit;
      } else {
        saldo = saldoAwal + entrySum.kredit - entrySum.debit;
      }

      return {
        ...coa,
        saldo_awal: saldoAwal,
        debit: entrySum.debit,
        kredit: entrySum.kredit,
        saldo,
        normalType
      };
    });

    // 3. Filter by search term
    let result = summaries;
    if (rekapSearchTerm.trim()) {
      const search = rekapSearchTerm.toLowerCase();
      result = result.filter(s => 
        s.coa_code.includes(search) || 
        s.nama_akun.toLowerCase().includes(search) ||
        (s.klasifikasi && s.klasifikasi.toLowerCase().includes(search))
      );
    }

    // Filter by Kas & Setara Kas if active
    if (rekapFilterType === 'kas') {
      result = result.filter(s => KAS_SETARA_KAS_CODES.includes(s.coa_code));
    }

    // 4. Filter by zero balance toggle
    if (!showZeroBalances) {
      result = result.filter(s => s.saldo_awal !== 0 || s.debit > 0 || s.kredit > 0 || s.saldo !== 0);
    }

    return result;
  }, [coas, filteredLedger, showZeroBalances, rekapSearchTerm, rekapFilterType]);

  // Compute Trial Balance Totals (for checking standard identity debit == kredit)
  const trialBalanceTotals = useMemo(() => {
    let totalDebitBalance = 0;
    let totalKreditBalance = 0;

    coaSummaries.forEach(s => {
      if (s.normalType === 'DEBIT') {
        if (s.saldo >= 0) {
          totalDebitBalance += s.saldo;
        } else {
          totalKreditBalance += Math.abs(s.saldo);
        }
      } else {
        if (s.saldo >= 0) {
          totalKreditBalance += s.saldo;
        } else {
          totalDebitBalance += Math.abs(s.saldo);
        }
      }
    });

    return {
      debit: totalDebitBalance,
      kredit: totalKreditBalance,
      balanced: Math.abs(totalDebitBalance - totalKreditBalance) < 0.01
    };
  }, [coaSummaries]);

  // Compute Kas & Setara Kas metrics (Awal, Mutasi, Akhir)
  const kasSetaraKasTotals = useMemo(() => {
    let totalAwal = 0;
    let totalMutasi = 0;

    // Group ledger entries by coa_code
    const ledgerByCoa: Record<string, { debit: number; kredit: number }> = {};
    filteredLedger.forEach(entry => {
      if (!ledgerByCoa[entry.coa_code]) {
        ledgerByCoa[entry.coa_code] = { debit: 0, kredit: 0 };
      }
      ledgerByCoa[entry.coa_code].debit += Number(entry.debit || 0);
      ledgerByCoa[entry.coa_code].kredit += Number(entry.kredit || 0);
    });

    KAS_SETARA_KAS_CODES.forEach(code => {
      const coaInfo = coas.find(c => c.coa_code === code);
      const saldoAwal = Number(coaInfo?.saldo_awal || 0);
      totalAwal += saldoAwal;

      const entrySum = ledgerByCoa[code] || { debit: 0, kredit: 0 };
      totalMutasi += (entrySum.debit - entrySum.kredit);
    });

    return {
      awal: totalAwal,
      mutasi: totalMutasi,
      akhir: totalAwal + totalMutasi
    };
  }, [coas, filteredLedger]);

  // Handle printing as PDF using browser built-in print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50 print:bg-white print:p-0 print:overflow-visible">
      
      {/* Custom Print CSS Styles injected dynamically */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, nav, header, button, .no-print, input, select {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .shadow-sm, .rounded-3xl, .rounded-2xl {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px !important;
            font-size: 10px !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
        .print-header {
          display: none;
        }
      `}} />

      {/* Print-Only Header Block */}
      <div className="print-header space-y-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-950 uppercase tracking-wide">
              BAZNAS KOTA SEMARANG
            </h1>
            <p className="text-xs text-slate-500 font-bold">
              {activeTab === 'jurnal' 
                ? 'Laporan Jurnal Buku Besar (General Ledger)' 
                : rekapFilterType === 'kas'
                  ? 'Laporan Rekapitulasi Kas & Setara Kas'
                  : 'Laporan Rekapitulasi Saldo Chart of Accounts (COA)'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
            <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
            <p>Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : '-'} s/d {endDate ? new Date(endDate).toLocaleDateString('id-ID') : '-'}</p>
          </div>
        </div>
        <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
          <strong>Filter Akun:</strong> {selectedCoas.length === 0 ? 'Semua Akun Buku Besar' : selectedCoas.join(', ')}
        </div>
      </div>

      {/* Page Header (No-Print) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-100 pb-5 no-print"
      >
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Jurnal Buku Besar</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpen className="size-8 text-primary shrink-0" />
            Jurnal Buku Besar
          </h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Tinjau seluruh pencatatan transaksi kas masuk, keluar, dan mutasi internal BAZNAS Kota Semarang secara real-time.
          </p>
        </div>
      </motion.div>

      {/* Balancing & Health Check Banner (No-Print) */}
      {healthData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-5 rounded-2xl border no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm",
            healthData.isSystemHealthy 
              ? "bg-emerald-50/40 border-emerald-100 text-emerald-950" 
              : "bg-amber-50/40 border-amber-105 text-amber-950"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              healthData.isSystemHealthy ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
            )}>
              <HeartPulse className="size-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">
                Kesehatan Balancing Sistem: {healthData.isSystemHealthy ? "Prima & Seimbang" : "Butuh Penyelarasan"}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {healthData.isSystemHealthy 
                  ? "Seluruh jurnal pencatatan umum seimbang sempurna (Total Debit = Total Kredit) dan saldo kas log sinkron."
                  : `Ditemukan ${healthData.unbalancedTransactions.length} transaksi tidak seimbang atau ketidaksesuaian saldo akun kas.`}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setShowDiagnosticsModal(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider shrink-0 shadow-sm hover:scale-102 active:scale-98",
              healthData.isSystemHealthy 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            <Activity className="size-4" />
            Buka Diagnostik Jurnal
          </button>
        </motion.div>
      )}

      {/* Tab Switcher (No-Print) */}
      <div className="flex border-b border-slate-200 no-print gap-1">
        <button
          onClick={() => setActiveTab('jurnal')}
          className={cn(
            "px-6 py-3 text-xs font-black transition-all border-b-2 uppercase tracking-wider",
            activeTab === 'jurnal' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          Jurnal Transaksi
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          className={cn(
            "px-6 py-3 text-xs font-black transition-all border-b-2 uppercase tracking-wider",
            activeTab === 'rekap' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          Rekapitulasi Saldo COA
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'jurnal' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Debit Jurnal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalDebit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6 rotate-90" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Kredit Jurnal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalKredit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 no-print">
                <Activity className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah Baris Transaksi</span>
                <p className="text-lg font-black text-slate-800">{filteredLedger.length} Baris Jurnal</p>
              </div>
            </motion.div>
          </>
        ) : rekapFilterType === 'kas' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Kas Awal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(kasSetaraKasTotals.awal)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className={cn(
                "size-12 rounded-xl flex items-center justify-center shrink-0 no-print",
                kasSetaraKasTotals.mutasi >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                <Activity className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Mutasi Kas</span>
                <p className={cn(
                  "text-lg font-black",
                  kasSetaraKasTotals.mutasi >= 0 ? "text-emerald-700" : "text-rose-700"
                )}>
                  {kasSetaraKasTotals.mutasi >= 0 ? '+' : ''}{formatCurrency(kasSetaraKasTotals.mutasi)}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Kas Akhir</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(kasSetaraKasTotals.akhir)}</p>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Saldo Debit</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(trialBalanceTotals.debit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6 rotate-90" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Saldo Kredit</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(trialBalanceTotals.kredit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className={cn(
                "size-12 rounded-xl flex items-center justify-center shrink-0 no-print",
                trialBalanceTotals.balanced 
                  ? "bg-emerald-500/10 text-emerald-600" 
                  : "bg-rose-500/10 text-rose-600"
              )}>
                {trialBalanceTotals.balanced ? (
                  <Check className="size-6 text-emerald-600" />
                ) : (
                  <X className="size-6 text-rose-600" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Keseimbangan</span>
                <p className={cn(
                  "text-base font-black",
                  trialBalanceTotals.balanced ? "text-emerald-600" : "text-rose-600"
                )}>
                  {trialBalanceTotals.balanced ? 'Seimbang (Balanced)' : 'Belum Seimbang'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Filter and Ledger Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:border-0"
      >
        
        {/* TAB 1: JURNAL TRANSAKSI - Filters Panel (No-Print) */}
        {activeTab === 'jurnal' && (
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4 no-print">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Search Input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pencarian Transaksi</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari keterangan, kode COA, atau kas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Start */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Mulai
                </label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Selesai
                </label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              
              {/* Multi-Select COA Dropdown */}
              <div className="space-y-1.5 md:col-span-3" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filter Berdasarkan Akun (COA)</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCoaDropdownOpen(!isCoaDropdownOpen)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-all text-slate-700"
                  >
                    <span className="truncate pr-4">
                      {selectedCoas.length === 0 
                        ? "Menampilkan Semua Akun COA" 
                        : `Terpilih ${selectedCoas.length} Akun COA (${selectedCoas.slice(0, 3).join(', ')}${selectedCoas.length > 3 ? '...' : ''})`
                      }
                    </span>
                    <ChevronDown className="size-4 text-slate-400 shrink-0" />
                  </button>

                  <AnimatePresence>
                    {isCoaDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                          <input
                             type="text"
                            placeholder="Cari COA..."
                            value={coaSearchTerm}
                            onChange={(e) => setCoaSearchTerm(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllCoas}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider"
                            >
                              Semua
                            </button>
                            <span className="text-slate-355">|</span>
                            <button
                              type="button"
                              onClick={clearCoaSelection}
                              className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-wider"
                            >
                              Bersih
                            </button>
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                          {filteredCoasForDropdown.length === 0 ? (
                            <p className="p-4 text-xs font-semibold text-slate-400 italic text-center">Akun tidak ditemukan</p>
                          ) : (
                            filteredCoasForDropdown.map((coa) => {
                              const isSelected = selectedCoas.includes(coa.coa_code);
                              return (
                                <div
                                  key={coa.coa_code}
                                  onClick={() => toggleCoaSelection(coa.coa_code)}
                                  className={cn(
                                    "px-4 py-2.5 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 font-bold transition-all",
                                    isSelected ? "bg-primary/5 text-primary" : "text-slate-700"
                                  )}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-mono">{coa.coa_code}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{coa.nama_akun}</span>
                                  </div>
                                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Cetak PDF Button */}
              <div className="space-y-1.5 self-end">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-black transition-all active:scale-95 uppercase tracking-wider shadow-lg shadow-primary/10"
                >
                  <Printer className="size-4" />
                  Cetak PDF
                </button>
              </div>

              {/* Refresh Button */}
              <div className="space-y-1.5 self-end">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-60"
                >
                  {loading ? 'Me-refresh...' : 'Refresh Jurnal'}
                </button>
              </div>

            </div>

            {/* Active COA Badges */}
            {selectedCoas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Filter Aktif:</span>
                {selectedCoas.map(code => {
                  const matchingCoa = coas.find(c => c.coa_code === code);
                  return (
                    <span 
                      key={code} 
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    >
                      <span>{code} {matchingCoa ? `(${matchingCoa.nama_akun})` : ''}</span>
                      <button 
                        type="button" 
                        onClick={() => toggleCoaSelection(code)}
                        className="hover:text-rose-600 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: REKAPITULASI COA - Filters Panel (No-Print) */}
        {activeTab === 'rekap' && (
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4 no-print">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Search Input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cari Akun COA</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari kode COA, nama akun, klasifikasi..."
                    value={rekapSearchTerm}
                    onChange={(e) => setRekapSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Start */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Mulai
                </label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Selesai
                </label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              
              <div className="flex flex-wrap items-center gap-6">
                {/* Sub-Tab Selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRekapFilterType('semua')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                      rekapFilterType === 'semua'
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Semua COA
                  </button>
                  <button
                    type="button"
                    onClick={() => setRekapFilterType('kas')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                      rekapFilterType === 'kas'
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Kas & Setara Kas
                  </button>
                </div>

                {/* Zero Balances Toggle */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="showZeroBalances"
                    checked={showZeroBalances}
                    onChange={(e) => setShowZeroBalances(e.target.checked)}
                    className="rounded text-primary focus:ring-primary size-4"
                  />
                  <label htmlFor="showZeroBalances" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                    Tampilkan Akun Bersaldo Nol
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Cetak PDF Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-black transition-all active:scale-95 uppercase tracking-wider shadow-lg shadow-primary/10"
                >
                  <Printer className="size-4" />
                  Cetak PDF Rekap
                </button>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-60"
                >
                  {loading ? 'Me-refresh...' : 'Refresh'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: JURNAL TRANSAKSI - Table */}
        {activeTab === 'jurnal' && (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 print:bg-white print:border-b">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Tanggal Jurnal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Keterangan Jurnal (Realisasi)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Kode COA</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Nama Akun COA</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Debet (IDR)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Kredit (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Buku besar jurnal kosong / Tidak ditemukan</td>
                  </tr>
                ) : sortedLedger.map((item) => (
                  <tr key={item.entry_id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5 font-mono text-xs text-slate-650 font-bold print:text-black">
                      {new Date(item.realisasi.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-800 print:text-black">
                      {item.realisasi.keterangan}
                      {item.account && <span className="block text-[10px] text-slate-400 mt-1 font-semibold print:text-slate-500">Kas Fisik: {item.account.nama_akun}</span>}
                    </td>
                    <td className="px-6 py-5 font-mono text-xs text-slate-650 font-bold print:text-black">{item.coa_code}</td>
                    <td className="px-6 py-5 font-bold text-slate-800 print:text-black">{item.coa.nama_akun}</td>
                    <td className="px-6 py-5 text-right font-black text-emerald-700 print:text-black">
                      {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-blue-700 print:text-black">
                      {Number(item.kredit) > 0 ? formatCurrency(Number(item.kredit)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: REKAPITULASI COA - Table */}
        {activeTab === 'rekap' && (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 print:bg-white print:border-b">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Kode COA</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Nama Akun COA</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Klasifikasi</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Normal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Saldo Awal (IDR)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Total Debet (IDR)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Total Kredit (IDR)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:text-black">Saldo Akhir (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {coaSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic font-medium">Rekapitulasi COA kosong / Tidak ditemukan</td>
                  </tr>
                ) : (
                  <>
                    {coaSummaries.map((item) => (
                      <tr key={item.coa_code} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-slate-650 font-bold print:text-black">{item.coa_code}</td>
                        <td className="px-6 py-4 font-bold text-slate-800 print:text-black">{item.nama_akun}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 print:text-black">
                          {item.klasifikasi || '—'}
                        </td>
                        <td className="px-6 py-4 font-bold text-xs text-slate-400 print:text-black">
                          {item.normalType}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-600 print:text-black">
                          {item.saldo_awal !== 0 ? formatCurrency(item.saldo_awal) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-700 print:text-black">
                          {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-blue-700 print:text-black">
                          {item.kredit > 0 ? formatCurrency(item.kredit) : '—'}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-black print:text-black",
                          item.saldo >= 0 ? "text-slate-800" : "text-rose-700"
                        )}>
                          {formatCurrency(item.saldo)}
                          {item.saldo < 0 && <span className="text-[10px] font-bold block text-rose-500 print:hidden">Defisit / Kontra</span>}
                        </td>
                      </tr>
                    ))}
                    {/* Total Summary Row for Trial Balance */}
                    <tr className="bg-slate-50/70 font-black border-t-2 border-slate-200">
                      <td colSpan={4} className="px-6 py-5 text-slate-800 uppercase tracking-wider text-xs">
                        TOTAL SALDO REKAPITULASI COA
                      </td>
                      <td className="px-6 py-5 text-right text-slate-700 text-sm">
                        {formatCurrency(coaSummaries.reduce((sum, s) => sum + s.saldo_awal, 0))}
                      </td>
                      <td className="px-6 py-5 text-right text-emerald-800 text-sm">
                        {formatCurrency(coaSummaries.reduce((sum, s) => sum + s.debit, 0))}
                      </td>
                      <td className="px-6 py-5 text-right text-blue-800 text-sm">
                        {formatCurrency(coaSummaries.reduce((sum, s) => sum + s.kredit, 0))}
                      </td>
                      <td className="px-6 py-5 text-right text-slate-900 text-sm">
                        <div className="flex flex-col items-end">
                          <span>
                            {formatCurrency(trialBalanceTotals.debit)}
                          </span>
                          <span className={cn(
                            "text-[9px] uppercase tracking-wider font-bold mt-0.5",
                            trialBalanceTotals.balanced ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {trialBalanceTotals.balanced ? 'BALANCED' : 'UNBALANCED'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Diagnostics & Balancing Modal (No-Print) */}
      <AnimatePresence>
        {showDiagnosticsModal && healthData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center text-white shadow-md",
                    healthData.isSystemHealthy ? "bg-emerald-500" : "bg-amber-500"
                  )}>
                    <Activity className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">
                      Diagnostik & Penyelarasan Jurnal
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Pemeriksaan integritas double-entry ledger dan saldo kas secara real-time.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-55 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                
                {/* Audit Ringkasan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Debit Ledger</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(healthData.overall.totalDebit)}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Kredit Ledger</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(healthData.overall.totalKredit)}</span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-xl border",
                    healthData.overall.isBalanced ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"
                  )}>
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Selisih Keseimbangan</span>
                    <span className={cn(
                      "text-base font-black mt-1 block",
                      healthData.overall.isBalanced ? "text-emerald-700" : "text-rose-700"
                    )}>
                      {formatCurrency(healthData.overall.difference)}
                    </span>
                  </div>
                </div>

                {/* Section 1: Bank Ledger Cross-Reference */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Penyelarasan Saldo Kas & Bank dengan Buku Besar
                  </h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 font-bold text-slate-600">Nama Akun Kas/Bank</th>
                          <th className="px-4 py-3 font-bold text-slate-600">COA</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Awal</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Log Jurnal</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Akun</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-600">Status Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {healthData.bankChecks.map((check: any) => (
                          <tr key={check.account_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-750">{check.nama_akun}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 font-bold">{check.coa_code}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-600">{formatCurrency(check.saldo_awal)}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-750">{formatCurrency(check.calculatedBalance)}</td>
                            <td className="px-4 py-3 text-right font-black text-primary">{formatCurrency(check.currentSaldo)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                check.isMatch 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                  : "bg-rose-55 text-rose-700 border border-rose-100"
                              )}>
                                {check.isMatch ? (
                                  <>
                                    <Check className="size-3" /> MATCHING
                                  </>
                                ) : (
                                  <>
                                    <X className="size-3" /> SELISIH {formatCurrency(check.difference)}
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 pl-1">
                    <Info className="size-3.5 shrink-0" />
                    Catatan: Saldo Log Jurnal dihitung dari Saldo Awal Akun ditambah total Debit Jurnal dikurangi total Kredit Jurnal yang tercatat di Buku Besar.
                  </p>
                </div>

                {/* Section 2: Unbalanced Transactions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="size-4 text-amber-600" />
                    Pendeteksi Transaksi Pincang (Unbalanced)
                  </h4>
                  {healthData.unbalancedTransactions.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/20 text-center flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check className="size-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-emerald-900 uppercase tracking-wide">Semua Transaksi Seimbang Sempurna</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">Tidak ditemukan transaksi yang pincang di dalam Buku Besar.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-3 font-bold text-slate-600">Tanggal</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Keterangan Transaksi (ID Realisasi)</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Total Debit</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Total Kredit</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {healthData.unbalancedTransactions.map((tx: any) => (
                            <tr key={tx.transaksi_id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-500 font-mono font-bold">{new Date(tx.tanggal).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-800 block">{tx.keterangan}</span>
                                <span className="text-[9px] font-mono text-slate-400 font-semibold">ID: {tx.transaksi_id}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-emerald-700">{formatCurrency(tx.debit)}</td>
                              <td className="px-4 py-3 text-right font-black text-blue-700">{formatCurrency(tx.kredit)}</td>
                              <td className="px-4 py-3 text-right font-black text-rose-700">{formatCurrency(tx.difference)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    fetchData();
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-700 transition-all flex items-center gap-2 uppercase tracking-wider"
                >
                  <RefreshCw className="size-4" />
                  Pindai Ulang Ledger
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all uppercase tracking-wider"
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
