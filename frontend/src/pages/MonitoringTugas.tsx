import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ClipboardList, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal, 
  UserRound, 
  MapPin, 
  Eye,
  X,
  Send,
  CheckCircle,
  ChevronLeft,
  Home,
  ExternalLink,
  Calendar,
  ChevronDown,
  Check,
  Repeat2,
  FlaskConical,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  if (link.includes('drive.google.com')) {
    return link.replace(/\/view.*?(\?|$)/, '/preview$1');
  }
  return link;
}

function getSurveyDeadlineInfo(claimedAtStr?: string | null) {
  if (!claimedAtStr) return null;
  const claimedAt = new Date(claimedAtStr);
  const now = new Date();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      remainingText: 'KEDALUWARSA',
      isExpired: true,
      diffMs: 0
    };
  }
  
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  
  let remainingText = '';
  if (diffDays > 0) {
    remainingText = `${diffDays} Hari ${diffHours} Jam`;
  } else if (diffHours > 0) {
    remainingText = `${diffHours} Jam ${diffMinutes} Mnt`;
  } else {
    remainingText = `${diffMinutes} Mnt`;
  }
  
  return {
    remainingText,
    isExpired: false,
    diffMs
  };
}

type SurveyStatus = 'Antrean Tugas' | 'Pending' | 'On Progress' | 'Selesai' | 'Disetujui';

