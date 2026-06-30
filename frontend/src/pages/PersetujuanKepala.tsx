import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Search, Eye, CheckCircle2, ChevronRight, X,
  ClipboardList, AlertTriangle, MessageSquare, Send, Flame,
  FileText, Newspaper, ExternalLink, History, User, Building2,
  MapPin, Briefcase, Calendar, Home, ChevronDown, Check, Clock
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

export default function PersetujuanKepala({ data, onUpdate, suratData, onUpdateSurat }: Props) {
  const [activeTab, setActiveTab] = useState<'proposal' | 'surat'>('proposal');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedToday, setApprovedToday] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [availability, setAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Kapel interactive budget guard correction states
  const [selectedRkatId, setSelectedRkatId] = useState<string>('');
  const [selectedSumberKas, setSelectedSumberKas] = useState<string>('Zakat');
  const [rekomendasiNominal, setRekomendasiNominal] = useState<number>(0);
  const [isRkatDropdownOpen, setIsRkatDropdownOpen] = useState(false);
  const [rkatSearchQuery, setRkatSearchQuery] = useState('');
  const [isSumberKasDropdownOpen, setIsSumberKasDropdownOpen] = useState(false);

  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(res.data.filter((u: any) => u.role.startsWith('Staf') || u.role === 'Relawan')))
      .catch(console.error);

    axios.get('/api/pilars')
      .then(res => {
        if (res.data) setPilars(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setIsRkatDropdownOpen(false);
      setRkatSearchQuery('');
      setIsSumberKasDropdownOpen(false);
    }
  }, [isModalOpen]);

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
          setDynamicQuestions(JSON.parse(res.data.value));
        }
      })
      .catch(console.error);
  }, [selectedProposal, programTipeMap]);

  const antreanProposal = useMemo(() =>
    data.filter(d => d.status === 'Review Kepala Pelaksana'), [data]);

  const antreanSurat = useMemo(() =>
    suratData.filter(d => d.status === 'Review Kepala Pelaksana' || d.status === 'Penugasan Kepala Pelaksana'), [suratData]);

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
    setCatatan(item.catatanKepala || '');
    setAvailability(null);
    setSelectedRkatId('');
    setSelectedSumberKas('Zakat');
    setRekomendasiNominal(item.nominal || 0);
    setIsModalOpen(true);
    setLoadingAvailability(true);
    
    axios.get(`/api/finance/check-availability/${item.id}`)
      .then(res => {
        setAvailability(res.data);
        const acts = res.data.rkat_activities || [];
        
        // Match chosen activity or fallback
        const currentAsnaf = (item.asnaf || 'Miskin').toLowerCase();
        const matched = acts.find((a: any) => a.id === item.rkatActivityId) ||
                        acts.find((a: any) => a.asnaf && a.asnaf.toLowerCase() === currentAsnaf) ||
                        acts[0];
                        
        setSelectedRkatId(matched ? matched.id : '');
        
        const initialSumber = item.tipeBantuan || (
          res.data.sumber_dana_yang_dipakai === 'INFAK_TERIKAT' ? 'Infak Terikat' :
          res.data.sumber_dana_yang_dipakai === 'INFAK_TIDAK_TERIKAT' ? 'Infak Tidak Terikat' :
          'Zakat'
        );
        setSelectedSumberKas(initialSumber);
        setRekomendasiNominal(item.nominal || (matched ? matched.nominal : 0));
      })
      .catch(err => console.error('Gagal fetch availability:', err))
      .finally(() => setLoadingAvailability(false));
  };

  const openSuratModal = (item: Surat) => {
    setSelectedSurat(item);
    setSelectedProposal(null);
    setCatatan(item.catatanKepala || '');
    setAssignedStaff(Array.isArray(item.assigned_staff) ? (item.assigned_staff as string[]) : []);
    setStaffSearchQuery('');
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    const isPenugasanPass = selectedSurat && selectedSurat.status === 'Penugasan Kepala Pelaksana';
    if (!isPenugasanPass && !catatan.trim()) { alert('Harap isi catatan terlebih dahulu.'); return; }
    setIsSubmitting(true);
    try {
      if (selectedProposal) {
        await axios.put(`/api/proposals/${selectedProposal.id}`, {
          status: 'Persetujuan_Pimpinan',
          catatanKepala: catatan.trim(),
          nominal: Number(rekomendasiNominal),
          tipe_bantuan: selectedSumberKas,
          rkat_activity_id: selectedRkatId
        });
        onUpdate(data.map(d => d.id === selectedProposal.id
          ? { 
              ...d, 
              status: 'Persetujuan Pimpinan' as any, 
              catatanKepala: catatan.trim(),
              nominal: Number(rekomendasiNominal),
              tipeBantuan: selectedSumberKas as any, 
              rkatActivityId: selectedRkatId
            } : d));
      } else if (selectedSurat) {
        const nextStatus = isPenugasanPass ? 'Selesai' : 'Review_Pimpinan';
        await axios.put(`/api/surats/${selectedSurat.id}`, {
          status: nextStatus,
          catatanKepala: catatan.trim(),
          assigned_staff: assignedStaff
        });
        onUpdateSurat(suratData.map(d => d.id === selectedSurat.id
          ? { 
              ...d, 
              status: nextStatus.replace(/_/g, ' '), 
              catatanKepala: catatan.trim(),
              assigned_staff: assignedStaff
            } : d));
      }
      setApprovedToday(p => p + 1);
      setIsModalOpen(false);
      setSelectedProposal(null);
      setSelectedSurat(null);
      setCatatan('');
    } catch { alert('Gagal menyetujui. Coba lagi.'); }
    finally { setIsSubmitting(false); }
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
          <span className="text-primary font-bold">Persetujuan Kepala Pelaksana</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Persetujuan Kepala Pelaksana</h2>
        <p className="text-slate-500 font-medium">
          Layanan peninjauan kelayakan dan verifikasi ketersediaan pagu anggaran RKAT atas permohonan bantuan. Berikan rekomendasi nominal serta catatan evaluasi sebelum diteruskan ke tahap persetujuan Pimpinan.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Antrean" value={totalAntrean.toString()} icon={<ClipboardList className="size-5" />} color="primary" sub={`${antreanProposal.length} Proposal · ${antreanSurat.length} Surat`} />
        <StatCard title="Antrean Urgensi" value={urgensiCount.toString()} icon={<Flame className="size-5" />} color="rose" sub="Sangat Kritis &amp; Tinggi" />
        <StatCard title="Disetujui Hari Ini" value={approvedToday.toString()} icon={<CheckCircle2 className="size-5" />} color="emerald" sub="Diteruskan ke Ketua" />
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('proposal')} className={cn(
              'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
              activeTab === 'proposal' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
              Proposal ({antreanProposal.length})
            </button>
            <button onClick={() => setActiveTab('surat')} className={cn(
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
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
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
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
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openProposalModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all mx-auto">
                        <Eye className="size-3.5" /> Tinjau
                      </button>
                    </td>
                  </tr>
                )) : <EmptyRow colSpan={5} label="proposal" />
              ) : (
                filteredSurat.length > 0 ? filteredSurat.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.namaInstansi || '-'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500 line-clamp-1">{item.keperluan}</p>
                        {item.status === 'Penugasan Kepala Pelaksana' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider border border-amber-200 shrink-0">
                            Butuh Penugasan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.tanggalMasuk}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openSuratModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all mx-auto">
                        <Eye className="size-3.5" /> {item.status === 'Penugasan Kepala Pelaksana' ? 'Tugaskan' : 'Tinjau'}
                      </button>
                    </td>
                  </tr>
                )) : <EmptyRow colSpan={4} label="surat" />
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

      {/* Modal */}
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
                      Tinjau {selectedProposal ? 'Proposal Bantuan' : 'Surat'}
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
                          <p className="text-sm font-black text-rose-800">Prioritas {selectedProposal.urgencyLevel} — Perlu Perhatian Segera</p>
                          <p className="text-xs text-rose-600 mt-0.5">Mustahik ini teridentifikasi membutuhkan bantuan mendesak berdasarkan hasil survei lapangan.</p>
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
                            <DetailItem label="No. Telpon" value={selectedProposal.noTelpon || '-'} />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <Briefcase className="size-3.5" /> Informasi Pengajuan
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan || '-'} />
                            <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || 'Perorangan'} />
                            <DetailItem label="Pimpinan Organisasi" value={selectedProposal.pimpinanOrganisasi || '-'} />
                            <DetailItem label="Tanggal Masuk" value={selectedProposal.tanggalMasuk} />
                            <DetailItem label="Jam Pengajuan" value={selectedProposal.jamPengajuan || '-'} />
                          </div>
                        </div>

                        {/* Memo Pimpinan */}
                        {selectedProposal.hasMemo && (
                          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-800 mb-2">
                              <History className="size-4" />
                              <span className="text-xs font-black uppercase tracking-widest">Memo Pimpinan</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">Sumber: {selectedProposal.memoSource || '-'}</p>
                          </div>
                        )}

                        {/* Identifikasi & Rekomendasi Kabid */}
                        {selectedProposal.rekomendasi_kabag && (
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200/80 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-800">
                              <ClipboardList className="size-4" />
                              <span className="text-xs font-black uppercase tracking-widest">Identifikasi &amp; Rekomendasi Kabid</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Asnaf Rekomendasi</p>
                                <p className="font-extrabold text-slate-800">{selectedProposal.asnaf || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rekomendasi Kas</p>
                                <p className="font-extrabold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded w-max">{selectedProposal.rekomendasi_kabag}</p>
                              </div>
                            </div>
                            {selectedProposal.hasil_identifikasi && (
                              <div className="pt-2 border-t border-emerald-200/50 text-xs space-y-1">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hasil Identifikasi</p>
                                <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed bg-white/70 p-2.5 rounded-lg border border-emerald-100/30">
                                  {selectedProposal.hasil_identifikasi}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Kanan: Hasil Survei + Dokumen */}
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <MapPin className="size-3.5" /> Hasil Assessment Lapangan
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Relawan Surveyor" value={selectedProposal.surveyorName || '-'} />
                            <DetailItem label="Total Skor" value={selectedProposal.score ? `${selectedProposal.score} Poin` : '-'} />
                            {selectedProposal.urgencyLevel && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level Urgensi</p>
                                <span className={cn('inline-flex px-3 py-1 rounded-full text-xs font-black border uppercase', urgencyBadge(selectedProposal.urgencyLevel))}>
                                  {selectedProposal.urgencyLevel}
                                </span>
                              </div>
                            )}
                            {selectedProposal.surveySubmittedAt && (
                              <DetailItem label="Tanggal Survei" value={new Date(selectedProposal.surveySubmittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
                            )}
                          </div>
                        </div>

                        {selectedProposal.survey_data?.catatanLapangan && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Relawan di Lapangan</p>
                            <p className="text-sm text-slate-700 bg-amber-50 p-4 rounded-xl border border-amber-100 italic leading-relaxed">
                              "{selectedProposal.survey_data.catatanLapangan}"
                            </p>
                          </div>
                        )}

                        {/* Rincian Detail Form Survei */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                            <Home className="size-3.5" /> Rincian Kondisi Lapangan
                          </h4>
                          
                           <div className="grid grid-cols-1 gap-3">
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
                                
                                return (
                                  <SurveyDetailSection key={secCode} title={sectionTitle} items={items} />
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Preview Dokumen */}
                        {selectedProposal.fileGdriveLink ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                <FileText className="size-3.5" /> Dokumen Proposal
                              </h4>
                              <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                <ExternalLink className="size-3" /> Buka di Drive
                              </a>
                            </div>
                            <iframe
                              src={selectedProposal.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                              className="w-full h-72 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
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

                    {/* Double-Guard RKAT & Kas Availability */}
                    {loadingAvailability ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs text-slate-500 font-bold">Memeriksa Plafond RKAT &amp; Saldo Kas Riil...</p>
                      </div>
                    ) : availability ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <span className="p-1 bg-primary text-white rounded-lg text-[10px]">DG</span>
                            Informasi RKAT &amp; Kas
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400">
                            Rekomendasi Awal Kabid: <span className="font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">{selectedProposal.rekomendasi_kabag || 'Zakat'}</span>
                          </span>
                        </div>

                        {/* 1. KETERSEDIAAN SALDO KAS PENTASHARUFAN */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Ketersediaan Saldo Kas Pentasharufan</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={cn(
                              "p-3 bg-white border rounded-xl shadow-sm space-y-1 text-center transition-all",
                              selectedSumberKas === 'Zakat' ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'
                            )}>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dana Zakat</p>
                              <p className="font-extrabold text-slate-800 text-sm">Rp {(availability.kas_riil?.detail?.zakat || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className={cn(
                              "p-3 bg-white border rounded-xl shadow-sm space-y-1 text-center transition-all",
                              selectedSumberKas === 'Infak Tidak Terikat' ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'
                            )}>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dana ISTT (Tidak Terikat)</p>
                              <p className="font-extrabold text-slate-800 text-sm">Rp {(availability.kas_riil?.detail?.istt || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className={cn(
                              "p-3 bg-white border rounded-xl shadow-sm space-y-1 text-center transition-all",
                              selectedSumberKas === 'Infak Terikat' ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'
                            )}>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dana IST (Terikat)</p>
                              <p className="font-extrabold text-slate-800 text-sm">Rp {(availability.kas_riil?.detail?.ist || 0).toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        </div>

                        {/* 2. BUDGET GUARD (INFORMASI RKAT TERKAIT) */}
                        <div className="space-y-3 pt-2 border-t border-slate-200/60">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Anggaran RKAT Terkait</p>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              Pilih Kegiatan RKAT Yang Akan Dipotong:
                            </label>
                            <div className="relative">
                              <button 
                                type="button"
                                onClick={() => {
                                  setIsRkatDropdownOpen(!isRkatDropdownOpen);
                                  setIsSumberKasDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm text-slate-800"
                              >
                                <span className="truncate max-w-[90%]">
                                  {selectedRkatId 
                                    ? (() => {
                                        const act = (availability.rkat_activities || []).find((a: any) => a.id === selectedRkatId);
                                        return act 
                                          ? `${act.name} (Asnaf: ${act.asnaf || 'Semua'}, Sisa: Rp ${act.sisa_pagu.toLocaleString('id-ID')})`
                                          : selectedRkatId;
                                      })()
                                    : '-- Pilih Kegiatan RKAT --'
                                  }
                                </span>
                                <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRkatDropdownOpen && "rotate-180")} />
                              </button>

                              {isRkatDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setIsRkatDropdownOpen(false)} />
                                  <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-hidden flex flex-col">
                                    <div className="p-1 border-b border-slate-100 mb-1">
                                      <input
                                        type="text"
                                        placeholder="Cari kegiatan RKAT..."
                                        value={rkatSearchQuery}
                                        onChange={(e) => setRkatSearchQuery(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-700"
                                      />
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-52">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRkatId('');
                                          setIsRkatDropdownOpen(false);
                                          setRkatSearchQuery('');
                                        }}
                                        className={cn(
                                          "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                          !selectedRkatId ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                        )}
                                      >
                                        <span>-- Pilih Kegiatan RKAT --</span>
                                        {!selectedRkatId && <Check className="size-4 text-primary shrink-0" />}
                                      </button>
                                      {(availability.rkat_activities || [])
                                        .filter((act: any) => 
                                          act.name.toLowerCase().includes(rkatSearchQuery.toLowerCase()) ||
                                          (act.asnaf || '').toLowerCase().includes(rkatSearchQuery.toLowerCase())
                                        )
                                        .map((act: any) => (
                                          <button
                                            key={act.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedRkatId(act.id);
                                              setIsRkatDropdownOpen(false);
                                              setRkatSearchQuery('');
                                              if (act.nominal) {
                                                setRekomendasiNominal(act.nominal);
                                              }
                                            }}
                                            className={cn(
                                              "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                                              selectedRkatId === act.id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                            )}
                                          >
                                            <span className="truncate">
                                              {act.name} (Asnaf: {act.asnaf || 'Semua'}, Sisa: Rp {act.sisa_pagu.toLocaleString('id-ID')})
                                            </span>
                                            {selectedRkatId === act.id && <Check className="size-4 text-primary shrink-0" />}
                                          </button>
                                        ))}
                                      {(availability.rkat_activities || [])
                                        .filter((act: any) => 
                                          act.name.toLowerCase().includes(rkatSearchQuery.toLowerCase()) ||
                                          (act.asnaf || '').toLowerCase().includes(rkatSearchQuery.toLowerCase())
                                        ).length === 0 && (
                                          <p className="text-center py-3 text-[10px] text-slate-400 italic font-medium">Kegiatan tidak ditemukan</p>
                                        )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {(() => {
                            const act = (availability.rkat_activities || []).find((a: any) => a.id === selectedRkatId);
                            if (!act) return (
                              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold text-center">
                                Silakan pilih kegiatan RKAT di atas untuk melihat detail sisa pagu.
                              </div>
                            );

                            const isEnough = act.sisa_pagu >= rekomendasiNominal;

                            return (
                              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[11px] font-bold text-slate-800">
                                    Detail Pagu Kegiatan: "{act.name}"
                                  </h5>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black border uppercase shrink-0",
                                    isEnough ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"
                                  )}>
                                    {isEnough ? 'Anggaran Cukup' : 'Melebihi Limit'}
                                  </span>
                                </div>
                                {act.keterangan && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-semibold">
                                    Keterangan: <span className="font-normal text-slate-500">{act.keterangan}</span>
                                  </p>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Asnaf Target</p>
                                    <p className="font-extrabold text-slate-700">{act.asnaf || 'Semua'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Target RKAT 1 Tahun</p>
                                    <p className="font-extrabold text-slate-700">Rp {act.total_pagu.toLocaleString('id-ID')}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Sisa Anggaran</p>
                                    <p className={cn("font-black", isEnough ? "text-emerald-600" : "text-rose-600")}>
                                      Rp {act.sisa_pagu.toLocaleString('id-ID')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Estimasi Unit Cost</p>
                                    <p className="font-bold text-slate-600">Rp {(act.nominal || rekomendasiNominal).toLocaleString('id-ID')} <span className="text-[9px] font-normal text-slate-400">/ 1x</span></p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 3. KOREKSI & REKOMENDASI KEPALA PELAKSANA */}
                        <div className="space-y-3 pt-2 border-t border-slate-200/60">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Koreksi Sumber Dana</p>
                          <p className="text-[11px] text-slate-400 -mt-2">
                            Kepala Pelaksana berwenang untuk melakukan penyesuaian alokasi sumber dana bantuan.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Ubah Sumber Kas:
                              </label>
                            <div className="relative">
                              <button 
                                type="button"
                                onClick={() => {
                                  setIsSumberKasDropdownOpen(!isSumberKasDropdownOpen);
                                  setIsRkatDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm text-slate-800"
                              >
                                <span>
                                  {selectedSumberKas === 'Zakat' ? 'Dana Zakat' :
                                   selectedSumberKas === 'Infak Tidak Terikat' ? 'Dana ISTT (Infak Tidak Terikat)' :
                                   selectedSumberKas === 'Infak Terikat' ? 'Dana IST (Infak Terikat)' : selectedSumberKas}
                                </span>
                                <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isSumberKasDropdownOpen && "rotate-180")} />
                              </button>

                              {isSumberKasDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setIsSumberKasDropdownOpen(false)} />
                                  <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-45 p-1.5 overflow-y-auto custom-scrollbar">
                                    {[
                                      { value: 'Zakat', label: 'Dana Zakat' },
                                      { value: 'Infak Tidak Terikat', label: 'Dana ISTT (Infak Tidak Terikat)' },
                                      { value: 'Infak Terikat', label: 'Dana IST (Infak Terikat)' }
                                    ].map(opt => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          setSelectedSumberKas(opt.value);
                                          setIsSumberKasDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                                          selectedSumberKas === opt.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                        )}
                                      >
                                        <span>{opt.label}</span>
                                        {selectedSumberKas === opt.value && <Check className="size-4 text-primary shrink-0" />}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Nominal Bantuan:
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  value={rekomendasiNominal.toLocaleString('id-ID')}
                                  readOnly
                                  disabled
                                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 font-black text-slate-500 cursor-not-allowed outline-none shadow-sm"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400">
                                *Nominal bantuan bersifat tetap dan hanya dapat diubah oleh Pimpinan pada tahap berikutnya.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Catatan Kepala */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-primary" />
                        Catatan &amp; Rekomendasi Kepala Pelaksana
                        <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Catatan ini akan diteruskan ke Ketua sebagai bahan pertimbangan persetujuan nominal bantuan.
                      </p>
                      <textarea rows={4} value={catatan} onChange={e => setCatatan(e.target.value)}
                        placeholder="Contoh: Mustahik dinilai layak mendapat bantuan. Kondisi rumah memprihatinkan. Direkomendasikan bantuan sembako + modal usaha."
                        className={cn(
                          'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none leading-relaxed',
                          catatan.trim() ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                        )} />
                      {catatan.trim()
                        ? <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="size-3" /> {catatan.trim().length} karakter · Siap dikirim</p>
                        : <p className="text-[11px] text-rose-500 font-bold">⚠ Catatan wajib diisi sebelum menyetujui proposal</p>}
                    </div>
                  </div>
                )}

                {/* ── SURAT ── */}
                {selectedSurat && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Kiri: Informasi Pengirim */}
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <Building2 className="size-3.5" /> Informasi Pengirim
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Nama Instansi" value={selectedSurat.namaInstansi || '-'} />
                            <DetailItem label="Pimpinan Organisasi" value={selectedSurat.pimpinanOrganisasi || '-'} />
                            <DetailItem label="Yang Mengajukan" value={selectedSurat.yangMengajukan || '-'} />
                            <DetailItem label="No. Telpon" value={selectedSurat.noTelpon || '-'} />
                            <DetailItem label="Alamat" value={selectedSurat.alamat || '-'} />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4 flex items-center gap-1.5">
                            <Calendar className="size-3.5" /> Isi &amp; Keperluan
                          </h4>
                          <div className="space-y-3">
                            <DetailItem label="Kategori" value={selectedSurat.kategori || '-'} />
                            <DetailItem label="Perihal / Keperluan" value={selectedSurat.keperluan} />
                            {selectedSurat.kategori === 'Undangan' && (
                              <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Tanggal Acara" value={selectedSurat.tanggalAcara ? new Date(selectedSurat.tanggalAcara).toLocaleDateString('id-ID') : '-'} />
                                <DetailItem label="Jam Acara" value={selectedSurat.jamAcara || '-'} />
                              </div>
                            )}
                            <DetailItem label="Tanggal Masuk" value={selectedSurat.tanggalMasuk} />
                            <DetailItem label="Jam Pengajuan" value={selectedSurat.jamPengajuan || '-'} />
                          </div>
                        </div>
                      </div>

                      {/* Kanan: Preview Dokumen */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                            <FileText className="size-3.5" /> Dokumen Surat
                          </h4>
                          {selectedSurat.fileGdriveLink && (
                            <a href={selectedSurat.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                              <ExternalLink className="size-3" /> Buka di Drive
                            </a>
                          )}
                        </div>
                        {selectedSurat.fileGdriveLink ? (
                          <iframe
                            src={selectedSurat.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                            className="w-full h-80 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
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

                    {/* Catatan Pimpinan (Jika ada / di tahap Penugasan) */}
                    {selectedSurat.catatanPimpinan && (
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2 shadow-sm mb-4">
                        <div className="flex items-center gap-2 text-purple-800">
                          <MessageSquare className="size-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Arahan &amp; Catatan Ketua</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 italic">
                          "{selectedSurat.catatanPimpinan}"
                        </p>
                      </div>
                    )}

                    {/* Catatan Kepala */}
                    {selectedSurat.status !== 'Penugasan Kepala Pelaksana' && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare className="size-3.5 text-primary" />
                          Catatan Kepala Pelaksana
                          <span className="text-rose-500">*</span>
                        </label>
                        <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)}
                          placeholder="Catatan untuk Pimpinan / Staf..."
                          className={cn(
                            'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none leading-relaxed',
                            catatan.trim() ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                          )} />
                        {catatan.trim() ? (
                          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="size-3" /> {catatan.trim().length} karakter · Siap dikirim</p>
                        ) : (
                          <p className="text-[11px] text-rose-500 font-bold">⚠ Catatan wajib diisi sebelum menyetujui surat</p>
                        )}
                      </div>
                    )}

                    {selectedSurat.kategori === 'Undangan' && (
                      selectedSurat.status === 'Penugasan Kepala Pelaksana' ? (
                        <div className="space-y-3 pt-2 border-t border-slate-100 mt-4">
                          <div>
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-1">
                              <User className="size-3.5 text-primary" />
                              Tugaskan Staf (Notifikasi &amp; Pengingat H-1)
                            </label>
                            <p className="text-[11px] text-slate-400">Cari dan tambahkan staf yang wajib menghadiri undangan ini.</p>
                          </div>
                          
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                            <input 
                              type="text" 
                              placeholder="Ketik nama staf untuk mencari..." 
                              value={staffSearchQuery} 
                              onChange={e => setStaffSearchQuery(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" 
                            />
                          </div>

                          {staffSearchQuery && (
                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg flex flex-col divide-y divide-slate-50 relative z-10">
                              {users.filter(u => !assignedStaff.includes(u.id) && u.name.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setAssignedStaff(prev => [...prev, u.id]);
                                    setStaffSearchQuery('');
                                  }}
                                  className="px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center group"
                                >
                                  <span>{u.name} <span className="font-medium text-slate-400 ml-1">({u.role.replace(/_/g, ' ')})</span></span>
                                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">Tambahkan</span>
                                </button>
                              ))}
                              {users.filter(u => !assignedStaff.includes(u.id) && u.name.toLowerCase().includes(staffSearchQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-xs text-slate-400 text-center italic">Tidak ditemukan staf dengan nama tersebut.</div>
                              )}
                            </div>
                          )}

                          {assignedStaff.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {assignedStaff.map(id => {
                                const u = users.find(x => x.id === id);
                                if (!u) return null;
                                return (
                                  <div key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm">
                                    {u.name}
                                    <button onClick={() => setAssignedStaff(prev => prev.filter(x => x !== u.id))} className="hover:text-rose-300 transition-colors p-0.5 rounded-full hover:bg-white/10">
                                      <X className="size-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <Clock className="size-3.5 text-slate-400 animate-pulse" />
                            Penugasan staf akan dilakukan di tahap berikutnya setelah ulasan Pimpinan/Ketua.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button onClick={() => !isSubmitting && setIsModalOpen(false)} disabled={isSubmitting}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleApprove}
                  disabled={isSubmitting || (selectedSurat ? (selectedSurat.status !== 'Penugasan Kepala Pelaksana' && !catatan.trim()) : !catatan.trim())}
                  className={cn(
                    'flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                    (!isSubmitting && (selectedSurat ? (selectedSurat.status === 'Penugasan Kepala Pelaksana' || catatan.trim()) : catatan.trim()))
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  )}>
                  {isSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                    : (selectedSurat && selectedSurat.status === 'Penugasan Kepala Pelaksana')
                      ? <><CheckCircle2 className="size-4" /> Selesaikan &amp; Tugaskan Staf</>
                      : <><Send className="size-4" /> Setujui &amp; Teruskan ke Ketua</>}
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

// --- HELPER COMPONENTS & FUNCTIONS ---

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
