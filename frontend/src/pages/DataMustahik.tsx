import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Edit2, 
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Users,
  Upload,
  Download,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Building,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';

// Helper: mask NIK — show only last 3 digits
const maskNIK = (nik: string) => {
  if (!nik || nik.length <= 3) return nik;
  return '*'.repeat(nik.length - 3) + nik.slice(-3);
};

export default function DataMustahik() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [graduationFilter, setGraduationFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [modalCategory, setModalCategory] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [isKtpSemarang, setIsKtpSemarang] = useState(true);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedKelurahan, setSelectedKelurahan] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [activeMigrationTab, setActiveMigrationTab] = useState<'warga' | 'riwayat'>('warga');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [addTanggalLahirInput, setAddTanggalLahirInput] = useState('');
  const [editTanggalLahirInput, setEditTanggalLahirInput] = useState('');

  const formatBirthDate = (val: string) => {
    let cleaned = val.replace(/\D/g, ''); // Keep only digits
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    return formatted;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  // NIK reveal state — Set of mustahik IDs whose NIK is currently shown (Super Admin only)
  const [revealedNIKs, setRevealedNIKs] = useState<Set<string>>(new Set());
  const [detailNIKRevealed, setDetailNIKRevealed] = useState(false);

  const toggleNIK = (id: string) => {
    if (!isSuperAdmin) return;
    setRevealedNIKs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [localMustahikData, setLocalMustahikData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/mustahik');
      if (res.data.status === 'success') {
        setLocalMustahikData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredData = localMustahikData.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.nik && item.nik.includes(searchTerm)) || 
                         (item.nrm && item.nrm.includes(searchTerm));
    const matchesGraduation = graduationFilter === 'Semua' || item.status_graduasi === graduationFilter;
    const matchesCategory = categoryFilter === 'Semua' || (item.kategori || 'Perorangan') === categoryFilter;
    return matchesSearch && matchesGraduation && matchesCategory;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessages([]);
    setIsMigrationModalOpen(false); 
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

      if (parsedData.length === 0) {
          throw new Error("File kosong atau format salah.");
      }

      const res = await axios.post('/api/mustahik/import', parsedData);
      
      const newMessages = [];
      if (res.data.insertedCount > 0) {
        newMessages.push({ type: 'success', text: `Berhasil import ${res.data.insertedCount} data baru.` });
      }
      if (res.data.duplicatesFound > 0) {
        newMessages.push({ type: 'warning', text: `Ditemukan ${res.data.duplicatesFound} data dengan NIK ganda yang dilewati otomatis.` });
      }
      if (res.data.nrmDuplicates > 0) {
        newMessages.push({ type: 'error', text: `Ditemukan ${res.data.nrmDuplicates} data dengan NRM ganda yang dilewati.` });
      }
      if (res.data.insertedCount === 0 && res.data.duplicatesFound === 0 && !res.data.nrmDuplicates) {
        newMessages.push({ type: 'warning', text: `Tidak ada data baru yang diproses.` });
      }
      
      setMessages(newMessages as any);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Gagal mengupload atau format salah.';
      setMessages([{ type: 'error', text: `Gagal: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleRiwayatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessages([]);
    setIsMigrationModalOpen(false); 
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

      if (parsedData.length === 0) {
          throw new Error("File kosong atau format salah.");
      }

      const res = await axios.post('/api/mustahik/import-riwayat', parsedData);
      
      const newMessages = [];
      if (res.data.insertedCount > 0) {
        newMessages.push({ type: 'success', text: `Berhasil import ${res.data.insertedCount} riwayat bantuan.` });
      }
      if (res.data.skippedCount > 0) {
        newMessages.push({ type: 'warning', text: `Dilewati ${res.data.skippedCount} baris (NIK tidak ditemukan atau NIK kosong).` });
      }
      if (res.data.insertedCount === 0 && res.data.skippedCount === 0) {
        newMessages.push({ type: 'warning', text: `Tidak ada riwayat baru yang diproses.` });
      }
      
      setMessages(newMessages as any);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Gagal mengupload atau format salah.';
      setMessages([{ type: 'error', text: `Gagal: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { NRM: "M-001", Nama: "Contoh Nama", NIK: "1234567890123456", "Tempat Lahir": "Jakarta", "Tanggal Lahir": "1990-01-01", "Jenis Kelamin": "Pria", Pekerjaan: "Pedagang", Alamat: "Jl. Contoh No. 1", Handphone: "08123456789", Email: "contoh@email.com", Catatan: "Surveyor OK" }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Mustahik");
    XLSX.writeFile(workbook, "Template_Data_Mustahik.xlsx");
  };

  const downloadTemplateRiwayat = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { NIK: "1234567890123456", Tanggal: "2023-12-01", Kode_Program: "P-01", Keterangan: "Bantuan Gerobak Usaha" }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format Riwayat Bantuan");
    XLSX.writeFile(workbook, "Template_Migrasi_Riwayat_Bantuan.xlsx");
  };

  const handleAddMustahik = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      kategori: modalCategory,
      nik: formData.get('nik') ? String(formData.get('nik')) : null,
      nrm: formData.get('nrm') ? String(formData.get('nrm')) : null,
      nama: formData.get('name') ? String(formData.get('name')) : '',
      alamat: formData.get('address') ? String(formData.get('address')) : '',
      telepon: formData.get('telepon') ? String(formData.get('telepon')) : '',
      email: formData.get('email') ? String(formData.get('email')) : null,
      provinsi: formData.get('provinsi') ? String(formData.get('provinsi')) : '',
      kabupaten: formData.get('kabupaten') ? String(formData.get('kabupaten')) : '',
      kecamatan: selectedKecamatan || formData.get('kecamatan') || '',
      kelurahan: selectedKelurahan || formData.get('kelurahan') || '',
      catatan: formData.get('catatan') ? String(formData.get('catatan')) : '',
      status_graduasi: formData.get('status') ? String(formData.get('status')) : 'Belum'
    };

    if (modalCategory === 'Perorangan') {
      data.tempat_lahir = formData.get('tempat_lahir') ? String(formData.get('tempat_lahir')) : '';
      data.tanggal_lahir = addTanggalLahirInput || '';
      data.jenis_kelamin = formData.get('jenis_kelamin') ? String(formData.get('jenis_kelamin')) : '';
      data.pekerjaan = formData.get('pekerjaan') ? String(formData.get('pekerjaan')) : '';
      data.handphone = formData.get('handphone') ? String(formData.get('handphone')) : '';
    } else {
      data.nama_pimpinan = formData.get('nama_pimpinan') ? String(formData.get('nama_pimpinan')) : '';
      data.jenis_lembaga = formData.get('jenis_lembaga') ? String(formData.get('jenis_lembaga')) : '';
      data.jumlah_anggota = formData.get('jumlah_anggota') ? Number(formData.get('jumlah_anggota')) : 0;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/mustahik', data);
      if (res.data.status === 'success') {
        setIsModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Berhasil menambahkan data Mustahik manual.' }]);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';
      alert(`Gagal menyimpan: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMustahik = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedData) return;

    const formData = new FormData(e.currentTarget);
    const data: any = {
      kategori: modalCategory,
      nik: formData.get('nik') ? String(formData.get('nik')) : null,
      nrm: formData.get('nrm') ? String(formData.get('nrm')) : null,
      nama: formData.get('name') ? String(formData.get('name')) : '',
      alamat: formData.get('address') ? String(formData.get('address')) : '',
      telepon: formData.get('telepon') ? String(formData.get('telepon')) : '',
      email: formData.get('email') ? String(formData.get('email')) : null,
      provinsi: formData.get('provinsi') ? String(formData.get('provinsi')) : '',
      kabupaten: formData.get('kabupaten') ? String(formData.get('kabupaten')) : '',
      kecamatan: selectedKecamatan || formData.get('kecamatan') || '',
      kelurahan: selectedKelurahan || formData.get('kelurahan') || '',
      catatan: formData.get('catatan') ? String(formData.get('catatan')) : '',
      status_graduasi: formData.get('status') ? String(formData.get('status')) : 'Belum'
    };

    if (modalCategory === 'Perorangan') {
      data.tempat_lahir = formData.get('tempat_lahir') ? String(formData.get('tempat_lahir')) : '';
      data.tanggal_lahir = editTanggalLahirInput || '';
      data.jenis_kelamin = formData.get('jenis_kelamin') ? String(formData.get('jenis_kelamin')) : '';
      data.pekerjaan = formData.get('pekerjaan') ? String(formData.get('pekerjaan')) : '';
      data.handphone = formData.get('handphone') ? String(formData.get('handphone')) : '';
      data.nama_pimpinan = null;
      data.jenis_lembaga = null;
      data.jumlah_anggota = 0;
    } else {
      data.nama_pimpinan = formData.get('nama_pimpinan') ? String(formData.get('nama_pimpinan')) : '';
      data.jenis_lembaga = formData.get('jenis_lembaga') ? String(formData.get('jenis_lembaga')) : '';
      data.jumlah_anggota = formData.get('jumlah_anggota') ? Number(formData.get('jumlah_anggota')) : 0;
      data.tempat_lahir = null;
      data.tanggal_lahir = null;
      data.jenis_kelamin = null;
      data.pekerjaan = null;
      data.handphone = null;
    }

    setIsLoading(true);
    try {
      const res = await axios.put(`/api/mustahik/${selectedData.id}`, data);
      if (res.data.status === 'success') {
        setIsEditModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Berhasil mengupdate data Mustahik.' }]);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat mengupdate data.';
      alert(`Gagal mengupdate: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMustahik = async () => {
    if (!selectedData) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data Mustahik ini? Aksi ini tidak dapat dibatalkan.")) return;
    
    try {
      const res = await axios.delete(`/api/mustahik/${selectedData.id}`);
      if (res.data.status === 'success') {
        setIsEditModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Data Mustahik berhasil dihapus.' }]);
      }
    } catch (error: any) {
       console.error(error);
       alert("Gagal menghapus data.");
    }
  };

  const totalMustahik = localMustahikData.length;
  const totalPerorangan = localMustahikData.filter(m => (m.kategori || 'Perorangan') === 'Perorangan').length;
  const totalLembaga = localMustahikData.filter(m => m.kategori === 'Lembaga').length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Master Data</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Data Mustahik</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Data Mustahik
        </h2>
        <p className="text-slate-500 font-medium">
          Manajemen data profil mustahik, kategori, dan riwayat status graduasi.
        </p>
      </motion.div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-8 right-8 z-[100] flex flex-col gap-2 shrink-0 w-80 shadow-2xl"
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              }`}>
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{msg.type === 'success' ? 'Berhasil' : msg.type === 'warning' ? 'Peringatan' : 'Gagal'}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
                <button onClick={() => setMessages(messages.filter((_, i) => i !== idx))} className="shrink-0 p-1 hover:bg-black/5 rounded-md">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <SummaryCard 
          title="Total Mustahik" 
          value={totalMustahik.toLocaleString('id-ID')} 
          trend="Aktif" 
          trendUp={true}
          icon={<Users className="size-5" />}
        />
        <SummaryCard 
          title="Mustahik Perorangan" 
          value={totalPerorangan.toLocaleString('id-ID')} 
          trend="Perorangan" 
          trendUp={true}
          icon={<Users className="size-5 text-emerald-600" />}
        />
        <SummaryCard 
          title="Mustahik Lembaga" 
          value={totalLembaga.toLocaleString('id-ID')} 
          trend="Lembaga" 
          trendUp={true}
          icon={<Building className="size-5 text-primary" />}
        />
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari nama, NIK, atau NRM..."
                className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={graduationFilter}
              onChange={(e) => setGraduationFilter(e.target.value)}
            >
              <option value="Semua">Status Graduasi: Semua</option>
              <option value="Lulus">Lulus (Mandiri)</option>
              <option value="Potensial">Potensial Lulus</option>
              <option value="Belum">Belum Lulus</option>
            </select>

            <select 
              className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Perorangan">Perorangan</option>
              <option value="Lembaga">Lembaga</option>
            </select>
          </div>
          <div className="hidden md:flex gap-3">
            <button 
              onClick={() => {
                setActiveMigrationTab('warga');
                setIsMigrationModalOpen(true);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-slate-200 shadow-sm"
            >
              <Upload className="size-4 shrink-0 text-slate-400" />
              Migrasi Mustahik
            </button>
            <button 
              onClick={() => {
                setModalCategory('Perorangan');
                setSelectedKecamatan('');
                setSelectedKelurahan('');
                setIsKtpSemarang(true);
                setAddTanggalLahirInput('');
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="size-4 shrink-0" />
              Tambah Mustahik
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary">Memproses Permintaan...</div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">NRM</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Nama / Lembaga</th>
                <th className="px-6 py-4">NIK / NIK Pimpinan</th>
                <th className="px-6 py-4">Telepon / HP</th>
                <th className="px-6 py-4 text-center">Status Graduasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Belum ada data atau tidak ada yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
              filteredData.map((warga) => (
                <tr key={warga.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">{warga.nrm || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                      warga.kategori === 'Lembaga' 
                        ? "bg-blue-50 text-blue-700 border-blue-100" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {warga.kategori || 'Perorangan'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{warga.nama}</p>
                    {warga.kategori === 'Lembaga' && warga.nama_pimpinan && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        Pimpinan: {warga.nama_pimpinan}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-mono', !revealedNIKs.has(warga.id) && 'tracking-widest')}>
                        {revealedNIKs.has(warga.id) ? warga.nik : maskNIK(warga.nik)}
                      </span>
                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleNIK(warga.id)}
                          className="p-1 text-slate-300 hover:text-primary transition-colors shrink-0"
                          title={revealedNIKs.has(warga.id) ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                        >
                          {revealedNIKs.has(warga.id)
                            ? <EyeOff className="size-3.5" />
                            : <Eye className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
                    {warga.kategori === 'Lembaga' ? warga.telepon : (warga.handphone || warga.telepon || '-')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded uppercase",
                      warga.status_graduasi === 'Lulus' 
                        ? "bg-emerald-100 text-emerald-700" 
                        : warga.status_graduasi === 'Potensial'
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {warga.status_graduasi || 'Belum'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedData(warga); setDetailNIKRevealed(false); setIsDetailModalOpen(true); }}
                        className="p-1.5 hover:bg-primary/10 text-slate-400 hover:text-primary rounded transition-colors" title="Detail">
                        <Eye className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedData(warga);
                          setModalCategory(warga.kategori || 'Perorangan');
                          setSelectedKecamatan(warga.kecamatan || '');
                          setSelectedKelurahan(warga.kelurahan || '');
                          const isSemarang = kecamatanKelurahanSemarang.some(k => k.kecamatan === warga.kecamatan);
                          setIsKtpSemarang(isSemarang || !warga.kecamatan);
                          
                          let dob = warga.tanggal_lahir || '';
                          if (dob.includes('-')) {
                            const parts = dob.split('-');
                            if (parts[0].length === 4) {
                              dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            }
                          }
                          setEditTanggalLahirInput(dob);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-primary/10 text-slate-400 hover:text-primary rounded transition-colors" title="Edit">
                        <Edit2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan 1-{Math.min(filteredData.length, 10)} dari {filteredData.length} data
          </p>
          <div className="flex gap-1">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronLeft className="size-4" />
            </button>
            <button className="w-8 h-8 bg-primary text-white rounded-lg font-bold text-xs">1</button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Add Warga Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Tambah Mustahik Baru</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setModalCategory('Perorangan')} 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    modalCategory === 'Perorangan' ? "bg-primary text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Perorangan
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalCategory('Lembaga')} 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    modalCategory === 'Lembaga' ? "bg-primary text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Lembaga / Organisasi
                </button>
              </div>

              <form onSubmit={handleAddMustahik} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {/* NRM & NIK & Nama */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NO. REGISTER MUSTAHIK (NRM)</label>
                    <input name="nrm" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Masukkan NRM..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {modalCategory === 'Perorangan' ? 'NIK (16 Digit) *' : 'NIK Pimpinan/Ketua *'}
                    </label>
                    <input required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="16 digit NIK..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {modalCategory === 'Perorangan' ? 'Nama Lengkap *' : 'Nama Lembaga *'}
                  </label>
                  <input required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder={modalCategory === 'Perorangan' ? 'Masukkan nama lengkap...' : 'Masukkan nama lembaga...'} />
                </div>

                {modalCategory === 'Perorangan' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                        <input name="tempat_lahir" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kota lahir..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                        <input 
                          name="tanggal_lahir" 
                          type="text" 
                          placeholder="DD-MM-YYYY"
                          maxLength={10}
                          value={addTanggalLahirInput}
                          onChange={(e) => setAddTanggalLahirInput(formatBirthDate(e.target.value))}
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin *</label>
                        <select required name="jenis_kelamin" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                          <option value="">Pilih...</option>
                          <option value="Pria">Pria</option>
                          <option value="Wanita">Wanita</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</label>
                        <input name="pekerjaan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Pekerjaan..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon *</label>
                        <input required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Telepon..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone (WhatsApp)</label>
                        <input name="handphone" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Handphone..." />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Opsional)</label>
                      <input name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Email..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pimpinan / Ketua *</label>
                      <input required name="nama_pimpinan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pimpinan..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga *</label>
                        <input required name="jenis_lembaga" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Yayasan / Panti Asuhan dll..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Anggota / Binaan</label>
                        <input name="jumlah_anggota" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon *</label>
                        <input required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Telepon..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Lembaga</label>
                        <input name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Email..." />
                      </div>
                    </div>
                  </>
                )}

                {/* Region / Wilayah Fields */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isKtpSemarang" 
                      checked={isKtpSemarang} 
                      onChange={(e) => {
                        setIsKtpSemarang(e.target.checked);
                        if (e.target.checked) {
                          setSelectedKecamatan('');
                          setSelectedKelurahan('');
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary size-4"
                    />
                    <label htmlFor="isKtpSemarang" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Wilayah Kota Semarang
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provinsi</label>
                      <input name="provinsi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue="Jawa Tengah" placeholder="Provinsi..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kabupaten / Kota</label>
                      <input name="kabupaten" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue="Kota Semarang" placeholder="Kabupaten..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      {isKtpSemarang ? (
                        <select
                          required
                          name="kecamatan"
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                          value={selectedKecamatan}
                          onChange={e => {
                            setSelectedKecamatan(e.target.value);
                            setSelectedKelurahan('');
                          }}
                        >
                          <option value="">Pilih Kecamatan...</option>
                          {kecamatanKelurahanSemarang.map(k => (
                            <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="kecamatan"
                          placeholder="Kecamatan..."
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={selectedKecamatan}
                          onChange={e => setSelectedKecamatan(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      {isKtpSemarang ? (
                        <select
                          required
                          name="kelurahan"
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                          value={selectedKelurahan}
                          onChange={e => setSelectedKelurahan(e.target.value)}
                          disabled={!selectedKecamatan}
                        >
                          <option value="">Pilih Kelurahan...</option>
                          {kecamatanKelurahanSemarang
                            .find(k => k.kecamatan === selectedKecamatan)
                            ?.kelurahan.map(kel => (
                              <option key={kel} value={kel}>{kel}</option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="kelurahan"
                          placeholder="Kelurahan..."
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={selectedKelurahan}
                          onChange={e => setSelectedKelurahan(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap *</label>
                  <textarea required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama jalan, RT/RW, nomor rumah..." />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan / Catatan</label>
                  <textarea name="catatan" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan tambahan..." />
                </div>

                <div className="space-y-1 mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Graduasi</label>
                  <select name="status" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                    <option value="Belum">Belum Lulus</option>
                    <option value="Potensial">Potensial</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>

                <div className="pt-4 shrink-0">
                  <button type="submit" disabled={isLoading} className="w-full px-4 sm:px-10 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
                    <Save className="size-4" />
                    <span>Simpan<span className="hidden sm:inline"> Data</span></span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Warga Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Edit Data Mustahik</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setModalCategory('Perorangan')} 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    modalCategory === 'Perorangan' ? "bg-primary text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Perorangan
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalCategory('Lembaga')} 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    modalCategory === 'Lembaga' ? "bg-primary text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Lembaga / Organisasi
                </button>
              </div>

              <form key={selectedData.id} onSubmit={handleUpdateMustahik} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {/* NRM & NIK & Nama */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NO. REGISTER MUSTAHIK (NRM)</label>
                    <input defaultValue={selectedData.nrm || ''} name="nrm" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {modalCategory === 'Perorangan' ? 'NIK (16 Digit) *' : 'NIK Pimpinan/Ketua *'}
                    </label>
                    <input defaultValue={selectedData.nik || ''} required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {modalCategory === 'Perorangan' ? 'Nama Lengkap *' : 'Nama Lembaga *'}
                  </label>
                  <input defaultValue={selectedData.nama || ''} required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>

                {modalCategory === 'Perorangan' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                        <input defaultValue={selectedData.tempat_lahir || ''} name="tempat_lahir" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                        <input 
                          name="tanggal_lahir" 
                          type="text" 
                          placeholder="DD-MM-YYYY"
                          maxLength={10}
                          value={editTanggalLahirInput}
                          onChange={(e) => setEditTanggalLahirInput(formatBirthDate(e.target.value))}
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin *</label>
                        <select defaultValue={selectedData.jenis_kelamin || ''} required name="jenis_kelamin" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                          <option value="">Pilih...</option>
                          <option value="Pria">Pria</option>
                          <option value="Wanita">Wanita</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</label>
                        <input defaultValue={selectedData.pekerjaan || ''} name="pekerjaan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon *</label>
                        <input defaultValue={selectedData.telepon || ''} required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone (WhatsApp)</label>
                        <input defaultValue={selectedData.handphone || ''} name="handphone" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Opsional)</label>
                      <input defaultValue={selectedData.email || ''} name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pimpinan / Ketua *</label>
                      <input defaultValue={selectedData.nama_pimpinan || ''} required name="nama_pimpinan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga *</label>
                        <input defaultValue={selectedData.jenis_lembaga || ''} required name="jenis_lembaga" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Anggota / Binaan</label>
                        <input defaultValue={selectedData.jumlah_anggota || 0} name="jumlah_anggota" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon *</label>
                        <input defaultValue={selectedData.telepon || ''} required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Lembaga</label>
                        <input defaultValue={selectedData.email || ''} name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>
                  </>
                )}

                {/* Region / Wilayah Fields */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="editIsKtpSemarang" 
                      checked={isKtpSemarang} 
                      onChange={(e) => {
                        setIsKtpSemarang(e.target.checked);
                        if (e.target.checked) {
                          setSelectedKecamatan('');
                          setSelectedKelurahan('');
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary size-4"
                    />
                    <label htmlFor="editIsKtpSemarang" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Wilayah Kota Semarang
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provinsi</label>
                      <input name="provinsi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={selectedData.provinsi || "Jawa Tengah"} placeholder="Provinsi..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kabupaten / Kota</label>
                      <input name="kabupaten" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={selectedData.kabupaten || "Kota Semarang"} placeholder="Kabupaten..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      {isKtpSemarang ? (
                        <select
                          required
                          name="kecamatan"
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                          value={selectedKecamatan}
                          onChange={e => {
                            setSelectedKecamatan(e.target.value);
                            setSelectedKelurahan('');
                          }}
                        >
                          <option value="">Pilih Kecamatan...</option>
                          {kecamatanKelurahanSemarang.map(k => (
                            <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="kecamatan"
                          placeholder="Kecamatan..."
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={selectedKecamatan}
                          onChange={e => setSelectedKecamatan(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      {isKtpSemarang ? (
                        <select
                          required
                          name="kelurahan"
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                          value={selectedKelurahan}
                          onChange={e => setSelectedKelurahan(e.target.value)}
                          disabled={!selectedKecamatan}
                        >
                          <option value="">Pilih Kelurahan...</option>
                          {kecamatanKelurahanSemarang
                            .find(k => k.kecamatan === selectedKecamatan)
                            ?.kelurahan.map(kel => (
                              <option key={kel} value={kel}>{kel}</option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="kelurahan"
                          placeholder="Kelurahan..."
                          className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={selectedKelurahan}
                          onChange={e => setSelectedKelurahan(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap *</label>
                  <textarea defaultValue={selectedData.alamat || ''} required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama jalan, RT/RW, nomor rumah..." />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan / Catatan</label>
                  <textarea defaultValue={selectedData.catatan || ''} name="catatan" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan tambahan..." />
                </div>

                <div className="space-y-1 mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Graduasi</label>
                  <select defaultValue={selectedData.status_graduasi || 'Belum'} name="status" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                    <option value="Belum">Belum Lulus</option>
                    <option value="Potensial">Potensial</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={handleDeleteMustahik} 
                    className="px-3.5 sm:px-4 py-3 text-sm font-bold text-rose-500 border border-rose-200 rounded-xl bg-rose-50 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    <span>Hapus<span className="hidden sm:inline"> Mustahik</span></span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="flex-1 px-4 sm:px-10 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="size-4" />
                    <span>Simpan<span className="hidden sm:inline"> Data</span></span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Warga Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Detail Mustahik</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</p>
                     <span className={cn(
                       "inline-block px-2 py-0.5 mt-1 text-[9px] font-bold rounded-lg uppercase border",
                       selectedData.kategori === 'Lembaga' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                     )}>
                       {selectedData.kategori || 'Perorangan'}
                     </span>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NRM</p>
                     <p className="font-semibold text-slate-800">{selectedData.nrm || '-'}</p>
                   </div>
                   <div className="col-span-1 md:col-span-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {selectedData.kategori === 'Lembaga' ? 'Nama Lembaga' : 'Nama Lengkap'}
                     </p>
                     <p className="font-bold text-slate-850 mt-1">{selectedData.nama}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {selectedData.kategori === 'Lembaga' ? 'NIK Pimpinan / Ketua' : 'NIK'}
                     </p>
                     <div className="flex items-center gap-2 mt-0.5">
                       <p className={cn('font-semibold text-slate-800 font-mono', !detailNIKRevealed && 'tracking-widest')}>
                         {detailNIKRevealed ? selectedData.nik : maskNIK(selectedData.nik)}
                       </p>
                       {isSuperAdmin && (
                         <button
                           onClick={() => setDetailNIKRevealed(v => !v)}
                           className="p-1 text-slate-300 hover:text-primary rounded transition-colors"
                           title={detailNIKRevealed ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                         >
                           {detailNIKRevealed
                             ? <EyeOff className="size-3.5" />
                             : <Eye className="size-3.5" />}
                         </button>
                       )}
                     </div>
                   </div>

                   {selectedData.kategori === 'Lembaga' ? (
                     <>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pimpinan / Ketua</p>
                         <p className="font-semibold text-slate-800 mt-1">{selectedData.nama_pimpinan || '-'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga</p>
                         <p className="font-semibold text-slate-800 mt-1">{selectedData.jenis_lembaga || '-'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Anggota / Binaan</p>
                         <p className="font-semibold text-slate-800 mt-1">{(selectedData.jumlah_anggota || 0).toLocaleString('id-ID')}</p>
                       </div>
                     </>
                   ) : (
                     <>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat & Tanggal Lahir</p>
                         <p className="font-semibold text-slate-800 mt-1">
                           {selectedData.tempat_lahir || '-'}{selectedData.tanggal_lahir ? `, ${formatDisplayDate(selectedData.tanggal_lahir)}` : ''}
                         </p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</p>
                         <p className="font-semibold text-slate-800 mt-1">{selectedData.jenis_kelamin || '-'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</p>
                         <p className="font-semibold text-slate-800 mt-1">{selectedData.pekerjaan || '-'}</p>
                       </div>
                     </>
                   )}

                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon / WhatsApp</p>
                     <p className="font-semibold text-slate-800 mt-1">
                       {selectedData.kategori === 'Lembaga' ? selectedData.telepon : (selectedData.handphone || selectedData.telepon || '-')}
                     </p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                     <p className="font-semibold text-slate-800 mt-1">{selectedData.email || '-'}</p>
                   </div>

                   <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provinsi</p>
                       <p className="font-semibold text-slate-700 text-xs mt-0.5">{selectedData.provinsi || '-'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kabupaten / Kota</p>
                       <p className="font-semibold text-slate-700 text-xs mt-0.5">{selectedData.kabupaten || '-'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</p>
                       <p className="font-semibold text-slate-700 text-xs mt-0.5">{selectedData.kecamatan || '-'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</p>
                       <p className="font-semibold text-slate-700 text-xs mt-0.5">{selectedData.kelurahan || '-'}</p>
                     </div>
                   </div>

                   <div className="col-span-1 md:col-span-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</p>
                     <p className="font-medium text-slate-600 border border-slate-100 bg-slate-50 p-3 rounded-lg mt-1 text-xs">{selectedData.alamat || '-'}</p>
                   </div>
                   <div className="col-span-1 md:col-span-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan / Keterangan</p>
                     <p className="font-medium text-slate-600 border border-slate-100 bg-slate-50 p-3 rounded-lg mt-1 text-xs">{selectedData.catatan || '-'}</p>
                   </div>
                   <div className="col-span-1 md:col-span-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Graduasi</p>
                     <span className={cn(
                        "inline-block px-2 py-1 mt-1 text-[10px] font-bold rounded uppercase",
                        selectedData.status_graduasi === 'Lulus' ? "bg-emerald-100 text-emerald-700" : selectedData.status_graduasi === 'Potensial' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {selectedData.status_graduasi || 'Belum'}
                      </span>
                   </div>
                   <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Riwayat Bantuan</p>
                     <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                       {selectedData.proposals?.length > 0 ? (
                         <div className="flex flex-col gap-2">
                           {selectedData.proposals
                             .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                             .map((p: any, idx: number) => (
                             <div key={idx} className="bg-white p-3 rounded border border-slate-100 flex flex-col text-left shadow-sm">
                                 <div className="flex justify-between items-start gap-4">
                                   <div>
                                     <p className="text-xs font-bold text-slate-700">{p.program?.name || p.keterangan || 'Bantuan Umum'}</p>
                                     <p className="text-[10px] text-slate-400 font-medium mt-0.5">Tertanggal: {new Date(p.tanggal_masuk || p.created_at).toLocaleDateString('id-ID')}</p>
                                   </div>
                                   <span className={cn(
                                     "px-2 py-0.5 text-[9px] font-bold rounded uppercase shrink-0",
                                     p.status === 'Selesai' ? "bg-emerald-100 text-emerald-700" :
                                     p.status === 'Ditolak' ? "bg-rose-100 text-rose-700" :
                                     "bg-amber-100 text-amber-700"
                                   )}>
                                     {p.status}
                                   </span>
                                 </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat bantuan terdata.</p>
                       )}
                     </div>
                   </div>
                </div>
                <div className="pt-4 flex">
                  <button onClick={() => setIsDetailModalOpen(false)} className="w-full px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">Tutup</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal */}
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
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Migrasi Data Mustahik</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveMigrationTab('warga')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
                    activeMigrationTab === 'warga' 
                      ? "border-primary text-primary bg-white" 
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  )}
                >
                  Migrasi Warga
                </button>
                <button
                  onClick={() => setActiveMigrationTab('riwayat')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
                    activeMigrationTab === 'riwayat' 
                      ? "border-primary text-primary bg-white" 
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  )}
                >
                  Migrasi Riwayat
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">
                    {activeMigrationTab === 'warga' ? 'Impor Data via Excel' : 'Impor Riwayat Bantuan via Excel'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {activeMigrationTab === 'warga' 
                      ? 'Gunakan file Excel (.xlsx) dengan kolom NIK, NRM, Nama, Alamat, Kategori, Status.' 
                      : 'Upload file Excel berisi histori bantuan. Data akan langsung terhubung ke NIK.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={activeMigrationTab === 'warga' ? downloadTemplate : downloadTemplateRiwayat}
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                          {activeMigrationTab === 'warga' ? 'Upload File Data Baru' : 'Upload Riwayat via (.xlsx)'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={activeMigrationTab === 'warga' ? handleFileUpload : handleRiwayatFileUpload} 
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      {activeMigrationTab === 'warga' 
                        ? 'Pastikan kolom NIK dan NRM tidak kosong. Data duplikat NIK akan otomatis dilewati agar sistem tidak error.'
                        : 'Baris yang menggunakan NIK yang tidak terdaftar di database akan dilewati secara otomatis.'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
        {/* FAB Options */}
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-3"
            >
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setActiveMigrationTab('warga');
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Mustahik
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setModalCategory('Perorangan');
                  setSelectedKecamatan('');
                  setSelectedKelurahan('');
                  setIsKtpSemarang(true);
                  setAddTanggalLahirInput('');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Tambah Mustahik
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Trigger */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn(
            "size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 transition-all duration-300 active:scale-90 cursor-pointer",
            isFabOpen ? "rotate-45 bg-slate-800 shadow-slate-800/30" : ""
          )}
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, trend, trendUp, icon, subtitle }: { 
  title: string, 
  value: string, 
  trend: string, 
  trendUp: boolean,
  icon: React.ReactNode,
  subtitle?: string
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-bold px-2 py-1 rounded",
          trendUp ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
        )}>
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-black text-slate-900">{value}</h3>
          {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
