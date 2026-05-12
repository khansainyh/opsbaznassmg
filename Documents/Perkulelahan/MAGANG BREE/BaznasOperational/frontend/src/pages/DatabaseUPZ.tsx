import { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  History, 
  Settings2, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  XCircle, 
  X, 
  PlusCircle, 
  Eye, 
  MapPin, 
  Phone, 
  User, 
  Info,
  Calendar,
  Upload,
  FileSpreadsheet,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { upzData as initialUpzData, skHistoryData } from '@/src/data/upzData';
import { UPZ } from '@/src/types/upz';

const kecamatanData: Record<string, string[]> = {
  "Semarang Tengah": ["Pekunden", "Sekayu", "Kembangsari", "Miroto"],
  "Pedurungan": ["Tlogosari Kulon", "Tlogosari Wetan", "Pedurungan Kidul", "Pedurungan Lor"],
  "Banyumanik": ["Srondol Kulon", "Srondol Wetan", "Padangsari", "Banyumanik"],
  "Mijen": ["Jatisari", "Mijen", "Pesantren", "Kedungpane"]
};

export default function DatabaseUPZ() {
  const [data] = useState<UPZ[]>(initialUpzData);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [kecamatanFilter, setKecamatanFilter] = useState('Semua');
  const [selectedUPZ, setSelectedUPZ] = useState<UPZ | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form States for Add/Edit
  const [formKecamatan, setFormKecamatan] = useState('');
  const [formKelurahan, setFormKelurahan] = useState('');
  const [formType, setFormType] = useState<'On-Balance' | 'Off-Balance'>('Off-Balance');
  const [formCategory, setFormCategory] = useState('Masjid');
  const [formPengurus, setFormPengurus] = useState({
    penasehat: { nama: '', alamat: '' },
    ketua: { nama: '', alamat: '' },
    sekretaris: { nama: '', alamat: '' },
    bendahara: { nama: '', alamat: '' },
    anggota1: { nama: '', alamat: '' },
    anggota2: { nama: '', alamat: '' },
  });
  const [anggotaTambahan, setAnggotaTambahan] = useState<{ nama: string; alamat: string }[]>([]);

  const kelurahanOptions = useMemo(() => {
    return formKecamatan ? kecamatanData[formKecamatan] || [] : [];
  }, [formKecamatan]);

  const isFlexibleAnggota = formCategory === 'OPD' || formCategory === 'Kecamatan';

  const updatePengurusField = (jabatan: keyof typeof formPengurus, field: 'nama' | 'alamat', value: string) => {
    setFormPengurus(prev => ({ ...prev, [jabatan]: { ...prev[jabatan], [field]: value } }));
  };

  const addAnggotaTambahan = () => {
    setAnggotaTambahan(prev => [...prev, { nama: '', alamat: '' }]);
  };

  const updateAnggotaTambahan = (index: number, field: 'nama' | 'alamat', value: string) => {
    setAnggotaTambahan(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeAnggotaTambahan = (index: number) => {
    setAnggotaTambahan(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormKecamatan('');
    setFormKelurahan('');
    setFormType('Off-Balance');
    setFormCategory('Masjid');
    setFormPengurus({
      penasehat: { nama: '', alamat: '' },
      ketua: { nama: '', alamat: '' },
      sekretaris: { nama: '', alamat: '' },
      bendahara: { nama: '', alamat: '' },
      anggota1: { nama: '', alamat: '' },
      anggota2: { nama: '', alamat: '' },
    });
    setAnggotaTambahan([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (upz: UPZ) => {
    setSelectedUPZ(upz);
    setFormKecamatan(upz.kecamatan);
    setFormKelurahan(upz.kelurahan);
    setFormType(upz.type);
    setFormCategory(upz.category);
    const p = upz.metadata.pengurus;
    if (p) {
      setFormPengurus({
        penasehat: { nama: p.penasehat?.nama || '', alamat: p.penasehat?.alamat || '' },
        ketua: { nama: p.ketua?.nama || '', alamat: p.ketua?.alamat || '' },
        sekretaris: { nama: p.sekretaris?.nama || '', alamat: p.sekretaris?.alamat || '' },
        bendahara: { nama: p.bendahara?.nama || '', alamat: p.bendahara?.alamat || '' },
        anggota1: { nama: p.anggota1?.nama || '', alamat: p.anggota1?.alamat || '' },
        anggota2: { nama: p.anggota2?.nama || '', alamat: p.anggota2?.alamat || '' },
      });
      setAnggotaTambahan((p.anggotaTambahan || []).map(a => ({ nama: a.nama, alamat: a.alamat || '' })));
    }
    setIsEditModalOpen(true);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.kelurahan.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Semua' || item.category === categoryFilter;
      const matchesKecamatan = kecamatanFilter === 'Semua' || item.kecamatan === kecamatanFilter;
      return matchesSearch && matchesCategory && matchesKecamatan;
    });
  }, [data, searchTerm, categoryFilter, kecamatanFilter]);

  const stats = useMemo(() => {
    const onBalance = data.filter(d => d.type === 'On-Balance').length;
    const offBalance = data.filter(d => d.type === 'Off-Balance').length;
    
    return {
      total: data.length,
      onBalance,
      offBalance,
    };
  }, [data]);

  const handleHistoryClick = (upz: UPZ) => {
    setSelectedUPZ(upz);
    setIsHistoryModalOpen(true);
  };

  const getHistoryForUPZ = (upzId: string) => {
    return skHistoryData.filter((h: any) => h.upzId === upzId);
  };

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
          <span className="text-primary font-bold">Database UPZ</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Database & Legalitas UPZ</h2>
            <p className="text-slate-500 font-medium">Manajemen data Unit Pengumpul Zakat (UPZ) On-Balance & Off-Balance.</p>
          </div>
        </div>
      </motion.div>

      {/* Info Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ Terdaftar</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Keseluruhan UPZ BAZNAS</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ On-Balance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.onBalance}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Setoran Tunai BAZNAS</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ Off-Balance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.offBalance}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Pengelolaan Mandiri</p>
          </div>
        </div>
      </motion.div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-primary/10 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari Nama UPZ / Kelurahan..."
              className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer font-medium text-slate-600"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="Semua">Semua Kategori</option>
            <option value="OPD">OPD</option>
            <option value="Kecamatan">Kecamatan</option>
            <option value="Sekolah">Sekolah</option>
            <option value="Masjid">Masjid</option>
            <option value="Yayasan/Lembaga">Yayasan/Lembaga</option>
          </select>
          <select 
            className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer font-medium text-slate-600"
            value={kecamatanFilter}
            onChange={(e) => setKecamatanFilter(e.target.value)}
          >
            <option value="Semua">Semua Kecamatan</option>
            <option value="Semarang Tengah">Semarang Tengah</option>
            <option value="Pedurungan">Pedurungan</option>
            <option value="Mijen">Mijen</option>
          </select>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsMigrationModalOpen(true)}
            className="flex-1 lg:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload className="size-4" />
            Migrasi Data
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="size-4" />
            Registrasi UPZ Baru
          </button>
        </div>
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">Kode Sistem</th>
                <th className="px-6 py-4">Nama UPZ</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Wilayah (Kec/Kel)</th>
                <th className="px-6 py-4 text-center">SK Aktif</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.metadata.pimpinanTitle}: {item.metadata.pimpinanName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                      item.type === 'On-Balance' 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-emerald-100 text-emerald-700"
                    )}>
                      {item.category} ({item.type === 'On-Balance' ? 'On' : 'Off'})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-600">{item.kecamatan}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.kelurahan}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700">{item.activeSKNumber}</span>
                        {new Date(item.skExpiryDate) > new Date() ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-rose-500" />
                        )}
                      </div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Exp: {item.skExpiryDate}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleHistoryClick(item)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Riwayat SK"
                      >
                        <History className="size-5" />
                      </button>
                      <button 
                        onClick={() => { setSelectedUPZ(item); setIsDetailModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" 
                        title="Detail UPZ"
                      >
                        <Eye className="size-5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" 
                        title="Pembaruan UPZ"
                      >
                        <Settings2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Menampilkan {filteredData.length} dari {data.length} UPZ
          </p>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all">
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button className="size-8 rounded-lg bg-primary text-white text-xs font-black shadow-lg shadow-primary/20">1</button>
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* SK History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <History className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">Riwayat SK & Kepengurusan</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-primary font-bold flex items-center gap-1">
                        <Building2 className="size-3" />
                        {selectedUPZ.name} ({selectedUPZ.code})
                      </p>
                      <span className="text-slate-300">|</span>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="size-3" />
                        {selectedUPZ.kelurahan}, {selectedUPZ.kecamatan}
                      </p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Daftar Rekam Jejak SK</h4>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                    <PlusCircle className="size-4" />
                    Perbarui SK Baru
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <th className="px-6 py-4">No. SK</th>
                        <th className="px-6 py-4">Masa Berlaku</th>
                        <th className="px-6 py-4">Pengurus Utama</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getHistoryForUPZ(selectedUPZ.id).map((history: any) => (
                        <tr key={history.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-slate-900">{history.skNumber}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                              <Calendar className="size-4 text-slate-400" />
                              <span>{new Date(history.startDate).getFullYear()} - {new Date(history.endDate).getFullYear()}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Masa Jabatan 5 Tahun</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <User className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{history.pimpinanName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedUPZ.metadata.pimpinanTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              history.status === 'Aktif' 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-rose-100 text-rose-700"
                            )}>
                              {history.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="px-4 py-1.5 border border-primary/20 text-primary rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center gap-2 ml-auto">
                              <Eye className="size-3" />
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                  <Info className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">Catatan Legalitas</p>
                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                      Setiap pergantian pengurus wajib disertai dengan SK baru yang diterbitkan oleh BAZNAS Kota Semarang. Masa berlaku SK standar adalah 5 tahun sejak tanggal ditetapkan. Data riwayat ini digunakan untuk memvalidasi pengajuan proposal di masa lalu agar sesuai dengan pengurus yang menjabat saat itu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Migrasi Data UPZ</h3>
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
                  <p className="text-xs text-slate-500">Gunakan template yang tersedia untuk memastikan format data sesuai dengan sistem.</p>
                </div>

                <div className="space-y-3">
                  <a 
                    href="/Template_Migrasi_Database_UPZ.xlsx" 
                    download="Template_Migrasi_Database_UPZ.xlsx"
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </a>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data</p>
                        <p className="text-[10px] text-slate-400 font-medium">Maksimal file 10MB</p>
                      </div>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={() => {
                      alert('Fitur upload sedang diproses. Data akan divalidasi sebelum diimpor.');
                      setIsMigrationModalOpen(false);
                    }} />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Pastikan kolom Kode UPZ tidak kosong dan unik. Data duplikat akan dilewati secara otomatis oleh sistem.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detail Informasi UPZ</h3>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Sistem</p>
                      <p className="text-sm font-mono font-bold text-primary">{selectedUPZ.code}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori / Tipe</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.category} ({selectedUPZ.type})</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wilayah</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.kelurahan}, {selectedUPZ.kecamatan}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</p>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">{selectedUPZ.metadata.address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.metadata.upzPhone || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Pengurus Utama</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                        <User className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedUPZ.metadata.pimpinanTitle}</p>
                        <p className="text-sm font-bold text-slate-900">{selectedUPZ.metadata.pimpinanName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                        <MapPin className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Penasehat</p>
                        <p className="text-sm font-bold text-slate-900">{selectedUPZ.metadata.pimpinanAddress || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit / Pembaruan Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Edit2 className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pembaruan Data UPZ</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Section 1: Profil Utama */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Profil Utama</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</label>
                      <input 
                        type="text" 
                        defaultValue={selectedUPZ.name}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori UPZ</label>
                      <select 
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option>OPD</option>
                        <option>Kecamatan</option>
                        <option>Sekolah</option>
                        <option>Masjid/Musholla</option>
                        <option>Yayasan/Lembaga</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Dana</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="edit_type" 
                          checked={formType === 'Off-Balance'} 
                          onChange={() => setFormType('Off-Balance')}
                          className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">Off-Balance Laporan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="edit_type" 
                          checked={formType === 'On-Balance'} 
                          onChange={() => setFormType('On-Balance')}
                          className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">On-Balance (Kas BAZNAS)</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Section 2: Lokasi & Wilayah */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Lokasi & Wilayah</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      <select 
                        value={formKecamatan}
                        onChange={(e) => { setFormKecamatan(e.target.value); setFormKelurahan(''); }}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="">Pilih Kecamatan</option>
                        {Object.keys(kecamatanData).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      <select 
                        value={formKelurahan}
                        onChange={(e) => setFormKelurahan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        disabled={!formKecamatan}
                      >
                        <option value="">Pilih Kelurahan</option>
                        {kelurahanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      defaultValue={selectedUPZ.metadata.address}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</label>
                    <input 
                      type="text" 
                      defaultValue={selectedUPZ.metadata.upzPhone}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                </section>

                {/* Section 3: Data Legalitas */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Data Legalitas (SK)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. SK Penetapan</label>
                      <input 
                        type="text" 
                        defaultValue={selectedUPZ.activeSKNumber}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Mulai</label>
                      <input 
                        type="number" 
                        defaultValue={new Date(selectedUPZ.skExpiryDate).getFullYear() - 5}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Berakhir</label>
                      <input 
                        type="number" 
                        defaultValue={new Date(selectedUPZ.skExpiryDate).getFullYear()}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4: Data Pengurus */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Struktur Kepengurusan</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">Isi nama dan alamat untuk setiap posisi. Jabatan sudah pakem sesuai struktur UPZ.</p>

                  {/* Fixed Roles */}
                  {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                    <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].nama}
                          onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)}
                          placeholder={`Nama ${jabatan}...`}
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder="Alamat..."
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Dynamic Anggota Tambahan - OPD & Kecamatan only */}
                  {isFlexibleAnggota && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan <span className="text-primary">(OPD/Kecamatan)</span></p>
                        <button
                          type="button"
                          onClick={addAnggotaTambahan}
                          className="text-[10px] font-black text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle className="size-3" />
                          Tambah Anggota
                        </button>
                      </div>
                      {anggotaTambahan.map((a, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start">
                          <div className="col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-1 flex items-end justify-end mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                              <X className="size-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all"
                >
                  Batalkan Perubahan
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    alert('Data UPZ berhasil diperbarui.');
                    setIsEditModalOpen(false);
                  }}
                  className="px-10 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Registrasi UPZ Baru</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Section 1: Profil Utama */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Profil Utama</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</label>
                      <input 
                        type="text" 
                        placeholder="Masukkan nama UPZ..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori UPZ</label>
                      <select 
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option>OPD</option>
                        <option>Kecamatan</option>
                        <option>Sekolah</option>
                        <option>Masjid/Musholla</option>
                        <option>Yayasan/Lembaga</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Dana</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="add_type" 
                          checked={formType === 'Off-Balance'} 
                          onChange={() => setFormType('Off-Balance')}
                          className="size-5 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">Off-Balance Laporan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="add_type" 
                          checked={formType === 'On-Balance'} 
                          onChange={() => setFormType('On-Balance')}
                          className="size-5 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">On-Balance (Kas BAZNAS)</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Section 2: Lokasi & Wilayah */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Lokasi & Wilayah</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      <select 
                        value={formKecamatan}
                        onChange={(e) => { setFormKecamatan(e.target.value); setFormKelurahan(''); }}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="">Pilih Kecamatan</option>
                        {Object.keys(kecamatanData).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      <select 
                        value={formKelurahan}
                        onChange={(e) => setFormKelurahan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        disabled={!formKecamatan}
                      >
                        <option value="">Pilih Kelurahan</option>
                        {kelurahanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      placeholder="Masukkan alamat lengkap..."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan No. Telepon UPZ..."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                </section>

                {/* Section 3: Data Legalitas */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Data Legalitas (SK)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. SK Penetapan</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 12.1"
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Mulai</label>
                      <input 
                        type="number" 
                        placeholder="Tahun..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Berakhir</label>
                      <input 
                        type="number" 
                        placeholder="Tahun..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4: Data Pengurus */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Struktur Kepengurusan</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">Isi nama dan alamat untuk setiap posisi. Jabatan sudah pakem sesuai struktur UPZ.</p>

                  {/* Fixed Roles */}
                  {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                    <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].nama}
                          onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)}
                          placeholder={`Nama ${jabatan}...`}
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder="Alamat..."
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Dynamic Anggota Tambahan - OPD & Kecamatan only */}
                  {isFlexibleAnggota && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan <span className="text-primary">(OPD/Kecamatan)</span></p>
                        <button
                          type="button"
                          onClick={addAnggotaTambahan}
                          className="text-[10px] font-black text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle className="size-3" />
                          Tambah Anggota
                        </button>
                      </div>
                      {anggotaTambahan.map((a, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start">
                          <div className="col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-1 flex items-end justify-end mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                              <X className="size-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all"
                >
                  Batalkan Registrasi
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    alert('UPZ baru berhasil didaftarkan.');
                    setIsAddModalOpen(false);
                  }}
                  className="px-10 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                >
                  Daftarkan UPZ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
