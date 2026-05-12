import { useState, useMemo } from 'react';
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
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';

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
    return data.filter(item => 
      ['Monitoring Tugas', 'Proses Disposisi', 'Survei Assessment', 'Survei Selesai', 'Selesai', 'Antrean Bantuan', 'Review Kepala Pelaksana', 'Persetujuan Pimpinan', 'Penentuan Nominal', 'Pencairan Dana', 'Arsip'].includes(item.status)
    );
  }, [data]);

  const stats = useMemo(() => {
    return [
      { title: "Total Tugas", value: tasks.length.toString(), subtitle: "Bulan ini", icon: <ClipboardList className="size-5" />, color: "slate" },
      { title: "Sedang Disurvei", value: tasks.filter(t => getSurveyStatus(t) === 'On Progress').length.toString(), subtitle: "In Progress", icon: <RefreshCw className="size-5 animate-spin-slow" />, color: "primary", trend: "In Progress" },
      { title: "Menunggu Approve", value: tasks.filter(t => getSurveyStatus(t) === 'Selesai').length.toString(), subtitle: "Butuh Tindakan Segera", icon: <AlertCircle className="size-5" />, color: "amber" },
      { title: "Disetujui / Selesai", value: tasks.filter(t => getSurveyStatus(t) === 'Disetujui').length.toString(), subtitle: "Masuk Antrean Bantuan", icon: <CheckCircle2 className="size-5" />, color: "emerald" },
    ];
  }, [tasks, getSurveyStatus]);

  const kecamatans = [
    "Semarang Tengah", "Semarang Utara", "Semarang Timur", "Semarang Selatan",
    "Semarang Barat", "Gajahmungkur", "Candisari", "Tembalang",
    "Banyumanik", "Gunungpati", "Mijen", "Ngaliyan",
    "Tugu", "Genuk", "Pedurungan", "Gayamsari"
  ];

  const handleUpdateStatus = async (id: string, newStatus: ProposalMemo['status']) => {
    try {
      const backendStatus = newStatus.replace(/ /g, '_');
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, { status: backendStatus });
      const updatedData = data.map(item => item.id === id ? { ...item, status: newStatus } : item);
      onUpdate(updatedData);
    } catch (err) {
      console.error(err);
      alert('Gagal update status proposal');
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

  const getStatusLabel = (status: SurveyStatus) => {
    switch (status) {
      case 'Selesai': return 'Selesai (Hold)';
      case 'Disetujui': return 'Disetujui';
      default: return status;
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => statusFilter === 'Semua' || getSurveyStatus(t) === statusFilter);
  }, [tasks, statusFilter, getSurveyStatus]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {viewMode === 'all-tasks' ? (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Semua Tugas Survei</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Total {tasks.length} data dalam antrean</p>
              </div>
            </div>
            <button 
              onClick={() => setViewMode('dashboard')} 
              className="px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors flex font-bold text-sm items-center gap-2 text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="size-4 text-slate-400" /> Kembali
            </button>
          </div>

          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-sm z-10">
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

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
            <table className="w-full text-left bg-white">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">No. Agenda</th>
                  <th className="px-6 py-4">Mustahik & Alamat</th>
                  <th className="px-6 py-4">Petugas Survei</th>
                  <th className="px-6 py-4">Status Survei</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTasks.map((task) => {
                  const status = getSurveyStatus(task);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-mono font-bold text-[11px] border border-slate-200">
                        {task.agendaNo}
                      </span>
                    </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{task.namaPemohon}</p>
                        <p className="text-xs text-slate-500">{task.alamat}</p>
                      </td>
                      <td className="px-6 py-4">
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
                              {task.urgencyLevel} ({task.score})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {status === 'Antrean Tugas' && (
                            <button 
                              onClick={() => handleUpdateStatus(task.id, 'Survei Assessment')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                            >
                              <Send className="size-3.5" />
                              Tampilkan
                            </button>
                          )}
                          {status === 'Selesai' && (
                            <button 
                              onClick={() => handleUpdateStatus(task.id, 'Review Kepala Pelaksana')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                            >
                              <CheckCircle className="size-3.5" />
                              Approve
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewDetail(task)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
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
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
          {/* Breadcrumbs & Title */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <nav className="flex text-xs font-medium text-slate-400 gap-2 items-center">
              <span>Pendistribusian & Pendayagunaan</span>
              <ChevronRight className="size-3" />
              <span className="text-primary font-bold">Monitoring Tugas</span>
            </nav>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Monitoring Tugas Survei</h2>
            <p className="text-slate-500 font-medium max-w-2xl">Kelola antrean tugas, pantau progres relawan, dan verifikasi hasil survei lapangan.</p>
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
                {kecamatans.map((kec) => (
                  <div key={kec} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">Kecamatan</p>
                    <p className="text-xs font-black text-slate-700 mt-0.5 truncate" title={kec}>{kec}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {tasks.filter(t => t.kecamatan === kec).length} Aktif
                      </span>
                      <ChevronRight className="size-3 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Table Terbaru */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-primary/5 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Daftar Tugas Terbaru</h3>
                <button onClick={() => setViewMode('all-tasks')} className="text-xs text-primary font-bold hover:underline">Lihat Semua</button>
              </div>
              <div className="overflow-x-auto">
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
                    {tasks.slice(0, 5).map((task) => {
                      const status = getSurveyStatus(task);
                      return (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 font-mono font-bold text-[10px]">
                              {task.agendaNo}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{task.namaPemohon}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{task.alamat}</p>
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
                                    <UserRound className="size-3" />
                                  </div>
                                  <span className="text-[10px] font-medium">Belum Ditugaskan</span>
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
                    {(selectedTask.score !== null || selectedTask.survey_data) && (
                      <div className="space-y-6">
                        <div className={cn("p-5 rounded-2xl border", selectedTask.urgencyLevel === 'Sangat Kritis' ? "bg-rose-50 border-rose-100" : selectedTask.urgencyLevel === 'Tinggi' ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100")}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className={cn("size-5", selectedTask.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedTask.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")} />
                              <p className={cn("text-sm font-black uppercase tracking-widest", selectedTask.urgencyLevel === 'Sangat Kritis' ? "text-rose-600" : selectedTask.urgencyLevel === 'Tinggi' ? "text-orange-600" : "text-emerald-600")}>Hasil Survei: {selectedTask.urgencyLevel}</p>
                            </div>
                            <span className="text-lg font-black">{selectedTask.score} Pts</span>
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

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2"><Home className="size-3.5" /> Rincian Lapangan</h4>
                          <div className="space-y-2">
                            <SurveyDetailSection title="A. Kondisi Rumah" items={[
                              { label: 'Luas Bangunan', value: getLabelForScore('luasBangunan', selectedTask.survey_data?.luasBangunan) },
                              { label: 'Jenis Lantai', value: getLabelForScore('jenisLantai', selectedTask.survey_data?.jenisLantai) },
                              { label: 'Jenis Dinding', value: getLabelForScore('jenisDinding', selectedTask.survey_data?.jenisDinding) },
                              { label: 'Status Tinggal', value: getLabelForScore('statusTempatTinggal', selectedTask.survey_data?.statusTempatTinggal) },
                            ]} />
                            <SurveyDetailSection title="B. Kondisi Ekonomi" items={[
                              { label: 'Pekerjaan KRT', value: getLabelForScore('pekerjaanKepala', selectedTask.survey_data?.pekerjaanKepala) },
                              { label: 'Frekuensi Makan', value: getLabelForScore('frekuensiMakan', selectedTask.survey_data?.frekuensiMakan) },
                              { label: 'Kemampuan Lauk', value: getLabelForScore('kemampuanLauk', selectedTask.survey_data?.kemampuanLauk) },
                            ]} />
                            <SurveyDetailSection title="C. Fisik & Lainnya" items={[
                              { label: 'Keadaan Fisik', value: getLabelForScore('keadaanFisik', selectedTask.survey_data?.keadaanFisik) },
                              { label: 'Kondisi Hutang', value: getLabelForScore('hutang', selectedTask.survey_data?.hutang) },
                              { label: 'BPJS/Kesehatan', value: getLabelForScore('kesehatan', selectedTask.survey_data?.kesehatan) },
                            ]} />
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Tutup</button>
                {getSurveyStatus(selectedTask) === 'Selesai' && (
                  <button onClick={() => { handleUpdateStatus(selectedTask.id, 'Review Kepala Pelaksana'); setIsDetailModalOpen(false); }} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">Approve → Kep. Pelaksana</button>
                )}
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

function getLabelForScore(field: string, score: number | undefined): string {
  if (score === undefined || score === 0) return '-';
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
