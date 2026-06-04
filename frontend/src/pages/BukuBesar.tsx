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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface COAItem {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana?: string;
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

export default function BukuBesar() {
  const [ledger, setLedger] = useState<LedgerEntryItem[]>([]);
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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
      const [resLedger, resCoas] = await Promise.all([
        axios.get('/api/finance/ledger'),
        axios.get('/api/finance/coa')
      ]);
      setLedger(resLedger.data);
      setCoas(resCoas.data);
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
              Laporan Jurnal Buku Besar (General Ledger)
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Filter and Ledger Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:border-0"
      >
        
        {/* Filters Panel (No-Print) */}
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
                          <span className="text-slate-350">|</span>
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

        {/* Ledger Entries Table */}
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
      </motion.div>
    </div>
  );
}
