import React, { useState, useEffect, useMemo } from 'react';
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
  Building,
  Upload,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

// Helper: mask NIK — show only last 3 digits
const maskNIK = (nik: string) => {
  if (!nik || nik.length <= 3) return nik;
  return '*'.repeat(nik.length - 3) + nik.slice(-3);
};

// Sub-component for summary cards
function SummaryCard({ title, value, trend, icon, subtitle, trendUp }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
      <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            trendUp ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-50"
          )}>
            {trend}
          </span>
          {subtitle && <span className="text-[10px] text-slate-400 font-medium">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

export default function DataMuzakki() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  // NIK reveal state
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

  const [localMuzakkiData, setLocalMuzakkiData] = useState<any[]>([]);
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
    setIsLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/muzakki');
      if (res.data.status === 'success') {
        setLocalMuzakkiData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return localMuzakkiData.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (item.nik && item.nik.includes(searchTerm)) || 
                            (item.nrm && item.nrm.includes(searchTerm));
      const matchesCategory = categoryFilter === 'Semua' || item.kategori === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [localMuzakkiData, searchTerm, categoryFilter]);

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

      const res = await axios.post('http://127.0.0.1:4000/api/muzakki/import', parsedData);
      
      const newMessages = [];
      if (res.data.insertedCount > 0) {
        newMessages.push({ type: 'success', text: `Berhasil import ${res.data.insertedCount} Muzakki baru.` });
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

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { NRM: "MZ-001", Nama: "Contoh Nama Muzakki", NIK: "1234567890123456", "Tempat Lahir": "Semarang", "Tanggal Lahir": "1990-01-01", "Jenis Kelamin": "Pria", Pekerjaan: "Swasta", Alamat: "Jl. Contoh No. 1", Handphone: "08123456789", Email: "donatur@email.com", Kategori: "Perorangan", Catatan: "Donatur zakat rutin" }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Muzakki");
    XLSX.writeFile(workbook, "Template_Data_Muzakki.xlsx");
  };

  const handleAddMuzakki = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nik: formData.get('nik'),
      nrm: formData.get('nrm'),
      nama: formData.get('name'),
      tempat_lahir: formData.get('tempat_lahir'),
      tanggal_lahir: formData.get('tanggal_lahir'),
      jenis_kelamin: formData.get('jenis_kelamin'),
      pekerjaan: formData.get('pekerjaan') || '',
      alamat: formData.get('address'),
      handphone: formData.get('handphone'),
      email: formData.get('email'),
      catatan: formData.get('catatan'),
      kategori: formData.get('category'),
      status: formData.get('status')
    };

    setIsLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:4000/api/muzakki', data);
      if (res.data.status === 'success') {
        setIsModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Berhasil menambahkan data Muzakki.' }]);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';
      alert(`Gagal menyimpan: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMuzakki = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedData) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      nik: formData.get('nik'),
      nrm: formData.get('nrm'),
      nama: formData.get('name'),
      tempat_lahir: formData.get('tempat_lahir'),
      tanggal_lahir: formData.get('tanggal_lahir'),
      jenis_kelamin: formData.get('jenis_kelamin'),
      pekerjaan: formData.get('pekerjaan') || '',
      alamat: formData.get('address'),
      handphone: formData.get('handphone'),
      email: formData.get('email'),
      catatan: formData.get('catatan'),
      kategori: formData.get('category'),
      status: formData.get('status')
    };

    setIsLoading(true);
    try {
      const res = await axios.put(`http://127.0.0.1:4000/api/muzakki/${selectedData.id}`, data);
      if (res.data.status === 'success') {
        setIsEditModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Berhasil memperbarui profil Muzakki.' }]);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat memperbarui data.';
      alert(`Gagal menyimpan: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMuzakki = async () => {
    if (!selectedData) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data Muzakki ini? Aksi ini tidak dapat dibatalkan.")) return;
    
    try {
      const res = await axios.delete(`http://127.0.0.1:4000/api/muzakki/${selectedData.id}`);
      if (res.data.status === 'success') {
        setIsEditModalOpen(false);
        fetchData();
        setMessages([{ type: 'success', text: 'Profil Muzakki berhasil dihapus.' }]);
      }
    } catch (error: any) {
       console.error(error);
       alert("Gagal menghapus data.");
    }
  };

  const totalMuzakki = localMuzakkiData.length;
  const totalPerorangan = localMuzakkiData.filter(m => m.kategori === 'Perorangan').length;
  const totalLembaga = localMuzakkiData.filter(m => m.kategori === 'Lembaga').length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Database Warga</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Data Muzakki</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Users className="size-8 text-primary shrink-0" />
          Data Muzakki BAZNAS
        </h2>
        <p className="text-slate-500 font-medium text-xs md:text-sm">
          Kelola master data donatur tetap, muzakki perorangan maupun lembaga mitra BAZNAS.
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
              <div key={idx} className={cn(
                "p-4 rounded-xl flex items-start gap-3 border shadow-sm",
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-rose-50 border-rose-200 text-rose-700'
              )}>
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-0.5">{msg.type === 'success' ? 'Berhasil' : msg.type === 'warning' ? 'Peringatan' : 'Gagal'}</p>
                  <p className="text-xs font-semibold leading-relaxed">{msg.text}</p>
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
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <SummaryCard 
          title="Total Muzakki" 
          value={totalMuzakki.toLocaleString('id-ID')} 
          trend="Aktif Terdaftar" 
          trendUp={true}
          icon={<Users className="size-6" />}
        />
        <SummaryCard 
          title="Muzakki Perorangan" 
          value={totalPerorangan.toLocaleString('id-ID')} 
          trend="Perorangan" 
          trendUp={true}
          icon={<Users className="size-6 text-emerald-600" />}
        />
        <SummaryCard 
          title="Mitra / Lembaga" 
          value={totalLembaga.toLocaleString('id-ID')} 
          trend="Lembaga" 
          trendUp={true}
          icon={<Building className="size-6 text-primary" />}
        />
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari nama, NIK, atau NRM Muzakki..."
                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="text-xs font-bold bg-slate-50 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Perorangan">Perorangan</option>
              <option value="Lembaga">Lembaga / Mitra</option>
            </select>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Upload className="size-4 text-slate-500" />
              Migrasi Muzakki
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="size-4" />
              Tambah Muzakki
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-xs uppercase tracking-widest gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Memproses Data Muzakki...
            </div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">NRM</th>
                <th className="px-6 py-4">NIK</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4 text-center">Kategori</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    Belum ada data Muzakki yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
              filteredData.map((muzakki) => (
                <tr key={muzakki.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{muzakki.nrm}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-mono', !revealedNIKs.has(muzakki.id) && 'tracking-widest')}>
                        {revealedNIKs.has(muzakki.id) ? muzakki.nik : maskNIK(muzakki.nik)}
                      </span>
                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleNIK(muzakki.id)}
                          className="p-1 text-slate-300 hover:text-primary transition-colors shrink-0"
                          title={revealedNIKs.has(muzakki.id) ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                        >
                          {revealedNIKs.has(muzakki.id)
                            ? <EyeOff className="size-3.5" />
                            : <Eye className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{muzakki.nama}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Hp: {muzakki.handphone || '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate font-semibold">
                    {muzakki.alamat || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                      muzakki.kategori === 'Perorangan' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {muzakki.kategori || 'Perorangan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-bold rounded uppercase",
                      muzakki.status === 'Aktif' 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {muzakki.status || 'Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedData(muzakki); setDetailNIKRevealed(false); setIsDetailModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" title="Detail">
                        <Eye className="size-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedData(muzakki); setIsEditModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" title="Edit">
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

        <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/20 text-xs">
          <p className="text-slate-400 font-bold">
            Menampilkan 1-{Math.min(filteredData.length, 10)} dari {filteredData.length} Muzakki
          </p>
          <div className="flex gap-1">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronLeft className="size-4" />
            </button>
            <button className="w-8 h-8 bg-primary text-white rounded-lg font-black text-xs">1</button>
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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tambah Muzakki Baru</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddMuzakki} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIK (16 Digit)</label>
                    <input required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="NIK..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Register (NRM)</label>
                    <input name="nrm" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kosongkan untuk otomatis..." />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap Muzakki / Lembaga</label>
                  <input required name="name" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Masukkan nama donatur..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                    <input required name="tempat_lahir" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Tempat lahir..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                    <input required name="tanggal_lahir" type="date" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select required name="jenis_kelamin" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan (Opsional)</label>
                    <input name="pekerjaan" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Pekerjaan..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone / WA</label>
                    <input required name="handphone" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="No Hp..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Opsional)</label>
                    <input name="email" type="email" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Email..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Donatur</label>
                    <select name="category" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Perorangan">Perorangan</option>
                      <option value="Lembaga">Lembaga / Instansi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Muzakki</label>
                    <select name="status" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                  <textarea required name="address" rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat..." />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan / Keterangan tambahan</label>
                  <textarea name="catatan" rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan..." />
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-all">Batal</button>
                  <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                    {isLoading ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Muzakki Modal */}
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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Edit Data Muzakki</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleUpdateMuzakki} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIK (16 Digit)</label>
                    <input defaultValue={selectedData.nik} required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Register (NRM)</label>
                    <input defaultValue={selectedData.nrm} required name="nrm" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input defaultValue={selectedData.nama} required name="name" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                    <input defaultValue={selectedData.tempat_lahir} required name="tempat_lahir" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                    <input defaultValue={selectedData.tanggal_lahir} required name="tanggal_lahir" type="date" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select defaultValue={selectedData.jenis_kelamin} required name="jenis_kelamin" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</label>
                    <input defaultValue={selectedData.pekerjaan || ''} name="pekerjaan" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone</label>
                    <input defaultValue={selectedData.handphone} required name="handphone" type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input defaultValue={selectedData.email || ''} name="email" type="email" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Donatur</label>
                    <select defaultValue={selectedData.kategori || 'Perorangan'} name="category" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Perorangan">Perorangan</option>
                      <option value="Lembaga">Lembaga / Instansi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Muzakki</label>
                    <select defaultValue={selectedData.status || 'Aktif'} name="status" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                  <textarea defaultValue={selectedData.alamat || ''} required name="address" rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan / Keterangan</label>
                  <textarea defaultValue={selectedData.catatan || ''} name="catatan" rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button type="button" onClick={handleDeleteMuzakki} className="px-4 py-3 border border-rose-200 bg-rose-50 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center">
                    <Trash2 className="size-4" />
                  </button>
                  <div className="flex-1 flex gap-3">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-all">Batal</button>
                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                      {isLoading ? 'Menyimpan...' : 'Update Data'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Muzakki Modal */}
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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Profil Detail Muzakki
                </h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {/* Header Profile Info */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-black shrink-0">
                    {selectedData.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">{selectedData.nama}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {selectedData.kategori} - {selectedData.status}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <FileText className="size-3.5" /> NIK
                     </p>
                     <div className="flex items-center gap-2 mt-1">
                       <p className={cn('text-xs font-bold text-slate-800 font-mono', !detailNIKRevealed && 'tracking-widest')}>
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
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <Layers className="size-3.5" /> NRM (Nomor Register)
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1 font-mono">{selectedData.nrm}</p>
                   </div>
                   
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <Calendar className="size-3.5" /> TTL
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1">
                       {selectedData.tempat_lahir || '-'}, {selectedData.tanggal_lahir || '-'}
                     </p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <Users className="size-3.5" /> Jenis Kelamin
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1">{selectedData.jenis_kelamin || '-'}</p>
                   </div>
                   
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <Phone className="size-3.5" /> Telepon / WA
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1">{selectedData.handphone || '-'}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <Mail className="size-3.5" /> Email
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1">{selectedData.email || '-'}</p>
                   </div>

                   <div className="col-span-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <MapPin className="size-3.5" /> Alamat
                     </p>
                     <p className="text-xs font-bold text-slate-800 mt-1">{selectedData.alamat || '-'}</p>
                   </div>

                   <div className="col-span-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       <FileText className="size-3.5" /> Catatan Tambahan
                     </p>
                     <p className="text-xs font-medium text-slate-600 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                       "{selectedData.catatan || 'Tidak ada catatan khusus.'}"
                     </p>
                   </div>
                </div>

                <div className="pt-4 flex border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Tutup Profil
                  </button>
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMigrationModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Migrasi Data Muzakki (Excel)</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Langkah 1: Unduh Format Template</h4>
                  <p className="text-xs text-slate-500 font-medium">Gunakan template resmi kami agar penyelarasan data NIK dan NRM Donatur berjalan sempurna tanpa error.</p>
                  <button 
                    onClick={downloadTemplate}
                    className="w-full py-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Download className="size-4" />
                    Unduh Template Excel
                  </button>
                </div>
                
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Langkah 2: Unggah File Pengumpulan</h4>
                  <p className="text-xs text-slate-500 font-medium">Unggah file Excel `.xlsx` yang sudah Anda isi sesuai dengan format kolom template.</p>
                  <label className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-slate-50/50">
                    <Upload className="size-8 text-slate-400" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Pilih File Excel</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Format .xlsx atau .xls maks 10MB</span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
