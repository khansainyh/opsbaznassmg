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
  BookOpen,
  DollarSign,
  FileCheck,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getMustahikDisplayName } from '../lib/utils';
import axios from 'axios';
import * as XLSX from 'xlsx';

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
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('Semua Pilar');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPenyaluran, setSelectedPenyaluran] = useState<any | null>(null);

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
  
  const [nikChecking, setNikChecking] = useState(false);
  const [nikFoundStatus, setNikFoundStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [penyaluranRes, pilarsRes, rkatRes, coaRes, mappingRes] = await Promise.all([
        axios.get('/api/penyaluran-zis').catch(() => ({ data: { data: [] } })),
        axios.get('/api/pilars').catch(() => ({ data: [] })),
        axios.get('/api/rkat-operasional').catch(() => ({ data: [] })),
        axios.get('/api/finance/coa').catch(() => ({ data: [] })),
        axios.get('/api/finance/mapping-rules').catch(() => ({ data: [] }))
      ]);

      setData(penyaluranRes.data?.data || []);
      setPilars(Array.isArray(pilarsRes.data) ? pilarsRes.data : []);
      setRkatList(Array.isArray(rkatRes.data) ? rkatRes.data : []);
      setCoaList(Array.isArray(coaRes.data) ? coaRes.data : []);
      setMappingRules(Array.isArray(mappingRes.data) ? mappingRes.data : []);
    } catch (e) {
      console.error('Error loading Penyaluran ZIS:', e);
    } finally {
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

  // Searchable Select Options for Program Kegiatan
  const programSelectOptions = useMemo(() => {
    return programOptions.map(p => ({
      value: p.code,
      label: p.name,
      sublabel: `Pilar: ${p.pilarName}`,
      badge: `Kode ${p.code}`
    }));
  }, [programOptions]);

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

    // Secondary: Check program.coa_code from programOptions
    const prog = programOptions.find(p => p.code === programVal || p.name === programVal);
    if (prog && prog.coa_code) {
      return prog.coa_code;
    }

    return '519999999';
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

  // Helper to find COA Accounting Code (Auto-mapping from Mapping COA Rules) for a proposal
  const getCoaInfo = (item: any) => {
    const progVal = item.jenis_permohonan || item.program?.code || item.program?.name || '';
    const asnafVal = item.asnaf || 'Miskin';
    const targetCode = item.coa_code || resolveMappingCoa(progVal, asnafVal);

    const foundCoa = coaList.find((c: any) => (c.code || c.coa_code) === targetCode || c.id === targetCode);

    if (foundCoa) {
      return {
        coaCode: foundCoa.code || foundCoa.coa_code || targetCode,
        coaName: foundCoa.name || foundCoa.nama_akun || foundCoa.nama || 'Beban Penyaluran ZIS'
      };
    }

    if (targetCode === '519999999') {
      return {
        coaCode: '519999999',
        coaName: 'Penyaluran Lain-lain (Emergency Fallback)'
      };
    }

    return {
      coaCode: targetCode,
      coaName: item.program?.name || item.jenis_permohonan || 'Beban Penyaluran ZIS'
    };
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isDirect = item.asal_data === 'Jalur Direct' || item.memo_source === 'DIRECT_PENYALURAN';
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

      const matchesAsal = selectedAsalFilter === 'Semua' || item.asal_data === selectedAsalFilter;

      // Pilar Filter
      let matchesPilar = true;
      if (selectedPilarFilter !== 'Semua Pilar') {
        const pilarCode = item.program?.pilar_code || '';
        const pilarNameFromCode = (pilarCode === '1100' || pilarCode === '2101') ? 'Semarang Peduli' :
                                  (pilarCode === '1200' || pilarCode === '2201') ? 'Semarang Sehat' :
                                  (pilarCode === '1300' || pilarCode === '2301') ? 'Semarang Cerdas' :
                                  (pilarCode === '1400' || pilarCode === '2501') ? 'Semarang Taqwa' :
                                  (pilarCode === '1500' || pilarCode === '2502') ? 'Semarang Makmur' : '';

        const fullPilarStr = (pilarNameFromCode || item.program?.pilar?.name || item.jenis_permohonan || item.program?.name || '').toLowerCase();
        matchesPilar = fullPilarStr.includes(selectedPilarFilter.toLowerCase());
      }

      let matchesStatus = true;
      if (selectedStatusFilter !== 'Semua') {
        const s = (item.status || '').toString().toLowerCase();
        if (selectedStatusFilter === 'Antrean Pencairan') {
          matchesStatus = s.includes('pencairan') || s === 'acc' || s.includes('cair');
        } else if (selectedStatusFilter === 'Realisasi Bantuan') {
          matchesStatus = s.includes('realisasi');
        } else if (selectedStatusFilter === 'Antrean SIMBA') {
          matchesStatus = s.includes('simba') && !s.includes('selesai') && !s.includes('synced') && !s.includes('arsip');
        } else if (selectedStatusFilter === 'Antrean Arsip') {
          matchesStatus = (s.includes('arsip') && !s.includes('selesai')) || s === 'antrean arsip' || s === 'antrean_arsip';
        } else if (selectedStatusFilter === 'Selesai' || selectedStatusFilter === 'Selesai & Arsip') {
          matchesStatus = s.includes('selesai') || s.includes('synced') || (s.includes('simba') && s.includes('arsip'));
        }
      }

      return matchesSearch && matchesAsal && matchesPilar && matchesStatus;
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
  }, [data, searchTerm, selectedAsalFilter, selectedPilarFilter, selectedStatusFilter]);

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

  // Open Direct Input Modal
  const handleOpenInputModal = () => {
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
    setNikFoundStatus(null);
    setIsInputModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setSelectedPenyaluran(item);
    setFormKategori(item.jenis_pengajuan === 'Lembaga' || item.nama_instansi ? 'Lembaga' : 'Perorangan');
    setFormJenisKelamin(item.jenis_kelamin || item.mustahik?.jenis_kelamin || 'Pria');
    setFormNama(item.nama_pemohon || '');
    setFormNamaInstansi(item.nama_instansi || '');
    setFormNik(item.nik || '');
    setFormAlamat(item.alamat || '');
    setFormTelepon(item.no_telpon || '');
    setFormYangMengajukan(item.yang_mengajukan || item.yangMengajukan || '');
    setFormHasMemo(item.has_memo || item.hasMemo || Boolean(item.memo_source));
    const progCode = item.jenis_permohonan || item.program?.code || '';
    const asnafVal = item.asnaf || 'Miskin';
    setFormJenisPermohonan(progCode);
    setFormAsnaf(asnafVal);
    setFormRkatId(item.rkat_activity_id || '');
    const mappedCoa = item.coa_code || resolveMappingCoa(progCode, asnafVal);
    setFormCoaCode(mappedCoa);
    setFormNominal(String(item.nominal || ''));
    setFormKeterangan(item.keterangan || '');
    setNikFoundStatus(null);
    setIsEditModalOpen(true);
  };

  // Submit Direct Input Form
  const handleSubmitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formNik.trim() || formNik.trim().length < 16) {
      alert(`Mohon isi 16 digit NIK ${formKategori === 'Lembaga' ? 'Pimpinan / Penanggung Jawab' : 'Pemohon'}.`);
      return;
    }
    
    const parsedNominal = Number(formNominal.replace(/\D/g, ''));
    if (!formNama.trim() || !parsedNominal || parsedNominal <= 0) {
      alert('Mohon lengkapi Nama Penerima dan Nominal Bantuan.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nama_pemohon: formNama.trim(),
        nama_instansi: formKategori === 'Lembaga' ? formNamaInstansi.trim() : null,
        nik: formNik.trim(),
        kategori: formKategori,
        jenis_kelamin: formKategori === 'Perorangan' ? formJenisKelamin : null,
        alamat: formAlamat.trim() || 'Kota Semarang',
        no_telpon: formTelepon.trim() || '080000000000',
        yang_mengajukan: formYangMengajukan.trim() || '—',
        has_memo: formHasMemo,
        memo_source: formHasMemo ? formMemoSource : 'DIRECT_PENYALURAN',
        jenis_permohonan: formJenisPermohonan || null,
        rkat_activity_id: formRkatId || null,
        coa_code: formCoaCode || null,
        asnaf: formAsnaf,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim() || 'Penyaluran ZIS',
        tipe_bantuan: 'Konsumtif'
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
      const payload = {
        nama_pemohon: formNama.trim(),
        nama_instansi: formKategori === 'Lembaga' ? formNamaInstansi.trim() : null,
        nik: formNik.trim(),
        jenis_kelamin: formKategori === 'Perorangan' ? formJenisKelamin : null,
        alamat: formAlamat.trim(),
        no_telpon: formTelepon.trim(),
        yang_mengajukan: formYangMengajukan.trim() || '—',
        has_memo: formHasMemo,
        memo_source: formHasMemo ? formMemoSource : null,
        jenis_permohonan: formJenisPermohonan || null,
        rkat_activity_id: formRkatId || null,
        coa_code: formCoaCode || null,
        asnaf: formAsnaf,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
        tipe_bantuan: 'Konsumtif',
        jenis_pengajuan: formKategori
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
  const handleExportExcel = () => {
    const exportRows = filteredData.map((item, idx) => {
      const { rkatNo, rkatName } = getRkatInfo(item);
      const { coaCode, coaName } = getCoaInfo(item);
      const { title: namaMustahik } = getMustahikDisplayName(item);
      return {
        No: idx + 1,
        'No. Agenda': item.asal_data === 'Jalur Direct' ? '-' : (item.agenda_no ? String(item.agenda_no) : '-'),
        'Asal Data': item.asal_data,
        'Nama Pemohon / Lembaga': namaMustahik || '-',
        'Kategori': item.jenis_pengajuan || 'Perorangan',
        'Jenis Kelamin': item.jenis_kelamin || item.mustahik?.jenis_kelamin || '-',
        'Yang Mengajukan': item.yang_mengajukan || item.yangMengajukan || 'Pimpinan BAZNAS',
        'Sumber Memo': item.has_memo ? (item.memo_source || 'Ya') : 'Tanpa Memo',
        'No. RKAT': rkatNo ? `RKAT #${rkatNo}` : '-',
        'Program Kegiatan': rkatName || item.program?.name || item.jenis_permohonan || 'Umum',
        'Kode COA (Buku Besar)': coaCode,
        'Nama Akun COA': coaName,
        'Asnaf': item.asnaf || '-',
        'Nominal (Rp)': item.nominal || 0,
        'Status': formatStatusDisplay(item.status),
        'Tanggal': formatDate(item.created_at || item.tanggal_masuk)
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penyaluran ZIS');
    XLSX.writeFile(wb, `Penyaluran_ZIS_BAZNAS_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input (Meliputi Nama Yang Mengajukan, Mustahik, NIK, Agenda, Ket) */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input
                type="text"
                placeholder="Cari mustahik, pengaju, agenda, NIK..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-slate-800 transition-all"
              />
            </div>

            {/* Filter Asal Data Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['Semua', 'Jalur Proposal', 'Jalur Direct'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setSelectedAsalFilter(tab); setCurrentPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    selectedAsalFilter === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filter Pilar / Program Utama (Custom Styled Dropdown) */}
            <CustomSelect
              options={[
                { value: 'Semua Pilar', label: 'Semua Pilar Program' },
                { value: 'Semarang Peduli', label: 'Semarang Peduli (Kemanusiaan)' },
                { value: 'Semarang Sehat', label: 'Semarang Sehat (Kesehatan)' },
                { value: 'Semarang Cerdas', label: 'Semarang Cerdas (Pendidikan)' },
                { value: 'Semarang Taqwa', label: 'Semarang Taqwa (Dakwah)' },
                { value: 'Semarang Makmur', label: 'Semarang Makmur (Ekonomi)' }
              ]}
              value={selectedPilarFilter}
              onChange={val => { setSelectedPilarFilter(val); setCurrentPage(1); }}
              className="w-48 sm:w-56"
            />

            {/* Filter Status (Custom Styled Dropdown) */}
            <CustomSelect
              options={[
                { value: 'Semua', label: 'Semua Status' },
                { value: 'Antrean Pencairan', label: 'Antrean Pencairan' },
                { value: 'Realisasi Bantuan', label: 'Realisasi Bantuan' },
                { value: 'Antrean SIMBA', label: 'Antrean SIMBA' },
                { value: 'Antrean Arsip', label: 'Antrean Arsip' },
                { value: 'Selesai', label: 'Selesai' }
              ]}
              value={selectedStatusFilter}
              onChange={val => { setSelectedStatusFilter(val); setCurrentPage(1); }}
              className="w-44 sm:w-48"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenInputModal}
              className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Tambah Penyaluran</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="size-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Master Table Header Bar */}
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
                  const isDirect = item.asal_data === 'Jalur Direct';
                  
                  // Extract RKAT & COA info cleanly
                  const { rkatName } = getRkatInfo(item);
                  const { coaCode, coaName } = getCoaInfo(item);
                  const programDisplayName = rkatName || item.program?.name || item.jenis_permohonan || 'Umum';
                  const yangMengajukanVal = item.yang_mengajukan || item.yangMengajukan || 'Pimpinan BAZNAS';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center text-slate-400 font-bold">{itemIndex}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1",
                          isDirect ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          <Tag className="size-3" />
                          {item.asal_data}
                        </span>
                      </td>
                      {/* No. Agenda Badge (Only for Jalur Proposal) */}
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
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded flex items-center gap-1" title="Yang Mengajukan">
                            <Send className="size-2.5 text-slate-400" />
                            {yangMengajukanVal}
                          </span>
                          {item.has_memo && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded" title={item.memo_source}>
                              {item.memo_source || 'Ada Memo'}
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
      </div>

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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* NIK Field with Auto-Cek */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">
                          {formKategori === 'Lembaga' ? 'NIK Pimpinan / Penanggung Jawab *' : 'NIK Pemohon (Wajib 16 Digit) *'}
                        </label>
                        {nikFoundStatus && (
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                            nikFoundStatus.includes('terdaftar') ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {nikFoundStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="Masukkan 16 digit NIK..."
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
                        <label className="font-bold text-slate-700">No. HP / WhatsApp</label>
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
                      <label className="font-bold text-slate-700">Alamat Lengkap</label>
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
                    {/* a. Search Dropdown: Program / Kegiatan Penyaluran */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">1. Jenis Permohonan / Program Penyaluran *</label>
                      <SearchableSelect
                        options={programSelectOptions}
                        value={formJenisPermohonan}
                        onSelect={handleProgramSelect}
                        placeholder="-- Cari & Pilih Program / Kegiatan Penyaluran --"
                        searchPlaceholder="Ketik nama / kode kegiatan..."
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
                    {/* Nominal Penyaluran (Pemisah ribuan titik) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Nominal Penyaluran (Rp) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 500.000"
                        value={formatNumberWithDots(formNominal)}
                        onChange={e => setFormNominal(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2.5 text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                      />
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
                    {/* a. Search Dropdown: Program / Kegiatan Penyaluran */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">1. Jenis Permohonan / Program Penyaluran *</label>
                      <SearchableSelect
                        options={programSelectOptions}
                        value={formJenisPermohonan}
                        onSelect={handleProgramSelect}
                        placeholder="-- Cari & Pilih Program / Kegiatan Penyaluran --"
                        searchPlaceholder="Ketik nama / kode kegiatan..."
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
                    {/* Nominal Penyaluran (Pemisah ribuan titik) */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700">Nominal Penyaluran (Rp) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 500.000"
                        value={formatNumberWithDots(formNominal)}
                        onChange={e => setFormNominal(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2.5 text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                      />
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

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
                <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl text-xs transition-colors cursor-pointer">
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
