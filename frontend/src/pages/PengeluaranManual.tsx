import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FileText,
  Calendar,
  Coins,
  Filter,
  ChevronDown,
  Check,
  ListOrdered,
  Banknote,
  Send,
  Plus,
  X,
  Search,
  ExternalLink,
  Link2,
  Receipt,
  Eye,
  Sparkles,
  Edit3,
  Trash2,
  Users,
  Copy,
  PlusCircle,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

import { createPortal } from 'react-dom';

function toGDriveEmbedUrl(link?: string | null): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

interface BankAccount {
  account_id: string;
  nama_akun: string;
  tipe_kas: string;
  kelompok_dana: string;
  saldo: number;
  no_rekening?: string;
  coa_code: string;
}

interface ManualDraft {
  id: string;
  tanggalCatatan: string;
  tanggal: string;
  bankAccountId: string;
  bankName: string;
  keteranganBank: string;
  nominal: number;
  type: 'DEBIT' | 'KREDIT';
  status: 'PENDING' | 'RECONCILED';
}

interface BreakdownRow {
  id: string;
  nama_penerima: string;
  keterangan: string;
  rkat_id: string;
  coa_code: string;
  nominal: number;
}

// Searchable Table Dropdown for RKAT with Portal Positioning & Multi-Line Specification
interface SearchableTableRkatSelectProps {
  selectedValue: string;
  onChange: (rkatId: string, itemObj?: any) => void;
  options: any[];
  placeholder?: string;
  emptyLabel?: string;
}

