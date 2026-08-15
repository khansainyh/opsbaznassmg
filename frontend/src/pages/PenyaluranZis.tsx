import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Eye, 
  Edit3,
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  X, 
  CheckCircle2, 
  Layers,
  Download,
  RefreshCw,
  Sparkles,
  HandHeart,
  Tag,
  UserCheck,
  Building2,
  User,
  UserPlus,
  BookOpen,
  DollarSign,
  FileCheck,
  Send,
  ChevronDown,
  Filter,
  RotateCcw,
  Calendar,
  CalendarCheck,
  Upload,
  FileSpreadsheet,
  FileText,
  Printer,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getMustahikDisplayName } from '../lib/utils';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { pilarData } from '../data/pilarData';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// SummaryCard Component (Matched 100% with PenerimaanZis.tsx)
function SummaryCard({ title, value, subtext, icon, colorClass }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 font-medium">{subtext}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", colorClass || "bg-slate-50 text-slate-500")}>
        {icon}
      </div>
    </div>
  );
}

// Custom Styled Select Component (Replaces native browser <select>)
function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  className
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOpt = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative font-sans w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full text-left text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold flex items-center justify-between gap-2 shadow-sm hover:border-slate-300 cursor-pointer",
          selectedOpt ? "text-slate-900 bg-white border-slate-300" : "text-slate-400 font-medium",
          className
        )}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronRight className={cn("size-4 text-slate-400 shrink-0 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute z-[130] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setIsOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer font-bold",
                value === o.value ? "bg-primary text-white" : "hover:bg-slate-50 text-slate-700 font-medium"
              )}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <CheckCircle2 className="size-3.5 text-white shrink-0 ml-1" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable Searchable Select Component
