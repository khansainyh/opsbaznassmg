import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  X, 
  ClipboardList, 
  Banknote,
  ArrowUpRight,
  Coins,
  Info,
  FileText,
  ExternalLink,
  Target,
  Filter,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanPencairanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanPencairan({ data }: AntreanPencairanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [isPilarDropdownOpen, setIsPilarDropdownOpen] = useState(false);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [searchProgramQuery, setSearchProgramQuery] = useState('');
  const [rkatInfo, setRkatInfo] = useState<{
    name: string;
    code: string;
    keterangan?: string;
    asnaf?: string;
    unitCost?: number;
    sisaPagu?: number;
    loading?: boolean;
  } | null>(null);

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

  const programTipeMap = useMemo(() => {
    const map: { [code: string]: string } = {};
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        map[prog.code] = prog.tipe || 'Konsumtif';
      });
    });
    return map;
  }, [pilars]);

  const getParentProgramCode = (code?: string) => {
    if (!code) return '';
    const clean = code.trim();
    const parts = clean.split('.');
    if (parts.length > 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return clean;
  };

  const allPrograms = useMemo(() => {
    const progs: { code: string; name: string; pilarName: string }[] = [];
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        progs.push({
          code: prog.code,
          name: prog.name,
          pilarName: pilar.name
        });
      });
    });
    return progs;
  }, [pilars]);

  const pilarNames = useMemo(() => {
    return Array.from(new Set(allPrograms.map(p => p.pilarName)));
  }, [allPrograms]);

  const handlePilarChange = (pilarName: string) => {
    setSelectedPilarFilter(pilarName);
    if (pilarName) {
      const belongs = allPrograms.find(p => p.code === selectedProgramFilter && p.pilarName === pilarName);
      if (!belongs) {
        setSelectedProgramFilter('');
      }
    }
  };

  useEffect(() => {
    if (!selectedProposal) return;
    
    const getTemplateKey = () => {
      let tipe = 'Konsumtif';
      const p = selectedProposal as any;
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
  }, [selectedProposal, programTipeMap]);

  useEffect(() => {
    if (!selectedProposal) {
      setRkatInfo(null);
      return;
    }

    setRkatInfo({ name: '', code: '', loading: true });

    const pCode = selectedProposal.programCode || selectedProposal.jenisPermohonan || '';
    const asnaf = selectedProposal.asnaf || '';
    const amt = selectedProposal.nominal || 0;

    axios.get(`/api/finance/check-penyaluran-guard?proposalId=${selectedProposal.id}&programCode=${pCode}&asnaf=${asnaf}&amount=${amt}`)
      .then(res => {
        const acts = res.data?.rkat_activities || [];
        const matchedAct = acts.find((a: any) => a.id === selectedProposal.rkatActivityId) ||
                           acts.find((a: any) => a.asnaf && a.asnaf.toLowerCase() === asnaf.toLowerCase()) ||
                           acts[0];

        setRkatInfo({
          name: matchedAct?.name || res.data?.rkat_spesifik?.nama_kegiatan || selectedProposal.jenisPermohonan || 'Kegiatan Penyaluran',
          code: matchedAct?.programCode || selectedProposal.programCode || res.data?.rkat_spesifik?.kode_coa || '-',
          keterangan: matchedAct?.keterangan || matchedAct?.keterangan_spesifikasi || res.data?.rkat_spesifik?.keterangan || '',
          asnaf: matchedAct?.asnaf || selectedProposal.asnaf || 'Semua Asnaf',
          unitCost: matchedAct?.nominal || matchedAct?.unitCost || 0,
          sisaPagu: matchedAct?.sisa_pagu ?? res.data?.rkat_spesifik?.sisa_pagu,
          loading: false
        });
      })
      .catch(err => {
        console.error('Failed to fetch RKAT info:', err);
        setRkatInfo({
          name: selectedProposal.jenisPermohonan || 'Kegiatan Penyaluran',
          code: selectedProposal.programCode || selectedProposal.rkatActivityId || '-',
          asnaf: selectedProposal.asnaf || 'Semua Asnaf',
          loading: false
        });
      });
  }, [selectedProposal]);

  // Filter only proposals with 'Pencairan Dana', 'Antrean Bantuan', 'ACC', 'Antrean Pencairan' status
  const filteredData = useMemo(() => {
    const res = data.filter(item => {
      const s = (item.status || '').toLowerCase().replace(/_/g, ' ').trim();
      const isPencairan = s === 'pencairan dana' || s === 'antrean bantuan' || s === 'antrean pencairan' || s === 'acc';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      if (!isPencairan || !searchMatch) return false;

      // Pilar filter
      if (selectedPilarFilter) {
        if (item.program !== selectedPilarFilter) return false;
      }

      // Program filter
      if (selectedProgramFilter) {
        const itemCode = (item.programCode || item.jenisPermohonan || '').trim();
        const cleanCode = getParentProgramCode(itemCode);
        const filterCleanCode = getParentProgramCode(selectedProgramFilter);
        if (cleanCode !== filterCleanCode && item.jenisPermohonan !== selectedProgramFilter && item.programCode !== selectedProgramFilter) return false;
      }

      return true;
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
  }, [data, searchTerm, selectedPilarFilter, selectedProgramFilter]);

  const stats = useMemo(() => {
    const pencairanData = data.filter(d => {
      const s = (d.status || '').toLowerCase().replace(/_/g, ' ').trim();
      return s === 'pencairan dana' || s === 'antrean bantuan' || s === 'antrean pencairan' || s === 'acc';
    });
    const totalNominal = pencairanData.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    
    // Accumulate cash balance for Zakat, ISTT, IST
    const kasTersedia = accounts
      .filter(a => 
        a.tipe_kas === 'TUNAI' && (
          a.kelompok_dana === 'ZAKAT' || 
          a.kelompok_dana === 'INFAK_TIDAK_TERIKAT' || 
          a.kelompok_dana === 'INFAK_TERIKAT'
        )
      )
      .reduce((sum, item) => sum + Number(item.saldo), 0);
    
    return {
      total: pencairanData.length,
      totalNominal,
      kasTersedia,
      rekomendasiKas: Math.max(0, totalNominal - kasTersedia)
    };
  }, [data, accounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Antrean Pencairan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Antrean Pencairan
        </h2>
        <p className="text-slate-500 font-medium">
          Daftar bantuan yang menunggu proses pencairan dana oleh bagian keuangan.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Antrean Pencairan" 
          value={formatCurrency(stats.totalNominal)} 
          icon={<Banknote className="size-5" />}
          color="amber"
          subtitle={`Akumulasi ${stats.total} bantuan`}
        />
        <StatCard 
          title="Kas Tersedia (Pencairan)" 
          value={formatCurrency(stats.kasTersedia)} 
          icon={<ArrowUpRight className="size-5" />}
          color="blue"
          subtitle="Akumulasi Kas Zakat, ISTT, & IST"
        />
        <StatCard 
          title="Rekomendasi Penarikan Kas" 
          value={formatCurrency(stats.rekomendasiKas)} 
          icon={<Coins className="size-5" />}
          color="emerald"
          subtitle={stats.rekomendasiKas > 0 ? "Kekurangan dana tunai" : "Kas tunai mencukupi"}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Nama..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Dropdown Filter Pilar */}
            <div className="relative w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full">
                <button 
                  onClick={() => setIsPilarDropdownOpen(!isPilarDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between sm:justify-start gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all border w-full sm:w-auto",
                    selectedPilarFilter 
                      ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 shadow-sm shadow-primary/5" 
                      : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter className={cn("size-4 shrink-0", selectedPilarFilter ? "text-primary animate-pulse" : "text-slate-400")} />
                    <span className="truncate">
                      {selectedPilarFilter ? `Pilar: ${selectedPilarFilter}` : "Pilih Pilar Bantuan"}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400 sm:hidden" />
                </button>
                {selectedPilarFilter && (
                  <button 
                    onClick={() => handlePilarChange('')}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Hapus Filter Pilar"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isPilarDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsPilarDropdownOpen(false)} />
                  <div className="absolute left-0 sm:right-auto mt-2 w-full sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                    <button 
                      onClick={() => {
                        handlePilarChange('');
                        setIsPilarDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold",
                        !selectedPilarFilter && "bg-primary/5 text-primary font-bold"
                      )}
                    >
                      Semua Pilar
                    </button>
                    {pilarNames.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          handlePilarChange(name);
                          setIsPilarDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold mt-0.5",
                          selectedPilarFilter === name && "bg-primary/5 text-primary font-bold"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Search Dropdown for Program / Kegiatan */}
            <div className="relative w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full">
                <button 
                  onClick={() => setIsProgramDropdownOpen(!isProgramDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between sm:justify-start gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all border w-full sm:w-auto",
                    selectedProgramFilter 
                      ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 shadow-sm shadow-primary/5" 
                      : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter className={cn("size-4 shrink-0", selectedProgramFilter ? "text-primary animate-pulse" : "text-slate-400")} />
                    <span className="truncate max-w-[200px]">
                      {selectedProgramFilter ? (
                        <span>Program: {allPrograms.find(p => p.code === selectedProgramFilter)?.name || selectedProgramFilter}</span>
                      ) : (
                        <span>Pilih Program / Kegiatan</span>
                      )}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400 sm:hidden" />
                </button>
                {selectedProgramFilter && (
                  <button 
                    onClick={() => {
                      setSelectedProgramFilter('');
                      setSearchProgramQuery('');
                    }}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Hapus Filter Program"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isProgramDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProgramDropdownOpen(false)} />
                  <div className="absolute left-0 sm:right-auto mt-2 w-full sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-2">
                    <input 
                      type="text"
                      placeholder="Cari program / kegiatan..."
                      className="w-full text-xs bg-slate-50 border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-primary focus:border-primary outline-none font-semibold text-slate-800"
                      value={searchProgramQuery}
                      onChange={(e) => setSearchProgramQuery(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto custom-scrollbar text-xs font-semibold text-slate-700">
                      <button 
                        onClick={() => {
                          setSelectedProgramFilter('');
                          setIsProgramDropdownOpen(false);
                          setSearchProgramQuery('');
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors",
                          !selectedProgramFilter && "bg-primary/5 text-primary font-bold"
                        )}
                      >
                        Semua Program &amp; Kegiatan
                      </button>
                      {allPrograms
                        .filter(p => !selectedPilarFilter || p.pilarName === selectedPilarFilter)
                        .filter(p => p.name.toLowerCase().includes(searchProgramQuery.toLowerCase()) || p.pilarName.toLowerCase().includes(searchProgramQuery.toLowerCase()))
                        .map(prog => (
                          <button
                            key={prog.code}
                            onClick={() => {
                              setSelectedProgramFilter(prog.code);
                              setIsProgramDropdownOpen(false);
                              setSearchProgramQuery('');
                            }}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors mt-0.5 flex flex-col gap-0.5",
                              selectedProgramFilter === prog.code && "bg-primary/5 text-primary font-bold"
                            )}
                          >
                            <span className="block text-[10px] text-slate-400 uppercase font-black">{prog.pilarName}</span>
                            <span className="block whitespace-normal break-words leading-tight">{prog.name} ({prog.code})</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Urgensi &amp; Skor</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                      {item.agendaNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {item.namaAnak ? (
                        <>
                          <p className="text-sm font-bold text-slate-900">{item.namaAnak}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.namaInstansi || item.namaPemohon || 'Anak / Siswa'}</p>
                        </>
                      ) : item.jenisPengajuan === 'Lembaga' || item.namaInstansi ? (
                        <>
                          <p className="text-sm font-bold text-slate-900">{item.namaInstansi || item.namaPemohon}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.namaPemohon || 'Lembaga'}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                          <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik}</p>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase w-fit bg-primary/5 text-primary border border-primary/10">
                        {item.program || 'Umum'}
                      </span>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                        {item.jenisPermohonan}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border w-fit uppercase",
                        item.urgencyLevel === 'Sangat Kritis' || item.urgencyLevel === 'Kritis' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        item.urgencyLevel === 'Tinggi' ? "bg-orange-50 text-orange-600 border-orange-100" :
                        item.urgencyLevel === 'Sedang' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-slate-50 text-slate-400 border-slate-200"
                      )}>
                        {item.urgencyLevel || 'Rendah'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Skor: <strong className="font-bold text-slate-700">{item.score || 0}</strong>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(item.nominal || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border",
                      item.tipeBantuan === 'Tunai' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.tipeBantuan === 'Barang' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-slate-50 text-slate-400 border-slate-200"
                    )}>
                      {item.tipeBantuan || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={() => {
                          setSelectedProposal(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Detail"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada antrean pencairan saat ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedProposal && (
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
                  <h3 className="text-xl font-black text-slate-900">Detail Pencairan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
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
                          <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        </div>
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan &amp; RKAT</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Program Pilar" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis Permohonan / Program" value={selectedProposal.jenisPermohonan || '-'} />

                        <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <Target className="size-3.5" /> Kegiatan RKAT Penyaluran
                            </p>
                            {rkatInfo?.code && rkatInfo.code !== '-' && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black font-mono">
                                Kode: {rkatInfo.code}
                              </span>
                            )}
                          </div>
                          {rkatInfo?.loading ? (
                            <p className="text-xs text-slate-400 font-medium italic">Memuat informasi RKAT...</p>
                          ) : (
                            <>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Nama Program / Kegiatan Kerja</p>
                                <p className="text-xs font-black text-slate-900 leading-relaxed">
                                  {rkatInfo?.name || selectedProposal.jenisPermohonan || 'Kegiatan Penyaluran RKAT'}
                                </p>
                              </div>

                              {rkatInfo?.keterangan ? (
                                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg space-y-0.5">
                                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Keterangan Spesifikasi Kegiatan RKAT</p>
                                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                                    {rkatInfo.keterangan}
                                  </p>
                                </div>
                              ) : null}

                              {selectedProposal.keterangan ? (
                                <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-lg space-y-0.5">
                                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Keterangan / Peruntukan Proposal</p>
                                  <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
                                    "{selectedProposal.keterangan}"
                                  </p>
                                </div>
                              ) : null}

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Asnaf Target:</span> <span className="font-bold text-slate-700">{rkatInfo?.asnaf || selectedProposal.asnaf || 'Semua Asnaf'}</span>
                                </div>
                                {rkatInfo?.unitCost ? (
                                  <div>
                                    <span className="text-slate-400">Target Unit Cost:</span> <span className="font-bold text-slate-700">{formatCurrency(rkatInfo.unitCost)}</span>
                                  </div>
                                ) : null}
                                {rkatInfo?.sisaPagu !== undefined && (
                                  <div className="col-span-2 flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                                    <span className="text-slate-500 font-medium">Sisa Pagu RKAT Penyaluran:</span>
                                    <span className={cn("font-black text-xs", (rkatInfo.sisaPagu || 0) >= (selectedProposal.nominal || 0) ? "text-emerald-600" : "text-amber-600")}>
                                      {formatCurrency(rkatInfo.sisaPagu || 0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <DetailItem label="Tipe Bantuan" value={selectedProposal.tipeBantuan || '-'} />
                        <DetailItem label="Asnaf (Golongan Penerima)" value={selectedProposal.asnaf || '—'} />
                      </div>
                    </div>

                    {/* Hasil Survei Lapangan Detil */}
                    {selectedProposal.survey_data && (
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
                                value: getLabelForScore(q.id, (selectedProposal.survey_data as any)?.[q.id], dynamicQuestions)
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
                        <DetailItem label="Skor Survei" value={selectedProposal.score?.toString() || '0'} />
                        <DetailItem label="Tingkat Urgensi" value={selectedProposal.urgencyLevel || 'Normal'} />
                        
                        <div className="col-span-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Rekomendasi Kas (Kabag Pendistribusian)</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProposal.rekomendasi_kabag || 'Zakat'}</p>
                        </div>

                        <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Pencairan</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(selectedProposal.nominal || 0)}</p>
                        </div>

                        {selectedProposal.hasil_identifikasi && (
                          <div className="col-span-2">
                            <DetailItem label="Hasil Identifikasi Lapangan" value={selectedProposal.hasil_identifikasi} />
                          </div>
                        )}

                        {selectedProposal.survey_data?.catatanLapangan && (
                          <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Catatan Relawan di Lapangan</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedProposal.survey_data.catatanLapangan}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Dokumen */}
                    <div className="space-y-3">
                      {selectedProposal.fileGdriveLink ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <FileText className="size-3.5" /> Dokumen Proposal
                            </h4>
                            <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                               className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                              Buka di tab baru <ExternalLink className="size-3" />
                            </a>
                          </div>
                          {getEmbedUrl(selectedProposal.fileGdriveLink) ? (
                            <iframe 
                              src={getEmbedUrl(selectedProposal.fileGdriveLink)!} 
                              className="w-full h-80 rounded-xl border border-slate-200" 
                              title="Dokumen Proposal" 
                            />
                          ) : (
                            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                              <p className="text-xs text-slate-500 font-semibold italic">Link Dokumen: <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noreferrer" className="text-primary underline font-bold">{selectedProposal.fileGdriveLink}</a></p>
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

function StatCard({ title, value, icon, color, subtitle }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red' | 'blue',
  subtitle?: string
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
            <Info className="size-3" />
            {subtitle}
          </p>
        )}
      </div>
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
