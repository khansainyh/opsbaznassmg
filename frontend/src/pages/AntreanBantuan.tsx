import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  FileText,
  X,
  ClipboardList,
  AlertTriangle,
  Printer,
  CheckSquare,
  Square,
  Banknote,
  Info,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar } from '../data/pilarData';

interface AntreanBantuanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanBantuan({ data, onUpdate }: AntreanBantuanProps) {
  const [pilars, setPilars] = useState<Pilar[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nominalInputs, setNominalInputs] = useState<Record<string, string>>({});
  const [alasanInputs, setAlasanInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    axios.get('http://127.0.0.1:4000/api/pilars')
      .then(res => setPilars(res.data))
      .catch(console.error);
  }, []);

  const getRKATBudget = (jenisPermohonan: string): number | undefined => {
    for (const pilar of pilars) {
      for (const prog of pilar.programs) {
        if (prog.name === jenisPermohonan && typeof prog.budget_rkat === 'number') {
          return prog.budget_rkat;
        }
      }
    }
    return undefined;
  };

  // Filter only proposals with 'Antrean Bantuan' status
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isAntreanBantuan = item.status === 'Antrean Bantuan';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return isAntreanBantuan && searchMatch;
    });
  }, [data, searchTerm]);

  const stats = useMemo(() => {
    const antreanBantuanData = data.filter(d => d.status === 'Antrean Bantuan');
    const urgentCount = antreanBantuanData.filter(d => d.urgencyLevel === 'Kritis' || d.urgencyLevel === 'Tinggi').length;
    const waitingNominal = antreanBantuanData.filter(d => !d.nominal).length;
    
    return {
      total: antreanBantuanData.length,
      urgent: urgentCount,
      pendingNominal: waitingNominal
    };
  }, [data]);

  const handleNominalChange = (id: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setNominalInputs(prev => ({ ...prev, [id]: numericValue }));
  };

  const handleAlasanChange = (id: string, value: string) => {
    setAlasanInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleResetToRKAT = (id: string, jenis: string) => {
    const defaultValue = getRKATBudget(jenis);
    if (defaultValue !== undefined) {
      setNominalInputs(prev => ({ ...prev, [id]: defaultValue.toString() }));
      setAlasanInputs(prev => {
        const newAlasan = { ...prev };
        delete newAlasan[id];
        return newAlasan;
      });
    }
  };

  const handleSaveNominal = async (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;

    const nominal = parseInt(nominalInputs[id] || '0');
    const defaultNominal = getRKATBudget(item.jenisPermohonan);
    const alasan = alasanInputs[id] || '';

    if (nominal <= 0) return;

    if (defaultNominal !== undefined && nominal !== defaultNominal && !alasan.trim()) {
      return; 
    }

    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
        nominal,
        alasan_perubahan_nominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined
      });
      const updatedData = data.map(d => 
        d.id === id ? { 
          ...d, 
          nominal,
          alasanPerubahanNominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined
        } : d
      );
      onUpdate(updatedData);
    } catch (e) {
      console.error(e);
      alert('Gagal mengupdate nominal.');
    }
  };

  const handleSetTipe = async (id: string, tipe: 'Tunai' | 'Barang') => {
    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
        tipe_bantuan: tipe
      });
      const updatedData = data.map(item => 
        item.id === id ? { ...item, tipeBantuan: tipe } : item
      );
      onUpdate(updatedData);
    } catch (e) {
      alert('Gagal update tipe bantuan');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    
    const missingInfo = selectedIds.some(id => {
      const item = data.find(d => d.id === id);
      if (!item) return true;
      const nominal = parseInt(nominalInputs[id] || item.nominal?.toString() || '0');
      const defaultNominal = getRKATBudget(item.jenisPermohonan);
      const alasan = alasanInputs[id] || item.alasanPerubahanNominal || '';
      
      const hasNominal = nominal > 0;
      const hasTipe = !!item.tipeBantuan;
      const hasReasonIfChanged = defaultNominal === undefined || nominal === defaultNominal || alasan.trim().length > 0;

      return !hasNominal || !hasTipe || !hasReasonIfChanged;
    });

    if (missingInfo) {
      alert('Mohon isi nominal bantuan, tipe bantuan, dan alasan perubahan (jika tidak sesuai RKAT) untuk semua data yang dipilih.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = selectedIds.map(async (id) => {
        const item = data.find(d => d.id === id);
        if (!item) return;
        const nominal = parseInt(nominalInputs[id] || item.nominal?.toString() || '0');
        const defaultNominal = getRKATBudget(item.jenisPermohonan);
        const alasan = alasanInputs[id] || item.alasanPerubahanNominal;
        
        await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
          nominal,
          alasan_perubahan_nominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined,
          status: 'Realisasi_Bantuan'
        });
      });

      await Promise.all(updates);

      const updatedData = data.map(item => {
        if (selectedIds.includes(item.id)) {
          const nominal = parseInt(nominalInputs[item.id] || item.nominal?.toString() || '0');
          const defaultNominal = getRKATBudget(item.jenisPermohonan);
          const alasan = alasanInputs[item.id] || item.alasanPerubahanNominal;

          return { 
            ...item, 
            nominal,
            alasanPerubahanNominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined,
            status: 'Realisasi Bantuan' as any 
          };
        }
        return item;
      });

      onUpdate(updatedData);
      setSelectedIds([]);
      setIsPrintModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Gagal memproses pencairan dana.');
    } finally {
      setIsSubmitting(false);
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

  const handlePrint = () => {
    if (selectedIds.length === 0) return;
    setIsPrintModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Pendistribusian</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Antrean Bantuan</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Antrean Bantuan
            </h2>
            <p className="text-slate-500 font-medium">
              Daftar bantuan yang telah disetujui Pimpinan. Tentukan nominal dan siapkan pencairan.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Total Antrean Bantuan" 
          value={stats.total.toString()} 
          icon={<FileText className="size-5" />}
          color="primary"
        />
        <StatCard 
          title="Urgensi Tinggi" 
          value={stats.urgent.toString()} 
          icon={<AlertTriangle className="size-5" />}
          color="red"
        />
        <StatCard 
          title="Menunggu Nominal" 
          value={stats.pendingNominal.toString()} 
          icon={<Banknote className="size-5" />}
          color="amber"
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200"
            >
              {selectedIds.length === filteredData.length && filteredData.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4" />
              )}
              Pilih Semua
            </button>
            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                >
                  <Printer className="size-4" />
                  CETAK DOKUMEN ({selectedIds.length})
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleBulkApprove}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="size-4" />}
                  PROSES PENCAIRAN
                </motion.button>
              </div>
            )}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Nama / NIK..."
                className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Nominal Bantuan</th>
                <th className="px-6 py-4">Tipe Bantuan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => {
                const defaultNominal = getRKATBudget(item.jenisPermohonan);
                const currentNominal = parseInt(nominalInputs[item.id] || item.nominal?.toString() || '0');
                const isDifferentFromRKAT = defaultNominal !== undefined && currentNominal !== defaultNominal && currentNominal > 0;

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
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                          {item.jenisPermohonan}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                            <input 
                              type="text"
                              value={nominalInputs[item.id] !== undefined ? nominalInputs[item.id] : (item.nominal?.toString() || '')}
                              onChange={(e) => handleNominalChange(item.id, e.target.value)}
                              onBlur={() => handleSaveNominal(item.id)}
                              placeholder="0"
                              className={cn(
                                "pl-8 pr-4 py-1.5 w-36 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none font-bold text-slate-900",
                                isDifferentFromRKAT && "border-amber-300 ring-1 ring-amber-100"
                              )}
                            />
                          </div>
                          {isDifferentFromRKAT && (
                            <button 
                              onClick={() => handleResetToRKAT(item.id, item.jenisPermohonan)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Reset ke RKAT"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          {defaultNominal !== undefined ? (
                            <>
                              <Info className="size-3" />
                              <span>RKAT: {formatCurrency(defaultNominal)}</span>
                            </>
                          ) : (
                            <span className="italic">Belum ada budget RKAT</span>
                          )}
                        </div>

                        {isDifferentFromRKAT && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                              Alasan Perubahan
                              <span className="text-rose-500">*</span>
                            </label>
                            <textarea 
                              value={alasanInputs[item.id] || item.alasanPerubahanNominal || ''}
                              onChange={(e) => handleAlasanChange(item.id, e.target.value)}
                              onBlur={() => handleSaveNominal(item.id)}
                              placeholder="Alasan..."
                              className="w-full text-[11px] bg-amber-50/50 border border-amber-200 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none min-h-[40px] resize-none font-medium"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleSetTipe(item.id, 'Tunai')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Tunai' 
                              ? "bg-primary text-white border-primary" 
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Tunai
                        </button>
                        <button 
                          onClick={() => handleSetTipe(item.id, 'Barang')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Barang' 
                              ? "bg-primary text-white border-primary" 
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Barang
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
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
                        <button 
                          onClick={() => {
                            setSelectedIds([item.id]);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Cetak"
                        >
                          <Printer className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada antrean bantuan saat ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

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
              className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Antrean Bantuan</h3>
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
                        <DetailItem label="NIK" value={selectedProposal.nik || '-'} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat || '-'} />
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan || '-'} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan || '-'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengajuan</h4>
                      <div className="space-y-4">
                        <DetailItem label="Program" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                        <DetailItem label="Tipe Bantuan" value={selectedProposal.tipeBantuan || 'Belum Ditentukan'} />
                        <DetailItem label="Skor Survei" value={selectedProposal.score?.toString() || '0'} />
                        <DetailItem label="Urgensi" value={selectedProposal.urgencyLevel || 'Normal'} />
                      </div>
                    </div>

                    {selectedProposal.nominal && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <Banknote className="size-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Nominal Disetujui</span>
                        </div>
                        <p className="text-xl font-black text-slate-900">{formatCurrency(selectedProposal.nominal)}</p>
                      </div>
                    )}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setIsPrintModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Printer className="size-5 text-primary" />
                  Preview Dokumen Persetujuan Bantuan
                </h3>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-slate-100 custom-scrollbar">
                <div className="bg-white shadow-2xl mx-auto p-12 min-h-[1100px] w-full max-w-[800px] text-slate-900 font-serif space-y-8 border border-slate-200">
                  <div className="flex items-center gap-6 border-b-4 border-double border-slate-900 pb-6">
                    <div className="size-20 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                      <FileText className="size-12" />
                    </div>
                    <div className="text-center flex-1">
                      <h1 className="text-2xl font-black uppercase tracking-tighter">Badan Amil Zakat Nasional</h1>
                      <h2 className="text-xl font-bold uppercase tracking-widest text-primary">Kota Semarang</h2>
                      <p className="text-xs mt-1 italic">Gedung BAZNAS, Jl. Pandanaran No. 126, Semarang, Jawa Tengah</p>
                      <p className="text-xs">Telp: (024) 1234567 | Email: info@baznas-semarang.org</p>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black underline uppercase">Surat Keputusan Persetujuan Bantuan</h3>
                    <p className="text-sm font-medium">Nomor: BAZNAS/SKPB/{new Date().getFullYear()}/{Math.floor(Math.random() * 1000)}</p>
                  </div>

                  <div className="space-y-6 text-sm leading-relaxed">
                    <p>Berdasarkan hasil verifikasi lapangan dan rapat pleno pimpinan BAZNAS Kota Semarang, dengan ini memutuskan untuk memberikan bantuan kepada:</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-900">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-900 px-3 py-2 text-xs font-black uppercase">No</th>
                            <th className="border border-slate-900 px-3 py-2 text-xs font-black uppercase">Nama Penerima</th>
                            <th className="border border-slate-900 px-3 py-2 text-xs font-black uppercase">Jenis Bantuan</th>
                            <th className="border border-slate-900 px-3 py-2 text-xs font-black uppercase">Nominal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIds.map((id, index) => {
                            const item = data.find(d => d.id === id);
                            const nominal = item?.nominal || parseInt(nominalInputs[id] || '0');
                            return (
                              <tr key={id}>
                                <td className="border border-slate-900 px-3 py-2 text-center">{index + 1}</td>
                                <td className="border border-slate-900 px-3 py-2 font-bold">{item?.namaPemohon}</td>
                                <td className="border border-slate-900 px-3 py-2">{item?.jenisPermohonan}</td>
                                <td className="border border-slate-900 px-3 py-2 font-bold text-right">{formatCurrency(nominal)}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-50 font-black">
                            <td colSpan={3} className="border border-slate-900 px-3 py-2 text-right uppercase">Total Keseluruhan</td>
                            <td className="border border-slate-900 px-3 py-2 text-right">
                              {formatCurrency(selectedIds.reduce((acc, id) => {
                                const item = data.find(d => d.id === id);
                                return acc + (item?.nominal || parseInt(nominalInputs[id] || '0'));
                              }, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p>Demikian surat keputusan ini dibuat untuk dapat dipergunakan sebagaimana mestinya. Bantuan ini bersumber dari dana Zakat, Infak, dan Sedekah (ZIS) yang dikelola oleh BAZNAS Kota Semarang.</p>
                  </div>

                  <div className="pt-12 grid grid-cols-2 gap-12 text-center">
                    <div className="space-y-20">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase">Mengetahui,</p>
                        <p className="text-sm font-black">Wakil Ketua II</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black underline">Drs. H. Ahmad Fauzi, M.Si</p>
                        <p className="text-[10px] font-medium">NIP. 19670812 199203 1 005</p>
                      </div>
                    </div>
                    <div className="space-y-20">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase">Menyetujui,</p>
                        <p className="text-sm font-black">Ketua BAZNAS Kota Semarang</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black underline">Dr. H. Arnaz Agung Andrarasmara, SE, MM</p>
                        <p className="text-[10px] font-medium">NIK. 20230101001</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-12 border-t border-slate-200 text-[9px] text-slate-400 text-center italic">
                    Dokumen ini dihasilkan secara otomatis oleh Sistem Operasional BAZNAS Hub pada {new Date().toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="size-4" />
                  CETAK SEKARANG
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
