import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  FileText, 
  ArrowUpRight,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Coins,
  CheckSquare,
  Square,
  AlertTriangle,
  Building2,
  Printer,
  HelpCircle,
  Eye,
  ChevronDown,
  Check,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface SimulatorPencairanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function SimulatorPencairan({ data, onUpdate }: SimulatorPencairanProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tipePencairan, setTipePencairan] = useState<'batch' | 'satuan'>('batch');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [checkedProposalIds, setCheckedProposalIds] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'ZAKAT' | 'INFAK_TIDAK_TERIKAT' | 'INFAK_TERIKAT'>('all');
  
  const [simKeterangan, setSimKeterangan] = useState('');
  const [simGuardResult, setSimGuardResult] = useState<any | null>(null);
  const [simPreviewResult, setSimPreviewResult] = useState<any | null>(null);
  const [simGuardLoading, setSimGuardLoading] = useState(false);
  const [simExecuting, setSimExecuting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [selectedDetailProposal, setSelectedDetailProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSumberDanaDropdownOpen, setIsSumberDanaDropdownOpen] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('/api/finance/accounts');
        setAccounts(res.data);
      } catch (e) {
        console.error('Gagal mengambil data rekening: ', e);
      }
    };
    fetchAccounts();

    axios.get('/api/pilars')
      .then(res => {
        if (res.data) setPilars(res.data);
      })
      .catch(console.error);
  }, []);

  // Filter accounts strictly to ZAKAT, ISTT, IST Kas (TUNAI)
  const allowedAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.tipe_kas === 'TUNAI' && (
        a.kelompok_dana === 'ZAKAT' || 
        a.kelompok_dana === 'INFAK_TIDAK_TERIKAT' || 
        a.kelompok_dana === 'INFAK_TERIKAT'
      )
    );
  }, [accounts]);

  // Filter only proposals in 'Pencairan Dana' or 'Antrean Bantuan' status
  const validProposals = useMemo(() => {
    return data.filter(p => p.status === 'Pencairan Dana' || p.status === 'Antrean Bantuan');
  }, [data]);

  const uniquePrograms = useMemo(() => {
    const progs = validProposals.map(p => p.jenisPermohonan || 'Umum');
    return Array.from(new Set(progs)).filter(Boolean);
  }, [validProposals]);

  const programTipeMap = useMemo(() => {
    const map: { [code: string]: string } = {};
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        map[prog.code] = prog.tipe || 'Konsumtif';
      });
    });
    return map;
  }, [pilars]);

  useEffect(() => {
    if (!selectedDetailProposal) return;
    
    const getTemplateKey = () => {
      let tipe = 'Konsumtif';
      const p = selectedDetailProposal as any;
      if (p.programRedirectionCode) {
        const parts = p.programRedirectionCode.split('.');
        if (parts.length > 2) {
          const parentCode = `${parts[0]}.${parts[1]}`;
          if (programTipeMap[parentCode]) tipe = programTipeMap[parentCode];
        }
      } else if (p.programCode) {
        const parts = p.programCode.split('.');
        if (parts.length > 2) {
          const parentCode = `${parts[0]}.${parts[1]}`;
          if (programTipeMap[parentCode]) tipe = programTipeMap[parentCode];
        }
      }
      
      if (tipe === 'Produktif') return 'survey_template_perorangan_produktif';
      return 'survey_template_individu';
    };

    const templateKey = getTemplateKey();
    axios.get(`/api/parameters/${templateKey}`)
      .then(res => {
        if (res.data && res.data.value) {
          setDynamicQuestions(JSON.parse(res.data.value));
        }
      })
      .catch(console.error);
  }, [selectedDetailProposal, programTipeMap]);

  // Helper to map proposal category to Tag
  const getProposalTag = (proposal: ProposalMemo) => {
    const rawTag = proposal.rekomendasi_kabag || proposal.tipeBantuan || 'Zakat';
    const tagUpper = String(rawTag).toUpperCase();
    if (tagUpper.includes('ISTT') || tagUpper.includes('TIDAK TERIKAT') || tagUpper.includes('TIDAK_TERIKAT') || tagUpper.includes('INFAK_TIDAK_TERIKAT')) {
      return 'INFAK_TIDAK_TERIKAT';
    }
    if (tagUpper.includes('IST') || tagUpper.includes('TERIKAT') || tagUpper.includes('INFAK_TERIKAT')) {
      return 'INFAK_TERIKAT';
    }
    return 'ZAKAT';
  };

  // Reset checked proposals and sync filter tab automatically when source account is chosen
  useEffect(() => {
    setCheckedProposalIds([]);
    if (!selectedAccountId) return;
    const selectedAcc = allowedAccounts.find(a => a.account_id === selectedAccountId);
    if (selectedAcc) {
      if (selectedAcc.kelompok_dana === 'ZAKAT') {
        setActiveFilterTab('ZAKAT');
      } else if (selectedAcc.kelompok_dana === 'INFAK_TIDAK_TERIKAT') {
        setActiveFilterTab('INFAK_TIDAK_TERIKAT');
      } else if (selectedAcc.kelompok_dana === 'INFAK_TERIKAT') {
        setActiveFilterTab('INFAK_TERIKAT');
      }
    }
  }, [selectedAccountId, allowedAccounts]);

  // Filter proposals queue strictly based on selected account's kelompok_dana or active tab
  const filteredProposals = useMemo(() => {
    const selectedAcc = allowedAccounts.find(a => a.account_id === selectedAccountId);

    const res = validProposals.filter(p => {
      const searchMatch = p.agendaNo.toString().includes(searchTerm) || 
                         p.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      if (selectedProgram !== 'all' && (p.jenisPermohonan || 'Umum') !== selectedProgram) {
        return false;
      }

      if (selectedAcc) {
        // If a source account is selected, strictly filter to match its kelompok_dana
        return getProposalTag(p) === selectedAcc.kelompok_dana;
      }

      // If no source account is selected, fallback to active tab filter
      if (activeFilterTab === 'all') return true;
      return getProposalTag(p) === activeFilterTab;
    });

    const urgencyOrder: Record<string, number> = {
      'Sangat Kritis': 4,
      'Kritis': 4,
      'Tinggi': 3,
      'Sedang': 2,
      'Rendah': 1,
    };

    return [...res].sort((a, b) => {
      const orderA = urgencyOrder[a.urgencyLevel || ''] || 0;
      const orderB = urgencyOrder[b.urgencyLevel || ''] || 0;
      if (orderB !== orderA) {
        return orderB - orderA;
      }
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return Number(b.agendaNo) - Number(a.agendaNo);
    });
  }, [validProposals, selectedAccountId, allowedAccounts, activeFilterTab, searchTerm, selectedProgram]);

  // Map chosen IDs to Proposal objects
  const selectedProposals = useMemo(() => {
    return validProposals.filter(p => checkedProposalIds.includes(p.id));
  }, [validProposals, checkedProposalIds]);

  // Total selected nominal
  const totalSelectedNominal = useMemo(() => {
    return selectedProposals.reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [selectedProposals]);

  // Double Guard & Jurnal Preview trigger
  useEffect(() => {
    const fetchVerificationData = async () => {
      if (checkedProposalIds.length === 0) {
        setSimGuardResult(null);
        setSimPreviewResult(null);
        return;
      }

      setSimGuardLoading(true);
      try {
        // 1. Fetch double-guard availability checks (batch)
        const availabilityRes = await axios.post('/api/finance/check-availability-batch', {
          proposalIds: checkedProposalIds
        });
        setSimGuardResult(availabilityRes.data);

        // 2. Fetch journal preview if account is selected
        if (selectedAccountId) {
          const previewRes = await axios.post('/api/finance/disburse/preview', {
            proposalIds: checkedProposalIds,
            selectedAccountId
          });
          setSimPreviewResult(previewRes.data);
        } else {
          setSimPreviewResult(null);
        }
      } catch (e) {
        console.error('Gagal memvalidasi double-guard/preview jurnal:', e);
      } finally {
        setSimGuardLoading(false);
      }
    };

    fetchVerificationData();
  }, [checkedProposalIds, selectedAccountId]);

  // Handle checking a proposal row
  const handleToggleProposal = (id: string) => {
    if (tipePencairan === 'satuan') {
      setCheckedProposalIds(prev => prev.includes(id) ? [] : [id]);
    } else {
      setCheckedProposalIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  // Handle select all toggle
  const handleToggleSelectAll = () => {
    if (checkedProposalIds.length === filteredProposals.length) {
      setCheckedProposalIds([]);
    } else {
      setCheckedProposalIds(filteredProposals.map(p => p.id));
    }
  };

  // Get selected account info
  const selectedAccount = useMemo(() => {
    return allowedAccounts.find(a => a.account_id === selectedAccountId);
  }, [allowedAccounts, selectedAccountId]);

  const saldoAwal = Number(selectedAccount?.saldo || 0);
  const estimasiSaldoAkhir = saldoAwal - totalSelectedNominal;
  const isSaldoSufficient = estimasiSaldoAkhir >= 0;
  const shortfall = totalSelectedNominal - saldoAwal;

  // Execute disbursement
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkedProposalIds.length === 0 || !selectedAccountId) {
      alert('Mohon tentukan minimal satu proposal dan satu akun bayar.');
      return;
    }

    setSimExecuting(true);
    try {
      const res = await axios.post('/api/finance/disburse/execute', {
        proposalIds: checkedProposalIds,
        selectedAccountId,
        keterangan: simKeterangan
      });

      // Update global proposals status in UI
      const updatedData = data.map(item => 
        checkedProposalIds.includes(item.id) ? { ...item, status: 'Selesai & Arsip' as any } : item
      );
      onUpdate(updatedData);

      setSuccessData({
        message: res.data.message,
        proposalsCount: checkedProposalIds.length,
        totalNominal: totalSelectedNominal,
        account: selectedAccount,
        preview: simPreviewResult,
        bkoNumber: `BKO-${Date.now().toString().slice(-6)}`
      });

      // Reset states
      setCheckedProposalIds([]);
      setSelectedAccountId('');
      setSimKeterangan('');
      setSimGuardResult(null);
      setSimPreviewResult(null);

      // Refresh accounts list
      const resAcc = await axios.get('/api/finance/accounts');
      setAccounts(resAcc.data);
    } catch (error: any) {
      alert('Eksekusi Finalisasi Gagal: ' + (error.response?.data?.error || error.message));
    } finally {
      setSimExecuting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-55/30">
      
      {/* Title Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Simulator Pencairan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          <ShieldCheck className="size-8 text-primary shrink-0" />
          Simulator Eksekusi &amp; Jurnal BKO
        </h2>
        <p className="text-slate-500 font-medium">
          Simulasi pencairan dana multi-proposal atau satuan beserta tinjauan ketersediaan saldo kas dan jurnal BKO sebelum difinalisasi.
        </p>
      </motion.div>

      {/* Main Form Wrapper */}
      <form onSubmit={handleExecutePayment} className="space-y-8">
        
        {/* Row 1: Configurations & Accounts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Configuration */}
          <div className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                1. CONFIGURASI TIPE PENCAIRAN
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTipePencairan('batch');
                  setCheckedProposalIds([]);
                }}
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center",
                  tipePencairan === 'batch' 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-slate-100 hover:border-slate-200 text-slate-500"
                )}
              >
                <Coins className="size-6" />
                <span className="text-xs font-black">Pencairan via Rekapan/Batch</span>
                <span className="text-[10px] opacity-80 font-medium">Cairkan banyak proposal sekaligus</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipePencairan('satuan');
                  setCheckedProposalIds([]);
                }}
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center",
                  tipePencairan === 'satuan' 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-slate-100 hover:border-slate-200 text-slate-500"
                )}
              >
                <ArrowUpRight className="size-6" />
                <span className="text-xs font-black">Pencairan Satuan Mendesak</span>
                <span className="text-[10px] opacity-80 font-medium">Fokus ke satu proposal prioritas</span>
              </button>
            </div>
          </div>

          {/* Card 2: Source Account Selector */}
          <div className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                2. PILIH SUMBER DANA BAYAR (BANK / LACI)
              </h3>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Rekening / Laci Pembayar Pentasharufan
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSumberDanaDropdownOpen(!isSumberDanaDropdownOpen)}
                  className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 text-left cursor-pointer"
                >
                  <span className="truncate">
                    {selectedAccount 
                      ? `${selectedAccount.nama_akun} - (Sisa: ${formatCurrency(Number(selectedAccount.saldo))})`
                      : '-- Pilih Rekening Sumber Dana --'
                    }
                  </span>
                  <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isSumberDanaDropdownOpen && "rotate-180")} />
                </button>

                {isSumberDanaDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsSumberDanaDropdownOpen(false)} />
                    <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 max-h-72 overflow-hidden flex flex-col">
                      <div className="overflow-y-auto custom-scrollbar flex-1 max-h-52">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId('');
                            setIsSumberDanaDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                            !selectedAccountId ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                          )}
                        >
                          <span>-- Pilih Rekening Sumber Dana --</span>
                          {!selectedAccountId && <Check className="size-4 text-primary shrink-0" />}
                        </button>
                        {allowedAccounts.map(a => (
                          <button
                            key={a.account_id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(a.account_id);
                              setIsSumberDanaDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                              selectedAccountId === a.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            <span className="font-bold text-slate-800">{a.nama_akun}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-mono font-bold">{formatCurrency(Number(a.saldo))}</span>
                              {selectedAccountId === a.account_id && <Check className="size-4 text-primary shrink-0" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {selectedAccount && (
                <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    Kelompok Dana Terdeteksi:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[9px] font-black">
                    {selectedAccount.kelompok_dana === 'INFAK_TIDAK_TERIKAT' ? 'Dana ISTT' : selectedAccount.kelompok_dana === 'INFAK_TERIKAT' ? 'Dana IST' : 'Dana ZAKAT'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Queue Table */}
        <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Coins className="size-4 text-primary" />
                3. DAFTAR ANTREAN PROPOSAL 
                <span className="text-xs font-normal text-slate-400 font-medium">
                  {selectedAccount ? `(Otomatis Terfilter Tag '${selectedAccount.kelompok_dana}')` : '(Semua Kategori)'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Pilih proposal yang akan dicairkan di bawah ini.
              </p>
            </div>

            {/* Manual Tabs Filter override */}
            {!selectedAccountId ? (
              <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black gap-1 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('all')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", activeFilterTab === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('ZAKAT')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", activeFilterTab === 'ZAKAT' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Zakat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('INFAK_TIDAK_TERIKAT')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", activeFilterTab === 'INFAK_TIDAK_TERIKAT' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Dana ISTT
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('INFAK_TERIKAT')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", activeFilterTab === 'INFAK_TERIKAT' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Dana IST
                </button>
              </div>
            ) : (
              <div className="flex bg-slate-50 p-1.5 rounded-xl text-[10px] font-black gap-1 self-start md:self-center border border-slate-200 text-slate-500 items-center">
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-sm uppercase tracking-wide">
                  Terfilter Otomatis: {
                    selectedAccount?.kelompok_dana === 'ZAKAT' ? 'ZAKAT' :
                    selectedAccount?.kelompok_dana === 'INFAK_TIDAK_TERIKAT' ? 'Dana ISTT' :
                    selectedAccount?.kelompok_dana === 'INFAK_TERIKAT' ? 'Dana IST' : selectedAccount?.kelompok_dana
                  }
                </span>
              </div>
            )}
          </div>

          {/* Search bar & Program Search Dropdown inside queue card */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari agenda mustahik, nomor agenda, atau instansi..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Custom Searchable Program Dropdown */}
            <div className="relative w-full md:w-64">
              <button
                type="button"
                onClick={() => setIsProgramDropdownOpen(!isProgramDropdownOpen)}
                className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 text-left"
              >
                <span className="truncate">
                  {selectedProgram === 'all' ? 'Semua Program' : selectedProgram}
                </span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isProgramDropdownOpen && "rotate-180")} />
              </button>

              {isProgramDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsProgramDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-hidden flex flex-col">
                    <div className="p-1 border-b border-slate-100 mb-1">
                      <input
                        type="text"
                        placeholder="Cari program..."
                        value={programSearchQuery}
                        onChange={(e) => setProgramSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-700"
                      />
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-52">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProgram('all');
                          setIsProgramDropdownOpen(false);
                          setProgramSearchQuery('');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                          selectedProgram === 'all' ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                        )}
                      >
                        <span>Semua Program</span>
                        {selectedProgram === 'all' && <Check className="size-4 text-primary shrink-0" />}
                      </button>
                      {uniquePrograms
                        .filter(p => p.toLowerCase().includes(programSearchQuery.toLowerCase()))
                        .map(prog => (
                          <button
                            key={prog}
                            type="button"
                            onClick={() => {
                              setSelectedProgram(prog);
                              setIsProgramDropdownOpen(false);
                              setProgramSearchQuery('');
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                              selectedProgram === prog ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            <span>{prog}</span>
                            {selectedProgram === prog && <Check className="size-4 text-primary shrink-0" />}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Select All Button */}
            {tipePencairan === 'batch' && filteredProposals.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black text-slate-600 transition-all flex items-center gap-2 shrink-0 justify-center"
              >
                {checkedProposalIds.length === filteredProposals.length ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4" />
                )}
                Pilih Semua ({filteredProposals.length})
              </button>
            )}
          </div>

          {/* Proposal list table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs font-semibold border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-10 text-center"></th>
                  <th className="py-3 px-4">No. Agenda</th>
                  <th className="py-3 px-4">Nama Mustahik</th>
                  <th className="py-3 px-4">Tag Dana / Asnaf</th>
                  <th className="py-3 px-4">Bantuan / Program</th>
                  <th className="py-3 px-4">Poin &amp; Urgensi</th>
                  <th className="py-3 px-4 text-right">Nominal Bantuan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProposals.length > 0 ? (
                  filteredProposals.map((item) => {
                    const isChecked = checkedProposalIds.includes(item.id);
                    const tag = getProposalTag(item);
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => handleToggleProposal(item.id)}
                        className={cn(
                          "hover:bg-slate-55/20 transition-all cursor-pointer group",
                          isChecked && "bg-primary/5"
                        )}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            onClick={() => handleToggleProposal(item.id)}
                          >
                            {isChecked ? (
                              <CheckSquare className="size-4.5 text-primary" />
                            ) : (
                              <Square className="size-4.5 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {String(item.agendaNo).padStart(3, '0')}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-bold">
                          {item.namaPemohon}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              tag === 'ZAKAT' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              tag === 'INFAK_TIDAK_TERIKAT' ? "bg-blue-50 text-blue-600 border-blue-100" :
                              "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                              {tag === 'INFAK_TIDAK_TERIKAT' ? 'ISTT' : tag === 'INFAK_TERIKAT' ? 'IST' : 'ZAKAT'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">/</span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase">
                              {item.asnaf || 'Miskin'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                          {item.jenisPermohonan}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                              item.urgencyLevel === 'Sangat Kritis' || item.urgencyLevel === 'Kritis' ? "bg-rose-50 text-rose-600 border-rose-100" :
                              item.urgencyLevel === 'Tinggi' ? "bg-orange-50 text-orange-600 border-orange-100" :
                              item.urgencyLevel === 'Sedang' ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-slate-50 text-slate-400 border-slate-200"
                            )}>
                              {item.urgencyLevel || 'Rendah'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({item.score || 0} Poin)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.nominal || 0)}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => {
                                setSelectedDetailProposal(item);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Detail"
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Tidak ada antrean pencairan dana yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Double Guard Details & Preview */}
        <AnimatePresence>
          {checkedProposalIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* RKAT Double-Guard Summary Card */}
              <div className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    VERIFIKASI RKAT (DOUBLE-GUARD SYSTEM)
                  </h3>
                </div>

                {simGuardLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse flex flex-col items-center justify-center gap-2">
                    <RotateCcw className="size-5 animate-spin text-primary" />
                    Menghubungkan &amp; mencocokkan plafon RKAT...
                  </div>
                ) : simGuardResult && simGuardResult.rkat_activities ? (
                  <div className="space-y-4">
                    {simGuardResult.rkat_activities.map((act: any) => {
                      const isOver = act.status === 'OVER_BUDGET';
                      return (
                        <div key={act.id} className={cn(
                          "p-4 rounded-2xl border transition-all space-y-2",
                          isOver ? "bg-rose-50/50 border-rose-100 text-rose-800" : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                        )}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plafon RKAT Terkait</p>
                              <h4 className="text-xs font-black text-slate-800 mt-0.5">{act.name}</h4>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                              isOver ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {isOver ? 'OVER RKAT ❌' : 'PAGU CUKUP ✅'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-slate-700">
                            <div>
                              <span className="text-[9px] font-bold text-slate-450 block uppercase">Plafon</span>
                              <span className="text-xs font-bold font-mono">{formatCurrency(act.total_pagu)}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-450 block uppercase">Realisasi</span>
                              <span className="text-xs font-bold font-mono text-slate-500">{formatCurrency(act.terpakai_saat_ini)}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-450 block uppercase">Sisa Plafon</span>
                              <span className="text-xs font-bold font-mono text-emerald-600">{formatCurrency(act.sisa_pagu)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-450 text-xs italic">
                    Gagal mengambil rincian data plafon RKAT. Silakan hubungi tim IT.
                  </div>
                )}
              </div>

              {/* Accounting Journal Entry Preview */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-slate-450 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    PREVIEW ENTRI JURNAL BUKU BESAR (BKO)
                  </h3>
                </div>

                {!selectedAccountId ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-bold italic flex flex-col items-center gap-2">
                    <HelpCircle className="size-8 opacity-20" />
                    Silakan tentukan Rekening/Laci pembayar di langkah 2 untuk merancang draf jurnal pembukuan.
                  </div>
                ) : simPreviewResult ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] tracking-wider font-black">
                            <th className="py-2">Kode Akun</th>
                            <th className="py-2">Buku Besar Akun</th>
                            <th className="py-2 text-right">Debit</th>
                            <th className="py-2 text-right">Kredit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono">
                          {simPreviewResult.debitEntries ? (
                            simPreviewResult.debitEntries.map((e: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-2.5 text-emerald-400 font-bold">{e.coa_code}</td>
                                <td className="py-2.5 text-slate-300 font-semibold">{e.nama_akun}</td>
                                <td className="py-2.5 text-right text-emerald-400 font-bold">{formatCurrency(e.nominal)}</td>
                                <td className="py-2.5 text-right text-slate-600">-</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="py-2.5 text-emerald-400 font-bold">{simPreviewResult.debit.coa_code}</td>
                              <td className="py-2.5 text-slate-300 font-semibold">{simPreviewResult.debit.nama_akun}</td>
                              <td className="py-2.5 text-right text-emerald-400 font-bold">{formatCurrency(simPreviewResult.nominal)}</td>
                              <td className="py-2.5 text-right text-slate-600">-</td>
                            </tr>
                          )}
                          {simPreviewResult.kreditEntries ? (
                            simPreviewResult.kreditEntries.map((e: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-2.5 text-blue-400 font-bold">{e.coa_code}</td>
                                <td className="py-2.5 text-slate-300 font-semibold">{e.nama_akun}</td>
                                <td className="py-2.5 text-right text-slate-600">-</td>
                                <td className="py-2.5 text-right text-blue-400 font-bold">{formatCurrency(e.nominal)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="py-2.5 text-blue-400 font-bold">{simPreviewResult.kredit.coa_code}</td>
                              <td className="py-2.5 text-slate-300 font-semibold">{simPreviewResult.kredit.nama_akun}</td>
                              <td className="py-2.5 text-right text-slate-600">-</td>
                              <td className="py-2.5 text-right text-blue-400 font-bold">{formatCurrency(simPreviewResult.nominal)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Keseimbangan Jurnal:</span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest font-black text-[9px]">
                        Balanced / Seimbang
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs font-bold italic animate-pulse">
                    Membuat draf jurnal transaksi...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 4: Transaction Summary Preview & Deficit Recommendations */}
        <div className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              4. PREVIEW SIMULASI TRANSAKSI
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            {/* Balance Awal */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Awal Bank / Laci</span>
              <span className="text-lg font-black text-slate-800 mt-1 font-mono">
                {selectedAccountId ? formatCurrency(saldoAwal) : 'Rp 0'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-1">
                {selectedAccount?.nama_akun || 'Rekening belum dipilih'}
              </span>
            </div>

            {/* Total Selected */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Draf Terpilih</span>
              <span className="text-lg font-black text-rose-600 mt-1 font-mono">
                {totalSelectedNominal > 0 ? `${formatCurrency(totalSelectedNominal)} (-)` : 'Rp 0'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-1">
                {checkedProposalIds.length} Proposal antrean dicentang
              </span>
            </div>

            {/* Estimated Balance Sisa */}
            <div className={cn(
              "p-4 rounded-2xl border flex flex-col justify-center transition-colors",
              !selectedAccountId ? "bg-slate-50 border-slate-100 text-slate-500" :
              isSaldoSufficient ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-rose-50/50 border-rose-100 text-rose-800"
            )}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estimasi Saldo Akhir</span>
              <span className={cn(
                "text-lg font-black mt-1 font-mono",
                !selectedAccountId ? "text-slate-800" :
                isSaldoSufficient ? "text-emerald-700" : "text-rose-700"
              )}>
                {selectedAccountId ? formatCurrency(estimasiSaldoAkhir) : 'Rp 0'}
              </span>
              {selectedAccountId && (
                <div className="mt-1">
                  <span className={cn(
                    "inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase",
                    isSaldoSufficient ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {isSaldoSufficient ? 'AMAN ✅' : 'KAS TIDAK CUKUP ❌'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* shortfall recommendations */}
          <AnimatePresence>
            {!isSaldoSufficient && selectedAccountId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-4"
              >
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="size-5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      REKOMENDASI PENARIKAN DANA DARI BANK (SOLUSI DEFISIT KAS)
                    </h4>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                      Saldo di laci kas {selectedAccount?.nama_akun} kurang sebesar <strong className="font-bold text-rose-700">{formatCurrency(shortfall)}</strong> untuk mencukupi transaksi pencairan ini. Silakan lakukan penarikan dana dari rekening Bank untuk mengisi laci kas ini.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-200/50">
                  <div className="flex flex-col sm:flex-row justify-between text-xs font-bold text-slate-800 bg-white/60 px-3.5 py-2.5 rounded-xl border border-amber-200/30">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Rekomendasi Nominal Penarikan dari Bank:
                    </span>
                    <span className="text-rose-750 font-black font-mono text-sm">
                      {formatCurrency(shortfall)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description text area */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Catatan Keterangan Finalisasi Jurnal &amp; Kas
            </label>
            <textarea
              rows={3}
              placeholder="Berikan keterangan resmi untuk buku besar, misal: Pencairan rekapan dana zakat batch 1 untuk 3 mustahik via Bank Zakat BSI..."
              value={simKeterangan}
              onChange={(e) => setSimKeterangan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700"
            />
          </div>

          {/* Finalize Button */}
          <button
            type="submit"
            disabled={simExecuting || checkedProposalIds.length === 0 || !selectedAccountId || !isSaldoSufficient}
            className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:shadow-none"
          >
            {simExecuting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            FINALISASI: POTONG SALDO {selectedAccount?.tipe_kas === 'BANK' ? 'BANK' : 'KAS'} &amp; GENERATE BUKTI KAS KELUAR (BKO)
          </button>
        </div>

      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {successData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSuccessData(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 border border-emerald-100"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Pencairan Sukses &amp; Jurnal Terbit!</h3>
                <p className="text-xs text-slate-500 font-medium px-4">
                  {successData.message} Jurnal debit/kredit buku besar telah dicatat secara otomatis. Bukti Kas Keluar (BKO) telah terbentuk.
                </p>
              </div>

              {/* BKO Receipt Style Details */}
              <div className="p-5 bg-slate-50 rounded-2xl space-y-3.5 border border-slate-100 text-xs">
                <div className="border-b border-dashed border-slate-200 pb-2.5 flex justify-between items-center text-[10px] font-black text-slate-400">
                  <span>BUKTI KAS KELUAR (BKO)</span>
                  <span className="font-mono text-slate-900">{successData.bkoNumber}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span className="text-slate-400">Metode &amp; Akun:</span>
                    <span>{successData.account?.nama_akun} ({successData.account?.kelompok_dana})</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span className="text-slate-400">Jumlah Bantuan:</span>
                    <span>{successData.proposalsCount} Proposal (Batch)</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span className="text-slate-400">Tanggal Transaksi:</span>
                    <span>{new Date().toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-3 text-base">
                  <span className="text-slate-500">Total Nominal Cair:</span>
                  <span className="text-emerald-600 font-mono">{formatCurrency(successData.totalNominal)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    alert('Melakukan print Bukti Kas Keluar (BKO) ke printer kasir...');
                  }}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="size-4" />
                  Cetak BKO
                </button>
                <button 
                  type="button"
                  onClick={() => setSuccessData(null)}
                  className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedDetailProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Proposal (Simulator)</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedDetailProposal.agendaNo}</p>
                </div>
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: Data Pemohon, Informasi Bantuan & Hasil Kuesioner */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <DetailItem label="Nama Lengkap" value={selectedDetailProposal.namaPemohon} />
                        </div>
                        <DetailItem label="NIK" value={selectedDetailProposal.nik} />
                        <DetailItem label="Alamat" value={selectedDetailProposal.alamat} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Program" value={selectedDetailProposal.program || 'Umum'} />
                        <DetailItem label="Jenis" value={selectedDetailProposal.jenisPermohonan} />
                        <DetailItem label="Tipe Bantuan" value={selectedDetailProposal.tipeBantuan || '-'} />
                        <DetailItem label="Asnaf (Golongan Penerima)" value={selectedDetailProposal.asnaf || '—'} />
                      </div>
                    </div>

                    {/* Hasil Survei Lapangan Detil */}
                    {selectedDetailProposal.survey_data && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                          Detail Kuesioner Survei
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {(() => {
                            const sectionCodes = Array.from(new Set(dynamicQuestions.map(q => q.section))).sort();
                            return sectionCodes.map(secCode => {
                              const firstQ = dynamicQuestions.find(q => q.section === secCode);
                              const sectionTitle = firstQ ? firstQ.sectionName : secCode;
                              const sectionQuestions = dynamicQuestions.filter(q => q.section === secCode);
                              
                              const items = sectionQuestions.map(q => ({
                                label: q.label,
                                value: getLabelForScore(q.id, (selectedDetailProposal.survey_data as any)?.[q.id], dynamicQuestions)
                              }));
                              
                              return (
                                <div key={secCode} className="col-span-2">
                                  <SurveyDetailSection title={sectionTitle} items={items} />
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Hasil Evaluasi, Rekomendasi & Embed Proposal */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                        Hasil Evaluasi &amp; Rekomendasi
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Skor Survei" value={selectedDetailProposal.score?.toString() || '0'} />
                        <DetailItem label="Tingkat Urgensi" value={selectedDetailProposal.urgencyLevel || 'Normal'} />
                        
                        <div className="col-span-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Rekomendasi Kas (Kabag Pendistribusian)</p>
                          <p className="text-sm font-bold text-slate-900">{selectedDetailProposal.rekomendasi_kabag || 'Zakat'}</p>
                        </div>

                        <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Pencairan</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(selectedDetailProposal.nominal || 0)}</p>
                        </div>

                        {selectedDetailProposal.hasil_identifikasi && (
                          <div className="col-span-2">
                            <DetailItem label="Hasil Identifikasi Lapangan" value={selectedDetailProposal.hasil_identifikasi} />
                          </div>
                        )}

                        {selectedDetailProposal.survey_data?.catatanLapangan && (
                          <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Catatan Relawan di Lapangan</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedDetailProposal.survey_data.catatanLapangan}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Dokumen */}
                    <div className="space-y-3">
                      {selectedDetailProposal.fileGdriveLink ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <FileText className="size-3.5" /> Dokumen Proposal
                            </h4>
                            <a href={selectedDetailProposal.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                               className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                              Buka di tab baru <ExternalLink className="size-3" />
                            </a>
                          </div>
                          {getEmbedUrl(selectedDetailProposal.fileGdriveLink) ? (
                            <iframe 
                              src={getEmbedUrl(selectedDetailProposal.fileGdriveLink)!} 
                              className="w-full h-80 rounded-xl border border-slate-200" 
                              title="Dokumen Proposal" 
                            />
                          ) : (
                            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                              <p className="text-xs text-slate-500 font-semibold italic">Link Dokumen: <a href={selectedDetailProposal.fileGdriveLink} target="_blank" rel="noreferrer" className="text-primary underline font-bold">{selectedDetailProposal.fileGdriveLink}</a></p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500 font-semibold italic">File proposal tidak dilampirkan atau tidak ada scan dokumen.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all text-center"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{value}</p>
    </div>
  );
}

function SurveyDetailSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">{item.label}</span>
            <span className="font-bold text-slate-800 text-right max-w-[150px] truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLabelForScore(field: string, score: any, dynamicQuestions?: any[]): string {
  if (score === undefined || score === null || score === 0 || score === '') return '-';
  
  if (dynamicQuestions && dynamicQuestions.length > 0) {
    const question = dynamicQuestions.find(q => q.id === field);
    if (question) {
      if (question.type === 'checkbox') {
        if (Array.isArray(score)) {
          const selectedLabels = score.map((val: any) => {
            const option = question.options?.find((opt: any) => opt.val === val || opt.val === Number(val) || opt.label === val);
            return option ? option.label : val;
          });
          return selectedLabels.join(', ') || '-';
        }
      } else if (question.type === 'text') {
        return String(score);
      } else {
        if (question.options) {
          const option = question.options.find((opt: any) => opt.val === score || opt.val === Number(score) || opt.label === score);
          if (option) return option.label;
        }
      }
    }
  }

  const mapping: Record<string, Record<number, string>> = {
    luasBangunan: { 3: '≤ 8 m²', 2: '8-10 m²', 1: '> 10 m²' },
    jenisLantai: { 3: 'Tanah', 2: 'Semen', 1: 'Keramik' },
    jenisDinding: { 3: 'Kayu/Bambu', 2: 'Bata Polos', 1: 'Tembok Rapi' },
    statusTempatTinggal: { 4: 'Kost', 3: 'Kontrak', 2: 'Menumpang', 1: 'Milik Sendiri' },
    pekerjaanKepala: { 3: 'Pengangguran', 2: 'Buruh/Nelayan', 1: 'Karyawan' },
    frekuensiMakan: { 3: '1x Sehari', 2: '2x Sehari', 1: '3x Sehari' },
    kemampuanLauk: { 3: 'Jarang', 2: '2x Seminggu', 1: 'Setiap Hari' },
    keadaanFisik: { 4: 'Manula Sakit', 3: 'Manula Sehat', 2: 'Cacat Produktif', 1: 'Sehat/Produktif' },
    hutang: { 2: 'Rentenir/Pinjol', 1: 'Bank/Tidak Ada' },
    kesehatan: { 2: 'Tanah/Non-KIS', 1: 'BPJS/KIS' }
  };

  return mapping[field]?.[score] || '-';
}

function getEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  
  if (link.includes('drive.google.com')) {
    const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    const openMatch = link.match(/[?&]id=([^&]+)/);
    if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    return link.replace(/\/view.*?(\?|$)/, '/preview$1');
  }
  
  return link;
}
