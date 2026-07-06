import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FileText,
  Calendar,
  Coins,
  Filter,
  ChevronDown,
  Check,
  ListOrdered,
  Banknote,
  Send,
  XCircle,
  Plus,
  X,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface BankAccount {
  account_id: string;
  nama_akun: string;
  tipe_kas: string;
  kelompok_dana: string;
  saldo: number;
  no_rekening?: string;
  coa_code: string;
}

interface ManualDraft {
  id: string;
  tanggalCatatan: string;
  tanggal: string;
  bankAccountId: string;
  bankName: string;
  keteranganBank: string;
  nominal: number;
  type: 'DEBIT' | 'KREDIT';
  status: 'PENDING' | 'RECONCILED';
}

export default function PengeluaranManual() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'langsung' | 'antrean'>('langsung');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  
  // Direct Payout Form States
  const [recentDrafts, setRecentDrafts] = useState<ManualDraft[]>([]);
  const [tanggalCatatan, setTanggalCatatan] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date().toISOString().split('T')[0]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSourceAccountDropdownOpen, setIsSourceAccountDropdownOpen] = useState(false);
  const [isFilterAccountDropdownOpen, setIsFilterAccountDropdownOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [kategoriBiaya, setKategoriBiaya] = useState('');

  // Queue tab states
  const [queueList, setQueueList] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);
  
  // Queue Payout Modal States
  const [payoutBankAccountId, setPayoutBankAccountId] = useState('');
  const [payoutSumberDana, setPayoutSumberDana] = useState('AMIL');
  const [payoutCatatan, setPayoutCatatan] = useState('');
  const [isPayoutSubmitLoading, setIsPayoutSubmitLoading] = useState(false);
  const [isPayoutDropdownOpen, setIsPayoutDropdownOpen] = useState(false);

  // General Status & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const renderFormContent = (isMobile = false) => {
    const numericNominal = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
    const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);
    const isOverdrawn = selectedAccount ? numericNominal > selectedAccount.saldo : false;

    return (
      <form 
        onSubmit={async (e) => {
          await handleDirectSubmit(e);
          if (isMobile) {
            setIsFormModalOpen(false);
          }
        }} 
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              Tanggal Catatan
            </label>
            <input
              type="date"
              value={tanggalCatatan}
              onChange={(e) => setTanggalCatatan(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={tanggalTransaksi}
              onChange={(e) => setTanggalTransaksi(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
            <Coins className="size-4 text-slate-400" />
            Sumber Kas (Sumber Dana Kas)
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSourceAccountDropdownOpen(!isSourceAccountDropdownOpen)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">
                {selectedAccount 
                  ? `${selectedAccount.nama_akun} - (Rp ${Number(selectedAccount.saldo).toLocaleString('id-ID')})`
                  : '-- Pilih Sumber Kas --'
                }
              </span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isSourceAccountDropdownOpen && "rotate-180")} />
            </button>

            {isSourceAccountDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSourceAccountDropdownOpen(false)} />
                <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                    <button
                      key={acc.account_id}
                      type="button"
                      onClick={() => {
                        setSourceAccountId(acc.account_id);
                        setIsSourceAccountDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                        sourceAccountId === acc.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                      )}
                    >
                      <span className="font-bold">{acc.nama_akun}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-mono font-bold">Rp {Number(acc.saldo).toLocaleString('id-ID')}</span>
                        {sourceAccountId === acc.account_id && <Check className="size-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-450">
            Nominal Transaksi
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">Rp</span>
            <input
              type="text"
              value={nominal ? parseInt(nominal).toLocaleString('id-ID') : ''}
              onChange={handleNominalChange}
              placeholder="Masukkan jumlah nominal..."
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-black text-slate-900"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
            Kategori Biaya
          </label>
          <select
            value={kategoriBiaya}
            onChange={(e) => setKategoriBiaya(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold text-slate-700"
            required
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.nama}>{cat.nama}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-455">Keterangan Pengeluaran / Memo</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Detail penggunaan..."
            className="w-full h-24 p-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isOverdrawn}
          className={cn(
            "w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer",
            isOverdrawn 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
              : 'bg-primary hover:bg-primary/95 shadow-primary/25'
          )}
        >
          <Save className="size-5" />
          {isLoading ? 'Menyimpan Draft...' : 'Simpan Draft Pengeluaran'}
        </button>
      </form>
    );
  };

  // Fetch Direct Payout Data
  const fetchDirectData = async () => {
    try {
      const [accountsRes, mutationsRes, categoriesRes] = await Promise.all([
        axios.get('/api/finance/accounts'),
        axios.get('/api/mutations'),
        axios.get('/api/kategori-biaya')
      ]);

      setAccounts(accountsRes.data);
      
      const manualDrafts = mutationsRes.data.filter((m: any) => m.tanggalCatatan !== undefined);
      setRecentDrafts(manualDrafts);

      const cashList = accountsRes.data.filter((a: any) => a.tipe_kas === 'TUNAI');
      if (cashList.length > 0 && !sourceAccountId) {
        setSourceAccountId(cashList[0].account_id);
      }

      setCategories(categoriesRes.data.data || []);
      if (categoriesRes.data.data && categoriesRes.data.data.length > 0 && !kategoriBiaya) {
        setKategoriBiaya(categoriesRes.data.data[0].nama);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat master data keuangan dari server.', 'error');
    }
  };

  // Fetch Queue Data
  const fetchQueueData = useCallback(async () => {
    try {
      setIsQueueLoading(true);
      const res = await axios.get('/api/pengajuan-pencairan?tab=queue');
      if (res.data.status === 'success') {
        setQueueList(res.data.data);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat antrean pengajuan pencairan.', 'error');
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectData();
    fetchQueueData();
  }, [fetchQueueData]);

  const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);
  const numericNominal = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
  const isOverdrawn = selectedAccount ? numericNominal > selectedAccount.saldo : false;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setNominal(rawVal);
  };

  // Submit Direct Draft
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAccountId) {
      showToast('Silakan pilih akun laci kas atau bank sumber.', 'error');
      return;
    }
    if (numericNominal <= 0) {
      showToast('Nominal transaksi harus lebih besar dari Rp 0.', 'error');
      return;
    }
    if (isOverdrawn) {
      showToast(`Saldo kas tidak mencukupi! Akun hanya memiliki Rp ${Number(selectedAccount?.saldo).toLocaleString('id-ID')}`, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        sourceAccountId,
        type: 'KREDIT',
        nominal: numericNominal,
        keterangan: keterangan,
        tanggalTransaksi,
        tanggalCatatan,
        kategoriBiaya
      };

      const res = await axios.post('/api/finance/manual-expense', payload);
      if (res.data.success) {
        showToast(res.data.message || 'Transaksi gantung berhasil disimpan.', 'success');
        setNominal('');
        setKeterangan('');
        await fetchDirectData();
      } else {
        showToast(res.data.error || 'Gagal menyimpan transaksi gantung.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan transaksi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Process Payout Disbursement
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem || !payoutBankAccountId) {
      alert('Pilih rekening bank pembayar terlebih dahulu.');
      return;
    }

    const payAcc = accounts.find(a => a.account_id === payoutBankAccountId);
    if (payAcc && Number(payAcc.saldo) < Number(selectedQueueItem.nominal)) {
      alert('Saldo rekening terpilih tidak mencukupi.');
      return;
    }

    try {
      setIsPayoutSubmitLoading(true);
      const res = await axios.post(`/api/pengajuan-pencairan/${selectedQueueItem.id}/disburse`, {
        actorId: user?.id,
        bankAccountId: payoutBankAccountId,
        sumberDana: payoutSumberDana,
        catatan: payoutCatatan || 'Pencairan operasional disetujui kasir.'
      });

      if (res.data.status === 'success') {
        showToast('Dana berhasil dicairkan & Jurnal otomatis terbentuk!', 'success');
        setSelectedQueueItem(null);
        setPayoutCatatan('');
        setPayoutBankAccountId('');
        fetchQueueData();
        fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal mencairkan dana.');
    } finally {
      setIsPayoutSubmitLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const filteredDrafts = recentDrafts.filter(dr => {
    const matchesAccount = filterAccountId === 'ALL' || dr.bankAccountId === filterAccountId;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesAccount;
    
    const matchesQuery = (dr.keteranganBank || '').toLowerCase().includes(query) ||
      (dr.bankName || '').toLowerCase().includes(query) ||
      (dr as any).kategori_biaya && ((dr as any).kategori_biaya || '').toLowerCase().includes(query) ||
      dr.nominal.toString().includes(query);

    return matchesAccount && matchesQuery;
  });

  const selectedPayoutAccount = accounts.find(a => a.account_id === payoutBankAccountId);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Toast Notification */}
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

      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Pengeluaran Manual</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Pencatatan Pengeluaran Manual
        </h2>
        <p className="text-slate-500 font-medium">
          Catat pengeluaran tunai secara manual atau proses antrean pengajuan operasional non-proposal.
        </p>
      </motion.div>

      {/* Desktop View */}
      <div className="hidden md:block space-y-8">
        {/* Sub-tabs Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('langsung')}
            className={cn(
              "py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2",
              activeSubTab === 'langsung' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-650"
            )}
          >
            <FileText className="size-4" /> Pencatatan Langsung (Kas Kecil)
          </button>
          <button
            onClick={() => setActiveSubTab('antrean')}
            className={cn(
              "py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 relative",
              activeSubTab === 'antrean' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-650"
            )}
          >
            <ListOrdered className="size-4" /> Antrean Pengajuan Pencairan
            {queueList.length > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-white text-[9px] font-black rounded-full size-4 flex items-center justify-center animate-pulse">
                {queueList.length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'langsung' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Column (Left 2 Columns) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 md:p-8 space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    Formulir Pencatatan Pengeluaran Manual (Draft)
                  </h3>
                  {renderFormContent(false)}
                </div>
              </div>

              {/* Right Column: Saldo info */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 space-y-4">
                  <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Coins className="size-4 text-primary" />
                    Saldo Laci Kas (Tunai)
                  </h4>
                  <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                      <div key={acc.account_id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-700">{acc.nama_akun}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">COA: {acc.coa_code}</p>
                        </div>
                        <p className="font-black text-slate-900">Rp {Number(acc.saldo).toLocaleString('id-ID')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Direct recent drafts table - Widened to span full width */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900">Riwayat Draf Transaksi Terkini</h3>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input
                      type="text"
                      placeholder="Cari transaksi..."
                      className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFilterAccountDropdownOpen(!isFilterAccountDropdownOpen)}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 text-xs font-bold text-slate-700 cursor-pointer h-[34px]"
                    >
                      <Filter className="size-3.5 text-slate-400" />
                      <span>
                        {filterAccountId === 'ALL' 
                          ? 'Semua Akun Kas' 
                          : accounts.find(a => a.account_id === filterAccountId)?.nama_akun || 'Semua Akun Kas'
                        }
                      </span>
                      <ChevronDown className="size-3 text-slate-400 shrink-0" />
                    </button>

                  {isFilterAccountDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsFilterAccountDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterAccountId('ALL');
                            setIsFilterAccountDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50"
                        >
                          Semua Akun Kas
                        </button>
                        {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                          <button
                            key={acc.account_id}
                            type="button"
                            onClick={() => {
                              setFilterAccountId(acc.account_id);
                              setIsFilterAccountDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50"
                          >
                            {acc.nama_akun}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/20 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400">Tanggal Catat</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400">Sumber Kas</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400">Keterangan</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 text-right">Nominal</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredDrafts.map(dr => (
                      <tr key={dr.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-slate-500 font-medium">{new Date(dr.tanggalCatatan).toLocaleDateString('id-ID')}</td>
                        <td className="px-6 py-3 font-semibold text-slate-700">{dr.bankName}</td>
                        <td className="px-6 py-3 text-slate-900 truncate max-w-xs">
                          <span className="block font-bold">{dr.keteranganBank}</span>
                          {(dr as any).kategori_biaya && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                              {(dr as any).kategori_biaya}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right font-black text-slate-900">Rp {dr.nominal.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-bold text-[10px]",
                            dr.status === 'RECONCILED' 
                              ? "bg-slate-100 text-slate-500" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          )}>
                            {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : dr.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Queue Tab: Approved Requests List */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="size-5 text-primary" />
                Antrean Pembayaran Pengajuan Operasional (Approved)
              </h3>
            </div>

            {isQueueLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">Loading antrean...</div>
            ) : queueList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 space-y-2">
                <CheckCircle2 className="size-10 text-emerald-400" />
                <p className="text-xs font-semibold">Semua antrean pengajuan operasional selesai diproses!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-black text-slate-400">
                      <th className="py-3 px-3">No Pengajuan</th>
                      <th className="py-3 px-3">Pengaju</th>
                      <th className="py-3 px-3">Kategori & Keperluan</th>
                      <th className="py-3 px-3">Link RKAT</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {queueList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs text-slate-800">{item.no_pengajuan}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-700">{item.pengaju?.name}</p>
                          <p className="text-[9px] text-slate-400">{item.pengaju?.role.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold text-[9px] mb-1 inline-block">
                            {item.kategori_biaya}
                          </span>
                          <p className="font-medium text-slate-600 truncate max-w-xs">{item.keterangan}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-555">
                          {item.rkat ? `(${item.rkat.no}) ${item.rkat.nama}` : <span className="italic text-slate-400 font-normal">Direct Expense</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">{formatRupiah(Number(item.nominal))}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedQueueItem(item);
                              setPayoutSumberDana('AMIL');
                              setPayoutBankAccountId(accounts[0]?.account_id || '');
                            }}
                            className="bg-primary hover:bg-primary/95 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-all"
                          >
                            <Send className="size-3" /> Cairkan Dana
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-6">
        {/* 1. Antrean Pengajuan Pencairan (List) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ListOrdered className="size-4.5 text-primary" />
              Antrean Pengajuan ({queueList.length})
            </h3>
          </div>

          {isQueueLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">Memuat antrean...</div>
          ) : queueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-6 space-y-2">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-[11px] font-bold">Semua antrean selesai diproses!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {queueList.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-slate-500 font-bold">{item.no_pengajuan}</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      {item.kategori_biaya}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <p className="font-bold text-slate-900">{item.pengaju?.name}</p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">{item.keterangan}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black">Nominal</p>
                      <p className="font-black text-slate-950 text-xs">{formatRupiah(Number(item.nominal))}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedQueueItem(item);
                        setPayoutSumberDana('AMIL');
                        setPayoutBankAccountId(accounts[0]?.account_id || '');
                      }}
                      className="bg-primary hover:bg-primary/95 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Send className="size-3" /> Cairkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Saldo Laci Kas */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Coins className="size-4.5 text-primary" />
            Saldo Laci Kas (Tunai)
          </h4>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
              <div key={acc.account_id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-700">{acc.nama_akun}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">COA: {acc.coa_code}</p>
                </div>
                <p className="font-black text-slate-900">Rp {Number(acc.saldo).toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Riwayat Draf */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <History className="size-4.5 text-primary" />
              <h4 className="text-xs font-black text-slate-900">Riwayat Draf Transaksi Terkini</h4>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Tidak ada riwayat draf.</div>
            ) : (
              filteredDrafts.map(dr => (
                <div key={dr.id} className="p-4 text-xs space-y-2 hover:bg-slate-50/20 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>{new Date(dr.tanggalCatatan).toLocaleDateString('id-ID')}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-bold text-[9px]",
                      dr.status === 'RECONCILED' 
                        ? "bg-slate-100 text-slate-500" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    )}>
                      {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : dr.status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    <p className="font-bold text-slate-900">{dr.keteranganBank}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sumber: {dr.bankName}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                      {(dr as any).kategori_biaya || 'Operasional'}
                    </span>
                    <span className="font-black text-slate-950 text-xs">Rp {dr.nominal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB (Floating Action Button) - mobile only */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/95 active:scale-95 transition-all cursor-pointer border-none outline-none"
        >
          <Plus className="size-7" />
        </button>
      </div>

      {/* Form Modal for Mobile */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-150 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="size-4.5 text-primary" />
                  Formulir Pencatatan Pengeluaran
                </h3>
                <button 
                  onClick={() => setIsFormModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-650 p-1 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {renderFormContent(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Processing Dialog Modal */}
      {selectedQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base">Proses Pencairan Operasional</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{selectedQueueItem.no_pengajuan}</p>
              </div>
              <button 
                onClick={() => setSelectedQueueItem(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Pengaju</span>
                  <span className="font-bold text-slate-700">{selectedQueueItem.pengaju?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Nominal</span>
                  <span className="font-black text-primary text-sm">{formatRupiah(Number(selectedQueueItem.nominal))}</span>
                </div>
                <div className="border-t border-slate-200/60 pt-2 text-xs">
                  <span className="text-slate-400 font-bold block mb-0.5">Keperluan</span>
                  <p className="font-medium text-slate-650 italic">"{selectedQueueItem.keterangan}"</p>
                </div>
              </div>

              {/* Rekening Pembayar Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Akun Kas / Bank Pembayar</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPayoutDropdownOpen(!isPayoutDropdownOpen)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>
                      {selectedPayoutAccount 
                        ? `${selectedPayoutAccount.nama_akun} - Balance: [${formatRupiah(Number(selectedPayoutAccount.saldo))}]`
                        : '-- Pilih Rekening Pembayar --'
                      }
                    </span>
                    <ChevronDown className="size-4 text-slate-400" />
                  </button>

                  {isPayoutDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsPayoutDropdownOpen(false)} />
                      <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                        {accounts.map(acc => (
                          <button
                            key={acc.account_id}
                            type="button"
                            onClick={() => {
                              setPayoutBankAccountId(acc.account_id);
                              setIsPayoutDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-[11px] font-semibold hover:bg-slate-50 flex items-center justify-between mb-0.5",
                              payoutBankAccountId === acc.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            <span>{acc.nama_akun} ({acc.tipe_kas})</span>
                            <span className="font-bold text-slate-900">{formatRupiah(Number(acc.saldo))}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tag Dana / Asnaf Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Sumber Dana / Tag Dana</label>
                <select
                  value={payoutSumberDana}
                  onChange={(e) => setPayoutSumberDana(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="AMIL">AMIL (Dana Operasional Lembaga)</option>
                  <option value="ZAKAT">ZAKAT</option>
                  <option value="INFAK_SEDEKAH_TERIKAT">INFAK / SEDEKAH TERIKAT</option>
                  <option value="INFAK_SEDEKAH_TIDAK_TERIKAT">INFAK / SEDEKAH TIDAK TERIKAT</option>
                </select>
              </div>

              {/* Catatan / Memo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Catatan Payout</label>
                <textarea
                  value={payoutCatatan}
                  onChange={(e) => setPayoutCatatan(e.target.value)}
                  placeholder="Catatan verifikasi pencairan oleh kasir..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex pt-2 border-t mt-4">
                <button
                  type="submit"
                  disabled={isPayoutSubmitLoading || !payoutBankAccountId}
                  className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isPayoutSubmitLoading ? 'Memproses...' : 'Cairkan & Rekam Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
