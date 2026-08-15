import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
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
  Plus,
  X,
  Search,
  ExternalLink,
  Link2,
  Receipt,
  Eye,
  Sparkles,
  Edit3,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

function toGDriveEmbedUrl(link?: string | null): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

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
  const [judulPengeluaran, setJudulPengeluaran] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSourceAccountDropdownOpen, setIsSourceAccountDropdownOpen] = useState(false);
  const [isFilterAccountDropdownOpen, setIsFilterAccountDropdownOpen] = useState(false);
  const [isFilterMonthDropdownOpen, setIsFilterMonthDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [kategoriBiaya, setKategoriBiaya] = useState('');

  // Edit Transaction Draft States
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [editTanggalCatatan, setEditTanggalCatatan] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editJudul, setEditJudul] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editKategoriBiaya, setEditKategoriBiaya] = useState('');
  const [editNominal, setEditNominal] = useState('');
  const [editLinkNota, setEditLinkNota] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Queue tab states
  const [queueList, setQueueList] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);
  
  // Queue Payout Modal States
  const [payoutBankAccountId, setPayoutBankAccountId] = useState('');
  const [payoutSumberDana, setPayoutSumberDana] = useState('AMIL');
  const [payoutNominalRealisasi, setPayoutNominalRealisasi] = useState('');
  const [payoutLinkNota, setPayoutLinkNota] = useState('');
  const [payoutCatatan, setPayoutCatatan] = useState('');
  const [isPayoutSubmitLoading, setIsPayoutSubmitLoading] = useState(false);
  const [isPayoutDropdownOpen, setIsPayoutDropdownOpen] = useState(false);
  const [showEmbedPreview, setShowEmbedPreview] = useState(false);

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
          <label className="text-xs font-bold text-slate-700 block">
            Judul Pengeluaran *
          </label>
          <input
            type="text"
            value={judulPengeluaran}
            onChange={(e) => setJudulPengeluaran(e.target.value)}
            placeholder="Contoh: Beli Galon & Kopi Kantor"
            className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold text-slate-800"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Nominal Transaksi *
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
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
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
          <label className="text-xs font-bold text-slate-700 block">Keterangan / Rincian Pengeluaran</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Detail rincian barang, nomor nota/bon, atau catatan tambahan..."
            className="w-full h-24 p-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
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
    if (!numericNominal || numericNominal <= 0 || (!judulPengeluaran && !keterangan)) {
      showToast('Mohon lengkapi judul pengeluaran dan nominal transaksi.', 'error');
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
        judul: judulPengeluaran.trim(),
        keterangan: keterangan.trim(),
        tanggalTransaksi,
        tanggalCatatan,
        kategoriBiaya
      };

      const res = await axios.post('/api/finance/manual-expense', payload);
      if (res.data.success) {
        showToast(res.data.message || 'Transaksi gantung berhasil disimpan.', 'success');
        setJudulPengeluaran('');
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

  // Open Edit Modal for Riwayat Transaksi
  const openEditModal = (dr: any) => {
    setEditingDraft(dr);
    setEditTanggalCatatan(dr.tanggalCatatan || dr.tanggal || new Date().toISOString().split('T')[0]);
    setEditBankAccountId(dr.bankAccountId || '');
    setEditJudul((dr as any).judul || dr.keteranganBank || '');
    setEditKeterangan((dr as any).keterangan || '');
    setEditKategoriBiaya((dr as any).kategori_biaya || (categories[0]?.nama || 'Lain-lain'));
    setEditNominal(String(dr.nominal || 0));
    setEditLinkNota((dr as any).link_nota || '');
  };

  // Submit Edit Riwayat Transaksi
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    const parsedNominal = parseFloat(editNominal.replace(/[^0-9]/g, '')) || 0;
    if (parsedNominal <= 0) {
      showToast('Nominal transaksi harus lebih besar dari Rp 0.', 'error');
      return;
    }

    try {
      setIsEditLoading(true);
      const res = await axios.put(`/api/mutations/${editingDraft.id}`, {
        tanggalCatatan: editTanggalCatatan,
        bankAccountId: editBankAccountId,
        judul: editJudul.trim(),
        keterangan: editKeterangan.trim(),
        kategori_biaya: editKategoriBiaya,
        nominal: parsedNominal,
        link_nota: editLinkNota ? editLinkNota.trim() : null
      });

      if (res.data.success || res.status === 200) {
        showToast('Data transaksi berhasil diperbarui!', 'success');
        setEditingDraft(null);
        await fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal memperbarui transaksi', 'error');
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete Riwayat Transaksi
  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini dari riwayat?')) {
      return;
    }

    try {
      const res = await axios.delete(`/api/mutations/${id}`);
      if (res.data.success || res.status === 200) {
        showToast('Transaksi berhasil dihapus dari riwayat.', 'success');
        await fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal menghapus transaksi', 'error');
    }
  };

  // Process Payout Disbursement
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem || !payoutBankAccountId) {
      showToast('Pilih rekening bank pembayar terlebih dahulu.', 'error');
      return;
    }

    if (!payoutLinkNota || !payoutLinkNota.trim()) {
      showToast('Tautan Google Drive bukti nota wajib diisi.', 'error');
      return;
    }

    const nominalAwal = Number(selectedQueueItem.nominal || 0);
    const parsedRiil = parseFloat(payoutNominalRealisasi.replace(/[^0-9]/g, '')) || 0;
    const nominalRiil = parsedRiil > 0 ? parsedRiil : nominalAwal;

    if (nominalRiil > nominalAwal) {
      showToast(`Nominal realisasi (${formatRupiah(nominalRiil)}) tidak boleh melebihi nominal plafon persetujuan (${formatRupiah(nominalAwal)}).`, 'error');
      return;
    }

    const payAcc = accounts.find(a => a.account_id === payoutBankAccountId);
    if (payAcc && Number(payAcc.saldo) < nominalRiil) {
      showToast(`Saldo rekening terpilih tidak mencukupi! Tersedia: ${formatRupiah(Number(payAcc.saldo))}, Dibutuhkan: ${formatRupiah(nominalRiil)}`, 'error');
      return;
    }

    const autoSumberDana = payAcc?.kelompok_dana || payoutSumberDana || 'AMIL';

    try {
      setIsPayoutSubmitLoading(true);
      const res = await axios.post(`/api/pengajuan-pencairan/${selectedQueueItem.id}/disburse`, {
        actorId: user?.id,
        bankAccountId: payoutBankAccountId,
        sumberDana: autoSumberDana,
        nominalRealisasi: nominalRiil,
        linkNota: payoutLinkNota.trim(),
        catatan: payoutCatatan || 'Pencairan operasional disetujui kasir.'
      });

      if (res.data.status === 'success') {
        showToast('Dana berhasil dicairkan & draft mutasi dikirim ke Pelaporan!', 'success');
        setSelectedQueueItem(null);
        setPayoutCatatan('');
        setPayoutBankAccountId('');
        setPayoutNominalRealisasi('');
        setPayoutLinkNota('');
        setShowEmbedPreview(false);
        fetchQueueData();
        fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal mencairkan dana.', 'error');
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

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAccountId, filterMonth]);

  const formatMonthName = (monthStr: string) => {
    if (!monthStr || monthStr === 'ALL') return 'Semua Bulan';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthNames[mIndex] || month} ${year}`;
  };

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    recentDrafts.forEach(dr => {
      const d = dr.tanggalCatatan || dr.tanggal;
      if (d && typeof d === 'string' && d.length >= 7) {
        months.add(d.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [recentDrafts]);

  const filteredDrafts = React.useMemo(() => {
    return recentDrafts.filter(dr => {
      const matchesAccount = filterAccountId === 'ALL' || dr.bankAccountId === filterAccountId;
      
      let matchesMonth = true;
      if (filterMonth !== 'ALL') {
        const d = dr.tanggalCatatan || dr.tanggal || '';
        matchesMonth = d.startsWith(filterMonth);
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesAccount && matchesMonth;
      
      const matchesQuery = (dr.keteranganBank || '').toLowerCase().includes(query) ||
        (dr.bankName || '').toLowerCase().includes(query) ||
        Boolean((dr as any).kategori_biaya && ((dr as any).kategori_biaya || '').toLowerCase().includes(query)) ||
        dr.nominal.toString().includes(query);

      return matchesAccount && matchesMonth && matchesQuery;
    });
  }, [recentDrafts, filterAccountId, filterMonth, searchQuery]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDrafts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedDrafts = filteredDrafts.slice(startIndex, startIndex + itemsPerPage);

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

            {/* Riwayat Transaksi Table - Desktop View */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <History className="size-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900">Riwayat Transaksi</h3>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {filteredDrafts.length} transaksi
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-56 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input
                      type="text"
                      placeholder="Cari transaksi..."
                      className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Bulan Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFilterMonthDropdownOpen(!isFilterMonthDropdownOpen)}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 text-xs font-bold text-slate-700 cursor-pointer h-[34px] hover:bg-slate-50 transition-all"
                    >
                      <Calendar className="size-3.5 text-primary" />
                      <span>{formatMonthName(filterMonth)}</span>
                      <ChevronDown className="size-3 text-slate-400 shrink-0" />
                    </button>

                    {isFilterMonthDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFilterMonthDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterMonth('ALL');
                              setIsFilterMonthDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                              filterMonth === 'ALL' ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            Semua Bulan
                          </button>
                          {availableMonths.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setFilterMonth(m);
                                setIsFilterMonthDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                                filterMonth === m ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              {formatMonthName(m)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Filter Akun Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFilterAccountDropdownOpen(!isFilterAccountDropdownOpen)}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 text-xs font-bold text-slate-700 cursor-pointer h-[34px] hover:bg-slate-50 transition-all"
                    >
                      <Filter className="size-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">
                        {filterAccountId === 'ALL' 
                          ? 'Semua Akun (Kas & Bank)' 
                          : accounts.find(a => a.account_id === filterAccountId)?.nama_akun || 'Semua Akun'
                        }
                      </span>
                      <ChevronDown className="size-3 text-slate-400 shrink-0" />
                    </button>

                    {isFilterAccountDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFilterAccountDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterAccountId('ALL');
                              setIsFilterAccountDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                              filterAccountId === 'ALL' ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            Semua Akun (Kas & Bank)
                          </button>
                          {accounts.filter(acc => acc.tipe_kas === 'TUNAI' || acc.tipe_kas === 'BANK').map(acc => (
                            <button
                              key={acc.account_id}
                              type="button"
                              onClick={() => {
                                setFilterAccountId(acc.account_id);
                                setIsFilterAccountDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between",
                                filterAccountId === acc.account_id ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{acc.nama_akun}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">({acc.tipe_kas})</span>
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
                    <tr className="bg-slate-50/40 border-b border-slate-100">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Catat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sumber Kas / Bank</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judul Transaksi</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan / Rincian</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right uppercase tracking-wider">Nominal</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedDrafts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          <p className="font-semibold">Tidak ada data transaksi yang sesuai dengan filter.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedDrafts.map(dr => (
                        <tr key={dr.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                            {dr.tanggalCatatan ? new Date(dr.tanggalCatatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                            {dr.bankName}
                          </td>
                          <td className="px-5 py-3.5 text-slate-900 font-bold max-w-[200px]">
                            {(dr as any).judul || dr.keteranganBank}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-normal max-w-[220px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate max-w-[180px]">{(dr as any).keterangan || dr.keteranganBank || '-'}</span>
                              {(dr as any).link_nota && (
                                <a
                                  href={(dr as any).link_nota}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-primary bg-slate-100 hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
                                >
                                  <ExternalLink className="size-2.5" /> Nota
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {(dr as any).kategori_biaya ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                {(dr as any).kategori_biaya}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                            {formatRupiah(Number(dr.nominal))}
                          </td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full font-bold text-[10px] inline-block",
                              dr.status === 'RECONCILED' 
                                ? "bg-slate-100 text-slate-600 border border-slate-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(dr)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Transaksi"
                              >
                                <Edit3 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(dr.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <p className="font-semibold">
                  Menampilkan <span className="font-bold text-slate-800">{filteredDrafts.length > 0 ? startIndex + 1 : 0}</span> - <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredDrafts.length)}</span> dari <span className="font-bold text-slate-800">{filteredDrafts.length}</span> transaksi
                </p>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            safeCurrentPage === page
                              ? "bg-primary text-white shadow-sm"
                              : "border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Queue Tab: Approved Requests List */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="size-5 text-primary" />
                Antrean Pembayaran Pengajuan Operasional (Disetujui)
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
                    <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">No Pengajuan</th>
                      <th className="py-3 px-3">Pengaju</th>
                      <th className="py-3 px-3">Judul Pengajuan</th>
                      <th className="py-3 px-3">Keterangan / Rincian</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3">Link RKAT</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {queueList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs text-slate-800 whitespace-nowrap">{item.no_pengajuan}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-700">{item.pengaju?.name}</p>
                          <p className="text-[9px] text-slate-400">{item.pengaju?.role.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-900 font-bold max-w-[180px]">
                          {item.judul || item.keterangan}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-normal max-w-[200px] truncate">
                          {item.keterangan || '-'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            {item.kategori_biaya}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {item.rkat ? `(${item.rkat.no}) ${item.rkat.nama}` : <span className="italic text-slate-400 font-normal">Direct Expense</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                          {formatRupiah(Number(item.nominal))}
                          {item.link_nota && (
                            <a
                              href={item.link_nota}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center justify-end gap-1 font-semibold mt-0.5"
                            >
                              <ExternalLink className="size-2.5" /> Ada Nota
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedQueueItem(item);
                              setPayoutNominalRealisasi(Number(item.nominal).toString());
                              setPayoutLinkNota(item.link_nota || '');
                              setPayoutSumberDana(item.sumber_dana || 'AMIL');
                              setPayoutCatatan('');
                              const defaultPayAcc = accounts.find(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK');
                              setPayoutBankAccountId(defaultPayAcc?.account_id || accounts[0]?.account_id || '');
                              setShowEmbedPreview(false);
                            }}
                            className="bg-primary hover:bg-primary/95 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-all cursor-pointer shadow-sm"
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
                        setPayoutNominalRealisasi(Number(item.nominal).toString());
                        setPayoutLinkNota(item.link_nota || '');
                        setPayoutSumberDana(item.sumber_dana || 'AMIL');
                        setPayoutCatatan('');
                        const defaultPayAcc = accounts.find(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK');
                        setPayoutBankAccountId(defaultPayAcc?.account_id || accounts[0]?.account_id || '');
                        setShowEmbedPreview(false);
                      }}
                      className="bg-primary text-white font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <Send className="size-2.5" /> Cairkan
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

        {/* 3. Riwayat Transaksi Mobile */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4.5 text-primary" />
                <h4 className="text-xs font-black text-slate-900">Riwayat Transaksi</h4>
              </div>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                {filteredDrafts.length} total
              </span>
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

            <div className="flex gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">Semua Bulan</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))}
              </select>

              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">Semua Akun</option>
                {accounts.filter(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK').map(a => (
                  <option key={a.account_id} value={a.account_id}>{a.nama_akun}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {paginatedDrafts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Tidak ada riwayat transaksi.</div>
            ) : (
              paginatedDrafts.map(dr => (
                <div key={dr.id} className="p-4 text-xs space-y-2 hover:bg-slate-50/20 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>{dr.tanggalCatatan ? new Date(dr.tanggalCatatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-bold text-[9px]",
                      dr.status === 'RECONCILED' 
                        ? "bg-slate-100 text-slate-500" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    )}>
                      {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : 'Pending'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    <p className="font-bold text-slate-900">{dr.keteranganBank}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">{dr.bankName}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div>
                      {(dr as any).kategori_biaya && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                          {(dr as any).kategori_biaya}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-slate-900 font-mono text-xs">{formatRupiah(Number(dr.nominal))}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <span className="text-[11px] font-bold">Hal {safeCurrentPage} dari {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40 text-xs font-bold"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40 text-xs font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
      {selectedQueueItem && (() => {
        const nominalAwal = Number(selectedQueueItem.nominal || 0);
        const parsedRiil = parseFloat(payoutNominalRealisasi.replace(/[^0-9]/g, '')) || 0;
        const nominalRiil = parsedRiil > 0 ? parsedRiil : 0;
        const isExceeded = nominalRiil > nominalAwal;
        const selisihHemat = nominalAwal - nominalRiil;
        const persenHemat = (nominalAwal > 0 && selisihHemat > 0) ? (selisihHemat / nominalAwal) * 100 : 0;
        const gdriveEmbed = toGDriveEmbedUrl(payoutLinkNota);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight">Proses Pencairan & Input Nota</h3>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">{selectedQueueItem.no_pengajuan}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedQueueItem(null)}
                  className="p-1.5 hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                {/* Ringkasan Pengajuan Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Judul Pengajuan:</span>
                    <span className="font-bold text-slate-800 text-right max-w-xs">{selectedQueueItem.judul || selectedQueueItem.keterangan}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Pemohon / Pengaju:</span>
                    <span className="font-bold text-slate-800">{selectedQueueItem.pengaju?.name} <span className="text-slate-400 text-[10px]">({selectedQueueItem.pengaju?.role?.replace(/_/g, ' ')})</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Kategori Biaya:</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px]">{selectedQueueItem.kategori_biaya}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Plafon Disetujui:</span>
                    <span className="font-black text-slate-900 text-sm font-mono">{formatRupiah(nominalAwal)}</span>
                  </div>
                  <div className="border-t border-slate-200/80 pt-2 text-xs">
                    <span className="text-slate-400 font-bold block mb-0.5 text-[10px] uppercase tracking-wider">Keterangan / Rincian</span>
                    <p className="font-medium text-slate-700 italic">"{selectedQueueItem.keterangan || '-'}"</p>
                  </div>
                </div>

                {/* Field 1: Nominal Pencairan Riil (Sesuai Nota) */}
                <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Coins className="size-4 text-primary" />
                      Nominal Pencairan Riil (Sesuai Nota / Kwitansi) *
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">Maks: {formatRupiah(nominalAwal)}</span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                    <input
                      type="text"
                      required
                      value={payoutNominalRealisasi ? Number(payoutNominalRealisasi.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setPayoutNominalRealisasi(raw);
                      }}
                      placeholder="Masukkan nominal sesuai nota belanja..."
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-black font-mono focus:ring-2 outline-none transition-all",
                        isExceeded 
                          ? "border-rose-300 text-rose-600 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-500" 
                          : "border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary"
                      )}
                    />
                  </div>

                  {/* Indikator Hemat / Alert Exceeded */}
                  {isExceeded ? (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 mt-1">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>Nominal riil tidak boleh melebihi plafon persetujuan awal ({formatRupiah(nominalAwal)}).</span>
                    </div>
                  ) : selisihHemat > 0 ? (
                    <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold mt-1">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
                        <span>Efisiensi / Penghematan Anggaran:</span>
                      </span>
                      <span className="font-mono text-emerald-700 font-black">Hemat {formatRupiah(selisihHemat)} ({persenHemat.toFixed(1)}%)</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Nominal pencairan penuh sesuai plafon persetujuan.</p>
                  )}
                </div>

                {/* Field 2: Tautan Google Drive Bukti Foto Nota */}
                <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Link2 className="size-4 text-primary" />
                      Tautan Google Drive Bukti Nota *
                    </label>
                    {payoutLinkNota && (
                      <a
                        href={payoutLinkNota}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 cursor-pointer"
                      >
                        <ExternalLink className="size-3" /> Buka di Drive
                      </a>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={payoutLinkNota}
                      onChange={(e) => setPayoutLinkNota(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... atau link cloud nota"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* GDrive Live Preview Option */}
                  {gdriveEmbed && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowEmbedPreview(!showEmbedPreview)}
                        className="text-[11px] font-bold text-slate-600 hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                        {showEmbedPreview ? 'Sembunyikan Pratinjau Nota' : 'Lihat Pratinjau Foto Nota'}
                      </button>

                      {showEmbedPreview && (
                        <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-56 w-full">
                          <iframe
                            src={gdriveEmbed}
                            className="w-full h-full bg-slate-100"
                            title="Pratinjau Nota Google Drive"
                            allow="autoplay"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Field 3: Rekening Pembayar Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Akun Kas / Bank Pembayar *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPayoutDropdownOpen(!isPayoutDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <span>
                        {selectedPayoutAccount 
                          ? `${selectedPayoutAccount.nama_akun} - Saldo: [${formatRupiah(Number(selectedPayoutAccount.saldo))}]`
                          : '-- Pilih Rekening Pembayar --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400" />
                    </button>

                    {isPayoutDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPayoutDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {accounts.filter(acc => acc.tipe_kas === 'TUNAI' || acc.tipe_kas === 'BANK').map(acc => (
                            <button
                              key={acc.account_id}
                              type="button"
                              onClick={() => {
                                setPayoutBankAccountId(acc.account_id);
                                setIsPayoutDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-between mb-1 cursor-pointer",
                                payoutBankAccountId === acc.account_id ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-slate-700"
                              )}
                            >
                              <span>{acc.nama_akun} ({acc.tipe_kas})</span>
                              <span className="font-black text-slate-900 font-mono">{formatRupiah(Number(acc.saldo))}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Field 4: Catatan / Memo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Catatan Pencairan Kasir (Opsional)</label>
                  <textarea
                    value={payoutCatatan}
                    onChange={(e) => setPayoutCatatan(e.target.value)}
                    placeholder="Catatan verifikasi pencairan, nomor tanda terima, dll..."
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedQueueItem(null)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPayoutSubmitLoading || !payoutBankAccountId || isExceeded}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    {isPayoutSubmitLoading ? 'Memproses Pencairan...' : `Cairkan Dana (${formatRupiah(nominalRiil)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Edit Transaksi Riwayat */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900">Edit Data Transaksi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {/* Tanggal */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Tanggal Catatan *</label>
                  <input
                    type="date"
                    required
                    value={editTanggalCatatan}
                    onChange={(e) => setEditTanggalCatatan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Sumber Kas / Bank */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Sumber Kas / Bank *</label>
                  <select
                    required
                    value={editBankAccountId}
                    onChange={(e) => setEditBankAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {accounts.filter(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK').map(a => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.nama_akun} ({a.tipe_kas}) - Saldo: {formatRupiah(Number(a.saldo))}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Judul Transaksi */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Judul Transaksi *</label>
                  <input
                    type="text"
                    required
                    value={editJudul}
                    onChange={(e) => setEditJudul(e.target.value)}
                    placeholder="Contoh: Beli Galon & Kopi Kantor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Nominal */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Nominal (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                    <input
                      type="text"
                      required
                      value={editNominal ? parseInt(editNominal.replace(/[^0-9]/g, '') || '0').toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setEditNominal(raw);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black font-mono text-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Kategori Biaya */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Kategori Biaya *</label>
                  <select
                    value={editKategoriBiaya}
                    onChange={(e) => setEditKategoriBiaya(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.nama}>{cat.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Keterangan */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Keterangan / Rincian Tambahan</label>
                  <textarea
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    rows={2}
                    placeholder="Rincian barang, catatan transaksi..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Link Nota */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Tautan Google Drive Bukti Nota (Opsional)</label>
                  <input
                    type="url"
                    value={editLinkNota}
                    onChange={(e) => setEditLinkNota(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingDraft(null)}
                    className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isEditLoading}
                    className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold shadow-md shadow-primary/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="size-4" />
                    {isEditLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
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

