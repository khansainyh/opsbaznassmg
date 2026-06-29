import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';
import {
  MapPin, Phone, Camera, FileText, Navigation, ChevronLeft, X, Send, Search, Map, Download, Home, History, FileEdit, Eye, ExternalLink, CheckCircle2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

function getSurveyDeadlineInfo(claimedAtStr?: string | null) {
  if (!claimedAtStr) return null;
  const claimedAt = new Date(claimedAtStr);
  const now = new Date();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      remainingText: 'KADALUARSA',
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
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterKelurahan, setFilterKelurahan] = useState('');

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

  // Kecamatan & Kelurahan options from Kota Semarang master data
  const kecamatanOptions = useMemo(() => {
    return kecamatanKelurahanSemarang.map(k => k.kecamatan).sort();
  }, []);

  const kelurahanOptions = useMemo(() => {
    if (!filterKecamatan) return [];
    const found = kecamatanKelurahanSemarang.find(k => k.kecamatan === filterKecamatan);
    return found ? [...found.kelurahan].sort() : [];
  }, [filterKecamatan]);

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
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      tasks = tasks.filter(t =>
        t.namaPemohon.toLowerCase().includes(q) ||
        t.kecamatan?.toLowerCase().includes(q) ||
        t.kelurahan?.toLowerCase().includes(q) ||
        t.alamat?.toLowerCase().includes(q)
      );
    }
    if (filterKecamatan) {
      tasks = tasks.filter(t => t.kecamatan === filterKecamatan);
    }
    if (filterKelurahan) {
      tasks = tasks.filter(t => t.kelurahan === filterKelurahan);
    }
    return tasks;
  }, [activeTab, availableTasks, myTasks, searchQuery, filterKecamatan, filterKelurahan]);

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
          {selectedTask.survey_data?.surveyClaimedAt && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informasi Batas Waktu</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Diambil</p>
                  <p className="font-extrabold text-slate-700">
                    {new Date(selectedTask.survey_data.surveyClaimedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  {(() => {
                    const dl = getSurveyDeadlineInfo(selectedTask.survey_data.surveyClaimedAt);
                    if (!dl) return null;
                    return (
                      <>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tenggat Waktu</p>
                        <p className={cn("font-black", dl.isExpired ? "text-rose-600 animate-pulse" : "text-amber-600")}>
                          {dl.remainingText} (s.d. {new Date(new Date(selectedTask.survey_data.surveyClaimedAt).getTime() + 3*24*60*60*1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })})
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

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

          {selectedTask.fileGdriveLink && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dokumen Proposal</h3>
                <a href={selectedTask.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black text-emerald-600 hover:underline flex items-center gap-1">
                  Buka di Drive <ExternalLink className="size-3" />
                </a>
              </div>
              <iframe
                src={selectedTask.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                className="w-full h-64 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
                allow="autoplay"
              />
            </div>
          )}
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

  // Reset kelurahan filter when kecamatan changes
  const handleKecamatanChange = (val: string) => {
    setFilterKecamatan(val);
    setFilterKelurahan('');
  };

  const activeFilterCount = (filterKecamatan ? 1 : 0) + (filterKelurahan ? 1 : 0);
  const userFirstName = user?.name?.split(' ')[0] || 'Relawan';

  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 h-screen flex flex-col relative shadow-xl overflow-hidden pb-16">
      {/* Top App Bar — same as TimSurvei */}
      <div className="flex justify-center items-center px-6 py-4 bg-white z-20 shrink-0">
        <h1 className="text-emerald-600 font-extrabold text-xl tracking-tight">BAZNAS Survei OBS</h1>
      </div>

      {bottomNav === 'home' ? (
        <>
          {/* Header + Tab Switcher — exactly TimSurvei style */}
          <div className="px-6 pt-4 pb-4 bg-white shrink-0">
            <h2 className="text-[28px] font-black text-slate-900 leading-tight">Hallo, {userFirstName}!</h2>
            <p className="text-slate-500 font-medium">Siap assessment OBS hari ini?</p>
          </div>

          <div className="flex px-4 border-b border-slate-200 bg-white shrink-0">
            <button
              onClick={() => { setActiveTab('tersedia'); setFilterKecamatan(''); setFilterKelurahan(''); }}
              className={cn(
                "flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors",
                activeTab === 'tersedia' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              Tugas Tersedia
            </button>
            <button
              onClick={() => { setActiveTab('tugasSaya'); setFilterKecamatan(''); setFilterKelurahan(''); }}
              className={cn(
                "flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors",
                activeTab === 'tugasSaya' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              Tugas Saya ({myTasks.length})
            </button>
          </div>
        </>
      ) : (
        <div className="px-6 pt-4 pb-4 bg-emerald-600 shrink-0 text-white">
          <h2 className="text-[28px] font-black leading-tight">Riwayat Tugas</h2>
          <p className="font-medium text-emerald-100">Assessment OBS yang pernah kamu lakukan.</p>
        </div>
      )}

      {/* Content Area with Search & Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        {/* Search bar — sticky floating, same as TimSurvei */}
        <div className="p-4 relative sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 px-5 space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 flex items-center px-4 py-3.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <Search className="size-5 text-emerald-500/70 mr-3" />
            <input
              placeholder="Cari nama / wilayah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium bg-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 ml-2">
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter dropdowns — kecamatan & kelurahan */}
          {bottomNav === 'home' && (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <select
                  value={filterKecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className={cn(
                    "w-full text-xs font-semibold pl-3 pr-7 py-2.5 rounded-xl border outline-none appearance-none cursor-pointer transition-all",
                    filterKecamatan
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-500"
                  )}
                >
                  <option value="">Semua Kecamatan</option>
                  {kecamatanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex-1 relative">
                <select
                  value={filterKelurahan}
                  onChange={(e) => setFilterKelurahan(e.target.value)}
                  disabled={!filterKecamatan && kelurahanOptions.length === 0}
                  className={cn(
                    "w-full text-xs font-semibold pl-3 pr-7 py-2.5 rounded-xl border outline-none appearance-none cursor-pointer transition-all",
                    filterKelurahan
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-500",
                    (!filterKecamatan && kelurahanOptions.length === 0) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <option value="">Semua Kelurahan</option>
                  {kelurahanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterKecamatan && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">
                  Kec. {filterKecamatan}
                  <button onClick={() => handleKecamatanChange('')}><X className="size-2.5" /></button>
                </span>
              )}
              {filterKelurahan && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">
                  Kel. {filterKelurahan}
                  <button onClick={() => setFilterKelurahan('')}><X className="size-2.5" /></button>
                </span>
              )}
              <button
                onClick={() => { handleKecamatanChange(''); setSearchQuery(''); }}
                className="text-[10px] text-slate-400 font-bold hover:text-rose-500 transition-colors"
              >
                Reset semua
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pb-6 space-y-4 shadow-inner min-h-full">
          {bottomNav === 'riwayat' && historyTasks.length === 0 ? (
            <div className="pt-12 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <History className="size-16 opacity-20" />
              <p className="text-sm font-medium">Belum ada riwayat survei yang selesai.</p>
            </div>
          ) : bottomNav === 'riwayat' && historyTasks.length > 0 ? (
            historyTasks.map((task) => {
              const editable = isEditable(task);
              const remaining = getRemainingEditTime(task);
              const urgencyColor =
                task.urgencyLevel === 'Sangat Kritis' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  task.urgencyLevel === 'Tinggi' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700';
              return (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                      NO AGENDA {task.agendaNo}
                    </div>
                    <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Survei Selesai
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-4">
                    <MapPin className="size-3" />
                    <span className="text-xs font-semibold">Kec. {task.kecamatan}</span>
                  </div>
                  <div className={cn("border rounded-xl p-3 mb-4", urgencyColor)}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Hasil Evaluasi</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black">{task.urgencyLevel || '-'}</p>
                      <span className="text-lg font-black opacity-70">{task.score || 0} Poin</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {task.surveySubmittedAt
                        ? <>Dikirim {new Date(task.surveySubmittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                        : 'Waktu tidak tersedia'}
                    </div>
                    {editable ? (
                      <button
                        onClick={() => handleEditHistory(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition active:scale-95"
                      >
                        <FileEdit className="size-3" /> EDIT ({remaining})
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold">Edit berakhir</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <AnimatePresence>
              {displayedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-12 flex flex-col items-center justify-center text-slate-400 space-y-4"
                >
                  <Map className="size-16 opacity-20" />
                  <p className="text-sm font-medium">Tidak ada tugas yang ditemukan.</p>
                  {(searchQuery || activeFilterCount > 0) && (
                    <p className="text-xs text-slate-400">Coba ubah kata kunci atau filter pencarian.</p>
                  )}
                </motion.div>
              ) : (
                displayedTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "bg-white p-5 rounded-2xl shadow-sm border transition-all",
                      task.isBeingSurveyed ? "border-amber-400/50 bg-amber-50/30" : "border-slate-100 hover:border-emerald-600/30"
                    )}
                  >
                    {/* Top row: no agenda badge + lokasi */}
                    <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                      <div className="flex flex-wrap gap-1.5">
                        <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                          NO AGENDA {task.agendaNo}
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-sky-50 text-sky-700 border-sky-200">
                          OBS
                        </span>
                      </div>
                      <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                        <MapPin className="size-3" /> Lokasi
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>

                    {/* Location detail */}
                    <div className="flex items-center gap-1.5 text-slate-400 mb-4">
                      <MapPin className="size-3" />
                      <span className="text-xs font-semibold">
                        {task.kelurahan ? `Kel. ${task.kelurahan}, ` : ''}Kec. {task.kecamatan}
                      </span>
                    </div>

                    {/* Program sub-card */}
                    <div className="bg-slate-50 border-l-[3px] border-l-emerald-600 rounded-r-lg p-3 mb-4 pl-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Program & Jenis</p>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{task.jenisPermohonan || 'Asesmen Off-Balancing'}</p>
                    </div>

                    {/* Deadline pill */}
                    {(task.survey_data as any)?.surveyClaimedAt && (
                      <div className="mb-4 text-xs p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                        {(() => {
                          const dl = getSurveyDeadlineInfo((task.survey_data as any).surveyClaimedAt);
                          if (!dl) return null;
                          return (
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sisa Waktu Pengerjaan</span>
                              <span className={cn("font-extrabold", dl.isExpired ? "text-rose-600 animate-pulse" : "text-amber-600")}>
                                {dl.remainingText}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => { setSelectedTask(task); setViewMode('detail'); }}
                        className="flex-1 max-w-[120px] py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Eye className="size-[14px]" /> DETAIL
                      </button>
                      {activeTab === 'tersedia' ? (
                        <button
                          onClick={() => handleClaimTask(task)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                        >
                          <Download className="size-[14px]" /> AMBIL TUGAS INI
                        </button>
                      ) : !task.isBeingSurveyed ? (
                        <button
                          onClick={() => handleStartSurvey(task)}
                          className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                        >
                          <Navigation className="size-[14px]" /> MULAI JALAN
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedTask(task); setViewMode('surveyForm'); }}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-[0.98]"
                        >
                          <Camera className="size-[14px]" /> ISI FORMULIR
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Fixed Navigation Bar — same as TimSurvei */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around py-3 pb-safe z-30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setBottomNav('home')}
          className={cn("flex flex-col items-center gap-1.5 w-20 transition-colors", bottomNav === 'home' ? "text-emerald-600" : "text-slate-300 hover:text-slate-400")}
        >
          <Home className="size-5" />
          <span className="text-[9px] font-black tracking-widest">HOME</span>
        </button>
        <button
          onClick={() => setBottomNav('riwayat')}
          className={cn("flex flex-col items-center gap-1.5 w-20 transition-colors relative", bottomNav === 'riwayat' ? "text-emerald-600" : "text-slate-300 hover:text-slate-400")}
        >
          <History className="size-5" />
          <span className="text-[9px] font-black tracking-widest">RIWAYAT</span>
          {historyTasks.length > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
              {historyTasks.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
