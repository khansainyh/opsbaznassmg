import React, { useState, useMemo } from 'react';
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

  // Filter only proposals with 'Realisasi Bantuan' status
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isRealisasi = item.status === 'Realisasi Bantuan';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         item.nik.includes(searchTerm);
      return isRealisasi && searchMatch;
    });
  }, [data, searchTerm]);

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
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Pendistribusian</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Realisasi Bantuan</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Realisasi Bantuan
            </h2>
            <p className="text-slate-500 font-medium">
              Proses akhir penyerahan bantuan kepada mustahik yang telah disetujui.
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
        {/* Filter Bar */}
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
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <DownloadCloud className="size-4" />
                EXPORT LAPORAN ({selectedIds.length})
              </motion.button>
            )}
            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-slate-200">
              <Filter className="size-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                          title="Jadwalkan"
                        >
                          <Calendar className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleWhatsApp(item)}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Hubungi WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleComplete(item.id)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Kirim ke Antrean Arsip"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
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
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSchedule}
                  disabled={!scheduleDate}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
