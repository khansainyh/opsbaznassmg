import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';
import { 
  MapPin, Phone, Camera, CheckCircle2, FileText, Navigation, ChevronLeft, X, Send, AlertCircle, Search, Map, Eye, Download, Home, History, FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TimSurveiProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function TimSurvei({ data, onUpdate }: TimSurveiProps) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'surveyForm'>('list');
  const [activeTab, setActiveTab] = useState<'tersedia' | 'tugasSaya'>('tersedia');
  const [bottomNav, setBottomNav] = useState<'home' | 'riwayat'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingHistory, setEditingHistory] = useState<ProposalMemo | null>(null);
  const [bpsPovertyLine, setBpsPovertyLine] = useState<number>(709785); // Default value

  React.useEffect(() => {
    const fetchBps = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:4000/api/parameters/GARIS_KEMISKINAN_BPS');
        if (res.data && res.data.value) {
          setBpsPovertyLine(parseInt(res.data.value));
        }
      } catch (err) {
        console.error('Failed to fetch BPS poverty line:', err);
      }
    };
    fetchBps();
  }, []);

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState({
    // Bagian A
    luasBangunan: 0,
    jenisLantai: 0,
    jenisDinding: 0,
    statusTempatTinggal: 0,
    fasilitasMck: 0,
    sumberAirMinum: 0,
    jenisPenerangan: 0,
    kondisiDapur: 0,
    aset: [] as number[],
    // Bagian B
    pendidikanKepala: 0,
    pekerjaanKepala: 0,
    pendapatanTotal: '',
    jumlahTanggungan: '',
    frekuensiMakan: 0,
    kemampuanLauk: 0,
    kemampuanPakaian: 0,
    asumsiBantuan: 0,
    // Bagian C
    keadaanFisik: 0,
    tanggunganKategori: 0,
    hutang: 0,
    kesehatan: 0,
    // Catatan
    catatanLapangan: ''
  });

  const pendapatanPerKapita = useMemo(() => {
    const total = parseInt(surveyForm.pendapatanTotal.replace(/\D/g, '')) || 0;
    const tanggungan = parseInt(surveyForm.jumlahTanggungan) || 1;
    return Math.round(total / tanggungan);
  }, [surveyForm.pendapatanTotal, surveyForm.jumlahTanggungan]);

  const pendapatanScore = useMemo(() => {
    if (!surveyForm.pendapatanTotal || !surveyForm.jumlahTanggungan) return 0;
    // BPS Poverty Line + 20% for Rentan Miskin
    const rentanMiskinLimit = Math.round(bpsPovertyLine * 1.2);
    
    if (pendapatanPerKapita <= bpsPovertyLine) return 3;
    if (pendapatanPerKapita <= rentanMiskinLimit) return 2;
    return 1;
  }, [pendapatanPerKapita, surveyForm.pendapatanTotal, surveyForm.jumlahTanggungan, bpsPovertyLine]);

  const asetScore = useMemo(() => {
    if (surveyForm.aset.length === 0) return 0;
    return Math.min(...surveyForm.aset);
  }, [surveyForm.aset]);

  const isAsetRedFlag = surveyForm.aset.includes(1);

  const totalScore = useMemo(() => {
    return surveyForm.luasBangunan +
      surveyForm.jenisLantai +
      surveyForm.jenisDinding +
      surveyForm.statusTempatTinggal +
      surveyForm.fasilitasMck +
      surveyForm.sumberAirMinum +
      surveyForm.jenisPenerangan +
      surveyForm.kondisiDapur +
      asetScore +
      surveyForm.pendidikanKepala +
      surveyForm.pekerjaanKepala +
      pendapatanScore +
      surveyForm.frekuensiMakan +
      surveyForm.kemampuanLauk +
      surveyForm.kemampuanPakaian +
      surveyForm.asumsiBantuan +
      surveyForm.keadaanFisik +
      surveyForm.tanggunganKategori +
      surveyForm.hutang +
      surveyForm.kesehatan;
  }, [surveyForm, asetScore, pendapatanScore]);

  const urgencyLevel = useMemo(() => {
    if (totalScore > 45) return 'Sangat Kritis';
    if (totalScore >= 30) return 'Tinggi';
    return 'Rendah';
  }, [totalScore]);

  const baseTasks = useMemo(() => {
    return data.filter(item => {
      if (item.status !== 'Survei Assessment' && item.status !== 'Proses Disposisi') return false;
      
      const isMonevTask = item.jenisPermohonan?.startsWith('2101') || item.jenisPermohonan?.startsWith('2103');
      
      if (user?.role === 'Tim_Monev') {
        return isMonevTask;
      }
      if (user?.role === 'Relawan' || user?.role === 'Relawan_Sementara') {
        return !isMonevTask;
      }
      return true;
    });
  }, [data, user?.role]);

  const availableTasks = useMemo(() => baseTasks.filter(t => !t.surveyorName), [baseTasks]);
  const myTasks = useMemo(() => baseTasks.filter(t => t.surveyorName === user?.name), [baseTasks, user]);

  const historyTasks = useMemo(() => {
    return data.filter(item => item.surveyorName === user?.name && item.status === 'Survei Selesai');
  }, [data, user]);

  // Cek apakah masih dalam 24 jam untuk edit
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
      await axios.put(`http://127.0.0.1:4000/api/proposals/${task.id}`, {
        surveyorName
      });
      const updated = data.map(d => d.id === task.id ? { ...d, surveyorName } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, surveyorName });
      setActiveTab('tugasSaya');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengambil tugas survei. Tolong REFRESH halaman ini terlebih dahulu (Cmd+R / Ctrl+R) ya!');
    }
  };

  const handleStartSurvey = async (task: ProposalMemo) => {
    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${task.id}`, {
        isBeingSurveyed: true
      });
      const updated = data.map(d => d.id === task.id ? { ...d, isBeingSurveyed: true } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, isBeingSurveyed: true });
    } catch (err: any) {
      console.error(err);
      alert('Gagal memulai survei. Tolong REFRESH halaman ini terlebih dahulu ya!');
    }
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    if (totalScore === 0) {
      alert("Harap isi setidaknya satu pertanyaan survei.");
      return;
    }
    
    
    try {
      const formData = new FormData();
      formData.append('status', 'Survei_Selesai');
      formData.append('urgencyLevel', urgencyLevel);
      formData.append('score', totalScore.toString());
      formData.append('survey_data', JSON.stringify(surveyForm));

      const response = await axios.put(`http://127.0.0.1:4000/api/proposals/${selectedTask.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
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
      
      // Reset edit mode
      setEditingHistory(null);
      setViewMode('list');
      setSelectedTask(null);
      setBottomNav('riwayat'); // Langsung buka riwayat setelah submit
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim hasil survei');
    }
  };

  const handleEditHistory = (task: ProposalMemo) => {
    // Pre-populate form dengan jawaban yang sudah ada
    if (task.survey_data) {
      setSurveyForm({
        luasBangunan: task.survey_data.luasBangunan ?? 0,
        jenisLantai: task.survey_data.jenisLantai ?? 0,
        jenisDinding: task.survey_data.jenisDinding ?? 0,
        statusTempatTinggal: task.survey_data.statusTempatTinggal ?? 0,
        fasilitasMck: task.survey_data.fasilitasMck ?? 0,
        sumberAirMinum: task.survey_data.sumberAirMinum ?? 0,
        jenisPenerangan: task.survey_data.jenisPenerangan ?? 0,
        kondisiDapur: task.survey_data.kondisiDapur ?? 0,
        aset: Array.isArray(task.survey_data.aset) ? task.survey_data.aset : [],
        pendidikanKepala: task.survey_data.pendidikanKepala ?? 0,
        pekerjaanKepala: task.survey_data.pekerjaanKepala ?? 0,
        pendapatanTotal: task.survey_data.pendapatanTotal ?? '',
        jumlahTanggungan: task.survey_data.jumlahTanggungan ?? '',
        frekuensiMakan: task.survey_data.frekuensiMakan ?? 0,
        kemampuanLauk: task.survey_data.kemampuanLauk ?? 0,
        kemampuanPakaian: task.survey_data.kemampuanPakaian ?? 0,
        asumsiBantuan: task.survey_data.asumsiBantuan ?? 0,
        keadaanFisik: task.survey_data.keadaanFisik ?? 0,
        tanggunganKategori: task.survey_data.tanggunganKategori ?? 0,
        hutang: task.survey_data.hutang ?? 0,
        kesehatan: task.survey_data.kesehatan ?? 0,
        catatanLapangan: task.survey_data.catatanLapangan ?? '',
      });
    }
    setEditingHistory(task);
    setSelectedTask(task);
    setViewMode('surveyForm');
  };

  const toggleAset = (val: number) => {
    setSurveyForm(prev => {
      const aset = prev.aset.includes(val)
        ? prev.aset.filter(a => a !== val)
        : [...prev.aset, val];
      return { ...prev, aset };
    });
  };

  const renderRadio = (name: keyof typeof surveyForm, label: string, options: {val: number, label: string}[], editMode = false) => (
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
                required={!editMode && !isSelected ? true : undefined}
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

  const formatRupiah = (val: string) => {
    const numberStr = val.replace(/\D/g, '');
    if (!numberStr) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseInt(numberStr));
  };

  const handlePendapatanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setSurveyForm(prev => ({ ...prev, pendapatanTotal: val }));
  };

  const userNameFirstWord = user?.name?.split(' ')[0] || 'Relawan';

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
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Target Survei</p>
              <h2 className="text-2xl font-black">{selectedTask.namaPemohon}</h2>
              <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1 font-bold">
                <FileText className="size-3" /> {selectedTask.jenisPermohonan}
              </p>
            </div>
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
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Kontak Darurat</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone className="size-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedTask.noTelpon || 'Tidak ada nomor'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pemohon Utama</p>
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
                <Navigation className="size-5" /> Mulai Perjalanan
              </button>
            ) : (
              <button 
                onClick={() => setViewMode('surveyForm')}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl text-base font-black shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Camera className="size-5" /> Mulai Asessment
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
                // Kembali ke riwayat saat edit mode
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
              {isEditMode ? 'Edit Hasil Survei' : 'Formulir Asessment'}
            </h3>
            {isEditMode && (
              <p className="text-[10px] text-amber-600 font-bold">Mode Edit Aktif</p>
            )}
          </div>
          <div className="size-9 font-bold text-emerald-600 flex items-center justify-center">{totalScore}</div>
        </div>

        <form id="survey-form" onSubmit={handleSubmitSurvey} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
          
          {/* BAGIAN A: KONDISI RUMAH */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian A: Kondisi Rumah</h4>
            
            {renderRadio('luasBangunan', 'Luas Bangunan', [
              { val: 3, label: '≤ 8 m² (Sangat sempit)' },
              { val: 2, label: '8 m² - 10 m²' },
              { val: 1, label: '> 10 m² (Lebih luas)' }
            ], isEditMode)}
            
            {renderRadio('jenisLantai', 'Jenis Lantai Tanah', [
              { val: 3, label: 'Tanah' },
              { val: 2, label: 'Plester / Semen' },
              { val: 1, label: 'Keramik' }
            ], isEditMode)}

            {renderRadio('jenisDinding', 'Jenis Dinding Rumah', [
              { val: 3, label: 'Papan / Tripleks / Bambu' },
              { val: 2, label: 'Tembok Bata (Belum diplester/diaci)' },
              { val: 1, label: 'Tembok Keramik / Tembok dicat rapi' }
            ], isEditMode)}

            {renderRadio('statusTempatTinggal', 'Status Tempat Tinggal', [
              { val: 4, label: 'Kost' },
              { val: 3, label: 'Kontrak / Sewa' },
              { val: 2, label: 'Menumpang' },
              { val: 1, label: 'Milik Sendiri' }
            ], isEditMode)}

            {renderRadio('fasilitasMck', 'Fasilitas MCK', [
              { val: 2, label: 'Umum / MCK Bersama' },
              { val: 1, label: 'Milik Sendiri (Di dalam rumah)' }
            ], isEditMode)}

            {renderRadio('sumberAirMinum', 'Sumber Air Minum', [
              { val: 2, label: 'Bukan Air Bersih (Sumur keruh, dll)' },
              { val: 1, label: 'Air Bersih (PDAM, sumur bor layak)' }
            ], isEditMode)}

            {renderRadio('jenisPenerangan', 'Jenis Penerangan', [
              { val: 3, label: 'Lampu Minyak / Non-Listrik' },
              { val: 2, label: 'Listrik 450 VA (Subsidi) / Numpang' },
              { val: 1, label: 'Listrik ≥ 900 VA' }
            ], isEditMode)}

            {renderRadio('kondisiDapur', 'Kondisi Dapur', [
              { val: 4, label: 'Kayu Bakar / Arang' },
              { val: 3, label: 'Minyak Tanah' },
              { val: 2, label: 'Gas 3 kg LPG (Subsidi)' },
              { val: 1, label: 'Gas 12 kg / Bright Gas' }
            ], isEditMode)}

            {/* KEPEMILIKAN ASET (MULTI-SELECT) */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                Kepemilikan Aset (Pilih semua yang sesuai)
              </label>
              {isAsetRedFlag && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold flex items-start gap-2 animate-pulse">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  Peringatan: Mustahik memiliki aset bernilai tinggi (Skor 1). Pertimbangkan kelayakan pemberian bantuan secara lebih ketat!
                </div>
              )}
              <div className="space-y-2">
                {[
                  { val: 1, label: 'Mobil Pribadi / >2 Motor Baru / HP Flagship / Tabungan > 5Jt / Tanah Kosong' },
                  { val: 2, label: '1-2 Motor Bekas / HP Murah / Tabungan < 1Jt' },
                  { val: 3, label: 'Tidak punya motor / Tidak punya HP / Tidak ada tabungan' }
                ].map(opt => (
                  <label key={opt.val} className={cn(
                    "flex items-start p-3 border rounded-xl cursor-pointer transition-all",
                    surveyForm.aset.includes(opt.val) 
                      ? (opt.val === 1 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300')
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  )}>
                    <input 
                      type="checkbox" 
                      checked={surveyForm.aset.includes(opt.val)}
                      onChange={() => toggleAset(opt.val)}
                      className={cn(
                        "mt-0.5 mr-3 w-4 h-4 rounded",
                        opt.val === 1 ? "text-rose-600 focus:ring-rose-500" : "text-emerald-600 focus:ring-emerald-500"
                      )}
                    />
                    <span className="text-sm font-medium text-slate-700 leading-snug">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* BAGIAN B: KONDISI EKONOMI */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian B: Kondisi Ekonomi</h4>
            
            {renderRadio('pendidikanKepala', 'Pendidikan Kepala Rumah Tangga', [
              { val: 3, label: 'Tidak Pernah Sekolah' },
              { val: 2, label: 'SD - SMP' },
              { val: 1, label: 'SMA - S1' }
            ], isEditMode)}

            {renderRadio('pekerjaanKepala', 'Pekerjaan Kepala Rumah Tangga', [
              { val: 3, label: 'Tidak Bekerja / Pengangguran' },
              { val: 2, label: 'Petani Gurem / Nelayan / Buruh Serabutan' },
              { val: 1, label: 'Karyawan / Pedagang Mandiri' }
            ], isEditMode)}

            {/* PENDAPATAN & TANGGUNGAN */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Pendapatan (Per Bulan)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                  <input 
                    type="text" 
                    required
                    value={surveyForm.pendapatanTotal ? formatRupiah(surveyForm.pendapatanTotal).replace('Rp', '').trim() : ''}
                    onChange={handlePendapatanChange}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Contoh: 1.500.000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Jumlah Tanggungan (Orang)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={surveyForm.jumlahTanggungan}
                  onChange={e => setSurveyForm(prev => ({ ...prev, jumlahTanggungan: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Jumlah orang yang ditanggung"
                />
              </div>

              {/* Auto Kalkulasi Income */}
              {surveyForm.pendapatanTotal && surveyForm.jumlahTanggungan && (
                <div className={cn(
                  "p-3 rounded-xl border flex items-start gap-2 mt-2",
                  pendapatanScore === 3 ? "bg-rose-50 border-rose-200 text-rose-800" :
                  pendapatanScore === 2 ? "bg-amber-50 border-amber-200 text-amber-800" :
                  "bg-emerald-50 border-emerald-200 text-emerald-800"
                )}>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pendapatan Per Kapita</p>
                    <p className="text-sm font-bold">{formatRupiah(pendapatanPerKapita.toString())} / orang</p>
                    <p className="text-xs mt-1 font-medium">
                      {pendapatanScore === 3 && "(Di Bawah Garis Kemiskinan)"}
                      {pendapatanScore === 2 && "(Rentan Miskin / Tepat di Garis)"}
                      {pendapatanScore === 1 && "(Mandiri / Di Atas Garis Kemiskinan)"}
                    </p>
                  </div>
                  <div className="text-xl font-black opacity-50 text-right">
                    +{pendapatanScore}
                  </div>
                </div>
              )}
            </div>

            {renderRadio('frekuensiMakan', 'Frekuensi Makan Dalam Sehari', [
              { val: 3, label: '1 Kali sehari' },
              { val: 2, label: '2 Kali sehari' },
              { val: 1, label: '3 Kali sehari' }
            ], isEditMode)}

            {renderRadio('kemampuanLauk', 'Kemampuan Beli Lauk Bergizi (Mingguan)', [
              { val: 3, label: '1 Kali seminggu (atau tidak pernah)' },
              { val: 2, label: '2 Kali seminggu' },
              { val: 1, label: '≥ 3 Kali seminggu' }
            ], isEditMode)}

            {renderRadio('kemampuanPakaian', 'Kemampuan Beli Pakaian Baru', [
              { val: 3, label: '1 Kali setahun (hanya sumbangan)' },
              { val: 2, label: '2 Kali setahun' },
              { val: 1, label: '≥ 3 Kali setahun' }
            ], isEditMode)}

            {renderRadio('asumsiBantuan', 'Asumsi Subsidi / Bantuan Lain', [
              { val: 4, label: 'Tidak Ada bantuan sama sekali' },
              { val: 3, label: 'Ada sumbangan rutin < Rp 50.000/bulan' },
              { val: 2, label: 'Ada bantuan dari kerabat > Rp 100.000/bulan' },
              { val: 1, label: 'Biaya hidup ditanggung anak mandiri' }
            ], isEditMode)}
          </div>

          {/* BAGIAN C: FISIK & TANGGUNGAN */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian C: Kondisi Fisik & Tanggungan</h4>
            
            {renderRadio('keadaanFisik', 'Keadaan Fisik', [
              { val: 4, label: 'Manula dan Sakit (Bedridden)' },
              { val: 3, label: 'Manula (Sehat tapi tidak kuat kerja)' },
              { val: 2, label: 'Cacat Produktif (Masih bisa aktivitas ringan)' },
              { val: 1, label: 'Sehat / Produktif (Usia kerja normal)' }
            ], isEditMode)}

            {renderRadio('tanggunganKategori', 'Tanggungan Khusus', [
              { val: 3, label: 'Anak Masih Sekolah' },
              { val: 2, label: 'Keluarga Lainnya (Orang tua sakit)' },
              { val: 1, label: 'Tidak Ada Tanggungan (Lajang/Mandiri)' }
            ], isEditMode)}

            {renderRadio('hutang', 'Kondisi Hutang', [
              { val: 2, label: 'Terjerat Rentenir / Pinjaman Online' },
              { val: 1, label: 'Non Rentenir / Bank Ringan / Tidak Ada' }
            ], isEditMode)}

            {renderRadio('kesehatan', 'Kemampuan Penuhi Kebutuhan Kesehatan', [
              { val: 2, label: 'Tidak Ada Kemampuan (Tidak punya BPJS KIS/PBI)' },
              { val: 1, label: 'Ada Kemampuan (BPJS Mandiri / Bayar sendiri)' }
            ], isEditMode)}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Hasil Evaluasi Akhir</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-600">Total Skor:</span>
                <span className="text-2xl font-black text-emerald-600">{totalScore} Pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Level Urgensi:</span>
                <span className={cn(
                  "text-sm font-black uppercase px-3 py-1 rounded-full",
                  urgencyLevel === 'Sangat Kritis' ? "bg-rose-100 text-rose-700" :
                  urgencyLevel === 'Tinggi' ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                )}>{urgencyLevel}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Catatan Lapangan Tambahan (Opsional)</label>
              <textarea 
                rows={3}
                value={surveyForm.catatanLapangan}
                onChange={e => setSurveyForm(prev => ({ ...prev, catatanLapangan: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                placeholder="Observasi unik di lapangan yang tidak tercakup dalam form..."
              ></textarea>
            </div>
          </div>

          {/* BAGIAN D: BUKTI DOKUMENTASI — SEMENTARA DINONAKTIFKAN */}
          <div className="bg-slate-100 p-5 rounded-2xl border border-dashed border-slate-300 space-y-2 opacity-60">
            <h4 className="text-lg font-black text-slate-500 flex items-center gap-2">
              <Camera className="size-5" /> Bagian D: Bukti Dokumentasi
            </h4>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-600 text-lg">🚧</span>
              <div>
                <p className="text-xs font-black text-amber-700">Fitur Sedang Dalam Pengembangan</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Upload foto dokumentasi akan aktif setelah integrasi Google Drive selesai dikonfigurasi.</p>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 left-0 right-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-20">
          <button 
            type="submit"
            form="survey-form"
            className={cn(
              "w-full py-4 text-white rounded-2xl text-base font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all",
              editingHistory
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
            )}
          >
            {editingHistory ? <FileEdit className="size-5" /> : <Send className="size-5" />}
            {editingHistory ? 'Perbarui Hasil Survei' : 'Simpan Hasil Survei'}
          </button>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 h-screen flex flex-col relative shadow-xl overflow-hidden pb-16">
      {/* Top App Bar */}
      <div className="flex justify-center items-center px-6 py-4 bg-white z-20 shrink-0">
        <h1 className="text-emerald-600 font-extrabold text-xl tracking-tight">BAZNAS Survei</h1>
      </div>

      {bottomNav === 'home' ? (
        <>
          <div className="px-6 pt-4 pb-4 bg-white shrink-0">
            <h2 className="text-[28px] font-black text-slate-900 leading-tight">Hallo, {userNameFirstWord}!</h2>
            <p className="text-slate-500 font-medium">Siap survei hari ini?</p>
          </div>

          <div className="flex px-4 border-b border-slate-200 bg-white shrink-0">
            <button 
              onClick={() => setActiveTab('tersedia')}
              className={cn(
                "flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors",
                activeTab === 'tersedia' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              Tugas Tersedia
            </button>
            <button 
              onClick={() => setActiveTab('tugasSaya')}
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
          <p className="font-medium text-emerald-100">Evaluasi survei yang pernah kamu lakukan.</p>
        </div>
      )}

      {/* Content Area with Search & Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="p-4 relative sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 px-5">
          <div className="bg-white rounded-xl border border-slate-200 flex items-center px-4 py-3.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <Search className="size-5 text-emerald-500/70 mr-3" />
            <input 
              placeholder="Cari nama / wilayah..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium bg-transparent" 
            />
          </div>
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
                      <span className="text-lg font-black opacity-70">{task.score || 0} Pts</span>
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
            {displayedTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer block",
                  task.isBeingSurveyed ? "border-amber-400/50 bg-amber-50/30" : "border-slate-100 hover:border-emerald-600/30"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                    NO AGENDA {task.agendaNo}
                  </div>
                  <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                    <MapPin className="size-3" /> Lokasi
                  </span>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>
                
                <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                  <Map className="size-[14px]" /> 
                  <span className="text-xs font-semibold">Kec. {task.kecamatan}</span>
                </div>

                <div className="bg-slate-50 border-l-[3px] border-l-emerald-600 rounded-r-lg p-3 mb-5 pl-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Program & Jenis</p>
                  <p className="text-sm font-bold text-slate-800 leading-snug">{task.jenisPermohonan || 'Pendistribusian Zakat'}</p>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => {
                      setSelectedTask(task);
                      setViewMode('detail');
                    }}
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
                      onClick={() => {
                        setSelectedTask(task);
                        setViewMode('surveyForm');
                      }}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-[0.98]"
                    >
                      <Camera className="size-[14px]" /> ISI FORMULIR
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {displayedTasks.length === 0 && (
              <div className="pt-12 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <CheckCircle2 className="size-16 opacity-20" />
                <p className="text-sm font-medium">Tidak ada tugas yang ditemukan.</p>
              </div>
            )}
          </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Fixed Navigation Bar */}
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
