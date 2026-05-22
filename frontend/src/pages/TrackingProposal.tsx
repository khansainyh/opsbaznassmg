import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Calendar, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, User, Eye, X, MapPin, Tag, Banknote, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface TrackingProposalProps {
  data: ProposalMemo[];
}

const MEMO_SOURCES = ['Semua', 'Ketua BAZNAS', 'Wakil Ketua I', 'Wakil Ketua II', 'Wakil Ketua III', 'Wakil Ketua IV', 'Kepala Pelaksana'];

const MONTHS = ['Semua','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTH_MAP: Record<string, string> = { Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12' };

const STATUS_ORDER = [
  'Registrasi',
  'Review Kabag Admin','Review Kabag','Review Kabag Administrasi',
  'Survei Assessment','Proses Disposisi','Monitoring Tugas','Tim Survei',
  'Survei Selesai',
  'Review Kepala Pelaksana',
  'Persetujuan Pimpinan',
  'Penentuan Nominal',
  'Pencairan Dana',
  'Realisasi Bantuan',
  'Selesai & Arsip',
];

const STEPS = [
  { id: 'ADM',   label: 'ADM',   full: 'Bagian Administrasi' },
  { id: 'SURV',  label: 'SURV',  full: 'Bagian Survei' },
  { id: 'KEPEL', label: 'KEPEL', full: 'Kepala Pelaksana' },
  { id: 'PIMP',  label: 'PIMP',  full: 'Pimpinan BAZNAS' },
  { id: 'KEU',   label: 'KEU',   full: 'Bagian Keuangan' },
  { id: 'DIST',  label: 'DIST',  full: 'Pendistribusian' },
  { id: 'ARSIP', label: 'ARSIP', full: 'Pengarsipan' },
  { id: 'DONE',  label: 'DONE',  full: 'Selesai' },
];

function getProgressSteps(status: string) {
  const normStatus = status === 'Selesai' ? 'Selesai & Arsip' : status;
  if (normStatus === 'Ditolak') return STEPS.map(s => ({ ...s, active: false, completed: false, rejected: true }));
  const idx = STATUS_ORDER.findIndex(s => s.toLowerCase() === normStatus.toLowerCase());
  return STEPS.map((step, i) => {
    // ADM: idx 0-2, SURV: 3-7, KEPEL: 8, PIMP: 9-10, KEU: 11, DIST: 12, ARSIP: 13, DONE: 13+
    const ranges = [[0,2],[3,7],[8,8],[9,10],[11,11],[12,12],[13,13],[13,13]];
    const [lo, hi] = ranges[i];
    const active = idx >= lo && idx <= hi;
    const completed = idx > hi;
    return { ...step, active, completed, rejected: false };
  });
}

