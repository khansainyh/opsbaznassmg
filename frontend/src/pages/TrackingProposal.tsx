import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  Search, Filter, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, Eye, X, Banknote, History, ExternalLink, Home, AlertCircle
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
  'Scan Proposal',
  'Scan_Proposal',
  'Review Kabag Admin', 'Review Kabag', 'Review Kabag Administrasi',
  'Survei Assessment', 'Proses Disposisi', 'Monitoring Tugas', 'Tim Survei',
  'Survei Selesai',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Persetujuan Pimpinan',
  'Penentuan Nominal',
  'Pencairan Dana',
  'Realisasi Bantuan',
  'Antrean Arsip',
  'Selesai & Arsip',
];

const FILTER_STATUSES = [
  'Semua Status',
  'Registrasi',
  'Scan Proposal',
  'Review Kabag',
  'Survei Assessment',
  'Survei Selesai',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Penentuan Nominal',
  'Pencairan Dana',
  'Realisasi Bantuan',
  'Antrean Arsip',
  'Selesai & Arsip',
  'Ditolak'
];

const STEPS = [
  { id: 'ADM',   label: 'ADM',   full: 'Administrasi' },
  { id: 'HUM',   label: 'HUM',   full: 'Humas (Scan)' },
  { id: 'KDM',   label: 'KDM',   full: 'Review Kabag Administrasi' },
  { id: 'SURV',  label: 'SURV',  full: 'Survei/Assesment' },
  { id: 'KAPEL', label: 'KAPEL', full: 'Kepala Pelaksana' },
  { id: 'PIMP',  label: 'PIMP',  full: 'Review Ketua' },
  { id: 'KEU',   label: 'KEU',   full: 'Keuangan' },
  { id: 'DIST',  label: 'DIST',  full: 'Distribusi & Dayaguna' },
  { id: 'Arsip', label: 'Arsip', full: 'Pengarsipan' },
  { id: 'DONE',  label: 'DONE',  full: 'Selesai' },
];

