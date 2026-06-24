import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  Upload, 
  Download, 
  X, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Building, 
  Trash2, 
  Edit3, 
  Filter, 
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface BankAccount {
  account_id: string;
  nama_akun: string;
  nomor_rekening: string;
  tipe_kas: 'BANK' | 'TUNAI';
  saldo: number;
}

interface BankMutation {
  id: string;
  tanggal: string;
  bankAccountId: string;
  bankName: string;
  keteranganBank: string;
  nominal: number;
  type: 'DEBIT' | 'KREDIT';
  status: 'PENDING' | 'RECONCILED';
}

interface ParsedMutation {
  rowNum: number;
  tanggal: string;
  type: 'DEBIT' | 'KREDIT';
  nominal: number;
  keteranganBank: string;
  isValid: boolean;
}

export default function CatatMutasi() {
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  // Filtering / Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal Controls
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Manual Form States (Used for both Create and Edit)
  const [editMutationId, setEditMutationId] = useState<string | null>(null);
  const [formBankId, setFormBankId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<'DEBIT' | 'KREDIT'>('DEBIT');
  const [formNominal, setFormNominal] = useState<number | ''>('');
  const [formKeterangan, setFormKeterangan] = useState('');

  // Migration States
  const [migrationBankId, setMigrationBankId] = useState('');
  const [parsedMutations, setParsedMutations] = useState<ParsedMutation[]>([]);
  const [fileName, setFileName] = useState('');

  // Custom Dropdown Open States
  const [isFilterBankDropdownOpen, setIsFilterBankDropdownOpen] = useState(false);
  const [isFilterTypeDropdownOpen, setIsFilterTypeDropdownOpen] = useState(false);
  const [isFormBankDropdownOpen, setIsFormBankDropdownOpen] = useState(false);
  const [isFormTypeDropdownOpen, setIsFormTypeDropdownOpen] = useState(false);
  const [isMigrationBankDropdownOpen, setIsMigrationBankDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resMutations, resAccounts] = await Promise.all([
        axios.get('/api/mutations'),
        axios.get('/api/finance/accounts')
      ]);
      setMutations(resMutations.data || []);
      const banks = (resAccounts.data || []).filter((acc: BankAccount) => acc.tipe_kas === 'BANK');
      setBankAccounts(banks);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data mutasi atau rekening bank.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'warning') => {
    setMessages(prev => [{ type, text }, ...prev]);
    setTimeout(() => {
      setMessages(prev => prev.slice(0, -1));
    }, 5000);
  };

  // Format date nicely for display, e.g. 18 Jun 2026
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Card Metrics Calculations
  const metrics = useMemo(() => {
    const debits = mutations.filter(m => m.type === 'DEBIT');
    const credits = mutations.filter(m => m.type === 'KREDIT');
    return {
      debitCount: debits.length,
      debitTotal: debits.reduce((sum, m) => sum + m.nominal, 0),
      creditCount: credits.length,
      creditTotal: credits.reduce((sum, m) => sum + m.nominal, 0),
      totalCount: mutations.length,
      totalNominal: mutations.reduce((sum, m) => sum + m.nominal, 0)
    };
  }, [mutations]);

  // Filtered & Searched mutations list
  const filteredMutations = useMemo(() => {
    return mutations.filter(m => {
      const matchesSearch = 
        m.keteranganBank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.bankName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBank = filterBankId ? m.bankAccountId === filterBankId : true;
      const matchesType = filterType ? m.type === filterType : true;
      return matchesSearch && matchesBank && matchesType;
    });
  }, [mutations, searchTerm, filterBankId, filterType]);

  // Submit Manual Mutation (Create / Edit)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBankId) {
      showToast('Pilih rekening bank terlebih dahulu!', 'error');
      return;
    }
    if (!formTanggal) {
      showToast('Tanggal transaksi wajib diisi!', 'error');
      return;
    }
    if (!formNominal || Number(formNominal) <= 0) {
      showToast('Nominal transaksi harus lebih besar dari 0!', 'error');
      return;
    }
    if (!formKeterangan.trim()) {
      showToast('Keterangan transaksi wajib diisi!', 'error');
      return;
    }

    try {
      const payload = {
        tanggal: formTanggal,
        bankAccountId: formBankId,
        keteranganBank: formKeterangan.trim(),
        nominal: Number(formNominal),
        type: formType
      };

      if (editMutationId) {
        await axios.put(`/api/mutations/${editMutationId}`, payload);
        showToast('Mutasi bank berhasil diperbarui!', 'success');
      } else {
        await axios.post('/api/mutations', payload);
        showToast(`Mutasi ${formType} berhasil dicatat secara manual!`, 'success');
      }
      
      // Reset & close
      setFormNominal('');
      setFormKeterangan('');
      setEditMutationId(null);
      setIsManualModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal menyimpan mutasi manual.', 'error');
    }
  };

  // Open modal for editing
  const handleEditClick = (m: BankMutation) => {
    setEditMutationId(m.id);
    setFormBankId(m.bankAccountId);
    setFormTanggal(m.tanggal);
    setFormType(m.type);
    setFormNominal(m.nominal);
    setFormKeterangan(m.keteranganBank);
    setIsManualModalOpen(true);
  };

  // Parse Excel statement
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!migrationBankId) {
      showToast('Silakan pilih rekening bank terlebih dahulu!', 'error');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

      if (parsedData.length === 0) {
        throw new Error("File kosong atau format tidak sesuai.");
      }

      const mapped = parsedData.map((row: any, idx: number) => {
        const findKey = (prefixes: string[]) => {
          return Object.keys(row).find(k => 
            prefixes.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
          );
        };

        const tglKey = findKey(['tanggal', 'date', 'tgl']);
        const ketKey = findKey(['keterangan', 'description', 'uraian', 'detail', 'detil']);
        const debitKey = findKey(['debit', 'debet', 'in', 'masuk']);
        const kreditKey = findKey(['kredit', 'credit', 'out', 'keluar']);

        const tglVal = tglKey ? String(row[tglKey]).trim() : '';
        const keterangan = ketKey ? String(row[ketKey]).trim() : '';

        const debitRaw = debitKey ? String(row[debitKey]).trim() : '';
        const kreditRaw = kreditKey ? String(row[kreditKey]).trim() : '';

        const cleanNumber = (val: string) => {
          const cleaned = val.replace(/[^0-9.-]+/g, '');
          return Number(cleaned) || 0;
        };

        const debitVal = cleanNumber(debitRaw);
        const kreditVal = cleanNumber(kreditRaw);

        let type: 'DEBIT' | 'KREDIT' = 'DEBIT';
        let nominal = 0;
        let isValidAmount = false;

        if (debitVal > 0 && kreditVal === 0) {
          type = 'DEBIT';
          nominal = debitVal;
          isValidAmount = true;
        } else if (kreditVal > 0 && debitVal === 0) {
          type = 'KREDIT';
          nominal = kreditVal;
          isValidAmount = true;
        } else if (debitVal > 0 && kreditVal > 0) {
          type = 'DEBIT';
          nominal = debitVal;
          isValidAmount = false;
        }

        // Basic date format check (supports DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD)
        let isValidDate = false;
        let formattedDate = tglVal;
        if (tglVal.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = tglVal.split('-');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          isValidDate = true;
        } else if (tglVal.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const parts = tglVal.split('/');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          isValidDate = true;
        } else if (tglVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
          formattedDate = tglVal;
          isValidDate = true;
        }

        return {
          rowNum: idx + 2,
          tanggal: formattedDate,
          type,
          nominal,
          keteranganBank: keterangan,
          isValid: isValidDate && keterangan !== '' && isValidAmount
        };
      });

      setParsedMutations(mapped);
      showToast(`Berhasil membaca ${mapped.length} baris data.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal membaca format file koran.', 'error');
      setParsedMutations([]);
      setFileName('');
    } finally {
      e.target.value = '';
    }
  };

  // Submit Bulk Migration
  const handleBulkSubmit = async () => {
    if (!migrationBankId) {
      showToast('Pilih rekening bank tujuan!', 'error');
      return;
    }
    const validItems = parsedMutations.filter(item => item.isValid);
    if (validItems.length === 0) {
      showToast('Tidak ada data transaksi valid untuk diimpor!', 'error');
      return;
    }

    try {
      const payload = {
        bankAccountId: migrationBankId,
        items: validItems.map(item => ({
          tanggal: item.tanggal,
          keteranganBank: item.keteranganBank,
          nominal: item.nominal,
          type: item.type
        }))
      };

      const res = await axios.post('/api/mutations/bulk', payload);
      showToast(`Migrasi Berhasil! Mengimpor ${res.data.count} data mutasi bank.`, 'success');
      
      // Reset, close, reload
      setParsedMutations([]);
      setFileName('');
      setMigrationBankId('');
      setIsMigrationModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal menyimpan bulk mutasi.', 'error');
    }
  };

  // Download Template (DD-MM-YYYY, Keterangan, Debit, Kredit)
  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { 
        "Tanggal (DD-MM-YYYY)": "18-06-2026", 
        "Keterangan": "Penerimaan Zis Transfer an Budi",
        "Debit": 1250000, 
        "Kredit": 0
      },
      { 
        "Tanggal (DD-MM-YYYY)": "18-06-2026", 
        "Keterangan": "Biaya Pembelian Konsumsi Rapat",
        "Debit": 0, 
        "Kredit": 450000
      }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format Mutasi Bank");
    XLSX.writeFile(workbook, "Template_Migrasi_Mutasi_Bank.xlsx");
  };

  // Delete Mutation
  const handleDeleteMutation = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan mutasi bank ini?')) return;

    try {
      await axios.delete(`/api/mutations/${id}`);
      showToast('Mutasi bank berhasil dihapus!', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menghapus mutasi bank.', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <nav className="flex text-xs gap-2 items-center">
            <span className="text-slate-400">Modul Keuangan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-bold">Catat Mutasi</span>
          </nav>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Catat Mutasi Bank
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Pencatatan manual dan migrasi bulk rekening koran ke dalam staging mutasi bank.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setEditMutationId(null);
              setFormBankId('');
              setFormTanggal(new Date().toISOString().split('T')[0]);
              setFormType('DEBIT');
              setFormNominal('');
              setFormKeterangan('');
              setIsManualModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <Plus className="size-4" /> Catat Manual
          </button>
          <button 
            onClick={() => {
              setMigrationBankId('');
              setParsedMutations([]);
              setFileName('');
              setIsMigrationModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <FileSpreadsheet className="size-4" /> Migrasi Koran
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {messages.length > 0 && (
          <div className="fixed top-8 right-8 z-[100] flex flex-col gap-2 shrink-0 w-80 shadow-2xl">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: 50, scale: 0.9 }} 
                animate={{ opacity: 1, x: 0, scale: 1 }} 
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                className={cn(
                  "p-4 rounded-xl flex items-start gap-3 border shadow-sm",
                  msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-red-50 border-red-200 text-red-700'
                )}
              >
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{msg.type === 'success' ? 'Berhasil' : msg.type === 'warning' ? 'Peringatan' : 'Gagal'}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
                <button 
                  onClick={() => setMessages(prev => prev.filter((_, i) => i !== idx))} 
                  className="shrink-0 p-1 hover:bg-black/5 rounded-md"
                >
                  <X className="size-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Cards Panel: Metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Debit (Uang Masuk) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Total Debit (Uang Masuk)
            </p>
            <p className="text-lg font-black text-slate-900 mt-1">
              Rp {metrics.debitTotal.toLocaleString('id-ID')}
            </p>
            <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.debitCount} Transaksi Masuk
            </span>
          </div>
        </div>

        {/* Card 2: Total Kredit (Uang Keluar) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-600 shrink-0">
            <TrendingDown className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Total Kredit (Uang Keluar)
            </p>
            <p className="text-lg font-black text-slate-900 mt-1">
              Rp {metrics.creditTotal.toLocaleString('id-ID')}
            </p>
            <span className="block text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.creditCount} Transaksi Keluar
            </span>
          </div>
        </div>

        {/* Card 3: Total Akumulasi Mutasi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
            <Layers className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Total Akumulasi Nominal
            </p>
            <p className="text-lg font-black text-slate-900 mt-1">
              Rp {metrics.totalNominal.toLocaleString('id-ID')}
            </p>
            <span className="block text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.totalCount} Total Transaksi
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari deskripsi koran atau bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-semibold pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto shrink-0 items-center justify-end">
          {/* Custom Bank Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterBankDropdownOpen(!isFilterBankDropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Filter className="size-3.5 text-slate-400" />
              <span>
                {filterBankId 
                  ? bankAccounts.find(ba => ba.account_id === filterBankId)?.nama_akun || 'Semua Bank'
                  : 'Semua Bank'
                }
              </span>
              <ChevronDown className="size-3 text-slate-400 shrink-0" />
            </button>

            {isFilterBankDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsFilterBankDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterBankId('');
                      setIsFilterBankDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                      !filterBankId ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                    )}
                  >
                    <span>Semua Bank</span>
                    {!filterBankId && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                  {bankAccounts.map(ba => (
                    <button
                      key={ba.account_id}
                      type="button"
                      onClick={() => {
                        setFilterBankId(ba.account_id);
                        setIsFilterBankDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                        filterBankId === ba.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                      )}
                    >
                      <span>{ba.nama_akun}</span>
                      {filterBankId === ba.account_id && <Check className="size-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Type Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterTypeDropdownOpen(!isFilterTypeDropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <span>
                {filterType === 'DEBIT' ? 'DEBIT' : filterType === 'KREDIT' ? 'KREDIT' : 'Semua Tipe'}
              </span>
              <ChevronDown className="size-3 text-slate-400 shrink-0" />
            </button>

            {isFilterTypeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsFilterTypeDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('');
                      setIsFilterTypeDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                      !filterType ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                    )}
                  >
                    <span>Semua Tipe</span>
                    {!filterType && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('DEBIT');
                      setIsFilterTypeDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                      filterType === 'DEBIT' ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                    )}
                  >
                    <span>DEBIT</span>
                    {filterType === 'DEBIT' && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('KREDIT');
                      setIsFilterTypeDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                      filterType === 'KREDIT' ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                    )}
                  >
                    <span>KREDIT</span>
                    {filterType === 'KREDIT' && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rekening Bank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Koran / Deskripsi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipe</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Memuat data mutasi bank...
                  </td>
                </tr>
              ) : filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Tidak ada catatan mutasi bank ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMutations.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(m.tanggal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{m.bankName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-sm truncate" title={m.keteranganBank}>
                      {m.keteranganBank}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      Rp {m.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={cn(
                        "px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border",
                        m.type === 'KREDIT' 
                          ? "bg-red-50 text-red-600 border-red-100" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-black text-[9px]",
                        m.status === 'RECONCILED' 
                          ? "bg-slate-100 text-slate-500" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      )}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {m.status !== 'RECONCILED' ? (
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => handleEditClick(m)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Mutasi"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMutation(m.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Hapus Mutasi"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium px-2">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CATAT / EDIT MUTASI MANUAL */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building className="size-4 text-primary" />
                  {editMutationId ? 'Edit Catatan Mutasi' : 'Catat Mutasi Manual'}
                </h3>
                <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                {/* Bank Account Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rekening Bank *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFormBankDropdownOpen(!isFormBankDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {bankAccounts.find(ba => ba.account_id === formBankId)
                          ? `${bankAccounts.find(ba => ba.account_id === formBankId)?.nama_akun} - ${bankAccounts.find(ba => ba.account_id === formBankId)?.nomor_rekening}`
                          : '-- Pilih Rekening --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isFormBankDropdownOpen && "rotate-180")} />
                    </button>

                    {isFormBankDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFormBankDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {bankAccounts.map(ba => (
                            <button
                              key={ba.account_id}
                              type="button"
                              onClick={() => {
                                setFormBankId(ba.account_id);
                                setIsFormBankDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                formBankId === ba.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{ba.nama_akun} - {ba.nomor_rekening}</span>
                              {formBankId === ba.account_id && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Tanggal */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal Transaksi *</label>
                    <input 
                      type="date"
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      required
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  {/* Jenis Mutasi */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe Mutasi *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsFormTypeDropdownOpen(!isFormTypeDropdownOpen)}
                        className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                      >
                        <span>{formType === 'DEBIT' ? 'DEBIT (Uang Masuk)' : 'KREDIT (Uang Keluar)'}</span>
                        <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isFormTypeDropdownOpen && "rotate-180")} />
                      </button>

                      {isFormTypeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setIsFormTypeDropdownOpen(false)} />
                          <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 overflow-y-auto custom-scrollbar">
                            <button
                              type="button"
                              onClick={() => {
                                setFormType('DEBIT');
                                setIsFormTypeDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                formType === 'DEBIT' ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>DEBIT (Uang Masuk)</span>
                              {formType === 'DEBIT' && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormType('KREDIT');
                                setIsFormTypeDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                formType === 'KREDIT' ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>KREDIT (Uang Keluar)</span>
                              {formType === 'KREDIT' && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nominal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nominal Transaksi (Rp) *</label>
                  <input 
                    type="number"
                    placeholder="Contoh: 1500000"
                    value={formNominal}
                    onChange={(e) => setFormNominal(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                  />
                </div>

                {/* Keterangan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Keterangan Koran / Uraian *</label>
                  <textarea 
                    rows={2}
                    placeholder="Contoh: TRSF BAZNAS KOTA SEMARANG"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsManualModalOpen(false)}
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20"
                  >
                    {editMutationId ? 'Simpan Perubahan' : 'Simpan Catatan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: MIGRASI BULK KORAN */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" />
                  Migrasi Data Mutasi Bank Bulk
                </h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* 1. Select Bank Account */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    PILIH REKENING BANK TUJUAN *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMigrationBankDropdownOpen(!isMigrationBankDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {bankAccounts.find(ba => ba.account_id === migrationBankId)
                          ? `${bankAccounts.find(ba => ba.account_id === migrationBankId)?.nama_akun} - ${bankAccounts.find(ba => ba.account_id === migrationBankId)?.nomor_rekening}`
                          : '-- Pilih Rekening Bank --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isMigrationBankDropdownOpen && "rotate-180")} />
                    </button>

                    {isMigrationBankDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsMigrationBankDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {bankAccounts.map(ba => (
                            <button
                              key={ba.account_id}
                              type="button"
                              onClick={() => {
                                setMigrationBankId(ba.account_id);
                                setParsedMutations([]);
                                setFileName('');
                                setIsMigrationBankDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                migrationBankId === ba.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{ba.nama_akun} - {ba.nomor_rekening}</span>
                              {migrationBankId === ba.account_id && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Download / Upload Action Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Download Template */}
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-primary">Download Template Excel</p>
                        <p className="text-[10px] text-primary/70 font-semibold">Unduh kolom format transaksi</p>
                      </div>
                    </div>
                  </button>

                  {/* Upload File */}
                  <label className={cn(
                    "flex items-center justify-between p-4 border border-dashed rounded-xl transition-all text-left cursor-pointer",
                    migrationBankId ? "border-slate-300 hover:bg-slate-50" : "border-slate-200 opacity-55 cursor-not-allowed"
                  )}>
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {fileName ? 'Ganti File Excel' : 'Upload File Koran'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {fileName ? fileName : 'Pilih file (.xlsx / .xls)'}
                        </p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls"
                      disabled={!migrationBankId}
                      onChange={handleFileUpload} 
                    />
                  </label>
                </div>

                {/* 3. Parsed Data Table Preview */}
                {parsedMutations.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Hasil Pembacaan Excel ({parsedMutations.length} Baris)
                      </h4>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {parsedMutations.filter(p => p.isValid).length} Valid
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-red-500" />
                          {parsedMutations.filter(p => !p.isValid).length} Error
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="px-4 py-2 text-center w-12">Baris</th>
                            <th className="px-4 py-2 w-24">Tanggal</th>
                            <th className="px-4 py-2 w-20">Tipe</th>
                            <th className="px-4 py-2 w-28">Nominal</th>
                            <th className="px-4 py-2">Keterangan</th>
                            <th className="px-4 py-2 text-center w-16">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedMutations.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-center font-semibold text-slate-400">{item.rowNum}</td>
                              <td className="px-4 py-2 font-semibold text-slate-700">{item.tanggal || '-'}</td>
                              <td className="px-4 py-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded font-black text-[9px] uppercase",
                                  item.type === 'KREDIT' 
                                    ? "bg-red-50 text-red-600 border border-red-100" 
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono font-bold text-slate-800">
                                Rp {item.nominal.toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-2 text-slate-500 max-w-[150px] truncate" title={item.keteranganBank}>
                                {item.keteranganBank || '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {item.isValid ? (
                                  <span className="inline-flex p-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    <Check className="size-3.5" />
                                  </span>
                                ) : (
                                  <span className="inline-flex p-0.5 rounded-full bg-red-50 text-red-600" title="Format salah">
                                    <AlertTriangle className="size-3.5" />
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsMigrationModalOpen(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Batal
                </button>
                <button 
                  onClick={handleBulkSubmit}
                  disabled={parsedMutations.filter(p => p.isValid).length === 0}
                  className="flex-1 py-3 bg-primary disabled:bg-slate-100 disabled:text-slate-400 hover:bg-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20"
                >
                  Proses Migrasi ({parsedMutations.filter(p => p.isValid).length} Valid)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
