import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ArrowRightLeft, 
  Plus, 
  CheckCircle2, 
  Search, 
  User, 
  AlertTriangle,
  Building,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export interface BankAccount {
  account_id: string;
  nama_akun: string;
  tipe_kas: string;
  no_rekening?: string;
  saldo: number;
}

export interface COAItem {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana?: string;
}

export interface BankMutation {
  id: string;
  tanggal: string;
  tanggalCatatan?: string;
  bankAccountId: string;
  bankName: string;
  keteranganBank: string;
  nominal: number;
  type?: 'DEBIT' | 'KREDIT';
  status: 'PENDING' | 'RECONCILED';
  reconciledAt?: string;
  reconciledBy?: string;
  muzakkiId?: string;
  muzakkiName?: string;
  coaCode?: string;
  sumberDana?: string;
  keteranganRealisasi?: string;
}

export interface Muzakki {
  id: string;
  nama: string;
  nik?: string;
  noHp?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export default function RekonsiliasiMutasi() {
  const { user } = useAuth();
  
  // States
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [muzakkis, setMuzakkis] = useState<Muzakki[]>([]);
  
  const [activeTab, setActiveTab] = useState<'PENERIMAAN' | 'PENYALURAN'>('PENERIMAAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlyFilter, setMonthlyFilter] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal control
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedMutation, setSelectedMutation] = useState<BankMutation | null>(null);

  // Form states - Add Mutation
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formBankId, setFormBankId] = useState('');
  const [formKeteranganBank, setFormKeteranganBank] = useState('');
  const [formNominal, setFormNominal] = useState<number | ''>('');

  // Form states - Reconcile
  const [formMuzakkiId, setFormMuzakkiId] = useState('');
  const [formCustomMuzakki, setFormCustomMuzakki] = useState('');
  const [formCoaCode, setFormCoaCode] = useState('');
  const [formSumberDana, setFormSumberDana] = useState('ZAKAT');
  const [formKeteranganRealisasi, setFormKeteranganRealisasi] = useState('');

