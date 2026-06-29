import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';
import {
  MapPin, Phone, Camera, FileText, Navigation, ChevronLeft, X, Send, Search, Map, Download, Home, History, FileEdit, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SurveiObsProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function SurveiObs({ data, onUpdate }: SurveiObsProps) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'surveyForm'>('list');
  const [activeTab, setActiveTab] = useState<'tersedia' | 'tugasSaya'>('tersedia');
  const [bottomNav, setBottomNav] = useState<'home' | 'riwayat'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingHistory, setEditingHistory] = useState<ProposalMemo | null>(null);

  // Custom Survey Questions template for Off-Balancing (OBS)
  const obsQuestions = [
    { 
      id: 'keaktifanPengurus', 
      section: 'A', 
      sectionTitle: 'Bagian A: Aspek Organisasi & SDM', 
      label: 'Keaktifan Pengurus / Petugas UPZ', 
      options: [
        { val: 3, label: 'Sangat Aktif (Struktur lengkap, rutin rapat koordinasi)' }, 
        { val: 2, label: 'Cukup Aktif (Struktur ada, rapat kondisional)' }, 
        { val: 1, label: 'Tidak Aktif (Pengurus pasif, tidak ada koordinasi)' }
      ] 
    },
    { 
      id: 'kesesuaianPenyaluran', 
      section: 'A', 
      sectionTitle: 'Bagian A: Aspek Organisasi & SDM', 
      label: 'Kesesuaian Penyaluran Asnaf', 
      options: [
        { val: 3, label: 'Sangat Sesuai (8 Asnaf terpenuhi dengan verifikasi ketat)' }, 
        { val: 2, label: 'Cukup Sesuai (Penyaluran umum tanpa verifikasi detil)' }, 
        { val: 1, label: 'Tidak Sesuai / Asal Salur' }
      ] 
    },
    { 
      id: 'pelaporanKeuangan', 
      section: 'B', 
      sectionTitle: 'Bagian B: Administrasi & Pelaporan keuangan', 
      label: 'Rutinitas Pelaporan Keuangan UPZ', 
      options: [
        { val: 3, label: 'Rutin Bulanan (Tepat waktu via Sistem BAZNAS)' }, 
        { val: 2, label: 'Semesteran (Hanya dilaporkan di akhir periode)' }, 
        { val: 1, label: 'Tidak Pernah / Jarang Sekali' }
      ] 
    },
    { 
      id: 'dokumentasiKegiatan', 
      section: 'B', 
      sectionTitle: 'Bagian B: Administrasi & Pelaporan keuangan', 
      label: 'Kelengkapan Dokumentasi Kegiatan & Kwitansi', 
      options: [
        { val: 3, label: 'Lengkap (Semua penyaluran memiliki kwitansi + foto)' }, 
        { val: 2, label: 'Kurang Lengkap (Dokumentasi seadanya)' }, 
        { val: 1, label: 'Tidak Ada / Hilang' }
      ] 
    },
    { 
      id: 'rencanaKerja', 
      section: 'B', 
      sectionTitle: 'Bagian B: Administrasi & Pelaporan keuangan', 
      label: 'Memiliki Rencana Kerja Anggaran Tahunan (RKAT)', 
      options: [
        { val: 2, label: 'Memiliki RKAT Aktif & Disetujui' }, 
        { val: 1, label: 'Tidak Memiliki RKAT' }
      ] 
    }
  ];

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState<Record<string, any>>({
    keaktifanPengurus: 0,
    kesesuaianPenyaluran: 0,
    pelaporanKeuangan: 0,
    dokumentasiKegiatan: 0,
    rencanaKerja: 0,
    catatanLapangan: ''
  });

  const totalScore = useMemo(() => {
    let scoreSum = 0;
    obsQuestions.forEach(q => {
      scoreSum += Number(surveyForm[q.id]) || 0;
    });
    return scoreSum;
  }, [surveyForm]);

  const urgencyLevel = useMemo(() => {
    if (totalScore >= 12) return 'Sangat Kritis';
    if (totalScore >= 8) return 'Tinggi';
    return 'Rendah';
  }, [totalScore]);

  // Filter only OBS tasks
  const obsTasks = useMemo(() => {
    return data.filter(item => item.jenisPengajuan === 'OBS');
  }, [data]);

  const availableTasks = useMemo(() => {
    return obsTasks.filter(t => !t.surveyorName && (t.status === 'Monitoring Tugas' || t.status === 'Pending'));
  }, [obsTasks]);

  const myTasks = useMemo(() => {
    return obsTasks.filter(t => t.surveyorName === user?.name && t.status === 'Survei Assessment');
  }, [obsTasks, user]);

  const historyTasks = useMemo(() => {
    return obsTasks.filter(t => t.surveyorName === user?.name && (t.status === 'Survei Selesai' || t.status === 'Selesai' || t.status === 'Disetujui'));
  }, [obsTasks, user]);

  const isEditable = (task: ProposalMemo): boolean => {
    if (!task.surveySubmittedAt) return false;
    const submitted = new Date(task.surveySubmittedAt);
    const now = new Date();
    const diffHours = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const getRemainingEditTime = (task: ProposalMemo): string => {
    if (!task.surveySubmittedAt) return '';
    const submitted = new Date(task.surveySubmittedAt);
    const deadline = new Date(submitted.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return '';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  const displayedTasks = useMemo(() => {
    let tasks = activeTab === 'tersedia' ? availableTasks : myTasks;
    if (searchQuery.trim()) {
      tasks = tasks.filter(t =>
        t.namaPemohon.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.kecamatan?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return tasks;
  }, [activeTab, availableTasks, myTasks, searchQuery]);

  const handleClaimTask = async (task: ProposalMemo) => {
    try {
      const surveyorName = user?.name || 'Relawan';
      const updatedSurveyData = {
        ...(task.survey_data || {}),
        surveyClaimedAt: new Date().toISOString()
      } as any;
      await axios.put(`/api/proposals/${task.id}`, {
        surveyorName,
        status: 'Survei_Assessment',
        survey_data: updatedSurveyData
      });
      const updated = data.map(d => d.id === task.id ? { ...d, surveyorName, status: 'Survei Assessment', survey_data: updatedSurveyData } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, surveyorName, status: 'Survei Assessment', survey_data: updatedSurveyData });
      setActiveTab('tugasSaya');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengambil tugas survei OBS. Tolong coba lagi ya!');
    }
  };

  const handleStartSurvey = async (task: ProposalMemo) => {
    try {
      await axios.put(`/api/proposals/${task.id}`, {
        isBeingSurveyed: true
      });
      const updated = data.map(d => d.id === task.id ? { ...d, isBeingSurveyed: true } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, isBeingSurveyed: true });
    } catch (err: any) {
      console.error(err);
      alert('Gagal memulai survei OBS.');
    }
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const payload = {
        status: 'Survei_Selesai',
        urgencyLevel: urgencyLevel,
        score: totalScore,
        survey_data: JSON.stringify(surveyForm)
      };

      const response = await axios.put(`/api/proposals/${selectedTask.id}`, payload);
      const now = new Date().toISOString();
      const updatedSurveyData = response.data.survey_data || surveyForm;

      const updated = data.map(d => d.id === selectedTask.id ? {
        ...d,
        status: 'Survei Selesai' as const,
        urgencyLevel: urgencyLevel as any,
        score: totalScore,
        surveySubmittedAt: now,
        survey_data: updatedSurveyData
      } : d);
      onUpdate(updated);

      setEditingHistory(null);
      setViewMode('list');
      setSelectedTask(null);
      setBottomNav('riwayat');
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim hasil survei OBS');
    }
  };

  const handleEditHistory = (task: ProposalMemo) => {
    if (task.survey_data) {
      setSurveyForm({
        keaktifanPengurus: task.survey_data.keaktifanPengurus ?? 0,
        kesesuaianPenyaluran: task.survey_data.kesesuaianPenyaluran ?? 0,
        pelaporanKeuangan: task.survey_data.pelaporanKeuangan ?? 0,
        dokumentasiKegiatan: task.survey_data.dokumentasiKegiatan ?? 0,
        rencanaKerja: task.survey_data.rencanaKerja ?? 0,
        catatanLapangan: task.survey_data.catatanLapangan ?? '',
      });
    }
    setEditingHistory(task);
    setSelectedTask(task);
    setViewMode('surveyForm');
  };

  const renderRadio = (name: string, label: string, options: { val: number, label: string }[]) => (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="space-y-2">
        {options.map(opt => {
          const isSelected = surveyForm[name] === opt.val;
          return (
            <label key={opt.val} className={cn(
              "flex items-center p-3 border rounded-xl cursor-pointer transition-all",
              isSelected
                ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                : "bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200"
            )}>
              <input
                type="radio"
                name={name}
                value={opt.val}
                checked={isSelected}
                onChange={() => setSurveyForm(prev => ({ ...prev, [name]: opt.val }))}
                className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                required={!isSelected ? true : undefined}
              />
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-emerald-800 font-bold" : "text-slate-700"
              )}>{opt.label}</span>
              {isSelected && <span className="ml-auto text-emerald-500 text-xs font-black">✓</span>}
            </label>
          );
        })}
      </div>
    </div>
  );

  if (viewMode === 'detail' && selectedTask) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-emerald-600 pt-12 pb-6 px-6 text-white rounded-b-3xl shrink-0 shadow-lg relative z-10">
          <button
            onClick={() => setViewMode('list')}
            className="mb-4 flex items-center gap-2 text-emerald-50 bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition shadow-sm backdrop-blur-sm w-fit font-bold text-sm"
          >
            <ChevronLeft className="size-4" /> Kembali
          </button>
          <div>
            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Target Survei OBS</p>
            <h2 className="text-2xl font-black">{selectedTask.namaPemohon}</h2>
            <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1 font-bold">
              <FileText className="size-3" /> {selectedTask.keterangan}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Lokasi Tujuan</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <MapPin className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-snug">{selectedTask.alamat}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">{selectedTask.kelurahan}, {selectedTask.kecamatan}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Hubungi Penanggung Jawab</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone className="size-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedTask.noTelpon || 'Tidak ada nomor'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Telepon UPZ / Pengurus</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end">
          <div className="p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-auto">
            {!selectedTask.surveyorName ? (
              <button
                onClick={() => handleClaimTask(selectedTask)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download className="size-5" /> Ambil Tugas Ini
              </button>
            ) : !selectedTask.isBeingSurveyed ? (
              <button
                onClick={() => handleStartSurvey(selectedTask)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Navigation className="size-5" /> Mulai Perjalanan OBS
              </button>
            ) : (
              <button
                onClick={() => setViewMode('surveyForm')}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl text-base font-black shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Camera className="size-5" /> Isi Assessment OBS
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'surveyForm' && selectedTask) {
    const isEditMode = !!editingHistory;

    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 shrink-0">
          <button
            onClick={() => {
              if (isEditMode) {
                setEditingHistory(null);
                setSelectedTask(null);
                setViewMode('list');
                setBottomNav('riwayat');
              } else {
                setViewMode('detail');
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="size-5 text-slate-400" />
          </button>
          <div className="text-center">
            <h3 className="font-black text-slate-800">
              {isEditMode ? 'Edit Survei OBS' : 'Asessment Off-Balancing'}
            </h3>
            {isEditMode && (
              <p className="text-[10px] text-amber-600 font-bold">Mode Edit Aktif</p>
            )}
          </div>
          <div className="size-9 font-bold text-emerald-600 flex items-center justify-center">{totalScore}</div>
        </div>

        <form id="obs-survey-form" onSubmit={handleSubmitSurvey} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-sm font-black text-slate-800 border-b pb-2 uppercase tracking-wider">Lembar Evaluasi Mandiri</h4>
            {obsQuestions.map(q => renderRadio(q.id, q.label, q.options))}
            
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Catatan Penilai / Relawan Lapangan</label>
              <textarea
                rows={3}
                value={surveyForm.catatanLapangan}
                onChange={e => setSurveyForm(prev => ({ ...prev, catatanLapangan: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all resize-none"
                placeholder="Deskripsikan kondisi tata kelola & kendala UPZ di lapangan secara objektif..."
              />
            </div>
          </div>

          <div className="p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-auto shrink-0">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send className="size-5" /> {isEditMode ? 'Simpan Perubahan' : 'Kirim Laporan OBS'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative shadow-2xl">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 pt-12 pb-8 px-6 text-white shrink-0 relative overflow-hidden rounded-b-[2rem] shadow-xl">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black">Asesmen OBS BAZNAS</h2>
            <p className="text-emerald-100 text-xs font-bold mt-0.5">Hai {user?.name?.split(' ')[0] || 'Relawan'}, pastikan survei objektif!</p>
          </div>
        </div>
      </div>

      {bottomNav === 'home' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white/40 -mt-4 rounded-t-3xl overflow-hidden relative z-10 pt-4">
          {/* Tab Switcher */}
          <div className="px-6 flex gap-2 border-b border-slate-100 pb-3 shrink-0">
            <button
              onClick={() => setActiveTab('tersedia')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider text-center border",
                activeTab === 'tersedia'
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600"
              )}
            >
              Tersedia ({availableTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('tugasSaya')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider text-center border",
                activeTab === 'tugasSaya'
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600"
              )}
            >
              Tugas Saya ({myTasks.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="px-6 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-400 size-4" />
              <input
                type="text"
                placeholder="Cari nama lembaga / kecamatan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 custom-scrollbar">
            {displayedTasks.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Map className="size-16 mx-auto stroke-1 opacity-40 mb-3" />
                <p className="text-sm font-bold">Tidak Ada Tugas OBS</p>
                <p className="text-xs text-slate-400 mt-1">Gunakan kata kunci pencarian lain atau kembali nanti.</p>
              </div>
            ) : (
              displayedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setViewMode('detail'); }}
                  className="bg-white p-5 rounded-2xl border border-slate-150/60 shadow-sm hover:border-emerald-200 transition cursor-pointer flex flex-col gap-3 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded border mb-1">
                        {task.agendaNo}
                      </span>
                      <h4 className="font-extrabold text-slate-800 leading-snug">{task.namaPemohon}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{task.keterangan}</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ChevronRight className="size-4" />
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-50 pt-2 font-medium">
                    <MapPin className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{task.alamat} • {task.kecamatan}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // RIWAYAT VIEW
        <div className="flex-1 flex flex-col min-h-0 bg-white/40 -mt-4 rounded-t-3xl overflow-hidden relative z-10 pt-4">
          <div className="px-6 pb-2 border-b border-slate-100 shrink-0">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Riwayat Survei OBS Saya</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 custom-scrollbar">
            {historyTasks.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <History className="size-16 mx-auto stroke-1 opacity-40 mb-3" />
                <p className="text-sm font-bold">Belum Ada Riwayat</p>
                <p className="text-xs text-slate-400 mt-1">Riwayat tugas assessment OBS Anda akan muncul di sini.</p>
              </div>
            ) : (
              historyTasks.map(task => {
                const editable = isEditable(task);
                const remainingTime = getRemainingEditTime(task);

                return (
                  <div
                    key={task.id}
                    className="bg-white p-5 rounded-2xl border border-slate-150/60 shadow-sm flex flex-col gap-3 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded border">
                            {task.agendaNo}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded">
                            Selesai
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 leading-snug">{task.namaPemohon}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{task.keterangan}</p>
                      </div>
                      
                      {editable && (
                        <button
                          onClick={() => handleEditHistory(task)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 transition"
                        >
                          <FileEdit className="size-3.5" /> Edit
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-50 pt-2 font-medium">
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{task.alamat}</span>
                      </div>
                      {editable && remainingTime && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                          Sisa edit: {remainingTime}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Dynamic Bottom Navigation */}
      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-100 py-3 px-12 flex justify-between items-center z-40 shadow-lg">
        <button
          onClick={() => setBottomNav('home')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            bottomNav === 'home' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <Home className="size-5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Beranda</span>
        </button>

        <button
          onClick={() => setBottomNav('riwayat')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            bottomNav === 'riwayat' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <History className="size-5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Riwayat</span>
        </button>
      </div>
    </div>
  );
}
