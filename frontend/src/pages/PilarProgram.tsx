import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Eye,
  LayoutGrid as Category,
  List,
  History,
  Search,
  PlusCircle,
  X,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { Pilar, Program } from '../data/pilarData';

export default function PilarProgram() {
  const [data, setData] = useState<Pilar[]>([]);
  const [expandedPilar, setExpandedPilar] = useState<string | null>("1100");
  const [searchTerm, setSearchTerm] = useState("");

  React.useEffect(() => {
    axios.get('http://127.0.0.1:4000/api/pilars')
      .then(res => setData(res.data))
      .catch(console.error);
  }, []);

  // Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editType, setEditType] = useState<'pilar' | 'program'>('pilar');
  const [editingPilar, setEditingPilar] = useState<Pilar | null>(null);
  const [editingProgram, setEditingProgram] = useState<{ pilarCode: string, program: Program } | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', category: '', budget_rkat: '' });

  const togglePilar = (code: string) => {
    setExpandedPilar(expandedPilar === code ? null : code);
  };

  const handleEditPilar = (pilar: Pilar) => {
    setEditType('pilar');
    setIsAdding(false);
    setEditingPilar(pilar);
    setFormData({ code: pilar.code, name: pilar.name, category: pilar.category, budget_rkat: '' });
    setIsModalOpen(true);
  };

  const handleEditProgram = (pilarCode: string, program: Program) => {
    setEditType('program');
    setIsAdding(false);
    setEditingProgram({ pilarCode, program });
    setFormData({ code: program.code, name: program.name, category: '', budget_rkat: program.budget_rkat?.toString() || '' });
    setIsModalOpen(true);
  };

  const handleAddPilar = () => {
    setEditType('pilar');
    setIsAdding(true);
    setEditingPilar(null);
    setFormData({ code: (Math.max(...data.map(p => parseInt(p.code))) + 100).toString(), name: '', category: '', budget_rkat: '' });
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
    setFormData({ code: nextCode, name: '', category: '', budget_rkat: '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editType === 'pilar') {
        if (!isAdding && editingPilar) {
          // Update
          const res = await axios.put(`http://127.0.0.1:4000/api/pilars/${editingPilar.code}`, {
            name: formData.name, category: formData.category
          });
          setData(prev => prev.map(p => p.code === editingPilar.code ? { ...p, ...res.data } : p));
        } else {
          // Add
          const res = await axios.post('http://127.0.0.1:4000/api/pilars', {
            code: formData.code, name: formData.name, category: formData.category, status: 'Aktif'
          });
          setData(prev => [...prev, { ...res.data, programs: [] }]);
        }
      } else if (editType === 'program' && editingProgram) {
        if (!isAdding) {
          const res = await axios.put(`http://127.0.0.1:4000/api/programs/${editingProgram.program.code}`, {
            pilar_code: editingProgram.pilarCode,
            name: formData.name,
            budget_rkat: formData.budget_rkat ? parseInt(formData.budget_rkat) : undefined
          });
          setData(prev => prev.map(p => p.code === editingProgram.pilarCode ? {
            ...p,
            programs: p.programs.map(pr => pr.code === editingProgram.program.code ? res.data : pr)
          } : p));
        } else {
          const res = await axios.post('http://127.0.0.1:4000/api/programs', {
            code: formData.code,
            pilar_code: editingProgram.pilarCode,
            name: formData.name,
            budget_rkat: formData.budget_rkat ? parseInt(formData.budget_rkat) : undefined
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
    if (window.confirm("Apakah Anda yakin ingin menghapus pilar ini beserta seluruh program di dalamnya?")) {
      try {
        await axios.delete(`http://127.0.0.1:4000/api/pilars/${code}`);
        setData(prev => prev.filter(p => p.code !== code));
      } catch (e) {
        alert('Gagal menghapus pilar.');
      }
    }
  };

  const handleDeleteProgram = async (pilarCode: string, programCode: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus program ini?")) {
      try {
        await axios.delete(`http://127.0.0.1:4000/api/programs/${programCode}`);
        setData(prev => prev.map(p => p.code === pilarCode ? {
          ...p,
          programs: p.programs.filter(pr => pr.code !== programCode)
        } : p));
      } catch (e) {
        alert('Gagal menghapus program.');
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs font-medium text-slate-500"
      >
        <span className="hover:text-primary transition-colors cursor-pointer">Master Data</span>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-primary font-bold">Pilar & Program</span>
      </motion.div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Master Data: Pilar & Program</h2>
          <p className="text-slate-500 text-sm font-medium">Kelola klasifikasi pilar utama dan kode program berdasarkan standar SIMBA BAZNAS.</p>
        </div>
        <button
          onClick={handleAddPilar}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="size-4" />
          Tambah Pilar Baru
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Kode / Nama Pilar / Nama Program..."
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-primary/10 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
          />
        </div>

        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-xl border border-primary/10 shadow-sm flex items-center gap-4 min-w-[180px]">
            <div className="size-10 rounded-lg bg-emerald-100 text-primary flex items-center justify-center shrink-0">
              <Category className="size-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pilar</p>
              <p className="text-xl font-black text-slate-900">{totalPilar}</p>
            </div>
          </div>

          <div className="bg-white px-6 py-3 rounded-xl border border-primary/10 shadow-sm flex items-center gap-4 min-w-[180px]">
            <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <List className="size-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Program</p>
              <p className="text-xl font-black text-slate-900">{totalProgram}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-primary/5">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Kode Pilar</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Nama Pilar</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Program</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Aksi</th>
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
                        {pilar.programs.length} Program
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
                          title="Edit Pilar"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePilar(pilar.code); }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Pilar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); /* View logic */ }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="size-4" />
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
                                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">{prog.code}</span>
                                      <span className="text-sm font-bold text-slate-700 leading-tight">{prog.name}</span>
                                      {prog.budget_rkat ? (
                                        <span className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full border border-emerald-100">
                                          Budget: Rp {prog.budget_rkat.toLocaleString('id-ID')}
                                        </span>
                                      ) : null}
                                    </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditProgram(pilar.code, prog); }}
                                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                      title="Edit Program"
                                    >
                                      <Edit2 className="size-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteProgram(pilar.code, prog.code); }}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                      title="Hapus Program"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div
                                onClick={() => handleAddProgram(pilar.code)}
                                className="flex items-center justify-center p-3 border-2 border-dashed border-primary/20 rounded-xl hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group"
                              >
                                <span className="text-xs font-bold text-primary flex items-center gap-2">
                                  <PlusCircle className="size-4" />
                                  Tambah Program Baru
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
          <p className="text-xs text-slate-500 font-bold">Menampilkan {filteredData.length} dari {totalPilar} Pilar Utama</p>
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
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget RKAT (Rp)</label>
                    <input
                      type="number"
                      value={formData.budget_rkat}
                      onChange={(e) => setFormData({ ...formData, budget_rkat: e.target.value })}
                      placeholder="Contoh: 5000000"
                      className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    />
                    <p className="text-[10px] text-slate-400">Biarkan kosong jika tidak ada patokan awal budget.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 flex items-center gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  Simpan Perubahan
                </button>
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
            Data pilar dan program disinkronkan terakhir pada <span className="font-bold text-primary">12 Maret 2024</span>.
            Pastikan kode program sesuai dengan pedoman SIMBA terbaru untuk akurasi pelaporan.
          </p>
        </div>
      </div>
    </div>
  );
}
