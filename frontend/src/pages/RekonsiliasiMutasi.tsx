import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  BookOpen,
  UserPlus,
  Trash2,
  ChevronDown,
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

interface SearchableDropdownSingleProps {
  label: string;
  selectedValue: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

const SearchableDropdownSingle: React.FC<SearchableDropdownSingleProps> = ({
  label,
  selectedValue,
  onChange,
  options,
  placeholder = "Pilih item...",
  allowEmpty = true,
  emptyLabel = "-- Kosong / Tidak Dipilih --",
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      (opt.value && opt.value.toLowerCase().includes(term)) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>

      {/* Selector Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary outline-none transition-all pr-8 relative",
          disabled ? "cursor-not-allowed bg-slate-100 opacity-60" : "cursor-pointer"
        )}
      >
        <span className={cn("truncate", !selectedValue && "text-slate-400 font-normal")}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.sublabel && (
                <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {selectedOption.sublabel}
                </span>
              )}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            emptyLabel
          )}
        </span>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronDown className="size-4 text-slate-400" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-52">
            {allowEmpty && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={cn(
                  "p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none",
                  !selectedValue ? "bg-primary/5 text-primary" : "hover:bg-slate-50 text-slate-500 italic"
                )}
              >
                {emptyLabel}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center">Tidak ada hasil pencarian.</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium select-none justify-between",
                      isSelected ? "bg-primary/5 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.sublabel && (
                        <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {opt.sublabel}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
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

export default function RekonsiliasiMutasi() {
  const { user } = useAuth();

  // States
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [muzakkis, setMuzakkis] = useState<Muzakki[]>([]);
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);
  const [rkatOperasionalList, setRkatOperasionalList] = useState<any[]>([]);

  const rkatPenyaluranList = useMemo(() => {
    const list: any[] = [];
    (pilars || []).forEach((pilar) => {
      (pilar.programs || []).forEach((prog: any) => {
        const targets = prog.asnafTargets || [];
        if (targets.length > 0) {
          targets.forEach((target: any, tIdx: number) => {
            const fallbackId = target.id || `act-auto-${prog.code}-${target.asnaf || 'General'}-${tIdx}`;
            list.push({
              id: fallbackId,
              pilarCode: pilar.code,
              pilarName: pilar.name,
              name: target.name || prog.name,
              coaCode: target.coaCode,
              asnaf: target.asnaf,
              programCode: prog.code,
              type: 'PENYALURAN'
            });
          });
        }
      });
    });
    return list;
  }, [pilars]);

  const creditRkatOptions = useMemo(() => {
    const options: { value: string; label: string; sublabel?: string; coaCode?: string; type: 'PENYALURAN' | 'OPERASIONAL' }[] = [];

    // 1. Add Penyaluran
    rkatPenyaluranList.forEach(act => {
      options.push({
        value: act.id,
        label: `[Penyaluran] ${act.pilarName} - ${act.name} (${act.asnaf || 'Umum'})`,
        sublabel: act.coaCode || undefined,
        coaCode: act.coaCode,
        type: 'PENYALURAN'
      });
    });

    // 2. Add Operasional
    rkatOperasionalList.forEach(item => {
      options.push({
        value: item.id,
        label: `[Operasional] ${item.nama}`,
        sublabel: item.coa_codes || undefined,
        coaCode: item.coa_codes ? item.coa_codes.split(',')[0].trim() : undefined,
        type: 'OPERASIONAL'
      });
    });

    return options;
  }, [rkatPenyaluranList, rkatOperasionalList]);

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
  const [formAddType, setFormAddType] = useState<'DEBIT' | 'KREDIT'>('DEBIT');
  const [formBankId, setFormBankId] = useState('');
  const [formKeteranganBank, setFormKeteranganBank] = useState('');
  const [formNominal, setFormNominal] = useState<number | ''>('');

  // Form states - Reconcile
  const [formMuzakkiId, setFormMuzakkiId] = useState('');
  const [formCustomMuzakki, setFormCustomMuzakki] = useState('');
  const [formCoaCode, setFormCoaCode] = useState('');
  const [formSumberDana, setFormSumberDana] = useState('ZAKAT');
  const [formKeteranganRealisasi, setFormKeteranganRealisasi] = useState('');
  const [formRkatId, setFormRkatId] = useState('');
  const [isOutsideRkat, setIsOutsideRkat] = useState(false);

  // Quick register states
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickKategori, setQuickKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickJenisKelamin, setQuickJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [quickHandphone, setQuickHandphone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');

  // Search inside Muzakki and COA
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [coaSearch, setCoaSearch] = useState('');
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);
  const [isMuzakkiDropdownOpen, setIsMuzakkiDropdownOpen] = useState(false);

  // Trigger toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMutations, resAccounts, resCoas, resMuzakkis, resMustahiks, resRkat, resPilars, resRkatOperasional] = await Promise.all([
        axios.get('/api/mutations'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa'),
        axios.get('/api/muzakki'),
        axios.get('/api/mustahik'),
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/pilars'),
        axios.get('/api/rkat-operasional')
      ]);

      setMutations(resMutations.data);
      setBankAccounts(resAccounts.data);
      setCoas(resCoas.data);
      setRkatList(resRkat.data.data || []);

      const pilarsData = (resPilars.data || []).map((pilar: any) => ({
        ...pilar,
        programs: (pilar.programs || []).map((prog: any) => ({
          ...prog,
          asnafTargets: typeof prog.rkat_details === 'string'
            ? JSON.parse(prog.rkat_details || '[]')
            : (prog.rkat_details || [])
        }))
      }));
      setPilars(pilarsData);

      if (resRkatOperasional.data.status === 'success') {
        setRkatOperasionalList(resRkatOperasional.data.data || []);
      }

      // Map both muzakki and mustahik
      const muzakkiList = (resMuzakkis.data.data || []).map((m: any) => ({
        id: m.id,
        nama: m.nama,
        nik: m.nik,
        npwz: m.npwz,
        kategori: m.kategori || 'Perorangan',
        handphone: m.handphone || '',
        telepon: m.telepon || '',
        alamat: m.alamat || ''
      }));

      const mustahikList = (resMustahiks.data.data || []).map((m: any) => ({
        id: m.id,
        nama: `${m.nama} (Mustahik)`,
        nik: m.nik,
        npwz: m.npwz || '',
        kategori: 'Perorangan',
        handphone: m.handphone || '',
        telepon: m.telepon || '',
        alamat: m.alamat || ''
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
    const term = muzakkiSearch.toLowerCase();
    return muzakkis.filter(m =>
      m.nama.toLowerCase().includes(term) ||
      (m.nik || '').includes(term) ||
      (m.npwz || '').includes(term)
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
        nominal: Number(formNominal),
        type: formAddType
      };

      const res = await axios.post('/api/mutations', payload);
      setMutations(prev => [...prev, res.data]);

      // Reset form
      setFormKeteranganBank('');
      setFormNominal('');
      setIsAddModalOpen(false);
      showToast(
        formAddType === 'DEBIT'
          ? 'Mutasi Uang Masuk Bank berhasil direkam!'
          : 'Mutasi Uang Keluar Bank berhasil direkam!',
        'success'
      );
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Gagal menyimpan mutasi';
      showToast(errMsg, 'error');
    }
  };

  // Open Reconcile Modal
  const openReconcile = (mutation: BankMutation) => {
    setSelectedMutation(mutation);
    const isDebit = mutation.type !== 'KREDIT';

    if (mutation.status === 'RECONCILED') {
      setFormMuzakkiId(mutation.muzakkiId || '');
      setFormCustomMuzakki(mutation.muzakkiName || '');
      setMuzakkiSearch(mutation.muzakkiName || '');
      setFormSumberDana(mutation.sumberDana || 'ZAKAT');
      setFormRkatId(mutation.rkatId || '');
      setIsOutsideRkat(!mutation.rkatId);
      setFormCoaCode(mutation.coaCode || '');
      setFormKeteranganRealisasi(mutation.keteranganRealisasi || '');
    } else {
      setFormMuzakkiId('');
      setFormCustomMuzakki('');
      setMuzakkiSearch('');
      setFormSumberDana('ZAKAT');
      setFormRkatId('');
      setIsOutsideRkat(false);
      setFormCoaCode('');
      setFormKeteranganRealisasi(
        isDebit
          ? `Penerimaan mutasi ${mutation.keteranganBank}`
          : `Penyaluran/Penggunaan mutasi ${mutation.keteranganBank}`
      );
    }

    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    setShowQuickRegister(false);
    setQuickNama('');
    setQuickNik('');
    setQuickHandphone('');
    setQuickAddress('');

    setIsReconcileModalOpen(true);
  };

  const handleRkatChange = (rkatId: string) => {
    setFormRkatId(rkatId);
    const rkat = rkatList.find(r => r.id === rkatId);
    if (rkat && rkat.coa_codes) {
      const firstCode = rkat.coa_codes.split(',')[0].trim();
      setFormCoaCode(firstCode);
    } else {
      setFormCoaCode('');
    }
  };

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
        payload.nik = quickNik || `NIK-${Date.now()}`;
        payload.handphone = quickHandphone;
        payload.jenis_kelamin = quickJenisKelamin;
      } else {
        payload.cp_nama = quickNama;
        payload.cp_telepon = quickHandphone;
      }

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        const newMuzakki = res.data.data;
        setMuzakkis(prev => [newMuzakki, ...prev]);
        setFormMuzakkiId(newMuzakki.id);
        setFormCustomMuzakki(newMuzakki.nama);
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

  // Submit Reconciliation (Pengumpulan/Keuangan/Super_Admin role)
  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutation) return;

    const isDebit = selectedMutation.type !== 'KREDIT';
    const selectedMuzakki = muzakkis.find(m => m.id === formMuzakkiId);
    const donorName = isDebit
      ? (selectedMuzakki?.nama || formCustomMuzakki.trim() || 'Hamba Allah')
      : '-';

    const needsRkat = !isOutsideRkat;
    if ((needsRkat && !formRkatId) || !formCoaCode) {
      showToast(
        needsRkat
          ? 'Kegiatan RKAT dan Akun Buku Besar (COA) wajib diisi!'
          : 'Akun Buku Besar (COA) wajib diisi!',
        'error'
      );
      return;
    }

    try {
      const payload = {
        muzakkiId: isDebit ? (formMuzakkiId || null) : null,
        muzakkiName: donorName,
        coaCode: formCoaCode,
        rkatId: needsRkat ? formRkatId : null,
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
            className={`flex-1 sm:flex-initial px-6 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'PENERIMAAN'
                ? 'border-primary text-primary bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'
              }`}
          >
            <ArrowDownLeft className="size-4 text-emerald-600" />
            Penerimaan
          </button>
          <button
            onClick={() => setActiveTab('PENYALURAN')}
            className={`flex-1 sm:flex-initial px-6 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'PENYALURAN'
                ? 'border-primary text-primary bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'
              }`}
          >
            <ArrowUpRight className="size-4 text-rose-600" />
            Penyaluran
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
            {(user?.role === 'Super_Admin' || user?.role === 'Staf_Keuangan') && (
              <button
                onClick={() => {
                  setFormAddType(activeTab === 'PENERIMAAN' ? 'DEBIT' : 'KREDIT');
                  setIsAddModalOpen(true);
                }}
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
                  <td className={`px-6 py-5 text-right font-black font-mono ${activeTab === 'PENERIMAAN' ? 'text-emerald-700' : 'text-rose-700'
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
                  <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => openReconcile(item)}
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
                          Oleh {item.reconciledBy}
                        </span>
                        <button
                          type="button"
                          onClick={() => openReconcile(item)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary border border-transparent rounded-lg transition-all"
                          title="Edit Rekonsiliasi"
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
                  {formAddType === 'DEBIT' ? 'Catat Uang Masuk Mutasi Bank' : 'Catat Uang Keluar Mutasi Bank'}
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {formAddType === 'DEBIT' ? 'Pilih Akun Bank Penerima' : 'Pilih Akun Bank Pengirim'}
                  </label>
                  <select
                    value={formBankId}
                    onChange={(e) => setFormBankId(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {bankAccounts.filter(ba => ba.tipe_kas === 'BANK').map(ba => (
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

              <form onSubmit={handleReconcile} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {selectedMutation.type !== 'KREDIT' ? (
                  // =================== PENERIMAAN / DEBIT FLOW ===================
                  <>
                    {/* 1. Muzakki Autocomplete Search or Quick Register */}
                    <div className="space-y-1.5 relative text-left">
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
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-1 text-left">
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={muzakkiSearch}
                            onChange={(e) => {
                              setMuzakkiSearch(e.target.value);
                              setIsMuzakkiDropdownOpen(true);
                            }}
                            onFocus={() => setIsMuzakkiDropdownOpen(true)}
                            disabled={!!formMuzakkiId}
                          />

                          {/* Dropdown Results */}
                          {isMuzakkiDropdownOpen && muzakkiSearch && !formMuzakkiId && (
                            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100 text-left">
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
                                      setFormMuzakkiId(m.id);
                                      setFormCustomMuzakki(m.nama);
                                      setMuzakkiSearch('');
                                      setIsMuzakkiDropdownOpen(false);
                                    }}
                                  >
                                    <div>
                                      <p className="font-bold text-slate-800">{m.nama}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">NPWZ: {m.npwz || '-'}</p>
                                    </div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{m.kategori || 'Perorangan'}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}

                          {/* Selected Badge */}
                          {formMuzakkiId && (
                            <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3.5 py-3 rounded-xl text-xs font-black">
                              <span className="flex items-center gap-2">
                                <User className="size-4 shrink-0" />
                                Terhubung: {formCustomMuzakki}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormMuzakkiId('');
                                  setFormCustomMuzakki('');
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
                            setFormRkatId('');
                            setFormCoaCode('');
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Tidak ada di RKAT (Penerimaan di luar RKAT)
                      </label>
                    </div>

                    {/* 2. Kegiatan (RKAT) */}
                    <div className={`space-y-1.5 text-left transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT) *</label>
                      <select
                        required={!isOutsideRkat}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                        value={formRkatId}
                        onChange={(e) => handleRkatChange(e.target.value)}
                        disabled={isOutsideRkat}
                      >
                        <option value="">Pilih Kegiatan RKAT Pengumpulan...</option>
                        {rkatList.map(rkat => (
                          <option key={rkat.id} value={rkat.id}>
                            [{rkat.kategori}] {rkat.nama_program}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Program Kegiatan (COA) - Standard flow */}
                    {!isOutsideRkat && formRkatId && (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA) *</label>
                        <select
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-700"
                          value={formCoaCode}
                          onChange={(e) => setFormCoaCode(e.target.value)}
                        >
                          {(() => {
                            const rkat = rkatList.find(r => r.id === formRkatId);
                            const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
                            return codes.map((code: string) => {
                              const coa = coas.find(c => c.coa_code === code);
                              const label = coa ? `${code} - ${coa.nama_akun}` : `${code} - Penerimaan ${rkat?.nama_program || ''}`;
                              return (
                                <option key={code} value={code}>
                                  {label}
                                </option>
                              );
                            });
                          })()}
                        </select>
                      </div>
                    )}

                    {/* 3. Akun Buku Besar (Penerimaan COA) - Outside RKAT search */}
                    {isOutsideRkat && (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Akun Buku Besar (Penerimaan COA) *
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
                        <input
                          type="text"
                          value={formCoaCode}
                          required
                          onChange={() => { }}
                          className="sr-only h-0 w-0"
                        />
                      </div>
                    )}

                    {/* 4. Rumpun Dana */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Rumpun Klasifikasi Dana *
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
                  </>
                ) : (
                  // =================== PENYALURAN / KREDIT FLOW ===================
                  <>
                    {/* Checkbox Tidak Ada di RKAT */}
                    <div className="flex items-center gap-2 text-left mb-1">
                      <input
                        type="checkbox"
                        id="isOutsideRkat"
                        checked={isOutsideRkat}
                        onChange={(e) => {
                          setIsOutsideRkat(e.target.checked);
                          if (e.target.checked) {
                            setFormRkatId('');
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Tidak ada di RKAT (Pengeluaran di luar RKAT)
                      </label>
                    </div>

                    {/* 1. Kegiatan (RKAT Penyaluran / Operasional) */}
                    <div className={`space-y-1.5 text-left transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                      <SearchableDropdownSingle
                        label="Kegiatan RKAT (Penyaluran / Operasional) *"
                        selectedValue={formRkatId}
                        onChange={(val) => {
                          setFormRkatId(val);
                          const matched = creditRkatOptions.find(o => o.value === val);
                          if (matched && matched.coaCode) {
                            setFormCoaCode(matched.coaCode);
                          } else {
                            setFormCoaCode('');
                          }
                        }}
                        options={creditRkatOptions}
                        placeholder="Cari program Penyaluran / Operasional..."
                        allowEmpty={true}
                        emptyLabel="-- Pilih Kegiatan RKAT --"
                        disabled={isOutsideRkat}
                      />
                    </div>

                    {/* 2. Account COA Code */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Akun Buku Besar (Penyaluran/Penggunaan COA) *
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
                      <input
                        type="text"
                        value={formCoaCode}
                        required
                        onChange={() => { }}
                        className="sr-only h-0 w-0"
                      />
                    </div>
                  </>
                )}

                {/* =================== SHARED READONLY FIELDS =================== */}
                {/* via Kas & Bank */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">via Kas & Bank *</label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 font-bold outline-none cursor-not-allowed"
                    value={selectedMutation.bankName}
                  />
                </div>

                {/* Nominal */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal (Rp) *</label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 font-mono font-bold outline-none cursor-not-allowed"
                    value={formatCurrency(selectedMutation.nominal)}
                  />
                </div>

                {/* Metode & Tanggal */}
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran *</label>
                    <select
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 font-bold outline-none cursor-not-allowed"
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
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 font-mono font-bold outline-none cursor-not-allowed"
                      value={new Date(selectedMutation.tanggal).toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {selectedMutation.type === 'KREDIT' ? 'Keterangan Penyaluran / Penggunaan Dana *' : 'Penjelasan Penerimaan (Keterangan Realisasi) *'}
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