function getProgressSteps(status: string) {
  const normStatus = status === 'Selesai' ? 'Selesai & Arsip' : status;
  if (normStatus === 'Ditolak') return STEPS.map(s => ({ ...s, active: false, completed: false, rejected: true }));
  const idx = STATUS_ORDER.findIndex(s => s.toLowerCase() === normStatus.toLowerCase());
  return STEPS.map((step, i) => {
    const ranges = [
      [0,0],   // ADM: Registrasi (idx 0)
      [1,2],   // HUM: Scan Proposal, Scan_Proposal (idx 1-2)
      [3,5],   // KDM: Review Kabag Admin, Review Kabag, Review Kabag Administrasi (idx 3-5)
      [6,9],   // SURV: Survei Assessment, Proses Disposisi, Monitoring Tugas, Tim Survei (idx 6-9)
      [10,11], // KAPEL: Survei Selesai, Review Kepala Pelaksana (idx 10-11)
      [12,13], // PIMP: Review Pimpinan, Persetujuan Pimpinan (idx 12-13)
      [14,15], // KEU: Penentuan Nominal, Pencairan Dana (idx 14-15)
      [16,16], // DIST: Realisasi Bantuan (idx 16)
      [17,17], // Arsip: Antrean Arsip (idx 17)
      [18,18]  // DONE: Selesai & Arsip (idx 18)
    ];
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
    'Scan Proposal': 'bg-blue-100 text-blue-700',
    'Scan_Proposal': 'bg-blue-100 text-blue-700',
    'Review Kabag Admin': 'bg-indigo-100 text-indigo-700',
    'Review Kabag': 'bg-indigo-100 text-indigo-700',
    'Review Kabag Administrasi': 'bg-indigo-100 text-indigo-700',
    'Survei Assessment': 'bg-amber-100 text-amber-700',
    'Proses Disposisi': 'bg-amber-100 text-amber-700',
    'Monitoring Tugas': 'bg-amber-100 text-amber-700',
    'Tim Survei': 'bg-amber-100 text-amber-700',
    'Survei Selesai': 'bg-orange-100 text-orange-700',
    'Review Kepala Pelaksana': 'bg-blue-100 text-blue-700',
    'Review Pimpinan': 'bg-purple-100 text-purple-700',
    'Persetujuan Pimpinan': 'bg-purple-100 text-purple-700',
    'Penentuan Nominal': 'bg-pink-100 text-pink-700',
    'Pencairan Dana': 'bg-teal-100 text-teal-700',
    'Realisasi Bantuan': 'bg-blue-100 text-blue-700',
    'Antrean Arsip': 'bg-amber-100 text-amber-700',
    'Selesai & Arsip': 'bg-emerald-100 text-emerald-700',
    'Ditolak': 'bg-rose-100 text-rose-700',
  };
  return map[normStatus] ?? 'bg-slate-100 text-slate-600';
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function matchesStatus(itemStatus: string, filterStatus: string) {
  if (filterStatus === 'Semua Status') return true;
  
  const normItem = itemStatus.toLowerCase().trim();
  const normFilter = filterStatus.toLowerCase().trim();
  
  if (normFilter === 'scan proposal') {
    return normItem === 'scan proposal' || normItem === 'scan_proposal';
  }
  if (normFilter === 'review kabag') {
    return normItem === 'review kabag' || normItem === 'review kabag admin' || normItem === 'review kabag administrasi';
  }
  if (normFilter === 'survei assessment') {
    return normItem === 'survei assessment' || normItem === 'proses disposisi' || normItem === 'monitoring tugas' || normItem === 'tim survei';
  }
  if (normFilter === 'review pimpinan') {
    return normItem === 'review pimpinan' || normItem === 'persetujuan pimpinan';
  }
  if (normFilter === 'selesai & arsip') {
    return normItem === 'selesai & arsip' || normItem === 'selesai';
  }
  return normItem === normFilter;
}

export default function TrackingProposal({ data }: TrackingProposalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedMemo, setSelectedMemo] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
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
      const jp = (selectedProposal.jenisPengajuan || '').toLowerCase();
      const isLembaga = jp.includes('lembaga') || jp.includes('kelompok');
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

  const years = Array.from(new Set(data.map(d => new Date(d.tanggalMasuk).getFullYear().toString()))).sort().reverse();
  if (!years.includes(selectedYear)) years.push(selectedYear);

  const filtered = useMemo(() => {
    return data
      .filter(item => {
        if (item.jenisPengajuan === 'OBS') return false;

        const date = new Date(item.tanggalMasuk);
        const yearOk = date.getFullYear().toString() === selectedYear;
        const monthOk = selectedMonth === 'Semua' || (date.getMonth()+1).toString().padStart(2,'0') === MONTH_MAP[selectedMonth];
        const memoOk = selectedMemo === 'Semua' || (selectedMemo === 'Tanpa Memo' ? !item.hasMemo : item.memoSource === selectedMemo);
        const statusOk = matchesStatus(item.status, selectedStatus);
        const searchOk = !searchTerm ||
          item.agendaNo.toString().includes(searchTerm) ||
          item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (item.nik || '').includes(searchTerm);
        return yearOk && monthOk && memoOk && statusOk && searchOk;
      })
      .sort((a, b) => Number(b.agendaNo) - Number(a.agendaNo));
  }, [data, searchTerm, selectedYear, selectedMonth, selectedMemo, selectedStatus]);

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
        <p className="text-slate-500 font-medium">Layanan monitoring dan penelusuran alur disposisi berkas proposal secara real-time.</p>
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
          <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none cursor-pointer" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            {FILTER_STATUSES.map(s => <option key={s} value={s}>{formatStatusDisplay(s)}</option>)}
          </select>
          {/* Filter Memo */}
          <select className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 outline-none cursor-pointer text-emerald-800 font-semibold"
            value={selectedMemo} onChange={e => setSelectedMemo(e.target.value)}>
            {MEMO_SOURCES.map(m => <option key={m} value={m}>{m === 'Semua' ? 'Semua Memo' : m}</option>)}
          </select>
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
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo}</span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{item.namaInstansi || 'Perorangan'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-0.5 py-1">
                      {getProgressSteps(item.status).map((step, idx, arr) => (
                        <React.Fragment key={step.id}>
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <div title={step.full} className={cn(
                              "size-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all cursor-default shrink-0",
                              step.completed ? "bg-primary text-white" :
                              step.active ? "bg-white border-2 border-primary text-primary animate-pulse" :
                              step.rejected ? "bg-rose-100 text-rose-400" :
                              "bg-slate-100 text-slate-400"
                            )}>
                              {step.completed ? <CheckCircle2 className="size-3" /> : step.id.slice(0,2)}
                            </div>
                            <span className={cn("text-[7px] font-black uppercase tracking-tight", step.completed||step.active?"text-primary":"text-slate-400")}>
                              {step.label}
                            </span>
                          </div>
                          {idx < arr.length-1 && <div className={cn("w-3 h-[2px] mb-3.5 shrink-0", step.completed?"bg-primary":"bg-slate-100")} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("px-2 py-1 text-[10px] font-bold rounded-full uppercase whitespace-nowrap", getStatusColor(item.status))}>
                        {formatStatusDisplay(item.status)}
                      </span>
                      <button onClick={() => setSelectedProposal(item)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0">
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {item.hasMemo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 whitespace-nowrap">
                        <History className="size-3 shrink-0" />{item.memoSource || 'Ada Memo'}
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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
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

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Status Banner */}
                <div className={cn("p-4 rounded-xl flex items-center justify-between", getStatusColor(selectedProposal.status))}>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Status: {formatStatusDisplay(selectedProposal.status)}</span>
                  </div>
                </div>

                {/* Nominal (kalau udah ada) */}
                {selectedProposal.nominal ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <Banknote className="size-5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Nominal Bantuan Disetujui</p>
                        <p className="text-lg font-black text-emerald-700">{formatCurrency(selectedProposal.nominal)}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg uppercase">
                      {selectedProposal.tipeBantuan || 'Tunai'}
                    </span>
                  </div>
                ) : null}

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Pratinjau Dokumen Proposal */}
                    {selectedProposal.fileGdriveLink ? (
                      <div className="space-y-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <ExternalLink className="size-3.5 text-primary" />
                            Pratinjau Dokumen Proposal
                          </h4>
                          <a 
                            href={selectedProposal.fileGdriveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <ExternalLink className="size-3" />
                            Buka di Tab Baru
                          </a>
                        </div>
                        <div className="w-full h-[220px] border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 relative">
                          <iframe 
                            src={selectedProposal.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                            className="w-full h-full border-none"
                            allow="autoplay"
                            title="Pratinjau Proposal"
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Hasil Assessment Lapangan */}
                    {(selectedProposal.score !== null || selectedProposal.survey_data) && (
                      <div className="space-y-6">
                        {selectedProposal.urgencyLevel && (
                          <div className={cn("p-5 rounded-2xl border", selectedProposal.urgencyLevel === 'Sangat Kritis' ? "bg-rose-50 border-rose-100" : selectedProposal.urgencyLevel === 'Tinggi' ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100")}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className={cn("size-5", selectedProposal.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedProposal.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")} />
                                <p className={cn("text-sm font-black uppercase tracking-widest", selectedProposal.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedProposal.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")}>Hasil Survei: {selectedProposal.urgencyLevel}</p>
                              </div>
                              <span className="text-lg font-black">{selectedProposal.score || 0} Poin</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Kapita</p>
                                <p className="text-slate-700">
                                  {selectedProposal.survey_data?.pendapatanTotal && selectedProposal.survey_data?.jumlahTanggungan 
                                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(parseInt(selectedProposal.survey_data.pendapatanTotal) / parseInt(selectedProposal.survey_data.jumlahTanggungan)))
                                    : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggungan</p>
                                <p className="text-slate-700">{selectedProposal.survey_data?.jumlahTanggungan || 0} Orang</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                            <Home className="size-3.5" /> Rincian Lapangan
                          </h4>
                          <div className="space-y-2">
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
                        </div>
                      </div>
                    )}

                    {/* Mustahik & Bantuan Info Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Mustahik / Pemohon</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProposal.namaPemohon}</p>
                        {selectedProposal.nik && (
                          <p className="text-[10px] text-slate-400 font-medium">NIK: {selectedProposal.nik}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Program / Jenis Permohonan</p>
                        <p className="text-xs font-bold text-slate-800">
                          {selectedProposal.programCode ? `[${selectedProposal.programCode}] ` : ''}
                          {selectedProposal.jenisPermohonan || '-'}
                        </p>
                        {selectedProposal.program && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-100">
                            {selectedProposal.program}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">
                          {[selectedProposal.alamat, selectedProposal.kelurahan, selectedProposal.kecamatan].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Pengajuan</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {selectedProposal.tanggalMasuk} {selectedProposal.jamPengajuan ? `· ${selectedProposal.jamPengajuan}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Petugas Lapangan card */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Petugas Lapangan</h4>
                      <div className="flex items-center gap-4 p-4 rounded-xl border bg-primary/5 border-primary/10">
                        {selectedProposal.surveyorName ? (
                          <>
                            <img src={`https://picsum.photos/seed/${selectedProposal.surveyorName}/100/100`} alt={selectedProposal.surveyorName} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{selectedProposal.surveyorName}</p>
                              <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Relawan BAZNAS</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm font-bold text-slate-400 italic">Belum Ditugaskan / Tidak Perlu Survei</p>
                        )}
                      </div>
                      
                      {selectedProposal.survey_data?.catatanLapangan && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Catatan Relawan di Lapangan</p>
                          <p className="text-xs text-slate-700 italic leading-relaxed">"{selectedProposal.survey_data.catatanLapangan}"</p>
                        </div>
                      )}
                    </div>

                    {/* Catatan Pimpinan */}
                    {(selectedProposal.catatanKepala || selectedProposal.catatanPimpinan) && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Catatan Pimpinan</h4>
                        {selectedProposal.catatanKepala && (
                          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1">Catatan Kepala Pelaksana</p>
                            <p className="text-xs text-slate-700 italic">"{selectedProposal.catatanKepala}"</p>
                          </div>
                        )}
                        {selectedProposal.catatanPimpinan && (
                          <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl">
                            <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider mb-1">Catatan Pimpinan</p>
                            <p className="text-xs text-slate-700 italic">"{selectedProposal.catatanPimpinan}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Riwayat Alur Dokumen */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                        <History className="size-4 text-primary" /> Riwayat Alur Dokumen
                      </h4>
                      <div className="space-y-3 pl-1">
                        {getProgressSteps(selectedProposal.status).map((step, idx) => (
                          <div key={step.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn("size-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shrink-0",
                                step.completed ? "bg-primary text-white" :
                                step.active ? "bg-white border-2 border-primary text-primary" :
                                step.rejected ? "bg-rose-100 text-rose-500" :
                                "bg-slate-100 text-slate-400"
                              )}>
                                {step.completed ? <CheckCircle2 className="size-3" /> : idx+1}
                              </div>
                              {idx < STEPS.length-1 && <div className={cn("w-[1.5px] flex-1 my-1", step.completed ? "bg-primary" : "bg-slate-100")} style={{ minHeight: 12 }} />}
                            </div>
                            <div className="pb-1">
                              <p className={cn("text-xs font-bold", step.completed||step.active ? "text-slate-900" : "text-slate-400")}>
                                {step.full}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold">
                                {step.completed ? 'Selesai diverifikasi' : step.active ? 'Sedang diproses' : step.rejected ? 'Ditolak' : 'Menunggu'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
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


// --- HELPER COMPONENTS & FUNCTIONS FOR SURVEY ---


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
