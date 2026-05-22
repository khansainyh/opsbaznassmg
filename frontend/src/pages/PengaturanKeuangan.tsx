import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Wallet, 
  Building2, 
  X, 
  AlertTriangle, 
  Activity, 
  RefreshCw, 
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export interface COAItem {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana: string;
}

export interface BankAccountItem {
  account_id: string;
  nama_akun: string;
  tipe_kas: 'TUNAI' | 'BANK';
  kelompok_dana: 'ZAKAT' | 'INFAK_TERIKAT' | 'INFAK_TIDAK_TERIKAT' | 'AMIL' | 'APBD' | 'NON-HALAL';
  saldo: number;
  no_rekening?: string;
  kode_laci?: string;
  coa_code: string;
  coa?: COAItem;
}

export interface CoaMappingRuleItem {
  rule_id: string;
  program_code: string;
  asnaf_id?: string;
  tipe_kas: 'TUNAI' | 'BANK';
  sumber_dana_tag: 'ZAKAT' | 'INFAK_TERIKAT' | 'INFAK_TIDAK_TERIKAT' | 'AMIL' | 'APBD';
  debit_coa_code: string;
  kredit_coa_code: string;
  debitCoa?: COAItem;
  kreditCoa?: COAItem;
}



export interface ProposalItem {
  id: string;
  agenda_no: number;
  nama_pemohon: string;
  jenis_permohonan: string; // program code
  nominal: number;
  asnaf?: string;
  tipe_bantuan?: string;
  status: string;
  program?: {
    name: string;
  };
}

