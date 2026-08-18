import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  DownloadCloud,
  CheckSquare,
  Square,
  Upload,
  Camera,
  Trash2,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getMustahikDisplayName } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanArsipProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanArsip({ data, onUpdate }: AntreanArsipProps) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Staf_Pelaporan';

  const [searchTerm, setSearchTerm] = useState('');
  const [pilars, setPilars] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Konsumtif' | 'Produktif'>('Semua');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [searchProgramQuery, setSearchProgramQuery] = useState('');
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('');
  const [isPilarDropdownOpen, setIsPilarDropdownOpen] = useState(false);
  const [kuitansiFilter, setKuitansiFilter] = useState<'semua' | 'belum_kembali' | 'sudah_kembali'>('semua');
  const [isKuitansiDropdownOpen, setIsKuitansiDropdownOpen] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // File states for the active proposal upload
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [kuitansiTtd, setKuitansiTtd] = useState<File | null>(null);
  const [kuitansiPreview, setKuitansiPreview] = useState<string | null>(null);

  // File input refs
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const kuitansiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get('/api/pilars')
      .then(res => setPilars(res.data))
      .catch(console.error);
  }, []);

  const pilarNames = useMemo(() => {
    return (pilars || []).map(p => p.name);
  }, [pilars]);

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

  const resetAllFilters = () => {
    setActiveTab('Semua');
    setSelectedPilarFilter('');
    setSelectedProgramFilter('');
    setSearchProgramQuery('');
    setKuitansiFilter('semua');
    setSearchTerm('');
  };

  const hasActiveFilters = activeTab !== 'Semua' || !!selectedPilarFilter || !!selectedProgramFilter || kuitansiFilter !== 'semua' || !!searchTerm;

  // Filter proposals with 'Antrean Arsip' status and filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isAntreanArsip = item.status === 'Antrean Arsip';
      if (!isAntreanArsip) return false;

      // Grouping tab (Semua, Konsumtif, Produktif)
      if (activeTab !== 'Semua') {
        const cleanCode = getParentProgramCode(item.programCode);
        const tipe = programTipeMap[cleanCode] || 'Konsumtif';
        if (tipe !== activeTab) return false;
      }

      // Pilar filter
      if (selectedPilarFilter) {
        if (item.program !== selectedPilarFilter) return false;
      }

      // Program / Kegiatan filter
      if (selectedProgramFilter) {
        const cleanCode = getParentProgramCode(item.programCode);
        const filterCleanCode = getParentProgramCode(selectedProgramFilter);
        if (cleanCode !== filterCleanCode) return false;
      }

      // Kuitansi filter
      const sData = item.survey_data as any;
      const hasKuitansi = !!(sData && sData.kuitansi_ditandatangani);
      if (kuitansiFilter === 'belum_kembali' && hasKuitansi) return false;
      if (kuitansiFilter === 'sudah_kembali' && !hasKuitansi) return false;

      // Search match
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);

      return searchMatch;
    });
  }, [data, searchTerm, activeTab, selectedPilarFilter, selectedProgramFilter, kuitansiFilter, programTipeMap]);

  // Statistics helper
  const stats = useMemo(() => {
    const archiveQueue = data.filter(d => d.status === 'Antrean Arsip');
    const fullyArchived = data.filter(d => d.status === 'Selesai').length;
    
    // Calculate how many of the queue are missing foto realisasi
    const missingFoto = archiveQueue.filter(d => {
      const sData = d.survey_data as any;
      return !sData || !sData.bukti_foto_realisasi;
    }).length;

    // Calculate how many of the queue are missing kuitansi
    const missingKuitansi = archiveQueue.filter(d => {
      const sData = d.survey_data as any;
      return !sData || !sData.kuitansi_ditandatangani;
    }).length;

    const hasKuitansiCount = archiveQueue.filter(d => {
      const sData = d.survey_data as any;
      return !!(sData && sData.kuitansi_ditandatangani);
    }).length;
    
    return {
      totalQueue: archiveQueue.length,
      missingFoto,
      missingKuitansi,
      hasKuitansi: hasKuitansiCount,
      archived: fullyArchived
    };
  }, [data]);

  // Open upload modal and initialize current uploads if any
  const openUploadModal = (proposal: ProposalMemo) => {
    setSelectedProposal(proposal);
    setIsUploadModalOpen(true);
    
    // Check if there is already uploaded data inside survey_data JSON
    const surveyData = proposal.survey_data as any;
    if (surveyData) {
      setFotoPreview(surveyData.bukti_foto_realisasi || null);
      setKuitansiPreview(surveyData.kuitansi_ditandatangani || null);
    } else {
      setFotoPreview(null);
      setKuitansiPreview(null);
    }
    setFotoFile(null);
    setKuitansiTtd(null);
  };

  // Close and reset uploads
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedProposal(null);
    setFotoPreview(null);
    setFotoFile(null);
    setKuitansiTtd(null);
    setKuitansiPreview(null);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKuitansiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKuitansiTtd(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setKuitansiPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save files & archive completely (sets status to 'Selesai') or save draft (keeps 'Antrean Arsip')
  const handleSaveArchive = async (markAsSelesai: boolean = true) => {
    if (!selectedProposal) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      const targetStatus = markAsSelesai ? 'Selesai' : 'Antrean Arsip';
      formData.append('status', targetStatus);

      const currentSurveyData = (selectedProposal.survey_data as any) || {};
      const updatedSurveyData = {
        ...currentSurveyData,
        bukti_foto_realisasi: fotoPreview && !fotoFile ? fotoPreview : (currentSurveyData.bukti_foto_realisasi || ''),
        kuitansi_ditandatangani: kuitansiPreview && !kuitansiTtd ? kuitansiPreview : (currentSurveyData.kuitansi_ditandatangani || ''),
        updated_at: new Date().toISOString(),
        ...(markAsSelesai ? { archived_at: new Date().toISOString() } : {})
      };

      if (fotoFile) {
        formData.append('bukti_foto_realisasi', fotoFile);
      }
      if (kuitansiTtd) {
        formData.append('kuitansi_ditandatangani', kuitansiTtd);
      }

      formData.append('survey_data', JSON.stringify(updatedSurveyData));

      // Call API to update status and persist survey_data with files
      const response = await axios.put(`/api/proposals/${selectedProposal.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const finalSurveyData = response.data?.data?.survey_data || response.data?.survey_data || updatedSurveyData;

      // Update local context
      const updatedData = data.map(item => 
        item.id === selectedProposal.id 
          ? { 
              ...item, 
              status: targetStatus as any,
              survey_data: finalSurveyData
            } 
          : item
      );
      
      onUpdate(updatedData);
      closeUploadModal();
      alert(markAsSelesai ? 'Berhasil menyelesaikan & mengarsipkan proposal!' : 'Draf berkas dokumen berhasil disimpan!');
    } catch (e: any) {
      console.error(e);
      alert('Gagal menyimpan arsip: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-55/30">
      
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Pendistribusian &amp; Pendayagunaan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Antrean Arsip</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
                Antrean Arsip
              </h2>
              {isReadOnly && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <Eye className="size-3.5" />
                  Akses Pelaporan (View Only)
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium">
              Layanan pengarsipan digital atas dokumen dan bukti penyaluran bantuan yang telah direalisasikan.
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
          title="Menunggu Dokumentasi" 
          value={stats.missingFoto.toString()} 
          icon={<Camera className="size-5" />}
          color="primary"
        />
        <StatCard 
          title="Menunggu Kuitansi" 
          value={stats.missingKuitansi.toString()} 
          icon={<FileText className="size-5" />}
          color="red"
        />
        <StatCard 
          title="Selesai Diarsipkan" 
          value={stats.archived.toString()} 
          icon={<CheckCircle2 className="size-5" />}
          color="emerald"
        />
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tabs Grouping: Semua Bantuan, Bantuan Konsumtif, Bantuan Produktif */}
        <div className="flex gap-2 border-b border-slate-100 px-4 pt-3 bg-slate-50/50 overflow-x-auto scrollbar-none">
          {(['Semua', 'Konsumtif', 'Produktif'] as const).map(tab => {
            const count = data.filter(d => {
              const isAntreanArsip = d.status === 'Antrean Arsip';
              if (!isAntreanArsip) return false;
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
                  "pb-3 px-4 text-xs font-bold border-b-2 transition-all relative flex items-center shrink-0",
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
        <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto flex-1">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-650 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 bg-white shrink-0"
            >
              {selectedIds.length === filteredData.length && filteredData.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4 text-slate-400" />
              )}
              Pilih Semua
            </button>

            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Nama / NIK..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Right Side: Filters Group & Export Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
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

            {/* Filter Dropdown for Pilar (Program BAZNAS) */}
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
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {selectedPilarFilter && (
                  <button 
                    onClick={() => handlePilarChange('')}
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

            {/* Filter Dropdown for Kegiatan / Sub-Program */}
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
                        <span>Kegiatan: {allPrograms.find(p => p.code === selectedProgramFilter)?.name || selectedProgramFilter}</span>
                      ) : (
                        <span>Pilih Kegiatan Bantuan</span>
                      )}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {selectedProgramFilter && (
                  <button 
                    onClick={() => {
                      setSelectedProgramFilter('');
                      setSearchProgramQuery('');
                    }}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Hapus Filter Kegiatan"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isProgramDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProgramDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-full sm:w-80 md:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-2">
                    <input 
                      type="text"
                      placeholder="Cari kegiatan / sub-program..."
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
                        Semua Kegiatan
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
                              "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors mt-0.5",
                              selectedProgramFilter === prog.code && "bg-primary/5 text-primary font-bold"
                            )}
                          >
                            <span className="text-[10px] text-slate-400 font-bold block">{prog.pilarName}</span>
                            <span>{prog.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter Dropdown for Kuitansi Status */}
            <div className="relative w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full">
                <button
                  onClick={() => setIsKuitansiDropdownOpen(!isKuitansiDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between sm:justify-start gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all border w-full",
                    kuitansiFilter !== 'semua'
                      ? (kuitansiFilter === 'belum_kembali' ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm" : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm")
                      : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={cn("size-4 shrink-0", kuitansiFilter !== 'semua' ? (kuitansiFilter === 'belum_kembali' ? "text-rose-600" : "text-emerald-600") : "text-slate-400")} />
                    <span className="truncate">
                      {kuitansiFilter === 'semua' 
                        ? 'Status Kuitansi: Semua' 
                        : kuitansiFilter === 'belum_kembali' 
                          ? `Belum Kuitansi (${stats.missingKuitansi})` 
                          : `Sudah Kuitansi (${stats.hasKuitansi})`}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {kuitansiFilter !== 'semua' && (
                  <button
                    onClick={() => setKuitansiFilter('semua')}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Reset Filter Kuitansi"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isKuitansiDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsKuitansiDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-full sm:w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                    <button
                      onClick={() => {
                        setKuitansiFilter('semua');
                        setIsKuitansiDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center justify-between",
                        kuitansiFilter === 'semua' && "bg-primary/5 text-primary font-bold"
                      )}
                    >
                      <span>Semua Status Kuitansi</span>
                      <span className="text-[10px] text-slate-400 font-bold">{stats.totalQueue}</span>
                    </button>
                    <button
                      onClick={() => {
                        setKuitansiFilter('belum_kembali');
                        setIsKuitansiDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center justify-between text-rose-600",
                        kuitansiFilter === 'belum_kembali' && "bg-rose-50 font-bold"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Belum Ada Kuitansi
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-700 rounded-full font-bold">
                        {stats.missingKuitansi}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setKuitansiFilter('sudah_kembali');
                        setIsKuitansiDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center justify-between text-emerald-600",
                        kuitansiFilter === 'sudah_kembali' && "bg-emerald-50 font-bold"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Sudah Ada Kuitansi
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded-full font-bold">
                        {stats.hasKuitansi}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-slate-200 bg-white shrink-0"
                title="Reset Semua Filter"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </button>
            )}
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
                <th className="px-6 py-4">Status Arsip</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => {
                const sData = (item.survey_data as any) || {};
                const hasFoto = !!sData.bukti_foto_realisasi;
                const hasKuitansi = !!sData.kuitansi_ditandatangani;
                
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
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const { title, subtitle, isLembaga } = getMustahikDisplayName(item);
                          return (
                            <>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-slate-900">{title}</p>
                                {isLembaga && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                                    Lembaga
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {subtitle || (item.nik ? `NIK: ${item.nik}` : 'Perorangan')}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
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
                        "px-2.5 py-1 rounded text-[10px] font-bold border",
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
                          "px-2.5 py-0.5 rounded text-[10px] font-black uppercase w-fit border",
                          hasKuitansi 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                        )}>
                          {hasKuitansi ? '✓ Kuitansi Kembali' : '✕ Belum Kuitansi'}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase w-fit border",
                          hasFoto 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {hasFoto ? '✓ Foto Ada' : '✕ Belum Foto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => openUploadModal(item)}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title={isReadOnly ? "Lihat Dokumen Pengarsipan" : "Upload Dokumen Pengarsipan"}
                        >
                          {isReadOnly ? <FileText className="size-4 text-emerald-600" /> : <Upload className="size-4" />}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
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
                      <p className="text-sm font-medium">Tidak ada bantuan yang mengantre arsip.</p>
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
                const isUploaded = !!item.survey_data && (item.survey_data as any).bukti_foto_realisasi;
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
                    {/* Header Row */}
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
                      
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                        isUploaded 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                      )}>
                        {isUploaded ? 'DOKUMEN LENGKAP' : 'BELUM UPLOAD'}
                      </span>
                    </div>

                    {/* Details Row */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mustahik</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIK: {item.nik}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Program</p>
                          <span className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-1",
                            item.program === 'Semarang Sehat' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            item.program === 'Semarang Taqwa' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                            item.program === 'Semarang Cerdas' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            item.program === 'Semarang Makmur' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-slate-50 text-slate-650 border border-slate-150"
                          )}>
                            {item.program || 'Umum'}
                          </span>
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
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openUploadModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-md shadow-primary/10"
                      >
                        <Upload className="size-3.5" />
                        Upload Arsip
                      </button>

                      <button 
                        onClick={() => {
                          setSelectedProposal(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm text-slate-705"
                      >
                        <Eye className="size-3.5 text-primary" />
                        Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <ClipboardList className="size-12 opacity-10" />
                <p className="text-sm font-medium">Tidak ada bantuan yang mengantre arsip.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Upload / Preview Modal */}
      <AnimatePresence>
        {isUploadModalOpen && selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeUploadModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {isReadOnly ? 'Pratinjau Dokumen Pengarsipan' : 'Upload Dokumen Penyerahan'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Mustahik: {selectedProposal.namaPemohon} | Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button 
                  onClick={closeUploadModal} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {isReadOnly && (
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Eye className="size-4 text-amber-600 shrink-0" />
                  Mode Akses Pelaporan (View Only): Anda dapat membaca dan memeriksa dokumen kuitansi / bukti foto realisasi.
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Photo Proof Box */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                      Bukti Foto Realisasi Bantuan
                    </label>
                    <div 
                      onClick={() => !isReadOnly && fotoInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 aspect-video transition-all",
                        !isReadOnly && "cursor-pointer hover:bg-slate-50",
                        fotoPreview ? "border-emerald-250 bg-emerald-50/10" : "border-slate-200"
                      )}
                    >
                      {!isReadOnly && (
                        <input 
                          type="file" 
                          ref={fotoInputRef} 
                          onChange={handleFotoChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      )}
                      {fotoPreview ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img 
                            src={fotoPreview} 
                            alt="Bukti Foto" 
                            className="max-h-full rounded-lg object-contain shadow-sm"
                          />
                          {!isReadOnly && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFotoPreview(null);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <Camera className="size-8 text-slate-400 animate-pulse" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">
                              {isReadOnly ? 'Belum Ada Foto Realisasi' : 'Ambil/Pilih Foto Dokumentasi'}
                            </p>
                            {!isReadOnly && <p className="text-[10px] text-slate-400 mt-1">Format JPG, PNG (Maks. 5MB)</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Signed Receipt Box */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                      Kuitansi Bertanda Tangan (Kasir &amp; Penerima)
                    </label>
                    <div 
                      onClick={() => !isReadOnly && kuitansiInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 aspect-video transition-all",
                        !isReadOnly && "cursor-pointer hover:bg-slate-50",
                        kuitansiPreview ? "border-emerald-250 bg-emerald-50/10" : "border-slate-200"
                      )}
                    >
                      {!isReadOnly && (
                        <input 
                          type="file" 
                          ref={kuitansiInputRef} 
                          onChange={handleKuitansiChange} 
                          accept="image/*,application/pdf" 
                          className="hidden" 
                        />
                      )}
                      {kuitansiPreview ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                          {kuitansiTtd?.type === 'application/pdf' ? (
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="size-10 text-rose-500" />
                              <span className="text-xs font-bold text-slate-700 max-w-[150px] truncate">{kuitansiTtd.name}</span>
                            </div>
                          ) : (
                            <img 
                              src={kuitansiPreview} 
                              alt="Kuitansi Ttd" 
                              className="max-h-full rounded-lg object-contain shadow-sm"
                            />
                          )}
                          {!isReadOnly && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setKuitansiTtd(null);
                                setKuitansiPreview(null);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="size-8 text-slate-400 animate-pulse" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">
                              {isReadOnly ? 'Belum Ada Kuitansi TTD' : 'Upload Kuitansi Hasil Scan'}
                            </p>
                            {!isReadOnly && <p className="text-[10px] text-slate-400 mt-1">Format PDF, JPG, PNG (Maks. 5MB)</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 shrink-0">
                {isReadOnly ? (
                  <button 
                    onClick={closeUploadModal}
                    className="w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-all text-center"
                  >
                    Tutup Pratinjau
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => handleSaveArchive(false)}
                      disabled={saving || (!fotoPreview && !kuitansiPreview)}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Simpan berkas (Kuitansi/Foto) tanpa mengeluarkan proposal dari Antrean Arsip"
                    >
                      {saving ? (
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <FileText className="size-4" />
                          Simpan Draf (Tetap di Antrean)
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handleSaveArchive(true)}
                      disabled={saving || (!fotoPreview && !kuitansiPreview)}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Simpan & tandai pengarsipan telah Selesai"
                    >
                      {saving ? (
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          Simpan &amp; Selesaikan Arsip
                        </>
                      )}
                    </button>
                  </>
                )}
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
                  <h3 className="text-xl font-black text-slate-900">Detail Pertanggungjawaban</h3>
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
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Mustahik</h4>
                      <div className="space-y-4">
                        <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat || '-'} />
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan || '-'} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan || '-'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan</h4>
                      <div className="space-y-4">
                        <DetailItem label="Program" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan || '-'} />
                        <DetailItem label="Tipe Bantuan" value={selectedProposal.tipeBantuan || 'Belum Ditentukan'} />
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Disalurkan</p>
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
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-55 transition-all text-center"
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