interface MonitoringTugasProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function MonitoringTugas({ data, onUpdate }: MonitoringTugasProps) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'all-tasks'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'Semua'>('Semua');
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showAllKecamatan, setShowAllKecamatan] = useState(false);
  const [programTypeFilter, setProgramTypeFilter] = useState<'Semua' | 'Konsumtif' | 'Produktif'>('Semua');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const [selectedMonth, setSelectedMonth] = useState<string>('Semua');

  const monthOptions = useMemo(() => {
    const options = [{ value: 'Semua', label: 'Semua Bulan' }];
    const date = new Date();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    for (let i = 0; i < 24; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const label = `${monthNames[d.getMonth()]} ${y}`;
      options.push({ value: `${y}-${m}`, label });
    }
    return options;
  }, []);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';
  const isKabagPendistribusian = user?.role === 'Kabag_Pendistribusian';
  const isKabagPendayagunaan = user?.role === 'Kabag_Pendayagunaan';
  const isStafPendistribusian = user?.role === 'Staf_Pendistribusian';
  const isStafPendayagunaan = user?.role === 'Staf_Pendayagunaan';
  const isStafDistribusi = isStafPendistribusian || isStafPendayagunaan;

  const [rekomendasiKabag, setRekomendasiKabag] = useState<'Zakat' | 'Infak/Sedekah Tidak Terikat' | 'Infak/Sedekah Terikat' | 'Layak' | 'Tidak Layak' | 'Dipertimbangkan'>('Zakat');
  const [hasilIdentifikasi, setHasilIdentifikasi] = useState('');
  const [selectedAsnaf, setSelectedAsnaf] = useState('Fakir');
  const [changedProgramCode, setChangedProgramCode] = useState<string>('');
  const asnafOptions = ['Fakir', 'Miskin', 'Amil', 'Muallaf', 'Riqab', 'Gharimin', 'Fisabilillah', 'Ibnu Sabil'];

  const [pilars, setPilars] = useState<any[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [surveyors, setSurveyors] = useState<any[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [searchSurveyorQuery, setSearchSurveyorQuery] = useState('');
  const [alurSearchQuery, setAlurSearchQuery] = useState('');
  const [isSurveyorDropdownOpen, setIsSurveyorDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isAsnafDropdownOpen, setIsAsnafDropdownOpen] = useState(false);
  const [isRekomendasiDropdownOpen, setIsRekomendasiDropdownOpen] = useState(false);
  const [isAlurDropdownOpen, setIsAlurDropdownOpen] = useState(false);

  // Disposisi fields: Bantuan Berulang & Survei
  const [isBantuanBerulang, setIsBantuanBerulang] = useState(false);
  const [frekuensiBerulang, setFrekuensiBerulang] = useState<number>(1);
  const [tanggalPencairan, setTanggalPencairan] = useState<number>(1);
  const [perluSurvei, setPerluSurvei] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'reassign' | 'release';
    targetValue?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'reassign'
  });
  useEffect(() => {
    if (!isDetailModalOpen) {
      setIsSurveyorDropdownOpen(false);
      setSearchSurveyorQuery('');
      setAlurSearchQuery('');
      setIsAsnafDropdownOpen(false);
      setIsRekomendasiDropdownOpen(false);
      setIsAlurDropdownOpen(false);
    }
  }, [isDetailModalOpen]);

  const programTipeMap = useMemo(() => {
    const map: { [code: string]: string } = {};
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        map[prog.code] = prog.tipe || 'Konsumtif';
      });
    });
    return map;
  }, [pilars]);

  const consumptivePrograms = useMemo(() => {
    const list: { code: string; name: string; pilarName: string }[] = [];
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        const tipe = prog.tipe || 'Konsumtif';
        if (tipe === 'Konsumtif') {
          list.push({
            code: prog.code,
            name: prog.name,
            pilarName: pilar.name
          });
        }
      });
    });
    return list;
  }, [pilars]);

  const fetchPilars = useCallback(() => {
    axios.get('/api/pilars')
      .then(res => {
        if (res.data) {
          setPilars(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch pilars in MonitoringTugas', err));
  }, []);

  const fetchSurveyors = useCallback(async () => {
    try {
      const res = await axios.get('/api/users');
      if (res.data) {
        // filter by role
        const relawanList = res.data.filter((u: any) => u.role === 'Relawan' || u.role === 'Relawan_Sementara');
        setSurveyors(relawanList);
      }
    } catch (err) {
      console.error('Failed to fetch surveyors', err);
    }
  }, []);

  useEffect(() => {
    fetchPilars();
    if (isKabagPendistribusian || isKabagPendayagunaan || isSuperAdmin) {
      fetchSurveyors();
    }
  }, [fetchPilars, fetchSurveyors, isKabagPendistribusian, isKabagPendayagunaan, isSuperAdmin]);

  const getParentProgramCode = (code?: string): string => {
    if (!code) return "";
    return code.split('.')[0].trim();
  };

  const getTaskTipe = (task: any) => {
    if (!task) return 'Konsumtif';
    const code = task.programCode;
    const cleanCode = code ? code.trim() : '';
    
    // 1. Check direct code mapping
    if (programTipeMap[cleanCode]) {
      return programTipeMap[cleanCode];
    }
    
    // 2. Check parent code mapping
    const parentCode = getParentProgramCode(code);
    if (programTipeMap[parentCode]) {
      return programTipeMap[parentCode];
    }
    
    // 3. Fallback: Code-based check (Pilar 4 / Ekonomi is Produktif)
    if (cleanCode.startsWith('24') || cleanCode.startsWith('14') || cleanCode.startsWith('2401') || cleanCode.startsWith('1401')) {
      return 'Produktif';
    }
    
    // 4. Fallback: Name-based check
    const name = task.jenisPermohonan ? task.jenisPermohonan.toLowerCase() : '';
    const productiveKeywords = [
      'ekonomi', 'usaha', 'produktif', 'dagang', 'modal', 'kewirausahaan', 
      'gerobak', 'ternak', 'tani', 'alat kerja', 'pemberdayaan', 'microfinance'
    ];
    
    if (productiveKeywords.some(keyword => name.includes(keyword))) {
      return 'Produktif';
    }
    
    return 'Konsumtif';
  };

  useEffect(() => {
    const getTemplateKey = () => {
      if (!selectedTask) return 'survey_template_individu';
      const isLembaga = selectedTask.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedTask.jenisPengajuan?.toLowerCase().includes('kelompok');
      if (isLembaga) return 'survey_template_lembaga';
      
      const tipe = getTaskTipe(selectedTask);
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
      .catch(err => console.error('Failed to fetch survey template', err));
  }, [selectedTask, programTipeMap]);

  const realizedProposals = useMemo(() => {
    return data.filter(p => 
      ['Selesai & Arsip', 'Realisasi Bantuan', 'MENUNGGU_SIMBA', 'MENUNGGU_REALISASI_DISTRIBUSI', 'Pencairan Dana', 'Selesai'].includes(p.status)
    );
  }, [data]);

  const hasTaskAuthority = (task: any) => {
    if (!task) return false;
    const type = getTaskTipe(task);
    if (isSuperAdmin) return true;
    if (isKabagPendistribusian && type === 'Konsumtif') return true;
    if (isKabagPendayagunaan && type === 'Produktif') return true;
    if (isStafPendistribusian && type === 'Konsumtif') return true;
    if (isStafPendayagunaan && type === 'Produktif') return true;
    return false;
  };

  const activities = useMemo(() => {
    const list: any[] = [];
    (pilars || []).forEach((pilar) => {
      (pilar.programs || []).forEach((prog: any) => {
        const details = typeof prog.rkat_details === 'string'
          ? JSON.parse(prog.rkat_details || '[]')
          : (prog.rkat_details || []);
        details.forEach((target: any, tIdx: number) => {
          const fallbackId = target.id || `act-auto-${prog.code}-${target.asnaf || 'General'}-${tIdx}`;
          list.push({
            id: fallbackId,
            pilarCode: pilar.code,
            pilarName: pilar.name,
            name: target.name || prog.name,
            programName: prog.name,
            keterangan: target.keterangan || `Penyaluran program ${prog.name} khusus kriteria asnaf ${target.asnaf}`,
            mustahik: target.mustahik || 0,
            frekuensi: Number(target.frekuensi) || 1,
            unitCost: target.nominal || 0,
            programCode: prog.code,
            asnaf: target.asnaf
          });
        });
      });
    });
    return list;
  }, [pilars]);

  const isProposalMatchedToActivity = (p: ProposalMemo, act: any) => {
    if (p.programCode) {
      const parentP = getParentProgramCode(p.programCode);
      const parentAct = getParentProgramCode(act.programCode);
      if (parentP === parentAct) {
        if (act.asnaf) {
          const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
          return act.asnaf.toLowerCase() === pAsnaf;
        }
        return true;
      }
    }
    
    if (p.jenisPermohonan && act.programName) {
      if (p.jenisPermohonan.toLowerCase().trim() === act.programName.toLowerCase().trim()) {
        if (act.asnaf) {
          const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
          return act.asnaf.toLowerCase() === pAsnaf;
        }
        return true;
      }
    }

    const matchesPilar = p.program === act.pilarName;
    const matchesProgram = p.jenisPermohonan === act.name;
    if (matchesPilar && matchesProgram) {
      if (act.asnaf) {
        const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
        return act.asnaf.toLowerCase() === pAsnaf;
      }
      return true;
    }
    return false;
  };

  const getActivityUsage = (act: any) => {
    const matched = realizedProposals.filter(p => isProposalMatchedToActivity(p, act));
    return matched.reduce((sum, p) => sum + (p.nominal || 0), 0);
  };

  const matchedActivities = useMemo(() => {
    if (!selectedTask) return [];
    
    let list = [];
    
    // 1. Match by program code
    if (selectedTask.programCode) {
      const parentP = getParentProgramCode(selectedTask.programCode);
      list = activities.filter(act => getParentProgramCode(act.programCode) === parentP);
    }
    
    // 2. Match by clean program name
    if (list.length === 0 && selectedTask.jenisPermohonan) {
      list = activities.filter(act => 
        act.programName && 
        act.programName.toLowerCase().trim() === selectedTask.jenisPermohonan.toLowerCase().trim()
      );
    }

    // 3. Fallback name-based matching
    if (list.length === 0 && selectedTask.jenisPermohonan) {
      list = activities.filter(act => 
        act.name.toLowerCase().includes(selectedTask.jenisPermohonan.toLowerCase()) ||
        selectedTask.jenisPermohonan.toLowerCase().includes(act.name.toLowerCase())
      );
    }
    
    return list;
  }, [selectedTask, activities]);


  const renderMultipleRKATInfo = (acts: any[]) => {
    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
      <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <ClipboardList className="size-4" />
          </div>
          <span className="text-sm font-bold text-slate-800">Daftar Kegiatan RKAT Terkait Program</span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar -mx-6 px-6">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="pb-3 px-4 first:pl-0 font-bold">Nama Kegiatan & Asnaf</th>
                <th className="pb-3 px-4 font-bold text-right">Target 1 Tahun</th>
                <th className="pb-3 px-4 font-bold text-right">Realisasi</th>
                <th className="pb-3 px-4 font-bold text-right">Sisa Anggaran</th>
                <th className="pb-3 px-4 font-bold text-right">Unit Cost</th>
                <th className="pb-3 px-4 last:pr-0 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {acts.map((act) => {
                const targetBudget = act.mustahik * act.frekuensi * act.unitCost;
                const usedBudget = getActivityUsage(act);
                const remainingBudget = targetBudget - usedBudget;
                const isOverBudget = remainingBudget < 0;

                return (
                  <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 first:pl-0 pr-6">
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">{act.name}</p>
                      {act.keterangan && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-2" title={act.keterangan}>
                          {act.keterangan}
                        </p>
                      )}
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded">
                        Asnaf: {act.asnaf || 'Semua'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700 text-xs sm:text-sm text-right">{formatCurrency(targetBudget)}</td>
                    <td className="py-4 px-4 font-semibold text-slate-700 text-xs sm:text-sm text-right">{formatCurrency(usedBudget)}</td>
                    <td className={cn("py-4 px-4 font-black text-xs sm:text-sm text-right", isOverBudget ? "text-rose-600" : "text-emerald-600")}>
                      {formatCurrency(remainingBudget)}
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-xs sm:text-sm text-right">{formatCurrency(act.unitCost)}</td>
                    <td className="py-4 px-4 last:pr-0 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shrink-0", isOverBudget ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100")}>
                        {isOverBudget ? "Over Limit" : "Aman"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  const getSurveyStatus = (item: ProposalMemo): SurveyStatus => {
    if (item.status === 'Monitoring Tugas') return 'Antrean Tugas';
    if (item.status === 'Survei Assessment' || item.status === 'Proses Disposisi') {
      return item.isBeingSurveyed ? 'On Progress' : 'Pending';
    }
    if (item.status === 'Selesai' || item.status === 'Survei Selesai') return 'Selesai';
    if (['Review Kepala Pelaksana', 'Persetujuan Nominal', 'Persetujuan Pimpinan', 'Penentuan Nominal', 'Pencairan Dana', 'Antrean Bantuan', 'Arsip'].includes(item.status)) return 'Disetujui';
    return 'Antrean Tugas';
  };

  const tasks = useMemo(() => {
    return data.filter(item => {
      if (item.jenisPengajuan === 'OBS') return false;

      const isTaskStatus = ['Monitoring Tugas', 'Proses Disposisi', 'Survei Assessment', 'Survei Selesai', 'Selesai', 'Antrean Bantuan', 'Review Kepala Pelaksana', 'Persetujuan Pimpinan', 'Penentuan Nominal', 'Pencairan Dana', 'Arsip'].includes(item.status);
      if (!isTaskStatus) return false;

      if (selectedMonth !== 'Semua' && item.tanggalMasuk) {
        const [y, m] = item.tanggalMasuk.split('-');
        if (`${y}-${m}` !== selectedMonth) return false;
      }
      return true;
    });
  }, [data, selectedMonth]);

  const stats = useMemo(() => {
    return [
      { title: "Total Tugas", value: tasks.length.toString(), subtitle: "Bulan ini", icon: <ClipboardList className="size-5" />, color: "slate" },
      { title: "Sedang Disurvei", value: tasks.filter(t => getSurveyStatus(t) === 'On Progress').length.toString(), subtitle: "In Progress", icon: <RefreshCw className="size-5 animate-spin-slow" />, color: "primary", trend: "In Progress" },
      { title: "Menunggu Approve", value: tasks.filter(t => getSurveyStatus(t) === 'Selesai').length.toString(), subtitle: "Butuh Tindakan Segera", icon: <AlertCircle className="size-5" />, color: "amber" },
      { title: "Disetujui / Selesai", value: tasks.filter(t => getSurveyStatus(t) === 'Disetujui').length.toString(), subtitle: "Masuk Antrean Pencairan", icon: <CheckCircle2 className="size-5" />, color: "emerald" },
    ];
  }, [tasks, getSurveyStatus]);

  const kecamatans = [
    "Semarang Tengah", "Semarang Utara", "Semarang Timur", "Semarang Selatan",
    "Semarang Barat", "Gajahmungkur", "Candisari", "Tembalang",
    "Banyumanik", "Gunungpati", "Mijen", "Ngaliyan",
    "Tugu", "Genuk", "Pedurungan", "Gayamsari"
  ];

  const handleUpdateStatus = async (id: string, newStatus: ProposalMemo['status']) => {
    if (newStatus === 'Review Kepala Pelaksana') {
      const task = data.find(t => t.id === id);
      if (task) {
        const isZakat = task.rekomendasi_kabag === 'Zakat' || !task.rekomendasi_kabag;
        if (isZakat && (!task.asnaf || !task.hasil_identifikasi?.trim())) {
          alert('Gagal: Tugas Survei tidak dapat disetujui tanpa melakukan identifikasi asnaf dan mengisi hasil identifikasi.');
          return;
        }
        if (!isZakat && !task.hasil_identifikasi?.trim()) {
          alert('Gagal: Tugas Survei tidak dapat disetujui tanpa mengisi hasil identifikasi.');
          return;
        }
      }
    }
    try {
      const backendStatus = newStatus.replace(/ /g, '_');
      await axios.put(`/api/proposals/${id}`, { status: backendStatus });
      const updatedData = data.map(item => item.id === id ? { ...item, status: newStatus } : item);
      onUpdate(updatedData);
    } catch (err) {
      console.error(err);
      alert('Gagal update status proposal');
    }
  };

  const handleApproveKabag = async (task: ProposalMemo) => {
    if (rekomendasiKabag === 'Zakat' && !selectedAsnaf) {
      alert('Harap pilih asnaf terlebih dahulu.');
      return;
    }
    if (!hasilIdentifikasi.trim()) {
      alert('Harap isi hasil identifikasi terlebih dahulu.');
      return;
    }
    try {
      const payload: any = {
        status: 'Review_Kepala_Pelaksana',
        asnaf: rekomendasiKabag === 'Zakat' ? selectedAsnaf : null,
        rekomendasi_kabag: rekomendasiKabag,
        hasil_identifikasi: hasilIdentifikasi,
        approval_kabag: true,
        is_rutin: isBantuanBerulang,
        butuh_survei: perluSurvei
      };
      if (isBantuanBerulang) {
        payload.frekuensi_berulang = frekuensiBerulang;
        payload.tanggal_pencairan = tanggalPencairan;
      }
      if (changedProgramCode) {
        payload.jenis_permohonan = changedProgramCode;
      }
      await axios.put(`/api/proposals/${task.id}`, payload);
      
      const newProg = consumptivePrograms.find(p => p.code === changedProgramCode);
      const updatedData = data.map(item => item.id === task.id ? { 
        ...item, 
        status: 'Review Kepala Pelaksana',
        asnaf: rekomendasiKabag === 'Zakat' ? selectedAsnaf : undefined,
        rekomendasi_kabag: rekomendasiKabag,
        hasil_identifikasi: hasilIdentifikasi,
        approval_kabag: true,
        is_rutin: isBantuanBerulang,
        frekuensi_berulang: isBantuanBerulang ? frekuensiBerulang : undefined,
        tanggal_pencairan: isBantuanBerulang ? tanggalPencairan : undefined,
        butuh_survei: perluSurvei,
        ...(changedProgramCode && newProg ? {
          programCode: changedProgramCode,
          jenisPermohonan: newProg.name,
          program: newProg.pilarName
        } : {})
      } : item);
      onUpdate(updatedData);
      setIsDetailModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan hasil identifikasi dan rekomendasi');
    }
  };

  const handleViewDetail = (task: ProposalMemo) => {
    setSelectedTask(task);
    setHasilIdentifikasi(task.hasil_identifikasi || '');
    setRekomendasiKabag((task.rekomendasi_kabag as any) || 'Zakat');
    setSelectedAsnaf(task.asnaf || 'Fakir');
    setChangedProgramCode('');
    // Initialize disposisi state from task
    setIsBantuanBerulang(task.is_rutin ?? false);
    setFrekuensiBerulang(task.frekuensi_berulang ?? 1);
    setTanggalPencairan(task.tanggal_pencairan ?? 1);
    setPerluSurvei(task.butuh_survei ?? true);
    setIsDetailModalOpen(true);
  };

  const handleSaveDisposisi = async (task: ProposalMemo) => {
    try {
      const payload: any = {
        is_rutin: isBantuanBerulang,
        butuh_survei: perluSurvei,
      };
      if (isBantuanBerulang) {
        payload.frekuensi_berulang = frekuensiBerulang;
        payload.tanggal_pencairan = tanggalPencairan;
      }
      
      // If survey is not required, transition status to 'Selesai' (waiting for Kabid recommendation)
      if (!perluSurvei) {
        payload.status = 'Selesai';
      } else {
        // If needs survey is changed back to true and has no recommendation yet, reset status to 'Monitoring Tugas'
        if (task.status === 'Selesai' && !task.rekomendasi_kabag) {
          payload.status = 'Monitoring_Tugas';
        }
      }

      await axios.put(`/api/proposals/${task.id}`, payload);
      const updatedTask = {
        ...task,
        is_rutin: isBantuanBerulang,
        frekuensi_berulang: isBantuanBerulang ? frekuensiBerulang : undefined,
        tanggal_pencairan: isBantuanBerulang ? tanggalPencairan : undefined,
        butuh_survei: perluSurvei,
        ...(payload.status ? { status: payload.status.replace(/_/g, ' ') } : {})
      };
      const updatedList = data.map(d => d.id === task.id ? updatedTask : d);
      onUpdate(updatedList);
      setSelectedTask(updatedTask);
      alert('Pengaturan disposisi berhasil disimpan.');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan disposisi.');
    }
  };


  const getStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'Antrean Tugas': return "bg-slate-100 text-slate-600 border-slate-200";
      case 'Pending': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'On Progress': return "bg-primary/10 text-primary border-primary/20";
      case 'Selesai': return "bg-amber-50 text-amber-700 border-amber-200";
      case 'Disetujui': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusLabel = (status: SurveyStatus) => {
    switch (status) {
      case 'Selesai': return 'Selesai (Hold)';
      case 'Disetujui': return 'Disetujui';
      default: return status;
    }
  };

  const filteredTasks = useMemo(() => {
    const statusOrder: { [key: string]: number } = {
      'Antrean Tugas': 1,
      'Pending': 2,
      'On Progress': 3,
      'Selesai': 4,
      'Disetujui': 5
    };
    let list = tasks.filter(t => statusFilter === 'Semua' || getSurveyStatus(t) === statusFilter);
    if (programTypeFilter !== 'Semua') {
      list = list.filter(t => getTaskTipe(t) === programTypeFilter);
    }
    return [...list].sort((a, b) => {
      const orderA = statusOrder[getSurveyStatus(a)] || 99;
      const orderB = statusOrder[getSurveyStatus(b)] || 99;
      return orderA - orderB;
    });
  }, [tasks, statusFilter, programTypeFilter, getSurveyStatus, getTaskTipe]);

  const konsumtifTasks = filteredTasks.filter(t => {
    return getTaskTipe(t) === 'Konsumtif';
  });
  const produktifTasks = filteredTasks.filter(t => {
    return getTaskTipe(t) === 'Produktif';
  });

  const renderTaskTable = (title: string, tableTasks: typeof filteredTasks) => {
    if (tableTasks.length === 0) return null;
    return (
      <div className="mb-0 border-b border-slate-100">
        <div className="bg-slate-50 px-6 py-3 border-y border-slate-200 sticky top-0 z-20">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">{title} ({tableTasks.length})</h4>
        </div>
        <table className="hidden md:table w-full text-left bg-white">
          <thead className="bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">No. Agenda</th>
              <th className="px-6 py-4">Mustahik & Alamat</th>
              <th className="px-6 py-4">Petugas Survei</th>
              <th className="px-6 py-4">Status Survei</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {tableTasks.map((task) => {
              const status = getSurveyStatus(task);
              return (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-mono font-bold text-[11px] border border-slate-200">
                    {task.agendaNo}
                  </span>
                </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900">{task.namaPemohon}</p>
                    </div>
                    <p className="text-xs text-slate-500">{task.alamat}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {task.surveyorName ? (
                          <>
                            <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                            <span className="font-medium text-slate-700">{task.surveyorName}</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 italic">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <UserRound className="size-4" />
                            </div>
                            <span className="text-xs font-medium">Belum Ditugaskan</span>
                          </div>
                        )}
                      </div>
                      {task.surveyorName && task.survey_data?.surveyClaimedAt && (
                        <div className="text-[10px] text-slate-400 font-semibold pl-10 -mt-1 space-y-0.5">
                          {(() => {
                            const claimedAt = new Date(task.survey_data.surveyClaimedAt);
                            const now = new Date();
                            const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
                            const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
                            const diffMs = deadline.getTime() - now.getTime();
                            
                            if (diffMs <= 0) {
                              return <span className="text-rose-600 font-bold block">KEDALUWARSA</span>;
                            }
                            
                            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                            const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                            const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
                            
                            let text = '';
                            if (diffDays > 0) {
                              text = `${diffDays}h ${diffHours}j lagi`;
                            } else if (diffHours > 0) {
                              text = `${diffHours}j ${diffMinutes}m lagi`;
                            } else {
                              text = `${diffMinutes}m lagi`;
                            }
                            return <span className="text-amber-600 font-bold block">Tenggat: {text}</span>;
                          })()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-black rounded-full uppercase border w-fit",
                        getStatusBadge(status)
                      )}>
                        {getStatusLabel(status)}
                      </span>
                      {(['Selesai', 'Disetujui'].includes(status)) && (task.score !== null || task.survey_data) && (
                        <div className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 w-fit",
                          task.urgencyLevel === 'Sangat Kritis' ? "bg-rose-50 text-rose-600" :
                          task.urgencyLevel === 'Tinggi' ? "bg-orange-50 text-orange-600" :
                          "bg-emerald-50 text-emerald-600"
                        )}>
                          <AlertCircle className="size-3" />
                          {task.urgencyLevel} {task.score ? `(${task.score})` : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {status === 'Antrean Tugas' && (
                        <button 
                          onClick={() => handleUpdateStatus(task.id, 'Survei Assessment')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                        >
                          <Send className="size-3.5" />
                          Tampilkan
                        </button>
                      )}
                      {status === 'Selesai' && !isKabagPendistribusian && !isKabagPendayagunaan && (
                        <button 
                          onClick={() => {
                            const isZakat = task.rekomendasi_kabag === 'Zakat' || !task.rekomendasi_kabag;
                            const hasAsnaf = !isZakat || task.asnaf;
                            if (!hasAsnaf || !task.hasil_identifikasi?.trim()) {
                              handleViewDetail(task);
                              return;
                            }
                            handleUpdateStatus(task.id, 'Review Kepala Pelaksana');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                        >
                          <CheckCircle className="size-3.5" />
                          Setujui
                        </button>
                      )}
                      <button 
                        onClick={() => handleViewDetail(task)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile Card List (Visible on Mobile Only) */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {tableTasks.map((task) => {
            const status = getSurveyStatus(task);
            return (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                {/* Header: No Agenda & Status */}
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-650 rounded border border-slate-150 font-mono font-bold text-[10px]">
                    {task.agendaNo}
                  </span>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={cn(
                      "px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase border",
                      getStatusBadge(status)
                    )}>
                      {getStatusLabel(status)}
                    </span>
                    {(['Selesai', 'Disetujui'].includes(status)) && (task.score !== null || task.survey_data) && (
                      <div className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 w-fit",
                        task.urgencyLevel === 'Sangat Kritis' ? "bg-rose-50 text-rose-600" :
                        task.urgencyLevel === 'Tinggi' ? "bg-orange-50 text-orange-600" :
                        "bg-emerald-50 text-emerald-600"
                      )}>
                        <AlertCircle className="size-3" />
                        {task.urgencyLevel} {task.score ? `(${task.score})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body: Mustahik & Alamat */}
                <div className="space-y-1">
                  <p className="font-bold text-slate-955 text-sm">{task.namaPemohon}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{task.alamat}</p>
                </div>

                {/* Surveyor info & Actions */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-1">
                  <div className="flex items-center gap-2">
                    {task.surveyorName ? (
                      <>
                        <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-7 h-7 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">{task.surveyorName}</span>
                          {task.survey_data?.surveyClaimedAt && (
                            <span className="text-[9px] text-slate-400 font-semibold">
                              {(() => {
                                const claimedAt = new Date(task.survey_data.surveyClaimedAt);
                                const now = new Date();
                                const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
                                const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
                                const diffMs = deadline.getTime() - now.getTime();
                                
                                if (diffMs <= 0) {
                                  return <span className="text-rose-600 font-bold">KEDALUWARSA</span>;
                                }
                                
                                const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                                const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
                                
                                let text = '';
                                if (diffDays > 0) {
                                  text = `${diffDays}h ${diffHours}j`;
                                } else if (diffHours > 0) {
                                  text = `${diffHours}j ${diffMinutes}m`;
                                } else {
                                  text = `${diffMinutes}m`;
                                }
                                return `Tenggat: ${text}`;
                              })()}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 italic">
                        <UserRound className="size-3.5" />
                        <span className="text-[11px]">Belum Ditugaskan</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {status === 'Antrean Tugas' && (
                      <button 
                        onClick={() => handleUpdateStatus(task.id, 'Survei Assessment')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl active:scale-95 transition-all"
                      >
                        <Send className="size-3" />
                        Tampilkan
                      </button>
                    )}
                    {status === 'Selesai' && !isKabagPendistribusian && !isKabagPendayagunaan && (
                      <button 
                        onClick={() => {
                          const isZakat = task.rekomendasi_kabag === 'Zakat' || !task.rekomendasi_kabag;
                          const hasAsnaf = !isZakat || task.asnaf;
                          if (!hasAsnaf || !task.hasil_identifikasi?.trim()) {
                            handleViewDetail(task);
                            return;
                          }
                          handleUpdateStatus(task.id, 'Review Kepala Pelaksana');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl active:scale-95 transition-all"
                      >
                        <CheckCircle className="size-3" />
                        Setujui
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewDetail(task)}
                      className="p-1.5 text-slate-450 hover:text-primary hover:bg-primary/5 rounded-xl active:scale-95 transition-all border border-slate-100 bg-slate-50"
                    >
                      <Eye className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const activeMonthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label || 'Pilih Periode';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {viewMode === 'all-tasks' ? (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shrink-0 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900">Semua Tugas Survei</h3>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">Total {tasks.length} data dalam antrean</p>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Periode:</span>
                  <button 
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-[11px] md:text-xs font-bold rounded-lg transition-all border text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                  >
                    <Calendar className="size-3.5 text-primary" />
                    <span>{activeMonthLabel}</span>
                    <ChevronDown className={cn("size-3 text-slate-400 transition-transform", isMonthDropdownOpen && "rotate-180")} />
                  </button>
                </div>

                {isMonthDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsMonthDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 md:w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {monthOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSelectedMonth(opt.value);
                            setIsMonthDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-[11px] md:text-xs font-semibold text-left",
                            selectedMonth === opt.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                          )}
                        >
                          <span>{opt.label}</span>
                          {selectedMonth === opt.value && <Check className="size-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => setViewMode('dashboard')} 
                className="px-3 py-1.5 md:px-4 md:py-2 hover:bg-slate-100 rounded-lg transition-colors flex font-bold text-xs md:text-sm items-center gap-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 md:border-transparent bg-slate-50 md:bg-transparent"
              >
                <ChevronLeft className="size-3.5 text-slate-400" /> Kembali
              </button>
            </div>
          </div>

          <div className="px-4 py-3 md:px-6 md:py-4 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-sm z-10">
            {/* Desktop Filters (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Filter Status:</span>
              {['Semua', 'Antrean Tugas', 'Pending', 'On Progress', 'Selesai', 'Disetujui'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border",
                    statusFilter === status 
                      ? "bg-primary text-white border-primary shadow-sm shadow-primary/20" 
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Mobile Filters (Hidden on Desktop) */}
            <div className="flex md:hidden items-center gap-3 w-full">
              {/* Dropdown Status */}
              <div className="flex-1 relative">
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Filter Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  {['Semua', 'Antrean Tugas', 'Pending', 'On Progress', 'Selesai', 'Disetujui'].map((status) => (
                    <option key={status} value={status}>{status === 'Semua' ? 'Semua Status' : status}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown Tipe Bantuan */}
              <div className="flex-1 relative">
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tipe Bantuan</label>
                <select
                  value={programTypeFilter}
                  onChange={(e) => setProgramTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="Semua">Semua Tipe</option>
                  <option value="Konsumtif">Konsumtif</option>
                  <option value="Produktif">Produktif</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
            {renderTaskTable('Bantuan Konsumtif', konsumtifTasks)}
            {renderTaskTable('Bantuan Produktif', produktifTasks)}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
          {/* Breadcrumbs & Title */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
              <span className="text-slate-400 shrink-0">Pendistribusian &amp; Pendayagunaan</span>
              <ChevronRight className="size-4 text-slate-300 shrink-0" />
              <span className="text-primary font-bold shrink-0">Monitoring Tugas</span>
            </nav>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
                  Monitoring Tugas
                </h2>
                <p className="text-slate-500 font-medium max-w-2xl">Layanan pemantauan, penugasan, dan verifikasi survei lapangan bagi para mustahik.</p>
              </div>
              <div className="relative shrink-0 self-start md:self-center">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Periode:</span>
                  <button 
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm"
                  >
                    <Calendar className="size-4 text-primary" />
                    <span>{activeMonthLabel}</span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", isMonthDropdownOpen && "rotate-180")} />
                  </button>
                </div>

                {isMonthDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsMonthDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {monthOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSelectedMonth(opt.value);
                            setIsMonthDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                            selectedMonth === opt.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                          )}
                        >
                          <span>{opt.label}</span>
                          {selectedMonth === opt.value && <Check className="size-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-xl border border-primary/5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2 rounded-lg", stat.color === 'primary' ? "bg-primary/10 text-primary" : stat.color === 'amber' ? "bg-amber-50 text-amber-600" : stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600")}>
                    {stat.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.title}</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'In Progress' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  <p className={cn("text-xs font-medium", stat.color === 'primary' ? "text-primary" : stat.color === 'amber' ? "text-amber-600" : stat.color === 'emerald' ? "text-emerald-600" : "text-slate-400")}>{stat.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-8">
            {/* Districts Grid */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-primary/5 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Sebaran Wilayah (16 Kecamatan)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Kota Semarang</span>
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <SlidersHorizontal className="size-4 text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {((isMobile && !showAllKecamatan) ? kecamatans.slice(0, 4) : kecamatans).map((kec) => (
                  <div key={kec} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">Kecamatan</p>
                    <p className="text-xs font-black text-slate-700 mt-0.5 min-h-[2rem] flex items-center leading-tight whitespace-normal break-words" title={kec}>{kec}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-405 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {tasks.filter(t => t.kecamatan === kec).length} Aktif
                      </span>
                      <ChevronRight className="size-3 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}

                {isMobile && (
                  <div className="col-span-2 flex justify-center mt-1">
                    <button
                      onClick={() => setShowAllKecamatan(!showAllKecamatan)}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary/5 border border-primary/10 w-full justify-center active:scale-[0.98] transition-all"
                    >
                      {showAllKecamatan ? 'Sembunyikan Wilayah' : 'Lihat Selengkapnya (16 Kecamatan)'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Table Terbaru */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-primary/5 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Daftar Tugas Terbaru</h3>
                <button onClick={() => setViewMode('all-tasks')} className="text-xs text-primary font-bold hover:underline">Lihat Semua</button>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">No. Agenda</th>
                      <th className="px-6 py-4">Mustahik</th>
                      <th className="px-6 py-4">Petugas</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTasks.slice(0, 5).map((task) => {
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
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{task.alamat}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {task.surveyorName ? (
                                  <>
                                    <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                                    <span className="text-xs font-medium text-slate-700">{task.surveyorName}</span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400 italic">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                      <UserRound className="size-3" />
                                    </div>
                                    <span className="text-[10px] font-medium">Belum Ditugaskan</span>
                                  </div>
                                )}
                              </div>
                              {task.surveyorName && task.survey_data?.surveyClaimedAt && (
                                <div className="text-[10px] text-slate-400 font-semibold pl-8 -mt-1 space-y-0.5">
                                  {(() => {
                                    const claimedAt = new Date(task.survey_data.surveyClaimedAt);
                                    const now = new Date();
                                    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
                                    const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
                                    const diffMs = deadline.getTime() - now.getTime();
                                    
                                    if (diffMs <= 0) {
                                      return <span className="text-rose-600 font-bold block">KEDALUWARSA</span>;
                                    }
                                    
                                    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                    const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                                    const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
                                    
                                    let text = '';
                                    if (diffDays > 0) {
                                      text = `${diffDays}h ${diffHours}j lagi`;
                                    } else if (diffHours > 0) {
                                      text = `${diffHours}j ${diffMinutes}m lagi`;
                                    } else {
                                      text = `${diffMinutes}m lagi`;
                                    }
                                    return <span className="text-amber-600 font-bold block">Tenggat: {text}</span>;
                                  })()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={cn("px-2 py-1 text-[10px] font-bold rounded-full uppercase border w-fit", getStatusBadge(status))}>{getStatusLabel(status)}</span>
                              {(['Selesai', 'Disetujui'].includes(status)) && (task.score !== null || task.survey_data) && (
                                <div className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-1 w-fit">
                                  <AlertCircle className="size-2.5" /> SCORE: {task.score}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleViewDetail(task)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Eye className="size-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (Visible on Mobile Only) */}
              <div className="block md:hidden divide-y divide-slate-100 bg-white">
                {filteredTasks.slice(0, 5).map((task) => {
                  const status = getSurveyStatus(task);
                  return (
                    <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                      {/* Header: No Agenda & Status */}
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                          {task.agendaNo}
                        </span>
                        <div className="flex flex-col gap-1 items-end">
                          <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border", getStatusBadge(status))}>{getStatusLabel(status)}</span>
                          {(['Selesai', 'Disetujui'].includes(status)) && (task.score !== null || task.survey_data) && (
                            <div className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-1 w-fit">
                              <AlertCircle className="size-2.5" /> SCORE: {task.score}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body: Mustahik & Alamat */}
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-sm">{task.namaPemohon}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{task.alamat}</p>
                      </div>

                      {/* Petugas & Actions */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-1">
                        <div className="flex items-center gap-2">
                          {task.surveyorName ? (
                            <>
                              <img src={`https://picsum.photos/seed/${task.surveyorName}/100/100`} alt={task.surveyorName} className="w-6.5 h-6.5 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-700">{task.surveyorName}</span>
                                {task.surveyorName && task.survey_data?.surveyClaimedAt && (
                                  <span className="text-[9px] text-slate-400 font-semibold">
                                    {(() => {
                                      const claimedAt = new Date(task.survey_data.surveyClaimedAt);
                                      const now = new Date();
                                      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
                                      const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
                                      const diffMs = deadline.getTime() - now.getTime();
                                      
                                      if (diffMs <= 0) {
                                        return <span className="text-rose-600 font-bold">KEDALUWARSA</span>;
                                      }
                                      
                                      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                      const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                                      const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
                                      
                                      let text = '';
                                      if (diffDays > 0) {
                                        text = `${diffDays}h ${diffHours}j`;
                                      } else if (diffHours > 0) {
                                        text = `${diffHours}j ${diffMinutes}m`;
                                      } else {
                                        text = `${diffMinutes}m`;
                                      }
                                      return `Tenggat: ${text}`;
                                    })()}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 italic">
                              <UserRound className="size-3.5" />
                              <span className="text-[11px]">Belum Ditugaskan</span>
                            </div>
                          )}
                        </div>

                        <button onClick={() => handleViewDetail(task)} className="p-1.5 bg-slate-50 text-slate-450 hover:text-primary hover:bg-primary/5 rounded-lg active:scale-95 transition-all border border-slate-100">
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* GLOBAL MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><Eye className="size-5" /></div>
                  <h3 className="text-xl font-black text-slate-900">Detail Tugas Survei</h3>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="size-5 text-slate-400" /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. Agenda</p>
                    <p className="text-2xl font-black text-primary font-mono">{selectedTask.agendaNo}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Saat Ini</p>
                    <span className={cn("inline-block px-3 py-1 text-xs font-black rounded-full uppercase border", getStatusBadge(getSurveyStatus(selectedTask)))}>{getSurveyStatus(selectedTask)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Pratinjau Dokumen Proposal */}
                    {selectedTask.fileGdriveLink && toGDriveEmbedUrl(selectedTask.fileGdriveLink) ? (
                      <div className="space-y-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <ExternalLink className="size-3.5 text-primary" />
                            Pratinjau Dokumen Proposal
                          </h4>
                          <a 
                            href={selectedTask.fileGdriveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <ExternalLink className="size-3" />
                            Buka di Tab Baru
                          </a>
                        </div>
                        <div className="w-full h-[320px] border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 relative">
                          <iframe 
                            src={toGDriveEmbedUrl(selectedTask.fileGdriveLink) || ''}
                            className="w-full h-full border-none"
                            allow="autoplay"
                            title="Pratinjau Proposal"
                          />
                        </div>
                      </div>
                    ) : selectedTask.fileGdriveLink ? (
                      <div className="space-y-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <ExternalLink className="size-3.5 text-primary" />
                            Dokumen Proposal
                          </h4>
                          <a 
                            href={selectedTask.fileGdriveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <ExternalLink className="size-3" />
                            Buka Dokumen Proposal
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {(selectedTask.score !== null || selectedTask.survey_data) && (
                      <div className="space-y-6">
                        {!(selectedTask.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedTask.jenisPengajuan?.toLowerCase().includes('kelompok')) && (
                          <div className={cn("p-5 rounded-2xl border", selectedTask.urgencyLevel === 'Sangat Kritis' ? "bg-rose-50 border-rose-100" : selectedTask.urgencyLevel === 'Tinggi' ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100")}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className={cn("size-5", selectedTask.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedTask.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")} />
                                <p className={cn("text-sm font-black uppercase tracking-widest", selectedTask.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedTask.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")}>Hasil Survei: {selectedTask.urgencyLevel}</p>
                              </div>
                              <span className="text-lg font-black">{selectedTask.score} Poin</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Per Kapita</p>
                                <p className="text-slate-700">
                                  {selectedTask.survey_data?.pendapatanTotal && selectedTask.survey_data?.jumlahTanggungan 
                                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(parseInt(selectedTask.survey_data.pendapatanTotal) / parseInt(selectedTask.survey_data.jumlahTanggungan)))
                                    : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggungan</p>
                                <p className="text-slate-700">{selectedTask.survey_data?.jumlahTanggungan || 0} Orang</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2"><Home className="size-3.5" /> Rincian Lapangan</h4>
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
                                  value: getLabelForScore(q.id, (selectedTask.survey_data as any)?.[q.id], dynamicQuestions)
                                }));
                                
                                return (
                                  <SurveyDetailSection key={secCode} title={sectionTitle} items={items} />
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Mustahik</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTask.namaPemohon}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Program Bantuan</p>
                        <p className="text-xs font-bold text-slate-800">
                          {selectedTask.programCode ? `[${selectedTask.programCode}] ` : ''}
                          {selectedTask.jenisPermohonan || '-'}
                        </p>
                        {selectedTask.program && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-100">
                            {selectedTask.program}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{selectedTask.alamat}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Petugas Lapangan</h4>
                      <div className="flex items-center gap-4 p-4 rounded-xl border bg-primary/5 border-primary/10">
                        {selectedTask.surveyorName ? (
                          <>
                            <img src={`https://picsum.photos/seed/${selectedTask.surveyorName}/100/100`} alt={selectedTask.surveyorName} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{selectedTask.surveyorName}</p>
                              <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Relawan BAZNAS</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm font-bold text-slate-400 italic">Belum Ditugaskan</p>
                        )}
                      </div>

                      {selectedTask.surveyorName && selectedTask.survey_data?.surveyClaimedAt && (
                        <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60 pb-1.5">Informasi Batas Waktu</p>
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
                            <div>
                              {(() => {
                                const dl = getSurveyDeadlineInfo((selectedTask.survey_data as any).surveyClaimedAt);
                                if (!dl) return null;
                                return (
                                  <>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tenggat Waktu</p>
                                    <p className={cn("font-black", dl.isExpired ? "text-rose-600 animate-pulse font-black" : "text-amber-600 font-black")}>
                                      {dl.remainingText} (s.d. {new Date(new Date((selectedTask.survey_data as any).surveyClaimedAt).getTime() + 3*24*60*60*1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MANAJEMEN SURVEYOR */}
                      {((isKabagPendistribusian || isKabagPendayagunaan || isSuperAdmin) && 
                        getSurveyStatus(selectedTask) !== 'Selesai' && 
                        getSurveyStatus(selectedTask) !== 'Disetujui') && (
                        <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Manajemen Penugasan
                          </p>
                          
                          <div className="flex flex-col gap-2">
                            {/* Alihkan Dropdown Cari */}
                            <div className="space-y-1 relative">
                              <label className="text-[9px] font-bold text-slate-405 uppercase tracking-wider">
                                Alihkan ke Relawan Lain
                              </label>
                              
                              <div className="relative">
                                {/* Trigger Button */}
                                <button
                                  type="button"
                                  disabled={isReassigning}
                                  onClick={() => setIsSurveyorDropdownOpen(prev => !prev)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-left flex justify-between items-center focus:ring-1 focus:ring-primary outline-none"
                                >
                                  <span className="text-slate-700">Pilih Relawan Pengganti...</span>
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
                                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold outline-none focus:bg-white focus:border-primary"
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
                                              setConfirmModal({
                                                isOpen: true,
                                                title: 'Konfirmasi Pengalihan',
                                                message: `Apakah Anda yakin ingin mengalihkan tugas survei ini ke ${s.name}?`,
                                                actionType: 'reassign',
                                                targetValue: s.name
                                              });
                                            }}
                                            className="w-full text-left p-2 hover:bg-slate-50 transition-colors text-slate-800 rounded-md block"
                                          >
                                            {s.name}
                                          </button>
                                        ))
                                      }
                                      {surveyors
                                        .filter(s => s.name !== selectedTask.surveyorName)
                                        .filter(s => s.name.toLowerCase().includes(searchSurveyorQuery.toLowerCase())).length === 0 && (
                                          <p className="text-center py-2 text-[10px] text-slate-404 italic">Relawan tidak ditemukan</p>
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
                                disabled={isReassigning}
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Konfirmasi Lepas Penugasan',
                                    message: `Apakah Anda yakin ingin melepas penugasan dari ${selectedTask.surveyorName}? Tugas ini akan kembali berstatus tersedia untuk diklaim relawan lain.`,
                                    actionType: 'release'
                                  });
                                }}
                                className="w-full mt-2 py-2 px-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg transition-all text-center flex items-center justify-center gap-1"
                              >
                                <X className="size-3" />
                                Lepas Penugasan (Reset)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Foto / Dokumen Lapangan */}
                    {(selectedTask.survey_data?.fotoRumahDepan || 
                      selectedTask.survey_data?.fotoRumahDalam || 
                      selectedTask.survey_data?.fotoMustahik ||
                      selectedTask.survey_data?.fotoKondisiUsaha ||
                      selectedTask.survey_data?.fotoProdukBantuan ||
                      selectedTask.survey_data?.fotoDokumenLainnya) && (
                      <div className="space-y-4 mt-6">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                          <Camera className="size-3.5 text-primary" />
                          Bukti Dokumentasi Lapangan
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { key: 'fotoRumahDepan', label: 'Foto Rumah Tampak Depan' },
                            { key: 'fotoRumahDalam', label: 'Foto Rumah Tampak Dalam' },
                            { key: 'fotoMustahik', label: 'Foto Mustahik' },
                            { key: 'fotoKondisiUsaha', label: 'Foto Kondisi Usaha (Produktif)' },
                            { key: 'fotoProdukBantuan', label: 'Foto Produk/Bantuan yang Diajukan' },
                            { key: 'fotoDokumenLainnya', label: 'Foto/Dokumen Pendukung Lainnya' },
                          ].map(item => {
                            const url = selectedTask.survey_data?.[item.key];
                            if (!url) return null;
                            return (
                              <div key={item.key} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{item.label}</p>
                                {url.match(/\.(jpeg|jpg|gif|png)/i) || (!url.includes('drive.google.com') && !url.includes('http')) ? (
                                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-white relative flex items-center justify-center p-2">
                                    <img
                                      src={url}
                                      alt={item.label}
                                      className="max-h-56 object-contain rounded shadow-sm"
                                    />
                                  </div>
                                ) : toGDriveEmbedUrl(url) ? (
                                  <div className="w-full h-[200px] border border-slate-200 rounded-lg overflow-hidden shadow-inner bg-white relative">
                                    <iframe 
                                      src={toGDriveEmbedUrl(url) || ''}
                                      className="w-full h-full border-none"
                                      allow="autoplay"
                                      title={item.label}
                                    />
                                  </div>
                                ) : (
                                  <a 
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-lg text-xs font-bold transition-all border border-primary/10"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <ExternalLink className="size-3.5" />
                                      Buka Dokumentasi di Tab Baru
                                    </span>
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* DISPOSISI PANEL - Pendistribusian / Pendayagunaan */}
                  {hasTaskAuthority(selectedTask) && (
                    <div className="col-span-full mt-4 pt-4 border-t border-slate-100 space-y-4">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <SlidersHorizontal className="size-4 text-primary" />
                        Pengaturan Tindak Lanjut
                      </h4>

                      {/* Survei Required Toggle */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", perluSurvei ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                              <FlaskConical className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">Perlu Survei Lapangan</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {perluSurvei
                                  ? 'Agenda ini akan masuk ke antrean survei relawan'
                                  : 'Agenda ini akan langsung masuk ke Antrean Pencairan (tanpa survei)'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPerluSurvei(p => !p)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              perluSurvei ? "bg-primary" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                perluSurvei ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                        {!perluSurvei && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-start gap-2">
                            <AlertCircle className="size-4 shrink-0 mt-0.5" />
                            <span>Agenda ini akan <strong>langsung diproses ke Antrean Pencairan</strong> tanpa melalui survei relawan. Pastikan data mustahik sudah valid sebelum menyimpan.</span>
                          </div>
                        )}
                      </div>

                      {/* Bantuan Berulang Toggle */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", isBantuanBerulang ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                              <Repeat2 className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">Bantuan Berulang (Rutin)</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {isBantuanBerulang
                                  ? 'Bantuan akan dijadwalkan masuk ke Antrean Pencairan secara otomatis setiap bulan'
                                  : 'Bantuan satu kali / tidak berulang'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsBantuanBerulang(b => !b)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              isBantuanBerulang ? "bg-primary" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                isBantuanBerulang ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {isBantuanBerulang && (
                          <div className="grid grid-cols-2 gap-4 pt-1">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Frekuensi per Tahun
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  value={frekuensiBerulang}
                                  onChange={e => setFrekuensiBerulang(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                                <span className="text-xs font-bold text-slate-500 shrink-0">x/thn</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Setiap {frekuensiBerulang > 0 ? Math.round(12 / frekuensiBerulang) : '-'} bulan sekali
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Tanggal Pencairan
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={28}
                                  value={tanggalPencairan}
                                  onChange={e => setTanggalPencairan(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                                <span className="text-xs font-bold text-slate-500 shrink-0">tgl</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Masuk antrean setiap tgl {tanggalPencairan}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Save Disposisi Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveDisposisi(selectedTask)}
                        className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="size-4" />
                        Simpan Pengaturan Tindak Lanjut
                      </button>
                    </div>
                  )}

                  {/* RKAT STATUS WIDGET */}
                  {matchedActivities.length > 0 && (
                    <div className="col-span-full mt-4 pt-4 border-t border-slate-100">
                      {renderMultipleRKATInfo(matchedActivities)}
                    </div>
                  )}

                  {/* KABAG FORM OR DISPLAY */}
                  {selectedTask.rekomendasi_kabag ? (
                    <div className="space-y-4 col-span-full mt-4 pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardList className="size-4 text-primary" />
                        Identifikasi & Rekomendasi Kepala Bidang
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Asnaf</p>
                           <p className="text-sm font-bold text-slate-800">{selectedTask.asnaf || '-'}</p>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Rekomendasi Dana</p>
                           <p className={cn("text-sm font-bold", selectedTask.rekomendasi_kabag === 'Zakat' ? "text-emerald-600" : (selectedTask.rekomendasi_kabag === 'Infak/Sedekah Tidak Terikat' || selectedTask.rekomendasi_kabag === 'Infak Tidak Terikat') ? "text-blue-600" : "text-indigo-600")}>{selectedTask.rekomendasi_kabag}</p>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-full">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Hasil Identifikasi</p>
                           <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTask.hasil_identifikasi || '-'}</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    (getSurveyStatus(selectedTask) === 'Selesai' || !perluSurvei) && 
                    hasTaskAuthority(selectedTask) && (
                      <div className="space-y-4 col-span-full mt-4 pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <ClipboardList className="size-4 text-primary" />
                          Identifikasi & Rekomendasi Kepala Bidang
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rekomendasi Dana</label>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsRekomendasiDropdownOpen(!isRekomendasiDropdownOpen);
                                setIsAsnafDropdownOpen(false);
                                setIsAlurDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100/50 transition-all outline-none"
                            >
                              <span>{rekomendasiKabag || 'Pilih Rekomendasi'}</span>
                              <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isRekomendasiDropdownOpen && "rotate-180")} />
                            </button>

                            {isRekomendasiDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsRekomendasiDropdownOpen(false)} />
                                <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 overflow-y-auto custom-scrollbar">
                                  {['Zakat', 'Infak/Sedekah Tidak Terikat', 'Infak/Sedekah Terikat'].map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        setRekomendasiKabag(opt as any);
                                        setIsRekomendasiDropdownOpen(false);
                                        if (opt !== 'Zakat') {
                                          setSelectedAsnaf('');
                                        }
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                                        rekomendasiKabag === opt ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                      )}
                                    >
                                      <span>{opt}</span>
                                      {rekomendasiKabag === opt && <Check className="size-4 text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="space-y-2 relative">
                            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest block">Pilih Asnaf</label>
                            <button 
                              type="button"
                              disabled={rekomendasiKabag !== 'Zakat'}
                              onClick={() => {
                                setIsAsnafDropdownOpen(!isAsnafDropdownOpen);
                                setIsRekomendasiDropdownOpen(false);
                                setIsAlurDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between p-2.5 border rounded-lg text-sm font-semibold transition-all outline-none",
                                rekomendasiKabag === 'Zakat'
                                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50"
                                  : "bg-slate-100 border-slate-200/80 text-slate-400 cursor-not-allowed"
                              )}
                            >
                              <span>
                                {rekomendasiKabag === 'Zakat'
                                  ? (selectedAsnaf || 'Pilih Asnaf')
                                  : '- (Hanya untuk Zakat)'
                                }
                              </span>
                              <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isAsnafDropdownOpen && "rotate-180")} />
                            </button>

                            {isAsnafDropdownOpen && rekomendasiKabag === 'Zakat' && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsAsnafDropdownOpen(false)} />
                                <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                                  {asnafOptions.map(asnaf => (
                                    <button
                                      key={asnaf}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAsnaf(asnaf);
                                        setIsAsnafDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                                        selectedAsnaf === asnaf ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                      )}
                                    >
                                      <span>{asnaf}</span>
                                      {selectedAsnaf === asnaf && <Check className="size-4 text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          {programTipeMap[getParentProgramCode(selectedTask.programCode)] === 'Produktif' && (
                            <div className="col-span-full space-y-2 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 my-2">
                              <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block">
                                Perubahan Alur Bantuan (Produktif → Konsumtif)
                              </label>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Jika mustahik dinilai tidak sanggup menjalankan program produktif setelah survei, Anda dapat mengalihkan bantuannya ke program konsumtif di bawah ini.
                              </p>
                              <div className="relative">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setIsAlurDropdownOpen(!isAlurDropdownOpen);
                                    setIsAsnafDropdownOpen(false);
                                    setIsRekomendasiDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2.5 bg-white border border-amber-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all outline-none"
                                >
                                  <span className="truncate max-w-[90%]">
                                    {changedProgramCode 
                                      ? (() => {
                                          const selectedProg = consumptivePrograms.find(p => p.code === changedProgramCode);
                                          return selectedProg 
                                            ? `[${selectedProg.pilarName}] ${selectedProg.name} (${selectedProg.code})` 
                                            : changedProgramCode;
                                        })()
                                      : `-- Tetap Gunakan Bantuan Produktif (${selectedTask.jenisPermohonan}) --`
                                    }
                                  </span>
                                  <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isAlurDropdownOpen && "rotate-180")} />
                                </button>

                                {isAlurDropdownOpen && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsAlurDropdownOpen(false)} />
                                    <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-hidden flex flex-col">
                                      <div className="p-1 border-b border-slate-100 mb-1">
                                        <input
                                          type="text"
                                          placeholder="Cari program konsumtif..."
                                          value={alurSearchQuery}
                                          onChange={(e) => setAlurSearchQuery(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-700"
                                        />
                                      </div>
                                      <div className="overflow-y-auto custom-scrollbar flex-1 max-h-52">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setChangedProgramCode('');
                                            setIsAlurDropdownOpen(false);
                                            setAlurSearchQuery('');
                                          }}
                                          className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                            !changedProgramCode ? "bg-amber-50 text-amber-800 font-bold" : "text-slate-700"
                                          )}
                                        >
                                          <span className="truncate">-- Tetap Gunakan Bantuan Produktif ({selectedTask.jenisPermohonan}) --</span>
                                          {!changedProgramCode && <Check className="size-4 text-amber-700 shrink-0" />}
                                        </button>
                                        {consumptivePrograms
                                          .filter(prog => 
                                            prog.name.toLowerCase().includes(alurSearchQuery.toLowerCase()) ||
                                            prog.code.toLowerCase().includes(alurSearchQuery.toLowerCase()) ||
                                            prog.pilarName.toLowerCase().includes(alurSearchQuery.toLowerCase())
                                          )
                                          .map(prog => (
                                            <button
                                              key={prog.code}
                                              type="button"
                                              onClick={() => {
                                                setChangedProgramCode(prog.code);
                                                setIsAlurDropdownOpen(false);
                                                setAlurSearchQuery('');
                                              }}
                                              className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left",
                                                changedProgramCode === prog.code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                              )}
                                            >
                                              <span className="truncate">[{prog.pilarName}] {prog.name} ({prog.code})</span>
                                              {changedProgramCode === prog.code && <Check className="size-4 text-primary shrink-0" />}
                                            </button>
                                          ))}
                                        {consumptivePrograms
                                          .filter(prog => 
                                            prog.name.toLowerCase().includes(alurSearchQuery.toLowerCase()) ||
                                            prog.code.toLowerCase().includes(alurSearchQuery.toLowerCase()) ||
                                            prog.pilarName.toLowerCase().includes(alurSearchQuery.toLowerCase())
                                          ).length === 0 && (
                                            <p className="text-center py-3 text-[10px] text-slate-400 italic font-medium">Program tidak ditemukan</p>
                                          )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="col-span-full space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hasil Identifikasi</label>
                            <textarea 
                              value={hasilIdentifikasi}
                              onChange={(e) => setHasilIdentifikasi(e.target.value)}
                              placeholder="Tuliskan hasil identifikasi lapangan/lembaga..."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px] resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-55 transition-all">Tutup</button>
                {(getSurveyStatus(selectedTask) === 'Selesai' || !perluSurvei) && (
                  <>
                    {hasTaskAuthority(selectedTask) ? (
                      <button onClick={() => handleApproveKabag(selectedTask)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-250 transition-all">Setujui & Teruskan</button>
                    ) : (!isKabagPendistribusian && !isKabagPendayagunaan && !isStafDistribusi) ? (
                      <button 
                        onClick={() => { 
                          const isZakat = selectedTask.rekomendasi_kabag === 'Zakat' || !selectedTask.rekomendasi_kabag;
                          if (isZakat && (!selectedTask.asnaf || !selectedTask.hasil_identifikasi?.trim())) {
                            alert('Gagal: Tugas Survei tidak dapat disetujui tanpa melakukan identifikasi asnaf and mengisi hasil identifikasi.');
                            return;
                          }
                          if (!isZakat && !selectedTask.hasil_identifikasi?.trim()) {
                            alert('Gagal: Tugas Survei tidak dapat disetujui tanpa mengisi hasil identifikasi.');
                            return;
                          }
                          handleUpdateStatus(selectedTask.id, 'Review Kepala Pelaksana'); 
                          setIsDetailModalOpen(false); 
                        }} 
                        className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                      >
                        Setujui & Teruskan
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle className="size-6" />
                <h4 className="text-lg font-black text-slate-900">{confirmModal.title}</h4>
              </div>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { actionType, targetValue } = confirmModal;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (!selectedTask) return;
                    
                    if (actionType === 'reassign' && targetValue) {
                      setIsReassigning(true);
                      try {
                        const updatedSurveyData = {
                          ...(selectedTask.survey_data || {}),
                          surveyClaimedAt: new Date().toISOString()
                        } as any;
                        await axios.put(`/api/proposals/${selectedTask.id}`, {
                          surveyorName: targetValue,
                          isBeingSurveyed: false,
                          survey_data: updatedSurveyData
                        });
                        
                        const updatedTask: ProposalMemo = { ...selectedTask, surveyorName: targetValue, isBeingSurveyed: false, survey_data: updatedSurveyData };
                        const updatedList = data.map(d => d.id === selectedTask.id ? updatedTask : d);
                        onUpdate(updatedList);
                        setSelectedTask(updatedTask);
                        alert(`Berhasil mengalihkan tugas survei ke ${targetValue}.`);
                      } catch (err) {
                        console.error(err);
                        alert('Gagal mengalihkan relawan. Silakan coba lagi.');
                      } finally {
                        setIsReassigning(false);
                      }
                    } else if (actionType === 'release') {
                      setIsReassigning(true);
                      try {
                        const updatedSurveyData = {
                          ...(selectedTask.survey_data || {})
                        } as any;
                        delete (updatedSurveyData as any).surveyClaimedAt;
                        await axios.put(`/api/proposals/${selectedTask.id}`, {
                          surveyorName: "",
                          isBeingSurveyed: false,
                          survey_data: updatedSurveyData
                        });
                        
                        const updatedTask: ProposalMemo = { ...selectedTask, surveyorName: "", isBeingSurveyed: false, survey_data: updatedSurveyData };
                        const updatedList = data.map(d => d.id === selectedTask.id ? updatedTask : d);
                        onUpdate(updatedList);
                        setSelectedTask(updatedTask);
                        alert('Berhasil melepas penugasan. Tugas ini sekarang tersedia kembali.');
                      } catch (err) {
                        console.error(err);
                        alert('Gagal melepas penugasan. Silakan coba lagi.');
                      } finally {
                        setIsReassigning(false);
                      }
                    }
                  }}
                  className="px-4 py-2 text-xs font-black text-white bg-primary hover:bg-primary/90 rounded-xl transition-all"
                >
                  YA, PROSES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
