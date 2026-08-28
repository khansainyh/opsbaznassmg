import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Eye, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  X, 
  Check,
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Layers,
  UserPlus,
  TrendingUp,
  FileSpreadsheet,
  Edit3,
  Printer,
  FileText,
  Upload,
  Download,
  RefreshCw,
  Building2,
  Sparkles,
  Filter,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useWindowFocusRefetch } from '../hooks/useWindowFocusRefetch';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export const PROGRAM_KODE_TO_RKAT_MAP: Record<string, { rkat_no: string | null; jenis: string; isUpz: boolean }> = {
  '101.1': { rkat_no: '2', jenis: 'Zakat Maal Perorangan', isUpz: false },
  '101.2': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah Perorangan', isUpz: false },
  '101.3': { rkat_no: '16', jenis: 'CSR/PKBL', isUpz: false },
  '101.4': { rkat_no: '14', jenis: 'Qurban', isUpz: false },
  '101.5': { rkat_no: '15', jenis: 'Fidyah Perorangan', isUpz: false },
  '101.8': { rkat_no: '7', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat', isUpz: false },
  '101.9': { rkat_no: '10', jenis: 'Penerimaan Infak Sedekah Terikat Kas', isUpz: false },
  '101.10': { rkat_no: '11', jenis: 'Penerimaan Infak Sedekah Terikat Natura', isUpz: false },
  '101.11': { rkat_no: '13', jenis: 'Infak/Sedekah Terikat Operasional Amil', isUpz: false },
  '101.12': { rkat_no: '17', jenis: 'Infak dan Sedekah Terikat DSK Lainnya', isUpz: false },
  '101.13': { rkat_no: '1', jenis: 'Zakat Maal Entitas', isUpz: false },
  '101.14': { rkat_no: null, jenis: 'Belum Diketahui', isUpz: false },

  '102.1': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kota (UPZ Pengumpulan)', isUpz: true },
  '102.2': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)', isUpz: true },
  '102.3': { rkat_no: '4', jenis: 'Zakat Maal UPZ Penyaluran', isUpz: true },
  '102.4': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah via UPZ', isUpz: true },
  '102.5': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota', isUpz: true },
  '102.6': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan', isUpz: true },
  '102.7': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', isUpz: true },
  '102.7.1': { rkat_no: '9', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Penyaluran', isUpz: true },
  '102.8': { rkat_no: '14', jenis: 'Qurban Via UPZ', isUpz: true },
  '102.9': { rkat_no: '15', jenis: 'Fidyah Via UPZ', isUpz: true },
  '102.10': { rkat_no: '17', jenis: 'DSKL Lainnya Via UPZ', isUpz: true },
  '102.11': { rkat_no: '3', jenis: 'Zakat Maal UPZ Pengumpulan', isUpz: true }
};

// SummaryCard Component
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

interface UpzSearchDropdownProps {
  value: string;
  onSelect: (upzId: string) => void;
  placeholder?: string;
  className?: string;
  upzList: any[];
}

function UpzSearchDropdown({
  value,
  onSelect,
  placeholder = 'Pilih UPZ Database...',
  className,
  upzList
}: UpzSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedUpz = useMemo(() => {
    return upzList.find(u => u.id === value || u.nama_upz === value || u.name === value);
  }, [upzList, value]);

  const filteredUpzs = useMemo(() => {
    if (!query) return upzList;
    const q = query.toLowerCase();
    return upzList.filter(u => (u.nama_upz || u.name || '').toLowerCase().includes(q));
  }, [upzList, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative font-sans", isOpen ? "z-[100]" : "z-10")} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setQuery('');
        }}
        className={cn(
          "w-full text-left text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold flex items-center justify-between gap-2 shadow-sm hover:border-slate-300",
          selectedUpz ? "text-emerald-700 font-bold border-emerald-200 bg-emerald-50/40" : "text-slate-500",
          className
        )}
      >
        <span className="truncate">
          {selectedUpz ? (selectedUpz.nama_upz || selectedUpz.name) : placeholder}
        </span>
        <ChevronRight className={cn("size-3.5 text-slate-400 shrink-0 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] left-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar w-72 md:w-80">
          <div className="relative">
            <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama UPZ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
            />
          </div>
          <div className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-rose-50 text-[11px] text-rose-600 font-bold transition-colors"
              >
                -- Reset Pemetaan UPZ --
              </button>
            )}
            {filteredUpzs.map(u => (
              <button
                type="button"
                key={u.id}
                onClick={() => {
                  onSelect(u.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 text-xs transition-colors flex items-center justify-between gap-1",
                  (value === u.id || value === u.nama_upz || value === u.name) ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                )}
              >
                <span className="truncate">{u.nama_upz || u.name}</span>
                {u.kategori && (
                  <span className="text-[9px] text-slate-400 shrink-0 font-normal">({u.kategori})</span>
                )}
              </button>
            ))}
            {filteredUpzs.length === 0 && (
              <p className="text-[11px] text-slate-400 italic p-2 text-center font-sans">Tidak ada UPZ yang cocok</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih Opsi...',
  disabled = false,
  className
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOpt = useMemo(() => {
    return options.find(o => o.value === value);
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(o => 
      o.label.toLowerCase().includes(q) || 
      (o.sublabel && o.sublabel.toLowerCase().includes(q)) || 
      (o.value && o.value.toLowerCase().includes(q)) ||
      (o.group && o.group.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: CustomSelectOption[] } = {};
    const unGrouped: CustomSelectOption[] = [];

    filteredOptions.forEach(opt => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        unGrouped.push(opt);
      }
    });

    return { groups, unGrouped };
  }, [filteredOptions]);

  const hasGroups = Object.keys(groupedOptions.groups).length > 0;

  return (
    <div className={cn("relative font-sans text-left", disabled && "opacity-50 pointer-events-none", isOpen ? "z-[100]" : "z-10")} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full text-left text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold flex items-center justify-between gap-2 outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 min-h-[44px]",
          selectedOpt ? "text-slate-800 font-bold" : "text-slate-400 font-semibold",
          isOpen && "ring-2 ring-primary/20 border-primary/40 bg-white",
          className
        )}
      >
        <span className="flex-1 min-w-0">
          {selectedOpt ? (
            <span className="flex items-start justify-between w-full gap-2">
              <span className="font-bold text-slate-800 break-words whitespace-normal leading-snug">{selectedOpt.label}</span>
              {selectedOpt.sublabel && (
                <span className="text-[10px] text-slate-400 font-normal mt-0.5 shrink-0">{selectedOpt.sublabel}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronRight className={cn("size-4 text-slate-400 shrink-0 transition-transform duration-200 mt-0.5", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 space-y-1.5 max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box Inside Dropdown */}
          <div className="relative shrink-0 pb-1 border-b border-slate-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Cari opsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1 max-h-56 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic font-medium">
                Tidak ada opsi yang sesuai.
              </div>
            ) : !hasGroups ? (
              groupedOptions.unGrouped.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-start justify-between gap-2 cursor-pointer",
                    value === opt.value
                      ? "bg-primary/10 text-primary font-black"
                      : "hover:bg-slate-50 text-slate-700 font-semibold"
                  )}
                >
                  <span className="break-words whitespace-normal leading-snug flex-1">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[10px] text-slate-400 font-normal shrink-0 mt-0.5">{opt.sublabel}</span>
                  )}
                  {value === opt.value && <Check className="size-3.5 text-primary shrink-0 mt-0.5" />}
                </button>
              ))
            ) : (
              <>
                {groupedOptions.unGrouped.length > 0 && (
                  <div className="space-y-0.5 mb-1">
                    {groupedOptions.unGrouped.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-start justify-between gap-2 cursor-pointer",
                          value === opt.value
                            ? "bg-primary/10 text-primary font-black"
                            : "hover:bg-slate-50 text-slate-700 font-semibold"
                        )}
                      >
                        <span className="break-words whitespace-normal leading-snug flex-1">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 font-normal shrink-0 mt-0.5">{opt.sublabel}</span>
                        )}
                        {value === opt.value && <Check className="size-3.5 text-primary shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                )}
                {Object.keys(groupedOptions.groups).map((groupName) => (
                  <div key={groupName} className="space-y-0.5 my-1">
                    <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 rounded-lg">
                      {groupName}
                    </div>
                    {groupedOptions.groups[groupName].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-start justify-between gap-2 cursor-pointer",
                          value === opt.value
                            ? "bg-primary/10 text-primary font-black"
                            : "hover:bg-slate-50 text-slate-700 font-semibold"
                        )}
                      >
                        <span className="break-words whitespace-normal leading-snug flex-1">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 font-normal shrink-0 mt-0.5">{opt.sublabel}</span>
                        )}
                        {value === opt.value && <Check className="size-3.5 text-primary shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PenerimaanZis() {
  const { user: _user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [simbaFilter, setSimbaFilter] = useState('Semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [parsedMigrationRows, setParsedMigrationRows] = useState<any[]>([]);
  const [rawMigrationFileRows, setRawMigrationFileRows] = useState<any[]>([]);

  const downloadPenerimaanTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "No": 44879,
        "Kode Program": "101.1",
        "Kode Akun": "41020201",
        "Sumber Dana": "BSI-BSM",
        "Tanggal Trx": "01/06/2026",
        "No Transaksi": "01/06/26/km/1/0000002",
        "Keterangan": "Terima Zakat Maal a.n Aulia Rahman",
        "Nominal": 335000,
        "Nama Muzakki": "Aulia Rahman",
        "Nama UPZ": "UPZ Kecamatan Genuk"
      },
      {
        "No": 44880,
        "Kode Program": "102.1",
        "Kode Akun": "41020201",
        "Sumber Dana": "BSI-BSM",
        "Tanggal Trx": "02/06/2026",
        "No Transaksi": "02/06/26/km/1/0000003",
        "Keterangan": "Terima Zakat Maal via UPZ Sekretariat DPRD",
        "Nominal": 5000000,
        "Nama Muzakki": "UPZ Sekretariat DPRD",
        "Nama UPZ": "UPZ Sekretariat DPRD"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Penerimaan");
    XLSX.writeFile(wb, "Template_Migrasi_Penerimaan_ZIS.xlsx");
  };

  const parseExcelDate = (val: any, defaultToday = false): string => {
    if (val === undefined || val === null || val === '') {
      return defaultToday ? new Date().toISOString().split('T')[0] : '';
    }

    // 1. If string (e.g. "27-08-2026", "27/08/2026", "27.08.2026")
    const str = String(val).trim();
    if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
      return defaultToday ? new Date().toISOString().split('T')[0] : '';
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // DD/MM/YY or DD-MM-YY or DD.MM.YY (2-digit year)
    const dmy2DigitMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
    if (dmy2DigitMatch) {
      const day = dmy2DigitMatch[1].padStart(2, '0');
      const month = dmy2DigitMatch[2].padStart(2, '0');
      const shortYear = parseInt(dmy2DigitMatch[3], 10);
      const year = shortYear > 50 ? `19${dmy2DigitMatch[3]}` : `20${dmy2DigitMatch[3].padStart(2, '0')}`;
      return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. If number or numeric string (Excel serial code, e.g. 46261 or "46261")
    const num = typeof val === 'number' ? val : (/^\d+(\.\d+)?$/.test(str) ? parseFloat(str) : NaN);
    if (!isNaN(num) && num >= 1000 && num <= 100000) {
      const utcDays = Math.round(num - 25569);
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

    // 3. If JS Date object (fallback)
    if (val instanceof Date && !isNaN(val.getTime())) {
      const utcHours = val.getUTCHours();
      if (utcHours >= 12) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        const year = val.getUTCFullYear();
        const month = String(val.getUTCMonth() + 1).padStart(2, '0');
        const day = String(val.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    // Standard date parsing fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
      const utcHours = parsed.getUTCHours();
      if (utcHours >= 12) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return defaultToday ? new Date().toISOString().split('T')[0] : str;
  };

  const handlePenerimaanFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws);

        if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
          alert('File Excel kosong atau tidak terbaca.');
          return;
        }

        const previewList = rawRows.map((item: any, idx: number) => {
          const rawNom = item.Nominal || item.nominal || item.Jumlah || item.NOMINAL || 0;
          const nominalVal = typeof rawNom === 'string' 
            ? Number(rawNom.replace(/[^0-9.-]+/g, '')) 
            : Number(rawNom || 0);

          const rawUpzName = item['Nama UPZ'] || item.nama_upz || item['UPZ'] || item['Nama OPD / UPZ'] || item.upz || '';
          const cleanUpzStr = String(rawUpzName || '').trim();
          const invalidUpzStrings = ['-', '--', '---', 'none', 'null', 'undefined', 'n/a', 'tidak ada', 'tanpa upz', 'umum'];

          const matchedUpzObj = (!cleanUpzStr || invalidUpzStrings.includes(cleanUpzStr.toLowerCase()) || cleanUpzStr.length < 3)
            ? null
            : upzList.find((u: any) => {
                const cleanRaw = cleanUpzStr.toLowerCase().replace(/upz/gi, '').trim();
                const cleanDb = String(u.nama_upz || u.name || '').toLowerCase().replace(/upz/gi, '').trim();
                if (!cleanRaw || cleanRaw.length < 3) return false;
                return cleanDb === cleanRaw || (cleanRaw.length >= 4 && cleanDb.includes(cleanRaw)) || (cleanDb.length >= 4 && cleanRaw.includes(cleanDb));
              });

          const rawKodeProg = item['Kode Program'] || item.kode_program || item.Kode || '';
          let matchedRkatObj = null;
          if (rawKodeProg && PROGRAM_KODE_TO_RKAT_MAP[rawKodeProg]) {
            const mapInfo = PROGRAM_KODE_TO_RKAT_MAP[rawKodeProg];
            if (mapInfo.rkat_no) {
              matchedRkatObj = rkatList.find((r: any) => r.no === mapInfo.rkat_no || r.id === mapInfo.rkat_no);
            }
          }
          if (!matchedRkatObj) {
            const rawKegiatan = item['Kegiatan (RKAT)'] || item.kegiatan || item.rkat || item.nama_program || '';
            if (rawKegiatan) {
              const cleanKeg = String(rawKegiatan).toLowerCase().trim();
              matchedRkatObj = rkatList.find((r: any) => 
                (r.nama_program && r.nama_program.toLowerCase().includes(cleanKeg)) ||
                (cleanKeg.length >= 3 && r.nama_program && cleanKeg.includes(r.nama_program.toLowerCase()))
              );
            }
          }

          const rawTgl = item['Tanggal Trx'] || item.tanggal_pembayaran || item.tanggal_trx || item.Tanggal || item['Tanggal'];
          const parsedTgl = parseExcelDate(rawTgl, true);

          return {
            rowNum: item.No || item.no || (idx + 1),
            kodeProgram: rawKodeProg || '-',
            kodeAkun: item['Kode Akun'] || item.kode_akun || '-',
            sumberDana: item['Sumber Dana'] || item.sumber_dana || item.bank_account_name || '-',
            tanggalTrx: parsedTgl || '-',
            noTransaksi: item['No Transaksi'] || item.no_transaksi || item.no_kuitansi || '-',
            keterangan: item.Keterangan || item.keterangan || item.Uraian || item.uraian || item.Deskripsi || item.deskripsi || item.Catatan || item.catatan || item.Detail || item.detail || item['Keterangan Transaksi'] || item.Peruntukan || item.Rincian || '-',
            nominal: nominalVal,
            namaMuzakki: item['Nama Muzakki'] || item.nama_muzakki || item.Muzakki || item.muzakki || item.Nama || item.nama || item.Penyetor || item.penyetor || item['Nama Penyetor'] || item.Donatur || item.donatur || '-',
            namaUpz: rawUpzName || '-',
            matchedUpz: matchedUpzObj || null,
            matchedRkat: matchedRkatObj || null
          };
        });

        setRawMigrationFileRows(rawRows);
        setParsedMigrationRows(previewList);
      } catch (err) {
        console.error('Gagal membaca file Excel:', err);
        alert('Gagal membaca file Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConsolidateRowUpz = (index: number, upzId: string) => {
    const targetUpz = upzList.find(u => u.id === upzId);
    setParsedMigrationRows(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          matchedUpz: targetUpz || null,
          upz_id: upzId || null,
          namaUpz: targetUpz ? (targetUpz.nama_upz || targetUpz.name) : updated[index].namaUpz
        };
      }
      return updated;
    });

    if (rawMigrationFileRows[index]) {
      rawMigrationFileRows[index]['upz_id'] = upzId || null;
      if (targetUpz) {
        rawMigrationFileRows[index]['Nama UPZ'] = targetUpz.nama_upz || targetUpz.name;
        rawMigrationFileRows[index]['upz_nama'] = targetUpz.nama_upz || targetUpz.name;
      }
    }
  };
  void handleConsolidateRowUpz;

  const handleMapExcelUpzNameToDatabase = (rawUpzName: string, targetUpzId: string) => {
    if (!rawUpzName) return;
    const targetUpz = upzList.find(u => u.id === targetUpzId);
    const cleanRaw = rawUpzName.trim().toLowerCase();

    setParsedMigrationRows(prev => prev.map((row, idx) => {
      if (row.namaUpz && row.namaUpz.trim().toLowerCase() === cleanRaw) {
        if (rawMigrationFileRows[idx]) {
          rawMigrationFileRows[idx]['upz_id'] = targetUpzId || null;
          if (targetUpz) {
            rawMigrationFileRows[idx]['Nama UPZ'] = targetUpz.nama_upz || targetUpz.name;
            rawMigrationFileRows[idx]['upz_nama'] = targetUpz.nama_upz || targetUpz.name;
          }
        }
        return {
          ...row,
          matchedUpz: targetUpz || null,
          upz_id: targetUpzId || null,
          namaUpz: targetUpz ? (targetUpz.nama_upz || targetUpz.name) : row.namaUpz
        };
      }
      return row;
    }));
  };

  const uniqueUnmatchedUpzNames = useMemo(() => {
    if (!parsedMigrationRows || parsedMigrationRows.length === 0) return [];
    const map = new Map<string, number>();
    parsedMigrationRows.forEach(r => {
      if (r.namaUpz && r.namaUpz !== '-' && !r.matchedUpz) {
        const clean = r.namaUpz.trim();
        map.set(clean, (map.get(clean) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [parsedMigrationRows]);

  const migrationSummaryStats = useMemo(() => {
    if (!parsedMigrationRows || parsedMigrationRows.length === 0) {
      return { total: 0, validCount: 0, warningCount: 0, totalNominal: 0 };
    }

    let validCount = 0;
    let warningCount = 0;
    let totalNominal = 0;

    parsedMigrationRows.forEach(r => {
      totalNominal += Number(r.nominal || 0);
      const isUnmatchedUpz = r.namaUpz && r.namaUpz !== '-' && !r.matchedUpz;
      if (isUnmatchedUpz) {
        warningCount++;
      } else {
        validCount++;
      }
    });

    return {
      total: parsedMigrationRows.length,
      validCount,
      warningCount,
      totalNominal
    };
  }, [parsedMigrationRows]);

  const handleProcessMigrationSubmit = async () => {
    if (!rawMigrationFileRows || rawMigrationFileRows.length === 0) {
      alert('Belum ada data file yang dibaca.');
      return;
    }

    setMigrating(true);
    try {
      const updatedTransactions = rawMigrationFileRows.map((rawItem, idx) => {
        const parsedRow = parsedMigrationRows[idx];
        if (parsedRow) {
          return {
            ...rawItem,
            upz_id: parsedRow.upz_id || (parsedRow.matchedUpz ? parsedRow.matchedUpz.id : rawItem.upz_id),
            nama_upz: parsedRow.matchedUpz ? (parsedRow.matchedUpz.nama_upz || parsedRow.matchedUpz.name) : (parsedRow.namaUpz || rawItem.nama_upz),
            rkat_id: parsedRow.matchedRkat ? parsedRow.matchedRkat.id : rawItem.rkat_id
          };
        }
        return rawItem;
      });

      const res = await axios.post('/api/penerimaan-zis/migrate', {
        transactions: updatedTransactions,
        options: { skipJournal: false }
      });

      if (res.data?.status === 'success') {
        const succ = res.data.successCount ?? res.data.summary?.success ?? res.data.summary?.successCount ?? 0;
        const fail = res.data.failedCount ?? res.data.summary?.failed ?? res.data.summary?.failedCount ?? 0;
        const errorsList = res.data.errors || res.data.summary?.errors || [];
        
        let msg = `Migrasi Data Penerimaan ZIS Selesai!\nTotal Berhasil: ${succ} Transaksi\nGagal: ${fail} Transaksi`;
        if (Array.isArray(errorsList) && errorsList.length > 0) {
          msg += `\n\nRincian Gagal:\n` + errorsList.map((e: any) => `- Baris ${e.rowNum || e.row}: ${e.error}`).join('\n');
        }
        alert(msg);

        setIsMigrationModalOpen(false);
        setParsedMigrationRows([]);
        setRawMigrationFileRows([]);
        fetchData();
      } else {
        alert('Migrasi selesai dengan beberapa catatan.');
      }
    } catch (err: any) {
      console.error('Gagal migrasi Excel:', err);
      alert(err.response?.data?.error || 'Gagal memproses migrasi data Penerimaan ZIS.');
    } finally {
      setMigrating(false);
    }
  };

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'simba-queue'>('all');
  const [selectedSimbaIds, setSelectedSimbaIds] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isBulkSimbaModalOpen, setIsBulkSimbaModalOpen] = useState(false);
  const [bulkSimbaStartNo, setBulkSimbaStartNo] = useState('');
  const [isSavingBulkSimba, setIsSavingBulkSimba] = useState(false);
  const [npwzModalOpen, setNpwzModalOpen] = useState(false);
  const [selectedMuzakkiForNpwz, setSelectedMuzakkiForNpwz] = useState<any>(null);
  const [newNpwzValue, setNewNpwzValue] = useState('');
  const [isSimbaPromptOpen, setIsSimbaPromptOpen] = useState(false);
  const [promptSimbaItem, setPromptSimbaItem] = useState<any>(null);
  const [promptSimbaValue, setPromptSimbaValue] = useState('');

  // States for Cetak Laporan Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [pdfReportDate, setPdfReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<any[]>([]);
  const [signatories, setSignatories] = useState({
    kabagKeuangan: '',
    kabidPengumpulan: '',
    stafPengumpulan: ''
  });
  
  const [selectedData, setSelectedData] = useState<any>(null);
  
  const [penerimaanData, setPenerimaanData] = useState<any[]>([]);
  const [muzakkiList, setMuzakkiList] = useState<any[]>([]);
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  // Pagination & Debounced Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kodeProgramFilter, setKodeProgramFilter] = useState('Semua');
  const [rkatFilter, setRkatFilter] = useState('Semua');
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [summaryTotals, setSummaryTotals] = useState<{ 
    totalTransactions: number; 
    totalNominal: number; 
    totalZakat?: number; 
    totalInfak?: number; 
    totalDskl?: number; 
  }>({ totalTransactions: 0, totalNominal: 0, totalZakat: 0, totalInfak: 0, totalDskl: 0 });

  // Form State
  const [selectedMuzakkiId, setSelectedMuzakkiId] = useState('');
  const [selectedRkatId, setSelectedRkatId] = useState('');
  const [selectedCoaCode, setSelectedCoaCode] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState('TRANSFER');
  const [tanggalPembayaran, setTanggalPembayaran] = useState(new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState('');
  const [noKuitansi, setNoKuitansi] = useState('');
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [showMuzakkiDropdown, setShowMuzakkiDropdown] = useState(false);
  const [isOutsideRkat, setIsOutsideRkat] = useState(false);
  const [noTransaksiSimba, setNoTransaksiSimba] = useState('');
  const [selectedKodeProgram, setSelectedKodeProgram] = useState('');
  const [selectedUpzId, setSelectedUpzId] = useState('');
  const [upzList, setUpzList] = useState<any[]>([]);

  // Laporan Bulanan Rekap ZIS State
  const [bulananReportMonth, setBulananReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulananReportYear, setBulananReportYear] = useState<number>(new Date().getFullYear());
  const [bulananReportSignDate, setBulananReportSignDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isFetchingRekap, setIsFetchingRekap] = useState(false);
  const [rekapBulananCategories, setRekapBulananCategories] = useState<Record<string, any[]>>({});
  const [rekapBulananUmumItems, setRekapBulananUmumItems] = useState<any[]>([]);
  const [signatoriesBulanan, setSignatoriesBulanan] = useState({
    kepalaPelaksana: 'Muhammad Asyhar, S.Sos.I',
    kabagPengumpulan: 'Ahmad Muhtadin, S.HI',
    waka1: 'Drs. H. Labib, M.M'
  });
  const [selectedReportType, setSelectedReportType] = useState<'harian' | 'bulanan_upz' | 'excel'>('harian');

  // Quick register muzakki inside modal
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickHandphone, setQuickHandphone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickKategori, setQuickKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickJenisKelamin, setQuickJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [isFabOpen, setIsFabOpen] = useState(false);

  const kodeProgramOptions: CustomSelectOption[] = useMemo(() => [
    { value: '101.1', label: '101.1 || Zakat Maal Perorangan', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.2', label: '101.2 || Penerimaan Zakat Fitrah Perorangan', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.3', label: '101.3 || CSR/PKBL', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.4', label: '101.4 || Qurban', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.5', label: '101.5 || Fidyah Perorangan', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.8', label: '101.8 || Penerimaan Infak/Sedekah Tidak Terikat', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.9', label: '101.9 || Penerimaan Infak Sedekah Terikat Kas', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.10', label: '101.10 || Penerimaan Infak Sedekah Terikat Natura', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.11', label: '101.11 || Infak/Sedekah Terikat Operasional Amil', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.12', label: '101.12 || Infak dan Sedekah Terikat DSK Lainnya', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.13', label: '101.13 || Zakat Maal Entitas', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '101.14', label: '101.14 || Belum Diketahui', group: '101.x - Penghimpunan Dana Langsung' },
    { value: '102.1', label: '102.1 || Zakat Maal UPZ Kota (UPZ Pengumpulan)', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.2', label: '102.2 || Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.3', label: '102.3 || Zakat Maal UPZ Penyaluran', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.4', label: '102.4 || Penerimaan Zakat Fitrah via UPZ', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.5', label: '102.5 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.6', label: '102.6 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.7', label: '102.7 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.7.1', label: '102.7.1 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Penyaluran', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.8', label: '102.8 || Qurban Via UPZ', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.9', label: '102.9 || Fidyah Via UPZ', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.10', label: '102.10 || DSKL Lainnya Via UPZ', group: '102.x - Penghimpunan Dana via UPZ' },
    { value: '102.11', label: '102.11 || Zakat Maal UPZ Pengumpulan', group: '102.x - Penghimpunan Dana via UPZ' }
  ], []);

  const rkatSelectOptions: CustomSelectOption[] = useMemo(() => {
    return rkatList.map(rkat => ({
      value: rkat.id,
      label: `[${rkat.kategori}] ${rkat.nama_program}`
    }));
  }, [rkatList]);

  const rkatCoaOptions: CustomSelectOption[] = useMemo(() => {
    const rkat = rkatList.find(r => r.id === selectedRkatId || r.no === String(selectedRkatId));
    const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    
    const allCodes = [...codes];
    if (selectedCoaCode && !allCodes.includes(selectedCoaCode)) {
      allCodes.push(selectedCoaCode);
    }

    return allCodes.map((code: string) => {
      const coa = coaList.find(c => c.coa_code === code);
      const label = coa ? `${code} - ${coa.nama_akun}` : `${code} - Penerimaan ${rkat?.nama_program || ''}`;
      return { value: code, label };
    });
  }, [rkatList, selectedRkatId, coaList, selectedCoaCode]);

  const coaListOptions: CustomSelectOption[] = useMemo(() => {
    return coaList.map(c => ({
      value: c.coa_code,
      label: `${c.coa_code} - ${c.nama_akun}`
    }));
  }, [coaList]);

  const bankAccountOptions: CustomSelectOption[] = useMemo(() => {
    const opts: CustomSelectOption[] = [];
    if (!accountsList.some(acc => acc.account_id === 'non_kas')) {
      opts.push({ value: 'non_kas', label: 'Non Kas' });
    }
    accountsList.forEach(acc => {
      const isNonKas = acc.account_id === 'non_kas';
      opts.push({
        value: acc.account_id,
        label: acc.nama_akun,
        sublabel: !isNonKas ? `Saldo: Rp ${Number(acc.saldo).toLocaleString('id-ID')}` : undefined
      });
    });
    return opts;
  }, [accountsList]);

  const metodePembayaranOptions: CustomSelectOption[] = useMemo(() => [
    { value: 'TRANSFER', label: 'Transfer Bank' },
    { value: 'TUNAI', label: 'Kas Tunai' },
    { value: 'QRIS', label: 'QRIS' },
    { value: 'NON_KAS', label: 'Non Kas' }
  ], []);

  useEffect(() => {
    fetchData();
    fetchMetadata();

    const stored = localStorage.getItem('selected_muzakki_penerimaan');
    if (stored) {
      try {
        const muz = JSON.parse(stored);
        setSelectedMuzakkiId(muz.id);
        setMuzakkiSearch(muz.nama);
        setIsModalOpen(true);
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem('selected_muzakki_penerimaan');
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    if (isReportModalOpen) {
      axios.get('/api/users')
        .then(res => {
          const uList = res.data || [];
          setUsers(uList);
          
          const kkUser = uList.find((u: any) => u.role === 'Kabag_Keuangan') || uList.find((u: any) => u.role === 'Staf_Keuangan' || u.role === 'Kabag_Administrasi');
          const kpUser = uList.find((u: any) => u.role === 'Kabag_Pengumpulan');
          const spUser = uList.find((u: any) => u.role === 'Staf_Pengumpulan');
          
          setSignatories({
            kabagKeuangan: kkUser ? kkUser.name : '',
            kabidPengumpulan: kpUser ? kpUser.name : '',
            stafPengumpulan: spUser ? spUser.name : ''
          });

          // Auto-fill Laporan Bulanan Rekap ZIS Signatories
          const kepalaUser = uList.find((u: any) => {
            const r = (u.role || '').toLowerCase();
            const n = (u.name || '').toLowerCase();
            return r.includes('kepala') || r.includes('pelaksana') || n.includes('asyhar') || n.includes('kepala');
          });

          const kabagUser = uList.find((u: any) => {
            const r = (u.role || '').toLowerCase();
            const n = (u.name || '').toLowerCase();
            return r.includes('kabid') || r.includes('kabag') || r.includes('pengumpulan') || n.includes('muhtadin') || n.includes('pengumpulan');
          });

          const wakaUser = uList.find((u: any) => {
            const r = (u.role || '').toLowerCase();
            const n = (u.name || '').toLowerCase();
            return r.includes('waka') || r.includes('wakil') || n.includes('labib') || n.includes('waka');
          });

          setSignatoriesBulanan(prev => ({
            kepalaPelaksana: kepalaUser ? kepalaUser.name : (prev.kepalaPelaksana || 'Muhammad Asyhar, S.Sos.I'),
            kabagPengumpulan: kabagUser ? kabagUser.name : (prev.kabagPengumpulan || 'Ahmad Muhtadin, S.HI'),
            waka1: wakaUser ? wakaUser.name : (prev.waka1 || 'Drs. H. Labib, M.M')
          }));
        })
        .catch(err => console.error('Error fetching users:', err));
    }
  }, [isReportModalOpen]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [mainFilterStartDate, setMainFilterStartDate] = useState('');
  const [mainFilterEndDate, setMainFilterEndDate] = useState('');
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<number | 'all'>('all');
  const [selectedFilterYear, setSelectedFilterYear] = useState<number>(new Date().getFullYear());

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (kodeProgramFilter !== 'Semua') count++;
    if (rkatFilter !== 'Semua') count++;
    if (simbaFilter !== 'Semua') count++;
    if (selectedFilterMonth !== 'all' && selectedFilterYear !== new Date().getFullYear()) count++;
    return count;
  }, [kodeProgramFilter, rkatFilter, simbaFilter, selectedFilterMonth, selectedFilterYear]);

  const handleMonthFilterChange = (m: number | 'all') => {
    setSelectedFilterMonth(m);
    setCurrentPage(1);
    if (m === 'all') {
      setMainFilterStartDate('');
      setMainFilterEndDate('');
    } else {
      const y = selectedFilterYear;
      const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setMainFilterStartDate(startStr);
      setMainFilterEndDate(endStr);
    }
  };

  const handleYearFilterChange = (y: number) => {
    setSelectedFilterYear(y);
    setCurrentPage(1);
    if (selectedFilterMonth !== 'all') {
      const m = selectedFilterMonth;
      const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setMainFilterStartDate(startStr);
      setMainFilterEndDate(endStr);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/penerimaan-zis', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          startDate: mainFilterStartDate || undefined,
          endDate: mainFilterEndDate || undefined,
          kodeProgram: kodeProgramFilter !== 'Semua' ? kodeProgramFilter : undefined,
          rkatId: rkatFilter !== 'Semua' ? rkatFilter : undefined,
          statusSimba: activeTab === 'simba-queue' ? 'PENDING' : (simbaFilter !== 'Semua' ? simbaFilter : undefined)
        }
      });
      if (res.data?.status === 'success') {
        setPenerimaanData(res.data.data || []);
        if (res.data.pagination) setPaginationInfo(res.data.pagination);
        if (res.data.summary) setSummaryTotals(res.data.summary);
      }
    } catch (error) {
      console.error(error);
      setMessages([{ type: 'error', text: 'Gagal memuat data Penerimaan ZIS.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, debouncedSearch, mainFilterStartDate, mainFilterEndDate, kodeProgramFilter, rkatFilter, activeTab, simbaFilter]);

  // Auto-refetch data when window/tab regains focus (1 minute cooldown & disabled when active input/modal open)
  useWindowFocusRefetch(
    fetchData, 
    60000, 
    !isModalOpen && !isMigrationModalOpen && !isBulkSimbaModalOpen && selectedSimbaIds.length === 0
  );

  const fetchMetadata = async () => {
    try {
      const [resMuzakki, resRkat, resAccounts, resCoas, resUpz] = await Promise.all([
        axios.get('/api/muzakki'),
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa'),
        axios.get('/api/upz').catch(() => ({ data: [] }))
      ]);
      
      if (resMuzakki.data?.status === 'success') {
        setMuzakkiList(resMuzakki.data.data || []);
      } else {
        setMuzakkiList(Array.isArray(resMuzakki.data) ? resMuzakki.data : []);
      }

      const rkatData = resRkat.data?.status === 'success' ? resRkat.data.data : resRkat.data;
      setRkatList(Array.isArray(rkatData) ? rkatData : []);

      const accountsData = resAccounts.data?.status === 'success' ? resAccounts.data.data : resAccounts.data;
      setAccountsList(Array.isArray(accountsData) ? accountsData : []);

      const coaData = resCoas.data?.status === 'success' ? resCoas.data.data : resCoas.data;
      setCoaList(Array.isArray(coaData) ? coaData : []);

      const upzData = resUpz?.data?.status === 'success' ? resUpz.data.data : (resUpz?.data || []);
      setUpzList(Array.isArray(upzData) ? upzData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpzChange = (upzId: string) => {
    setSelectedUpzId(upzId);
    if (!upzId) return;

    const upzItem = upzList.find(u => u.id === upzId);
    if (!upzItem) return;

    const nama = upzItem.nama_upz.toUpperCase();
    let suggestedKode = '102.1';

    if (nama.includes('KECAMATAN')) {
      suggestedKode = '102.2';
    } else if (nama.includes('SD') || nama.includes('SMP') || nama.includes('SMA') || nama.includes('MI') || nama.includes('MTS') || nama.includes('MAN') || nama.includes('SEKOLAH')) {
      suggestedKode = '102.7';
    }

    setSelectedKodeProgram(suggestedKode);

    const mapInfo = PROGRAM_KODE_TO_RKAT_MAP[suggestedKode];
    if (mapInfo && mapInfo.rkat_no) {
      const matchedRkat = rkatList.find(r => r.no === mapInfo.rkat_no || r.id === mapInfo.rkat_no);
      if (matchedRkat) {
        handleRkatChange(matchedRkat.id);
      }
    }
  };

  const handleRkatChange = (rkatId: string) => {
    setSelectedRkatId(rkatId);
    const rkat = rkatList.find(r => r.id === rkatId || r.no === String(rkatId));
    const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    if (codes.length > 0) {
      if (!selectedCoaCode || !codes.includes(selectedCoaCode)) {
        setSelectedCoaCode(codes[0]);
      }
    } else if (!selectedCoaCode) {
      setSelectedCoaCode('');
    }

    if (rkat && !selectedKodeProgram) {
      const foundKode = Object.keys(PROGRAM_KODE_TO_RKAT_MAP).find(
        k => PROGRAM_KODE_TO_RKAT_MAP[k].rkat_no === rkat.no
      );
      if (foundKode) {
        setSelectedKodeProgram(foundKode);
      }
    }
  };

  const filteredData = useMemo(() => {
    return penerimaanData.filter(item => {
      // Explicitly exclude records with status FAILED or associated Gagal Potong keywords
      const isFailed = item.status_simba === 'FAILED';
      const nk = (item.no_kuitansi || '').toLowerCase();
      const k = (item.keterangan || '').toLowerCase();
      const isGagalPotong = 
        isFailed ||
        nk.includes('/ gagal /') || nk.includes('gagal potong') ||
        k.includes('gagal potong') || k.includes('failed_deduction');
      
      if (isGagalPotong) return false;

      const cleanSearch = searchTerm.trim().toLowerCase();

      const matchesSearch = 
        !cleanSearch ||
        (item.no_kuitansi && item.no_kuitansi.toLowerCase().includes(cleanSearch)) ||
        (item.muzakki?.nama && item.muzakki.nama.toLowerCase().includes(cleanSearch)) ||
        (item.muzakki?.npwz && item.muzakki.npwz.toLowerCase().includes(cleanSearch)) ||
        (item.muzakki?.upz && item.muzakki.upz.toLowerCase().includes(cleanSearch)) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(cleanSearch)) ||
        (item.rkat?.nama_program && item.rkat.nama_program.toLowerCase().includes(cleanSearch)) ||
        (item.jenis_program && item.jenis_program.toLowerCase().includes(cleanSearch)) ||
        (item.upz?.nama_upz && item.upz.nama_upz.toLowerCase().includes(cleanSearch));
      
      const matchesCategory = categoryFilter === 'Semua' || item.rkat?.kategori === categoryFilter;
      const matchesSimba = activeTab === 'simba-queue' 
        ? item.status_simba === 'PENDING'
        : (simbaFilter === 'Semua' || item.status_simba === simbaFilter);

      const matchesKodeProgram = kodeProgramFilter === 'Semua' || item.kode_program === kodeProgramFilter;

      const matchesRkat = rkatFilter === 'Semua' || 
        item.rkat_id === rkatFilter || 
        item.rkat?.id === rkatFilter || 
        item.rkat?.no === rkatFilter || 
        (item.kode_program && PROGRAM_KODE_TO_RKAT_MAP[item.kode_program]?.rkat_no === rkatFilter);

      return matchesSearch && matchesCategory && matchesSimba && matchesKodeProgram && matchesRkat;
    });
  }, [penerimaanData, searchTerm, categoryFilter, simbaFilter, activeTab, kodeProgramFilter, rkatFilter]);

  // Calculations for stats: Prioritize server-wide summaryTotals from backend when search/filtering
  const stats = useMemo(() => {
    if (summaryTotals && summaryTotals.totalNominal > 0) {
      return {
        total: summaryTotals.totalNominal,
        count: summaryTotals.totalTransactions,
        zakat: summaryTotals.totalZakat || 0,
        infak: summaryTotals.totalInfak || 0,
        dskl: summaryTotals.totalDskl || 0
      };
    }

    let total = 0;
    let count = filteredData.length;
    let zakat = 0;
    let infak = 0;
    let dskl = 0;

    filteredData.forEach(item => {
      const nominalVal = Number(item.nominal || 0);
      total += nominalVal;
      const cat = item.rkat?.kategori || (item.jenis_program?.toLowerCase().includes('zakat') ? 'Zakat' : item.jenis_program?.toLowerCase().includes('infak') ? 'Infak' : 'Infak/Sedekah');
      if (cat.toLowerCase().includes('zakat')) zakat += nominalVal;
      else if (cat.toLowerCase().includes('infak')) infak += nominalVal;
      else dskl += nominalVal;
    });

    return { total, count, zakat, infak, dskl };
  }, [summaryTotals, filteredData]);

  const handleDownloadBulananExcel = async () => {
    setIsFetchingRekap(true);
    try {
      let categories = rekapBulananCategories;
      let umumItems = rekapBulananUmumItems;

      const res = await axios.get('/api/penerimaan-zis/rekap-bulanan', {
        params: { month: bulananReportMonth, year: bulananReportYear }
      });
      categories = res.data?.categories || {};
      umumItems = res.data?.umumItems || [];
      setRekapBulananCategories(categories);
      setRekapBulananUmumItems(umumItems);

      const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const monthStr = monthNames[bulananReportMonth - 1] || 'ALL';

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap ZIS Bulanan');

      worksheet.columns = [
        { width: 8 },  // A: NO
        { width: 48 }, // B: NAMA UPZ
        { width: 24 }, // C: ZAKAT
        { width: 24 }, // D: INFAK
        { width: 26 }  // E: JUMLAH ZIS
      ];

      // Title Header
      worksheet.mergeCells('A1:E1');
      const r1 = worksheet.getCell('A1');
      r1.value = 'REKAPITULASI PENERIMAAN ZAKAT, INFAK, SEDEKAH (ZIS)';
      r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF064E3B' } };
      r1.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A2:E2');
      const r2 = worksheet.getCell('A2');
      r2.value = 'BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG';
      r2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F766E' } };
      r2.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A3:E3');
      const r3 = worksheet.getCell('A3');
      r3.value = `PERIODE ${monthStr.toUpperCase()} ${bulananReportYear}`;
      r3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };
      r3.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]); // Blank Row 4

      // Table Header Row (Row 5)
      const headerRow = worksheet.addRow(['NO', 'NAMA UPZ', 'ZAKAT', 'INFAK', 'JUMLAH ZIS']);
      headerRow.height = 28;
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F766E' } // Dark Teal Fill
        };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White bold font
        cell.alignment = {
          horizontal: colNumber === 1 ? 'center' : colNumber === 2 ? 'left' : 'right',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF064E3B' } },
          bottom: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF064E3B' } },
          left: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FF14B8A6' } },
          right: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FF14B8A6' } }
        };
      });

      let upzKotaZakat = 0;
      let upzKotaInfak = 0;
      let upzKotaTotal = 0;

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFE2E8F0' } }
      };

      Object.entries(categories).forEach(([catName, items]: [string, any]) => {
        const catRow = worksheet.addRow([catName.toUpperCase(), '', '', '', '']);
        catRow.height = 24;
        worksheet.mergeCells(`A${catRow.number}:E${catRow.number}`);
        const catCell = catRow.getCell(1);
        catCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' } // Emerald Tint Fill
        };
        catCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF065F46' } };
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.border = {
          top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFA7F3D0' } },
          bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFA7F3D0' } }
        };

        let catZakat = 0;
        let catInfak = 0;
        let catTotal = 0;

        items.forEach((it: any, idx: number) => {
          const z = Number(it.zakat || 0);
          const i = Number(it.infak || 0);
          const t = z + i;
          catZakat += z;
          catInfak += i;
          catTotal += t;

          const dataRow = worksheet.addRow([
            idx + 1,
            it.nama_upz || '-',
            z,
            i,
            t
          ]);
          dataRow.height = 20;

          dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
          dataRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true };

          [3, 4, 5].forEach(colIdx => {
            const c = dataRow.getCell(colIdx);
            c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.font = { name: 'Calibri', size: 10 };
          });

          [1, 2, 3, 4, 5].forEach(colIdx => {
            dataRow.getCell(colIdx).border = thinBorder;
          });
        });

        upzKotaZakat += catZakat;
        upzKotaInfak += catInfak;
        upzKotaTotal += catTotal;

        const subtotalRow = worksheet.addRow(['', 'JUMLAH', catZakat, catInfak, catTotal]);
        subtotalRow.height = 22;
        subtotalRow.eachCell((c, colIdx) => {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' }
          };
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
          if (colIdx >= 3) {
            c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          c.border = {
            top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFA7F3D0' } },
            bottom: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF047857' } }
          };
        });
      });

      // Total UPZ Kota Row
      const totalUpzRow = worksheet.addRow(['', 'TOTAL PENERIMAAN ZIS (UPZ KOTA)', upzKotaZakat, upzKotaInfak, upzKotaTotal]);
      totalUpzRow.height = 25;
      worksheet.mergeCells(`A${totalUpzRow.number}:B${totalUpzRow.number}`);
      totalUpzRow.eachCell((c, colIdx) => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFBF1' }
        };
        c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F766E' } };
        if (colIdx >= 3) {
          c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
          c.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          c.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        c.border = {
          top: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF0F766E' } },
          bottom: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF0F766E' } }
        };
      });

      // Penerimaan ZIS Umum
      let umumZakat = 0;
      let umumInfak = 0;
      let umumTotal = 0;

      if (Array.isArray(umumItems) && umumItems.length > 0) {
        const umumCatRow = worksheet.addRow(['PENERIMAAN ZIS UMUM', '', '', '', '']);
        umumCatRow.height = 24;
        worksheet.mergeCells(`A${umumCatRow.number}:E${umumCatRow.number}`);
        const uCell = umumCatRow.getCell(1);
        uCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0F2FE' }
        };
        uCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0369A1' } };
        uCell.alignment = { horizontal: 'left', vertical: 'middle' };
        uCell.border = {
          top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFBAE6FD' } },
          bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFBAE6FD' } }
        };

        umumItems.forEach((it: any, idx: number) => {
          const z = Number(it.zakat || 0);
          const i = Number(it.infak || 0);
          const t = z + i;
          umumZakat += z;
          umumInfak += i;
          umumTotal += t;

          const dataRow = worksheet.addRow([
            idx + 1,
            it.nama_upz || 'Muzakki Umum / Perorangan',
            z,
            i,
            t
          ]);
          dataRow.height = 20;

          dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
          dataRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true };

          [3, 4, 5].forEach(colIdx => {
            const c = dataRow.getCell(colIdx);
            c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.font = { name: 'Calibri', size: 10 };
          });

          [1, 2, 3, 4, 5].forEach(colIdx => {
            dataRow.getCell(colIdx).border = thinBorder;
          });
        });

        umumTotal = umumZakat + umumInfak;
        const subtotalUmum = worksheet.addRow(['', 'JUMLAH', umumZakat, umumInfak, umumTotal]);
        subtotalUmum.height = 22;
        subtotalUmum.eachCell((c, colIdx) => {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F9FF' }
          };
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
          if (colIdx >= 3) {
            c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          c.border = {
            top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFBAE6FD' } },
            bottom: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF0369A1' } }
          };
        });
      }

      // Grand Total Row
      const grandZakat = upzKotaZakat + umumZakat;
      const grandInfak = upzKotaInfak + umumInfak;
      const grandTotal = upzKotaTotal + umumTotal;

      const grandRow = worksheet.addRow(['', 'TOTAL PENERIMAAN ZIS', grandZakat, grandInfak, grandTotal]);
      grandRow.height = 28;
      worksheet.mergeCells(`A${grandRow.number}:B${grandRow.number}`);
      grandRow.eachCell((c, colIdx) => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF047857' }
        };
        c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        if (colIdx >= 3) {
          c.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
          c.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          c.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        c.border = {
          top: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF064E3B' } },
          bottom: { style: 'medium' as ExcelJS.BorderStyle, color: { argb: 'FF064E3B' } }
        };
      });

      worksheet.addRow([]);
      worksheet.addRow([]);

      // Signatures Block
      const dateRow = worksheet.addRow(['', '', '', `Semarang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, '']);
      dateRow.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
      dateRow.getCell(4).alignment = { horizontal: 'center' };

      const titleRow = worksheet.addRow(['Kepala Pelaksana', '', 'Kepala Bagian Pengumpulan', '', 'Wakil I Bidang Pengumpulan']);
      titleRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      titleRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      titleRow.getCell(3).alignment = { horizontal: 'center' };
      titleRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
      titleRow.getCell(5).alignment = { horizontal: 'center' };

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      const nameRow = worksheet.addRow([
        signatoriesBulanan.kepalaPelaksana || 'Kepala Pelaksana',
        '',
        signatoriesBulanan.kabagPengumpulan || 'Kabag Pengumpulan',
        '',
        signatoriesBulanan.waka1 || 'Waka I Bidang Pengumpulan'
      ]);
      nameRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      nameRow.getCell(1).alignment = { horizontal: 'center' };
      nameRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      nameRow.getCell(3).alignment = { horizontal: 'center' };
      nameRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      nameRow.getCell(5).alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_Bulanan_Rekap_ZIS_${monthStr}_${bulananReportYear}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      setMessages([{ type: 'success', text: `Laporan Bulanan Rekap ZIS (${monthStr} ${bulananReportYear}) berhasil diunduh (Excel Premium Berwarna)!` }]);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh Laporan Bulanan Excel.');
    } finally {
      setIsFetchingRekap(false);
    }
  };

  const handleQuickRegisterMuzakki = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickNama || !quickAddress || !quickHandphone) {
      alert('Nama, Handphone/Telepon, dan Alamat wajib diisi');
      return;
    }

    try {
      const payload: any = {
        kategori: quickKategori,
        nama: quickNama,
        alamat: quickAddress,
        telepon: quickHandphone,
        status: 'Aktif'
      };

      if (quickKategori === 'Perorangan') {
        payload.nik = quickNik && quickNik.trim() ? quickNik.trim() : null;
        payload.handphone = quickHandphone;
        payload.jenis_kelamin = quickJenisKelamin;
      } else {
        payload.cp_nama = quickNama;
        payload.cp_telepon = quickHandphone;
      }

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        const newMuzakki = res.data.data;
        setMuzakkiList(prev => [newMuzakki, ...prev]);
        setSelectedMuzakkiId(newMuzakki.id);
        setMuzakkiSearch(newMuzakki.nama);
        setShowQuickRegister(false);
        setQuickNama('');
        setQuickNik('');
        setQuickHandphone('');
        setQuickAddress('');
        setQuickJenisKelamin('Laki-laki');
        setMessages([{ type: 'success', text: `Muzakki ${newMuzakki.nama} berhasil diregistrasi secara instan!` }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal meregistrasi Muzakki baru');
    }
  };

  const handleAddPenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMuzakkiId) {
      alert('Mohon pilih Muzakki terlebih dahulu.');
      return;
    }
    const needsRkat = !isOutsideRkat;
    if (needsRkat && !selectedRkatId) {
      alert('Mohon pilih program RKAT Pengumpulan.');
      return;
    }
    if (!selectedCoaCode) {
      alert('Mohon pilih Program Kegiatan (COA) / Akun Buku Besar.');
      return;
    }
    if (!selectedAccountId) {
      alert('Mohon pilih Rekening Penerima.');
      return;
    }
    const parsedNominal = Number(String(nominal || '').replace(/[^0-9]/g, ''));
    if (!nominal || parsedNominal <= 0) {
      alert('Mohon isi nominal setoran dengan benar.');
      return;
    }

    setIsLoading(true);
    try {
      let finalKodeProgram = selectedKodeProgram || null;
      if (!finalKodeProgram && selectedRkatId) {
        const rkatObj = rkatList.find(r => r.id === selectedRkatId || r.no === String(selectedRkatId));
        if (rkatObj) {
          const found = Object.keys(PROGRAM_KODE_TO_RKAT_MAP).find(k => PROGRAM_KODE_TO_RKAT_MAP[k].rkat_no === rkatObj.no);
          if (found) finalKodeProgram = found;
        }
      }

      const finalJenisProgram = finalKodeProgram && PROGRAM_KODE_TO_RKAT_MAP[finalKodeProgram]
        ? PROGRAM_KODE_TO_RKAT_MAP[finalKodeProgram].jenis
        : null;

      const payload = {
        no_kuitansi: noKuitansi,
        muzakki_id: selectedMuzakkiId,
        upz_id: selectedUpzId || null,
        rkat_id: needsRkat ? selectedRkatId : null,
        kode_program: finalKodeProgram,
        jenis_program: finalJenisProgram,
        bank_account_id: selectedAccountId,
        coa_code: selectedCoaCode,
        nominal: parsedNominal,
        metode_pembayaran: metodePembayaran,
        tanggal_pembayaran: tanggalPembayaran,
        no_transaksi_simba: noTransaksiSimba || null,
        keterangan
      };

      const res = editingId 
        ? await axios.put(`/api/penerimaan-zis/${editingId}`, payload)
        : await axios.post('/api/penerimaan-zis', payload);

      if (res.data?.status === 'success' || res.status === 200 || res.status === 201 || res.data?.success) {
        setIsModalOpen(false);
        resetForm();
        fetchData();
        setMessages([{ 
          type: 'success', 
          text: editingId 
            ? 'Transaksi Penerimaan ZIS berhasil diperbarui!' 
            : 'Transaksi Penerimaan ZIS berhasil dicatat & Jurnal Keuangan terbentuk otomatis!' 
        }]);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Gagal menyimpan transaksi.';
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setSelectedMuzakkiId(item.muzakki_id);
    setMuzakkiSearch(item.muzakki?.nama || '');

    const rkatId = item.rkat_id || '';
    setSelectedRkatId(rkatId);

    // Auto-populate Kode Program and UPZ ID
    let initialKode = item.kode_program || '';
    if (!initialKode && rkatId) {
      const rkatObj = rkatList.find(r => r.id === rkatId || r.no === String(rkatId));
      if (rkatObj) {
        const found = Object.keys(PROGRAM_KODE_TO_RKAT_MAP).find(k => PROGRAM_KODE_TO_RKAT_MAP[k].rkat_no === rkatObj.no);
        if (found) initialKode = found;
      }
    }
    setSelectedKodeProgram(initialKode);
    setSelectedUpzId(item.upz_id || '');

    // Resolve COA code with fallback hierarchy
    let initialCoa = item.coa_code || '';
    if (!initialCoa && rkatId) {
      const rkatObj = rkatList.find(r => r.id === rkatId || r.no === String(rkatId));
      if (rkatObj?.coa_codes) {
        initialCoa = rkatObj.coa_codes.split(',')[0].trim();
      }
    }
    if (!initialCoa && initialKode && PROGRAM_KODE_TO_RKAT_MAP[initialKode]) {
      const rNo = PROGRAM_KODE_TO_RKAT_MAP[initialKode].rkat_no;
      const rkatObj = rkatList.find(r => r.no === rNo || r.id === rNo);
      if (rkatObj?.coa_codes) {
        initialCoa = rkatObj.coa_codes.split(',')[0].trim();
      }
    }
    setSelectedCoaCode(initialCoa);
    setSelectedAccountId(item.bank_account_id);
    setNominal(String(item.nominal || ''));
    setMetodePembayaran(item.metode_pembayaran || 'TRANSFER');
    if (item.tanggal_pembayaran) {
      setTanggalPembayaran(new Date(item.tanggal_pembayaran).toISOString().split('T')[0]);
    }
    setKeterangan(item.keterangan || '');
    setNoKuitansi(item.no_kuitansi || '');
    setNoTransaksiSimba(item.no_transaksi_simba || '');
    setIsOutsideRkat(!rkatId);
    setIsModalOpen(true);
  };

  const handleOpenNpwzModal = (muzakki: any) => {
    setSelectedMuzakkiForNpwz(muzakki);
    setNewNpwzValue(muzakki?.npwz || '');
    setNpwzModalOpen(true);
  };

  const handleSaveNpwz = async () => {
    if (!newNpwzValue.trim()) {
      alert('NPWZ tidak boleh kosong.');
      return;
    }
    try {
      const res = await axios.put(`/api/muzakki/${selectedMuzakkiForNpwz.id}`, {
        npwz: newNpwzValue
      });
      if (res.data.status === 'success') {
        setMessages([{ type: 'success', text: `NPWZ Muzakki ${selectedMuzakkiForNpwz.nama} berhasil diregistrasi!` }]);
        setNpwzModalOpen(false);
        fetchData();
        fetchMetadata();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menyimpan NPWZ.');
    }
  };

  const handleSaveSimbaNo = async () => {
    if (!promptSimbaValue.trim()) {
      alert('No Transaksi SIMBA wajib diisi untuk mengubah status menjadi SYNCED!');
      return;
    }

    try {
      const res = await axios.patch(`/api/penerimaan-zis/${promptSimbaItem.id}/simba`, {
        status_simba: 'SYNCED',
        no_transaksi_simba: promptSimbaValue.trim()
      });
      if (res.data.status === 'success') {
        setPenerimaanData(prev => prev.map(p => p.id === promptSimbaItem.id ? res.data.data : p));
        setMessages([{ type: 'success', text: `Status SIMBA berhasil diperbarui ke SYNCED!` }]);
        setIsSimbaPromptOpen(false);
        setPromptSimbaItem(null);
        setPromptSimbaValue('');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal memperbarui status SIMBA.');
    }
  };

  const toggleSimbaStatus = async (item: any) => {
    const nextStatus = item.status_simba === 'PENDING' ? 'SYNCED' : 'PENDING';
    
    // Always prompt for No Transaksi SIMBA when marking as SYNCED
    if (nextStatus === 'SYNCED') {
      setPromptSimbaItem(item);
      setPromptSimbaValue(item.no_transaksi_simba || '');
      setIsSimbaPromptOpen(true);
      return;
    }

    // When unchecking back to PENDING:
    try {
      const res = await axios.patch(`/api/penerimaan-zis/${item.id}/simba`, {
        status_simba: 'PENDING',
        no_transaksi_simba: null
      });
      if (res.data.status === 'success') {
        setPenerimaanData(prev => prev.map(p => p.id === item.id ? res.data.data : p));
        setMessages([{ type: 'success', text: `Status SIMBA dikembalikan ke PENDING!` }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal memperbarui status SIMBA.');
    }
  };

  const handleDeletePenerimaan = async (item: any) => {
    if (!item) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi ${item.no_kuitansi}? Tindakan ini akan mengembalikan saldo kas & menghapus jurnal realisasi.`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/penerimaan-zis/${item.id}`);
      if (res.data.status === 'success') {
        fetchData();
        setIsDetailModalOpen(false);
        setMessages([{ type: 'success', text: 'Transaksi berhasil dihapus & saldo dikoreksi.' }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menghapus transaksi.');
    }
  };

  const resetForm = () => {
    setSelectedMuzakkiId('');
    setSelectedRkatId('');
    setSelectedCoaCode('');
    setSelectedAccountId('');
    setNominal('');
    setMetodePembayaran('TRANSFER');
    setTanggalPembayaran(new Date().toISOString().split('T')[0]);
    setKeterangan('');
    setNoKuitansi('');
    setMuzakkiSearch('');
    setShowQuickRegister(false);
    setEditingId(null);
    setIsOutsideRkat(false);
    setNoTransaksiSimba('');
    setSelectedUpzId('');
    setSelectedKodeProgram('');
  };

  // Filtered muzakki list for autocomplete dropdown
  const filteredMuzakkiForDropdown = useMemo(() => {
    const list = Array.isArray(muzakkiList) ? muzakkiList : [];
    const search = (muzakkiSearch || '').toLowerCase();
    if (!search) return list.slice(0, 10);
    return list.filter(m => {
      const nama = String(m?.nama || '').toLowerCase();
      const npwz = String(m?.npwz || '').toLowerCase();
      const nik = String(m?.nik || '').toLowerCase();
      return nama.includes(search) || npwz.includes(search) || nik.includes(search);
    }).slice(0, 10);
  }, [muzakkiList, muzakkiSearch]);



  const getIndonesianDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formatIndonesianDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getIndonesianMonthName = (monthIdx: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthIdx];
  };

  const getSignatureDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = getIndonesianMonthName(date.getMonth());
    const year = date.getFullYear();
    return `Semarang, ${day} ${month} ${year}`;
  };

  const classifyPenerimaan = (item: any) => {
    const coa = (item.coa_code || '').trim();
    const rkatName = (item.rkat?.nama_program || '').toLowerCase();
    const category = (item.rkat?.kategori || '').toLowerCase();
    
    if (category === 'zakat' || coa.startsWith('1.1') || rkatName.includes('zakat')) {
      return 'ZAKAT';
    } else if (category === 'infak' || category === 'sedekah' || coa.startsWith('1.2') || rkatName.includes('infak') || rkatName.includes('sedekah')) {
      return 'INFAK';
    } else {
      return 'DONASI';
    }
  };

  const handleExportExcel = async () => {
    setIsLoading(true);
    try {
      let dataFiltered: any[] = [];
      const res = await axios.get('/api/penerimaan-zis', {
        params: {
          all: 'true',
          startDate: reportStartDate || undefined,
          endDate: reportEndDate || undefined
        }
      });
      const allData: any[] = res.data?.data || (penerimaanData && penerimaanData.length > 0 ? penerimaanData : []);

      if (reportStartDate && reportEndDate) {
        const [sY, sM, sD] = reportStartDate.split('-').map(Number);
        const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);

        const [eY, eM, eD] = reportEndDate.split('-').map(Number);
        const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);

        dataFiltered = allData.filter(item => {
          if (!item.tanggal_pembayaran) return false;
          const pDate = new Date(item.tanggal_pembayaran);
          const isFailed = item.status_simba === 'FAILED' || (item.keterangan || '').toLowerCase().includes('gagal potong') || (item.no_kuitansi || '').includes('Gagal');
          if (isFailed) return false;
          return pDate.getTime() >= start.getTime() && pDate.getTime() <= end.getTime();
        });
      } else {
        dataFiltered = allData.filter(item => item.status_simba !== 'FAILED' && !(item.keterangan || '').toLowerCase().includes('gagal potong') && !(item.no_kuitansi || '').includes('Gagal'));
      }

      if (dataFiltered.length === 0) {
        alert('Tidak ada data penerimaan ZIS pada rentang tanggal tersebut.');
        return;
      }

      try {
        // Use ExcelJS for high quality formatted Excel file
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'BAZNAS Kota Semarang';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Penerimaan ZIS', {
          views: [{ showGridLines: true }]
        });

        // 1. Title Rows
        worksheet.mergeCells('A1:O1');
        const r1 = worksheet.getCell('A1');
        r1.value = 'BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG';
        r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF064E3B' } };
        r1.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('A2:O2');
        const r2 = worksheet.getCell('A2');
        r2.value = 'LAPORAN RINCIAN DATA PENERIMAAN ZIS';
        r2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F766E' } };
        r2.alignment = { horizontal: 'center', vertical: 'middle' };

        const periodeText = (reportStartDate && reportEndDate)
          ? `Periode: ${reportStartDate} s/d ${reportEndDate}`
          : `Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`;

        worksheet.mergeCells('A3:O3');
        const r3 = worksheet.getCell('A3');
        r3.value = `${periodeText} | Total: ${dataFiltered.length} Data Transaksi`;
        r3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
        r3.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.addRow([]); // Blank Row 4

        // 2. Table Headers
        const headers = [
          'No',
          'Tanggal Transaksi',
          'No Registrasi (NPWZ)',
          'No Kuitansi / BSZ',
          'Nama Muzakki',
          'Nama UPZ',
          'Keterangan',
          'Jenis Dana',
          'Kegiatan (RKAT)',
          'Kode Program',
          'via (Kas & Bank)',
          'Program Kegiatan (COA)',
          'Nominal (Rp)',
          'No Transaksi SIMBA',
          'Status SIMBA'
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.height = 26;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF047857' } // Emerald 700
          };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF064E3B' } },
            bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
            left: { style: 'thin', color: { argb: 'FF10B981' } },
            right: { style: 'thin', color: { argb: 'FF10B981' } }
          };
        });

        const thinBorder: Partial<ExcelJS.Borders> = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        let grandTotal = 0;

        // 3. Data Rows
        dataFiltered.forEach((item, idx) => {
          const npwzVal = (item.muzakki?.npwz && !/^(WZ-|PENDING-|NIK-)/i.test(item.muzakki.npwz)) ? item.muzakki.npwz : '-';
          const tglStr = item.tanggal_pembayaran ? new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID') : '-';
          const coaResolved = (() => {
            const code = (item.coa_code || (item.rkat?.coa_codes ? item.rkat.coa_codes.split(',')[0].trim() : '')).trim();
            if (!code || code === '-') return '-';
            const coa = coaList.find(c => c.coa_code === code);
            const coaName = coa?.nama_akun || item.rkat?.nama_program || '';
            return coaName ? `${code} - ${coaName}` : code;
          })();
          const nominalVal = Number(item.nominal || 0);
          grandTotal += nominalVal;

          const row = worksheet.addRow([
            idx + 1,
            tglStr,
            npwzVal,
            item.no_kuitansi || '-',
            item.muzakki?.nama || '-',
            item.upz?.nama_upz || '-',
            item.keterangan || '-',
            item.rkat?.kategori || (item.jenis_program?.toLowerCase().includes('zakat') ? 'Zakat' : item.jenis_program?.toLowerCase().includes('infak') ? 'Infak' : 'Infak/Sedekah'),
            item.rkat?.nama_program || item.jenis_program || '-',
            item.kode_program || '-',
            item.bankAccount?.nama_akun || '-',
            coaResolved,
            nominalVal,
            item.no_transaksi_simba || '-',
            item.status_simba || 'PENDING'
          ]);

          row.height = 20;

          // Cell styling & alignment
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.border = thinBorder;
            
            // Alignments
            if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 4 || colNumber === 8 || colNumber === 10 || colNumber === 14 || colNumber === 15) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 13) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '#,##0';
            } else {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
          });

          // Alternate row zebra tint
          if (idx % 2 === 1) {
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
            });
          }
        });

        // 4. Total Row
        const totalRowIndex = worksheet.rowCount + 1;
        worksheet.mergeCells(`A${totalRowIndex}:L${totalRowIndex}`);
        const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
        totalLabelCell.value = 'TOTAL NOMINAL PENERIMAAN ZIS';
        totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF064E3B' } };
        totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

        const totalNominalCell = worksheet.getCell(`M${totalRowIndex}`);
        totalNominalCell.value = grandTotal;
        totalNominalCell.numFmt = '#,##0';
        totalNominalCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF064E3B' } };
        totalNominalCell.alignment = { horizontal: 'right', vertical: 'middle' };

        const totalRow = worksheet.getRow(totalRowIndex);
        totalRow.height = 24;
        totalRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' } // Light Emerald Tint
          };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF047857' } },
            bottom: { style: 'double', color: { argb: 'FF047857' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });

        // 5. Column Widths
        worksheet.columns = [
          { width: 6 },   // No
          { width: 14 },  // Tanggal Transaksi
          { width: 22 },  // NPWZ
          { width: 24 },  // No Kuitansi
          { width: 28 },  // Nama Muzakki
          { width: 24 },  // Nama UPZ
          { width: 32 },  // Keterangan
          { width: 14 },  // Jenis Dana
          { width: 26 },  // Kegiatan (RKAT)
          { width: 14 },  // Kode Program
          { width: 20 },  // via Kas & Bank
          { width: 26 },  // Program Kegiatan (COA)
          { width: 18 },  // Nominal (Rp)
          { width: 22 },  // No Transaksi SIMBA
          { width: 16 }   // Status SIMBA
        ];

        // 6. Write Buffer & Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const filename = (reportStartDate && reportEndDate) 
          ? `Laporan_Penerimaan_ZIS_${reportStartDate}_sd_${reportEndDate}.xlsx`
          : `Laporan_Penerimaan_ZIS_Lengkap_${new Date().toISOString().split('T')[0]}.xlsx`;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);

        setMessages([{ type: 'success', text: `Laporan Penerimaan ZIS (${dataFiltered.length} transaksi) berhasil diunduh (Excel)!` }]);
        setIsReportModalOpen(false);
      } catch (excelErr) {
        console.warn('ExcelJS export failed, falling back to XLSX:', excelErr);
        // Fallback to XLSX
        const reportData = dataFiltered.map((item, idx) => ({
          'No': idx + 1,
          'Tanggal Transaksi': item.tanggal_pembayaran ? new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID') : '-',
          'No Registrasi (NPWZ)': (item.muzakki?.npwz && !/^(WZ-|PENDING-|NIK-)/i.test(item.muzakki.npwz)) ? item.muzakki.npwz : '-',
          'No Kuitansi / BSZ': item.no_kuitansi || '-',
          'Nama Muzakki': item.muzakki?.nama || '-',
          'Nama UPZ': item.upz?.nama_upz || '-',
          'Keterangan': item.keterangan || '-',
          'Jenis Dana': item.rkat?.kategori || (item.jenis_program?.toLowerCase().includes('zakat') ? 'Zakat' : item.jenis_program?.toLowerCase().includes('infak') ? 'Infak' : 'Infak/Sedekah'),
          'Kegiatan (RKAT)': item.rkat?.nama_program || item.jenis_program || '-',
          'Kode Program': item.kode_program || '-',
          'via (Kas & Bank)': item.bankAccount?.nama_akun || '-',
          'Program Kegiatan (COA)': (() => {
            const code = (item.coa_code || (item.rkat?.coa_codes ? item.rkat.coa_codes.split(',')[0].trim() : '')).trim();
            if (!code || code === '-') return '-';
            const coa = coaList.find(c => c.coa_code === code);
            const coaName = coa?.nama_akun || item.rkat?.nama_program || '';
            return coaName ? `${code} - ${coaName}` : code;
          })(),
          'Nominal (Rp)': Number(item.nominal || 0),
          'No Transaksi SIMBA': item.no_transaksi_simba || '-',
          'Status SIMBA': item.status_simba || 'PENDING'
        }));

        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Penerimaan ZIS');
        const filename = (reportStartDate && reportEndDate) 
          ? `Laporan_Penerimaan_ZIS_${reportStartDate}_sd_${reportEndDate}.xlsx`
          : `Laporan_Penerimaan_ZIS_Lengkap_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        setMessages([{ type: 'success', text: `Laporan Penerimaan ZIS (${dataFiltered.length} transaksi) berhasil diunduh!` }]);
        setIsReportModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Gagal mengunduh file Excel penerimaan.';
      alert(`Gagal mengunduh file Excel penerimaan: ${errMsg}`);
      setMessages([{ type: 'error', text: `Gagal mengunduh Excel: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectSimba = (id: string) => {
    setSelectedSimbaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSimbaSelected = useMemo(() => {
    if (filteredData.length === 0) return false;
    return filteredData.every(item => selectedSimbaIds.includes(item.id));
  }, [filteredData, selectedSimbaIds]);

  const toggleSelectAllSimba = () => {
    if (isAllSimbaSelected) {
      const filteredSet = new Set(filteredData.map(i => i.id));
      setSelectedSimbaIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const allFilteredIds = filteredData.map(i => i.id);
      setSelectedSimbaIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleDownloadSimbaMigration = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const itemsToExport = selectedSimbaIds.length > 0
      ? penerimaanData.filter(item => selectedSimbaIds.includes(item.id))
      : filteredData;

    if (itemsToExport.length === 0) {
      alert('Tidak ada data transaksi yang dapat diunduh untuk Migrasi SIMBA.');
      return;
    }

    const exportRows = itemsToExport.map((item, idx) => {
      const rkatObj = item.rkat || (item.rkat_id ? rkatList.find((r: any) => r.id === item.rkat_id || r.no === String(item.rkat_id)) : null);
      const cat = rkatObj?.kategori || (item.jenis_program?.toLowerCase().includes('zakat') ? 'Zakat' : 'Infak');
      const isZakat = cat.toLowerCase().includes('zakat') || Number(item.nominal) >= 100000;

      let zakatVal: number | '' = '';
      let infakVal: number | '' = '';

      if (isZakat) {
        zakatVal = Number(item.nominal || 0);
      } else {
        infakVal = Number(item.nominal || 0);
      }

      const labelTipe = isZakat ? 'Zakat Maal' : 'Infak';
      const namaMuzakki = item.muzakki?.nama || item.nama || '-';

      const upzObj = item.upz || (item.upz_id ? upzList.find((u: any) => u.id === item.upz_id) : null);
      const upzName = upzObj ? (upzObj.nama_upz || upzObj.name) : '';
      const upzSuffix = upzName ? ` (UPZ ${upzName})` : '';

      const keteranganVal = item.keterangan || `Terima ${labelTipe} a.n ${namaMuzakki}${upzSuffix}`;

      // Date format: DD/MM/YYYY
      const pDate = new Date(item.tanggal_pembayaran);
      const formattedDate = !isNaN(pDate.getTime()) 
        ? `${String(pDate.getDate()).padStart(2, '0')}/${String(pDate.getMonth() + 1).padStart(2, '0')}/${pDate.getFullYear()}`
        : String(item.tanggal_pembayaran);

      const npwzVal = (item.muzakki?.npwz && !/^(WZ-|PENDING-|NIK-)/i.test(item.muzakki.npwz))
        ? item.muzakki.npwz
        : (item.npwz || '-');

      return {
        'No': idx + 1,
        'tgl_transaksi': formattedDate,
        'NPWZ': npwzVal,
        'nama': namaMuzakki,
        'zakat': zakatVal,
        'zakat fitrah': '',
        'infak': infakVal,
        'titipan': '',
        'Keterangan': keteranganVal
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');

    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const dateStr = new Date().toISOString().split('T')[0];
    const docName = selectedSimbaIds.length > 0 
      ? `SIMBA_Migration_PenerimaanZIS_Selected_${selectedSimbaIds.length}_items_${dateStr}.${ext}`
      : `SIMBA_Migration_PenerimaanZIS_${dateStr}.${ext}`;

    if (format === 'csv') {
      XLSX.writeFile(workbook, docName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, docName);
    }
  };

  const helperIncrementSimbaNo = (startStr: string, count: number): string[] => {
    const trimmed = startStr.trim();
    if (!trimmed) return Array(count).fill('');

    const match = trimmed.match(/^(.*?\D)?(\d+)$/);
    if (!match) {
      return Array.from({ length: count }, (_, idx) => idx === 0 ? trimmed : `${trimmed}-${idx + 1}`);
    }

    const prefix = match[1] || '';
    const numStr = match[2];
    const numLen = numStr.length;
    const startNum = parseInt(numStr, 10);

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const nextNum = startNum + i;
      const paddedNum = String(nextNum).padStart(numLen, '0');
      result.push(`${prefix}${paddedNum}`);
    }
    return result;
  };

  const handleProcessBulkSimbaSequence = async () => {
    const startStr = bulkSimbaStartNo.trim() || '1';
    const targetItems = selectedSimbaIds.length > 0
      ? penerimaanData.filter(i => selectedSimbaIds.includes(i.id))
      : filteredData;

    if (targetItems.length === 0) {
      alert('Tidak ada transaksi yang dipilih atau tersedia di antrean!');
      return;
    }

    const generated = helperIncrementSimbaNo(startStr, targetItems.length);

    const updates = targetItems.map((item, idx) => ({
      id: item.id,
      no_transaksi_simba: generated[idx]
    }));

    setIsSavingBulkSimba(true);
    try {
      const res = await axios.patch('/api/penerimaan-zis/bulk-simba', { updates });
      if (res.data.status === 'success') {
        const updatedMap = new Map(res.data.data.map((d: any) => [d.id, d]));
        setPenerimaanData(prev => prev.map(p => updatedMap.has(p.id) ? updatedMap.get(p.id) : p));
        setMessages([{ type: 'success', text: `Berhasil meng-generate & menyimpan No. SIMBA untuk ${targetItems.length} transaksi!` }]);
        setIsBulkSimbaModalOpen(false);
        setSelectedSimbaIds([]);
        setBulkSimbaStartNo('');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menyimpan No. Transaksi SIMBA Massal.');
    } finally {
      setIsSavingBulkSimba(false);
    }
  };

  const handleExportPDFDaily = () => {
    const targetDateStr = pdfReportDate;
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0,0,0,0);
    
    const dataFiltered = penerimaanData.filter(item => {
      const itemDate = new Date(item.tanggal_pembayaran);
      const sameDay = itemDate.getFullYear() === targetDate.getFullYear() &&
                      itemDate.getMonth() === targetDate.getMonth() &&
                      itemDate.getDate() === targetDate.getDate();
      const isNonKas = item.metode_pembayaran === 'NON_KAS' ||
                       item.bankAccount?.tipe_kas === 'NON_KAS' ||
                       item.bankAccount?.account_id === 'non_kas' ||
                       (item.bankAccount?.nama_akun || '').toLowerCase().includes('non kas') ||
                       (item.bankAccount?.nama_akun || '').toLowerCase().includes('non-kas');
      const isTunai = !isNonKas && (
                      item.metode_pembayaran === 'TUNAI' ||
                      item.bankAccount?.tipe_kas === 'TUNAI' ||
                      item.bankAccount?.tipe_kas === 'KAS' ||
                      (item.bankAccount?.nama_akun || '').toLowerCase().includes('kas')
      );
      const isFailed = item.status_simba === 'FAILED' || (item.keterangan || '').toLowerCase().includes('gagal potong');
      return sameDay && isTunai && !isFailed;
    });

    if (dataFiltered.length === 0) {
      alert('Tidak ada transaksi Kas Tunai pada tanggal tersebut.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Laporan Kas Masuk', 105, 15, { align: 'center' });
    doc.text('Via Tunai', 105, 21, { align: 'center' });
    
    const dayName = getIndonesianDayName(targetDateStr);
    const formattedDate = formatIndonesianDate(targetDateStr);
    doc.text(`Hari ${dayName} Tanggal ${formattedDate}`, 105, 27, { align: 'center' });

    const tableBody: any[] = [];
    let totalZakat = 0;
    let totalInfak = 0;
    let totalDonasi = 0;

    dataFiltered.forEach((item, index) => {
      const nominal = Number(item.nominal || 0);
      const category = classifyPenerimaan(item);
      
      let zakatCol = 'Rp -';
      let infakCol = 'Rp -';
      let donasiCol = 'Rp -';

      if (category === 'ZAKAT') {
        zakatCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalZakat += nominal;
      } else if (category === 'INFAK') {
        infakCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalInfak += nominal;
      } else {
        donasiCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalDonasi += nominal;
      }

      tableBody.push([
        String(index + 1),
        item.no_transaksi_simba || '-',
        item.keterangan || `Terima ZIS dari ${item.muzakki?.nama || '-'}`,
        zakatCol,
        infakCol,
        donasiCol
      ]);
    });

    const totalAll = totalZakat + totalInfak + totalDonasi;

    tableBody.push([
      { content: 'JUMLAH', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalZakat > 0 ? `Rp ${totalZakat.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalInfak > 0 ? `Rp ${totalInfak.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalDonasi > 0 ? `Rp ${totalDonasi.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } }
    ]);

    tableBody.push([
      { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: `Rp ${totalAll.toLocaleString('id-ID')}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          { content: 'No', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'No Transaksi', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Nama', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Jenis Penerimaan', colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }
        ],
        [
          { content: 'Zakat', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Infak', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Donasi', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }
        ]
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY + 65 > 297) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(getSignatureDateString(targetDateStr), 195, finalY + 12, { align: 'right' });

    doc.text('Penerima.', 15, finalY + 20);
    doc.text('Kabag Keuangan', 15, finalY + 25);

    doc.text('Kabid Pengumpulan', 105, finalY + 25, { align: 'center' });

    doc.text('Penyetor,', 195, finalY + 20, { align: 'right' });
    doc.text('Staff Bid. Pengumpulan', 195, finalY + 25, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(signatories.kabagKeuangan || '........................', 15, finalY + 55);
    doc.text(signatories.kabidPengumpulan || '........................', 105, finalY + 55, { align: 'center' });
    doc.text(signatories.stafPengumpulan || '........................', 195, finalY + 55, { align: 'right' });

    doc.save(`Laporan_Kas_Masuk_Tunai_${formattedDate.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Custom Print CSS Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 8mm;
            }
            html, body, #root, .flex-1, .overflow-y-auto, [class*="overflow-y-auto"], [class*="min-h-screen"], [class*="h-screen"] {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
            }
            body {
              background-color: white !important;
              color: black !important;
            }
            aside, nav, header, button, .no-print, input, select, [role="tablist"], .fixed, .no-print-area, [class*="z-50"] {
              display: none !important;
            }
            .print-only-container {
              display: block !important;
              visibility: visible !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 3px 5px !important;
              font-size: 8px !important;
              line-height: 1.1 !important;
              word-break: break-word !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
          }
        `
      }} />

      <div className="no-print-area space-y-8">
        {/* Breadcrumbs & Title */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <span className="text-slate-400 shrink-0">Pengumpulan</span>
            <ChevronRight className="size-4 text-slate-300 shrink-0" />
            <span className="text-primary font-bold shrink-0">Penerimaan ZIS</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
            Penerimaan ZIS
          </h2>
          <p className="text-slate-500 font-medium">
            Mencatat dan mengelola penerimaan dana zakat, infak, sedekah, dan dana sosial keagamaan.
          </p>
        </motion.div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-8 right-8 z-[100] flex flex-col gap-2 shrink-0 w-80 shadow-2xl"
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "p-4 rounded-xl flex items-start gap-3 border shadow-sm",
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              )}>
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{msg.type === 'success' ? 'Berhasil' : msg.type === 'warning' ? 'Peringatan' : 'Gagal'}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
                <button onClick={() => setMessages(messages.filter((_, i) => i !== idx))} className="shrink-0 p-1 hover:bg-black/5 rounded-md">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <SummaryCard 
          title="Total Penerimaan ZIS" 
          value={`Rp ${stats.total.toLocaleString('id-ID')}`} 
          subtext="Akumulasi seluruh setoran"
          icon={<DollarSign className="size-5 text-primary" />}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard 
          title="Penerimaan Zakat" 
          value={`Rp ${stats.zakat.toLocaleString('id-ID')}`} 
          subtext="Dana Zakat Maal & Fitrah"
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard 
          title="Penerimaan Infak" 
          value={`Rp ${stats.infak.toLocaleString('id-ID')}`} 
          subtext="Sedekah & Infak Terikat/Bebas"
          icon={<Layers className="size-5 text-blue-600" />}
          colorClass="bg-blue-50 text-blue-600"
        />
      </motion.div>

      {/* Toolbar & Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); setSelectedSimbaIds([]); }}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95",
              activeTab === 'all'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Semua Transaksi
          </button>
          <button
            onClick={() => { setActiveTab('simba-queue'); setCurrentPage(1); }}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95",
              activeTab === 'simba-queue'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Antrean SIMBA
            {((summaryTotals as any)?.totalPendingSimba || (paginationInfo as any)?.totalPendingSimba || 0) > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {((summaryTotals as any)?.totalPendingSimba || (paginationInfo as any)?.totalPendingSimba || 0).toLocaleString('id-ID')}
              </span>
            )}
          </button>
        </div>

        {/* Primary Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Search & Essential Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari kuitansi, nama, NPWZ..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Bulan */}
            <select 
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none cursor-pointer font-semibold text-slate-700"
              value={selectedFilterMonth}
              onChange={(e) => handleMonthFilterChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Semua Bulan</option>
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

            {/* Kategori Filter */}
            <select 
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none cursor-pointer font-semibold text-slate-700"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Zakat">Zakat</option>
              <option value="Infak">Infak</option>
              <option value="DSKL">DSKL</option>
              <option value="CSR">CSR</option>
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
              <ChevronDown className={cn("size-3.5 transition-transform", isFilterExpanded && "rotate-180")} />
            </button>
          </div>

          {/* Right: Grouped Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Main Primary Action */}
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Input Penerimaan ZIS</span>
            </button>

            {/* Utilities Buttons */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cetak Laporan Kas Tunai & Rekap"
              >
                <Printer className="size-3.5 text-slate-500" />
                <span className="hidden sm:inline">Cetak Laporan</span>
              </button>

              <button 
                onClick={() => setIsMigrationModalOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Migrasi Penerimaan Excel"
              >
                <Upload className="size-3.5 text-slate-500" />
                <span className="hidden sm:inline">Migrasi</span>
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
              className="overflow-hidden bg-slate-50/80 border-b border-slate-200/80"
            >
              <div className="p-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mr-1">Filter Tambahan:</span>

                {/* Filter Tahun */}
                {selectedFilterMonth !== 'all' && (
                  <select 
                    className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-semibold text-slate-700 shadow-sm"
                    value={selectedFilterYear}
                    onChange={(e) => handleYearFilterChange(Number(e.target.value))}
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        Tahun: {y}
                      </option>
                    ))}
                  </select>
                )}

                {/* Kode Program Filter */}
                <select 
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer max-w-[220px] font-semibold text-slate-700 shadow-sm"
                  value={kodeProgramFilter}
                  onChange={(e) => { setKodeProgramFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="Semua">Kode Program: Semua</option>
                  {kodeProgramOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} - {opt.label.split('||')[1]?.trim() || opt.label}
                    </option>
                  ))}
                </select>

                {/* Program RKAT Filter */}
                <select 
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer max-w-[240px] font-semibold text-slate-700 shadow-sm"
                  value={rkatFilter}
                  onChange={(e) => { setRkatFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="Semua">Program RKAT: Semua</option>
                  {rkatList.map((rkat) => (
                    <option key={rkat.id} value={rkat.id}>
                      #{rkat.no} - {rkat.nama_program}
                    </option>
                  ))}
                </select>

                {/* Simba Sync Filter */}
                <select 
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-semibold text-slate-700 shadow-sm"
                  value={simbaFilter}
                  onChange={(e) => { setSimbaFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="Semua">Status Simba: Semua</option>
                  <option value="PENDING">PENDING (Belum Sync)</option>
                  <option value="SYNCED">SYNCED (Sudah Sync)</option>
                </select>

                {/* Reset Filter Button */}
                {(kodeProgramFilter !== 'Semua' || rkatFilter !== 'Semua' || categoryFilter !== 'Semua' || simbaFilter !== 'Semua' || selectedFilterMonth !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setKodeProgramFilter('Semua');
                      setRkatFilter('Semua');
                      setCategoryFilter('Semua');
                      setSimbaFilter('Semua');
                      setSelectedFilterMonth('all');
                      setMainFilterStartDate('');
                      setMainFilterEndDate('');
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer ml-auto"
                    title="Reset semua filter"
                  >
                    <X className="size-3.5" />
                    <span>Reset Semua Filter</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dedicated SIMBA Action Bar (Appears ONLY when transactions are checked) */}
        {activeTab === 'simba-queue' && selectedSimbaIds.length > 0 && (
          <div className="p-3 mx-4 my-3 rounded-xl border bg-emerald-50/90 border-emerald-200 text-emerald-950 flex flex-wrap items-center justify-between gap-3 shadow-sm transition-all animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{selectedSimbaIds.length} transaksi dipilih untuk Migrasi SIMBA</span>
              <button
                type="button"
                onClick={() => setSelectedSimbaIds([])}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 ml-2 underline transition-colors cursor-pointer"
              >
                Batalkan Pilihan
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsBulkSimbaModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 text-white" />
                <span>Auto-Generate No. SIMBA ({selectedSimbaIds.length})</span>
              </button>

              <button 
                type="button"
                onClick={() => handleDownloadSimbaMigration('xlsx')}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Download Format SIMBA Excel (.xlsx)"
              >
                <FileSpreadsheet className="size-4" />
                <span>SIMBA (.xlsx)</span>
              </button>

              <button 
                type="button"
                onClick={() => handleDownloadSimbaMigration('csv')}
                className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Download Format SIMBA CSV (.csv)"
              >
                <FileText className="size-4" />
                <span>SIMBA (.csv)</span>
              </button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Memuat data Penerimaan...
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  {activeTab === 'simba-queue' && (
                    <th className="px-4 py-4 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={isAllSimbaSelected}
                        onChange={toggleSelectAllSimba}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-4 cursor-pointer accent-emerald-600"
                        title="Pilih Semua Transaksi"
                      />
                    </th>
                  )}
                  <th className="px-3 py-4 text-center">#</th>
                  <th className="px-6 py-4">Tanggal Transaksi</th>
                  <th className="px-6 py-4">NPWZ</th>
                  <th className="px-6 py-4">Nama Muzakki</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Jenis Dana</th>
                  <th className="px-6 py-4">Kegiatan (RKAT)</th>
                  <th className="px-6 py-4">via (Kas & Bank)</th>
                  <th className="px-6 py-4">Program Kegiatan (COA)</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-center">Simba Sync</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'simba-queue' ? 13 : 12} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                      Belum ada data penerimaan ZIS yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "hover:bg-slate-50/30 transition-colors group",
                      activeTab === 'simba-queue' && selectedSimbaIds.includes(item.id) && "bg-emerald-50/40"
                    )}>
                      {activeTab === 'simba-queue' && (
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedSimbaIds.includes(item.id)}
                            onChange={() => toggleSelectSimba(item.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-4 cursor-pointer accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className="px-3 py-4 font-mono text-xs text-slate-400 text-center font-bold">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">
                        {item.muzakki?.npwz && !/^(WZ-|PENDING-|NIK-)/i.test(item.muzakki.npwz) ? item.muzakki.npwz : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div>{item.muzakki?.nama || '-'}</div>
                        {(() => {
                          const upzObj = item.upz || (item.upz_id ? upzList.find(u => u.id === item.upz_id) : null);
                          if (upzObj) {
                            return (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[9px] font-black rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide" title={`Database UPZ: ${upzObj.nama_upz || upzObj.name}`}>
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                via {upzObj.nama_upz || upzObj.name}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium max-w-[220px]">
                        <p className="line-clamp-2" title={item.keterangan || '-'}>
                          {item.keterangan || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const rkatObj = item.rkat || (item.rkat_id ? rkatList.find(r => r.id === item.rkat_id || r.no === String(item.rkat_id)) : null);
                          const cat = rkatObj?.kategori || (item.jenis_program?.toLowerCase().includes('zakat') ? 'Zakat' : item.jenis_program?.toLowerCase().includes('infak') ? 'Infak' : 'Infak/Sedekah');
                          return (
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                              cat.toLowerCase().includes('zakat') ? 'bg-emerald-100 text-emerald-800' :
                              cat.toLowerCase().includes('infak') ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            )}>
                              {cat}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {(() => {
                          const rkatObj = item.rkat || (item.rkat_id ? rkatList.find(r => r.id === item.rkat_id || r.no === String(item.rkat_id)) : null) || (item.rkat_id === undefined && item.kode_program && PROGRAM_KODE_TO_RKAT_MAP[item.kode_program] ? rkatList.find(r => r.no === PROGRAM_KODE_TO_RKAT_MAP[item.kode_program].rkat_no) : null);
                          const progName = rkatObj?.nama_program || item.jenis_program || (item.rkat_id === null ? 'Di Luar RKAT' : '-');
                          const progNo = rkatObj?.no || (item.rkat_id === undefined && item.kode_program && PROGRAM_KODE_TO_RKAT_MAP[item.kode_program] ? PROGRAM_KODE_TO_RKAT_MAP[item.kode_program].rkat_no : null);

                          return (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-xs">{progName}</p>
                              <div className="flex flex-wrap items-center gap-1">
                                {progNo && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-50 text-blue-700 border border-blue-100" title={`Terhubung ke RKAT Program No. ${progNo}`}>
                                    <CheckCircle2 className="size-3 text-blue-600 shrink-0" />
                                    RKAT #{progNo}
                                  </span>
                                )}
                                {item.kode_program && item.kode_program !== '-' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    Kode {item.kode_program}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {item.bankAccount?.nama_akun || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const code = (item.coa_code || (item.rkat?.coa_codes ? item.rkat.coa_codes.split(',')[0].trim() : '')).trim();
                          if (!code || code === '-') return <span className="text-slate-400 font-mono text-xs">-</span>;

                          const coa = coaList.find(c => c.coa_code === code);
                          const coaName = coa?.nama_akun || item.rkat?.nama_program || '';

                          return (
                            <div className="max-w-xs space-y-1">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded">
                                {code}
                              </span>
                              {coaName ? (
                                <p className="text-xs font-semibold text-slate-800 leading-snug break-words">
                                  {coaName}
                                </p>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {(item.status_simba === 'SYNCED' && item.no_transaksi_simba && String(item.no_transaksi_simba).trim().length > 0 && !String(item.no_transaksi_simba).startsWith('SMB-')) ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                SYNCED
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {item.no_transaksi_simba}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {(() => {
                                const hasNpwz = item.muzakki?.npwz && item.muzakki.npwz.trim().length > 0 && !item.muzakki.npwz.startsWith('PENDING') && !item.muzakki.npwz.startsWith('NIK-');
                                if (hasNpwz) {
                                  return (
                                    <button 
                                      onClick={() => toggleSimbaStatus(item)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Input Kas Masuk ke SIMBA"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button 
                                      onClick={() => handleOpenNpwzModal(item.muzakki)}
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-650 rounded-xl border border-amber-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Registrasi NPWZ SIMBA (Belum ada NPWZ)"
                                    >
                                      <UserPlus className="size-4" />
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                            title="Edit Transaksi"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button 
                            onClick={() => { setSelectedData(item); setIsDetailModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                            title="Detail Transaksi"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePenerimaan(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/40 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold">
              Menampilkan {paginationInfo.total === 0 ? 0 : ((paginationInfo.page - 1) * paginationInfo.limit + 1).toLocaleString('id-ID')} - {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total).toLocaleString('id-ID')} dari {paginationInfo.total.toLocaleString('id-ID')} transaksi
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value={25}>25 per halaman</option>
              <option value={50}>50 per halaman</option>
              <option value={100}>100 per halaman</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            
            <div className="flex items-center gap-1.5 text-slate-600 font-bold px-2">
              <span>Halaman</span>
              <input
                type="number"
                min={1}
                max={paginationInfo.totalPages || 1}
                value={currentPage === 0 ? '' : currentPage}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  const totalPages = paginationInfo.totalPages || 1;
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
                className="w-12 text-center py-1 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-primary text-xs font-extrabold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>dari {paginationInfo.totalPages || 1}</span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(paginationInfo.totalPages, prev + 1))}
              disabled={currentPage >= paginationInfo.totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-600 disabled:opacity-40"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Input Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">{editingId ? 'Edit Penerimaan ZIS' : 'Input Penerimaan ZIS'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddPenerimaan} className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                
                {/* Autocomplete Muzakki */}
                <div className="space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki *</label>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickRegister(!showQuickRegister)}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="size-3" />
                      {showQuickRegister ? "Batal Register" : "+ Registrasi Cepat Muzakki"}
                    </button>
                  </div>

                  {showQuickRegister ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-1">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">Registrasi Muzakki Instan</p>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Perorangan')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Perorangan' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Perorangan
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Lembaga')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Lembaga' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Lembaga
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap / Lembaga *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickNama} 
                        onChange={(e) => setQuickNama(e.target.value)} 
                      />
                      {quickKategori === 'Perorangan' && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="NIK (KTP)" 
                            className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                            value={quickNik} 
                            onChange={(e) => setQuickNik(e.target.value)} 
                          />
                          <select
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-slate-600"
                            value={quickJenisKelamin}
                            onChange={(e) => setQuickJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                      )}
                      <input 
                        type="text" 
                        placeholder="No Handphone *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickHandphone} 
                        onChange={(e) => setQuickHandphone(e.target.value)} 
                      />
                      <textarea 
                        placeholder="Alamat *" 
                        rows={2} 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickAddress} 
                        onChange={(e) => setQuickAddress(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={handleQuickRegisterMuzakki} 
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Daftarkan & Pilih Muzakki
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        placeholder="Ketik nama, NIK, atau NPWZ Muzakki..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={muzakkiSearch}
                        onChange={(e) => {
                          setMuzakkiSearch(e.target.value);
                          setShowMuzakkiDropdown(true);
                        }}
                        onFocus={() => setShowMuzakkiDropdown(true)}
                      />
                      {showMuzakkiDropdown && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                          {filteredMuzakkiForDropdown.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic">Muzakki tidak ditemukan.</div>
                          ) : (
                            filteredMuzakkiForDropdown.map((muzakki) => (
                              <button
                                key={muzakki.id}
                                type="button"
                                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs"
                                onClick={() => {
                                  setSelectedMuzakkiId(muzakki.id);
                                  setMuzakkiSearch(muzakki.nama);
                                  setShowMuzakkiDropdown(false);
                                  
                                  if (muzakki.upz) {
                                    const cleanMuzUpz = String(muzakki.upz).toLowerCase().trim();
                                    const matchedUpz = upzList.find((u: any) => {
                                      const uName = String(u.nama_upz || u.name || '').toLowerCase().trim();
                                      return uName === cleanMuzUpz || (cleanMuzUpz.length >= 3 && uName.includes(cleanMuzUpz)) || (uName.length >= 3 && cleanMuzUpz.includes(uName));
                                    });
                                    if (matchedUpz) {
                                      handleUpzChange(matchedUpz.id);
                                    }
                                  }
                                }}
                              >
                                <div>
                                  <p className="font-bold text-slate-800">{muzakki.nama}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">NPWZ: {muzakki.npwz || '-'}</p>
                                </div>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{muzakki.kategori}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                  {/* Checkbox Tidak Ada di RKAT */}
                  <div className="flex items-center gap-2 text-left mb-1">
                    <input 
                      type="checkbox" 
                      id="isOutsideRkat"
                      checked={isOutsideRkat}
                      onChange={(e) => {
                        setIsOutsideRkat(e.target.checked);
                        if (e.target.checked) {
                          setSelectedRkatId('');
                          setSelectedCoaCode('');
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Tidak ada di RKAT (Penerimaan di luar RKAT)
                    </label>
                  </div>

                  {/* Kode Program Pengumpulan (101.1 - 102.11) - Selalu Bisa Diisi */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Kode Program Pengumpulan (Materi SIMBA / Laporan) *
                    </label>
                    <CustomSelect 
                      value={selectedKodeProgram}
                      options={kodeProgramOptions}
                      placeholder="Pilih Kode Program..."
                      onChange={(code) => {
                        setSelectedKodeProgram(code);

                        if (!code.startsWith('102')) {
                          setSelectedUpzId('');
                        }

                        if (code && PROGRAM_KODE_TO_RKAT_MAP[code]) {
                          const mapInfo = PROGRAM_KODE_TO_RKAT_MAP[code];
                          if (mapInfo.rkat_no && !isOutsideRkat) {
                            const targetNo = String(mapInfo.rkat_no).trim();
                            const matchedRkat = rkatList.find(r => 
                              String(r.no || '').trim() === targetNo || 
                              String(r.id || '').trim() === targetNo
                            );
                            if (matchedRkat) {
                              handleRkatChange(matchedRkat.id);
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Dropdown Search UPZ - HANYA MUNCUL JIKA KODE PROGRAM BERAWALAN 102.x */}
                  {selectedKodeProgram && selectedKodeProgram.startsWith('102') && (
                    <div className="space-y-1.5 text-left animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Pilih UPZ (Penghimpunan via UPZ) *
                      </label>
                      <UpzSearchDropdown 
                        value={selectedUpzId}
                        onSelect={(upzId) => handleUpzChange(upzId)}
                        placeholder="Cari &amp; Pilih UPZ..."
                        upzList={upzList}
                        className="py-2.5 text-sm bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                  )}

                  {/* RKAT Program selection (Disabled HANYA jika Penerimaan di Luar RKAT dicentang) */}
                  <div className={`space-y-1 transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kegiatan (RKAT) *</label>
                    <CustomSelect 
                      value={selectedRkatId}
                      options={rkatSelectOptions}
                      placeholder="Pilih Kegiatan RKAT Pengumpulan..."
                      disabled={isOutsideRkat}
                      onChange={(rkatId) => handleRkatChange(rkatId)}
                    />
                  </div>

                  {/* Program Kegiatan (COA) matching the selected Kegiatan (RKAT) */}
                  {!isOutsideRkat && selectedRkatId && (
                    <div className="space-y-1 animate-fade-in text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Program Kegiatan (COA) *</label>
                      <CustomSelect 
                        value={selectedCoaCode}
                        options={rkatCoaOptions}
                        placeholder="Pilih COA Program..."
                        onChange={(code) => setSelectedCoaCode(code)}
                      />
                    </div>
                  )}

                  {/* 3. Akun Buku Besar (Penerimaan COA) - Outside RKAT search */}
                  {isOutsideRkat && (
                    <div className="space-y-1 text-left animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Akun Buku Besar (Penerimaan COA) *
                      </label>
                      <CustomSelect 
                        value={selectedCoaCode}
                        options={coaListOptions}
                        placeholder="Cari &amp; Pilih Kode COA Akun..."
                        onChange={(code) => setSelectedCoaCode(code)}
                      />
                    </div>
                  )}

                 {/* Bank Account / Kas selection */}
                 <div className="space-y-1 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">via Kas &amp; Bank *</label>
                   <CustomSelect 
                      value={selectedAccountId}
                      options={bankAccountOptions}
                      placeholder="Pilih Rekening Tujuan..."
                      onChange={(accId) => {
                        setSelectedAccountId(accId);
                        const targetAcc = accountsList.find(a => a.account_id === accId);
                        if (targetAcc) {
                          const isNonKasAcc = targetAcc.account_id === 'non_kas' || targetAcc.tipe_kas === 'NON_KAS' || (targetAcc.nama_akun || '').toLowerCase().includes('non kas') || (targetAcc.nama_akun || '').toLowerCase().includes('non-kas');
                          const isKasAcc = !isNonKasAcc && (targetAcc.tipe_kas === 'TUNAI' || targetAcc.tipe_kas === 'KAS' || (targetAcc.nama_akun || '').toLowerCase().includes('kas'));
                          if (isNonKasAcc) {
                            setMetodePembayaran('NON_KAS');
                          } else if (isKasAcc) {
                            setMetodePembayaran('TUNAI');
                          } else {
                            setMetodePembayaran('TRANSFER');
                          }
                        } else if (accId === 'non_kas') {
                          setMetodePembayaran('NON_KAS');
                        }
                      }}
                    />
                 </div>

                 {/* Nominal */}
                 <div className="space-y-1 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nominal Setoran (Rp) *</label>
                   <div className="relative flex items-center">
                     <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-slate-100 border-r border-slate-200 rounded-l-xl flex items-center justify-center text-xs font-black text-slate-600 shrink-0 select-none">
                       Rp
                     </div>
                     <input 
                       required 
                       type="text" 
                       placeholder="0" 
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300 font-mono"
                       value={nominal ? Number(String(nominal).replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                       onChange={(e) => {
                         const rawDigits = e.target.value.replace(/[^0-9]/g, '');
                         setNominal(rawDigits);
                       }}
                     />
                   </div>
                 </div>

                {/* Metode & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Metode Pembayaran *</label>
                    <CustomSelect 
                      value={metodePembayaran}
                      options={metodePembayaranOptions}
                      placeholder="Pilih Metode..."
                      onChange={(metode) => setMetodePembayaran(metode)}
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tanggal Setor *</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                      value={tanggalPembayaran}
                      onChange={(e) => setTanggalPembayaran(e.target.value)}
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Keterangan / Memo</label>
                  <textarea 
                    rows={2} 
                    placeholder="Catatan transfer atau nomor referensi..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>

                {/* No Transaksi SIMBA (Hanya muncul saat MODE EDIT) */}
                {editingId && (
                  <div className="space-y-1 text-left animate-fade-in">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">No. Transaksi SIMBA</label>
                      {noTransaksiSimba.trim() ? (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                          Status: SYNCED
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                          Status: PENDING
                        </span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Masukkan No Transaksi SIMBA..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-slate-300 placeholder:font-sans placeholder:font-normal"
                      value={noTransaksiSimba}
                      onChange={(e) => setNoTransaksiSimba(e.target.value)}
                    />
                  </div>
                )}

                {/* Preview Accounting Entries helper */}
                {nominal && Number(String(nominal).replace(/[^0-9]/g, '')) > 0 && selectedAccountId && (selectedRkatId || (isOutsideRkat && selectedCoaCode)) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px] text-left">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block">Preview Entri Jurnal Akuntansi</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="font-bold text-emerald-600">DEBIT</span>
                        <p className="font-medium truncate">{accountsList.find(a => a.account_id === selectedAccountId)?.nama_akun || 'Rekening'}</p>
                        <p className="font-mono text-slate-400 font-bold">Rp {Number(String(nominal).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">KREDIT</span>
                        <p className="font-medium truncate">
                          {isOutsideRkat 
                            ? `Penerimaan di luar RKAT (${coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || selectedCoaCode || 'COA'})`
                            : `Pendapatan ${rkatList.find(r => r.id === selectedRkatId)?.nama_program || 'Program'}`
                          }
                        </p>
                        <p className="font-mono text-slate-400 font-bold">Rp {Number(String(nominal).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Simpan Penerimaan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedData && (
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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Detail Penerimaan ZIS</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuitansi / BSZ</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">{selectedData.no_kuitansi}</p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                    selectedData.status_simba === 'SYNCED' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    SIMBA: {selectedData.status_simba}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.muzakki?.nama || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWZ</p>
                    <p className="text-sm font-bold font-mono text-slate-700">{selectedData.muzakki?.npwz || '-'}</p>
                  </div>
                </div>

                {/* UPZ Database Relationship */}
                {(() => {
                  const upzObj = selectedData.upz || (selectedData.upz_id ? upzList.find(u => u.id === selectedData.upz_id) : null);
                  if (upzObj) {
                    return (
                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Terhubung ke Database UPZ
                          </span>
                          {upzObj.kategori && (
                            <span className="px-2 py-0.5 text-[9px] font-black rounded bg-emerald-200/70 text-emerald-950 uppercase">
                              {upzObj.kategori}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-emerald-950">{upzObj.nama_upz || upzObj.name}</p>
                        {upzObj.alamat && (
                          <p className="text-xs text-emerald-800 font-medium">{upzObj.alamat}</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Penerimaan via UPZ</span>
                      <span className="font-medium text-slate-600">Setoran Mandiri / Bukan via UPZ</span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Dana</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.rkat?.kategori || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Setor</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(selectedData.tanggal_pembayaran).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Program RKAT Relationship Box */}
                {(() => {
                  const rkatObj = selectedData.rkat || (selectedData.rkat_id ? rkatList.find(r => r.id === selectedData.rkat_id) : null);
                  if (rkatObj) {
                    return (
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Terhubung ke Program RKAT
                          </span>
                          {rkatObj.no && (
                            <span className="px-2 py-0.5 text-[9px] font-black rounded bg-blue-200/70 text-blue-950 uppercase">
                              No. {rkatObj.no}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-blue-950">{rkatObj.nama_program}</p>
                        {rkatObj.target_nominal && (
                          <p className="text-xs text-blue-800 font-bold">
                            Target RKAT: Rp {Number(rkatObj.target_nominal).toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT)</p>
                      <p className="text-sm font-bold text-slate-800">Di luar RKAT (Penerimaan Khusus)</p>
                    </div>
                  );
                })()}

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA)</p>
                  <p className="text-sm font-bold text-slate-850">
                    {(() => {
                      const code = (selectedData.coa_code || (selectedData.rkat?.coa_codes ? selectedData.rkat.coa_codes.split(',')[0].trim() : '')).trim();
                      if (!code || code === '-') return '-';

                      const coa = coaList.find(c => c.coa_code === code);
                      const coaName = coa?.nama_akun || selectedData.rkat?.nama_program || '';

                      return coaName ? `${code} - ${coaName}` : code;
                    })()}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Penerima (via)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedData.bankAccount?.nama_akun || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal Setoran</p>
                    <p className="text-lg font-black text-slate-900">
                      Rp {Number(selectedData.nominal || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode</p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedData.metode_pembayaran === 'NON_KAS' ? 'Non Kas' :
                       selectedData.metode_pembayaran === 'TRANSFER' ? 'Transfer Bank' :
                       selectedData.metode_pembayaran === 'TUNAI' ? 'Kas Tunai' :
                       selectedData.metode_pembayaran === 'QRIS' ? 'QRIS' :
                       (selectedData.metode_pembayaran || '-')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo / Keterangan</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedData.keterangan || 'Tidak ada catatan.'}</p>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button 
                  onClick={() => handleDeletePenerimaan(selectedData)}
                  className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-rose-200 active:scale-95 shadow-sm"
                >
                  <Trash2 className="size-4" />
                  Hapus Transaksi
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registrasi NPWZ SIMBA Modal */}
      <AnimatePresence>
        {npwzModalOpen && selectedMuzakkiForNpwz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setNpwzModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">Registrasi NPWZ SIMBA</h3>
                <button onClick={() => setNpwzModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Muzakki</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedMuzakkiForNpwz.nama}</p>
                  <p className="text-slate-500 mt-1 font-medium">{selectedMuzakkiForNpwz.alamat}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Pokok Wajib Zakat (NPWZ) *</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan NPWZ 15 digit..." 
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    value={newNpwzValue}
                    onChange={(e) => setNewNpwzValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setNpwzModalOpen(false)}
                  className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSaveNpwz}
                  className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Simpan &amp; Registrasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Input No Transaksi SIMBA Modal */}
      <AnimatePresence>
        {isSimbaPromptOpen && promptSimbaItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setIsSimbaPromptOpen(false);
                setPromptSimbaItem(null);
                setPromptSimbaValue('');
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">Input No Transaksi SIMBA</h3>
                <button 
                  onClick={() => {
                    setIsSimbaPromptOpen(false);
                    setPromptSimbaItem(null);
                    setPromptSimbaValue('');
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Muzakki</p>
                  <p className="font-bold text-slate-800 text-sm">{promptSimbaItem.muzakki?.nama || '-'}</p>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-2">Nominal</p>
                  <p className="font-bold text-slate-800 text-sm">
                    Rp {Number(promptSimbaItem.nominal || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Transaksi SIMBA *</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan No. Transaksi SIMBA..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    value={promptSimbaValue}
                    onChange={(e) => setPromptSimbaValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsSimbaPromptOpen(false);
                    setPromptSimbaItem(null);
                    setPromptSimbaValue('');
                  }}
                  className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSaveSimbaNo}
                  className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Simpan &amp; Sync
                </button>
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
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] z-10"
            >
              {/* Header */}
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Printer className="size-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Cetak Laporan ZIS</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Pilih format dan rentang data laporan yang ingin Anda unduh / cetak.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="size-4 text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 min-h-0">
                
                {/* Select Type Laporan Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Laporan Yang Ingin Dicetak / Diunduh *</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                  >
                    <option value="harian">PDF Laporan Penerimaan ZIS Harian (Kas Tunai)</option>
                    <option value="bulanan_upz">PDF Laporan Rekapitulasi ZIS Bulanan Per UPZ (Format Resmi BAZNAS)</option>
                    <option value="excel">Export Data Penerimaan ZIS (Spreadsheet Excel .xlsx)</option>
                  </select>
                </div>

                {/* Option 1: PDF Laporan Harian */}
                {selectedReportType === 'harian' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">PDF Laporan Harian (Kas Tunai)</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cetak Laporan Kas Masuk khusus pembayaran Kas Tunai pada tanggal tertentu dalam format PDF BAZNAS.
                    </p>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Tanggal Laporan</label>
                      <input 
                        type="date"
                        value={pdfReportDate}
                        onChange={(e) => setPdfReportDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>

                    {/* Penandatangan (Signatories) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">
                        Penandatangan Laporan Harian
                      </h5>

                      {/* Kabag Keuangan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Kabag Keuangan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, kabagKeuangan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.kabagKeuangan) ? signatories.kabagKeuangan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Kabag_Keuangan' || u.role === 'Staf_Keuangan' || u.role === 'Kabag_Administrasi').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.kabagKeuangan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, kabagKeuangan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Kabid Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Kabid Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, kabidPengumpulan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.kabidPengumpulan) ? signatories.kabidPengumpulan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Kabag_Pengumpulan').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.kabidPengumpulan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, kabidPengumpulan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Staff Bid. Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Staff Bid. Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, stafPengumpulan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.stafPengumpulan) ? signatories.stafPengumpulan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Staf_Pengumpulan').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.stafPengumpulan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, stafPengumpulan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                    </div>

                    <button
                      onClick={handleExportPDFDaily}
                      className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <FileText className="size-4" />
                      Cetak Laporan Harian PDF
                    </button>
                  </div>
                )}

                {/* Option 2: PDF Laporan Bulanan Rekapitulasi ZIS per UPZ */}
                {selectedReportType === 'bulanan_upz' && (
                  <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Printer className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Cetak Laporan Bulanan Rekapitulasi ZIS (Per UPZ)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cetak Rekapitulasi Penerimaan Zakat, Infak, Sedekah (ZIS) per UPZ sesuai format resmi BAZNAS Kota Semarang.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Bulan</label>
                        <select
                          value={bulananReportMonth}
                          onChange={(e) => setBulananReportMonth(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-700"
                        >
                          <option value={1}>Januari</option>
                          <option value={2}>Februari</option>
                          <option value={3}>Maret</option>
                          <option value={4}>April</option>
                          <option value={5}>Mei</option>
                          <option value={6}>Juni</option>
                          <option value={7}>Juli</option>
                          <option value={8}>Agustus</option>
                          <option value={9}>September</option>
                          <option value={10}>Oktober</option>
                          <option value={11}>November</option>
                          <option value={12}>Desember</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Tahun</label>
                        <input
                          type="number"
                          value={bulananReportYear}
                          onChange={(e) => setBulananReportYear(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tanggal Cetak</label>
                        <input
                          type="date"
                          value={bulananReportSignDate}
                          onChange={(e) => setBulananReportSignDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-teal-100 space-y-3 text-xs">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        Penandatangan Laporan Bulanan
                      </h5>

                      {/* Kepala Pelaksana */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Kepala Pelaksana</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatoriesBulanan(prev => ({ ...prev, kepalaPelaksana: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatoriesBulanan.kepalaPelaksana) ? signatoriesBulanan.kepalaPelaksana : ''}
                          >
                            <option value="">-- Pilih User --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatoriesBulanan.kepalaPelaksana}
                            onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, kepalaPelaksana: e.target.value }))}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-800"
                            placeholder="Nama Kepala Pelaksana"
                          />
                        </div>
                      </div>

                      {/* Kabid / Kabag Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Kabid / Kabag Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatoriesBulanan(prev => ({ ...prev, kabagPengumpulan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatoriesBulanan.kabagPengumpulan) ? signatoriesBulanan.kabagPengumpulan : ''}
                          >
                            <option value="">-- Pilih User --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatoriesBulanan.kabagPengumpulan}
                            onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, kabagPengumpulan: e.target.value }))}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-800"
                            placeholder="Nama Kabag Pengumpulan"
                          />
                        </div>
                      </div>

                      {/* Waka I Bidang Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Wakil I Bidang Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatoriesBulanan(prev => ({ ...prev, waka1: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatoriesBulanan.waka1) ? signatoriesBulanan.waka1 : ''}
                          >
                            <option value="">-- Pilih User --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatoriesBulanan.waka1}
                            onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, waka1: e.target.value }))}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-800"
                            placeholder="Nama Waka I Bidang Pengumpulan"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={async () => {
                          setIsFetchingRekap(true);
                          try {
                            const res = await axios.get('/api/penerimaan-zis/rekap-bulanan', {
                              params: { month: bulananReportMonth, year: bulananReportYear }
                            });
                            setRekapBulananCategories(res.data?.categories || {});
                            setRekapBulananUmumItems(res.data?.umumItems || []);
                            setIsFetchingRekap(false);
                            setIsReportModalOpen(false);
                            setTimeout(() => {
                              window.print();
                            }, 200);
                          } catch (err) {
                            console.error('Gagal mengambil data rekap bulanan:', err);
                            alert('Gagal mengambil data Laporan Bulanan Rekap ZIS');
                            setIsFetchingRekap(false);
                          }
                        }}
                        disabled={isFetchingRekap}
                        className="py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isFetchingRekap ? (
                          <>
                            <RefreshCw className="size-4 animate-spin" />
                            Menyiapkan...
                          </>
                        ) : (
                          <>
                            <Printer className="size-4" />
                            Cetak / Download PDF
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadBulananExcel}
                        disabled={isFetchingRekap}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isFetchingRekap ? (
                          <>
                            <RefreshCw className="size-4 animate-spin" />
                            Menyiapkan...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="size-4" />
                            Download Excel (.xlsx)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Option 3: Laporan Excel */}
                {selectedReportType === 'excel' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <FileSpreadsheet className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Download Laporan Penerimaan (Excel)</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Unduh rekapan penerimaan ZIS dalam format spreadsheet Excel.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dari Tanggal</label>
                        <input 
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sampai Tanggal</label>
                        <input 
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      disabled={isLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          <span>Sedang Mengunduh...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="size-4" />
                          <span>Unduh Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Auto-Generate No. SIMBA Massal */}
        {isBulkSimbaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsBulkSimbaModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Auto-Generate No. SIMBA Massal</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Menghasilkan &amp; menyimpan Nomor Transaksi SIMBA sekuensial secara otomatis.
                  </p>
                </div>
                <button 
                  onClick={() => setIsBulkSimbaModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="size-4 shrink-0 text-amber-600" />
                    <span>Generate Massal {selectedSimbaIds.length > 0 ? `${selectedSimbaIds.length} Transaksi Terpilih` : `${filteredData.length} Transaksi Antrean`}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Sistem akan mengisi No. Transaksi SIMBA secara berurutan dan mengubah status transaksi menjadi <span className="font-bold">SYNCED</span>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nomor SIMBA Pertama <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 2026/ZAKAT/001001 atau 1001" 
                    value={bulkSimbaStartNo}
                    onChange={(e) => setBulkSimbaStartNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: berakhiran angka yang akan bertambah otomatis (misal <code className="bg-slate-100 px-1 py-0.5 rounded">001001</code> → <code className="bg-slate-100 px-1 py-0.5 rounded">001002</code>, dst).
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBulkSimbaModalOpen(false)}
                  disabled={isSavingBulkSimba}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessBulkSimbaSequence}
                  disabled={isSavingBulkSimba}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingBulkSimba ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Generate &amp; Simpan Massal</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-3"
            >
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Printer className="size-4 text-slate-500" />
                Cetak Laporan
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Penerimaan
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Input Penerimaan ZIS
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className={cn("size-6 transition-transform duration-300", isFabOpen ? "rotate-45" : "rotate-0")} />
        </button>
      </div>

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setIsMigrationModalOpen(false);
                setParsedMigrationRows([]);
                setRawMigrationFileRows([]);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative bg-white w-full rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[calc(100dvh-4rem)] z-10 transition-all",
                parsedMigrationRows.length > 0 ? "max-w-5xl" : "max-w-md"
              )}
            >
              <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <FileSpreadsheet className="size-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900 font-sans">Migrasi Penerimaan ZIS</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Unggah file Excel untuk impor data historis transaksi penerimaan</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsMigrationModalOpen(false);
                    setParsedMigrationRows([]);
                    setRawMigrationFileRows([]);
                  }} 
                  className="p-2 hover:bg-slate-200/60 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="space-y-3">
                  <button onClick={downloadPenerimaanTemplate} className="w-full flex items-center justify-between p-3.5 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-primary font-sans">Download Format Template Excel</p>
                        <p className="text-[10px] text-primary/70 font-medium font-sans">Hanya Kode Program (101.1-102.11) & Kode Akun COA</p>
                      </div>
                    </div>
                  </button>

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
                      onChange={handlePenerimaanFileSelect} 
                      disabled={migrating}
                    />
                  </label>
                </div>

                {/* Staging / Preview Table */}
                {parsedMigrationRows.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    {/* Sleek Summary Bar (CatatMutasi / BukuBesar Style) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 text-xs font-sans">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <FileText className="size-4 text-slate-400" />
                        <span>Hasil Pembacaan Excel ({parsedMigrationRows.length} Baris)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          {migrationSummaryStats.validCount} Valid / Terhubung
                        </span>
                        {migrationSummaryStats.warningCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-bold">
                            <AlertCircle className="size-3.5 text-amber-600" />
                            {migrationSummaryStats.warningCount} Belum Terhubung
                          </span>
                        )}
                        <span className="font-mono text-slate-900 font-bold">
                          Total: Rp {migrationSummaryStats.totalNominal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Bulk Konsolidasi Nama UPZ (Penerimaan Bank Jateng Style) */}
                    {uniqueUnmatchedUpzNames.length > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <Building2 className="size-4 text-emerald-600" />
                          <span>Konsolidasi Nama UPZ Excel ke Database UPZ ({uniqueUnmatchedUpzNames.length} Nama Belum Terhubung)</span>
                        </div>
                        <div className="space-y-2">
                          {uniqueUnmatchedUpzNames.map(({ name, count }) => (
                            <div key={name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 gap-3 text-xs shadow-sm hover:border-slate-300 transition-all">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 text-sm" title={name}>{name}</p>
                                <p className="text-xs text-slate-500 font-medium">{count} Transaksi di Excel belum terhubung</p>
                              </div>
                              <div className="w-full sm:w-[320px] shrink-0">
                                <UpzSearchDropdown
                                  value=""
                                  onSelect={(upzId) => handleMapExcelUpzNameToDatabase(name, upzId)}
                                  placeholder="Cari & Hubungkan ke Database UPZ..."
                                  upzList={upzList}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl overflow-x-auto min-h-[340px] max-h-[460px] custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20">
                            <th className="px-3 py-2 text-center w-12 bg-slate-100">#</th>
                            <th className="px-3 py-2 bg-slate-100">Kode Prog / RKAT</th>
                            <th className="px-3 py-2 bg-slate-100">Kode Akun</th>
                            <th className="px-3 py-2 bg-slate-100">Sumber Dana</th>
                            <th className="px-3 py-2 bg-slate-100">Tanggal</th>
                            <th className="px-3 py-2 bg-slate-100">Muzakki</th>
                            <th className="px-3 py-2 bg-slate-100 min-w-[280px]">Status UPZ</th>
                            <th className="px-3 py-2 text-right bg-slate-100">Nominal (Rp)</th>
                            <th className="px-3 py-2 bg-slate-100">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedMigrationRows.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors text-[11px]">
                              <td className="px-3 py-2 text-center font-bold text-slate-400">{item.rowNum}</td>
                              <td className="px-3 py-2 font-medium">
                                {item.matchedRkat ? (
                                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100" title={`Program RKAT: ${item.matchedRkat.nama_program}`}>
                                    <CheckCircle2 className="size-3 text-blue-600 shrink-0" />
                                    {item.kodeProgram !== '-' ? item.kodeProgram : item.matchedRkat.no || 'RKAT'}
                                  </span>
                                ) : item.kodeProgram && item.kodeProgram !== '-' ? (
                                  <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200" title="Kode program di Excel belum terhubung langsung ke RKAT">
                                    {item.kodeProgram}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">{item.kodeAkun}</td>
                              <td className="px-3 py-2 font-medium text-slate-700">{item.sumberDana}</td>
                              <td className="px-3 py-2 text-slate-600">{item.tanggalTrx}</td>
                              <td className="px-3 py-2 font-bold text-slate-800">{item.namaMuzakki}</td>
                              <td className="px-3 py-2 font-medium min-w-[200px]">
                                {item.matchedUpz ? (
                                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 truncate max-w-full" title={`Terhubung DB UPZ: ${item.matchedUpz.nama_upz || item.matchedUpz.name}`}>
                                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                    {item.matchedUpz.nama_upz || item.matchedUpz.name}
                                  </span>
                                ) : item.namaUpz && item.namaUpz !== '-' ? (
                                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-[10px] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 truncate max-w-full" title="Belum terhubung ke Database UPZ. Hubungkan menggunakan panel Konsolidasi di atas.">
                                    <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                                    {item.namaUpz} (Belum Terhubung)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">
                                Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2 text-slate-500 max-w-[180px] truncate" title={item.keterangan}>
                                {item.keterangan}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleProcessMigrationSubmit}
                      disabled={migrating}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {migrating ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Memproses Migrasi Data...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          Proses Impor & Migrasi Data ({parsedMigrationRows.length} Transaksi)
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
      </div>

      {/* Print Layout for Laporan Bulanan Rekapitulasi ZIS per UPZ */}
      <div className="print-only-container hidden print:block w-full text-black font-sans text-xs p-1 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        <div className="text-center font-bold uppercase tracking-wide mb-2">
          <p className="text-[11px] font-black text-slate-900 leading-tight">REKAPITULASI PENERIMAAN ZAKAT, INFAK, SEDEKAH (ZIS)</p>
          <p className="text-[10px] font-black text-slate-800 leading-tight">BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</p>
          <p className="text-[9px] font-bold text-slate-600 mt-0.5 leading-tight">
            PERIODE {['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'][bulananReportMonth - 1]} {bulananReportYear}
          </p>
        </div>

        <table className="w-full border-collapse text-left [table-layout:fixed] text-[8px] border border-slate-400">
          <thead>
            <tr className="bg-teal-800 text-white font-black text-[8.5px] border border-teal-900">
              <th className="w-7 border border-teal-900 py-1 px-0.5 text-center">NO</th>
              <th className="border border-teal-900 py-1 px-1">NAMA UPZ</th>
              <th className="w-24 border border-teal-900 py-1 px-1 text-right">ZAKAT</th>
              <th className="w-24 border border-teal-900 py-1 px-1 text-right">INFAK</th>
              <th className="w-28 border border-teal-900 py-1 px-1 text-right">JUMLAH ZIS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 border border-slate-400">
            {(() => {
              let upzKotaZakat = 0;
              let upzKotaInfak = 0;
              let upzKotaTotal = 0;

              Object.values(rekapBulananCategories).forEach((items: any[]) => {
                items.forEach((it: any) => {
                  upzKotaZakat += Number(it.zakat || 0);
                  upzKotaInfak += Number(it.infak || 0);
                  upzKotaTotal += Number(it.total || 0);
                });
              });

              let umumZakat = (rekapBulananUmumItems || []).reduce((sum, it) => sum + Number(it.zakat || 0), 0);
              let umumInfak = (rekapBulananUmumItems || []).reduce((sum, it) => sum + Number(it.infak || 0), 0);
              let umumTotal = umumZakat + umumInfak;

              let grandZakat = upzKotaZakat + umumZakat;
              let grandInfak = upzKotaInfak + umumInfak;
              let grandTotal = upzKotaTotal + umumTotal;

              return (
                <React.Fragment>
                  {Object.entries(rekapBulananCategories).map(([catName, items]: [string, any]) => {
                    const catZakat = items.reduce((sum: number, it: any) => sum + Number(it.zakat || 0), 0);
                    const catInfak = items.reduce((sum: number, it: any) => sum + Number(it.infak || 0), 0);
                    const catTotal = catZakat + catInfak;

                    return (
                      <React.Fragment key={catName}>
                        <tr className="bg-emerald-100 text-emerald-950 font-black border border-emerald-300 break-inside-avoid">
                          <td colSpan={5} className="py-[2px] px-1 uppercase tracking-wide font-black text-[7.5px] bg-emerald-100">
                            {catName}
                          </td>
                        </tr>
                        {items.map((it: any, idx: number) => (
                          <tr key={it.id || idx} className="border-b border-slate-200 break-inside-avoid">
                            <td className="py-[1px] px-0.5 text-center font-mono text-[7px] leading-tight">{idx + 1}</td>
                            <td className="py-[1px] px-1 font-bold text-[7.5px] leading-tight">{it.nama_upz}</td>
                            <td className="py-[1px] px-1 text-right font-mono text-[7.5px] leading-tight">
                              {it.zakat > 0 ? `Rp ${Number(it.zakat).toLocaleString('id-ID')}` : 'Rp -'}
                            </td>
                            <td className="py-[1px] px-1 text-right font-mono text-[7.5px] leading-tight">
                              {it.infak > 0 ? `Rp ${Number(it.infak).toLocaleString('id-ID')}` : 'Rp -'}
                            </td>
                            <td className="py-[1px] px-1 text-right font-mono font-bold text-[7.5px] leading-tight">
                              {it.total > 0 ? `Rp ${Number(it.total).toLocaleString('id-ID')}` : 'Rp -'}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-black border border-emerald-200 bg-emerald-50 text-emerald-900 break-inside-avoid">
                          <td colSpan={2} className="py-[2px] px-1 text-right font-black text-[7.5px] leading-tight">JUMLAH</td>
                          <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                            {catZakat > 0 ? `Rp ${catZakat.toLocaleString('id-ID')}` : 'Rp -'}
                          </td>
                          <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                            {catInfak > 0 ? `Rp ${catInfak.toLocaleString('id-ID')}` : 'Rp -'}
                          </td>
                          <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                            {catTotal > 0 ? `Rp ${catTotal.toLocaleString('id-ID')}` : 'Rp -'}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* TOTAL PENERIMAAN ZIS (UPZ KOTA) */}
                  <tr className="font-black border-2 border-emerald-700 bg-teal-100 text-teal-950 text-[8px] break-inside-avoid">
                    <td colSpan={2} className="py-1 px-1 text-left uppercase tracking-wide font-black">TOTAL PENERIMAAN ZIS (UPZ KOTA)</td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {upzKotaZakat > 0 ? `Rp ${upzKotaZakat.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {upzKotaInfak > 0 ? `Rp ${upzKotaInfak.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {upzKotaTotal > 0 ? `Rp ${upzKotaTotal.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                  </tr>

                  {/* PENERIMAAN ZIS UMUM */}
                  <React.Fragment>
                    <tr className="bg-sky-100 text-sky-950 font-black border border-sky-300 break-inside-avoid">
                      <td colSpan={5} className="py-[2px] px-1 uppercase tracking-wide font-black text-[7.5px] bg-sky-100">
                        PENERIMAAN ZIS UMUM
                      </td>
                    </tr>
                    {(rekapBulananUmumItems || []).map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="border-b border-slate-200 break-inside-avoid">
                        <td className="py-[1px] px-0.5 text-center font-mono text-[7px] leading-tight">{idx + 1}</td>
                        <td className="py-[1px] px-1 font-bold text-[7.5px] leading-tight">{it.nama_upz}</td>
                        <td className="py-[1px] px-1 text-right font-mono text-[7.5px] leading-tight">
                          {it.zakat > 0 ? `Rp ${Number(it.zakat).toLocaleString('id-ID')}` : 'Rp -'}
                        </td>
                        <td className="py-[1px] px-1 text-right font-mono text-[7.5px] leading-tight">
                          {it.infak > 0 ? `Rp ${Number(it.infak).toLocaleString('id-ID')}` : 'Rp -'}
                        </td>
                        <td className="py-[1px] px-1 text-right font-mono font-bold text-[7.5px] leading-tight">
                          {it.total > 0 ? `Rp ${Number(it.total).toLocaleString('id-ID')}` : 'Rp -'}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-black border border-sky-200 bg-sky-50 text-sky-900 break-inside-avoid">
                      <td colSpan={2} className="py-[2px] px-1 text-right font-black text-[7.5px] leading-tight">JUMLAH</td>
                      <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                        {umumZakat > 0 ? `Rp ${umumZakat.toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                      <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                        {umumInfak > 0 ? `Rp ${umumInfak.toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                      <td className="py-[2px] px-1 text-right font-mono font-black text-[7.5px] leading-tight">
                        {umumTotal > 0 ? `Rp ${umumTotal.toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                    </tr>
                  </React.Fragment>

                  {/* TOTAL PENERIMAAN ZIS */}
                  <tr className="font-black border-2 border-emerald-900 bg-emerald-700 text-white text-[8.5px] break-inside-avoid">
                    <td colSpan={2} className="py-1 px-1 text-left uppercase tracking-wide font-black">TOTAL PENERIMAAN ZIS</td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {grandZakat > 0 ? `Rp ${grandZakat.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {grandInfak > 0 ? `Rp ${grandInfak.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-black">
                      {grandTotal > 0 ? `Rp ${grandTotal.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })()}
          </tbody>
        </table>

        {/* Footer Tanda Tangan Resmi BAZNAS Kota Semarang (Unified Break-Inside Avoid Container) */}
        <div 
          className="print-signatures mt-3 pt-1 text-[8.5px] font-bold break-inside-avoid page-break-inside-avoid"
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          <div className="flex justify-between items-start">
            <div className="text-center w-1/3">
              <p>Kepala Pelaksana</p>
              <div className="h-7" />
              <p className="underline font-black">{signatoriesBulanan.kepalaPelaksana}</p>
            </div>

            <div className="text-center w-1/3">
              <p>
                Semarang, {(() => {
                  if (!bulananReportSignDate) return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  const [y, m, d] = bulananReportSignDate.split('-').map(Number);
                  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  return `${d || ''} ${monthNames[(m || 1) - 1]} ${y || ''}`.trim();
                })()}
              </p>
              <p>Kepala Bagian Pengumpulan</p>
              <div className="h-7" />
              <p className="underline font-black">{signatoriesBulanan.kabagPengumpulan}</p>
            </div>
          </div>

          <div className="mt-1 text-center text-[8.5px] font-bold">
            <p>Mengetahui,</p>
            <p>Wakil Ketua I Bidang Pengumpulan</p>
            <div className="h-7" />
            <p className="underline font-black">{signatoriesBulanan.waka1}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
