import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Search,
  Eye,
  CheckCircle2,
  ChevronRight,
  X,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  Flame,
  FileText,
  Newspaper,
  ExternalLink,
  User,
  Building2,
  MapPin,
  Briefcase,
  UserCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Surat } from './InputSurat';

interface Props {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
  suratData: Surat[];
  onUpdateSurat: (data: Surat[]) => void;
}

export default function ReviewPimpinan({ data, onUpdate, suratData, onUpdateSurat }: Props) {
  const [activeTab, setActiveTab] = useState<'proposal' | 'surat'>('proposal');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
   const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvedToday, setApprovedToday] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catatanPimpinan, setCatatanPimpinan] = useState('');
  const [availability, setAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    const getTemplateKey = () => {
      if (!selectedProposal) return 'survey_template_individu';
      const isLembaga = selectedProposal.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedProposal.jenisPengajuan?.toLowerCase().includes('kelompok');
      if (isLembaga) return 'survey_template_lembaga';
      
      const code = selectedProposal.programCode;
      if (!code) return 'survey_template_individu';
      const cleanCode = code.trim();
      let tipe = 'Konsumtif';
      if (programTipeMap[cleanCode]) {
        tipe = programTipeMap[cleanCode];
      } else {
        const parts = cleanCode.split('.');
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
          try {
            setDynamicQuestions(JSON.parse(res.data.value));
          } catch (e) {
            console.error('Failed to parse survey template:', e);
          }
        }
      })
      .catch(console.error);
  }, [selectedProposal, programTipeMap]);

  const antreanProposal = useMemo(() =>
    data.filter(d => d.status === 'Persetujuan Pimpinan'), [data]);

  const antreanSurat = useMemo(() =>
    suratData.filter(d => d.status === 'Review Pimpinan'), [suratData]);

  const q = searchTerm.toLowerCase();
  const filteredProposal = useMemo(() =>
    antreanProposal.filter(d =>
      d.agendaNo.toString().includes(q) ||
      d.namaPemohon.toLowerCase().includes(q) ||
      (d.kecamatan?.toLowerCase() || '').includes(q)
    ), [antreanProposal, q]);

  const filteredSurat = useMemo(() =>
    antreanSurat.filter(d =>
      d.agendaNo.toString().includes(q) ||
      (d.namaInstansi?.toLowerCase() || '').includes(q) ||
      d.keperluan.toLowerCase().includes(q)
    ), [antreanSurat, q]);

  const urgensiCount = useMemo(() =>
    antreanProposal.filter(d =>
      d.urgencyLevel === 'Sangat Kritis' || d.urgencyLevel === 'Tinggi'
    ).length, [antreanProposal]);

  const totalAntrean = antreanProposal.length + antreanSurat.length;

  const openProposalModal = (item: ProposalMemo) => {
    setSelectedProposal(item);
    setSelectedSurat(null);
    setCatatanPimpinan('');
    setIsModalOpen(true);
    setLoadingAvailability(true);
    setAvailability(null);
    axios.get(`/api/finance/check-availability/${item.id}`)
      .then(res => setAvailability(res.data))
      .catch(err => console.error('Gagal fetch availability:', err))
      .finally(() => setLoadingAvailability(false));
  };

  const openSuratModal = (item: Surat) => {
    setSelectedSurat(item);
    setSelectedProposal(null);
    setCatatanPimpinan('');
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!catatanPimpinan.trim()) {
      alert('Catatan Pimpinan wajib diisi!');
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedProposal) {
        await axios.put(`/api/proposals/${selectedProposal.id}`, {
          status: 'Penentuan_Nominal',
          catatanPimpinan
        });
        onUpdate(data.map(d => d.id === selectedProposal.id
          ? { ...d, status: 'Penentuan Nominal' as any, catatanPimpinan } : d));
      } else if (selectedSurat) {
        const isUndangan = selectedSurat.kategori === 'Undangan';
        const nextStatus = isUndangan ? 'Penugasan_Kepala_Pelaksana' : 'Selesai';
        await axios.put(`/api/surats/${selectedSurat.id}`, {
          status: nextStatus,
          catatanPimpinan
        });
        onUpdateSurat(suratData.map(d => d.id === selectedSurat.id
          ? { ...d, status: nextStatus.replace(/_/g, ' ') as any, catatanPimpinan } : d));
      }
      setApprovedToday(p => p + 1);
      setIsModalOpen(false);
      setSelectedProposal(null);
      setSelectedSurat(null);
      setSelectedIds(prev => prev.filter(id => id !== (selectedProposal?.id || selectedSurat?.id)));
    } catch { alert('Gagal menyetujui. Coba lagi.'); }
    finally { setIsSubmitting(false); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const cat = window.prompt(`Masukkan catatan Pimpinan untuk menyetujui ${selectedIds.length} data:`);
    if (cat === null) return;
    if (!cat.trim()) { alert('Catatan Pimpinan wajib diisi!'); return; }
    setIsSubmitting(true);
    try {
      if (activeTab === 'proposal') {
        await Promise.all(selectedIds.map(id => 
          axios.put(`/api/proposals/${id}`, { status: 'Penentuan_Nominal', catatanPimpinan: cat })
        ));
        onUpdate(data.map(d => selectedIds.includes(d.id) 
          ? { ...d, status: 'Penentuan Nominal' as any, catatanPimpinan: cat } : d));
      } else {
        await Promise.all(selectedIds.map(async id => {
          const item = suratData.find(d => d.id === id);
          const isUndangan = item?.kategori === 'Undangan';
          const nextStatus = isUndangan ? 'Penugasan_Kepala_Pelaksana' : 'Selesai';
          await axios.put(`/api/surats/${id}`, { status: nextStatus, catatanPimpinan: cat });
        }));
        onUpdateSurat(suratData.map(d => {
          if (selectedIds.includes(d.id)) {
            const isUndangan = d.kategori === 'Undangan';
            const nextStatus = isUndangan ? 'Penugasan Kepala Pelaksana' : 'Selesai';
            return { ...d, status: nextStatus, catatanPimpinan: cat };
          }
          return d;
        }));
      }
      setApprovedToday(p => p + selectedIds.length);
      setSelectedIds([]);
    } catch { alert('Gagal memproses bulk approval.'); }
    finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!catatanPimpinan.trim()) {
      alert('Catatan Pimpinan wajib diisi untuk penolakan!');
      return;
    }
    if (!window.confirm('Yakin ingin menolak data ini?')) return;
    setIsSubmitting(true);
    try {
      if (selectedProposal) {
        await axios.put(`/api/proposals/${selectedProposal.id}`, {
          status: 'Ditolak',
          catatanPimpinan
        });
        onUpdate(data.map(d => d.id === selectedProposal.id
          ? { ...d, status: 'Ditolak' as any, catatanPimpinan } : d));
      } else if (selectedSurat) {
        await axios.put(`/api/surats/${selectedSurat.id}`, {
          status: 'Ditolak',
          catatanPimpinan
        });
        onUpdateSurat(suratData.map(d => d.id === selectedSurat.id
          ? { ...d, status: 'Ditolak', catatanPimpinan } : d));
      }
      setIsModalOpen(false);
      setSelectedProposal(null);
      setSelectedSurat(null);
      setSelectedIds(prev => prev.filter(id => id !== (selectedProposal?.id || selectedSurat?.id)));
    } catch { alert('Gagal menolak. Coba lagi.'); }
    finally { setIsSubmitting(false); }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const cat = window.prompt(`Masukkan alasan/catatan penolakan untuk ${selectedIds.length} data:`);
    if (cat === null) return;
    if (!cat.trim()) { alert('Catatan wajib diisi!'); return; }
    if (!window.confirm(`Yakin ingin menolak ${selectedIds.length} data ini?`)) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'proposal') {
        await Promise.all(selectedIds.map(id => 
          axios.put(`/api/proposals/${id}`, { status: 'Ditolak', catatanPimpinan: cat })
        ));
        onUpdate(data.map(d => selectedIds.includes(d.id) 
          ? { ...d, status: 'Ditolak' as any, catatanPimpinan: cat } : d));
      } else {
        await Promise.all(selectedIds.map(id => 
          axios.put(`/api/surats/${id}`, { status: 'Ditolak', catatanPimpinan: cat })
        ));
        onUpdateSurat(suratData.map(d => selectedIds.includes(d.id) 
          ? { ...d, status: 'Ditolak', catatanPimpinan: cat } : d));
      }
      setSelectedIds([]);
    } catch { alert('Gagal memproses bulk rejection.'); }
    finally { setIsSubmitting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentData = activeTab === 'proposal' ? filteredProposal : filteredSurat;
    if (selectedIds.length === currentData.length && currentData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentData.map(item => item.id));
    }
  };

  const urgencyBadge = (level?: string) => {
    if (level === 'Sangat Kritis') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (level === 'Tinggi') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Persetujuan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Persetujuan Pimpinan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Persetujuan Pimpinan</h2>
        <p className="text-slate-500 font-medium">
          Layanan otorisasi dan persetujuan akhir oleh Ketua atau Wakil Ketua atas permohonan bantuan serta surat masuk. Setelah disetujui, proposal diteruskan ke tahap penentuan nominal dan surat ditandai selesai.
        </p>
      </motion.div>

      {/* Stats - 3 Cards like PersetujuanKepala */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Antrean" value={totalAntrean.toString()} icon={<ClipboardList className="size-5" />} color="primary" sub={`${antreanProposal.length} Proposal · ${antreanSurat.length} Surat`} />
        <StatCard title="Antrean Urgensi" value={urgensiCount.toString()} icon={<Flame className="size-5" />} color="rose" sub="Sangat Kritis &amp; Tinggi" />
        <StatCard title="Disetujui Hari Ini" value={approvedToday.toString()} icon={<CheckCircle2 className="size-5" />} color="emerald" sub="Selesai / Penentuan Nominal" />
      </motion.div>

      {/* Table Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        
        {/* Filter & Bulk Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200"
            >
              {selectedIds.length === (activeTab === 'proposal' ? filteredProposal.length : filteredSurat.length) && (activeTab === 'proposal' ? filteredProposal.length : filteredSurat.length) > 0 ? (
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
                  onClick={handleBulkApprove}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck className="size-4" />}
                  SETUJUI {selectedIds.length} DATA
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleBulkReject}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 text-xs font-black rounded-lg hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50 border border-rose-200"
                >
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" /> : <X className="size-4" />}
                  TOLAK {selectedIds.length} DATA
                </motion.button>
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => { setActiveTab('proposal'); setSelectedIds([]); }} className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                activeTab === 'proposal' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}>
                Proposal ({antreanProposal.length})
              </button>
              <button onClick={() => { setActiveTab('surat'); setSelectedIds([]); }} className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                activeTab === 'surat' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}>
                Surat ({antreanSurat.length})
              </button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input type="text" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">{activeTab === 'proposal' ? 'Pemohon' : 'Instansi / Keperluan'}</th>
                <th className="px-6 py-4">Tanggal</th>
                {activeTab === 'proposal' && <th className="px-6 py-4">Hasil Survei</th>}
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'proposal' ? (
                filteredProposal.length > 0 ? filteredProposal.map(item => (
                  <tr key={item.id} className={cn("hover:bg-slate-50/50 transition-colors cursor-pointer", selectedIds.includes(item.id) && "bg-primary/5")} onClick={() => toggleSelect(item.id)}>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => toggleSelect(item.id)}>
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="size-5 text-primary" />
                        ) : (
                          <Square className="size-5 text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                      <p className="text-[10px] text-slate-400">Relawan: {item.surveyorName || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.tanggalMasuk}</p>
                      <p className="text-[10px] text-slate-400">{item.kecamatan || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {item.urgencyLevel ? (
                        <div className="space-y-1">
                          <span className={cn('px-2 py-1 rounded-full text-[10px] font-black border uppercase', urgencyBadge(item.urgencyLevel))}>
                            {item.urgencyLevel}
                          </span>
                          <p className="text-[10px] text-slate-400">{item.score} Poin</p>
                        </div>
                      ) : <span className="text-[11px] text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openProposalModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all mx-auto">
                        <Eye className="size-3.5" /> Tinjau
                      </button>
                    </td>
                  </tr>
                )) : <EmptyRow colSpan={6} label="proposal" />
              ) : (
                filteredSurat.length > 0 ? filteredSurat.map(item => (
                  <tr key={item.id} className={cn("hover:bg-slate-50/50 transition-colors cursor-pointer", selectedIds.includes(item.id) && "bg-primary/5")} onClick={() => toggleSelect(item.id)}>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => toggleSelect(item.id)}>
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare className="size-5 text-primary" />
                        ) : (
                          <Square className="size-5 text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.namaInstansi || '-'}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{item.keperluan}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.tanggalMasuk}</p>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openSuratModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all mx-auto">
                        <Eye className="size-3.5" /> Tinjau
                      </button>
                    </td>
                  </tr>
                )) : <EmptyRow colSpan={5} label="surat" />
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan {activeTab === 'proposal' ? filteredProposal.length : filteredSurat.length} data
          </p>
        </div>
      </motion.div>

      {/* Modal - RICH VERSION like PersetujuanKepala */}
      <AnimatePresence>
        {isModalOpen && (selectedProposal || selectedSurat) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    {selectedProposal ? <FileText className="size-5 text-primary" /> : <Newspaper className="size-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      Tinjau &amp; Setujui {selectedProposal ? 'Proposal Bantuan' : 'Surat'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No. Agenda <span className="font-black text-slate-700">#{selectedProposal?.agendaNo || selectedSurat?.agendaNo}</span>
                      {selectedProposal && <span className="ml-2 text-slate-400">· {selectedProposal.namaPemohon}</span>}
                      {selectedSurat && <span className="ml-2 text-slate-400">· {selectedSurat.namaInstansi || '-'}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* ── PROPOSAL ── */}
                {selectedProposal && (
                  <div className="p-6 space-y-6">

                    {/* Urgency Alert */}
                    {(selectedProposal.urgencyLevel === 'Sangat Kritis' || selectedProposal.urgencyLevel === 'Tinggi') && (
                      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                        <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-rose-800">Prioritas {selectedProposal.urgencyLevel} — Perlu Otorisasi Segera</p>
                          <p className="text-xs text-rose-600 mt-0.5">Mustahik ini membutuhkan bantuan mendesak. Harap tinjau catatan Kepala Pelaksana sebelum menyetujui.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Kiri: Data Pemohon */}
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <User className="size-3.5" /> Data Pemohon
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                            <DetailItem label="NIK" value={selectedProposal.nik || '-'} />
                            <DetailItem label="Alamat" value={selectedProposal.alamat || '-'} />
                            <DetailItem label="Kelurahan" value={selectedProposal.kelurahan || '-'} />
                            <DetailItem label="Kecamatan" value={selectedProposal.kecamatan || '-'} />
                            <DetailItem label="Pekerjaan" value={selectedProposal.pekerjaan || '-'} />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <Briefcase className="size-3.5" /> Informasi Pengajuan
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan || '-'} />
                            <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || 'Perorangan'} />
                            <DetailItem label="Tanggal Masuk" value={selectedProposal.tanggalMasuk} />
                          </div>
                        </div>

                        {/* Catatan Kepala Pelaksana */}
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <MessageSquare className="size-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Rekomendasi Kepala Pelaksana</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{selectedProposal.catatanKepala || 'Tidak ada catatan.'}"
                          </p>
                        </div>
                      </div>

                      {/* Kanan: Hasil Survei + Dokumen */}
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <MapPin className="size-3.5" /> Hasil Assessment Lapangan
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Relawan Surveyor" value={selectedProposal.surveyorName || '-'} />
                            <DetailItem label="Skor Akhir" value={selectedProposal.score ? `${selectedProposal.score} Poin` : '-'} />
                          </div>
                          {selectedProposal.urgencyLevel && (
                            <div className="mt-3 space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level Urgensi</p>
                              <span className={cn('inline-flex px-3 py-1 rounded-full text-xs font-black border uppercase', urgencyBadge(selectedProposal.urgencyLevel))}>
                                {selectedProposal.urgencyLevel}
                              </span>
                            </div>
                          )}

                          {selectedProposal.survey_data?.catatanLapangan && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                              <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Catatan Relawan di Lapangan</p>
                              <p className="text-xs text-slate-700 italic leading-relaxed">"{selectedProposal.survey_data.catatanLapangan}"</p>
                            </div>
                          )}

                          {selectedProposal.survey_data && (
                            <div className="mt-4 space-y-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Rincian Kondisi Lapangan</p>
                              
                               {(() => {
                                const sectionCodes = Array.from(new Set(dynamicQuestions.map(q => q.section))).sort();
                                if (sectionCodes.length === 0) {
                                  return (
                                    <div className="text-xs font-semibold text-slate-405 italic py-2">
                                      Memuat data rincian...
                                    </div>
                                  );
                                }
                                return sectionCodes.map(secCode => {
                                  const sectionQuestions = dynamicQuestions.filter(q => q.section === secCode);
                                  if (sectionQuestions.length === 0) return null;
                                  
                                  const sectionTitle = sectionQuestions[0].sectionTitle || `Bagian ${secCode}`;
                                  const items = sectionQuestions.map(q => ({
                                    label: q.label,
                                    value: getLabelForScore(q.id, (selectedProposal.survey_data as any)?.[q.id], dynamicQuestions)
                                  }));
                                  
                                  const hasValues = items.some(item => item.value !== '-');
                                  if (!hasValues) return null;

                                  return (
                                    <SurveyDetailSection key={secCode} title={sectionTitle} items={items} />
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Preview Dokumen */}
                        {selectedProposal.fileGdriveLink ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                <FileText className="size-3.5" /> Preview Proposal
                              </h4>
                              <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                <ExternalLink className="size-3" /> Buka Full Screen
                              </a>
                            </div>
                            <iframe
                              src={selectedProposal.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                              className="w-full h-80 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
                              allow="autoplay"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                            <FileText className="size-8 mb-2 opacity-30" />
                            <p className="text-xs font-medium">Tidak ada dokumen terlampir</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RKAT & Kas Info (Read-Only Information for Pimpinan/Ketua) */}
                    {loadingAvailability ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs text-slate-500 font-bold">Memeriksa Plafond RKAT &amp; Saldo Kas Riil...</p>
                      </div>
                    ) : availability ? (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <span className="p-1 bg-primary text-white rounded text-[10px]">INFO</span>
                          Informasi RKAT &amp; Saldo Kas (Read-Only)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Saldo Kas */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              Saldo Kas Riil ({(() => {
                                const kasType = availability.sumber_dana_yang_dipakai || 'ZAKAT';
                                return kasType === 'ZAKAT' ? 'Zakat' :
                                       kasType === 'INFAK_TIDAK_TERIKAT' ? 'Infak Tidak Terikat' :
                                       kasType === 'INFAK_TERIKAT' ? 'Infak Terikat' : kasType;
                              })()})
                            </p>
                            {(() => {
                              const kasType = availability.sumber_dana_yang_dipakai || 'ZAKAT';
                              const balance = kasType === 'ZAKAT' ? (availability.kas_riil?.detail?.zakat || 0) :
                                              kasType === 'INFAK_TIDAK_TERIKAT' ? (availability.kas_riil?.detail?.istt || 0) :
                                              kasType === 'INFAK_TERIKAT' ? (availability.kas_riil?.detail?.ist || 0) : 0;
                              
                              return (
                                <div className="space-y-1">
                                  <p className="text-lg font-black text-emerald-600">Rp {balance.toLocaleString('id-ID')}</p>
                                  <p className="text-[10px] text-slate-400">Total nominal diajukan: <span className="font-extrabold text-slate-700">Rp {(selectedProposal.nominal || 0).toLocaleString('id-ID')}</span></p>
                                </div>
                              );
                            })()}
                          </div>

                          {/* RKAT */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Plafon RKAT Terkait</p>
                            {(() => {
                              const act = (availability.rkat_activities || []).find((a: any) => a.id === selectedProposal.rkatActivityId);
                              if (!act) {
                                return (
                                  <p className="text-xs text-slate-500 font-semibold italic">Tidak ada kegiatan RKAT yang dikaitkan.</p>
                                );
                              }

                              const isEnough = act.sisa_pagu >= (selectedProposal.nominal || 0);

                              return (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-800 line-clamp-1">"{act.name}"</p>
                                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50">
                                    <span className="text-slate-400">Sisa Pagu:</span>
                                    <span className={cn("font-extrabold", isEnough ? "text-emerald-600" : "text-rose-600")}>
                                      Rp {act.sisa_pagu.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ── SURAT ── */}
                {selectedSurat && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <Building2 className="size-3.5" /> Informasi Pengirim
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Nama Instansi" value={selectedSurat.namaInstansi || '-'} />
                            <DetailItem label="Pimpinan Organisasi" value={selectedSurat.pimpinanOrganisasi || '-'} />
                            <DetailItem label="Kategori" value={selectedSurat.kategori || '-'} />
                            <DetailItem label="Keperluan" value={selectedSurat.keperluan} />
                            {selectedSurat.kategori === 'Undangan' && (
                              <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Tanggal Acara" value={selectedSurat.tanggalAcara ? new Date(selectedSurat.tanggalAcara).toLocaleDateString('id-ID') : '-'} />
                                <DetailItem label="Jam Acara" value={selectedSurat.jamAcara || '-'} />
                              </div>
                            )}
                            <DetailItem label="Tanggal Masuk" value={selectedSurat.tanggalMasuk} />
                          </div>
                        </div>

                        {/* Catatan Kepala Pelaksana */}
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <MessageSquare className="size-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Catatan Kepala Pelaksana</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{selectedSurat.catatanKepala || 'Tidak ada catatan.'}"
                          </p>
                        </div>
                      </div>

                      {/* Kanan: Preview Dokumen */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                            <FileText className="size-3.5" /> Dokumen Surat
                          </h4>
                        </div>
                        {selectedSurat.fileGdriveLink ? (
                          <iframe
                            src={selectedSurat.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                            className="w-full h-96 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
                            allow="autoplay"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-52 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                            <FileText className="size-8 mb-2 opacity-30" />
                            <p className="text-xs font-medium">Tidak ada dokumen terlampir</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan Pimpinan Input */}
              <div className="p-6 border-t border-slate-100 bg-white">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <MessageSquare className="size-3.5" /> Catatan Pimpinan (Wajib)
                </label>
                <textarea
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  rows={3}
                  placeholder="Masukkan catatan atau instruksi pimpinan sebelum menyetujui / menolak..."
                  value={catatanPimpinan}
                  onChange={e => setCatatanPimpinan(e.target.value)}
                />
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button onClick={() => !isSubmitting && setIsModalOpen(false)} disabled={isSubmitting}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleReject} disabled={isSubmitting}
                  className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <X className="size-4" /> Tolak
                </button>
                <button onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                    : <><CheckCircle2 className="size-4" /> Berikan Persetujuan Final</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <ClipboardList className="size-10 opacity-20" />
          <p className="text-sm font-medium">Tidak ada {label} yang perlu ditinjau.</p>
        </div>
      </td>
    </tr>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{value}</p>
    </div>
  );
}

function StatCard({ title, value, icon, color, sub }: {
  title: string; value: string; icon: React.ReactNode; color: 'primary' | 'emerald' | 'rose'; sub: string;
}) {
  const c = { primary: 'bg-primary/10 text-primary', emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-500' };
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn('p-2 rounded-lg', c[color])}>{icon}</div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        <p className="text-[11px] text-slate-400 mt-1" dangerouslySetInnerHTML={{ __html: sub }} />
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
          <div key={i} className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 font-medium">{item.label}</span>
            <span className="font-bold text-slate-800 text-right truncate ml-2">{item.value}</span>
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
