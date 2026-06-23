import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Calendar, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, User, Eye, X, MapPin, Tag, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Surat } from './InputSurat';

interface TrackingSuratProps {
  data: Surat[];
}

const MONTHS = ['Semua','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTH_MAP: Record<string, string> = { Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12' };

const STATUS_ORDER = [
  'Registrasi',
  'Review Kabag Admin',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Selesai'
];

const FILTER_STATUSES = [
  'Semua Status',
  'Registrasi',
  'Review Kabag Admin',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Selesai',
  'Ditolak'
];

const STEPS = [
  { id: 'ADM',   label: 'ADM',   full: 'Registrasi & Scan' },
  { id: 'KDM',   label: 'KDM',   full: 'Review Kabag Admin' },
  { id: 'KAPEL', label: 'KAPEL', full: 'Kepala Pelaksana' },
  { id: 'PIMP',  label: 'PIMP',  full: 'Pimpinan BAZNAS' },
  { id: 'DONE',  label: 'DONE',  full: 'Selesai' },
];

function getProgressSteps(status: string) {
  if (status === 'Ditolak') return STEPS.map(s => ({ ...s, active: false, completed: false, rejected: true }));
  const idx = STATUS_ORDER.findIndex(s => s.toLowerCase() === status.toLowerCase());
  return STEPS.map((step, i) => {
    // ADM: 0, KDM: 1, KAPEL: 2, PIMP: 3, DONE: 4
    const ranges = [[0,0],[1,1],[2,2],[3,3],[4,4]];
    const [lo, hi] = ranges[i];
    const active = idx >= lo && idx <= hi;
    const completed = idx > hi;
    return { ...step, active, completed, rejected: false };
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Registrasi': return 'bg-slate-100 text-slate-600';
    case 'Review Kabag Admin': return 'bg-indigo-100 text-indigo-700';
    case 'Review Kepala Pelaksana': return 'bg-blue-100 text-blue-700';
    case 'Review Pimpinan': return 'bg-purple-100 text-purple-700';
    case 'Arsip': return 'bg-amber-100 text-amber-700';
    case 'Selesai': return 'bg-emerald-100 text-emerald-700';
    case 'Ditolak': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

export default function TrackingSurat({ data }: TrackingSuratProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);

  const years = Array.from(new Set(data.map(d => new Date(d.tanggalMasuk).getFullYear().toString()))).sort().reverse();
  if (!years.includes(selectedYear)) years.push(selectedYear);

  const filtered = useMemo(() => {
    return data
      .filter(item => {
        const date = new Date(item.tanggalMasuk);
        const yearOk = date.getFullYear().toString() === selectedYear;
        const monthOk = selectedMonth === 'Semua' || (date.getMonth()+1).toString().padStart(2,'0') === MONTH_MAP[selectedMonth];
        
        let statusOk = true;
        if (selectedStatus !== 'Semua Status') {
          statusOk = item.status.toLowerCase().trim() === selectedStatus.toLowerCase().trim();
        }

        const searchOk = !searchTerm ||
          item.agendaNo.toString().includes(searchTerm) ||
          (item.namaInstansi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.pimpinanOrganisasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.keperluan || '').toLowerCase().includes(searchTerm.toLowerCase());
        return yearOk && monthOk && statusOk && searchOk;
      })
      .sort((a, b) => Number(b.agendaNo) - Number(a.agendaNo));
  }, [data, searchTerm, selectedYear, selectedMonth, selectedStatus]);

  const stats = useMemo(() => ({
    total: filtered.length,
    processing: filtered.filter(d => !['Selesai', 'Arsip', 'Ditolak'].includes(d.status)).length,
    approved: filtered.filter(d => ['Selesai', 'Arsip'].includes(d.status)).length,
  }), [filtered]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Operasional</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Tracking Surat</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tracking Surat</h2>
        <p className="text-slate-500 font-medium">Pantau alur disposisi dan status surat dinas secara real-time.</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title:'Total Surat', value: stats.total, icon:<FileText className="size-5"/>, color:'primary' as const },
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
              type="text" placeholder="Cari Agenda / Instansi / Keperluan..."
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
          <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none cursor-pointer" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            {FILTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-4">No. Agenda</th>
                <th className="px-5 py-4">Pengirim / Tanggal</th>
                <th className="px-5 py-4">Progress</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Filter className="size-8 opacity-20" />
                      <p className="text-sm font-medium">Tidak ada data surat untuk filter ini.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-bold text-slate-900">{item.namaInstansi || 'Perorangan'}</p>
                    {item.pimpinanOrganisasi && (
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">{item.pimpinanOrganisasi}</p>
                    )}
                    <p className="text-[9px] text-slate-400 font-semibold">{item.tanggalMasuk} {item.jamPengajuan ? '· ' + item.jamPengajuan : ''}</p>
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
                      <button onClick={() => setSelectedSurat(item)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Eye className="size-4" />
                      </button>
                    </div>
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
        {selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSelectedSurat(null)}
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
                    <h3 className="text-lg font-black text-slate-900">Detail Surat</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Agenda #{selectedSurat.agendaNo}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSurat(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Status Banner */}
                <div className={cn("p-4 rounded-xl flex items-center justify-between", getStatusColor(selectedSurat.status))}>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Status: {selectedSurat.status}</span>
                  </div>
                </div>

                {/* PDF/GDrive Viewer if exists */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dokumen Surat</h4>
                    </div>
                    {selectedSurat.fileGdriveLink && (
                      <a href={selectedSurat.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                        <ExternalLink className="size-3" /> Buka di Drive
                      </a>
                    )}
                  </div>
                  {selectedSurat.fileGdriveLink && toGDriveEmbedUrl(selectedSurat.fileGdriveLink) ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '320px' }}>
                      <iframe
                        src={toGDriveEmbedUrl(selectedSurat.fileGdriveLink)!}
                        className="w-full h-full bg-slate-100"
                        title="Dokumen Surat"
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

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informasi Pengirim</h4>
                    <InfoRow icon={<User className="size-4 text-slate-400"/>} label="Nama Instansi" value={selectedSurat.namaInstansi || 'Perorangan'} />
                    <InfoRow icon={<User className="size-4 text-slate-400"/>} label="Pimpinan Organisasi" value={selectedSurat.pimpinanOrganisasi || '—'} />
                    <InfoRow icon={<MapPin className="size-4 text-slate-400"/>} label="Alamat"
                      value={[selectedSurat.alamat, selectedSurat.kelurahan, selectedSurat.kecamatan].filter(Boolean).join(', ')} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Detail Surat</h4>
                    <InfoRow icon={<Tag className="size-4 text-slate-400"/>} label="Kategori" value={selectedSurat.kategori || 'Permohonan/Umum'} />
                    <InfoRow icon={<Calendar className="size-4 text-slate-400"/>} label="Tanggal Masuk"
                      value={`${selectedSurat.tanggalMasuk}${selectedSurat.jamPengajuan ? ' · ' + selectedSurat.jamPengajuan : ''}`} />
                    {selectedSurat.tanggalAcara && (
                      <InfoRow icon={<Calendar className="size-4 text-slate-400"/>} label="Tanggal Acara (Undangan)"
                        value={`${selectedSurat.tanggalAcara ? new Date(selectedSurat.tanggalAcara).toLocaleDateString('id-ID') : '—'}${selectedSurat.jamAcara ? ' · ' + selectedSurat.jamAcara : ''}`} />
                    )}
                  </div>
                </div>

                {/* Keperluan */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Perihal / Keperluan</h4>
                  <p className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedSurat.keperluan}</p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Riwayat Alur Dokumen</h4>
                  <div className="space-y-3">
                    {getProgressSteps(selectedSurat.status).map((step, idx) => (
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
                {(selectedSurat.catatanKepala || selectedSurat.catatanPimpinan) && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Catatan Pejabat</h4>
                    {selectedSurat.catatanKepala && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Catatan Kepala Pelaksana</p>
                        <p className="text-sm text-slate-700 italic">"{selectedSurat.catatanKepala}"</p>
                      </div>
                    )}
                    {selectedSurat.catatanPimpinan && (
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Catatan Pimpinan</p>
                        <p className="text-sm text-slate-700 italic">"{selectedSurat.catatanPimpinan}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button onClick={() => setSelectedSurat(null)}
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
