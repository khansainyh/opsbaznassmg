import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  Target, 
  TrendingUp, 
  Percent, 
  Calendar, 
  Plus, 
  Download, 
  Edit2, 
  Check, 
  Trash2, 
  X, 
  Info, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart4,
  Upload,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar, AsnafTarget } from '../data/pilarData';
import { useAuth } from '../context/AuthContext';

interface TargetRKATProps {
  proposals: ProposalMemo[];
  onUpdate?: (updated: ProposalMemo[]) => void;
}

export interface RKATActivity {
  id: string;
  pilarCode: string;   // e.g. "1100" -> Semarang Peduli
  pilarName: string;   // e.g. "Semarang Peduli"
  name: string;        // e.g. "Bantuan Biaya Hidup Sembako" (clean program name)
  keterangan: string;  // e.g. "Pemberian paket sembako dhuafa Semarang Utara"
  mustahik: number;    // Target Mustahik count
  frekuensi: number;   // Frequency
  unitCost: number;    // Cost per unit
  programCode: string; // Associated master program code
  asnafTargetId: string; // Associated asnaf target id
  asnaf?: string;      // Specific Asnaf criteria for the activity
  noUrut?: number;     // Sequence number
  coaCode?: string;    // Associated COA Code
  coaName?: string;    // Associated COA Name
  tipe?: string;       // Bantuan Konsumtif vs Produktif classification
}

// Searchable Multi-Select Dropdown for COA Mappings
interface SearchableCoaDropdownMultiProps {
  label: string;
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  availableCoas: any[];
  placeholder?: string;
}

