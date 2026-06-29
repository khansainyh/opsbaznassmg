import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal, 
  MapPin, 
  Eye,
  X,
  Plus,
  Check,
  Building,
  Zap,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';

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

type SurveyStatus = 'Antrean Tugas' | 'Pending' | 'On Progress' | 'Selesai' | 'Disetujui';

interface OffBalancingProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function OffBalancing({ data, onUpdate }: OffBalancingProps) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'all-tasks'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'Semua'>('Semua');
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

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
  const [isReassigning, setIsReassigning] = useState(false);
  const [searchSurveyorQuery, setSearchSurveyorQuery] = useState('');

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
    if (item.status === 'Selesai' || item.status === 'Survei Selesai') return 'Selesai';
    if (['Review Kepala Pelaksana', 'Persetujuan Nominal', 'Persetujuan Pimpinan', 'Penentuan Nominal', 'Pencairan Dana', 'Antrean Bantuan', 'Arsip', 'Disetujui'].includes(item.status)) return 'Disetujui';
    return 'Antrean Tugas';
  };

  const stats = useMemo(() => {
    return [
      { title: "Total Tugas OBS", value: obsTasks.length.toString(), subtitle: "Semester ini", icon: <ClipboardList className="size-5" />, color: "slate" },
      { title: "Sedang Disurvei", value: obsTasks.filter(t => getSurveyStatus(t) === 'On Progress').length.toString(), subtitle: "In Progress", icon: <RefreshCw className="size-5 animate-spin-slow" />, color: "primary" },
      { title: "Menunggu Approve", value: obsTasks.filter(t => getSurveyStatus(t) === 'Selesai').length.toString(), subtitle: "Butuh Persetujuan", icon: <AlertCircle className="size-5" />, color: "amber" },
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
      setIsReassigning(false);
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
      setIsReassigning(false);
    } catch (err) {
      console.error(err);
      alert('Gagal melepas tugas relawan');
    }
  };

  const handleViewDetail = (task: ProposalMemo) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
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

  const filteredTasks = useMemo(() => {
    const list = obsTasks.filter(t => statusFilter === 'Semua' || getSurveyStatus(t) === statusFilter);
    return [...list].sort((a, b) => {
      const orderA = getSurveyStatus(a) === 'Selesai' ? 1 : 2;
      const orderB = getSurveyStatus(b) === 'Selesai' ? 1 : 2;
      return orderA - orderB;
    });
  }, [obsTasks, statusFilter]);

  const surveyorFiltered = surveyors.filter(s => 
    s.name.toLowerCase().includes(searchSurveyorQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Off-Balancing (OBS)</h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Manajemen Penugasan Penilaian Mandiri Lembaga &amp; UPZ Akhir Semester
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchOffBalanceUPZs(); setIsGenerateModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-sm active:scale-95"
          >
            <Zap className="size-4" /> Generate Tugas OBS
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition shadow-sm active:scale-95"
          >
            <Plus className="size-4" /> Buat Manual
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'dashboard' ? 'all-tasks' : 'dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
          >
            <SlidersHorizontal className="size-4" />
            {viewMode === 'dashboard' ? 'Lihat Semua Tugas' : 'Dashboard'}
          </button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <motion.div 
                key={stat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4"
              >
                <div className={cn(
                  "p-3 rounded-xl",
                  stat.color === 'slate' ? 'bg-slate-100 text-slate-600' :
                  stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                  stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                  'bg-emerald-50 text-emerald-600'
                )}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{stat.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick List */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">Antrean Verifikasi Hasil Survei OBS</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Survei yang telah diselesaikan relawan dan menunggu persetujuan</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {obsTasks.filter(t => getSurveyStatus(t) === 'Selesai').length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle2 className="size-12 text-emerald-500/30 mb-3" />
                  <p className="text-sm font-bold">Semua Bersih!</p>
                  <p className="text-xs text-slate-400 mt-1">Tidak ada survei OBS yang mengantre persetujuan.</p>
                </div>
              ) : (
                obsTasks.filter(t => getSurveyStatus(t) === 'Selesai').map(task => (
                  <div key={task.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[10px] border border-slate-200">
                          {task.agendaNo}
                        </span>
                        <h4 className="font-bold text-slate-900">{task.namaPemohon}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="size-3" /> {task.alamat} • <span className="font-bold text-primary">{task.keterangan}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Petugas: <strong className="text-slate-600">{task.surveyorName}</strong></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Check className="size-3.5" /> Setujui
                      </button>
                      <button 
                        onClick={() => handleViewDetail(task)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {(['Semua', 'Antrean Tugas', 'On Progress', 'Selesai', 'Disetujui'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition border",
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

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[10px] border border-slate-200">
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
                          {task.surveyorName ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">{task.surveyorName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">Belum Ditugaskan</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 text-[9px] font-black rounded-full uppercase border",
                            getStatusBadge(status)
                          )}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {status === 'Selesai' && (
                              <button 
                                onClick={() => handleUpdateStatus(task.id, 'Disetujui')}
                                className="p-1.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition"
                                title="Setujui"
                              >
                                <Check className="size-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleViewDetail(task)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition"
                              title="Detail / Tugaskan"
                            >
                              <Eye className="size-4" />
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

              <div className="p-6 border-b border-slate-100 bg-white shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periode Survei</label>
                    <select value={generatePeriode} onChange={e => setGeneratePeriode(e.target.value)}
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all">
                      <option value={`Semester 1 - Juni ${new Date().getFullYear()}`}>Semester 1 (Juni {new Date().getFullYear()})</option>
                      <option value={`Semester 2 - Desember ${new Date().getFullYear()}`}>Semester 2 (Desember {new Date().getFullYear()})</option>
                      <option value={`Semester 1 - Juni ${new Date().getFullYear() + 1}`}>Semester 1 (Juni {new Date().getFullYear() + 1})</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <button onClick={handleGenerateAll}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap">
                      Pilih Semua
                    </button>
                    <button onClick={() => setSelectedUPZIds(new Set())}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
                      Reset
                    </button>
                  </div>
                </div>
                {selectedUPZIds.size > 0 && (
                  <p className="text-xs font-bold text-primary">{selectedUPZIds.size} UPZ dipilih untuk generate tugas</p>
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

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <p className="text-xs text-slate-500 font-medium">
                  Hanya UPZ yang dipilih &amp; belum ada tugas yang akan di-generate
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition">
                    Batal
                  </button>
                  <button
                    onClick={handleGenerateSelected}
                    disabled={selectedUPZIds.size === 0 || generatingAll}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[10px] border border-slate-200">
                    {selectedTask.agendaNo}
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
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Penugasan Relawan Lapangan</h4>
                  
                  {selectedTask.surveyorName ? (
                    <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {selectedTask.surveyorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{selectedTask.surveyorName}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Petugas Aktif</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsReassigning(true)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          Ganti Relawan
                        </button>
                        <button
                          onClick={handleReleaseSurveyor}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                        >
                          Lepas Tugas
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                      <p className="text-xs text-slate-500 font-medium">Tugas ini belum diberikan kepada relawan manapun.</p>
                      <button
                        onClick={() => setIsReassigning(true)}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition inline-flex items-center gap-1"
                      >
                        <Plus className="size-3.5" /> Tugaskan Relawan
                      </button>
                    </div>
                  )}

                  {/* Reassign Selector Dropdown */}
                  {isReassigning && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b pb-2 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Relawan</span>
                        <button onClick={() => setIsReassigning(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Batal</button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari nama relawan..."
                          value={searchSurveyorQuery}
                          onChange={e => setSearchSurveyorQuery(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {surveyorFiltered.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">Tidak menemukan relawan</p>
                        ) : (
                          surveyorFiltered.map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleAssignSurveyor(s.name)}
                              className="w-full text-left px-3 py-2 hover:bg-primary/10 hover:text-primary rounded-lg text-xs font-bold text-slate-700 transition"
                            >
                              {s.name} ({s.role.replace(/_/g, ' ')})
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Survey Result Data if Completed */}
                {selectedTask.survey_data && (
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Hasil Pengisian Survei OBS</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      {selectedTask.score !== undefined && (
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-black text-slate-500 uppercase">Skor Kelayakan Kelompok</span>
                          <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{selectedTask.score}</span>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar text-xs">
                        {Object.entries(selectedTask.survey_data).map(([key, val]) => {
                          if (key === 'surveyClaimedAt') return null;
                          return (
                            <div key={key} className="flex justify-between py-1 border-b border-slate-200/50">
                              <span className="text-slate-500 font-semibold uppercase text-[10px]">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="text-slate-800 font-bold">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-55 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
                >
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
