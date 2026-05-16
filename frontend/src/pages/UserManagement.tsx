import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, Search, FileEdit, Trash2, ShieldCheck, 
  Settings, Loader2, Upload, Download, AlertCircle, X, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import * as xlsx from 'xlsx';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ALL_ROLES = [
  'Super_Admin', 'Ketua', 'Wakil_Ketua_I', 'Wakil_Ketua_II', 'Wakil_Ketua_III', 'Wakil_Ketua_IV', 
  'Kabag_Administrasi', 'Kepala_Pelaksana', 'Staf_Administrasi', 
  'Staf_Distribusi', 'Staf_Pelaporan_Pengumpulan', 'Keuangan', 
  'Relawan', 'Relawan_Sementara', 'Tim_Monev'
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', email: '', role: 'Staf_Administrasi', resetPassword: false });
  
  // Notice / Msg
  const [messages, setMessages] = useState<{ type: 'success' | 'error', text: string }[]>([]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);
  
  // Excel File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://127.0.0.1:4000/api/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      setMessages([{ type: 'error', text: 'Gagal menghubungi server. Pastikan backend aktif.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ id: '', name: '', email: '', role: 'Staf_Administrasi', resetPassword: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setIsEdit(true);
    setFormData({ id: u.id, name: u.name, email: u.email, role: u.role, resetPassword: false });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await axios.put(`http://127.0.0.1:4000/api/users/${formData.id}`, formData);
        setMessages([{ type: 'success', text: 'Data user berhasil diperbarui.' }]);
      } else {
        await axios.post('http://127.0.0.1:4000/api/users', formData);
        setMessages([{ type: 'success', text: 'User baru berhasil ditambahkan.' }]);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Gagal menyimpan user.';
      setMessages([{ type: 'error', text: errorMsg }]);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus user ini secara permanen?')) {
      try {
        await axios.delete(`http://127.0.0.1:4000/api/users/${id}`);
        setMessages([{ type: 'success', text: 'User berhasil dihapus.' }]);
        fetchUsers();
      } catch (err: any) {
        setMessages([{ type: 'error', text: err.response?.data?.error || 'Gagal menghapus user.' }]);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json<any>(sheet);

      const mappedUsers = rawData.map((row: any) => ({
        name: row['Name'] || row['Nama'],
        email: row['Email'],
        role: row['Role'] || row['Jabatan']
      })).filter(u => u.name && u.email && u.role);

      if (mappedUsers.length === 0) {
        setMessages([{ type: 'error', text: 'Tidak ada data valid di dalam Excel. Format harus Name, Email, Role.' }]);
        return;
      }

      await axios.post('http://127.0.0.1:4000/api/users/bulk', mappedUsers);
      setMessages([{ type: 'success', text: `${mappedUsers.length} Users berhasil disinkronisasi!` }]);
      fetchUsers();

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Gagal memproses file Excel.';
      setMessages([{ type: 'error', text: errorMsg }]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'Name': 'Budi Santoso', 'Email': 'budi@baznas.org', 'Role': 'Staf_Administrasi' },
      { 'Name': 'Siti Aminah', 'Email': 'siti@baznas.org', 'Role': 'Wakil_Ketua_I' }
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template_User');
    xlsx.writeFile(wb, 'Template_Import_User.xlsx');
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              User Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Kelola akses, jabatan, dan registrasi internal staf BAZNAS.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-8">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Akun Sistem</p>
              <h3 className="text-3xl font-black text-slate-800">{users.length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-6 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Staf BAZNAS Aktif</p>
              <h3 className="text-3xl font-black text-slate-800">{users.filter(u => !u.role.includes('Relawan')).length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Users className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Relawan Lapangan</p>
              <h3 className="text-3xl font-black text-slate-800">{users.filter(u => u.role.includes('Relawan')).length}</h3>
            </div>
          </div>
        </div>
        
        {/* Toast Notifications */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed top-8 right-8 z-[100] flex flex-col gap-2 w-80 shadow-2xl"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
                  msg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {msg.type === 'success'
                    ? <CheckCircle2 className="size-5 shrink-0" />
                    : <AlertCircle className="size-5 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">
                      {msg.type === 'success' ? 'Berhasil' : 'Gagal'}
                    </p>
                    <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                  </div>
                  <button
                    onClick={() => setMessages(messages.filter((_, i) => i !== idx))}
                    className="shrink-0 p-1 hover:bg-black/5 rounded-md"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 bg-white">
            <h3 className="font-bold text-slate-800 text-lg">Direktori Pengguna</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik email atau nama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 w-64 lg:w-72"
                />
                <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <button 
                onClick={downloadTemplate}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Download className="size-4 text-slate-500" />
                <span className="hidden sm:inline">Template</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button 
                onClick={handleOpenAdd}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shrink-0"
              >
                <Plus className="size-4" />
                Tambah Baru
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-6">Nama Pengguna</th>
                  <th className="p-4">Alamat Email</th>
                  <th className="p-4">Role / Jabatan</th>
                  <th className="p-4">Tanggal Daftar</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center p-8"><Loader2 className="size-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-slate-500 font-medium">Tidak ada data.</td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 pl-6 font-semibold text-slate-700">{u.name}</td>
                      <td className="p-4 text-slate-600">{u.email}</td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold text-[10px] tracking-wide uppercase">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(u)} className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors">
                            <FileEdit className="size-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="size-5" />
                {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Akses</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                    placeholder="Contoh: budi@baznas.org"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Role / Jabatan Sistem</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                  >
                    {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                
                {isEdit && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.resetPassword}
                        onChange={(e) => setFormData({...formData, resetPassword: e.target.checked})}
                        className="rounded text-primary focus:ring-primary size-4" 
                      />
                      <span className="text-sm font-medium text-slate-600">Reset password ke default (<span className="font-mono text-slate-800">password123</span>)</span>
                    </label>
                  </div>
                )}
                
                {!isEdit && (
                   <div className="bg-amber-50 rounded-lg p-3 mt-2 border border-amber-200 text-xs text-amber-800 font-medium flex gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>Password default untuk akun baru adalah <strong>password123</strong>. User bisa menggantinya nanti.</p>
                   </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-sm transition-colors"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