const SearchableCoaDropdownMulti: React.FC<SearchableCoaDropdownMultiProps> = ({
  label,
  selectedCodes,
  onChange,
  availableCoas,
  placeholder = "Cari COA..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCoas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return availableCoas.filter(coa => 
      coa.coa_code.toLowerCase().includes(term) || 
      coa.nama_akun.toLowerCase().includes(term)
    );
  }, [availableCoas, searchTerm]);

  const toggleSelect = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      
      {/* Selector Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary outline-none transition-all cursor-pointer min-h-[42px] flex flex-wrap items-center gap-1.5 pr-8 relative"
      >
        {selectedCodes.length === 0 ? (
          <span className="text-slate-400 text-xs font-normal">Pilih akun COA...</span>
        ) : (
          selectedCodes.map(code => {
            return (
              <span 
                key={code} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(code);
                }}
              >
                {code}
                <X className="size-2.5 hover:text-red-500 cursor-pointer" />
              </span>
            );
          })
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronDown className="size-4 text-slate-400" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-52">
            {filteredCoas.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center">Tidak ada hasil pencarian.</p>
            ) : (
              filteredCoas.map((coa) => {
                const isSelected = selectedCodes.includes(coa.coa_code);
                return (
                  <div
                    key={coa.coa_code}
                    onClick={() => toggleSelect(coa.coa_code)}
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium select-none",
                      isSelected ? "bg-primary/5 text-primary" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded text-primary focus:ring-primary size-3.5 pointer-events-none"
                    />
                    <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{coa.coa_code}</span>
                    <span className="truncate">{coa.nama_akun}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Searchable Single-Select Dropdown for COA or General List
interface SearchableDropdownSingleProps {
  label: string;
  selectedValue: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

const SearchableDropdownSingle: React.FC<SearchableDropdownSingleProps> = ({
  label,
  selectedValue,
  onChange,
  options,
  placeholder = "Pilih item...",
  allowEmpty = true,
  emptyLabel = "-- Kosong / Tidak Dipilih --"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(term) || 
      (opt.value && opt.value.toLowerCase().includes(term)) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-700 block">{label}</label>
      
      {/* Selector Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary outline-none transition-all cursor-pointer flex items-center justify-between gap-1.5 pr-8 relative"
      >
        <span className={cn("truncate", !selectedValue && "text-slate-400 font-normal")}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.sublabel && (
                <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {selectedOption.sublabel}
                </span>
              )}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            emptyLabel
          )}
        </span>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronDown className="size-4 text-slate-400" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-52">
            {allowEmpty && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={cn(
                  "p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none",
                  !selectedValue ? "bg-primary/5 text-primary" : "hover:bg-slate-50 text-slate-500 italic"
                )}
              >
                {emptyLabel}
              </div>
            )}
            
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center">Tidak ada hasil pencarian.</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium select-none justify-between",
                      isSelected ? "bg-primary/5 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.sublabel && (
                        <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {opt.sublabel}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TargetRKAT({ proposals }: TargetRKATProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';
  
  const [activeTab, setActiveTab] = useState<'Pengumpulan' | 'Penyaluran' | 'Operasional'>('Penyaluran');

  // RKAT Pengumpulan States
  const [rkatPengumpulanList, setRkatPengumpulanList] = useState<any[]>([]);
  const [pengumpulanCategoryFilter, setPengumpulanCategoryFilter] = useState<'Semua' | 'Zakat' | 'Infak' | 'DSKL' | 'CSR'>('Semua');
  const [isAddPengumpulanOpen, setIsAddPengumpulanOpen] = useState(false);
  const [editingPengumpulanItem, setEditingPengumpulanItem] = useState<any | null>(null);
  const [formPengCoas, setFormPengCoas] = useState<string[]>([]);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  // Form states for RKAT Pengumpulan (Add/Edit)
  const [formPengNo, setFormPengNo] = useState('');
  const [formPengKategori, setFormPengKategori] = useState<'Zakat' | 'Infak' | 'DSKL' | 'CSR'>('Zakat');
  const [formPengNama, setFormPengNama] = useState('');
  const [formPengPerorangan, setFormPengPerorangan] = useState<number | ''>('');
  const [formPengLembaga, setFormPengLembaga] = useState<number | ''>('');
  const [formPengAnggaran, setFormPengAnggaran] = useState<number>(0);
  const [formPengMonths, setFormPengMonths] = useState<Record<string, number>>({
    jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
  });

  // RKAT Operasional States
  const [rkatOperasionalList, setRkatOperasionalList] = useState<any[]>([]);
  const [isAddOperasionalOpen, setIsAddOperasionalOpen] = useState(false);
  const [editingOperasionalItem, setEditingOperasionalItem] = useState<any | null>(null);
  const [formOperCoas, setFormOperCoas] = useState<string[]>([]);
  const [expandedOperId, setExpandedOperId] = useState<string | null>(null);

  // Form states for RKAT Operasional (Add/Edit)
  const [formOperNo, setFormOperNo] = useState('');
  const [formOperNama, setFormOperNama] = useState('');
  const [formOperKeterangan, setFormOperKeterangan] = useState('');
  const [formOperVolume, setFormOperVolume] = useState<number>(1);
  const [formOperFrekuensi, setFormOperFrekuensi] = useState<number>(1);
  const [formOperUnitCost, setFormOperUnitCost] = useState<number>(0);
  const [formOperAnggaran, setFormOperAnggaran] = useState<number>(0);
  const [formOperMonths, setFormOperMonths] = useState<Record<string, number>>({
    jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
  });

  // Recalculate anggaran whenever volume, frekuensi, or unit cost changes
  useEffect(() => {
    const total = Number(formOperVolume || 0) * Number(formOperFrekuensi || 0) * Number(formOperUnitCost || 0);
    setFormOperAnggaran(total);
  }, [formOperVolume, formOperFrekuensi, formOperUnitCost]);

  const distributePengAnggaran = () => {
    const base = Math.floor(formPengAnggaran / 12);
    const remainder = formPengAnggaran - (base * 12);
    setFormPengMonths({
      jan: base, feb: base, mar: base, apr: base,
      mei: base, jun: base, jul: base, agt: base,
      sep: base, okt: base, nov: base, des: base + remainder
    });
  };

  const distributeOperAnggaran = () => {
    const base = Math.floor(formOperAnggaran / 12);
    const remainder = formOperAnggaran - (base * 12);
    setFormOperMonths({
      jan: base, feb: base, mar: base, apr: base,
      mei: base, jun: base, jul: base, agt: base,
      sep: base, okt: base, nov: base, des: base + remainder
    });
  };

  const fetchRkatPengumpulan = useCallback(async () => {
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/rkat-pengumpulan');
      if (res.data.status === 'success') {
        setRkatPengumpulanList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch RKAT Pengumpulan:', err);
    }
  }, []);

  const fetchRkatOperasional = useCallback(async () => {
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/rkat-operasional');
      if (res.data.status === 'success') {
        setRkatOperasionalList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch RKAT Operasional:', err);
    }
  }, []);

  const saveNewPengumpulan = async () => {
    try {
      const body = {
        no: formPengNo,
        kategori: formPengKategori,
        nama_program: formPengNama,
        coa_codes: formPengCoas.join(','),
        target_perorangan: formPengPerorangan || null,
        target_lembaga: formPengLembaga || null,
        nilai_anggaran: formPengAnggaran,
        target_jan: formPengMonths.jan,
        target_feb: formPengMonths.feb,
        target_mar: formPengMonths.mar,
        target_apr: formPengMonths.apr,
        target_mei: formPengMonths.mei,
        target_jun: formPengMonths.jun,
        target_jul: formPengMonths.jul,
        target_agt: formPengMonths.agt,
        target_sep: formPengMonths.sep,
        target_okt: formPengMonths.okt,
        target_nov: formPengMonths.nov,
        target_des: formPengMonths.des
      };
      await axios.post('http://127.0.0.1:4000/api/rkat-pengumpulan', body);
      setIsAddPengumpulanOpen(false);
      fetchRkatPengumpulan();
      alert('Berhasil menyimpan target RKAT Pengumpulan baru.');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan data.');
    }
  };

  const saveEditPengumpulan = async () => {
    if (!editingPengumpulanItem) return;
    try {
      const body = {
        no: formPengNo,
        kategori: formPengKategori,
        nama_program: formPengNama,
        coa_codes: formPengCoas.join(','),
        target_perorangan: formPengPerorangan || null,
        target_lembaga: formPengLembaga || null,
        nilai_anggaran: formPengAnggaran,
        target_jan: formPengMonths.jan,
        target_feb: formPengMonths.feb,
        target_mar: formPengMonths.mar,
        target_apr: formPengMonths.apr,
        target_mei: formPengMonths.mei,
        target_jun: formPengMonths.jun,
        target_jul: formPengMonths.jul,
        target_agt: formPengMonths.agt,
        target_sep: formPengMonths.sep,
        target_okt: formPengMonths.okt,
        target_nov: formPengMonths.nov,
        target_des: formPengMonths.des
      };
      await axios.put(`http://127.0.0.1:4000/api/rkat-pengumpulan/${editingPengumpulanItem.id}`, body);
      setEditingPengumpulanItem(null);
      fetchRkatPengumpulan();
      alert('Berhasil memperbarui target RKAT Pengumpulan.');
    } catch (error) {
      console.error(error);
      alert('Gagal memperbarui data.');
    }
  };

  const deletePengumpulan = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus program pengumpulan ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:4000/api/rkat-pengumpulan/${id}`);
      fetchRkatPengumpulan();
      alert('Program berhasil dihapus.');
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus program.');
    }
  };

  const saveNewOperasional = async () => {
    try {
      const body = {
        no: formOperNo,
        nama: formOperNama,
        keterangan: formOperKeterangan || null,
        coa_codes: formOperCoas.join(','),
        volume: Number(formOperVolume) || 1,
        frekuensi: Number(formOperFrekuensi) || 1,
        unit_cost: Number(formOperUnitCost) || 0,
        nilai_anggaran: formOperAnggaran,
        target_jan: formOperMonths.jan,
        target_feb: formOperMonths.feb,
        target_mar: formOperMonths.mar,
        target_apr: formOperMonths.apr,
        target_mei: formOperMonths.mei,
        target_jun: formOperMonths.jun,
        target_jul: formOperMonths.jul,
        target_agt: formOperMonths.agt,
        target_sep: formOperMonths.sep,
        target_okt: formOperMonths.okt,
        target_nov: formOperMonths.nov,
        target_des: formOperMonths.des
      };
      await axios.post('http://127.0.0.1:4000/api/rkat-operasional', body);
      setIsAddOperasionalOpen(false);
      fetchRkatOperasional();
      alert('Berhasil menyimpan target RKAT Operasional baru.');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan data.');
    }
  };

  const saveEditOperasional = async () => {
    if (!editingOperasionalItem) return;
    try {
      const body = {
        no: formOperNo,
        nama: formOperNama,
        keterangan: formOperKeterangan || null,
        coa_codes: formOperCoas.join(','),
        volume: Number(formOperVolume) || 1,
        frekuensi: Number(formOperFrekuensi) || 1,
        unit_cost: Number(formOperUnitCost) || 0,
        nilai_anggaran: formOperAnggaran,
        target_jan: formOperMonths.jan,
        target_feb: formOperMonths.feb,
        target_mar: formOperMonths.mar,
        target_apr: formOperMonths.apr,
        target_mei: formOperMonths.mei,
        target_jun: formOperMonths.jun,
        target_jul: formOperMonths.jul,
        target_agt: formOperMonths.agt,
        target_sep: formOperMonths.sep,
        target_okt: formOperMonths.okt,
        target_nov: formOperMonths.nov,
        target_des: formOperMonths.des
      };
      await axios.put(`http://127.0.0.1:4000/api/rkat-operasional/${editingOperasionalItem.id}`, body);
      setEditingOperasionalItem(null);
      fetchRkatOperasional();
      alert('Berhasil memperbarui target RKAT Operasional.');
    } catch (error) {
      console.error(error);
      alert('Gagal memperbarui data.');
    }
  };

  const deleteOperasional = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus program operasional ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:4000/api/rkat-operasional/${id}`);
      fetchRkatOperasional();
      alert('Program berhasil dihapus.');
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus program.');
    }
  };

  useEffect(() => {
    fetchRkatPengumpulan();
    fetchRkatOperasional();
  }, [fetchRkatPengumpulan, fetchRkatOperasional]);

  // 1. Dynamic Pilar Data synced with backend API
  const [data, setData] = useState<Pilar[]>([]);
  const [coas, setCoas] = useState<any[]>([]);

  const fetchPilars = useCallback(() => {
    axios.get('http://127.0.0.1:4000/api/pilars')
      .then(res => {
        const pilars = res.data.map((pilar: any) => ({
          ...pilar,
          programs: (pilar.programs || []).map((prog: any) => ({
            ...prog,
            asnafTargets: typeof prog.rkat_details === 'string' 
              ? JSON.parse(prog.rkat_details || '[]') 
              : (prog.rkat_details || [])
          }))
        }));
        setData(pilars);
      })
      .catch(err => console.error('Failed to fetch pilars in RKAT', err));
  }, []);

  const fetchCoas = useCallback(() => {
    axios.get('http://127.0.0.1:4000/api/finance/coa')
      .then(res => setCoas(res.data))
      .catch(err => console.error('Failed to fetch COAs in RKAT', err));
  }, []);

  useEffect(() => {
    fetchPilars();
    fetchCoas();
  }, [fetchPilars, fetchCoas]);

  // Flatten programs with their respective Asnaf targets into dynamic individual RKAT list activities
  const activities = useMemo<RKATActivity[]>(() => {
    const list: RKATActivity[] = [];
    (data || []).forEach((pilar) => {
      (pilar.programs || []).forEach((prog) => {
        const targets = prog.asnafTargets || [];
        if (targets.length > 0) {
          targets.forEach((target, tIdx) => {
            const fallbackId = target.id || `act-auto-${prog.code}-${target.asnaf || 'General'}-${tIdx}`;
            const matchingCoa = coas.find(c => c.coa_code === target.coaCode);
            list.push({
              id: fallbackId,
              pilarCode: pilar.code,
              pilarName: pilar.name,
              name: target.name || prog.name, // Display custom activity name if present, fallback to clean Program name
              keterangan: target.keterangan || `Penyaluran program ${prog.name} khusus kriteria asnaf ${target.asnaf}`,
              mustahik: target.mustahik || 0,
              frekuensi: Number(target.frekuensi) || 1,
              unitCost: target.nominal || 0,
              programCode: prog.code,
              asnafTargetId: fallbackId,
              asnaf: target.asnaf,
              coaCode: target.coaCode,
              coaName: matchingCoa ? matchingCoa.nama_akun : undefined,
              tipe: prog.tipe
            });
          });
        }
      });
    });
    return list;
  }, [data, coas]);



  // UI Control States
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('Semua');
  
  // Modals / Add/Edit States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  
  // Form fields for adding program activities per Asnaf
  const [formPilar, setFormPilar] = useState<string>('');
  
  useEffect(() => {
    if (data.length > 0 && !formPilar) {
      setFormPilar(data[0].code);
    }
  }, [data, formPilar]);

  const [formProgramCode, setFormProgramCode] = useState<string>('');
  const [formNamaKegiatan, setFormNamaKegiatan] = useState<string>('');
  const [formAsnaf, setFormAsnaf] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formMustahik, setFormMustahik] = useState<number>(10);
  const [formCoaCode, setFormCoaCode] = useState<string>('');
  const [formFrekuensi, setFormFrekuensi] = useState<number>(1);
  const [formUnitCost, setFormUnitCost] = useState<number>(250000);

  // Edit modal state variables
  const [editingActivity, setEditingActivity] = useState<RKATActivity | null>(null);

  // Filter programs based on selected pilar in form
  const formProgramsAvailable = useMemo(() => {
    const foundPilar = data.find(p => p.code === formPilar);
    return foundPilar ? foundPilar.programs : [];
  }, [data, formPilar]);

  // Set default program code when pilar changes in form
  useEffect(() => {
    if (formProgramsAvailable.length > 0) {
      setFormProgramCode(formProgramsAvailable[0].code);
    } else {
      setFormProgramCode('');
    }
  }, [formProgramsAvailable]);

  // Realized proposals are those that have been paid/disbursed or are currently queued layout
  const realizedProposals = useMemo(() => {
    return proposals.filter(p => 
      p.status === 'Selesai & Arsip' || 
      p.status === 'Realisasi Bantuan' || 
      p.status === 'MENUNGGU_SIMBA' || 
      p.status === 'MENUNGGU_REALISASI_DISTRIBUSI' ||
      p.status === 'Pencairan Dana'
    );
  }, [proposals]);

  const getParentProgramCode = (code?: string): string => {
    if (!code) return "";
    return code.split('.')[0].trim();
  };

  // Robust automatic helper matching a proposal dynamically to an RKAT activity based on Pilar + Program + Asnaf
  const getMatchedActivityForProposal = (p: ProposalMemo, currentActivities: typeof activities) => {
    // 1. Prioritize matching by explicit rkatActivityId (which maps from backend's rkat_activity_id)
    if (p.rkatActivityId) {
      const matchById = currentActivities.find(act => act.id === p.rkatActivityId || act.asnafTargetId === p.rkatActivityId);
      if (matchById) return matchById;
    }

    // 2. Match by exact program code and asnaf
    if (p.programCode) {
      const matchByCode = currentActivities.find(act => {
        const matchesCode = p.programCode === act.programCode;
        if (!matchesCode) return false;

        if (act.asnaf) {
          const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
          return act.asnaf.toLowerCase() === pAsnaf;
        }
        return true;
      });
      if (matchByCode) return matchByCode;
      
      // Fallback to parent program code match if exact code is not found
      const parentP = getParentProgramCode(p.programCode);
      const matchByParentCode = currentActivities.find(act => {
        const parentAct = getParentProgramCode(act.programCode);
        const matchesCode = parentP === parentAct;
        if (!matchesCode) return false;

        if (act.asnaf) {
          const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
          return act.asnaf.toLowerCase() === pAsnaf;
        }
        return true;
      });
      if (matchByParentCode) return matchByParentCode;
    }

    // 3. Fallback to name-based matching
    return currentActivities.find(act => {
      const matchesPilar = p.program === act.pilarName;
      if (!matchesPilar) return false;
      
      const matchesProgram = p.jenisPermohonan === act.name;
      if (!matchesProgram) return false;
      
      if (act.asnaf) {
        const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
        return act.asnaf.toLowerCase() === pAsnaf;
      }
      return true;
    }) || null;
  };

  // Queries all proposals assigned/auto-assigned to a specific activity
  const getLinkedMemosForActivity = (act: any, proposalsList: ProposalMemo[]) => {
    return proposalsList.filter(p => {
      // 1. Prioritize matching by explicit rkatActivityId
      if (p.rkatActivityId) {
        return act.id === p.rkatActivityId || act.asnafTargetId === p.rkatActivityId;
      }

      // 2. Match by exact program code and asnaf
      if (p.programCode) {
        const matchesCode = p.programCode === act.programCode;
        if (matchesCode) {
          if (act.asnaf) {
            const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
            return act.asnaf.toLowerCase() === pAsnaf;
          }
          return true;
        }
        
        // Fallback to parent program code match
        const parentP = getParentProgramCode(p.programCode);
        const parentAct = getParentProgramCode(act.programCode);
        const matchesParentCode = parentP === parentAct;
        if (matchesParentCode) {
          if (act.asnaf) {
            const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
            return act.asnaf.toLowerCase() === pAsnaf;
          }
          return true;
        }
        return false;
      }

      // 3. Fallback to name-based matching
      const matchesPilar = p.program === act.pilarName;
      if (!matchesPilar) return false;
      
      const matchesProgram = p.jenisPermohonan === act.name;
      if (!matchesProgram) return false;
      
      if (act.asnaf) {
        const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
        return act.asnaf.toLowerCase() === pAsnaf;
      }
      return true;
    });
  };

  // Helper to categorize Semarang Sehat/Cerdas into base Pilar names
  const getPilarCategory = useCallback((pilarName: string): string => {
    let cat = pilarName;
    if (pilarName.includes('Semarang Sehat')) cat = 'Semarang Sehat';
    if (pilarName.includes('Semarang Cerdas')) cat = 'Semarang Cerdas';
    return cat;
  }, []);

  // Aggregate static total budget & dynamic realized budgets
  const pilarBudgets = useMemo(() => {
    const sums: { [pilarName: string]: { target: number, realisasi: number } } = {
      'Semarang Peduli': { target: 0, realisasi: 0 },
      'Semarang Sehat': { target: 0, realisasi: 0 },
      'Semarang Cerdas': { target: 0, realisasi: 0 },
      'Semarang Taqwa': { target: 0, realisasi: 0 },
      'Semarang Makmur': { target: 0, realisasi: 0 }
    };

    // Sum Target Budgets from Flattened Activities State
    activities.forEach(act => {
      const budget = act.mustahik * act.frekuensi * act.unitCost;
      const cat = getPilarCategory(act.pilarName);
      if (sums[cat]) {
        sums[cat].target += budget;
      }
    });

    // Sum Realized values from Proposals dynamically
    realizedProposals.forEach(p => {
      const amt = p.nominal || 0;
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        const cat = getPilarCategory(matchedAct.pilarName);
        if (sums[cat]) {
          sums[cat].realisasi += amt;
        }
      } else {
        const prog = p.program || 'Semarang Peduli';
        const cat = getPilarCategory(prog);
        if (sums[cat]) {
          sums[cat].realisasi += amt;
        }
      }
    });

    return sums;
  }, [activities, realizedProposals, getPilarCategory]);

  // Monthly values breakdown (Jan to Dec, 1 to 12)
  const monthlyRealizationsByPilar = useMemo(() => {
    const matrix: { [pilarName: string]: { [month: number]: number } } = {
      'Semarang Peduli': {},
      'Semarang Sehat': {},
      'Semarang Cerdas': {},
      'Semarang Taqwa': {},
      'Semarang Makmur': {}
    };

    // Initialize months 1-12 with 0
    Object.keys(matrix).forEach(key => {
      for (let m = 1; m <= 12; m++) {
        matrix[key][m] = 0;
      }
    });

    // Populate actual proposal distributions Dynamically
    realizedProposals.forEach(p => {
      const amt = p.nominal || 0;
      let pName = p.program || 'Semarang Peduli';
      
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        pName = matchedAct.pilarName;
      }

      const cat = getPilarCategory(pName);

      const dateStr = p.tglCairBank || p.tanggalMasuk;
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            if (matrix[cat]) {
              matrix[cat][monthNum] += amt;
            }
          }
        }
      } else {
        // default distribution
        if (matrix[cat]) {
          matrix[cat][3] += amt;
        }
      }
    });

    return matrix;
  }, [realizedProposals, activities, getPilarCategory]);

  const listPilarKeys = useMemo(() => {
    return data.map(p => p.name);
  }, [data]);

  // Filtered target program activities for Table 2
  const filteredActivities = useMemo(() => {
    if (selectedPilarFilter === 'Semua') return activities;
    return activities.filter(act => act.pilarName === selectedPilarFilter);
  }, [activities, selectedPilarFilter]);

  const konsumtifActivities = useMemo(() => {
    return filteredActivities.filter(act => act.tipe !== 'Produktif');
  }, [filteredActivities]);

  const produktifActivities = useMemo(() => {
    return filteredActivities.filter(act => act.tipe === 'Produktif');
  }, [filteredActivities]);

  // Overall statistics
  const grandTotalTarget = useMemo(() => {
    return activities.reduce((sum, act) => sum + (act.mustahik * act.frekuensi * act.unitCost), 0);
  }, [activities]);

  const grandTotalRealisasi = useMemo(() => {
    return realizedProposals.reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [realizedProposals]);



  const overallPercentage = useMemo(() => {
    if (grandTotalTarget === 0) return 0;
    return (grandTotalRealisasi / grandTotalTarget) * 100;
  }, [grandTotalTarget, grandTotalRealisasi]);

  // Handler: Add Activity (Appends Asnaf target via backend API)
  const saveNewActivity = () => {
    if (!formProgramCode) {
      alert('Pilih Program SIMBA yang ingin dihubungkan ke asnaf target ini.');
      return;
    }

    const newTarget: AsnafTarget = {
      id: `asnaf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: formNamaKegiatan.trim() || undefined,
      asnaf: (formAsnaf || undefined) as any,
      frekuensi: formFrekuensi,
      nominal: formUnitCost,
      mustahik: formMustahik,
      keterangan: formKeterangan || (formAsnaf ? `Penyaluran Asnaf ${formAsnaf}` : `Penyaluran Target Kegiatan`),
      coaCode: formCoaCode || undefined
    };

    let currentTargets: AsnafTarget[] = [];
    data.forEach(p => {
      p.programs.forEach(prog => {
        if (prog.code === formProgramCode) {
          currentTargets = prog.asnafTargets || [];
        }
      });
    });

    const updatedTargets = [...currentTargets, newTarget];
    const newBudget = updatedTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);

    axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
      rkat_details: updatedTargets,
      budget_rkat: newBudget
    }).then(() => {
      fetchPilars();
      // Reset
      setFormNamaKegiatan('');
      setFormKeterangan('');
      setFormMustahik(10);
      setFormFrekuensi(1);
      setFormUnitCost(250000);
      setFormAsnaf('');
      setFormCoaCode('');
      setIsAddModalOpen(false);
    }).catch(err => {
      console.error('Gagal menambah activity', err);
      alert('Gagal menyimpan target ke database');
    });
  };

  // Handler: Delete Activity (Removes target via backend API)
  const deleteActivity = (id: string) => {
    if (window.confirm('Yakin ingin menghapus draf rincian program kerja RKAT ini?')) {
      let targetProgramCode = '';
      let updatedTargets: AsnafTarget[] = [];
      let isGeneral = false;

      data.forEach(p => {
        p.programs.forEach(prog => {
          if (id === `prog-general-${prog.code}`) {
            isGeneral = true;
            targetProgramCode = prog.code;
          } else {
            const targets = prog.asnafTargets || [];
            const matchIndex = targets.findIndex((t, tIdx) => {
              const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
              return fallbackId === id;
            });
            if (matchIndex !== -1) {
              targetProgramCode = prog.code;
              updatedTargets = targets.filter((_, tIdx) => {
                const fallbackId = targets[tIdx].id || `act-auto-${prog.code}-${targets[tIdx].asnaf || 'General'}-${tIdx}`;
                return fallbackId !== id;
              });
            }
          }
        });
      });

      if (isGeneral) {
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          budget_rkat: 0
        }).then(() => fetchPilars()).catch(console.error);
      } else if (targetProgramCode) {
        const newBudget = updatedTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          rkat_details: updatedTargets,
          budget_rkat: newBudget
        }).then(() => fetchPilars()).catch(console.error);
      }
    }
  };

  // Edit Modal helper functions
  const startEditModal = (act: RKATActivity) => {
    setEditingActivity(act);
    setFormPilar(act.pilarCode);
    setFormProgramCode(act.programCode);
    setFormNamaKegiatan(act.name);
    setFormAsnaf(act.asnaf || '');
    setFormKeterangan(act.keterangan);
    setFormMustahik(act.mustahik);
    setFormFrekuensi(act.frekuensi);
    setFormUnitCost(act.unitCost);
    setFormCoaCode(act.coaCode || '');
  };

  const saveEditActivity = async () => {
    if (!editingActivity) return;
    if (!formProgramCode) {
      alert('Pilih Program SIMBA yang ingin dihubungkan.');
      return;
    }

    const updatedTarget: AsnafTarget = {
      id: editingActivity.asnafTargetId || editingActivity.id,
      name: formNamaKegiatan.trim() || undefined,
      asnaf: (formAsnaf || undefined) as any,
      frekuensi: formFrekuensi,
      nominal: formUnitCost,
      mustahik: formMustahik,
      keterangan: formKeterangan || (formAsnaf ? `Penyaluran Asnaf ${formAsnaf}` : `Penyaluran Target Kegiatan`),
      coaCode: formCoaCode || undefined
    };

    // If Program changed
    if (editingActivity.programCode !== formProgramCode) {
      try {
        // 1. Remove from old program
        let oldTargets: AsnafTarget[] = [];
        data.forEach(p => {
          p.programs.forEach(prog => {
            if (prog.code === editingActivity.programCode) {
              const targets = prog.asnafTargets || [];
              oldTargets = targets.filter((t, tIdx) => {
                const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
                return fallbackId !== editingActivity.id && t.id !== editingActivity.id;
              });
            }
          });
        });
        const oldBudget = oldTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        await axios.put(`http://127.0.0.1:4000/api/programs/${editingActivity.programCode}`, {
          rkat_details: oldTargets,
          budget_rkat: oldBudget
        });

        // 2. Add to new program
        let newTargets: AsnafTarget[] = [];
        data.forEach(p => {
          p.programs.forEach(prog => {
            if (prog.code === formProgramCode) {
              newTargets = prog.asnafTargets || [];
            }
          });
        });
        const updatedNewTargets = [...newTargets, updatedTarget];
        const newBudget = updatedNewTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        await axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
          rkat_details: updatedNewTargets,
          budget_rkat: newBudget
        });

        fetchPilars();
        setEditingActivity(null);
      } catch (err) {
        console.error('Gagal memindahkan kegiatan:', err);
        alert('Gagal memindahkan kegiatan program.');
      }
    } else {
      // Program did not change, just update the target inside the program
      let currentTargets: AsnafTarget[] = [];
      data.forEach(p => {
        p.programs.forEach(prog => {
          if (prog.code === formProgramCode) {
            const targets = prog.asnafTargets || [];
            // Match and replace
            currentTargets = targets.map((t, tIdx) => {
              const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
              if (fallbackId === editingActivity.id || t.id === editingActivity.id) {
                return updatedTarget;
              }
              return t;
            });
          }
        });
      });

      const newBudget = currentTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);

      axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
        rkat_details: currentTargets,
        budget_rkat: newBudget
      }).then(() => {
        fetchPilars();
        setEditingActivity(null);
      }).catch(err => {
        console.error('Gagal memperbarui kegiatan', err);
        alert('Gagal memperbarui kegiatan ke database');
      });
    }
  };

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getMonthName = (idx: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[idx - 1];
  };

  const renderPilarRow = (code: string, displayName: string, budgetKey: string, indexNumber: number) => {
    const targetAnggaran = pilarBudgets[budgetKey]?.target || 0;
    const realisAsi = pilarBudgets[budgetKey]?.realisasi || 0;
    const percent = targetAnggaran > 0 ? (realisAsi / targetAnggaran) * 100 : 0;
    
    return (
      <tr key={code} className="hover:bg-slate-50/50 transition-colors">
        <td className="px-4 py-3.5 text-xs text-slate-500 font-bold text-center">
          {indexNumber}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary font-mono">{code}</span>
            <span className="text-xs font-semibold text-slate-900 mt-0.5">{displayName}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
          {formatCurrency(targetAnggaran)}
        </td>
        <td className="px-4 py-3.5 text-right font-mono text-xs font-black text-emerald-700">
          {formatCurrency(realisAsi)}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-[11px] font-bold text-slate-700">
              {percent.toFixed(1)}%
            </span>
            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  percent >= 80 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-400" : "bg-primary"
                )}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        </td>

        {/* Display Jan - Dec Columns */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
          let cellVal = monthlyRealizationsByPilar[budgetKey]?.[month] || 0;
          return (
            <td 
              key={month} 
              className={cn(
                "px-3 py-3.5 text-right font-mono text-xs border-l border-slate-100/40",
                cellVal > 0 ? "text-slate-900 font-bold" : "text-slate-350"
              )}
            >
              {cellVal > 0 ? formatCurrency(cellVal) : 'Rp 0'}
            </td>
          );
        })}
      </tr>
    );
  };
  const renderActivityRow = (act: RKATActivity, index: number) => {
    const itemBudgetTotal = act.mustahik * act.frekuensi * act.unitCost;
    const linkedMemos = getLinkedMemosForActivity(act, proposals);
    const actRealisasi = linkedMemos.reduce((sum, p) => sum + (p.nominal || 0), 0);
    const sisaDana = itemBudgetTotal - actRealisasi;
    const realPercent = itemBudgetTotal > 0 ? (actRealisasi / itemBudgetTotal) * 100 : 0;

    return (
      <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
        <td className="px-4 py-4 text-xs font-bold text-slate-400 text-center">
          {index + 1}
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-primary uppercase tracking-wide">
              {act.pilarName} ({act.pilarCode})
            </span>
            <span className="text-xs font-black text-slate-900 leading-tight mt-0.5">
              {act.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                ID/A: {act.id}
              </span>
              <span className={cn(
                "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                act.tipe === 'Produktif'
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/20"
                  : "bg-amber-50 text-amber-600 border border-amber-200/20"
              )}>
                {act.tipe || 'Konsumtif'}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          {act.asnaf ? (
            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200/50 font-black text-[10px] uppercase">
              {act.asnaf}
            </span>
          ) : (
            <span className="text-slate-400 italic font-medium text-[11px]">-</span>
          )}
        </td>
        <td className="px-4 py-4">
          {act.coaCode ? (
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-max">
                {act.coaCode}
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold mt-0.5 truncate max-w-[130px]" title={act.coaName}>
                {act.coaName}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 italic font-medium text-[11px]">Tidak dihubungkan</span>
          )}
        </td>
        <td className="px-4 py-4 text-xs text-slate-500 max-w-[200px] font-medium leading-relaxed">
          {act.keterangan || '-'}
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900">{formatCurrency(itemBudgetTotal)}</span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              {(act.mustahik || 0).toLocaleString('id-ID')} jiwa × {act.frekuensi}x / th
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              @ {formatCurrency(act.unitCost)}
            </span>
          </div>
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-xs font-black",
              actRealisasi > 0 ? "text-emerald-700 font-mono" : "text-slate-450"
            )}>
              {formatCurrency(actRealisasi)}
            </span>
            
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-slate-500">Sisa:</span>
              <span className={cn(
                "text-[10px] font-extrabold font-mono",
                sisaDana < 0 ? "text-rose-600 bg-rose-50 px-1 rounded" : "text-slate-700"
              )}>
                {formatCurrency(sisaDana)}
              </span>
            </div>

            {/* Progress Bar of actual match */}
            <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 flex">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  realPercent > 100 ? "bg-rose-500" : realPercent >= 80 ? "bg-emerald-500" : realPercent >= 40 ? "bg-amber-400" : "bg-primary"
                )}
                style={{ width: `${Math.min(realPercent, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase mt-0.5">
              Penyerapan: {realPercent.toFixed(1)}%
            </span>
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {isSuperAdmin && (
              <>
                <button 
                  onClick={() => startEditModal(act)}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                  title="Ubah Anggaran"
                >
                  <Edit2 className="size-3.5" />
                </button>
                <button 
                  onClick={() => deleteActivity(act.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  title="Hapus Kegiatan"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const filteredPengumpulanList = useMemo(() => {
    const filtered = rkatPengumpulanList.filter(item => {
      if (pengumpulanCategoryFilter === 'Semua') return true;
      return item.kategori.toLowerCase() === pengumpulanCategoryFilter.toLowerCase();
    });
    return [...filtered].sort((a, b) => {
      return String(a.no || '').localeCompare(String(b.no || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rkatPengumpulanList, pengumpulanCategoryFilter]);

  const statsPengumpulan = useMemo(() => {
    let anggaran = 0;
    let perorangan = 0;
    let lembaga = 0;
    let realisasi = 0;
    filteredPengumpulanList.forEach(item => {
      anggaran += Number(item.nilai_anggaran) || 0;
      perorangan += Number(item.target_perorangan) || 0;
      lembaga += Number(item.target_lembaga) || 0;
      realisasi += Number(item.realisasi_total) || 0;
    });
    return { anggaran, perorangan, lembaga, realisasi };
  }, [filteredPengumpulanList]);

  const statsOperasional = useMemo(() => {
    let anggaran = 0;
    let realisasi = 0;
    rkatOperasionalList.forEach(item => {
      anggaran += Number(item.nilai_anggaran) || 0;
      realisasi += Number(item.realisasi_total) || 0;
    });
    return { anggaran, realisasi };
  }, [rkatOperasionalList]);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 h-full overflow-y-auto">
      
      {/* Header and overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Target RKAT</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="size-8 text-primary" />
            Target RKAT
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-2">
            Monitor target dan realisasi anggaran berdasarkan kategori pengelolaan.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {(['Pengumpulan', 'Penyaluran', 'Operasional'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            RKAT {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Operasional' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Cards for Operasional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-emerald-100 text-emerald-700 rounded-xl">
                <TrendingUp className="size-8" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Anggaran Operasional</p>
                <p className="text-2xl font-black text-slate-900 leading-tight mt-1">{formatCurrency(statsOperasional.anggaran)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-primary/10 text-primary rounded-xl">
                <Percent className="size-8" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capai Realisasi Operasional</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(statsOperasional.realisasi)}</span>
                  <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {(statsOperasional.anggaran > 0 ? (statsOperasional.realisasi / statsOperasional.anggaran) * 100 : 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table for Operasional */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart4 className="size-4 text-primary" />
                  Rincian RKAT Operasional
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
                  Target dan realisasi operasional terhitung real-time.
                </p>
              </div>

              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 border border-slate-200"
                  >
                    <Upload className="size-3.5 stroke-[3]" />
                    Migrasi
                  </button>
                  <button
                    onClick={() => {
                      setEditingOperasionalItem(null);
                      setFormOperNo(`O-${Date.now().toString().slice(-4)}`);
                      setFormOperNama('');
                      setFormOperKeterangan('');
                      setFormOperCoas([]);
                      setFormOperVolume(1);
                      setFormOperFrekuensi(1);
                      setFormOperUnitCost(0);
                      setFormOperAnggaran(0);
                      setFormOperMonths({
                        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
                      });
                      setIsAddOperasionalOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-md shadow-primary/15 transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="size-3.5 stroke-[3]" />
                    Tambah Program
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Program / Kegiatan</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-24 text-center">Volume</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-24 text-center">Frekuensi</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-32 text-right">Unit Cost</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Nilai Anggaran</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Realisasi</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">% Pencapaian</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rkatOperasionalList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                        Belum ada program operasional yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    rkatOperasionalList.map((item) => {
                      const itemCoas = item.coa_codes ? item.coa_codes.split(',').map((c: any) => c.trim()).filter(Boolean) : [];
                      const targetVal = Number(item.nilai_anggaran || 0);
                      const realisasiVal = Number(item.realisasi_total || 0);
                      const pct = targetVal > 0 ? (realisasiVal / targetVal) * 100 : 0;
                      const isExpanded = expandedOperId === item.id;
                      
                      return (
                        <>
                          <tr 
                            key={item.id} 
                            onClick={() => setExpandedOperId(isExpanded ? null : item.id)}
                            className={cn(
                              "hover:bg-slate-50/80 transition-colors cursor-pointer select-none",
                              isExpanded && "bg-slate-50/40"
                            )}
                          >
                            <td className="px-4 py-4 text-center text-slate-400 font-bold font-mono">{item.no}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 hover:text-primary transition-colors">
                                    {item.nama}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="size-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="size-3.5 text-slate-400" />
                                  )}
                                </div>
                                {item.keterangan && (
                                  <span className="text-[11px] text-slate-400 font-medium mt-0.5">{item.keterangan}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-slate-600 font-mono">{item.volume}</td>
                            <td className="px-4 py-4 text-center font-bold text-slate-600 font-mono">{item.frekuensi}</td>
                            <td className="px-4 py-4 text-right font-bold text-slate-600 font-mono">{formatCurrency(Number(item.unit_cost || 0))}</td>

                            <td className="px-4 py-4 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(targetVal)}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(realisasiVal)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase font-sans",
                                  pct >= 100 ? "bg-emerald-100 text-emerald-800" :
                                  pct >= 50 ? "bg-blue-100 text-blue-800" :
                                  pct > 0 ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-400"
                                )}>
                                  {pct.toFixed(1)}%
                                </span>
                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      pct >= 100 ? "bg-emerald-500" :
                                      pct >= 50 ? "bg-blue-500" :
                                      "bg-amber-500"
                                    )} 
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center font-sans" onClick={(e) => e.stopPropagation()}>
                              {isSuperAdmin ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingOperasionalItem(item);
                                      setFormOperNo(item.no);
                                      setFormOperNama(item.nama);
                                      setFormOperKeterangan(item.keterangan || '');
                                      setFormOperCoas(item.coa_codes ? item.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : []);
                                      setFormOperVolume(Number(item.volume));
                                      setFormOperFrekuensi(Number(item.frekuensi));
                                      setFormOperUnitCost(Number(item.unit_cost));
                                      setFormOperAnggaran(Number(item.nilai_anggaran));
                                      setFormOperMonths({
                                        jan: Number(item.target_jan || 0),
                                        feb: Number(item.target_feb || 0),
                                        mar: Number(item.target_mar || 0),
                                        apr: Number(item.target_apr || 0),
                                        mei: Number(item.target_mei || 0),
                                        jun: Number(item.target_jun || 0),
                                        jul: Number(item.target_jul || 0),
                                        agt: Number(item.target_agt || 0),
                                        sep: Number(item.target_sep || 0),
                                        okt: Number(item.target_okt || 0),
                                        nov: Number(item.target_nov || 0),
                                        des: Number(item.target_des || 0)
                                      });
                                      setIsAddOperasionalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteOperasional(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No Access</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row for monthly breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={9} className="p-4 border-t border-b border-slate-200/50">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <Calendar className="size-3.5 text-primary" />
                                      Detail Target vs Realisasi Bulanan: {item.nama}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 italic">
                                      Angka realisasi terhitung real-time berdasarkan COA
                                    </span>
                                  </div>

                                  {/* Related COA Details */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">COA Terkait:</span>
                                    {itemCoas.length === 0 ? (
                                      <span className="text-slate-400 italic text-[11px]">Belum dihubungkan ke COA</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {itemCoas.map((coa: string) => {
                                          const coaDetail = coas.find((c: any) => c.coa_code === coa);
                                          return (
                                            <span 
                                              key={coa} 
                                              title={coaDetail ? `${coaDetail.coa_code} - ${coaDetail.nama_akun}` : coa}
                                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100"
                                            >
                                              {coa} {coaDetail ? `- ${coaDetail.nama_akun}` : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'].map((m, idx) => {
                                      const monthTarget = Number(item[`target_${m}`] || 0);
                                      const monthReal = Number(item[m] || 0);
                                      const mPct = monthTarget > 0 ? (monthReal / monthTarget) * 100 : 0;
                                      
                                      return (
                                        <div key={m} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">{getMonthName(idx + 1)}</span>
                                          
                                          <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-400">Target:</span>
                                              <span className="font-semibold text-slate-700 font-mono text-[11px]">{formatCurrency(monthTarget)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-400">Realisasi:</span>
                                              <span className="font-bold text-slate-900 font-mono text-[11px]">{formatCurrency(monthReal)}</span>
                                            </div>
                                          </div>

                                          <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 text-[10px]">
                                            <span className="text-slate-400">Pencapaian:</span>
                                            <span className={cn(
                                              "font-extrabold font-mono",
                                              mPct >= 100 ? "text-emerald-600" :
                                              mPct >= 50 ? "text-blue-600" :
                                              mPct > 0 ? "text-amber-600" :
                                              "text-slate-400"
                                            )}>
                                              {mPct.toFixed(0)}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}

                  {/* Summary / Total Row */}
                  {rkatOperasionalList.length > 0 && (
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="px-4 py-4 text-xs font-black uppercase tracking-wider text-slate-800 text-right">
                        TOTAL KESELURUHAN (OPERASIONAL)
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950 font-mono">
                        {formatCurrency(statsOperasional.anggaran)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950 font-mono">
                        {formatCurrency(statsOperasional.realisasi)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-[10px] font-mono">
                          {(statsOperasional.anggaran > 0 ? (statsOperasional.realisasi / statsOperasional.anggaran) * 100 : 0).toFixed(1)}%
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'Pengumpulan' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Cards for Pengumpulan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-emerald-100 text-emerald-700 rounded-xl">
                <TrendingUp className="size-8" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Anggaran Pengumpulan</p>
                <p className="text-2xl font-black text-slate-900 leading-tight mt-1">{formatCurrency(statsPengumpulan.anggaran)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-primary/10 text-primary rounded-xl">
                <Percent className="size-8" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capai Realisasi Pengumpulan</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(statsPengumpulan.realisasi)}</span>
                  <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {(statsPengumpulan.anggaran > 0 ? (statsPengumpulan.realisasi / statsPengumpulan.anggaran) * 100 : 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table for Pengumpulan */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart4 className="size-4 text-primary" />
                    Rincian RKAT Pengumpulan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Realisasi terintegrasi secara real-time dengan Chart of Accounts (COA) Penerimaan.</p>
                </div>
                
                {/* Minimalist Tab Filter */}
                <div className="flex items-center gap-1.5">
                  {(['Semua', 'Zakat', 'Infak', 'DSKL', 'CSR'] as const).map(catName => {
                    const isActive = pengumpulanCategoryFilter === catName;
                    return (
                      <button
                        key={catName}
                        onClick={() => setPengumpulanCategoryFilter(catName)}
                        className={cn(
                          "py-1 px-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all focus:outline-none border cursor-pointer",
                          !isActive && "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700",
                          isActive && catName === 'Semua' && "bg-slate-900 text-white border-slate-900 shadow-sm",
                          isActive && catName === 'Zakat' && "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm shadow-emerald-100",
                          isActive && catName === 'Infak' && "bg-amber-50 text-amber-700 border-amber-300 shadow-sm shadow-amber-100",
                          isActive && catName === 'DSKL' && "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm shadow-indigo-100",
                          isActive && catName === 'CSR' && "bg-slate-100 text-slate-800 border-slate-350 shadow-sm shadow-slate-100"
                        )}
                      >
                        {catName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 border border-slate-200"
                  >
                    <Upload className="size-3.5 stroke-[3]" />
                    Migrasi
                  </button>
                  <button
                    onClick={() => {
                      setEditingPengumpulanItem(null);
                      setFormPengNo(`P-${Date.now().toString().slice(-4)}`);
                      setFormPengKategori('Zakat');
                      setFormPengNama('');
                      setFormPengCoas([]);
                      setFormPengPerorangan('');
                      setFormPengLembaga('');
                      setFormPengAnggaran(0);
                      setFormPengMonths({
                        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0
                      });
                      setIsAddPengumpulanOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-md shadow-primary/15 transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="size-3.5 stroke-[3]" />
                    Tambah Program
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-24 text-center">Kategori</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Nama Program / Kegiatan</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-40 text-right">Target Anggaran</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-40 text-right">Realisasi</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">% Pencapaian</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPengumpulanList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                        Belum ada program pengumpulan yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    filteredPengumpulanList.map((item) => {
                      const itemCoas = item.coa_codes ? item.coa_codes.split(',').map((c: any) => c.trim()).filter(Boolean) : [];
                      const targetVal = Number(item.nilai_anggaran || 0);
                      const realisasiVal = Number(item.realisasi_total || 0);
                      const pct = targetVal > 0 ? (realisasiVal / targetVal) * 100 : 0;
                      const isExpanded = expandedProgramId === item.id;
                      
                      return (
                        <>
                          <tr 
                            key={item.id} 
                            onClick={() => setExpandedProgramId(isExpanded ? null : item.id)}
                            className={cn(
                              "hover:bg-slate-50/80 transition-colors cursor-pointer select-none",
                              isExpanded && "bg-slate-50/40"
                            )}
                          >
                            <td className="px-4 py-4 text-center text-slate-400 font-bold font-mono">{item.no}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                item.kategori === 'Zakat' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                item.kategori === 'Infak' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                item.kategori === 'DSKL' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                                "bg-slate-100 text-slate-700 border border-slate-200"
                              )}>
                                {item.kategori}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 hover:text-primary transition-colors">
                                  {item.nama_program}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="size-3.5 text-slate-400" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-slate-400" />
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(targetVal)}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(realisasiVal)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase font-sans",
                                  pct >= 100 ? "bg-emerald-100 text-emerald-800" :
                                  pct >= 50 ? "bg-blue-100 text-blue-800" :
                                  pct > 0 ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-400"
                                )}>
                                  {pct.toFixed(1)}%
                                </span>
                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      pct >= 100 ? "bg-emerald-500" :
                                      pct >= 50 ? "bg-blue-500" :
                                      "bg-amber-500"
                                    )} 
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center font-sans" onClick={(e) => e.stopPropagation()}>
                              {isSuperAdmin ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingPengumpulanItem(item);
                                      setFormPengNo(item.no);
                                      setFormPengKategori(item.kategori);
                                      setFormPengNama(item.nama_program);
                                      setFormPengCoas(item.coa_codes ? item.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : []);
                                      setFormPengPerorangan(item.target_perorangan !== null ? item.target_perorangan : '');
                                      setFormPengLembaga(item.target_lembaga !== null ? item.target_lembaga : '');
                                      setFormPengAnggaran(Number(item.nilai_anggaran));
                                      setFormPengMonths({
                                        jan: Number(item.target_jan || 0),
                                        feb: Number(item.target_feb || 0),
                                        mar: Number(item.target_mar || 0),
                                        apr: Number(item.target_apr || 0),
                                        mei: Number(item.target_mei || 0),
                                        jun: Number(item.target_jun || 0),
                                        jul: Number(item.target_jul || 0),
                                        agt: Number(item.target_agt || 0),
                                        sep: Number(item.target_sep || 0),
                                        okt: Number(item.target_okt || 0),
                                        nov: Number(item.target_nov || 0),
                                        des: Number(item.target_des || 0)
                                      });
                                    }}
                                    className="p-1 text-slate-550 hover:text-primary hover:bg-slate-100 rounded transition-colors"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deletePengumpulan(item.id)}
                                    className="p-1 text-slate-555 hover:text-red-650 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No Access</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row for monthly breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={7} className="p-4 border-t border-b border-slate-200/50">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <Calendar className="size-3.5 text-primary" />
                                      Detail Target vs Realisasi Bulanan: {item.nama_program}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 italic">
                                      Angka realisasi terhitung real-time berdasarkan COA
                                    </span>
                                  </div>

                                  {/* Related COA Details */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">COA Terkait:</span>
                                    {itemCoas.length === 0 ? (
                                      <span className="text-slate-400 italic text-[11px]">Belum dihubungkan ke COA Penerimaan</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {itemCoas.map((coa: string) => {
                                          const coaDetail = coas.find((c: any) => c.coa_code === coa);
                                          return (
                                            <span 
                                              key={coa} 
                                              title={coaDetail ? `${coaDetail.coa_code} - ${coaDetail.nama_akun}` : coa}
                                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100"
                                            >
                                              {coa} {coaDetail ? `- ${coaDetail.nama_akun}` : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'].map((m, idx) => {
                                      const monthTarget = Number(item[`target_${m}`] || 0);
                                      const monthReal = Number(item[m] || 0);
                                      const mPct = monthTarget > 0 ? (monthReal / monthTarget) * 100 : 0;
                                      
                                      return (
                                        <div key={m} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">{getMonthName(idx + 1)}</span>
                                          
                                          <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-400">Target:</span>
                                              <span className="font-semibold text-slate-700 font-mono text-[11px]">{formatCurrency(monthTarget)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-400">Realisasi:</span>
                                              <span className="font-bold text-slate-900 font-mono text-[11px]">{formatCurrency(monthReal)}</span>
                                            </div>
                                          </div>

                                          <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 text-[10px]">
                                            <span className="text-slate-400">Pencapaian:</span>
                                            <span className={cn(
                                              "font-extrabold font-mono",
                                              mPct >= 100 ? "text-emerald-600" :
                                              mPct >= 50 ? "text-blue-600" :
                                              mPct > 0 ? "text-amber-600" :
                                              "text-slate-400"
                                            )}>
                                              {mPct.toFixed(0)}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}

                  {/* Summary / Total Row */}
                  {filteredPengumpulanList.length > 0 && (
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-350">
                      <td colSpan={3} className="px-4 py-4 text-xs font-black uppercase tracking-wider text-slate-800 text-right">
                        TOTAL KESELURUHAN (PENGUMPULAN)
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950 font-mono">
                        {formatCurrency(statsPengumpulan.anggaran)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950 font-mono">
                        {formatCurrency(statsPengumpulan.realisasi)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-[10px] font-mono">
                          {(statsPengumpulan.anggaran > 0 ? (statsPengumpulan.realisasi / statsPengumpulan.anggaran) * 100 : 0).toFixed(1)}%
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-100 text-emerald-700 rounded-xl">
            <TrendingUp className="size-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Anggaran RKAT</p>
            <p className="text-2xl font-black text-slate-900 leading-tight mt-1">{formatCurrency(grandTotalTarget)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-xl">
            <Percent className="size-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capai Realisasi Berjalan</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{formatCurrency(grandTotalRealisasi)}</span>
              <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {overallPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 flex items-center w-full shadow-inner max-w-6xl mx-auto overflow-x-auto custom-scrollbar">
        <div className="flex flex-row items-center gap-1.5 w-full min-w-max md:min-w-0 md:justify-center md:flex-wrap">
          <button
            onClick={() => setSelectedPilarFilter('Semua')}
            className={cn(
              "py-2.5 px-4 text-[10px] md:text-xs font-black uppercase rounded-xl transition-all text-center tracking-wider focus:outline-none whitespace-nowrap",
              selectedPilarFilter === 'Semua' 
                ? "bg-white text-primary shadow-sm font-extrabold border border-slate-200/10" 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            )}
          >
            Semua Pilar
          </button>
          {listPilarKeys.map(pName => (
            <button
              key={pName}
              onClick={() => setSelectedPilarFilter(pName)}
              className={cn(
                "py-2.5 px-4 text-[10px] md:text-xs font-black uppercase rounded-xl transition-all text-center tracking-wider focus:outline-none whitespace-nowrap",
                selectedPilarFilter === pName 
                  ? "bg-white text-primary shadow-sm font-extrabold border border-slate-200/10" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              )}
            >
              {pName}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE 1: ACCOUNT LEDGER SPLIT */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart4 className="size-4 text-primary" />
              Anggaran &amp; Realisasi Pilar
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Ringkasan total anggaran, realisasi yang tersalurkan, dan persentase serapan kumulatif untuk masing-masing pilar program.</p>
          </div>
          
          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-100">
            ⚡ Menampilkan Realisasi per Bulan Aktual
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1240px]">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-48">Kode &amp; Nama Akun Pilar</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Anggaran Biaya</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Realisasi</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">Prosentase</th>
                
                {/* Months */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <th key={month} className="px-3 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right w-24 bg-slate-50/30">
                    {getMonthName(month).substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data
                .filter(pilar => selectedPilarFilter === 'Semua' || pilar.name === selectedPilarFilter)
                .map((pilar, index) => renderPilarRow(pilar.code, pilar.name, pilar.name, index + 1))
              }
              
              {/* Grand Total Row */}
              {selectedPilarFilter === 'Semua' && (
                <tr className="bg-slate-100/80 p-4 font-black text-slate-950 border-t-2 border-slate-250">
                  <td colSpan={2} className="px-4 py-4 text-xs font-black uppercase tracking-wider text-slate-800 text-right">
                    TOTAL KESELURUHAN (DISTRIBUSI)
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-black text-slate-900">
                    {formatCurrency(grandTotalTarget)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-black text-emerald-800">
                    {formatCurrency(grandTotalRealisasi)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-extrabold bg-primary text-white px-2 py-0.5 rounded">
                      {overallPercentage.toFixed(1)}%
                    </span>
                  </td>

                  {/* Monthly totals summary */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    let sumMonth = 0;
                    Object.keys(monthlyRealizationsByPilar).forEach(cat => {
                      sumMonth += monthlyRealizationsByPilar[cat]?.[month] || 0;
                    });

                    return (
                      <td key={month} className="px-3 py-4 text-right font-mono text-xs font-black text-slate-950 border-l border-slate-200 bg-slate-150/50">
                        {formatCurrency(sumMonth)}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: PROGRAM / KEGIATAN TARGETS LIST AS IN SCREENSHOT 1 */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Detail Target &amp; Realisasi Kegiatan
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Rincian target kegiatan, kriteria asnaf yang disasar, serta estimasi unit cost untuk tiap program.</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs font-bold text-slate-400">Pilar Aktif:</span>
              <span className="px-3 py-1 bg-primary/10 text-primary font-black uppercase text-[10px] rounded-md tracking-wider">
                {selectedPilarFilter}
              </span>
            </div>
            
            {activeTab === 'Penyaluran' && isSuperAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMigrationModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 border border-slate-200"
                >
                  <Upload className="size-3.5 stroke-[3]" />
                  Migrasi
                </button>
                <button
                  onClick={() => {
                    setEditingActivity(null);
                    const activePilarObj = data.find(p => p.name === selectedPilarFilter);
                    const defaultPilarCode = activePilarObj ? activePilarObj.code : (data[0]?.code || '');
                    setFormPilar(defaultPilarCode);
                    setFormNamaKegiatan('');
                    setFormAsnaf('');
                    setFormKeterangan('');
                    setFormCoaCode('');
                    setIsAddModalOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-md shadow-primary/15 transition-all active:scale-95 shrink-0"
                >
                  <Plus className="size-3.5 stroke-[3]" />
                  Tambah Kegiatan
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200">
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-60">Program / Kegiatan Kerja</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-24 text-center">Asnaf</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36">Hubungan COA</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Keterangan Spesifikasi</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-48">Target RKAT &amp; Rincian</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-48">Realisasi Aktual &amp; Sisa</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                    Belum ada program pendistribusian yang terdaftar dalam pilar ini dengan asnaf terpetakan.
                  </td>
                </tr>
              ) : (
                <>
                  {/* Bantuan Konsumtif */}
                  {konsumtifActivities.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="px-4 py-2.5 text-xs font-black text-slate-700 uppercase tracking-widest bg-slate-100/60 border-y border-slate-200">
                          Bantuan Konsumtif ({konsumtifActivities.length})
                        </td>
                      </tr>
                      {konsumtifActivities.map((act, index) => renderActivityRow(act, index))}
                    </>
                  )}

                  {/* Bantuan Produktif */}
                  {produktifActivities.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="px-4 py-2.5 text-xs font-black text-slate-700 uppercase tracking-widest bg-slate-100/60 border-y border-slate-200">
                          Bantuan Produktif ({produktifActivities.length})
                        </td>
                      </tr>
                      {produktifActivities.map((act, index) => renderActivityRow(act, index + konsumtifActivities.length))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER TIPS */}
      <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg mt-0.5">
            <Info className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Prinsip Akuntansi Syariah BAZNAS</h4>
            <p className="text-[11px] text-emerald-950 font-medium leading-relaxed mt-0.5">
              Target RKAT di atas mengikat program pendistribusian mustahik agar sejalan dengan ketersediaan real kas di bank pendukung. Selisih pagu RKAT dan Realisasi berjalan menunjukkan persentase saldo aman likuidasi operasional Kota Semarang yang berhak disalurkan.
            </p>
          </div>
        </div>

        <button 
          onClick={() => {
            alert('File RKAT Berhasil di-eksport ke Excel Format SIMBA!');
          }}
          className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
        >
          <Download className="size-3.5 stroke-[3]" />
          Eksport RKAT Excel
        </button>
      </div>

      {/* ADD / EDIT TARGET ACTIVITY DIALOG MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingActivity !== null) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  {editingActivity ? <Edit2 className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
                  {editingActivity ? 'Ubah Target RKAT' : 'Tambah Target Asnaf RKAT'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingActivity(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Pilar BAZNAS</label>
                    <select
                      value={formPilar}
                      onChange={(e) => setFormPilar(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      {data.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Program / Kegiatan</label>
                    <select
                      value={formProgramCode}
                      onChange={(e) => setFormProgramCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                      disabled={formProgramsAvailable.length === 0}
                    >
                      {formProgramsAvailable.length > 0 ? (
                        formProgramsAvailable.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))
                      ) : (
                        <option value="">-- Tidak ada program --</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nama Kegiatan</label>
                  <input
                    type="text"
                    value={formNamaKegiatan}
                    onChange={(e) => setFormNamaKegiatan(e.target.value)}
                    placeholder="Misal: Pemberian paket sembako dhuafa Semarang Utara"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <SearchableDropdownSingle
                  label="Kategori Asnaf (8 Golongan)"
                  selectedValue={formAsnaf}
                  onChange={setFormAsnaf}
                  options={[
                    { value: "Fakir", label: "Fakir" },
                    { value: "Miskin", label: "Miskin" },
                    { value: "Amil", label: "Amil" },
                    { value: "Mualaf", label: "Mualaf" },
                    { value: "Riqab", label: "Riqab (Hamba Sahaya)" },
                    { value: "Gharimin", label: "Gharimin (Orang Berhutang)" },
                    { value: "Fisabilillah", label: "Fisabilillah" },
                    { value: "Ibnu Sabil", label: "Ibnu Sabil" }
                  ]}
                  placeholder="Cari / Pilih Asnaf..."
                  emptyLabel="-- Kosong (Umum / Non-Asnaf) --"
                  allowEmpty={true}
                />

                <SearchableDropdownSingle
                  label="Hubungkan Ke COA (Chart of Accounts) - Opsional"
                  selectedValue={formCoaCode}
                  onChange={setFormCoaCode}
                  options={coas
                    .filter(coa => coa.klasifikasi === 'Penyaluran' || coa.klasifikasi === 'Penggunaan')
                    .map(coa => ({
                      value: coa.coa_code,
                      label: coa.nama_akun,
                      sublabel: coa.coa_code
                    }))
                  }
                  placeholder="Cari COA Penyaluran..."
                  emptyLabel="-- Tidak dihubungkan (Opsional) --"
                  allowEmpty={true}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Keterangan / Spesifikasi Bantuan</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Misal: Bantuan paket sembako lansia"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Mustahik</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formMustahik}
                        onChange={(e) => setFormMustahik(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Jiwa</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Frekuensi / Thn</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formFrekuensi}
                        onChange={(e) => setFormFrekuensi(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">x</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Unit Cost (Rp)</label>
                    <input
                      type="number"
                      step="10000"
                      min="0"
                      value={formUnitCost}
                      onChange={(e) => setFormUnitCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                    />
                  </div>
                </div>

                {/* Subtotal Summary */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Anggaran Pagu Asnaf:</span>
                  <span className="text-lg font-black text-primary">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(formMustahik * formFrekuensi * formUnitCost)}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingActivity(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={editingActivity ? saveEditActivity : saveNewActivity}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="size-4" />
                  {editingActivity ? 'Simpan Perubahan' : 'Simpan Target RKAT'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        </div>
      )}

      {/* ADD / EDIT RKAT PENGUMPULAN DIALOG MODAL */}
      <AnimatePresence>
        {(isAddPengumpulanOpen || editingPengumpulanItem !== null) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  {editingPengumpulanItem ? <Edit2 className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
                  {editingPengumpulanItem ? 'Ubah Target RKAT Pengumpulan' : 'Tambah Target RKAT Pengumpulan'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddPengumpulanOpen(false);
                    setEditingPengumpulanItem(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Urut</label>
                    <input
                      type="text"
                      value={formPengNo}
                      onChange={(e) => setFormPengNo(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</label>
                    <select
                      value={formPengKategori}
                      onChange={(e) => setFormPengKategori(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="Zakat">Zakat</option>
                      <option value="Infak">Infak</option>
                      <option value="DSKL">DSKL</option>
                      <option value="CSR">CSR</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Program / Kegiatan</label>
                  <input
                    type="text"
                    value={formPengNama}
                    onChange={(e) => setFormPengNama(e.target.value)}
                    placeholder="e.g. Zakat Maal Perorangan"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Target Perorangan</label>
                    <input
                      type="number"
                      value={formPengPerorangan}
                      onChange={(e) => setFormPengPerorangan(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      placeholder="n/a"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Target Lembaga</label>
                    <input
                      type="number"
                      value={formPengLembaga}
                      onChange={(e) => setFormPengLembaga(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      placeholder="n/a"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Nilai Anggaran (Rp)</label>
                    <input
                      type="number"
                      value={formPengAnggaran}
                      onChange={(e) => setFormPengAnggaran(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                    />
                  </div>
                </div>

                {/* COA mapping selection */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <SearchableCoaDropdownMulti
                    label="Hubungkan ke Akun COA Penerimaan"
                    selectedCodes={formPengCoas}
                    onChange={setFormPengCoas}
                    availableCoas={coas.filter((coa: any) => coa.klasifikasi === 'Penerimaan' || coa.coa_code.startsWith('4.'))}
                    placeholder="Cari COA Penerimaan..."
                  />
                  <p className="text-[10px] text-slate-400">Pilih satu atau lebih akun COA Penerimaan. Nilai transaksi Uang Masuk pada COA terpilih akan otomatis terakumulasi sebagai Realisasi program.</p>
                </div>

                {/* Month-by-month grid */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-700">Rincian Anggaran Target per Bulan</h4>
                    <button
                      type="button"
                      onClick={distributePengAnggaran}
                      className="text-[10px] font-black uppercase text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Bagi Rata 12 Bulan
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'].map((m) => (
                      <div key={m} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m}</label>
                        <input
                          type="number"
                          value={formPengMonths[m]}
                          onChange={(e) => setFormPengMonths({ ...formPengMonths, [m]: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right font-mono focus:ring-2 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-[10px] font-bold text-slate-400">Total Terdistribusi per Bulan: </span>
                    <span className={cn(
                      "text-xs font-black font-mono",
                      Math.abs(Object.values(formPengMonths).reduce((a, b) => a + b, 0) - formPengAnggaran) < 5
                        ? "text-emerald-600"
                        : "text-amber-600"
                    )}>
                      {formatCurrency(Object.values(formPengMonths).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 font-semibold">
                <button
                  onClick={() => {
                    setIsAddPengumpulanOpen(false);
                    setEditingPengumpulanItem(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={editingPengumpulanItem ? saveEditPengumpulan : saveNewPengumpulan}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="size-4" />
                  {editingPengumpulanItem ? 'Simpan Perubahan' : 'Simpan Target RKAT'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT RKAT OPERASIONAL DIALOG MODAL */}
      <AnimatePresence>
        {(isAddOperasionalOpen || editingOperasionalItem !== null) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  {editingOperasionalItem ? <Edit2 className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
                  {editingOperasionalItem ? 'Ubah Target RKAT Operasional' : 'Tambah Target RKAT Operasional'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddOperasionalOpen(false);
                    setEditingOperasionalItem(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Urut</label>
                    <input
                      type="text"
                      value={formOperNo}
                      onChange={(e) => setFormOperNo(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Program / Kegiatan</label>
                    <input
                      type="text"
                      value={formOperNama}
                      onChange={(e) => setFormOperNama(e.target.value)}
                      placeholder="e.g. Belanja ATK Kantor"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Kegiatan</label>
                  <textarea
                    value={formOperKeterangan}
                    onChange={(e) => setFormOperKeterangan(e.target.value)}
                    placeholder="e.g. Pembelian kertas, pulpen, tinta printer triwulanan"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Volume</label>
                    <input
                      type="number"
                      value={formOperVolume}
                      onChange={(e) => setFormOperVolume(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Frekuensi</label>
                    <input
                      type="number"
                      value={formOperFrekuensi}
                      onChange={(e) => setFormOperFrekuensi(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Unit Cost (Rp)</label>
                    <input
                      type="number"
                      value={formOperUnitCost}
                      onChange={(e) => setFormOperUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Nilai Anggaran</label>
                    <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-right font-mono text-slate-700">
                      {formatCurrency(formOperAnggaran)}
                    </div>
                  </div>
                </div>

                {/* COA mapping selection */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <SearchableCoaDropdownMulti
                    label="Hubungkan ke Akun COA Beban / Operasional"
                    selectedCodes={formOperCoas}
                    onChange={setFormOperCoas}
                    availableCoas={coas.filter((coa: any) => coa.klasifikasi?.toLowerCase() === 'beban' || coa.coa_code.startsWith('5'))}
                    placeholder="Cari COA Beban / Operasional..."
                  />
                  <p className="text-[10px] text-slate-400">Pilih satu atau lebih akun COA Beban. Nilai transaksi Pengeluaran (debit) pada COA terpilih akan otomatis terakumulasi sebagai Realisasi program.</p>
                </div>

                {/* Month-by-month grid */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-700">Rincian Anggaran Target per Bulan</h4>
                    <button
                      type="button"
                      onClick={distributeOperAnggaran}
                      className="text-[10px] font-black uppercase text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Bagi Rata 12 Bulan
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'].map((m) => (
                      <div key={m} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m}</label>
                        <input
                          type="number"
                          value={formOperMonths[m]}
                          onChange={(e) => setFormOperMonths({ ...formOperMonths, [m]: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right font-mono focus:ring-2 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-[10px] font-bold text-slate-400">Total Terdistribusi per Bulan: </span>
                    <span className={cn(
                      "text-xs font-black font-mono",
                      Math.abs(Object.values(formOperMonths).reduce((a, b) => a + b, 0) - formOperAnggaran) < 5
                        ? "text-emerald-600"
                        : "text-amber-600"
                    )}>
                      {formatCurrency(Object.values(formOperMonths).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 font-semibold">
                <button
                  onClick={() => {
                    setIsAddOperasionalOpen(false);
                    setEditingOperasionalItem(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={editingOperasionalItem ? saveEditOperasional : saveNewOperasional}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="size-4" />
                  {editingOperasionalItem ? 'Simpan Perubahan' : 'Simpan Target RKAT'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal RKAT */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMigrationModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Migrasi Data RKAT {activeTab}</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Impor Data via Excel</h4>
                  <p className="text-xs text-slate-500">
                    {activeTab === 'Pengumpulan' 
                      ? 'Gunakan file Excel (.xlsx) dengan kolom: No, Kategori, Nama Program, Kode COA, Target Perorangan, Target Lembaga, Nilai Anggaran, serta target bulanan (Target Jan - Target Des).'
                      : activeTab === 'Operasional'
                      ? 'Gunakan file Excel (.xlsx) dengan kolom: No, Nama Program, Keterangan, Kode COA, Volume, Frekuensi, Unit Cost, serta target bulanan (Target Jan - Target Des).'
                      : 'Gunakan file Excel (.xlsx) dengan kolom: Kode Pilar, Kode Program, Nama Kegiatan, Asnaf, Keterangan, Target Jiwa, Frekuensi, Unit Cost, Kode COA.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      if (activeTab === 'Pengumpulan') {
                        const ws = XLSX.utils.json_to_sheet([
                          { 
                            "No": "1",
                            "Kategori": "Zakat",
                            "Nama Program": "Zakat Maal Badan",
                            "Kode COA": "4.1.01.01.001, 4.1.01.01.002",
                            "Target Perorangan": "",
                            "Target Lembaga": "10",
                            "Nilai Anggaran": 50000000,
                            "Target Jan": 4166666,
                            "Target Feb": 4166666,
                            "Target Mar": 4166666,
                            "Target Apr": 4166666,
                            "Target Mei": 4166666,
                            "Target Jun": 4166666,
                            "Target Jul": 4166666,
                            "Target Agt": 4166666,
                            "Target Sep": 4166666,
                            "Target Okt": 4166666,
                            "Target Nov": 4166666,
                            "Target Des": 4166666
                          }
                        ]);
                        const refCoas = coas
                          .filter(coa => coa.klasifikasi === 'Penerimaan' || coa.coa_code.startsWith('4.'))
                          .map(coa => ({
                            "Kode COA": coa.coa_code,
                            "Nama Akun": coa.nama_akun,
                            "Klasifikasi": coa.klasifikasi
                          }));
                        const wsRef = XLSX.utils.json_to_sheet(refCoas);

                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Template_Pengumpulan");
                        XLSX.utils.book_append_sheet(wb, wsRef, "Referensi_COA_Penerimaan");
                        XLSX.writeFile(wb, "Template_Migrasi_RKAT_Pengumpulan.xlsx");
                      } else if (activeTab === 'Operasional') {
                        const ws = XLSX.utils.json_to_sheet([
                          { 
                            "No": "1",
                            "Nama Program": "Belanja ATK Kantor",
                            "Keterangan": "Pembelian kertas, pulpen, tinta printer triwulanan",
                            "Kode COA": "5.2.01.01.001",
                            "Volume": 4,
                            "Frekuensi": 1,
                            "Unit Cost": 1500000,
                            "Target Jan": 1500000,
                            "Target Feb": 0,
                            "Target Mar": 0,
                            "Target Apr": 1500000,
                            "Target Mei": 0,
                            "Target Jun": 0,
                            "Target Jul": 1500000,
                            "Target Agt": 0,
                            "Target Sep": 0,
                            "Target Okt": 1500000,
                            "Target Nov": 0,
                            "Target Des": 0
                          }
                        ]);
                        const refCoas = coas
                          .filter(coa => coa.klasifikasi?.toLowerCase() === 'beban' || coa.coa_code.startsWith('5'))
                          .map(coa => ({
                            "Kode COA": coa.coa_code,
                            "Nama Akun": coa.nama_akun,
                            "Klasifikasi": coa.klasifikasi
                          }));
                        const wsRef = XLSX.utils.json_to_sheet(refCoas);

                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Template_Operasional");
                        XLSX.utils.book_append_sheet(wb, wsRef, "Referensi_COA_Beban");
                        XLSX.writeFile(wb, "Template_Migrasi_RKAT_Operasional.xlsx");
                      } else {
                        const ws = XLSX.utils.json_to_sheet([
                          { 
                            "Kode Pilar": "2101",
                            "Kode Program": "210102",
                            "Nama Kegiatan": "Bantuan Biaya Hidup Sembako",
                            "Asnaf": "Miskin",
                            "Keterangan": "Pemberian paket sembako dhuafa Semarang Utara",
                            "Target Jiwa": 100,
                            "Frekuensi": 1,
                            "Unit Cost": 250000,
                            "Kode COA": "5.1.01.01.001"
                          }
                        ]);
                        const refCoas = coas
                          .filter(coa => coa.klasifikasi === 'Penyaluran' || coa.klasifikasi === 'Penggunaan')
                          .map(coa => ({
                            "Kode COA": coa.coa_code,
                            "Nama Akun": coa.nama_akun,
                            "Klasifikasi": coa.klasifikasi
                          }));
                        const wsRef = XLSX.utils.json_to_sheet(refCoas);

                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Template_RKAT");
                        XLSX.utils.book_append_sheet(wb, wsRef, "Referensi_COA");
                        XLSX.writeFile(wb, "Template_Migrasi_RKAT.xlsx");
                      }
                    }} 
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          try {
                            const bstr = evt.target?.result;
                            const wb = XLSX.read(bstr, { type: 'binary' });
                            const wsname = wb.SheetNames[0];
                            const ws = wb.Sheets[wsname];
                            const dataExcel = XLSX.utils.sheet_to_json(ws) as any[];
                            
                            if (dataExcel.length === 0) {
                              alert('File Excel kosong or tidak terbaca.');
                              return;
                            }

                            if (activeTab === 'Pengumpulan') {
                              const payload = dataExcel.map(row => ({
                                no: String(row.No || row.no || row.NO || '').trim(),
                                kategori: String(row.Kategori || row.kategori || 'Zakat').trim(),
                                nama_program: String(row["Nama Program"] || row["nama_program"] || row.Nama_Program || row.NamaProgram || '').trim(),
                                target_perorangan: row["Target Perorangan"] || row.target_perorangan || null,
                                target_lembaga: row["Target Lembaga"] || row.target_lembaga || null,
                                nilai_anggaran: row["Nilai Anggaran"] || row.nilai_anggaran || 0,
                                target_jan: row["Target Jan"] || row.target_jan || row["Target_Jan"] || null,
                                target_feb: row["Target Feb"] || row.target_feb || row["Target_Feb"] || null,
                                target_mar: row["Target Mar"] || row.target_mar || row["Target_Mar"] || null,
                                target_apr: row["Target Apr"] || row.target_apr || row["Target_Apr"] || null,
                                target_mei: row["Target Mei"] || row.target_mei || row["Target_Mei"] || null,
                                target_jun: row["Target Jun"] || row.target_jun || row["Target_Jun"] || null,
                                target_jul: row["Target Jul"] || row.target_jul || row["Target_Jul"] || null,
                                target_agt: row["Target Agt"] || row.target_agt || row["Target_Agt"] || row["Target_Aug"] || null,
                                target_sep: row["Target Sep"] || row.target_sep || row["Target_Sep"] || null,
                                target_okt: row["Target Okt"] || row.target_okt || row["Target_Okt"] || row["Target_Oct"] || null,
                                target_nov: row["Target Nov"] || row.target_nov || row["Target_Nov"] || null,
                                target_des: row["Target Des"] || row.target_des || row["Target_Des"] || row["Target_Dec"] || null
                              }));

                              await axios.post('http://127.0.0.1:4000/api/rkat-pengumpulan/import', payload);
                              alert(`Migrasi Berhasil! Berhasil menyimpan/memperbarui data RKAT Pengumpulan.`);
                              fetchRkatPengumpulan();
                            } else if (activeTab === 'Operasional') {
                              const payload = dataExcel.map(row => ({
                                no: String(row.No || row.no || row.NO || '').trim(),
                                nama: String(row["Nama Program"] || row["nama_program"] || row.Nama_Program || row.NamaProgram || row.Nama || '').trim(),
                                keterangan: String(row.Keterangan || row.keterangan || '').trim(),
                                coa_codes: String(row["Kode COA"] || row["kode_coa"] || row.Kode_COA || row.COA || '').trim(),
                                volume: row.Volume || row.volume || 1,
                                frekuensi: row.Frekuensi || row.frekuensi || 1,
                                unit_cost: row["Unit Cost"] || row.unit_cost || row["Unit_Cost"] || 0,
                                target_jan: row["Target Jan"] || row.target_jan || row["Target_Jan"] || null,
                                target_feb: row["Target Feb"] || row.target_feb || row["Target_Feb"] || null,
                                target_mar: row["Target Mar"] || row.target_mar || row["Target_Mar"] || null,
                                target_apr: row["Target Apr"] || row.target_apr || row["Target_Apr"] || null,
                                target_mei: row["Target Mei"] || row.target_mei || row["Target_Mei"] || null,
                                target_jun: row["Target Jun"] || row.target_jun || row["Target_Jun"] || null,
                                target_jul: row["Target Jul"] || row.target_jul || row["Target_Jul"] || null,
                                target_agt: row["Target Agt"] || row.target_agt || row["Target_Agt"] || row["Target_Aug"] || null,
                                target_sep: row["Target Sep"] || row.target_sep || row["Target_Sep"] || null,
                                target_okt: row["Target Okt"] || row.target_okt || row["Target_Okt"] || row["Target_Oct"] || null,
                                target_nov: row["Target Nov"] || row.target_nov || row["Target_Nov"] || null,
                                target_des: row["Target Des"] || row.target_des || row["Target_Des"] || row["Target_Dec"] || null
                              }));

                              await axios.post('http://127.0.0.1:4000/api/rkat-operasional/import', payload);
                              alert(`Migrasi Berhasil! Berhasil menyimpan/memperbarui data RKAT Operasional.`);
                              fetchRkatOperasional();
                              setIsMigrationModalOpen(false);
                            } else {
                              // Group activities by Kode Program
                              const groupedByProgram: { [code: string]: any[] } = {};
                              dataExcel.forEach((row) => {
                                const progCode = String(row["Kode Program"] || row["Kode_Program"] || row["kode_program"] || "").trim();
                                if (!progCode) return;
                                if (!groupedByProgram[progCode]) {
                                  groupedByProgram[progCode] = [];
                                }
                                const mustahik = Number(row["Target Jiwa"] || row["Target_Jiwa"] || row["target_jiwa"] || 0);
                                const frekuensi = Number(row["Frekuensi"] || row["Frekuensi_Tahun"] || row["frekuensi_tahun"] || 1);
                                const nominal = Number(row["Unit Cost"] || row["Unit_Cost_Rp"] || row["unit_cost"] || 0);

                                 groupedByProgram[progCode].push({
                                   id: `asnaf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                   name: String(row["Nama Kegiatan"] || row["Nama_Kegiatan"] || row["nama_kegiatan"] || "").trim(),
                                   asnaf: String(row["Asnaf"] || row["asnaf"] || "").trim(),
                                   frekuensi,
                                   nominal,
                                   mustahik,
                                   keterangan: String(row["Keterangan"] || row["keterangan"] || "").trim(),
                                   coaCode: String(row["Kode COA"] || row["Kode_COA"] || row["kode_coa"] || "").trim() || undefined
                                 });
                              });

                              const programCodes = Object.keys(groupedByProgram);
                              if (programCodes.length === 0) {
                                alert('Tidak ditemukan kolom Kode Program yang valid.');
                                return;
                              }

                              let successCount = 0;
                              for (const code of programCodes) {
                                try {
                                  const rkatDetails = groupedByProgram[code];
                                  const budgetRkat = rkatDetails.reduce((sum, t) => sum + (t.mustahik * t.frekuensi * t.nominal), 0);
                                  await axios.put(`http://127.0.0.1:4000/api/programs/${code}`, {
                                    rkat_details: rkatDetails,
                                    budget_rkat: budgetRkat
                                  });
                                  successCount++;
                                } catch (err) {
                                  console.error(`Gagal migrasi program ${code}:`, err);
                                }
                              }

                              alert(`Migrasi Berhasil! Data Excel terbaca sebanyak ${dataExcel.length} baris. Berhasil memperbarui ${successCount} program di database.`);
                              fetchPilars();
                              setIsMigrationModalOpen(false);
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Gagal memproses file Excel');
                          }
                        };
                        reader.readAsBinaryString(file);
                      }} 
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      {activeTab === 'Pengumpulan' 
                        ? 'Pastikan format kolom Excel sesuai dengan template RKAT Pengumpulan agar sinkronisasi data berhasil.'
                        : 'Pastikan Kode Program sesuai dengan referensi master data SIMBA BAZNAS untuk menghindari kegagalan sinkronisasi.'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