const SearchableTableRkatSelect: React.FC<SearchableTableRkatSelectProps> = ({
  selectedValue,
  onChange,
  options,
  placeholder = "Cari kegiatan, pos anggaran, kode RKAT, atau spesifikasi...",
  emptyLabel = "-- Pilih / Cari RKAT --"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 380
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(Math.max(rect.width, 380), 440);
      let leftPos = rect.left;
      if (leftPos + popoverWidth > window.innerWidth - 16) {
        leftPos = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(16, leftPos),
        width: popoverWidth
      });
      setSearchTerm("");
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setIsOpen(false);
          return;
        }
        const popoverWidth = Math.min(Math.max(rect.width, 380), 440);
        let leftPos = rect.left;
        if (leftPos + popoverWidth > window.innerWidth - 16) {
          leftPos = Math.max(16, window.innerWidth - popoverWidth - 16);
        }
        setCoords({
          top: rect.bottom + 4,
          left: Math.max(16, leftPos),
          width: popoverWidth
        });
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) && 
        triggerRef.current && 
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(opt =>
      (opt.nama || opt.name || '').toLowerCase().includes(term) ||
      (opt.no || opt.code || '').toLowerCase().includes(term) ||
      (opt.keterangan || '').toLowerCase().includes(term) ||
      (opt.spesifikasi || '').toLowerCase().includes(term) ||
      (opt.category || opt.categoryOrPilar || '').toLowerCase().includes(term) ||
      (opt.coaCode || '').toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.id === selectedValue || o.value === selectedValue);

  return (
    <>
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "w-full min-h-[36px] px-2.5 py-1.5 bg-white border rounded-lg text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left",
          isOpen ? "ring-2 ring-primary/20 border-primary shadow-xs" : "border-slate-200 hover:border-slate-300",
          selectedOption ? "bg-slate-50/50" : "text-slate-400"
        )}
      >
        <div className="flex-1 min-w-0 pr-1">
          {selectedOption ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedOption.no && (
                  <span className="font-mono font-black text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                    {selectedOption.no || selectedOption.code}
                  </span>
                )}
                <span className="font-bold text-slate-800 text-[11px] leading-snug break-words">
                  {selectedOption.nama || selectedOption.name}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">{emptyLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded transition-colors"
              title="Hapus Pilihan"
            >
              <X className="size-3" />
            </button>
          )}
          <ChevronDown className={cn("size-3 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {/* Portal Dropdown Popover */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 999999
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-bold">
            <span>{filteredOptions.length} Kegiatan / Program RKAT</span>
            {selectedOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-rose-600 hover:underline cursor-pointer"
              >
                Reset Pilihan
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Tidak ada data RKAT yang sesuai dengan kata kunci "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt: any) => {
                const isSelected = (opt.id === selectedValue || opt.value === selectedValue);
                return (
                  <div
                    key={opt.id || opt.value}
                    onClick={() => {
                      onChange(opt.id || opt.value, opt);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl cursor-pointer transition-all space-y-1.5 text-left mb-1",
                      isSelected 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {opt.no && (
                          <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {opt.no || opt.code}
                          </span>
                        )}
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border",
                          opt.type === 'OPERASIONAL' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {opt.categoryOrPilar || opt.category || opt.type || 'RKAT'}
                        </span>
                        {opt.asnaf && opt.asnaf !== 'Semua' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {opt.asnaf}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0" />}
                    </div>

                    <div className="font-bold text-xs text-slate-800 whitespace-normal break-words leading-snug">
                      {opt.nama || opt.name}
                    </div>

                    {/* Keterangan / Spesifikasi: Wraps cleanly on multiple lines with proper formatting */}
                    {(opt.keterangan || opt.spesifikasi) && (
                      <div className="text-[11px] text-slate-600 bg-slate-50/80 border border-slate-100 p-2 rounded-lg whitespace-pre-wrap break-words leading-relaxed font-normal">
                        <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Keterangan / Spesifikasi:</span>
                        {opt.keterangan || opt.spesifikasi}
                      </div>
                    )}

                    {opt.coaCode && (
                      <div className="text-[10px] text-slate-400 font-mono font-semibold">
                        Saran COA: <span className="text-slate-600 font-bold">{opt.coaCode}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// Searchable Table Dropdown for COA Beban with Portal Positioning
interface SearchableTableCoaSelectProps {
  selectedValue: string;
  onChange: (coaCode: string, itemObj?: any) => void;
  options: any[];
  placeholder?: string;
  emptyLabel?: string;
}

const SearchableTableCoaSelect: React.FC<SearchableTableCoaSelectProps> = ({
  selectedValue,
  onChange,
  options,
  placeholder = "Cari kode akun COA atau nama akun...",
  emptyLabel = "-- Pilih / Cari COA Beban --"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 340
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(Math.max(rect.width, 340), 400);
      let leftPos = rect.left;
      if (leftPos + popoverWidth > window.innerWidth - 16) {
        leftPos = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(16, leftPos),
        width: popoverWidth
      });
      setSearchTerm("");
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setIsOpen(false);
          return;
        }
        const popoverWidth = Math.min(Math.max(rect.width, 340), 400);
        let leftPos = rect.left;
        if (leftPos + popoverWidth > window.innerWidth - 16) {
          leftPos = Math.max(16, window.innerWidth - popoverWidth - 16);
        }
        setCoords({
          top: rect.bottom + 4,
          left: Math.max(16, leftPos),
          width: popoverWidth
        });
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) && 
        triggerRef.current && 
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = React.useMemo(() => {
    const list = options.filter(c => c && (c.klasifikasi === 'Beban' || (c.coa_code && c.coa_code.startsWith('5')) || c.coa_code?.startsWith('4')));
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    const cleanTerm = term.replace(/\./g, '');
    return list.filter(c =>
      (c.coa_code && c.coa_code.replace(/\./g, '').includes(cleanTerm)) ||
      (c.nama_akun && c.nama_akun.toLowerCase().includes(term)) ||
      (c.klasifikasi && c.klasifikasi.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(c => c.coa_code === selectedValue || c.coa_code?.replace(/\./g, '') === selectedValue?.replace(/\./g, ''));

  return (
    <>
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "w-full min-h-[36px] px-2.5 py-1.5 bg-white border rounded-lg text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left",
          isOpen ? "ring-2 ring-primary/20 border-primary shadow-xs" : "border-slate-200 hover:border-slate-300",
          selectedOption ? "bg-slate-50/50" : "text-slate-400"
        )}
      >
        <div className="flex-1 min-w-0 pr-1">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-black text-primary text-[10px] bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                {selectedOption.coa_code}
              </span>
              <span className="font-bold text-slate-800 text-[11px] leading-snug break-words">
                {selectedOption.nama_akun}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">{emptyLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded transition-colors"
              title="Hapus Pilihan"
            >
              <X className="size-3" />
            </button>
          )}
          <ChevronDown className={cn("size-3 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {/* Portal Dropdown Popover */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 999999
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-bold">
            <span>{filteredOptions.length} Akun COA Beban</span>
            {selectedOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-rose-600 hover:underline cursor-pointer"
              >
                Reset Pilihan
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Tidak ada akun COA yang sesuai dengan kata kunci "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((c: any) => {
                const isSelected = (c.coa_code === selectedValue || c.coa_code?.replace(/\./g, '') === selectedValue?.replace(/\./g, ''));
                return (
                  <div
                    key={c.coa_code}
                    onClick={() => {
                      onChange(c.coa_code, c);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-2 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 text-left mb-1",
                      isSelected 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-primary">
                          {c.coa_code}
                        </span>
                        {c.klasifikasi && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {c.klasifikasi}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 whitespace-normal break-words leading-snug">
                        {c.nama_akun}
                      </div>
                    </div>

                    {isSelected && <Check className="size-4 text-primary shrink-0 mt-1" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default function PengeluaranManual() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'langsung' | 'antrean'>('langsung');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  
  // Direct Payout Form States
  const [recentDrafts, setRecentDrafts] = useState<ManualDraft[]>([]);
  const [tanggalCatatan, setTanggalCatatan] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date().toISOString().split('T')[0]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [judulPengeluaran, setJudulPengeluaran] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSourceAccountDropdownOpen, setIsSourceAccountDropdownOpen] = useState(false);
  const [isFilterAccountDropdownOpen, setIsFilterAccountDropdownOpen] = useState(false);
  const [isFilterMonthDropdownOpen, setIsFilterMonthDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [kategoriBiaya, setKategoriBiaya] = useState('');

  // Direct Manual Expense Mode States
  const [directMode, setDirectMode] = useState<'tunggal' | 'breakdown'>('tunggal');
  const [directExcelPasteText, setDirectExcelPasteText] = useState('');
  const [directBreakdownRows, setDirectBreakdownRows] = useState<BreakdownRow[]>([]);

  // Edit Transaction Draft States
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [editTanggalCatatan, setEditTanggalCatatan] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editJudul, setEditJudul] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editKategoriBiaya, setEditKategoriBiaya] = useState('');
  const [editNominal, setEditNominal] = useState('');
  const [editLinkNota, setEditLinkNota] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Queue tab states
  const [queueList, setQueueList] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);
  
  // Master RKAT & COA States
  const [rkats, setRkats] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);

  // Unified RKAT List for Searchable Dropdowns
  const allRkatOptions = React.useMemo(() => {
    const list: any[] = [];

    // 1. Operasional RKAT
    rkats.forEach((item: any) => {
      let firstCoa = item.coa_codes ? item.coa_codes.split(',')[0].trim() : '';
      if (!firstCoa && coas.length > 0) {
        const itemNamaLower = (item.nama || '').toLowerCase();
        const matched = coas.find((c: any) => c.coa_code?.startsWith('52') && (c.nama_akun?.toLowerCase().includes(itemNamaLower) || itemNamaLower.includes(c.nama_akun?.toLowerCase())))
          || coas.find((c: any) => c.coa_code === '5210101' || c.coa_code?.startsWith('52'));
        if (matched) firstCoa = matched.coa_code;
      }

      list.push({
        id: item.id,
        value: item.id,
        no: item.no || '',
        code: item.no || '',
        nama: item.nama || '',
        name: item.nama || '',
        keterangan: item.keterangan || item.pos_anggaran || item.deskripsi || '',
        category: 'Operasional',
        categoryOrPilar: 'Operasional',
        coaCode: firstCoa,
        allCoaCodes: item.coa_codes || '',
        type: 'OPERASIONAL'
      });
    });

    // 2. Penyaluran RKAT (from pilars)
    pilars.forEach((pilar: any) => {
      (pilar.programs || []).forEach((prog: any) => {
        (prog.asnafTargets || []).forEach((asnafItem: any, aIdx: number) => {
          const actId = asnafItem.id || `${prog.id}-${aIdx}`;
          list.push({
            id: actId,
            value: actId,
            no: prog.kode_program || prog.kode || pilar.kode || '',
            code: prog.kode_program || prog.kode || pilar.kode || '',
            nama: prog.nama_program || prog.name || '',
            name: prog.nama_program || prog.name || '',
            keterangan: asnafItem.keterangan || prog.deskripsi || asnafItem.spesifikasi || (asnafItem.asnaf ? `Asnaf ${asnafItem.asnaf}` : '') || pilar.nama_pilar,
            spesifikasi: asnafItem.spesifikasi || prog.deskripsi || '',
            category: pilar.nama_pilar || 'Penyaluran',
            categoryOrPilar: pilar.nama_pilar || 'Penyaluran',
            asnaf: asnafItem.asnaf || 'Semua',
            coaCode: asnafItem.coa_code || prog.coa_code || '',
            type: 'PENYALURAN'
          });
        });
      });
    });

    return list;
  }, [rkats, pilars, coas]);

  // Queue Payout Modal States
  const [payoutMode, setPayoutMode] = useState<'tunggal' | 'breakdown'>('tunggal');
  const [excelPasteText, setExcelPasteText] = useState('');
  const [breakdownRows, setBreakdownRows] = useState<BreakdownRow[]>([]);
  const [payoutBankAccountId, setPayoutBankAccountId] = useState('');
  const [payoutSumberDana, setPayoutSumberDana] = useState('AMIL');
  const [payoutNominalRealisasi, setPayoutNominalRealisasi] = useState('');
  const [payoutLinkNota, setPayoutLinkNota] = useState('');
  const [payoutCatatan, setPayoutCatatan] = useState('');
  const [isPayoutSubmitLoading, setIsPayoutSubmitLoading] = useState(false);
  const [isPayoutDropdownOpen, setIsPayoutDropdownOpen] = useState(false);
  const [showEmbedPreview, setShowEmbedPreview] = useState(false);

  // General Status & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const renderFormContent = (isMobile = false) => {
    const numericNominal = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
    const totalDirectNominal = directMode === 'breakdown'
      ? directBreakdownRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0)
      : numericNominal;

    const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);
    const isOverdrawn = selectedAccount ? totalDirectNominal > selectedAccount.saldo : false;

    return (
      <form 
        onSubmit={async (e) => {
          await handleDirectSubmit(e);
          if (isMobile) {
            setIsFormModalOpen(false);
          }
        }} 
        className="space-y-6"
      >
        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setDirectMode('tunggal')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              directMode === 'tunggal' 
                ? "bg-white text-primary shadow-xs font-black" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Coins className="size-3.5" />
            Pencatatan Tunggal
          </button>
          <button
            type="button"
            onClick={() => {
              setDirectMode('breakdown');
              if (directBreakdownRows.length === 0) {
                setDirectBreakdownRows([{
                  id: `dir-row-${Date.now()}`,
                  nama_penerima: '',
                  keterangan: '',
                  rkat_id: '',
                  coa_code: '',
                  nominal: 0
                }]);
              }
            }}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              directMode === 'breakdown' 
                ? "bg-white text-primary shadow-xs font-black" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Users className="size-3.5" />
            Pecah Rincian By-Name (Excel Paste)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              Tanggal Catatan
            </label>
            <input
              type="date"
              value={tanggalCatatan}
              onChange={(e) => setTanggalCatatan(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={tanggalTransaksi}
              onChange={(e) => setTanggalTransaksi(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-450 flex items-center gap-1.5">
            <Coins className="size-4 text-slate-400" />
            Sumber Kas (Sumber Dana Kas)
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSourceAccountDropdownOpen(!isSourceAccountDropdownOpen)}
              className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">
                {selectedAccount 
                  ? `${selectedAccount.nama_akun} - (Rp ${Number(selectedAccount.saldo).toLocaleString('id-ID')})`
                  : '-- Pilih Sumber Kas --'
                }
              </span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isSourceAccountDropdownOpen && "rotate-180")} />
            </button>

            {isSourceAccountDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSourceAccountDropdownOpen(false)} />
                <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                    <button
                      key={acc.account_id}
                      type="button"
                      onClick={() => {
                        setSourceAccountId(acc.account_id);
                        setIsSourceAccountDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                        sourceAccountId === acc.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                      )}
                    >
                      <span className="font-bold">{acc.nama_akun}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-mono font-bold">Rp {Number(acc.saldo).toLocaleString('id-ID')}</span>
                        {sourceAccountId === acc.account_id && <Check className="size-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Form Mode Tunggal */}
        {directMode === 'tunggal' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Judul Pengeluaran *
              </label>
              <input
                type="text"
                value={judulPengeluaran}
                onChange={(e) => setJudulPengeluaran(e.target.value)}
                placeholder="Contoh: Beli Galon & Kopi Kantor"
                className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold text-slate-800"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Nominal Transaksi *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">Rp</span>
                <input
                  type="text"
                  value={nominal ? parseInt(nominal).toLocaleString('id-ID') : ''}
                  onChange={handleNominalChange}
                  placeholder="Masukkan jumlah nominal..."
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-black text-slate-900"
                  required
                />
              </div>
            </div>
          </>
        )}

        {/* Form Mode Breakdown By-Name */}
        {directMode === 'breakdown' && (
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Judul / Kelompok Pengeluaran (Opsional)
              </label>
              <input
                type="text"
                value={judulPengeluaran}
                onChange={(e) => setJudulPengeluaran(e.target.value)}
                placeholder="Contoh: Honorarium Petugas / Bantuan Operasional..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold text-slate-800"
              />
            </div>

            {/* Excel Paste Box */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  Tempel (Paste) Data dari Excel / Spreadsheet
                </label>
                <button
                  type="button"
                  onClick={copyExcelTemplate}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 bg-slate-50 border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <Copy className="size-3" /> Salin Template Excel
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Urutan kolom di Excel: <span className="font-mono font-bold text-slate-700">Nama Penerima</span> [Tab] <span className="font-mono font-bold text-slate-700">Keterangan/Jabatan</span> [Tab] <span className="font-mono font-bold text-slate-700">No RKAT (opsional)</span> [Tab] <span className="font-mono font-bold text-slate-700">Kode COA</span> [Tab] <span className="font-mono font-bold text-slate-700">Nominal</span>
              </p>

              <textarea
                rows={3}
                value={directExcelPasteText}
                onChange={(e) => setDirectExcelPasteText(e.target.value)}
                placeholder="Tempel baris tabel dari Excel di sini (contoh: Budi Santoso	Gaji Staf IT	1.1.01	51010101	4500000)..."
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessDirectExcelPaste}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="size-3.5" />
                  Proses & Masukkan ke Tabel Rincian
                </button>
              </div>
            </div>

            {/* Interactive Breakdown Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Layers className="size-4 text-primary" />
                  Daftar Rincian Penerima ({directBreakdownRows.length} Orang/Item)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addBlankDirectBreakdownRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 cursor-pointer transition-colors"
                  >
                    <Plus className="size-3" /> Tambah Baris Manual
                  </button>
                  {directBreakdownRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDirectBreakdownRows([])}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {directBreakdownRows.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-xs">
                  <Users className="size-8 mx-auto mb-1.5 text-slate-300" />
                  Belum ada rincian penerima. Tempel dari Excel di atas atau klik Tambah Baris Manual.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Nama Penerima *</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Keterangan / Jabatan</th>
                        <th className="py-2.5 px-3 min-w-[220px]">RKAT (Program & Spesifikasi)</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Akun COA Beban</th>
                        <th className="py-2.5 px-3 min-w-[130px] text-right">Nominal (Rp) *</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {directBreakdownRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="Nama lengkap..."
                              value={row.nama_penerima}
                              onChange={(e) => updateDirectBreakdownRow(row.id, 'nama_penerima', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Contoh: Staf IT..."
                              value={row.keterangan}
                              onChange={(e) => updateDirectBreakdownRow(row.id, 'keterangan', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <SearchableTableRkatSelect
                              selectedValue={row.rkat_id}
                              onChange={(val, opt) => {
                                updateDirectBreakdownRow(row.id, 'rkat_id', val);
                                if (opt?.coaCode && !row.coa_code) {
                                  updateDirectBreakdownRow(row.id, 'coa_code', opt.coaCode);
                                }
                              }}
                              options={allRkatOptions}
                              emptyLabel="-- Cari / Pilih RKAT --"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <SearchableTableCoaSelect
                              selectedValue={row.coa_code}
                              onChange={(val) => updateDirectBreakdownRow(row.id, 'coa_code', val)}
                              options={coas}
                              emptyLabel="-- Cari / Pilih COA Beban --"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="text"
                              required
                              placeholder="0"
                              value={row.nominal ? Number(row.nominal).toLocaleString('id-ID') : ''}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                updateDirectBreakdownRow(row.id, 'nominal', raw);
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black font-mono text-right text-slate-900 outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeDirectBreakdownRow(row.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Baris"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Summary Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
              <div>
                <span className="text-slate-500 font-bold block text-[11px]">Total Pengeluaran By-Name:</span>
                <span className="font-black text-base text-slate-900 font-mono">{formatRupiah(totalDirectNominal)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({directBreakdownRows.length} Penerima)</span>
              </div>

              <div>
                {selectedAccount && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs",
                    isOverdrawn ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  )}>
                    {isOverdrawn ? (
                      <>
                        <AlertTriangle className="size-3.5" />
                        Saldo Kas Kurang {formatRupiah(totalDirectNominal - selectedAccount.saldo)}
                      </>
                    ) : (
                      <>
                        <Coins className="size-3.5 text-emerald-600" />
                        Sisa Kas: {formatRupiah(selectedAccount.saldo - totalDirectNominal)}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            Kategori Biaya
          </label>
          <select
            value={kategoriBiaya}
            onChange={(e) => setKategoriBiaya(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-semibold text-slate-700"
            required
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.nama}>{cat.nama}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Keterangan / Rincian Pengeluaran</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Detail rincian barang, nomor nota/bon, atau catatan tambahan..."
            className="w-full h-24 p-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isOverdrawn || (directMode === 'breakdown' && directBreakdownRows.length === 0)}
          className={cn(
            "w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer",
            isOverdrawn || (directMode === 'breakdown' && directBreakdownRows.length === 0)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
              : 'bg-primary hover:bg-primary/95 shadow-primary/25'
          )}
        >
          <Save className="size-5" />
          {isLoading 
            ? 'Menyimpan Draft...' 
            : directMode === 'breakdown'
              ? `Simpan Draft Pengeluaran By-Name (${formatRupiah(totalDirectNominal)})`
              : 'Simpan Draft Pengeluaran'
          }
        </button>
      </form>
    );
  };

  // Fetch Direct Payout Data
  const fetchDirectData = async () => {
    try {
      const [accountsRes, mutationsRes, categoriesRes, rkatRes, coaRes, pilarsRes] = await Promise.all([
        axios.get('/api/finance/accounts'),
        axios.get('/api/mutations'),
        axios.get('/api/kategori-biaya'),
        axios.get('/api/rkat-operasional').catch(() => ({ data: [] })),
        axios.get('/api/finance/coa').catch(() => ({ data: [] })),
        axios.get('/api/pilars').catch(() => ({ data: [] }))
      ]);

      setAccounts(accountsRes.data);
      
      const manualDrafts = mutationsRes.data.filter((m: any) => m.tanggalCatatan !== undefined);
      setRecentDrafts(manualDrafts);

      const cashList = accountsRes.data.filter((a: any) => a.tipe_kas === 'TUNAI');
      if (cashList.length > 0 && !sourceAccountId) {
        setSourceAccountId(cashList[0].account_id);
      }

      setCategories(categoriesRes.data.data || []);
      if (categoriesRes.data.data && categoriesRes.data.data.length > 0 && !kategoriBiaya) {
        setKategoriBiaya(categoriesRes.data.data[0].nama);
      }

      setRkats(Array.isArray(rkatRes.data) ? rkatRes.data : (rkatRes.data?.data || []));
      setCoas(Array.isArray(coaRes.data) ? coaRes.data : (coaRes.data?.data || []));

      const pilarsData = (pilarsRes.data || []).map((pilar: any) => ({
        ...pilar,
        programs: (pilar.programs || []).map((prog: any) => ({
          ...prog,
          asnafTargets: typeof prog.rkat_details === 'string'
            ? JSON.parse(prog.rkat_details || '[]')
            : (prog.rkat_details || [])
        }))
      }));
      setPilars(pilarsData);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat master data keuangan dari server.', 'error');
    }
  };

  // Fetch Queue Data
  const fetchQueueData = useCallback(async () => {
    try {
      setIsQueueLoading(true);
      const res = await axios.get('/api/pengajuan-pencairan?tab=queue');
      if (res.data.status === 'success') {
        setQueueList(res.data.data);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat antrean pengajuan pencairan.', 'error');
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectData();
    fetchQueueData();
  }, [fetchQueueData]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setNominal(rawVal);
  };

  // Multi-Item Breakdown for Direct Expense Form
  const handleProcessDirectExcelPaste = () => {
    if (!directExcelPasteText || !directExcelPasteText.trim()) {
      showToast('Silakan tempel (paste) baris data dari Excel terlebih dahulu.', 'error');
      return;
    }

    const lines = directExcelPasteText.split('\n');
    const newRows: BreakdownRow[] = [];
    let parsedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Ignore header line if user copied headers
      if (i === 0 && (line.toLowerCase().includes('nama penerima') || line.toLowerCase().includes('nominal') || line.toLowerCase().includes('rkat') || line.toLowerCase().includes('coa'))) {
        continue;
      }

      const cols = line.split('\t');
      if (cols.length === 0) continue;

      let nama = (cols[0] || '').trim();
      let ket = (cols[1] || '').trim();
      let rkatCol = (cols[2] || '').trim();
      let coaCol = (cols[3] || '').trim();
      let nominalStr = (cols[4] || '').trim();

      // If only 3 columns pasted: Nama, Keterangan, Nominal
      if (cols.length === 3) {
        nama = (cols[0] || '').trim();
        ket = (cols[1] || '').trim();
        nominalStr = (cols[2] || '').trim();
        rkatCol = '';
        coaCol = '';
      } else if (cols.length === 2) {
        nama = (cols[0] || '').trim();
        nominalStr = (cols[1] || '').trim();
        ket = '';
        rkatCol = '';
        coaCol = '';
      }

      const parsedNominal = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;
      if (!nama && parsedNominal <= 0) continue;

      // Match RKAT if provided
      let matchedRkatId = '';
      if (rkatCol) {
        const foundRkat = rkats.find((r: any) => 
          r.no?.toLowerCase() === rkatCol.toLowerCase() ||
          r.nama?.toLowerCase().includes(rkatCol.toLowerCase()) ||
          r.id === rkatCol
        );
        if (foundRkat) matchedRkatId = foundRkat.id;
      }

      // Match COA if provided
      let matchedCoaCode = '';
      if (coaCol) {
        const cleanCoa = coaCol.replace(/\./g, '').trim();
        const foundCoa = coas.find((c: any) => 
          (c.coa_code && c.coa_code.replace(/\./g, '') === cleanCoa) ||
          (c.nama_akun && c.nama_akun.toLowerCase().includes(coaCol.toLowerCase()))
        );
        if (foundCoa) matchedCoaCode = foundCoa.coa_code;
      }

      // Auto-fallback COA from RKAT if not specified
      if (!matchedCoaCode && matchedRkatId) {
        const foundRkat = rkats.find((r: any) => r.id === matchedRkatId);
        if (foundRkat && foundRkat.coa_codes) {
          matchedCoaCode = foundRkat.coa_codes.split(',')[0].trim();
        }
      }

      newRows.push({
        id: `dir-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nama_penerima: nama,
        keterangan: ket,
        rkat_id: matchedRkatId,
        coa_code: matchedCoaCode,
        nominal: parsedNominal
      });
      parsedCount++;
    }

    if (newRows.length === 0) {
      showToast('Tidak ada baris data valid yang berhasil diproses. Pastikan format kolom sesuai.', 'error');
      return;
    }

    setDirectBreakdownRows(prev => [...prev, ...newRows]);
    setDirectExcelPasteText('');
    showToast(`Berhasil memproses ${parsedCount} baris penerima dari Excel!`, 'success');
  };

  const addBlankDirectBreakdownRow = () => {
    setDirectBreakdownRows(prev => [
      ...prev,
      {
        id: `dir-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nama_penerima: '',
        keterangan: '',
        rkat_id: '',
        coa_code: '',
        nominal: 0
      }
    ]);
  };

  const removeDirectBreakdownRow = (id: string) => {
    setDirectBreakdownRows(prev => prev.filter(r => r.id !== id));
  };

  const updateDirectBreakdownRow = (id: string, field: keyof BreakdownRow, value: any) => {
    setDirectBreakdownRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'rkat_id' && value && !r.coa_code) {
        const foundRkat = rkats.find((rk: any) => rk.id === value);
        if (foundRkat && foundRkat.coa_codes) {
          updated.coa_code = foundRkat.coa_codes.split(',')[0].trim();
        }
      }
      return updated;
    }));
  };

  // Submit Direct Draft
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAccountId) {
      showToast('Silakan pilih akun laci kas atau bank sumber.', 'error');
      return;
    }

    const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);

    let totalAmount = 0;
    if (directMode === 'breakdown') {
      if (directBreakdownRows.length === 0) {
        showToast('Mohon tambahkan rincian penerima atau tempel data dari Excel.', 'error');
        return;
      }
      const invalidRow = directBreakdownRows.find(r => !r.nama_penerima.trim() || Number(r.nominal) <= 0);
      if (invalidRow) {
        showToast('Pastikan semua baris rincian memiliki Nama Penerima dan Nominal > 0.', 'error');
        return;
      }
      totalAmount = directBreakdownRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);
    } else {
      totalAmount = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
      if (totalAmount <= 0 || (!judulPengeluaran && !keterangan)) {
        showToast('Mohon lengkapi judul pengeluaran dan nominal transaksi.', 'error');
        return;
      }
    }

    if (selectedAccount && totalAmount > selectedAccount.saldo) {
      showToast(`Saldo kas tidak mencukupi! Akun hanya memiliki Rp ${Number(selectedAccount?.saldo).toLocaleString('id-ID')}`, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        sourceAccountId,
        type: 'KREDIT',
        nominal: totalAmount,
        judul: judulPengeluaran.trim() || (directMode === 'breakdown' ? 'Pengeluaran Kas By-Name' : 'Pengeluaran Kas'),
        keterangan: keterangan.trim(),
        tanggalTransaksi,
        tanggalCatatan,
        kategoriBiaya
      };

      if (directMode === 'breakdown') {
        payload.breakdownItems = directBreakdownRows.map(r => ({
          nama_penerima: r.nama_penerima.trim(),
          keterangan: r.keterangan.trim(),
          rkat_id: r.rkat_id || null,
          coa_code: r.coa_code || null,
          nominal: Number(r.nominal)
        }));
      }

      const res = await axios.post('/api/finance/manual-expense', payload);
      if (res.data.success) {
        showToast(res.data.message || 'Transaksi gantung berhasil disimpan.', 'success');
        setJudulPengeluaran('');
        setNominal('');
        setKeterangan('');
        setDirectBreakdownRows([]);
        setDirectExcelPasteText('');
        await fetchDirectData();
      } else {
        showToast(res.data.error || 'Gagal menyimpan transaksi gantung.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan transaksi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit Modal for Riwayat Transaksi
  const openEditModal = (dr: any) => {
    setEditingDraft(dr);
    setEditTanggalCatatan(dr.tanggalCatatan || dr.tanggal || new Date().toISOString().split('T')[0]);
    setEditBankAccountId(dr.bankAccountId || '');
    setEditJudul((dr as any).judul || dr.keteranganBank || '');
    setEditKeterangan((dr as any).keterangan || '');
    setEditKategoriBiaya((dr as any).kategori_biaya || (categories[0]?.nama || 'Lain-lain'));
    setEditNominal(String(dr.nominal || 0));
    setEditLinkNota((dr as any).link_nota || '');
  };

  // Submit Edit Riwayat Transaksi
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    const parsedNominal = parseFloat(editNominal.replace(/[^0-9]/g, '')) || 0;
    if (parsedNominal <= 0) {
      showToast('Nominal transaksi harus lebih besar dari Rp 0.', 'error');
      return;
    }

    try {
      setIsEditLoading(true);
      const res = await axios.put(`/api/mutations/${editingDraft.id}`, {
        tanggalCatatan: editTanggalCatatan,
        bankAccountId: editBankAccountId,
        judul: editJudul.trim(),
        keterangan: editKeterangan.trim(),
        kategori_biaya: editKategoriBiaya,
        nominal: parsedNominal,
        link_nota: editLinkNota ? editLinkNota.trim() : null
      });

      if (res.data.success || res.status === 200) {
        showToast('Data transaksi berhasil diperbarui!', 'success');
        setEditingDraft(null);
        await fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal memperbarui transaksi', 'error');
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete Riwayat Transaksi
  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini dari riwayat?')) {
      return;
    }

    try {
      const res = await axios.delete(`/api/mutations/${id}`);
      if (res.data.success || res.status === 200) {
        showToast('Transaksi berhasil dihapus dari riwayat.', 'success');
        await fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal menghapus transaksi', 'error');
    }
  };

  // Multi-Item Breakdown Helpers
  const copyExcelTemplate = () => {
    const templateHeader = "Nama Penerima\tKeterangan / Jabatan\tNo RKAT (Opsional)\tKode COA Beban\tNominal (Rp)\n" +
      "Budi Santoso\tGaji Staf IT\t1.1.01\t51010101\t4500000\n" +
      "Siti Aminah\tGaji Pejabat Struktural\t1.1.01\t51010102\t7000000\n" +
      "Ahmad Fauzi\tTunjangan Operasional\t1.1.01\t51010101\t3500000";
    navigator.clipboard.writeText(templateHeader);
    showToast('Template kolom Excel berhasil disalin ke clipboard! Silakan paste di Excel.', 'success');
  };

  const handleProcessExcelPaste = () => {
    if (!excelPasteText || !excelPasteText.trim()) {
      showToast('Silakan tempel (paste) baris data dari Excel terlebih dahulu.', 'error');
      return;
    }

    const lines = excelPasteText.split('\n');
    const newRows: BreakdownRow[] = [];
    let parsedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Ignore header line if user copied headers
      if (i === 0 && (line.toLowerCase().includes('nama penerima') || line.toLowerCase().includes('nominal') || line.toLowerCase().includes('rkat') || line.toLowerCase().includes('coa'))) {
        continue;
      }

      const cols = line.split('\t');
      if (cols.length === 0) continue;

      let nama = (cols[0] || '').trim();
      let ket = (cols[1] || '').trim();
      let rkatCol = (cols[2] || '').trim();
      let coaCol = (cols[3] || '').trim();
      let nominalStr = (cols[4] || '').trim();

      // If only 3 columns pasted: Nama, Keterangan, Nominal
      if (cols.length === 3) {
        nama = (cols[0] || '').trim();
        ket = (cols[1] || '').trim();
        nominalStr = (cols[2] || '').trim();
        rkatCol = '';
        coaCol = '';
      } else if (cols.length === 2) {
        nama = (cols[0] || '').trim();
        nominalStr = (cols[1] || '').trim();
        ket = '';
        rkatCol = '';
        coaCol = '';
      }

      const parsedNominal = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;
      if (!nama && parsedNominal <= 0) continue;

      // Match RKAT if provided
      let matchedRkatId = selectedQueueItem?.rkat_id || '';
      if (rkatCol) {
        const foundRkat = rkats.find((r: any) => 
          r.no?.toLowerCase() === rkatCol.toLowerCase() ||
          r.nama?.toLowerCase().includes(rkatCol.toLowerCase()) ||
          r.id === rkatCol
        );
        if (foundRkat) matchedRkatId = foundRkat.id;
      }

      // Match COA if provided
      let matchedCoaCode = '';
      if (coaCol) {
        const cleanCoa = coaCol.replace(/\./g, '').trim();
        const foundCoa = coas.find((c: any) => 
          c.coa_code.replace(/\./g, '') === cleanCoa ||
          c.nama_akun?.toLowerCase().includes(coaCol.toLowerCase())
        );
        if (foundCoa) matchedCoaCode = foundCoa.coa_code;
      }

      // Auto-fallback COA from RKAT if not specified
      if (!matchedCoaCode && matchedRkatId) {
        const foundRkat = rkats.find((r: any) => r.id === matchedRkatId);
        if (foundRkat && foundRkat.coa_codes) {
          matchedCoaCode = foundRkat.coa_codes.split(',')[0].trim();
        }
      }

      newRows.push({
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nama_penerima: nama,
        keterangan: ket,
        rkat_id: matchedRkatId,
        coa_code: matchedCoaCode,
        nominal: parsedNominal
      });
      parsedCount++;
    }

    if (newRows.length === 0) {
      showToast('Tidak ada baris data valid yang berhasil diproses. Pastikan format kolom sesuai.', 'error');
      return;
    }

    setBreakdownRows(prev => [...prev, ...newRows]);
    setExcelPasteText('');
    showToast(`Berhasil memproses ${parsedCount} baris penerima dari Excel!`, 'success');
  };

  const addBlankBreakdownRow = () => {
    const defaultRkatId = selectedQueueItem?.rkat_id || '';
    let defaultCoaCode = '';
    if (defaultRkatId) {
      const foundRkat = rkats.find((r: any) => r.id === defaultRkatId);
      if (foundRkat && foundRkat.coa_codes) {
        defaultCoaCode = foundRkat.coa_codes.split(',')[0].trim();
      }
    }

    setBreakdownRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nama_penerima: '',
        keterangan: '',
        rkat_id: defaultRkatId,
        coa_code: defaultCoaCode,
        nominal: 0
      }
    ]);
  };

  const removeBreakdownRow = (id: string) => {
    setBreakdownRows(prev => prev.filter(r => r.id !== id));
  };

  const updateBreakdownRow = (id: string, field: keyof BreakdownRow, value: any) => {
    setBreakdownRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'rkat_id' && value && !r.coa_code) {
        const foundRkat = rkats.find((rk: any) => rk.id === value);
        if (foundRkat && foundRkat.coa_codes) {
          updated.coa_code = foundRkat.coa_codes.split(',')[0].trim();
        }
      }
      return updated;
    }));
  };

  // Process Payout Disbursement
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem || !payoutBankAccountId) {
      showToast('Pilih rekening bank pembayar terlebih dahulu.', 'error');
      return;
    }

    if (!payoutLinkNota || !payoutLinkNota.trim()) {
      showToast('Tautan Google Drive bukti nota wajib diisi.', 'error');
      return;
    }

    const nominalAwal = Number(selectedQueueItem.nominal || 0);

    let nominalRiil = nominalAwal;
    if (payoutMode === 'breakdown') {
      if (breakdownRows.length === 0) {
        showToast('Mohon tambahkan rincian penerima atau paste dari Excel terlebih dahulu.', 'error');
        return;
      }
      const invalidRow = breakdownRows.find(r => !r.nama_penerima.trim() || Number(r.nominal) <= 0);
      if (invalidRow) {
        showToast('Pastikan semua baris rincian memiliki Nama Penerima dan Nominal > 0.', 'error');
        return;
      }
      nominalRiil = breakdownRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);
    } else {
      const parsedRiil = parseFloat(payoutNominalRealisasi.replace(/[^0-9]/g, '')) || 0;
      nominalRiil = parsedRiil > 0 ? parsedRiil : nominalAwal;
    }

    if (nominalRiil > nominalAwal) {
      showToast(`Nominal realisasi (${formatRupiah(nominalRiil)}) tidak boleh melebihi nominal plafon persetujuan (${formatRupiah(nominalAwal)}).`, 'error');
      return;
    }

    const payAcc = accounts.find(a => a.account_id === payoutBankAccountId);
    if (payAcc && Number(payAcc.saldo) < nominalRiil) {
      showToast(`Saldo rekening terpilih tidak mencukupi! Tersedia: ${formatRupiah(Number(payAcc.saldo))}, Dibutuhkan: ${formatRupiah(nominalRiil)}`, 'error');
      return;
    }

    const autoSumberDana = payAcc?.kelompok_dana || payoutSumberDana || 'AMIL';

    try {
      setIsPayoutSubmitLoading(true);
      const payload: any = {
        actorId: user?.id,
        bankAccountId: payoutBankAccountId,
        sumberDana: autoSumberDana,
        nominalRealisasi: nominalRiil,
        linkNota: payoutLinkNota.trim(),
        catatan: payoutCatatan || 'Pencairan operasional disetujui kasir.'
      };

      if (payoutMode === 'breakdown') {
        payload.breakdownItems = breakdownRows.map(r => ({
          nama_penerima: r.nama_penerima.trim(),
          keterangan: r.keterangan.trim(),
          rkat_id: r.rkat_id || null,
          coa_code: r.coa_code || null,
          nominal: Number(r.nominal)
        }));
      }

      const res = await axios.post(`/api/pengajuan-pencairan/${selectedQueueItem.id}/disburse`, payload);

      if (res.data.status === 'success') {
        showToast('Dana berhasil dicairkan & draft mutasi dikirim ke Pelaporan!', 'success');
        setSelectedQueueItem(null);
        setPayoutCatatan('');
        setPayoutBankAccountId('');
        setPayoutNominalRealisasi('');
        setPayoutLinkNota('');
        setBreakdownRows([]);
        setExcelPasteText('');
        setShowEmbedPreview(false);
        fetchQueueData();
        fetchDirectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Gagal mencairkan dana.', 'error');
    } finally {
      setIsPayoutSubmitLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAccountId, filterMonth]);

  const formatMonthName = (monthStr: string) => {
    if (!monthStr || monthStr === 'ALL') return 'Semua Bulan';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthNames[mIndex] || month} ${year}`;
  };

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    recentDrafts.forEach(dr => {
      const d = dr.tanggalCatatan || dr.tanggal;
      if (d && typeof d === 'string' && d.length >= 7) {
        months.add(d.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [recentDrafts]);

  const filteredDrafts = React.useMemo(() => {
    return recentDrafts.filter(dr => {
      const matchesAccount = filterAccountId === 'ALL' || dr.bankAccountId === filterAccountId;
      
      let matchesMonth = true;
      if (filterMonth !== 'ALL') {
        const d = dr.tanggalCatatan || dr.tanggal || '';
        matchesMonth = d.startsWith(filterMonth);
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesAccount && matchesMonth;
      
      const matchesQuery = (dr.keteranganBank || '').toLowerCase().includes(query) ||
        (dr.bankName || '').toLowerCase().includes(query) ||
        Boolean((dr as any).kategori_biaya && ((dr as any).kategori_biaya || '').toLowerCase().includes(query)) ||
        dr.nominal.toString().includes(query);

      return matchesAccount && matchesMonth && matchesQuery;
    });
  }, [recentDrafts, filterAccountId, filterMonth, searchQuery]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDrafts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedDrafts = filteredDrafts.slice(startIndex, startIndex + itemsPerPage);

  const selectedPayoutAccount = accounts.find(a => a.account_id === payoutBankAccountId);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border font-semibold text-xs",
              toast.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 text-rose-600" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Pengeluaran Manual</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Pencatatan Pengeluaran Manual
        </h2>
        <p className="text-slate-500 font-medium">
          Catat pengeluaran tunai secara manual atau proses antrean pengajuan operasional non-proposal.
        </p>
      </motion.div>

      {/* Desktop View */}
      <div className="hidden md:block space-y-8">
        {/* Sub-tabs Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('langsung')}
            className={cn(
              "py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2",
              activeSubTab === 'langsung' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-650"
            )}
          >
            <FileText className="size-4" /> Pencatatan Langsung (Kas Kecil)
          </button>
          <button
            onClick={() => setActiveSubTab('antrean')}
            className={cn(
              "py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 relative",
              activeSubTab === 'antrean' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-650"
            )}
          >
            <ListOrdered className="size-4" /> Antrean Pengajuan Pencairan
            {queueList.length > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-white text-[9px] font-black rounded-full size-4 flex items-center justify-center animate-pulse">
                {queueList.length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'langsung' ? (
          <div className="space-y-8">
            <div className={cn(
              "grid grid-cols-1 gap-8",
              directMode === 'breakdown' ? "lg:grid-cols-1" : "lg:grid-cols-3"
            )}>
              {/* Form Column */}
              <div className={cn("space-y-6", directMode === 'breakdown' ? "lg:col-span-1" : "lg:col-span-2")}>
                <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="size-5 text-primary" />
                      Formulir Pencatatan Pengeluaran Manual (Draft)
                    </h3>
                    {directMode === 'breakdown' && (
                      <span className="text-[11px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full w-fit">
                        Mode Pecah Rincian By-Name
                      </span>
                    )}
                  </div>
                  {renderFormContent(false)}
                </div>
              </div>

              {/* Right Column: Saldo info */}
              {directMode !== 'breakdown' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 space-y-4">
                    <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Coins className="size-4 text-primary" />
                      Saldo Laci Kas (Tunai)
                    </h4>
                    <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                        <div key={acc.account_id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-700">{acc.nama_akun}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">COA: {acc.coa_code}</p>
                          </div>
                          <p className="font-black text-slate-900">Rp {Number(acc.saldo).toLocaleString('id-ID')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Transaksi Table - Desktop View */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <History className="size-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900">Riwayat Transaksi</h3>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {filteredDrafts.length} transaksi
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-56 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input
                      type="text"
                      placeholder="Cari transaksi..."
                      className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Bulan Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFilterMonthDropdownOpen(!isFilterMonthDropdownOpen)}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 text-xs font-bold text-slate-700 cursor-pointer h-[34px] hover:bg-slate-50 transition-all"
                    >
                      <Calendar className="size-3.5 text-primary" />
                      <span>{formatMonthName(filterMonth)}</span>
                      <ChevronDown className="size-3 text-slate-400 shrink-0" />
                    </button>

                    {isFilterMonthDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFilterMonthDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterMonth('ALL');
                              setIsFilterMonthDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                              filterMonth === 'ALL' ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            Semua Bulan
                          </button>
                          {availableMonths.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setFilterMonth(m);
                                setIsFilterMonthDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                                filterMonth === m ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              {formatMonthName(m)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Filter Akun Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFilterAccountDropdownOpen(!isFilterAccountDropdownOpen)}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 text-xs font-bold text-slate-700 cursor-pointer h-[34px] hover:bg-slate-50 transition-all"
                    >
                      <Filter className="size-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">
                        {filterAccountId === 'ALL' 
                          ? 'Semua Akun (Kas & Bank)' 
                          : accounts.find(a => a.account_id === filterAccountId)?.nama_akun || 'Semua Akun'
                        }
                      </span>
                      <ChevronDown className="size-3 text-slate-400 shrink-0" />
                    </button>

                    {isFilterAccountDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFilterAccountDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterAccountId('ALL');
                              setIsFilterAccountDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors",
                              filterAccountId === 'ALL' ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            Semua Akun (Kas & Bank)
                          </button>
                          {accounts.filter(acc => acc.tipe_kas === 'TUNAI' || acc.tipe_kas === 'BANK').map(acc => (
                            <button
                              key={acc.account_id}
                              type="button"
                              onClick={() => {
                                setFilterAccountId(acc.account_id);
                                setIsFilterAccountDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between",
                                filterAccountId === acc.account_id ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{acc.nama_akun}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">({acc.tipe_kas})</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 border-b border-slate-100">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Catat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sumber Kas / Bank</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judul Transaksi</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan / Rincian</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right uppercase tracking-wider">Nominal</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedDrafts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          <p className="font-semibold">Tidak ada data transaksi yang sesuai dengan filter.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedDrafts.map(dr => (
                        <tr key={dr.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                            {dr.tanggalCatatan ? new Date(dr.tanggalCatatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                            {dr.bankName}
                          </td>
                          <td className="px-5 py-3.5 text-slate-900 font-bold max-w-[200px]">
                            {(dr as any).judul || dr.keteranganBank}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-normal max-w-[220px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate max-w-[180px]">{(dr as any).keterangan || dr.keteranganBank || '-'}</span>
                              {(dr as any).link_nota && (
                                <a
                                  href={(dr as any).link_nota}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-primary bg-slate-100 hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
                                >
                                  <ExternalLink className="size-2.5" /> Nota
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {(dr as any).kategori_biaya ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                {(dr as any).kategori_biaya}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                            {formatRupiah(Number(dr.nominal))}
                          </td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full font-bold text-[10px] inline-block",
                              dr.status === 'RECONCILED' 
                                ? "bg-slate-100 text-slate-600 border border-slate-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(dr)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Transaksi"
                              >
                                <Edit3 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(dr.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
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
              </div>

              {/* Pagination Controls */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <p className="font-semibold">
                  Menampilkan <span className="font-bold text-slate-800">{filteredDrafts.length > 0 ? startIndex + 1 : 0}</span> - <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredDrafts.length)}</span> dari <span className="font-bold text-slate-800">{filteredDrafts.length}</span> transaksi
                </p>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            safeCurrentPage === page
                              ? "bg-primary text-white shadow-sm"
                              : "border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Queue Tab: Approved Requests List */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="size-5 text-primary" />
                Antrean Pembayaran Pengajuan Operasional (Disetujui)
              </h3>
            </div>

            {isQueueLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">Loading antrean...</div>
            ) : queueList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 space-y-2">
                <CheckCircle2 className="size-10 text-emerald-400" />
                <p className="text-xs font-semibold">Semua antrean pengajuan operasional selesai diproses!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">No Pengajuan</th>
                      <th className="py-3 px-3">Pengaju</th>
                      <th className="py-3 px-3">Judul Pengajuan</th>
                      <th className="py-3 px-3">Keterangan / Rincian</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3">Link RKAT</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {queueList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs text-slate-800 whitespace-nowrap">{item.no_pengajuan}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-700">{item.pengaju?.name}</p>
                          <p className="text-[9px] text-slate-400">{item.pengaju?.role.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-900 font-bold max-w-[180px]">
                          {item.judul || item.keterangan}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-normal max-w-[200px] truncate">
                          {item.keterangan || '-'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            {item.kategori_biaya}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {item.rkat ? `(${item.rkat.no}) ${item.rkat.nama}` : <span className="italic text-slate-400 font-normal">Direct Expense</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                          {formatRupiah(Number(item.nominal))}
                          {item.link_nota && (
                            <a
                              href={item.link_nota}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center justify-end gap-1 font-semibold mt-0.5"
                            >
                              <ExternalLink className="size-2.5" /> Ada Nota
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedQueueItem(item);
                              setPayoutNominalRealisasi(Number(item.nominal).toString());
                              setPayoutLinkNota(item.link_nota || '');
                              setPayoutSumberDana(item.sumber_dana || 'AMIL');
                              setPayoutCatatan('');
                              const defaultPayAcc = accounts.find(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK');
                              setPayoutBankAccountId(defaultPayAcc?.account_id || accounts[0]?.account_id || '');
                              setShowEmbedPreview(false);
                            }}
                            className="bg-primary hover:bg-primary/95 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-all cursor-pointer shadow-sm"
                          >
                            <Send className="size-3" /> Cairkan Dana
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-6">
        {/* 1. Antrean Pengajuan Pencairan (List) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ListOrdered className="size-4.5 text-primary" />
              Antrean Pengajuan ({queueList.length})
            </h3>
          </div>

          {isQueueLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">Memuat antrean...</div>
          ) : queueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-6 space-y-2">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-[11px] font-bold">Semua antrean selesai diproses!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {queueList.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-slate-500 font-bold">{item.no_pengajuan}</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      {item.kategori_biaya}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <p className="font-bold text-slate-900">{item.pengaju?.name}</p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">{item.keterangan}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black">Nominal</p>
                      <p className="font-black text-slate-950 text-xs">{formatRupiah(Number(item.nominal))}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedQueueItem(item);
                        setPayoutNominalRealisasi(Number(item.nominal).toString());
                        setPayoutLinkNota(item.link_nota || '');
                        setPayoutSumberDana(item.sumber_dana || 'AMIL');
                        setPayoutCatatan('');
                        const defaultPayAcc = accounts.find(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK');
                        setPayoutBankAccountId(defaultPayAcc?.account_id || accounts[0]?.account_id || '');
                        setShowEmbedPreview(false);
                      }}
                      className="bg-primary text-white font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <Send className="size-2.5" /> Cairkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Saldo Laci Kas */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Coins className="size-4.5 text-primary" />
            Saldo Laci Kas (Tunai)
          </h4>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
              <div key={acc.account_id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-700">{acc.nama_akun}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">COA: {acc.coa_code}</p>
                </div>
                <p className="font-black text-slate-900">Rp {Number(acc.saldo).toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Riwayat Transaksi Mobile */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4.5 text-primary" />
                <h4 className="text-xs font-black text-slate-900">Riwayat Transaksi</h4>
              </div>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                {filteredDrafts.length} total
              </span>
            </div>
            
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">Semua Bulan</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))}
              </select>

              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">Semua Akun</option>
                {accounts.filter(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK').map(a => (
                  <option key={a.account_id} value={a.account_id}>{a.nama_akun}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {paginatedDrafts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Tidak ada riwayat transaksi.</div>
            ) : (
              paginatedDrafts.map(dr => (
                <div key={dr.id} className="p-4 text-xs space-y-2 hover:bg-slate-50/20 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>{dr.tanggalCatatan ? new Date(dr.tanggalCatatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-bold text-[9px]",
                      dr.status === 'RECONCILED' 
                        ? "bg-slate-100 text-slate-500" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    )}>
                      {dr.status === 'RECONCILED' ? 'Terekonsiliasi' : 'Pending'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    <p className="font-bold text-slate-900">{dr.keteranganBank}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">{dr.bankName}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div>
                      {(dr as any).kategori_biaya && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                          {(dr as any).kategori_biaya}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-slate-900 font-mono text-xs">{formatRupiah(Number(dr.nominal))}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <span className="text-[11px] font-bold">Hal {safeCurrentPage} dari {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40 text-xs font-bold"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border bg-white disabled:opacity-40 text-xs font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB (Floating Action Button) - mobile only */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/95 active:scale-95 transition-all cursor-pointer border-none outline-none"
        >
          <Plus className="size-7" />
        </button>
      </div>

      {/* Form Modal for Mobile */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-150 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="size-4.5 text-primary" />
                  Formulir Pencatatan Pengeluaran
                </h3>
                <button 
                  onClick={() => setIsFormModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-650 p-1 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {renderFormContent(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Processing Dialog Modal */}
      {selectedQueueItem && (() => {
        const nominalAwal = Number(selectedQueueItem.nominal || 0);
        let nominalRiil = 0;
        if (payoutMode === 'breakdown') {
          nominalRiil = breakdownRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);
        } else {
          const parsedRiil = parseFloat(payoutNominalRealisasi.replace(/[^0-9]/g, '')) || 0;
          nominalRiil = parsedRiil > 0 ? parsedRiil : 0;
        }

        const isExceeded = nominalRiil > nominalAwal;
        const selisihHemat = nominalAwal - nominalRiil;
        const persenHemat = (nominalAwal > 0 && selisihHemat > 0) ? (selisihHemat / nominalAwal) * 100 : 0;
        const gdriveEmbed = toGDriveEmbedUrl(payoutLinkNota);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className={cn(
              "bg-white rounded-3xl border border-slate-200 w-full overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 max-h-[94vh] transition-all",
              payoutMode === 'breakdown' ? "max-w-4xl" : "max-w-xl"
            )}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight">Proses Pencairan & Input Nota</h3>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">{selectedQueueItem.no_pengajuan}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedQueueItem(null)}
                  className="p-1.5 hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                {/* Mode Selector */}
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setPayoutMode('tunggal')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      payoutMode === 'tunggal' 
                        ? "bg-white text-primary shadow-xs font-black" 
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Coins className="size-3.5" />
                    Pencairan Tunggal (1 Transaksi)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutMode('breakdown');
                      if (breakdownRows.length === 0) {
                        const defaultRkatId = selectedQueueItem.rkat_id || '';
                        let defaultCoaCode = '';
                        if (defaultRkatId) {
                          const foundRkat = rkats.find((r: any) => r.id === defaultRkatId);
                          if (foundRkat && foundRkat.coa_codes) {
                            defaultCoaCode = foundRkat.coa_codes.split(',')[0].trim();
                          }
                        }

                        setBreakdownRows([{
                          id: `row-${Date.now()}`,
                          nama_penerima: selectedQueueItem.pengaju?.name || '',
                          keterangan: selectedQueueItem.keterangan || '',
                          rkat_id: defaultRkatId,
                          coa_code: defaultCoaCode,
                          nominal: Number(selectedQueueItem.nominal || 0)
                        }]);
                      }
                    }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      payoutMode === 'breakdown' 
                        ? "bg-white text-primary shadow-xs font-black" 
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Users className="size-3.5" />
                    Pecah Rincian By-Name (Excel Paste)
                  </button>
                </div>

                {/* Ringkasan Pengajuan Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Judul Pengajuan:</span>
                    <span className="font-bold text-slate-800 text-right max-w-xs">{selectedQueueItem.judul || selectedQueueItem.keterangan}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Pemohon / Pengaju:</span>
                    <span className="font-bold text-slate-800">{selectedQueueItem.pengaju?.name} <span className="text-slate-400 text-[10px]">({selectedQueueItem.pengaju?.role?.replace(/_/g, ' ')})</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Kategori Biaya:</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px]">{selectedQueueItem.kategori_biaya}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Plafon Disetujui:</span>
                    <span className="font-black text-slate-900 text-sm font-mono">{formatRupiah(nominalAwal)}</span>
                  </div>
                  <div className="border-t border-slate-200/80 pt-2 text-xs">
                    <span className="text-slate-400 font-bold block mb-0.5 text-[10px] uppercase tracking-wider">Keterangan / Rincian</span>
                    <p className="font-medium text-slate-700 italic">"{selectedQueueItem.keterangan || '-'}"</p>
                  </div>
                </div>

                {/* Mode Tunggal Form */}
                {payoutMode === 'tunggal' && (
                  <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Coins className="size-4 text-primary" />
                        Nominal Pencairan Riil (Sesuai Nota / Kwitansi) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold">Maks: {formatRupiah(nominalAwal)}</span>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                      <input
                        type="text"
                        required
                        value={payoutNominalRealisasi ? Number(payoutNominalRealisasi.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setPayoutNominalRealisasi(raw);
                        }}
                        placeholder="Masukkan nominal sesuai nota belanja..."
                        className={cn(
                          "w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-black font-mono focus:ring-2 outline-none transition-all",
                          isExceeded 
                            ? "border-rose-300 text-rose-600 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-500" 
                            : "border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary"
                        )}
                      />
                    </div>

                    {/* Indikator Hemat / Alert Exceeded */}
                    {isExceeded ? (
                      <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 mt-1">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>Nominal riil tidak boleh melebihi plafon persetujuan awal ({formatRupiah(nominalAwal)}).</span>
                      </div>
                    ) : selisihHemat > 0 ? (
                      <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold mt-1">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
                          <span>Efisiensi / Penghematan Anggaran:</span>
                        </span>
                        <span className="font-mono text-emerald-700 font-black">Hemat {formatRupiah(selisihHemat)} ({persenHemat.toFixed(1)}%)</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Nominal pencairan penuh sesuai plafon persetujuan.</p>
                    )}
                  </div>
                )}

                {/* Mode Breakdown By-Name & Excel Paste */}
                {payoutMode === 'breakdown' && (
                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    {/* Excel Paste Box */}
                    <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <FileSpreadsheet className="size-4 text-emerald-600" />
                          Tempel (Paste) Data dari Excel / Spreadsheet
                        </label>
                        <button
                          type="button"
                          onClick={copyExcelTemplate}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 bg-white border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <Copy className="size-3" /> Salin Template Excel
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Urutan kolom di Excel: <span className="font-mono font-bold text-slate-700">Nama Penerima</span> [Tab] <span className="font-mono font-bold text-slate-700">Keterangan/Jabatan</span> [Tab] <span className="font-mono font-bold text-slate-700">No RKAT (opsional)</span> [Tab] <span className="font-mono font-bold text-slate-700">Kode COA</span> [Tab] <span className="font-mono font-bold text-slate-700">Nominal</span>
                      </p>

                      <textarea
                        rows={3}
                        value={excelPasteText}
                        onChange={(e) => setExcelPasteText(e.target.value)}
                        placeholder="Tempel baris tabel dari Excel di sini (contoh: Budi Santoso	Gaji Staf IT	1.1.01	51010101	4500000)..."
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleProcessExcelPaste}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <PlusCircle className="size-3.5" />
                          Proses & Masukkan ke Tabel Rincian
                        </button>
                      </div>
                    </div>

                    {/* Interactive Breakdown Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Layers className="size-4 text-primary" />
                          Daftar Rincian Penerima ({breakdownRows.length} Orang/Item)
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={addBlankBreakdownRow}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 cursor-pointer transition-colors"
                          >
                            <Plus className="size-3" /> Tambah Baris Manual
                          </button>
                          {breakdownRows.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setBreakdownRows([])}
                              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {breakdownRows.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                          <Users className="size-8 mx-auto mb-1.5 text-slate-300" />
                          Belum ada rincian penerima. Tempel dari Excel di atas atau klik Tambah Baris Manual.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3 w-10 text-center">#</th>
                                <th className="py-2.5 px-3 min-w-[150px]">Nama Penerima *</th>
                                <th className="py-2.5 px-3 min-w-[130px]">Keterangan / Jabatan</th>
                                <th className="py-2.5 px-3 min-w-[220px]">RKAT (Program & Spesifikasi)</th>
                                <th className="py-2.5 px-3 min-w-[180px]">Akun COA Beban</th>
                                <th className="py-2.5 px-3 min-w-[130px] text-right">Nominal (Rp) *</th>
                                <th className="py-2.5 px-2 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {breakdownRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Nama lengkap..."
                                      value={row.nama_penerima}
                                      onChange={(e) => updateBreakdownRow(row.id, 'nama_penerima', e.target.value)}
                                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      placeholder="Contoh: Staf IT..."
                                      value={row.keterangan}
                                      onChange={(e) => updateBreakdownRow(row.id, 'keterangan', e.target.value)}
                                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <SearchableTableRkatSelect
                                      selectedValue={row.rkat_id}
                                      onChange={(val, opt) => {
                                        updateBreakdownRow(row.id, 'rkat_id', val);
                                        if (opt?.coaCode && !row.coa_code) {
                                          updateBreakdownRow(row.id, 'coa_code', opt.coaCode);
                                        }
                                      }}
                                      options={allRkatOptions}
                                      emptyLabel="-- Sesuai Pengajuan / Cari RKAT --"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <SearchableTableCoaSelect
                                      selectedValue={row.coa_code}
                                      onChange={(val) => updateBreakdownRow(row.id, 'coa_code', val)}
                                      options={coas}
                                      emptyLabel="-- Cari / Pilih COA Beban --"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="text"
                                      required
                                      placeholder="0"
                                      value={row.nominal ? Number(row.nominal).toLocaleString('id-ID') : ''}
                                      onChange={(e) => {
                                        const raw = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                        updateBreakdownRow(row.id, 'nominal', raw);
                                      }}
                                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black font-mono text-right text-slate-900 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeBreakdownRow(row.id)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                      title="Hapus Baris"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Total Breakdown Summary Card */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block text-[11px]">Total Realisasi By-Name:</span>
                        <span className="font-black text-base text-slate-900 font-mono">{formatRupiah(nominalRiil)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({breakdownRows.length} Penerima)</span>
                      </div>

                      <div>
                        {isExceeded ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl font-bold text-xs">
                            <AlertTriangle className="size-3.5" />
                            Melebihi Plafon {formatRupiah(nominalRiil - nominalAwal)}
                          </span>
                        ) : selisihHemat > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold text-xs">
                            <Sparkles className="size-3.5 text-emerald-600" />
                            Efisiensi {formatRupiah(selisihHemat)} ({persenHemat.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs">
                            <Check className="size-3.5 text-emerald-600" />
                            Sesuai Plafon 100%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Field 2: Tautan Google Drive Bukti Foto Nota */}
                <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Link2 className="size-4 text-primary" />
                      Tautan Google Drive Bukti Nota / Kwitansi / Rekap *
                    </label>
                    {payoutLinkNota && (
                      <a
                        href={payoutLinkNota}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 cursor-pointer"
                      >
                        <ExternalLink className="size-3" /> Buka di Drive
                      </a>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={payoutLinkNota}
                      onChange={(e) => setPayoutLinkNota(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... atau link cloud nota"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* GDrive Live Preview Option */}
                  {gdriveEmbed && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowEmbedPreview(!showEmbedPreview)}
                        className="text-[11px] font-bold text-slate-600 hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                        {showEmbedPreview ? 'Sembunyikan Pratinjau Nota' : 'Lihat Pratinjau Foto Nota'}
                      </button>

                      {showEmbedPreview && (
                        <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-56 w-full">
                          <iframe
                            src={gdriveEmbed}
                            className="w-full h-full bg-slate-100"
                            title="Pratinjau Nota Google Drive"
                            allow="autoplay"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Field 3: Rekening Pembayar Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Akun Kas / Bank Pembayar *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPayoutDropdownOpen(!isPayoutDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <span>
                        {selectedPayoutAccount 
                          ? `${selectedPayoutAccount.nama_akun} - Saldo: [${formatRupiah(Number(selectedPayoutAccount.saldo))}]`
                          : '-- Pilih Rekening Pembayar --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400" />
                    </button>

                    {isPayoutDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPayoutDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {accounts.filter(acc => acc.tipe_kas === 'TUNAI' || acc.tipe_kas === 'BANK').map(acc => (
                            <button
                              key={acc.account_id}
                              type="button"
                              onClick={() => {
                                setPayoutBankAccountId(acc.account_id);
                                setIsPayoutDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-between mb-1 cursor-pointer",
                                payoutBankAccountId === acc.account_id ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-slate-700"
                              )}
                            >
                              <span>{acc.nama_akun} ({acc.tipe_kas})</span>
                              <span className="font-black text-slate-900 font-mono">{formatRupiah(Number(acc.saldo))}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Field 4: Catatan / Memo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Catatan Pencairan Kasir (Opsional)</label>
                  <textarea
                    value={payoutCatatan}
                    onChange={(e) => setPayoutCatatan(e.target.value)}
                    placeholder="Catatan verifikasi pencairan, nomor tanda terima, dll..."
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedQueueItem(null)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPayoutSubmitLoading || !payoutBankAccountId || isExceeded || (payoutMode === 'breakdown' && breakdownRows.length === 0)}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    {isPayoutSubmitLoading ? 'Memproses Pencairan...' : `Cairkan Dana (${formatRupiah(nominalRiil)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Edit Transaksi Riwayat */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900">Edit Data Transaksi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {/* Tanggal */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Tanggal Catatan *</label>
                  <input
                    type="date"
                    required
                    value={editTanggalCatatan}
                    onChange={(e) => setEditTanggalCatatan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Sumber Kas / Bank */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Sumber Kas / Bank *</label>
                  <select
                    required
                    value={editBankAccountId}
                    onChange={(e) => setEditBankAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {accounts.filter(a => a.tipe_kas === 'TUNAI' || a.tipe_kas === 'BANK').map(a => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.nama_akun} ({a.tipe_kas}) - Saldo: {formatRupiah(Number(a.saldo))}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Judul Transaksi */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Judul Transaksi *</label>
                  <input
                    type="text"
                    required
                    value={editJudul}
                    onChange={(e) => setEditJudul(e.target.value)}
                    placeholder="Contoh: Beli Galon & Kopi Kantor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Nominal */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Nominal (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                    <input
                      type="text"
                      required
                      value={editNominal ? parseInt(editNominal.replace(/[^0-9]/g, '') || '0').toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setEditNominal(raw);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black font-mono text-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Kategori Biaya */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Kategori Biaya *</label>
                  <select
                    value={editKategoriBiaya}
                    onChange={(e) => setEditKategoriBiaya(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.nama}>{cat.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Keterangan */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Keterangan / Rincian Tambahan</label>
                  <textarea
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    rows={2}
                    placeholder="Rincian barang, catatan transaksi..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Link Nota */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Tautan Google Drive Bukti Nota (Opsional)</label>
                  <input
                    type="url"
                    value={editLinkNota}
                    onChange={(e) => setEditLinkNota(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingDraft(null)}
                    className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isEditLoading}
                    className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold shadow-md shadow-primary/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="size-4" />
                    {isEditLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

