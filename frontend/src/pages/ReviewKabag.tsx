import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileText,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
  ClipboardList,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Surat } from './InputSurat';

interface ReviewKabagProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
  suratData: Surat[];
  onUpdateSurat: (data: Surat[]) => void;
}

export default function ReviewKabag({ data, onUpdate, suratData, onUpdateSurat }: ReviewKabagProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'proposal' | 'surat'>('proposal');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [approvedToday, setApprovedToday] = useState(0);

  // Filter proposals with 'Review Kabag Administrasi' status
  const filteredProposals = useMemo(() => {
    return data.filter(item => {
      const isReviewKabag = item.status === 'Review Kabag Admin' || item.status === 'Review Kabag Administrasi';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         item.nik.includes(searchTerm);
      return isReviewKabag && searchMatch;
    });
  }, [data, searchTerm]);

  // Filter surat with 'Review Kabag Administrasi' status
  const filteredSurat = useMemo(() => {
    return suratData.filter(item => {
      const isReviewKabag = item.status === 'Review Kabag Admin' || (item.status as any) === 'Review Kabag Administrasi';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         (item.namaInstansi && item.namaInstansi.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         item.keperluan.toLowerCase().includes(searchTerm.toLowerCase());
      return isReviewKabag && searchMatch;
    });
  }, [suratData, searchTerm]);

  const stats = useMemo(() => {
    const reviewKabagCount = data.filter(d => d.status === 'Review Kabag Admin' || d.status === 'Review Kabag Administrasi').length;
    const reviewSuratCount = suratData.filter(d => d.status === 'Review Kabag Admin' || (d.status as any) === 'Review Kabag Administrasi').length;
    return {
      proposal: reviewKabagCount,
      surat: reviewSuratCount,
      completed: approvedToday
    };
  }, [data, suratData, approvedToday]);

  const handleApproveProposal = async (id: string) => {
    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
        status: 'Monitoring_Tugas'
      });
      const updatedData = data.map(item => 
        item.id === id ? { ...item, status: 'Monitoring Tugas' as const } : item
      );
      onUpdate(updatedData as ProposalMemo[]);
      setApprovedToday(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menyetujui proposal');
    }
  };

  const handleApproveSurat = async (id: string) => {
    try {
      await axios.put(`http://127.0.0.1:4000/api/surats/${id}`, {
        status: 'Review_Kepala_Pelaksana'
      });
      const updatedData = suratData.map(item => 
        item.id === id ? { ...item, status: 'Review Kepala Pelaksana' as const } : item
      );
      onUpdateSurat(updatedData as Surat[]);
      setApprovedToday(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menyetujui surat');
    }
  };

  const handleDetailClick = (item: ProposalMemo | Surat) => {
    if ('namaPemohon' in item) {
      setSelectedProposal(item as ProposalMemo);
      setSelectedSurat(null);
    } else {
      setSelectedSurat(item as Surat);
      setSelectedProposal(null);
    }
    setIsDetailModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Persetujuan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Persetujuan Kepala Bagian</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Persetujuan Kepala Bagian
        </h2>
        <p className="text-slate-500 font-medium">
          Verifikasi dan berikan persetujuan untuk dokumen yang telah diregistrasi oleh Admin.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Menunggu Proposal" 
          value={stats.proposal.toString()} 
          icon={<FileText className="size-5" />}
          color="primary"
        />
        <StatCard 
          title="Menunggu Surat" 
          value={stats.surat.toString()} 
          icon={<Clock className="size-5" />}
          color="amber"
        />
        <StatCard 
          title="Disetujui Hari Ini" 
          value={stats.completed.toString()} 
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
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('proposal')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  activeTab === 'proposal' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Proposal ({filteredProposals.length})
              </button>
              <button 
                onClick={() => setActiveTab('surat')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  activeTab === 'surat' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Surat ({filteredSurat.length})
              </button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder={activeTab === 'proposal' ? "Cari Agenda / Pemohon / NIK..." : "Cari Agenda / Instansi / Keperluan..."}
                className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">{activeTab === 'proposal' ? 'Pemohon & Instansi' : 'Instansi & Keperluan'}</th>
                <th className="px-6 py-4">Tanggal Masuk</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'proposal' ? (
                filteredProposals.length > 0 ? filteredProposals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.namaInstansi || 'Individu'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.tanggalMasuk}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status: {item.status}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleDetailClick(item)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleApproveProposal(item.id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Setujui"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList className="size-8 opacity-20" />
                        <p className="text-sm font-medium">Tidak ada proposal yang perlu direview.</p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                filteredSurat.length > 0 ? filteredSurat.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.namaInstansi || '-'}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider line-clamp-1">{item.keperluan}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.tanggalMasuk}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status: {item.status}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleDetailClick(item)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleApproveSurat(item.id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Setujui"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList className="size-8 opacity-20" />
                        <p className="text-sm font-medium">Tidak ada surat yang perlu direview.</p>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan {activeTab === 'proposal' ? filteredProposals.length : filteredSurat.length} data
          </p>
          <div className="flex gap-1">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronLeft className="size-4" />
            </button>
            <button className="w-8 h-8 bg-primary text-white rounded-lg font-bold text-xs">1</button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && (selectedProposal || selectedSurat) && (
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
                  <h3 className="text-xl font-black text-slate-900">Detail {selectedProposal ? 'Proposal' : 'Surat'}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal?.agendaNo || selectedSurat?.agendaNo}</p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                {selectedProposal ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Applicant Info */}
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

                    {/* Right: Proposal Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengajuan</h4>
                        <div className="space-y-4">
                          <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                          <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || '-'} />
                          <DetailItem label="Pimpinan" value={selectedProposal.pimpinanOrganisasi || '-'} />
                          <DetailItem label="Jam Pengajuan" value={selectedProposal.jamPengajuan || '-'} />
                        </div>
                      </div>

                      {selectedProposal.hasMemo && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 text-emerald-700 mb-2">
                            <History className="size-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Memo Pimpinan</span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">Sumber: {selectedProposal.memoSource}</p>
                        </div>
                      )}

                      {selectedProposal.fileGdriveLink && (
                        <div className="mt-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Dokumen Rekaman</h4>
                          <iframe 
                            src={selectedProposal.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')} 
                            className="w-full h-80 rounded-xl border border-slate-200 shadow-sm"
                            allow="autoplay"
                          ></iframe>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedSurat ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Sender Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengirim</h4>
                        <div className="space-y-4">
                          <DetailItem label="Nama Instansi" value={selectedSurat.namaInstansi || '-'} />
                          <DetailItem label="Pimpinan" value={selectedSurat.pimpinanOrganisasi || '-'} />
                          <DetailItem label="Yang Mengajukan" value={selectedSurat.yangMengajukan || '-'} />
                          <DetailItem label="No. Telpon" value={selectedSurat.noTelpon || '-'} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Letter Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Isi & Keperluan</h4>
                        <div className="space-y-4">
                          <DetailItem label="Kategori" value={selectedSurat.kategori || '-'} />
                          <DetailItem label="Keperluan" value={selectedSurat.keperluan} />
                          {selectedSurat.kategori === 'Undangan' && (
                            <div className="grid grid-cols-2 gap-4">
                              <DetailItem label="Tanggal Acara" value={selectedSurat.tanggalAcara ? new Date(selectedSurat.tanggalAcara).toLocaleDateString('id-ID') : '-'} />
                              <DetailItem label="Jam Acara" value={selectedSurat.jamAcara || '-'} />
                            </div>
                          )}
                          <DetailItem label="Tanggal Masuk" value={selectedSurat.tanggalMasuk} />
                          <DetailItem label="Jam" value={selectedSurat.jamPengajuan || '-'} />
                        </div>
                      </div>

                      {selectedSurat.fileGdriveLink && (
                        <div className="mt-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Dokumen Rekaman</h4>
                          <iframe 
                            src={selectedSurat.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')} 
                            className="w-full h-80 rounded-xl border border-slate-200 shadow-sm"
                            allow="autoplay"
                          ></iframe>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    if (selectedProposal) handleApproveProposal(selectedProposal.id);
                    else if (selectedSurat) handleApproveSurat(selectedSurat.id);
                    setIsDetailModalOpen(false);
                  }}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  Setujui
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
  color: 'primary' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500'
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
