import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  LayoutGrid as Category,
  List,
  History,
  Search,
  PlusCircle,
  X,
  Save,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { Pilar, Program } from '../data/pilarData';

export default function PilarProgram() {
  const [data, setData] = useState<Pilar[]>([]);
  const [expandedPilar, setExpandedPilar] = useState<string | null>("1100");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Find the latest updated_at among all pilars and programs dynamically
  const lastUpdatedDateStr = React.useMemo(() => {
    let maxTime = 0;
    
    data.forEach(pilar => {
      if (pilar.updated_at) {
        const time = new Date(pilar.updated_at).getTime();
        if (time > maxTime) maxTime = time;
      }
      if (pilar.created_at) {
        const time = new Date(pilar.created_at).getTime();
        if (time > maxTime) maxTime = time;
      }
      pilar.programs?.forEach(prog => {
        if (prog.updated_at) {
          const time = new Date(prog.updated_at).getTime();
          if (time > maxTime) maxTime = time;
        }
        if (prog.created_at) {
          const time = new Date(prog.created_at).getTime();
          if (time > maxTime) maxTime = time;
        }
      });
    });

    if (maxTime === 0) {
      return "4 Juli 2026"; // Fallback to current developer fix date
    }

    // Format to Indonesian date style, e.g. "4 Juli 2026"
    const date = new Date(maxTime);
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }, [data]);

  // Migration & Notification States
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/pilars');
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { 
        "Kode Program": "1100", 
        "Kode Kegiatan": "1101", 
        "Nama Kegiatan": "Bantuan Sembako Dhuafa",
        "Tipe": "Konsumtif"
      },
      { 
        "Kode Program": "1100", 
        "Kode Kegiatan": "1102", 
        "Nama Kegiatan": "Bantuan Kebencanaan & Tanggap Darurat",
        "Tipe": "Konsumtif"
      },
      {
        "Kode Program": "1200",
        "Kode Kegiatan": "1201",
        "Nama Kegiatan": "Pemberdayaan Ekonomi Mustahik",
        "Tipe": "Produktif"
      }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format Kegiatan");
    XLSX.writeFile(workbook, "Template_Migrasi_Kegiatan.xlsx");
  };

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

      const res = await axios.post('/api/programs/import', parsedData);
      
      const newMessages = [];
      if (res.data.status === 'success') {
        if (res.data.insertedPilars > 0) {
          newMessages.push({ type: 'success', text: `Berhasil menambahkan ${res.data.insertedPilars} Program baru.` });
        }
        if (res.data.insertedPrograms > 0) {
          newMessages.push({ type: 'success', text: `Berhasil menambahkan ${res.data.insertedPrograms} Kegiatan baru.` });
        }
        if (res.data.updatedPrograms > 0) {
          newMessages.push({ type: 'success', text: `Berhasil memperbarui ${res.data.updatedPrograms} Kegiatan.` });
        }
        if (res.data.insertedPrograms === 0 && res.data.updatedPrograms === 0 && res.data.insertedPilars === 0) {
          newMessages.push({ type: 'warning', text: `Tidak ada data baru yang diproses.` });
        }
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

  // Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editType, setEditType] = useState<'pilar' | 'program'>('pilar');
  const [editingPilar, setEditingPilar] = useState<Pilar | null>(null);
  const [editingProgram, setEditingProgram] = useState<{ pilarCode: string, program: Program } | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', category: '', tipe: 'Konsumtif' });

  const togglePilar = (code: string) => {
    setExpandedPilar(expandedPilar === code ? null : code);
  };

  const handleEditPilar = (pilar: Pilar) => {
    setEditType('pilar');
    setIsAdding(false);
    setEditingPilar(pilar);
    setFormData({ code: pilar.code, name: pilar.name, category: pilar.category, tipe: 'Konsumtif' });
    setIsModalOpen(true);
  };

  const handleEditProgram = (pilarCode: string, program: Program) => {
    setEditType('program');
    setIsAdding(false);
    setEditingProgram({ pilarCode, program });
    setFormData({ code: program.code, name: program.name, category: '', tipe: program.tipe || 'Konsumtif' });
    setIsModalOpen(true);
  };

  const handleAddPilar = () => {
    setEditType('pilar');
    setIsAdding(true);
    setEditingPilar(null);
    setFormData({ code: (Math.max(...data.map(p => parseInt(p.code))) + 100).toString(), name: '', category: '', tipe: 'Konsumtif' });
    setIsModalOpen(true);
  };

  const handleAddProgram = (pilarCode: string) => {
    const pilar = data.find(p => p.code === pilarCode);
    if (!pilar) return;

    let nextCode = "";
    if (pilar.programs.length > 0) {
      const lastCode = pilar.programs[pilar.programs.length - 1].code;
      if (lastCode.includes('.')) {
        const parts = lastCode.split('.');
        nextCode = `${parts[0]}.${parseInt(parts[1]) + 1}`;
      } else {
        nextCode = (parseInt(lastCode) + 1).toString();
      }
    } else {
      nextCode = (parseInt(pilarCode) + 1).toString();
    }

    setEditType('program');
    setIsAdding(true);
    setEditingProgram({ pilarCode, program: { code: nextCode, name: '' } });
    setFormData({ code: nextCode, name: '', category: '', tipe: 'Konsumtif' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editType === 'pilar') {
        if (!isAdding && editingPilar) {
          // Update
          const res = await axios.put(`/api/pilars/${editingPilar.code}`, {
            name: formData.name, category: formData.category
          });
          setData(prev => prev.map(p => p.code === editingPilar.code ? { ...p, ...res.data } : p));
        } else {
          // Add
          const res = await axios.post('/api/pilars', {
            code: formData.code, name: formData.name, category: formData.category, status: 'Aktif'
          });
          setData(prev => [...prev, { ...res.data, programs: [] }]);
        }
      } else if (editType === 'program' && editingProgram) {
        if (!isAdding) {
          const res = await axios.put(`/api/programs/${editingProgram.program.code}`, {
            pilar_code: editingProgram.pilarCode,
            name: formData.name,
            tipe: formData.tipe
          });
          setData(prev => prev.map(p => p.code === editingProgram.pilarCode ? {
            ...p,
            programs: p.programs.map(pr => pr.code === editingProgram.program.code ? res.data : pr)
          } : p));
        } else {
          const res = await axios.post('/api/programs', {
            code: formData.code,
            pilar_code: editingProgram.pilarCode,
            name: formData.name,
            tipe: formData.tipe
          });
          setData(prev => prev.map(p => p.code === editingProgram.pilarCode ? {
            ...p,
            programs: [...p.programs, res.data]
          } : p));
        }
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan data ke server.');
    }
  };

  const handleDeletePilar = async (code: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus program ini beserta seluruh kegiatan di dalamnya?")) {
      try {
        await axios.delete(`/api/pilars/${code}`);
        setData(prev => prev.filter(p => p.code !== code));
      } catch (e) {
        alert('Gagal menghapus program.');
      }
    }
  };

  const handleDeleteProgram = async (pilarCode: string, programCode: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) {
      try {
        await axios.delete(`/api/programs/${programCode}`);
        setData(prev => prev.map(p => p.code === pilarCode ? {
          ...p,
          programs: p.programs.filter(pr => pr.code !== programCode)
        } : p));
      } catch (e) {
        alert('Gagal menghapus kegiatan.');
      }
    }
  };

  const filteredData = data.filter(pilar =>
    pilar.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pilar.code.includes(searchTerm) ||
    pilar.programs.some(prog => prog.name.toLowerCase().includes(searchTerm.toLowerCase()) || prog.code.includes(searchTerm))
  );

  const totalPilar = data.length;
  const totalProgram = data.reduce((acc, curr) => acc + curr.programs.length, 0);

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
          <span className="text-primary font-bold">Program & Kegiatan</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Program & Kegiatan</h2>
            <p className="text-slate-500 font-medium">Kelola klasifikasi program utama dan kode kegiatan berdasarkan standar SIMBA BAZNAS.</p>
          </div>
          <div className="hidden md:flex gap-3">
            <button
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-slate-200 shadow-sm"
            >
              <Upload className="size-4 text-slate-400" />
              Migrasi Kegiatan
            </button>
            <button
              onClick={handleAddPilar}
              className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Plus className="size-4" />
              Tambah Program
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Kode / Nama Program / Nama Kegiatan..."
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-semibold shadow-sm bg-white"
          />
        </div>

        <div className="flex gap-3 shrink-0">
          <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5 min-w-[160px]">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Category className="size-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Total Program</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{totalPilar}</p>
            </div>
          </div>

          <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5 min-w-[160px]">
            <div className="size-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <List className="size-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Total Kegiatan</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{totalProgram}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Kode Program</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Nama Program</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Jumlah Kegiatan</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((pilar) => (
                <React.Fragment key={pilar.code}>
                  <tr
                    onClick={() => togglePilar(pilar.code)}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors cursor-pointer group",
                      expandedPilar === pilar.code && "bg-primary/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {expandedPilar === pilar.code ? (
                          <ChevronDown className="size-4 text-primary" />
                        ) : (
                          <ChevronRight className="size-4 text-slate-300 group-hover:text-primary" />
                        )}
                        <span className="text-sm font-bold text-primary">{pilar.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{pilar.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{pilar.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        {pilar.programs.length} Kegiatan
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
                        pilar.status === 'Aktif'
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      )}>
                        <span className={cn("size-1.5 rounded-full", pilar.status === 'Aktif' ? "bg-green-500" : "bg-slate-400")}></span>
                        {pilar.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditPilar(pilar); }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Edit Program"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePilar(pilar.code); }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Program"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Programs */}
                  <AnimatePresence>
                    {expandedPilar === pilar.code && (
                      <tr>
                        <td colSpan={5} className="px-10 py-4 bg-primary/[0.02]">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2">
                              {pilar.programs.map((prog) => (
                                 <div
                                   key={prog.code}
                                   onClick={() => handleEditProgram(pilar.code, prog)}
                                   className="flex items-start justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer animate-fade-in min-h-[92px]"
                                 >
                                      <div className="flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                          <span className="text-[10px] font-black text-primary uppercase tracking-wider">{prog.code}</span>
                                          <span className={cn(
                                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border",
                                            prog.tipe === 'Produktif'
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-250/20"
                                          )}>
                                            {prog.tipe || 'Konsumtif'}
                                          </span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 leading-tight">{prog.name}</span>
                                      </div>
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button
                                       onClick={(e) => { e.stopPropagation(); handleEditProgram(pilar.code, prog); }}
                                       className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                       title="Edit Kegiatan"
                                     >
                                       <Edit2 className="size-3.5" />
                                     </button>
                                     <button
                                       onClick={(e) => { e.stopPropagation(); handleDeleteProgram(pilar.code, prog.code); }}
                                       className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                       title="Hapus Kegiatan"
                                     >
                                       <Trash2 className="size-3.5" />
                                     </button>
                                   </div>
                                 </div>
                              ))}
                              <div
                                onClick={() => handleAddProgram(pilar.code)}
                                className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:bg-primary/[0.02] hover:border-primary/40 transition-all cursor-pointer group min-h-[92px]"
                              >
                                <span className="text-xs font-bold text-primary flex items-center gap-2">
                                  <PlusCircle className="size-4 text-primary" />
                                  Tambah Kegiatan Baru
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-primary/5 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Menampilkan {filteredData.length} dari {totalPilar} Program Utama</p>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg bg-white border border-primary/10 text-slate-400 cursor-not-allowed">
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button className="size-8 rounded-lg bg-primary text-white text-xs font-black shadow-lg shadow-primary/20">1</button>
            <button className="p-2 rounded-lg bg-white border border-primary/10 text-slate-400 cursor-not-allowed">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <h3 className="text-lg font-bold text-slate-900">
                  {isAdding ? 'Tambah' : 'Edit'} {editType === 'pilar' ? 'Pilar' : 'Program'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kode</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!isAdding}
                    className={cn(
                      "w-full h-11 px-4 rounded-xl border font-bold outline-none transition-all",
                      !isAdding
                        ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        : "border-primary/10 focus:ring-2 focus:ring-primary/20 text-slate-900"
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama {editType === 'pilar' ? 'Pilar' : 'Program'}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>

                {editType === 'pilar' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    />
                  </div>
                )}

                {editType === 'program' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Klasifikasi Bantuan</label>
                    <select
                      value={formData.tipe}
                      onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium bg-white"
                    >
                      <option value="Konsumtif">Konsumtif</option>
                      <option value="Produktif">Produktif</option>
                    </select>
                  </div>
                )}

              </div>

              <div className="p-6 bg-slate-50">
                <button
                  onClick={handleSave}
                  className="w-full h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="size-4" />
                  <span className="hidden sm:inline">Simpan Perubahan</span>
                  <span className="inline sm:hidden">Simpan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary/5">
                <h3 className="text-lg font-bold text-slate-900">Migrasi Data Program</h3>
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
                  <p className="text-xs text-slate-500">Gunakan file Excel (.xlsx) dengan kolom Kode Program, Kode Kegiatan, Nama Kegiatan.</p>
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
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
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
                      accept=".xlsx,.xls,.csv" 
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
                      Sistem akan mencocokkan Kode Kegiatan. Jika sudah ada, data akan diperbarui (update). Jika Program belum terdaftar, sistem akan otomatis mendaftarkannya terlebih dahulu.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-start gap-4">
        <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
          <History className="size-5" />
        </div>
        <div>
          <h5 className="font-bold text-slate-900">Update Terakhir Sistem</h5>
          <p className="text-sm text-slate-600 mt-1">
            Data program dan kegiatan disinkronkan terakhir pada <span className="font-bold text-primary">{lastUpdatedDateStr}</span>.
            Pastikan kode kegiatan sesuai dengan pedoman SIMBA terbaru untuk akurasi pelaporan.
          </p>
        </div>
      </div>
      {/* Loading state overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100">
            <RefreshCw className="size-6 text-primary animate-spin" />
            <span className="text-sm font-bold text-slate-800">Memproses migrasi data...</span>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3">
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
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Kegiatan
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  handleAddPilar();
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Tambah Program
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