function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder,
  searchPlaceholder = "Cari...",
  className
}: {
  options: { value: string; label: string; sublabel?: string; badge?: string }[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => {
    return options.find(o => o.value === value || String(o.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      (o.label || '').toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
      (o.badge && o.badge.toLowerCase().includes(q))
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative font-sans w-full" ref={ref}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full text-left text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold flex items-center justify-between gap-2 shadow-sm hover:border-slate-300 cursor-pointer",
          selectedOption ? "text-slate-900 bg-white border-slate-300" : "text-slate-400 font-medium",
          className
        )}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-primary/10 text-primary rounded shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              <span className="font-bold text-slate-900 truncate">{selectedOption.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronRight className={cn("size-4 text-slate-400 shrink-0 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute z-[120] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 space-y-2 max-h-64 overflow-hidden flex flex-col">
          <div className="relative shrink-0">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
            />
          </div>
          <div className="space-y-1 overflow-y-auto custom-scrollbar max-h-44 p-0.5">
            {value && (
              <button
                type="button"
                onClick={() => { onSelect(''); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-[11px] text-rose-600 font-bold transition-colors cursor-pointer"
              >
                -- Hapus Pilihan --
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 py-3 font-medium">Tidak ditemukan hasil pencarian</p>
            ) : (
              filteredOptions.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onSelect(o.value); setIsOpen(false); setSearch(''); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer",
                    value === o.value ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"
                  )}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate leading-tight font-bold">{o.label}</span>
                    {o.sublabel && <span className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">{o.sublabel}</span>}
                  </div>
                  {o.badge && (
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded shrink-0">
                      {o.badge}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Pilar Program Search Select Component (Grouped and ordered by Pilar like InputProposalMemo)
function PilarProgramSearchSelect({
  pilars,
  value,
  onSelect,
  placeholder = "-- Pilih Jenis Permohonan / Program Penyaluran --",
  className
}: {
  pilars: any[];
  value: string;
  onSelect: (progCode: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge pilars with standard pilarData if empty
  const activePilars = useMemo(() => {
    const source = (pilars && pilars.length > 0) ? pilars : pilarData;
    return source;
  }, [pilars]);

  // Find selected program info
  const selectedInfo = useMemo(() => {
    if (!value) return null;
    for (const pilar of activePilars) {
      const prog = (pilar.programs || []).find((p: any) => p.code === value || p.name === value);
      if (prog) {
        return {
          code: prog.code,
          name: prog.name,
          pilarName: pilar.name,
          pilarCode: pilar.code
        };
      }
    }
    return { code: value, name: value, pilarName: 'Umum / Lainnya', pilarCode: '' };
  }, [activePilars, value]);

  // Filtered and grouped by Pilar
  const filteredPilars = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activePilars.map(pilar => {
      const pilarMatch = (pilar.name || '').toLowerCase().includes(q) || String(pilar.code || '').includes(q);
      const matchingProgs = (pilar.programs || []).filter((prog: any) =>
        pilarMatch ||
        (prog.code || '').toLowerCase().includes(q) ||
        (prog.name || '').toLowerCase().includes(q)
      );
      return {
        ...pilar,
        programs: matchingProgs
      };
    }).filter(pilar => pilar.programs && pilar.programs.length > 0);
  }, [activePilars, search]);

  // Styling helper for Pilar badges
  const getPilarStyle = (pilarName: string) => {
    const n = (pilarName || '').toLowerCase();
    if (n.includes('peduli')) return { bg: 'bg-rose-50 text-rose-800 border-rose-200', tag: 'bg-rose-100 text-rose-800' };
    if (n.includes('sehat')) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' };
    if (n.includes('cerdas')) return { bg: 'bg-blue-50 text-blue-800 border-blue-200', tag: 'bg-blue-100 text-blue-800' };
    if (n.includes('taqwa')) return { bg: 'bg-amber-50 text-amber-800 border-amber-200', tag: 'bg-amber-100 text-amber-800' };
    if (n.includes('makmur')) return { bg: 'bg-purple-50 text-purple-800 border-purple-200', tag: 'bg-purple-100 text-purple-800' };
    return { bg: 'bg-slate-50 text-slate-800 border-slate-200', tag: 'bg-slate-100 text-slate-800' };
  };

  return (
    <div className="relative font-sans w-full" ref={ref}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full text-left text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold flex items-center justify-between gap-2 shadow-sm hover:border-slate-300 cursor-pointer",
          selectedInfo ? "text-slate-900 bg-white border-slate-300" : "text-slate-400 font-medium",
          className
        )}
      >
        <span className="truncate flex-1">
          {selectedInfo ? (
            <span className="flex items-center gap-2 truncate">
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-primary/10 text-primary rounded-md shrink-0 border border-primary/20">
                {selectedInfo.code}
              </span>
              <span className="font-bold text-slate-900 truncate">{selectedInfo.name}</span>
              <span className={cn("hidden sm:inline-block px-1.5 py-0.5 text-[8.5px] font-bold rounded shrink-0", getPilarStyle(selectedInfo.pilarName).tag)}>
                {selectedInfo.pilarName}
              </span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronRight className={cn("size-4 text-slate-400 shrink-0 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute z-[140] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 space-y-2 max-h-80 overflow-hidden flex flex-col">
          <div className="relative shrink-0">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jenis permohonan / program / pilar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
            />
          </div>

          <div className="space-y-3 overflow-y-auto custom-scrollbar max-h-60 p-0.5">
            {value && (
              <button
                type="button"
                onClick={() => { onSelect(''); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-[11px] text-rose-600 font-bold transition-colors cursor-pointer"
              >
                -- Hapus Pilihan Program --
              </button>
            )}

            {filteredPilars.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Tidak ada program yang cocok dengan kata kunci "{search}".
              </div>
            ) : (
              filteredPilars.map((pilar) => {
                const style = getPilarStyle(pilar.name);
                return (
                  <div key={pilar.code || pilar.name} className="space-y-1 bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                    {/* Pilar Header Group */}
                    <div className={cn("flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border", style.bg)}>
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="size-3" />
                        {pilar.name}
                      </span>
                      <span className="font-mono text-[9px] opacity-80">Kode {pilar.code}</span>
                    </div>

                    {/* Program list inside this Pilar */}
                    <div className="space-y-0.5 pt-0.5">
                      {(pilar.programs || []).map((prog: any) => {
                        const isSelected = value === prog.code || value === prog.name;
                        return (
                          <button
                            key={prog.code}
                            type="button"
                            onClick={() => {
                              onSelect(prog.code);
                              setIsOpen(false);
                              setSearch('');
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer group",
                              isSelected 
                                ? "bg-primary text-white font-bold shadow-sm" 
                                : "hover:bg-white hover:shadow-xs text-slate-700 font-medium border border-transparent hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={cn(
                                "px-1.5 py-0.5 text-[9px] font-mono font-bold rounded shrink-0",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700 group-hover:bg-primary/10 group-hover:text-primary"
                              )}>
                                {prog.code}
                              </span>
                              <span className="truncate">{prog.name}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="size-3.5 text-white shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Status Color & Format Function (PLEK KETIPLEK from TrackingProposal.tsx)
function getStatusColor(status: string) {
  if (!status) return 'bg-teal-100 text-teal-700';
  const s = status.toLowerCase();
  if (s.includes('selesai') || s.includes('synced')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (s.includes('arsip')) {
    return 'bg-purple-100 text-purple-700';
  }
  if (s.includes('simba')) {
    return 'bg-indigo-100 text-indigo-700';
  }
  if (s.includes('realisasi')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (s.includes('pencairan') || s === 'acc' || s.includes('cair')) {
    return 'bg-teal-100 text-teal-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function formatStatusDisplay(status: string) {
  if (!status) return 'ANTREAN PENCAIRAN';
  const s = status.replace(/_/g, ' ').toUpperCase();
  if (s.includes('SELESAI') || s.includes('SYNCED')) {
    return 'SELESAI';
  }
  if (s === 'ANTREAN ARSIP' || (s.includes('ARSIP') && !s.includes('SELESAI'))) {
    return 'ANTREAN ARSIP';
  }
  if (s.includes('SIMBA')) {
    return 'ANTREAN SIMBA';
  }
  if (s.includes('REALISASI')) {
    return 'REALISASI BANTUAN';
  }
  if (s.includes('PENCAIRAN') || s === 'ACC' || s.includes('CAIR')) {
    return 'ANTREAN PENCAIRAN';
  }
  return s;
}

function getStatusRank(statusStr: string | null | undefined): number {
  if (!statusStr) return 1;
  const s = statusStr.trim().toLowerCase();
  // 1. Antrean Pencairan (Paling Atas)
  if (s.includes('pencairan') || s === 'acc' || s === 'cair') return 1;
  // 2. Realisasi Bantuan
  if (s.includes('realisasi')) return 2;
  // 3. Antrean SIMBA
  if (s.includes('simba') && !s.includes('arsip') && !s.includes('selesai')) return 3;
  // 4. Antrean Arsip
  if ((s.includes('arsip') && !s.includes('selesai')) || s === 'antrean arsip' || s === 'antrean_arsip') return 4;
  // 5. Selesai (Paling Bawah)
  if (s.includes('selesai') || s.includes('synced') || (s.includes('simba') && s.includes('arsip'))) return 5;
  return 1;
}

export default function PenyaluranZis() {
  const [data, setData] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  const [mappingRules, setMappingRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsalFilter, setSelectedAsalFilter] = useState<'Semua' | 'Jalur Proposal' | 'Jalur Direct'>('Semua');
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('Semua Program');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<string>('Semua');
  const [selectedAsnafFilter, setSelectedAsnafFilter] = useState<string>('Semua');
  const [selectedBulanPencairan, setSelectedBulanPencairan] = useState<string>('Semua');
  const [selectedTahunPencairan, setSelectedTahunPencairan] = useState<string>('Semua');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Helper to extract effective Tanggal Pencairan (bukan tanggal masuk/pengajuan)
  const getTanggalPencairan = useCallback((item: any): Date | null => {
    if (!item) return null;
    const raw = item.tanggal_pencairan_real || 
                item.tanggal_realisasi || 
                item.tanggalPencairan || 
                item.tanggalRealisasi || 
                item.tanggal_pencairan;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    const s = (item.status || '').toLowerCase();
    const isSudahCair = s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
    if (isSudahCair && (item.updated_at || item.updatedAt)) {
      const d = new Date(item.updated_at || item.updatedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, []);

  // Available Years for Tanggal Pencairan filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYr = new Date().getFullYear();
    years.add(currentYr);
    years.add(currentYr - 1);
    data.forEach(item => {
      const tgl = getTanggalPencairan(item);
      if (tgl) years.add(tgl.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data, getTanggalPencairan]);

  // Active Advanced Filters Count
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAsalFilter !== 'Semua') count++;
    if (selectedKategoriFilter !== 'Semua') count++;
    if (selectedAsnafFilter !== 'Semua') count++;
    if (selectedBulanPencairan !== 'Semua') count++;
    if (selectedTahunPencairan !== 'Semua') count++;
    return count;
  }, [selectedAsalFilter, selectedKategoriFilter, selectedAsnafFilter, selectedBulanPencairan, selectedTahunPencairan]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [selectedPenyaluran, setSelectedPenyaluran] = useState<any | null>(null);

  // Delete Confirmation Modal & Toast State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Migration State
  const [migrating, setMigrating] = useState(false);
  const [parsedMigrationRows, setParsedMigrationRows] = useState<any[]>([]);

  // Mustahik Autocomplete & Quick Register State
  const [mustahikList, setMustahikList] = useState<any[]>([]);
  const [selectedMustahikId, setSelectedMustahikId] = useState<string | null>(null);
  const [mustahikSearch, setMustahikSearch] = useState('');
  const [showMustahikDropdown, setShowMustahikDropdown] = useState(false);
  const [showQuickRegisterMustahik, setShowQuickRegisterMustahik] = useState(false);
  
  // Quick Register Mustahik fields
  const [quickMustahikKategori, setQuickMustahikKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickMustahikNama, setQuickMustahikNama] = useState('');
  const [quickMustahikNik, setQuickMustahikNik] = useState('');
  const [quickMustahikJenisKelamin, setQuickMustahikJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [quickMustahikTelepon, setQuickMustahikTelepon] = useState('');
  const [quickMustahikAlamat, setQuickMustahikAlamat] = useState('');

  // Form State for Direct Input / Edit
  const [formKategori, setFormKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [formJenisKelamin, setFormJenisKelamin] = useState<'Pria' | 'Wanita'>('Pria');
  const [formNama, setFormNama] = useState('');
  const [formNamaInstansi, setFormNamaInstansi] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formTelepon, setFormTelepon] = useState('');
  const [formYangMengajukan, setFormYangMengajukan] = useState('');
  const [formHasMemo, setFormHasMemo] = useState(false);
  const [formMemoSource, setFormMemoSource] = useState('Memo Ketua BAZNAS');

  const [formJenisPermohonan, setFormJenisPermohonan] = useState('');
  const [formAsnaf, setFormAsnaf] = useState('Miskin');
  const [formRkatId, setFormRkatId] = useState('');
  const [formCoaCode, setFormCoaCode] = useState('519999999');
  const [formNominal, setFormNominal] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formTipeRealisasiLembaga, setFormTipeRealisasiLembaga] = useState<'Lembaga' | 'Perorangan'>('Lembaga');
  const [formVolumeReal, setFormVolumeReal] = useState<number>(1);
  const [formUnitCost, setFormUnitCost] = useState<number>(0);
  
  const [nikChecking, setNikChecking] = useState(false);
  const [nikFoundStatus, setNikFoundStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // States for Cetak Laporan Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'pendayagunaan' | 'pendistribusian' | 'excel_detail'>('pendayagunaan');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportSignDate, setReportSignDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [reportSignatories, setReportSignatories] = useState({
    kepalaPelaksana: '',
    kabidPendayagunaan: '',
    kabidPendistribusian: '',
    wakilKetua3: '',
    wakilKetua2: ''
  });

  useEffect(() => {
    if (isReportModalOpen) {
      axios.get('/api/users')
        .then(res => {
          setUsersList(res.data || []);
        })
        .catch(err => console.error('Error fetching users for signatories:', err));
    }
  }, [isReportModalOpen]);

  const handleVolumeChange = (newVol: number) => {
    const vol = Math.max(1, newVol);
    setFormVolumeReal(vol);
    if (formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan') {
      setFormNominal(String(vol * formUnitCost));
    }
  };

  const handleUnitCostChange = (newCost: number) => {
    const cost = Math.max(0, newCost);
    setFormUnitCost(cost);
    if (formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan') {
      setFormNominal(String(formVolumeReal * cost));
    }
  };

  const handleTipeRealisasiChange = (tipe: 'Lembaga' | 'Perorangan') => {
    setFormTipeRealisasiLembaga(tipe);
    if (tipe === 'Perorangan') {
      const currentNom = Number(formNominal.replace(/\D/g, '')) || 0;
      const cost = formUnitCost > 0 ? formUnitCost : currentNom;
      setFormUnitCost(cost);
      setFormNominal(String(formVolumeReal * cost));
    }
  };

  // Fetch initial data (Optimized for instant page load & zero lag)
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch primary data needed for Master Table & Summary Cards immediately
      const [penyaluranRes, pilarsRes] = await Promise.all([
        axios.get('/api/penyaluran-zis').catch(() => ({ data: { data: [] } })),
        axios.get('/api/pilars').catch(() => ({ data: [] }))
      ]);

      setData(penyaluranRes.data?.data || []);
      setPilars(Array.isArray(pilarsRes.data) ? pilarsRes.data : []);
      setLoading(false); // Instantly display the table & summary cards to the user!

      // 2. Fetch modal & form metadata in the background concurrently
      Promise.all([
        axios.get('/api/rkat-operasional').catch(() => ({ data: [] })),
        axios.get('/api/finance/coa').catch(() => ({ data: [] })),
        axios.get('/api/finance/mapping-rules').catch(() => ({ data: [] })),
        axios.get('/api/mustahik?compact=true').catch(() => ({ data: { data: [] } }))
      ]).then(([rkatRes, coaRes, mappingRes, mustahikRes]) => {
        setRkatList(Array.isArray(rkatRes.data) ? rkatRes.data : []);
        setCoaList(Array.isArray(coaRes.data) ? coaRes.data : []);
        setMappingRules(Array.isArray(mappingRes.data) ? mappingRes.data : []);
        setMustahikList(mustahikRes.data?.data || []);
      }).catch(err => console.warn('Background metadata fetch error:', err));

    } catch (e) {
      console.error('Error loading Penyaluran ZIS:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter COA for Penyaluran (starts with 5 or klasifikasi Beban/Penyaluran)
  const penyaluranCoaOptions = useMemo(() => {
    if (coaList.length === 0) return [];
    return coaList.filter((c: any) => {
      const code = String(c.code || c.coa_code || '').trim();
      const klasifikasi = String(c.klasifikasi || '').toLowerCase().trim();
      return code.startsWith('5') || klasifikasi.includes('penyaluran') || klasifikasi.includes('beban');
    });
  }, [coaList]);

  // All Programs / Kegiatan List for dropdown selector
  const programOptions = useMemo(() => {
    const progs: any[] = [];
    pilars.forEach((pilar: any) => {
      (pilar.programs || []).forEach((prog: any) => {
        progs.push({
          code: prog.code,
          name: prog.name,
          pilarName: pilar.name,
          rkat_details: prog.rkat_details || [],
          coa_code: prog.coa_code
        });
      });
    });
    return progs;
  }, [pilars]);

  // Cascading RKAT Penyaluran Options for Selected Program & Asnaf in Modal
  const filteredRkatOptions = useMemo(() => {
    if (!formJenisPermohonan) {
      const allFromPilars: any[] = [];
      let counter = 1;
      pilars.forEach((pilar: any) => {
        (pilar.programs || []).forEach((prog: any) => {
          (prog.rkat_details || []).forEach((detail: any) => {
            allFromPilars.push({
              id: detail.id,
              no: detail.no || counter++,
              nama: detail.name || detail.nama,
              keterangan: detail.keterangan || detail.spesifikasi || detail.catatan,
              programCode: prog.code,
              programName: prog.name
            });
          });
        });
      });
      if (allFromPilars.length > 0) return allFromPilars;
      return rkatList.map((r, i) => ({ id: r.id, no: r.no || i + 1, nama: r.nama || r.name, keterangan: r.keterangan }));
    }

    let progObj: any = null;
    pilars.forEach((pilar: any) => {
      (pilar.programs || []).forEach((prog: any) => {
        if (prog.code === formJenisPermohonan || prog.name === formJenisPermohonan) {
          progObj = prog;
        }
      });
    });

    const list: any[] = [];

    // 1. Extract rkat_details from the selected Program
    if (progObj && Array.isArray(progObj.rkat_details) && progObj.rkat_details.length > 0) {
      progObj.rkat_details.forEach((detail: any, idx: number) => {
        list.push({
          id: detail.id,
          no: detail.no || idx + 1,
          nama: detail.name || detail.nama || progObj.name,
          keterangan: detail.keterangan || detail.spesifikasi || detail.catatan,
          programCode: progObj.code,
          programName: progObj.name
        });
      });
    }

    // 2. Add matching items from rkatList
    rkatList.forEach((r: any) => {
      const code = String(r.program_code || r.program?.code || r.code || '').toLowerCase();
      const target = String(formJenisPermohonan).toLowerCase();
      if (code === target || code.includes(target) || target.includes(code)) {
        if (!list.some(existing => existing.id === r.id)) {
          list.push({
            id: r.id,
            no: r.no || list.length + 1,
            nama: r.nama || r.name,
            keterangan: r.keterangan || r.spesifikasi || r.catatan,
            programCode: r.program_code,
            programName: r.program?.name
          });
        }
      }
    });

    return list;
  }, [rkatList, pilars, formJenisPermohonan, formAsnaf]);

  // Searchable Select Options for RKAT
  const rkatSelectOptions = useMemo(() => {
    return filteredRkatOptions.map(r => ({
      value: r.id,
      label: r.nama,
      sublabel: r.keterangan ? `Spesifikasi: ${r.keterangan}` : (r.programName ? `Program: ${r.programName}` : undefined),
      badge: `RKAT #${r.no}`
    }));
  }, [filteredRkatOptions]);

  // Searchable Select Options for COA
  const coaSelectOptions = useMemo(() => {
    return penyaluranCoaOptions.map(c => ({
      value: c.code || c.coa_code || c.id,
      label: c.name || c.nama_akun || c.nama,
      sublabel: 'Akun Beban Penyaluran ZIS (Buku Besar)',
      badge: c.code || c.coa_code
    }));
  }, [penyaluranCoaOptions]);

  // Resolve COA based on CoaMappingRule from Pengaturan Keuangan
  const resolveMappingCoa = useCallback((programVal: string, asnafVal: string) => {
    if (!programVal) return '519999999';
    const targetProg = String(programVal).trim().toLowerCase();
    const targetProgCode = targetProg.split(' ')[0].split('-')[0].trim();
    const targetAsnaf = String(asnafVal || '').trim().toLowerCase();

    // Determine fund source
    let fundSource = 'ZAKAT';
    if (targetAsnaf === 'istt' || targetAsnaf.includes('tidak terikat')) fundSource = 'INFAK_TIDAK_TERIKAT';
    else if (targetAsnaf === 'ist' || targetAsnaf.includes('terikat')) fundSource = 'INFAK_TERIKAT';

    const matchProg = (ruleProg: string) => {
      if (!ruleProg) return false;
      const cleanRule = ruleProg.trim().toLowerCase();
      const cleanRuleCode = cleanRule.split(' ')[0].split('-')[0].trim();
      if (cleanRule === targetProg || targetProg.includes(cleanRule) || cleanRule.includes(targetProg)) return true;
      if (cleanRuleCode && targetProgCode && (targetProgCode === cleanRuleCode || targetProgCode.startsWith(cleanRuleCode) || cleanRuleCode.startsWith(targetProgCode))) return true;
      return false;
    };

    const matchAsnaf = (ruleAsnaf: string | null) => {
      if (!ruleAsnaf || ruleAsnaf.trim() === '' || ruleAsnaf.trim().toLowerCase() === 'global') return true;
      return ruleAsnaf.trim().toLowerCase() === targetAsnaf;
    };

    // Filter rules by fundSource
    const fundRules = mappingRules.filter((r: any) => {
      if (!r.sumber_dana_tag || r.sumber_dana_tag === 'ALL') return true;
      return r.sumber_dana_tag === fundSource;
    });

    // 1. Match Exact Program AND Exact Asnaf
    let matched = fundRules.find((r: any) => matchProg(r.program_code) && r.asnaf_id && r.asnaf_id.trim().toLowerCase() === targetAsnaf);

    // 2. Match Exact Program AND Global/Empty Asnaf
    if (!matched) {
      matched = fundRules.find((r: any) => matchProg(r.program_code) && matchAsnaf(r.asnaf_id));
    }

    if (matched && matched.debit_coa_code) {
      return matched.debit_coa_code;
    }

    // Secondary: Check program.coa_code from programOptions only if valid COA code
    const prog = programOptions.find(p => p.code === programVal || p.name === programVal);
    if (prog && prog.coa_code && String(prog.coa_code).startsWith('5') && String(prog.coa_code).length >= 6) {
      return prog.coa_code;
    }

    // Default fallback based on asnaf
    if (targetAsnaf === 'ist' || targetAsnaf.includes('terikat')) return '52010101';
    if (targetAsnaf === 'istt' || targetAsnaf.includes('tidak terikat')) return '52020101';

    return '51010101';
  }, [mappingRules, programOptions]);

  // Auto-cascade COA Code when Program changes (Matching Proposal COA Mapping)
  const handleProgramSelect = (programCodeVal: string) => {
    setFormJenisPermohonan(programCodeVal);
    setFormRkatId('');
    const mapped = resolveMappingCoa(programCodeVal, formAsnaf);
    setFormCoaCode(mapped);
  };

  const handleAsnafSelect = (asnafVal: string) => {
    setFormAsnaf(asnafVal);
    const mapped = resolveMappingCoa(formJenisPermohonan, asnafVal);
    setFormCoaCode(mapped);
  };

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatNumberWithDots = (val: string | number) => {
    if (!val) return '';
    const numStr = String(val).replace(/\D/g, '');
    if (!numStr) return '';
    return new Intl.NumberFormat('id-ID').format(Number(numStr));
  };

  // Helper to find RKAT No & Name for a proposal
  const getRkatInfo = (item: any) => {
    if (!item) return { rkatNo: null, rkatName: null, rkatKet: null };

    let found = (rkatList || []).find((r: any) => 
      r.id === item.rkat_activity_id || 
      r.no === item.rkat_activity_id || 
      String(r.no) === String(item.rkat_activity_id) ||
      (item.rkat_activity_id && String(r.id).toLowerCase() === String(item.rkat_activity_id).toLowerCase())
    );

    if (!found && item.program?.rkat_details && Array.isArray(item.program.rkat_details)) {
      const details = item.program.rkat_details;
      const detailMatch = details.find((d: any) => d.id === item.rkat_activity_id || String(d.no) === String(item.rkat_activity_id)) || details[0];
      if (detailMatch) {
        return {
          rkatNo: detailMatch.no || '1',
          rkatName: detailMatch.name || detailMatch.nama || item.program?.name,
          rkatKet: detailMatch.keterangan || detailMatch.spesifikasi || detailMatch.catatan || detailMatch.deskripsi || null
        };
      }
    }

    if (!found && item.program?.code) {
      found = (rkatList || []).find((r: any) => r.program_code === item.program.code || r.program?.code === item.program.code);
    }

    if (!found && (pilars || []).length > 0) {
      const targetProgCode = item.program?.code || item.program_code || item.jenis_permohonan;
      for (const pilar of pilars) {
        const pMatch = (pilar.programs || []).find((p: any) => p.code === targetProgCode || p.name === targetProgCode || (targetProgCode && targetProgCode.includes(p.code)));
        if (pMatch) {
          const detail = (pMatch.rkat_details && pMatch.rkat_details.length > 0) ? pMatch.rkat_details[0] : null;
          return {
            rkatNo: detail?.no || '1',
            rkatName: detail?.name || detail?.nama || pMatch.name,
            rkatKet: detail?.keterangan || detail?.spesifikasi || detail?.catatan || pMatch.keterangan || pMatch.spesifikasi || null
          };
        }
      }
    }

    if (found) {
      return {
        rkatNo: found.no || found.id,
        rkatName: found.nama || found.name,
        rkatKet: found.keterangan || found.spesifikasi || found.catatan || found.deskripsi || null
      };
    }

    return { 
      rkatNo: null, 
      rkatName: item.program?.name || item.jenis_permohonan || 'Umum', 
      rkatKet: item.program?.keterangan || item.program?.spesifikasi || null 
    };
  };

  // Helper to format standard ledger description (Keterangan Buku Besar)
  const getDisbursementKeterangan = (item: any) => {
    const rawProgramName = item.program?.name || item.jenis_permohonan || 'Bantuan';
    const cleanProgram = rawProgramName.toLowerCase().startsWith('bantuan') 
      ? rawProgramName 
      : `Bantuan ${rawProgramName}`;

    const isLembaga = item.jenis_pengajuan === 'Lembaga' || 
      (item.nama_instansi && (!item.nama_pemohon || item.nama_pemohon === item.nama_instansi));

    let effectiveAnak = item.nama_anak && item.nama_anak.trim() !== '' && item.nama_anak.trim() !== '-' ? item.nama_anak.trim() : null;
    if (!effectiveAnak && item.survey_data) {
      try {
        const s = typeof item.survey_data === 'string' ? JSON.parse(item.survey_data) : item.survey_data;
        const fromSurvey = s?.namaAnak || s?.nama_anak || s?.namaSiswa || s?.nama_siswa || s?.anak;
        if (fromSurvey && String(fromSurvey).trim() !== '' && String(fromSurvey).trim() !== '-') {
          effectiveAnak = String(fromSurvey).trim();
        }
      } catch (e) {}
    }

    let targetName = '';
    if (effectiveAnak) {
      const instansi = (item.nama_instansi && item.nama_instansi.trim() !== '-' && !item.nama_instansi.toLowerCase().startsWith('kel.')) 
        ? ` ${item.nama_instansi.trim()}` 
        : '';
      targetName = `${effectiveAnak}${instansi}`;
    } else if (isLembaga) {
      targetName = (item.nama_instansi && item.nama_instansi.trim() !== '-' ? item.nama_instansi.trim() : item.nama_pemohon?.trim()) || 'Lembaga';
    } else {
      targetName = (item.nama_pemohon && item.nama_pemohon.trim() !== '-' ? item.nama_pemohon.trim() : item.nama_instansi?.trim()) || 'Pemohon';
    }

    const addressParts: string[] = [];
    if (item.alamat && item.alamat.trim() !== '' && item.alamat.trim() !== '-') {
      addressParts.push(item.alamat.trim());
    } else if (item.mustahik?.alamat && item.mustahik.alamat.trim() !== '' && item.mustahik.alamat.trim() !== '-') {
      addressParts.push(item.mustahik.alamat.trim());
    }
    if (item.kelurahan && item.kelurahan.trim() !== '' && item.kelurahan.trim() !== '-') {
      addressParts.push(item.kelurahan.trim());
    }
    if (item.kecamatan && item.kecamatan.trim() !== '' && item.kecamatan.trim() !== '-') {
      addressParts.push(item.kecamatan.trim());
    }

    const addressStr = addressParts.length > 0 ? `, ${addressParts.join(' ')}` : '';
    return `${cleanProgram} an. ${targetName}${addressStr}`;
  };

  // Helper to find COA Accounting Code (Auto-mapping from Mapping COA Rules & Master COA) for a proposal
  const getCoaInfo = (item: any) => {
    if (!item) return { coaCode: '51010101', coaName: 'Beban Penyaluran ZIS' };

    // 1. Direct attribute from proposal / backend realisasi journal entry ONLY if it is a genuine COA code (starts with 5 and length >= 6)
    if (item.coa_code && String(item.coa_code).startsWith('5') && String(item.coa_code).length >= 6 && item.coa_code !== '519999999') {
      const foundInMaster = (coaList || []).find((c: any) => (c.coa_code || c.code) === item.coa_code);
      return {
        coaCode: item.coa_code,
        coaName: foundInMaster?.nama_akun || foundInMaster?.name || item.coa_name || 'Beban Penyaluran ZIS'
      };
    }

    // 2. Client-side mapping resolution fallback (from Mapping COA rules)
    const progVal = item.program?.code || item.program_code || item.jenis_permohonan || item.program?.name || '';
    const asnafVal = item.asnaf || 'Miskin';
    const targetCode = resolveMappingCoa(progVal, asnafVal);

    const foundCoa = (coaList || []).find((c: any) => (c.code || c.coa_code) === targetCode || c.id === targetCode);

    if (foundCoa) {
      return {
        coaCode: foundCoa.code || foundCoa.coa_code || targetCode,
        coaName: foundCoa.nama_akun || foundCoa.name || 'Beban Penyaluran ZIS'
      };
    }

    if (targetCode && String(targetCode).startsWith('5') && String(targetCode).length >= 6) {
      return {
        coaCode: targetCode,
        coaName: item.coa_name || 'Beban Penyaluran ZIS'
      };
    }

    // Default fallback based on asnaf/fund
    const asnafNorm = String(asnafVal).toLowerCase();
    if (asnafNorm === 'ist' || asnafNorm.includes('terikat')) {
      return { coaCode: '52010101', coaName: 'Beban Penyaluran Infak Terikat' };
    }
    if (asnafNorm === 'istt' || asnafNorm.includes('tidak terikat')) {
      return { coaCode: '52020101', coaName: 'Beban Penyaluran Infak Tidak Terikat' };
    }

    return {
      coaCode: '51010101',
      coaName: 'Beban Penyaluran Zakat'
    };
  };

  // Helper to resolve Program & RKAT details for Migration preview & table
  const resolveProgramAndRkatForMigration = useCallback((progCodeOrName: string, rkatIdOrNo: string) => {
    let resolvedProgName = progCodeOrName || '-';
    let resolvedRkatName = '-';
    let resolvedRkatKet = '-';
    let resolvedRkatNo = '';

    const cleanProg = String(progCodeOrName || '').trim().toLowerCase();
    const cleanRkat = String(rkatIdOrNo || '').trim().toLowerCase();

    // 1. Search in pilars
    for (const pilar of pilars) {
      for (const prog of (pilar.programs || [])) {
        const pCode = String(prog.code || '').trim().toLowerCase();
        const pName = String(prog.name || '').trim().toLowerCase();

        if (
          pCode === cleanProg ||
          (cleanProg && pCode.startsWith(cleanProg)) ||
          (cleanProg && cleanProg.startsWith(pCode)) ||
          pName === cleanProg ||
          (cleanProg && pName.includes(cleanProg))
        ) {
          resolvedProgName = `${prog.code} - ${prog.name}`;
          
          // Match RKAT details inside this program
          if (prog.rkat_details && Array.isArray(prog.rkat_details)) {
            const matchDetail = prog.rkat_details.find((d: any) => {
              const dId = String(d.id || '').trim().toLowerCase();
              const dNo = String(d.no || '').trim().toLowerCase();
              return dId === cleanRkat || dNo === cleanRkat || (cleanRkat && dId.includes(cleanRkat));
            }) || prog.rkat_details[0];

            if (matchDetail) {
              resolvedRkatNo = matchDetail.no ? `#${matchDetail.no}` : '';
              resolvedRkatName = matchDetail.name || matchDetail.nama || prog.name;
              resolvedRkatKet = matchDetail.keterangan || matchDetail.spesifikasi || matchDetail.catatan || matchDetail.deskripsi || '-';
            }
          }
          break;
        }
      }
    }

    // 2. If RKAT detail wasn't found in pilars, search in rkatList or all pilars
    if (resolvedRkatName === '-' && rkatIdOrNo) {
      const foundInRkatList = (rkatList || []).find((r: any) => {
        const rId = String(r.id || '').trim().toLowerCase();
        const rNo = String(r.no || '').trim().toLowerCase();
        return rId === cleanRkat || rNo === cleanRkat || (cleanRkat && rId.includes(cleanRkat));
      });

      if (foundInRkatList) {
        resolvedRkatNo = foundInRkatList.no ? `#${foundInRkatList.no}` : '';
        resolvedRkatName = foundInRkatList.nama || foundInRkatList.name || '-';
        resolvedRkatKet = foundInRkatList.keterangan || foundInRkatList.spesifikasi || foundInRkatList.catatan || '-';
      } else {
        // Search across all pilars rkat_details
        for (const pilar of pilars) {
          for (const prog of (pilar.programs || [])) {
            if (prog.rkat_details && Array.isArray(prog.rkat_details)) {
              const dMatch = prog.rkat_details.find((d: any) => {
                const dId = String(d.id || '').trim().toLowerCase();
                const dNo = String(d.no || '').trim().toLowerCase();
                return dId === cleanRkat || dNo === cleanRkat || (cleanRkat && dId.includes(cleanRkat));
              });
              if (dMatch) {
                resolvedRkatNo = dMatch.no ? `#${dMatch.no}` : '';
                resolvedRkatName = dMatch.name || dMatch.nama || prog.name;
                resolvedRkatKet = dMatch.keterangan || dMatch.spesifikasi || dMatch.catatan || '-';
                break;
              }
            }
          }
        }
      }
    }

    return {
      progDisplay: resolvedProgName,
      rkatNo: resolvedRkatNo,
      rkatName: resolvedRkatName !== '-' ? resolvedRkatName : (rkatIdOrNo || '-'),
      rkatKet: resolvedRkatKet
    };
  }, [pilars, rkatList]);

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // STRICT: Exclude OBS records completely from Penyaluran ZIS
      if (item.jenis_pengajuan === 'OBS' || item.jenisPengajuan === 'OBS' || String(item.jenis_pengajuan).toUpperCase() === 'OBS') {
        return false;
      }

      const isDirect = item.asal_data === 'Jalur Direct' || 
        item.memo_source === 'DIRECT_PENYALURAN' || 
        item.memo_source === 'MIGRASI_PENYALURAN' || 
        (item.agenda_no && Number(item.agenda_no) >= 90000) ||
        (item.keterangan || '').toLowerCase().includes('direct') ||
        (item.keterangan || '').toLowerCase().includes('migrasi') ||
        (item.keterangan || '').toLowerCase().includes('penyaluran zis') ||
        item.yang_mengajukan === 'Direct Penyaluran';
      const statusStr = (item.status || '').toString().toLowerCase();
      const isDisbursement = statusStr.includes('acc') || statusStr.includes('pencairan') || statusStr.includes('cair') || statusStr.includes('realisasi') || statusStr.includes('simba') || statusStr.includes('arsip') || statusStr.includes('selesai');
      if (!isDirect && !isDisbursement) return false;

      const search = searchTerm.toLowerCase();
      const nama = (item.nama_pemohon || item.nama_instansi || '').toLowerCase();
      const ket = (item.keterangan || '').toLowerCase();
      const agenda = String(item.agenda_no || '');
      const nikStr = String(item.nik || '');
      const yangMengajukanStr = (item.yang_mengajukan || item.yangMengajukan || '').toLowerCase();

      // Search matches name, institution, agenda, NIK, keterangan, OR yang_mengajukan
      const matchesSearch = !search ||
        nama.includes(search) ||
        ket.includes(search) ||
        agenda.includes(search) ||
        nikStr.includes(search) ||
        yangMengajukanStr.includes(search);

      const matchesAsal = selectedAsalFilter === 'Semua' || (isDirect ? 'Jalur Direct' : 'Jalur Proposal') === selectedAsalFilter;

      // Program / Pilar Filter
      let matchesPilar = true;
      if (selectedPilarFilter !== 'Semua' && selectedPilarFilter !== 'Semua Program' && selectedPilarFilter !== 'Semua Pilar') {
        const pilarCode = item.program?.pilar_code || '';
        const pilarNameFromCode = (pilarCode === '1100' || pilarCode === '2101') ? 'Semarang Peduli' :
                                  (pilarCode === '1200' || pilarCode === '2201') ? 'Semarang Sehat' :
                                  (pilarCode === '1300' || pilarCode === '2301') ? 'Semarang Cerdas' :
                                  (pilarCode === '1400' || pilarCode === '2501') ? 'Semarang Taqwa' :
                                  (pilarCode === '1500' || pilarCode === '2502') ? 'Semarang Makmur' : '';

        const fullPilarStr = (pilarNameFromCode || item.program?.pilar?.name || item.jenis_permohonan || item.program?.name || '').toLowerCase();
        matchesPilar = fullPilarStr.includes(selectedPilarFilter.toLowerCase());
      }

      // Status Filter: Belum Dicairkan vs Sudah Dicairkan
      let matchesStatus = true;
      if (selectedStatusFilter !== 'Semua' && selectedStatusFilter !== 'Semua Status') {
        const s = (item.status || '').toString().toLowerCase();
        const isBelumCair = s.includes('pencairan') || s === 'acc' || (s.includes('cair') && !s.includes('realisasi') && !s.includes('simba') && !s.includes('arsip') && !s.includes('selesai'));
        
        if (selectedStatusFilter === 'Belum Dicairkan') {
          matchesStatus = isBelumCair;
        } else if (selectedStatusFilter === 'Sudah Dicairkan') {
          matchesStatus = !isBelumCair;
        }
      }

      // Kategori Filter (Perorangan / Lembaga)
      let matchesKategori = true;
      if (selectedKategoriFilter !== 'Semua' && selectedKategoriFilter !== 'Semua Kategori') {
        const kat = (item.jenis_pengajuan || (item.nama_instansi ? 'Lembaga' : 'Perorangan')).toLowerCase();
        matchesKategori = kat === selectedKategoriFilter.toLowerCase();
      }

      // Asnaf Filter
      let matchesAsnaf = true;
      if (selectedAsnafFilter !== 'Semua' && selectedAsnafFilter !== 'Semua Asnaf') {
        const asnafItem = (item.asnaf || '').toLowerCase();
        matchesAsnaf = asnafItem === selectedAsnafFilter.toLowerCase();
      }

      // Filter Bulan Tanggal Pencairan (Bukan Tanggal Masuk/Pengajuan)
      let matchesBulan = true;
      if (selectedBulanPencairan !== 'Semua') {
        const tglCair = getTanggalPencairan(item);
        if (!tglCair) {
          matchesBulan = false;
        } else {
          const m = tglCair.getMonth() + 1;
          matchesBulan = String(m) === selectedBulanPencairan;
        }
      }

      // Filter Tahun Tanggal Pencairan
      let matchesTahun = true;
      if (selectedTahunPencairan !== 'Semua') {
        const tglCair = getTanggalPencairan(item);
        if (!tglCair) {
          matchesTahun = false;
        } else {
          matchesTahun = String(tglCair.getFullYear()) === selectedTahunPencairan;
        }
      }

      return matchesSearch && matchesAsal && matchesPilar && matchesStatus && matchesKategori && matchesAsnaf && matchesBulan && matchesTahun;
    }).sort((a, b) => {
      const rankA = getStatusRank(a.status);
      const rankB = getStatusRank(b.status);

      if (rankA !== rankB) {
        return rankA - rankB; // Lower rank (1 = Antrean Pencairan) comes first at top
      }

      const timeA = new Date(a.created_at || a.tanggal_masuk || 0).getTime();
      const timeB = new Date(b.created_at || b.tanggal_masuk || 0).getTime();
      return timeB - timeA;
    });
  }, [data, searchTerm, selectedAsalFilter, selectedPilarFilter, selectedStatusFilter, selectedKategoriFilter, selectedAsnafFilter, selectedBulanPencairan, selectedTahunPencairan, getTanggalPencairan]);

  // Dynamic Metrics based on active filtered data (Instant, 0ms latency, reactive to all filters)
  const metrics = useMemo(() => {
    let totalPenyaluran = 0;
    let totalProposal = 0;
    let totalDirect = 0;
    let totalProposalNominal = 0;
    let totalDirectNominal = 0;

    filteredData.forEach(d => {
      const nom = Number(d.nominal) || 0;
      totalPenyaluran += nom;

      if (d.asal_data === 'Jalur Proposal') {
        totalProposal += 1;
        totalProposalNominal += nom;
      } else {
        totalDirect += 1;
        totalDirectNominal += nom;
      }
    });

    return { 
      totalPenyaluran, 
      totalProposal, 
      totalDirect, 
      totalProposalNominal,
      totalDirectNominal,
      totalTransactions: filteredData.length
    };
  }, [filteredData]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Handle NIK Lookup
  const handleCheckNik = async (nikToTest?: string) => {
    const targetNik = (nikToTest || formNik).trim();
    if (!targetNik || targetNik.length < 16) {
      setNikFoundStatus('NIK harus 16 digit');
      return;
    }

    setNikChecking(true);
    setNikFoundStatus(null);
    try {
      const res = await axios.get(`/api/mustahik/nik/${targetNik}`).catch(() => null);
      if (res && res.data?.data) {
        const m = res.data.data;
        setFormNama(m.nama || m.cp_nama || formNama);
        setFormJenisKelamin(m.jenis_kelamin || 'Pria');
        if (m.nama_pimpinan || m.jenis_lembaga) {
          setFormNamaInstansi(m.nama_pimpinan || m.nama);
          setFormKategori('Lembaga');
        }
        setFormAlamat(m.alamat || formAlamat);
        setFormTelepon(m.telepon || m.cp_telepon || formTelepon);
        setNikFoundStatus(`Data Mustahik terdaftar: ${m.nama}`);
      } else {
        setNikFoundStatus('Mustahik Baru (Akan otomatis didaftarkan)');
      }
    } catch (e) {
      setNikFoundStatus('Mustahik Baru (Akan otomatis didaftarkan)');
    } finally {
      setNikChecking(false);
    }
  };

  // Filtered Mustahik for Dropdown Autocomplete
  const filteredMustahikForDropdown = useMemo(() => {
    const q = mustahikSearch.toLowerCase().trim();
    if (!q) return mustahikList.slice(0, 30);
    return mustahikList.filter((m: any) => {
      const nama = String(m.nama || '').toLowerCase();
      const nik = String(m.nik || '').toLowerCase();
      const nrm = String(m.nrm || '').toLowerCase();
      const pimpinan = String(m.nama_pimpinan || '').toLowerCase();
      const telp = String(m.telepon || m.handphone || '').toLowerCase();
      return nama.includes(q) || nik.includes(q) || nrm.includes(q) || pimpinan.includes(q) || telp.includes(q);
    }).slice(0, 30);
  }, [mustahikList, mustahikSearch]);

  // Select Mustahik from Autocomplete Dropdown
  const handleSelectMustahik = (m: any) => {
    setSelectedMustahikId(m.id);
    setMustahikSearch(m.nama);
    setShowMustahikDropdown(false);
    
    const isLembaga = m.kategori === 'Lembaga' || Boolean(m.nama_pimpinan || m.jenis_lembaga);
    setFormKategori(isLembaga ? 'Lembaga' : 'Perorangan');
    setFormNama(m.nama);
    setFormNik(m.nik || '');
    if (isLembaga) {
      setFormNamaInstansi(m.nama_pimpinan || m.nama);
    } else {
      const jk = m.jenis_kelamin || '';
      setFormJenisKelamin(jk === 'Perempuan' || jk === 'Wanita' ? 'Wanita' : 'Pria');
    }
    setFormTelepon(m.handphone || m.telepon || '');
    setFormAlamat(m.alamat || '');
    
    if (m.nik && m.nik.length >= 16) {
      handleCheckNik(m.nik);
    } else {
      setNikFoundStatus(`Terpilih dari Data Mustahik: ${m.nama} (NRM: ${m.nrm || '-'})`);
    }
  };

  // Handle Quick Register Mustahik (Instant Registration without mandatory NIK)
  const handleQuickRegisterMustahik = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickMustahikNama || !quickMustahikNama.trim()) {
      alert('Nama Mustahik / Lembaga wajib diisi.');
      return;
    }

    try {
      const payload: any = {
        kategori: quickMustahikKategori,
        nama: quickMustahikNama.trim(),
        nik: quickMustahikNik && quickMustahikNik.trim() ? quickMustahikNik.trim() : null,
        alamat: quickMustahikAlamat.trim() || 'Kota Semarang',
        telepon: quickMustahikTelepon.trim() || null,
        handphone: quickMustahikTelepon.trim() || null,
        catatan: 'Registrasi Cepat Mustahik Penyaluran ZIS'
      };

      if (quickMustahikKategori === 'Perorangan') {
        payload.jenis_kelamin = quickMustahikJenisKelamin;
      } else {
        payload.nama_pimpinan = quickMustahikNama.trim();
        payload.jenis_lembaga = 'Lembaga';
      }

      const res = await axios.post('/api/mustahik', payload);
      if (res.data?.status === 'success' || res.data?.data) {
        const newMustahik = res.data.data;
        setMustahikList(prev => [newMustahik, ...prev]);
        handleSelectMustahik(newMustahik);
        setShowQuickRegisterMustahik(false);
        setQuickMustahikNama('');
        setQuickMustahikNik('');
        setQuickMustahikTelepon('');
        setQuickMustahikAlamat('');
        setQuickMustahikJenisKelamin('Laki-laki');
        alert(`Mustahik ${newMustahik.nama} berhasil didaftarkan secara cepat!`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal meregistrasi Mustahik baru');
    }
  };

  // Open Direct Input Modal
  const handleOpenInputModal = () => {
    if (mustahikList.length === 0) {
      axios.get('/api/mustahik?compact=true').then(res => setMustahikList(res.data?.data || [])).catch(() => {});
    }
    setSelectedMustahikId(null);
    setMustahikSearch('');
    setShowMustahikDropdown(false);
    setShowQuickRegisterMustahik(false);
    setFormKategori('Perorangan');
    setFormJenisKelamin('Pria');
    setFormNama('');
    setFormNamaInstansi('');
    setFormNik('');
    setFormAlamat('');
    setFormTelepon('');
    setFormYangMengajukan('');
    setFormHasMemo(false);
    setFormMemoSource('Memo Ketua BAZNAS');
    setFormJenisPermohonan('');
    setFormAsnaf('Miskin');
    setFormRkatId('');
    setFormCoaCode('519999999');
    setFormNominal('');
    setFormKeterangan('');
    setFormTipeRealisasiLembaga('Lembaga');
    setFormVolumeReal(1);
    setFormUnitCost(0);
    setNikFoundStatus(null);
    setIsInputModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    if (mustahikList.length === 0) {
      axios.get('/api/mustahik?compact=true').then(res => setMustahikList(res.data?.data || [])).catch(() => {});
    }
    setSelectedPenyaluran(item);
    const isLembaga = item.jenis_pengajuan === 'Lembaga' || Boolean(item.nama_instansi);
    setFormKategori(isLembaga ? 'Lembaga' : 'Perorangan');
    setFormJenisKelamin(item.jenis_kelamin || item.mustahik?.jenis_kelamin || 'Pria');
    setFormNama(item.nama_pemohon || '');
    setFormNamaInstansi(item.nama_instansi || '');
    setFormNik(item.nik || '');
    setFormAlamat(item.alamat || '');
    setFormTelepon(item.no_telpon || '');
    setFormYangMengajukan(item.yang_mengajukan === 'Direct Penyaluran' || item.yang_mengajukan === '—' || item.yang_mengajukan === '-' ? '' : (item.yang_mengajukan || ''));
    setFormHasMemo(Boolean(item.has_memo || item.hasMemo) && item.memo_source !== 'DIRECT_PENYALURAN');
    setFormMemoSource(item.memo_source === 'DIRECT_PENYALURAN' ? '' : (item.memo_source || ''));
    const progCode = item.jenis_permohonan || item.program?.code || '';
    const asnafVal = item.asnaf || 'Miskin';
    setFormJenisPermohonan(progCode);
    setFormAsnaf(asnafVal);
    setFormRkatId(item.rkat_activity_id || '');
    const mappedCoa = item.coa_code || resolveMappingCoa(progCode, asnafVal);
    setFormCoaCode(mappedCoa);
    setFormNominal(String(item.nominal || ''));
    setFormKeterangan(item.keterangan || '');

    const initialTipe = isLembaga && ((item.volume && item.volume > 1) || (item.rekomendasi_unit_cost && item.rekomendasi_unit_cost !== item.nominal)) ? 'Perorangan' : 'Lembaga';
    setFormTipeRealisasiLembaga(initialTipe);
    setFormVolumeReal(item.volume || 1);
    const initialUnitCost = item.rekomendasi_unit_cost || (item.volume ? Math.round(Number(item.nominal) / item.volume) : Number(item.nominal) || 0);
    setFormUnitCost(initialUnitCost);

    setNikFoundStatus(null);
    setIsEditModalOpen(true);
  };

  // Submit Direct Input Form (NIK is optional)
  const handleSubmitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    const parsedNominal = Number(formNominal.replace(/\D/g, ''));
    if (!formNama.trim() || !parsedNominal || parsedNominal <= 0) {
      alert('Mohon lengkapi Nama Penerima / Mustahik dan Nominal Bantuan.');
      return;
    }

    setSubmitting(true);
    try {
      const isLembagaPerorangan = formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan';
      const payload = {
        mustahik_id: selectedMustahikId || null,
        nama_pemohon: formNama.trim(),
        nama_instansi: formKategori === 'Lembaga' ? formNamaInstansi.trim() : null,
        nik: formNik.trim() || null,
        kategori: formKategori,
        jenis_kelamin: formKategori === 'Perorangan' ? formJenisKelamin : null,
        alamat: formAlamat.trim() || 'Kota Semarang',
        no_telpon: formTelepon.trim() || '080000000000',
        yang_mengajukan: formYangMengajukan.trim() || '-',
        has_memo: formHasMemo,
        memo_source: formHasMemo ? formMemoSource : null,
        jenis_permohonan: formJenisPermohonan || null,
        rkat_activity_id: formRkatId || null,
        coa_code: formCoaCode || null,
        asnaf: formAsnaf,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim() || 'Penyaluran ZIS',
        tipe_bantuan: 'Konsumtif',
        volume: isLembagaPerorangan ? formVolumeReal : 1,
        rekomendasi_unit_cost: isLembagaPerorangan ? formUnitCost : parsedNominal
      };

      const res = await axios.post('/api/penyaluran-zis/direct', payload);
      if (res.data?.status === 'success') {
        alert('Penyaluran berhasil dicatat dan langsung dikirim ke Antrean Pencairan Keuangan!');
        setIsInputModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mencatat Penyaluran: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Form
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenyaluran) return;

    const parsedNominal = Number(formNominal.replace(/\D/g, ''));

    setSubmitting(true);
    try {
      const isLembagaPerorangan = formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan';
      const payload = {
        nama_pemohon: formNama.trim(),
        nama_instansi: formKategori === 'Lembaga' ? formNamaInstansi.trim() : null,
        nik: formNik.trim(),
        jenis_kelamin: formKategori === 'Perorangan' ? formJenisKelamin : null,
        alamat: formAlamat.trim(),
        no_telpon: formTelepon.trim(),
        yang_mengajukan: formYangMengajukan.trim() || '-',
        has_memo: formHasMemo,
        memo_source: formHasMemo ? formMemoSource : null,
        jenis_permohonan: formJenisPermohonan || null,
        rkat_activity_id: formRkatId || null,
        coa_code: formCoaCode || null,
        asnaf: formAsnaf,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
        tipe_bantuan: 'Konsumtif',
        jenis_pengajuan: formKategori,
        volume: isLembagaPerorangan ? formVolumeReal : 1,
        rekomendasi_unit_cost: isLembagaPerorangan ? formUnitCost : parsedNominal
      };

      const res = await axios.put(`/api/penyaluran-zis/${selectedPenyaluran.id}`, payload);
      if (res.data?.status === 'success') {
        alert('Data penyaluran ZIS berhasil diperbarui!');
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengedit Penyaluran ZIS: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Export to Excel
  // Migrasi Template & Handlers (Matched style with Penerimaan ZIS)
  const downloadPenyaluranTemplate = () => {
    const templateData = [
      {
        'Tanggal_Permohonan': '2026-08-10',
        'Tanggal_Pencairan': '2026-08-13',
        'Nama_Pemohon': 'Masjid Al-Ikhlas',
        'NIK': '3374012345670001',
        'No_Telpon': '081234567890',
        'Alamat': 'Jl. Indrapasta No. 12, Semarang',
        'Jenis_Pengajuan': 'Lembaga',
        'Jenis_Permohonan': '210102.1',
        'Kode_COA': '5110101',
        'Kode_RKAT': 'asnaf-1786078759614-oc7l',
        'Nominal': 2500000,
        'Asnaf': 'Fisabilillah',
        'Status': 'Selesai',
        'Keterangan': 'Bantuan renovasi tempat wudhu masjid'
      },
      {
        'Tanggal_Permohonan': '2026-08-13',
        'Tanggal_Pencairan': '',
        'Nama_Pemohon': 'Ahmad Fauzi',
        'NIK': '3374023456780002',
        'No_Telpon': '085678901234',
        'Alamat': 'Jl. Pemuda No. 45, Semarang',
        'Jenis_Pengajuan': 'Perorangan',
        'Jenis_Permohonan': '210102',
        'Kode_COA': '5110102',
        'Kode_RKAT': 'asnaf-1786078759614-oc7m',
        'Nominal': 1000000,
        'Asnaf': 'Miskin',
        'Status': 'Antrean Pencairan',
        'Keterangan': 'Bantuan biaya hidup dhuafa'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Migrasi_Penyaluran");
    XLSX.writeFile(wb, "Template_Migrasi_Penyaluran_ZIS.xlsx");
  };

  const parseExcelDate = (val: any, defaultToday = false): string => {
    if (val === undefined || val === null || val === '') {
      return defaultToday ? new Date().toISOString().split('T')[0] : '';
    }

    // 1. If already JS Date object
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. If number or numeric string (Excel serial code, e.g. 45260 or "45260")
    const num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()) ? parseFloat(val.trim()) : NaN);
    if (!isNaN(num) && num >= 1000 && num <= 100000) {
      const utcDays = num - 25569;
      const utcValue = utcDays * 86400 * 1000;
      const d = new Date(utcValue);
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        if (year >= 1970 && year <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
    }

    const str = String(val).trim();
    if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
      return defaultToday ? new Date().toISOString().split('T')[0] : '';
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Standard date parsing fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return defaultToday ? new Date().toISOString().split('T')[0] : str;
  };

  const handlePenyaluranFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
        return;
      }

      const getVal = (row: any, ...keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return row[k];
          }
        }
        const rowKeys = Object.keys(row);
        for (const k of keys) {
          const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchKey = rowKeys.find(rk => {
            const cleanRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanRk === lowerK || cleanRk.includes(lowerK) || lowerK.includes(cleanRk);
          });
          if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null && String(row[matchKey]).trim() !== '') {
            return row[matchKey];
          }
        }
        return '';
      };

      const rows = json.map((row, idx) => {
        const rawTglPermohonan = getVal(row, 'Tanggal_Permohonan', 'Tanggal', 'Tgl_Permohonan', 'Tgl Permohonan', 'tanggal_permohonan', 'tanggal');
        const tglPermohonan = parseExcelDate(rawTglPermohonan, true);

        const rawTglPencairan = getVal(row, 'Tanggal_Pencairan', 'Tgl_Pencairan', 'Tgl Pencairan', 'tanggal_pencairan', 'Tanggal_Realisasi', 'Tgl Realisasi');
        const tglPencairan = parseExcelDate(rawTglPencairan, false);

        const nama = String(getVal(row, 'Nama_Pemohon', 'Nama_Mustahik', 'Nama Pemohon', 'Nama Mustahik', 'nama_pemohon', 'Nama', 'nama') || '-');
        const nik = String(getVal(row, 'NIK', 'nik', 'No_KTP', 'No KTP') || '');
        const telepon = String(getVal(row, 'No_Telpon', 'No Telpon', 'Telepon', 'telepon', 'No HP', 'No_HP', 'no_telpon', 'HP') || '');
        const alamat = String(getVal(row, 'Alamat', 'alamat', 'Alamat Lengkap') || '');
        const jenisPengajuan = String(getVal(row, 'Jenis_Pengajuan', 'Jenis Pengajuan', 'jenis_pengajuan', 'Kategori', 'kategori') || 'Perorangan');
        const jenisPermohonan = String(getVal(row, 'Jenis_Permohonan', 'Jenis Permohonan', 'jenis_permohonan', 'Program', 'program', 'Kode Program') || '210102');
        const kodeCoa = String(getVal(row, 'Kode_COA', 'Kode COA', 'kode_coa', 'COA', 'coa', 'Akun') || '-');
        const kodeRkat = String(getVal(row, 'Kode_RKAT', 'Kode RKAT', 'kode_rkat', 'RKAT', 'rkat', 'ID RKAT', 'rkat_activity_id') || '-');
        
        const rawNom = getVal(row, 'Nominal', 'nominal', 'Nominal (Rp)', 'Nominal Bantuan', 'Jumlah', 'Total', 'Nilai');
        let nominal = 0;
        if (typeof rawNom === 'number') {
          nominal = rawNom;
        } else if (typeof rawNom === 'string' && rawNom.trim() !== '') {
          nominal = Number(rawNom.replace(/[^0-9.-]+/g, '')) || 0;
        }

        const asnaf = String(getVal(row, 'Asnaf', 'asnaf', 'Golongan Asnaf') || 'Miskin');
        
        let status = String(getVal(row, 'Status', 'status') || '');
        if (!status || status === '-') {
          status = tglPencairan ? 'Selesai' : 'Antrean Pencairan';
        }

        const keterangan = String(getVal(row, 'Keterangan', 'keterangan', 'Catatan', 'catatan') || '-');

        return {
          rowNum: idx + 1,
          Tanggal_Permohonan: tglPermohonan,
          Tanggal_Pencairan: tglPencairan,
          Nama_Pemohon: nama,
          NIK: nik,
          No_Telpon: telepon,
          Alamat: alamat,
          Jenis_Pengajuan: jenisPengajuan,
          Jenis_Permohonan: jenisPermohonan,
          Kode_COA: kodeCoa,
          Kode_RKAT: kodeRkat,
          Nominal: nominal,
          Asnaf: asnaf,
          Status: status,
          Keterangan: keterangan
        };
      });

      setParsedMigrationRows(rows);
    } catch (err: any) {
      console.error('Error reading Excel:', err);
      alert('Gagal membaca file Excel. Pastikan format spreadsheet valid (.xlsx / .xls)');
    } finally {
      e.target.value = '';
    }
  };

  const handleProcessMigrationSubmit = async () => {
    if (parsedMigrationRows.length === 0) return;
    setMigrating(true);
    try {
      const res = await axios.post('/api/penyaluran-zis/bulk-migrate', {
        items: parsedMigrationRows
      });

      alert(`Migrasi Berhasil!\n\n${res.data?.message || 'Data penyaluran berhasil diimpor.'}`);
      setIsMigrationModalOpen(false);
      setParsedMigrationRows([]);
      fetchData();
    } catch (err: any) {
      console.error('Error migrating Penyaluran ZIS:', err);
      alert('Gagal memproses migrasi: ' + (err.response?.data?.error || err.message));
    } finally {
      setMigrating(false);
    }
  };

  // Auto-clear Toast Notification
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const promptDeletePenyaluran = (item: any) => {
    if (!item) return;
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await axios.delete(`/api/penyaluran-zis/${itemToDelete.id}`);
      if (res.data?.status === 'success' || res.status === 200) {
        setIsDeleteModalOpen(false);
        setIsDetailModalOpen(false);
        setToastNotification({
          type: 'success',
          message: `Transaksi Penyaluran ${itemToDelete.agenda_no ? `No. Agenda ${itemToDelete.agenda_no}` : ''} berhasil dihapus & saldo kas/buku besar telah dikoreksi.`
        });
        setItemToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Error deleting Penyaluran ZIS:', err);
      setToastNotification({
        type: 'error',
        message: 'Gagal menghapus transaksi: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to find the matched Program & Kegiatan object from activePilars
  const findProgramForTransaction = (trx: any, activePilarsSource: any[]) => {
    if (!trx) return null;

    const rkInfo = getRkatInfo(trx);
    const targetCode = String(trx.program?.code || trx.program_code || trx.jenis_permohonan || '').trim().toLowerCase();
    const targetName = String(rkInfo?.rkatName || trx.program?.name || trx.jenis_permohonan || trx.keterangan || '').trim().toLowerCase();

    for (const pilar of activePilarsSource) {
      for (const prog of (pilar.programs || [])) {
        const pCode = String(prog.code || '').trim().toLowerCase();
        const pName = String(prog.name || '').trim().toLowerCase();

        if (targetCode && (pCode === targetCode || targetCode.includes(pCode))) {
          return { prog, pilar };
        }
        if (targetName && (pName === targetName || targetName.includes(pName) || pName.includes(targetName))) {
          return { prog, pilar };
        }
      }
    }
    return null;
  };

  // Helper to determine if a program definition is Produktif
  const isProgramDefProduktif = (prog: any, pilarName?: string): boolean => {
    if (!prog) return false;
    const t = String(prog.tipe || '').toLowerCase().trim();
    if (t === 'produktif') return true;
    if (t === 'konsumtif') return false;

    const c = String(prog.code || '').trim();
    if (c.startsWith('2')) return true;
    if (c.startsWith('1')) return false;

    if (pilarName && pilarName.toLowerCase().includes('makmur')) return true;
    return false;
  };

  // Helper to determine if a transaction is Produktif (Pendayagunaan) or Konsumtif (Pendistribusian)
  const getIsItemProduktif = (trx: any, activePilarsSource: any[]): boolean => {
    // 1. Direct match from Master Program & Kegiatan
    const match = findProgramForTransaction(trx, activePilarsSource);
    if (match) {
      return isProgramDefProduktif(match.prog, match.pilar?.name);
    }

    // 2. Direct program.tipe if embedded in transaction
    if (trx.program?.tipe) {
      const pt = String(trx.program.tipe).toLowerCase().trim();
      if (pt === 'produktif') return true;
      if (pt === 'konsumtif') return false;
    }

    // 3. Direct tipe_bantuan tag on transaction
    if (trx.tipe_bantuan) {
      const tb = String(trx.tipe_bantuan).toLowerCase().trim();
      if (tb === 'produktif') return true;
      if (tb === 'konsumtif') return false;
    }

    // 4. Fallback code 2xxx vs 1xxx
    const rawCode = String(trx.program?.code || trx.program_code || trx.jenis_permohonan || '').trim();
    if (rawCode.startsWith('2')) return true;
    if (rawCode.startsWith('1')) return false;

    // 5. Fallback Pilar / Jenis Permohonan string
    const pilarStr = String(trx.program?.pilar?.name || trx.jenis_permohonan || trx.keterangan || '').toLowerCase();
    if (pilarStr.includes('makmur')) return true;

    // 6. Rekomendasi kabag
    const rek = String(trx.rekomendasi_kabag || '').toLowerCase();
    if (rek.includes('dayaguna') || rek.includes('produktif')) return true;
    if (rek.includes('distribusi') || rek.includes('konsumtif')) return false;

    return false; // Default to konsumtif
  };

  // Helper to aggregate data into official BAZNAS monthly report categories dynamically from Program & Kegiatan
  const generateMonthlyReportData = (type: 'pendayagunaan' | 'pendistribusian', targetMonth: number, targetYear: number) => {
    const activePilarsSource: any[] = (pilars && pilars.length > 0) ? pilars : pilarData;

    // Define standard pilar order for each report
    const preferredOrder = type === 'pendayagunaan'
      ? ['Semarang Makmur', 'Semarang Cerdas', 'Semarang Sehat', 'Semarang Taqwa', 'Semarang Peduli']
      : ['Semarang Peduli', 'Semarang Sehat', 'Semarang Cerdas', 'Semarang Taqwa', 'Semarang Makmur'];

    // Sort pilars by preferred order
    const sortedPilars = [...activePilarsSource].sort((a, b) => {
      const idxA = preferredOrder.findIndex(p => a.name?.toLowerCase().includes(p.toLowerCase()));
      const idxB = preferredOrder.findIndex(p => b.name?.toLowerCase().includes(p.toLowerCase()));
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

    let itemCounter = 1;
    const reportCategories: {
      categoryName: string;
      pilarCode: string;
      items: {
        no: number;
        code: string;
        name: string;
        nominal: number;
        keterangan: string;
        transactionCount: number;
      }[];
    }[] = [];

    sortedPilars.forEach(pilar => {
      // Filter programs belonging to this report type (Pendayagunaan = Produktif ONLY, Pendistribusian = Konsumtif ONLY)
      const validPrograms = (pilar.programs || []).filter((prog: any) => {
        const isProgProduktif = isProgramDefProduktif(prog, pilar.name);
        return type === 'pendayagunaan' ? isProgProduktif : !isProgProduktif;
      });

      // Only include Pilar if it has 1 or more matching programs for this report!
      if (validPrograms.length > 0) {
        const items = validPrograms.map((prog: any) => {
          return {
            no: itemCounter++,
            code: prog.code,
            name: prog.name,
            nominal: 0,
            keterangan: '',
            transactionCount: 0
          };
        });

        reportCategories.push({
          categoryName: pilar.name.toUpperCase(),
          pilarCode: pilar.code,
          items
        });
      }
    });

    // Filter transactions for target disbursement month and year
    const monthlyTransactions = data.filter(item => {
      // Exclude OBS tasks
      if (item.jenis_pengajuan === 'OBS' || item.jenisPengajuan === 'OBS' || String(item.jenis_pengajuan).toUpperCase() === 'OBS') {
        return false;
      }

      // Filter strictly by type from Master Program & Kegiatan (Pendayagunaan = Produktif ONLY, Pendistribusian = Konsumtif ONLY)
      const isProduktif = getIsItemProduktif(item, activePilarsSource);
      if (type === 'pendayagunaan' && !isProduktif) {
        return false;
      }
      if (type === 'pendistribusian' && isProduktif) {
        return false;
      }

      const tglCair = getTanggalPencairan(item);
      const targetDate = tglCair || item.tanggal_masuk || item.created_at;
      if (!targetDate) return false;

      const d = new Date(targetDate);
      if (isNaN(d.getTime())) return false;

      return (d.getMonth() + 1) === targetMonth && d.getFullYear() === targetYear;
    });

    // Aggregate transactions into report rows
    monthlyTransactions.forEach(trx => {
      const nominal = Number(trx.nominal) || 0;
      if (nominal <= 0) return;

      const matchedMaster = findProgramForTransaction(trx, activePilarsSource);
      const masterProg = matchedMaster?.prog;

      let matchedItem: any = null;

      // 1. If found in master, match directly in report categories
      if (masterProg) {
        for (const cat of reportCategories) {
          const found = cat.items.find(it => String(it.code).toLowerCase() === String(masterProg.code).toLowerCase() || it.name.toLowerCase() === masterProg.name.toLowerCase());
          if (found) {
            matchedItem = found;
            break;
          }
        }
      }

      // 2. If not matched, search by code or name
      if (!matchedItem) {
        const rkInfo = getRkatInfo(trx);
        const progName = (rkInfo?.rkatName || trx.program?.name || trx.jenis_permohonan || trx.keterangan || '').toLowerCase();
        const progCode = String(trx.program?.code || trx.program_code || '').toLowerCase();

        if (progCode) {
          for (const cat of reportCategories) {
            const found = cat.items.find(it => String(it.code).toLowerCase() === progCode);
            if (found) {
              matchedItem = found;
              break;
            }
          }
        }

        if (!matchedItem && progName) {
          for (const cat of reportCategories) {
            const found = cat.items.find(it => {
              const itName = it.name.toLowerCase();
              return itName === progName || progName.includes(itName) || itName.includes(progName);
            });
            if (found) {
              matchedItem = found;
              break;
            }
          }
        }
      }

      if (matchedItem) {
        matchedItem.nominal += nominal;
        matchedItem.transactionCount += 1;

        // Add mustahik count / note if available
        const volumeCount = trx.volume || trx.jumlah_mustahik || 0;
        if (volumeCount > 1) {
          const prevKet = matchedItem.keterangan ? `${matchedItem.keterangan}, ` : '';
          matchedItem.keterangan = `${prevKet}${volumeCount} Mustahik`;
        }
      }
    });

    const grandTotal = reportCategories.reduce((sum, cat) => {
      return sum + cat.items.reduce((subSum, it) => subSum + it.nominal, 0);
    }, 0);

    return {
      reportCategories,
      grandTotal,
      totalTransactions: monthlyTransactions.length,
      monthlyTransactions
    };
  };

  // Handler: Print / Save PDF Monthly Report (Official Dinas Format)
  const handlePrintPdfMonthly = (type: 'pendayagunaan' | 'pendistribusian') => {
    const { reportCategories, grandTotal } = generateMonthlyReportData(type, reportMonth, reportYear);
    const monthName = MONTH_NAMES[reportMonth - 1].toUpperCase();
    const kabidTitle = type === 'pendayagunaan' ? 'Kepala Bidang Pendayagunaan' : 'Kepala Bidang Pendistribusian';

    const kpDisplay = reportSignatories.kepalaPelaksana ? `<strong>${reportSignatories.kepalaPelaksana}</strong>` : '( .................................................. )';
    const kbDisplay = (type === 'pendayagunaan' ? reportSignatories.kabidPendayagunaan : reportSignatories.kabidPendistribusian) 
      ? `<strong>${type === 'pendayagunaan' ? reportSignatories.kabidPendayagunaan : reportSignatories.kabidPendistribusian}</strong>` 
      : '( .................................................. )';
    const wk3Display = reportSignatories.wakilKetua3 ? `<strong>${reportSignatories.wakilKetua3}</strong>` : '( .................................................. )';
    const wk2Display = reportSignatories.wakilKetua2 ? `<strong>${reportSignatories.wakilKetua2}</strong>` : '( .................................................. )';

    const signDateObj = new Date(reportSignDate);
    const signDateFormatted = !isNaN(signDateObj.getTime())
      ? `${signDateObj.getDate()} ${MONTH_NAMES[signDateObj.getMonth()]} ${signDateObj.getFullYear()}`
      : `${new Date().getDate()} ${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up terblokir. Silakan izinkan pop-up browser untuk mencetak PDF laporan.');
      return;
    }

    const rowsHtml = reportCategories.map(cat => {
      const headerRow = `
        <tr style="background-color: #fff; font-weight: bold;">
          <td style="border: 1px solid #000; text-align: center; font-weight: bold; padding: 4px;"></td>
          <td style="border: 1px solid #000; font-weight: bold; padding: 4px 8px;" colspan="3">${cat.categoryName}</td>
        </tr>
      `;

      const itemRows = cat.items.map(it => `
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 3.5px;">${it.no}</td>
          <td style="border: 1px solid #000; padding: 3.5px 8px;">${it.name}</td>
          <td style="border: 1px solid #000; text-align: right; padding: 3.5px 8px; font-weight: ${it.nominal > 0 ? '600' : 'normal'};">
            ${it.nominal > 0 ? it.nominal.toLocaleString('id-ID') : ''}
          </td>
          <td style="border: 1px solid #000; padding: 3.5px 8px; text-align: center;">${it.keterangan || ''}</td>
        </tr>
      `).join('');

      return headerRow + itemRows;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekapitulasi Usulan Penerima Pentasharufan - ${type === 'pendayagunaan' ? 'Pendayagunaan' : 'Pendistribusian'} ${monthName} ${reportYear}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            color: #000;
            line-height: 1.25;
            margin: 0;
            padding: 0;
          }
          .header-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 14px;
          }
          .header-title h3 {
            margin: 0;
            font-size: 11pt;
            letter-spacing: 0.5px;
          }
          .header-title h4 {
            margin: 3px 0 0 0;
            font-size: 10.5pt;
          }
          .header-title p {
            margin: 3px 0 0 0;
            font-size: 10pt;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th {
            border: 1px solid #000;
            padding: 5px 6px;
            text-align: center;
            font-weight: bold;
            background-color: #fff;
          }
          .total-row td {
            border: 1.5px solid #000;
            font-weight: bold;
            padding: 5px 8px;
          }
          .sign-container {
            width: 100%;
            page-break-inside: avoid;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header-title">
          <h3>REKAPITULASI USULAN PENERIMA PENTASHARUFAN</h3>
          <h4>BADAN AMIL ZAKAT NASIONAL KOTA SEMARANG</h4>
          <p>BULAN ${monthName} TAHUN ${reportYear}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">No.</th>
              <th>Jenis Program</th>
              <th style="width: 140px;">Nominal</th>
              <th style="width: 130px;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="2" style="text-align: center; font-weight: bold;">Total</td>
              <td style="text-align: right; font-weight: bold;">${grandTotal.toLocaleString('id-ID')}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="sign-container">
          <!-- Date top right -->
          <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
              <td style="width: 60%; border: none;"></td>
              <td style="width: 40%; text-align: center; border: none; font-size: 9.5pt;">
                Semarang, ${signDateFormatted}
              </td>
            </tr>
          </table>

          <!-- Row 1 Signatures -->
          <table style="width: 100%; border: none; margin-bottom: 18px;">
            <tr>
              <td style="width: 50%; text-align: center; border: none; font-size: 9pt;">
                Mengetahui,<br>Kepala Pelaksana
                <div style="height: 50px;"></div>
                ${kpDisplay}
              </td>
              <td style="width: 50%; text-align: center; border: none; font-size: 9pt;">
                <br>${kabidTitle}
                <div style="height: 50px;"></div>
                ${kbDisplay}
              </td>
            </tr>
          </table>

          <!-- Row 2 Signatures -->
          <table style="width: 100%; border: none;">
            <tr>
              <td colspan="2" style="text-align: center; border: none; font-size: 9pt; padding-bottom: 6px;">
                Menyetujui,
              </td>
            </tr>
            <tr>
              <td style="width: 50%; text-align: center; border: none; font-size: 9pt;">
                Wakil ketua III Bidang<br>Perencanaan dan Pelaporan
                <div style="height: 50px;"></div>
                ${wk3Display}
              </td>
              <td style="width: 50%; text-align: center; border: none; font-size: 9pt;">
                Wakil ketua II Bidang<br>Pendistribusian dan Pendayagunaan
                <div style="height: 50px;"></div>
                ${wk2Display}
              </td>
            </tr>
          </table>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Handler: Export Monthly Excel Spreadsheet (.xlsx)
  const handleExportExcelMonthly = (type: 'pendayagunaan' | 'pendistribusian') => {
    const { reportCategories, grandTotal } = generateMonthlyReportData(type, reportMonth, reportYear);
    const monthName = MONTH_NAMES[reportMonth - 1].toUpperCase();
    const kabidTitle = type === 'pendayagunaan' ? 'Kepala Bidang Pendayagunaan' : 'Kepala Bidang Pendistribusian';

    const kpExcel = reportSignatories.kepalaPelaksana || '( .................................................. )';
    const kbExcel = (type === 'pendayagunaan' ? reportSignatories.kabidPendayagunaan : reportSignatories.kabidPendistribusian) || '( .................................................. )';
    const wk3Excel = reportSignatories.wakilKetua3 || '( .................................................. )';
    const wk2Excel = reportSignatories.wakilKetua2 || '( .................................................. )';

    const signDateObj = new Date(reportSignDate);
    const signDateFormatted = !isNaN(signDateObj.getTime())
      ? `${signDateObj.getDate()} ${MONTH_NAMES[signDateObj.getMonth()]} ${signDateObj.getFullYear()}`
      : `${new Date().getDate()} ${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

    const sheetRows: any[] = [];

    // Title rows
    sheetRows.push(['REKAPITULASI USULAN PENERIMA PENTASHARUFAN']);
    sheetRows.push(['BADAN AMIL ZAKAT NASIONAL KOTA SEMARANG']);
    sheetRows.push([`BULAN ${monthName} TAHUN ${reportYear}`]);
    sheetRows.push([]); // blank row

    // Table Header
    sheetRows.push(['No.', 'Jenis Program', 'Nominal', 'Keterangan']);

    // Data rows
    reportCategories.forEach(cat => {
      sheetRows.push(['', cat.categoryName, '', '']);
      cat.items.forEach(it => {
        sheetRows.push([it.no, it.name, it.nominal > 0 ? it.nominal : '', it.keterangan || '']);
      });
    });

    // Total row
    sheetRows.push(['', 'Total', grandTotal, '']);
    sheetRows.push([]); // blank row

    // Signatures
    sheetRows.push(['', '', '', `Semarang, ${signDateFormatted}`]);
    sheetRows.push(['Mengetahui,', '', '', '']);
    sheetRows.push(['Kepala Pelaksana', '', '', kabidTitle]);
    sheetRows.push([]);
    sheetRows.push([]);
    sheetRows.push([kpExcel, '', '', kbExcel]);
    sheetRows.push([]);
    sheetRows.push(['', 'Menyetujui,', '', '']);
    sheetRows.push(['Wakil ketua III Bidang', '', '', 'Wakil ketua II Bidang']);
    sheetRows.push(['Perencanaan dan Pelaporan', '', '', 'Pendistribusian dan Pendayagunaan']);
    sheetRows.push([]);
    sheetRows.push([]);
    sheetRows.push([wk3Excel, '', '', wk2Excel]);

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    const sheetTitle = type === 'pendayagunaan' ? 'Rekap Pendayagunaan' : 'Rekap Pendistribusian';
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, `Laporan_Bulanan_${type === 'pendayagunaan' ? 'Pendayagunaan' : 'Pendistribusian'}_${monthName}_${reportYear}.xlsx`);
  };

  // Handler: Export Detail Transactions Excel (.xlsx)
  const handleExportExcelDetail = () => {
    const exportRows = filteredData.map((item, idx) => {
      const { rkatName, rkatKet } = getRkatInfo(item);
      const { coaCode } = getCoaInfo(item);
      const { title: namaMustahik } = getMustahikDisplayName(item);
      const tglCair = getTanggalPencairan(item);
      const isDirectItem = item.asal_data === 'Jalur Direct' || 
        item.memo_source === 'DIRECT_PENYALURAN' || 
        item.memo_source === 'MIGRASI_PENYALURAN' || 
        (item.agenda_no && Number(item.agenda_no) >= 90000) ||
        (item.keterangan || '').toLowerCase().includes('direct') ||
        (item.keterangan || '').toLowerCase().includes('migrasi') ||
        (item.keterangan || '').toLowerCase().includes('penyaluran zis') ||
        item.yang_mengajukan === 'Direct Penyaluran';

      // Alamat Lengkap
      const alamatLengkap = [item.alamat || item.mustahik?.alamat, item.kelurahan, item.kecamatan]
        .filter(Boolean)
        .map((s: string) => String(s).trim())
        .filter((s: string) => s !== '' && s !== '-')
        .join(', ') || '-';

      // Nama Program RKAT (Keterangan Spesifikasi)
      let rkatDisplay = '-';
      if (rkatName) {
        rkatDisplay = rkatKet ? `${rkatName} (${rkatKet})` : rkatName;
      } else if (item.program?.name) {
        rkatDisplay = item.program.name;
      }

      // Keterangan format Buku Besar
      const keteranganBukuBesar = getDisbursementKeterangan(item);

      return {
        'No': idx + 1,
        'No. Agenda': isDirectItem ? '-' : (item.agenda_no ? String(item.agenda_no) : '-'),
        'Tanggal Pengajuan': formatDate(item.created_at || item.tanggal_masuk),
        'Nama Pemohon': namaMustahik || item.nama_pemohon || item.mustahik?.nama || '-',
        'NIK': item.nik || item.mustahik?.nik || '-',
        'No. HP': item.no_telpon || item.mustahik?.handphone || item.mustahik?.telepon || '-',
        'Alamat Lengkap': alamatLengkap,
        'Program Kegiatan': item.program?.name || item.jenis_permohonan || 'Umum',
        'Nama Program RKAT (Keterangan Spesifikasi)': rkatDisplay,
        'Kode COA': coaCode,
        'Asnaf': item.asnaf || '-',
        'Tanggal Pencairan': tglCair ? formatDate(tglCair) : '-',
        'Nominal': Number(item.nominal) || 0,
        'Keterangan': keteranganBukuBesar
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penyaluran ZIS');
    XLSX.writeFile(wb, `Data_Penyaluran_ZIS_BAZNAS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header & Breadcrumb (Matched 100% with Penerimaan ZIS) */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Pendistribusian &amp; Pendayagunaan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Penyaluran ZIS</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Penyaluran ZIS
        </h2>
        <p className="text-slate-500 font-medium">
          Mencatat dan mengelola seluruh data penyaluran zakat, infak, sedekah, dan dana sosial keagamaan.
        </p>
      </motion.div>

      {/* Summary Cards Grid (Maksimal 3 Info Card - Matched 100% with Penerimaan ZIS) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <SummaryCard
          title="Total Penyaluran ZIS"
          value={formatCurrency(metrics.totalPenyaluran)}
          subtext={`${metrics.totalTransactions} Transaksi Terfilter`}
          icon={<HandHeart className="size-5 text-primary" />}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Penyaluran Proposal"
          value={formatCurrency(metrics.totalProposalNominal)}
          subtext={`${metrics.totalProposal} Transaksi Proposal`}
          icon={<Layers className="size-5 text-blue-600" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Penyaluran Direct"
          value={formatCurrency(metrics.totalDirectNominal)}
          subtext={`${metrics.totalDirect} Transaksi Direct`}
          icon={<Sparkles className="size-5 text-purple-600" />}
          colorClass="bg-purple-50 text-purple-600"
        />
      </motion.div>

      {/* Primary Toolbar & Master Table Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tab Switcher (Identical to Penerimaan ZIS & Input Proposal) */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => { setSelectedAsalFilter('Semua'); setCurrentPage(1); }}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
              selectedAsalFilter === 'Semua'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Semua Penyaluran
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {data.length}
            </span>
          </button>
          <button
            onClick={() => { setSelectedAsalFilter('Jalur Proposal'); setCurrentPage(1); }}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
              selectedAsalFilter === 'Jalur Proposal'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Jalur Proposal
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {data.filter(d => d.asal_data === 'Jalur Proposal').length}
            </span>
          </button>
          <button
            onClick={() => { setSelectedAsalFilter('Jalur Direct'); setCurrentPage(1); }}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
              selectedAsalFilter === 'Jalur Direct'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Jalur Direct
            <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {data.filter(d => d.asal_data === 'Jalur Direct').length}
            </span>
          </button>
        </div>

        {/* Primary Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Search & Essential Primary Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari mustahik, pengaju, agenda, NIK..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-slate-800"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Filter Status: Belum Dicairkan vs Sudah Dicairkan */}
            <select 
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none cursor-pointer font-semibold text-slate-700"
              value={selectedStatusFilter}
              onChange={(e) => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="Semua">Status: Semua</option>
              <option value="Belum Dicairkan">Belum Dicairkan</option>
              <option value="Sudah Dicairkan">Sudah Dicairkan</option>
            </select>

            {/* Filter Program */}
            <select 
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none cursor-pointer font-semibold text-slate-700"
              value={selectedPilarFilter}
              onChange={(e) => { setSelectedPilarFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="Semua Program">Program: Semua Program</option>
              <option value="Semarang Peduli">Semarang Peduli</option>
              <option value="Semarang Sehat">Semarang Sehat</option>
              <option value="Semarang Cerdas">Semarang Cerdas</option>
              <option value="Semarang Taqwa">Semarang Taqwa</option>
              <option value="Semarang Makmur">Semarang Makmur</option>
            </select>

            {/* Filter Lanjutan Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                isFilterExpanded || activeAdvancedFiltersCount > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Filter className="size-3.5" />
              <span>Filter Lanjutan</span>
              {activeAdvancedFiltersCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {activeAdvancedFiltersCount}
                </span>
              )}
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", isFilterExpanded && "rotate-180")} />
            </button>
          </div>

          {/* Right: Grouped Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Main Primary Action */}
            <button 
              onClick={handleOpenInputModal}
              className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Tambah Penyaluran</span>
            </button>

            {/* Utilities Buttons */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <button 
                onClick={() => setIsMigrationModalOpen(true)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Migrasi Penyaluran ZIS"
              >
                <Upload className="size-3.5 text-amber-600" />
                <span className="hidden sm:inline">Migrasi</span>
              </button>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Cetak Laporan Penyaluran ZIS"
              >
                <Printer className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Cetak Laporan</span>
              </button>
            </div>
          </div>
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
              <div className="p-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mr-1">Filter Tambahan:</span>

                {/* Kategori Filter */}
                <select 
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-semibold text-slate-700 shadow-xs"
                  value={selectedKategoriFilter}
                  onChange={(e) => { setSelectedKategoriFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="Semua">Kategori: Semua</option>
                  <option value="Perorangan">Perorangan</option>
                  <option value="Lembaga">Lembaga / Organisasi</option>
                </select>

                {/* Golongan Asnaf */}
                <select 
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-semibold text-slate-700 shadow-xs"
                  value={selectedAsnafFilter}
                  onChange={(e) => { setSelectedAsnafFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="Semua">Asnaf: Semua</option>
                  {['Fakir', 'Miskin', 'Amil', 'Muallaf', 'Riqab', 'Gharim', 'Fisabilillah', 'Ibnu Sabil', 'IST', 'ISTT'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {/* Bulan Pencairan Filter (Berdasarkan Tanggal Pencairan) */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl py-1.5 px-3 shadow-xs">
                  <CalendarCheck className="size-3.5 text-emerald-600 shrink-0" />
                  <select 
                    className="bg-transparent focus:ring-0 outline-none cursor-pointer font-semibold text-slate-700 text-xs"
                    value={selectedBulanPencairan}
                    onChange={(e) => { setSelectedBulanPencairan(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="Semua">Bulan Pencairan: Semua</option>
                    <option value="1">Januari</option>
                    <option value="2">Februari</option>
                    <option value="3">Maret</option>
                    <option value="4">April</option>
                    <option value="5">Mei</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">Agustus</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                </div>

                {/* Tahun Pencairan Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl py-1.5 px-3 shadow-xs">
                  <Calendar className="size-3.5 text-slate-400 shrink-0" />
                  <select 
                    className="bg-transparent focus:ring-0 outline-none cursor-pointer font-semibold text-slate-700 text-xs"
                    value={selectedTahunPencairan}
                    onChange={(e) => { setSelectedTahunPencairan(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="Semua">Tahun: Semua</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={String(yr)}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(activeAdvancedFiltersCount > 0 || selectedStatusFilter !== 'Semua' || selectedPilarFilter !== 'Semua Program' || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedAsalFilter('Semua');
                      setSelectedPilarFilter('Semua Program');
                      setSelectedStatusFilter('Semua');
                      setSelectedKategoriFilter('Semua');
                      setSelectedAsnafFilter('Semua');
                      setSelectedBulanPencairan('Semua');
                      setSelectedTahunPencairan('Semua');
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer bg-white shadow-xs ml-auto"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Table Header Sub-bar */}
        <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            Master Data Penyaluran ZIS
            <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
              {filteredData.length} Transaksi
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Halaman {currentPage} dari {totalPages}</p>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto custom-scrollbar min-h-[350px]">
          <table className="min-w-full text-left table-auto">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Asal Data</th>
                <th className="px-4 py-3.5">No. Agenda</th>
                <th className="px-4 py-3.5">Nama Mustahik / Pemohon</th>
                <th className="px-4 py-3.5">RKAT / Kode Akun</th>
                <th className="px-4 py-3.5">Asnaf</th>
                <th className="px-4 py-3.5 text-right">Nominal</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Memuat data Penyaluran ZIS...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ada data penyaluran yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isDirect = item.asal_data === 'Jalur Direct' || 
                    item.memo_source === 'DIRECT_PENYALURAN' || 
                    item.memo_source === 'MIGRASI_PENYALURAN' || 
                    (item.agenda_no && Number(item.agenda_no) >= 90000) ||
                    (item.keterangan || '').toLowerCase().includes('direct') ||
                    (item.keterangan || '').toLowerCase().includes('migrasi') ||
                    (item.keterangan || '').toLowerCase().includes('penyaluran zis') ||
                    item.yang_mengajukan === 'Direct Penyaluran';
                  
                  // Extract RKAT & COA info cleanly
                  const { rkatName } = getRkatInfo(item);
                  const { coaCode, coaName } = getCoaInfo(item);
                  const programDisplayName = rkatName || item.program?.name || item.jenis_permohonan || 'Umum';
                  const yangMengajukanVal = item.yang_mengajukan || item.yangMengajukan || 'Pimpinan BAZNAS';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center text-slate-400 font-bold">{itemIndex}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1",
                          isDirect ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          <Tag className="size-3" />
                          {isDirect ? 'Jalur Direct' : 'Jalur Proposal'}
                        </span>
                      </td>
                      {/* No. Agenda (Dash for Jalur Direct, Number for Jalur Proposal) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isDirect ? (
                          <span className="text-xs font-medium text-slate-400 font-mono">—</span>
                        ) : (
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                            {item.agenda_no ? String(item.agenda_no) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const { title, subtitle, isLembaga } = getMustahikDisplayName(item);
                          return (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 leading-tight">
                                  {title}
                                </p>
                                {isLembaga && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                                    Lembaga
                                  </span>
                                )}
                              </div>
                              {subtitle && (
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {subtitle}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400">
                                  {item.jenis_pengajuan || 'Perorangan'}
                                  {item.jenis_kelamin || item.mustahik?.jenis_kelamin ? ` (${item.jenis_kelamin || item.mustahik?.jenis_kelamin})` : ''}
                                  {` | NIK: ${item.nik || '-'}`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        {/* Yang Mengajukan & Memo Badge */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {yangMengajukanVal && yangMengajukanVal !== '-' && yangMengajukanVal !== '—' && yangMengajukanVal !== 'Direct Penyaluran' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded flex items-center gap-1" title="Yang Mengajukan">
                              <Send className="size-2.5 text-slate-400" />
                              {yangMengajukanVal}
                            </span>
                          )}
                          {item.has_memo && item.memo_source && item.memo_source !== 'DIRECT_PENYALURAN' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded" title={item.memo_source}>
                              {item.memo_source}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* RKAT / Kode Akun Column */}
                      <td className="px-4 py-3">
                        <div className="max-w-xs space-y-1">
                          <p className="font-bold text-slate-900 text-xs line-clamp-1">{programDisplayName}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* COA Accounting Code Badge (starting with 5 for Buku Besar) */}
                            <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded" title={`Kode COA Akuntansi: ${coaCode} - ${coaName}`}>
                              {coaCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">{item.asnaf || '-'}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatCurrency(item.nominal || 0)}
                      </td>
                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 text-[10px] font-bold rounded-full uppercase whitespace-nowrap inline-block",
                          getStatusColor(item.status)
                        )}>
                          {formatStatusDisplay(item.status)}
                        </span>
                      </td>
                      {/* Action Buttons */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaksi / Koreksi RKAT & COA"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedPenyaluran(item); setIsDetailModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Detail Transaksi"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeletePenyaluran(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Transaksi Penyaluran"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
          <p className="text-slate-500 font-medium">
            Menampilkan {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-xl bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-bold text-slate-700 px-2">Halaman {currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-xl bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal Input Penyaluran ZIS */}
      <AnimatePresence>
        {isInputModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInputModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header Banner */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-inner">
                    <HandHeart className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Form Catat Penyaluran ZIS Direct</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Bypass proposal formal &amp; langsung dikirim ke Antrean Pencairan Keuangan BAZNAS.</p>
                  </div>
                </div>
                <button onClick={() => setIsInputModalOpen(false)} className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitDirect} className="p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                {/* Section 1: Data Mustahik */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <User className="size-4 text-primary" /> 1. Informasi Data Mustahik / Penerima Bantuan
                  </h4>
                  
                  {/* Autocomplete Mustahik (Matched with Penerimaan ZIS Muzakki Autocomplete) */}
                  <div className="space-y-1 relative">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mustahik *</label>
                      <button 
                        type="button" 
                        onClick={() => setShowQuickRegisterMustahik(!showQuickRegisterMustahik)}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="size-3" />
                        {showQuickRegisterMustahik ? "Batal Register" : "+ Registrasi Cepat Mustahik"}
                      </button>
                    </div>

                    {showQuickRegisterMustahik ? (
                      <div className="bg-white p-4 rounded-xl border border-primary/20 shadow-sm space-y-3 mt-1">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">Registrasi Mustahik Instan</p>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setQuickMustahikKategori('Perorangan')}
                            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer", quickMustahikKategori === 'Perorangan' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                          >
                            Perorangan
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setQuickMustahikKategori('Lembaga')}
                            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer", quickMustahikKategori === 'Lembaga' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                          >
                            Lembaga
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Nama Lengkap / Lembaga *" 
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary font-medium" 
                          value={quickMustahikNama} 
                          onChange={(e) => setQuickMustahikNama(e.target.value)} 
                        />
                        {quickMustahikKategori === 'Perorangan' && (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="NIK (KTP) - Opsional" 
                              className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary font-mono" 
                              value={quickMustahikNik} 
                              onChange={(e) => setQuickMustahikNik(e.target.value)} 
                            />
                            <select
                              className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-slate-600 focus:border-primary cursor-pointer"
                              value={quickMustahikJenisKelamin}
                              onChange={(e) => setQuickMustahikJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                        )}
                        <input 
                          type="text" 
                          placeholder="No Handphone / Telepon (Opsional)" 
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary" 
                          value={quickMustahikTelepon} 
                          onChange={(e) => setQuickMustahikTelepon(e.target.value)} 
                        />
                        <textarea 
                          placeholder="Alamat Lengkap (Opsional)" 
                          rows={2} 
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary" 
                          value={quickMustahikAlamat} 
                          onChange={(e) => setQuickMustahikAlamat(e.target.value)} 
                        />
                        <button 
                          type="button" 
                          onClick={handleQuickRegisterMustahik} 
                          className="w-full bg-primary hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
                        >
                          Daftarkan &amp; Pilih Mustahik
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Ketik nama, NIK, atau NRM Mustahik..." 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-800 shadow-sm"
                            value={mustahikSearch}
                            onChange={(e) => {
                              setMustahikSearch(e.target.value);
                              setFormNama(e.target.value);
                              setShowMustahikDropdown(true);
                            }}
                            onFocus={() => setShowMustahikDropdown(true)}
                          />
                          {mustahikSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setMustahikSearch('');
                                setSelectedMustahikId(null);
                                setNikFoundStatus(null);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>

                        {showMustahikDropdown && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto custom-scrollbar">
                            {filteredMustahikForDropdown.length === 0 ? (
                              <div className="p-3.5 text-xs text-slate-400 italic">
                                Mustahik tidak ditemukan. Anda dapat menggunakan tombol <span className="font-bold text-primary">+ Registrasi Cepat Mustahik</span> di atas.
                              </div>
                            ) : (
                              filteredMustahikForDropdown.map((mustahik) => (
                                <button
                                  key={mustahik.id}
                                  type="button"
                                  className="w-full text-left p-3 hover:bg-emerald-50/50 border-b border-slate-100 flex justify-between items-center text-xs transition-colors cursor-pointer group"
                                  onClick={() => handleSelectMustahik(mustahik)}
                                >
                                  <div>
                                    <p className="font-bold text-slate-800 group-hover:text-primary transition-colors">{mustahik.nama}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      NIK: {mustahik.nik || '-'} {mustahik.nrm ? `| NRM: ${mustahik.nrm}` : ''}
                                    </p>
                                    {mustahik.alamat && <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{mustahik.alamat}</p>}
                                  </div>
                                  <span className="text-[10px] bg-slate-100 group-hover:bg-primary/10 group-hover:text-primary px-2 py-0.5 rounded text-slate-500 uppercase font-bold shrink-0">
                                    {mustahik.kategori || 'Perorangan'}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Details Breakdown / Manual Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                    {/* Kategori Mustahik */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Kategori Mustahik *</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormKategori('Perorangan')}
                          className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer", formKategori === 'Perorangan' ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                        >
                          <User className="size-4" />
                          <span>Perorangan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormKategori('Lembaga')}
                          className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer", formKategori === 'Lembaga' ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                        >
                          <Building2 className="size-4" />
                          <span>Lembaga / Organisasi</span>
                        </button>
                      </div>
                    </div>

                    {/* NIK Field with Auto-Cek (Optional NIK) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">
                          {formKategori === 'Lembaga' ? 'NIK Pimpinan / Penanggung Jawab (Opsional)' : 'NIK Pemohon (Opsional)'}
                        </label>
                        {nikFoundStatus && (
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                            nikFoundStatus.includes('terdaftar') || nikFoundStatus.includes('Terpilih') ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {nikFoundStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Masukkan 16 digit NIK (jika ada)..."
                          value={formNik}
                          onChange={e => setFormNik(e.target.value)}
                          onBlur={() => formNik.length >= 16 && handleCheckNik()}
                          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-slate-900 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckNik()}
                          disabled={nikChecking || formNik.length < 16}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                        >
                          <UserCheck className="size-4 text-slate-600" />
                          <span>{nikChecking ? 'Cek...' : 'Cek NIK'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Nama Pemohon & Jenis Kelamin */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Nama Penerima / Pemohon *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap perorangan / kontak"
                        value={formNama}
                        onChange={e => {
                          setFormNama(e.target.value);
                          setMustahikSearch(e.target.value);
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>

                    {/* Jenis Kelamin Dropdown (CustomSelect) */}
                    {formKategori === 'Perorangan' ? (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Jenis Kelamin *</label>
                        <CustomSelect
                          options={[
                            { value: 'Pria', label: 'Pria (Laki-laki)' },
                            { value: 'Wanita', label: 'Wanita (Perempuan)' }
                          ]}
                          value={formJenisKelamin}
                          onChange={val => setFormJenisKelamin(val as 'Pria' | 'Wanita')}
                          placeholder="-- Pilih Jenis Kelamin --"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Nama Instansi / Lembaga *</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Masjid Al-Ikhlas / Yayasan Panti"
                          value={formNamaInstansi}
                          onChange={e => setFormNamaInstansi(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                        />
                      </div>
                    )}

                    {formKategori === 'Perorangan' && (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">No. HP / WhatsApp (Opsional)</label>
                        <input
                          type="text"
                          placeholder="08xxxxxxxxxx"
                          value={formTelepon}
                          onChange={e => setFormTelepon(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Alamat Lengkap (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Alamat domisili lengkap penerima"
                        value={formAlamat}
                        onChange={e => setFormAlamat(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Disposisi & Memo BAZNAS (Isian Teks & Checkbox Style Matched Proposal) */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <FileCheck className="size-4 text-primary" /> 2. Informasional Pengaju &amp; Memo BAZNAS
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Yang Mengajukan (Isian Teks Opsional) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Yang Mengajukan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Isi nama / instansi pengaju jika ada (contoh: Pimpinan BAZNAS, Kabag Administrasi, UPZ...)"
                        value={formYangMengajukan}
                        onChange={e => setFormYangMengajukan(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>

                    {/* Toggle Memiliki Memo (Style Matched 100% with Proposal) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formHasMemo}
                          onChange={(e) => {
                            setFormHasMemo(e.target.checked);
                            if (!e.target.checked) setFormMemoSource('');
                            else if (!formMemoSource) setFormMemoSource('Memo Ketua BAZNAS');
                          }}
                          className="accent-primary rounded size-4"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Memiliki Memo / Rekomendasi Pimpinan / Disposisi BAZNAS?
                        </span>
                      </label>
                    </div>

                    {/* Sumber Memo Select (Custom Styled Dropdown) */}
                    {formHasMemo && (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-700">Sumber Memo / Disposisi *</label>
                        <CustomSelect
                          options={[
                            { value: 'Memo Ketua BAZNAS', label: 'Memo Ketua BAZNAS' },
                            { value: 'Memo Wakil Ketua I', label: 'Memo Wakil Ketua I' },
                            { value: 'Memo Wakil Ketua II', label: 'Memo Wakil Ketua II' },
                            { value: 'Memo Wakil Ketua III', label: 'Memo Wakil Ketua III' },
                            { value: 'Memo Walikota Semarang', label: 'Memo Walikota Semarang' },
                            { value: 'Disposisi Pimpinan', label: 'Disposisi Pimpinan' },
                            { value: 'Rekomendasi Camat / Lurah', label: 'Rekomendasi Camat / Lurah' },
                            { value: 'DIRECT_PENYALURAN', label: 'Direct Penyaluran' }
                          ]}
                          value={formMemoSource}
                          onChange={val => setFormMemoSource(val)}
                          placeholder="-- Pilih Sumber Memo / Disposisi --"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Rincian Kegiatan Program, Asnaf, RKAT & COA Akuntansi (Urutan Presisi: Program -> Asnaf -> RKAT -> COA Cascading) */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <BookOpen className="size-4 text-primary" /> 3. Rincian Kegiatan Program, Asnaf, RKAT &amp; COA
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* a. Search Dropdown: Program / Kegiatan Penyaluran (Grouped by Pilar) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">1. Jenis Permohonan / Program Penyaluran *</label>
                      <PilarProgramSearchSelect
                        pilars={pilars}
                        value={formJenisPermohonan}
                        onSelect={handleProgramSelect}
                        placeholder="-- Cari & Pilih Program Penyaluran (Per Pilar BAZNAS) --"
                      />
                    </div>

                    {/* b. Custom Select: Golongan Asnaf */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">2. Golongan Asnaf *</label>
                      <CustomSelect
                        options={['Fakir', 'Miskin', 'Amil', 'Muallaf', 'Riqab', 'Gharim', 'Fisabilillah', 'Ibnu Sabil', 'IST', 'ISTT'].map(a => ({ value: a, label: a }))}
                        value={formAsnaf}
                        onChange={val => handleAsnafSelect(val)}
                        placeholder="-- Pilih Golongan Asnaf --"
                      />
                    </div>

                    {/* c. Search Dropdown: Cascading RKAT Operasional Penyaluran */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">3. Program RKAT Operasional Penyaluran</label>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {filteredRkatOptions.length} Opsi RKAT Tersedia
                        </span>
                      </div>
                      <SearchableSelect
                        options={rkatSelectOptions}
                        value={formRkatId}
                        onSelect={val => setFormRkatId(val)}
                        placeholder="-- Cari & Pilih Program RKAT Operasional --"
                        searchPlaceholder="Ketik nomor / spesifikasi RKAT..."
                      />
                    </div>

                    {/* d. Search Dropdown: COA Akuntansi Penyaluran (Cascading Logic dari Proposal Mapping) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">4. Program Kegiatan (COA Akuntansi Buku Besar)</label>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Otomatis Mapping dari Program
                        </span>
                      </div>
                      <SearchableSelect
                        options={coaSelectOptions}
                        value={formCoaCode}
                        onSelect={val => setFormCoaCode(val)}
                        placeholder="-- Cari & Pilih Kode COA Buku Besar --"
                        searchPlaceholder="Ketik kode akun / nama COA..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Nominal Penyaluran & Peruntukan Bantuan */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <DollarSign className="size-4 text-primary" /> 4. Nominal Penyaluran &amp; Peruntukan
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tipe Realisasi Bantuan untuk Lembaga */}
                    {formKategori === 'Lembaga' && (
                      <div className="space-y-3 md:col-span-2 border-b border-slate-200/60 pb-3">
                        <label className="font-bold text-slate-700 block text-xs">
                          Tipe Realisasi Bantuan Lembaga:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                            formTipeRealisasiLembaga === 'Lembaga'
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}>
                            <input
                              type="radio"
                              name="inputTipeRealisasiLembaga"
                              checked={formTipeRealisasiLembaga === 'Lembaga'}
                              onChange={() => handleTipeRealisasiChange('Lembaga')}
                              className="accent-primary"
                            />
                            <span>Realisasi Lembaga (Bantuan Lembaga)</span>
                          </label>

                          <label className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                            formTipeRealisasiLembaga === 'Perorangan'
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}>
                            <input
                              type="radio"
                              name="inputTipeRealisasiLembaga"
                              checked={formTipeRealisasiLembaga === 'Perorangan'}
                              onChange={() => handleTipeRealisasiChange('Perorangan')}
                              className="accent-primary"
                            />
                            <span>Realisasi Perorangan (Bantuan ke Perorangan)</span>
                          </label>
                        </div>

                        {formTipeRealisasiLembaga === 'Perorangan' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-600 block">
                                Volume (Jumlah Penerima Bantuan):
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={formVolumeReal}
                                onChange={e => handleVolumeChange(parseInt(e.target.value) || 1)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 shadow-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-600 block">
                                Unit Cost (Nominal Per Orang):
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  placeholder="Contoh: 200.000"
                                  value={formUnitCost ? Number(formUnitCost).toLocaleString('id-ID') : ''}
                                  onChange={e => {
                                    const rawVal = e.target.value.replace(/[^0-9]/g, '');
                                    handleUnitCostChange(parseInt(rawVal) || 0);
                                  }}
                                  className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 shadow-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nominal Penyaluran (Pemisah ribuan titik) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">
                        {formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'
                          ? 'Total Nominal Penyaluran (Volume x Unit Cost) *'
                          : 'Nominal Penyaluran (Rp) *'}
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'}
                        placeholder="Contoh: 500.000"
                        value={formatNumberWithDots(formNominal)}
                        onChange={e => setFormNominal(e.target.value.replace(/\D/g, ''))}
                        className={cn(
                          "w-full p-2.5 text-sm font-black rounded-xl border outline-none shadow-sm",
                          formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary/20"
                        )}
                      />
                      {formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan' && (
                        <p className="text-[10px] text-slate-500 italic">
                          *Total nominal otomatis terhitung dari Volume ({formVolumeReal} orang) x Rp {Number(formUnitCost || 0).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Keterangan / Peruntukan Bantuan</label>
                      <textarea
                        rows={3}
                        placeholder="Penjelasan peruntukan penyaluran..."
                        value={formKeterangan}
                        onChange={e => setFormKeterangan(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInputModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan & Kirim ke Antrean Pencairan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit Penyaluran ZIS */}
      <AnimatePresence>
        {isEditModalOpen && selectedPenyaluran && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header Banner */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-inner">
                    <Edit3 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Edit / Koreksi Penyaluran ZIS</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Perbarui informasi penerima, jenis permohonan, RKAT, atau Kode COA.</p>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                {/* Section 1: Data Mustahik */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <User className="size-4 text-primary" /> 1. Informasi Data Mustahik / Penerima Bantuan
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Kategori Mustahik *</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormKategori('Perorangan')}
                          className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer", formKategori === 'Perorangan' ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                        >
                          <User className="size-4" />
                          <span>Perorangan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormKategori('Lembaga')}
                          className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer", formKategori === 'Lembaga' ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                        >
                          <Building2 className="size-4" />
                          <span>Lembaga / Organisasi</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">
                        {formKategori === 'Lembaga' ? 'NIK Pimpinan / Penanggung Jawab *' : 'NIK Pemohon *'}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        value={formNik}
                        onChange={e => setFormNik(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-slate-900 shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Nama Penerima / Pemohon *</label>
                      <input
                        type="text"
                        required
                        value={formNama}
                        onChange={e => setFormNama(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>

                    {/* Jenis Kelamin Dropdown (CustomSelect) */}
                    {formKategori === 'Perorangan' ? (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Jenis Kelamin *</label>
                        <CustomSelect
                          options={[
                            { value: 'Pria', label: 'Pria (Laki-laki)' },
                            { value: 'Wanita', label: 'Wanita (Perempuan)' }
                          ]}
                          value={formJenisKelamin}
                          onChange={val => setFormJenisKelamin(val as 'Pria' | 'Wanita')}
                          placeholder="-- Pilih Jenis Kelamin --"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Nama Instansi / Lembaga</label>
                        <input
                          type="text"
                          value={formNamaInstansi}
                          onChange={e => setFormNamaInstansi(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                        />
                      </div>
                    )}

                    {formKategori === 'Perorangan' && (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">No. HP / WhatsApp</label>
                        <input
                          type="text"
                          value={formTelepon}
                          onChange={e => setFormTelepon(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={formAlamat}
                        onChange={e => setFormAlamat(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Disposisi & Memo BAZNAS */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <FileCheck className="size-4 text-primary" /> 2. Informasional Pengaju &amp; Memo BAZNAS
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Yang Mengajukan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Isi nama / instansi pengaju jika ada..."
                        value={formYangMengajukan}
                        onChange={e => setFormYangMengajukan(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formHasMemo}
                          onChange={(e) => {
                            setFormHasMemo(e.target.checked);
                            if (!e.target.checked) setFormMemoSource('');
                            else if (!formMemoSource) setFormMemoSource('Memo Ketua BAZNAS');
                          }}
                          className="accent-primary rounded size-4"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Memiliki Memo / Rekomendasi Pimpinan / Disposisi BAZNAS?
                        </span>
                      </label>
                    </div>

                    {formHasMemo && (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-700">Sumber Memo / Disposisi *</label>
                        <CustomSelect
                          options={[
                            { value: 'Memo Ketua BAZNAS', label: 'Memo Ketua BAZNAS' },
                            { value: 'Memo Wakil Ketua I', label: 'Memo Wakil Ketua I' },
                            { value: 'Memo Wakil Ketua II', label: 'Memo Wakil Ketua II' },
                            { value: 'Memo Wakil Ketua III', label: 'Memo Wakil Ketua III' },
                            { value: 'Memo Walikota Semarang', label: 'Memo Walikota Semarang' },
                            { value: 'Disposisi Pimpinan', label: 'Disposisi Pimpinan' },
                            { value: 'Rekomendasi Camat / Lurah', label: 'Rekomendasi Camat / Lurah' },
                            { value: 'DIRECT_PENYALURAN', label: 'Direct Penyaluran' }
                          ]}
                          value={formMemoSource}
                          onChange={val => setFormMemoSource(val)}
                          placeholder="-- Pilih Sumber Memo / Disposisi --"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Rincian Kegiatan Program, Asnaf, RKAT & COA (Urutan Presisi: Program -> Asnaf -> RKAT -> COA Cascading) */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <BookOpen className="size-4 text-primary" /> 3. Rincian Kegiatan Program, Asnaf, RKAT &amp; COA
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* a. Search Dropdown: Program / Kegiatan Penyaluran (Grouped by Pilar) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">1. Jenis Permohonan / Program Penyaluran *</label>
                      <PilarProgramSearchSelect
                        pilars={pilars}
                        value={formJenisPermohonan}
                        onSelect={handleProgramSelect}
                        placeholder="-- Cari & Pilih Program Penyaluran (Per Pilar BAZNAS) --"
                      />
                    </div>

                    {/* b. Custom Select: Golongan Asnaf */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">2. Golongan Asnaf *</label>
                      <CustomSelect
                        options={['Fakir', 'Miskin', 'Amil', 'Muallaf', 'Riqab', 'Gharim', 'Fisabilillah', 'Ibnu Sabil', 'IST', 'ISTT'].map(a => ({ value: a, label: a }))}
                        value={formAsnaf}
                        onChange={val => handleAsnafSelect(val)}
                        placeholder="-- Pilih Golongan Asnaf --"
                      />
                    </div>

                    {/* c. Search Dropdown: Cascading RKAT Operasional Penyaluran */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">3. Program RKAT Operasional Penyaluran</label>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {filteredRkatOptions.length} Opsi RKAT Tersedia
                        </span>
                      </div>
                      <SearchableSelect
                        options={rkatSelectOptions}
                        value={formRkatId}
                        onSelect={val => setFormRkatId(val)}
                        placeholder="-- Cari & Pilih Program RKAT Operasional --"
                        searchPlaceholder="Ketik nomor / spesifikasi RKAT..."
                      />
                    </div>

                    {/* d. Search Dropdown: COA Akuntansi Penyaluran (Cascading Logic dari Proposal Mapping) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">4. Program Kegiatan (COA Akuntansi Buku Besar)</label>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Otomatis Mapping dari Program
                        </span>
                      </div>
                      <SearchableSelect
                        options={coaSelectOptions}
                        value={formCoaCode}
                        onSelect={val => setFormCoaCode(val)}
                        placeholder="-- Cari & Pilih Kode COA Buku Besar --"
                        searchPlaceholder="Ketik kode akun / nama COA..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Nominal Penyaluran & Peruntukan Bantuan */}
                <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <DollarSign className="size-4 text-primary" /> 4. Nominal Penyaluran &amp; Peruntukan
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tipe Realisasi Bantuan untuk Lembaga */}
                    {formKategori === 'Lembaga' && (
                      <div className="space-y-3 md:col-span-2 border-b border-slate-200/60 pb-3">
                        <label className="font-bold text-slate-700 block text-xs">
                          Tipe Realisasi Bantuan Lembaga:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                            formTipeRealisasiLembaga === 'Lembaga'
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}>
                            <input
                              type="radio"
                              name="editTipeRealisasiLembaga"
                              checked={formTipeRealisasiLembaga === 'Lembaga'}
                              onChange={() => handleTipeRealisasiChange('Lembaga')}
                              className="accent-primary"
                            />
                            <span>Realisasi Lembaga (Bantuan Lembaga)</span>
                          </label>

                          <label className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                            formTipeRealisasiLembaga === 'Perorangan'
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}>
                            <input
                              type="radio"
                              name="editTipeRealisasiLembaga"
                              checked={formTipeRealisasiLembaga === 'Perorangan'}
                              onChange={() => handleTipeRealisasiChange('Perorangan')}
                              className="accent-primary"
                            />
                            <span>Realisasi Perorangan (Bantuan ke Perorangan)</span>
                          </label>
                        </div>

                        {formTipeRealisasiLembaga === 'Perorangan' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-600 block">
                                Volume (Jumlah Penerima Bantuan):
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={formVolumeReal}
                                onChange={e => handleVolumeChange(parseInt(e.target.value) || 1)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 shadow-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-600 block">
                                Unit Cost (Nominal Per Orang):
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  placeholder="Contoh: 200.000"
                                  value={formUnitCost ? Number(formUnitCost).toLocaleString('id-ID') : ''}
                                  onChange={e => {
                                    const rawVal = e.target.value.replace(/[^0-9]/g, '');
                                    handleUnitCostChange(parseInt(rawVal) || 0);
                                  }}
                                  className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 shadow-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nominal Penyaluran (Pemisah ribuan titik) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">
                        {formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'
                          ? 'Total Nominal Penyaluran (Volume x Unit Cost) *'
                          : 'Nominal Penyaluran (Rp) *'}
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'}
                        placeholder="Contoh: 500.000"
                        value={formatNumberWithDots(formNominal)}
                        onChange={e => setFormNominal(e.target.value.replace(/\D/g, ''))}
                        className={cn(
                          "w-full p-2.5 text-sm font-black rounded-xl border outline-none shadow-sm",
                          formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan'
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary/20"
                        )}
                      />
                      {formKategori === 'Lembaga' && formTipeRealisasiLembaga === 'Perorangan' && (
                        <p className="text-[10px] text-slate-500 italic">
                          *Total nominal otomatis terhitung dari Volume ({formVolumeReal} orang) x Rp {Number(formUnitCost || 0).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Keterangan / Peruntukan Bantuan</label>
                      <textarea
                        rows={3}
                        placeholder="Penjelasan peruntukan penyaluran..."
                        value={formKeterangan}
                        onChange={e => setFormKeterangan(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none font-medium text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detail Penyaluran */}
      <AnimatePresence>
        {isDetailModalOpen && selectedPenyaluran && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-100">
              <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-black text-slate-900">Rincian Penyaluran ZIS</h3>
                  <p className="text-xs text-slate-500 font-medium">Asal Data: {selectedPenyaluran.asal_data}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">No. Agenda</p>
                    {selectedPenyaluran.asal_data === 'Jalur Direct' ? (
                      <span className="inline-block mt-1 text-xs font-medium text-slate-400 font-mono">—</span>
                    ) : (
                      <span className="inline-block mt-1 text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                        {selectedPenyaluran.agenda_no ? String(selectedPenyaluran.agenda_no) : '-'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nominal Bantuan</p>
                    <p className="font-black text-emerald-600 text-sm mt-1">{formatCurrency(selectedPenyaluran.nominal)}</p>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    {(selectedPenyaluran.jenis_pengajuan || selectedPenyaluran.jenisPengajuan || '').toLowerCase().includes('lembaga') ? "Nama Lembaga / Instansi" : "Data Mustahik / Pemohon"}
                  </p>
                  {(() => {
                    const { title, subtitle, isLembaga } = getMustahikDisplayName(selectedPenyaluran);
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-base leading-tight">{title}</p>
                          {isLembaga && (
                            <span className="px-2 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                              Lembaga
                            </span>
                          )}
                        </div>
                        {subtitle && (
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">{subtitle}</p>
                        )}
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-slate-500 font-semibold pt-0.5">
                    {selectedPenyaluran.jenis_pengajuan || selectedPenyaluran.jenisPengajuan || 'Perorangan'}
                    {selectedPenyaluran.jenis_kelamin || selectedPenyaluran.mustahik?.jenis_kelamin ? ` (${selectedPenyaluran.jenis_kelamin || selectedPenyaluran.mustahik?.jenis_kelamin})` : ''}
                  </p>
                  {(selectedPenyaluran.jenis_pengajuan === 'Lembaga' || (selectedPenyaluran.jenisPengajuan && selectedPenyaluran.jenisPengajuan.includes('Lembaga'))) && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600">Tipe Realisasi:</span>
                      <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {selectedPenyaluran.volume && selectedPenyaluran.volume > 1
                          ? `Realisasi Perorangan (${selectedPenyaluran.volume} Penerima @ Rp ${(Number(selectedPenyaluran.rekomendasi_unit_cost) || Math.round((Number(selectedPenyaluran.nominal) || 0) / selectedPenyaluran.volume)).toLocaleString('id-ID')})`
                          : 'Realisasi Lembaga'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">NIK</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedPenyaluran.nik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Asnaf</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedPenyaluran.asnaf || '-'}</p>
                  </div>
                </div>

                {/* Tanggal Pengajuan & Tanggal Pencairan */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Calendar className="size-3 text-slate-400" /> Tanggal Pengajuan
                    </p>
                    <p className="font-bold text-slate-800 mt-1">
                      {selectedPenyaluran.tanggal_masuk || selectedPenyaluran.tanggalMasuk || selectedPenyaluran.created_at
                        ? new Date(selectedPenyaluran.tanggal_masuk || selectedPenyaluran.tanggalMasuk || selectedPenyaluran.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <CalendarCheck className="size-3 text-emerald-600" /> Tanggal Pencairan
                    </p>
                    {(() => {
                      const tglCair = selectedPenyaluran.tanggal_pencairan_real || selectedPenyaluran.tanggal_realisasi || selectedPenyaluran.tanggalPencairan || selectedPenyaluran.tanggalRealisasi;
                      const s = (selectedPenyaluran.status || '').toLowerCase();
                      const isSudahCair = s.includes('cair') || s.includes('realisasi') || s.includes('simba') || s.includes('arsip') || s.includes('selesai');
                      
                      if (tglCair && isSudahCair) {
                        return (
                          <div className="mt-1">
                            <p className="font-black text-emerald-700 leading-tight">
                              {new Date(tglCair).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Sudah Dicairkan
                            </span>
                          </div>
                        );
                      } else if (isSudahCair && (selectedPenyaluran.updated_at || selectedPenyaluran.updatedAt)) {
                        return (
                          <div className="mt-1">
                            <p className="font-black text-emerald-700 leading-tight">
                              {new Date(selectedPenyaluran.updated_at || selectedPenyaluran.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Sudah Dicairkan
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1">
                          <p className="font-bold text-amber-600 leading-tight">Belum Dicairkan</p>
                          <span className="inline-block mt-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Antrean Pencairan
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Yang Mengajukan</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedPenyaluran.yang_mengajukan || selectedPenyaluran.yangMengajukan || 'Pimpinan BAZNAS'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rekomendasi / Memo</p>
                    <p className="font-bold text-amber-700 mt-0.5">
                      {selectedPenyaluran.has_memo ? (selectedPenyaluran.memo_source || 'Ada Memo') : 'Tanpa Memo'}
                    </p>
                  </div>
                </div>

                {/* Full Program RKAT & COA Detail */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    RKAT &amp; Program Kegiatan (COA)
                  </p>
                  
                  {/* (Program RKAT) */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program RKAT</p>
                    <p className="font-black text-slate-900 text-sm mt-0.5">
                      {(() => {
                        const { rkatName } = getRkatInfo(selectedPenyaluran);
                        return rkatName || selectedPenyaluran.program?.name || selectedPenyaluran.jenis_permohonan || 'Umum';
                      })()}
                    </p>
                  </div>

                  {/* (Keterangan Spesifikasi RKAT - ini jadi sub keterangan) */}
                  {(() => {
                    const { rkatKet } = getRkatInfo(selectedPenyaluran);
                    const ketText = rkatKet || selectedPenyaluran.program?.keterangan || selectedPenyaluran.program?.spesifikasi;
                    if (ketText) {
                      return (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                          <span className="font-bold text-blue-700 block text-[10px] uppercase tracking-wider">
                            Keterangan Spesifikasi RKAT:
                          </span>
                          <p className="font-semibold text-slate-800 text-xs leading-snug">
                            {ketText}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* (Kode COA) */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">COA Akuntansi (Buku Besar)</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {(() => {
                          const { coaName } = getCoaInfo(selectedPenyaluran);
                          return coaName;
                        })()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                      {(() => {
                        const { coaCode } = getCoaInfo(selectedPenyaluran);
                        return coaCode;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Alamat</p>
                  <p className="font-medium text-slate-800">{selectedPenyaluran.alamat || '-'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Keterangan / Peruntukan</p>
                  <p className="font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {selectedPenyaluran.keterangan || '-'}
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => promptDeletePenyaluran(selectedPenyaluran)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                >
                  <Trash2 className="size-3.5" />
                  Hapus Transaksi
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const itemToEdit = selectedPenyaluran;
                      setIsDetailModalOpen(false);
                      handleOpenEditModal(itemToEdit);
                    }}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200"
                  >
                    <Edit3 className="size-3.5" />
                    Edit Transaksi
                  </button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl text-xs transition-colors cursor-pointer">
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Migrasi Penyaluran ZIS (Matched 100% with PenerimaanZis) */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => {
                if (!migrating) {
                  setIsMigrationModalOpen(false);
                  setParsedMigrationRows([]);
                }
              }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "relative bg-white w-full rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[calc(100dvh-4rem)] z-10 transition-all",
                parsedMigrationRows.length > 0 ? "max-w-5xl" : "max-w-md"
              )}
            >
              {/* Modal Header */}
              <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <FileSpreadsheet className="size-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900 font-sans">Migrasi Penyaluran ZIS</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Unggah file Excel untuk impor data historis transaksi penyaluran</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!migrating) {
                      setIsMigrationModalOpen(false);
                      setParsedMigrationRows([]);
                    }
                  }} 
                  className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 md:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="space-y-3">
                  {/* Download Template Button */}
                  <button 
                    onClick={downloadPenyaluranTemplate} 
                    className="w-full flex items-center justify-between p-3.5 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-primary font-sans">Download Format Template Excel</p>
                        <p className="text-[10px] text-primary/70 font-medium font-sans">Kolom: Tanggal_Permohonan, Tanggal_Pencairan, Nama_Pemohon, NIK, No_Telpon, Alamat, Jenis_Pengajuan, Jenis_Permohonan (Kode), Kode_COA, Kode_RKAT (ID), Nominal, Asnaf, Status, Keterangan</p>
                      </div>
                    </div>
                  </button>

                  {/* Upload Dropzone */}
                  <label className="w-full flex items-center justify-between p-3.5 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors font-sans">
                          {parsedMigrationRows.length > 0 ? 'Pilih File Excel Lain...' : 'Pilih File Excel Data Migrasi'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium font-sans">Format spreadsheet .xlsx / .xls</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handlePenyaluranFileSelect} 
                      disabled={migrating}
                    />
                  </label>
                </div>

                {/* Staging / Preview Table */}
                {parsedMigrationRows.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    {/* Summary Stats Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 text-xs font-sans">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <FileText className="size-4 text-slate-400" />
                        <span>Hasil Pembacaan Excel ({parsedMigrationRows.length} Baris)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          {parsedMigrationRows.filter(r => r.Nama_Pemohon && r.Nama_Pemohon !== '-' && r.Nama_Pemohon.trim() !== '').length} Baris Valid
                        </span>
                        <span className="font-mono text-slate-900 font-bold">
                          Total: Rp {parsedMigrationRows.reduce((acc, curr) => acc + (Number(curr.Nominal) || 0), 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto min-h-[300px] max-h-[440px] custom-scrollbar">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20">
                            <th className="px-3 py-2.5 text-center w-12 bg-slate-100">#</th>
                            <th className="px-3 py-2.5 bg-slate-100">Tgl Permohonan</th>
                            <th className="px-3 py-2.5 bg-slate-100">Tgl Pencairan</th>
                            <th className="px-3 py-2.5 bg-slate-100">Nama Pemohon</th>
                            <th className="px-3 py-2.5 bg-slate-100">NIK</th>
                            <th className="px-3 py-2.5 bg-slate-100">No. Telpon</th>
                            <th className="px-3 py-2.5 bg-slate-100 min-w-[160px]">Alamat</th>
                            <th className="px-3 py-2.5 bg-slate-100">Jenis Pengajuan</th>
                            <th className="px-3 py-2.5 bg-slate-100 min-w-[200px]">Jenis Permohonan (Kegiatan)</th>
                            <th className="px-3 py-2.5 bg-slate-100 min-w-[220px]">Program &amp; RKAT (Spesifikasi)</th>
                            <th className="px-3 py-2.5 bg-slate-100">Kode COA</th>
                            <th className="px-3 py-2.5 bg-slate-100">Asnaf</th>
                            <th className="px-3 py-2.5 text-right bg-slate-100">Nominal (Rp)</th>
                            <th className="px-3 py-2.5 text-center bg-slate-100">Status</th>
                            <th className="px-3 py-2.5 bg-slate-100 min-w-[200px]">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedMigrationRows.map((item, index) => {
                            const { progDisplay, rkatNo, rkatName, rkatKet } = resolveProgramAndRkatForMigration(item.Jenis_Permohonan, item.Kode_RKAT);

                            return (
                              <tr key={index} className="hover:bg-slate-50 transition-colors text-[11px]">
                                <td className="px-3 py-2.5 text-center font-bold text-slate-400">{item.rowNum}</td>
                                <td className="px-3 py-2.5 text-slate-600">{item.Tanggal_Permohonan || '-'}</td>
                                <td className="px-3 py-2.5 text-emerald-700 font-medium">
                                  {item.Tanggal_Pencairan ? (
                                    <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono font-bold">
                                      {item.Tanggal_Pencairan}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 font-bold text-slate-800">{item.Nama_Pemohon}</td>
                                <td className="px-3 py-2.5 font-mono text-slate-600">{item.NIK || '-'}</td>
                                <td className="px-3 py-2.5 text-slate-600">{item.No_Telpon || '-'}</td>
                                <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate" title={item.Alamat}>{item.Alamat || '-'}</td>
                                <td className="px-3 py-2.5 font-medium text-slate-700">{item.Jenis_Pengajuan}</td>
                                
                                {/* Resolved Program / Kegiatan */}
                                <td className="px-3 py-2.5 min-w-[200px]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-[11px] whitespace-normal leading-snug">
                                      {progDisplay}
                                    </span>
                                    {item.Jenis_Permohonan && !progDisplay.startsWith(item.Jenis_Permohonan) && (
                                      <span className="font-mono text-[9px] text-purple-700 font-semibold mt-0.5">
                                        Kode: {item.Jenis_Permohonan}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Resolved RKAT Activity & Specification */}
                                <td className="px-3 py-2.5 min-w-[220px]">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {rkatNo && (
                                        <span className="bg-blue-50 text-blue-700 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border border-blue-100 shrink-0">
                                          {rkatNo}
                                        </span>
                                      )}
                                      <span className="font-bold text-slate-800 text-[11px] leading-snug whitespace-normal" title={rkatName}>
                                        {rkatName}
                                      </span>
                                    </div>
                                    {rkatKet && rkatKet !== '-' && (
                                      <span className="text-[9.5px] text-slate-500 line-clamp-1 italic mt-0.5 whitespace-normal" title={rkatKet}>
                                        Spesifikasi: {rkatKet}
                                      </span>
                                    )}
                                    {item.Kode_RKAT && item.Kode_RKAT !== '-' && (
                                      <span className="font-mono text-[8.5px] text-slate-400 truncate max-w-[180px] mt-0.2" title={`ID: ${item.Kode_RKAT}`}>
                                        ID: {item.Kode_RKAT}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 font-mono text-emerald-800 font-bold">
                                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    {item.Kode_COA}
                                  </span>
                                </td>
                                
                                <td className="px-3 py-2.5 font-medium text-slate-700">{item.Asnaf}</td>
                                <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">
                                  Rp {Number(item.Nominal || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={cn(
                                    "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase",
                                    (item.Status === 'Selesai' || item.Status === 'CAIR') 
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  )}>
                                    {item.Status}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate" title={item.Keterangan}>
                                  {item.Keterangan}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleProcessMigrationSubmit}
                      disabled={migrating}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {migrating ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Memproses Migrasi Data Penyaluran...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          Proses Impor &amp; Migrasi Data ({parsedMigrationRows.length} Transaksi)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Cetak Laporan Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsReportModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
                    <Printer className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Cetak Laporan Penyaluran ZIS</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Rekapitulasi Usulan Penerima Pentasharufan &amp; Ekspor Data BAZNAS
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-xs">
                {/* Select Report Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    Pilih Format / Jenis Laporan *
                  </label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                  >
                    <option value="pendayagunaan">Laporan Bulanan Usulan Pentasharufan — Bidang Pendayagunaan (PDF / Excel)</option>
                    <option value="pendistribusian">Laporan Bulanan Usulan Pentasharufan — Bidang Pendistribusian (PDF / Excel)</option>
                    <option value="excel_detail">Download Data Transaksi Penyaluran ZIS (Spreadsheet Excel .xlsx)</option>
                  </select>
                </div>

                {/* Option 1 & 2: Bulanan Pendayagunaan / Pendistribusian */}
                {(selectedReportType === 'pendayagunaan' || selectedReportType === 'pendistribusian') && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                      <FileText className="size-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider">
                          {selectedReportType === 'pendayagunaan' 
                            ? 'Rekapitulasi Pentasharufan Bidang Pendayagunaan' 
                            : 'Rekapitulasi Pentasharufan Bidang Pendistribusian'}
                        </h4>
                        <p className="text-emerald-800/80 text-[11px] mt-0.5 leading-relaxed">
                          Menyusun rekapitulasi semua usulan per program (Semarang Makmur, Cerdas, Sehat, Taqwa, Peduli) pada bulan pencairan yang dipilih dengan 4 penandatangan resmi.
                        </p>
                      </div>
                    </div>

                    {/* Period Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bulan Pencairan</label>
                        <select
                          value={reportMonth}
                          onChange={(e) => setReportMonth(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahun</label>
                        <input
                          type="number"
                          value={reportYear}
                          onChange={(e) => setReportYear(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tgl Tanda Tangan</label>
                        <input
                          type="date"
                          value={reportSignDate}
                          onChange={(e) => setReportSignDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Signatories 4 Pejabat */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-primary" />
                          Penandatangan Dokumen
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Pilih user &amp; sesuaikan nama</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Kepala Pelaksana */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-600">Kepala Pelaksana (Mengetahui)</label>
                          <div className="flex gap-2">
                            <select
                              className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setReportSignatories(prev => ({ ...prev, kepalaPelaksana: e.target.value }));
                                }
                              }}
                              value={usersList.some(u => u.name === reportSignatories.kepalaPelaksana) ? reportSignatories.kepalaPelaksana : ''}
                            >
                              <option value="">-- Pilih --</option>
                              {usersList
                                .filter(u => u.role === 'Kepala_Pelaksana')
                                .map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <input
                              type="text"
                              value={reportSignatories.kepalaPelaksana}
                              onChange={(e) => setReportSignatories(prev => ({ ...prev, kepalaPelaksana: e.target.value }))}
                              placeholder="Nama..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-slate-800"
                            />
                          </div>
                        </div>

                        {/* 2. Kabid Pendayagunaan / Pendistribusian */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-600">
                            {selectedReportType === 'pendayagunaan' ? 'Kepala Bidang Pendayagunaan' : 'Kepala Bidang Pendistribusian'}
                          </label>
                          <div className="flex gap-2">
                            {selectedReportType === 'pendayagunaan' ? (
                              <>
                                <select
                                  className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setReportSignatories(prev => ({ ...prev, kabidPendayagunaan: e.target.value }));
                                    }
                                  }}
                                  value={usersList.some(u => u.name === reportSignatories.kabidPendayagunaan) ? reportSignatories.kabidPendayagunaan : ''}
                                >
                                  <option value="">-- Pilih --</option>
                                  {usersList
                                    .filter(u => u.role === 'Kabag_Pendayagunaan' || u.role === 'Staf_Pendayagunaan')
                                    .map(u => (
                                      <option key={u.id} value={u.name}>{u.name}</option>
                                    ))}
                                </select>
                                <input
                                  type="text"
                                  value={reportSignatories.kabidPendayagunaan}
                                  onChange={(e) => setReportSignatories(prev => ({ ...prev, kabidPendayagunaan: e.target.value }))}
                                  placeholder="Nama..."
                                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-slate-800"
                                />
                              </>
                            ) : (
                              <>
                                <select
                                  className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setReportSignatories(prev => ({ ...prev, kabidPendistribusian: e.target.value }));
                                    }
                                  }}
                                  value={usersList.some(u => u.name === reportSignatories.kabidPendistribusian) ? reportSignatories.kabidPendistribusian : ''}
                                >
                                  <option value="">-- Pilih --</option>
                                  {usersList
                                    .filter(u => u.role === 'Kabag_Pendistribusian' || u.role === 'Staf_Pendistribusian')
                                    .map(u => (
                                      <option key={u.id} value={u.name}>{u.name}</option>
                                    ))}
                                </select>
                                <input
                                  type="text"
                                  value={reportSignatories.kabidPendistribusian}
                                  onChange={(e) => setReportSignatories(prev => ({ ...prev, kabidPendistribusian: e.target.value }))}
                                  placeholder="Nama..."
                                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-slate-800"
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* 3. Wakil Ketua III */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-600">Wakil Ketua III (Perencanaan &amp; Pelaporan)</label>
                          <div className="flex gap-2">
                            <select
                              className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setReportSignatories(prev => ({ ...prev, wakilKetua3: e.target.value }));
                                }
                              }}
                              value={usersList.some(u => u.name === reportSignatories.wakilKetua3) ? reportSignatories.wakilKetua3 : ''}
                            >
                              <option value="">-- Pilih --</option>
                              {usersList
                                .filter(u => u.role === 'Wakil_Ketua_III')
                                .map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <input
                              type="text"
                              value={reportSignatories.wakilKetua3}
                              onChange={(e) => setReportSignatories(prev => ({ ...prev, wakilKetua3: e.target.value }))}
                              placeholder="Nama..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-slate-800"
                            />
                          </div>
                        </div>

                        {/* 4. Wakil Ketua II */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-600">Wakil Ketua II (Pendistribusian &amp; Pendayagunaan)</label>
                          <div className="flex gap-2">
                            <select
                              className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setReportSignatories(prev => ({ ...prev, wakilKetua2: e.target.value }));
                                }
                              }}
                              value={usersList.some(u => u.name === reportSignatories.wakilKetua2) ? reportSignatories.wakilKetua2 : ''}
                            >
                              <option value="">-- Pilih --</option>
                              {usersList
                                .filter(u => u.role === 'Wakil_Ketua_II')
                                .map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <input
                              type="text"
                              value={reportSignatories.wakilKetua2}
                              onChange={(e) => setReportSignatories(prev => ({ ...prev, wakilKetua2: e.target.value }))}
                              placeholder="Nama..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Summary */}
                    {(() => {
                      const repData = generateMonthlyReportData(selectedReportType, reportMonth, reportYear);
                      return (
                        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
                          <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                              Ringkasan {MONTH_NAMES[reportMonth - 1]} {reportYear}
                            </p>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">
                              {repData.totalTransactions} Transaksi Terealisasi / Dicairkan
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-medium">Total Nominal Usulan</p>
                            <p className="text-base font-black text-emerald-400">{formatCurrency(repData.grandTotal)}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Download Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handlePrintPdfMonthly(selectedReportType)}
                        className="py-3 px-4 bg-primary hover:bg-primary/95 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer active:scale-98"
                      >
                        <Printer className="size-4" />
                        Cetak / Simpan PDF
                      </button>

                      <button
                        onClick={() => handleExportExcelMonthly(selectedReportType)}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                      >
                        <FileSpreadsheet className="size-4" />
                        Download Excel (.xlsx)
                      </button>
                    </div>
                  </div>
                )}

                {/* Option 3: Download Excel Detail */}
                {selectedReportType === 'excel_detail' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                      <FileSpreadsheet className="size-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider">
                          Data Detail Transaksi Penyaluran ZIS (.xlsx)
                        </h4>
                        <p className="text-emerald-800/80 text-[11px] mt-0.5 leading-relaxed">
                          Mengunduh seluruh baris transaksi Penyaluran ZIS yang sedang aktif difilter ke dalam format Spreadsheet Excel lengkap dengan rincian Mustahik, Asnaf, Program RKAT, Kode Akun COA, dan Status Realisasi.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-700">Jumlah Baris Transaksi:</span>
                        <p className="text-[11px] text-slate-400">Sesuai filter pencarian &amp; tab yang dipilih</p>
                      </div>
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl">
                        {filteredData.length} Baris Data
                      </span>
                    </div>

                    <button
                      onClick={handleExportExcelDetail}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                    >
                      <Download className="size-4" />
                      Download Spreadsheet Excel Penyaluran ({filteredData.length} Transaksi)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Delete Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteModalOpen && itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-5 pb-4 border-b border-rose-100/70 bg-gradient-to-r from-rose-50/90 to-red-50/50 flex items-start gap-3.5">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0 shadow-sm ring-4 ring-rose-50">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Konfirmasi Hapus Transaksi
                  </h3>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">
                    Tindakan ini permanen dan akan memulihkan saldo kas.
                  </p>
                </div>
                <button 
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Detail Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pemohon / Mustahik</span>
                    <span className="font-bold text-slate-900 text-right">
                      {itemToDelete.nama_pemohon || itemToDelete.nama_instansi || itemToDelete.mustahik?.nama || '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No. Agenda / Asal</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {itemToDelete.agenda_no ? `No. Agenda ${itemToDelete.agenda_no}` : (itemToDelete.asal_data || 'Jalur Direct')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nominal Penyaluran</span>
                    <span className="text-sm font-black text-rose-600">
                      {formatCurrency(itemToDelete.nominal || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Transaksi</span>
                    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full uppercase", getStatusColor(itemToDelete.status))}>
                      {formatStatusDisplay(itemToDelete.status)}
                    </span>
                  </div>
                </div>

                {/* Impact Info */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1.5 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <span>⚡ Dampak Otomatis Sistem:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1 font-medium text-[10.5px]">
                    <li>Transaksi akan dihapus dari daftar Penyaluran ZIS.</li>
                    <li>Jurnal akuntansi terkait di <strong>Buku Besar</strong> akan otomatis dibersihkan.</li>
                    <li><strong>Saldo Kas/Bank</strong> akan otomatis dipulihkan/dikembalikan jika transaksi sudah dicairkan.</li>
                  </ul>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 font-bold text-slate-700 rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-bold text-white rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Menghapus Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      Ya, Hapus Transaksi
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating In-App Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-5 right-5 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md",
              toastNotification.type === 'success' 
                ? "bg-emerald-900/90 text-white border-emerald-700/50 shadow-emerald-950/20" 
                : "bg-rose-900/90 text-white border-rose-700/50 shadow-rose-950/20"
            )}
          >
            {toastNotification.type === 'success' ? (
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-bold flex-1 leading-snug">
              {toastNotification.message}
            </p>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white/70 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
