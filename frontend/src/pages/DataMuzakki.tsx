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
  FileText,
  DollarSign,
  FileSpreadsheet
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

export default function DataMuzakki({ onNavigate }: { onNavigate?: (menu: string) => void }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const handleTerimaZis = (muzakki: any) => {
    localStorage.setItem('selected_muzakki_penerimaan', JSON.stringify({
      id: muzakki.id,
      nama: muzakki.nama
    }));
    if (onNavigate) {
      onNavigate('Penerimaan ZIS');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [selectedData, setSelectedData] = useState<any>(null);
  const [modalCategory, setModalCategory] = useState<'Perorangan' | 'Lembaga'>('Perorangan');

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
      const res = await axios.get('/api/muzakki');
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
                            (item.npwp && item.npwp.includes(searchTerm)) || 
                            (item.npwz && item.npwz.includes(searchTerm));
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

      const res = await axios.post('/api/muzakki/import', parsedData);
      
      const newMessages = [];
      if (res.data.insertedCount > 0) {
        newMessages.push({ type: 'success', text: `Berhasil memproses ${res.data.insertedCount} data Muzakki.` });
      }
      if (res.data.updatedCount > 0) {
        newMessages.push({ type: 'success', text: `Berhasil mengupdate ${res.data.updatedCount} data Muzakki eksisting.` });
      }
      if (res.data.insertedCount === 0 && res.data.updatedCount === 0) {
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
      { 
        Kategori: "Perorangan",
        Nama: "Ahmad Muzakki", 
        NIK: "3374012345678901", 
        NPWP: "12.345.678.9-012.000",
        NPWZ: "WZ-3374-12345",
        "Tempat Lahir": "Semarang", 
        "Tanggal Lahir": "1985-05-15", 
        "Jenis Kelamin": "Pria", 
        Pekerjaan: "PNS", 
        UPZ: "Masjid Agung",
        "Zakat Per Bulan": 500000,
        "Alamat Rumah": "Jl. Gajah Mada No. 100", 
        "Alamat Kantor": "Jl. Pahlawan No. 2",
        Telepon: "024-841234",
        Handphone: "081234567890", 
        Email: "ahmad@email.com", 
        Keterangan: "Donatur rutin bulanan" 
      },
      { 
        Kategori: "Lembaga",
        Nama: "PT Maju Bersama Zakat", 
        NIK: "",
        NPWP: "98.765.432.1-012.000",
        NPWZ: "WZ-3374-99887",
        "Tempat Lahir": "", 
        "Tanggal Lahir": "", 
        "Jenis Kelamin": "", 
        Pekerjaan: "", 
        UPZ: "",
        "Zakat Per Bulan": 2500000,
        "Alamat Rumah": "Kawasan Industri Candi Blok A/5", 
        "Alamat Kantor": "",
        Telepon: "024-760123",
        Handphone: "", 
        Email: "info@majubersama.co.id", 
        Keterangan: "Mitra Lembaga BAZNAS",
        "No Pengukuhan": "NO-PENG/2025/123",
        "Tanggal Pengukuhan": "2025-01-10",
        Website: "www.majubersama.co.id",
        "Jenis Lembaga": "Swasta",
        Fax: "024-760124",
        "CP Nama": "Budi Hartono",
        "CP Telepon": "08987654321",
        "CP Email": "budi.hartono@majubersama.co.id"
      }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format SIMBA");
    XLSX.writeFile(workbook, "Format_Data_Muzakki_SIMBA.xlsx");
  };

  const handleAddMuzakki = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      kategori: modalCategory,
      npwz: formData.get('npwz'),
      nama: formData.get('name'),
      npwp: formData.get('npwp') || '',
      zakat_per_bulan: formData.get('zakat_per_bulan') ? Number(formData.get('zakat_per_bulan')) : null,
      keterangan: formData.get('catatan') || '',
      alamat: formData.get('address'),
      telepon: formData.get('telepon') || '',
      email: formData.get('email') || '',
      status: formData.get('status') || 'Aktif',
    };

    if (modalCategory === 'Perorangan') {
      data.nik = formData.get('nik');
      data.tempat_lahir = formData.get('tempat_lahir') || '';
      data.tanggal_lahir = formData.get('tanggal_lahir') || '';
      data.jenis_kelamin = formData.get('jenis_kelamin');
      data.pekerjaan = formData.get('pekerjaan') || '';
      data.upz = formData.get('upz') || '';
      data.alamat_kantor = formData.get('alamat_kantor') || '';
      data.handphone = formData.get('handphone');
    } else {
      data.no_pengukuhan = formData.get('no_pengukuhan') || '';
      data.tanggal_pengukuhan = formData.get('tanggal_pengukuhan') || '';
      data.website = formData.get('website') || '';
      data.jenis_lembaga = formData.get('jenis_lembaga') || '';
      data.fax = formData.get('fax') || '';
      data.cp_nama = formData.get('cp_nama');
      data.cp_telepon = formData.get('cp_telepon');
      data.cp_email = formData.get('cp_email') || '';
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/muzakki', data);
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
    
    const data: any = {
      kategori: modalCategory,
      npwz: formData.get('npwz'),
      nama: formData.get('name'),
      npwp: formData.get('npwp') || '',
      zakat_per_bulan: formData.get('zakat_per_bulan') ? Number(formData.get('zakat_per_bulan')) : null,
      keterangan: formData.get('catatan') || '',
      alamat: formData.get('address'),
      telepon: formData.get('telepon') || '',
      email: formData.get('email') || '',
      status: formData.get('status') || 'Aktif',
    };

    if (modalCategory === 'Perorangan') {
      data.nik = formData.get('nik');
      data.tempat_lahir = formData.get('tempat_lahir') || '';
      data.tanggal_lahir = formData.get('tanggal_lahir') || '';
      data.jenis_kelamin = formData.get('jenis_kelamin');
      data.pekerjaan = formData.get('pekerjaan') || '';
      data.upz = formData.get('upz') || '';
      data.alamat_kantor = formData.get('alamat_kantor') || '';
      data.handphone = formData.get('handphone');
    } else {
      data.no_pengukuhan = formData.get('no_pengukuhan') || '';
      data.tanggal_pengukuhan = formData.get('tanggal_pengukuhan') || '';
      data.website = formData.get('website') || '';
      data.jenis_lembaga = formData.get('jenis_lembaga') || '';
      data.fax = formData.get('fax') || '';
      data.cp_nama = formData.get('cp_nama');
      data.cp_telepon = formData.get('cp_telepon');
      data.cp_email = formData.get('cp_email') || '';
    }

    setIsLoading(true);
    try {
      const res = await axios.put(`/api/muzakki/${selectedData.id}`, data);
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
      const res = await axios.delete(`/api/muzakki/${selectedData.id}`);
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Database Warga</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Data Muzakki</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Data Muzakki
        </h2>
        <p className="text-slate-500 font-medium">
          Manajemen data profil muzakki, kategori, dan detail verifikasi SIMBA.
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
                'bg-red-50 border-red-200 text-red-700'
              )}>
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
          title="Total Muzakki" 
          value={totalMuzakki.toLocaleString('id-ID')} 
          trend="Aktif" 
          trendUp={true}
          icon={<Users className="size-5" />}
        />
        <SummaryCard 
          title="Muzakki Perorangan" 
          value={totalPerorangan.toLocaleString('id-ID')} 
          trend="Individu" 
          trendUp={true}
          icon={<Users className="size-5 text-emerald-600" />}
        />
        <SummaryCard 
          title="Mitra / Lembaga" 
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
                placeholder="Cari nama, NIK/NPWP, atau NPWZ..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Perorangan">Perorangan</option>
              <option value="Lembaga">Lembaga / Mitra</option>
            </select>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Upload className="size-4 text-slate-500" />
              Migrasi Muzakki
            </button>
            <button 
              onClick={() => { setModalCategory('Perorangan'); setIsModalOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="size-4" />
              Tambah Muzakki
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Memproses Data Muzakki...
            </div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">NPWZ</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Nama Lengkap / Lembaga</th>
                <th className="px-6 py-4">NIK / NPWP</th>
                <th className="px-6 py-4">Telepon / HP</th>
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
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{muzakki.npwz || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                      muzakki.kategori === 'Perorangan' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {muzakki.kategori || 'Perorangan'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{muzakki.nama}</p>
                    {muzakki.kategori === 'Lembaga' && muzakki.cp_nama && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        CP: {muzakki.cp_nama} ({muzakki.cp_telepon || '-'})
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {muzakki.kategori === 'Perorangan' ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn('font-mono', !revealedNIKs.has(muzakki.id) && 'tracking-widest')}>
                          {revealedNIKs.has(muzakki.id) ? muzakki.nik : maskNIK(muzakki.nik)}
                        </span>
                        {isSuperAdmin && wargaNIKButton(muzakki.id)}
                      </div>
                    ) : (
                      <span className="font-mono text-slate-600">{muzakki.npwp || muzakki.no_pengukuhan || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
                    {muzakki.kategori === 'Perorangan' ? muzakki.handphone : muzakki.telepon}
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
                        onClick={() => handleTerimaZis(muzakki)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-xl transition-colors" title="Terima ZIS">
                        <DollarSign className="size-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedData(muzakki); setDetailNIKRevealed(false); setIsDetailModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" title="Detail">
                        <Eye className="size-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedData(muzakki); setModalCategory(muzakki.kategori); setIsEditModalOpen(true); }}
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

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs">
          <p className="text-slate-400 font-bold">
            Menampilkan 1-{Math.min(filteredData.length, 10)} dari {filteredData.length} Muzakki
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
                <h3 className="text-xl font-black text-slate-900">Tambah Muzakki Baru</h3>
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
                  Perorangan (Individu)
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalCategory('Lembaga')} 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    modalCategory === 'Lembaga' ? "bg-primary text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Lembaga / Mitra
                </button>
              </div>
              <form onSubmit={handleAddMuzakki} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWZ (Nomor Pokok Wajib Zakat)</label>
                    <input name="npwz" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kosongkan untuk otomatis..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWP (Opsional)</label>
                    <input name="npwp" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="NPWP..." />
                  </div>
                </div>

                {modalCategory === 'Perorangan' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap *</label>
                        <input required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIK (16 Digit) *</label>
                        <input required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="NIK..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                        <input name="tempat_lahir" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Tempat lahir..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                        <input name="tanggal_lahir" type="date" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin *</label>
                        <select required name="jenis_kelamin" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                          <option value="Pria">Pria</option>
                          <option value="Wanita">Wanita</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</label>
                        <input name="pekerjaan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Pekerjaan..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPZ</label>
                        <input name="upz" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="UPZ..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone *</label>
                        <input required name="handphone" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="No Hp..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon Rumah</label>
                        <input name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Telepon..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                        <input name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Email..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zakat Per Bulan</label>
                        <input name="zakat_per_bulan" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nominal..." />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Rumah *</label>
                      <textarea required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat..." />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Kantor</label>
                      <textarea name="alamat_kantor" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat kantor..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lembaga *</label>
                        <input required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama instansi..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon Kantor *</label>
                        <input required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Telepon..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Pengukuhan</label>
                        <input name="no_pengukuhan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nomor..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Pengukuhan</label>
                        <input name="tanggal_pengukuhan" type="date" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                        <input name="website" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="www..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga</label>
                        <input name="jenis_lembaga" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Swasta/BUMN..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fax</label>
                        <input name="fax" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Fax..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Kantor</label>
                        <input name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Email..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zakat per Bulan</label>
                        <input name="zakat_per_bulan" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nominal..." />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Bagian Contact Person (CP)</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama CP *</label>
                          <input required name="cp_nama" type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Nama..." />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Telepon CP *</label>
                          <input required name="cp_telepon" type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Telepon CP..." />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email CP (Opsional)</label>
                        <input name="cp_email" type="email" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Email CP..." />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lembaga *</label>
                      <textarea required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat..." />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan / Keterangan Tambahan</label>
                    <textarea name="catatan" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select name="status" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                  <button type="submit" disabled={isLoading} className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
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
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Edit Data Muzakki</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleUpdateMuzakki} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWZ (Nomor Pokok Wajib Zakat)</label>
                    <input defaultValue={selectedData.npwz} required name="npwz" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWP</label>
                    <input defaultValue={selectedData.npwp || ''} name="npwp" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                {modalCategory === 'Perorangan' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap *</label>
                        <input defaultValue={selectedData.nama} required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIK *</label>
                        <input defaultValue={selectedData.nik} required name="nik" type="text" maxLength={16} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                        <input defaultValue={selectedData.tempat_lahir || ''} name="tempat_lahir" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir</label>
                        <input defaultValue={selectedData.tanggal_lahir || ''} name="tanggal_lahir" type="date" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin *</label>
                        <select defaultValue={selectedData.jenis_kelamin || 'Pria'} required name="jenis_kelamin" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                          <option value="Pria">Pria</option>
                          <option value="Wanita">Wanita</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</label>
                        <input defaultValue={selectedData.pekerjaan || ''} name="pekerjaan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPZ</label>
                        <input defaultValue={selectedData.upz || ''} name="upz" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handphone *</label>
                        <input defaultValue={selectedData.handphone || ''} required name="handphone" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon Rumah</label>
                        <input defaultValue={selectedData.telepon || ''} name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                        <input defaultValue={selectedData.email || ''} name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zakat Per Bulan</label>
                        <input defaultValue={selectedData.zakat_per_bulan || ''} name="zakat_per_bulan" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Rumah *</label>
                      <textarea defaultValue={selectedData.alamat || ''} required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Kantor</label>
                      <textarea defaultValue={selectedData.alamat_kantor || ''} name="alamat_kantor" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lembaga *</label>
                        <input defaultValue={selectedData.nama} required name="name" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon Kantor *</label>
                        <input defaultValue={selectedData.telepon || ''} required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Pengukuhan</label>
                        <input defaultValue={selectedData.no_pengukuhan || ''} name="no_pengukuhan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Pengukuhan</label>
                        <input defaultValue={selectedData.tanggal_pengukuhan || ''} name="tanggal_pengukuhan" type="date" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                        <input defaultValue={selectedData.website || ''} name="website" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga</label>
                        <input defaultValue={selectedData.jenis_lembaga || ''} name="jenis_lembaga" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fax</label>
                        <input defaultValue={selectedData.fax || ''} name="fax" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Kantor</label>
                        <input defaultValue={selectedData.email || ''} name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zakat per Bulan</label>
                        <input defaultValue={selectedData.zakat_per_bulan || ''} name="zakat_per_bulan" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Bagian Contact Person (CP)</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama CP *</label>
                          <input defaultValue={selectedData.cp_nama || ''} required name="cp_nama" type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Telepon CP *</label>
                          <input defaultValue={selectedData.cp_telepon || ''} required name="cp_telepon" type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email CP</label>
                        <input defaultValue={selectedData.cp_email || ''} name="cp_email" type="email" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-primary focus:border-primary outline-none transition-all" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lembaga *</label>
                      <textarea defaultValue={selectedData.alamat || ''} required name="address" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan / Keterangan Tambahan</label>
                    <textarea defaultValue={selectedData.keterangan || selectedData.catatan || ''} name="catatan" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select defaultValue={selectedData.status || 'Aktif'} name="status" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button type="button" onClick={handleDeleteMuzakki} className="px-6 py-3 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center">
                    <Trash2 className="size-4" />
                  </button>
                  <div className="flex-1 flex gap-3">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                    <button type="submit" disabled={isLoading} className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                      {isLoading ? 'Menyimpan...' : 'Simpan Data'}
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
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Detail Muzakki
                </h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-black shrink-0">
                    {selectedData.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedData.nama}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {selectedData.kategori} - {selectedData.status}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-slate-700">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Layers className="size-3.5" /> NPWZ
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-1 font-mono">{selectedData.npwz || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <FileText className="size-3.5" /> NPWP
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-1 font-mono">{selectedData.npwp || '-'}</p>
                  </div>

                  {selectedData.kategori === 'Perorangan' ? (
                    <>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <FileText className="size-3.5" /> NIK
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={cn('text-sm font-semibold text-slate-800 font-mono', !detailNIKRevealed && 'tracking-widest')}>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="size-3.5" /> Tempat, Tanggal Lahir
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {selectedData.tempat_lahir || '-'}{selectedData.tanggal_lahir ? `, ${selectedData.tanggal_lahir}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Users className="size-3.5" /> Jenis Kelamin
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.jenis_kelamin || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Layers className="size-3.5" /> Pekerjaan &amp; UPZ
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {selectedData.pekerjaan || '-'}{selectedData.upz ? ` (UPZ: ${selectedData.upz})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Phone className="size-3.5" /> Handphone
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.handphone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Phone className="size-3.5" /> Telepon Rumah
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.telepon || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Mail className="size-3.5" /> Email
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign className="size-3.5" /> Zakat Per Bulan
                        </p>
                        <p className="text-sm font-semibold text-emerald-600 mt-1">
                          {selectedData.zakat_per_bulan ? `Rp ${Number(selectedData.zakat_per_bulan).toLocaleString('id-ID')}` : '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="size-3.5" /> Alamat Rumah
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.alamat || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="size-3.5" /> Alamat Kantor
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.alamat_kantor || '-'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <FileText className="size-3.5" /> No &amp; Tgl Pengukuhan
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {selectedData.no_pengukuhan || '-'}{selectedData.tanggal_pengukuhan ? ` (${selectedData.tanggal_pengukuhan})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Layers className="size-3.5" /> Jenis Lembaga
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.jenis_lembaga || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Phone className="size-3.5" /> Telepon Kantor &amp; Fax
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {selectedData.telepon || '-'}{selectedData.fax ? ` (Fax: ${selectedData.fax})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Mail className="size-3.5" /> Email Kantor &amp; Web
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {selectedData.email || '-'}{selectedData.website ? ` (Web: ${selectedData.website})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign className="size-3.5" /> Zakat Per Bulan
                        </p>
                        <p className="text-sm font-semibold text-emerald-600 mt-1">
                          {selectedData.zakat_per_bulan ? `Rp ${Number(selectedData.zakat_per_bulan).toLocaleString('id-ID')}` : '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="size-3.5" /> Alamat Lembaga
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedData.alamat || '-'}</p>
                      </div>

                      <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Contact Person (CP)</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Nama CP</span>
                            <span className="font-semibold text-slate-800">{selectedData.cp_nama || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Telepon CP</span>
                            <span className="font-semibold text-slate-800">{selectedData.cp_telepon || '-'}</span>
                          </div>
                          <div className="col-span-2 mt-1">
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Email CP</span>
                            <span className="font-semibold text-slate-800">{selectedData.cp_email || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <FileText className="size-3.5" /> Catatan / Keterangan
                    </p>
                    <p className="text-xs font-medium text-slate-600 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                      "{selectedData.keterangan || selectedData.catatan || 'Tidak ada catatan khusus.'}"
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                  >
                    Tutup Detail
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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="text-xl font-black text-slate-900">Migrasi Data Muzakki</h3>
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
                  <p className="text-xs text-slate-500">Gunakan file Excel (.xlsx) dengan kolom NIK/NPWP, NPWZ, Nama, Alamat, Kategori, Status.</p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
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
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={handleFileUpload} 
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Pastikan kolom NIK (Perorangan) atau Nama Lembaga (Lembaga) tidak kosong. Data yang sudah terdaftar akan otomatis diperbarui.
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

  function wargaNIKButton(id: string) {
    return (
      <button
        onClick={() => toggleNIK(id)}
        className="p-1 text-slate-300 hover:text-primary transition-colors shrink-0"
        title={revealedNIKs.has(id) ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
      >
        {revealedNIKs.has(id)
          ? <EyeOff className="size-3.5" />
          : <Eye className="size-3.5" />}
      </button>
    );
  }
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
