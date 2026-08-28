import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Search, Filter, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown, Eye, X, Banknote, History, ExternalLink, Home, AlertCircle, RotateCcw,
  Calendar, CalendarCheck, Sliders, ShieldCheck, Zap, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getMustahikDisplayName } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';
import { useAuth } from '../context/AuthContext';

interface TrackingProposalProps {
  data: ProposalMemo[];
  onUpdate?: (data: ProposalMemo[]) => void;
}

export const STATUS_OPTIONS_SUPERADMIN = [
  { value: 'Registrasi', label: 'Registrasi', badge: 'ADM', stepIdx: 0, desc: 'Pendaftaran berkas awal proposal' },
  { value: 'Scan_Proposal', label: 'Scan Proposal', badge: 'HUM', stepIdx: 1, desc: 'Scan berkas fisik oleh Humas / Admin' },
  { value: 'Review_Kabag_Administrasi', label: 'Review Kabag Administrasi', badge: 'KDM', stepIdx: 2, desc: 'Verifikasi kelayakan berkas & disposisi awal' },
  { value: 'Survei_Assessment', label: 'Survei / Assesment', badge: 'SURV', stepIdx: 3, desc: 'Penugasan survei relawan & cek lokasi' },
  { value: 'Survei_Selesai', label: 'Review Kabid (Survei Selesai)', badge: 'SURV', stepIdx: 3, desc: 'Review hasil survei lapangan oleh Kabid' },
  { value: 'Review_Kepala_Pelaksana', label: 'Review Kepala Pelaksana', badge: 'KAPEL', stepIdx: 4, desc: 'Telaah & rekomendasi Kepala Pelaksana' },
  { value: 'Review_Pimpinan', label: 'Review Ketua / Pimpinan', badge: 'PIMP', stepIdx: 5, desc: 'Persetujuan & instruksi disposisi Ketua' },
  { value: 'Penentuan_Nominal', label: 'Penentuan Nominal', badge: 'PIMP', stepIdx: 5, desc: 'Penetapan pagu nominal bantuan & persetujuan' },
  { value: 'Antrean_Pencairan', label: 'Antrean Pencairan Dana', badge: 'KEU', stepIdx: 6, desc: 'Penyiapan kas/bank & proses pencairan staf keuangan' },
  { value: 'Realisasi_Bantuan', label: 'Realisasi Bantuan', badge: 'DIST', stepIdx: 7, desc: 'Penyaluran bantuan dana / barang ke mustahik' },
  { value: 'Antrean_SIMBA', label: 'Antrean SIMBA', badge: 'DIST', stepIdx: 7, desc: 'Pencatatan nomor bukti transaksi SIMBA BAZNAS' },
  { value: 'Antrean_Arsip', label: 'Pengarsipan (Antrean Arsip)', badge: 'Arsip', stepIdx: 8, desc: 'Upload kuitansi bertanda tangan & pengarsipan' },
  { value: 'Selesai & Arsip', label: 'Selesai (Selesai & Arsip)', badge: 'DONE', stepIdx: 9, desc: 'Proposal selesai tuntas dan terarsip' },
  { value: 'Ditolak', label: 'Ditolak', badge: 'TOLAK', stepIdx: -1, desc: 'Proposal ditolak dengan catatan alasan' },
];

export function getStepIndexForStatus(status: string): number {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  if (s === 'ditolak') return -1;
  if (s === 'registrasi') return 0;
  if (s.includes('scan')) return 1;
  if (s.includes('kabag')) return 2;
  if (s.includes('survei') || s.includes('kabid')) return 3; // SURV: Survei/Assessment & Review Kabid
  if (s.includes('kepala pelaksana') || s.includes('kapel')) return 4; // KAPEL: Review Kepala Pelaksana
  if (s.includes('pimpinan') || s.includes('ketua') || s.includes('nominal')) return 5; // PIMP: Review Ketua & Penentuan Nominal
  if (s.includes('cair') || s.includes('pencairan')) return 6; // KEU: Antrean Pencairan Dana
  if (s.includes('realisasi')) return 7;
  if (s.includes('simba')) return 7; // DIST: Realisasi & Simba
  if (s.includes('arsip') && !s.includes('selesai')) return 8; // Arsip: Pengarsipan
  if (s.includes('selesai')) return 9; // DONE: Selesai
  return 0;
}

const MEMO_SOURCES = ['Semua', 'Ketua BAZNAS', 'Wakil Ketua I', 'Wakil Ketua II', 'Wakil Ketua III', 'Wakil Ketua IV', 'Kepala Pelaksana'];

const MONTHS = ['Semua','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTH_MAP: Record<string, string> = { Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12' };