export default function PengaturanKeuangan() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [activeTab, setActiveTab] = useState<'accounts' | 'mapping' | 'coa'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');

  // DB States
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [rules, setRules] = useState<CoaMappingRuleItem[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  // Loading indicator
  const [loading, setLoading] = useState(false);

  // Modals / Add/Edit Forms
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCOAModalOpen, setIsCOAModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states - Accounts
  const [accountForm, setAccountForm] = useState({
    nama_akun: '',
    tipe_kas: 'TUNAI' as 'TUNAI' | 'BANK',
    kelompok_dana: 'ZAKAT' as any,
    saldo: 0,
    no_rekening: '',
    kode_laci: '',
    coa_code: ''
  });

  // Form states - COA
  const [coaForm, setCoaForm] = useState({
    coa_code: '',
    nama_akun: '',
    klasifikasi: 'Aktiva',
    tipe_dana: 'ZAKAT'
  });

  // Form states - Rules
  const [ruleForm, setRuleForm] = useState({
    program_code: '',
    asnaf_id: '',
    tipe_kas: 'TUNAI' as 'TUNAI' | 'BANK',
    sumber_dana_tag: 'ZAKAT' as any,
    debit_coa_code: '',
    kredit_coa_code: ''
  });



  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCoas, resAccounts, resRules, resPrograms] = await Promise.all([
        axios.get('http://127.0.0.1:4000/api/finance/coa'),
        axios.get('http://127.0.0.1:4000/api/finance/accounts'),
        axios.get('http://127.0.0.1:4000/api/finance/mapping-rules'),
        axios.get('http://127.0.0.1:4000/api/programs')
      ]);

      setCoas(resCoas.data);
      setAccounts(resAccounts.data);
      setRules(resRules.data);
      setPrograms(resPrograms.data);
    } catch (error) {
      console.error('Gagal mengambil data keuangan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format IDR Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Helper lists
  const filteredKasAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.tipe_kas === 'TUNAI' && (
        a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.coa_code.includes(searchTerm)
      )
    );
  }, [accounts, searchTerm]);

  const filteredBankAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.tipe_kas === 'BANK' && (
        a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.no_rekening?.includes(searchTerm) ||
        a.coa_code.includes(searchTerm)
      )
    );
  }, [accounts, searchTerm]);

  const filteredCOAs = useMemo(() => {
    return coas.filter(c => 
      c.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.coa_code.includes(searchTerm)
    );
  }, [coas, searchTerm]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => 
      r.program_code.includes(searchTerm) ||
      (r.asnaf_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);



  // ==========================================
  // Account Actions
  // ==========================================
  const handleOpenAccountModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setAccountForm({
        nama_akun: item.nama_akun,
        tipe_kas: item.tipe_kas,
        kelompok_dana: item.kelompok_dana,
        saldo: Number(item.saldo),
        no_rekening: item.no_rekening || '',
        kode_laci: item.kode_laci || '',
        coa_code: item.coa_code
      });
    } else {
      setEditingItem(null);
      setAccountForm({
        nama_akun: '',
        tipe_kas: 'TUNAI',
        kelompok_dana: 'ZAKAT',
        saldo: 0,
        no_rekening: '',
        kode_laci: '',
        coa_code: coas[0]?.coa_code || ''
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...accountForm,
        kelompok_dana: accountForm.tipe_kas === 'BANK' ? 'PENYIMPANAN' : accountForm.kelompok_dana
      };
      if (editingItem) {
        await axios.put(`http://127.0.0.1:4000/api/finance/accounts/${editingItem.account_id}`, payload);
      } else {
        await axios.post('http://127.0.0.1:4000/api/finance/accounts', payload);
      }
      setIsAccountModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan akun: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus akun fisik ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:4000/api/finance/accounts/${id}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  // ==========================================
  // COA Actions
  // ==========================================
  const handleOpenCOAModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setCoaForm({
        coa_code: item.coa_code,
        nama_akun: item.nama_akun,
        klasifikasi: item.klasifikasi || 'Aktiva',
        tipe_dana: item.tipe_dana || 'ZAKAT'
      });
    } else {
      setEditingItem(null);
      setCoaForm({
        coa_code: '',
        nama_akun: '',
        klasifikasi: 'Aktiva',
        tipe_dana: 'ZAKAT'
      });
    }
    setIsCOAModalOpen(true);
  };

  const handleSaveCOA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`http://127.0.0.1:4000/api/finance/coa/${editingItem.coa_code}`, coaForm);
      } else {
        await axios.post('http://127.0.0.1:4000/api/finance/coa', coaForm);
      }
      setIsCOAModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan COA: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteCOA = async (code: string) => {
    if (!window.confirm('Yakin ingin menghapus kode COA master ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:4000/api/finance/coa/${code}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  // ==========================================
  // Rule Actions
  // ==========================================
  const handleOpenRuleModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setRuleForm({
        program_code: item.program_code,
        asnaf_id: item.asnaf_id || '',
        tipe_kas: item.tipe_kas,
        sumber_dana_tag: item.sumber_dana_tag,
        debit_coa_code: item.debit_coa_code,
        kredit_coa_code: item.kredit_coa_code
      });
    } else {
      setEditingItem(null);
      setRuleForm({
        program_code: programs[0]?.code || '',
        asnaf_id: '',
        tipe_kas: 'TUNAI',
        sumber_dana_tag: 'ZAKAT',
        debit_coa_code: coas.find(c => c.klasifikasi === 'Penyaluran')?.coa_code || '',
        kredit_coa_code: coas.find(c => c.klasifikasi === 'Aktiva')?.coa_code || ''
      });
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`http://127.0.0.1:4000/api/finance/mapping-rules/${editingItem.rule_id}`, ruleForm);
      } else {
        await axios.post('http://127.0.0.1:4000/api/finance/mapping-rules', ruleForm);
      }
      setIsRuleModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan aturan: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus aturan mapping ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:4000/api/finance/mapping-rules/${id}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };





  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan Keuangan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Pengaturan Keuangan</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <SlidersHorizontal className="size-8 text-primary" />
            Pengaturan &amp; Pelaporan Keuangan
          </h2>
          <p className="text-slate-500 font-medium">
            Kelola posisi kas, aturan pemetaan COA otomatis, replenishment laci kas kecil, dan eksekusi pencairan bantuan.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn("size-5 text-slate-500", loading && "animate-spin")} />
          </button>
          {activeTab === 'accounts' && (
            <button 
              onClick={() => handleOpenAccountModal()}
              className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
            >
              <Plus className="size-4" /> Tambah Akun
            </button>
          )}
          {activeTab === 'coa' && (
            <button 
              onClick={() => handleOpenCOAModal()}
              className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
            >
              <Plus className="size-4" /> Tambah COA
            </button>
          )}
          {activeTab === 'mapping' && (
            <button 
              onClick={() => handleOpenRuleModal()}
              className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
            >
              <Plus className="size-4" /> Tambah Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 w-full max-w-6xl overflow-x-auto custom-scrollbar shrink-0 pb-px mb-4">
        <div className="flex flex-row gap-6 w-full min-w-max">
          <button
            onClick={() => { setActiveTab('accounts'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'accounts'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Kas &amp; Bank
          </button>
          <button
            onClick={() => { setActiveTab('mapping'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'mapping'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Mapping COA
          </button>
          <button
            onClick={() => { setActiveTab('coa'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'coa'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Master COA
          </button>

        </div>
      </div>

      {/* Main Tab Panels */}
      <AnimatePresence mode="wait">
        
        {/* ==========================================
            TAB: KAS & BANK LIST
            ========================================== */}
        {activeTab === 'accounts' && (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Wallet className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Saldo Kas Fisik</p>
                  <p className="text-xl font-black text-slate-950 mt-1">
                    {formatCurrency(accounts.filter(a => a.tipe_kas === 'TUNAI').reduce((sum, item) => sum + Number(item.saldo), 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Saldo Bank</p>
                  <p className="text-xl font-black text-slate-950 mt-1">
                    {formatCurrency(accounts.filter(a => a.tipe_kas === 'BANK').reduce((sum, item) => sum + Number(item.saldo), 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600">
                  <Activity className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Akun Terhubung</p>
                  <p className="text-xl font-black text-slate-950 mt-1">{accounts.length} Akun Fisik</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <input 
                  type="text"
                  placeholder="Cari kode/nama akun kas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>
            </div>

            {/* Section A: Laci Kas Tunai */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-55 bg-slate-50/40">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                  Daftar Kas Kecil &amp; Operasional
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe &amp; Kode Laci</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kas Fisik / Operasional</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grup Kelompok Dana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungan Master COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Riil (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredKasAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Tidak ada kas kecil / operasional ditemukan</td>
                      </tr>
                    ) : filteredKasAccounts.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border bg-orange-50 text-orange-600 border-orange-100">
                            TUNAI {item.kode_laci ? `(LACI ${item.kode_laci})` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-900">
                          {item.nama_akun}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[9px] font-black">
                            {item.kelompok_dana}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {item.coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.coa?.nama_akun || 'Chart of Account'}</span>
                        </td>
                        <td className="px-6 py-5 font-black text-slate-950">
                          {formatCurrency(Number(item.saldo))}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenAccountModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAccount(item.account_id)}
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
            </div>

            {/* Section B: Rekening Bank */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-55 bg-slate-50/40">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  Daftar Rekening Bank
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Akun</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Rekening &amp; Bank</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungan Master COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Riil (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredBankAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Tidak ada rekening bank ditemukan</td>
                      </tr>
                    ) : filteredBankAccounts.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100">
                            {item.tipe_kas}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-900">
                          {item.nama_akun}
                          {item.no_rekening && <span className="block font-mono text-[10px] text-slate-400 mt-1 font-bold">REK: {item.no_rekening}</span>}
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {item.coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.coa?.nama_akun || 'Chart of Account'}</span>
                        </td>
                        <td className="px-6 py-5 font-black text-slate-950">
                          {formatCurrency(Number(item.saldo))}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenAccountModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAccount(item.account_id)}
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
            </div>
          </motion.div>
        )}

        {/* ==========================================
            TAB: AUTOMATIC COA MAPPING RULES
            ========================================== */}
        {activeTab === 'mapping' && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="p-5 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-700 text-xs font-semibold leading-relaxed flex gap-3 items-start">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Informasi Kebijakan Accounting Engine</p>
                <p className="mt-1 opacity-90">Aturan Pemetaan COA otomatis digunakan oleh backend untuk memetakan pencairan transaksi proposal staf lapangan langsung menjadi entitas double-entry jurnal penyeimbang (Debit Penyaluran Program/Belanja vs Kredit Akun Kas Setara) di kasir.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari program/asnaf..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kombinasi Kondisi Aturan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Kas</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber Tag Dana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-700">Entri Debit (Penyaluran)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-blue-700">Entri Kredit (Kas/Bank)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada aturan mapping COA terdaftar</td>
                      </tr>
                    ) : filteredRules.map((item) => (
                      <tr key={item.rule_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-primary font-mono">{item.program_code}</span>
                            <span className="text-xs font-bold text-slate-900">
                              Asnaf: <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600">{item.asnaf_id || 'Global/Non-Asnaf'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-700">{item.tipe_kas}</td>
                        <td className="px-6 py-5 font-bold text-slate-700">{item.sumber_dana_tag}</td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            {item.debit_coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.debitCoa?.nama_akun || 'Akun Penyaluran'}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                            {item.kredit_coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.kreditCoa?.nama_akun || 'Akun Kas'}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenRuleModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRule(item.rule_id)}
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
            </div>
          </motion.div>
        )}

        {/* ==========================================
            TAB: CHART OF ACCOUNTS (COA) MASTER
            ========================================== */}
        {activeTab === 'coa' && (
          <motion.div
            key="coa"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari kode COA / nama akun..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Akun COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Rekening / Akun Buku Besar</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Klasifikasi</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Alokasi Dana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCOAs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Bagan akun COA masih kosong</td>
                      </tr>
                    ) : filteredCOAs.map((item) => (
                      <tr key={item.coa_code} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 font-mono text-xs font-black text-slate-900 bg-slate-50 border border-slate-100 rounded-lg w-fit px-2.5 py-1">
                          {item.coa_code}
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-900">{item.nama_akun}</td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                            item.klasifikasi === 'Aktiva' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            item.klasifikasi === 'Penyaluran' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            "bg-slate-50 text-slate-600 border-slate-150"
                          )}>
                            {item.klasifikasi || 'Umum'}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-700">{item.tipe_dana || '-'}</td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenCOAModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCOA(item.coa_code)}
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
            </div>
          </motion.div>
        )}





      </AnimatePresence>

      {/* ==========================================
          MODALS & FORMS OVERLAYS
          ========================================== */}
      
      {/* 1. Account Add/Edit Modal */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAccountModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Akun Fisik' : 'Tambah Akun Fisik Baru'}
                </h3>
                <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Rekening/Laci Kas</label>
                  <input
                    type="text"
                    required
                    value={accountForm.nama_akun}
                    onChange={(e) => setAccountForm({ ...accountForm, nama_akun: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    placeholder="Contoh: BSI - Rekening Utama Zakat"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(accountForm.tipe_kas === 'BANK' ? "col-span-2" : "col-span-1", "space-y-1")}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Kas</label>
                    <select
                      value={accountForm.tipe_kas}
                      onChange={(e) => setAccountForm({ ...accountForm, tipe_kas: e.target.value as any })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    >
                      <option value="TUNAI">TUNAI</option>
                      <option value="BANK">BANK</option>
                    </select>
                  </div>

                  {accountForm.tipe_kas !== 'BANK' && (
                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grup Kelompok Dana</label>
                      <select
                        value={accountForm.kelompok_dana}
                        onChange={(e) => setAccountForm({ ...accountForm, kelompok_dana: e.target.value as any })}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                      >
                        <option value="ZAKAT">ZAKAT</option>
                        <option value="INFAK_TERIKAT">INFAK_TERIKAT</option>
                        <option value="INFAK_TIDAK_TERIKAT">INFAK_TIDAK_TERIKAT</option>
                        <option value="AMIL">AMIL</option>
                        <option value="APBD">APBD</option>
                        <option value="NON-HALAL">NON-HALAL</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungan Master COA</label>
                  <select
                    value={accountForm.coa_code}
                    onChange={(e) => setAccountForm({ ...accountForm, coa_code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option value="">-- Pilih Kode COA --</option>
                    {coas.filter(c => c.klasifikasi === 'Aktiva').map(c => (
                      <option key={c.coa_code} value={c.coa_code}>
                        {c.coa_code} - {c.nama_akun}
                      </option>
                    ))}
                  </select>
                </div>

                {accountForm.tipe_kas === 'BANK' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Rekening</label>
                    <input
                      type="text"
                      value={accountForm.no_rekening}
                      onChange={(e) => setAccountForm({ ...accountForm, no_rekening: e.target.value })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                      placeholder="Contoh: 05000-800-84"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Laci Kasir (A s.d G)</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={accountForm.kode_laci}
                      onChange={(e) => setAccountForm({ ...accountForm, kode_laci: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                      placeholder="Contoh: A"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Awal (IDR)</label>
                  <input
                    type="number"
                    value={accountForm.saldo || 0}
                    onChange={(e) => setAccountForm({ ...accountForm, saldo: Number(e.target.value) })}
                    required
                    disabled={!!editingItem && !isSuperAdmin}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-55 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. COA Add/Edit Modal */}
      <AnimatePresence>
        {isCOAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCOAModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Kode COA Master' : 'Tambah Kode COA Master Baru'}
                </h3>
                <button onClick={() => setIsCOAModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveCOA} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Akun COA</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={coaForm.coa_code}
                    onChange={(e) => setCoaForm({ ...coaForm, coa_code: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    placeholder="Contoh: 111010101"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Akun</label>
                  <input
                    type="text"
                    required
                    value={coaForm.nama_akun}
                    onChange={(e) => setCoaForm({ ...coaForm, nama_akun: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    placeholder="Contoh: Kas Dana Zakat"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klasifikasi</label>
                    <select
                      value={coaForm.klasifikasi}
                      onChange={(e) => setCoaForm({ ...coaForm, klasifikasi: e.target.value })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    >
                      <option value="Aktiva">Aktiva</option>
                      <option value="Penyaluran">Penyaluran (Beban)</option>
                      <option value="Penerimaan">Penerimaan (Pendapatan)</option>
                      <option value="Kewajiban">Kewajiban</option>
                      <option value="Saldo">Saldo Dana</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Alokasi Dana</label>
                    <select
                      value={coaForm.tipe_dana}
                      onChange={(e) => setCoaForm({ ...coaForm, tipe_dana: e.target.value })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    >
                      <option value="ZAKAT">ZAKAT</option>
                      <option value="INFAK_TERIKAT">INFAK_TERIKAT</option>
                      <option value="INFAK_TIDAK_TERIKAT">INFAK_TIDAK_TERIKAT</option>
                      <option value="AMIL">AMIL</option>
                      <option value="APBD">APBD</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCOAModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-55 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan COA
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Rule Add/Edit Modal */}
      <AnimatePresence>
        {isRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsRuleModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Aturan Pemetaan COA' : 'Tambah Aturan Pemetaan COA Baru'}
                </h3>
                <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program SIMBA</label>
                  <select
                    value={ruleForm.program_code}
                    onChange={(e) => setRuleForm({ ...ruleForm, program_code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option value="">-- Pilih Program --</option>
                    {programs.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asnaf Target (Opsional)</label>
                    <input
                      type="text"
                      value={ruleForm.asnaf_id}
                      onChange={(e) => setRuleForm({ ...ruleForm, asnaf_id: e.target.value })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                      placeholder="Contoh: Fakir, Miskin, dll"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Kas</label>
                    <select
                      value={ruleForm.tipe_kas}
                      onChange={(e) => setRuleForm({ ...ruleForm, tipe_kas: e.target.value as any })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    >
                      <option value="TUNAI">Laci Tunai</option>
                      <option value="BANK">Transfer Bank</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelompok Dana</label>
                  <select
                    value={ruleForm.sumber_dana_tag}
                    onChange={(e) => setRuleForm({ ...ruleForm, sumber_dana_tag: e.target.value as any })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option value="ZAKAT">ZAKAT</option>
                    <option value="INFAK_TERIKAT">INFAK_TERIKAT (IST)</option>
                    <option value="INFAK_TIDAK_TERIKAT">INFAK_TIDAK_TERIKAT (ISTT)</option>
                    <option value="AMIL">AMIL</option>
                    <option value="APBD">APBD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-700">Akun Penyaluran/Belanja (Debit COA)</label>
                  <select
                    value={ruleForm.debit_coa_code}
                    onChange={(e) => setRuleForm({ ...ruleForm, debit_coa_code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option value="">-- Pilih COA Debit --</option>
                    {coas.filter(c => c.klasifikasi === 'Penyaluran').map(c => (
                      <option key={c.coa_code} value={c.coa_code}>
                        {c.coa_code} - {c.nama_akun}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-blue-700">Akun Kas/Bank Default (Kredit COA)</label>
                  <select
                    value={ruleForm.kredit_coa_code}
                    onChange={(e) => setRuleForm({ ...ruleForm, kredit_coa_code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option value="">-- Pilih COA Kredit --</option>
                    {coas.filter(c => c.klasifikasi === 'Aktiva').map(c => (
                      <option key={c.coa_code} value={c.coa_code}>
                        {c.coa_code} - {c.nama_akun}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-55 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan Rule
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
