import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useWindowFocusRefetch } from '../hooks/useWindowFocusRefetch';
import {
  ArrowRightLeft,
  Search,
  User,
  AlertTriangle,
  Building,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  ArrowDownLeft,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  BookOpen,
  Edit3
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

export interface RkatProgram {
  id: string;
  no: string;
  kategori: string;
  nama_program: string;
  coa_codes?: string;
  pagu: number;
}

export interface BankMutation {
  id: string;
  tanggal: string;
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
  rkatId?: string;
  sumberDana?: string;
  keteranganRealisasi?: string;
}

export interface Muzakki {
  id: string;
  nama: string;
  nik?: string;
  npwz?: string;
  kategori: 'Perorangan' | 'Lembaga';
  handphone?: string;
  telepon?: string;
  alamat?: string;
}

export interface RkatOptionItem {
  id: string;
  value: string;
  code?: string;
  name: string;
  keterangan?: string;
  categoryOrPilar?: string;
  asnaf?: string;
  coaCode?: string;
  allCoaCodes?: string;
  type: 'PENERIMAAN' | 'PENYALURAN' | 'OPERASIONAL';
}

interface SearchableRkatDropdownProps {
  label: string;
  selectedValue: string;
  onChange: (value: string, item?: RkatOptionItem) => void;
  options: RkatOptionItem[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

const SearchableRkatDropdown: React.FC<SearchableRkatDropdownProps> = ({
  label,
  selectedValue,
  onChange,
  options,
  placeholder = "Cari kegiatan, program, atau keterangan...",
  allowEmpty = true,
  emptyLabel = "-- Pilih Kegiatan RKAT --",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(opt =>
      (opt.name || '').toLowerCase().includes(term) ||
      (opt.code && opt.code.toLowerCase().includes(term)) ||
      (opt.keterangan && opt.keterangan.toLowerCase().includes(term)) ||
      (opt.categoryOrPilar && opt.categoryOrPilar.toLowerCase().includes(term)) ||
      (opt.asnaf && opt.asnaf.toLowerCase().includes(term)) ||
      (opt.coaCode && opt.coaCode.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.value === selectedValue || o.id === selectedValue);

  return (
    <div className="space-y-1.5 relative text-left" ref={dropdownRef}>
      <label className="text-[10px] font-black text-slate-400 block">{label}</label>

      {/* Selector Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm("");
          }
        }}
        className={cn(
          "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary outline-none transition-all pr-8 relative cursor-pointer",
          disabled && "cursor-not-allowed bg-slate-100 opacity-60",
          isOpen && "ring-2 ring-primary/20 border-primary bg-white shadow-sm"
        )}
      >
        {selectedOption ? (
          <div className="space-y-1 pr-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border",
                selectedOption.type === 'PENYALURAN' ? "bg-blue-50 text-blue-700 border-blue-200" :
                selectedOption.type === 'OPERASIONAL' ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {selectedOption.categoryOrPilar || selectedOption.type}
              </span>

              {selectedOption.asnaf && selectedOption.asnaf !== 'Semua' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border-purple-200">
                  {selectedOption.asnaf}
                </span>
              )}

              {selectedOption.coaCode && (
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border-emerald-200">
                  COA: {selectedOption.coaCode}
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 text-xs leading-snug break-words">
              {selectedOption.name}
            </p>

            {selectedOption.keterangan && selectedOption.keterangan !== selectedOption.name && (
              <p className="text-[10.5px] text-slate-500 font-medium leading-tight line-clamp-2">
                {selectedOption.keterangan}
              </p>
            )}
          </div>
        ) : (
          <span className="text-slate-400 font-normal">{emptyLabel}</span>
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-100">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 placeholder:text-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 mt-1.5">
              <span>{filteredOptions.length} Kegiatan RKAT Tersedia</span>
              {selectedOption && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Reset Pilihan
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-1 max-h-64 divide-y divide-slate-100">
            {allowEmpty && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={cn(
                  "p-2 rounded-xl cursor-pointer transition-colors text-xs font-semibold select-none",
                  !selectedValue ? "bg-primary/5 text-primary" : "hover:bg-slate-50 text-slate-500 italic"
                )}
              >
                {emptyLabel}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-5 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold">Kegiatan RKAT tidak ditemukan</p>
                <p className="text-[10px]">Coba kata kunci program atau kategori lain.</p>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue || opt.id === selectedValue;
                return (
                  <div
                    key={opt.value || opt.id}
                    onClick={() => {
                      onChange(opt.value || opt.id, opt);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2.5",
                      isSelected
                        ? "bg-primary/5 text-primary border border-primary/20 shadow-sm"
                        : "hover:bg-slate-50 text-slate-800"
                    )}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border",
                          opt.type === 'PENYALURAN' ? "bg-blue-50 text-blue-700 border-blue-200" :
                          opt.type === 'OPERASIONAL' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                          {opt.categoryOrPilar || opt.type}
                        </span>

                        {opt.asnaf && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {opt.asnaf}
                          </span>
                        )}

                        {opt.coaCode && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            COA: {opt.coaCode}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-slate-900 text-xs leading-snug break-words">
                        {opt.name}
                      </p>

                      {opt.keterangan && opt.keterangan !== opt.name && (
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {opt.keterangan}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <div className="p-1 bg-primary text-white rounded-full shrink-0 mt-0.5 shadow-sm">
                        <Check className="size-3" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export default function IdentifikasiMutasi() {
  const { user } = useAuth();

  // States
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [rkatList, setRkatList] = useState<RkatProgram[]>([]);
  const [coaList, setCoaList] = useState<COAItem[]>([]);
  const [muzakkiList, setMuzakkiList] = useState<Muzakki[]>([]);

  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'PENDING' | 'RECONCILED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMutation, setSelectedMutation] = useState<BankMutation | null>(null);

  // Form States - Reconcile/Identify
  const [selectedMuzakkiId, setSelectedMuzakkiId] = useState('');
  const [selectedRkatId, setSelectedRkatId] = useState('');
  const [selectedCoaCode, setSelectedCoaCode] = useState('');
  const [customKeterangan, setCustomKeterangan] = useState('');
  const [isOutsideRkat, setIsOutsideRkat] = useState(false);
  const [coaSearch, setCoaSearch] = useState('');
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);

  // Autocomplete Muzakki search
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Instant Muzakki Registration
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickKategori, setQuickKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickJenisKelamin, setQuickJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [quickHandphone, setQuickHandphone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');

  // Trigger Toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMutations, resRkat, resCoa, resMuzakki] = await Promise.all([
        axios.get('/api/mutations'),
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/finance/coa'),
        axios.get('/api/muzakki')
      ]);

      // Filter mutations to ONLY display credit/DEBIT transactions (Penerimaan)
      const creditMutations = resMutations.data.filter((m: BankMutation) => m.type !== 'KREDIT');
      setMutations(creditMutations);
      setRkatList(resRkat.data.data || []);
      setCoaList(resCoa.data || []);
      setMuzakkiList(resMuzakki.data.data || []);
    } catch (error) {
      console.error('Failed to load identification data:', error);
      showToast('Gagal memuat data!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refetch when window/tab regains focus
  useWindowFocusRefetch(fetchData);

  // Filtered Muzakki list for selection autocomplete
  const filteredMuzakkis = useMemo(() => {
    if (!muzakkiSearch) return [];
    const term = muzakkiSearch.toLowerCase();
    return muzakkiList.filter(m =>
      m.nama.toLowerCase().includes(term) ||
      (m.nik || '').includes(term) ||
      (m.npwz || '').includes(term)
    );
  }, [muzakkiList, muzakkiSearch]);

  const rkatOptions = useMemo<RkatOptionItem[]>(() => {
    return (rkatList || []).map(rkat => {
      const firstCoa = rkat.coa_codes ? rkat.coa_codes.split(',')[0].trim() : '';
      return {
        id: rkat.id,
        value: rkat.id,
        code: rkat.no || rkat.id || '',
        name: rkat.nama_program || '',
        keterangan: rkat.kategori ? `Program Pengumpulan ${rkat.kategori}` : 'Penerimaan ZIS',
        categoryOrPilar: rkat.kategori || 'Pengumpulan',
        coaCode: firstCoa,
        allCoaCodes: rkat.coa_codes || '',
        type: 'PENERIMAAN'
      };
    });
  }, [rkatList]);

  // Handle RKAT program change (auto-selects first available COA)
  const handleRkatSelect = (rkatId: string, itemObj?: RkatOptionItem) => {
    setSelectedRkatId(rkatId);
    if (!rkatId) {
      setSelectedCoaCode('');
      return;
    }
    const rkat = itemObj || rkatOptions.find(r => r.value === rkatId);
    if (rkat && rkat.coaCode) {
      setSelectedCoaCode(rkat.coaCode);
    }
  };

  // Handle Quick Register Muzakki
  const handleQuickRegisterMuzakki = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickNama || !quickAddress || !quickHandphone) {
      showToast('Nama, Handphone/Telepon, dan Alamat wajib diisi!', 'error');
      return;
    }

    try {
      const payload: any = {
        kategori: quickKategori,
        nama: quickNama,
        alamat: quickAddress,
        telepon: quickHandphone,
        status: 'Aktif'
      };

      if (quickKategori === 'Perorangan') {
        payload.nik = quickNik && quickNik.trim() ? quickNik.trim() : null;
        payload.handphone = quickHandphone;
        payload.jenis_kelamin = quickJenisKelamin;
      } else {
        payload.cp_nama = quickNama;
        payload.cp_telepon = quickHandphone;
      }

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        const newMuzakki = res.data.data;
        setMuzakkiList(prev => [newMuzakki, ...prev]);
        setSelectedMuzakkiId(newMuzakki.id);
        setMuzakkiSearch(newMuzakki.nama);
        setShowQuickRegister(false);
        setQuickNama('');
        setQuickNik('');
        setQuickHandphone('');
        setQuickAddress('');
        showToast('Muzakki berhasil didaftarkan!', 'success');
      }
    } catch (error: any) {
      console.error(error);
      showToast('Gagal meregistrasi Muzakki baru', 'error');
    }
  };

  // Filter and Search mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter(m => {
      // Status filter
      if (statusFilter === 'PENDING' && m.status !== 'PENDING') return false;
      if (statusFilter === 'RECONCILED' && m.status !== 'RECONCILED') return false;

      // Search term filter
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.keteranganBank.toLowerCase().includes(term) ||
        m.bankName.toLowerCase().includes(term) ||
        (m.muzakkiName || '').toLowerCase().includes(term) ||
        (m.coaCode || '').includes(term)
      );
    });
  }, [mutations, statusFilter, searchTerm]);

  // Metrics calculations
  const metrics = useMemo(() => {
    const pending = mutations.filter(m => m.status === 'PENDING');
    const reconciled = mutations.filter(m => m.status === 'RECONCILED');
    return {
      totalCount: mutations.length,
      totalAmount: mutations.reduce((sum, m) => sum + m.nominal, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, m) => sum + m.nominal, 0),
      reconciledCount: reconciled.length,
      reconciledAmount: reconciled.reduce((sum, m) => sum + m.nominal, 0)
    };
  }, [mutations]);

  const filteredCoasForSearch = useMemo(() => {
    const basePenerimaan = coaList.filter(c => c.klasifikasi === 'Penerimaan' || c.coa_code.startsWith('4'));
    if (!coaSearch) return basePenerimaan;
    const term = coaSearch.toLowerCase();
    return basePenerimaan.filter(coa =>
      coa.coa_code.toLowerCase().includes(term) ||
      coa.nama_akun.toLowerCase().includes(term)
    );
  }, [coaList, coaSearch]);

  // Open Identification Modal
  const openIdentificationModal = (m: BankMutation) => {
    setSelectedMutation(m);
    const hasData = Boolean(
      m.status === 'RECONCILED' ||
      m.coaCode ||
      m.rkatId ||
      m.muzakkiId ||
      m.keteranganRealisasi
    );

    if (hasData) {
      setSelectedMuzakkiId(m.muzakkiId || '');
      setMuzakkiSearch(m.muzakkiName || '');
      setSelectedRkatId(m.rkatId || '');
      setSelectedCoaCode(m.coaCode || '');
      setCustomKeterangan(m.keteranganRealisasi || '');
      setIsOutsideRkat(!m.rkatId && Boolean(m.coaCode));
    } else {
      setSelectedMuzakkiId('');
      setSelectedRkatId('');
      setSelectedCoaCode('');
      setMuzakkiSearch('');
      setCustomKeterangan('');
      setIsOutsideRkat(false);
    }
    setShowQuickRegister(false);
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Submit Identification
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutation) return;

    const needsRkat = !isOutsideRkat;
    if (!selectedMuzakkiId || (needsRkat && !selectedRkatId) || !selectedCoaCode) {
      showToast(
        needsRkat
          ? 'Muzakki, Kegiatan RKAT, dan Program Kegiatan (COA) wajib diisi!'
          : 'Muzakki dan Program Kegiatan (COA) wajib diisi!',
        'error'
      );
      return;
    }

    try {
      const payload = {
        muzakkiId: selectedMuzakkiId,
        rkatId: needsRkat ? selectedRkatId : null,
        coaCode: selectedCoaCode,
        userName: user?.name || user?.role || 'Staff Pengumpulan',
        keterangan: customKeterangan.trim() || undefined
      };

      await axios.post(`/api/mutations/${selectedMutation.id}/identify-penerimaan`, payload);

      showToast('Mutasi berhasil diidentifikasi & dimasukkan ke Antrean SIMBA!', 'success');
      setIsModalOpen(false);
      fetchData(); // Reload mutations and status
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Gagal mengidentifikasi mutasi bank', 'error');
    }
  };

  const handleDeleteMutation = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus mutasi bank ini?')) return;
    try {
      await axios.delete(`/api/mutations/${id}`);
      showToast('Mutasi bank berhasil dihapus!', 'success');
      fetchData();
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Gagal menghapus mutasi', 'error');
    }
  };

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
            {toast.type === 'success' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertCircle className="size-5 text-rose-600" />}
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
          <span className="text-slate-400 shrink-0">Pengumpulan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Identifikasi Mutasi</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Identifikasi Mutasi
        </h2>
        <p className="text-slate-500 font-medium">
          Mengidentifikasi data mutasi rekening koran uang masuk untuk alokasi dana ZIS.
        </p>
      </motion.div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="size-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="size-6 animate-pulse" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Uang Masuk Belum Diidentifikasi</p>
            <p className="text-lg font-black text-slate-950 mt-1">{formatCurrency(metrics.pendingAmount)}</p>
            <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.pendingCount} Mutasi Menunggu
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
            <Check className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Uang Masuk Sudah Diidentifikasi</p>
            <p className="text-lg font-black text-slate-950 mt-1">{formatCurrency(metrics.reconciledAmount)}</p>
            <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.reconciledCount} Mutasi Sukses Diidentifikasi
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Mutasi Penerimaan</p>
            <p className="text-lg font-black text-slate-950 mt-1">{formatCurrency(metrics.totalAmount)}</p>
            <span className="block text-[10px] font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
              {metrics.totalCount} Aliran Kas Terdaftar
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          {(['PENDING', 'RECONCILED', 'SEMUA'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-6 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
                statusFilter === tab
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'
              )}
            >
              {tab === 'PENDING' && <ArrowDownLeft className="size-4 text-amber-500" />}
              {tab === 'RECONCILED' && <Check className="size-4 text-emerald-500" />}
              {tab === 'PENDING' ? 'Belum Diidentifikasi' : tab === 'RECONCILED' ? 'Sudah Diidentifikasi' : 'Semua Mutasi'}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Cari keterangan mutasi bank, nominal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Bank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Mutasi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal Masuk</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Alokasi</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
                      Memuat data mutasi...
                    </span>
                  </td>
                </tr>
              ) : filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    Tidak ada mutasi penerimaan yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                filteredMutations.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-5 font-mono text-xs text-slate-600 font-bold">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Building className="size-3.5 text-slate-400" />
                        {item.bankName}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-850 max-w-sm truncate" title={item.keteranganBank}>
                      {item.keteranganBank}
                    </td>
                    <td className="px-6 py-5 text-right font-black font-mono text-emerald-700">
                      {formatCurrency(item.nominal)}
                    </td>
                    <td className="px-6 py-5">
                      {item.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="size-3" /> Belum Diidentifikasi
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <Check className="size-3" /> Teridentifikasi
                          </span>
                          {item.muzakkiName && (
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
                    <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                      {item.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => openIdentificationModal(item)}
                            className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-lg text-xs font-black transition-all active:scale-95 uppercase tracking-wider"
                          >
                            Identifikasi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMutation(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-55 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                            title="Hapus Mutasi"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold italic">
                            Oleh: {item.reconciledBy || 'Sistem'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openIdentificationModal(item)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary border border-transparent rounded-lg transition-all"
                            title="Edit Identifikasi"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMutation(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-55 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                            title="Hapus Mutasi"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: IDENTIFY MUTATION */}
      <AnimatePresence>
        {isModalOpen && selectedMutation && (
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
                  Identifikasi Mutasi Rekening Koran Bank
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="bg-amber-50 p-4 border-b border-amber-100 text-amber-800 text-[11px] font-bold space-y-1">
                <p>📌 Rekening Bank: {selectedMutation.bankName}</p>
                <p>💬 Keterangan Mutasi: "{selectedMutation.keteranganBank}"</p>
                <p>💰 Jumlah Nominal: {formatCurrency(selectedMutation.nominal)}</p>
                <p>📅 Tanggal Mutasi: {new Date(selectedMutation.tanggal).toLocaleDateString('id-ID')}</p>
              </div>

              <form onSubmit={handleIdentify} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">

                {/* 1. Muzakki Autocomplete Search or Quick Register */}
                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickRegister(!showQuickRegister)}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="size-3" />
                      {showQuickRegister ? "Batal Register" : "+ Registrasi Cepat Muzakki"}
                    </button>
                  </div>

                  {showQuickRegister ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-1">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">Registrasi Muzakki Instan</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickKategori('Perorangan')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Perorangan' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Perorangan
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickKategori('Lembaga')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Lembaga' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Lembaga
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nama Lengkap / Lembaga *"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                        value={quickNama}
                        onChange={(e) => setQuickNama(e.target.value)}
                      />
                      {quickKategori === 'Perorangan' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="NIK (KTP)"
                            className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                            value={quickNik}
                            onChange={(e) => setQuickNik(e.target.value)}
                          />
                          <select
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-slate-650"
                            value={quickJenisKelamin}
                            onChange={(e) => setQuickJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="No Handphone *"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                        value={quickHandphone}
                        onChange={(e) => setQuickHandphone(e.target.value)}
                      />
                      <textarea
                        placeholder="Alamat *"
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                        value={quickAddress}
                        onChange={(e) => setQuickAddress(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleQuickRegisterMuzakki}
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Daftarkan &amp; Pilih Muzakki
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Ketik nama, NIK, atau NPWZ Muzakki..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={muzakkiSearch}
                        onChange={(e) => {
                          setMuzakkiSearch(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        disabled={!!selectedMuzakkiId}
                      />

                      {/* Dropdown Results */}
                      {isDropdownOpen && muzakkiSearch && !selectedMuzakkiId && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {filteredMuzakkis.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic text-center">
                              Tidak ada Muzakki ditemukan. Silakan daftarkan lewat "Registrasi Cepat".
                            </div>
                          ) : (
                            filteredMuzakkis.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                                onClick={() => {
                                  setSelectedMuzakkiId(m.id);
                                  setMuzakkiSearch(m.nama);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <div>
                                  <p className="font-bold text-slate-800">{m.nama}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">NPWZ: {m.npwz || '-'}</p>
                                </div>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{m.kategori}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* Selected Badge */}
                      {selectedMuzakkiId && (
                        <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3.5 py-3 rounded-xl text-xs font-black">
                          <span className="flex items-center gap-2">
                            <User className="size-4 shrink-0" />
                            Terhubung: {muzakkiSearch}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMuzakkiId('');
                              setMuzakkiSearch('');
                            }}
                            className="hover:text-rose-600 transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Checkbox Tidak Ada di RKAT */}
                <div className="flex items-center gap-2 text-left mb-1">
                  <input
                    type="checkbox"
                    id="isOutsideRkat"
                    checked={isOutsideRkat}
                    onChange={(e) => {
                      setIsOutsideRkat(e.target.checked);
                      if (e.target.checked) {
                        setSelectedRkatId('');
                        setSelectedCoaCode('');
                      }
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Tidak ada di RKAT (Penerimaan di luar RKAT)
                  </label>
                </div>

                {/* 2. Kegiatan (RKAT Pengumpulan) */}
                <div className={`space-y-1.5 text-left transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <SearchableRkatDropdown
                    label="Kegiatan (RKAT Pengumpulan) *"
                    selectedValue={selectedRkatId}
                    onChange={(val, opt) => handleRkatSelect(val, opt)}
                    options={rkatOptions}
                    placeholder="Cari program pengumpulan, keterangan..."
                    emptyLabel="-- Pilih Kegiatan RKAT Pengumpulan --"
                    disabled={isOutsideRkat}
                  />
                </div>

                {/* 3. Akun Buku Besar (Penerimaan COA) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Akun Buku Besar (Penerimaan COA) *
                  </label>
                  {selectedCoaCode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3.5 py-2.5 rounded-xl text-xs font-black">
                        <span className="flex items-center gap-2">
                          <BookOpen className="size-4 shrink-0" />
                          <span>Terpilih: <span className="font-mono">{selectedCoaCode}</span> - {coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || 'Akun Penerimaan'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCoaCode('');
                            setCoaSearch('');
                          }}
                          className="hover:text-rose-600 p-1 text-slate-400 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Ganti / Cari Akun COA Lain"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* Quick COA alternatives if RKAT has multiple mapped codes */}
                      {(() => {
                        const rkObj = rkatOptions.find(r => r.value === selectedRkatId);
                        if (!rkObj || !rkObj.allCoaCodes || !rkObj.allCoaCodes.includes(',')) return null;
                        const altCodes = rkObj.allCoaCodes.split(',').map((c: string) => c.trim()).filter(Boolean);
                        if (altCodes.length <= 1) return null;

                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">Pilihan COA Terkait:</span>
                            {altCodes.map((cCode: string) => {
                              const cItem = coaList.find(c => c.coa_code === cCode);
                              const isCur = selectedCoaCode === cCode;
                              return (
                                <button
                                  key={cCode}
                                  type="button"
                                  onClick={() => setSelectedCoaCode(cCode)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer",
                                    isCur ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  {cCode} {cItem ? `· ${cItem.nama_akun}` : ''}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                        <input
                          type="text"
                          placeholder="Cari kode COA atau nama akun Penerimaan..."
                          value={coaSearch}
                          onChange={(e) => setCoaSearch(e.target.value)}
                          onFocus={() => setIsCoaDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsCoaDropdownOpen(false), 205)}
                          className="w-full text-xs font-semibold bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {(isCoaDropdownOpen || coaSearch) && (
                        <div className="bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs font-bold shadow-inner text-left">
                          {filteredCoasForSearch.length === 0 ? (
                            <p className="p-2 text-[10px] text-slate-400 italic">COA tidak ditemukan</p>
                          ) : (
                            filteredCoasForSearch.map(coa => (
                              <div
                                key={coa.coa_code}
                                onClick={() => {
                                  setSelectedCoaCode(coa.coa_code);
                                  setCoaSearch('');
                                  setIsCoaDropdownOpen(false);
                                }}
                                className="p-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5 text-slate-700"
                              >
                                <span className="font-mono text-primary text-[11px]">{coa.coa_code}</span>
                                <span className="text-slate-600 text-[10px]">{coa.nama_akun}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    value={selectedCoaCode}
                    required
                    onChange={() => { }}
                    className="sr-only h-0 w-0"
                  />
                </div>

                {/* via Kas & Bank */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">via Kas & Bank *</label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-bold outline-none cursor-not-allowed"
                    value={selectedMutation.bankName}
                  />
                </div>

                {/* Nominal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal (Rp) *</label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-mono font-bold outline-none cursor-not-allowed"
                    value={formatCurrency(selectedMutation.nominal)}
                  />
                </div>

                {/* Metode & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran *</label>
                    <select
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-bold outline-none cursor-not-allowed"
                      value="TRANSFER"
                    >
                      <option value="TRANSFER">TRANSFER</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Tanggal Pembayaran *</label>
                    <input
                      type="date"
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-mono font-bold outline-none cursor-not-allowed"
                      value={new Date(selectedMutation.tanggal).toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                {/* 4. Keterangan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Deskripsi (Opsional)</label>
                  <textarea
                    rows={3}
                    placeholder="Masukkan keterangan pelengkap..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={customKeterangan}
                    onChange={(e) => setCustomKeterangan(e.target.value)}
                  />
                </div>

                {/* Action buttons */}
                <div className="pt-4 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Simpan Identifikasi
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