export function formatStatusDisplay(status: string, isDirect: boolean = false) {
  if (!status) return isDirect ? 'Pencairan Dana' : status;
  const s = status.trim();
  const sUpper = s.toUpperCase().replace(/_/g, ' ');

  if (isDirect) {
    if (sUpper.includes('SELESAI') || sUpper.includes('ARSIP')) {
      if (sUpper.includes('SELESAI')) return 'Selesai & Arsip';
      return 'Antrean Arsip';
    }
    if (sUpper.includes('SIMBA')) return 'Antrean SIMBA';
    if (sUpper.includes('REALISASI')) return 'Realisasi Bantuan';
    // For Jalur Direct in Keuangan/payout stage:
    return 'Pencairan Dana';
  }

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
  if (sUpper.includes('PERSETUJUAN') || sUpper.includes('DISETUJUI') || sUpper === 'ACC') {
    return 'Pencairan Dana';
  }
  return s;
}

const STATUS_ORDER = [
  'Registrasi',
  'Scan Proposal',
  'Scan_Proposal',
  'Review Kabag Admin', 'Review Kabag', 'Review Kabag Administrasi',
  'Survei Assessment', 'Proses Disposisi', 'Monitoring Tugas', 'Tim Survei', 'Survei Selesai',
  'Review Kepala Pelaksana',
  'Review Pimpinan',
  'Persetujuan Pimpinan',
  'Penentuan Nominal',
  'Pencairan Dana',
  'Realisasi Bantuan',
  'Antrean SIMBA',
  'Antrean_SIMBA',
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
  'Antrean SIMBA',
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

function getProgressSteps(status: string, isDirect: boolean = false) {
  const normStatus = (status === 'Selesai' || status === 'Selesai & Arsip' || status?.toLowerCase().startsWith('selesai')) ? 'Selesai & Arsip' : status;
  if (normStatus === 'Ditolak') return STEPS.map(s => ({ ...s, active: false, completed: false, rejected: true }));
  if (normStatus === 'Selesai & Arsip') return STEPS.map(s => ({ ...s, active: false, completed: true, rejected: false }));

  const idx = STATUS_ORDER.findIndex(s => s.toLowerCase() === normStatus.toLowerCase());
  return STEPS.map((step, i) => {
    // For Jalur Direct, early stages (ADM..PIMP, indices 0..5) are automatically skipped & marked completed
    if (isDirect && i <= 5) {
      return { ...step, active: false, completed: true, rejected: false };
    }

    const ranges = [
      [0,0],   // ADM: Registrasi (idx 0)
      [1,2],   // HUM: Scan Proposal, Scan_Proposal (idx 1-2)
      [3,5],   // KDM: Review Kabag Admin, Review Kabag, Review Kabag Administrasi (idx 3-5)
      [6,10],  // SURV: Survei Assessment, Proses Disposisi, Monitoring Tugas, Tim Survei, Survei Selesai (idx 6-10)
      [11,11], // KAPEL: Review Kepala Pelaksana (idx 11)
      [12,14], // PIMP: Review Pimpinan, Persetujuan Pimpinan, Penentuan Nominal (idx 12-14)
      [15,15], // KEU: Pencairan Dana (idx 15)
      [16,18], // DIST: Realisasi Bantuan, Antrean SIMBA, Antrean_SIMBA (idx 16-18)
      [19,19], // Arsip: Antrean Arsip (idx 19)
      [20,20]  // DONE: Selesai & Arsip (idx 20)
    ];
    const [lo, hi] = ranges[i];

    let active = idx >= lo && idx <= hi;
    let completed = idx > hi;

    if (isDirect && idx < 15) {
      // Default initial stage for Direct is KEU (idx 15 - Pencairan Dana)
      if (i === 6) active = true;
    }

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

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  allOptionLabel: string;
  disabled?: boolean;
  widthClass?: string;
}

function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  allOptionLabel,
  disabled = false,
  widthClass = "w-56"
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updateCoords = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220)
      });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220)
      });
    }
    setIsOpen(prev => !prev);
  };

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, updateCoords]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, query]);

  const displayValue = value === 'Semua' ? allOptionLabel : value;

  return (
    <div className={`flex flex-col gap-1 relative ${widthClass}`} ref={dropdownRef}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "w-full bg-white border border-slate-200 rounded-lg py-2 px-3 flex items-center justify-between text-xs font-semibold shadow-sm transition-all text-left outline-none",
          disabled 
            ? "bg-slate-100/80 text-slate-400 border-slate-200 cursor-not-allowed" 
            : "hover:border-primary/40 focus:ring-2 focus:ring-primary/20 text-slate-700 cursor-pointer",
          isOpen && "border-primary ring-2 ring-primary/20"
        )}
      >
        <span className="truncate">
          {displayValue}
        </span>
        <ChevronDown className={cn("size-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && !disabled && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden text-xs min-w-[210px]"
        >
          {/* Search Box inside Dropdown */}
          <div className="p-2 border-b border-slate-100 relative bg-slate-50/50">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={placeholder || `Cari ${label.toLowerCase()}...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-7 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              autoFocus
            />
            {query && (
              <button 
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
            {/* Default "Semua" Option */}
            <div
              onClick={() => {
                onChange('Semua');
                setIsOpen(false);
                setQuery('');
              }}
              className={cn(
                "px-3 py-2 cursor-pointer font-medium transition-colors flex items-center justify-between hover:bg-slate-50",
                value === 'Semua' ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
              )}
            >
              <span>{allOptionLabel}</span>
              {value === 'Semua' && <CheckCircle2 className="size-3.5 text-primary" />}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-[11px] italic">
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    "px-3 py-2 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 truncate",
                    value === opt ? "bg-primary/10 text-primary font-bold" : "text-slate-700 font-medium"
                  )}
                  title={opt}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <CheckCircle2 className="size-3.5 text-primary shrink-0 ml-1" />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function TrackingProposal({ data, onUpdate }: TrackingProposalProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedMemo, setSelectedMemo] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [selectedAsalFilter, setSelectedAsalFilter] = useState<'Semua' | 'Jalur Proposal' | 'Jalur Direct'>('Jalur Proposal');

  // Super Admin Status Override Modal State
  const [overrideProposal, setOverrideProposal] = useState<ProposalMemo | null>(null);
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<string>('Registrasi');
  const [overrideNominal, setOverrideNominal] = useState<number | string>('');
  const [overrideTipeBantuan, setOverrideTipeBantuan] = useState<string>('Tunai');
  const [overrideCatatan, setOverrideCatatan] = useState<string>('');
  const [isSavingOverride, setIsSavingOverride] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const openOverrideModal = (item: ProposalMemo) => {
    // Find closest matching option value
    const found = STATUS_OPTIONS_SUPERADMIN.find(opt => matchesStatus(item.status, opt.value) || matchesStatus(item.status, opt.label));
    const initialVal = found ? found.value : (item.status ? item.status.replace(/ /g, '_') : 'Registrasi');

    setOverrideProposal(item);
    setOverrideTargetStatus(initialVal);
    setOverrideNominal(item.nominal || '');
    setOverrideTipeBantuan(item.tipeBantuan || 'Tunai');
    setOverrideCatatan('');
  };

  const handleSaveOverride = async () => {
    if (!overrideProposal || !overrideTargetStatus) return;
    setIsSavingOverride(true);
    try {
      const payload: any = {
        status: overrideTargetStatus
      };

      if (overrideNominal !== '' && overrideNominal !== undefined && overrideNominal !== null) {
        const parsedNom = Number(overrideNominal);
        if (!isNaN(parsedNom) && parsedNom >= 0) {
          payload.nominal = parsedNom;
        }
      }

      if (overrideTipeBantuan) {
        payload.tipe_bantuan = overrideTipeBantuan;
      }

      if (overrideCatatan && overrideCatatan.trim()) {
        const note = overrideCatatan.trim();
        payload.keterangan = overrideProposal.keterangan 
          ? `${overrideProposal.keterangan}\n[Super Admin]: ${note}`
          : `[Super Admin]: ${note}`;
      }

      await axios.put(`/api/proposals/${overrideProposal.id}`, payload);

      const normalizedStatus = overrideTargetStatus.replace(/_/g, ' ');
      const updatedProposal: ProposalMemo = {
        ...overrideProposal,
        status: normalizedStatus,
        nominal: payload.nominal !== undefined ? payload.nominal : overrideProposal.nominal,
        tipeBantuan: payload.tipe_bantuan || overrideProposal.tipeBantuan,
        keterangan: payload.keterangan !== undefined ? payload.keterangan : overrideProposal.keterangan,
        catatan: payload.keterangan !== undefined ? payload.keterangan : overrideProposal.catatan,
        updatedAt: new Date().toISOString()
      };

      // If detail modal is currently open for this proposal, update its state too
      if (selectedProposal && selectedProposal.id === overrideProposal.id) {
        setSelectedProposal(updatedProposal);
      }

      // Update parent state across App.tsx
      if (onUpdate) {
        const updatedData = data.map(item => item.id === overrideProposal.id ? updatedProposal : item);
        onUpdate(updatedData);
      }

      setToastMessage({
        text: `Status proposal Agenda #${overrideProposal.agendaNo || overrideProposal.id} berhasil diubah ke "${formatStatusDisplay(overrideTargetStatus)}"`,
        type: 'success'
      });
      setOverrideProposal(null);
    } catch (err) {
      console.error('Error overriding status:', err);
      setToastMessage({
        text: 'Gagal mengubah status proposal. Silakan periksa koneksi dan coba lagi.',
        type: 'error'
      });
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Filter Lanjutan (Advanced Filters)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedKecamatan, setSelectedKecamatan] = useState('Semua');
  const [selectedKelurahan, setSelectedKelurahan] = useState('Semua');
  const [selectedProgram, setSelectedProgram] = useState('Semua');

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

  // Options for Advanced Filters
  const kecamatanOptions = useMemo(() => {
    const fromData = (data || []).map(d => d.kecamatan).filter(Boolean);
    const fromList = kecamatanKelurahanSemarang.map(k => k.kecamatan);
    return Array.from(new Set([...fromList, ...fromData])).sort();
  }, [data]);

  const kelurahanOptions = useMemo(() => {
    if (selectedKecamatan === 'Semua') {
      return [];
    }
    const found = kecamatanKelurahanSemarang.find(k => k.kecamatan.toLowerCase() === selectedKecamatan.toLowerCase());
    const fromList = found ? found.kelurahan : [];
    const fromData = (data || [])
      .filter(d => (d.kecamatan || '').toLowerCase() === selectedKecamatan.toLowerCase())
      .map(d => d.kelurahan)
      .filter(Boolean);
    return Array.from(new Set([...fromList, ...fromData])).sort();
  }, [data, selectedKecamatan]);

  const programOptions = useMemo(() => {
    const setOptions = new Set<string>();
    (data || []).forEach(item => {
      if (item.programCode && item.jenisPermohonan) {
        setOptions.add(`${item.programCode} - ${item.jenisPermohonan}`);
      } else if (item.jenisPermohonan) {
        setOptions.add(item.jenisPermohonan);
      } else if (item.programCode) {
        setOptions.add(item.programCode);
      }
    });
    return Array.from(setOptions).sort();
  }, [data]);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedKecamatan !== 'Semua') count++;
    if (selectedKelurahan !== 'Semua') count++;
    if (selectedProgram !== 'Semua') count++;
    return count;
  }, [selectedKecamatan, selectedKelurahan, selectedProgram]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const years = Array.from(new Set(data.map(d => new Date(d.tanggalMasuk).getFullYear().toString()))).sort().reverse();
  if (!years.includes(selectedYear)) years.push(selectedYear);

  const matchesMemoFilter = (memoSourceStr: string | undefined, hasMemoFlag: boolean, filter: string) => {
    if (filter === 'Semua') return true;
    if (filter === 'Tanpa Memo') return !hasMemoFlag && (!memoSourceStr || memoSourceStr === 'Tanpa Memo');

    if (!memoSourceStr) return false;
    const cleanSource = memoSourceStr.toLowerCase();
    const cleanFilter = filter.toLowerCase();

    if (cleanFilter.includes('ketua') && !cleanFilter.includes('wakil') && !cleanFilter.includes('waka')) {
      return cleanSource.includes('ketua') && !cleanSource.includes('wakil') && !cleanSource.includes('waka');
    }
    if (cleanFilter.includes('wakil ketua i') || cleanFilter.includes('waka i') || cleanFilter.includes('waka 1') || cleanFilter.includes('wakil ketua 1')) {
      return cleanSource.includes('waka i') || cleanSource.includes('waka 1') || cleanSource.includes('wakil ketua i') || cleanSource.includes('wakil ketua 1');
    }
    if (cleanFilter.includes('wakil ketua ii') || cleanFilter.includes('waka ii') || cleanFilter.includes('waka 2') || cleanFilter.includes('wakil ketua 2')) {
      return cleanSource.includes('waka ii') || cleanSource.includes('waka 2') || cleanSource.includes('wakil ketua ii') || cleanSource.includes('wakil ketua 2');
    }
    if (cleanFilter.includes('wakil ketua iii') || cleanFilter.includes('waka iii') || cleanFilter.includes('waka 3') || cleanFilter.includes('wakil ketua 3')) {
      return cleanSource.includes('waka iii') || cleanSource.includes('waka 3') || cleanSource.includes('wakil ketua iii') || cleanSource.includes('wakil ketua 3');
    }
    if (cleanFilter.includes('wakil ketua iv') || cleanFilter.includes('waka iv') || cleanFilter.includes('waka 4') || cleanFilter.includes('wakil ketua 4')) {
      return cleanSource.includes('waka iv') || cleanSource.includes('waka 4') || cleanSource.includes('wakil ketua iv') || cleanSource.includes('wakil ketua 4');
    }
    if (cleanFilter.includes('pelaksana') || cleanFilter.includes('kabag')) {
      return cleanSource.includes('pelaksana') || cleanSource.includes('kabag');
    }

    return cleanSource.includes(cleanFilter) || cleanFilter.includes(cleanSource);
  };

  const filtered = useMemo(() => {
    return data
      .filter(item => {
        const isOBS = item.jenisPengajuan === 'OBS' || (item as any).jenis_pengajuan === 'OBS' || (item.keterangan || '').toUpperCase().includes('OBS') || (item.keterangan || '').toUpperCase().includes('OFF-BALANCING');
        if (isOBS) return false;

        const isDirect = item.memoSource === 'DIRECT_PENYALURAN' || 
          (item.keterangan || '').includes('[DIRECT PENYALURAN]') || 
          (item as any).asal_data === 'Jalur Direct' || 
          (item as any).asalData === 'Jalur Direct' ||
          Number(item.agendaNo || 0) === 0 ||
          Number(item.agendaNo || 0) >= 90000;

        const asalOk = selectedAsalFilter === 'Semua' || (isDirect ? 'Jalur Direct' : 'Jalur Proposal') === selectedAsalFilter;
        if (!asalOk) return false;

        const date = new Date(item.tanggalMasuk);
        const yearOk = date.getFullYear().toString() === selectedYear;
        const monthOk = selectedMonth === 'Semua' || (date.getMonth()+1).toString().padStart(2,'0') === MONTH_MAP[selectedMonth];
        const memoOk = matchesMemoFilter(item.memoSource, item.hasMemo, selectedMemo);
        const statusOk = matchesStatus(item.status, selectedStatus);
        const searchOk = !searchTerm ||
          (item.agendaNo || '').toString().includes(searchTerm) ||
          (item.namaPemohon || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (item.yangMengajukan?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (item.nik || '').includes(searchTerm);

        const kecOk = selectedKecamatan === 'Semua' || (item.kecamatan || '').toLowerCase() === selectedKecamatan.toLowerCase();
        const kelOk = selectedKelurahan === 'Semua' || (item.kelurahan || '').toLowerCase() === selectedKelurahan.toLowerCase();

        let progOk = selectedProgram === 'Semua';
        if (!progOk) {
          const combo = item.programCode && item.jenisPermohonan ? `${item.programCode} - ${item.jenisPermohonan}` : (item.jenisPermohonan || item.programCode || '');
          progOk = combo === selectedProgram || item.jenisPermohonan === selectedProgram || item.programCode === selectedProgram;
        }

        return yearOk && monthOk && memoOk && statusOk && searchOk && kecOk && kelOk && progOk;
      })
      .sort((a, b) => {
        const aAgenda = Number(a.agendaNo || 0);
        const bAgenda = Number(b.agendaNo || 0);

        // Proposals with Agenda No > 0 sorted by agendaNo descending
        if (aAgenda > 0 && bAgenda > 0) {
          return bAgenda - aAgenda;
        }
        if (aAgenda > 0 && bAgenda === 0) {
          return -1;
        }
        if (aAgenda === 0 && bAgenda > 0) {
          return 1;
        }
        // Both are Direct (agenda === 0), sort by date descending
        const aTime = new Date(a.tanggalMasuk).getTime();
        const bTime = new Date(b.tanggalMasuk).getTime();
        return bTime - aTime;
      });
  }, [data, searchTerm, selectedYear, selectedMonth, selectedMemo, selectedStatus, selectedKecamatan, selectedKelurahan, selectedProgram, selectedAsalFilter]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedMonth, selectedMemo, selectedStatus, selectedKecamatan, selectedKelurahan, selectedProgram, selectedAsalFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginatedItems = useMemo(() => {
    const page = currentPage === 0 ? 1 : currentPage;
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

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
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Operasional</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Tracking Proposal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Tracking Proposal
        </h2>
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
        className={cn("bg-white rounded-xl border border-primary/10 shadow-sm flex flex-col", !isFilterExpanded && "overflow-hidden")}>

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

          {/* Filter Asal Data */}
          <select 
            className="text-sm bg-purple-50 border border-purple-200 rounded-lg py-2 px-3 outline-none cursor-pointer text-purple-800 font-semibold"
            value={selectedAsalFilter}
            onChange={e => {
              setSelectedAsalFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="Semua">Semua Asal Data</option>
            <option value="Jalur Proposal">Jalur Proposal</option>
            <option value="Jalur Direct">Jalur Direct</option>
          </select>

          {/* Filter Lanjutan Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-1.5 transition-all cursor-pointer ml-auto sm:ml-0",
              isFilterExpanded || activeAdvancedFiltersCount > 0
                ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            <Filter className="size-4" />
            <span>Filter Lanjutan</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {activeAdvancedFiltersCount}
              </span>
            )}
            <ChevronDown className={cn("size-4 transition-transform duration-200", isFilterExpanded && "rotate-180")} />
          </button>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-slate-50/80 border-b border-slate-200/80"
            >
              <div className="p-4 flex flex-wrap items-end gap-4 text-xs">
                {/* Filter Kecamatan */}
                <SearchableDropdown
                  label="Kecamatan"
                  value={selectedKecamatan}
                  onChange={(val) => {
                    setSelectedKecamatan(val);
                    setSelectedKelurahan('Semua');
                    setCurrentPage(1);
                  }}
                  options={kecamatanOptions}
                  placeholder="Pilih Kecamatan"
                  allOptionLabel="Semua Kecamatan"
                  widthClass="w-56"
                />

                {/* Filter Kelurahan (Hanya aktif setelah memilih Kecamatan) */}
                <SearchableDropdown
                  label="Kelurahan"
                  value={selectedKelurahan}
                  onChange={(val) => {
                    setSelectedKelurahan(val);
                    setCurrentPage(1);
                  }}
                  options={kelurahanOptions}
                  placeholder="Pilih Kelurahan"
                  allOptionLabel="Semua Kelurahan"
                  disabled={selectedKecamatan === 'Semua'}
                  widthClass="w-56"
                />

                {/* Filter Program & Kegiatan */}
                <SearchableDropdown
                  label="Program & Kegiatan"
                  value={selectedProgram}
                  onChange={(val) => {
                    setSelectedProgram(val);
                    setCurrentPage(1);
                  }}
                  options={programOptions}
                  placeholder="Pilih Program / Kegiatan"
                  allOptionLabel="Semua Program & Kegiatan"
                  widthClass="w-72"
                />

                {/* Reset Filter Lanjutan */}
                {activeAdvancedFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKecamatan('Semua');
                      setSelectedKelurahan('Semua');
                      setSelectedProgram('Semua');
                      setCurrentPage(1);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Reset Filter Lanjutan</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              ) : paginatedItems.map(item => {
                const numAgenda = Number(item.agendaNo || 0);
                const isDirectItem = item.memoSource === 'DIRECT_PENYALURAN' || (item.keterangan || '').includes('[DIRECT PENYALURAN]') || (item as any).asal_data === 'Jalur Direct' || (item as any).asalData === 'Jalur Direct' || numAgenda === 0 || numAgenda >= 90000;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3 whitespace-nowrap">
                      {isDirectItem ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-medium text-slate-400">—</span>
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit">Jalur Direct</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{item.agendaNo || '-'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {(() => {
                        const { title, subtitle, isLembaga } = getMustahikDisplayName(item);
                        return (
                          <>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-slate-900">{title}</p>
                              {isLembaga && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                                  Lembaga
                                </span>
                              )}
                            </div>
                            {subtitle && (
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-medium">{subtitle}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-0.5 py-1">
                        {getProgressSteps(item.status, isDirectItem).map((step, idx, arr) => (
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
                          {formatStatusDisplay(item.status, isDirectItem)}
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
                          onClick={() => setSelectedProposal(item)}
                          title="Lihat Detail Proposal"
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
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
              );
            })}
          </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs print:hidden">
          <p className="text-slate-400 font-bold">
            Menampilkan {filtered.length === 0 ? 0 : (currentPage === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1)}-{Math.min((currentPage === 0 ? 1 : currentPage) * itemsPerPage, filtered.length)} dari {filtered.length} Proposal
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
                    {(() => {
                      const numAgenda = Number(selectedProposal.agendaNo || 0);
                      const isDirectModalHeader = selectedProposal.memoSource === 'DIRECT_PENYALURAN' || (selectedProposal.keterangan || '').includes('[DIRECT PENYALURAN]') || (selectedProposal as any).asal_data === 'Jalur Direct' || (selectedProposal as any).asalData === 'Jalur Direct' || numAgenda === 0 || numAgenda >= 90000;
                      if (isDirectModalHeader) {
                        return (
                          <p className="text-xs text-purple-700 font-extrabold uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit mt-0.5">
                            Agenda — · Jalur Direct
                          </p>
                        );
                      }
                      return (
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Agenda #{selectedProposal.agendaNo}</p>
                      );
                    })()}
                  </div>
                </div>
                <button onClick={() => setSelectedProposal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Status Banner */}
                <div className={cn("p-4 rounded-xl flex items-center justify-between flex-wrap gap-2", getStatusColor(selectedProposal.status))}>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5" />
                    {(() => {
                      const numAgenda = Number(selectedProposal.agendaNo || 0);
                      const isDirectModalStatus = selectedProposal.memoSource === 'DIRECT_PENYALURAN' || (selectedProposal.keterangan || '').includes('[DIRECT PENYALURAN]') || (selectedProposal as any).asal_data === 'Jalur Direct' || (selectedProposal as any).asalData === 'Jalur Direct' || numAgenda === 0 || numAgenda >= 90000;
                      return (
                        <span className="text-sm font-black uppercase tracking-wider">
                          Status: {formatStatusDisplay(selectedProposal.status, isDirectModalStatus)}
                        </span>
                      );
                    })()}
                  </div>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => openOverrideModal(selectedProposal)}
                      className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-slate-200 cursor-pointer ml-auto"
                    >
                      <Sliders className="size-3.5 text-primary" />
                      <span>Kelola Status (Super Admin)</span>
                    </button>
                  )}
                </div>

                {/* Nominal & Tanggal Pencairan */}
                {selectedProposal.nominal ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <Banknote className="size-5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Nominal Bantuan Disetujui</p>
                        <p className="text-lg font-black text-emerald-700">{formatCurrency(selectedProposal.nominal)}</p>
                        {(() => {
                          const s = (selectedProposal.status || '').toLowerCase();
                          const isCair = s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
                          const tglCair = selectedProposal.tanggalRealisasi || selectedProposal.tanggalPencairan || selectedProposal.tglCairBank || (isCair ? selectedProposal.updatedAt : null);
                          if (isCair && tglCair) {
                            return (
                              <p className="text-[11px] font-bold text-emerald-900 mt-0.5 flex items-center gap-1">
                                <CalendarCheck className="size-3 text-emerald-600" />
                                Dicairkan pada: {new Date(tglCair).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            );
                          }
                          return null;
                        })()}
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
                        {(() => {
                          const isLembaga = (selectedProposal.jenisPengajuan || '').toLowerCase().includes('lembaga') || (selectedProposal.namaInstansi && !selectedProposal.namaInstansi.toLowerCase().includes('tanpa nama'));
                          const mainName = selectedProposal.namaAnak || (isLembaga ? (selectedProposal.namaInstansi && !selectedProposal.namaInstansi.toLowerCase().includes('tanpa nama') ? selectedProposal.namaInstansi : selectedProposal.namaPemohon) : (selectedProposal.namaPemohon && !selectedProposal.namaPemohon.toLowerCase().includes('tanpa nama') ? selectedProposal.namaPemohon : selectedProposal.namaInstansi));

                          return (
                            <>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedProposal.namaAnak ? 'Nama Anak / Siswa' : (isLembaga ? 'Nama Instansi / Lembaga' : 'Nama Mustahik / Pemohon')}</p>
                              <p className="text-sm font-bold text-slate-900">{mainName || 'Mustahik'}</p>
                              {selectedProposal.namaInstansi && selectedProposal.namaInstansi !== mainName && !selectedProposal.namaInstansi.toLowerCase().includes('tanpa nama') && (
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">Instansi / Sekolah: {selectedProposal.namaInstansi}</p>
                              )}
                              {selectedProposal.namaPemohon && selectedProposal.namaPemohon !== mainName && !selectedProposal.namaPemohon.toLowerCase().includes('tanpa nama') && (
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Pemohon: {selectedProposal.namaPemohon}</p>
                              )}
                            </>
                          );
                        })()}
                        {selectedProposal.nik && (
                          <p className="text-[10px] text-slate-400 font-medium mt-1">NIK: {selectedProposal.nik}</p>
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
                        <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <Calendar className="size-3 text-slate-400" /> Tanggal Pengajuan
                        </p>
                        <p className="text-xs font-semibold text-slate-700">
                          {selectedProposal.tanggalMasuk} {selectedProposal.jamPengajuan ? `· ${selectedProposal.jamPengajuan}` : ''}
                        </p>
                      </div>
                      {(() => {
                        const s = (selectedProposal.status || '').toLowerCase();
                        const isCair = s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
                        const tglCair = selectedProposal.tanggalRealisasi || selectedProposal.tanggalPencairan || selectedProposal.tglCairBank || (isCair ? selectedProposal.updatedAt : null);
                        
                        if (isCair && tglCair) {
                          return (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-0.5">
                              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                                <CalendarCheck className="size-3 text-emerald-600" /> Tanggal Pencairan Dana
                              </p>
                              <p className="text-xs font-black text-slate-900">
                                {new Date(tglCair).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <span className="inline-block text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                                Sudah Dicairkan
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
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

                    {/* Keterangan / Catatan Tambahan */}
                    {(selectedProposal.keterangan || selectedProposal.catatan) && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Keterangan & Catatan Dokumen</h4>
                        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl">
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                            {selectedProposal.keterangan || selectedProposal.catatan}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Riwayat Alur Dokumen */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                        <History className="size-4 text-primary" /> Riwayat Alur Dokumen
                      </h4>
                      <div className="space-y-3 pl-1">
                        {(() => {
                          const isDirectModal = selectedProposal.memoSource === 'DIRECT_PENYALURAN' || (selectedProposal.keterangan || '').includes('[DIRECT PENYALURAN]') || (selectedProposal as any).asal_data === 'Jalur Direct' || (selectedProposal as any).asalData === 'Jalur Direct' || Number(selectedProposal.agendaNo || 0) === 0;
                          return getProgressSteps(selectedProposal.status, isDirectModal).map((step, idx) => (
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
                          ));
                        })()}
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

      {/* Super Admin Status Override Modal */}
      <AnimatePresence>
        {overrideProposal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingOverride && setOverrideProposal(null)}
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
                        Agenda #{overrideProposal.agendaNo || overrideProposal.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                      Kelola Status Proposal
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isSavingOverride && setOverrideProposal(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Proposal mini info */}
              <div className="px-6 pt-5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="truncate max-w-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pemohon / Lembaga</p>
                    <p className="font-bold text-slate-900 truncate mt-0.5">{overrideProposal.namaPemohon || overrideProposal.namaInstansi || 'Mustahik'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Saat Ini</p>
                    <span className={cn("inline-block px-2.5 py-1 font-bold text-[10px] rounded-full uppercase mt-0.5", getStatusColor(overrideProposal.status))}>
                      {formatStatusDisplay(overrideProposal.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {/* Step 1: Select Destination Stage */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="size-3.5 text-primary" />
                    Pilih Tahapan / Status Baru
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih tahapan alur yang ingin dituju. Super Admin dapat melewati (*skip*) proses atau mengembalikan ke tahapan tertentu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200 custom-scrollbar">
                    {STATUS_OPTIONS_SUPERADMIN.map((opt) => {
                      const isSelected = overrideTargetStatus === opt.value;
                      const isCurrent = matchesStatus(overrideProposal.status, opt.value) || matchesStatus(overrideProposal.status, opt.label);
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

                {/* Step 2: Visual Stepper & Skip Alert */}
                {(() => {
                  const currIdx = getStepIndexForStatus(overrideProposal.status);
                  const targetIdx = getStepIndexForStatus(overrideTargetStatus);
                  const isSkipping = currIdx !== -1 && targetIdx !== -1 && targetIdx > currIdx + 1;
                  const isReverting = currIdx !== -1 && targetIdx !== -1 && targetIdx < currIdx;
                  const isRejecting = targetIdx === -1;

                  if (isSkipping) {
                    const skippedNames = STEPS.filter((_, idx) => idx > currIdx && idx < targetIdx).map(s => s.full);
                    return (
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                          <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                          <span>Percepatan: Melewati {skippedNames.length} Tahapan Alur</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                          Proposal ini akan langsung melompat dari <strong>{formatStatusDisplay(overrideProposal.status)}</strong> ke <strong>{formatStatusDisplay(overrideTargetStatus)}</strong>.
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
                            Proposal akan ditandai sebagai <strong>Ditolak</strong> dan dikeluarkan dari antrean pemrosesan aktif.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Step 3: Contextual Settings (Nominal / Tipe Bantuan / Catatan) */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* If moving to or past Penentuan Nominal */}
                  {(() => {
                    const targetIdx = getStepIndexForStatus(overrideTargetStatus);
                    const showFinancialInputs = targetIdx >= 5 || overrideTargetStatus.toLowerCase().includes('nominal'); // PIMP (Penentuan Nominal) & seterusnya
                    if (!showFinancialInputs) return null;

                    return (
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-emerald-900 text-xs font-black uppercase tracking-wider">
                          <Banknote className="size-4 text-emerald-600" />
                          <span>Kelola Nominal & Tipe Bantuan</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Nominal Bantuan (Rp)
                            </label>
                            <input
                              type="number"
                              placeholder="Contoh: 1000000"
                              value={overrideNominal}
                              onChange={(e) => setOverrideNominal(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            {overrideNominal !== '' && Number(overrideNominal) > 0 && (
                              <p className="text-[10px] text-emerald-700 font-bold mt-1">
                                {formatCurrency(Number(overrideNominal))}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Tipe Penyaluran Bantuan
                            </label>
                            <select
                              value={overrideTipeBantuan}
                              onChange={(e) => setOverrideTipeBantuan(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="Tunai">Tunai</option>
                              <option value="Transfer Bank">Transfer Bank</option>
                              <option value="Barang">Barang / Logistik</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Catatan / Alasan Override */}
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                      Catatan / Alasan Override Super Admin (Opsional)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-1.5">
                      Disimpan sebagai keterangan dokumen proposal, tidak mengubah catatan review pimpinan.
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Percepatan penyaluran atas instruksi pimpinan / perubahan status manual"
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
                  onClick={() => setOverrideProposal(null)}
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
              <span className="flex-1">{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="size-3.5" />
              </button>
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
