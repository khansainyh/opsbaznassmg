import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Search, Filter, Calendar, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, User, Eye, X, MapPin, Tag, ExternalLink,
  Send, Edit3, Sliders, ShieldCheck, Zap, RotateCcw, AlertCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Surat } from './InputSurat';
import { useAuth } from '../context/AuthContext';

interface TrackingSuratProps {
  data: Surat[];
  onUpdate?: (data: Surat[]) => void;
}

export const STATUS_OPTIONS_SUPERADMIN_SURAT = [
  { value: 'Registrasi', label: 'Registrasi', badge: 'ADM', stepIdx: 0, desc: 'Pendaftaran berkas awal & scan surat masuk' },
  { value: 'Review_Kabag_Admin', label: 'Review Kabag Administrasi', badge: 'KDM', stepIdx: 1, desc: 'Verifikasi kelayakan berkas & disposisi awal' },
  { value: 'Review_Kepala_Pelaksana', label: 'Review Kepala Pelaksana', badge: 'KAPEL', stepIdx: 2, desc: 'Telaah & rekomendasi Kepala Pelaksana' },
  { value: 'Review_Pimpinan', label: 'Review Ketua / Pimpinan', badge: 'PIMP', stepIdx: 3, desc: 'Persetujuan & arahan disposisi Ketua BAZNAS' },
  { value: 'Penugasan_Kepala_Pelaksana', label: 'Penugasan Kepala Pelaksana', badge: 'KAPEL', stepIdx: 4, desc: 'Penunjukan staf/personel untuk menghadiri/menindaklanjuti' },
  { value: 'Selesai', label: 'Selesai', badge: 'DONE', stepIdx: 5, desc: 'Surat selesai diproses, ditindaklanjuti, dan diarsipkan' },
  { value: 'Ditolak', label: 'Ditolak', badge: 'TOLAK', stepIdx: -1, desc: 'Surat ditolak dengan catatan alasan' },
];

export function getStepIndexForSuratStatus(status: string): number {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  if (s === 'ditolak') return -1;
  if (s === 'registrasi' || s.includes('scan')) return 0;
  if (s.includes('kabag')) return 1;
  if (s.includes('kepala pelaksana') && !s.includes('penugasan')) return 2;
  if (s.includes('pimpinan') || s.includes('ketua')) return 3;
  if (s.includes('penugasan')) return 4;
  if (s.includes('selesai')) return 5;
  return 0;
}

function matchesSuratStatus(current: string, target: string) {
  if (!current || !target) return false;
  return current.toLowerCase().replace(/[_ ]/g, '') === target.toLowerCase().replace(/[_ ]/g, '');
}

const MONTHS = ['Semua','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTH_MAP: Record<string, string> = { Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12' };

export function formatStatusDisplay(status: string) {
  if (!status) return status;
  const s = status.trim();
  if (s === 'Review Kabag' || s === 'Review Kabag Admin' || s === 'Review Kabag Administrasi') {
    return 'Review Kabag Administrasi';
  }
  if (s === 'Survei Selesai') {
    return 'Review Kabid';
  }
  if (s === 'Review Pimpinan') {
    return 'Review Ketua';
  }
  if (s === 'Antrean Arsip') {
    return 'Pengarsipan';
  }
  if (s === 'Selesai & Arsip') {
    return 'Selesai';
  }
  if (s === 'Survei Assessment' || s === 'Survei_Assessment' || s === 'Survei/Assesment') {
    return 'Survei/Assesment';
  }
  return s;
}

const STATUS_ORDER = [
  'Registrasi',
  'Review Kabag Admin',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Penugasan Kepala Pelaksana',
  'Selesai'
];

const FILTER_STATUSES = [
  'Semua Status',
  'Registrasi',
  'Review Kabag Admin',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Penugasan Kepala Pelaksana',
  'Selesai',
  'Ditolak'
];

const STEPS = [
  { id: 'ADM',   label: 'ADM',   full: 'Registrasi & Scan' },
  { id: 'KDM',   label: 'KDM',   full: 'Review Kabag Administrasi' },
  { id: 'KAPEL', label: 'KAPEL', full: 'Kepala Pelaksana' },
  { id: 'PIMP',  label: 'PIMP',  full: 'Review Ketua' },
  { id: 'DONE',  label: 'DONE',  full: 'Selesai' },
];

