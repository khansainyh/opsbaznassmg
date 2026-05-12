import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Search, Eye, CheckCircle2, ChevronRight, X,
  ClipboardList, AlertTriangle, MessageSquare, Send, Flame,
  FileText, Newspaper, ExternalLink, History, User, Building2,
  MapPin, Briefcase, Calendar, Home
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

  const antreanProposal = useMemo(() =>
    data.filter(d => d.status === 'Review Kepala Pelaksana'), [data]);

  const antreanSurat = useMemo(() =>
    suratData.filter(d => d.status === 'Review Kepala Pelaksana'), [suratData]);

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
    setIsModalOpen(true);
  };

  const openSuratModal = (item: Surat) => {
    setSelectedSurat(item);
    setSelectedProposal(null);
    setCatatan('');
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!catatan.trim()) { alert('Harap isi catatan terlebih dahulu.'); return; }
    setIsSubmitting(true);
    try {
      if (selectedProposal) {
        await axios.put(`http://127.0.0.1:4000/api/proposals/${selectedProposal.id}`, {
          status: 'Persetujuan_Pimpinan', catatanKepala: catatan.trim()
        });
        onUpdate(data.map(d => d.id === selectedProposal.id
          ? { ...d, status: 'Persetujuan Pimpinan' as any, catatanKepala: catatan.trim() } : d));
      } else if (selectedSurat) {
        await axios.put(`http://127.0.0.1:4000/api/surats/${selectedSurat.id}`, {
          status: 'Review_Pimpinan',
          catatanKepala: catatan.trim()
        });
        onUpdateSurat(suratData.map(d => d.id === selectedSurat.id
          ? { ...d, status: 'Review Pimpinan', catatanKepala: catatan.trim() } : d));
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
        <p className="text-slate-500 font-medium">Tinjau dan berikan catatan sebelum diteruskan ke Ketua.</p>
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
                          <p className="text-[10px] text-slate-400">{item.score} Pts</p>
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
                      <p className="text-[10px] text-slate-500 line-clamp-1">{item.keperluan}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.tanggalMasuk}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openSuratModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all mx-auto">
                        <Eye className="size-3.5" /> Tinjau
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
                            <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || 'Individu'} />
                            <DetailItem label="Pimpinan Organisasi" value={selectedProposal.pimpinanOrganisasi || '-'} />
                            <DetailItem label="Tanggal Masuk" value={selectedProposal.tanggalMasuk} />
                            <DetailItem label="Jam Pengajuan" value={selectedProposal.jamPengajuan || '-'} />
                          </div>
                        </div>

                        {/* Memo Pimpinan */}
                        {selectedProposal.hasMemo && (
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2 text-emerald-700 mb-2">
                              <History className="size-4" />
                              <span className="text-xs font-black uppercase tracking-widest">Memo Pimpinan</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">Sumber: {selectedProposal.memoSource || '-'}</p>
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
                            <SurveyDetailSection title="A. Kondisi Rumah" items={[
                              { label: 'Luas Bangunan', value: getLabelForScore('luasBangunan', selectedProposal.survey_data?.luasBangunan) },
                              { label: 'Jenis Lantai', value: getLabelForScore('jenisLantai', selectedProposal.survey_data?.jenisLantai) },
                              { label: 'Jenis Dinding', value: getLabelForScore('jenisDinding', selectedProposal.survey_data?.jenisDinding) },
                              { label: 'Status Tinggal', value: getLabelForScore('statusTempatTinggal', selectedProposal.survey_data?.statusTempatTinggal) },
                            ]} />

                            <SurveyDetailSection title="B. Kondisi Ekonomi" items={[
                              { label: 'Pekerjaan KRT', value: getLabelForScore('pekerjaanKepala', selectedProposal.survey_data?.pekerjaanKepala) },
                              { label: 'Frekuensi Makan', value: getLabelForScore('frekuensiMakan', selectedProposal.survey_data?.frekuensiMakan) },
                              { label: 'Kemampuan Lauk', value: getLabelForScore('kemampuanLauk', selectedProposal.survey_data?.kemampuanLauk) },
                            ]} />

                            <SurveyDetailSection title="C. Fisik & Lainnya" items={[
                              { label: 'Keadaan Fisik', value: getLabelForScore('keadaanFisik', selectedProposal.survey_data?.keadaanFisik) },
                              { label: 'Kondisi Hutang', value: getLabelForScore('hutang', selectedProposal.survey_data?.hutang) },
                              { label: 'BPJS/Kesehatan', value: getLabelForScore('kesehatan', selectedProposal.survey_data?.kesehatan) },
                            ]} />
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

                    {/* Catatan Kepala (opsional untuk surat) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-primary" />
                        Catatan Kepala Pelaksana
                        <span className="text-slate-400 font-normal normal-case tracking-normal">(opsional)</span>
                      </label>
                      <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)}
                        placeholder="Catatan tambahan untuk Ketua (opsional)..."
                        className={cn(
                          'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none leading-relaxed',
                          catatan.trim() ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                        )} />
                    </div>
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
                  disabled={isSubmitting || (!!selectedProposal && !catatan.trim())}
                  className={cn(
                    'flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                    (!isSubmitting && (selectedSurat || catatan.trim()))
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  )}>
                  {isSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
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

function getLabelForScore(field: string, score: number | undefined): string {
  if (score === undefined || score === 0) return '-';
  
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
