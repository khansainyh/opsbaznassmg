import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown,
  Eye, 
  CheckCircle2, 
  FileText,
  X,
  ClipboardList,
  Banknote,
  DownloadCloud,
  Calendar,
  MessageCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface RealisasiBantuanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function RealisasiBantuan({ data, onUpdate }: RealisasiBantuanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  
  const [pilars, setPilars] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Konsumtif' | 'Produktif'>('Semua');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [searchProgramQuery, setSearchProgramQuery] = useState('');
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('');
  const [isPilarDropdownOpen, setIsPilarDropdownOpen] = useState(false);

  const pilarNames = useMemo(() => {
    return (pilars || []).map(p => p.name);
  }, [pilars]);

  useEffect(() => {
    axios.get('/api/pilars')
      .then(res => setPilars(res.data))
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

  const handlePilarChange = (pilarName: string) => {
    setSelectedPilarFilter(pilarName);
    if (pilarName) {
      const belongs = allPrograms.find(p => p.code === selectedProgramFilter && p.pilarName === pilarName);
      if (!belongs) {
        setSelectedProgramFilter('');
      }
    }
  };
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isRealisasi = item.status === 'Realisasi Bantuan';
      if (!isRealisasi) return false;

      // Grouping filter (Konsumtif vs Produktif)
      if (activeTab !== 'Semua') {
        const cleanCode = getParentProgramCode(item.programCode);
        const tipe = programTipeMap[cleanCode] || 'Konsumtif';
        if (tipe !== activeTab) return false;
      }

      // Pilar filter
      if (selectedPilarFilter) {
        if (item.program !== selectedPilarFilter) return false;
      }

      // Program filter
      if (selectedProgramFilter) {
        const cleanCode = getParentProgramCode(item.programCode);
        const filterCleanCode = getParentProgramCode(selectedProgramFilter);
        if (cleanCode !== filterCleanCode) return false;
      }

      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return searchMatch;
    });
  }, [data, searchTerm, activeTab, selectedProgramFilter, selectedPilarFilter, programTipeMap]);

  const stats = useMemo(() => {
    const realisasiData = data.filter(d => d.status === 'Realisasi Bantuan');
    const totalNominal = realisasiData.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    const scheduledCount = realisasiData.filter(d => d.jadwalRealisasi).length;
    
    return {
      total: realisasiData.length,
      totalNominal,
      scheduled: scheduledCount
    };
  }, [data]);

  const handleComplete = async (id: string) => {
    try {
      // Persist the status in database as 'Antrean_Arsip' to proceed to archiving
      await axios.put(`/api/proposals/${id}`, {
        status: 'Antrean_Arsip'
      });

      const updatedData = data.map(item => 
        item.id === id ? { ...item, status: 'Antrean Arsip' as any } : item
      );
      onUpdate(updatedData);

      if (selectedProposal?.id === id) {
        setSelectedProposal(null);
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal memindahkan ke antrean arsip: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSchedule = () => {
    if (!selectedProposal || !scheduleDate) return;
    const updatedData = data.map(item => 
      item.id === selectedProposal.id ? { ...item, jadwalRealisasi: scheduleDate } : item
    );
    onUpdate(updatedData);
    setIsScheduleModalOpen(false);
    setScheduleDate('');
  };

  const handleWhatsApp = (proposal: ProposalMemo) => {
    if (!proposal.noTelpon) {
      alert('Nomor telepon tidak tersedia.');
      return;
    }
    // Clean phone number
    let phone = proposal.noTelpon.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }
    
    const message = `Assalamu'alaikum Bpk/Ibu ${proposal.namaPemohon}, kami dari BAZNAS Kota Semarang ingin menginformasikan terkait realisasi bantuan Anda dengan No. Agenda ${proposal.agendaNo}. Mohon kesediaannya untuk...`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusStep = (item: ProposalMemo) => {
    if (!item.jadwalRealisasi) return { label: 'Jadwalkan', color: 'bg-amber-50 text-amber-600' };
    return { label: 'Siap Realisasi', color: 'bg-blue-50 text-blue-600' };
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
          <span className="text-slate-400 shrink-0">Pendistribusian &amp; Pendayagunaan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Realisasi Bantuan</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
              Realisasi Bantuan
            </h2>
            <p className="text-slate-500 font-medium">
              Layanan penyerahan dana atau barang bantuan secara langsung kepada mustahik yang telah disetujui.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Total Siap Realisasi" 
          value={stats.total.toString()} 
          icon={<FileText className="size-5" />}
          color="primary"
        />
        <StatCard 
          title="Total Nilai Bantuan" 
          value={formatCurrency(stats.totalNominal)} 
          icon={<Banknote className="size-5" />}
          color="emerald"
        />
        <StatCard 
          title="Sudah Terjadwal" 
          value={stats.scheduled.toString()} 
          icon={<Calendar className="size-5" />}
          color="amber"
        />
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tabs Grouping */}
        <div className="flex gap-2 border-b border-slate-100 px-4 pt-3 bg-slate-50/50">
          {(['Semua', 'Konsumtif', 'Produktif'] as const).map(tab => {
            const count = data.filter(d => {
              const isRealisasi = d.status === 'Realisasi Bantuan';
              if (!isRealisasi) return false;
              if (tab === 'Semua') return true;
              const cleanCode = getParentProgramCode(d.programCode);
              const tipe = programTipeMap[cleanCode] || 'Konsumtif';
              return tipe === tab;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-3 px-4 text-xs font-bold border-b-2 transition-all relative",
                  activeTab === tab 
                    ? "border-primary text-primary" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab === 'Semua' ? 'Semua Bantuan' : tab === 'Konsumtif' ? 'Bantuan Konsumtif' : 'Bantuan Produktif'}
                <span className={cn(
                  "ml-2 px-1.5 py-0.5 text-[9px] font-black rounded-full",
                  activeTab === tab ? "bg-primary/10 text-primary" : "bg-slate-200/60 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-650 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 bg-white"
            >
              {selectedIds.length === filteredData.length && filteredData.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4 text-slate-400" />
              )}
              Pilih Semua
            </button>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Nama / NIK..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {selectedIds.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all w-full sm:w-auto"
              >
                <DownloadCloud className="size-4" />
                EXPORT LAPORAN ({selectedIds.length})
              </motion.button>
            )}

            {/* Search Dropdown for Pilar */}
            <div className="relative w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full">
                <button 
                  onClick={() => setIsPilarDropdownOpen(!isPilarDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between sm:justify-start gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all border w-full",
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
                    onClick={() => {
                      handlePilarChange('');
                    }}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Hapus Filter Pilar"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isPilarDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsPilarDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-full sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
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

            {/* Search Dropdown for Program */}
            <div className="relative w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full">
                <button 
                  onClick={() => setIsProgramDropdownOpen(!isProgramDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between sm:justify-start gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all border w-full",
                    selectedProgramFilter 
                      ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 shadow-sm shadow-primary/5" 
                      : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter className={cn("size-4 shrink-0", selectedProgramFilter ? "text-primary animate-pulse" : "text-slate-400")} />
                    <span className="truncate">
                      {selectedProgramFilter ? (
                        <span>Program: {allPrograms.find(p => p.code === selectedProgramFilter)?.name || selectedProgramFilter}</span>
                      ) : (
                        <span>Pilih Program Bantuan</span>
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
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Hapus Filter Program"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isProgramDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProgramDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-full sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-2">
                    <input 
                      type="text"
                      placeholder="Cari program..."
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
                        Semua Program
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

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program &amp; Jenis</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tipe Bantuan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => {
                const statusStep = getStatusStep(item);
                return (
                  <tr 
                    key={item.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                      selectedIds.includes(item.id) && "bg-primary/5"
                    )}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(item.id)}>
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="size-5 text-primary" />
                        ) : (
                          <Square className="size-5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1.5 items-center flex-wrap">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-black uppercase w-fit",
                            item.program === 'Semarang Sehat' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            item.program === 'Semarang Taqwa' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                            item.program === 'Semarang Cerdas' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            item.program === 'Semarang Makmur' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-slate-50 text-slate-600 border border-slate-100"
                          )}>
                            {item.program || 'Umum'}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold border",
                            (programTipeMap[getParentProgramCode(item.programCode)] || 'Konsumtif') === 'Produktif'
                              ? "bg-purple-50 text-purple-600 border-purple-100"
                              : "bg-blue-50/50 text-blue-500 border-blue-100/50"
                          )}>
                            {programTipeMap[getParentProgramCode(item.programCode)] || 'Konsumtif'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                          {item.jenisPermohonan}
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
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase w-fit",
                          statusStep.color
                        )}>
                          {statusStep.label}
                        </span>
                        {item.jadwalRealisasi && (
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            Jadwal: {new Date(item.jadwalRealisasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsScheduleModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                          title="Jadwalkan"
                        >
                          <Calendar className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleWhatsApp(item)}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Hubungi WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleComplete(item.id)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Kirim ke Pengarsipan"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada bantuan yang siap direalisasikan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Card Stack */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {filteredData.length > 0 ? (
            <div className="p-4 space-y-4">
              {filteredData.map((item) => {
                const statusStep = getStatusStep(item);
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all space-y-3 relative bg-white",
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-350"
                    )}
                    onClick={() => toggleSelect(item.id)}
                  >
                    {/* Header Row: Checkbox, Agenda, and Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className="p-1 -ml-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-slate-300" />
                          )}
                        </button>
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          Agenda {item.agendaNo}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                          statusStep.color
                        )}>
                          {statusStep.label}
                        </span>
                      </div>
                    </div>

                    {/* Body Row: Mustahik, Program, and Nominal */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mustahik</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIK: {item.nik}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Program</p>
                          <div className="flex gap-1 items-center mt-1 flex-wrap">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                              item.program === 'Semarang Sehat' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              item.program === 'Semarang Taqwa' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                              item.program === 'Semarang Cerdas' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              item.program === 'Semarang Makmur' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              "bg-slate-50 text-slate-600 border border-slate-150"
                            )}>
                              {item.program || 'Umum'}
                            </span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                              (programTipeMap[getParentProgramCode(item.programCode)] || 'Konsumtif') === 'Produktif'
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : "bg-blue-50/50 text-blue-500 border-blue-100/50"
                            )}>
                              {(programTipeMap[getParentProgramCode(item.programCode)] || 'Konsumtif').substring(0, 4)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nominal Bantuan</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{formatCurrency(item.nominal || 0)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe Bantuan</p>
                          <span className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mt-1",
                            item.tipeBantuan === 'Tunai' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            item.tipeBantuan === 'Barang' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            "bg-slate-50 text-slate-400 border-slate-200"
                          )}>
                            {item.tipeBantuan || '-'}
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jadwal Realisasi</p>
                          <p className="text-[11px] font-bold text-slate-700 mt-1">
                            {item.jadwalRealisasi 
                              ? new Date(item.jadwalRealisasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Belum Dijadwalkan'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsScheduleModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm"
                        >
                          <Calendar className="size-3.5" />
                          Jadwal
                        </button>
                        <button 
                          onClick={() => handleWhatsApp(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250/50 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleComplete(item.id)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-lg transition-all shadow-sm"
                          title="Kirim ke Antrean Arsip"
                        >
                          <CheckCircle2 className="size-4 text-emerald-650" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-lg transition-all shadow-sm"
                          title="Lihat Detail"
                        >
                          <Eye className="size-4 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <ClipboardList className="size-12 opacity-10" />
                <p className="text-sm font-medium">Tidak ada bantuan yang siap direalisasikan.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsScheduleModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <h3 className="text-xl font-black text-slate-900">Jadwalkan Bantuan</h3>
                <button 
                  onClick={() => setIsScheduleModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pilih Tanggal Realisasi</label>
                  <input 
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Menjadwalkan bantuan untuk <span className="font-bold text-primary">{selectedProposal.namaPemohon}</span>. 
                    Pastikan logistik atau dana sudah siap pada tanggal tersebut.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={handleSchedule}
                  disabled={!scheduleDate}
                  className="w-full px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Simpan Jadwal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Realisasi Bantuan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                      <div className="space-y-4">
                        <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        <DetailItem label="No. Telepon" value={selectedProposal.noTelpon || '-'} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat} />
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan</h4>
                      <div className="space-y-4">
                        <DetailItem label="Program" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                        <DetailItem label="Tipe Bantuan" value={selectedProposal.tipeBantuan || 'Belum Ditentukan'} />
                        <DetailItem label="Jadwal Realisasi" value={selectedProposal.jadwalRealisasi ? new Date(selectedProposal.jadwalRealisasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum Dijadwalkan'} />
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Bantuan</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(selectedProposal.nominal || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Tutup
                </button>
                <button 
                  onClick={() => {
                    handleComplete(selectedProposal.id);
                    setIsDetailModalOpen(false);
                  }}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                >
                  Lanjut ke Pengarsipan
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

function StatCard({ title, value, icon, color }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red'
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600'
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
      </div>
    </div>
  );
}