function getProgressSteps(status: string) {
  if (status === 'Ditolak') return STEPS.map(s => ({ ...s, active: false, completed: false, rejected: true }));
  const idx = STATUS_ORDER.findIndex(s => s.toLowerCase() === status.toLowerCase());
  return STEPS.map((step, i) => {
    let active = false;
    let completed = false;
    if (i === 0) { // ADM
      completed = idx > 0;
      active = idx === 0;
    } else if (i === 1) { // KDM
      completed = idx > 1;
      active = idx === 1;
    } else if (i === 2) { // KAPEL
      completed = idx > 4 || (idx > 2 && idx !== 4);
      active = idx === 2 || idx === 4;
    } else if (i === 3) { // PIMP
      completed = idx > 3;
      active = idx === 3;
    } else if (i === 4) { // DONE
      completed = idx >= 5;
      active = idx === 5;
    }
    return { ...step, active, completed, rejected: false };
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Registrasi': return 'bg-slate-100 text-slate-600';
    case 'Review Kabag Admin': return 'bg-indigo-100 text-indigo-700';
    case 'Review Kepala Pelaksana': return 'bg-blue-100 text-blue-700';
    case 'Review Pimpinan': return 'bg-purple-100 text-purple-700';
    case 'Penugasan Kepala Pelaksana': return 'bg-amber-100 text-amber-700';
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

export default function TrackingSurat({ data, onUpdate }: TrackingSuratProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';
  const canEditSuratKeluar = user?.role === 'Staf_Administrasi' || user?.role === 'Super_Admin';
  const canEditScanSurat = user?.role === 'Staf_Administrasi' || user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);

  const [editingSuratKeluar, setEditingSuratKeluar] = useState(false);
  const [inputLinkSuratKeluar, setInputLinkSuratKeluar] = useState('');
  const [savingSuratKeluar, setSavingSuratKeluar] = useState(false);

  const [editingScanSurat, setEditingScanSurat] = useState(false);
  const [inputLinkScanSurat, setInputLinkScanSurat] = useState('');
  const [savingScanSurat, setSavingScanSurat] = useState(false);

  // Users list for staff assignment
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(res.data || []))
      .catch(console.error);
  }, []);

  // Super Admin Status Override State
  const [overrideSurat, setOverrideSurat] = useState<Surat | null>(null);
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<string>('Registrasi');
  const [overrideCatatan, setOverrideCatatan] = useState('');
  const [overrideAssignedStaff, setOverrideAssignedStaff] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const openOverrideModal = (item: Surat) => {
    setOverrideSurat(item);
    setOverrideTargetStatus(item.status ? item.status.replace(/ /g, '_') : 'Registrasi');
    setOverrideCatatan('');
    setOverrideAssignedStaff(Array.isArray(item.assigned_staff) ? (item.assigned_staff as string[]) : []);
    setStaffSearchQuery('');
  };

  const handleSaveOverride = async () => {
    if (!overrideSurat) return;
    setIsSavingOverride(true);
    try {
      const payload: any = {
        status: overrideTargetStatus,
        assigned_staff: overrideAssignedStaff
      };

      if (overrideCatatan && overrideCatatan.trim()) {
        const note = overrideCatatan.trim();
        payload.catatanKepala = overrideSurat.catatanKepala 
          ? `${overrideSurat.catatanKepala}\n[Catatan Super Admin]: ${note}`
          : `[Catatan Super Admin]: ${note}`;
      }

      await axios.put(`/api/surats/${overrideSurat.id}`, payload);

      const normalizedStatus = overrideTargetStatus.replace(/_/g, ' ') as any;
      const updatedSurat: Surat = {
        ...overrideSurat,
        status: normalizedStatus,
        catatanKepala: payload.catatanKepala || overrideSurat.catatanKepala,
        assigned_staff: overrideAssignedStaff
      };

      if (selectedSurat && selectedSurat.id === overrideSurat.id) {
        setSelectedSurat(updatedSurat);
      }

      if (onUpdate && data) {
        const updatedList = data.map(s => s.id === overrideSurat.id ? updatedSurat : s);
        onUpdate(updatedList);
      }

      setToastMessage({
        text: `Status Surat #${overrideSurat.agendaNo} berhasil diubah ke "${formatStatusDisplay(overrideTargetStatus)}"`,
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 3500);
      setOverrideSurat(null);
    } catch (err: any) {
      console.error('Gagal override status surat:', err);
      setToastMessage({
        text: err.response?.data?.error || 'Gagal mengubah status surat.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const openSuratDetail = (item: Surat) => {
    setSelectedSurat(item);
    setInputLinkSuratKeluar(item.linkSuratKeluar || item.link_surat_keluar || '');
    setEditingSuratKeluar(false);
    setInputLinkScanSurat(item.fileGdriveLink || item.file_gdrive_link || '');
    setEditingScanSurat(false);
  };

  const handleSaveScanSurat = async () => {
    if (!selectedSurat) return;
    setSavingScanSurat(true);
    try {
      const newLink = inputLinkScanSurat.trim();
      await axios.put(`/api/surats/${selectedSurat.id}`, {
        file_gdrive_link: newLink || null
      });

      const updatedSurat: Surat = {
        ...selectedSurat,
        fileGdriveLink: newLink || undefined,
        file_gdrive_link: newLink || undefined
      };

      setSelectedSurat(updatedSurat);

      if (onUpdate && data) {
        const updatedList = data.map(s => s.id === selectedSurat.id ? updatedSurat : s);
        onUpdate(updatedList);
      }

      setEditingScanSurat(false);
      setToastMessage({
        text: 'Berhasil menyimpan Link GDrive Scan Surat!',
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setToastMessage({
        text: 'Gagal menyimpan tautan GDrive Scan Surat: ' + (e.response?.data?.error || e.message),
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSavingScanSurat(false);
    }
  };

  const handleSaveSuratKeluar = async () => {
    if (!selectedSurat) return;
    setSavingSuratKeluar(true);
    try {
      const newLink = inputLinkSuratKeluar.trim();
      await axios.put(`/api/surats/${selectedSurat.id}`, {
        link_surat_keluar: newLink || null
      });

      const updatedSurat: Surat = {
        ...selectedSurat,
        linkSuratKeluar: newLink || undefined,
        link_surat_keluar: newLink || undefined
      };

      setSelectedSurat(updatedSurat);

      if (onUpdate && data) {
        const updatedList = data.map(s => s.id === selectedSurat.id ? updatedSurat : s);
        onUpdate(updatedList);
      }

      setEditingSuratKeluar(false);
      setToastMessage({
        text: 'Berhasil menyimpan Tautan Surat Keluar!',
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setToastMessage({
        text: 'Gagal menyimpan tautan Surat Keluar: ' + (e.response?.data?.error || e.message),
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSavingSuratKeluar(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedMonth, selectedStatus]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginatedItems = useMemo(() => {
    const page = currentPage === 0 ? 1 : currentPage;
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const stats = useMemo(() => ({
    total: filtered.length,
    processing: filtered.filter(d => !['Selesai', 'Arsip', 'Ditolak'].includes(d.status)).length,
    approved: filtered.filter(d => ['Selesai', 'Arsip'].includes(d.status)).length,
  }), [filtered]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Operasional</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Tracking Surat</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Tracking Surat
        </h2>
        <p className="text-slate-500 font-medium">Layanan monitoring dan penelusuran alur disposisi berkas surat masuk secara real-time.</p>
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
            {FILTER_STATUSES.map(s => <option key={s} value={s}>{formatStatusDisplay(s)}</option>)}
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
              ) : paginatedItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-bold text-slate-900">{item.namaInstansi || 'Perorangan'}</p>
                    {item.pimpinanOrganisasi && (
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">{item.pimpinanOrganisasi}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-400 font-semibold">{item.tanggalMasuk} {item.jamPengajuan ? '· ' + item.jamPengajuan : ''}</p>
                      {(item.linkSuratKeluar || item.link_surat_keluar) && (
                        <span title="Ada Surat Keluar" className="inline-flex items-center justify-center size-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                          <Send className="size-3" />
                        </span>
                      )}
                    </div>
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
                        {formatStatusDisplay(item.status)}
                      </span>
                      <div className="flex items-center gap-1">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => openOverrideModal(item)}
                            title="Kelola & Ubah Status (Super Admin)"
                            className="p-1.5 text-primary hover:text-emerald-800 hover:bg-primary/10 rounded-lg transition-all border border-primary/20 bg-primary/5 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
                          >
                            <Sliders className="size-3.5 text-primary" />
                            <span className="hidden xl:inline">Ubah</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openSuratDetail(item)}
                          title="Lihat Detail Surat"
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs print:hidden">
          <p className="text-slate-400 font-bold">
            Menampilkan {filtered.length === 0 ? 0 : (currentPage === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1)}-{Math.min((currentPage === 0 ? 1 : currentPage) * itemsPerPage, filtered.length)} dari {filtered.length} Surat
          </p>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1.5 text-slate-500 font-bold px-2">
              <span>Halaman</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage === 0 ? '' : currentPage}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  if (val === 0) {
                    setCurrentPage(0);
                  } else if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  }
                }}
                onBlur={() => {
                  if (currentPage === 0) {
                    setCurrentPage(1);
                  }
                }}
                className="w-12 text-center py-1 border border-slate-200 rounded-md bg-white text-slate-750 outline-none focus:border-primary text-[11px] font-extrabold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>dari {totalPages}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
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
                <div className={cn("p-4 rounded-xl flex items-center justify-between flex-wrap gap-2", getStatusColor(selectedSurat.status))}>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Status: {formatStatusDisplay(selectedSurat.status)}</span>
                  </div>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => openOverrideModal(selectedSurat)}
                      className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-slate-200 cursor-pointer ml-auto"
                    >
                      <Sliders className="size-3.5 text-primary" />
                      <span>Kelola Status (Super Admin)</span>
                    </button>
                  )}
                </div>

                {/* PDF/GDrive Viewer Surat Masuk */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dokumen Surat Masuk</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link) && (
                        <>
                          <a href={selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                            <ExternalLink className="size-3" /> Buka di Drive
                          </a>
                          {!editingScanSurat && canEditScanSurat && (
                            <button 
                              onClick={() => setEditingScanSurat(true)}
                              className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              <Edit3 className="size-3 text-primary" /> Edit Scan Surat
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingScanSurat ? (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Tautan Google Drive / Scan Surat Masuk:
                      </label>
                      <input 
                        type="url"
                        value={inputLinkScanSurat}
                        onChange={(e) => setInputLinkScanSurat(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-primary font-mono"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingScanSurat(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveScanSurat}
                          disabled={savingScanSurat}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          {savingScanSurat ? 'Menyimpan...' : 'Simpan Link'}
                        </button>
                      </div>
                    </div>
                  ) : (selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link) ? (
                    toGDriveEmbedUrl(selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link || '') ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '320px' }}>
                        <iframe
                          src={toGDriveEmbedUrl(selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link || '')!}
                          className="w-full h-full bg-slate-100"
                          title="Dokumen Surat Masuk"
                          allow="autoplay"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[350px]">
                          {selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link}
                        </span>
                        <a 
                          href={selectedSurat.fileGdriveLink || selectedSurat.file_gdrive_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg"
                        >
                          Buka Link
                        </a>
                      </div>
                    )
                  ) : canEditScanSurat ? (
                    <button 
                      onClick={() => setEditingScanSurat(true)}
                      className="w-full py-2.5 px-4 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 border-dashed rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FileText className="size-3.5 text-primary" />
                      + Tambah Scan Surat
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                      <FileText className="size-6 mb-1 opacity-30" />
                      <p className="text-xs font-medium">Tidak ada dokumen terlampir</p>
                    </div>
                  )}
                </div>

                {/* Dokumen Surat Keluar */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className="size-4 text-emerald-600" />
                      <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">File Surat Keluar</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar) && (
                        <>
                          <a 
                            href={selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline"
                          >
                            <ExternalLink className="size-3" /> Buka Link
                          </a>
                          {!editingSuratKeluar && canEditSuratKeluar && (
                            <button 
                              onClick={() => setEditingSuratKeluar(true)}
                              className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-all"
                            >
                              <Edit3 className="size-3 text-emerald-600" /> Edit Link
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingSuratKeluar ? (
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Tautan Google Drive / File Surat Keluar:
                      </label>
                      <input 
                        type="url"
                        value={inputLinkSuratKeluar}
                        onChange={(e) => setInputLinkSuratKeluar(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingSuratKeluar(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveSuratKeluar}
                          disabled={savingSuratKeluar}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {savingSuratKeluar ? 'Menyimpan...' : 'Simpan Link'}
                        </button>
                      </div>
                    </div>
                  ) : (selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar) ? (
                    toGDriveEmbedUrl(selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar || '') ? (
                      <div className="rounded-xl overflow-hidden border border-emerald-200 shadow-sm" style={{ height: '320px' }}>
                        <iframe
                          src={toGDriveEmbedUrl(selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar || '')!}
                          className="w-full h-full bg-slate-100"
                          title="Dokumen Surat Keluar"
                          allow="autoplay"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 truncate max-w-[350px]">
                          {selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar}
                        </span>
                        <a 
                          href={selectedSurat.linkSuratKeluar || selectedSurat.link_surat_keluar} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                        >
                          Buka Link
                        </a>
                      </div>
                    )
                  ) : canEditSuratKeluar ? (
                    <button 
                      onClick={() => setEditingSuratKeluar(true)}
                      className="w-full py-2.5 px-4 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/80 border-dashed rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="size-3.5 text-emerald-600" />
                      + Tambah Surat Keluar
                    </button>
                  ) : (
                    <div className="py-2 text-center text-xs font-medium text-slate-400 italic">
                      Belum ada file Surat Keluar terlampir.
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

                {/* Staf yang Ditugaskan */}
                {selectedSurat.assigned_staff && Array.isArray(selectedSurat.assigned_staff) && selectedSurat.assigned_staff.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" /> Staf yang Ditugaskan
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedSurat.assigned_staff.map(id => {
                        const u = users.find(x => x.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold shadow-xs">
                            <User className="size-3 text-primary" />
                            <span>{u ? u.name : 'Staf BAZNAS'}</span>
                            {u?.role && <span className="text-[10px] font-normal text-slate-500">({u.role.replace(/_/g, ' ')})</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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

      {/* Super Admin Status Override Modal */}
      <AnimatePresence>
        {overrideSurat && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingOverride && setOverrideSurat(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sliders className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary rounded border border-primary/20 flex items-center gap-1">
                        <ShieldCheck className="size-3 text-primary" />
                        Super Admin
                      </span>
                      <span className="text-xs text-slate-500 font-bold">
                        Agenda #{overrideSurat.agendaNo}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                      Kelola Status Surat Masuk
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isSavingOverride && setOverrideSurat(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Surat Mini Info */}
              <div className="px-6 pt-5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="truncate max-w-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pengirim / Instansi</p>
                    <p className="font-bold text-slate-900 truncate mt-0.5">{overrideSurat.namaInstansi || 'Perorangan'}</p>
                    {overrideSurat.pimpinanOrganisasi && (
                      <p className="text-[10px] text-slate-500">{overrideSurat.pimpinanOrganisasi}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Saat Ini</p>
                    <span className={cn("inline-block px-2.5 py-1 font-bold text-[10px] rounded-full uppercase mt-0.5", getStatusColor(overrideSurat.status))}>
                      {formatStatusDisplay(overrideSurat.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {/* Select Destination Stage */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="size-3.5 text-primary" />
                    Pilih Tahapan / Status Baru
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih tahapan alur surat yang ingin dituju. Super Admin dapat melewati (*skip*) proses atau mengembalikan ke tahapan tertentu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200 custom-scrollbar">
                    {STATUS_OPTIONS_SUPERADMIN_SURAT.map((opt) => {
                      const isSelected = overrideTargetStatus === opt.value;
                      const isCurrent = matchesSuratStatus(overrideSurat.status, opt.value) || matchesSuratStatus(overrideSurat.status, opt.label);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setOverrideTargetStatus(opt.value)}
                          className={cn(
                            "p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between gap-2",
                            isSelected
                              ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-tight",
                                isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                              )}>
                                {opt.badge}
                              </span>
                              <p className={cn("text-xs font-bold truncate", isSelected ? "text-primary" : "text-slate-800")}>
                                {opt.label}
                              </p>
                              {isCurrent && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                                  Saat Ini
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.desc}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Stepper & Skip Alert */}
                {(() => {
                  const currIdx = getStepIndexForSuratStatus(overrideSurat.status);
                  const targetIdx = getStepIndexForSuratStatus(overrideTargetStatus);
                  const isSkipping = currIdx !== -1 && targetIdx !== -1 && targetIdx > currIdx + 1;
                  const isReverting = currIdx !== -1 && targetIdx !== -1 && targetIdx < currIdx;
                  const isRejecting = targetIdx === -1;

                  if (isSkipping) {
                    const skippedNames = STATUS_OPTIONS_SUPERADMIN_SURAT.filter((s) => s.stepIdx > currIdx && s.stepIdx < targetIdx).map(s => s.label);
                    return (
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                          <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                          <span>Percepatan: Melewati {skippedNames.length} Tahapan Alur</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                          Surat ini akan langsung melompat dari <strong>{formatStatusDisplay(overrideSurat.status)}</strong> ke <strong>{formatStatusDisplay(overrideTargetStatus)}</strong>.
                        </p>
                        {skippedNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {skippedNames.map(name => (
                              <span key={name} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-bold line-through opacity-80">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (isReverting) {
                    return (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                        <RotateCcw className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 font-medium">
                          <p className="font-bold">Mode Pengembalian (Revert)</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Status dikembalikan ke tahapan <strong>{formatStatusDisplay(overrideTargetStatus)}</strong> untuk diproses ulang.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (isRejecting) {
                    return (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-800 font-medium">
                          <p className="font-bold">Status Ditolak</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            Surat akan ditandai sebagai <strong>Ditolak</strong> dan dikeluarkan dari antrean pemrosesan aktif.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Contextual: Penugasan Staf (jika status adalah Penugasan Kepala Pelaksana atau setelahnya) */}
                {(() => {
                  const targetIdx = getStepIndexForSuratStatus(overrideTargetStatus);
                  const isPenugasan = targetIdx === 4 || overrideTargetStatus === 'Penugasan_Kepala_Pelaksana' || (overrideSurat.kategori === 'Undangan' && targetIdx >= 4);
                  if (!isPenugasan) return null;

                  return (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-900 text-xs font-black uppercase tracking-wider">
                          <User className="size-4 text-emerald-600" />
                          <span>Pilih / Tugaskan Staf</span>
                        </div>
                        <p className="text-[11px] text-emerald-800/80 mt-0.5">
                          Tentukan personel/staf yang akan menerima notifikasi & ditugaskan menghadiri/menindaklanjuti surat ini.
                        </p>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                        <input
                          type="text"
                          placeholder="Cari nama staf untuk ditugaskan..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      {/* Dropdown Suggestions */}
                      {staffSearchQuery.trim() && (
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg flex flex-col divide-y divide-slate-100 z-10 custom-scrollbar">
                          {users
                            .filter(u => !overrideAssignedStaff.includes(u.id) && u.name.toLowerCase().includes(staffSearchQuery.toLowerCase()))
                            .map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setOverrideAssignedStaff(prev => [...prev, u.id]);
                                  setStaffSearchQuery('');
                                }}
                                className="px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50/80 transition-colors flex justify-between items-center group cursor-pointer"
                              >
                                <span>{u.name} <span className="font-normal text-slate-400 text-[10px] ml-1">({u.role?.replace(/_/g, ' ')})</span></span>
                                <span className="text-primary text-[11px] font-black opacity-0 group-hover:opacity-100 transition-opacity">+ Tambah</span>
                              </button>
                            ))}
                          {users.filter(u => !overrideAssignedStaff.includes(u.id) && u.name.toLowerCase().includes(staffSearchQuery.toLowerCase())).length === 0 && (
                            <div className="px-4 py-2.5 text-xs text-slate-400 text-center italic">
                              Tidak ditemukan staf dengan nama "{staffSearchQuery}".
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Staff Chips */}
                      {overrideAssignedStaff.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {overrideAssignedStaff.map(id => {
                            const u = users.find(x => x.id === id);
                            return (
                              <div
                                key={id}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-bold shadow-xs"
                              >
                                <span>{u ? u.name : 'Staf'}</span>
                                <button
                                  type="button"
                                  onClick={() => setOverrideAssignedStaff(prev => prev.filter(x => x !== id))}
                                  className="hover:text-rose-200 transition-colors p-0.5 rounded-full hover:bg-white/10 cursor-pointer"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-700 italic">
                          Belum ada staf yang dipilih untuk penugasan ini.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Catatan / Alasan Override */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                      Catatan / Alasan Override Super Admin (Opsional)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-1.5">
                      Disimpan sebagai keterangan dokumen surat masuk, tidak mengubah disposisi resmi pimpinan.
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Percepatan disposisi atas instruksi pimpinan / perubahan status manual"
                      value={overrideCatatan}
                      onChange={(e) => setOverrideCatatan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  disabled={isSavingOverride}
                  onClick={() => setOverrideSurat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingOverride}
                  onClick={handleSaveOverride}
                  className="px-5 py-2.5 bg-primary hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingOverride ? (
                    <>
                      <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Terapkan Status Baru</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[120] max-w-md shadow-2xl rounded-xl overflow-hidden"
          >
            <div className={cn(
              "px-4 py-3 text-xs font-bold flex items-center gap-3 border shadow-lg",
              toastMessage.type === 'success'
                ? "bg-slate-900 text-white border-slate-800"
                : "bg-rose-900 text-white border-rose-800"
            )}>
              {toastMessage.type === 'success' ? (
                <div className="size-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
              ) : (
                <div className="size-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-4" />
                </div>
              )}
              <span className="leading-snug">{toastMessage.text}</span>
            </div>
          </motion.div>
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
