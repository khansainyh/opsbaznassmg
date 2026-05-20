import React, { useState } from 'react';
import { 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Palette, 
  Bell, 
  BarChart3, 
  Filter,
  Download,
  Building2,
  Wallet,
  BookOpen,
  Headset,
  RefreshCw,
  CreditCard,
  X,
  AlertTriangle,
  BadgeAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface KasAccount {
  id: string;
  kode: string;
  nama: string;
  saldo: number;
  status: 'Aktif' | 'Non-Aktif';
}

export interface RekeningAccount {
  id: string;
  kode: string;
  nama: string;
  saldo: number;
  status: 'Aktif' | 'Non-Aktif';
}

export default function PengaturanKeuangan() {
  const [activeMainTab, setActiveMainTab] = useState<'Manajemen Kas' | 'Manajemen Rekening'>('Manajemen Kas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Kas Account State
  const [kasAccounts, setKasAccounts] = useState<KasAccount[]>([
    { id: 'k1', kode: '101.01', nama: 'Kas Utama Tunai (A)', saldo: 245000000, status: 'Aktif' },
    { id: 'k2', kode: '101.02', nama: 'Kas Utama Tunai (B)', saldo: 120000000, status: 'Aktif' },
    { id: 'k3', kode: '101.03', nama: 'Kas Kecil Operasional', saldo: 15000000, status: 'Aktif' },
    { id: 'k4', kode: '101.04', nama: 'Kas Darurat Bencana', saldo: 50000000, status: 'Non-Aktif' },
  ]);

  // Rekening Account State
  const [rekeningAccounts, setRekeningAccounts] = useState<RekeningAccount[]>([
    { id: 'r1', kode: '110.01', nama: 'Bank Jateng - Zakat (0101-23)', saldo: 850000000, status: 'Aktif' },
    { id: 'r2', kode: '110.02', nama: 'Bank Jateng - Infak (0101-24)', saldo: 350000000, status: 'Aktif' },
    { id: 'r3', kode: '110.03', nama: 'Bank Syariah Indonesia - Amil (7122-10)', saldo: 180000000, status: 'Aktif' },
    { id: 'r4', kode: '110.04', nama: 'Bank Jateng - Dana APBD (0101-25)', saldo: 70000000, status: 'Aktif' },
  ]);

  // Modal State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formKode, setFormKode] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formSaldo, setFormSaldo] = useState(0);
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormKode('');
    setFormNama('');
    setFormSaldo(0);
    setFormStatus('Aktif');
    setIsAddEditModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFormKode(item.kode);
    setFormNama(item.nama);
    setFormSaldo(item.saldo);
    setFormStatus(item.status);
    setIsAddEditModalOpen(true);
  };

  // Handle Delete Item
  const handleDeleteItem = (id: string) => {
    if (window.confirm(`Yakin ingin menghapus akun ini?`)) {
      if (activeMainTab === 'Manajemen Kas') {
        setKasAccounts(prev => prev.filter(k => k.id !== id));
      } else {
        setRekeningAccounts(prev => prev.filter(r => r.id !== id));
      }
    }
  };

  // Save Add/Edit
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKode.trim() || !formNama.trim()) {
      alert('Harap isi semua kolom wajib!');
      return;
    }

    if (activeMainTab === 'Manajemen Kas') {
      if (editingItem) {
        // Edit Existing
        setKasAccounts(prev => prev.map(item => item.id === editingItem.id ? {
          ...item,
          kode: formKode,
          nama: formNama,
          saldo: Number(formSaldo),
          status: formStatus
        } : item));
      } else {
        // Add New
        const newKas: KasAccount = {
          id: `k-${Date.now()}`,
          kode: formKode,
          nama: formNama,
          saldo: Number(formSaldo),
          status: formStatus
        };
        setKasAccounts(prev => [...prev, newKas]);
      }
    } else {
      if (editingItem) {
        // Edit Existing
        setRekeningAccounts(prev => prev.map(item => item.id === editingItem.id ? {
          ...item,
          kode: formKode,
          nama: formNama,
          saldo: Number(formSaldo),
          status: formStatus
        } : item));
      } else {
        // Add New
        const newRekening: RekeningAccount = {
          id: `r-${Date.now()}`,
          kode: formKode,
          nama: formNama,
          saldo: Number(formSaldo),
          status: formStatus
        };
        setRekeningAccounts(prev => [...prev, newRekening]);
      }
    }

    setIsAddEditModalOpen(false);
  };

  // Filtered List based on Search Term
  const filteredKas = kasAccounts.filter(k => 
    k.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRekening = rekeningAccounts.filter(r => 
    r.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Consolidated statistics
  const totalKasSaldo = kasAccounts.reduce((sum, item) => sum + item.saldo, 0);
  const totalRekeningSaldo = rekeningAccounts.reduce((sum, item) => sum + item.saldo, 0);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pengaturan Keuangan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">{activeMainTab}</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {activeMainTab === 'Manajemen Kas' ? 'Manajemen Kas Utama & Kecil' : 'Master Rekening & Saldo (COA)'}
          </h2>
          <p className="text-slate-500 font-medium">
            {activeMainTab === 'Manajemen Kas' 
              ? 'Kelola daftar saldo kas fisik dan kas kecil untuk keperluan penyaluran operasional.' 
              : 'Kelola bagan akun bank (COA) untuk dana zakat, infak, amil, dan APBD.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenAddModal}
            className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
          >
            <Plus className="size-4" />
            {activeMainTab === 'Manajemen Kas' ? 'Tambah Akun Kas' : 'Tambah Rekening Baru'}
          </button>
        </div>
      </motion.div>

      {/* Main Tab Navigation */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-2xl w-fit shrink-0">
        <button
          onClick={() => {
            setActiveMainTab('Manajemen Kas');
            setSearchTerm('');
          }}
          className={cn(
            "px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
            activeMainTab === 'Manajemen Kas' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Wallet className="size-4" />
          Manajemen Kas
        </button>
        <button
          onClick={() => {
            setActiveMainTab('Manajemen Rekening');
            setSearchTerm('');
          }}
          className={cn(
            "px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
            activeMainTab === 'Manajemen Rekening' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Building2 className="size-4" />
          Manajemen Rekening
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeMainTab === 'Manajemen Kas' ? (
          <motion.div 
            key="kas"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Stats Grid for Kas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Wallet className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Kas Aktif</p>
                  <p className="text-xl font-black text-slate-900">{kasAccounts.filter(k => k.status === 'Aktif').length} Akun Kas</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600">
                  <CreditCard className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Saldo Kas Utama</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(totalKasSaldo)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-orange-600/10 rounded-full flex items-center justify-center text-orange-600">
                  <RefreshCw className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Kas</p>
                  <p className="text-xl font-black text-slate-900">Realtime</p>
                </div>
              </div>
            </div>

            {/* Kas Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari kode atau nama kas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest">
                    <Filter className="size-4" /> Filter
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest">
                    <Download className="size-4" /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Akun</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kas Utama / Tunai</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Fisik</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredKas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada kas ditemukan</td>
                      </tr>
                    ) : filteredKas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {item.kode}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <Wallet className="size-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-900">{item.nama}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(item.saldo)}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.status === 'Aktif' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}>
                            <span className={cn("size-1.5 rounded-full", item.status === 'Aktif' ? "bg-emerald-500" : "bg-slate-400")} />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Menampilkan {filteredKas.length} dari {kasAccounts.length} akun kas
                </p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed">Previous</button>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-all">Next</button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="rekening"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Stats Grid for Rekening */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Akun Aktif</p>
                  <p className="text-xl font-black text-slate-900">{rekeningAccounts.filter(r => r.status === 'Aktif').length} Rekening</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                  <CreditCard className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Saldo Terkonsolidasi</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(totalRekeningSaldo)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="size-12 bg-orange-600/10 rounded-full flex items-center justify-center text-orange-600">
                  <RefreshCw className="size-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Terakhir Sinkronisasi</p>
                  <p className="text-xl font-black text-slate-900">10 Menit Lalu</p>
                </div>
              </div>
            </div>

            {/* Rekening Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari kode atau nama rekening..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest">
                    <Filter className="size-4" /> Filter
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest">
                    <Download className="size-4" /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Akun</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Akun Bank</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRekening.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada rekening ditemukan</td>
                      </tr>
                    ) : filteredRekening.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {item.kode}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <CreditCard className="size-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-900">{item.nama}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(item.saldo)}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.status === 'Aktif' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}>
                            <span className={cn("size-1.5 rounded-full", item.status === 'Aktif' ? "bg-emerald-500" : "bg-slate-400")} />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Menampilkan {filteredRekening.length} dari {rekeningAccounts.length} rekening
                </p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed">Previous</button>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-all">Next</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isAddEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddEditModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">
                  {editingItem ? 'Ubah Akun' : 'Tambah Akun Baru'}
                </h3>
                <button 
                  onClick={() => setIsAddEditModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Akun / COA</label>
                  <input 
                    type="text" 
                    required 
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    placeholder="Contoh: 101.01 atau 110.01" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {activeMainTab === 'Manajemen Kas' ? 'Nama Akun Kas' : 'Nama Akun Rekening Bank'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    placeholder={activeMainTab === 'Manajemen Kas' ? 'Contoh: Kas Utama Tunai (A)' : 'Contoh: Bank Jateng - Zakat'} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Awal</label>
                  <input 
                    type="number" 
                    required 
                    value={formSaldo}
                    onChange={(e) => setFormSaldo(Number(e.target.value))}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    placeholder="Masukkan saldo..." 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Keaktifan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddEditModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
