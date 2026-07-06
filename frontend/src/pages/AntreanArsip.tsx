import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Search, 
  Filter, 
  ChevronRight, 
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
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanArsipProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanArsip({ data, onUpdate }: AntreanArsipProps) {
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter proposals with 'Antrean Arsip' status
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isAntreanArsip = item.status === 'Antrean Arsip';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return isAntreanArsip && searchMatch;
    });
  }, [data, searchTerm]);

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
    
    return {
      missingFoto,
      missingKuitansi,
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

  // Save files & archive completely (sets status to 'Selesai')
  const handleSaveArchive = async () => {
    if (!selectedProposal) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('status', 'Selesai');

      const currentSurveyData = (selectedProposal.survey_data as any) || {};
      const updatedSurveyData = {
        ...currentSurveyData,
        bukti_foto_realisasi: fotoPreview && !fotoFile ? fotoPreview : '',
        kuitansi_ditandatangani: kuitansiPreview && !kuitansiTtd ? kuitansiPreview : '',
        archived_at: new Date().toISOString()
      };

      if (fotoFile) {
        formData.append('bukti_foto_realisasi', fotoFile);
      }
      if (kuitansiTtd) {
        formData.append('kuitansi_ditandatangani', kuitansiTtd);
      }

      formData.append('survey_data', JSON.stringify(updatedSurveyData));

      // Call API to update status to 'Selesai' and persist survey_data with files
      const response = await axios.put(`/api/proposals/${selectedProposal.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const finalSurveyData = response.data.survey_data || updatedSurveyData;

      // Update local context
      const updatedData = data.map(item => 
        item.id === selectedProposal.id 
          ? { 
              ...item, 
              status: 'Selesai' as any,
              survey_data: finalSurveyData
            } 
          : item
      );
      
      onUpdate(updatedData);
      closeUploadModal();
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
              Antrean Arsip
            </h2>
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
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
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
            <div className="relative w-full sm:w-72">
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedIds.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <DownloadCloud className="size-4" />
                EXPORT LAPORAN ({selectedIds.length})
              </motion.button>
            )}
            <button className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-slate-200 bg-white shrink-0">
              <Filter className="size-4" />
            </button>
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
                const isUploaded = !!item.survey_data && (item.survey_data as any).bukti_foto_realisasi;
                
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
                        <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik}</p>
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
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-black uppercase w-fit border",
                        isUploaded 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                      )}>
                        {isUploaded ? 'DOKUMEN LENGKAP' : 'BELUM UPLOAD'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => openUploadModal(item)}
                          className="p-2 text-slate-450 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Upload Dokumen Pengarsipan"
                        >
                          <Upload className="size-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-455 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
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

      {/* Upload Modal */}
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
                  <h3 className="text-xl font-black text-slate-900">Upload Dokumen Penyerahan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Mustahik: {selectedProposal.namaPemohon} | Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button 
                  onClick={closeUploadModal} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Photo Proof Box */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                      Bukti Foto Realisasi Bantuan
                    </label>
                    <div 
                      onClick={() => fotoInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all aspect-video",
                        fotoPreview ? "border-emerald-250 bg-emerald-50/10" : "border-slate-200"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={fotoInputRef} 
                        onChange={handleFotoChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      {fotoPreview ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img 
                            src={fotoPreview} 
                            alt="Bukti Foto" 
                            className="max-h-full rounded-lg object-contain shadow-sm"
                          />
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
                        </div>
                      ) : (
                        <>
                          <Camera className="size-8 text-slate-400 animate-pulse" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">Ambil/Pilih Foto Dokumentasi</p>
                            <p className="text-[10px] text-slate-400 mt-1">Format JPG, PNG (Maks. 5MB)</p>
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
                      onClick={() => kuitansiInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all aspect-video",
                        kuitansiPreview ? "border-emerald-250 bg-emerald-50/10" : "border-slate-200"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={kuitansiInputRef} 
                        onChange={handleKuitansiChange} 
                        accept="image/*,application/pdf" 
                        className="hidden" 
                      />
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
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="size-8 text-slate-400 animate-pulse" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">Upload Kuitansi Hasil Scan</p>
                            <p className="text-[10px] text-slate-400 mt-1">Format PDF, JPG, PNG (Maks. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={handleSaveArchive}
                  disabled={saving || (!fotoPreview && !kuitansiPreview)}
                  className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-250 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Simpan &amp; Arsipkan
                    </>
                  )}
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
