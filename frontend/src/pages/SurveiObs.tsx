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

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState<Record<string, any>>({
    namaUpz: '',
    namaKetuaUpz: '',
    noWa: '',
    alamat: '',
    kecamatan: '',
    saldoAwal: 0,
    penerimaan_zakatMaal: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
    penerimaan_zakatFitrah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
    penerimaan_infakSedekah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
    penerimaan_infakBarangJasa: { items: [] as { jenisBarang: string; merekSpesifikasi: string; jumlah: string; keterangan: string }[] },
    penerimaan_qurban: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
    penerimaan_fidyah: { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
    penyaluran_zakatMaal: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
    penyaluran_zakatFitrah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
    penyaluran_infakSedekah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
    penyaluran_qurban: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
    penyaluran_fidyah: { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
  });

  const totalPenerimaanSaldoAwal = useMemo(() => {
    return Number(surveyForm.saldoAwal) || 0;
  }, [surveyForm.saldoAwal]);

  const totalPenerimaanJumlahPenerimaan = useMemo(() => {
    let sum = 0;
    penerimaanRows.forEach(row => {
      const rowData = surveyForm[row.key] || { jumlahPenerimaan: 0 };
      sum += Number(rowData.jumlahPenerimaan) || 0;
    });
    return sum;
  }, [surveyForm]);

  const totalPenerimaanJumlahDonatur = useMemo(() => {
    let sum = 0;
    penerimaanRows.forEach(row => {
      const rowData = surveyForm[row.key] || { jumlahDonatur: 0 };
      sum += Number(rowData.jumlahDonatur) || 0;
    });
    return sum;
  }, [surveyForm]);

  const totalPenyaluranJumlahPenyaluran = useMemo(() => {
    let sum = 0;
    penyaluranRows.forEach(row => {
      const rowData = surveyForm[row.key] || { jumlahPenyaluran: 0 };
      sum += Number(rowData.jumlahPenyaluran) || 0;
    });
    return sum;
  }, [surveyForm]);

  const totalPenyaluranJumlahMustahik = useMemo(() => {
    let sum = 0;
    penyaluranRows.forEach(row => {
      const rowData = surveyForm[row.key] || { jumlahMustahik: 0 };
      sum += Number(rowData.jumlahMustahik) || 0;
    });
    return sum;
  }, [surveyForm]);

  const calculatedSaldoAkhir = useMemo(() => {
    return (totalPenerimaanSaldoAwal + totalPenerimaanJumlahPenerimaan) - totalPenyaluranJumlahPenyaluran;
  }, [totalPenerimaanSaldoAwal, totalPenerimaanJumlahPenerimaan, totalPenyaluranJumlahPenyaluran]);

  const handlePenerimaanChange = (rowKey: string, field: string, value: any) => {
    setSurveyForm((prev: any) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || { saldoAwal: 0, jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' }),
        [field]: value
      }
    }));
  };

  const handlePenyaluranChange = (rowKey: string, field: string, value: any) => {
    setSurveyForm((prev: any) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' }),
        [field]: value
      }
    }));
  };

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

  const handleOpenNewSurvey = (task: ProposalMemo) => {
    setSurveyForm({
      namaUpz: task.namaPemohon || '',
      namaKetuaUpz: '',
      noWa: task.noTelpon || '',
      alamat: task.alamat || '',
      kecamatan: task.kecamatan || '',
      saldoAwal: 0,
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
    setEditingHistory(null);
    setViewMode('surveyForm');
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const finalSurveyData = {
        ...surveyForm,
        totalPenerimaanSaldoAwal,
        totalPenerimaan: totalPenerimaanJumlahPenerimaan,
        totalPenerimaanJumlahDonatur,
        totalPenyaluran: totalPenyaluranJumlahPenyaluran,
        totalPenyaluranJumlahMustahik,
        saldoAkhir: calculatedSaldoAkhir,
        updatedAt: new Date().toISOString()
      };

      const payload = {
        status: 'Survei_Selesai',
        urgencyLevel: 'Rendah',
        score: 100,
        survey_data: JSON.stringify(finalSurveyData)
      };

      const response = await axios.put(`/api/proposals/${selectedTask.id}`, payload);
      const now = new Date().toISOString();
      const updatedSurveyData = response.data.survey_data || finalSurveyData;

      const updated = data.map(d => d.id === selectedTask.id ? {
        ...d,
        status: 'Survei Selesai' as const,
        urgencyLevel: 'Rendah' as any,
        score: 100,
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
        namaUpz: task.survey_data.namaUpz || task.namaPemohon || '',
        namaKetuaUpz: task.survey_data.namaKetuaUpz || '',
        noWa: task.survey_data.noWa || task.noTelpon || '',
        alamat: task.survey_data.alamat || task.alamat || '',
        kecamatan: task.survey_data.kecamatan || task.kecamatan || '',
        saldoAwal: task.survey_data.saldoAwal || 0,
        penerimaan_zakatMaal: task.survey_data.penerimaan_zakatMaal || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
        penerimaan_zakatFitrah: task.survey_data.penerimaan_zakatFitrah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
        penerimaan_infakSedekah: task.survey_data.penerimaan_infakSedekah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' },
        penerimaan_infakBarangJasa: task.survey_data.penerimaan_infakBarangJasa || { items: [] },
        penerimaan_qurban: task.survey_data.penerimaan_qurban || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
        penerimaan_fidyah: task.survey_data.penerimaan_fidyah || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '', beras: 0 },
        penyaluran_zakatMaal: task.survey_data.penyaluran_zakatMaal || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
        penyaluran_zakatFitrah: task.survey_data.penyaluran_zakatFitrah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
        penyaluran_infakSedekah: task.survey_data.penyaluran_infakSedekah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' },
        penyaluran_qurban: task.survey_data.penyaluran_qurban || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', kambingDomba: 0, sapiKerbau: 0 },
        penyaluran_fidyah: task.survey_data.penyaluran_fidyah || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '', beras: 0 },
      });
    }
    setEditingHistory(task);
    setSelectedTask(task);
    setViewMode('surveyForm');
  };

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
                onClick={() => handleOpenNewSurvey(selectedTask)}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl text-base font-black shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Camera className="size-5" /> Isi Laporan OBS
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
              {isEditMode ? 'Edit Laporan OBS' : 'Laporan OBS'}
            </h3>
            {isEditMode && (
              <p className="text-[10px] text-amber-600 font-bold">Mode Edit Aktif</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded font-black uppercase">
              OBS
            </span>
          </div>
        </div>

        <form id="obs-survey-form" onSubmit={handleSubmitSurvey} className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 custom-scrollbar">
          
          {/* Section 1: Informasi UPZ + Saldo Awal */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-2">Informasi UPZ Masjid/Musholla</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama UPZ</label>
                <input
                  type="text"
                  readOnly
                  value={surveyForm.namaUpz || ''}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama Ketua UPZ / Takmir</label>
                <input
                  type="text"
                  required
                  placeholder="Nama ketua UPZ..."
                  value={surveyForm.namaKetuaUpz || ''}
                  onChange={e => setSurveyForm(prev => ({ ...prev, namaKetuaUpz: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">No. WA Ketua</label>
                <input
                  type="text"
                  placeholder="Nomor Whatsapp..."
                  value={surveyForm.noWa || ''}
                  onChange={e => setSurveyForm(prev => ({ ...prev, noWa: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Alamat Masjid</label>
                <textarea
                  rows={2}
                  value={surveyForm.alamat || ''}
                  onChange={e => setSurveyForm(prev => ({ ...prev, alamat: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kecamatan</label>
                <input
                  type="text"
                  readOnly
                  value={surveyForm.kecamatan || ''}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 outline-none"
                />
              </div>

              {/* Single global Saldo Awal */}
              <div className="pt-3 border-t border-slate-100">
                <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Saldo Awal Periode (Keseluruhan)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-extrabold text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={formatRupiah(surveyForm.saldoAwal)}
                    onChange={e => setSurveyForm(prev => ({ ...prev, saldoAwal: parseRupiah(e.target.value) }))}
                    className="w-full bg-emerald-50 border border-emerald-200 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Saldo kas awal periode (Jan) sebelum penerimaan berjalan.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Tabel Penerimaan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">A. LAPORAN PENERIMAN (JAN - JUNI)</h4>
            </div>

            <div className="space-y-4">
              {penerimaanRowsAtas.map((row) => {
                const rowData = surveyForm[row.key] || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' };
                return (
                  <div key={row.key} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-50">
                      <span className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                      <span className="font-bold text-slate-800 text-xs">{row.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Penerimaan (Rp)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={formatRupiah(rowData.jumlahPenerimaan)}
                            onChange={e => handlePenerimaanChange(row.key, 'jumlahPenerimaan', parseRupiah(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Donatur (Orang)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={rowData.jumlahDonatur || ''}
                          onChange={e => handlePenerimaanChange(row.key, 'jumlahDonatur', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Keterangan</label>
                      <input
                        type="text"
                        placeholder="Keterangan..."
                        value={rowData.keterangan || ''}
                        onChange={e => handlePenerimaanChange(row.key, 'keterangan', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Extra: Beras for Zakat Fitrah */}
                    {row.key === 'penerimaan_zakatFitrah' && (
                      <div className="space-y-1 border-t border-slate-50 pt-2">
                        <label className="text-[9px] font-bold text-emerald-600 uppercase">Beras (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={rowData.beras || ''}
                          onChange={e => handlePenerimaanChange(row.key, 'beras', Number(e.target.value))}
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Infak / Sedekah Barang & Jasa — dynamic items */}
              {(() => {
                const items: { jenisBarang: string; merekSpesifikasi: string; jumlah: string; keterangan: string }[] =
                  surveyForm.penerimaan_infakBarangJasa?.items || [];
                const setItems = (newItems: typeof items) =>
                  setSurveyForm(prev => ({ ...prev, penerimaan_infakBarangJasa: { items: newItems } }));
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                        <span className="font-bold text-slate-800 text-xs">4. Infak/ Sedekah Barang &amp; Jasa</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{items.length} item</span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Penerimaan yang berupa barang/jasa untuk keperluan Masjid/Musholla.</p>
                    {items.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">Belum ada item. Klik tombol di bawah untuk menambah.</p>
                    )}
                    {items.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-500 uppercase">Item #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-600 text-[9px] font-bold"
                          >✕ Hapus</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Jenis Barang/Jasa</label>
                            <input
                              type="text"
                              placeholder="Contoh: Karpet, AC..."
                              value={item.jenisBarang}
                              onChange={e => { const n = [...items]; n[idx] = { ...n[idx], jenisBarang: e.target.value }; setItems(n); }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Merek / Spesifikasi</label>
                            <input
                              type="text"
                              placeholder="Merek atau spesifikasi..."
                              value={item.merekSpesifikasi}
                              onChange={e => { const n = [...items]; n[idx] = { ...n[idx], merekSpesifikasi: e.target.value }; setItems(n); }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Jumlah</label>
                            <input
                              type="text"
                              placeholder="Contoh: 2 unit..."
                              value={item.jumlah}
                              onChange={e => { const n = [...items]; n[idx] = { ...n[idx], jumlah: e.target.value }; setItems(n); }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Keterangan</label>
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={item.keterangan}
                              onChange={e => { const n = [...items]; n[idx] = { ...n[idx], keterangan: e.target.value }; setItems(n); }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setItems([...items, { jenisBarang: '', merekSpesifikasi: '', jumlah: '', keterangan: '' }])}
                      className="w-full py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-50 transition flex items-center justify-center gap-1.5"
                    >+ Tambah Barang/Jasa</button>
                  </div>
                );
              })()}

              {penerimaanRowsBawah.map((row) => {
                const rowData = surveyForm[row.key] || { jumlahPenerimaan: 0, jumlahDonatur: 0, keterangan: '' };
                return (
                  <div key={row.key} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-50">
                      <span className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                      <span className="font-bold text-slate-800 text-xs">{row.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Penerimaan (Rp)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={formatRupiah(rowData.jumlahPenerimaan)}
                            onChange={e => handlePenerimaanChange(row.key, 'jumlahPenerimaan', parseRupiah(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Donatur (Orang)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={rowData.jumlahDonatur || ''}
                          onChange={e => handlePenerimaanChange(row.key, 'jumlahDonatur', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Keterangan</label>
                      <input
                        type="text"
                        placeholder="Keterangan..."
                        value={rowData.keterangan || ''}
                        onChange={e => handlePenerimaanChange(row.key, 'keterangan', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Extra: Kambing/Domba & Sapi/Kerbau for Qurban */}
                    {row.key === 'penerimaan_qurban' && (
                      <div className="grid grid-cols-2 gap-2.5 border-t border-slate-50 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-emerald-600 uppercase">Kambing/Domba (ekor)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={rowData.kambingDomba || ''}
                            onChange={e => handlePenerimaanChange(row.key, 'kambingDomba', Number(e.target.value))}
                            className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-emerald-600 uppercase">Sapi/Kerbau (ekor)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={rowData.sapiKerbau || ''}
                            onChange={e => handlePenerimaanChange(row.key, 'sapiKerbau', Number(e.target.value))}
                            className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                    {/* Extra: Beras for Fidyah */}
                    {row.key === 'penerimaan_fidyah' && (
                      <div className="space-y-1 border-t border-slate-50 pt-2">
                        <label className="text-[9px] font-bold text-emerald-600 uppercase">Beras (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={rowData.beras || ''}
                          onChange={e => handlePenerimaanChange(row.key, 'beras', Number(e.target.value))}
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Subtotal Penerimaan */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Saldo Awal:</span>
                  <span className="text-slate-900">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPenerimaanSaldoAwal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Penerimaan:</span>
                  <span className="text-emerald-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPenerimaanJumlahPenerimaan)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900">
                  <span>Total Penerimaan + Saldo Awal:</span>
                  <span>
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPenerimaanSaldoAwal + totalPenerimaanJumlahPenerimaan)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-250 pt-2 text-slate-500 text-[10px]">
                  <span>Total Donatur:</span>
                  <span>{totalPenerimaanJumlahDonatur} Orang</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tabel Penyaluran */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">B. LAPORAN PENYALURAN (JAN - JUNI)</h4>
            </div>

            <div className="space-y-4">
              {penyaluranRows.map((row) => {
                const rowData = surveyForm[row.key] || { jumlahPenyaluran: 0, jumlahMustahik: 0, keterangan: '' };
                return (
                  <div key={row.key} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-50">
                      <span className="w-1.5 h-3 bg-rose-500 rounded-full" />
                      <span className="font-bold text-slate-800 text-xs">{row.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Jumlah Penyaluran</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-[10px] font-extrabold text-slate-400">Rp</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={formatRupiah(rowData.jumlahPenyaluran)}
                            onChange={e => handlePenyaluranChange(row.key, 'jumlahPenyaluran', parseRupiah(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Mustahik (Orang)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={rowData.jumlahMustahik || ''}
                          onChange={e => handlePenyaluranChange(row.key, 'jumlahMustahik', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Keterangan</label>
                      <input
                        type="text"
                        placeholder="Keterangan..."
                        value={rowData.keterangan || ''}
                        onChange={e => handlePenyaluranChange(row.key, 'keterangan', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    {/* Extra: Beras for Zakat Fitrah */}
                    {row.key === 'penyaluran_zakatFitrah' && (
                      <div className="space-y-1 border-t border-slate-50 pt-2">
                        <label className="text-[9px] font-bold text-rose-500 uppercase">Beras (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={rowData.beras || ''}
                          onChange={e => handlePenyaluranChange(row.key, 'beras', Number(e.target.value))}
                          className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </div>
                    )}
                    {/* Extra: Kambing/Domba & Sapi/Kerbau for Qurban */}
                    {row.key === 'penyaluran_qurban' && (
                      <div className="grid grid-cols-2 gap-2.5 border-t border-slate-50 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-rose-500 uppercase">Kambing/Domba (ekor)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={rowData.kambingDomba || ''}
                            onChange={e => handlePenyaluranChange(row.key, 'kambingDomba', Number(e.target.value))}
                            className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-rose-500 uppercase">Sapi/Kerbau (ekor)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={rowData.sapiKerbau || ''}
                            onChange={e => handlePenyaluranChange(row.key, 'sapiKerbau', Number(e.target.value))}
                            className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                      </div>
                    )}
                    {/* Extra: Beras for Fidyah */}
                    {row.key === 'penyaluran_fidyah' && (
                      <div className="space-y-1 border-t border-slate-50 pt-2">
                        <label className="text-[9px] font-bold text-rose-500 uppercase">Beras (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={rowData.beras || ''}
                          onChange={e => handlePenyaluranChange(row.key, 'beras', Number(e.target.value))}
                          className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:bg-white outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Subtotal Penyaluran */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Total Penyaluran:</span>
                  <span className="text-rose-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPenyaluranJumlahPenyaluran)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-500 text-[10px]">
                  <span>Total Mustahik:</span>
                  <span>{totalPenyaluranJumlahMustahik} Orang</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Saldo Akhir */}
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider border-b border-primary/10 pb-2">C. SALDO AKHIR LAPORAN</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">Saldo Akhir Kumulatif:</span>
              <span className="text-base font-black text-primary">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculatedSaldoAkhir)}
              </span>
            </div>
          </div>



          <div className="p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-auto shrink-0">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
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
        <h1 className="text-emerald-600 font-extrabold text-xl tracking-tight">BAZNAS Pelaporan OBS</h1>
      </div>

      {bottomNav === 'home' ? (
        <>
          {/* Header + Tab Switcher — exactly TimSurvei style */}
          <div className="px-6 pt-4 pb-4 bg-white shrink-0">
            <h2 className="text-[28px] font-black text-slate-900 leading-tight">Hallo, {userFirstName}!</h2>
            <p className="text-slate-500 font-medium">Siap pelaporan OBS hari ini?</p>
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
          <p className="font-medium text-emerald-100">Pelaporan OBS yang pernah kamu lakukan.</p>
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
              <p className="text-sm font-medium">Belum ada riwayat laporan yang selesai.</p>
            </div>
          ) : bottomNav === 'riwayat' && historyTasks.length > 0 ? (
            historyTasks.map((task) => {
              const editable = isEditable(task);
              const remaining = getRemainingEditTime(task);
              return (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                      UPZ MASJID
                    </div>
                    <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Laporan Selesai
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-4">
                    <MapPin className="size-3" />
                    <span className="text-xs font-semibold">Kec. {task.kecamatan}</span>
                  </div>
                  <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-3 mb-4 text-xs">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60 text-slate-400">Ringkasan Keuangan</p>
                    <div className="flex items-center justify-between text-slate-700">
                      <div>Saldo Akhir: <strong className="text-emerald-600 font-extrabold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(task.survey_data?.saldoAkhir || 0)}</strong></div>
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
                    {/* Top row: status + lokasi */}
                    <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          task.isBeingSurveyed ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {task.isBeingSurveyed ? "Sedang Disurvei" : "Belum Disurvei"}
                        </span>
                      </div>
                      <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                        <MapPin className="size-3" /> Lokasi
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>

                    {/* Location detail */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold mb-4">
                      <span>{task.kelurahan}, Kec. {task.kecamatan}</span>
                    </div>

                    {/* Program sub-card */}
                    <div className="bg-slate-50 border-l-[3px] border-l-emerald-600 rounded-r-lg p-3 mb-4 pl-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Program & Jenis</p>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{task.jenisPermohonan || 'Asesmen Off-Balancing'}</p>
                    </div>

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
                          onClick={() => { setSelectedTask(task); handleOpenNewSurvey(task); }}
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
