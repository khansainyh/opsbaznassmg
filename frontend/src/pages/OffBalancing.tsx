import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { 
  ClipboardList, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Eye,
  X,
  Check,
  Building,
  Zap,
  Database,
  ChevronRight,
  Trash2,
  ChevronDown,
  UserRound,
  Plus,
  FileText,
  Search,
  Download,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';
import axios from 'axios';

const formatRupiah = (value: number | string | undefined | null) => {
  if (value === undefined || value === null || value === '') return '';
  const numberString = String(value).replace(/[^0-9]/g, '');
  if (!numberString) return '';
  const sisa = numberString.length % 3;
  let rupiah = numberString.substr(0, sisa);
  const ribuan = numberString.substr(sisa).match(/\d{3}/g);
  if (ribuan) {
    const separator = sisa ? '.' : '';
    rupiah += separator + ribuan.join('.');
  }
  return rupiah;
};

const parseRupiah = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

const penerimaanRowsAtas = [
  { key: 'penerimaan_zakatMaal', label: '1. Zakat Maal' },
  { key: 'penerimaan_zakatFitrah', label: '2. Zakat Fitrah' },
  { key: 'penerimaan_infakSedekah', label: '3. Infak/ Sedekah (Kotak Infak, Infak Jumat, Qris, Sedekah Subuh, Dll)' },
] as const;

const penerimaanRowsBawah = [
  { key: 'penerimaan_qurban', label: '5. Qurban' },
  { key: 'penerimaan_fidyah', label: '6. Fidyah' }
] as const;

const penerimaanRows = [...penerimaanRowsAtas, ...penerimaanRowsBawah] as const;

const penyaluranRows = [
  { key: 'penyaluran_zakatMaal', label: '1. Zakat Maal' },
  { key: 'penyaluran_zakatFitrah', label: '2. Zakat Fitrah' },
  { key: 'penyaluran_infakSedekah', label: '3. Infak/ Sedekah (Kotak Infak, Infak Jumat, Qris, Sedekah Subuh, Dll)' },
  { key: 'penyaluran_qurban', label: '4. Qurban' },
  { key: 'penyaluran_fidyah', label: '5. Fidyah' }
] as const;

interface OffBalanceUPZ {
  id: string;
  name: string;
  type: string;
  status?: string;
  kecamatan: string;
  kelurahan: string;
  category: string;
  metadata?: { address?: string; upzPhone?: string };
}

type SurveyStatus = 'Antrean Tugas' | 'Pending' | 'On Progress' | 'Laporan Selesai' | 'Disetujui';

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
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
  widthClass = "w-48 sm:w-56"
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
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

  useEffect(() => {
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
          "w-full bg-white border border-slate-200 rounded-xl py-2 px-3 flex items-center justify-between text-xs font-semibold shadow-xs transition-all text-left outline-none",
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
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
                    "px-3 py-2 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50",
                    value === opt ? "bg-primary/10 text-primary font-bold" : "text-slate-700 font-medium"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
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

function DownloadExcelDropdown({ onExport }: { onExport: (mode: 'all' | 'approved') => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(10, rect.right - 260)
      });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(10, rect.right - 260)
      });
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
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

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer",
          isOpen && "ring-2 ring-emerald-400 border-emerald-400 bg-emerald-100/80"
        )}
        title="Download Laporan Excel"
      >
        <Download className="size-3.5 text-emerald-700" />
        <span>Download Excel</span>
        <ChevronDown className={cn("size-3 text-emerald-600 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '260px',
            zIndex: 99999
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Pilihan Laporan Excel
          </div>

          <div className="py-1 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExport('all');
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50/80 flex items-start gap-3 transition-colors cursor-pointer group"
            >
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                <Download className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900 leading-tight">Download Semua Tugas</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Seluruh tugas OBS & akumulasi total</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExport('approved');
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/80 flex items-start gap-3 transition-colors cursor-pointer group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                <FileSpreadsheet className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 leading-tight">Download Disetujui</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Hanya tugas yang berstatus Disetujui</p>
              </div>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface OffBalancingProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function OffBalancing({ data, onUpdate }: OffBalancingProps) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'all-tasks'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'Semua'>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('Semua');
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('Semua');
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [editingSurveyData, setEditingSurveyData] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Form OBS Modal State
  const [isObsFormModalOpen, setIsObsFormModalOpen] = useState(false);
  const [obsTaskForForm, setObsTaskForForm] = useState<ProposalMemo | null>(null);
  const [savingObsForm, setSavingObsForm] = useState(false);
  const [obsForm, setObsForm] = useState<Record<string, any>>({
    namaUpz: '', namaKetuaUpz: '', noWa: '', alamat: '', kecamatan: '', saldoAwal: 0,
    penerimaan_zakatMaal: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
    penerimaan_zakatFitrah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
    penerimaan_infakSedekah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
    penerimaan_infakBarangJasa: { items: [] },
    penerimaan_qurban: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
    penerimaan_fidyah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
    penyaluran_zakatMaal: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
    penyaluran_zakatFitrah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
    penyaluran_infakSedekah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
    penyaluran_qurban: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
    penyaluran_fidyah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
  });

  // UPZ Off-Balance state
  const [offBalanceUPZs, setOffBalanceUPZs] = useState<OffBalanceUPZ[]>([]);
  const [loadingUPZs, setLoadingUPZs] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatePeriode, setGeneratePeriode] = useState('Semester 1 - Juni ' + new Date().getFullYear());
  const [selectedUPZIds, setSelectedUPZIds] = useState<Set<string>>(new Set());
  const [generateToast, setGenerateToast] = useState<string | null>(null);

  // Create Task Form State
  const [newName, setNewName] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKelurahan, setNewKelurahan] = useState('');
  const [newKecamatan, setNewKecamatan] = useState('');
  const [newNoTelpon, setNewNoTelpon] = useState('');
  const [newPeriode, setNewPeriode] = useState('Semester 1 - Juni ' + new Date().getFullYear());
  const [newKeterangan, setNewKeterangan] = useState('');

  const [surveyors, setSurveyors] = useState<any[]>([]);
  const [searchSurveyorQuery, setSearchSurveyorQuery] = useState('');
  const [isSurveyorDropdownOpen, setIsSurveyorDropdownOpen] = useState(false);

  const handleOpenObsForm = (task: ProposalMemo) => {
    setObsTaskForForm(task);
    const sd = task.survey_data || {};
    setObsForm({
      namaUpz: sd.namaUpz || task.namaPemohon || '',
      namaKetuaUpz: sd.namaKetuaUpz || task.pimpinanOrganisasi || '',
      noWa: sd.noWa || task.noTelpon || '',
      alamat: sd.alamat || task.alamat || '',
      kecamatan: sd.kecamatan || task.kecamatan || '',
      saldoAwal: sd.saldoAwal || 0,
      penerimaan_zakatMaal: sd.penerimaan_zakatMaal || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
      penerimaan_zakatFitrah: sd.penerimaan_zakatFitrah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
      penerimaan_infakSedekah: sd.penerimaan_infakSedekah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
      penerimaan_infakBarangJasa: sd.penerimaan_infakBarangJasa || { items: [] },
      penerimaan_qurban: sd.penerimaan_qurban || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
      penerimaan_fidyah: sd.penerimaan_fidyah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
      penyaluran_zakatMaal: sd.penyaluran_zakatMaal || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
      penyaluran_zakatFitrah: sd.penyaluran_zakatFitrah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
      penyaluran_infakSedekah: sd.penyaluran_infakSedekah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
      penyaluran_qurban: sd.penyaluran_qurban || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
      penyaluran_fidyah: sd.penyaluran_fidyah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
    });
    setIsObsFormModalOpen(true);
  };

  const handleSaveObsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsTaskForForm) return;
    setSavingObsForm(true);
    try {
      const updatedStatus = (obsTaskForForm.status === 'Monitoring Tugas' || obsTaskForForm.status === 'Pending') ? 'Survei Assessment' : obsTaskForForm.status;
      await axios.put(`/api/proposals/${obsTaskForForm.id}`, {
        survey_data: obsForm,
        status: updatedStatus
      });
      const updatedData = data.map(item => item.id === obsTaskForForm.id ? { ...item, survey_data: obsForm, status: updatedStatus } : item);
      onUpdate(updatedData);
      if (selectedTask && selectedTask.id === obsTaskForForm.id) {
        setSelectedTask(prev => prev ? { ...prev, survey_data: obsForm, status: updatedStatus } : null);
      }
      setIsObsFormModalOpen(false);
      setGenerateToast('Form Laporan OBS berhasil disimpan!');
      setTimeout(() => setGenerateToast(null), 4000);
    } catch (err) {
      console.error('Failed to save OBS form', err);
      alert('Gagal menyimpan Form Laporan OBS');
    } finally {
      setSavingObsForm(false);
    }
  };

  const handlePenerimaanObsChange = (key: string, field: string, value: any) => {
    setObsForm(prev => {
      const current = prev[key] || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' };
      return {
        ...prev,
        [key]: { ...current, [field]: value }
      };
    });
  };

  const handlePenyaluranObsChange = (key: string, field: string, value: any) => {
    setObsForm(prev => {
      const current = prev[key] || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' };
      return {
        ...prev,
        [key]: { ...current, [field]: value }
      };
    });
  };

  const totalObsPenerimaan = useMemo(() => {
    let sum = 0;
    penerimaanRows.forEach(row => {
      const rowData = obsForm[row.key] || { jumlahPenerimaan: 0 };
      sum += Number(rowData.jumlahPenerimaan) || 0;
    });
    return sum;
  }, [obsForm]);

  const totalObsDonatur = useMemo(() => {
    let sum = 0;
    penerimaanRows.forEach(row => {
      const rowData = obsForm[row.key] || { jumlahDonatur: 0 };
      sum += Number(rowData.jumlahDonatur) || 0;
    });
    return sum;
  }, [obsForm]);

  const totalObsPenyaluran = useMemo(() => {
    let sum = 0;
    penyaluranRows.forEach(row => {
      const rowData = obsForm[row.key] || { jumlahPenyaluran: 0 };
      sum += Number(rowData.jumlahPenyaluran) || 0;
    });
    return sum;
  }, [obsForm]);

  const totalObsMustahik = useMemo(() => {
    let sum = 0;
    penyaluranRows.forEach(row => {
      const rowData = obsForm[row.key] || { jumlahMustahik: 0 };
      sum += Number(rowData.jumlahMustahik) || 0;
    });
    return sum;
  }, [obsForm]);

  const obsSaldoAkhirKumulatif = useMemo(() => {
    const saldoAwal = Number(obsForm.saldoAwal) || 0;
    return (saldoAwal + totalObsPenerimaan) - totalObsPenyaluran;
  }, [obsForm.saldoAwal, totalObsPenerimaan, totalObsPenyaluran]);

  const kecamatans = [
    "Semarang Tengah", "Semarang Utara", "Semarang Timur", "Semarang Selatan",
    "Semarang Barat", "Gajahmungkur", "Candisari", "Tembalang",
    "Banyumanik", "Gunungpati", "Mijen", "Ngaliyan",
    "Tugu", "Genuk", "Pedurungan", "Gayamsari"
  ];

  // Fetch Off-Balance UPZs
  const fetchOffBalanceUPZs = useCallback(async () => {
    setLoadingUPZs(true);
    try {
      const res = await axios.get('/api/upz');
      if (res.data?.status === 'success') {
        const aktif = res.data.data.filter(
          (u: OffBalanceUPZ) => u.type === 'Off-Balance' && (!u.status || u.status === 'Aktif')
        );
        setOffBalanceUPZs(aktif);
      }
    } catch (err) {
      console.error('Failed to fetch UPZ list', err);
    } finally {
      setLoadingUPZs(false);
    }
  }, []);

  const fetchSurveyors = useCallback(async () => {
    try {
      const res = await axios.get('/api/users');
      if (res.data) {
        const relawanList = res.data.filter((u: any) => u.role === 'Relawan' || u.role === 'Relawan_Sementara' || u.role === 'Tim_Monev');
        setSurveyors(relawanList);
      }
    } catch (err) {
      console.error('Failed to fetch surveyors', err);
    }
  }, []);

  useEffect(() => {
    fetchSurveyors();
    fetchOffBalanceUPZs();
  }, [fetchSurveyors, fetchOffBalanceUPZs]);

  // UPZs that already have an OBS task this period
  const existingObsNames = useMemo(() => {
    return new Set(data.filter(d => d.jenisPengajuan === 'OBS').map(d => d.namaPemohon));
  }, [data]);

  // Off-Balance UPZs without a task yet (for the generate modal)
  const pendingUPZs = useMemo(() => {
    return offBalanceUPZs.filter(u => !existingObsNames.has(u.name));
  }, [offBalanceUPZs, existingObsNames]);

  const createObsTaskFromUPZ = async (upz: OffBalanceUPZ, periode: string): Promise<ProposalMemo | null> => {
    try {
      const payload = {
        tanggal_masuk: new Date().toISOString(),
        nama_pemohon: upz.name,
        alamat: upz.metadata?.address || '',
        kelurahan: upz.kelurahan || '',
        kecamatan: upz.kecamatan || '',
        no_telpon: upz.metadata?.upzPhone || '',
        status: 'Monitoring Tugas',
        jenis_pengajuan: 'OBS',
        keterangan: periode,
        rekomendasi: `Auto-generated dari Database UPZ Off-Balance. Kategori: ${upz.category}`
      };
      const res = await axios.post('/api/proposals', payload);
      if (res.data?.data) {
        const d = res.data.data;
        return {
          id: d.id, agendaNo: d.agenda_no,
          tanggalMasuk: new Date(d.tanggal_masuk).toISOString().split('T')[0],
          namaPemohon: d.nama_pemohon, alamat: d.alamat,
          kelurahan: d.kelurahan, kecamatan: d.kecamatan, noTelpon: d.no_telpon,
          status: 'Monitoring Tugas', jenisPengajuan: 'OBS',
          keterangan: d.keterangan, rekomendasi: d.rekomendasi,
          isBeingSurveyed: false, score: 0, namaInstansi: '', pimpinanOrganisasi: '',
          namaAnak: '', nik: '', pekerjaan: '', jenisPermohonan: '',
          jamPengajuan: '', yangMengajukan: '', hasMemo: false, memoSource: ''
        };
      }
    } catch (err) { console.error('Failed to create OBS task for', upz.name, err); }
    return null;
  };

  const handleGenerateSelected = async () => {
    if (selectedUPZIds.size === 0) return;
    setGeneratingAll(true);
    const toGenerate = offBalanceUPZs.filter(u => selectedUPZIds.has(u.id));
    const results: ProposalMemo[] = [];
    for (const upz of toGenerate) {
      const task = await createObsTaskFromUPZ(upz, generatePeriode);
      if (task) results.push(task);
    }
    if (results.length > 0) onUpdate([...results, ...data]);
    setGeneratingAll(false);
    setIsGenerateModalOpen(false);
    setSelectedUPZIds(new Set());
    setGenerateToast(`${results.length} tugas OBS berhasil dibuat!`);
    setTimeout(() => setGenerateToast(null), 4000);
  };

  const handleGenerateAll = async () => {
    setSelectedUPZIds(new Set(pendingUPZs.map(u => u.id)));
  };

  // Filter tasks specifically for Off-Balancing (OBS)
  const obsTasks = useMemo(() => {
    return data.filter(item => item.jenisPengajuan === 'OBS');
  }, [data]);

  const getSurveyStatus = (item: ProposalMemo): SurveyStatus => {
    if (item.status === 'Monitoring Tugas' || item.status === 'Pending') return 'Antrean Tugas';
    if (item.status === 'Survei Assessment' || item.status === 'Proses Disposisi') {
      return item.isBeingSurveyed ? 'On Progress' : 'Pending';
    }
    if (item.status === 'Selesai' || item.status === 'Survei Selesai') return 'Laporan Selesai';
    if (['Review Kepala Pelaksana', 'Persetujuan Nominal', 'Persetujuan Pimpinan', 'Penentuan Nominal', 'Pencairan Dana', 'Antrean Bantuan', 'Arsip', 'Disetujui'].includes(item.status)) return 'Disetujui';
    return 'Antrean Tugas';
  };

  const stats = useMemo(() => {
    return [
      { title: "Total Tugas OBS", value: obsTasks.length.toString(), subtitle: "Semester ini", icon: <ClipboardList className="size-5" />, color: "slate" },
      { title: "Sedang Disurvei", value: obsTasks.filter(t => getSurveyStatus(t) === 'On Progress').length.toString(), subtitle: "In Progress", icon: <RefreshCw className="size-5 animate-spin-slow" />, color: "primary", trend: "In Progress" },
      { title: "Menunggu Approve", value: obsTasks.filter(t => getSurveyStatus(t) === 'Laporan Selesai').length.toString(), subtitle: "Butuh Persetujuan", icon: <AlertCircle className="size-5" />, color: "amber" },
      { title: "Selesai / Disetujui", value: obsTasks.filter(t => getSurveyStatus(t) === 'Disetujui').length.toString(), subtitle: "Telah Tervalidasi", icon: <CheckCircle2 className="size-5" />, color: "emerald" },
    ];
  }, [obsTasks]);

  const handleUpdateStatus = async (id: string, newStatus: ProposalMemo['status']) => {
    try {
      const backendStatus = newStatus.replace(/ /g, '_');
      await axios.put(`/api/proposals/${id}`, { status: backendStatus });
      const updatedData = data.map(item => item.id === id ? { ...item, status: newStatus } : item);
      onUpdate(updatedData);
    } catch (err) {
      console.error(err);
      alert('Gagal update status tugas OBS');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAlamat.trim()) {
      alert('Nama Lembaga dan Alamat wajib diisi');
      return;
    }

    try {
      const payload = {
        tanggal_masuk: new Date().toISOString(),
        nama_pemohon: newName,
        alamat: newAlamat,
        kelurahan: newKelurahan,
        kecamatan: newKecamatan,
        no_telpon: newNoTelpon,
        status: 'Monitoring Tugas', // Default status: Antrean Tugas
        jenis_pengajuan: 'OBS',      // Identifies OBS Task
        keterangan: newPeriode,      // Store Period in Keterangan
        rekomendasi: newKeterangan   // Store Description in Rekomendasi
      };

      const res = await axios.post('/api/proposals', payload);
      if (res.data && res.data.data) {
        // Map to front-end schema
        const newItem: ProposalMemo = {
          id: res.data.data.id,
          agendaNo: res.data.data.agenda_no,
          tanggalMasuk: new Date(res.data.data.tanggal_masuk).toISOString().split('T')[0],
          namaPemohon: res.data.data.nama_pemohon,
          alamat: res.data.data.alamat,
          kelurahan: res.data.data.kelurahan,
          kecamatan: res.data.data.kecamatan,
          noTelpon: res.data.data.no_telpon,
          status: 'Monitoring Tugas',
          jenisPengajuan: 'OBS',
          keterangan: res.data.data.keterangan,
          rekomendasi: res.data.data.rekomendasi,
          isBeingSurveyed: false,
          score: 0,
          namaInstansi: '',
          pimpinanOrganisasi: '',
          namaAnak: '',
          nik: '',
          pekerjaan: '',
          jenisPermohonan: '',
          jamPengajuan: '',
          yangMengajukan: '',
          hasMemo: false,
          memoSource: ''
        };

        onUpdate([newItem, ...data]);
        setIsCreateModalOpen(false);
        // Reset fields
        setNewName('');
        setNewAlamat('');
        setNewKelurahan('');
        setNewKecamatan('');
        setNewNoTelpon('');
        setNewKeterangan('');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal membuat tugas Off-Balancing');
    }
  };

  const handleAssignSurveyor = async (surveyorName: string) => {
    if (!selectedTask) return;
    try {
      const payload = {
        surveyorName,
        status: 'Survei_Assessment', // Update status to let volunteer claim/see it
        survey_data: {
          surveyClaimedAt: new Date().toISOString()
        }
      };
      await axios.put(`/api/proposals/${selectedTask.id}`, payload);
      
      const updated = data.map(item => item.id === selectedTask.id ? { 
        ...item, 
        surveyorName,
        status: 'Survei Assessment',
        survey_data: payload.survey_data
      } : item);
      
      onUpdate(updated);
      setSelectedTask(prev => prev ? { ...prev, surveyorName, status: 'Survei Assessment', survey_data: payload.survey_data } : null);
    } catch (err) {
      console.error(err);
      alert('Gagal menugaskan relawan');
    }
  };

  const handleReleaseSurveyor = async () => {
    if (!selectedTask) return;
    try {
      await axios.put(`/api/proposals/${selectedTask.id}`, {
        surveyorName: null,
        isBeingSurveyed: false,
        status: 'Monitoring_Tugas'
      });
      const updated = data.map(item => item.id === selectedTask.id ? { 
        ...item, 
        surveyorName: undefined, 
        isBeingSurveyed: false,
        status: 'Monitoring Tugas'
      } : item);
      onUpdate(updated);
      setSelectedTask(prev => prev ? { ...prev, surveyorName: undefined, isBeingSurveyed: false, status: 'Monitoring Tugas' } : null);
    } catch (err) {
      console.error(err);
      alert('Gagal melepas tugas relawan');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus penugasan Off-Balancing ini?')) return;
    try {
      await axios.delete(`/api/proposals/${id}`);
      const updated = data.filter(item => item.id !== id);
      onUpdate(updated);
      setIsDetailModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus penugasan.');
    }
  };

  const handleSaveSurveyData = async () => {
    if (!selectedTask || !editingSurveyData) return;
    try {
      await axios.put(`/api/proposals/${selectedTask.id}`, {
        survey_data: editingSurveyData
      });
      const updatedData = data.map(item => item.id === selectedTask.id ? { ...item, survey_data: editingSurveyData } : item);
      onUpdate(updatedData);
      setSelectedTask(prev => prev ? { ...prev, survey_data: editingSurveyData } : null);
      alert('Perubahan laporan berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan laporan');
    }
  };

  const handleViewDetail = (task: ProposalMemo) => {
    setSelectedTask(task);
    setEditingSurveyData(task.survey_data ? JSON.parse(JSON.stringify(task.survey_data)) : null);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'Antrean Tugas': return "bg-slate-100 text-slate-600 border-slate-200";
      case 'Pending': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'On Progress': return "bg-primary/10 text-primary border-primary/20";
      case 'Laporan Selesai': return "bg-amber-50 text-amber-700 border-amber-200";
      case 'Disetujui': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  // Options for Kecamatan & Kelurahan
  const kecamatanOptions = useMemo(() => {
    const fromData = (obsTasks || []).map(d => d.kecamatan).filter(Boolean);
    const fromList = kecamatanKelurahanSemarang.map(k => k.kecamatan);
    return Array.from(new Set([...fromList, ...fromData])).sort();
  }, [obsTasks]);

  const kelurahanOptions = useMemo(() => {
    if (selectedKecamatan === 'Semua') {
      return [];
    }
    const found = kecamatanKelurahanSemarang.find(k => k.kecamatan.toLowerCase() === selectedKecamatan.toLowerCase());
    const fromList = found ? found.kelurahan : [];
    const fromData = (obsTasks || [])
      .filter(d => (d.kecamatan || '').toLowerCase() === selectedKecamatan.toLowerCase())
      .map(d => d.kelurahan)
      .filter(Boolean);
    return Array.from(new Set([...fromList, ...fromData])).sort();
  }, [obsTasks, selectedKecamatan]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (searchTerm.trim()) c++;
    if (selectedKecamatan !== 'Semua') c++;
    if (selectedKelurahan !== 'Semua') c++;
    if (statusFilter !== 'Semua') c++;
    return c;
  }, [searchTerm, selectedKecamatan, selectedKelurahan, statusFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedKecamatan('Semua');
    setSelectedKelurahan('Semua');
    setStatusFilter('Semua');
  };

  const filteredTasks = useMemo(() => {
    return obsTasks.filter(t => {
      // 1. Status Filter
      if (statusFilter !== 'Semua' && getSurveyStatus(t) !== statusFilter) {
        return false;
      }

      // 2. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nama = (t.namaPemohon || '').toLowerCase();
        const agenda = String(t.agendaNo || '');
        const alamat = (t.alamat || '').toLowerCase();
        const ket = (t.keterangan || '').toLowerCase();
        const pet = (t.surveyorName || '').toLowerCase();
        const kec = (t.kecamatan || '').toLowerCase();
        const kel = (t.kelurahan || '').toLowerCase();

        const match = nama.includes(q) || agenda.includes(q) || alamat.includes(q) || ket.includes(q) || pet.includes(q) || kec.includes(q) || kel.includes(q);
        if (!match) return false;
      }

      // 3. Kecamatan Filter
      if (selectedKecamatan !== 'Semua') {
        const kec = (t.kecamatan || '').toLowerCase();
        if (kec !== selectedKecamatan.toLowerCase()) return false;
      }

      // 4. Kelurahan Filter
      if (selectedKelurahan !== 'Semua') {
        const kel = (t.kelurahan || '').toLowerCase();
        if (kel !== selectedKelurahan.toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      const orderA = getSurveyStatus(a) === 'Laporan Selesai' ? 1 : 2;
      const orderB = getSurveyStatus(b) === 'Laporan Selesai' ? 1 : 2;
      return orderA - orderB;
    });
  }, [obsTasks, statusFilter, searchTerm, selectedKecamatan, selectedKelurahan]);

  // Export to Excel with full OBS breakdown and accumulation total row
  const handleExportExcel = (mode: 'all' | 'approved') => {
    const sourceList = mode === 'approved' 
      ? obsTasks.filter(t => getSurveyStatus(t) === 'Disetujui') 
      : filteredTasks;

    if (sourceList.length === 0) {
      alert(mode === 'approved' 
        ? 'Belum ada tugas OBS yang berstatus Disetujui untuk diexport.' 
        : 'Tidak ada data tugas OBS untuk diexport.');
      return;
    }

    let accSaldoAwal = 0;
    let accZakatMaalIn = 0;
    let accZakatFitrahIn = 0;
    let accInfakIn = 0;
    let accQurbanIn = 0;
    let accFidyahIn = 0;
    let accTotalPenerimaan = 0;
    let accDonatur = 0;

    let accZakatMaalOut = 0;
    let accZakatFitrahOut = 0;
    let accInfakOut = 0;
    let accQurbanOut = 0;
    let accFidyahOut = 0;
    let accTotalPenyaluran = 0;
    let accMustahik = 0;
    let accSaldoAkhir = 0;

    const exportRows: any[] = sourceList.map((task, idx) => {
      const sd = task.survey_data || {};
      const status = getSurveyStatus(task);

      const saldoAwal = Number(sd.saldoAwal) || 0;
      const zmIn = Number(sd.penerimaan_zakatMaal?.jumlahPenerimaan) || 0;
      const zfIn = Number(sd.penerimaan_zakatFitrah?.jumlahPenerimaan) || 0;
      const infIn = Number(sd.penerimaan_infakSedekah?.jumlahPenerimaan) || 0;
      const qurIn = Number(sd.penerimaan_qurban?.jumlahPenerimaan) || 0;
      const fidIn = Number(sd.penerimaan_fidyah?.jumlahPenerimaan) || 0;
      const totIn = zmIn + zfIn + infIn + qurIn + fidIn;

      const donatur = (Number(sd.penerimaan_zakatMaal?.jumlahDonatur) || 0) +
        (Number(sd.penerimaan_zakatFitrah?.jumlahDonatur) || 0) +
        (Number(sd.penerimaan_infakSedekah?.jumlahDonatur) || 0) +
        (Number(sd.penerimaan_qurban?.jumlahDonatur) || 0) +
        (Number(sd.penerimaan_fidyah?.jumlahDonatur) || 0);

      const zmOut = Number(sd.penyaluran_zakatMaal?.jumlahPenyaluran) || 0;
      const zfOut = Number(sd.penyaluran_zakatFitrah?.jumlahPenyaluran) || 0;
      const infOut = Number(sd.penyaluran_infakSedekah?.jumlahPenyaluran) || 0;
      const qurOut = Number(sd.penyaluran_qurban?.jumlahPenyaluran) || 0;
      const fidOut = Number(sd.penyaluran_fidyah?.jumlahPenyaluran) || 0;
      const totOut = zmOut + zfOut + infOut + qurOut + fidOut;

      const mustahik = (Number(sd.penyaluran_zakatMaal?.jumlahMustahik) || 0) +
        (Number(sd.penyaluran_zakatFitrah?.jumlahMustahik) || 0) +
        (Number(sd.penyaluran_infakSedekah?.jumlahMustahik) || 0) +
        (Number(sd.penyaluran_qurban?.jumlahMustahik) || 0) +
        (Number(sd.penyaluran_fidyah?.jumlahMustahik) || 0);

      const saldoAkhir = (saldoAwal + totIn) - totOut;

      // Accumulate
      accSaldoAwal += saldoAwal;
      accZakatMaalIn += zmIn;
      accZakatFitrahIn += zfIn;
      accInfakIn += infIn;
      accQurbanIn += qurIn;
      accFidyahIn += fidIn;
      accTotalPenerimaan += totIn;
      accDonatur += donatur;

      accZakatMaalOut += zmOut;
      accZakatFitrahOut += zfOut;
      accInfakOut += infOut;
      accQurbanOut += qurOut;
      accFidyahOut += fidOut;
      accTotalPenyaluran += totOut;
      accMustahik += mustahik;
      accSaldoAkhir += saldoAkhir;

      return {
        'No.': idx + 1,
        'No. Agenda': task.agendaNo ? String(task.agendaNo) : '-',
        'Nama Lembaga / UPZ': task.namaPemohon,
        'Kecamatan': task.kecamatan || '-',
        'Kelurahan': task.kelurahan || '-',
        'Alamat Lengkap': task.alamat || '-',
        'No. WhatsApp / HP': task.noTelpon || '-',
        'Periode / Keterangan': task.keterangan || '-',
        'Petugas / Relawan': task.surveyorName || 'Belum Ditugaskan',
        'Status OBS': status,
        'Saldo Awal (Rp)': saldoAwal,
        'Penerimaan Zakat Maal (Rp)': zmIn,
        'Penerimaan Zakat Fitrah (Rp)': zfIn,
        'Penerimaan Infak/Sedekah (Rp)': infIn,
        'Penerimaan Qurban (Rp)': qurIn,
        'Penerimaan Fidyah (Rp)': fidIn,
        'Total Penerimaan (Rp)': totIn,
        'Total Donatur (Orang)': donatur,
        'Penyaluran Zakat Maal (Rp)': zmOut,
        'Penyaluran Zakat Fitrah (Rp)': zfOut,
        'Penyaluran Infak/Sedekah (Rp)': infOut,
        'Penyaluran Qurban (Rp)': qurOut,
        'Penyaluran Fidyah (Rp)': fidOut,
        'Total Penyaluran (Rp)': totOut,
        'Total Mustahik (Orang)': mustahik,
        'Saldo Akhir Kumulatif (Rp)': saldoAkhir,
        'Tanggal Masuk': task.tanggalMasuk || '-'
      };
    });

    // Append Summary / Accumulation Row
    exportRows.push({
      'No.': 'TOTAL',
      'No. Agenda': '',
      'Nama Lembaga / UPZ': `AKUMULASI TOTAL (${sourceList.length} TUGAS OBS)`,
      'Kecamatan': '',
      'Kelurahan': '',
      'Alamat Lengkap': '',
      'No. WhatsApp / HP': '',
      'Periode / Keterangan': '',
      'Petugas / Relawan': '',
      'Status OBS': mode === 'approved' ? 'DISETUJUI' : 'SEMUA STATUS',
      'Saldo Awal (Rp)': accSaldoAwal,
      'Penerimaan Zakat Maal (Rp)': accZakatMaalIn,
      'Penerimaan Zakat Fitrah (Rp)': accZakatFitrahIn,
      'Penerimaan Infak/Sedekah (Rp)': accInfakIn,
      'Penerimaan Qurban (Rp)': accQurbanIn,
      'Penerimaan Fidyah (Rp)': accFidyahIn,
      'Total Penerimaan (Rp)': accTotalPenerimaan,
      'Total Donatur (Orang)': accDonatur,
      'Penyaluran Zakat Maal (Rp)': accZakatMaalOut,
      'Penyaluran Zakat Fitrah (Rp)': accZakatFitrahOut,
      'Penyaluran Infak/Sedekah (Rp)': accInfakOut,
      'Penyaluran Qurban (Rp)': accQurbanOut,
      'Penyaluran Fidyah (Rp)': accFidyahOut,
      'Total Penyaluran (Rp)': accTotalPenyaluran,
      'Total Mustahik (Orang)': accMustahik,
      'Saldo Akhir Kumulatif (Rp)': accSaldoAkhir,
      'Tanggal Masuk': new Date().toISOString().split('T')[0]
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const sheetName = mode === 'approved' ? 'OBS Disetujui' : 'Laporan OBS';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const fileName = mode === 'approved'
      ? `Laporan_OBS_Tugas_Disetujui_BAZNAS_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Laporan_OBS_Semua_Tugas_BAZNAS_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };



  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Toast */}
      <AnimatePresence>
        {generateToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg font-bold text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="size-4" /> {generateToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs & Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Pelaporan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Off-Balancing</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Off-Balancing (OBS)</h2>
            <p className="text-slate-500 font-medium">Manajemen Penugasan Penilaian Mandiri Lembaga &amp; UPZ Akhir Semester.</p>
          </div>
        </div>
      </motion.div>

      {viewMode === 'dashboard' ? (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div 
                key={stat.title} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }} 
                className="bg-white p-6 rounded-xl border border-primary/5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-2 rounded-lg", 
                    stat.color === 'primary' ? "bg-primary/10 text-primary" : 
                    stat.color === 'amber' ? "bg-amber-50 text-amber-600" : 
                    stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : 
                    "bg-slate-100 text-slate-600"
                  )}>
                    {stat.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.title}</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'In Progress' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  <p className={cn(
                    "text-xs font-medium", 
                    stat.color === 'primary' ? "text-primary" : 
                    stat.color === 'amber' ? "text-amber-600" : 
                    stat.color === 'emerald' ? "text-emerald-600" : 
                    "text-slate-400"
                  )}>
                    {stat.subtitle}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Districts Grid */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.4 }} 
            className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-primary/5 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Sebaran Wilayah (16 Kecamatan)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Kota Semarang</span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {kecamatans.map((kec) => (
                <div 
                  key={kec} 
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">Kecamatan</p>
                  <p className="text-xs font-black text-slate-700 mt-0.5 min-h-[2rem] flex items-center leading-tight whitespace-normal break-words" title={kec}>{kec}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                      {obsTasks.filter(t => t.kecamatan === kec).length} Aktif
                    </span>
                    <ChevronRight className="size-3 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Daftar Tugas (max 5) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }} 
            className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800">Daftar Tugas</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{filteredTasks.length} data sesuai filter</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <DownloadExcelDropdown onExport={handleExportExcel} />
                <button
                  onClick={() => { fetchOffBalanceUPZs(); setIsGenerateModalOpen(true); }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Zap className="size-3.5" /> Generate Tugas OBS
                </button>
                <button 
                  onClick={() => setViewMode('all-tasks')} 
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Lihat Semua
                </button>
              </div>
            </div>

            {/* Filter Bar (Search, Kecamatan, Kelurahan) */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-end gap-3">
              {/* Search Bar */}
              <div className="flex flex-col gap-1 w-full sm:w-64">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cari Tugas / UPZ</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, agenda, alamat..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-slate-800 shadow-xs"
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Kecamatan */}
              <SearchableDropdown
                label="Kecamatan"
                value={selectedKecamatan}
                onChange={(val) => {
                  setSelectedKecamatan(val);
                  setSelectedKelurahan('Semua');
                }}
                options={kecamatanOptions}
                placeholder="Pilih Kecamatan..."
                allOptionLabel="Semua Kecamatan"
                widthClass="w-48 sm:w-56"
              />

              {/* Filter Kelurahan */}
              <SearchableDropdown
                label="Kelurahan"
                value={selectedKelurahan}
                onChange={(val) => setSelectedKelurahan(val)}
                options={kelurahanOptions}
                placeholder="Pilih Kelurahan..."
                allOptionLabel="Semua Kelurahan"
                disabled={selectedKecamatan === 'Semua'}
                widthClass="w-48 sm:w-56"
              />

              {/* Reset Filter Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mb-0.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Reset Semua Filter"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">No. Agenda</th>
                    <th className="px-6 py-4">Lembaga & Lokasi</th>
                    <th className="px-6 py-4">Petugas</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                        Tidak ada tugas Off-Balancing (OBS) yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.slice(0, 5).map((task) => {
                      const status = getSurveyStatus(task);
                      return (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                              {task.agendaNo}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-900">{task.namaPemohon}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{task.alamat}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {task.surveyorName ? (
                                <>
                                  <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                                  <span className="text-xs font-medium text-slate-700">{task.surveyorName}</span>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-400 italic">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                    <UserRound className="size-3 text-slate-400" />
                                  </div>
                                  <span className="text-[10px] font-medium">Belum Ditugaskan</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-black rounded-full border w-fit block", 
                              getStatusBadge(status)
                            )}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {status === 'Laporan Selesai' && (
                                <button 
                                  onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                                  title="Setujui"
                                >
                                  <CheckCircle2 className="size-3.5" /> Setujui
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => handleOpenObsForm(task)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
                                title="Lihat / Edit Form OBS"
                              >
                                <FileText className="size-3.5" /> Form OBS
                              </button>
                              <button 
                                onClick={() => handleViewDetail(task)} 
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title="Detail"
                              >
                                <Eye className="size-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)} 
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                                title="Hapus Penugasan"
                              >
                                <Trash2 className="size-4" />
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

            {/* Mobile Card List (Visible on Mobile Only) */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {obsTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  Belum ada tugas Off-Balancing (OBS).
                </div>
              ) : (
                obsTasks.slice(0, 5).map((task) => {
                  const status = getSurveyStatus(task);
                  return (
                    <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                          {task.agendaNo}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 text-[9px] font-black rounded-full border",
                          getStatusBadge(status)
                        )}>
                          {status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-sm">{task.namaPemohon}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{task.alamat}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-1">
                        <div className="flex items-center gap-2">
                          {task.surveyorName ? (
                            <>
                              <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6.5 h-6.5 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                              <span className="text-xs font-semibold text-slate-700">{task.surveyorName}</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 italic">
                              <UserRound className="size-3.5" />
                              <span className="text-[11px]">Belum Ditugaskan</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {status === 'Laporan Selesai' && (
                            <button 
                              onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="size-3" /> Setujui
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewDetail(task)} 
                            className="p-1.5 bg-slate-50 text-slate-450 hover:text-primary hover:bg-primary/5 rounded-xl active:scale-95 transition-all border border-slate-100"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)} 
                            className="p-1.5 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl active:scale-95 transition-all border border-rose-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          {/* Detail Daftar Tugas Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Detail Daftar Tugas</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Total {obsTasks.length} data dalam antrean ({filteredTasks.length} sesuai filter)</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <DownloadExcelDropdown onExport={handleExportExcel} />
              <button
                onClick={() => { fetchOffBalanceUPZs(); setIsGenerateModalOpen(true); }}
                className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-sm active:scale-95 cursor-pointer"
              >
                <Zap className="size-3.5" /> Generate Tugas OBS
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>

          {/* Filters Bar (Status Tabs, Search, Kecamatan, Kelurahan) */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {(['Semua', 'Antrean Tugas', 'On Progress', 'Laporan Selesai', 'Disetujui'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer",
                      statusFilter === f 
                        ? "bg-primary text-white border-primary shadow-sm shadow-primary/20" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredTasks.length} Tugas Ditemukan</span>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-200/60">
              {/* Search Bar */}
              <div className="flex flex-col gap-1 w-full sm:w-64">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cari Tugas / UPZ</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, agenda, alamat..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-slate-800 shadow-xs"
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Kecamatan */}
              <SearchableDropdown
                label="Kecamatan"
                value={selectedKecamatan}
                onChange={(val) => {
                  setSelectedKecamatan(val);
                  setSelectedKelurahan('Semua');
                }}
                options={kecamatanOptions}
                placeholder="Pilih Kecamatan..."
                allOptionLabel="Semua Kecamatan"
                widthClass="w-48 sm:w-56"
              />

              {/* Filter Kelurahan */}
              <SearchableDropdown
                label="Kelurahan"
                value={selectedKelurahan}
                onChange={(val) => setSelectedKelurahan(val)}
                options={kelurahanOptions}
                placeholder="Pilih Kelurahan..."
                allOptionLabel="Semua Kelurahan"
                disabled={selectedKecamatan === 'Semua'}
                widthClass="w-48 sm:w-56"
              />

              {/* Reset Filter Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mb-0.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Reset Semua Filter"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">No. Agenda</th>
                  <th className="px-6 py-4">Lembaga & Lokasi</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">Petugas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      Tidak ada tugas OBS dengan kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const status = getSurveyStatus(task);
                    return (
                      <tr key={task.id} className="hover:bg-slate-50/30 transition">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                            {task.agendaNo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{task.namaPemohon}</p>
                          <p className="text-xs text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
                            <MapPin className="size-3 shrink-0" /> {task.alamat}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{task.keterangan}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {task.surveyorName ? (
                              <>
                                <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                                <span className="font-semibold text-slate-700">{task.surveyorName}</span>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-400 italic">
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                  <UserRound className="size-3 text-slate-400" />
                                </div>
                                <span className="text-xs text-slate-400 font-medium">Belum Ditugaskan</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 text-[10px] font-black rounded-full border w-fit block",
                            getStatusBadge(status)
                          )}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {status === 'Laporan Selesai' && (
                              <button 
                                onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                                title="Setujui"
                              >
                                <CheckCircle2 className="size-3.5" /> Setujui
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => handleOpenObsForm(task)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
                              title="Lihat / Edit Form OBS"
                            >
                              <FileText className="size-3.5" /> Form OBS
                            </button>
                            <button 
                              onClick={() => handleViewDetail(task)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                              title="Detail / Tugaskan"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-xl transition-all"
                              title="Hapus Penugasan"
                            >
                              <Trash2 className="size-4" />
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

          {/* Mobile Card List (Visible on Mobile Only) */}
          <div className="block md:hidden divide-y divide-slate-100 bg-white">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">
                Tidak ada tugas OBS dengan kriteria filter ini.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const status = getSurveyStatus(task);
                return (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                        {task.agendaNo}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 text-[9px] font-black rounded-full border",
                        getStatusBadge(status)
                      )}>
                        {status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 text-sm">{task.namaPemohon}</p>
                      <p className="text-xs text-slate-550 leading-relaxed">{task.alamat}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Periode: {task.keterangan}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-55 pt-2.5 mt-1">
                      <div className="flex items-center gap-2">
                        {task.surveyorName ? (
                          <>
                            <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6.5 h-6.5 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                            <span className="text-xs font-semibold text-slate-700">{task.surveyorName}</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 italic">
                            <UserRound className="size-3.5" />
                            <span className="text-[11px]">Belum Ditugaskan</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {status === 'Laporan Selesai' && (
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="size-3" /> Setujui
                          </button>
                        )}
                        <button 
                          onClick={() => handleViewDetail(task)} 
                          className="p-1.5 bg-slate-50 text-slate-450 hover:text-primary hover:bg-primary/5 rounded-xl active:scale-95 transition-all border border-slate-100"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)} 
                          className="p-1.5 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl active:scale-95 transition-all border border-rose-100"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* GENERATE FROM UPZ MODAL */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden relative z-10 border border-primary/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Database className="size-4" /></div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Generate Tugas OBS dari Database UPZ</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{offBalanceUPZs.length} UPZ Off-Balance Aktif ditemukan &bull; {pendingUPZs.length} belum ada tugas</p>
                  </div>
                </div>
                <button onClick={() => setIsGenerateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="size-5" /></button>
              </div>

              <div className="p-6 border-b border-slate-100 bg-white shrink-0 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-1 w-full md:flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Periode Survei</label>
                    <div className="relative">
                      <select 
                        value={generatePeriode} 
                        onChange={e => setGeneratePeriode(e.target.value)}
                        className="w-full text-sm font-extrabold bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer transition-all text-slate-700"
                      >
                        <option value={`Semester 1 - Juni ${new Date().getFullYear()}`}>Semester 1 (Juni {new Date().getFullYear()})</option>
                        <option value={`Semester 2 - Desember ${new Date().getFullYear()}`}>Semester 2 (Desember {new Date().getFullYear()})</option>
                        <option value={`Semester 1 - Juni ${new Date().getFullYear() + 1}`}>Semester 1 (Juni {new Date().getFullYear() + 1})</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto md:shrink-0">
                    <button 
                      onClick={handleGenerateAll}
                      className="flex-1 md:flex-initial px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase transition whitespace-nowrap text-center"
                    >
                      Pilih Semua
                    </button>
                    <button 
                      onClick={() => setSelectedUPZIds(new Set())}
                      className="flex-1 md:flex-initial px-4 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-slate-700 rounded-xl text-xs font-black uppercase transition text-center"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {selectedUPZIds.size > 0 && (
                  <p className="text-xs font-bold text-emerald-600">{selectedUPZIds.size} UPZ dipilih untuk generate tugas</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                {loadingUPZs ? (
                  <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="size-8 animate-spin mx-auto mb-2 text-primary/40" />
                    <p className="text-sm font-bold">Memuat data UPZ...</p>
                  </div>
                ) : offBalanceUPZs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Database className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold">Tidak ada UPZ Off-Balance aktif</p>
                    <p className="text-xs mt-1">Pastikan tipe UPZ diatur ke Off-Balance di Database UPZ</p>
                  </div>
                ) : (
                  offBalanceUPZs.map(upz => {
                    const hasTask = existingObsNames.has(upz.name);
                    const isSelected = selectedUPZIds.has(upz.id);
                    return (
                      <div key={upz.id} className={cn(
                        "p-4 flex items-center gap-4 transition cursor-pointer",
                        hasTask ? 'bg-emerald-50/50 cursor-default' : isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                      )}
                        onClick={() => {
                          if (hasTask) return;
                          setSelectedUPZIds(prev => {
                            const next = new Set(prev);
                            if (next.has(upz.id)) next.delete(upz.id); else next.add(upz.id);
                            return next;
                          });
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition",
                          hasTask ? 'bg-emerald-500 border-emerald-500' : isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                        )}>
                          {(hasTask || isSelected) && <Check className="size-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{upz.name}</p>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 shrink-0" />
                            {upz.kecamatan}{upz.kelurahan ? `, ${upz.kelurahan}` : ''} &bull; <span className="font-bold text-slate-600">{upz.category}</span>
                          </p>
                        </div>
                        {hasTask ? (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">Sudah Ada Tugas</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">Belum Ada Tugas</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <p className="text-xs text-slate-500 font-semibold text-center sm:text-left leading-relaxed">
                  Hanya UPZ yang dipilih &amp; belum ada tugas yang akan di-generate
                </p>
                <div className="flex items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                  <button onClick={() => setIsGenerateModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition text-center">
                    Batal
                  </button>
                  <button
                    onClick={handleGenerateSelected}
                    disabled={selectedUPZIds.size === 0 || generatingAll}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingAll ? <RefreshCw className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    {generatingAll ? 'Membuat...' : `Generate ${selectedUPZIds.size} Tugas`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TASK MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden relative z-10 border border-primary/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-55 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                    <Building className="size-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">Buat Tugas Assessment OBS Baru</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Lembaga / UPZ</label>
                  <input 
                    type="text" 
                    required 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Contoh: UPZ Masjid Agung Semarang"
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alamat Lengkap</label>
                  <textarea 
                    required 
                    rows={2}
                    value={newAlamat} 
                    onChange={e => setNewAlamat(e.target.value)}
                    placeholder="Alamat detail lokasi assessment..."
                    className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kecamatan</label>
                    <select 
                      value={newKecamatan} 
                      onChange={e => setNewKecamatan(e.target.value)}
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    >
                      <option value="">Pilih Kecamatan</option>
                      {kecamatans.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kelurahan</label>
                    <input 
                      type="text" 
                      value={newKelurahan} 
                      onChange={e => setNewKelurahan(e.target.value)}
                      placeholder="Contoh: Kauman"
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No. Telepon / Kontak</label>
                    <input 
                      type="text" 
                      value={newNoTelpon} 
                      onChange={e => setNewNoTelpon(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periode Survei</label>
                    <select 
                      value={newPeriode} 
                      onChange={e => setNewPeriode(e.target.value)}
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    >
                      <option value={`Semester 1 - Juni ${new Date().getFullYear()}`}>Semester 1 (Juni {new Date().getFullYear()})</option>
                      <option value={`Semester 2 - Desember ${new Date().getFullYear()}`}>Semester 2 (Desember {new Date().getFullYear()})</option>
                      <option value={`Semester 1 - Juni ${new Date().getFullYear() + 1}`}>Semester 1 (Juni {new Date().getFullYear() + 1})</option>
                      <option value={`Semester 2 - Desember ${new Date().getFullYear() + 1}`}>Semester 2 (Desember {new Date().getFullYear() + 1})</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keterangan / Tujuan Assessment</label>
                  <textarea 
                    rows={2}
                    value={newKeterangan} 
                    onChange={e => setNewKeterangan(e.target.value)}
                    placeholder="Misal: Survei kelayakan kelanjutan dana bagi hasil UPZ..."
                    className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition"
                  >
                    Simpan Tugas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL & ASSIGNMENT MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden relative z-10 border border-primary/10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-55 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded font-bold text-[10px] border border-emerald-250 uppercase">
                    OBS
                  </span>
                  <h3 className="text-base font-black text-slate-800">Detail Tugas Off-Balancing (OBS)</h3>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X className="size-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Info Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lembaga / UPZ</p>
                      <p className="text-sm font-black text-slate-800 mt-1">{selectedTask.namaPemohon}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode Survei</p>
                      <p className="text-sm font-black text-primary mt-1">{selectedTask.keterangan}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</p>
                    <p className="text-sm font-bold text-slate-700 mt-1 flex items-start gap-1">
                      <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      {selectedTask.alamat}, {selectedTask.kelurahan}, {selectedTask.kecamatan}
                    </p>
                  </div>

                  {selectedTask.rekomendasi && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tujuan / Catatan Keterangan</p>
                      <p className="text-xs text-slate-600 font-semibold mt-1 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {selectedTask.rekomendasi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Assignment Controls */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Petugas Lapangan</h4>
                  <div className="flex items-center gap-4 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10">
                    {selectedTask.surveyorName ? (
                      <>
                        <img 
                          src={`https://picsum.photos/seed/${selectedTask.surveyorName}/100/100`} 
                          alt={selectedTask.surveyorName} 
                          className="w-12 h-12 rounded-full border-2 border-white shadow-sm" 
                          referrerPolicy="no-referrer" 
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{selectedTask.surveyorName}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Relawan BAZNAS</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-slate-400 italic">Belum Ditugaskan</p>
                    )}
                  </div>

                  {selectedTask.surveyorName && selectedTask.survey_data?.surveyClaimedAt && (
                    <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Informasi Penugasan</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Diambil</p>
                          <p className="font-extrabold text-slate-700">
                            {new Date((selectedTask.survey_data as any).surveyClaimedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANAJEMEN SURVEYOR */}
                  {selectedTask.status !== 'Selesai' && 
                    selectedTask.status !== 'Disetujui' && (
                    <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Manajemen Penugasan
                      </p>
                      
                      <div className="flex flex-col gap-2">
                        {/* Alihkan Dropdown Cari */}
                        <div className="space-y-1 relative">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {selectedTask.surveyorName ? "Alihkan ke Relawan Lain" : "Tugaskan ke Relawan"}
                          </label>
                          
                          <div className="relative">
                            {/* Trigger Button */}
                            <button
                              type="button"
                              onClick={() => setIsSurveyorDropdownOpen(prev => !prev)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-left flex justify-between items-center focus:ring-1 focus:ring-emerald-500 outline-none"
                            >
                              <span>Pilih Relawan...</span>
                              <span className="text-[10px] text-slate-400">▼</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isSurveyorDropdownOpen && (
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 space-y-2">
                                <input
                                  type="text"
                                  value={searchSurveyorQuery}
                                  onChange={(e) => setSearchSurveyorQuery(e.target.value)}
                                  placeholder="Cari nama relawan..."
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold outline-none focus:bg-white focus:border-emerald-500"
                                  autoFocus
                                />
                                <div className="max-h-40 overflow-y-auto custom-scrollbar text-xs font-bold text-slate-700 divide-y divide-slate-50">
                                  {surveyors
                                    .filter(s => s.name !== selectedTask.surveyorName)
                                    .filter(s => s.name.toLowerCase().includes(searchSurveyorQuery.toLowerCase()))
                                    .map(s => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          setIsSurveyorDropdownOpen(false);
                                          setSearchSurveyorQuery('');
                                          handleAssignSurveyor(s.name);
                                        }}
                                        className="w-full text-left p-2 hover:bg-slate-50 transition-colors text-slate-800 rounded-md block font-semibold"
                                      >
                                        {s.name}
                                      </button>
                                    ))
                                  }
                                  {surveyors
                                    .filter(s => s.name !== selectedTask.surveyorName)
                                    .filter(s => s.name.toLowerCase().includes(searchSurveyorQuery.toLowerCase())).length === 0 && (
                                      <p className="text-center py-2 text-[10px] text-slate-400 italic">Relawan tidak ditemukan</p>
                                    )
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Batalkan Penugasan */}
                        {selectedTask.surveyorName && (
                          <button
                            type="button"
                            onClick={handleReleaseSurveyor}
                            className="w-full mt-2 py-2 px-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg transition-all text-center flex items-center justify-center gap-1"
                          >
                            <X className="size-3" />
                            Lepas Penugasan (Reset)
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>                {/* Laporan Assessment OBS Section */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Laporan Assessment OBS</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenObsForm(selectedTask)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-all active:scale-95"
                      >
                        <FileText className="size-3.5" />
                        Lihat / Edit Form OBS
                      </button>
                      {editingSurveyData && editingSurveyData.saldoAkhir !== undefined ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-black uppercase border border-emerald-100">
                          Terisi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase border border-slate-200">
                          Kosong
                        </span>
                      )}
                    </div>
                  </div>

                  {editingSurveyData && editingSurveyData.saldoAkhir !== undefined ? (
                    <div className="space-y-6">
                      {/* Ringkasan Kontak & Pengurus */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">Ketua UPZ</span>
                            <span className="text-slate-700 font-bold">{editingSurveyData.namaKetuaUpz || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">No. WA</span>
                            <span className="text-slate-700 font-bold">{editingSurveyData.noWa || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">Tanggal Laporan</span>
                            <span className="text-slate-700 font-bold">{editingSurveyData.tanggalSemarang || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">Total Penerimaan</span>
                            <span className="text-emerald-600 font-extrabold">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(editingSurveyData.totalPenerimaan || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">Total Penyaluran</span>
                            <span className="text-rose-600 font-extrabold">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(editingSurveyData.totalPenyaluran || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block uppercase text-[9px]">Saldo Akhir</span>
                            <span className="text-primary font-extrabold">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(editingSurveyData.saldoAkhir || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detail Penerimaan */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm space-y-3">
                        <h5 className="font-bold text-emerald-700 text-xs flex items-center gap-1.5 border-b border-emerald-50 pb-2">
                          <span className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                          Rincian Penerimaan
                        </h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider">
                                <th className="pb-2">Jenis ZIS</th>
                                <th className="pb-2 text-right">Jumlah (Rp)</th>
                                <th className="pb-2 text-center">Donatur</th>
                                <th className="pb-2">Tambahan</th>
                                <th className="pb-2">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                              {[
                                { key: 'penerimaan_zakatMaal', label: 'Zakat Maal' },
                                { key: 'penerimaan_zakatFitrah', label: 'Zakat Fitrah', isBeras: true },
                                { key: 'penerimaan_infakSedekah', label: 'Infak/Sedekah' },
                                { key: 'penerimaan_qurban', label: 'Qurban', isQurban: true },
                                { key: 'penerimaan_fidyah', label: 'Fidyah', isBeras: true }
                              ].map(row => {
                                const val = editingSurveyData[row.key] || {};
                                return (
                                  <tr key={row.key}>
                                    <td className="py-2 font-bold">{row.label}</td>
                                    <td className="py-2 text-right font-extrabold text-emerald-600">
                                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val.jumlahPenerimaan || 0)}
                                    </td>
                                    <td className="py-2 text-center">{val.jumlahDonatur || 0} Orang</td>
                                    <td className="py-2 text-slate-500">
                                      {row.isBeras && val.beras !== undefined && `${val.beras || 0} kg`}
                                      {row.isQurban && val.kambingDomba !== undefined && `${val.kambingDomba || 0} ekor, ${val.sapiKerbau || 0} ekor`}
                                    </td>
                                    <td className="py-2 text-slate-500 italic max-w-[120px] truncate" title={val.keterangan || ''}>
                                      {val.keterangan || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Infak/Sedekah Barang & Jasa (Staff Pelaporan Estimasi Harga) */}
                      <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm space-y-3">
                        <h5 className="font-bold text-amber-700 text-xs flex items-center justify-between border-b border-amber-50 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                            Infak / Sedekah Barang &amp; Jasa
                          </div>
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-bold">
                            {(editingSurveyData.penerimaan_infakBarangJasa?.items || []).length} Item
                          </span>
                        </h5>
                        <div className="space-y-3">
                          {!(editingSurveyData.penerimaan_infakBarangJasa?.items?.length) ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-2">Tidak ada penerimaan barang &amp; jasa.</p>
                          ) : (
                            editingSurveyData.penerimaan_infakBarangJasa.items.map((item: any, idx: number) => (
                              <div key={idx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                <div className="space-y-1">
                                  <div>Jenis: <strong className="text-slate-800">{item.jenisBarang || '-'}</strong></div>
                                  <div>Merek: <span className="text-slate-650">{item.merekSpesifikasi || '-'}</span></div>
                                  <div>Jumlah: <span className="text-slate-650">{item.jumlah || '-'}</span></div>
                                  <div>Keterangan: <span className="text-slate-500 italic">{item.keterangan || '-'}</span></div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Estimasi Harga (Rp) *</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Masukkan estimasi harga..."
                                    value={item.estimasiHarga || ''}
                                    onChange={e => {
                                      const newItems = [...(editingSurveyData.penerimaan_infakBarangJasa?.items || [])];
                                      newItems[idx] = { ...newItems[idx], estimasiHarga: e.target.value === '' ? '' : Number(e.target.value) };
                                      setEditingSurveyData({
                                        ...editingSurveyData,
                                        penerimaan_infakBarangJasa: { ...editingSurveyData.penerimaan_infakBarangJasa, items: newItems }
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Detail Penyaluran */}
                      <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm space-y-3">
                        <h5 className="font-bold text-rose-700 text-xs flex items-center gap-1.5 border-b border-rose-50 pb-2">
                          <span className="w-1.5 h-3 bg-rose-500 rounded-full" />
                          Rincian Penyaluran
                        </h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider">
                                <th className="pb-2">Jenis ZIS</th>
                                <th className="pb-2 text-right">Jumlah (Rp)</th>
                                <th className="pb-2 text-center">Mustahik</th>
                                <th className="pb-2">Tambahan</th>
                                <th className="pb-2">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                              {[
                                { key: 'penyaluran_zakatMaal', label: 'Zakat Maal' },
                                { key: 'penyaluran_zakatFitrah', label: 'Zakat Fitrah', isBeras: true },
                                { key: 'penyaluran_infakSedekah', label: 'Infak/Sedekah' },
                                { key: 'penyaluran_qurban', label: 'Qurban', isQurban: true },
                                { key: 'penyaluran_fidyah', label: 'Fidyah', isBeras: true }
                              ].map(row => {
                                const val = editingSurveyData[row.key] || {};
                                return (
                                  <tr key={row.key}>
                                    <td className="py-2 font-bold">{row.label}</td>
                                    <td className="py-2 text-right font-extrabold text-rose-600">
                                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val.jumlahPenyaluran || 0)}
                                    </td>
                                    <td className="py-2 text-center">{val.jumlahMustahik || 0} Orang</td>
                                    <td className="py-2 text-slate-500">
                                      {row.isBeras && val.beras !== undefined && `${val.beras || 0} kg`}
                                      {row.isQurban && val.kambingDomba !== undefined && `${val.kambingDomba || 0} ekor, ${val.sapiKerbau || 0} ekor`}
                                    </td>
                                    <td className="py-2 text-slate-500 italic max-w-[120px] truncate" title={val.keterangan || ''}>
                                      {val.keterangan || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center py-6 text-slate-400 font-semibold italic text-xs">
                      Laporan assessment belum diisi oleh relawan.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-55 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-sm font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="size-4" />
                  Hapus Penugasan
                </button>
                <div className="flex items-center gap-3">
                  {JSON.stringify(selectedTask.survey_data) !== JSON.stringify(editingSurveyData) && (
                    <button
                      onClick={handleSaveSurveyData}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                    >
                      <Check className="size-4" />
                      Simpan Perubahan
                    </button>
                  )}
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORM OBS MODAL */}
      <AnimatePresence>
        {isObsFormModalOpen && obsTaskForForm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsObsFormModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded font-black text-xs border border-emerald-200 uppercase">
                    FORM OBS
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Form Laporan Off-Balancing Sheet (OBS)</h3>
                    <p className="text-[11px] text-slate-500 font-semibold">{obsTaskForForm.namaPemohon} &bull; Agenda #{obsTaskForForm.agendaNo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsObsFormModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveObsForm} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                
                {/* 1. Informasi UPZ Masjid/Musholla */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 border-b border-slate-100 pb-2.5 uppercase tracking-wider flex items-center gap-2">
                    <Building className="size-4 text-emerald-600" /> Informasi UPZ Masjid / Musholla
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama UPZ</label>
                      <input
                        type="text"
                        value={obsForm.namaUpz || ''}
                        onChange={e => setObsForm(prev => ({ ...prev, namaUpz: e.target.value }))}
                        placeholder="Nama UPZ..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Ketua UPZ / Takmir</label>
                      <input
                        type="text"
                        value={obsForm.namaKetuaUpz || ''}
                        onChange={e => setObsForm(prev => ({ ...prev, namaKetuaUpz: e.target.value }))}
                        placeholder="Nama Ketua UPZ / Takmir..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">No. WA Ketua</label>
                      <input
                        type="text"
                        value={obsForm.noWa || ''}
                        onChange={e => setObsForm(prev => ({ ...prev, noWa: e.target.value }))}
                        placeholder="08..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kecamatan</label>
                      <input
                        type="text"
                        value={obsForm.kecamatan || ''}
                        onChange={e => setObsForm(prev => ({ ...prev, kecamatan: e.target.value }))}
                        placeholder="Kecamatan..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Alamat Masjid</label>
                      <textarea
                        rows={2}
                        value={obsForm.alamat || ''}
                        onChange={e => setObsForm(prev => ({ ...prev, alamat: e.target.value }))}
                        placeholder="Alamat masjid..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                      Saldo Awal Periode (Keseluruhan)
                    </label>
                    <div className="relative flex items-center max-w-md">
                      <span className="absolute left-3.5 text-xs font-extrabold text-slate-400">Rp</span>
                      <input
                        type="text"
                        placeholder="0"
                        value={formatRupiah(obsForm.saldoAwal)}
                        onChange={e => setObsForm(prev => ({ ...prev, saldoAwal: parseRupiah(e.target.value) }))}
                        className="w-full bg-emerald-50 border border-emerald-200 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold mt-1">Saldo kas awal periode (Jan) sebelum penerimaan berjalan.</p>
                  </div>
                </div>

                {/* 2. A. Laporan Penerimaan (Jan - Juni) */}
                <div className="space-y-4">
                  <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-wider">A. Laporan Penerimaan (Jan - Juni)</h4>
                    <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-lg">Penerimaan</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {penerimaanRowsAtas.map(row => {
                      const rowData = obsForm[row.key] || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' };
                      return (
                        <div key={row.key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="font-extrabold text-slate-800 text-xs">{row.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penerimaan (Rp)</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={formatRupiah(rowData.jumlahPenerimaan)}
                                  onChange={e => handlePenerimaanObsChange(row.key, 'jumlahPenerimaan', parseRupiah(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Donatur (Orang)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={rowData.jumlahDonatur || ''}
                                onChange={e => handlePenerimaanObsChange(row.key, 'jumlahDonatur', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={rowData.keterangan || ''}
                              onChange={e => handlePenerimaanObsChange(row.key, 'keterangan', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          {row.key === 'penerimaan_zakatFitrah' && (
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Beras (kg)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0"
                                value={rowData.beras || ''}
                                onChange={e => handlePenerimaanObsChange(row.key, 'beras', Number(e.target.value))}
                                className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Infak / Sedekah Barang & Jasa */}
                    {(() => {
                      const items: { jenisBarang: string; merekSpesifikasi: string; jumlah: string; keterangan: string }[] =
                        obsForm.penerimaan_infakBarangJasa?.items || [];
                      const setItems = (newItems: typeof items) =>
                        setObsForm(prev => ({ ...prev, penerimaan_infakBarangJasa: { items: newItems } }));
                      return (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:col-span-2">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-amber-500 rounded-full" />
                              <span className="font-extrabold text-slate-800 text-xs">4. Infak/ Sedekah Barang &amp; Jasa</span>
                            </div>
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">{items.length} item</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold italic">Penerimaan yang berupa barang/jasa untuk keperluan Masjid/Musholla.</p>
                          {items.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-bold">Belum ada item. Klik tombol di bawah untuk menambah.</p>
                          )}
                          {items.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Item #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase"
                                >✕ Hapus</button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Barang/Jasa</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Karpet, AC..."
                                    value={item.jenisBarang}
                                    onChange={e => { const n = [...items]; n[idx] = { ...n[idx], jenisBarang: e.target.value }; setItems(n); }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Merek / Spesifikasi</label>
                                  <input
                                    type="text"
                                    placeholder="Merek atau spesifikasi..."
                                    value={item.merekSpesifikasi}
                                    onChange={e => { const n = [...items]; n[idx] = { ...n[idx], merekSpesifikasi: e.target.value }; setItems(n); }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jumlah</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: 2 unit..."
                                    value={item.jumlah}
                                    onChange={e => { const n = [...items]; n[idx] = { ...n[idx], jumlah: e.target.value }; setItems(n); }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                                  <input
                                    type="text"
                                    placeholder="Keterangan..."
                                    value={item.keterangan}
                                    onChange={e => { const n = [...items]; n[idx] = { ...n[idx], keterangan: e.target.value }; setItems(n); }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setItems([...items, { jenisBarang: '', merekSpesifikasi: '', jumlah: '', keterangan: '' }])}
                            className="w-full py-2.5 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl text-xs font-black hover:bg-amber-50 transition flex items-center justify-center gap-1.5"
                          >+ Tambah Barang/Jasa</button>
                        </div>
                      );
                    })()}

                    {penerimaanRowsBawah.map(row => {
                      const rowData = obsForm[row.key] || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' };
                      return (
                        <div key={row.key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="font-extrabold text-slate-800 text-xs">{row.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penerimaan (Rp)</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={formatRupiah(rowData.jumlahPenerimaan)}
                                  onChange={e => handlePenerimaanObsChange(row.key, 'jumlahPenerimaan', parseRupiah(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Donatur (Orang)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={rowData.jumlahDonatur || ''}
                                onChange={e => handlePenerimaanObsChange(row.key, 'jumlahDonatur', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={rowData.keterangan || ''}
                              onChange={e => handlePenerimaanObsChange(row.key, 'keterangan', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          {row.key === 'penerimaan_qurban' && (
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Kambing/Domba (ekor)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={rowData.kambingDomba || ''}
                                  onChange={e => handlePenerimaanObsChange(row.key, 'kambingDomba', Number(e.target.value))}
                                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Sapi/Kerbau (ekor)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={rowData.sapiKerbau || ''}
                                  onChange={e => handlePenerimaanObsChange(row.key, 'sapiKerbau', Number(e.target.value))}
                                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                                />
                              </div>
                            </div>
                          )}
                          {row.key === 'penerimaan_fidyah' && (
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Beras (kg)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0"
                                value={rowData.beras || ''}
                                onChange={e => handlePenerimaanObsChange(row.key, 'beras', Number(e.target.value))}
                                className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Box Penerimaan */}
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-extrabold text-emerald-950">
                    <div>
                      <span className="text-[9px] text-emerald-700 font-black block uppercase tracking-widest">Saldo Awal</span>
                      <span>Rp {formatRupiah(obsForm.saldoAwal)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-700 font-black block uppercase tracking-widest">Total Penerimaan</span>
                      <span>Rp {formatRupiah(totalObsPenerimaan)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-700 font-black block uppercase tracking-widest">Penerimaan + Saldo Awal</span>
                      <span className="text-emerald-700 font-black">Rp {formatRupiah((Number(obsForm.saldoAwal) || 0) + totalObsPenerimaan)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-700 font-black block uppercase tracking-widest">Total Donatur</span>
                      <span>{totalObsDonatur} Orang</span>
                    </div>
                  </div>
                </div>

                {/* 3. B. Laporan Penyaluran (Jan - Juni) */}
                <div className="space-y-4">
                  <div className="bg-blue-600 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-wider">B. Laporan Penyaluran (Jan - Juni)</h4>
                    <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-lg">Penyaluran</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {penyaluranRows.map(row => {
                      const rowData = obsForm[row.key] || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' };
                      return (
                        <div key={row.key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="font-extrabold text-slate-800 text-xs">{row.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penyaluran (Rp)</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={formatRupiah(rowData.jumlahPenyaluran)}
                                  onChange={e => handlePenyaluranObsChange(row.key, 'jumlahPenyaluran', parseRupiah(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mustahik (Orang)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={rowData.jumlahMustahik || ''}
                                onChange={e => handlePenyaluranObsChange(row.key, 'jumlahMustahik', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={rowData.keterangan || ''}
                              onChange={e => handlePenyaluranObsChange(row.key, 'keterangan', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          {row.key === 'penyaluran_zakatFitrah' && (
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                              <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Beras (kg)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0"
                                value={rowData.beras || ''}
                                onChange={e => handlePenyaluranObsChange(row.key, 'beras', Number(e.target.value))}
                                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                              />
                            </div>
                          )}
                          {row.key === 'penyaluran_qurban' && (
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Kambing/Domba (ekor)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={rowData.kambingDomba || ''}
                                  onChange={e => handlePenyaluranObsChange(row.key, 'kambingDomba', Number(e.target.value))}
                                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Sapi/Kerbau (ekor)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={rowData.sapiKerbau || ''}
                                  onChange={e => handlePenyaluranObsChange(row.key, 'sapiKerbau', Number(e.target.value))}
                                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                                />
                              </div>
                            </div>
                          )}
                          {row.key === 'penyaluran_fidyah' && (
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                              <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Beras (kg)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0"
                                value={rowData.beras || ''}
                                onChange={e => handlePenyaluranObsChange(row.key, 'beras', Number(e.target.value))}
                                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Box Penyaluran */}
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 grid grid-cols-2 gap-3 text-xs font-extrabold text-blue-950">
                    <div>
                      <span className="text-[9px] text-blue-700 font-black block uppercase tracking-widest">Total Penyaluran</span>
                      <span>Rp {formatRupiah(totalObsPenyaluran)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-blue-700 font-black block uppercase tracking-widest">Total Mustahik</span>
                      <span>{totalObsMustahik} Orang</span>
                    </div>
                  </div>
                </div>

                {/* 4. C. Saldo Akhir Laporan */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-2">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">C. Saldo Akhir Laporan</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Saldo Akhir Kumulatif:</span>
                    <span className="text-xl font-black text-emerald-400">Rp {formatRupiah(obsSaldoAkhirKumulatif)}</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsObsFormModalOpen(false)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingObsForm}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingObsForm ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {savingObsForm ? 'Memproses...' : 'SIMPAN FORM OBS'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
        <button
          onClick={() => { fetchOffBalanceUPZs(); setIsGenerateModalOpen(true); }}
          className="size-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border border-emerald-500"
          title="Generate Tugas OBS"
        >
          <Plus className="size-6" />
        </button>
      </div>

    </div>
  );
}