  // Search inside Muzakki and COA
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [coaSearch, setCoaSearch] = useState('');
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);

  // Trigger toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMutations, resAccounts, resCoas, resMuzakkis, resMustahiks] = await Promise.all([
        axios.get('/api/mutations'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa'),
        axios.get('/api/muzakki'),
        axios.get('/api/mustahik')
      ]);

      setMutations(resMutations.data);
      setBankAccounts(resAccounts.data);
      
      // Store all COAs
      setCoas(resCoas.data);
      
      // Map both muzakki and mustahik
      const muzakkiList = (resMuzakkis.data.data || []).map((m: any) => ({
        id: m.id,
        nama: m.nama,
        nik: m.nik,
        noHp: m.handphone || m.noHp || ''
      }));

      const mustahikList = (resMustahiks.data.data || []).map((m: any) => ({
        id: m.id,
        nama: `${m.nama} (Mustahik)`,
        nik: m.nik,
        noHp: m.handphone || m.noHp || ''
      }));

      setMuzakkis([...muzakkiList, ...mustahikList]);

      const bankOnly = resAccounts.data.filter((a: any) => a.tipe_kas === 'BANK');
      if (bankOnly.length > 0) {
        setFormBankId(bankOnly[0]?.account_id || '');
      }
    } catch (error) {
      console.error('Failed to fetch bank mutations data:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      showToast('Gagal memuat data: ' + errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered COAs based on selectedMutation type and formSumberDana tag
  const filteredCoas = useMemo(() => {
    if (!selectedMutation) return [];
    const isDebit = selectedMutation.type !== 'KREDIT';
    
    if (isDebit) {
      // Penerimaan (Debit to cash/bank account, credit to Penerimaan COA)
      const basePenerimaan = coas.filter(c => c.klasifikasi === 'Penerimaan' || c.coa_code.startsWith('4'));
      if (formSumberDana === 'ZAKAT') {
        return basePenerimaan.filter(c => c.tipe_dana === 'ZAKAT' || c.coa_code.startsWith('41'));
      } else {
        return basePenerimaan.filter(c => c.tipe_dana !== 'ZAKAT' || c.coa_code.startsWith('42'));
      }
    } else {
      // Penyaluran/Penggunaan (Kredit to cash/bank account, debit to Penyaluran/Beban COA)
      return coas.filter(c => c.klasifikasi === 'Penyaluran' || c.klasifikasi === 'Penggunaan' || c.coa_code.startsWith('5'));
    }
  }, [coas, formSumberDana, selectedMutation]);

  const filteredCoasForSearch = useMemo(() => {
    if (!coaSearch) return filteredCoas;
    const term = coaSearch.toLowerCase();
    return filteredCoas.filter(coa => 
      coa.coa_code.toLowerCase().includes(term) || 
      coa.nama_akun.toLowerCase().includes(term)
    );
  }, [filteredCoas, coaSearch]);

  // Reset COA code to empty on source change to let user search manually
  useEffect(() => {
    setFormCoaCode('');
  }, [filteredCoas]);

  // Filtered mutations based on activeTab, search term, and monthlyFilter
  const filteredMutations = useMemo(() => {
    const filtered = mutations.filter(m => {
      // Filter by tab type (Debit vs Kredit)
      const isDebit = m.type !== 'KREDIT';
      if (activeTab === 'PENERIMAAN' && !isDebit) return false;
      if (activeTab === 'PENYALURAN' && isDebit) return false;

      // Filter by monthly input if on PENYALURAN tab and filter is active
      if (activeTab === 'PENYALURAN' && monthlyFilter) {
        const mutationMonth = m.tanggal.substring(0, 7); // Gets "YYYY-MM"
        if (mutationMonth !== monthlyFilter) return false;
      }

      const search = searchTerm.toLowerCase();
      if (!search) return true;
      return (
        m.keteranganBank.toLowerCase().includes(search) ||
        m.bankName.toLowerCase().includes(search) ||
        (m.muzakkiName || '').toLowerCase().includes(search) ||
        (m.coaCode || '').includes(search)
      );
    });

    // Sort: status === 'PENDING' (belum teridentifikasi) first, then 'RECONCILED'
    // Within the same status, sort by date descending (newest first)
    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'PENDING' ? -1 : 1;
      }
      return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    });
  }, [mutations, searchTerm, activeTab, monthlyFilter]);

  // Summary Metrics based on activeTab
  const metrics = useMemo(() => {
    const tabMutations = mutations.filter(m => {
      const isDebit = m.type !== 'KREDIT';
      return activeTab === 'PENERIMAAN' ? isDebit : !isDebit;
    });

    const pending = tabMutations.filter(m => m.status === 'PENDING');
    const reconciled = tabMutations.filter(m => m.status === 'RECONCILED');

    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((sum, m) => sum + m.nominal, 0),
      reconciledCount: reconciled.length,
      reconciledTotal: reconciled.reduce((sum, m) => sum + m.nominal, 0),
      grandTotal: tabMutations.reduce((sum, m) => sum + m.nominal, 0)
    };
  }, [mutations, activeTab]);

  // Filtered Muzakki inside modal
  const filteredMuzakkis = useMemo(() => {
    if (!muzakkiSearch) return [];
    return muzakkis.filter(m => 
      m.nama.toLowerCase().includes(muzakkiSearch.toLowerCase()) ||
      (m.nik || '').includes(muzakkiSearch)
    );
  }, [muzakkis, muzakkiSearch]);

  // Save new Bank Mutation entry (Keuangan/Super_Admin role)
  const handleAddMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNominal || Number(formNominal) <= 0 || !formKeteranganBank.trim()) {
      showToast('Keterangan bank dan nominal wajib diisi valid!', 'error');
      return;
    }

    try {
      const payload = {
        tanggal: formTanggal,
        bankAccountId: formBankId,
        keteranganBank: formKeteranganBank.trim(),
        nominal: Number(formNominal)
      };

      const res = await axios.post('/api/mutations', payload);
      setMutations(prev => [...prev, res.data]);
      
      // Reset form
      setFormKeteranganBank('');
      setFormNominal('');
      setIsAddModalOpen(false);
      showToast('Mutasi Kredit Bank berhasil direkam!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan mutasi', 'error');
    }
  };

  // Open Reconcile Modal
  const openReconcile = (mutation: BankMutation) => {
    setSelectedMutation(mutation);
    setFormMuzakkiId('');
    setFormCustomMuzakki('');
    setMuzakkiSearch('');
    setFormSumberDana('ZAKAT');
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    
    const isDebit = mutation.type !== 'KREDIT';
    setFormKeteranganRealisasi(
      isDebit 
        ? `Penerimaan mutasi ${mutation.keteranganBank}`
        : `Penyaluran/Penggunaan mutasi ${mutation.keteranganBank}`
    );
    
    setIsReconcileModalOpen(true);
  };

  // Submit Reconciliation (Pengumpulan/Keuangan/Super_Admin role)
  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutation) return;

    const isDebit = selectedMutation.type !== 'KREDIT';
    const selectedMuzakki = muzakkis.find(m => m.id === formMuzakkiId);
    const donorName = isDebit 
      ? (selectedMuzakki?.nama || formCustomMuzakki.trim() || 'Hamba Allah')
      : '-';

    try {
      const payload = {
        muzakkiId: isDebit ? (formMuzakkiId || null) : null,
        muzakkiName: donorName,
        coaCode: formCoaCode,
        sumberDana: isDebit ? formSumberDana : '-',
        keteranganRealisasi: formKeteranganRealisasi.trim(),
        userName: user?.name || user?.role || 'Staff'
      };

      await axios.post(`/api/mutations/${selectedMutation.id}/reconcile`, payload);
      
      showToast('Rekonsiliasi Mutasi sukses & Jurnal Buku Besar otomatis terbentuk!', 'success');
      setIsReconcileModalOpen(false);
      fetchData(); // Reload mutations & bank balances
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Gagal merekonsiliasi mutasi', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      {/* Toast Notifikasi */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border font-semibold text-xs",
              toast.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 text-rose-600" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Rekonsiliasi Mutasi</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="size-8 text-primary shrink-0" />
            Rekonsiliasi Mutasi
          </h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Bridging akurasi data bank antara tim Pelaporan (monitoring mutasi) dan tim Pengumpulan (identifikasi Muzakki &amp; alokasi dana).
          </p>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="size-6 animate-pulse" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {activeTab === 'PENERIMAAN' ? 'Mutasi Gantung Penerimaan' : 'Draf Pengeluaran Gantung'}
            </p>
            <p className="text-lg font-black text-slate-950 mt-1">
              {formatCurrency(metrics.pendingTotal)}
            </p>
            <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.pendingCount} Transaksi Menggantung
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
            <Check className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {activeTab === 'PENERIMAAN' ? 'Penerimaan Terekonsiliasi' : 'Penyaluran Terverifikasi'}
            </p>
            <p className="text-lg font-black text-slate-950 mt-1">
              {formatCurrency(metrics.reconciledTotal)}
            </p>
            <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.reconciledCount} Transaksi Sukses Diposting
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {activeTab === 'PENERIMAAN' ? 'Total Aliran Penerimaan Masuk' : 'Total Aliran Penyaluran Keluar'}
            </p>
            <p className="text-lg font-black text-slate-950 mt-1">
              {formatCurrency(metrics.grandTotal)}
            </p>
            <span className="block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
              {mutations.filter(m => {
                const isDebit = m.type !== 'KREDIT';
                return activeTab === 'PENERIMAAN' ? isDebit : !isDebit;
              }).length} Transaksi Terdaftar
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('PENERIMAAN')}
            className={`flex-1 sm:flex-initial px-6 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'PENERIMAAN'
                ? 'border-primary text-primary bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'
            }`}
          >
            <ArrowDownLeft className="size-4 text-emerald-600" />
            Penerimaan (Uang Masuk / Debit)
          </button>
          <button
            onClick={() => setActiveTab('PENYALURAN')}
            className={`flex-1 sm:flex-initial px-6 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'PENYALURAN'
                ? 'border-primary text-primary bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'
            }`}
          >
            <ArrowUpRight className="size-4 text-rose-600" />
            Penyaluran &amp; Penggunaan (Uang Keluar / Kredit)
          </button>
        </div>

        {/* Search Header */}
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari keterangan mutasi bank, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Monthly Filter - ONLY FOR PENYALURAN TAB */}
            {activeTab === 'PENYALURAN' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">Filter Bulan:</span>
                <input 
                  type="month"
                  value={monthlyFilter}
                  onChange={(e) => setMonthlyFilter(e.target.value)}
                  className="w-full sm:w-auto text-xs font-bold bg-slate-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                />
                {monthlyFilter && (
                  <button 
                    onClick={() => setMonthlyFilter('')}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Clear filter bulan"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 items-center self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200">
              Peran: <span className="text-primary font-black">{user?.role?.replace('_', ' ')}</span>
            </span>
            {activeTab === 'PENERIMAAN' && (user?.role === 'Super_Admin' || user?.role === 'Staf_Keuangan') && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider shrink-0"
              >
                <Plus className="size-4" /> Catat Mutasi
              </button>
            )}
          </div>
        </div>

        {/* Mutation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Kas / Bank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Koran / Deskripsi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  {activeTab === 'PENERIMAAN' ? 'Nominal Masuk' : 'Nominal Keluar'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Alokasi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
                        Memuat data mutasi...
                      </span>
                    ) : (
                      'Tidak ada transaksi ditemukan'
                    )}
                  </td>
                </tr>
              ) : filteredMutations.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-5 font-mono text-xs text-slate-600 font-bold">
                    {new Date(item.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-800">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Building className="size-3.5 text-slate-400" />
                      {item.bankName}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-800">
                    {item.keteranganBank}
                  </td>
                  <td className={`px-6 py-5 text-right font-black font-mono ${
                    activeTab === 'PENERIMAAN' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {formatCurrency(item.nominal)}
                  </td>
                  <td className="px-6 py-5">
                    {item.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        <AlertTriangle className="size-3" /> Menggantung
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Check className="size-3" /> Terekonsiliasi
                        </span>
                        {item.muzakkiName && item.muzakkiName !== '-' && (
                          <span className="block text-[10px] text-slate-500 font-semibold">
                            Muzakki: <strong>{item.muzakkiName}</strong>
                          </span>
                        )}
                        <span className="block text-[10px] text-primary font-mono font-bold">
                          COA: {item.coaCode}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {item.status === 'PENDING' ? (
                      <button
                        onClick={() => openReconcile(item)}
                        className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-lg text-xs font-black transition-all active:scale-95 uppercase tracking-wider"
                      >
                        Identifikasi
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold italic">
                        Oleh {item.reconciledBy}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Bank Mutation */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building className="size-4 text-primary" />
                  Catat Uang Masuk Mutasi Bank
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleAddMutation} className="p-6 space-y-4">
                {/* Tanggal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal Transaksi Bank</label>
                  <input 
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Bank Account */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pilih Akun Bank Penerima</label>
                  <select
                    value={formBankId}
                    onChange={(e) => setFormBankId(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {bankAccounts.map(ba => (
                      <option key={ba.account_id} value={ba.account_id}>
                        {ba.nama_akun} {ba.no_rekening ? `(Rek: ${ba.no_rekening})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nominal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah Nominal Transfer (Rp)</label>
                  <input 
                    type="number"
                    placeholder="Contoh: 5000000"
                    value={formNominal}
                    onChange={(e) => setFormNominal(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                  />
                </div>

                {/* Keterangan Koran */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Keterangan Mutasi Bank (Sesuai M-Banking)</label>
                  <textarea 
                    rows={2}
                    placeholder="Contoh: TRSF BPK SUWITO ANGGOTA POLISI"
                    value={formKeteranganBank}
                    onChange={(e) => setFormKeteranganBank(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20"
                  >
                    Simpan Mutasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Reconcile Bank Mutation */}
      <AnimatePresence>
        {isReconcileModalOpen && selectedMutation && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ArrowRightLeft className="size-4 text-primary" />
                  Identifikasi &amp; Rekonsiliasi Dana ({selectedMutation.type === 'KREDIT' ? 'Penyaluran' : 'Penerimaan'})
                </h3>
                <button onClick={() => setIsReconcileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="bg-amber-50 p-4 border-b border-amber-100 text-amber-800 text-[11px] font-bold space-y-1">
                <p>📌 Sumber Akun: {selectedMutation.bankName}</p>
                <p>💬 Keterangan: "{selectedMutation.keteranganBank}"</p>
                <p>💰 Jumlah Dana: {formatCurrency(selectedMutation.nominal)} ({selectedMutation.type === 'KREDIT' ? 'Pengeluaran' : 'Penerimaan'})</p>
              </div>

              <form onSubmit={handleReconcile} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* 1. Muzakki Linkage - ONLY FOR DEBIT/PENERIMAAN */}
                {selectedMutation.type !== 'KREDIT' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">1. Hubungkan ke Database Muzakki (Opsional)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 size-3.5" />
                      <input 
                        type="text"
                        placeholder="Cari nama Muzakki (Contoh: Budi)..."
                        value={muzakkiSearch}
                        onChange={(e) => setMuzakkiSearch(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 outline-none"
                      />
                    </div>

                    {/* Muzakki Search Results */}
                    {muzakkiSearch && (
                      <div className="bg-white border border-slate-200 rounded-lg max-h-28 overflow-y-auto divide-y divide-slate-100 text-xs font-bold shadow-inner">
                        {filteredMuzakkis.length === 0 ? (
                          <p className="p-2 text-[10px] text-slate-400 italic">Muzakki tidak ditemukan</p>
                        ) : (
                          filteredMuzakkis.map(m => (
                            <div 
                              key={m.id}
                              onClick={() => {
                                setFormMuzakkiId(m.id);
                                setFormCustomMuzakki(m.nama);
                                setMuzakkiSearch('');
                              }}
                              className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-slate-700"
                            >
                              <span>{m.nama}</span>
                              <span className="text-[10px] text-slate-400 font-mono">NIK: {m.nik || '-'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Manual input or chosen badge */}
                    {formMuzakkiId ? (
                      <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-black">
                        <span className="flex items-center gap-1.5"><User className="size-4 shrink-0" /> Terhubung: {formCustomMuzakki}</span>
                        <button type="button" onClick={() => { setFormMuzakkiId(''); setFormCustomMuzakki(''); }} className="hover:text-rose-600">
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input 
                          type="text"
                          placeholder="Ketik Nama Donatur/Muzakki secara manual..."
                          value={formCustomMuzakki}
                          onChange={(e) => setFormCustomMuzakki(e.target.value)}
                          required
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Jika nama muzakki tidak ada di database, ketik manual di atas.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Sumber Dana Tag - HIDE IF KREDIT */}
                {selectedMutation.type !== 'KREDIT' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      2. Klasifikasi Rumpun Dana
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['ZAKAT', 'INFAK_TERIKAT', 'INFAK_TIDAK_TERIKAT'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFormSumberDana(tag)}
                          className={cn(
                            "py-2 text-[10px] font-black rounded-lg border text-center transition-all uppercase tracking-wider",
                            formSumberDana === tag 
                              ? "bg-primary text-white border-primary shadow-sm" 
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {tag.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Account COA Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {selectedMutation.type === 'KREDIT' ? '1. Akun Buku Besar (Penyaluran/Penggunaan COA)' : '3. Akun Buku Besar (Penerimaan COA)'}
                  </label>
                  {formCoaCode ? (
                    <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-black">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-4 shrink-0" />
                        Terpilih: {formCoaCode} - {coas.find(c => c.coa_code === formCoaCode)?.nama_akun || 'Memuat...'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormCoaCode('');
                          setCoaSearch('');
                        }} 
                        className="hover:text-rose-600"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 size-3.5" />
                        <input 
                          type="text"
                          placeholder="Cari kode COA atau nama akun (Contoh: Penyaluran)..."
                          value={coaSearch}
                          onChange={(e) => setCoaSearch(e.target.value)}
                          onFocus={() => setIsCoaDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsCoaDropdownOpen(false), 200)}
                          className="w-full text-xs font-semibold bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {(isCoaDropdownOpen || coaSearch) && (
                        <div className="bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs font-bold shadow-inner">
                          {filteredCoasForSearch.length === 0 ? (
                            <p className="p-2 text-[10px] text-slate-400 italic">COA tidak ditemukan</p>
                          ) : (
                            filteredCoasForSearch.map(coa => (
                              <div 
                                key={coa.coa_code}
                                onClick={() => {
                                  setFormCoaCode(coa.coa_code);
                                  setCoaSearch('');
                                  setIsCoaDropdownOpen(false);
                                }}
                                className="p-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5 text-slate-700"
                              >
                                <span className="font-mono text-primary text-[11px]">{coa.coa_code}</span>
                                <span className="text-slate-650 text-[10px]">{coa.nama_akun}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Hidden input to enforce html5 validation for formCoaCode */}
                  <input 
                    type="text" 
                    value={formCoaCode} 
                    required 
                    onChange={() => {}} 
                    className="sr-only h-0 w-0" 
                  />
                </div>

                {/* 4. Realisasi Explanation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {selectedMutation.type === 'KREDIT' ? '2. Keterangan Penyaluran / Penggunaan Dana' : '4. Penjelasan Penerimaan (Keterangan Realisasi)'}
                  </label>
                  <textarea 
                    rows={2}
                    value={formKeteranganRealisasi}
                    onChange={(e) => setFormKeteranganRealisasi(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsReconcileModalOpen(false)}
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
                  >
                    <Check className="size-4" /> Posting Jurnal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