function getStatusColor(status: string) {
  const normStatus = status === 'Selesai' ? 'Selesai & Arsip' : status;
  const map: Record<string, string> = {
    'Registrasi': 'bg-slate-100 text-slate-600',
    'Review Kabag Admin': 'bg-indigo-100 text-indigo-700',
    'Review Kabag': 'bg-indigo-100 text-indigo-700',
    'Review Kabag Administrasi': 'bg-indigo-100 text-indigo-700',
    'Survei Assessment': 'bg-amber-100 text-amber-700',
    'Survei Selesai': 'bg-orange-100 text-orange-700',
    'Review Kepala Pelaksana': 'bg-blue-100 text-blue-700',
    'Persetujuan Pimpinan': 'bg-purple-100 text-purple-700',
    'Penentuan Nominal': 'bg-pink-100 text-pink-700',
    'Pencairan Dana': 'bg-teal-100 text-teal-700',
    'Realisasi Bantuan': 'bg-blue-100 text-blue-700',
    'Selesai & Arsip': 'bg-emerald-100 text-emerald-700',
    'Ditolak': 'bg-rose-100 text-rose-700',
  };
  return map[normStatus] ?? 'bg-slate-100 text-slate-600';
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

export default function TrackingProposal({ data }: TrackingProposalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedMemo, setSelectedMemo] = useState('Semua');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);

  const years = Array.from(new Set(data.map(d => new Date(d.tanggalMasuk).getFullYear().toString()))).sort().reverse();
  if (!years.includes(selectedYear)) years.push(selectedYear);

  const filtered = useMemo(() => {
    return data
      .filter(item => {
        const date = new Date(item.tanggalMasuk);
        const yearOk = date.getFullYear().toString() === selectedYear;
        const monthOk = selectedMonth === 'Semua' || (date.getMonth()+1).toString().padStart(2,'0') === MONTH_MAP[selectedMonth];
        const memoOk = selectedMemo === 'Semua' || (selectedMemo === 'Tanpa Memo' ? !item.hasMemo : item.memoSource === selectedMemo);
        const searchOk = !searchTerm ||
          item.agendaNo.toString().includes(searchTerm) ||
          item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          item.nik.includes(searchTerm);
        return yearOk && monthOk && memoOk && searchOk;
      })
      .sort((a, b) => Number(b.agendaNo) - Number(a.agendaNo));
  }, [data, searchTerm, selectedYear, selectedMonth, selectedMemo]);

  const stats = useMemo(() => ({
    total: filtered.length,
    processing: filtered.filter(d => !['Selesai & Arsip', 'Selesai', 'Ditolak'].includes(d.status)).length,
    approved: filtered.filter(d => ['Selesai & Arsip', 'Selesai'].includes(d.status)).length,
    rejected: filtered.filter(d => d.status === 'Ditolak').length,
  }), [filtered]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Operasional</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Tracking Proposal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tracking Proposal</h2>
        <p className="text-slate-500 font-medium">Pantau alur dan status pengajuan proposal secara real-time.</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title:'Total Proposal', value: stats.total, icon:<FileText className="size-5"/>, color:'primary' as const },
          { title:'Sedang Diproses', value: stats.processing, icon:<Clock className="size-5"/>, color:'amber' as const },
          { title:'Selesai', value: stats.approved, icon:<CheckCircle2 className="size-5"/>, color:'emerald' as const },
        ].map(s => <StatCard key={s.title} {...s} />)}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden flex flex-col">

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center bg-white sticky top-0 z-10">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text" placeholder="Cari Agenda / Nama / NIK..."
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-2 focus:ring-primary/30 outline-none"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Filter Memo */}
          <div className="flex items-center gap-2">
            <History className="size-4 text-emerald-500" />
            <select className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 outline-none cursor-pointer text-emerald-800 font-semibold"
              value={selectedMemo} onChange={e => setSelectedMemo(e.target.value)}>
              {MEMO_SOURCES.map(m => <option key={m} value={m}>{m === 'Semua' ? 'Semua Memo' : m}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-4">No. Agenda</th>
                <th className="px-5 py-4">Pemohon</th>
                <th className="px-5 py-4">Progress</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Filter className="size-8 opacity-20" />
                      <p className="text-sm font-medium">Tidak ada data untuk filter ini.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">{item.namaInstansi || 'Perorangan'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-0.5">
                      {getProgressSteps(item.status).map((step, idx, arr) => (
                        <React.Fragment key={step.id}>
                          <div className="flex flex-col items-center gap-0.5">
                            <div title={step.full} className={cn(
                              "size-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all cursor-default",
                              step.completed ? "bg-primary text-white" :
                              step.active ? "bg-white border-2 border-primary text-primary animate-pulse" :
                              step.rejected ? "bg-rose-100 text-rose-400" :
                              "bg-slate-100 text-slate-400"
                            )}>
                              {step.completed ? <CheckCircle2 className="size-3" /> : step.id.slice(0,2)}
                            </div>
                            <span className={cn("text-[7px] font-black uppercase", step.completed||step.active?"text-primary":"text-slate-300")}>
                              {step.label}
                            </span>
                          </div>
                          {idx < arr.length-1 && <div className={cn("w-3 h-[2px] mb-3.5", step.completed?"bg-primary":"bg-slate-100")} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("px-2 py-1 text-[10px] font-bold rounded-full uppercase whitespace-nowrap", getStatusColor(item.status))}>
                        {item.status}
                      </span>
                      <button onClick={() => setSelectedProposal(item)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {item.hasMemo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                        <History className="size-3" />{item.memoSource || 'Ada Memo'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-medium">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination row */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Menampilkan {filtered.length} entri</p>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all"><ChevronLeft className="size-4"/></button>
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all"><ChevronRight className="size-4"/></button>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProposal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSelectedProposal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Detail Proposal</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Agenda #{selectedProposal.agendaNo}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProposal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Status Banner */}
                <div className={cn("p-4 rounded-xl flex items-center justify-between", getStatusColor(selectedProposal.status))}>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Status: {selectedProposal.status}</span>
                  </div>
                  {selectedProposal.hasMemo && (
                    <span className="text-[10px] font-bold bg-white/60 px-2 py-1 rounded-full">
                      Memo: {selectedProposal.memoSource}
                    </span>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informasi Pemohon</h4>
                    <InfoRow icon={<User className="size-4 text-slate-400"/>} label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                    <InfoRow icon={<Tag className="size-4 text-slate-400"/>} label="NIK" value={selectedProposal.nik || '—'} />
                    <InfoRow icon={<MapPin className="size-4 text-slate-400"/>} label="Alamat"
                      value={[selectedProposal.alamat, selectedProposal.kelurahan, selectedProposal.kecamatan].filter(Boolean).join(', ')} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Detail Pengajuan</h4>
                    <InfoRow icon={<FileText className="size-4 text-slate-400"/>} label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                    <InfoRow icon={<Calendar className="size-4 text-slate-400"/>} label="Tanggal Masuk"
                      value={`${selectedProposal.tanggalMasuk}${selectedProposal.jamPengajuan ? ' · ' + selectedProposal.jamPengajuan : ''}`} />
                    {selectedProposal.nominal && (
                      <InfoRow icon={<Banknote className="size-4 text-slate-400"/>} label="Nominal Bantuan"
                        value={`${formatCurrency(selectedProposal.nominal)} (${selectedProposal.tipeBantuan || '-'})`} />
                    )}
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Riwayat Alur Dokumen</h4>
                  <div className="space-y-3">
                    {getProgressSteps(selectedProposal.status).map((step, idx) => (
                      <div key={step.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn("size-7 rounded-full flex items-center justify-center text-xs font-bold z-10 shrink-0",
                            step.completed ? "bg-primary text-white" :
                            step.active ? "bg-white border-2 border-primary text-primary" :
                            step.rejected ? "bg-rose-100 text-rose-500" :
                            "bg-slate-100 text-slate-400"
                          )}>
                            {step.completed ? <CheckCircle2 className="size-3.5" /> : idx+1}
                          </div>
                          {idx < STEPS.length-1 && <div className={cn("w-[2px] flex-1 my-1", step.completed ? "bg-primary" : "bg-slate-100")} style={{ minHeight: 16 }} />}
                        </div>
                        <div className="pb-2">
                          <p className={cn("text-sm font-bold", step.completed||step.active ? "text-slate-900" : "text-slate-400")}>
                            {step.full}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {step.completed ? 'Selesai diverifikasi' : step.active ? 'Sedang diproses' : step.rejected ? 'Ditolak' : 'Menunggu'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Catatan */}
                {(selectedProposal.catatanKepala || selectedProposal.catatanPimpinan) && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Catatan Pejabat</h4>
                    {selectedProposal.catatanKepala && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Catatan Kepala Pelaksana</p>
                        <p className="text-sm text-slate-700 italic">"{selectedProposal.catatanKepala}"</p>
                      </div>
                    )}
                    {selectedProposal.catatanPimpinan && (
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Catatan Pimpinan</p>
                        <p className="text-sm text-slate-700 italic">"{selectedProposal.catatanPimpinan}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button onClick={() => setSelectedProposal(null)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
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

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: 'primary'|'emerald'|'amber'|'rose' }) {
  const cls = { primary:'bg-primary/10 text-primary', emerald:'bg-emerald-50 text-emerald-600', amber:'bg-amber-50 text-amber-500', rose:'bg-rose-50 text-rose-500' };
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-lg", cls[color])}>{icon}</div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}
